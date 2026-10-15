package com.acrovix.admin.service;

import com.acrovix.admin.dto.InvoiceItemRequest;
import com.acrovix.admin.entity.Invoice;
import com.acrovix.admin.entity.InvoiceItem;
import com.acrovix.admin.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class InvoiceTaxCalculationTest {

    @Mock private InvoiceRepository invoiceRepository;
    @Mock private CustomerRepository customerRepository;
    @Mock private QuotationRepository quotationRepository;
    @Mock private PurchaseOrderRepository purchaseOrderRepository;
    @Mock private ProductServiceRepository productServiceRepository;
    @Mock private CompanySettingsRepository companySettingsRepository;
    @Mock private SequenceGeneratorService sequenceGeneratorService;
    @Mock private AdminActivityRepository activityRepository;
    @Mock private NotificationService notificationService;
    @Mock private PdfService pdfService;
    @Mock private EmailService emailService;
    @Mock private AuthorizationService authorizationService;

    @InjectMocks
    private InvoiceService invoiceService;

    private Invoice invoice;

    @BeforeEach
    void setUp() {
        invoice = new Invoice();
        invoice.setItems(new ArrayList<>());
        invoice.setSupplierGstin("07AAAAA0000A1Z5");
        invoice.setSupplierState("07");
        invoice.setClientGstin("07BBBBB0000B1Z5");
        invoice.setPlaceOfSupply("07");
    }

    @Test
    @DisplayName("BUG-02 Fix: Intra-state odd-paisa tax splits exactly such that CGST + SGST == totalTax")
    void testIntraStateOddPaisaTaxSplit() {
        // Taxable 55.83 @ 18% tax = 10.0494 -> rounds to 10.05
        // Odd paisa 10.05: halfTax = 5.03, otherHalf = 5.02. Sum = 10.05 exactly.
        InvoiceItemRequest req = new InvoiceItemRequest();
        req.setQuantity(new BigDecimal("1"));
        req.setListPrice(new BigDecimal("55.83"));
        req.setUnitPrice(new BigDecimal("55.83"));
        req.setDiscountPercent(BigDecimal.ZERO);
        req.setTaxPercent(new BigDecimal("18"));

        List<InvoiceItemRequest> items = List.of(req);
        ReflectionTestUtils.invokeMethod(invoiceService, "calculateAndSetTotals", invoice, items);

        assertEquals(1, invoice.getItems().size());
        InvoiceItem item = invoice.getItems().get(0);

        assertEquals(new BigDecimal("10.05"), item.getTaxAmount());
        assertEquals(new BigDecimal("5.03"), item.getCgstAmount());
        assertEquals(new BigDecimal("5.02"), item.getSgstAmount());
        assertEquals(BigDecimal.ZERO, item.getIgstAmount());

        // Crucial invariant: CGST + SGST must strictly equal line tax
        assertEquals(item.getTaxAmount(), item.getCgstAmount().add(item.getSgstAmount()),
                "CGST + SGST must strictly equal total line tax without odd-paisa ceiling discrepancy");

        // Invoice totals
        assertEquals(new BigDecimal("5.03"), invoice.getCgstAmount());
        assertEquals(new BigDecimal("5.02"), invoice.getSgstAmount());
        assertEquals(new BigDecimal("10.05"), invoice.getTaxAmount());
        assertEquals(invoice.getTaxAmount(), invoice.getCgstAmount().add(invoice.getSgstAmount()));
    }

    @Test
    @DisplayName("BUG-02 Fix: Inter-state invoice sets CGST and SGST to zero and IGST equal to line tax")
    void testInterStateIgstTax() {
        // Supplier in Delhi (07), client in Maharashtra (27)
        invoice.setClientGstin("27BBBBB0000B1Z5");
        invoice.setPlaceOfSupply("27");

        InvoiceItemRequest req = new InvoiceItemRequest();
        req.setQuantity(new BigDecimal("2"));
        req.setListPrice(new BigDecimal("100.00"));
        req.setUnitPrice(new BigDecimal("100.00"));
        req.setDiscountPercent(BigDecimal.ZERO);
        req.setTaxPercent(new BigDecimal("18"));

        List<InvoiceItemRequest> items = List.of(req);
        ReflectionTestUtils.invokeMethod(invoiceService, "calculateAndSetTotals", invoice, items);

        InvoiceItem item = invoice.getItems().get(0);
        assertEquals(BigDecimal.ZERO, item.getCgstAmount());
        assertEquals(BigDecimal.ZERO, item.getSgstAmount());
        assertEquals(new BigDecimal("36.00"), item.getIgstAmount());
        assertEquals(new BigDecimal("36.00"), item.getTaxAmount());

        assertEquals(BigDecimal.ZERO, invoice.getCgstAmount());
        assertEquals(BigDecimal.ZERO, invoice.getSgstAmount());
        assertEquals(new BigDecimal("36.00"), invoice.getIgstAmount());
        assertEquals(new BigDecimal("36.00"), invoice.getTaxAmount());
    }

    @Test
    @DisplayName("BUG-02 Fix: Subtotal, Discount, Taxable Base and Grand Total identities are preserved")
    void testSubtotalDiscountTaxableIdentities() {
        // Item 1: Qty 2, ListPrice 500, Disc 10% (Gross 1000, Disc 100, Taxable 900, Tax 18% = 162)
        InvoiceItemRequest req1 = new InvoiceItemRequest();
        req1.setQuantity(new BigDecimal("2"));
        req1.setListPrice(new BigDecimal("500.00"));
        req1.setUnitPrice(new BigDecimal("450.00"));
        req1.setDiscountPercent(new BigDecimal("10"));
        req1.setTaxPercent(new BigDecimal("18"));

        // Item 2: Qty 1, ListPrice 600, Disc 20% (Gross 600, Disc 120, Taxable 480, Tax 18% = 86.40)
        InvoiceItemRequest req2 = new InvoiceItemRequest();
        req2.setQuantity(new BigDecimal("1"));
        req2.setListPrice(new BigDecimal("600.00"));
        req2.setUnitPrice(new BigDecimal("480.00"));
        req2.setDiscountPercent(new BigDecimal("20"));
        req2.setTaxPercent(new BigDecimal("18"));

        List<InvoiceItemRequest> items = List.of(req1, req2);
        ReflectionTestUtils.invokeMethod(invoiceService, "calculateAndSetTotals", invoice, items);

        // Gross Subtotal = 1000 + 600 = 1600
        assertEquals(new BigDecimal("1600.00"), invoice.getSubtotal(), "Subtotal must be Gross List Amount before discounts");

        // Total Discount = 100 + 120 = 220
        assertEquals(new BigDecimal("220.00"), invoice.getDiscountAmount());

        // Taxable Amount = 900 + 480 = 1380
        assertEquals(new BigDecimal("1380.00"), invoice.getTaxableAmount());

        // Crucial financial invariant: Subtotal - Discount == Taxable Amount
        assertEquals(0, invoice.getSubtotal().subtract(invoice.getDiscountAmount()).compareTo(invoice.getTaxableAmount()),
                "subtotal - discountAmount must strictly equal taxableAmount");

        // Tax Amount = 162.00 + 86.40 = 248.40
        assertEquals(new BigDecimal("248.40"), invoice.getTaxAmount());

        // Grand Total = 1380 + 248.40 = 1628.40
        assertEquals(new BigDecimal("1628.40"), invoice.getGrandTotal());
        assertEquals(0, invoice.getTaxableAmount().add(invoice.getTaxAmount()).compareTo(invoice.getGrandTotal()),
                "taxableAmount + taxAmount must strictly equal grandTotal");
        assertEquals(invoice.getGrandTotal(), invoice.getBalanceDue(),
                "balanceDue must equal grandTotal initially");
    }
}
