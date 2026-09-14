package com.acrovix.admin.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Component
public class BrevoDiagnosticRunner implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(BrevoDiagnosticRunner.class);

    @Value("${brevo.api-key:}")
    private String brevoApiKey;

    private final RestTemplate restTemplate;

    public BrevoDiagnosticRunner(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        logger.info("=================================================");
        logger.info("STARTING TEMPORARY BREVO DIAGNOSTIC");
        logger.info("=================================================");

        if (brevoApiKey == null || brevoApiKey.isEmpty()) {
            logger.error("[BREVO DIAGNOSTIC] API Key is entirely missing or empty.");
            return;
        }

        String actualKey = brevoApiKey; // Intentionally NOT trimmed here to check length
        String trimmedKey = brevoApiKey.trim();

        logger.info("[BREVO DIAGNOSTIC] Key is present.");
        logger.info("[BREVO DIAGNOSTIC] Raw key length: {}", actualKey.length());
        logger.info("[BREVO DIAGNOSTIC] Trimmed key length: {}", trimmedKey.length());
        
        if (actualKey.length() != trimmedKey.length()) {
            logger.warn("[BREVO DIAGNOSTIC] WARNING: Key contains leading/trailing whitespace!");
        }

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(trimmedKey.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            String fingerprint = hexString.substring(0, 12);
            logger.info("[BREVO DIAGNOSTIC] Key SHA-256 Fingerprint (first 12 chars): {}", fingerprint);
        } catch (Exception e) {
            logger.error("[BREVO DIAGNOSTIC] Failed to generate SHA-256 fingerprint.", e);
        }

        logger.info("[BREVO DIAGNOSTIC] Making test request to GET https://api.brevo.com/v3/account");

        String url = "https://api.brevo.com/v3/account";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("api-key", trimmedKey);
        headers.set("accept", "application/json");

        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            logger.info("[BREVO DIAGNOSTIC] SUCCESS! HTTP Status: {}", response.getStatusCode().value());
            String responseBody = response.getBody();
            // Redact potential secrets in response if any
            if (responseBody != null) {
                String redactedBody = responseBody.replaceAll("\"[a-zA-Z0-9_-]{20,}\"", "\"[REDACTED_SECRET]\"");
                logger.info("[BREVO DIAGNOSTIC] Response Body (redacted): {}", redactedBody);
            }
        } catch (HttpStatusCodeException e) {
            logger.error("[BREVO DIAGNOSTIC] FAILURE! HTTP Status: {}", e.getStatusCode().value());
            String responseBody = e.getResponseBodyAsString();
            String redactedBody = responseBody.replace(trimmedKey, "[REDACTED_API_KEY]");
            logger.error("[BREVO DIAGNOSTIC] Error Response Body: {}", redactedBody);
        } catch (Exception e) {
            logger.error("[BREVO DIAGNOSTIC] EXCEPTION during request: {} - {}", e.getClass().getSimpleName(), e.getMessage());
        }

        logger.info("=================================================");
        logger.info("FINISHED TEMPORARY BREVO DIAGNOSTIC");
        logger.info("=================================================");
    }
}
