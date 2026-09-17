package com.acrovix.admin.service;

import com.acrovix.admin.dto.report.*;
import com.acrovix.admin.entity.*;
import com.acrovix.admin.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class ReportServiceTest {

    @Autowired
    private ReportService reportService;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private AdminEnquiryRepository enquiryRepository;

    @Autowired
    private QuotationRepository quotationRepository;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private AdminUserRepository adminUserRepository;

    private Customer testCustomer;
    private AdminUser testAdmin;
    private Quotation testQuotation;

    @BeforeEach
    void setUp() {
        paymentRepository.deleteAll();
        invoiceRepository.deleteAll();
        purchaseOrderRepository.deleteAll();
        quotationRepository.deleteAll();
        enquiryRepository.deleteAll();
        customerRepository.deleteAll();
        adminUserRepository.deleteAll();

        testAdmin = new AdminUser();
        testAdmin.setName("Test Admin");
        testAdmin.setEmail("admin@acrovix.test");
        testAdmin.setPassword("hashedpassword");
        testAdmin.setRole(Role.SUPER_ADMIN);
        testAdmin = adminUserRepository.save(testAdmin);

        testCustomer = new Customer();
        testCustomer.setCustomerCode("ACX-CUST-99");
        testCustomer.setName("Acme Global");
        testCustomer.setCompanyName("Acme Corp");
        testCustomer.setEmail("info@acme.com");
        testCustomer.setPhone("9876543210");
        testCustomer.setCreatedBy(testAdmin.getId());
        testCustomer = customerRepository.save(testCustomer);

        testQuotation = new Quotation();
        testQuotation.setQuotationNumber("ACX/Q/26/000");
        testQuotation.setClientName("Acme Global");
        testQuotation.setClientEmail("info@acme.com");
        testQuotation.setCreatedBy(testAdmin);
        testQuotation.setStatus("ACCEPTED");
        testQuotation.setGrandTotal(new BigDecimal("100000.00"));
        testQuotation.setCreatedAt(LocalDateTime.now());
        testQuotation = quotationRepository.save(testQuotation);
    }

    @Test
    void testEmptyDatabaseSummary() {
        paymentRepository.deleteAll();
        invoiceRepository.deleteAll();
        purchaseOrderRepository.deleteAll();
        quotationRepository.deleteAll();
        enquiryRepository.deleteAll();
        customerRepository.deleteAll();

        ReportSummaryResponse summary = reportService.getSummaryReport("THIS_FINANCIAL_YEAR", null, null);

        assertNotNull(summary);
        assertEquals(0, summary.getTotalEnquiries());
        assertEquals(0, summary.getTotalQuotations());
        assertEquals(0, BigDecimal.ZERO.compareTo(summary.getTotalQuotationValue()));
        assertEquals(0, BigDecimal.ZERO.compareTo(summary.getAcceptedQuotationValue()));
        assertEquals(0, summary.getTotalPurchaseOrders());
        assertEquals(0, BigDecimal.ZERO.compareTo(summary.getTotalPoValue()));
        assertEquals(0, summary.getTotalInvoices());
        assertEquals(0, BigDecimal.ZERO.compareTo(summary.getTotalInvoiced()));
        assertEquals(0, BigDecimal.ZERO.compareTo(summary.getTotalReceived()));
        assertEquals(0, BigDecimal.ZERO.compareTo(summary.getOutstanding()));
        assertEquals(0, BigDecimal.ZERO.compareTo(summary.getOverdue()));
    }

    @Test
    void testDateRangePresetResolution() {
        ReportService.DateRange drToday = reportService.resolveDateRange("TODAY", null, null);
        assertEquals(LocalDate.now(), drToday.fromDate);
        assertEquals(LocalDate.now(), drToday.toDate);

        ReportService.DateRange drMonth = reportService.resolveDateRange("THIS_MONTH", null, null);
        assertEquals(LocalDate.now().withDayOfMonth(1), drMonth.fromDate);

        ReportService.DateRange drFy = reportService.resolveDateRange("THIS_FINANCIAL_YEAR", null, null);
        int yr = LocalDate.now().getYear();
        if (LocalDate.now().getMonthValue() >= 4) {
            assertEquals(LocalDate.of(yr, 4, 1), drFy.fromDate);
            assertEquals(LocalDate.of(yr + 1, 3, 31), drFy.toDate);
        } else {
            assertEquals(LocalDate.of(yr - 1, 4, 1), drFy.fromDate);
            assertEquals(LocalDate.of(yr, 3, 31), drFy.toDate);
        }

        ReportService.DateRange drCustom = reportService.resolveDateRange("CUSTOM", "2026-04-01", "2026-09-30");
        assertEquals(LocalDate.of(2026, 4, 1), drCustom.fromDate);
        assertEquals(LocalDate.of(2026, 9, 30), drCustom.toDate);

        assertThrows(IllegalArgumentException.class, () -> 
            reportService.resolveDateRange("CUSTOM", "2026-10-01", "2026-04-01")
        );
    }

    @Test
    void testQuotationReportAggregation() {
        Quotation q1 = new Quotation();
        q1.setQuotationNumber("ACX/Q/26/001");
        q1.setClientName("Acme");
        q1.setClientEmail("info@acme.com");
        q1.setCreatedBy(testAdmin);
        q1.setStatus("ACCEPTED");
        q1.setGrandTotal(new BigDecimal("100000.00"));
        q1.setCreatedAt(LocalDateTime.now());
        quotationRepository.save(q1);

        Quotation q2 = new Quotation();
        q2.setQuotationNumber("ACX/Q/26/002");
        q2.setClientName("Acme");
        q2.setClientEmail("info@acme.com");
        q2.setCreatedBy(testAdmin);
        q2.setStatus("REJECTED");
        q2.setGrandTotal(new BigDecimal("50000.00"));
        q2.setCreatedAt(LocalDateTime.now());
        quotationRepository.save(q2);

        QuotationReportResponse resp = reportService.getQuotationReport("THIS_FINANCIAL_YEAR", null, null);

        assertNotNull(resp);
        assertTrue(resp.getTotalQuotations() >= 2);
        assertTrue(resp.getAcceptedCount() >= 1);
        assertTrue(resp.getRejectedCount() >= 1);
    }

    @Test
    void testPurchaseOrderReportAggregation() {
        PurchaseOrder po1 = new PurchaseOrder();
        po1.setPoNumber("ACX/PO/26/001");
        po1.setPoDate(LocalDate.now());
        po1.setQuotation(testQuotation);
        po1.setCreatedBy(testAdmin);
        po1.setStatus(PurchaseOrderStatus.VERIFIED);
        po1.setPoValue(new BigDecimal("200000.00"));
        purchaseOrderRepository.save(po1);

        PurchaseOrder po2 = new PurchaseOrder();
        po2.setPoNumber("ACX/PO/26/002");
        po2.setPoDate(LocalDate.now());
        po2.setQuotation(testQuotation);
        po2.setCreatedBy(testAdmin);
        po2.setStatus(PurchaseOrderStatus.CANCELLED);
        po2.setPoValue(new BigDecimal("75000.00"));
        purchaseOrderRepository.save(po2);

        PurchaseOrderReportResponse resp = reportService.getPurchaseOrderReport("THIS_FINANCIAL_YEAR", null, null);

        assertNotNull(resp);
        assertEquals(2, resp.getTotalPurchaseOrders());
        assertEquals(1, resp.getVerifiedCount());
        assertEquals(1, resp.getCancelledCount());
        assertEquals(0, new BigDecimal("275000.00").compareTo(resp.getTotalPoValue()));
        assertEquals(0, new BigDecimal("200000.00").compareTo(resp.getVerifiedPoValue()));
    }

    @Test
    void testInvoiceAndPaymentReportAggregation_CancelledPaymentExcluded() {
        Invoice inv = new Invoice();
        inv.setInvoiceNumber("ACX/INV/26/001");
        inv.setInvoiceType(InvoiceType.TAX_INVOICE);
        inv.setStatus(InvoiceStatus.PARTIALLY_PAID);
        inv.setInvoiceDate(LocalDate.now());
        inv.setGrandTotal(new BigDecimal("118000.00"));
        inv.setTaxableAmount(new BigDecimal("100000.00"));
        inv.setTaxAmount(new BigDecimal("18000.00"));
        inv.setDiscountAmount(BigDecimal.ZERO);
        inv.setAmountPaid(new BigDecimal("50000.00"));
        inv.setBalanceDue(new BigDecimal("68000.00"));
        inv.setCustomer(testCustomer);
        inv = invoiceRepository.save(inv);

        // Active recorded payment
        Payment p1 = new Payment();
        p1.setPaymentNumber("ACX/REC/26/001");
        p1.setInvoice(inv);
        p1.setCustomer(testCustomer);
        p1.setPaymentDate(LocalDate.now());
        p1.setAmount(new BigDecimal("50000.00"));
        p1.setPaymentMethod(PaymentMethod.BANK_TRANSFER);
        p1.setStatus(PaymentStatus.RECORDED);
        p1.setRecordedBy(testAdmin);
        paymentRepository.save(p1);

        // Cancelled payment -> MUST BE EXCLUDED from received total!
        Payment p2 = new Payment();
        p2.setPaymentNumber("ACX/REC/26/002");
        p2.setInvoice(inv);
        p2.setCustomer(testCustomer);
        p2.setPaymentDate(LocalDate.now());
        p2.setAmount(new BigDecimal("20000.00"));
        p2.setPaymentMethod(PaymentMethod.UPI);
        p2.setStatus(PaymentStatus.CANCELLED);
        p2.setCancellationReason("Bounce");
        p2.setRecordedBy(testAdmin);
        paymentRepository.save(p2);

        PaymentReportResponse payRep = reportService.getPaymentReport("THIS_FINANCIAL_YEAR", null, null);
        assertNotNull(payRep);
        assertEquals(1, payRep.getTotalPayments()); // Only 1 RECORDED payment
        assertEquals(0, new BigDecimal("50000.00").compareTo(payRep.getTotalReceived())); // Cancelled payment excluded!

        InvoiceReportResponse invRep = reportService.getInvoiceReport("THIS_FINANCIAL_YEAR", null, null);
        assertNotNull(invRep);
        assertEquals(1, invRep.getTotalInvoices());
        assertEquals(0, new BigDecimal("118000.00").compareTo(invRep.getTotalInvoiced()));
        assertEquals(0, new BigDecimal("50000.00").compareTo(invRep.getAmountReceived()));
        assertEquals(0, new BigDecimal("68000.00").compareTo(invRep.getOutstanding()));
    }

    @Test
    void testCustomerAnalytics() {
        List<CustomerAnalyticsDto> customerAnalytics = reportService.getCustomerAnalytics("THIS_FINANCIAL_YEAR", null, null);

        assertNotNull(customerAnalytics);
        assertEquals(1, customerAnalytics.size());
        CustomerAnalyticsDto ca = customerAnalytics.get(0);
        assertEquals(testCustomer.getId(), ca.getCustomerId());
        assertEquals("Acme Global", ca.getCustomerName());
        assertEquals("ACX-CUST-99", ca.getCustomerCode());
    }

    @Test
    void testMonthlyTrends() {
        List<MonthlyTrendDto> trends = reportService.getMonthlyTrends("THIS_FINANCIAL_YEAR", null, null);

        assertNotNull(trends);
        assertFalse(trends.isEmpty());
        MonthlyTrendDto m = trends.get(0);
        assertNotNull(m.getMonth());
        assertNotNull(m.getQuotationValue());
        assertNotNull(m.getInvoiceValue());
        assertNotNull(m.getPaymentValue());
    }

    @Test
    void testExportCsv() {
        String csvSummary = reportService.exportReportCsv("SUMMARY", "THIS_FINANCIAL_YEAR", null, null);
        assertNotNull(csvSummary);
        assertTrue(csvSummary.contains("Metric,Value"));
        assertTrue(csvSummary.contains("Total Enquiries"));

        String csvPayments = reportService.exportReportCsv("PAYMENTS", "THIS_FINANCIAL_YEAR", null, null);
        assertNotNull(csvPayments);
        assertTrue(csvPayments.contains("Metric / Method,Count,Amount Received"));

        String csvCustomers = reportService.exportReportCsv("CUSTOMERS", "THIS_FINANCIAL_YEAR", null, null);
        assertNotNull(csvCustomers);
        assertTrue(csvCustomers.contains("Customer Code,Customer Name"));
    }
}
