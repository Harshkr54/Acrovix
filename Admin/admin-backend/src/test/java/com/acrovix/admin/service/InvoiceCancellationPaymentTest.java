package com.acrovix.admin.service;

import com.acrovix.admin.dto.InvoiceResponse;
import com.acrovix.admin.dto.PaymentCancelRequest;
import com.acrovix.admin.dto.PaymentRequest;
import com.acrovix.admin.entity.*;
import com.acrovix.admin.repository.AdminUserRepository;
import com.acrovix.admin.repository.InvoiceRepository;
import com.acrovix.admin.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
    "razorpay.key-id=test_key",
    "razorpay.key-secret=test_secret",
    "razorpay.webhook-secret=test_webhook_secret",
    "app.demo-mode=true"
})
public class InvoiceCancellationPaymentTest {

    @Autowired
    private InvoiceService invoiceService;

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private AdminUserRepository adminUserRepository;

    private AdminUser testAdmin;

    @BeforeEach
    void setUp() {
        testAdmin = adminUserRepository.findAll().stream().findFirst().orElseGet(() -> {
            AdminUser admin = AdminUser.builder()
                    .name("Super Admin")
                    .email("admin_" + UUID.randomUUID() + "@acrovix.com")
                    .password("secret")
                    .role(Role.SUPER_ADMIN)
                    .enabled(true)
                    .build();
            return adminUserRepository.save(admin);
        });
    }

    private Invoice createTestInvoice(InvoiceStatus status, BigDecimal grandTotal) {
        Invoice invoice = new Invoice();
        invoice.setInvoiceNumber("INV-CANC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        invoice.setInvoiceType(InvoiceType.TAX_INVOICE);
        invoice.setStatus(status);
        invoice.setInvoiceDate(LocalDate.now());
        invoice.setGrandTotal(grandTotal);
        invoice.setBalanceDue(grandTotal);
        invoice.setAmountPaid(BigDecimal.ZERO);
        invoice.setCurrency(Currency.INR);
        invoice.setCreatedBy(testAdmin);
        invoice.setClientName("Test Client");
        invoice.setClientEmail("client@test.com");
        return invoiceRepository.save(invoice);
    }

    @Test
    void testCancelUnpaidInvoiceSucceeds() {
        Invoice invoice = createTestInvoice(InvoiceStatus.ISSUED, new BigDecimal("10000.00"));

        InvoiceResponse response = invoiceService.cancelInvoice(invoice.getId(), testAdmin);
        assertEquals(InvoiceStatus.CANCELLED, response.getStatus());

        Invoice refreshed = invoiceRepository.findById(invoice.getId()).orElseThrow();
        assertEquals(InvoiceStatus.CANCELLED, refreshed.getStatus());
        assertNotNull(refreshed.getCancelledAt());
    }

    @Test
    void testCancelInvoiceWithPartialPaymentFails() {
        Invoice invoice = createTestInvoice(InvoiceStatus.ISSUED, new BigDecimal("10000.00"));

        // Record a partial payment
        PaymentRequest pReq = new PaymentRequest();
        pReq.setInvoiceId(invoice.getId());
        pReq.setAmount(new BigDecimal("3000.00"));
        pReq.setPaymentDate(LocalDate.now());
        pReq.setPaymentMethod(PaymentMethod.BANK_TRANSFER);
        pReq.setTransactionReference("TXN-" + UUID.randomUUID().toString().substring(0, 8));
        paymentService.recordPayment(pReq, testAdmin);

        // Attempt cancellation must fail with IllegalStateException
        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            invoiceService.cancelInvoice(invoice.getId(), testAdmin);
        });

        assertTrue(ex.getMessage().contains("active recorded payment"));

