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
        Quotation accepted = quotationService.updateStatus(20L, "ACCEPTED", adminUser);
        assertEquals("ACCEPTED", accepted.getStatus());

        // SENT -> REJECTED
        sentQuotation.setStatus("SENT");
        Quotation rejected = quotationService.updateStatus(20L, "REJECTED", adminUser);
        assertEquals("REJECTED", rejected.getStatus());

        // SENT -> EXPIRED
        sentQuotation.setStatus("SENT");
        Quotation expired = quotationService.updateStatus(20L, "EXPIRED", adminUser);
        assertEquals("EXPIRED", expired.getStatus());

        // ACCEPTED -> CONVERTED
        when(quotationRepository.findById(30L)).thenReturn(Optional.of(Quotation.builder().status("ACCEPTED").build()));
        Quotation converted = quotationService.updateStatus(30L, "CONVERTED", adminUser);
        assertEquals("CONVERTED", converted.getStatus());
    }

    @Test
    void testInvalidStatusTransitionsThrowConflict() {
        when(quotationRepository.findById(10L)).thenReturn(Optional.of(draftQuotation));
        
        // DRAFT -> ACCEPTED is invalid
        assertThrows(ResourceConflictException.class, () -> {
            quotationService.updateStatus(10L, "ACCEPTED", adminUser);
        });

        // ACCEPTED -> REJECTED is invalid
        Quotation acceptedQuotation = Quotation.builder().id(40L).status("ACCEPTED").build();
        when(quotationRepository.findById(40L)).thenReturn(Optional.of(acceptedQuotation));
        assertThrows(ResourceConflictException.class, () -> {
            quotationService.updateStatus(40L, "REJECTED", adminUser);
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
    }

    @Test
    void testCreateRevisionFromDraftThrowsConflict() {
        when(quotationRepository.findWithDetailsById(10L)).thenReturn(Optional.of(draftQuotation));
        
        assertThrows(ResourceConflictException.class, () -> {
            quotationService.createRevision(10L, adminUser);
        });
    }
}
