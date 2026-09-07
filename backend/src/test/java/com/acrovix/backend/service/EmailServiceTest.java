package com.acrovix.backend.service;

import com.acrovix.backend.entity.Enquiry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @InjectMocks
    private EmailService emailService;

    @Mock
    private RestTemplate restTemplate;

    @Captor
    private ArgumentCaptor<HttpEntity<Map<String, Object>>> requestCaptor;

    private Enquiry testEnquiry;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(emailService, "restTemplate", restTemplate);
        ReflectionTestUtils.setField(emailService, "fromEmail", "sweta@acrovix.com");
        ReflectionTestUtils.setField(emailService, "fromName", "ACROVIX");
        ReflectionTestUtils.setField(emailService, "notificationEmail", "admin@acrovix.com");
        ReflectionTestUtils.setField(emailService, "assetBaseUrl", "https://acrovix.com");
        ReflectionTestUtils.setField(emailService, "brevoApiKey", "test-api-key");

        testEnquiry = Enquiry.builder()
                .id(1L)
                .referenceId("ACR-20250907-001")
                .fullName("John Doe")
                .businessEmail("john@example.com")
                .companyName("Doe Enterprises")
                .phoneNumber("+91 9999999999")
                .industrySector("Technology")
                .serviceRequired("Cloud Migration")
                .preferredContactMethod("Phone")
                .projectRequirement("We need cloud migration.")
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("Admin email uses shared template and contains all dynamic fields")
    void testSharedTemplateUsedForAdmin() {
        String content = ReflectionTestUtils.invokeMethod(emailService, "buildSharedEmailTemplate", testEnquiry, true);
        
        // Assert shared layout characteristics
        assertTrue(content.contains("logo.png"));
        assertTrue(content.contains("hero-artwork.png"));
        assertTrue(content.contains("SYNC"));
        assertTrue(content.contains("SCALE"));
        assertTrue(content.contains("SUCCEED"));
        assertTrue(content.contains("Visit Our Website"));
        assertTrue(content.contains("Bengaluru | Bihar"));
        
        // Assert dynamic fields
        assertTrue(content.contains("John Doe"));
        assertTrue(content.contains("john@example.com"));
        assertTrue(content.contains("+91 9999999999"));
        assertTrue(content.contains("ACR-20250907-001"));
        assertTrue(content.contains("Doe Enterprises"));
        assertTrue(content.contains("Technology"));
        assertTrue(content.contains("Cloud Migration"));
        assertTrue(content.contains("We need cloud migration."));
        
        // Assert Admin specific differences
        assertTrue(content.contains("NEW ENQUIRY"));
        assertTrue(content.contains("A New Enquiry Needs"));
    }

    @Test
    @DisplayName("Customer email uses shared template and excludes admin specific rows")
    void testSharedTemplateUsedForCustomer() {
        String content = ReflectionTestUtils.invokeMethod(emailService, "buildSharedEmailTemplate", testEnquiry, false);
        
        // Assert shared layout characteristics
        assertTrue(content.contains("logo.png"));
        assertTrue(content.contains("hero-artwork.png"));
        assertTrue(content.contains("SYNC"));
        assertTrue(content.contains("SCALE"));
        assertTrue(content.contains("SUCCEED"));
        assertTrue(content.contains("Visit Our Website"));
        assertTrue(content.contains("Bengaluru | Bihar"));
        
        // Assert dynamic fields
        assertTrue(content.contains("ACR-20250907-001"));
        assertTrue(content.contains("Doe Enterprises"));
        assertTrue(content.contains("Technology"));
        assertTrue(content.contains("Cloud Migration"));
        assertTrue(content.contains("We need cloud migration."));
        
        // Assert Customer specific differences
        assertTrue(content.contains("THANK YOU"));
        assertTrue(content.contains("Your Enquiry"));
        assertTrue(content.contains("Hi John Doe,"));
        
        // Ensure fields are present for customer too (per new requirement)
        assertTrue(content.contains("Full Name</td>"));
        assertTrue(content.contains("Business Email</td>"));
    }

    @Test
    @DisplayName("No field labeled Subject exists in the HTML body")
    void testNoSubjectFieldPresent() {
        String adminContent = ReflectionTestUtils.invokeMethod(emailService, "buildSharedEmailTemplate", testEnquiry, true);
        
        // The word Subject shouldn't be a field label
        assertFalse(adminContent.contains(">Subject</td>"));
        assertFalse(adminContent.contains("Subject:"));
        
        String customerContent = ReflectionTestUtils.invokeMethod(emailService, "buildSharedEmailTemplate", testEnquiry, false);
        
        // The word Subject shouldn't be a field label
        assertFalse(customerContent.contains(">Subject</td>"));
        assertFalse(customerContent.contains("Subject:"));
    }

    @Test
    @DisplayName("Customer email sends correct API request to Brevo")
    @SuppressWarnings("unchecked")
    void testSendCustomerAcknowledgement() {
        emailService.sendCustomerAcknowledgement(testEnquiry);
        
        verify(restTemplate).postForEntity(eq("https://api.brevo.com/v3/smtp/email"), requestCaptor.capture(), eq(String.class));
        
        HttpEntity<Map<String, Object>> request = requestCaptor.getValue();
        assertEquals("test-api-key", request.getHeaders().getFirst("api-key"));
        
        Map<String, Object> body = request.getBody();
        assertNotNull(body);
        assertEquals("Thank You for Contacting ACROVIX - ACR-20250907-001", body.get("subject"));
        
        List<Map<String, String>> to = (List<Map<String, String>>) body.get("to");
        assertEquals("john@example.com", to.get(0).get("email"));
        
        Map<String, String> sender = (Map<String, String>) body.get("sender");
        assertEquals("sweta@acrovix.com", sender.get("email"));
        assertEquals("ACROVIX", sender.get("name"));
        
        String htmlContent = (String) body.get("htmlContent");
        assertTrue(htmlContent.contains("logo.png"));
        assertFalse(htmlContent.contains(".svg"));
    }

    @Test
    @DisplayName("Admin email sends correct API request to Brevo")
    @SuppressWarnings("unchecked")
    void testSendInternalNotification() {
        emailService.sendInternalNotification(testEnquiry);
        
        verify(restTemplate).postForEntity(eq("https://api.brevo.com/v3/smtp/email"), requestCaptor.capture(), eq(String.class));
        
        HttpEntity<Map<String, Object>> request = requestCaptor.getValue();
        assertEquals("test-api-key", request.getHeaders().getFirst("api-key"));
        
        Map<String, Object> body = request.getBody();
        assertNotNull(body);
        assertEquals("New Enquiry Received - ACR-20250907-001", body.get("subject"));
        
        List<Map<String, String>> to = (List<Map<String, String>>) body.get("to");
        assertEquals("admin@acrovix.com", to.get(0).get("email"));
        
        Map<String, String> sender = (Map<String, String>) body.get("sender");
        assertEquals("sweta@acrovix.com", sender.get("email"));
        assertEquals("ACROVIX", sender.get("name"));
        
        String htmlContent = (String) body.get("htmlContent");
        assertTrue(htmlContent.contains("NEW ENQUIRY"));
        assertFalse(htmlContent.contains(".svg"));
    }

    @Test
    @DisplayName("Failure from Brevo API is handled properly")
    void testApiFailure() {
        when(restTemplate.postForEntity(any(String.class), any(), eq(String.class)))
            .thenThrow(new RuntimeException("API Error"));
            
        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            emailService.sendCustomerAcknowledgement(testEnquiry);
        });
        
        assertEquals("Failed to send email", exception.getMessage());
    }
}
