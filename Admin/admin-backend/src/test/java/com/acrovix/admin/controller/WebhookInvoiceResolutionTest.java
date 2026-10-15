package com.acrovix.admin.controller;

import com.acrovix.admin.entity.*;
import com.acrovix.admin.repository.AdminUserRepository;
import com.acrovix.admin.repository.InvoiceRepository;
import com.acrovix.admin.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * D-2 and D-3 targeted tests:
 * - D-2: findByInvoiceNumber replaces findAll() stream scan in webhook controller.
 * - D-3: Sequential duplicate webhook delivery is idempotent; unique constraint enforced by DB (H2).
 */
@SpringBootTest
@AutoConfigureMockMvc
class WebhookInvoiceResolutionTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private AdminUserRepository adminUserRepository;

    @Value("${razorpay.webhook-secret:test_dummy_secret_12345}")
    private String webhookSecret;

    private AdminUser testAdmin;
    private Invoice testInvoice;

    @BeforeEach
    void setUp() {
        testAdmin = adminUserRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.SUPER_ADMIN)
                .findFirst()
                .orElseGet(() -> {
                    AdminUser admin = AdminUser.builder()
                            .name("Webhook Test Admin")
                            .email("webhook_admin_" + UUID.randomUUID() + "@acrovix.com")
                            .password("secret")
                            .role(Role.SUPER_ADMIN)
                            .enabled(true)
                            .build();
                    return adminUserRepository.save(admin);
                });

        // Create an issued tax invoice that can receive a payment webhook
        testInvoice = new Invoice();
        testInvoice.setInvoiceNumber("INV-2026-WHK-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        testInvoice.setInvoiceType(InvoiceType.TAX_INVOICE);
        testInvoice.setStatus(InvoiceStatus.ISSUED);
        testInvoice.setLocked(true);
        testInvoice.setInvoiceDate(LocalDate.now());
        testInvoice.setGrandTotal(new BigDecimal("5000.00"));
        testInvoice.setBalanceDue(new BigDecimal("5000.00"));
        testInvoice.setAmountPaid(BigDecimal.ZERO);
        testInvoice.setCurrency(Currency.INR);
        testInvoice.setClientName("Webhook Test Client");
        testInvoice.setCreatedBy(testAdmin);
        testInvoice = invoiceRepository.save(testInvoice);
    }

    // -------------------------------------------------------------------------
    // D-2: findByInvoiceNumber lookup
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("D-2: findByInvoiceNumber returns the correct invoice")
    void testFindByInvoiceNumberReturnsCorrectInvoice() {
        Optional<Invoice> found = invoiceRepository.findByInvoiceNumber(testInvoice.getInvoiceNumber());
        assertTrue(found.isPresent(), "Invoice must be found by invoice number");
        assertEquals(testInvoice.getId(), found.get().getId());
    }

    @Test
    @DisplayName("D-2: findByInvoiceNumber returns empty for unknown reference")
    void testFindByInvoiceNumberReturnsEmptyForUnknown() {
        Optional<Invoice> found = invoiceRepository.findByInvoiceNumber("INV-UNKNOWN-00000");
        assertTrue(found.isEmpty(), "Non-existent invoice number must return empty");
    }

    @Test
    @DisplayName("D-2: findByInvoiceNumber does not match conversion markers")
    void testFindByInvoiceNumberDoesNotMatchConversionMarker() {
        // A conversion marker stored in paymentLinkId looks like "CONVERTED_FROM_PROFORMA:123".
        // findByInvoiceNumber must NOT return such an invoice (it matches invoiceNumber, not paymentLinkId).
        Invoice proformaWithMarker = new Invoice();
        proformaWithMarker.setInvoiceNumber("PI-2026-MKR-001");
        proformaWithMarker.setInvoiceType(InvoiceType.PROFORMA);
        proformaWithMarker.setStatus(InvoiceStatus.ISSUED);
        proformaWithMarker.setLocked(true);
        proformaWithMarker.setInvoiceDate(LocalDate.now());
        proformaWithMarker.setGrandTotal(BigDecimal.ZERO);
        proformaWithMarker.setBalanceDue(BigDecimal.ZERO);
        proformaWithMarker.setCurrency(Currency.INR);
        proformaWithMarker.setClientName("Marker Test");
        proformaWithMarker.setPaymentLinkId("CONVERTED_TO_TAX_INVOICE:42");
        proformaWithMarker.setCreatedBy(testAdmin);
        invoiceRepository.save(proformaWithMarker);

        // Webhook resolution by the marker value must find nothing
        Optional<Invoice> found = invoiceRepository.findByInvoiceNumber("CONVERTED_TO_TAX_INVOICE:42");
        assertTrue(found.isEmpty(), "Conversion marker must not be returned by findByInvoiceNumber");
    }

    @Test
    @DisplayName("D-2: Valid payment webhook with known invoice number completes without error")
    void testValidWebhookWithKnownInvoiceNumber() throws Exception {
        // Build a payment.captured payload referencing the test invoice number
        String invoiceNumber = testInvoice.getInvoiceNumber();
        String paymentId = "pay_WHKTEST_" + UUID.randomUUID().toString().substring(0, 8);
        String payload = "{"
                + "\"event\":\"payment.captured\","
                + "\"payload\":{"
                + "  \"payment\":{"
                + "    \"entity\":{"
                + "      \"id\":\"" + paymentId + "\","
                + "      \"amount\":500000,"
                + "      \"notes\":{\"reference_id\":\"" + invoiceNumber + "\"},"
                + "      \"description\":\"Payment for Invoice " + invoiceNumber + "\""
                + "    }"
                + "  }"
                + "}}";

        String sig = hmacSha256(payload, webhookSecret);

        mockMvc.perform(post("/api/webhooks/razorpay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload)
                        .header("X-Razorpay-Signature", sig))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("D-2: Webhook with unknown invoice number returns 200 with 'Invoice not found'")
    void testWebhookWithUnknownInvoiceNumberReturns200() throws Exception {
        String payload = "{"
                + "\"event\":\"payment.captured\","
                + "\"payload\":{"
                + "  \"payment\":{"
                + "    \"entity\":{"
                + "      \"id\":\"pay_UNKNOWN_999\","
                + "      \"amount\":100000,"
                + "      \"notes\":{\"reference_id\":\"INV-DOES-NOT-EXIST\"},"
                + "      \"description\":\"Payment for Invoice INV-DOES-NOT-EXIST\""
                + "    }"
                + "  }"
                + "}}";

        String sig = hmacSha256(payload, webhookSecret);

        mockMvc.perform(post("/api/webhooks/razorpay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload)
                        .header("X-Razorpay-Signature", sig))
                .andExpect(status().isOk())
                .andExpect(content().string("Invoice not found"));
    }

    // -------------------------------------------------------------------------
    // Batch 3.3: Business Rule & Repository Uniqueness Tests
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("Batch 3.3: Same bank UTR split across two distinct invoices is allowed in database")
    void testSameBankUtrSplitAcrossTwoInvoicesAllowedInRepository() {
        String sharedUtr = "UTR-SPLIT-INT-" + UUID.randomUUID().toString().substring(0, 8);

        // Second invoice for split payment
        Invoice secondInvoice = new Invoice();
        secondInvoice.setInvoiceNumber("INV-2026-WHK-SPLIT-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        secondInvoice.setInvoiceType(InvoiceType.TAX_INVOICE);
        secondInvoice.setStatus(InvoiceStatus.ISSUED);
        secondInvoice.setLocked(true);
        secondInvoice.setInvoiceDate(LocalDate.now());
        secondInvoice.setGrandTotal(new BigDecimal("3000.00"));
        secondInvoice.setBalanceDue(new BigDecimal("3000.00"));
        secondInvoice.setAmountPaid(BigDecimal.ZERO);
        secondInvoice.setCurrency(Currency.INR);
        secondInvoice.setClientName("Split Client");
        secondInvoice.setCreatedBy(testAdmin);
        secondInvoice = invoiceRepository.save(secondInvoice);

        Payment p1 = new Payment();
        p1.setPaymentNumber("PAY-SPLIT-001-" + UUID.randomUUID().toString().substring(0, 8));
        p1.setInvoice(testInvoice);
        p1.setPaymentDate(LocalDate.now());
        p1.setAmount(new BigDecimal("2000.00"));
        p1.setPaymentMethod(PaymentMethod.BANK_TRANSFER);
        p1.setTransactionReference(sharedUtr);
        p1.setStatus(PaymentStatus.RECORDED);
        p1.setRecordedBy(testAdmin);
        paymentRepository.saveAndFlush(p1);

        Payment p2 = new Payment();
        p2.setPaymentNumber("PAY-SPLIT-002-" + UUID.randomUUID().toString().substring(0, 8));
        p2.setInvoice(secondInvoice);
        p2.setPaymentDate(LocalDate.now());
        p2.setAmount(new BigDecimal("3000.00"));
        p2.setPaymentMethod(PaymentMethod.BANK_TRANSFER);
        p2.setTransactionReference(sharedUtr); // same UTR on different invoice
        p2.setStatus(PaymentStatus.RECORDED);
        p2.setRecordedBy(testAdmin);

        // Must succeed without throwing DataIntegrityViolationException
        assertDoesNotThrow(() -> paymentRepository.saveAndFlush(p2),
                "Split payments across different invoices with the same UTR must be allowed");
    }

    @Test
    @DisplayName("Batch 3.3: Re-recording a transaction reference on same invoice after cancellation is allowed in database")
    void testReRecordUtrAfterCancellationAllowedInRepository() {
        String utr = "UTR-CANCEL-RERECORD-" + UUID.randomUUID().toString().substring(0, 8);

        Payment p1 = new Payment();
        p1.setPaymentNumber("PAY-CAN-001-" + UUID.randomUUID().toString().substring(0, 8));
        p1.setInvoice(testInvoice);
        p1.setPaymentDate(LocalDate.now());
        p1.setAmount(new BigDecimal("1500.00"));
        p1.setPaymentMethod(PaymentMethod.BANK_TRANSFER);
        p1.setTransactionReference(utr);
        p1.setStatus(PaymentStatus.RECORDED);
        p1.setRecordedBy(testAdmin);
        paymentRepository.saveAndFlush(p1);

        // Cancel first payment
        p1.setStatus(PaymentStatus.CANCELLED);
        p1.setCancelledAt(java.time.LocalDateTime.now());
        p1.setCancellationReason("Entered wrong amount");
        paymentRepository.saveAndFlush(p1);

        // Re-record corrected payment with same UTR
        Payment p2 = new Payment();
        p2.setPaymentNumber("PAY-CAN-002-" + UUID.randomUUID().toString().substring(0, 8));
        p2.setInvoice(testInvoice);
        p2.setPaymentDate(LocalDate.now());
        p2.setAmount(new BigDecimal("2500.00")); // corrected amount
        p2.setPaymentMethod(PaymentMethod.BANK_TRANSFER);
        p2.setTransactionReference(utr);
        p2.setStatus(PaymentStatus.RECORDED);
        p2.setRecordedBy(testAdmin);

        // Must succeed without throwing DataIntegrityViolationException
        assertDoesNotThrow(() -> paymentRepository.saveAndFlush(p2),
                "Re-recording a transaction reference after previous record was cancelled must be allowed");
    }

    @Test
    @DisplayName("D-3: Sequential duplicate webhook delivery is idempotent (existsByTransactionReference guard)")
    void testSequentialDuplicateWebhookIsIdempotent() throws Exception {
        String invoiceNumber = testInvoice.getInvoiceNumber();
        String paymentId = "pay_SEQ_DUP_" + UUID.randomUUID().toString().substring(0, 8);
        String payload = "{"
                + "\"event\":\"payment.captured\","
                + "\"payload\":{"
                + "  \"payment\":{"
                + "    \"entity\":{"
                + "      \"id\":\"" + paymentId + "\","
                + "      \"amount\":500000,"
                + "      \"notes\":{\"reference_id\":\"" + invoiceNumber + "\"},"
                + "      \"description\":\"Payment for Invoice " + invoiceNumber + "\""
                + "    }"
                + "  }"
                + "}}";

        String sig = hmacSha256(payload, webhookSecret);

        // First delivery: must succeed (200)
        mockMvc.perform(post("/api/webhooks/razorpay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload)
                        .header("X-Razorpay-Signature", sig))
                .andExpect(status().isOk());

        // Second identical delivery: must return 200 "Already processed" (idempotent)
        mockMvc.perform(post("/api/webhooks/razorpay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload)
                        .header("X-Razorpay-Signature", sig))
                .andExpect(status().isOk())
                .andExpect(content().string("Already processed"));

        // Verify exactly one payment was recorded
        long paymentCount = paymentRepository.findAll().stream()
                .filter(p -> paymentId.equals(p.getTransactionReference()))
                .count();
        assertEquals(1, paymentCount, "Exactly one payment must be recorded for a duplicate webhook delivery");
    }

    @Test
    @DisplayName("D-3: Null transaction_reference values do not trigger unique constraint (SQL standard)")
    void testNullTransactionReferenceDoesNotViolateUniqueConstraint() {
        Payment p1 = new Payment();
        p1.setPaymentNumber("PAY-NULL-" + UUID.randomUUID().toString().substring(0, 8));
        p1.setInvoice(testInvoice);
        p1.setPaymentDate(LocalDate.now());
        p1.setAmount(new BigDecimal("500.00"));
        p1.setPaymentMethod(PaymentMethod.CASH);
        p1.setTransactionReference(null); // null is exempt from UNIQUE constraint
        p1.setStatus(PaymentStatus.RECORDED);
        p1.setRecordedBy(testAdmin);

        Payment p2 = new Payment();
        p2.setPaymentNumber("PAY-NULL-" + UUID.randomUUID().toString().substring(0, 8));
        p2.setInvoice(testInvoice);
        p2.setPaymentDate(LocalDate.now());
        p2.setAmount(new BigDecimal("500.00"));
        p2.setPaymentMethod(PaymentMethod.CASH);
        p2.setTransactionReference(null); // second null — must NOT violate
        p2.setStatus(PaymentStatus.RECORDED);
        p2.setRecordedBy(testAdmin);

        // Both must save without error (SQL NULL != NULL in UNIQUE constraint)
        assertDoesNotThrow(() -> {
            paymentRepository.saveAndFlush(p1);
            paymentRepository.saveAndFlush(p2);
        }, "Multiple NULL transaction_reference values must not violate the unique constraint");
    }

    // -------------------------------------------------------------------------
    // Batch 3.2: Webhook Hardening & Idempotency Tests
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("Batch 3.2: Missing signature header returns 400 Bad Request")
    void testMissingSignatureReturnsBadRequest() throws Exception {
        String payload = "{\"event\":\"payment.captured\"}";
        mockMvc.perform(post("/api/webhooks/razorpay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Missing signature"));
    }

    @Test
    @DisplayName("Batch 3.2: Invalid signature returns 400 Bad Request")
    void testInvalidSignatureReturnsBadRequest() throws Exception {
        String payload = "{\"event\":\"payment.captured\"}";
        mockMvc.perform(post("/api/webhooks/razorpay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload)
                        .header("X-Razorpay-Signature", "invalid_hex_signature"))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Invalid signature"));
    }

    @Test
    @DisplayName("Batch 3.2: Missing payment ID and missing event ID rejects with 400 Bad Request")
    void testMissingPaymentIdAndEventIdReturnsBadRequest() throws Exception {
        String invoiceNumber = testInvoice.getInvoiceNumber();
        // Payload has no payment id, and no event id
        String payload = "{"
                + "\"event\":\"payment.captured\","
                + "\"payload\":{"
                + "  \"payment\":{"
                + "    \"entity\":{"
                + "      \"amount\":100000,"
                + "      \"notes\":{\"reference_id\":\"" + invoiceNumber + "\"}"
                + "    }"
                + "  }"
                + "}}";

        String sig = hmacSha256(payload, webhookSecret);

        mockMvc.perform(post("/api/webhooks/razorpay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload)
                        .header("X-Razorpay-Signature", sig))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Missing payment identifier"));

        // Verify no payment was recorded and invoice amountPaid remains 0
        Invoice refreshed = invoiceRepository.findById(testInvoice.getId()).orElseThrow();
        assertEquals(BigDecimal.ZERO.setScale(2), refreshed.getAmountPaid().setScale(2));
    }

    @Test
    @DisplayName("Batch 3.3: Webhook with event ID header but missing payment ID rejects with 400 (event ID is not monetary ref)")
    void testMissingPaymentIdWithEventIdHeaderRejectedSafely() throws Exception {
        String invoiceNumber = testInvoice.getInvoiceNumber();
        String eventId = "evt_HDR_" + UUID.randomUUID().toString().substring(0, 8);
        String payload = "{"
                + "\"event\":\"payment.captured\","
                + "\"payload\":{"
                + "  \"payment\":{"
                + "    \"entity\":{"
                + "      \"amount\":200000,"
                + "      \"notes\":{\"reference_id\":\"" + invoiceNumber + "\"}"
                + "    }"
                + "  }"
                + "}}";

        String sig = hmacSha256(payload, webhookSecret);

        // Event ID header cannot substitute for a verified payment transaction ID
        mockMvc.perform(post("/api/webhooks/razorpay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload)
                        .header("X-Razorpay-Signature", sig)
                        .header("X-Razorpay-Event-Id", eventId))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Missing payment identifier"));

        // No payment recorded
        long matchCount = paymentRepository.findAll().stream()
                .filter(p -> p.getInvoice().getId().equals(testInvoice.getId()))
                .count();
        assertEquals(0, matchCount, "No payment must be recorded when provider payment ID is missing");
    }

    @Test
    @DisplayName("Batch 3.3: Different webhook events (payment_link.paid and payment.captured) referring to same payment do not double credit")
    void testDifferentWebhookEventsReferringToSamePaymentDoNotDoubleCredit() throws Exception {
        String invoiceNumber = testInvoice.getInvoiceNumber();
        String linkId = "plink_" + UUID.randomUUID().toString().substring(0, 8);
        String commonPaymentId = "pay_COMMON_" + UUID.randomUUID().toString().substring(0, 8);

        // Event 1: payment_link.paid containing both link entity and payment entity
        String linkPaidPayload = "{"
                + "\"event\":\"payment_link.paid\","
                + "\"payload\":{"
                + "  \"payment_link\":{"
                + "    \"entity\":{"
                + "      \"id\":\"" + linkId + "\","
                + "      \"reference_id\":\"" + invoiceNumber + "\","
                + "      \"amount\":500000"
                + "    }"
                + "  },"
                + "  \"payment\":{"
                + "    \"entity\":{"
                + "      \"id\":\"" + commonPaymentId + "\","
                + "      \"amount\":500000"
                + "    }"
                + "  }"
                + "}}";

        String sig1 = hmacSha256(linkPaidPayload, webhookSecret);

        mockMvc.perform(post("/api/webhooks/razorpay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(linkPaidPayload)
                        .header("X-Razorpay-Signature", sig1))
                .andExpect(status().isOk());

        // Event 2: payment.captured for the SAME payment
        String paymentCapturedPayload = "{"
                + "\"event\":\"payment.captured\","
                + "\"payload\":{"
                + "  \"payment\":{"
                + "    \"entity\":{"
                + "      \"id\":\"" + commonPaymentId + "\","
                + "      \"amount\":500000,"
                + "      \"notes\":{\"reference_id\":\"" + invoiceNumber + "\"}"
                + "    }"
                + "  }"
                + "}}";

        String sig2 = hmacSha256(paymentCapturedPayload, webhookSecret);

        mockMvc.perform(post("/api/webhooks/razorpay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(paymentCapturedPayload)
                        .header("X-Razorpay-Signature", sig2))
                .andExpect(status().isOk())
                .andExpect(content().string("Already processed"));

        // Exactly 1 payment in repository
        long paymentCount = paymentRepository.findAll().stream()
                .filter(p -> commonPaymentId.equals(p.getTransactionReference()))
                .count();
        assertEquals(1, paymentCount, "Both events must map to the same payment ID, creating exactly 1 payment");

        // Invoice credited exactly once
        Invoice refreshed = invoiceRepository.findById(testInvoice.getId()).orElseThrow();
        assertEquals(InvoiceStatus.PAID, refreshed.getStatus());
        assertEquals(new BigDecimal("5000.00"), refreshed.getAmountPaid().setScale(2));
        assertEquals(BigDecimal.ZERO.setScale(2), refreshed.getBalanceDue().setScale(2));
    }

    @Test
    @DisplayName("Batch 3.2: payment_link.paid event extracts payment ID or link ID and is idempotent")
    void testPaymentLinkPaidEventProcessingAndIdempotency() throws Exception {
        String invoiceNumber = testInvoice.getInvoiceNumber();
        String linkId = "plink_" + UUID.randomUUID().toString().substring(0, 8);
        String paymentId = "pay_LINK_" + UUID.randomUUID().toString().substring(0, 8);
        String payload = "{"
                + "\"event\":\"payment_link.paid\","
                + "\"payload\":{"
                + "  \"payment_link\":{"
                + "    \"entity\":{"
                + "      \"id\":\"" + linkId + "\","
                + "      \"reference_id\":\"" + invoiceNumber + "\","
                + "      \"amount\":500000"
                + "    }"
                + "  },"
                + "  \"payment\":{"
                + "    \"entity\":{"
                + "      \"id\":\"" + paymentId + "\","
                + "      \"amount\":500000"
                + "    }"
                + "  }"
                + "}}";

        String sig = hmacSha256(payload, webhookSecret);

        // Delivery 1
        mockMvc.perform(post("/api/webhooks/razorpay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload)
                        .header("X-Razorpay-Signature", sig))
                .andExpect(status().isOk());

        // Delivery 2 (duplicate)
        mockMvc.perform(post("/api/webhooks/razorpay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload)
                        .header("X-Razorpay-Signature", sig))
                .andExpect(status().isOk())
                .andExpect(content().string("Already processed"));

        // Canonical payment id must be preferred over link id
        long paymentCount = paymentRepository.findAll().stream()
                .filter(p -> paymentId.equals(p.getTransactionReference()))
                .count();
        assertEquals(1, paymentCount, "Payment must be recorded with canonical paymentId");

        // Verify invoice is PAID and not overpaid
        Invoice refreshed = invoiceRepository.findById(testInvoice.getId()).orElseThrow();
        assertEquals(InvoiceStatus.PAID, refreshed.getStatus());
        assertEquals(new BigDecimal("5000.00"), refreshed.getAmountPaid().setScale(2));
        assertEquals(BigDecimal.ZERO.setScale(2), refreshed.getBalanceDue().setScale(2));
    }

    @Test
    @DisplayName("Batch 3.2: Concurrent duplicate webhooks are serialized on invoice lock and do not double-increment amountPaid")
    void testConcurrentWebhookProcessingDoesNotDoubleCreditInvoice() throws Exception {
        String invoiceNumber = testInvoice.getInvoiceNumber();
        String paymentId = "pay_CONCURRENT_" + UUID.randomUUID().toString().substring(0, 8);
        String payload = "{"
                + "\"event\":\"payment.captured\","
                + "\"payload\":{"
                + "  \"payment\":{"
                + "    \"entity\":{"
                + "      \"id\":\"" + paymentId + "\","
                + "      \"amount\":500000,"
                + "      \"notes\":{\"reference_id\":\"" + invoiceNumber + "\"}"
                + "    }"
                + "  }"
                + "}}";

        String sig = hmacSha256(payload, webhookSecret);

        int threadCount = 2;
        java.util.concurrent.ExecutorService executor = java.util.concurrent.Executors.newFixedThreadPool(threadCount);
        java.util.concurrent.CountDownLatch readyLatch = new java.util.concurrent.CountDownLatch(threadCount);
        java.util.concurrent.CountDownLatch startLatch = new java.util.concurrent.CountDownLatch(1);
        java.util.List<java.util.concurrent.Future<Integer>> futures = new java.util.ArrayList<>();

        for (int i = 0; i < threadCount; i++) {
            futures.add(executor.submit(() -> {
                readyLatch.countDown();
                startLatch.await();
                var result = mockMvc.perform(post("/api/webhooks/razorpay")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(payload)
                                .header("X-Razorpay-Signature", sig))
                        .andReturn();
                return result.getResponse().getStatus();
            }));
        }

        readyLatch.await();
        startLatch.countDown(); // Release both threads at once

        for (var future : futures) {
            int statusCode = future.get(10, java.util.concurrent.TimeUnit.SECONDS);
            assertEquals(200, statusCode, "Both concurrent webhook threads must return 200 OK to Razorpay");
        }
        executor.shutdown();

        // Exactly one payment record must exist
        long paymentCount = paymentRepository.findAll().stream()
                .filter(p -> paymentId.equals(p.getTransactionReference()))
                .count();
        assertEquals(1, paymentCount, "Concurrent duplicate deliveries must produce exactly 1 payment record");

        // Invoice totals must be exactly 5000.00, not double (10000.00)
        Invoice refreshed = invoiceRepository.findById(testInvoice.getId()).orElseThrow();
        assertEquals(new BigDecimal("5000.00"), refreshed.getAmountPaid().setScale(2));
        assertEquals(BigDecimal.ZERO.setScale(2), refreshed.getBalanceDue().setScale(2));
        assertEquals(InvoiceStatus.PAID, refreshed.getStatus());
    }

    // -------------------------------------------------------------------------
    // Helper
    // -------------------------------------------------------------------------

    private String hmacSha256(String data, String key) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] raw = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        for (byte b : raw) sb.append(String.format("%02x", b));
        return sb.toString();
    }
}
