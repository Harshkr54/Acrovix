package com.acrovix.admin.service;

import com.acrovix.admin.entity.Quotation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock
    private PdfService pdfService;

    @Mock
    private RestTemplate restTemplate;

    private EmailService emailService;
    private Quotation testQuotation;

    @BeforeEach
    void setUp() {
        emailService = new EmailService(pdfService, restTemplate);
        ReflectionTestUtils.setField(emailService, "brevoApiKey", "test-brevo-api-key");
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
        when(restTemplate.postForObject(eq("https://api.brevo.com/v3/smtp/email"), any(HttpEntity.class), eq(String.class)))
                .thenReturn("{\"messageId\":\"<12345>\"}");

        assertDoesNotThrow(() -> emailService.sendQuotationEmail(testQuotation));

        ArgumentCaptor<HttpEntity> captor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).postForObject(eq("https://api.brevo.com/v3/smtp/email"), captor.capture(), eq(String.class));

        HttpEntity entity = captor.getValue();
        HttpHeaders headers = entity.getHeaders();
        assertEquals("test-brevo-api-key", headers.getFirst("api-key"));

        Map<String, Object> body = (Map<String, Object>) entity.getBody();
        assertNotNull(body);
        Map<String, Object> sender = (Map<String, Object>) body.get("sender");
        assertEquals("sales@acrovix.com", sender.get("email"));
        assertEquals("ACROVIX", sender.get("name"));
    }

    @Test
    void testSendQuotationEmailMissingClientEmailThrowsIllegalArgumentException() {
        testQuotation.setClientEmail(null);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> emailService.sendQuotationEmail(testQuotation));

        assertEquals("Client email is required to send quotation", ex.getMessage());
        verifyNoInteractions(pdfService);
        verifyNoInteractions(restTemplate);
    }

    @Test
    void testSendQuotationEmailMissingBrevoKeyThrowsIllegalStateException() {
        ReflectionTestUtils.setField(emailService, "brevoApiKey", "");

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> emailService.sendQuotationEmail(testQuotation));

        assertTrue(ex.getMessage().contains("BREVO_API_KEY"));
        verifyNoInteractions(pdfService);
        verifyNoInteractions(restTemplate);
    }

    @Test
    void testSendQuotationEmailPdfFailureThrowsIllegalStateException() {
        when(pdfService.generateQuotationPdf(testQuotation)).thenReturn(new byte[0]);

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> emailService.sendQuotationEmail(testQuotation));

        assertTrue(ex.getMessage().contains("empty"));
        verifyNoInteractions(restTemplate);
    }

    @Test
    void testSendQuotationEmailBrevoApiErrorHandledSafely() {
        byte[] fakePdfBytes = "PDF_CONTENT".getBytes();
        when(pdfService.generateQuotationPdf(testQuotation)).thenReturn(fakePdfBytes);

        HttpClientErrorException brevoError = HttpClientErrorException.create(
                HttpStatus.UNAUTHORIZED, "Unauthorized", new HttpHeaders(), "{\"message\":\"Invalid API Key\"}".getBytes(), null);

        when(restTemplate.postForObject(eq("https://api.brevo.com/v3/smtp/email"), any(HttpEntity.class), eq(String.class)))
                .thenThrow(brevoError);

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> emailService.sendQuotationEmail(testQuotation));

        assertTrue(ex.getMessage().contains("Failed to send email via Brevo"));
    }
}
