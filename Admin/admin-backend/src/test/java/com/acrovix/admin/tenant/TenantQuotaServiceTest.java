package com.acrovix.admin.tenant;

import com.acrovix.admin.entity.*;
import com.acrovix.admin.exception.SubscriptionQuotaExceededException;
import com.acrovix.admin.repository.AdminUserRepository;
import com.acrovix.admin.repository.TenantRepository;
import com.acrovix.admin.repository.TenantSubscriptionRepository;
import com.acrovix.admin.service.TenantQuotaService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TenantQuotaServiceTest {

    @Mock
    private TenantSubscriptionRepository subscriptionRepository;

    @Mock
    private TenantRepository tenantRepository;

    @Mock
    private AdminUserRepository adminUserRepository;

    private TenantQuotaService quotaService;

    @BeforeEach
    void setUp() {
        quotaService = new TenantQuotaService(subscriptionRepository, tenantRepository, adminUserRepository);
        TenantContext.clear();
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("Tenant 1 (Platform Owner) strictly bypasses all user seat limits with zero restrictions")
    void testTenant1BypassesUserSeatLimit() {
        // Even if huge number of active users exist, Tenant 1 must never be blocked
        assertDoesNotThrow(() -> quotaService.checkUserSeatLimit(1L));
        verifyNoInteractions(adminUserRepository);
    }

    @Test
    @DisplayName("Tenant 1 strictly bypasses subscription expiry checks even if expired date is configured")
    void testTenant1BypassesSubscriptionExpiry() {
        assertDoesNotThrow(() -> quotaService.checkSubscriptionValidity(1L));
        verifyNoInteractions(tenantRepository);
        verifyNoInteractions(subscriptionRepository);
    }

    @Test
    @DisplayName("Any tenant with LIFETIME_INTERNAL plan tier bypasses seat limits and expiry")
    void testLifetimeInternalPlanTierBypass() {
        Long tenantId = 99L;
        Tenant tenant = Tenant.builder().id(tenantId).companyName("Partner Corp").status(TenantStatus.ACTIVE).build();
        TenantSubscription lifetimeSub = TenantSubscription.builder()
                .tenant(tenant)
                .planTier(PlanTier.LIFETIME_INTERNAL)
                .maxSeats(999999)
                .validUntil(LocalDateTime.now().minusDays(10)) // past date
                .build();

        when(subscriptionRepository.findByTenantId(tenantId)).thenReturn(Optional.of(lifetimeSub));

        assertDoesNotThrow(() -> quotaService.checkUserSeatLimit(tenantId));
        assertDoesNotThrow(() -> quotaService.checkSubscriptionValidity(tenantId));
        verify(adminUserRepository, never()).countByTenantIdAndEnabledTrue(anyLong());
    }

    @Test
    @DisplayName("Tenant 2 (Subscriber) permitted when active users are strictly less than maxSeats")
    void testTenant2PermittedWithinSeatQuota() {
        Long tenantId = 2L;
        Tenant tenant = Tenant.builder().id(tenantId).companyName("Acme Corp").status(TenantStatus.ACTIVE).build();
        TenantSubscription sub = TenantSubscription.builder()
                .tenant(tenant)
                .planTier(PlanTier.STARTER)
                .maxSeats(5)
                .validUntil(LocalDateTime.now().plusMonths(6))
                .build();

        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(subscriptionRepository.findByTenantId(tenantId)).thenReturn(Optional.of(sub));
        when(adminUserRepository.countByTenantIdAndEnabledTrue(tenantId)).thenReturn(4L); // 4 < 5

        assertDoesNotThrow(() -> quotaService.checkUserSeatLimit(tenantId));
    }

    @Test
    @DisplayName("Tenant 2 (Subscriber) blocked with HTTP 402 when active users equal or exceed maxSeats")
    void testTenant2BlockedWhenExceedingSeatQuota() {
        Long tenantId = 2L;
        Tenant tenant = Tenant.builder().id(tenantId).companyName("Acme Corp").status(TenantStatus.ACTIVE).build();
        TenantSubscription sub = TenantSubscription.builder()
                .tenant(tenant)
                .planTier(PlanTier.STARTER)
                .maxSeats(5)
                .validUntil(LocalDateTime.now().plusMonths(6))
                .build();

        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(subscriptionRepository.findByTenantId(tenantId)).thenReturn(Optional.of(sub));
        when(adminUserRepository.countByTenantIdAndEnabledTrue(tenantId)).thenReturn(5L); // 5 >= 5

        SubscriptionQuotaExceededException ex = assertThrows(
                SubscriptionQuotaExceededException.class,
                () -> quotaService.checkUserSeatLimit(tenantId)
        );

        assertEquals(HttpStatus.PAYMENT_REQUIRED, ex.getStatus());
        assertTrue(ex.getMessage().contains("User seat limit reached (5/5 seats used)"));
    }

    @Test
    @DisplayName("Tenant 2 blocked with HTTP 402 when subscription has expired")
    void testTenant2BlockedWhenSubscriptionExpired() {
        Long tenantId = 2L;
        Tenant tenant = Tenant.builder().id(tenantId).companyName("Expired Corp").status(TenantStatus.ACTIVE).build();
        TenantSubscription expiredSub = TenantSubscription.builder()
                .tenant(tenant)
                .planTier(PlanTier.GROWTH)
                .maxSeats(25)
                .validUntil(LocalDateTime.now().minusDays(1)) // Expired yesterday
                .build();

        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(subscriptionRepository.findByTenantId(tenantId)).thenReturn(Optional.of(expiredSub));

        SubscriptionQuotaExceededException ex = assertThrows(
                SubscriptionQuotaExceededException.class,
                () -> quotaService.checkSubscriptionValidity(tenantId)
        );

        assertEquals(HttpStatus.PAYMENT_REQUIRED, ex.getStatus());
        assertTrue(ex.getMessage().contains("subscription expired"));
    }

    @Test
    @DisplayName("Tenant 2 blocked with HTTP 403 when account status is SUSPENDED")
    void testTenant2BlockedWhenSuspended() {
        Long tenantId = 2L;
        Tenant suspendedTenant = Tenant.builder().id(tenantId).companyName("Bad Actor").status(TenantStatus.SUSPENDED).build();

        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(suspendedTenant));

        SubscriptionQuotaExceededException ex = assertThrows(
                SubscriptionQuotaExceededException.class,
                () -> quotaService.checkSubscriptionValidity(tenantId)
        );

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        assertTrue(ex.getMessage().contains("suspended"));
    }

    @Test
    @DisplayName("Feature gating enforces tier matrix and grants full access to Platform Owner")
    void testFeatureGatingMatrix() {
        // Tenant 1 has all features
        assertTrue(quotaService.isFeatureAllowed(1L, "CUSTOM_SSO"));
        assertTrue(quotaService.isFeatureAllowed(1L, "DEDICATED_DATABASE"));
        assertTrue(quotaService.isFeatureAllowed(1L, "ANY_RANDOM_FEATURE"));

        // Tenant 2 on STARTER
        Long starterTenantId = 2L;
        TenantSubscription starterSub = TenantSubscription.builder().planTier(PlanTier.STARTER).build();
        when(subscriptionRepository.findByTenantId(starterTenantId)).thenReturn(Optional.of(starterSub));

        assertTrue(quotaService.isFeatureAllowed(starterTenantId, "BASIC_CRM"));
        assertTrue(quotaService.isFeatureAllowed(starterTenantId, "QUOTATIONS"));
        assertFalse(quotaService.isFeatureAllowed(starterTenantId, "CUSTOM_SSO"));
        assertFalse(quotaService.isFeatureAllowed(starterTenantId, "DEDICATED_DATABASE"));

        // Tenant 3 on GROWTH
        Long growthTenantId = 3L;
        TenantSubscription growthSub = TenantSubscription.builder().planTier(PlanTier.GROWTH).build();
        when(subscriptionRepository.findByTenantId(growthTenantId)).thenReturn(Optional.of(growthSub));

        assertTrue(quotaService.isFeatureAllowed(growthTenantId, "CUSTOM_BRANDING"));
        assertTrue(quotaService.isFeatureAllowed(growthTenantId, "ADVANCED_REPORTS"));
        assertFalse(quotaService.isFeatureAllowed(growthTenantId, "CUSTOM_SSO"));
        assertFalse(quotaService.isFeatureAllowed(growthTenantId, "DEDICATED_DATABASE"));

        // Tenant 4 on ENTERPRISE
        Long enterpriseTenantId = 4L;
        TenantSubscription enterpriseSub = TenantSubscription.builder().planTier(PlanTier.ENTERPRISE).build();
        when(subscriptionRepository.findByTenantId(enterpriseTenantId)).thenReturn(Optional.of(enterpriseSub));

        assertTrue(quotaService.isFeatureAllowed(enterpriseTenantId, "CUSTOM_SSO"));
        assertTrue(quotaService.isFeatureAllowed(enterpriseTenantId, "DEDICATED_DATABASE"));
    }
}
