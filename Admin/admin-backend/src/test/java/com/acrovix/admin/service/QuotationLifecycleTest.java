package com.acrovix.admin.service;

import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.Quotation;
import com.acrovix.admin.entity.QuotationItem;
import com.acrovix.admin.repository.AdminActivityRepository;
import com.acrovix.admin.repository.QuotationRepository;
import com.acrovix.admin.exception.ResourceConflictException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class QuotationLifecycleTest {

    @Mock
    private QuotationRepository quotationRepository;
    @Mock
    private AuthorizationService authorizationService;
    @Mock
    private AdminActivityRepository activityRepository;
    @Mock
    private com.acrovix.admin.repository.PurchaseOrderRepository purchaseOrderRepository;
    @Mock
    private com.acrovix.admin.repository.InvoiceRepository invoiceRepository;

    @InjectMocks
    private QuotationService quotationService;

    private AdminUser adminUser;
    private Quotation draftQuotation;
    private Quotation sentQuotation;

    @BeforeEach
    void setUp() {
        adminUser = AdminUser.builder().id(1L).build();
        
        draftQuotation = Quotation.builder()
                .id(10L)
                .quotationNumber("ACX-Q-2026-0001")
                .status("DRAFT")
                .version(0)
                .baseQuotationId(10L)
                .items(new ArrayList<>())
                .columnConfigs(new ArrayList<>())
                .build();
                
        sentQuotation = Quotation.builder()
                .id(20L)
                .quotationNumber("ACX-Q-2026-0002")
                .status("SENT")
                .version(0)
                .baseQuotationId(20L)
                .items(new ArrayList<>())
                .columnConfigs(new ArrayList<>())
                .build();
    }

    @Test
    void testValidStatusTransitions() {
        when(quotationRepository.findById(20L)).thenReturn(Optional.of(sentQuotation));
        when(quotationRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        // SENT -> ACCEPTED
        com.acrovix.admin.dto.QuotationStatusUpdateRequest acceptReq = new com.acrovix.admin.dto.QuotationStatusUpdateRequest();
        acceptReq.setStatus("ACCEPTED");
        acceptReq.setResponseSource(com.acrovix.admin.entity.QuotationResponseSource.PHONE);
        Quotation accepted = quotationService.updateStatus(20L, acceptReq, adminUser);
        assertEquals("ACCEPTED", accepted.getStatus());
        assertEquals(com.acrovix.admin.entity.QuotationResponseSource.PHONE, accepted.getResponseSource());

        // SENT -> REJECTED
        sentQuotation.setStatus("SENT");
        com.acrovix.admin.dto.QuotationStatusUpdateRequest rejectReq = new com.acrovix.admin.dto.QuotationStatusUpdateRequest();
        rejectReq.setStatus("REJECTED");
        rejectReq.setResponseSource(com.acrovix.admin.entity.QuotationResponseSource.EMAIL);
        Quotation rejected = quotationService.updateStatus(20L, rejectReq, adminUser);
        assertEquals("REJECTED", rejected.getStatus());

        // SENT -> EXPIRED
        sentQuotation.setStatus("SENT");
        com.acrovix.admin.dto.QuotationStatusUpdateRequest expireReq = new com.acrovix.admin.dto.QuotationStatusUpdateRequest();
        expireReq.setStatus("EXPIRED");
        Quotation expired = quotationService.updateStatus(20L, expireReq, adminUser);
        assertEquals("EXPIRED", expired.getStatus());

        // ACCEPTED -> CONVERTED
        when(quotationRepository.findById(30L)).thenReturn(Optional.of(Quotation.builder().status("ACCEPTED").build()));
        com.acrovix.admin.dto.QuotationStatusUpdateRequest convertReq = new com.acrovix.admin.dto.QuotationStatusUpdateRequest();
        convertReq.setStatus("CONVERTED");
        Quotation converted = quotationService.updateStatus(30L, convertReq, adminUser);
        assertEquals("CONVERTED", converted.getStatus());
    }

    @Test
    void testMissingResponseSourceThrowsException() {
        when(quotationRepository.findById(20L)).thenReturn(Optional.of(sentQuotation));
        com.acrovix.admin.dto.QuotationStatusUpdateRequest acceptReq = new com.acrovix.admin.dto.QuotationStatusUpdateRequest();
        acceptReq.setStatus("ACCEPTED");

        assertThrows(IllegalArgumentException.class, () -> {
            quotationService.updateStatus(20L, acceptReq, adminUser);
        });
    }

    @Test
    void testInvalidStatusTransitionsThrowConflict() {
        when(quotationRepository.findById(10L)).thenReturn(Optional.of(draftQuotation));
        
        // DRAFT -> ACCEPTED is invalid
        com.acrovix.admin.dto.QuotationStatusUpdateRequest acceptReq = new com.acrovix.admin.dto.QuotationStatusUpdateRequest();
        acceptReq.setStatus("ACCEPTED");
        assertThrows(ResourceConflictException.class, () -> {
            quotationService.updateStatus(10L, acceptReq, adminUser);
        });

        // ACCEPTED -> REJECTED is invalid
        Quotation acceptedQuotation = Quotation.builder().id(40L).status("ACCEPTED").build();
        when(quotationRepository.findById(40L)).thenReturn(Optional.of(acceptedQuotation));
        com.acrovix.admin.dto.QuotationStatusUpdateRequest rejectReq = new com.acrovix.admin.dto.QuotationStatusUpdateRequest();
        rejectReq.setStatus("REJECTED");
        assertThrows(ResourceConflictException.class, () -> {
            quotationService.updateStatus(40L, rejectReq, adminUser);
        });
    }

    @Test
    void testCreateRevision() {
        when(quotationRepository.findWithDetailsById(20L)).thenReturn(Optional.of(sentQuotation));
        when(quotationRepository.findBaseQuotationForUpdate(20L)).thenReturn(Optional.of(sentQuotation));
        when(quotationRepository.findMaxVersionByBaseQuotationId(20L)).thenReturn(0);
        when(quotationRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Quotation revision = quotationService.createRevision(20L, adminUser);

        assertNotNull(revision);
        assertEquals("ACX-Q-2026-0002-R1", revision.getQuotationNumber());
        assertEquals("DRAFT", revision.getStatus());
        assertEquals(1, revision.getVersion());
        assertEquals(20L, revision.getBaseQuotationId());
        assertEquals(20L, revision.getParentQuotationId());
        
        assertEquals("REVISED", sentQuotation.getStatus());
    }

    @Test
    void testRevisedQuotationIsImmutableViaStatusUpdate() {
        Quotation revisedQ = Quotation.builder()
                .id(50L)
                .quotationNumber("ACX-Q-2026-0003")
                .status("REVISED")
                .version(0)
                .baseQuotationId(50L)
                .items(new ArrayList<>())
                .columnConfigs(new ArrayList<>())
                .build();
        when(quotationRepository.findById(50L)).thenReturn(Optional.of(revisedQ));

        // REVISED -> ACCEPTED must be blocked
        com.acrovix.admin.dto.QuotationStatusUpdateRequest req = new com.acrovix.admin.dto.QuotationStatusUpdateRequest();
        req.setStatus("ACCEPTED");
        req.setResponseSource(com.acrovix.admin.entity.QuotationResponseSource.PHONE);
        assertThrows(ResourceConflictException.class, () -> {
            quotationService.updateStatus(50L, req, adminUser);
        });
    }

    @Test
    void testSentToRejectedViaWhatsapp() {
        when(quotationRepository.findById(20L)).thenReturn(Optional.of(sentQuotation));
        when(quotationRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        com.acrovix.admin.dto.QuotationStatusUpdateRequest req = new com.acrovix.admin.dto.QuotationStatusUpdateRequest();
        req.setStatus("REJECTED");
        req.setResponseSource(com.acrovix.admin.entity.QuotationResponseSource.WHATSAPP);
        req.setResponseNotes("Client rejected due to pricing.");
        Quotation rejected = quotationService.updateStatus(20L, req, adminUser);
        assertEquals("REJECTED", rejected.getStatus());
        assertEquals(com.acrovix.admin.entity.QuotationResponseSource.WHATSAPP, rejected.getResponseSource());
        assertEquals("Client rejected due to pricing.", rejected.getResponseNotes());
    }

    @Test
    void testCreateRevisionFromDraftThrowsConflict() {
        when(quotationRepository.findWithDetailsById(10L)).thenReturn(Optional.of(draftQuotation));
        
        assertThrows(ResourceConflictException.class, () -> {
            quotationService.createRevision(10L, adminUser);
        });
    }

    @Test
    void testSaveDraftValidUntilBeforeIssueDateThrowsException() {
        draftQuotation.setCreatedAt(java.time.LocalDateTime.of(2026, 3, 10, 10, 0));
        when(quotationRepository.findById(10L)).thenReturn(Optional.of(draftQuotation));

        com.acrovix.admin.dto.QuotationRequest req = new com.acrovix.admin.dto.QuotationRequest();
        req.setValidUntil(java.time.LocalDate.of(2026, 3, 9)); // Before March 10, 2026

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            quotationService.saveQuotationDraft(10L, req, adminUser);
        });
        assertTrue(ex.getMessage().contains("cannot be earlier than quotation issue date"));
    }

    @Test
    void testSaveDraftValidUntilOnOrAfterIssueDateSucceeds() {
        draftQuotation.setCreatedAt(java.time.LocalDateTime.of(2026, 3, 10, 10, 0));
        when(quotationRepository.findById(10L)).thenReturn(Optional.of(draftQuotation));
        when(quotationRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        com.acrovix.admin.dto.QuotationRequest req = new com.acrovix.admin.dto.QuotationRequest();
        req.setValidUntil(java.time.LocalDate.of(2026, 4, 9));

        Quotation updated = quotationService.saveQuotationDraft(10L, req, adminUser);
        assertEquals(java.time.LocalDate.of(2026, 4, 9), updated.getValidUntil());
    }

    @Test
    void testModifySentQuotationThrowsConflict() {
        when(quotationRepository.findById(20L)).thenReturn(Optional.of(sentQuotation));

        com.acrovix.admin.dto.QuotationRequest req = new com.acrovix.admin.dto.QuotationRequest();
        req.setClientName("Updated Client");

        ResourceConflictException ex = assertThrows(ResourceConflictException.class, () -> {
            quotationService.saveQuotationDraft(20L, req, adminUser);
        });
        assertTrue(ex.getMessage().contains("Cannot modify quotation with status SENT"));
    }

    @Test
    void testModifyAcceptedQuotationThrowsConflict() {
        Quotation acceptedQ = Quotation.builder().id(30L).status("ACCEPTED").build();
        when(quotationRepository.findById(30L)).thenReturn(Optional.of(acceptedQ));

        com.acrovix.admin.dto.QuotationRequest req = new com.acrovix.admin.dto.QuotationRequest();
        req.setClientName("Updated Client");

        ResourceConflictException ex = assertThrows(ResourceConflictException.class, () -> {
            quotationService.saveQuotationDraft(30L, req, adminUser);
        });
        assertTrue(ex.getMessage().contains("Cannot modify quotation with status ACCEPTED"));
    }

    @Test
    void testModifyRejectedAndExpiredQuotationsThrowsConflict() {
        Quotation rejectedQ = Quotation.builder().id(41L).status("REJECTED").build();
        when(quotationRepository.findById(41L)).thenReturn(Optional.of(rejectedQ));

        com.acrovix.admin.dto.QuotationRequest req = new com.acrovix.admin.dto.QuotationRequest();
        assertThrows(ResourceConflictException.class, () -> {
            quotationService.saveQuotationDraft(41L, req, adminUser);
        });

        Quotation expiredQ = Quotation.builder().id(42L).status("EXPIRED").build();
        when(quotationRepository.findById(42L)).thenReturn(Optional.of(expiredQ));

        assertThrows(ResourceConflictException.class, () -> {
            quotationService.saveQuotationDraft(42L, req, adminUser);
        });
    }

    @Test
    void testSendNonDraftQuotationThrowsConflict() {
        when(quotationRepository.findWithDetailsById(20L)).thenReturn(Optional.of(sentQuotation));

        ResourceConflictException ex = assertThrows(ResourceConflictException.class, () -> {
            quotationService.sendQuotation(20L, "test@client.com", adminUser);
        });
        assertTrue(ex.getMessage().contains("Cannot send quotation with status SENT"));
    }

    @Test
    void testCreateRevisionBlockedWhenDownstreamPoExists() {
        Quotation acceptedQ = Quotation.builder()
                .id(60L)
                .quotationNumber("ACX-Q-2026-0060")
                .status("ACCEPTED")
                .version(0)
                .build();
        when(quotationRepository.findWithDetailsById(60L)).thenReturn(Optional.of(acceptedQ));
        when(purchaseOrderRepository.existsByQuotationIdAndDeletedAtIsNull(60L)).thenReturn(true);

        ResourceConflictException ex = assertThrows(ResourceConflictException.class, () -> {
            quotationService.createRevision(60L, adminUser);
        });
        assertTrue(ex.getMessage().contains("Purchase Order already exists"));
    }

    @Test
    void testCreateRevisionBlockedWhenDownstreamInvoiceExists() {
        Quotation acceptedQ = Quotation.builder()
                .id(61L)
                .quotationNumber("ACX-Q-2026-0061")
                .status("ACCEPTED")
                .version(0)
                .build();
        when(quotationRepository.findWithDetailsById(61L)).thenReturn(Optional.of(acceptedQ));
        when(purchaseOrderRepository.existsByQuotationIdAndDeletedAtIsNull(61L)).thenReturn(false);
        when(invoiceRepository.existsByQuotationIdAndStatusNot(61L, com.acrovix.admin.entity.InvoiceStatus.CANCELLED)).thenReturn(true);

        ResourceConflictException ex = assertThrows(ResourceConflictException.class, () -> {
            quotationService.createRevision(61L, adminUser);
        });
        assertTrue(ex.getMessage().contains("active Invoice records already exist"));
    }

    @Test
    void testTerminalStatesCannotTransition() {
        Quotation rejQ = Quotation.builder().id(71L).status("REJECTED").build();
        when(quotationRepository.findById(71L)).thenReturn(Optional.of(rejQ));

        com.acrovix.admin.dto.QuotationStatusUpdateRequest rejReq = new com.acrovix.admin.dto.QuotationStatusUpdateRequest();
        rejReq.setStatus("DRAFT");
        assertThrows(ResourceConflictException.class, () -> quotationService.updateStatus(71L, rejReq, adminUser));

        Quotation expQ = Quotation.builder().id(72L).status("EXPIRED").build();
        when(quotationRepository.findById(72L)).thenReturn(Optional.of(expQ));

        com.acrovix.admin.dto.QuotationStatusUpdateRequest expReq = new com.acrovix.admin.dto.QuotationStatusUpdateRequest();
        expReq.setStatus("SENT");
        assertThrows(ResourceConflictException.class, () -> quotationService.updateStatus(72L, expReq, adminUser));
    }

    @Test
    void testRejectQuotationWithNotePriceIsHigh() {
        when(quotationRepository.findById(20L)).thenReturn(Optional.of(sentQuotation));
        when(quotationRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        com.acrovix.admin.dto.QuotationStatusUpdateRequest req = new com.acrovix.admin.dto.QuotationStatusUpdateRequest();
        req.setStatus("REJECTED");
        req.setResponseSource(com.acrovix.admin.entity.QuotationResponseSource.PHONE);
        req.setResponseNotes("Price is high");

        Quotation rejected = quotationService.updateStatus(20L, req, adminUser);

        assertNotNull(rejected);
        assertEquals("REJECTED", rejected.getStatus());
        assertEquals(com.acrovix.admin.entity.QuotationResponseSource.PHONE, rejected.getResponseSource());
        assertEquals("Price is high", rejected.getResponseNotes());

        // Verify audit log includes response source and note
        verify(activityRepository).save(argThat(activity -> 
            activity.getAction().contains("QUOTATION_REJECTED via PHONE - Note: Price is high")
        ));
    }

    @Test
    void testRejectQuotationWithEmptyOptionalNote() {
        when(quotationRepository.findById(20L)).thenReturn(Optional.of(sentQuotation));
        when(quotationRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        com.acrovix.admin.dto.QuotationStatusUpdateRequest req = new com.acrovix.admin.dto.QuotationStatusUpdateRequest();
        req.setStatus("REJECTED");
        req.setResponseSource(com.acrovix.admin.entity.QuotationResponseSource.PHONE);
        req.setResponseNotes(""); // Empty optional note

        Quotation rejected = quotationService.updateStatus(20L, req, adminUser);

        assertNotNull(rejected);
        assertEquals("REJECTED", rejected.getStatus());
        assertEquals(com.acrovix.admin.entity.QuotationResponseSource.PHONE, rejected.getResponseSource());
        assertEquals("", rejected.getResponseNotes());
    }

    @Test
    void testAcceptQuotationWithNoteAndSource() {
        when(quotationRepository.findById(20L)).thenReturn(Optional.of(sentQuotation));
        when(quotationRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        com.acrovix.admin.dto.QuotationStatusUpdateRequest req = new com.acrovix.admin.dto.QuotationStatusUpdateRequest();
        req.setStatus("ACCEPTED");
        req.setResponseSource(com.acrovix.admin.entity.QuotationResponseSource.EMAIL);
        req.setResponseNotes("Client approved payment terms");

        Quotation accepted = quotationService.updateStatus(20L, req, adminUser);

        assertNotNull(accepted);
        assertEquals("ACCEPTED", accepted.getStatus());
        assertEquals(com.acrovix.admin.entity.QuotationResponseSource.EMAIL, accepted.getResponseSource());
        assertEquals("Client approved payment terms", accepted.getResponseNotes());

        verify(activityRepository).save(argThat(activity -> 
            activity.getAction().contains("QUOTATION_ACCEPTED via EMAIL - Note: Client approved payment terms")
        ));
    }
}
