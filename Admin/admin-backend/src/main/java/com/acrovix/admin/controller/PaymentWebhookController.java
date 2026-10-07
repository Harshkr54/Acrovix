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
            @RequestHeader("X-Razorpay-Signature") String signature) {
            
        try {
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
            String event = data.getString("event");

            if ("payment_link.paid".equals(event) || "payment.captured".equals(event)) {
                JSONObject entity = data.getJSONObject("payload").getJSONObject(event.equals("payment_link.paid") ? "payment_link" : "payment").getJSONObject("entity");
                
                String referenceId = null;
                String paymentId = null;
                BigDecimal amountInRupees = null;

                if ("payment_link.paid".equals(event)) {
                    referenceId = entity.optString("reference_id", null);
                    // Extract payment id if available from payment link payload
                    paymentId = entity.optString("id", null); // Just use link id or try to get order/payment id
                    amountInRupees = new BigDecimal(entity.getLong("amount")).divide(new BigDecimal("100"));
                } else if ("payment.captured".equals(event)) {
                    referenceId = entity.getJSONObject("notes").optString("reference_id", null);
                    if (referenceId == null) {
                        referenceId = entity.optString("description", "");
                        if (referenceId.startsWith("Payment for Invoice ")) {
                            referenceId = referenceId.replace("Payment for Invoice ", "");
                        }
                    }
                    paymentId = entity.getString("id");
                    amountInRupees = new BigDecimal(entity.getLong("amount")).divide(new BigDecimal("100"));
                }

                if (referenceId == null || referenceId.isBlank()) {
                    log.warn("Webhook received without reference_id. Cannot map to invoice.");
                    return ResponseEntity.ok("No reference_id found");
                }

                final String finalReferenceId = referenceId;
                // Find Invoice
                Optional<Invoice> invoiceOpt = invoiceRepository.findAll().stream()
                        .filter(inv -> finalReferenceId.equals(inv.getInvoiceNumber()))
                        .findFirst();

                if (invoiceOpt.isEmpty()) {
                    log.warn("Invoice not found for reference_id: {}", finalReferenceId);
                    return ResponseEntity.ok("Invoice not found");
                }

                Invoice invoice = invoiceOpt.get();

                // Idempotency Check: Did we already record this payment?
                // We map transactionReference to paymentId (if available) or the payment_link id + "_auto".
                String txnRef = paymentId != null ? paymentId : "rzp_auto_" + finalReferenceId + "_" + System.currentTimeMillis();
                
                final String finalPaymentId = paymentId;
                // Better idempotency: if paymentId exists in DB, ignore
                if (finalPaymentId != null) {
                    if (paymentRepository.existsByTransactionReference(finalPaymentId)) {
                        log.info("Payment {} already recorded.", finalPaymentId);
                        return ResponseEntity.ok("Already processed");
                    }
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
                    paymentRepository.save(payment);
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
