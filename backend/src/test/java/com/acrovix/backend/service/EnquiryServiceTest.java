package com.acrovix.backend.service;

import com.acrovix.backend.dto.EnquiryRequest;
import com.acrovix.backend.dto.EnquiryResponseData;
import com.acrovix.backend.entity.Enquiry;
import com.acrovix.backend.repository.EnquiryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EnquiryServiceTest {

    @Mock
    private EnquiryRepository enquiryRepository;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private EnquiryService enquiryService;

    private EnquiryRequest validRequest;

    @BeforeEach
    void setUp() {
        validRequest = EnquiryRequest.builder()
                .fullName("Test User")
                .businessEmail("test@acrovix.com")
                .companyName("Test Enterprise")
                .phoneNumber("+91 98765 43210")
                .projectRequirement("Cloud migration & DevOps security audit.")
                .industrySector("Enterprise IT & SaaS")
                .serviceRequired("Cloud & DevOps")
                .preferredContactMethod("Email")
                .build();
    }

    @Test
    @DisplayName("Should successfully create enquiry and attempt email dispatch")
    void testCreateEnquirySuccess() {
        when(enquiryRepository.existsByReferenceId(any())).thenReturn(false);
        when(enquiryRepository.save(any(Enquiry.class))).thenAnswer(invocation -> {
            Enquiry saved = invocation.getArgument(0);
            saved.setId(100L);
            saved.setCreatedAt(LocalDateTime.now());
            return saved;
        });

        EnquiryResponseData response = enquiryService.createEnquiry(validRequest);

        assertNotNull(response);
        assertEquals(100L, response.getId());
        assertNotNull(response.getReferenceId());
        assertTrue(response.getReferenceId().startsWith("ACR-"));
        assertNotNull(response.getCreatedAt());

        verify(enquiryRepository, times(1)).save(any(Enquiry.class));
        verify(emailService, times(1)).sendInternalNotification(any(Enquiry.class));
        verify(emailService, times(1)).sendCustomerAcknowledgement(any(Enquiry.class));
    }

    @Test
    @DisplayName("Email failure should NOT prevent enquiry persistence or throw exception")
    void testEmailFailureIsolation() {
        when(enquiryRepository.existsByReferenceId(any())).thenReturn(false);
        when(enquiryRepository.save(any(Enquiry.class))).thenAnswer(invocation -> {
            Enquiry saved = invocation.getArgument(0);
            saved.setId(101L);
            saved.setCreatedAt(LocalDateTime.now());
            return saved;
        });

        doThrow(new RuntimeException("SMTP Connection Error")).when(emailService).sendInternalNotification(any());
        doThrow(new RuntimeException("SMTP Auth Error")).when(emailService).sendCustomerAcknowledgement(any());

        EnquiryResponseData response = assertDoesNotThrow(() -> enquiryService.createEnquiry(validRequest));

        assertNotNull(response);
        assertEquals(101L, response.getId());
        assertNotNull(response.getReferenceId());

        verify(enquiryRepository, times(1)).save(any(Enquiry.class));
    }
}
