package com.acrovix.admin.service;

import com.acrovix.admin.dto.CreateDirectQuotationRequest;
import com.acrovix.admin.dto.QuotationRequest;
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
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class QuotationDualFlowTest {

    @Mock
    private QuotationRepository quotationRepository;
    @Mock
    private AdminEnquiryRepository enquiryRepository;
    @Mock
    private AdminUserRepository userRepository;
    @Mock
    private SequenceGeneratorService sequenceGenerator;
    @Mock
    private AdminActivityRepository activityRepository;
    @Mock
    private NotificationService notificationService;

    @Spy
    private AuthorizationService authorizationService = new AuthorizationService(null, null);

    @InjectMocks
    private QuotationService quotationService;

    private PdfService pdfService = new PdfService();

    private AdminUser superAdmin;
    private AdminUser salesUser1;
    private AdminUser salesUser2;
    private AdminEnquiry enquiry;

    @BeforeEach
    void setUp() {
        superAdmin = AdminUser.builder()
                .id(1L)
                .email("admin@acrovix.com")
                .role(Role.SUPER_ADMIN)
                .name("Super Admin")
                .build();

        salesUser1 = AdminUser.builder()
                .id(2L)
                .email("sales1@acrovix.com")
                .role(Role.SALES)
                .name("Sales User 1")
                .build();

        salesUser2 = AdminUser.builder()
                .id(3L)
                .email("sales2@acrovix.com")
                .role(Role.SALES)
                .name("Sales User 2")
                .build();

        enquiry = AdminEnquiry.builder()
                .id(10L)
                .referenceId("ACX-ENQ-2026-0001")
                .fullName("Enquiry Client")
                .companyName("Enquiry Corp")
                .businessEmail("client@enquiry.com")
                .phoneNumber("+919876543210")
                .assignedTo(salesUser1)
                .status("NEW")
                .build();
    }

    @Test
    void testCreateDraftQuotationFromEnquiry() {
        when(enquiryRepository.findById(10L)).thenReturn(Optional.of(enquiry));
        when(sequenceGenerator.generateNextQuotationNumber()).thenReturn("ACX-Q-2026-0001");
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(invocation -> {
            Quotation q = invocation.getArgument(0);
            q.setId(100L);
            return q;
        });

        Quotation q = quotationService.createDraftQuotation(10L, salesUser1);

        assertNotNull(q);
        assertEquals("ACX-Q-2026-0001", q.getQuotationNumber());
        assertEquals(enquiry, q.getEnquiry());
        assertEquals(QuotationSource.ENQUIRY, q.getQuotationSource());
        assertEquals("Enquiry Client", q.getClientName());
        assertEquals(salesUser1, q.getCreatedBy());
        verify(activityRepository).save(any());
    }

    @Test
    void testCreateDirectDraftQuotationSuccess() {
        when(sequenceGenerator.generateNextQuotationNumber()).thenReturn("ACX-Q-2026-0002");
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(invocation -> {
            Quotation q = invocation.getArgument(0);
            q.setId(101L);
            return q;
        });

        CreateDirectQuotationRequest req = CreateDirectQuotationRequest.builder()
                .clientName("Direct Client")
                .clientCompany("Direct Corp")
                .clientEmail("direct@client.com")
                .clientPhone("+919998887770")
                .quotationSource(QuotationSource.PHONE)
                .sourceNotes("Client called sales hotline")
                .build();

        Quotation q = quotationService.createDirectDraftQuotation(req, salesUser1);

        assertNotNull(q);
        assertEquals("ACX-Q-2026-0002", q.getQuotationNumber());
        assertNull(q.getEnquiry());
        assertEquals(QuotationSource.PHONE, q.getQuotationSource());
        assertEquals("Client called sales hotline", q.getSourceNotes());
        assertEquals("Direct Client", q.getClientName());
        assertEquals("DRAFT", q.getStatus());
        assertEquals(salesUser1, q.getCreatedBy());
        verify(activityRepository).save(any());
    }

    @Test
    void testSaveQuotationDraftUpdatesDirectFields() {
        Quotation existing = Quotation.builder()
                .id(101L)
                .quotationNumber("ACX-Q-2026-0002")
                .enquiry(null)
                .clientName("Initial Name")
                .clientCompany("Initial Corp")
                .clientEmail("initial@client.com")
                .clientPhone("+919998887770")
                .quotationSource(QuotationSource.PHONE)
                .sourceNotes("Old notes")
                .status("DRAFT")
                .createdBy(salesUser1)
                .items(new ArrayList<>())
                .build();

        when(quotationRepository.findById(101L)).thenReturn(Optional.of(existing));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        QuotationRequest request = QuotationRequest.builder()
                .clientName("Updated Name")
                .clientCompany("Updated Corp")
                .clientEmail("updated@client.com")
                .clientPhone("+911112223334")
                .quotationSource(QuotationSource.WHATSAPP)
                .sourceNotes("Client requested changes on WhatsApp")
                .items(new ArrayList<>())
                .build();

        Quotation updated = quotationService.saveQuotationDraft(101L, request, salesUser1);

        assertEquals("Updated Name", updated.getClientName());
        assertEquals(QuotationSource.WHATSAPP, updated.getQuotationSource());
        assertEquals("Client requested changes on WhatsApp", updated.getSourceNotes());
    }

    @Test
    void testMarkAsSentDirectQuotationNoNpe() {
        Quotation directQuotation = Quotation.builder()
                .id(101L)
                .quotationNumber("ACX-Q-2026-0002")
                .enquiry(null)
                .clientName("Direct Client")
                .clientEmail("direct@client.com")
                .status("DRAFT")
                .createdBy(salesUser1)
                .build();

        when(quotationRepository.findById(101L)).thenReturn(Optional.of(directQuotation));

        quotationService.markAsSent(101L, salesUser1);

        assertEquals("SENT", directQuotation.getStatus());
        verify(quotationRepository).save(directQuotation);
        // Verify no enquiry operations occurred
        verifyNoInteractions(enquiryRepository);
        verifyNoInteractions(notificationService);
    }

    @Test
    void testAuthorizationDirectQuotationCreatorAllowedOtherBlocked() {
        Quotation directQuotation = Quotation.builder()
                .id(101L)
                .quotationNumber("ACX-Q-2026-0002")
                .enquiry(null)
                .clientName("Direct Client")
                .clientEmail("direct@client.com")
                .status("DRAFT")
                .createdBy(salesUser1)
                .build();

        when(quotationRepository.findById(101L)).thenReturn(Optional.of(directQuotation));

        // Creator SALES 1 can access
        assertDoesNotThrow(() -> quotationService.getQuotationById(101L, salesUser1));

        // Super admin can access
        assertDoesNotThrow(() -> quotationService.getQuotationById(101L, superAdmin));

        // Other SALES 2 blocked
        assertThrows(AccessDeniedException.class, () -> quotationService.getQuotationById(101L, salesUser2));
    }

    @Test
    void testDirectQuotationPdfGenerationNoNpe() {
        Quotation directQuotation = Quotation.builder()
                .id(101L)
                .quotationNumber("ACX-Q-2026-0002")
                .enquiry(null)
                .clientName("Direct Client")
                .clientCompany("Direct Corp")
                .clientEmail("direct@client.com")
                .clientPhone("+919998887770")
                .quotationSource(QuotationSource.PHONE)
                .sourceNotes("Client called directly")
                .status("DRAFT")
                .subtotal(new BigDecimal("1000.00"))
                .discountAmount(new BigDecimal("100.00"))
                .taxAmount(new BigDecimal("162.00"))
                .grandTotal(new BigDecimal("1062.00"))
                .createdAt(java.time.LocalDateTime.now())
                .validUntil(LocalDate.now().plusDays(30))
                .createdBy(salesUser1)
                .items(new ArrayList<>())
                .build();

        byte[] pdfBytes = pdfService.generateQuotationPdf(directQuotation);
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 0);
    }

    @Test
    void testGetQuotationsByEnquiryIdSuccessExcludesDeleted() {
        when(enquiryRepository.findById(10L)).thenReturn(java.util.Optional.of(enquiry));
        Quotation activeQ = Quotation.builder().id(201L).quotationNumber("ACX-Q-2026-0005").enquiry(enquiry).deletedAt(null).build();
        when(quotationRepository.findByEnquiryIdAndDeletedAtIsNull(10L)).thenReturn(java.util.List.of(activeQ));

        java.util.List<Quotation> results = quotationService.getQuotationsByEnquiryId(10L, salesUser1);
        assertNotNull(results);
        assertEquals(1, results.size());
        assertEquals("ACX-Q-2026-0005", results.get(0).getQuotationNumber());
    }

    @Test
    void testGetQuotationsByEnquiryIdAccessDeniedForUnauthorizedUser() {
        when(enquiryRepository.findById(10L)).thenReturn(java.util.Optional.of(enquiry));

        assertThrows(AccessDeniedException.class, () -> quotationService.getQuotationsByEnquiryId(10L, salesUser2));
    }
}
