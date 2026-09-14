package com.acrovix.admin.service;

import com.acrovix.admin.entity.Quotation;
import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.services.emails.Emails;
import com.resend.services.emails.model.CreateEmailOptions;
import com.resend.services.emails.model.CreateEmailResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockedConstruction;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock
    private PdfService pdfService;

    private EmailService emailService;
    private Quotation testQuotation;

    @BeforeEach
    void setUp() {
        emailService = new EmailService(pdfService);
        ReflectionTestUtils.setField(emailService, "resendApiKey", "test-resend-api-key");
        ReflectionTestUtils.setField(emailService, "fromEmail", "sales@acrovix.com");
        ReflectionTestUtils.setField(emailService, "fromName", "ACROVIX");

        testQuotation = Quotation.builder()
                .id(11L)
                .quotationNumber("ACX-QT-1011")
                .clientName("John Doe")
                .clientEmail("john.doe@example.com")
                .status("DRAFT")
                .build();
    }

    @Test
    void testSendQuotationEmailSuccess() {
        byte[] fakePdfBytes = "PDF_CONTENT".getBytes();
        when(pdfService.generateQuotationPdf(testQuotation)).thenReturn(fakePdfBytes);

        try (MockedConstruction<Resend> mockedResend = mockConstruction(Resend.class,
                (mock, context) -> {
                    Emails mockEmails = mock(Emails.class);
                    when(mock.emails()).thenReturn(mockEmails);
                    try {
                        when(mockEmails.send(any(CreateEmailOptions.class))).thenReturn(new CreateEmailResponse());
                    } catch (Exception e) {
                        // ignore in test setup
                    }
                })) {

            assertDoesNotThrow(() -> emailService.sendQuotationEmail(testQuotation));

            assertEquals(1, mockedResend.constructed().size());
            Resend resend = mockedResend.constructed().get(0);
            
            try {
                ArgumentCaptor<CreateEmailOptions> captor = ArgumentCaptor.forClass(CreateEmailOptions.class);
                verify(resend.emails()).send(captor.capture());
                
                CreateEmailOptions options = captor.getValue();
                assertEquals("ACROVIX <sales@acrovix.com>", options.getFrom());
                assertEquals("John Doe <john.doe@example.com>", options.getTo().get(0));
                assertTrue(options.getSubject().contains("ACX-QT-1011"));
                assertNotNull(options.getAttachments());
                assertEquals(1, options.getAttachments().size());
                assertEquals("ACX-QT-1011.pdf", options.getAttachments().get(0).getFileName());
            } catch (Exception e) {
                fail(e);
            }
        }
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
    void testSendQuotationEmailMissingResendKeyThrowsIllegalStateException() {
        ReflectionTestUtils.setField(emailService, "resendApiKey", "");

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> emailService.sendQuotationEmail(testQuotation));

        assertTrue(ex.getMessage().contains("RESEND_API_KEY"));
        verifyNoInteractions(pdfService);
    }

    @Test
    void testSendQuotationEmailPdfFailureThrowsIllegalStateException() {
        when(pdfService.generateQuotationPdf(testQuotation)).thenReturn(new byte[0]);

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> emailService.sendQuotationEmail(testQuotation));

        assertTrue(ex.getMessage().contains("empty"));
    }

    @Test
    void testSendQuotationEmailResendApiErrorHandledSafely() {
        byte[] fakePdfBytes = "PDF_CONTENT".getBytes();
        when(pdfService.generateQuotationPdf(testQuotation)).thenReturn(fakePdfBytes);

        try (MockedConstruction<Resend> mockedResend = mockConstruction(Resend.class,
                (mock, context) -> {
                    Emails mockEmails = mock(Emails.class);
                    when(mock.emails()).thenReturn(mockEmails);
                    try {
                        when(mockEmails.send(any(CreateEmailOptions.class))).thenThrow(new ResendException("Invalid API Key"));
                    } catch (Exception e) {
                        // ignore
                    }
                })) {

            IllegalStateException ex = assertThrows(IllegalStateException.class,
                    () -> emailService.sendQuotationEmail(testQuotation));

            assertTrue(ex.getMessage().contains("Failed to send email via Resend"));
        }
    }
}
