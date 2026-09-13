package com.acrovix.admin.service;

import com.acrovix.admin.entity.Quotation;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final PdfService pdfService;

    @Value("${brevo.api-key}")
    private String brevoApiKey;

    @Value("${acrovix.mail.from-email:sales@acrovix.com}")
    private String fromEmail;

    @Value("${acrovix.mail.from-name:ACROVIX}")
    private String fromName;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public void sendQuotationEmail(Quotation quotation) {
        try {
            byte[] pdfBytes = pdfService.generateQuotationPdf(quotation);
            String base64Pdf = Base64.getEncoder().encodeToString(pdfBytes);

            String url = "https://api.brevo.com/v3/smtp/email";

            Map<String, Object> sender = new HashMap<>();
            sender.put("name", fromName);
            sender.put("email", fromEmail);

            Map<String, Object> to = new HashMap<>();
            to.put("email", quotation.getClientEmail());
            to.put("name", quotation.getClientName());

            Map<String, Object> attachment = new HashMap<>();
            attachment.put("content", base64Pdf);
            attachment.put("name", quotation.getQuotationNumber() + ".pdf");

            Map<String, Object> payload = new HashMap<>();
            payload.put("sender", sender);
            payload.put("to", List.of(to));
            payload.put("subject", "Acrovix Quotation: " + quotation.getQuotationNumber());
            payload.put("htmlContent", "<p>Dear " + quotation.getClientName() + ",</p><p>Please find attached the requested quotation.</p><p>Best regards,<br/>Acrovix Innovations</p>");
            payload.put("attachment", List.of(attachment));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", brevoApiKey);
            headers.set("accept", "application/json");

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

            restTemplate.postForObject(url, entity, String.class);
        } catch (Exception e) {
            // Log the full error server-side; do NOT expose API response details to callers.
            org.slf4j.LoggerFactory.getLogger(EmailService.class)
                    .error("Failed to send quotation email via Brevo", e);
            throw new RuntimeException("Failed to send email. Please try again later.");
        }
    }
}
