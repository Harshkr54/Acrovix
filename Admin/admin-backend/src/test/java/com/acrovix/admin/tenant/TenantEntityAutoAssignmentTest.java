package com.acrovix.admin.tenant;

import com.acrovix.admin.entity.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class TenantEntityAutoAssignmentTest {

    private final TenantEntityListener listener = new TenantEntityListener();

    @BeforeEach
    void setUp() {
        TenantContext.clear();
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("TenantEntityListener populates tenant_id from active TenantContext on persist")
    void testAutoPopulateFromTenantContext() {
        TenantContext.setTenantId(5L);

        Customer customer = Customer.builder()
                .name("Acme Corp")
                .customerCode("ACME-001")
                .build();
        assertNull(customer.getTenantId());

        listener.setTenantId(customer);

        assertEquals(5L, customer.getTenantId());
    }

    @Test
    @DisplayName("TenantEntityListener cascades parent aggregate root tenant_id to QuotationItem")
    void testCascadeParentTenantIdToQuotationItem() {
        Quotation quotation = Quotation.builder()
                .quotationNumber("ACX-Q-2026-0001")
                .build();
        quotation.setTenantId(7L);

        QuotationItem item = QuotationItem.builder()
                .quotation(quotation)
                .description("Cloud Consulting Services")
                .build();
        assertNull(item.getTenantId());

        // Even without active TenantContext, listener resolves parent quotation's tenantId
        listener.setTenantId(item);

        assertEquals(7L, item.getTenantId());
    }

    @Test
    @DisplayName("TenantEntityListener cascades parent aggregate root tenant_id to InvoiceItem")
    void testCascadeParentTenantIdToInvoiceItem() {
        Invoice invoice = Invoice.builder()
                .invoiceNumber("ACX/INV/26-27/0001")
                .build();
        invoice.setTenantId(9L);

        InvoiceItem item = InvoiceItem.builder()
                .invoice(invoice)
                .description("Software License")
                .build();
        assertNull(item.getTenantId());

        listener.setTenantId(item);

        assertEquals(9L, item.getTenantId());
    }

    @Test
    @DisplayName("TenantEntityListener falls back to root tenant 1L when no context or parent is present")
    void testFallbackToRootTenantWhenNoContext() {
        Customer customer = Customer.builder()
                .name("Legacy Walkin Customer")
                .customerCode("WALK-001")
                .build();
        assertNull(customer.getTenantId());

        listener.setTenantId(customer);

        assertEquals(1L, customer.getTenantId());
    }

    @Test
    @DisplayName("TenantEntityListener preserves manually assigned tenant_id")
    void testPreserveExistingTenantId() {
        TenantContext.setTenantId(10L);

        Customer customer = Customer.builder()
                .name("Specific Branch Customer")
                .customerCode("BR-001")
                .build();
        customer.setTenantId(42L);

        listener.setTenantId(customer);

        assertEquals(42L, customer.getTenantId(), "Existing tenantId should not be overwritten");
    }
}
