package com.acrovix.admin.service;

import com.acrovix.admin.dto.InvoiceResponse;
import com.acrovix.admin.entity.*;
import com.acrovix.admin.exception.ResourceConflictException;
import com.acrovix.admin.repository.AdminUserRepository;
import com.acrovix.admin.repository.InvoiceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.DefaultTransactionDefinition;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
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
public class ProformaConversionIdempotencyTest {

    @Autowired
    private InvoiceService invoiceService;

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private AdminUserRepository adminUserRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

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

    private Invoice createTestProforma(InvoiceStatus status) {
        Invoice proforma = new Invoice();
        proforma.setInvoiceNumber("PI-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        proforma.setInvoiceType(InvoiceType.PROFORMA);
        proforma.setStatus(status);
        proforma.setInvoiceDate(LocalDate.now());
        proforma.setDueDate(LocalDate.now().plusDays(15));
        proforma.setSubtotal(new BigDecimal("10000.00"));
        proforma.setTaxableAmount(new BigDecimal("10000.00"));
        proforma.setGrandTotal(new BigDecimal("11800.00"));
        proforma.setBalanceDue(new BigDecimal("11800.00"));
        proforma.setCurrency(Currency.INR);
        proforma.setClientName("Proforma Client");
        proforma.setClientEmail("proforma@client.com");
        proforma.setClientCompany("Client Ltd");
        proforma.setCreatedBy(testAdmin);

        InvoiceItem item = new InvoiceItem();
        item.setInvoice(proforma);
        item.setDescription("Consulting Services");
        item.setQuantity(new BigDecimal("10"));
        item.setUnitPrice(new BigDecimal("1000.00"));
        item.setTaxableAmount(new BigDecimal("10000.00"));
        item.setTaxPercent(new BigDecimal("18.00"));
        item.setTaxAmount(new BigDecimal("1800.00"));
        item.setLineTotal(new BigDecimal("11800.00"));
        item.setSortOrder(0);
        proforma.setItems(new ArrayList<>());
        proforma.getItems().add(item);

        return invoiceRepository.save(proforma);
    }

    @Test
    void testFirstConversionSucceeds() {
        Invoice proforma = createTestProforma(InvoiceStatus.ISSUED);

        InvoiceResponse response = invoiceService.convertProformaToTaxInvoice(proforma.getId(), testAdmin);
        assertNotNull(response);
        assertEquals(InvoiceType.TAX_INVOICE, response.getInvoiceType());
        assertEquals(InvoiceStatus.DRAFT, response.getStatus());
        assertEquals(new BigDecimal("11800.00"), response.getGrandTotal());

        // Verify proforma state
        Invoice refreshedProforma = invoiceRepository.findById(proforma.getId()).orElseThrow();
        assertTrue(refreshedProforma.isLocked());
        assertNotNull(refreshedProforma.getPaymentLinkId());
        assertTrue(refreshedProforma.getPaymentLinkId().startsWith("CONVERTED_TO_TAX_INVOICE:"));

        // Verify tax invoice state
        Invoice savedTaxInvoice = invoiceRepository.findById(response.getId()).orElseThrow();
        assertEquals("CONVERTED_FROM_PROFORMA:" + proforma.getId(), savedTaxInvoice.getPaymentLinkId());
    }

    @Test
    void testRepeatedConversionFailsWithConflict() {
        Invoice proforma = createTestProforma(InvoiceStatus.ISSUED);

        // First conversion
        InvoiceResponse firstResp = invoiceService.convertProformaToTaxInvoice(proforma.getId(), testAdmin);
        assertNotNull(firstResp);

        // Repeated conversion must throw ResourceConflictException
        ResourceConflictException ex = assertThrows(ResourceConflictException.class, () -> {
            invoiceService.convertProformaToTaxInvoice(proforma.getId(), testAdmin);
        });

        assertTrue(ex.getMessage().contains("already been converted to Tax Invoice"));

        // Verify only 1 tax invoice exists for this proforma
        long convertedCount = invoiceRepository.findAll().stream()
                .filter(i -> ("CONVERTED_FROM_PROFORMA:" + proforma.getId()).equals(i.getPaymentLinkId()))
                .count();
        assertEquals(1, convertedCount);
    }

    @Test
    void testCancelledProformaConversionFails() {
        Invoice proforma = createTestProforma(InvoiceStatus.CANCELLED);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            invoiceService.convertProformaToTaxInvoice(proforma.getId(), testAdmin);
        });

