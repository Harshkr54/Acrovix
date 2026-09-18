package com.acrovix.admin.service;

import com.acrovix.admin.dto.email.EmailAttachment;
import com.acrovix.admin.dto.email.EmailRequest;
import com.acrovix.admin.entity.*;
import com.acrovix.admin.repository.EmailLogRepository;
import com.resend.Resend;
import com.resend.services.emails.model.Attachment;
import com.resend.services.emails.model.CreateEmailOptions;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    private final PdfService pdfService;
    private final EmailTemplateBuilder templateBuilder;
    private final EmailLogRepository emailLogRepository;
    private final JavaMailSender mailSender;

    @Value("${acrovix.email.from:${acrovix.mail.from-email:sales@acrovix.com}}")
    private String fromEmail;

    @Value("${acrovix.email.from-name:${acrovix.mail.from-name:ACROVIX INNOVATIONS PRIVATE LIMITED}}")
    private String fromName;

    @Value("${acrovix.email.crm-notification:}")
    private String crmNotificationEmail;

    @Value("${acrovix.email.admin-notification:}")
    private String adminNotificationEmail;

    @Value("${acrovix.app.frontend-url:}")
    private String frontendUrl;

    @Value("${resend.api-key:}")
    private String resendApiKey;

    @Value("${app.demo-mode:false}")
    private boolean demoMode;

    @Autowired
    public EmailService(
            PdfService pdfService,
            EmailTemplateBuilder templateBuilder,
            @Autowired(required = false) EmailLogRepository emailLogRepository,
            @Autowired(required = false) JavaMailSender mailSender) {
        this.pdfService = pdfService;
        this.templateBuilder = templateBuilder != null ? templateBuilder : new EmailTemplateBuilder();
        this.emailLogRepository = emailLogRepository;
        this.mailSender = mailSender;
    }

    public EmailService(PdfService pdfService) {
        this(pdfService, new EmailTemplateBuilder(), null, null);
    }

    /**
     * Send simple text email.
     */
    public boolean sendSimpleTextEmail(String to, String subject, String body) {
        return sendSimpleTextEmail(to, subject, body, EmailType.GENERAL);
    }

    public boolean sendSimpleTextEmail(String to, String subject, String body, EmailType emailType) {
        EmailRequest request = EmailRequest.builder()
                .to(to)
                .subject(subject)
                .body(body)
                .isHtml(false)
                .emailType(emailType)
                .build();
        return sendEmail(request);
    }

    /**
     * Send HTML email (automatically formatted with corporate template if raw body).
     */
    public boolean sendHtmlEmail(String to, String subject, String htmlBody) {
        return sendHtmlEmail(to, subject, htmlBody, EmailType.GENERAL);
    }

    public boolean sendHtmlEmail(String to, String subject, String htmlBody, EmailType emailType) {
        String fullHtml = htmlBody;
        if (htmlBody != null && !htmlBody.toLowerCase().contains("<html")) {
            fullHtml = templateBuilder.buildCorporateEmail(subject, htmlBody);
        }
        EmailRequest request = EmailRequest.builder()
                .to(to)
                .subject(subject)
                .htmlBody(fullHtml)
                .isHtml(true)
                .emailType(emailType)
                .build();
        return sendEmail(request);
    }

    /**
     * Reusable core email sending logic with standard JavaMailSender & audit logging.
     */
    public boolean sendEmail(EmailRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("EmailRequest cannot be null");
        }
        if (request.getTo() == null || request.getTo().trim().isEmpty()) {
            throw new IllegalArgumentException("Recipient email is required");
        }
        if (request.getSubject() == null) {
            request.setSubject("");
        }

        String targetEmail = request.getTo().trim();
        String subject = request.getSubject();
        EmailType type = request.getEmailType() != null ? request.getEmailType() : EmailType.GENERAL;

        if (demoMode) {
            logger.info("DEMO MODE: Email to {} [Type: {}, Subject: '{}'] suppressed.", targetEmail, type, subject);
            logEmail(targetEmail, subject, type, EmailStatus.SENT, null, request.getRelatedEntityType(), request.getRelatedEntityId());
            return true;
        }

        String activeFromEmail = (fromEmail != null && !fromEmail.trim().isEmpty()) ? fromEmail.trim() : "sales@acrovix.com";
        String activeFromName = (fromName != null && !fromName.trim().isEmpty()) ? fromName.trim() : "ACROVIX INNOVATIONS PRIVATE LIMITED";

        try {
            if (mailSender != null) {
                MimeMessage mimeMessage = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");

                try {
                    helper.setFrom(new InternetAddress(activeFromEmail, activeFromName));
                } catch (Exception e) {
                    helper.setFrom(activeFromEmail);
                }

                helper.setTo(targetEmail);
                helper.setSubject(subject);

                if (request.isHtml()) {
                    String htmlContent = request.getHtmlBody();
                    if (htmlContent == null || htmlContent.trim().isEmpty()) {
                        htmlContent = request.getBody() != null ? request.getBody() : "";
                    }
                    helper.setText(htmlContent, true);
                } else {
                    helper.setText(request.getBody() != null ? request.getBody() : "", false);
                }

                if (request.getAttachments() != null) {
                    for (EmailAttachment attachment : request.getAttachments()) {
                        if (attachment != null && attachment.getContent() != null && attachment.getContent().length > 0) {
                            String contentType = attachment.getContentType() != null ? attachment.getContentType() : "application/octet-stream";
                            helper.addAttachment(
                                    attachment.getFilename() != null ? attachment.getFilename() : "attachment",
                                    new ByteArrayResource(attachment.getContent()),
                                    contentType
                            );
                        }
                    }
                }

                mailSender.send(mimeMessage);
                logger.info("Successfully sent email to {} via JavaMailSender [Type: {}, Subject: '{}']", targetEmail, type, subject);
                logEmail(targetEmail, subject, type, EmailStatus.SENT, null, request.getRelatedEntityType(), request.getRelatedEntityId());
                return true;
            } else if (resendApiKey != null && !resendApiKey.trim().isEmpty()) {
                sendViaResend(targetEmail, subject, request, activeFromEmail, activeFromName);
                logEmail(targetEmail, subject, type, EmailStatus.SENT, null, request.getRelatedEntityType(), request.getRelatedEntityId());
                return true;
            } else {
                String errMsg = "Email service configuration is incomplete. Please configure MAIL_HOST or RESEND_API_KEY.";
                logger.error("Email send failed for recipient {}: {}", targetEmail, errMsg);
                logEmail(targetEmail, subject, type, EmailStatus.FAILED, errMsg, request.getRelatedEntityType(), request.getRelatedEntityId());
                throw new IllegalStateException(errMsg);
            }
        } catch (IllegalArgumentException | IllegalStateException e) {
            logEmail(targetEmail, subject, type, EmailStatus.FAILED, e.getMessage(), request.getRelatedEntityType(), request.getRelatedEntityId());
            throw e;
        } catch (Exception e) {
            logger.error("Email transmission error [recipient={}, subject={}, type={}]: {}", targetEmail, subject, type, e.getMessage());
            logEmail(targetEmail, subject, type, EmailStatus.FAILED, e.getMessage(), request.getRelatedEntityType(), request.getRelatedEntityId());
            throw new IllegalStateException("Failed to send email. Please try again later.", e);
        }
    }

    /**
     * Asynchronous email dispatching.
     */
    @Async("emailTaskExecutor")
    public CompletableFuture<Boolean> sendEmailAsync(EmailRequest request) {
        try {
            boolean result = sendEmail(request);
            return CompletableFuture.completedFuture(result);
        } catch (Exception e) {
            logger.error("Async email dispatch failed for recipient {}: {}", request != null ? request.getTo() : null, e.getMessage());
            return CompletableFuture.completedFuture(false);
        }
    }

    /**
     * High-level quotation email trigger.
     */
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

        byte[] pdfBytes = pdfService.generateQuotationPdf(quotation);
        if (pdfBytes == null || pdfBytes.length == 0) {
            throw new IllegalStateException("Generated quotation PDF is empty");
        }

        String quotationNumber = (quotation.getQuotationNumber() != null && !quotation.getQuotationNumber().isEmpty()) 
                ? quotation.getQuotationNumber() 
                : "QT-" + quotation.getId();
        String subject = "Acrovix Quotation: " + quotationNumber;
        String formattedHtml = templateBuilder.buildQuotationEmailHtml(quotation);
        String filename = quotationNumber + ".pdf";

        EmailAttachment pdfAttachment = EmailAttachment.builder()
                .filename(filename)
                .content(pdfBytes)
                .contentType("application/pdf")
                .build();

        EmailRequest request = EmailRequest.builder()
                .to(targetEmail)
                .subject(subject)
                .htmlBody(formattedHtml)
                .isHtml(true)
                .emailType(EmailType.QUOTATION)
                .relatedEntityType("QUOTATION")
                .relatedEntityId(quotation.getId())
                .attachments(Collections.singletonList(pdfAttachment))
                .build();

        sendEmail(request);
    }

    /**
     * Send Invoice Email
     */
    public boolean sendInvoiceEmail(Invoice invoice, String overrideEmail) {
        if (invoice == null) {
            throw new IllegalArgumentException("Invoice cannot be null");
        }

        String targetEmail = (overrideEmail != null && !overrideEmail.trim().isEmpty())
                ? overrideEmail.trim()
                : (invoice.getCustomer() != null && invoice.getCustomer().getEmail() != null
                        ? invoice.getCustomer().getEmail().trim()
                        : invoice.getClientEmail());

        if (targetEmail == null || targetEmail.trim().isEmpty()) {
            throw new IllegalArgumentException("Recipient email is required to send invoice");
        }

        String invoiceNo = invoice.getInvoiceNumber() != null ? invoice.getInvoiceNumber() : "INV-" + invoice.getId();
        String subject = "Acrovix Invoice: " + invoiceNo;
        String formattedHtml = templateBuilder.buildInvoiceEmailHtml(invoice);

        EmailRequest request = EmailRequest.builder()
                .to(targetEmail)
                .subject(subject)
                .htmlBody(formattedHtml)
                .isHtml(true)
                .emailType(EmailType.INVOICE)
                .relatedEntityType("INVOICE")
                .relatedEntityId(invoice.getId())
                .build();

        return sendEmail(request);
    }

    /**
     * Send Payment Receipt Email
     */
    public boolean sendPaymentReceiptEmail(Payment payment, String overrideEmail) {
        if (payment == null) {
            throw new IllegalArgumentException("Payment cannot be null");
        }

        String targetEmail = (overrideEmail != null && !overrideEmail.trim().isEmpty())
                ? overrideEmail.trim()
                : (payment.getCustomer() != null && payment.getCustomer().getEmail() != null
                        ? payment.getCustomer().getEmail().trim()
                        : (payment.getInvoice() != null ? payment.getInvoice().getClientEmail() : null));

        if (targetEmail == null || targetEmail.trim().isEmpty()) {
            throw new IllegalArgumentException("Recipient email is required to send payment receipt");
        }

        BigDecimal remainingBalance = null;
        if (payment.getInvoice() != null && payment.getInvoice().getGrandTotal() != null) {
            BigDecimal paid = payment.getInvoice().getAmountPaid() != null ? payment.getInvoice().getAmountPaid() : BigDecimal.ZERO;
            remainingBalance = payment.getInvoice().getGrandTotal().subtract(paid).max(BigDecimal.ZERO);
        }

        String paymentRef = payment.getPaymentNumber() != null ? payment.getPaymentNumber() : "PAY-" + payment.getId();
        String subject = "Acrovix Payment Receipt: " + paymentRef;
        String formattedHtml = templateBuilder.buildPaymentReceiptEmailHtml(payment, remainingBalance);

        EmailRequest request = EmailRequest.builder()
                .to(targetEmail)
                .subject(subject)
                .htmlBody(formattedHtml)
                .isHtml(true)
                .emailType(EmailType.PAYMENT_RECEIPT)
                .relatedEntityType("PAYMENT")
                .relatedEntityId(payment.getId())
                .build();

        return sendEmail(request);
    }

    /**
     * Internal CRM Lead Notification Email to ACROVIX staff
     */
    public boolean sendCrmLeadNotification(CrmLead lead) {
        if (lead == null) {
            logger.warn("CRM lead is null, skipping internal email notification");
            return false;
        }

        String recipient = (crmNotificationEmail != null && !crmNotificationEmail.trim().isEmpty())
                ? crmNotificationEmail.trim()
                : null;

        if (recipient == null) {
            logger.info("CRM notification email skipped: 'acrovix.email.crm-notification' is not configured.");
            return false;
        }

        String leadNo = lead.getLeadNumber() != null ? lead.getLeadNumber() : "LEAD-" + lead.getId();
        String contactName = lead.getFullName() != null ? lead.getFullName() : "New Contact";
        String subject = "New CRM Lead Notification: " + leadNo + " - " + contactName;
        String formattedHtml = templateBuilder.buildCrmLeadNotificationHtml(lead);

        EmailRequest request = EmailRequest.builder()
                .to(recipient)
                .subject(subject)
                .htmlBody(formattedHtml)
                .isHtml(true)
                .emailType(EmailType.CRM_LEAD)
                .relatedEntityType("CRM_LEAD")
                .relatedEntityId(lead.getId())
                .build();

        try {
            return sendEmail(request);
        } catch (Exception e) {
            logger.error("Failed to send internal CRM lead notification email for lead #{}: {}", leadNo, e.getMessage());
            return false;
        }
    }

    /**
     * Reusable Follow-Up Notification Foundation
     */
    @Async("emailTaskExecutor")
    public void sendFollowUpNotificationAsync(CrmFollowUp followUp, String notificationType, String overrideEmail) {
        sendFollowUpNotification(followUp, notificationType, overrideEmail);
    }
    
    @Async("emailTaskExecutor")
    public void sendFollowUpDueNotificationAsync(CrmFollowUp followUp) {
        if (followUp == null || followUp.getAssignedTo() == null || followUp.getAssignedTo().getEmail() == null) return;
        String subject = "CRM Follow-Up Due - " + (followUp.getLead() != null ? followUp.getLead().getLeadNumber() : "N/A");
        String htmlBody = templateBuilder.buildFollowUpNotificationHtml(followUp, "DUE");
        EmailRequest request = EmailRequest.builder().to(followUp.getAssignedTo().getEmail()).subject(subject).htmlBody(htmlBody).isHtml(true).emailType(EmailType.FOLLOW_UP_DUE).relatedEntityType("CRM_FOLLOW_UP").relatedEntityId(followUp.getId()).build();
        sendEmailAsync(request);
    }

    @Async("emailTaskExecutor")
    public void sendFollowUpOverdueNotificationAsync(CrmFollowUp followUp) {
        if (followUp == null || followUp.getAssignedTo() == null || followUp.getAssignedTo().getEmail() == null) return;
        String subject = "CRM Follow-Up Overdue - " + (followUp.getLead() != null ? followUp.getLead().getLeadNumber() : "N/A");
        String htmlBody = templateBuilder.buildFollowUpNotificationHtml(followUp, "OVERDUE");
        EmailRequest request = EmailRequest.builder().to(followUp.getAssignedTo().getEmail()).subject(subject).htmlBody(htmlBody).isHtml(true).emailType(EmailType.FOLLOW_UP_OVERDUE).relatedEntityType("CRM_FOLLOW_UP").relatedEntityId(followUp.getId()).build();
        sendEmailAsync(request);
    }
    
    public boolean sendFollowUpNotification(CrmFollowUp followUp, String notificationType, String overrideEmail) {
        if (followUp == null) {
            return false;
        }

        String targetEmail = (overrideEmail != null && !overrideEmail.trim().isEmpty())
                ? overrideEmail.trim()
                : (followUp.getAssignedTo() != null ? followUp.getAssignedTo().getEmail() : null);

        if (targetEmail == null || targetEmail.trim().isEmpty()) {
            logger.info("Follow-Up notification skipped: No recipient email provided/assigned.");
            return false;
        }

        String typeStr = notificationType != null ? notificationType : "DUE";
        String leadNo = (followUp.getLead() != null && followUp.getLead().getLeadNumber() != null)
                ? followUp.getLead().getLeadNumber()
                : "N/A";

        String subject = "CRM Follow-Up Alert [" + typeStr + "]: Lead #" + leadNo;
        String formattedHtml = templateBuilder.buildFollowUpNotificationHtml(followUp, typeStr);

        EmailRequest request = EmailRequest.builder()
                .to(targetEmail)
                .subject(subject)
                .htmlBody(formattedHtml)
                .isHtml(true)
                .emailType(EmailType.FOLLOW_UP)
                .relatedEntityType("CRM_FOLLOW_UP")
                .relatedEntityId(followUp.getId())
                .build();

        try {
            return sendEmail(request);
        } catch (Exception e) {
            logger.error("Failed to send follow-up notification email for follow-up #{}: {}", followUp.getId(), e.getMessage());
            return false;
        }
    }

    // --- PHASE 10: NEW ASYNC TRIGGERS --- //

    private String resolveInternalRecipient(String explicitEmail) {
        if (explicitEmail != null && !explicitEmail.trim().isEmpty()) {
            return explicitEmail.trim();
        }
        if (crmNotificationEmail != null && !crmNotificationEmail.trim().isEmpty()) {
            return crmNotificationEmail.trim();
        }
        if (adminNotificationEmail != null && !adminNotificationEmail.trim().isEmpty()) {
            return adminNotificationEmail.trim();
        }
        return null;
    }

    @Async("emailTaskExecutor")
    public void sendLoginSecurityEmailAsync(String targetEmail, String userName, String loginTime) {
        if (targetEmail == null || targetEmail.trim().isEmpty()) return;
        String subject = "New Login to Your ACROVIX Account";
        String htmlBody = templateBuilder.buildLoginSecurityHtml(userName, loginTime);
        EmailRequest request = EmailRequest.builder().to(targetEmail).subject(subject).htmlBody(htmlBody).isHtml(true).emailType(EmailType.LOGIN_SECURITY).build();
        sendEmailAsync(request);
    }

    @Async("emailTaskExecutor")
    public void sendWelcomeEmailAsync(AdminUser user) {
        if (user == null || user.getEmail() == null || user.getEmail().trim().isEmpty()) return;
        String subject = "Welcome to ACROVIX ERP";
        String htmlBody = templateBuilder.buildWelcomeHtml(user, frontendUrl);
        EmailRequest request = EmailRequest.builder().to(user.getEmail()).subject(subject).htmlBody(htmlBody).isHtml(true).emailType(EmailType.WELCOME).build();
        sendEmailAsync(request);
    }

    @Async("emailTaskExecutor")
    public void sendEnquiryNotificationAsync(AdminEnquiry enquiry) {
        String recipient = resolveInternalRecipient(null);
        if (recipient == null) {
            logger.info("Enquiry notification skipped: No internal recipient configured.");
            return;
        }
        String subject = "New Enquiry Received - " + enquiry.getId();
        String htmlBody = templateBuilder.buildEnquiryNotificationHtml(enquiry);
        EmailRequest request = EmailRequest.builder().to(recipient).subject(subject).htmlBody(htmlBody).isHtml(true).emailType(EmailType.ENQUIRY).relatedEntityType("ENQUIRY").relatedEntityId(enquiry.getId()).build();
        sendEmailAsync(request);
    }

    @Async("emailTaskExecutor")
    public void sendEnquiryAssignmentAsync(AdminEnquiry enquiry) {
        if (enquiry == null || enquiry.getAssignedTo() == null || enquiry.getAssignedTo().getEmail() == null) return;
        String subject = "New Enquiry Assigned to You - " + enquiry.getId();
        String htmlBody = templateBuilder.buildEnquiryAssignmentHtml(enquiry);
        EmailRequest request = EmailRequest.builder().to(enquiry.getAssignedTo().getEmail()).subject(subject).htmlBody(htmlBody).isHtml(true).emailType(EmailType.ENQUIRY_ASSIGNMENT).relatedEntityType("ENQUIRY").relatedEntityId(enquiry.getId()).build();
        sendEmailAsync(request);
    }

    @Async("emailTaskExecutor")
    public void sendLeadAssignmentAsync(CrmLead lead) {
        if (lead == null || lead.getAssignedTo() == null || lead.getAssignedTo().getEmail() == null) return;
        String leadNo = lead.getLeadNumber() != null ? lead.getLeadNumber() : "LEAD-" + lead.getId();
        String subject = "CRM Lead Assigned to You - " + leadNo;
        String htmlBody = templateBuilder.buildLeadAssignmentHtml(lead);
        EmailRequest request = EmailRequest.builder().to(lead.getAssignedTo().getEmail()).subject(subject).htmlBody(htmlBody).isHtml(true).emailType(EmailType.CRM_LEAD_ASSIGNMENT).relatedEntityType("CRM_LEAD").relatedEntityId(lead.getId()).build();
        sendEmailAsync(request);
    }

    @Async("emailTaskExecutor")
    public void sendQuotationResponseAsync(Quotation quotation) {
        String recipient = resolveInternalRecipient(quotation.getCreatedBy() != null ? quotation.getCreatedBy().getEmail() : null);
        if (recipient == null) return;
        String quotationNo = quotation.getQuotationNumber() != null ? quotation.getQuotationNumber() : "QT-" + quotation.getId();
        String subject = "Quotation " + quotation.getStatus() + " - " + quotationNo;
        String htmlBody = templateBuilder.buildQuotationResponseHtml(quotation);
        EmailRequest request = EmailRequest.builder().to(recipient).subject(subject).htmlBody(htmlBody).isHtml(true).emailType(EmailType.QUOTATION_RESPONSE).relatedEntityType("QUOTATION").relatedEntityId(quotation.getId()).build();
        sendEmailAsync(request);
    }

    @Async("emailTaskExecutor")
    public void sendPoNotificationAsync(PurchaseOrder po, String eventType) {
        String recipient = resolveInternalRecipient(po.getCreatedBy() != null ? po.getCreatedBy().getEmail() : null);
        if (recipient == null) return;
        String poNo = po.getPoNumber() != null ? po.getPoNumber() : "PO-" + po.getId();
        String subject = "Purchase Order Update [" + eventType + "] - " + poNo;
        String htmlBody = templateBuilder.buildPoNotificationHtml(po, eventType);
        EmailRequest request = EmailRequest.builder().to(recipient).subject(subject).htmlBody(htmlBody).isHtml(true).emailType(EmailType.PO_NOTIFICATION).relatedEntityType("PURCHASE_ORDER").relatedEntityId(po.getId()).build();
        sendEmailAsync(request);
    }

    @Async("emailTaskExecutor")
    public void sendInvoiceNotificationAsync(Invoice invoice, String eventType) {
        String recipient = resolveInternalRecipient(invoice.getCreatedBy() != null ? invoice.getCreatedBy().getEmail() : null);
        if (recipient == null) return;
        String invoiceNo = invoice.getInvoiceNumber() != null ? invoice.getInvoiceNumber() : "INV-" + invoice.getId();
        String subject = "Invoice Update [" + eventType + "] - " + invoiceNo;
        String htmlBody = templateBuilder.buildInvoiceNotificationHtml(invoice, eventType);
        EmailRequest request = EmailRequest.builder().to(recipient).subject(subject).htmlBody(htmlBody).isHtml(true).emailType(EmailType.INVOICE_NOTIFICATION).relatedEntityType("INVOICE").relatedEntityId(invoice.getId()).build();
        sendEmailAsync(request);
    }

    @Async("emailTaskExecutor")
    public void sendInvoiceOverdueAsync(Invoice invoice) {
        String recipient = invoice.getCustomer() != null && invoice.getCustomer().getEmail() != null ? invoice.getCustomer().getEmail() : invoice.getClientEmail();
        if (recipient == null || recipient.trim().isEmpty()) return;
        String invoiceNo = invoice.getInvoiceNumber() != null ? invoice.getInvoiceNumber() : "INV-" + invoice.getId();
        String subject = "Overdue Invoice Reminder - " + invoiceNo;
        String htmlBody = templateBuilder.buildInvoiceOverdueHtml(invoice);
        EmailRequest request = EmailRequest.builder().to(recipient).subject(subject).htmlBody(htmlBody).isHtml(true).emailType(EmailType.INVOICE_OVERDUE).relatedEntityType("INVOICE").relatedEntityId(invoice.getId()).build();
        sendEmailAsync(request);
    }

    @Async("emailTaskExecutor")
    public void sendPaymentNotificationAsync(Payment payment, String eventType) {
        String recipient = resolveInternalRecipient(payment.getRecordedBy() != null ? payment.getRecordedBy().getEmail() : null);
        if (recipient == null) return;
        String paymentRef = payment.getPaymentNumber() != null ? payment.getPaymentNumber() : "PAY-" + payment.getId();
        String subject = "Payment Update [" + eventType + "] - " + paymentRef;
        String htmlBody = templateBuilder.buildPaymentNotificationHtml(payment, eventType);
        EmailRequest request = EmailRequest.builder().to(recipient).subject(subject).htmlBody(htmlBody).isHtml(true).emailType(EmailType.PAYMENT_NOTIFICATION).relatedEntityType("PAYMENT").relatedEntityId(payment.getId()).build();
        sendEmailAsync(request);
    }

    // ---------------------------------------- //

    /**
     * Preview metadata for UI preview modals.
     */
    public Map<String, String> generatePreviewEmailDetails(Quotation quotation) {
        if (quotation == null) {
            throw new IllegalArgumentException("Quotation cannot be null for email preview");
        }
        
        String targetEmail = quotation.getClientEmail();
        if (targetEmail == null || targetEmail.trim().isEmpty()) {
            targetEmail = "[Client Email Pending]";
        }

        String activeFromEmail = (fromEmail != null && !fromEmail.trim().isEmpty()) ? fromEmail.trim() : "sales@acrovix.com";
        String activeFromName = (fromName != null && !fromName.trim().isEmpty()) ? fromName.trim() : "ACROVIX INNOVATIONS PRIVATE LIMITED";
        String from = activeFromName + " <" + activeFromEmail + ">";

        String to = targetEmail;
        if (quotation.getClientName() != null && !quotation.getClientName().trim().isEmpty()) {
            to = quotation.getClientName().trim() + " <" + to + ">";
        }

        String quotationNumber = (quotation.getQuotationNumber() != null && !quotation.getQuotationNumber().isEmpty()) 
                ? quotation.getQuotationNumber() 
                : "PREVIEW-DRAFT";
                
        String subject = "Acrovix Quotation: " + quotationNumber;
        String htmlContent = templateBuilder.buildQuotationEmailHtml(quotation);
        String filename = quotationNumber + ".pdf";

        Map<String, String> details = new HashMap<>();
        details.put("from", from);
        details.put("to", to);
        details.put("subject", subject);
        details.put("htmlContent", htmlContent);
        details.put("filename", filename);
        
        return details;
    }

    private void sendViaResend(String targetEmail, String subject, EmailRequest request, String activeFromEmail, String activeFromName) {
        try {
            String from = activeFromName + " <" + activeFromEmail + ">";
            String htmlContent = request.isHtml() ? request.getHtmlBody() : "<p>" + (request.getBody() != null ? request.getBody() : "") + "</p>";

            List<Attachment> resendAttachments = new ArrayList<>();
            if (request.getAttachments() != null) {
                for (EmailAttachment att : request.getAttachments()) {
                    if (att != null && att.getContent() != null) {
                        String base64Content = Base64.getEncoder().encodeToString(att.getContent());
                        resendAttachments.add(Attachment.builder()
                                .fileName(att.getFilename() != null ? att.getFilename() : "attachment")
                                .content(base64Content)
                                .build());
                    }
                }
            }

            CreateEmailOptions.Builder optionsBuilder = CreateEmailOptions.builder()
                    .from(from)
                    .to(targetEmail)
                    .subject(subject)
                    .html(htmlContent);

            if (!resendAttachments.isEmpty()) {
                optionsBuilder.attachments(resendAttachments);
            }

            Resend resend = new Resend(resendApiKey.trim());
            resend.emails().send(optionsBuilder.build());
            logger.info("Successfully sent email to {} via Resend API", targetEmail);
        } catch (Exception e) {
            logger.error("Resend API Error: {}", e.getMessage());
            throw new IllegalStateException("Failed to send email via Resend. Please try again later.", e);
        }
    }

    private void logEmail(String recipient, String subject, EmailType emailType, EmailStatus status, String errorMessage, String relatedEntityType, Long relatedEntityId) {
        if (emailLogRepository != null) {
            try {
                EmailLog logEntry = EmailLog.builder()
                        .recipient(recipient)
                        .subject(subject)
                        .emailType(emailType != null ? emailType : EmailType.GENERAL)
                        .status(status)
                        .sentAt(LocalDateTime.now())
                        .errorMessage(errorMessage)
                        .relatedEntityType(relatedEntityType)
                        .relatedEntityId(relatedEntityId)
                        .build();
                emailLogRepository.save(logEntry);
            } catch (Exception e) {
                logger.error("Failed to save email audit log: {}", e.getMessage());
            }
        }
    }
}
