package com.acrovix.admin.service;

import com.acrovix.admin.controller.ClientQuotationController;
import com.acrovix.admin.dto.ClientQuotationResponseRequest;
import com.acrovix.admin.dto.QuotationStatusUpdateRequest;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.Quotation;
import com.acrovix.admin.entity.QuotationResponseSource;
import com.acrovix.admin.exception.ResourceConflictException;
import com.acrovix.admin.repository.AdminUserRepository;
import com.acrovix.admin.repository.QuotationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
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
public class QuotationExpirationTest {

    @Autowired
    private ClientQuotationController clientQuotationController;

    @Autowired
    private QuotationService quotationService;

    @Autowired
    private QuotationRepository quotationRepository;

    @Autowired
    private AdminUserRepository adminUserRepository;

    private AdminUser testAdmin;

    @BeforeEach
    void setUp() {
        testAdmin = adminUserRepository.findAll().stream().findFirst().orElseGet(() -> {
            AdminUser admin = AdminUser.builder()
                    .name("Test Admin")
                    .email("admin_" + UUID.randomUUID() + "@acrovix.com")
                    .password("secret")
                    .role(com.acrovix.admin.entity.Role.SUPER_ADMIN)
                    .enabled(true)
                    .build();
            return adminUserRepository.save(admin);
        });
    }

    private Quotation createQuotation(String status, LocalDate validUntil) {
        String token = UUID.randomUUID().toString();
        Quotation q = Quotation.builder()
                .quotationNumber("Q-EXP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .clientName("Acme Corp")
                .clientEmail("client@acme.com")
                .clientToken(token)
                .status(status)
                .validUntil(validUntil)
                .grandTotal(new BigDecimal("50000.00"))
                .createdBy(testAdmin)
                .build();
        return quotationRepository.save(q);
    }

    @Test
    void testAcceptanceRejectedWhenExpiredYesterday() {
        Quotation q = createQuotation("SENT", LocalDate.now().minusDays(1));

        ClientQuotationResponseRequest req = new ClientQuotationResponseRequest();
        req.setAction("ACCEPT");

        ResourceConflictException ex = assertThrows(ResourceConflictException.class, () -> {
            clientQuotationController.respondToQuotation(q.getClientToken(), req);
        });

        assertTrue(ex.getMessage().contains("expired"));

        Quotation refreshed = quotationRepository.findById(q.getId()).orElseThrow();
        assertEquals("EXPIRED", refreshed.getStatus(), "Expired quotation must be persisted in EXPIRED status upon rejection of acceptance");
    }

    @Test
    void testAcceptanceAllowedWhenExpiresToday() {
        Quotation q = createQuotation("SENT", LocalDate.now());

        ClientQuotationResponseRequest req = new ClientQuotationResponseRequest();
        req.setAction("ACCEPT");

        ResponseEntity<Map<String, Object>> response = clientQuotationController.respondToQuotation(q.getClientToken(), req);
        assertEquals(200, response.getStatusCode().value());
        assertEquals("ACCEPTED", response.getBody().get("status"));

        Quotation refreshed = quotationRepository.findById(q.getId()).orElseThrow();
        assertEquals("ACCEPTED", refreshed.getStatus());
    }

    @Test
    void testAcceptanceAllowedWhenValidFutureDate() {
        Quotation q = createQuotation("SENT", LocalDate.now().plusDays(7));

        ClientQuotationResponseRequest req = new ClientQuotationResponseRequest();
        req.setAction("ACCEPT");

        ResponseEntity<Map<String, Object>> response = clientQuotationController.respondToQuotation(q.getClientToken(), req);
        assertEquals(200, response.getStatusCode().value());
        assertEquals("ACCEPTED", response.getBody().get("status"));

        Quotation refreshed = quotationRepository.findById(q.getId()).orElseThrow();
        assertEquals("ACCEPTED", refreshed.getStatus());
    }

    @Test
    void testAcceptanceRejectedForNonSentStatus() {
        Quotation draftQ = createQuotation("DRAFT", LocalDate.now().plusDays(7));

        ClientQuotationResponseRequest req = new ClientQuotationResponseRequest();
        req.setAction("ACCEPT");

        assertThrows(ResourceConflictException.class, () -> {
            clientQuotationController.respondToQuotation(draftQ.getClientToken(), req);
        });

        Quotation refreshed = quotationRepository.findById(draftQ.getId()).orElseThrow();
        assertEquals("DRAFT", refreshed.getStatus());
    }

    @Test
    void testAcceptanceRejectedWhenAlreadyInExpiredStatus() {
        Quotation expiredQ = createQuotation("EXPIRED", LocalDate.now().minusDays(5));

        ClientQuotationResponseRequest req = new ClientQuotationResponseRequest();
        req.setAction("ACCEPT");

        assertThrows(ResourceConflictException.class, () -> {
            clientQuotationController.respondToQuotation(expiredQ.getClientToken(), req);
        });

        Quotation refreshed = quotationRepository.findById(expiredQ.getId()).orElseThrow();
        assertEquals("EXPIRED", refreshed.getStatus());
    }

    @Test
    void testRepeatedAcceptanceRejected() {
        Quotation q = createQuotation("SENT", LocalDate.now().plusDays(7));

        ClientQuotationResponseRequest req = new ClientQuotationResponseRequest();
        req.setAction("ACCEPT");

        // First acceptance succeeds
        ResponseEntity<Map<String, Object>> first = clientQuotationController.respondToQuotation(q.getClientToken(), req);
        assertEquals("ACCEPTED", first.getBody().get("status"));

        // Second acceptance must be rejected
        assertThrows(ResourceConflictException.class, () -> {
            clientQuotationController.respondToQuotation(q.getClientToken(), req);
        });
    }

    @Test
    void testServiceAcceptanceRejectedWhenExpired() {
        Quotation q = createQuotation("SENT", LocalDate.now().minusDays(2));

        QuotationStatusUpdateRequest req = new QuotationStatusUpdateRequest();
        req.setStatus("ACCEPTED");
        req.setResponseSource(QuotationResponseSource.EMAIL);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            quotationService.updateStatus(q.getId(), req, testAdmin);
        });