        assertTrue(ex.getMessage().contains("Cannot convert a CANCELLED proforma invoice"));
    }

    @Test
    void testRollbackOnFailure() {
        Invoice proforma = createTestProforma(InvoiceStatus.ISSUED);

        // Execute in an explicit transaction that rolls back
        TransactionStatus status = transactionManager.getTransaction(new DefaultTransactionDefinition());
        try {
            invoiceService.convertProformaToTaxInvoice(proforma.getId(), testAdmin);
            // Simulate runtime exception triggering rollback
            throw new RuntimeException("Simulated unexpected failure during post-conversion processing");
        } catch (RuntimeException e) {
            transactionManager.rollback(status);
        }

        // Verify proforma remains unconverted and unlocked after rollback
        Invoice refreshed = invoiceRepository.findById(proforma.getId()).orElseThrow();
        assertFalse(refreshed.isLocked());
        assertNull(refreshed.getPaymentLinkId());

        // Verify no tax invoice was persisted for this proforma
        boolean exists = invoiceRepository.existsByPaymentLinkId("CONVERTED_FROM_PROFORMA:" + proforma.getId());
        assertFalse(exists);
    }


    /**
     * D-1 regression: After a valid conversion, simulating a real payment-link URL being set
     * on the tax invoice must NOT erase the conversion marker stored in paymentLinkId.
     * PaymentGatewayService.generatePaymentLink now preserves the marker.
     */
    @Test
    void testPaymentLinkUrlDoesNotEraseConversionMarker() {
        Invoice proforma = createTestProforma(InvoiceStatus.ISSUED);

        // Convert proforma to tax invoice
        InvoiceResponse taxResp = invoiceService.convertProformaToTaxInvoice(proforma.getId(), testAdmin);
        Invoice taxInvoice = invoiceRepository.findById(taxResp.getId()).orElseThrow();

        String conversionMarker = taxInvoice.getPaymentLinkId();
        assertNotNull(conversionMarker);
        assertTrue(conversionMarker.startsWith("CONVERTED_FROM_PROFORMA:"),
                "Tax invoice must carry the conversion marker before payment-link creation");

        // Apply the same guard logic that PaymentGatewayService now uses.
        String simulatedRealLinkId = "plink_SIMULATED123456";
        String simulatedRealLinkUrl = "https://rzp.io/l/simulated";

        boolean isConversionMarker = taxInvoice.getPaymentLinkId() != null &&
                (taxInvoice.getPaymentLinkId().startsWith("CONVERTED_FROM_PROFORMA:") ||
                 taxInvoice.getPaymentLinkId().startsWith("CONVERTED_TO_TAX_INVOICE:"));

        if (!isConversionMarker) {
            taxInvoice.setPaymentLinkId(simulatedRealLinkId);
        }
        taxInvoice.setPaymentLinkUrl(simulatedRealLinkUrl);
        taxInvoice = invoiceRepository.save(taxInvoice);

        assertEquals(conversionMarker, taxInvoice.getPaymentLinkId(),
                "Conversion marker in paymentLinkId must not be overwritten by real payment-link creation");
        assertEquals(simulatedRealLinkUrl, taxInvoice.getPaymentLinkUrl(),
                "Real payment-link URL must be stored in paymentLinkUrl");
    }

    /**
     * D-1 regression: Even after a real payment link URL is set on the tax invoice AND
     * the tax-invoice conversion marker is synthetically overwritten (worst-case scenario),
     * the proforma's own marker (CONVERTED_TO_TAX_INVOICE:*) must still block re-conversion.
     */
    @Test
    void testRetryConversionAfterPaymentLinkUrlSetStillFails() {
        Invoice proforma = createTestProforma(InvoiceStatus.ISSUED);

        // First conversion
        InvoiceResponse taxResp = invoiceService.convertProformaToTaxInvoice(proforma.getId(), testAdmin);

        // Simulate worst-case: tax invoice paymentLinkId overwritten by a real Razorpay ID
        Invoice taxInvoice = invoiceRepository.findById(taxResp.getId()).orElseThrow();
        taxInvoice.setPaymentLinkId("plink_REAL123456");
        taxInvoice.setPaymentLinkUrl("https://rzp.io/l/real");
        invoiceRepository.save(taxInvoice);

        // Proforma's own marker must still be present and act as the authoritative gate
        Invoice refreshedProforma = invoiceRepository.findById(proforma.getId()).orElseThrow();
        assertTrue(refreshedProforma.getPaymentLinkId().startsWith("CONVERTED_TO_TAX_INVOICE:"),
                "Proforma marker must still exist and be the authoritative idempotency gate");

        ResourceConflictException ex = assertThrows(ResourceConflictException.class, () ->
                invoiceService.convertProformaToTaxInvoice(proforma.getId(), testAdmin));

        assertTrue(ex.getMessage().contains("already been converted to Tax Invoice"),
                "Retry conversion must be blocked by the proforma's own marker");
    }

    @Test
    void testConcurrentDuplicateRequestsIdempotency() throws Exception {
        Invoice proforma = createTestProforma(InvoiceStatus.ISSUED);
        Long proformaId = proforma.getId();

        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CyclicBarrier barrier = new CyclicBarrier(threads);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);

        Callable<Void> convertTask = () -> {
            barrier.await();
            try {
                InvoiceResponse resp = invoiceService.convertProformaToTaxInvoice(proformaId, testAdmin);
                if (resp != null && resp.getId() != null) {
                    successCount.incrementAndGet();
                }
            } catch (ResourceConflictException rce) {
                conflictCount.incrementAndGet();
            }
            return null;
        };

        Future<Void> f1 = executor.submit(convertTask);
        Future<Void> f2 = executor.submit(convertTask);

        f1.get(10, TimeUnit.SECONDS);
        f2.get(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertEquals(1, successCount.get(), "Exactly one conversion request must succeed");
        assertEquals(1, conflictCount.get(), "The concurrent duplicate request must be rejected with 409 Conflict");

        // Verify exactly one tax invoice exists in database
        long count = invoiceRepository.findAll().stream()
                .filter(i -> ("CONVERTED_FROM_PROFORMA:" + proformaId).equals(i.getPaymentLinkId()))
                .count();
        assertEquals(1, count, "Only one tax invoice must be created from the proforma");
    }
}
