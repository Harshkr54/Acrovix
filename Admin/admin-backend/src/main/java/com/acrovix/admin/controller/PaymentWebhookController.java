package com.acrovix.admin.controller;

import com.acrovix.admin.entity.Invoice;
import com.acrovix.admin.entity.InvoiceStatus;
import com.acrovix.admin.entity.Payment;
import com.acrovix.admin.entity.PaymentMethod;
import com.acrovix.admin.entity.PaymentStatus;
import com.acrovix.admin.repository.AdminUserRepository;
import com.acrovix.admin.repository.InvoiceRepository;
import com.acrovix.admin.repository.PaymentRepository;
import com.acrovix.admin.entity.AdminUser;
import com.razorpay.Utils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
@Slf4j
public class PaymentWebhookController {

    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final AdminUserRepository adminUserRepository;

    @Value("${razorpay.webhook-secret:}")
    private String webhookSecret;

    @PostMapping("/razorpay")
    @Transactional
    public ResponseEntity<String> handleRazorpayWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature,
            @RequestHeader(value = "X-Razorpay-Event-Id", required = false) String eventHeader) {
            
        try {
            if (signature == null || signature.isBlank()) {
                log.warn("Missing Razorpay webhook signature header");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Missing signature");
            }

            if (webhookSecret == null || webhookSecret.isBlank()) {
                log.error("Razorpay webhook secret is not configured");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
            }

            // Verify signature
            boolean isSignatureValid = Utils.verifyWebhookSignature(payload, signature, webhookSecret);
            if (!isSignatureValid) {
                log.warn("Invalid Razorpay webhook signature");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid signature");
            }

            JSONObject data = new JSONObject(payload);
            String event = data.optString("event", null);
            if (event == null || event.isBlank()) {
                log.warn("Webhook payload missing 'event' property");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Missing event property");
            }

            if ("payment_link.paid".equals(event) || "payment.captured".equals(event)) {
                if (!data.has("payload")) {
                    log.warn("Webhook received without 'payload' object");
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Missing payload object");
                }
                JSONObject payloadObj = data.getJSONObject("payload");
                String entityKey = event.equals("payment_link.paid") ? "payment_link" : "payment";
                if (!payloadObj.has(entityKey) || !payloadObj.getJSONObject(entityKey).has("entity")) {
                    log.warn("Webhook received without entity object for event: {}", event);
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Missing entity object");
                }
                JSONObject entity = payloadObj.getJSONObject(entityKey).getJSONObject("entity");
                
                String referenceId = null;
                String paymentId = null;
                BigDecimal amountInRupees = null;

                if ("payment_link.paid".equals(event)) {
                    referenceId = entity.optString("reference_id", null);
                    // 1. If payload contains payment entity, prefer the canonical payment id
                    if (payloadObj.has("payment") && payloadObj.getJSONObject("payment").has("entity")) {
                        paymentId = payloadObj.getJSONObject("payment").getJSONObject("entity").optString("id", null);
                    }
                    // 2. Fall back to payment link ID
                    if (paymentId == null || paymentId.isBlank()) {
                        paymentId = entity.optString("id", null);
                    }
                    amountInRupees = new BigDecimal(entity.getLong("amount")).divide(new BigDecimal("100"));
                } else if ("payment.captured".equals(event)) {
                    if (entity.has("notes")) {
                        referenceId = entity.getJSONObject("notes").optString("reference_id", null);
                    }
                    if (referenceId == null || referenceId.isBlank()) {
                        referenceId = entity.optString("description", "");
                        if (referenceId.startsWith("Payment for Invoice ")) {
                            referenceId = referenceId.replace("Payment for Invoice ", "");
                        }
                    }
                    paymentId = entity.optString("id", null);
                    amountInRupees = new BigDecimal(entity.getLong("amount")).divide(new BigDecimal("100"));
                }

                if (referenceId == null || referenceId.isBlank()) {
                    log.warn("Webhook received without reference_id. Cannot map to invoice.");
                    return ResponseEntity.ok("No reference_id found");
                }

                // A valid financial ledger entry requires a verified provider payment or link ID.
                // Webhook event IDs are delivery envelope identifiers, not monetary transaction references.
                if (paymentId == null || paymentId.isBlank()) {
                    log.warn("Webhook rejected: missing verified payment identifier for reference: {}", referenceId);
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Missing payment identifier");
                }
                String txnRef = paymentId.trim();

                final String finalReferenceId = referenceId;
                // Acquire pessimistic write lock on target invoice to serialize concurrent webhook processing
                Optional<Invoice> invoiceOpt = invoiceRepository.findByInvoiceNumberForUpdate(finalReferenceId);

                if (invoiceOpt.isEmpty()) {
                    log.warn("Invoice not found for reference_id: {}", finalReferenceId);
                    return ResponseEntity.ok("Invoice not found");
                }

                Invoice invoice = invoiceOpt.get();

                // Idempotency Check 1: Did we already record this payment ID?
                if (paymentRepository.existsByTransactionReference(txnRef)) {
                    log.info("Payment with reference {} already recorded.", txnRef);
                    return ResponseEntity.ok("Already processed");
                }

                // Idempotency Check 2: Is the invoice already fully paid?
                // Prevents cross-event double crediting if different webhook events refer to the same checkout.
                if (invoice.getStatus() == InvoiceStatus.PAID && invoice.getBalanceDue() != null && invoice.getBalanceDue().compareTo(BigDecimal.ZERO) <= 0) {
                    log.info("Invoice {} is already fully paid. Ignoring duplicate webhook event {}.", invoice.getInvoiceNumber(), event);
                    return ResponseEntity.ok("Already processed");
                }

                // We need an AdminUser for 'recordedBy'. System user or first super admin.
                AdminUser systemUser = adminUserRepository.findAll().stream()
                        .filter(u -> "SUPER_ADMIN".equals(u.getRole().name()))
                        .findFirst()
                        .orElseThrow(() -> new RuntimeException("No admin user found to record payment"));

                // Record Payment
                Payment payment = new Payment();
                payment.setPaymentNumber("PAY-" + System.currentTimeMillis());
                payment.setInvoice(invoice);
                payment.setCustomer(invoice.getCustomer());
                payment.setPaymentDate(LocalDate.now());
                payment.setAmount(amountInRupees);
                payment.setPaymentMethod(PaymentMethod.OTHER);
                payment.setTransactionReference(txnRef);
                payment.setNotes("Automated recording via Razorpay Webhook (" + event + ")");
                payment.setStatus(PaymentStatus.RECORDED);
                payment.setRecordedBy(systemUser);

                try {
                    paymentRepository.saveAndFlush(payment);
                } catch (org.springframework.dao.DataIntegrityViolationException e) {
                    log.warn("Concurrent duplicate payment webhook detected for ref {}. Ignoring.", txnRef);
                    return ResponseEntity.ok("Already processed concurrently");
                }

                // Update Invoice
                BigDecimal currentPaid = invoice.getAmountPaid() != null ? invoice.getAmountPaid() : BigDecimal.ZERO;
                BigDecimal newPaid = currentPaid.add(amountInRupees);
                invoice.setAmountPaid(newPaid);
                
                BigDecimal newBalance = invoice.getGrandTotal().subtract(newPaid);
                if (newBalance.compareTo(BigDecimal.ZERO) < 0) {
                    newBalance = BigDecimal.ZERO;
                }
                invoice.setBalanceDue(newBalance);

                if (newBalance.compareTo(BigDecimal.ZERO) <= 0) {
                    invoice.setStatus(InvoiceStatus.PAID);
                } else {
                    invoice.setStatus(InvoiceStatus.PARTIALLY_PAID);
                }

                invoiceRepository.save(invoice);
                log.info("Successfully processed webhook for Invoice: {}", invoice.getInvoiceNumber());
            }

            return ResponseEntity.ok("Webhook processed");
        } catch (Exception e) {
            log.error("Error processing Razorpay webhook", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error processing webhook");
        }
    }
}