        assertTrue(ex.getMessage().contains("expired"));

        Quotation refreshed = quotationRepository.findById(q.getId()).orElseThrow();
        assertEquals("EXPIRED", refreshed.getStatus(), "Expired quotation must be persisted in EXPIRED status upon rejection of acceptance");
    }

    @Test
    void testConcurrentAcceptancePrevented() throws Exception {
        Quotation q = createQuotation("SENT", LocalDate.now().plusDays(14));
        String token = q.getClientToken();

        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CyclicBarrier barrier = new CyclicBarrier(threads);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);

        Callable<Void> task = () -> {
            barrier.await();
            org.springframework.web.context.request.RequestContextHolder.setRequestAttributes(
                new org.springframework.web.context.request.ServletRequestAttributes(
                    new org.springframework.mock.web.MockHttpServletRequest()
                )
            );
            try {
                ClientQuotationResponseRequest req = new ClientQuotationResponseRequest();
                req.setAction("ACCEPT");
                ResponseEntity<Map<String, Object>> resp = clientQuotationController.respondToQuotation(token, req);
                if (resp.getStatusCode().is2xxSuccessful()) {
                    successCount.incrementAndGet();
                }
            } catch (ResourceConflictException rce) {
                conflictCount.incrementAndGet();
            } finally {
                org.springframework.web.context.request.RequestContextHolder.resetRequestAttributes();
            }
            return null;
        };

        Future<Void> f1 = executor.submit(task);
        Future<Void> f2 = executor.submit(task);

        f1.get(10, TimeUnit.SECONDS);
        f2.get(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertEquals(1, successCount.get(), "Exactly one request must successfully accept");
        assertEquals(1, conflictCount.get(), "The concurrent duplicate request must be rejected with conflict");

        Quotation refreshed = quotationRepository.findById(q.getId()).orElseThrow();
        assertEquals("ACCEPTED", refreshed.getStatus());
    }
}
