package com.acrovix.backend.service;

import com.acrovix.backend.entity.Enquiry;
import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.services.emails.Emails;
import com.resend.services.emails.model.CreateEmailOptions;
import com.resend.services.emails.model.CreateEmailResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.MockedConstruction;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @InjectMocks
    private EmailService emailService;

    private Enquiry testEnquiry;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(emailService, "fromEmail", "sales@acrovix.com");
        ReflectionTestUtils.setField(emailService, "fromName", "ACROVIX");
        ReflectionTestUtils.setField(emailService, "notificationEmail", "admin@acrovix.com");
        ReflectionTestUtils.setField(emailService, "resendApiKey", "test-resend-api-key");

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
    @DisplayName("Admin email uses buildAdminEmail template")
    void testBuildAdminEmail() {
        String content = ReflectionTestUtils.invokeMethod(emailService, "buildAdminEmail", testEnquiry);
        
        // Assert dynamic fields
        assertTrue(content.contains("John Doe"));
        assertTrue(content.contains("john@example.com"));
        assertTrue(content.contains("+91 9999999999"));
        assertTrue(content.contains("Doe Enterprises"));
        assertTrue(content.contains("Technology"));
        assertTrue(content.contains("Cloud Migration"));
        assertTrue(content.contains("We need cloud migration."));
        
        // Assert Admin specific differences
        assertTrue(content.contains("New Enquiry Received"));
        assertTrue(content.contains("View in Admin Panel"));
    }

    @Test
    @DisplayName("Customer email uses buildUserEmail template")
    void testBuildUserEmail() {
        String content = ReflectionTestUtils.invokeMethod(emailService, "buildUserEmail", testEnquiry);
        
        // Assert dynamic fields
        assertTrue(content.contains("Doe Enterprises"));
        assertTrue(content.contains("We need cloud migration."));
        
        // Assert Customer specific differences
        assertTrue(content.contains("Thank You!"));
        assertTrue(content.contains("Your enquiry has been received."));
    }

    @Test
    @DisplayName("Customer email sends correct API request to Resend")
    void testSendCustomerAcknowledgement() {
        try (MockedConstruction<Resend> mockedResend = mockConstruction(Resend.class,
                (mock, context) -> {
                    Emails mockEmails = mock(Emails.class);
                    when(mock.emails()).thenReturn(mockEmails);
                    try {
                        when(mockEmails.send(any(CreateEmailOptions.class))).thenReturn(new CreateEmailResponse());
                    } catch (Exception e) {
                        // ignore
                    }
                })) {

            emailService.sendCustomerAcknowledgement(testEnquiry);

            assertEquals(1, mockedResend.constructed().size());
            Resend resend = mockedResend.constructed().get(0);
            
            try {
                ArgumentCaptor<CreateEmailOptions> captor = ArgumentCaptor.forClass(CreateEmailOptions.class);
                verify(resend.emails()).send(captor.capture());
                
                CreateEmailOptions options = captor.getValue();
                assertEquals("ACROVIX <sales@acrovix.com>", options.getFrom());
                assertEquals("john@example.com", options.getTo().get(0));
                assertEquals("Thank You for Contacting ACROVIX - ACR-20250907-001", options.getSubject());
                
                String htmlContent = options.getHtml();
                assertTrue(htmlContent.contains("Thank You!"));
            } catch (Exception e) {
                fail(e);
            }
        }
    }

    @Test
    @DisplayName("Admin email sends correct API request to Resend")
    void testSendInternalNotification() {
        try (MockedConstruction<Resend> mockedResend = mockConstruction(Resend.class,
                (mock, context) -> {
                    Emails mockEmails = mock(Emails.class);
                    when(mock.emails()).thenReturn(mockEmails);
                    try {
                        when(mockEmails.send(any(CreateEmailOptions.class))).thenReturn(new CreateEmailResponse());
                    } catch (Exception e) {
                        // ignore
                    }
                })) {

            emailService.sendInternalNotification(testEnquiry);

            assertEquals(1, mockedResend.constructed().size());
            Resend resend = mockedResend.constructed().get(0);
            
            try {
                ArgumentCaptor<CreateEmailOptions> captor = ArgumentCaptor.forClass(CreateEmailOptions.class);
                verify(resend.emails()).send(captor.capture());
                
                CreateEmailOptions options = captor.getValue();
                assertEquals("ACROVIX <sales@acrovix.com>", options.getFrom());
                assertEquals("admin@acrovix.com", options.getTo().get(0));
                assertEquals("New Enquiry Received - ACR-20250907-001", options.getSubject());
                
                String htmlContent = options.getHtml();
                assertTrue(htmlContent.contains("New Enquiry Received"));
            } catch (Exception e) {
                fail(e);
            }
        }
    }

    @Test
    @DisplayName("Failure from Resend API is handled properly")
    void testApiFailure() {
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

            RuntimeException exception = assertThrows(RuntimeException.class, () -> {
                emailService.sendCustomerAcknowledgement(testEnquiry);
            });
            
            assertEquals("Failed to send email", exception.getMessage());
        }
    }
    
    @Test
    @DisplayName("Missing Resend API Key throws IllegalStateException")
    void testMissingResendKey() {
        ReflectionTestUtils.setField(emailService, "resendApiKey", "");
        
        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> {
            emailService.sendCustomerAcknowledgement(testEnquiry);
        });
        
        assertTrue(exception.getMessage().contains("RESEND_API_KEY"));
    }
}
