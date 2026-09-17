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
}
