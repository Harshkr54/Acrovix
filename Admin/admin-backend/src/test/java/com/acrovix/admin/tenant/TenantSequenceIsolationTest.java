package com.acrovix.admin.tenant;

import com.acrovix.admin.entity.InvoiceType;
import com.acrovix.admin.entity.SequenceTracker;
import com.acrovix.admin.repository.SequenceTrackerRepository;
import com.acrovix.admin.service.SequenceGeneratorService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.Year;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TenantSequenceIsolationTest {

    @Mock
    private SequenceTrackerRepository sequenceTrackerRepository;

    private SequenceGeneratorService sequenceGeneratorService;

    // In-memory store simulating isolated DB sequence tracker rows: key = "tenantId:sequenceName"
    private final Map<String, SequenceTracker> trackerDb = new HashMap<>();

    @BeforeEach
    void setUp() {
        sequenceGeneratorService = new SequenceGeneratorService(sequenceTrackerRepository);
        trackerDb.clear();
        TenantContext.clear();

        // Configure repository mock to simulate isolated row per (tenantId, sequenceName)
        lenient().when(sequenceTrackerRepository.findByTenantIdAndSequenceNameForUpdate(any(Long.class), any(String.class)))
                .thenAnswer(invocation -> {
                    Long tenantId = invocation.getArgument(0);
                    String sequenceName = invocation.getArgument(1);
                    String key = tenantId + ":" + sequenceName;
                    SequenceTracker existing = trackerDb.get(key);
                    return Optional.ofNullable(existing);
                });

        lenient().when(sequenceTrackerRepository.save(any(SequenceTracker.class)))
                .thenAnswer(invocation -> {
                    SequenceTracker tracker = invocation.getArgument(0);
                    String key = tracker.getTenantId() + ":" + tracker.getSequenceName();
                    trackerDb.put(key, tracker);
                    return tracker;
                });
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("Tenant 1 and Tenant 2 independently generate sequence #1 for quotations without collision")
    void testQuotationSequenceIsolationBetweenTenants() {
        int year = Year.now().getValue();

        // 1. Tenant 1 generates first quotation
        TenantContext.setTenantId(1L);
        String q1Tenant1 = sequenceGeneratorService.generateNextQuotationNumber();
        assertEquals(String.format("ACX-Q-%d-0001", year), q1Tenant1);

        // 2. Tenant 2 generates first quotation -> should start from 1 independently!
        TenantContext.setTenantId(2L);
        String q1Tenant2 = sequenceGeneratorService.generateNextQuotationNumber();
        assertEquals(String.format("ACX-Q-%d-0001", year), q1Tenant2);

        // 3. Tenant 1 generates second quotation -> increments to 2
        TenantContext.setTenantId(1L);
        String q2Tenant1 = sequenceGeneratorService.generateNextQuotationNumber();
        assertEquals(String.format("ACX-Q-%d-0002", year), q2Tenant1);

        // 4. Tenant 2 generates second quotation -> increments to 2
        TenantContext.setTenantId(2L);
        String q2Tenant2 = sequenceGeneratorService.generateNextQuotationNumber();
        assertEquals(String.format("ACX-Q-%d-0002", year), q2Tenant2);

        // Verify repository was queried with respective tenant IDs
        verify(sequenceTrackerRepository, atLeastOnce()).findByTenantIdAndSequenceNameForUpdate(eq(1L), eq("QUOTATION_" + year));
        verify(sequenceTrackerRepository, atLeastOnce()).findByTenantIdAndSequenceNameForUpdate(eq(2L), eq("QUOTATION_" + year));
    }

    @Test
    @DisplayName("Invoice and Purchase Order numbers are isolated between tenants")
    void testInvoiceAndPoSequenceIsolation() {
        LocalDate date = LocalDate.of(2026, 6, 15);

        // Tenant 10 generates invoice
        TenantContext.setTenantId(10L);
        String invTenant10 = sequenceGeneratorService.generateNextInvoiceNumber(InvoiceType.TAX_INVOICE, date);
        assertEquals("ACX/INV/26-27/0001", invTenant10);

        // Tenant 20 generates invoice -> starts at 1
        TenantContext.setTenantId(20L);
        String invTenant20 = sequenceGeneratorService.generateNextInvoiceNumber(InvoiceType.TAX_INVOICE, date);
        assertEquals("ACX/INV/26-27/0001", invTenant20);

        // Tenant 10 generates Purchase Order -> starts at 1
        TenantContext.setTenantId(10L);
        String poTenant10 = sequenceGeneratorService.generateNextPurchaseOrderNumber(date);
        assertEquals("ACX/PO/26-27/0001", poTenant10);

        // Tenant 20 generates Purchase Order -> starts at 1
        TenantContext.setTenantId(20L);
        String poTenant20 = sequenceGeneratorService.generateNextPurchaseOrderNumber(date);
        assertEquals("ACX/PO/26-27/0001", poTenant20);
    }
}
