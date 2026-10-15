package com.acrovix.admin.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class PaymentWebhookSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Value("${razorpay.webhook-secret:test_dummy_secret_12345}")
    private String webhookSecret;

    private String calculateHmacSha256(String data, String key) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKeySpec = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        mac.init(secretKeySpec);
        byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        for (byte b : rawHmac) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    @Test
    @DisplayName("BUG-01 Fix: Anonymous webhook with valid signature passes security filter and returns 200")
    void testWebhookWithoutJwtReachesControllerWithValidSignature() throws Exception {
        String payload = "{\"event\":\"dummy.unhandled.event\",\"payload\":{}}";
        String validSignature = calculateHmacSha256(payload, webhookSecret);

        // Crucial test: No Authorization header provided (anonymous call from Razorpay)
        mockMvc.perform(post("/api/webhooks/razorpay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload)
                        .header("X-Razorpay-Signature", validSignature))
                .andExpect(status().isOk())
                .andExpect(content().string("Webhook processed"));
    }

    @Test
    @DisplayName("BUG-01 Fix: Anonymous webhook with invalid signature is rejected with HTTP 400 (not 401)")
    void testWebhookWithInvalidSignatureReturns400() throws Exception {
        String payload = "{\"event\":\"payment.captured\",\"payload\":{}}";
        String invalidSignature = "invalid_tampered_signature_hex";

        mockMvc.perform(post("/api/webhooks/razorpay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload)
                        .header("X-Razorpay-Signature", invalidSignature))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Invalid signature"));
    }

    @Test
    @DisplayName("BUG-01 Fix: Anonymous webhook missing signature header returns HTTP 400 Bad Request")
    void testWebhookMissingSignatureHeaderReturns400() throws Exception {
        String payload = "{\"event\":\"payment.captured\",\"payload\":{}}";

        mockMvc.perform(post("/api/webhooks/razorpay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Missing signature"));
    }
}
