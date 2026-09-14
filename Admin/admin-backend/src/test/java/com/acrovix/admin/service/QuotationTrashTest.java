package com.acrovix.admin.service;
import com.acrovix.admin.entity.*;
import com.acrovix.admin.exception.ResourceNotFoundException;
import com.acrovix.admin.repository.AdminActivityRepository;
import com.acrovix.admin.repository.AdminEnquiryRepository;
import com.acrovix.admin.repository.AdminUserRepository;
import com.acrovix.admin.repository.QuotationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class QuotationTrashTest {

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
    private AuthorizationService authorizationService = new AuthorizationService();

    @InjectMocks
    private QuotationService quotationService;

    private AdminUser superAdmin;
    private AdminUser salesUser1;
    private AdminUser salesUser2;
    private AdminEnquiry enquiry1;
    private AdminEnquiry enquiry2;
    private Quotation draftQuotation1;
    private Quotation draftQuotation2;
    private Quotation sentQuotation;

    @BeforeEach
    void setUp() {
        superAdmin = AdminUser.builder().id(1L).email("admin@acrovix.com").role(Role.SUPER_ADMIN).build();
        salesUser1 = AdminUser.builder().id(2L).email("sales1@acrovix.com").role(Role.SALES).build();
        salesUser2 = AdminUser.builder().id(3L).email("sales2@acrovix.com").role(Role.SALES).build();

        enquiry1 = AdminEnquiry.builder().id(101L).fullName("Client One").assignedTo(salesUser1).build();
        enquiry2 = AdminEnquiry.builder().id(102L).fullName("Client Two").assignedTo(salesUser2).build();

        List<QuotationItem> items1 = new ArrayList<>();
        QuotationItem item1 = QuotationItem.builder().id(1001L).description("Server").quantity(BigDecimal.ONE).unitPrice(BigDecimal.valueOf(50000)).build();
        items1.add(item1);

        draftQuotation1 = Quotation.builder()
                .id(201L)
                .quotationNumber("ACX-Q-2026-0001")
                .enquiry(enquiry1)
                .createdBy(salesUser1)
                .status("DRAFT")
                .clientName("Client One")
                .grandTotal(BigDecimal.valueOf(50000))
                .items(items1)
                .build();
        item1.setQuotation(draftQuotation1);

        draftQuotation2 = Quotation.builder()
                .id(202L)
                .quotationNumber("ACX-Q-2026-0002")
                .enquiry(enquiry2)
                .createdBy(salesUser2)
                .status("DRAFT")
                .clientName("Client Two")
                .grandTotal(BigDecimal.valueOf(30000))
                .items(new ArrayList<>())
                .build();

        sentQuotation = Quotation.builder()
                .id(203L)
                .quotationNumber("ACX-Q-2026-0003")
                .enquiry(enquiry1)
                .createdBy(salesUser1)
                .status("SENT")
                .clientName("Client One")
                .build();
    }

    // 1. SUPER_ADMIN can soft-delete own/any permitted draft.
    @Test
    void testSuperAdminCanSoftDeleteAnyPermittedDraft() {
        when(quotationRepository.findById(202L)).thenReturn(Optional.of(draftQuotation2));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(inv -> inv.getArgument(0));

        Quotation trashed = quotationService.moveToTrash(202L, superAdmin);

        assertNotNull(trashed.getDeletedAt());
        verify(quotationRepository).save(draftQuotation2);
    }

    // 2. SALES can soft-delete permitted draft.
    @Test
    void testSalesCanSoftDeletePermittedDraft() {
        when(quotationRepository.findById(201L)).thenReturn(Optional.of(draftQuotation1));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(inv -> inv.getArgument(0));

        Quotation trashed = quotationService.moveToTrash(201L, salesUser1);

        assertNotNull(trashed.getDeletedAt());
        verify(quotationRepository).save(draftQuotation1);
    }

    // 3. SALES cannot soft-delete another user's assigned quotation.
    @Test
    void testSalesCannotSoftDeleteOtherSalesQuotation() {
        when(quotationRepository.findById(202L)).thenReturn(Optional.of(draftQuotation2));

        assertThrows(AccessDeniedException.class, () -> quotationService.moveToTrash(202L, salesUser1));
    }

    // 4. SALES can restore own permitted draft.
    @Test
    void testSalesCanRestorePermittedDraft() {
        draftQuotation1.setDeletedAt(LocalDateTime.now());
        when(quotationRepository.findById(201L)).thenReturn(Optional.of(draftQuotation1));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(inv -> inv.getArgument(0));

        Quotation restored = quotationService.restoreFromTrash(201L, salesUser1);

        assertNull(restored.getDeletedAt());
        assertEquals("DRAFT", restored.getStatus());
        verify(quotationRepository).save(draftQuotation1);
    }

    // 5. SALES cannot restore another user's quotation.
    @Test
    void testSalesCannotRestoreOtherSalesQuotation() {
        draftQuotation2.setDeletedAt(LocalDateTime.now());
        when(quotationRepository.findById(202L)).thenReturn(Optional.of(draftQuotation2));

        assertThrows(AccessDeniedException.class, () -> quotationService.restoreFromTrash(202L, salesUser1));
    }

    // 6. SALES cannot permanently delete.
    @Test
    void testSalesCannotPermanentlyDelete() {
        draftQuotation1.setDeletedAt(LocalDateTime.now());

        assertThrows(AccessDeniedException.class, () -> quotationService.permanentlyDelete(201L, salesUser1));
        verify(quotationRepository, never()).delete(any(Quotation.class));
    }

    // 7. SUPER_ADMIN can permanently delete.
    @Test
    void testSuperAdminCanPermanentlyDelete() {
        draftQuotation1.setDeletedAt(LocalDateTime.now());
        when(quotationRepository.findById(201L)).thenReturn(Optional.of(draftQuotation1));

        assertDoesNotThrow(() -> quotationService.permanentlyDelete(201L, superAdmin));
        verify(quotationRepository).delete(draftQuotation1);
    }

    // 8. Non-DRAFT quotation cannot be moved to trash.
    @Test
    void testNonDraftQuotationCannotBeMovedToTrash() {
        when(quotationRepository.findById(203L)).thenReturn(Optional.of(sentQuotation));

        assertThrows(IllegalArgumentException.class, () -> quotationService.moveToTrash(203L, salesUser1));
    }

    // 9. Already deleted quotation cannot be soft-deleted twice.
    @Test
    void testAlreadyDeletedQuotationCannotBeSoftDeletedTwice() {
        draftQuotation1.setDeletedAt(LocalDateTime.now());
        when(quotationRepository.findById(201L)).thenReturn(Optional.of(draftQuotation1));

        assertThrows(IllegalStateException.class, () -> quotationService.moveToTrash(201L, salesUser1));
    }

    // 10. Non-deleted quotation cannot be restored.
    @Test
    void testNonDeletedQuotationCannotBeRestored() {
        when(quotationRepository.findById(201L)).thenReturn(Optional.of(draftQuotation1));

        assertThrows(IllegalArgumentException.class, () -> quotationService.restoreFromTrash(201L, salesUser1));
    }

    // 11. Restore preserves quotation number and items.
    @Test
    void testRestorePreservesQuotationNumberAndItems() {
        draftQuotation1.setDeletedAt(LocalDateTime.now());
        String expectedNum = draftQuotation1.getQuotationNumber();
        int expectedItemsCount = draftQuotation1.getItems().size();

        when(quotationRepository.findById(201L)).thenReturn(Optional.of(draftQuotation1));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(inv -> inv.getArgument(0));

        Quotation restored = quotationService.restoreFromTrash(201L, salesUser1);

        assertEquals(expectedNum, restored.getQuotationNumber());
        assertEquals(expectedItemsCount, restored.getItems().size());
        assertEquals(201L, restored.getId());
    }

    // 12. Permanent deletion requires quotation to be in trash first.
    @Test
    void testPermanentDeleteNonTrashedQuotationFails() {
        when(quotationRepository.findById(201L)).thenReturn(Optional.of(draftQuotation1));

        assertThrows(IllegalArgumentException.class, () -> quotationService.permanentlyDelete(201L, superAdmin));
        verify(quotationRepository, never()).delete(any(Quotation.class));
    }

    // 13. Activity log preserves quotation number before row deletion.
    @Test
    void testActivityLogPreservesQuotationNumberOnPermanentDelete() {
        draftQuotation1.setDeletedAt(LocalDateTime.now());
        when(quotationRepository.findById(201L)).thenReturn(Optional.of(draftQuotation1));

        quotationService.permanentlyDelete(201L, superAdmin);

        ArgumentCaptor<AdminActivity> activityCaptor = ArgumentCaptor.forClass(AdminActivity.class);
        verify(activityRepository).save(activityCaptor.capture());

        AdminActivity loggedActivity = activityCaptor.getValue();
        assertTrue(loggedActivity.getAction().contains("ACX-Q-2026-0001"));
        assertEquals("Quotation", loggedActivity.getEntityType());
        assertEquals(201L, loggedActivity.getEntityId());
        verify(quotationRepository).delete(draftQuotation1);
    }

    // 14. Permanent deletion does NOT remove associated enquiry.
    @Test
    void testPermanentDeletionDoesNotRemoveAssociatedEnquiry() {
        draftQuotation1.setDeletedAt(LocalDateTime.now());
        when(quotationRepository.findById(201L)).thenReturn(Optional.of(draftQuotation1));

        quotationService.permanentlyDelete(201L, superAdmin);

        verify(quotationRepository).delete(draftQuotation1);
        verify(enquiryRepository, never()).delete(any(AdminEnquiry.class));
        assertEquals(101L, draftQuotation1.getEnquiry().getId());
    }

    // 15. Deleted quotation excluded from normal detail view (404 ResourceNotFoundException).
    @Test
    void testDeletedQuotationExcludedFromGetQuotationById() {
        draftQuotation1.setDeletedAt(LocalDateTime.now());
        when(quotationRepository.findById(201L)).thenReturn(Optional.of(draftQuotation1));

        ResourceNotFoundException ex = assertThrows(
                ResourceNotFoundException.class,
                () -> quotationService.getQuotationById(201L, superAdmin)
        );
        assertEquals("Quotation not found", ex.getMessage());
    }

    // 16. Deleted draft appears in Trash query filtered by DRAFT status.
    @Test
    void testDeletedQuotationAppearsInTrashList() {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);
        org.springframework.data.domain.Page<Quotation> mockPage = new org.springframework.data.domain.PageImpl<>(List.of(draftQuotation1));
        when(quotationRepository.findByDeletedAtIsNotNullAndStatus("DRAFT", pageable)).thenReturn(mockPage);

        org.springframework.data.domain.Page<Quotation> trashPage = quotationService.getTrashQuotations(pageable, superAdmin);

        assertEquals(1, trashPage.getTotalElements());
        verify(quotationRepository).findByDeletedAtIsNotNullAndStatus("DRAFT", pageable);
    }

    // 17. Unauthenticated user throws AccessDeniedException (No JWT -> 401/403).
    @Test
    void testUnauthenticatedUserThrowsAccessDenied() {
        when(quotationRepository.findById(201L)).thenReturn(Optional.of(draftQuotation1));

        assertThrows(AccessDeniedException.class, () -> quotationService.moveToTrash(201L, null));
    }

    // 18. No orphan quotation items after permanent deletion.
    @Test
    void testNoOrphanItemsAfterPermanentDeletion() {
        draftQuotation1.setDeletedAt(LocalDateTime.now());
        when(quotationRepository.findById(201L)).thenReturn(Optional.of(draftQuotation1));

        quotationService.permanentlyDelete(201L, superAdmin);

        verify(quotationRepository).delete(draftQuotation1);
        // Cascades to items automatically via JPA orphanRemoval = true
        assertFalse(draftQuotation1.getItems().isEmpty());
    }

    // 19. Active quotation returns successfully with items populated.
    @Test
    void testActiveQuotationReturnsWithItems() {
        when(quotationRepository.findById(201L)).thenReturn(Optional.of(draftQuotation1));

        Quotation activeQuotation = quotationService.getQuotationById(201L, superAdmin);

        assertNotNull(activeQuotation);
        assertNull(activeQuotation.getDeletedAt());
        assertEquals(1, activeQuotation.getItems().size());
        assertEquals("Server", activeQuotation.getItems().get(0).getDescription());
    }
}
