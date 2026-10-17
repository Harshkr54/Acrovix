package com.acrovix.admin.service;

import com.acrovix.admin.entity.Invoice;
import com.acrovix.admin.entity.Payment;
import com.acrovix.admin.repository.InvoiceRepository;
import com.acrovix.admin.repository.PaymentRepository;
import com.razorpay.Utils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class RazorpayWebhookService {

    @Value("${razorpay.webhook.secret:${razorpay.webhook-secret:dummy_secret}}")
    private String webhookSecret;

    private final PaymentService paymentService;
    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;

    /**
     * Verifies the HMAC-SHA256 signature of the payload against the configured webhook secret.
     *
     * @param payload   raw request body
     * @param signature header value from X-Razorpay-Signature
     * @return true if valid, false otherwise
     */
    public boolean verifySignature(String payload, String signature) {
        if (signature == null || signature.isBlank()) {
            log.warn("Missing X-Razorpay-Signature header");
            return false;
        }

        if (webhookSecret == null || webhookSecret.isBlank()) {
            log.error("Razorpay webhook secret is not configured");
            return false;
        }

        try {
            return Utils.verifyWebhookSignature(payload, signature.trim(), webhookSecret.trim());
        } catch (Exception e) {
            log.warn("Signature verification failed: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Processes Razorpay webhook events (payment.captured, order.paid, payment_link.paid).
     * Enforces idempotency, ledger reconciliation, and triggers client receipt notification.
     *
     * @param payload raw JSON body
     */
    public void processWebhookPayload(String payload) {
        JSONObject data = new JSONObject(payload);
        String event = data.optString("event", null);
        if (event == null || event.isBlank()) {
            log.warn("Webhook payload missing 'event' property. Ignoring.");
            return;
        }

        log.info("Received Razorpay webhook event: {}", event);

        // Process payment.captured, order.paid, and payment_link.paid
        if (!"payment.captured".equals(event) && !"order.paid".equals(event) && !"payment_link.paid".equals(event)) {
            log.info("Event '{}' is not a target settlement event. Acknowledged.", event);
            return;
        }

        if (!data.has("payload")) {
            log.warn("Webhook event '{}' missing 'payload' object", event);
            return;
        }

        JSONObject payloadObj = data.getJSONObject("payload");

        String paymentId = null;
        String orderId = null;
        Long amountInPaise = null;
        JSONObject notes = null;
        String fallbackReferenceId = null;

        if ("payment.captured".equals(event)) {
            if (payloadObj.has("payment") && payloadObj.getJSONObject("payment").has("entity")) {
                JSONObject paymentEntity = payloadObj.getJSONObject("payment").getJSONObject("entity");
                paymentId = paymentEntity.optString("id", null);
                orderId = paymentEntity.optString("order_id", null);
                amountInPaise = paymentEntity.optLong("amount", 0L);
                if (paymentEntity.has("notes")) {
                    notes = paymentEntity.getJSONObject("notes");
                }
                fallbackReferenceId = paymentEntity.optString("description", null);
            }
        } else if ("order.paid".equals(event)) {
            if (payloadObj.has("order") && payloadObj.getJSONObject("order").has("entity")) {
                JSONObject orderEntity = payloadObj.getJSONObject("order").getJSONObject("entity");
                orderId = orderEntity.optString("id", null);
                amountInPaise = orderEntity.optLong("amount_paid", orderEntity.optLong("amount", 0L));
                if (orderEntity.has("notes")) {
                    notes = orderEntity.getJSONObject("notes");
                }
                fallbackReferenceId = orderEntity.optString("receipt", null);
            }
            if (payloadObj.has("payment") && payloadObj.getJSONObject("payment").has("entity")) {
                JSONObject paymentEntity = payloadObj.getJSONObject("payment").getJSONObject("entity");
                paymentId = paymentEntity.optString("id", null);
                if (amountInPaise == null || amountInPaise == 0L) {
                    amountInPaise = paymentEntity.optLong("amount", 0L);
                }
                if (notes == null && paymentEntity.has("notes")) {
                    notes = paymentEntity.getJSONObject("notes");
                }
            }
        } else if ("payment_link.paid".equals(event)) {
            if (payloadObj.has("payment_link") && payloadObj.getJSONObject("payment_link").has("entity")) {
                JSONObject linkEntity = payloadObj.getJSONObject("payment_link").getJSONObject("entity");
                fallbackReferenceId = linkEntity.optString("reference_id", null);
                amountInPaise = linkEntity.optLong("amount", 0L);
                if (linkEntity.has("notes")) {
                    notes = linkEntity.getJSONObject("notes");
                }
            }
            if (payloadObj.has("payment") && payloadObj.getJSONObject("payment").has("entity")) {
                paymentId = payloadObj.getJSONObject("payment").getJSONObject("entity").optString("id", null);
            }
            if (paymentId == null && payloadObj.has("payment_link")) {
                paymentId = payloadObj.getJSONObject("payment_link").getJSONObject("entity").optString("id", null);
            }
        }

        if (paymentId == null || paymentId.isBlank()) {
            log.warn("Missing verified payment identifier for event '{}'. Aborting.", event);
            return;
        }

        String txnRef = paymentId.trim();

        // Idempotency Guard: Check if a Payment with transactionRef = payment_id already exists
        if (paymentRepository.existsByTransactionReference(txnRef)) {
            log.info("Idempotency guard: Payment with transactionRef='{}' already recorded. Skipping.", txnRef);
            return;
        }

        // Amount in standard currency units (Paise to Rupees)
        BigDecimal paidAmount = BigDecimal.valueOf(amountInPaise != null ? amountInPaise : 0L)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        // Extract custom notes (invoice_id, tenant_id)
        Long invoiceId = null;
        Long tenantId = null;

        if (notes != null) {
            String invStr = notes.optString("invoice_id", notes.optString("invoiceId", notes.optString("id", null)));
            if (invStr != null && !invStr.isBlank()) {
                try {
                    invoiceId = Long.parseLong(invStr.trim());
                } catch (NumberFormatException e) {
                    if (fallbackReferenceId == null) {
                        fallbackReferenceId = invStr.trim();
                    }
                }
            }
            String tenantStr = notes.optString("tenant_id", notes.optString("tenantId", null));
            if (tenantStr != null && !tenantStr.isBlank()) {
                try {
                    tenantId = Long.parseLong(tenantStr.trim());
                } catch (NumberFormatException ignored) {}
            }
        }

        // Fallback target Invoice lookup
        if (invoiceId == null) {
            Optional<Invoice> resolvedOpt = Optional.empty();
            if (fallbackReferenceId != null && !fallbackReferenceId.isBlank()) {
                if (fallbackReferenceId.startsWith("Payment for Invoice ")) {
                    fallbackReferenceId = fallbackReferenceId.replace("Payment for Invoice ", "").trim();
                }
                resolvedOpt = invoiceRepository.findByInvoiceNumber(fallbackReferenceId);
            }
            if (resolvedOpt.isEmpty() && orderId != null && !orderId.isBlank()) {
                resolvedOpt = invoiceRepository.findByPaymentLinkId(orderId);
            }
            if (resolvedOpt.isPresent()) {
                Invoice resolvedInvoice = resolvedOpt.get();
                invoiceId = resolvedInvoice.getId();
                if (tenantId == null) {
                    tenantId = resolvedInvoice.getTenantId();
                }
            }
        }

        if (invoiceId == null) {
            log.warn("Target invoice could not be resolved from webhook event '{}' [txnRef={}, orderId={}]. Cannot reconcile.",
                    event, txnRef, orderId);
            return;
        }

        // Ledger settlement & notification
        Payment recorded = paymentService.processRazorpayWebhookSettlement(
                invoiceId, tenantId, paidAmount, txnRef, orderId, event);

        if (recorded != null) {
            log.info("Successfully reconciled webhook payment {} for invoice ID: {}",
                    recorded.getPaymentNumber(), invoiceId);
        }
    }
}
