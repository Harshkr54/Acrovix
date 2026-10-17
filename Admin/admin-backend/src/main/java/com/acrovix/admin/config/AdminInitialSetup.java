package com.acrovix.admin.config;

import com.acrovix.admin.entity.*;
import com.acrovix.admin.repository.AdminUserRepository;
import com.acrovix.admin.repository.TenantRepository;
import com.acrovix.admin.repository.TenantSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class AdminInitialSetup implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(AdminInitialSetup.class);

    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final TenantRepository tenantRepository;
    private final TenantSubscriptionRepository tenantSubscriptionRepository;

    @Value("${admin.initial.name}")
    private String initialName;

    @Value("${admin.initial.email}")
    private String initialEmail;

    @Value("${admin.initial.password}")
    private String initialPassword;

    @Override
    public void run(String... args) {
        initPlatformOwnerWorkspace();
        initDefaultSuperAdmin();
    }

    private void initPlatformOwnerWorkspace() {
        try {
            Tenant tenant1 = tenantRepository.findById(1L).orElse(null);
            if (tenant1 == null) {
                tenant1 = Tenant.builder()
                        .slug("default")
                        .companyName("Acrovix Innovations")
                        .status(TenantStatus.ACTIVE)
                        .build();
                tenant1 = tenantRepository.save(tenant1);
                logger.info("Initialized Platform Owner Tenant 1: Acrovix Innovations");
            } else if ("Acrovix Default Workspace".equals(tenant1.getCompanyName())) {
                tenant1.setCompanyName("Acrovix Innovations");
                tenant1 = tenantRepository.save(tenant1);
                logger.info("Updated Tenant 1 company name to 'Acrovix Innovations'");
            }

            LocalDateTime farFuture = LocalDateTime.of(9999, 12, 31, 23, 59, 59);
            TenantSubscription sub1 = tenantSubscriptionRepository.findByTenantId(1L).orElse(null);
            if (sub1 == null) {
                sub1 = TenantSubscription.builder()
                        .tenant(tenant1)
                        .planTier(PlanTier.LIFETIME_INTERNAL)
                        .maxSeats(999999)
                        .maxStorageBytes(9223372036854775807L)
                        .validUntil(farFuture)
                        .build();
                tenantSubscriptionRepository.save(sub1);
                logger.info("Initialized LIFETIME_INTERNAL subscription for Tenant 1 (unlimited seats & storage)");
            } else if (sub1.getPlanTier() != PlanTier.LIFETIME_INTERNAL || sub1.getMaxSeats() < 999999) {
                sub1.setPlanTier(PlanTier.LIFETIME_INTERNAL);
                sub1.setMaxSeats(999999);
                sub1.setMaxStorageBytes(9223372036854775807L);
                sub1.setValidUntil(farFuture);
                tenantSubscriptionRepository.save(sub1);
                logger.info("Upgraded Tenant 1 subscription to LIFETIME_INTERNAL platform owner status");
            }
        } catch (Exception e) {
            logger.warn("Platform owner workspace seeding note: {}", e.getMessage());
        }
    }

    private void initDefaultSuperAdmin() {
        if (!adminUserRepository.existsByEmail(initialEmail)) {
            logger.info("No SUPER_ADMIN found with configured initial email. Creating default SUPER_ADMIN...");
            AdminUser admin = AdminUser.builder()
                    .name(initialName)
                    .email(initialEmail)
                    .password(passwordEncoder.encode(initialPassword))
                    .role(Role.SUPER_ADMIN)
                    .tenantId(1L)
                    .enabled(true)
                    .build();
            adminUserRepository.save(admin);
            logger.info("SUPER_ADMIN created successfully scoped to Tenant 1.");
        } else {
            logger.info("SUPER_ADMIN already exists. Skipping initialization.");
        }
    }
}
