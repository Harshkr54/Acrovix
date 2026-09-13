package com.acrovix.admin.service;

import com.acrovix.admin.entity.Quotation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    private final PdfService pdfService;
    private final RestTemplate restTemplate;

    @Value("${brevo.api-key:}")
    private String brevoApiKey;

    @Value("${acrovix.mail.from-email:sales@acrovix.com}")
    private String fromEmail;

    @Value("${acrovix.mail.from-name:ACROVIX}")
    private String fromName;

    public EmailService(PdfService pdfService, RestTemplate restTemplate) {
        this.pdfService = pdfService;
        this.restTemplate = restTemplate;
    }

    public void sendQuotationEmail(Quotation quotation) {
        if (quotation == null) {
            throw new IllegalArgumentException("Quotation cannot be null");
        }
        if (quotation.getClientEmail() == null || quotation.getClientEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("Client email is required to send quotation");
        }
        if (brevoApiKey == null || brevoApiKey.trim().isEmpty()) {
            logger.error("Brevo API key is missing or not configured (BREVO_API_KEY environment variable)");
            throw new IllegalStateException("Email service configuration is incomplete. Please configure BREVO_API_KEY.");
        }

        try {
            byte[] pdfBytes = pdfService.generateQuotationPdf(quotation);
            if (pdfBytes == null || pdfBytes.length == 0) {
                throw new IllegalStateException("Generated quotation PDF is empty");
            }
            String base64Pdf = Base64.getEncoder().encodeToString(pdfBytes);

            String url = "https://api.brevo.com/v3/smtp/email";

            String activeFromEmail = (fromEmail != null && !fromEmail.trim().isEmpty()) ? fromEmail.trim() : "sales@acrovix.com";
            String activeFromName = (fromName != null && !fromName.trim().isEmpty()) ? fromName.trim() : "ACROVIX";

            Map<String, Object> sender = new HashMap<>();
            sender.put("name", activeFromName);
            sender.put("email", activeFromEmail);

            Map<String, Object> to = new HashMap<>();
            to.put("email", quotation.getClientEmail().trim());
            if (quotation.getClientName() != null && !quotation.getClientName().trim().isEmpty()) {
                to.put("name", quotation.getClientName().trim());
            } else {
                to.put("name", quotation.getClientEmail().trim());
            }

            Map<String, Object> attachment = new HashMap<>();
            attachment.put("content", base64Pdf);
            attachment.put("name", (quotation.getQuotationNumber() != null ? quotation.getQuotationNumber() : "quotation") + ".pdf");

            Map<String, Object> payload = new HashMap<>();
            payload.put("sender", sender);
            payload.put("to", List.of(to));
            payload.put("subject", "Acrovix Quotation: " + (quotation.getQuotationNumber() != null ? quotation.getQuotationNumber() : ""));
            payload.put("htmlContent", "<p>Dear " + (quotation.getClientName() != null ? quotation.getClientName() : "Client") + ",</p><p>Please find attached your requested quotation.</p><p>Best regards,<br/>ACROVIX</p>");
            payload.put("attachment", List.of(attachment));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", brevoApiKey.trim());
            headers.set("accept", "application/json");

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

            restTemplate.postForObject(url, entity, String.class);
            logger.info("Successfully sent quotation email #{} to {}", quotation.getId(), quotation.getClientEmail());
        } catch (IllegalArgumentException | IllegalStateException e) {
            throw e;
        } catch (HttpStatusCodeException e) {
            logger.error("Brevo API HTTP Error {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new IllegalStateException("Failed to send email via Brevo (" + e.getStatusCode().value() + "). Please try again later.");
        } catch (Exception e) {
            logger.error("Failed to send quotation email via Brevo: {}", e.getMessage(), e);
            throw new IllegalStateException("Unable to send quotation email. Please try again later.");
        }
    }
}
