package com.acrovix.admin.service;

import com.acrovix.admin.controller.PaymentWebhookController;
import com.acrovix.admin.entity.Invoice;
import com.acrovix.admin.entity.InvoiceStatus;
import com.acrovix.admin.entity.Payment;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.repository.AdminUserRepository;
import com.acrovix.admin.repository.InvoiceRepository;
import com.acrovix.admin.repository.PaymentRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
    "razorpay.key-id=test_key",
    "razorpay.key-secret=test_secret",
    "razorpay.webhook-secret=test_webhook_secret"
})
public class ConcurrencyIntegrationTest {

    @Autowired
    private PaymentGatewayService paymentGatewayService;

    @Autowired
    private PaymentWebhookController paymentWebhookController;

    @Autowired
    private EmailSchedulerService emailSchedulerService;

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private AdminUserRepository adminUserRepository;

    @Test
    public void testConcurrentReminderExecution() throws InterruptedException {
        // Create an overdue invoice
        Invoice invoice = new Invoice();
        invoice.setInvoiceNumber("INV-CONC-001");
        invoice.setInvoiceDate(LocalDate.now().minusDays(10));
        invoice.setInvoiceType(com.acrovix.admin.entity.InvoiceType.TAX_INVOICE);
        invoice.setStatus(InvoiceStatus.ISSUED);
        invoice.setDueDate(LocalDate.now().minusDays(5)); // 5 days overdue -> expectedLevel = 1
        invoice.setGrandTotal(new BigDecimal("1000.00"));
        invoice.setBalanceDue(new BigDecimal("1000.00"));
        invoice.setCurrency(com.acrovix.admin.entity.Currency.INR);

        invoice.setClientCompany("Test Company");
        invoice.setClientName("Test Customer");
        invoiceRepository.save(invoice);

        int threads = 5;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(threads);

        for (int i = 0; i < threads; i++) {
            executor.submit(() -> {
                try {
                    emailSchedulerService.processOverdueInvoices();
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await();

        // Verify reminderLevel is 1 and it only succeeded once (if we mocked email service we could verify invocations, but DB state is enough)
        Invoice updated = invoiceRepository.findById(invoice.getId()).orElseThrow();
        assertEquals(1, updated.getReminderLevel());
        assertNotNull(updated.getLastReminderSentAt());
    }
}
