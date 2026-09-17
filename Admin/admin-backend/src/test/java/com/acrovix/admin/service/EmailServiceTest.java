package com.acrovix.admin.service;

import com.acrovix.admin.dto.email.EmailAttachment;
import com.acrovix.admin.dto.email.EmailRequest;
import com.acrovix.admin.entity.EmailLog;
import com.acrovix.admin.entity.EmailStatus;
import com.acrovix.admin.entity.EmailType;
import com.acrovix.admin.entity.Quotation;
import com.acrovix.admin.repository.EmailLogRepository;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Collections;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock
    private PdfService pdfService;

    @Mock
    private JavaMailSender mailSender;

    @Mock
    private EmailLogRepository emailLogRepository;

    private EmailTemplateBuilder templateBuilder;
    private EmailService emailService;
    private Quotation testQuotation;

    @BeforeEach
    void setUp() {
        templateBuilder = new EmailTemplateBuilder();
        emailService = new EmailService(pdfService, templateBuilder, emailLogRepository, mailSender);
        
        ReflectionTestUtils.setField(emailService, "fromEmail", "sales@acrovix.com");
        ReflectionTestUtils.setField(emailService, "fromName", "ACROVIX INNOVATIONS PRIVATE LIMITED");

        testQuotation = Quotation.builder()
                .id(101L)
                .quotationNumber("ACX-QT-2026-001")
                .clientName("Acme Corp")
                .clientEmail("client@acme.com")
                .status("DRAFT")
                .build();
    }

    @Test
    void testSendSimpleTextEmailSuccess() {
        MimeMessage mimeMessage = new MimeMessage((Session) null);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        boolean result = emailService.sendSimpleTextEmail("user@example.com", "Welcome Subject", "Hello Plain Text Body");

        assertTrue(result);
        verify(mailSender).send(mimeMessage);

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        
        EmailLog savedLog = logCaptor.getValue();
        assertEquals("user@example.com", savedLog.getRecipient());
        assertEquals("Welcome Subject", savedLog.getSubject());
        assertEquals(EmailType.GENERAL, savedLog.getEmailType());
        assertEquals(EmailStatus.SENT, savedLog.getStatus());
        assertNull(savedLog.getErrorMessage());
    }

    @Test
    void testSendHtmlEmailWithTemplateFormattingSuccess() {
        MimeMessage mimeMessage = new MimeMessage((Session) null);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        boolean result = emailService.sendHtmlEmail(
                "partner@acme.com", 
                "Project Overview", 
                "<p>We are pleased to introduce our solution.</p>", 
                EmailType.CRM_LEAD
        );

        assertTrue(result);
        verify(mailSender).send(mimeMessage);

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());
        
        EmailLog savedLog = logCaptor.getValue();
        assertEquals("partner@acme.com", savedLog.getRecipient());
        assertEquals("Project Overview", savedLog.getSubject());
        assertEquals(EmailType.CRM_LEAD, savedLog.getEmailType());
        assertEquals(EmailStatus.SENT, savedLog.getStatus());
    }

    @Test
    void testSendEmailWithAttachmentSuccess() {
        MimeMessage mimeMessage = new MimeMessage((Session) null);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        EmailAttachment attachment = EmailAttachment.builder()
                .filename("invoice.pdf")
                .content("SAMPLE_PDF_BYTES".getBytes())
                .contentType("application/pdf")
                .build();

        EmailRequest request = EmailRequest.builder()
                .to("billing@acme.com")
                .subject("Invoice ACX-INV-001")
                .htmlBody("<p>Invoice attached</p>")
                .isHtml(true)
                .emailType(EmailType.INVOICE)
                .relatedEntityType("INVOICE")
                .relatedEntityId(501L)
                .attachments(Collections.singletonList(attachment))
                .build();

        boolean result = emailService.sendEmail(request);

        assertTrue(result);
        verify(mailSender).send(mimeMessage);

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());

        EmailLog savedLog = logCaptor.getValue();
        assertEquals("billing@acme.com", savedLog.getRecipient());
        assertEquals("Invoice ACX-INV-001", savedLog.getSubject());
        assertEquals(EmailType.INVOICE, savedLog.getEmailType());
        assertEquals(EmailStatus.SENT, savedLog.getStatus());
        assertEquals("INVOICE", savedLog.getRelatedEntityType());
        assertEquals(501L, savedLog.getRelatedEntityId());
    }

    @Test
    void testRecipientHandlingMissingRecipientThrowsException() {
        EmailRequest nullToRequest = EmailRequest.builder().to(null).subject("Subj").build();
        EmailRequest emptyToRequest = EmailRequest.builder().to("   ").subject("Subj").build();

        assertThrows(IllegalArgumentException.class, () -> emailService.sendEmail(nullToRequest));
        assertThrows(IllegalArgumentException.class, () -> emailService.sendEmail(emptyToRequest));

        verifyNoInteractions(mailSender);
    }

    @Test
    void testEmailTypeHandlingAllTypesSupported() {
        MimeMessage mimeMessage = new MimeMessage((Session) null);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        for (EmailType type : EmailType.values()) {
            EmailRequest req = EmailRequest.builder()
                    .to("test@example.com")
                    .subject("Testing Type " + type.name())
                    .body("Content")
                    .emailType(type)
                    .build();

            assertTrue(emailService.sendEmail(req));
        }

        verify(emailLogRepository, times(EmailType.values().length)).save(any(EmailLog.class));
    }

    @Test
    void testSmtpSendFailureHandledSafely() {
        MimeMessage mimeMessage = new MimeMessage((Session) null);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        doThrow(new MailSendException("SMTP connection refused"))
                .when(mailSender).send(any(MimeMessage.class));

        EmailRequest request = EmailRequest.builder()
                .to("fail@example.com")
                .subject("Failure Test")
                .body("Will Fail")
                .emailType(EmailType.GENERAL)
                .build();

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> emailService.sendEmail(request));

        assertTrue(ex.getMessage().contains("Failed to send email"));

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());

        EmailLog failedLog = logCaptor.getValue();
        assertEquals("fail@example.com", failedLog.getRecipient());
        assertEquals(EmailStatus.FAILED, failedLog.getStatus());
        assertTrue(failedLog.getErrorMessage().contains("SMTP connection refused"));
    }

    @Test
    void testSensitiveInformationNotLoggedOrExposed() {
        MimeMessage mimeMessage = new MimeMessage((Session) null);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        doThrow(new MailSendException("SMTP auth error for password 'SECRET_PASS_123'"))
                .when(mailSender).send(any(MimeMessage.class));

        EmailRequest request = EmailRequest.builder()
                .to("security@example.com")
                .subject("Security Check")
                .body("Sensitive payload")
                .emailType(EmailType.GENERAL)
                .build();

        assertThrows(IllegalStateException.class, () -> emailService.sendEmail(request));

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());

        EmailLog log = logCaptor.getValue();
        assertFalse(log.getSubject().contains("SECRET_PASS_123"));
        assertFalse(log.getRecipient().contains("SECRET_PASS_123"));
    }

    @Test
    void testSendQuotationEmailSuccess() {
        MimeMessage mimeMessage = new MimeMessage((Session) null);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        byte[] fakePdfBytes = "PDF_HEADER_DATA".getBytes();
        when(pdfService.generateQuotationPdf(testQuotation)).thenReturn(fakePdfBytes);

        assertDoesNotThrow(() -> emailService.sendQuotationEmail(testQuotation));

        verify(mailSender).send(mimeMessage);

        ArgumentCaptor<EmailLog> logCaptor = ArgumentCaptor.forClass(EmailLog.class);
        verify(emailLogRepository).save(logCaptor.capture());

        EmailLog log = logCaptor.getValue();
        assertEquals("client@acme.com", log.getRecipient());
        assertTrue(log.getSubject().contains("ACX-QT-2026-001"));
        assertEquals(EmailType.QUOTATION, log.getEmailType());
        assertEquals(EmailStatus.SENT, log.getStatus());
        assertEquals("QUOTATION", log.getRelatedEntityType());
        assertEquals(101L, log.getRelatedEntityId());
    }

    @Test
    void testSendQuotationEmailMissingClientEmailThrowsIllegalArgumentException() {
        testQuotation.setClientEmail(null);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> emailService.sendQuotationEmail(testQuotation));

        assertEquals("Client email is required to send quotation", ex.getMessage());
        verifyNoInteractions(pdfService);
    }

    @Test
    void testGeneratePreviewEmailDetails() {
        var details = emailService.generatePreviewEmailDetails(testQuotation);

        assertNotNull(details);
        assertTrue(details.get("to").contains("client@acme.com"));
        assertTrue(details.get("subject").contains("ACX-QT-2026-001"));
        assertTrue(details.get("htmlContent").contains("ACROVIX INNOVATIONS PRIVATE LIMITED"));
        assertTrue(details.get("htmlContent").contains("SYNC | SCALE | SUCCEED"));
        assertEquals("ACX-QT-2026-001.pdf", details.get("filename"));
    }
}