        Invoice refreshed = invoiceRepository.findById(invoice.getId()).orElseThrow();
        assertNotEquals(InvoiceStatus.CANCELLED, refreshed.getStatus());
    }

    @Test
    void testCancelInvoiceWithFullPaymentFails() {
        Invoice invoice = createTestInvoice(InvoiceStatus.ISSUED, new BigDecimal("5000.00"));

        // Record full payment
        PaymentRequest pReq = new PaymentRequest();
        pReq.setInvoiceId(invoice.getId());
        pReq.setAmount(new BigDecimal("5000.00"));
        pReq.setPaymentDate(LocalDate.now());
        pReq.setPaymentMethod(PaymentMethod.UPI);
        pReq.setTransactionReference("TXN-" + UUID.randomUUID().toString().substring(0, 8));
        paymentService.recordPayment(pReq, testAdmin);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            invoiceService.cancelInvoice(invoice.getId(), testAdmin);
        });

        assertTrue(ex.getMessage().contains("active recorded payment"));

        Invoice refreshed = invoiceRepository.findById(invoice.getId()).orElseThrow();
        assertEquals(InvoiceStatus.PAID, refreshed.getStatus());
    }

    @Test
    void testCancelInvoiceAfterAllPaymentsVoidedOrCancelledSucceeds() {
        Invoice invoice = createTestInvoice(InvoiceStatus.ISSUED, new BigDecimal("8000.00"));

        PaymentRequest pReq = new PaymentRequest();
        pReq.setInvoiceId(invoice.getId());
        pReq.setAmount(new BigDecimal("4000.00"));
        pReq.setPaymentDate(LocalDate.now());
        pReq.setPaymentMethod(PaymentMethod.BANK_TRANSFER);
        pReq.setTransactionReference("TXN-" + UUID.randomUUID().toString().substring(0, 8));
        Payment payment = paymentService.recordPayment(pReq, testAdmin);

        // Cancel the recorded payment
        PaymentCancelRequest cReq = new PaymentCancelRequest();
        cReq.setReason("Customer requested refund / reversal");
        paymentService.cancelPayment(payment.getId(), cReq, testAdmin);

        // Verify payment is CANCELLED and not deleted
        Payment refreshedPayment = paymentRepository.findById(payment.getId()).orElseThrow();
        assertEquals(PaymentStatus.CANCELLED, refreshedPayment.getStatus());
        assertEquals("Customer requested refund / reversal", refreshedPayment.getCancellationReason());

        // Now cancel invoice must succeed since no active payments remain
        InvoiceResponse response = invoiceService.cancelInvoice(invoice.getId(), testAdmin);
        assertEquals(InvoiceStatus.CANCELLED, response.getStatus());

        // Verify payment still exists in historical ledger
        Payment historical = paymentRepository.findById(payment.getId()).orElseThrow();
        assertNotNull(historical);
        assertEquals(invoice.getId(), historical.getInvoice().getId());
    }

    @Test
    void testCancelInvoiceWithMultiplePaymentsHavingActivePaymentFails() {
        Invoice invoice = createTestInvoice(InvoiceStatus.ISSUED, new BigDecimal("12000.00"));

        // Payment 1
        PaymentRequest pReq1 = new PaymentRequest();
        pReq1.setInvoiceId(invoice.getId());
        pReq1.setAmount(new BigDecimal("4000.00"));
        pReq1.setPaymentDate(LocalDate.now());
        pReq1.setPaymentMethod(PaymentMethod.BANK_TRANSFER);
        pReq1.setTransactionReference("TXN-" + UUID.randomUUID().toString().substring(0, 8));
        Payment p1 = paymentService.recordPayment(pReq1, testAdmin);

        // Payment 2
        PaymentRequest pReq2 = new PaymentRequest();
        pReq2.setInvoiceId(invoice.getId());
        pReq2.setAmount(new BigDecimal("2000.00"));
        pReq2.setPaymentDate(LocalDate.now());
        pReq2.setPaymentMethod(PaymentMethod.UPI);
        pReq2.setTransactionReference("TXN-" + UUID.randomUUID().toString().substring(0, 8));
        paymentService.recordPayment(pReq2, testAdmin);

        // Cancel only Payment 1
        PaymentCancelRequest cReq = new PaymentCancelRequest();
        cReq.setReason("Void first payment");
        paymentService.cancelPayment(p1.getId(), cReq, testAdmin);

        // Payment 2 is still active -> invoice cancellation must be rejected
        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            invoiceService.cancelInvoice(invoice.getId(), testAdmin);
        });

        assertTrue(ex.getMessage().contains("active recorded payment"));
    }

    @Test
    void testConcurrentPaymentAndCancellationIntegrity() throws Exception {
        Invoice invoice = createTestInvoice(InvoiceStatus.ISSUED, new BigDecimal("10000.00"));
        Long invoiceId = invoice.getId();

        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CyclicBarrier barrier = new CyclicBarrier(threads);
        AtomicInteger paymentSucceeded = new AtomicInteger(0);
        AtomicInteger cancelSucceeded = new AtomicInteger(0);

        Callable<Void> paymentTask = () -> {
            barrier.await();
            try {
                PaymentRequest pReq = new PaymentRequest();
                pReq.setInvoiceId(invoiceId);
                pReq.setAmount(new BigDecimal("5000.00"));
                pReq.setPaymentDate(LocalDate.now());
                pReq.setPaymentMethod(PaymentMethod.BANK_TRANSFER);
                pReq.setTransactionReference("TXN-" + UUID.randomUUID().toString().substring(0, 8));
                paymentService.recordPayment(pReq, testAdmin);
                paymentSucceeded.incrementAndGet();
            } catch (Exception ignored) {
            }
            return null;
        };

        Callable<Void> cancelTask = () -> {
            barrier.await();
            try {
                invoiceService.cancelInvoice(invoiceId, testAdmin);
                cancelSucceeded.incrementAndGet();
            } catch (Exception ignored) {
            }
            return null;
        };

        Future<Void> f1 = executor.submit(paymentTask);
        Future<Void> f2 = executor.submit(cancelTask);

        f1.get(10, TimeUnit.SECONDS);
        f2.get(10, TimeUnit.SECONDS);
        executor.shutdown();

        // Exactly one of the two must succeed; they cannot both succeed concurrently
        assertTrue((paymentSucceeded.get() == 1 && cancelSucceeded.get() == 0) ||
                   (paymentSucceeded.get() == 0 && cancelSucceeded.get() == 1),
                   "Either payment succeeds and cancel fails, OR cancel succeeds and payment fails; both cannot succeed");

        Invoice refreshed = invoiceRepository.findById(invoiceId).orElseThrow();
        if (paymentSucceeded.get() == 1) {
            assertEquals(InvoiceStatus.PARTIALLY_PAID, refreshed.getStatus());
            assertFalse(paymentRepository.findByInvoiceIdOrderByCreatedAtDesc(invoiceId).isEmpty());
        } else {
            assertEquals(InvoiceStatus.CANCELLED, refreshed.getStatus());
            assertTrue(paymentRepository.findByInvoiceIdOrderByCreatedAtDesc(invoiceId).isEmpty());
        }
    }
}
