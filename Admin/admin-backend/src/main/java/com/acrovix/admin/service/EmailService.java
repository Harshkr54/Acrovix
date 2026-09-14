package com.acrovix.admin.service;

import com.acrovix.admin.entity.Quotation;
import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.services.emails.model.Attachment;
import com.resend.services.emails.model.CreateEmailOptions;
import com.resend.services.emails.model.CreateEmailResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Base64;
import java.util.Collections;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    private final PdfService pdfService;

    @Value("${resend.api-key:}")
    private String resendApiKey;

    @Value("${acrovix.mail.from-email:sales@acrovix.com}")
    private String fromEmail;

    @Value("${acrovix.mail.from-name:ACROVIX}")
    private String fromName;

    public EmailService(PdfService pdfService) {
        this.pdfService = pdfService;
    }

    public void sendQuotationEmail(Quotation quotation) {
        sendQuotationEmail(quotation, null);
    }

    public void sendQuotationEmail(Quotation quotation, String overrideEmail) {
        if (quotation == null) {
            throw new IllegalArgumentException("Quotation cannot be null");
        }

        String targetEmail = (overrideEmail != null && !overrideEmail.trim().isEmpty()) 
                ? overrideEmail.trim() 
                : quotation.getClientEmail();

        if (targetEmail == null || targetEmail.trim().isEmpty()) {
            throw new IllegalArgumentException("Client email is required to send quotation");
        }
        if (resendApiKey == null || resendApiKey.trim().isEmpty()) {
            logger.error("Resend API key is missing or not configured (RESEND_API_KEY environment variable)");
            throw new IllegalStateException("Email service configuration is incomplete. Please configure RESEND_API_KEY.");
        }

        try {
            byte[] pdfBytes = pdfService.generateQuotationPdf(quotation);
            if (pdfBytes == null || pdfBytes.length == 0) {
                throw new IllegalStateException("Generated quotation PDF is empty");
            }
            // Some Resend SDK versions accept String (Base64). Let's use Base64 to be safe.
            String base64Pdf = Base64.getEncoder().encodeToString(pdfBytes);

            String activeFromEmail = (fromEmail != null && !fromEmail.trim().isEmpty()) ? fromEmail.trim() : "sales@acrovix.com";
            String activeFromName = (fromName != null && !fromName.trim().isEmpty()) ? fromName.trim() : "ACROVIX";
            String from = activeFromName + " <" + activeFromEmail + ">";

            String to = targetEmail;
            if (quotation.getClientName() != null && !quotation.getClientName().trim().isEmpty()) {
                to = quotation.getClientName().trim() + " <" + to + ">";
            }

            String subject = "Acrovix Quotation: " + (quotation.getQuotationNumber() != null ? quotation.getQuotationNumber() : "");
            String htmlContent = "<p>Dear " + (quotation.getClientName() != null ? quotation.getClientName() : "Client") + ",</p><p>Please find attached your requested quotation.</p><p>Best regards,<br/>ACROVIX</p>";
            String filename = (quotation.getQuotationNumber() != null ? quotation.getQuotationNumber() : "quotation") + ".pdf";

            Attachment attachment = Attachment.builder()
                    .fileName(filename)
                    .content(base64Pdf)
                    .build();

            CreateEmailOptions sendEmailRequest = CreateEmailOptions.builder()
                    .from(from)
                    .to(to)
                    .subject(subject)
                    .html(htmlContent)
                    .attachments(Collections.singletonList(attachment))
                    .build();

            Resend resend = new Resend(resendApiKey.trim());
            CreateEmailResponse data = resend.emails().send(sendEmailRequest);
            
            logger.info("Successfully sent quotation email #{} to {}", quotation.getId(), targetEmail);
        } catch (IllegalArgumentException | IllegalStateException e) {
            logger.error("Quotation email failed validation/configuration check [quotationId={}]: {}",
                    quotation != null ? quotation.getId() : null, e.getMessage());
            throw e;
        } catch (ResendException e) {
            logger.error("Resend API Error [quotationId={}] Status: {}",
                    quotation != null ? quotation.getId() : null, e.getMessage());
            throw new IllegalStateException("Failed to send email via Resend. Please try again later.", e);
        } catch (Exception e) {
            logger.error("Failed to send quotation email via Resend [quotationId={}, clientEmail={}, exception={}]: {}",
                    quotation != null ? quotation.getId() : null,
                    targetEmail,
                    e.getClass().getSimpleName(), e.getMessage(), e);
            throw new IllegalStateException("Unable to send quotation email. Please try again later.", e);
        }
    }

    public java.util.Map<String, String> generatePreviewEmailDetails(Quotation quotation) {
        if (quotation == null) {
            throw new IllegalArgumentException("Quotation cannot be null for email preview");
        }
        
        String targetEmail = quotation.getClientEmail();
        if (targetEmail == null || targetEmail.trim().isEmpty()) {
            targetEmail = "[Client Email Pending]";
        }

        String activeFromEmail = (fromEmail != null && !fromEmail.trim().isEmpty()) ? fromEmail.trim() : "sales@acrovix.com";
        String activeFromName = (fromName != null && !fromName.trim().isEmpty()) ? fromName.trim() : "ACROVIX";
        String from = activeFromName + " <" + activeFromEmail + ">";

        String to = targetEmail;
        if (quotation.getClientName() != null && !quotation.getClientName().trim().isEmpty()) {
            to = quotation.getClientName().trim() + " <" + to + ">";
        }

        String quotationNumber = (quotation.getQuotationNumber() != null && !quotation.getQuotationNumber().isEmpty()) 
                ? quotation.getQuotationNumber() 
                : "PREVIEW-DRAFT";
                
        String subject = "Acrovix Quotation: " + quotationNumber;
        String clientNameDisplay = (quotation.getClientName() != null && !quotation.getClientName().trim().isEmpty()) 
                ? quotation.getClientName() 
                : "Client";
                
        String htmlContent = "<p>Dear " + clientNameDisplay + ",</p><p>Please find attached your requested quotation.</p><p>Best regards,<br/>ACROVIX</p>";
        String filename = quotationNumber + ".pdf";

        java.util.Map<String, String> details = new java.util.HashMap<>();
        details.put("from", from);
        details.put("to", to);
        details.put("subject", subject);
        details.put("htmlContent", htmlContent);
        details.put("filename", filename);
        
        return details;
    }
}
