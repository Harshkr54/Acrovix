package com.acrovix.admin.service;

import com.acrovix.admin.dto.PaymentCancelRequest;
import com.acrovix.admin.dto.PaymentRequest;

import com.acrovix.admin.entity.*;
import com.acrovix.admin.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class PaymentServiceTest {

    @Mock private PaymentRepository paymentRepository;
    @Mock private InvoiceRepository invoiceRepository;
    @Mock private CustomerRepository customerRepository;
    @Mock private SequenceGeneratorService sequenceGeneratorService;
    @Mock private AdminActivityRepository activityRepository;
    @Mock private PdfService pdfService;
    @Mock private NotificationService notificationService;

    @InjectMocks private PaymentService paymentService;

    private AdminUser adminUser;
    private Customer customer;
    private Invoice taxInvoice;

    @BeforeEach
    void setUp() {
        adminUser = new AdminUser();
        adminUser.setId(1L);
        adminUser.setName("Finance Admin");

        customer = new Customer();
        customer.setId(100L);
        customer.setName("Acme Corp");
        customer.setCustomerCode("CUST-100");

        taxInvoice = new Invoice();
        taxInvoice.setId(10L);
        taxInvoice.setInvoiceNumber("ACX/INV/26-27/0001");
        taxInvoice.setInvoiceType(InvoiceType.TAX_INVOICE);
        taxInvoice.setStatus(InvoiceStatus.ISSUED);
        taxInvoice.setCustomer(customer);
        taxInvoice.setGrandTotal(new BigDecimal("10000.00"));
        taxInvoice.setAmountPaid(BigDecimal.ZERO);
        taxInvoice.setBalanceDue(new BigDecimal("10000.00"));
    }

    @Test
    void testRecordPayment_PartialPayment_Success() {
        when(invoiceRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(taxInvoice));
        when(paymentRepository.sumActivePaymentsForInvoice(10L)).thenReturn(BigDecimal.ZERO, new BigDecimal("4000.00"));
        when(sequenceGeneratorService.generateNextPaymentNumber(any(LocalDate.class))).thenReturn("ACX/PAY/26-27/0001");
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            p.setId(1L);
            return p;
        });

        PaymentRequest request = new PaymentRequest();
        request.setInvoiceId(10L);
        request.setPaymentDate(LocalDate.now());
        request.setAmount(new BigDecimal("4000.00"));
        request.setPaymentMethod(PaymentMethod.BANK_TRANSFER);
        request.setTransactionReference("UTR12345");

        Payment payment = paymentService.recordPayment(request, adminUser);

        assertNotNull(payment);
        assertEquals("ACX/PAY/26-27/0001", payment.getPaymentNumber());
        assertEquals(new BigDecimal("4000.00"), payment.getAmount());
        assertEquals(PaymentStatus.RECORDED, payment.getStatus());

        // Check invoice recalculation
        assertEquals(InvoiceStatus.PARTIALLY_PAID, taxInvoice.getStatus());
        assertEquals(new BigDecimal("4000.00"), taxInvoice.getAmountPaid());
        assertEquals(new BigDecimal("6000.00"), taxInvoice.getBalanceDue());

        // Verify Customer Master was NEVER touched
        verifyNoInteractions(customerRepository);
    }

    @Test
    void testRecordPayment_FullPayment_StatusPaid() {
        when(invoiceRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(taxInvoice));
        when(paymentRepository.sumActivePaymentsForInvoice(10L)).thenReturn(BigDecimal.ZERO, new BigDecimal("10000.00"));
        when(sequenceGeneratorService.generateNextPaymentNumber(any(LocalDate.class))).thenReturn("ACX/PAY/26-27/0002");
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            p.setId(2L);
            return p;
        });

        PaymentRequest request = new PaymentRequest();
        request.setInvoiceId(10L);
        request.setPaymentDate(LocalDate.now());
        request.setAmount(new BigDecimal("10000.00"));
        request.setPaymentMethod(PaymentMethod.UPI);

        Payment payment = paymentService.recordPayment(request, adminUser);

        assertNotNull(payment);
        assertEquals(InvoiceStatus.PAID, taxInvoice.getStatus());
        assertEquals(new BigDecimal("10000.00"), taxInvoice.getAmountPaid());
        assertEquals(BigDecimal.ZERO.setScale(2), taxInvoice.getBalanceDue());
    }

    @Test
    void testRecordPayment_DraftInvoice_Rejection() {
        taxInvoice.setStatus(InvoiceStatus.DRAFT);
        when(invoiceRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(taxInvoice));

        PaymentRequest request = new PaymentRequest();
        request.setInvoiceId(10L);
        request.setPaymentDate(LocalDate.now());
        request.setAmount(new BigDecimal("1000.00"));
        request.setPaymentMethod(PaymentMethod.CASH);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            paymentService.recordPayment(request, adminUser);
        });

        assertTrue(ex.getMessage().contains("DRAFT invoice"));
    }

    @Test
    void testRecordPayment_ProformaInvoice_Rejection() {
        taxInvoice.setInvoiceType(InvoiceType.PROFORMA);
        when(invoiceRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(taxInvoice));

        PaymentRequest request = new PaymentRequest();
        request.setInvoiceId(10L);
        request.setPaymentDate(LocalDate.now());
        request.setAmount(new BigDecimal("1000.00"));
        request.setPaymentMethod(PaymentMethod.BANK_TRANSFER);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            paymentService.recordPayment(request, adminUser);
        });

        assertTrue(ex.getMessage().contains("Tax Invoices"));
    }

    @Test
    void testRecordPayment_Overpayment_Rejection() {
        when(invoiceRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(taxInvoice));
        when(paymentRepository.sumActivePaymentsForInvoice(10L)).thenReturn(new BigDecimal("7000.00"));

        PaymentRequest request = new PaymentRequest();
        request.setInvoiceId(10L);
        request.setPaymentDate(LocalDate.now());
        request.setAmount(new BigDecimal("4000.00")); // Remaining is 3000, 4000 > 3000
        request.setPaymentMethod(PaymentMethod.CHEQUE);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            paymentService.recordPayment(request, adminUser);
        });

        assertTrue(ex.getMessage().contains("exceeds remaining balance due"));
    }

    @Test
    void testCancelPayment_Success() {
        Payment payment = new Payment();
        payment.setId(5L);
        payment.setPaymentNumber("ACX/PAY/26-27/0005");
        payment.setInvoice(taxInvoice);
        payment.setAmount(new BigDecimal("5000.00"));
        payment.setStatus(PaymentStatus.RECORDED);

        taxInvoice.setStatus(InvoiceStatus.PARTIALLY_PAID);
        taxInvoice.setAmountPaid(new BigDecimal("5000.00"));
        taxInvoice.setBalanceDue(new BigDecimal("5000.00"));

        when(paymentRepository.findById(5L)).thenReturn(Optional.of(payment));
        when(invoiceRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(taxInvoice));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(paymentRepository.sumActivePaymentsForInvoice(10L)).thenReturn(BigDecimal.ZERO);

        PaymentCancelRequest cancelReq = new PaymentCancelRequest();
        cancelReq.setReason("Entered wrong UTR number");

        Payment cancelled = paymentService.cancelPayment(5L, cancelReq, adminUser);

        assertNotNull(cancelled);
        assertEquals(PaymentStatus.CANCELLED, cancelled.getStatus());
        assertEquals("Entered wrong UTR number", cancelled.getCancellationReason());
        assertNotNull(cancelled.getCancelledAt());

        // Invoice status recalculated back to ISSUED
        assertEquals(InvoiceStatus.ISSUED, taxInvoice.getStatus());
        assertEquals(BigDecimal.ZERO.setScale(2), taxInvoice.getAmountPaid());
        assertEquals(new BigDecimal("10000.00"), taxInvoice.getBalanceDue());
    }

    @Test
    void testCancelPayment_AlreadyCancelled_Rejection() {
        Payment payment = new Payment();
        payment.setId(5L);
        payment.setStatus(PaymentStatus.CANCELLED);

        when(paymentRepository.findById(5L)).thenReturn(Optional.of(payment));

        PaymentCancelRequest cancelReq = new PaymentCancelRequest();
        cancelReq.setReason("Try again");

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            paymentService.cancelPayment(5L, cancelReq, adminUser);
        });

        assertTrue(ex.getMessage().contains("already cancelled"));
    }

    // -------------------------------------------------------------------------
    // Task 2: Transaction Reference Normalization & Validation Tests
    // -------------------------------------------------------------------------

    @Test
    void testNormalizeTransactionReference_NullInput() {
        assertNull(PaymentService.normalizeTransactionReference(null));
    }

    @Test
    void testNormalizeTransactionReference_EmptyAndWhitespace() {
        assertNull(PaymentService.normalizeTransactionReference(""));
        assertNull(PaymentService.normalizeTransactionReference("   "));
        assertNull(PaymentService.normalizeTransactionReference("\t\n"));
    }

    @Test
    void testNormalizeTransactionReference_PlaceholdersConvertToNull() {
        assertNull(PaymentService.normalizeTransactionReference("N/A"));
        assertNull(PaymentService.normalizeTransactionReference("n/a"));
        assertNull(PaymentService.normalizeTransactionReference("NA"));
        assertNull(PaymentService.normalizeTransactionReference("na"));
        assertNull(PaymentService.normalizeTransactionReference("NONE"));
        assertNull(PaymentService.normalizeTransactionReference("None"));
        assertNull(PaymentService.normalizeTransactionReference("NIL"));
        assertNull(PaymentService.normalizeTransactionReference("-"));
        assertNull(PaymentService.normalizeTransactionReference("  -  "));
    }

    @Test
    void testNormalizeTransactionReference_ValidUtrTrimmed() {
        assertEquals("UTR12345678", PaymentService.normalizeTransactionReference("UTR12345678"));
        assertEquals("UTR12345678", PaymentService.normalizeTransactionReference("   UTR12345678   "));
        assertEquals("UPI/987654321/ref", PaymentService.normalizeTransactionReference("  UPI/987654321/ref  "));
    }

    @Test
    void testNormalizeTransactionReference_MaxLengthBoundary() {
        String exact150 = "A".repeat(150);
        assertEquals(exact150, PaymentService.normalizeTransactionReference(exact150));

        String over150 = "A".repeat(151);
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            PaymentService.normalizeTransactionReference(over150);
        });
        assertTrue(ex.getMessage().contains("must not exceed 150 characters"));
    }

    @Test
    void testRecordPayment_NormalizesWhitespaceReferenceToNull() {
        when(invoiceRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(taxInvoice));
        when(paymentRepository.sumActivePaymentsForInvoice(10L)).thenReturn(BigDecimal.ZERO, new BigDecimal("1000.00"));
        when(sequenceGeneratorService.generateNextPaymentNumber(any(LocalDate.class))).thenReturn("ACX/PAY/26-27/0003");
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentRequest request = new PaymentRequest();
        request.setInvoiceId(10L);
        request.setPaymentDate(LocalDate.now());
        request.setAmount(new BigDecimal("1000.00"));
        request.setPaymentMethod(PaymentMethod.CASH);
        request.setTransactionReference("    "); // whitespace only

        Payment payment = paymentService.recordPayment(request, adminUser);

        assertNotNull(payment);
        assertNull(payment.getTransactionReference(), "Whitespace reference must be normalized to null");
    }

    @Test
    void testRecordPayment_NormalizesPlaceholderReferenceToNull() {
        when(invoiceRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(taxInvoice));
        when(paymentRepository.sumActivePaymentsForInvoice(10L)).thenReturn(BigDecimal.ZERO, new BigDecimal("1000.00"));
        when(sequenceGeneratorService.generateNextPaymentNumber(any(LocalDate.class))).thenReturn("ACX/PAY/26-27/0004");
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentRequest request = new PaymentRequest();
        request.setInvoiceId(10L);
        request.setPaymentDate(LocalDate.now());
        request.setAmount(new BigDecimal("1000.00"));
        request.setPaymentMethod(PaymentMethod.CASH);
        request.setTransactionReference("N/A"); // placeholder

        Payment payment = paymentService.recordPayment(request, adminUser);

        assertNotNull(payment);
        assertNull(payment.getTransactionReference(), "Placeholder reference 'N/A' must be normalized to null");
    }

    // -------------------------------------------------------------------------
    // Batch 3.3: Business Rule Uniqueness Tests
    // -------------------------------------------------------------------------

    @Test
    void testRecordPayment_SameBankUtrSplitAcrossTwoInvoices_Allowed() {
        Invoice invoice1 = taxInvoice; // id = 10L
        Invoice invoice2 = new Invoice();
        invoice2.setId(20L);
        invoice2.setInvoiceNumber("ACX/INV/26-27/0002");
        invoice2.setInvoiceType(InvoiceType.TAX_INVOICE);
        invoice2.setStatus(InvoiceStatus.ISSUED);
        invoice2.setCustomer(customer);
        invoice2.setGrandTotal(new BigDecimal("6000.00"));
        invoice2.setAmountPaid(BigDecimal.ZERO);
        invoice2.setBalanceDue(new BigDecimal("6000.00"));

        String splitUtr = "UTR-SPLIT-999999";

        // Invoice 1 payment
        when(invoiceRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(invoice1));
        when(paymentRepository.sumActivePaymentsForInvoice(10L)).thenReturn(BigDecimal.ZERO, new BigDecimal("4000.00"));
        when(sequenceGeneratorService.generateNextPaymentNumber(any(LocalDate.class))).thenReturn("ACX/PAY/26-27/0005");
        when(paymentRepository.existsByInvoiceIdAndTransactionReferenceAndStatus(10L, splitUtr, PaymentStatus.RECORDED)).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentRequest req1 = new PaymentRequest();
        req1.setInvoiceId(10L);
        req1.setPaymentDate(LocalDate.now());
        req1.setAmount(new BigDecimal("4000.00"));
        req1.setPaymentMethod(PaymentMethod.BANK_TRANSFER);
        req1.setTransactionReference(splitUtr);

        Payment p1 = paymentService.recordPayment(req1, adminUser);
        assertNotNull(p1);
        assertEquals(splitUtr, p1.getTransactionReference());

        // Invoice 2 payment with SAME UTR (split payment)
        when(invoiceRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(invoice2));
        when(paymentRepository.sumActivePaymentsForInvoice(20L)).thenReturn(BigDecimal.ZERO, new BigDecimal("6000.00"));
        when(sequenceGeneratorService.generateNextPaymentNumber(any(LocalDate.class))).thenReturn("ACX/PAY/26-27/0006");
        when(paymentRepository.existsByInvoiceIdAndTransactionReferenceAndStatus(20L, splitUtr, PaymentStatus.RECORDED)).thenReturn(false);

        PaymentRequest req2 = new PaymentRequest();
        req2.setInvoiceId(20L);
        req2.setPaymentDate(LocalDate.now());
        req2.setAmount(new BigDecimal("6000.00"));
        req2.setPaymentMethod(PaymentMethod.BANK_TRANSFER);
        req2.setTransactionReference(splitUtr);

        Payment p2 = paymentService.recordPayment(req2, adminUser);
        assertNotNull(p2);
        assertEquals(splitUtr, p2.getTransactionReference());
        assertEquals(invoice2, p2.getInvoice());
    }

    @Test
    void testRecordPayment_DuplicateUtrOnSameInvoice_Rejected() {
        String utr = "UTR-DUP-ON-SAME-INV";
        when(invoiceRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(taxInvoice));
        when(paymentRepository.sumActivePaymentsForInvoice(10L)).thenReturn(BigDecimal.ZERO);
        // Mock that an active payment with this UTR already exists on this invoice
        when(paymentRepository.existsByInvoiceIdAndTransactionReferenceAndStatus(10L, utr, PaymentStatus.RECORDED)).thenReturn(true);

        PaymentRequest request = new PaymentRequest();
        request.setInvoiceId(10L);
        request.setPaymentDate(LocalDate.now());
        request.setAmount(new BigDecimal("2000.00"));
        request.setPaymentMethod(PaymentMethod.BANK_TRANSFER);
        request.setTransactionReference(utr);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            paymentService.recordPayment(request, adminUser);
        });
        assertTrue(ex.getMessage().contains("already recorded for this invoice"));
    }

    @Test
    void testRecordPayment_ReRecordAfterCancellationOnSameInvoice_Allowed() {
        String utr = "UTR-CORRECTED-AFTER-CANCEL";
        when(invoiceRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(taxInvoice));
        when(paymentRepository.sumActivePaymentsForInvoice(10L)).thenReturn(BigDecimal.ZERO, new BigDecimal("3000.00"));
        when(sequenceGeneratorService.generateNextPaymentNumber(any(LocalDate.class))).thenReturn("ACX/PAY/26-27/0007");
        // Because the earlier record was CANCELLED, there is no active RECORDED payment with this UTR on this invoice
        when(paymentRepository.existsByInvoiceIdAndTransactionReferenceAndStatus(10L, utr, PaymentStatus.RECORDED)).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentRequest request = new PaymentRequest();
        request.setInvoiceId(10L);
        request.setPaymentDate(LocalDate.now());
        request.setAmount(new BigDecimal("3000.00"));
        request.setPaymentMethod(PaymentMethod.BANK_TRANSFER);
        request.setTransactionReference(utr);

        Payment payment = paymentService.recordPayment(request, adminUser);
        assertNotNull(payment);
        assertEquals(utr, payment.getTransactionReference());
    }

    @Test
    void testRecordPayment_MultipleCashPaymentsWithNullReferences_Allowed() {
        when(invoiceRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(taxInvoice));
        when(paymentRepository.sumActivePaymentsForInvoice(10L)).thenReturn(BigDecimal.ZERO, new BigDecimal("1000.00"));
        when(sequenceGeneratorService.generateNextPaymentNumber(any(LocalDate.class))).thenReturn("ACX/PAY/26-27/0008");
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        // First cash payment (null reference)
        PaymentRequest req1 = new PaymentRequest();
        req1.setInvoiceId(10L);
        req1.setPaymentDate(LocalDate.now());
        req1.setAmount(new BigDecimal("1000.00"));
        req1.setPaymentMethod(PaymentMethod.CASH);
        req1.setTransactionReference(null);

        Payment p1 = paymentService.recordPayment(req1, adminUser);
        assertNotNull(p1);
        assertNull(p1.getTransactionReference());

        // Second cash payment (whitespace reference normalized to null)
        when(paymentRepository.sumActivePaymentsForInvoice(10L)).thenReturn(new BigDecimal("1000.00"), new BigDecimal("2000.00"));
        when(sequenceGeneratorService.generateNextPaymentNumber(any(LocalDate.class))).thenReturn("ACX/PAY/26-27/0009");

        PaymentRequest req2 = new PaymentRequest();
        req2.setInvoiceId(10L);
        req2.setPaymentDate(LocalDate.now());
        req2.setAmount(new BigDecimal("1000.00"));
        req2.setPaymentMethod(PaymentMethod.CASH);
        req2.setTransactionReference("   ");

        Payment p2 = paymentService.recordPayment(req2, adminUser);
        assertNotNull(p2);
        assertNull(p2.getTransactionReference());

        // existsByInvoiceIdAndTransactionReferenceAndStatus must NEVER be called when reference is null
        verify(paymentRepository, never()).existsByInvoiceIdAndTransactionReferenceAndStatus(anyLong(), any(), any());
    }
}
