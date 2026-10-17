package com.acrovix.admin.controller;

import com.acrovix.admin.service.RazorpayWebhookService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api/public/payments/razorpay")
@RequiredArgsConstructor
@Slf4j
public class RazorpayWebhookController {

    private final RazorpayWebhookService razorpayWebhookService;

    /**
     * Razorpay Webhook Endpoint (POST /api/public/payments/razorpay/webhook)
     * Secure unauthenticated endpoint receiving Razorpay webhook events.
     * Rejects invalid or missing signatures with HTTP 400 Bad Request.
     * Reconciles invoice payments idempotently and always returns HTTP 200 on handled events.
     *
     * @param payload   raw JSON body string for signature verification
     * @param signature header X-Razorpay-Signature
     * @return HTTP 200 on success/handled event, HTTP 400 on signature failure
     */
    @PostMapping("/webhook")
    public ResponseEntity<?> handleRazorpayWebhook(
            @RequestBody(required = false) String payload,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {

        if (payload == null || payload.isBlank()) {
            log.warn("Razorpay webhook rejected: empty payload");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("status", "error", "message", "Payload is required"));
        }

        if (signature == null || signature.isBlank()) {
            log.warn("Razorpay webhook rejected: missing X-Razorpay-Signature header");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("status", "error", "message", "Missing X-Razorpay-Signature header"));
        }

        // Verify HMAC-SHA256 signature against razorpay.webhook.secret
        boolean isValid = razorpayWebhookService.verifySignature(payload, signature);
        if (!isValid) {
            log.warn("Razorpay webhook rejected: invalid X-Razorpay-Signature");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("status", "error", "message", "Invalid signature"));
        }

        // Wrap in strict try...catch ensuring webhooks return HTTP 200 on handled events to prevent Razorpay delivery retries
        try {
            razorpayWebhookService.processWebhookPayload(payload);
            return ResponseEntity.ok(Map.of("status", "success", "message", "Webhook processed"));
        } catch (Exception e) {
            log.error("Error encountered while processing Razorpay webhook payload: {}", e.getMessage(), e);
            // Return HTTP 200 OK with handled status so provider does not retry poisoned/failing events indefinitely
            return ResponseEntity.ok(Map.of("status", "handled_with_error", "message", e.getMessage() != null ? e.getMessage() : "Internal processing handled"));
        }
    }
}
