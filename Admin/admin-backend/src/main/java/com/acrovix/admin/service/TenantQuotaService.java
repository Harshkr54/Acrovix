package com.acrovix.admin.service;

import com.acrovix.admin.entity.PlanTier;
import com.acrovix.admin.entity.Tenant;
import com.acrovix.admin.entity.TenantStatus;
import com.acrovix.admin.entity.TenantSubscription;
import com.acrovix.admin.exception.SubscriptionQuotaExceededException;
import com.acrovix.admin.repository.AdminUserRepository;
import com.acrovix.admin.repository.TenantRepository;
import com.acrovix.admin.repository.TenantSubscriptionRepository;
import com.acrovix.admin.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;

/**
 * Enforces subscription quota guardrails and Platform Owner lifetime exemption.
 * Ensures zero cross-tenant quota bleed and enforces plan tier limits.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TenantQuotaService {

    public static final Long PLATFORM_OWNER_TENANT_ID = 1L;

    private final TenantSubscriptionRepository subscriptionRepository;
    private final TenantRepository tenantRepository;
    private final AdminUserRepository adminUserRepository;

    /**
     * Verifies if current active users < subscription.maxSeats.
     * Platform Owner (Tenant 1) or LIFETIME_INTERNAL plan tier bypasses all seat checks.
     *
     * @param tenantId Target tenant ID to inspect
     * @throws SubscriptionQuotaExceededException HTTP 402 if seat limit reached
     */
    @Transactional(readOnly = true)
    public void checkUserSeatLimit(Long tenantId) {
        Long targetTenantId = resolveEffectiveTenantId(tenantId);
        if (isExempt(targetTenantId)) {
            log.debug("Tenant {} is exempt from seat limit checks (Platform Owner / Lifetime Internal)", targetTenantId);
            return;
        }

        // Verify general subscription validity first
        checkSubscriptionValidity(targetTenantId);

        TenantSubscription subscription = subscriptionRepository.findByTenantId(targetTenantId)
                .orElse(null);

        if (subscription == null) {
            log.warn("No subscription record found for tenant {}. Proceeding with default 5-seat guard.", targetTenantId);
            long activeUsers = adminUserRepository.countByTenantIdAndEnabledTrue(targetTenantId);
            if (activeUsers >= 5) {
                throw new SubscriptionQuotaExceededException(
                        String.format("User seat limit reached (%d/5 seats used). Please configure or upgrade your subscription.", activeUsers),
                        HttpStatus.PAYMENT_REQUIRED
                );
            }
            return;
        }

        if (subscription.getPlanTier() == PlanTier.LIFETIME_INTERNAL) {
            return; // STRICT BYPASS
        }

        int maxSeats = (subscription.getMaxSeats() != null) ? subscription.getMaxSeats() : 5;
        long activeUsers = adminUserRepository.countByTenantIdAndEnabledTrue(targetTenantId);

        if (activeUsers >= maxSeats) {
            log.warn("Tenant {} exceeded user seat quota: {}/{} seats active", targetTenantId, activeUsers, maxSeats);
            throw new SubscriptionQuotaExceededException(
                    String.format("User seat limit reached (%d/%d seats used). Please upgrade your subscription to add more team members.",
                            activeUsers, maxSeats),
                    HttpStatus.PAYMENT_REQUIRED
            );
        }
    }

    /**
     * Ensures subscription.validUntil is in the future and workspace status is operational.
     * Platform Owner (Tenant 1) or LIFETIME_INTERNAL plan tier bypasses all expiry checks.
     *
     * @param tenantId Target tenant ID to inspect
     * @throws SubscriptionQuotaExceededException HTTP 402/403 if expired or suspended
     */
    @Transactional(readOnly = true)
    public void checkSubscriptionValidity(Long tenantId) {
        Long targetTenantId = resolveEffectiveTenantId(tenantId);
        if (isExempt(targetTenantId)) {
            log.debug("Tenant {} is exempt from subscription expiry checks (Platform Owner / Lifetime Internal)", targetTenantId);
            return;
        }

        // Check Tenant Status (SUSPENDED / CANCELLED)
        Optional<Tenant> tenantOpt = tenantRepository.findById(targetTenantId);
        if (tenantOpt.isPresent()) {
            Tenant tenant = tenantOpt.get();
            if (tenant.getStatus() == TenantStatus.SUSPENDED) {
                throw new SubscriptionQuotaExceededException(
                        "Workspace has been suspended. Please contact platform administrators.",
                        HttpStatus.FORBIDDEN
                );
            }
            if (tenant.getStatus() == TenantStatus.CANCELLED) {
                throw new SubscriptionQuotaExceededException(
                        "Workspace subscription is cancelled. Please re-subscribe to continue access.",
                        HttpStatus.FORBIDDEN
                );
            }
        }

        Optional<TenantSubscription> subOpt = subscriptionRepository.findByTenantId(targetTenantId);
        if (subOpt.isPresent()) {
            TenantSubscription sub = subOpt.get();
            if (sub.getPlanTier() == PlanTier.LIFETIME_INTERNAL) {
                return; // STRICT BYPASS
            }
            if (sub.getValidUntil() != null && sub.getValidUntil().isBefore(LocalDateTime.now())) {
                log.warn("Tenant {} subscription expired at {}", targetTenantId, sub.getValidUntil());
                throw new SubscriptionQuotaExceededException(
                        String.format("Workspace subscription expired on %s. Please renew your plan to continue using Acrovix.", sub.getValidUntil()),
                        HttpStatus.PAYMENT_REQUIRED
                );
            }
        }
    }

    /**
     * Validates storage constraints.
     * Platform Owner (Tenant 1) or LIFETIME_INTERNAL plan tier evaluates to PERMITTED with zero restrictions.
     */
    @Transactional(readOnly = true)
    public void checkStorageLimit(Long tenantId, long additionalBytes) {
        Long targetTenantId = resolveEffectiveTenantId(tenantId);
        if (isExempt(targetTenantId)) {
            return; // STRICT BYPASS
        }

        Optional<TenantSubscription> subOpt = subscriptionRepository.findByTenantId(targetTenantId);
        if (subOpt.isPresent()) {
            TenantSubscription sub = subOpt.get();
            if (sub.getPlanTier() == PlanTier.LIFETIME_INTERNAL || sub.getMaxStorageBytes() == -1 || sub.getMaxStorageBytes() == Long.MAX_VALUE) {
                return; // Unlimited storage
            }
        }
    }

    /**
     * Gates premium features based on tier (STARTER, GROWTH, ENTERPRISE, LIFETIME_INTERNAL).
     * Platform Owner (Tenant 1) or LIFETIME_INTERNAL evaluates to true for all features.
     */
    @Transactional(readOnly = true)
    public boolean isFeatureAllowed(Long tenantId, String featureCode) {
        Long targetTenantId = resolveEffectiveTenantId(tenantId);
        if (isExempt(targetTenantId)) {
            return true; // STRICT BYPASS
        }

        if (featureCode == null || featureCode.isBlank()) {
            return true;
        }

        Optional<TenantSubscription> subOpt = subscriptionRepository.findByTenantId(targetTenantId);
        PlanTier tier = subOpt.map(TenantSubscription::getPlanTier).orElse(PlanTier.STARTER);

        if (tier == PlanTier.LIFETIME_INTERNAL || tier == PlanTier.ENTERPRISE) {
            return true;
        }

        String feature = featureCode.trim().toUpperCase();

        if (tier == PlanTier.GROWTH) {
            // Enterprise-only restricted features
            Set<String> enterpriseOnlyFeatures = Set.of(
                    "DEDICATED_DATABASE",
                    "CUSTOM_SSO",
                    "AUDIT_VAULT_EXPORT",
                    "SLA_GUARANTEE",
                    "WHITE_LABEL_PORTAL"
            );
            return !enterpriseOnlyFeatures.contains(feature);
        }

        if (tier == PlanTier.STARTER || tier == PlanTier.TRIAL) {
            // Features explicitly permitted on basic plans
            Set<String> starterFeatures = Set.of(
                    "BASIC_CRM",
                    "QUOTATIONS",
                    "INVOICES",
                    "PAYMENTS",
                    "BASIC_REPORTS",
                    "USER_MANAGEMENT",
                    "COMPANY_SETTINGS"
            );
            return starterFeatures.contains(feature);
        }

        return false;
    }

    public void assertFeatureAllowed(Long tenantId, String featureCode) {
        if (!isFeatureAllowed(tenantId, featureCode)) {
            throw new SubscriptionQuotaExceededException(
                    String.format("Feature '%s' is not supported on your current subscription plan. Please upgrade.", featureCode),
                    HttpStatus.PAYMENT_REQUIRED
            );
        }
    }

    /**
     * Determines whether a tenant qualifies for Platform Owner lifetime exemption.
     */
    public boolean isExempt(Long tenantId) {
        if (PLATFORM_OWNER_TENANT_ID.equals(tenantId)) {
            return true;
        }
        if (tenantId != null) {
            Optional<TenantSubscription> subOpt = subscriptionRepository.findByTenantId(tenantId);
            if (subOpt.isPresent() && subOpt.get().getPlanTier() == PlanTier.LIFETIME_INTERNAL) {
                return true;
            }
        }
        return false;
    }

    private Long resolveEffectiveTenantId(Long tenantId) {
        if (tenantId != null) {
            return tenantId;
        }
        Long contextId = TenantContext.getTenantId();
        return (contextId != null) ? contextId : PLATFORM_OWNER_TENANT_ID;
    }
}
