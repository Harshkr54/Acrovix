package com.acrovix.admin.tenant;

import com.acrovix.admin.entity.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

class TenantContextTest {

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("TenantContext sets and retrieves active tenant ID on current thread")
    void testSetAndGetTenantId() {
        assertNull(TenantContext.getTenantId());

        TenantContext.setTenantId(42L);
        assertEquals(42L, TenantContext.getTenantId());
        assertEquals(42L, TenantContext.requireTenantId());

        TenantContext.clear();
        assertNull(TenantContext.getTenantId());
    }

    @Test
    @DisplayName("TenantContext requireTenantId throws when context is empty")
    void testRequireTenantIdThrowsWhenEmpty() {
        TenantContext.clear();
        assertThrows(IllegalStateException.class, TenantContext::requireTenantId);
    }

    @Test
    @DisplayName("TenantContext isolates tenant state across different threads")
    void testCrossThreadIsolation() throws Exception {
        TenantContext.setTenantId(101L);

        ExecutorService executor = Executors.newSingleThreadExecutor();
        Future<Long> otherThreadTenant = executor.submit(TenantContext::getTenantId);

        // Child/Other thread must NOT inherit or see thread-local tenant
        assertNull(otherThreadTenant.get(2, TimeUnit.SECONDS));

        // Original thread remains unaffected
        assertEquals(101L, TenantContext.getTenantId());

        executor.shutdownNow();
    }

    @Test
    @DisplayName("TenantContext scoped runners restore previous context cleanly")
    void testRunWithTenantAndCallWithTenant() {
        TenantContext.setTenantId(1L);

        TenantContext.runWithTenant(2L, () -> {
            assertEquals(2L, TenantContext.getTenantId());
        });
        assertEquals(1L, TenantContext.getTenantId());

        String result = TenantContext.callWithTenant(3L, () -> {
            assertEquals(3L, TenantContext.getTenantId());
            return "SUCCESS";
        });
        assertEquals("SUCCESS", result);
        assertEquals(1L, TenantContext.getTenantId());
    }

    @Test
    @DisplayName("TenantEntityListener populates tenantId on TenantAwareEntity when active")
    void testTenantEntityListenerAutoPopulation() {
        TenantContext.setTenantId(55L);

        TestEntity entity = new TestEntity();
        assertNull(entity.getTenantId());

        TenantEntityListener listener = new TenantEntityListener();
        listener.setTenantId(entity);

        assertEquals(55L, entity.getTenantId(), "TenantId must be auto-populated from active TenantContext");
    }

    @Test
    @DisplayName("TenantEntityListener preserves pre-assigned tenantId")
    void testTenantEntityListenerPreservesExistingTenantId() {
        TenantContext.setTenantId(55L);

        TestEntity entity = new TestEntity();
        entity.setTenantId(99L);

        TenantEntityListener listener = new TenantEntityListener();
        listener.setTenantId(entity);

        assertEquals(99L, entity.getTenantId(), "Explicitly provided tenantId must be respected");
    }

    @Test
    @DisplayName("Tenant and TenantSubscription models instantiate with valid defaults")
    void testTenantAndSubscriptionEntities() {
        Tenant tenant = Tenant.builder()
                .id(1L)
                .slug("acme")
                .companyName("Acme Corp")
                .status(TenantStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        TenantSubscription subscription = TenantSubscription.builder()
                .tenant(tenant)
                .planTier(PlanTier.GROWTH)
                .maxSeats(25)
                .maxStorageBytes(21474836480L)
                .build();

        assertEquals("acme", tenant.getSlug());
        assertEquals(TenantStatus.ACTIVE, tenant.getStatus());
        assertEquals(PlanTier.GROWTH, subscription.getPlanTier());
        assertEquals(25, subscription.getMaxSeats());
    }

    static class TestEntity extends TenantAwareEntity {
        // Concrete test class inheriting TenantAwareEntity
    }
}
