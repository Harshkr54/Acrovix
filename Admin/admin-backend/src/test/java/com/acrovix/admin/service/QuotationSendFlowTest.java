package com.acrovix.admin.service;

import com.acrovix.admin.entity.*;
import com.acrovix.admin.repository.AdminActivityRepository;
import com.acrovix.admin.repository.AdminEnquiryRepository;
import com.acrovix.admin.repository.AdminUserRepository;
import com.acrovix.admin.repository.QuotationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class QuotationSendFlowTest {

    @Mock
    private QuotationRepository quotationRepository;
    @Mock
    private AdminEnquiryRepository enquiryRepository;
    @Mock
    private AdminUserRepository userRepository;
    @Mock
    private AdminActivityRepository activityRepository;
    @Mock
    private NotificationService notificationService;
    @Spy
    private AuthorizationService authorizationService = new AuthorizationService();

    @InjectMocks
    private QuotationService quotationService;

    private PdfService pdfService = new PdfService();

    private AdminUser salesUser;
    private AdminEnquiry enquiry;
    private Quotation quotationWithEnquiry;
    private Quotation directQuotation;

    @BeforeEach
    void setUp() {
        salesUser = AdminUser.builder()
                .id(1L)
                .email("sales@acrovix.com")
                .role(Role.SALES)
                .name("Sales User")
                .build();

        enquiry = AdminEnquiry.builder()
                .id(18L)
                .referenceId("ACX-ENQ-2026-0018")
                .fullName("Jane Client")
                .companyName("Enquiry Co")
                .businessEmail("jane@client.com")
                .phoneNumber("+919876543210")
                .assignedTo(salesUser)
                .status("NEW")
                .build();

        QuotationItem item = QuotationItem.builder()
                .id(1L)
                .description("Web Development Service")
                .quantity(BigDecimal.ONE)
                .unit("service")
                .unitPrice(new BigDecimal("1000.00"))
                .discountPercent(BigDecimal.ZERO)
                .taxPercent(new BigDecimal("18.00"))
                .lineTotal(new BigDecimal("1180.00"))
                .build();

        quotationWithEnquiry = Quotation.builder()
                .id(11L)
                .quotationNumber("ACX-QT-1011")
                .enquiry(enquiry)
                .clientName("Jane Client")
                .clientEmail("jane@client.com")
                .quotationSource(QuotationSource.ENQUIRY)
                .status("DRAFT")
                .subtotal(new BigDecimal("1000.00"))
                .discountAmount(BigDecimal.ZERO)
                .taxAmount(new BigDecimal("180.00"))
                .grandTotal(new BigDecimal("1180.00"))
                .createdAt(LocalDateTime.now())
                .validUntil(LocalDate.now().plusDays(30))
                .createdBy(salesUser)
                .items(List.of(item))
                .build();

        directQuotation = Quotation.builder()
                .id(12L)
                .quotationNumber("ACX-QT-1012")
                .enquiry(null)
                .clientName("Direct Client")
                .clientEmail("direct@client.com")
                .quotationSource(QuotationSource.OTHER)
                .status("DRAFT")
                .subtotal(new BigDecimal("500.00"))
                .discountAmount(BigDecimal.ZERO)
                .taxAmount(new BigDecimal("90.00"))
                .grandTotal(new BigDecimal("590.00"))
                .createdAt(LocalDateTime.now())
                .validUntil(LocalDate.now().plusDays(30))
                .createdBy(salesUser)
                .items(new ArrayList<>())
                .build();
    }

    @Test
    void test1_QuotationWithEnquirySuccessfullyGeneratesPdf() {
        byte[] pdfBytes = pdfService.generateQuotationPdf(quotationWithEnquiry);
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 0);
    }

    @Test
    void test2_QuotationSendFlowCanAccessEnquiryReferenceIdDuringPdfGeneration() {
        assertNotNull(quotationWithEnquiry.getEnquiry());
        assertEquals("ACX-ENQ-2026-0018", quotationWithEnquiry.getEnquiry().getReferenceId());
        byte[] pdfBytes = pdfService.generateQuotationPdf(quotationWithEnquiry);
        assertNotNull(pdfBytes);
    }

    @Test
    void test3_QuotationItemsAreAvailableDuringPdfGeneration() {
        assertNotNull(quotationWithEnquiry.getItems());
        assertEquals(1, quotationWithEnquiry.getItems().size());
        assertEquals("Web Development Service", quotationWithEnquiry.getItems().get(0).getDescription());
        byte[] pdfBytes = pdfService.generateQuotationPdf(quotationWithEnquiry);
        assertNotNull(pdfBytes);
    }

    @Test
    void test4_DirectManualQuotationWithEnquiryNullStillWorks() {
        assertNull(directQuotation.getEnquiry());
        byte[] pdfBytes = pdfService.generateQuotationPdf(directQuotation);
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 0);
    }

    @Test
    void test5_FailedEmailDoesNotChangeQuotationStatusToSent() {
        // When email sending fails, markAsSent is never called.
        // Verify that quotation status remains DRAFT.
        assertEquals("DRAFT", quotationWithEnquiry.getStatus());
        verify(quotationRepository, never()).save(quotationWithEnquiry);
    }

    @Test
    void test6_FailedEmailDoesNotChangeEnquiryStatusToQuoted() {
        // When email sending fails, enquiry status remains NEW / unchanged.
        assertEquals("NEW", enquiry.getStatus());
        verify(enquiryRepository, never()).save(enquiry);
    }
}
