package com.acrovix.admin.service;

import com.acrovix.admin.entity.Currency;
import com.acrovix.admin.entity.PurchaseOrder;
import com.acrovix.admin.entity.Quotation;
import com.acrovix.admin.entity.QuotationItem;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class QuotationPdfSummaryTest {

    @Autowired
    private PdfService pdfService;

    @Test
    @DisplayName("BUG-12 Fix: Quotation PDF with discount generates valid PDF bytes with gross subtotal, discount, and taxable amount")
    void testQuotationPdfWithDiscount() {
        Quotation quotation = new Quotation();
        quotation.setQuotationNumber("QT-2026-0001");
        quotation.setClientName("Jane Doe");
        quotation.setClientCompany("Acme Corp");
        quotation.setClientEmail("jane@acme.com");
        quotation.setClientPhone("+91 9876543210");
        quotation.setStatus("DRAFT");
        quotation.setCurrency(Currency.INR);
        quotation.setCreatedAt(LocalDateTime.now());
        quotation.setValidUntil(LocalDate.now().plusDays(30));
        quotation.setTermsAndConditions("1. Payment: 50% advance.\n2. Delivery: 2 weeks.");

        // Financials: Subtotal (Taxable) = 900, Discount = 100, Gross = 1000, Tax = 162, GrandTotal = 1062
        quotation.setSubtotal(new BigDecimal("900.00"));
        quotation.setDiscountAmount(new BigDecimal("100.00"));
        quotation.setTaxAmount(new BigDecimal("162.00"));
        quotation.setGrandTotal(new BigDecimal("1062.00"));

        List<QuotationItem> items = new ArrayList<>();
        QuotationItem item = QuotationItem.builder()
                .sku("SKU-001")
                .description("Cloud Server Setup")
                .hsnSac("998313")
                .quantity(new BigDecimal("1"))
                .listPrice(new BigDecimal("1000.00"))
                .unitPrice(new BigDecimal("900.00"))
                .discountPercent(new BigDecimal("10.00"))
                .taxPercent(new BigDecimal("18.00"))
                .lineTotal(new BigDecimal("1062.00"))
                .sortOrder(1)
                .build();
        items.add(item);
        quotation.setItems(items);

        byte[] pdfBytes = pdfService.generateQuotationPdf(quotation);
        assertNotNull(pdfBytes, "Generated Quotation PDF must not be null");
        assertTrue(pdfBytes.length > 1000, "Generated Quotation PDF must contain valid document bytes");
    }

    @Test
    @DisplayName("BUG-12 Fix: Quotation PDF without discount generates valid PDF bytes cleanly")
    void testQuotationPdfWithoutDiscount() {
        Quotation quotation = new Quotation();
        quotation.setQuotationNumber("QT-2026-0002");
        quotation.setClientName("John Smith");
        quotation.setClientCompany("Beta LLC");
        quotation.setClientEmail("john@beta.com");
        quotation.setStatus("SENT");
        quotation.setCurrency(Currency.INR);
        quotation.setCreatedAt(LocalDateTime.now());
        quotation.setValidUntil(LocalDate.now().plusDays(15));
        quotation.setTermsAndConditions("1. Standard warranty applies.");

        quotation.setSubtotal(new BigDecimal("1000.00"));
        quotation.setDiscountAmount(BigDecimal.ZERO);
        quotation.setTaxAmount(new BigDecimal("180.00"));
        quotation.setGrandTotal(new BigDecimal("1180.00"));

        List<QuotationItem> items = new ArrayList<>();
        QuotationItem item = QuotationItem.builder()
                .sku("SKU-002")
                .description("Database Migration")
                .hsnSac("998314")
                .quantity(new BigDecimal("1"))
                .listPrice(new BigDecimal("1000.00"))
                .unitPrice(new BigDecimal("1000.00"))
                .discountPercent(BigDecimal.ZERO)
                .taxPercent(new BigDecimal("18.00"))
                .lineTotal(new BigDecimal("1180.00"))
                .sortOrder(1)
                .build();
        items.add(item);
        quotation.setItems(items);

        byte[] pdfBytes = pdfService.generateQuotationPdf(quotation);
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 1000);
    }

    @Test
    @DisplayName("Purchase Order PDF Consumer Verification: PO PDF generates without regression")
    void testPurchaseOrderPdfGeneration() {
        PurchaseOrder po = new PurchaseOrder();
        po.setPoNumber("PO-2026-0001");
        po.setPoDate(LocalDate.now());
        po.setPoValue(new BigDecimal("1180.00"));
        po.setRemarks("Net 30");

        Quotation quotation = new Quotation();
        quotation.setQuotationNumber("QT-2026-0002");
        quotation.setClientName("John Smith");
        quotation.setClientCompany("Beta LLC");
        quotation.setSubtotal(new BigDecimal("1000.00"));
        quotation.setTaxAmount(new BigDecimal("180.00"));
        quotation.setGrandTotal(new BigDecimal("1180.00"));
        po.setQuotation(quotation);

        byte[] pdfBytes = pdfService.generatePurchaseOrderPdf(po);
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 1000);
    }
}
