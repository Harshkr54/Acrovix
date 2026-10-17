package com.acrovix.admin.service;

import com.acrovix.admin.dto.*;
import com.acrovix.admin.entity.*;
import com.acrovix.admin.exception.ResourceConflictException;
import com.acrovix.admin.exception.ResourceNotFoundException;
import com.acrovix.admin.repository.AdminUserRepository;
import com.acrovix.admin.repository.CompanySettingsRepository;
import com.acrovix.admin.repository.TenantRepository;
import com.acrovix.admin.repository.TenantSubscriptionRepository;
import com.acrovix.admin.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TenantProvisioningService {

    public static final Set<String> RESERVED_SLUGS = Set.of(
            "api", "app", "admin", "super-admin", "public", "default", "acrovix"
    );

    private static final String SLUG_PATTERN = "^[a-z0-9-]+$";

    private final TenantRepository tenantRepository;
    private final TenantSubscriptionRepository subscriptionRepository;
    private final CompanySettingsRepository companySettingsRepository;
    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final CompanySettingsService companySettingsService;

    /**
     * Provisions a new multi-tenant workspace with an isolated Tenant, TenantSubscription,
     * CompanySettings default seed, and initial AdminUser assigned as COMPANY_ADMIN.
     */
    @Transactional
    public TenantProvisionResponse provisionTenant(TenantProvisionRequest request) {
        log.info("Starting provisioning for company='{}', slug='{}'", request.getCompanyName(), request.getSlug());

        // 1. Slug format validation
        String normalizedSlug = validateAndNormalizeSlug(request.getSlug());

        // 2. Email uniqueness check
        String normalizedEmail = request.getAdminEmail().trim().toLowerCase(Locale.ROOT);
        if (adminUserRepository.existsByEmail(normalizedEmail)) {
            throw new ResourceConflictException("An administrator account with email '" + normalizedEmail + "' already exists.");
        }

        // 3. Provision Tenant
        TenantStatus initialStatus = (request.getPlanTier() == PlanTier.TRIAL || request.getPlanTier() == PlanTier.FREE_TRIAL) ? TenantStatus.TRIAL : TenantStatus.ACTIVE;
        Tenant tenant = Tenant.builder()
                .companyName(request.getCompanyName().trim())
                .slug(normalizedSlug)
                .customDomain(request.getCustomDomain() != null && !request.getCustomDomain().isBlank()
                        ? request.getCustomDomain().trim().toLowerCase(Locale.ROOT)
                        : null)
                .status(initialStatus)
                .build();
        tenant = tenantRepository.save(tenant);
        log.info("Provisioned Tenant id={}, slug='{}'", tenant.getId(), tenant.getSlug());

        // 4. Provision TenantSubscription with plan tier allocations
        PlanTier tier = (request.getPlanTier() != null) ? request.getPlanTier() : PlanTier.STARTER;
        TenantSubscription subscription = buildSubscriptionForTier(tenant, tier);
        subscription = subscriptionRepository.save(subscription);
        log.info("Provisioned Subscription id={}, tier={}, seats={}", subscription.getId(), tier, subscription.getMaxSeats());

        // 5. Seed initial CompanySettings strictly scoped to new tenant_id
        final Long newTenantId = tenant.getId();
        CompanySettings companySettings = CompanySettings.builder()
                .companyName(request.getCompanyName().trim())
                .legalName(request.getCompanyName().trim())
                .brandName(request.getCompanyName().trim())
                .email(normalizedEmail)
                .phone(request.getPhone() != null && !request.getPhone().isBlank() ? request.getPhone().trim() : "+91-0000000000")
                .primaryColor("#2563EB")
                .secondaryColor("#1E40AF")
                .currencyCode("INR")
                .currencySymbol("₹")
                .timezone("Asia/Kolkata")
                .dateFormat("YYYY-MM-DD")
                .build();
        companySettings.setTenantId(newTenantId);
        companySettings = companySettingsRepository.save(companySettings);

        String rawAdminName = request.getAdminFullName() != null && !request.getAdminFullName().isBlank()
                ? request.getAdminFullName().trim()
                : (request.getAdminName() != null && !request.getAdminName().isBlank() ? request.getAdminName().trim() : "Workspace Admin");

        // 6. Create the initial AdminUser assigned as COMPANY_ADMIN scoped strictly to new tenant_id
        AdminUser adminUser = AdminUser.builder()
                .name(rawAdminName)
                .email(normalizedEmail)
                .password(passwordEncoder.encode(request.getAdminPassword()))
                .role(Role.COMPANY_ADMIN)
                .tenantId(newTenantId)
                .enabled(true)
                .mustChangePassword(false)
                .build();
        adminUser = adminUserRepository.save(adminUser);
        log.info("Created COMPANY_ADMIN user id={}, email='{}' for tenant {}", adminUser.getId(), adminUser.getEmail(), newTenantId);

        return TenantProvisionResponse.builder()
                .tenantId(tenant.getId())
                .slug(tenant.getSlug())
                .companyName(tenant.getCompanyName())
                .customDomain(tenant.getCustomDomain())
                .status(tenant.getStatus())
                .createdAt(tenant.getCreatedAt())
                .subscription(TenantProvisionResponse.SubscriptionInfo.builder()
                        .id(subscription.getId())
                        .planTier(subscription.getPlanTier())
                        .maxSeats(subscription.getMaxSeats())
                        .maxStorageBytes(subscription.getMaxStorageBytes())
                        .validUntil(subscription.getValidUntil())
                        .build())
                .adminUser(TenantProvisionResponse.AdminUserInfo.builder()
                        .id(adminUser.getId())
                        .name(adminUser.getName())
                        .email(adminUser.getEmail())
                        .role(adminUser.getRole())
                        .tenantId(adminUser.getTenantId())
                        .build())
                .settings(TenantProvisionResponse.SettingsInfo.builder()
                        .id(companySettings.getId())
                        .companyName(companySettings.getCompanyName())
                        .email(companySettings.getEmail())
                        .currencyCode(companySettings.getCurrencyCode())
                        .build())
                .build();
    }

    /**
     * Validates slug syntax, reserved word collisions, and database uniqueness.
     */
    public String validateAndNormalizeSlug(String rawSlug) {
        if (rawSlug == null || rawSlug.isBlank()) {
            throw new IllegalArgumentException("Tenant slug cannot be null or blank");
        }

        String normalized = rawSlug.trim().toLowerCase(Locale.ROOT);

        if (!normalized.matches(SLUG_PATTERN)) {
            throw new IllegalArgumentException("Slug '" + rawSlug + "' is invalid. Slugs must contain only lowercase letters, numbers, and hyphens (^[a-z0-9-]+$).");
        }

        if (RESERVED_SLUGS.contains(normalized)) {
            throw new IllegalArgumentException("The slug '" + rawSlug + "' is reserved by the platform and cannot be registered.");
        }

        if (tenantRepository.existsBySlug(normalized)) {
            throw new ResourceConflictException("A workspace with slug '" + rawSlug + "' already exists.");
        }

        return normalized;
    }

    /**
     * Platform Super-Admin: Retrieve all tenants with their subscription overview.
     */
    @Transactional(readOnly = true)
    public List<TenantSummaryResponse> getAllTenants() {
        return tenantRepository.findAll().stream().map(tenant -> {
            TenantSubscription sub = subscriptionRepository.findByTenantId(tenant.getId()).orElse(null);
            long activeUsers = adminUserRepository.countByTenantIdAndEnabledTrue(tenant.getId());

            return TenantSummaryResponse.builder()
                    .id(tenant.getId())
                    .slug(tenant.getSlug())
                    .companyName(tenant.getCompanyName())
                    .customDomain(tenant.getCustomDomain())
                    .status(tenant.getStatus())
                    .planTier(sub != null ? sub.getPlanTier() : null)
                    .maxSeats(sub != null ? sub.getMaxSeats() : null)
                    .activeUserCount(activeUsers)
                    .validUntil(sub != null ? sub.getValidUntil() : null)
                    .createdAt(tenant.getCreatedAt())
                    .build();
        }).collect(Collectors.toList());
    }

    /**
     * Platform Super-Admin: Retrieve comprehensive tenant details by ID.
     */
    @Transactional(readOnly = true)
    public TenantDetailResponse getTenantById(Long tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found with ID: " + tenantId));

        TenantSubscription sub = subscriptionRepository.findByTenantId(tenantId).orElse(null);
        long activeUsers = adminUserRepository.countByTenantIdAndEnabledTrue(tenantId);
        long totalUsers = adminUserRepository.countByTenantId(tenantId);

        CompanySettingsResponse settingsResponse = TenantContext.callWithTenant(tenantId, companySettingsService::getCompanySettings);

        TenantDetailResponse.SubscriptionDetail subDetail = null;
        if (sub != null) {
            subDetail = TenantDetailResponse.SubscriptionDetail.builder()
                    .id(sub.getId())
                    .planTier(sub.getPlanTier())
                    .maxSeats(sub.getMaxSeats())
                    .maxStorageBytes(sub.getMaxStorageBytes())
                    .validUntil(sub.getValidUntil())
                    .updatedAt(sub.getUpdatedAt())
                    .build();
        }

        return TenantDetailResponse.builder()
                .id(tenant.getId())
                .slug(tenant.getSlug())
                .companyName(tenant.getCompanyName())
                .customDomain(tenant.getCustomDomain())
                .status(tenant.getStatus())
                .createdAt(tenant.getCreatedAt())
                .updatedAt(tenant.getUpdatedAt())
                .activeUserCount(activeUsers)
                .totalUserCount(totalUsers)
                .subscription(subDetail)
                .companySettings(settingsResponse)
                .build();
    }

    /**
     * Platform Super-Admin: Modify subscription plan tier, seats, storage, or validity.
     * Prevents degrading Platform Owner (Tenant 1) lifetime exemption.
     */
    @Transactional
    public TenantSubscription updateSubscription(Long tenantId, UpdateSubscriptionRequest request) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found with ID: " + tenantId));

        TenantSubscription subscription = subscriptionRepository.findByTenantId(tenantId)
                .orElseGet(() -> TenantSubscription.builder().tenant(tenant).build());

        // Platform Owner protection
        if (Long.valueOf(1L).equals(tenantId)) {
            subscription.setPlanTier(PlanTier.LIFETIME_INTERNAL);
            subscription.setMaxSeats(999999);
            subscription.setMaxStorageBytes(9223372036854775807L);
            subscription.setValidUntil(LocalDateTime.of(9999, 12, 31, 23, 59, 59));
            return subscriptionRepository.save(subscription);
        }

        if (request.getPlanTier() != null) {
            subscription.setPlanTier(request.getPlanTier());
        }
        if (request.getMaxSeats() != null) {
            subscription.setMaxSeats(request.getMaxSeats());
        }
        if (request.getMaxStorageBytes() != null) {
            subscription.setMaxStorageBytes(request.getMaxStorageBytes());
        }
        if (request.getValidUntil() != null) {
            subscription.setValidUntil(request.getValidUntil());
        }

        return subscriptionRepository.save(subscription);
    }

    /**
     * Platform Super-Admin: Suspend, activate, or cancel a tenant.
     * Platform Owner (Tenant 1) cannot be suspended or cancelled.
     */
    @Transactional
    public Tenant updateTenantStatus(Long tenantId, TenantStatus newStatus) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found with ID: " + tenantId));

        if (Long.valueOf(1L).equals(tenantId) && (newStatus == TenantStatus.SUSPENDED || newStatus == TenantStatus.CANCELLED)) {
            throw new IllegalArgumentException("Platform Owner workspace (Tenant 1) cannot be suspended or cancelled.");
        }

        tenant.setStatus(newStatus);
        return tenantRepository.save(tenant);
    }

    private TenantSubscription buildSubscriptionForTier(Tenant tenant, PlanTier tier) {
        LocalDateTime farFuture = LocalDateTime.of(9999, 12, 31, 23, 59, 59);
        LocalDateTime oneYearFuture = LocalDateTime.now().plusYears(1);

        switch (tier) {
            case LIFETIME_INTERNAL:
                return TenantSubscription.builder()
                        .tenant(tenant)
                        .planTier(PlanTier.LIFETIME_INTERNAL)
                        .maxSeats(999999)
                        .maxStorageBytes(9223372036854775807L)
                        .validUntil(farFuture)
                        .build();
            case ENTERPRISE:
                return TenantSubscription.builder()
                        .tenant(tenant)
                        .planTier(PlanTier.ENTERPRISE)
                        .maxSeats(100)
                        .maxStorageBytes(107374182400L) // 100 GB
                        .validUntil(oneYearFuture)
                        .build();
            case PRO:
                return TenantSubscription.builder()
                        .tenant(tenant)
                        .planTier(PlanTier.PRO)
                        .maxSeats(15)
                        .maxStorageBytes(53687091200L) // 50 GB
                        .validUntil(oneYearFuture)
                        .build();
            case GROWTH:
                return TenantSubscription.builder()
                        .tenant(tenant)
                        .planTier(PlanTier.GROWTH)
                        .maxSeats(25)
                        .maxStorageBytes(26843545600L) // 25 GB
                        .validUntil(oneYearFuture)
                        .build();
            case FREE_TRIAL:
            case TRIAL:
                return TenantSubscription.builder()
                        .tenant(tenant)
                        .planTier(tier)
                        .maxSeats(3)
                        .maxStorageBytes(1073741824L) // 1 GB
                        .validUntil(LocalDateTime.now().plusDays(14))
                        .build();
            case STARTER:
            default:
                return TenantSubscription.builder()
                        .tenant(tenant)
                        .planTier(PlanTier.STARTER)
                        .maxSeats(5)
                        .maxStorageBytes(5368709120L) // 5 GB
                        .validUntil(oneYearFuture)
                        .build();
        }
    }
}
