package com.acrovix.admin.tenant;

import com.acrovix.admin.dto.*;
import com.acrovix.admin.entity.*;
import com.acrovix.admin.exception.ResourceConflictException;
import com.acrovix.admin.exception.ResourceNotFoundException;
import com.acrovix.admin.repository.AdminUserRepository;
import com.acrovix.admin.repository.CompanySettingsRepository;
import com.acrovix.admin.repository.TenantRepository;
import com.acrovix.admin.repository.TenantSubscriptionRepository;
import com.acrovix.admin.service.CompanySettingsService;
import com.acrovix.admin.service.TenantProvisioningService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TenantProvisioningServiceTest {

    @Mock
    private TenantRepository tenantRepository;

    @Mock
    private TenantSubscriptionRepository subscriptionRepository;

    @Mock
    private CompanySettingsRepository companySettingsRepository;

    @Mock
    private AdminUserRepository adminUserRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private CompanySettingsService companySettingsService;

    private TenantProvisioningService provisioningService;

    @BeforeEach
    void setUp() {
        provisioningService = new TenantProvisioningService(
                tenantRepository,
                subscriptionRepository,
                companySettingsRepository,
                adminUserRepository,
                passwordEncoder,
                companySettingsService
        );
        TenantContext.clear();
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("Provisioning creates isolated Tenant, Subscription, CompanySettings, and COMPANY_ADMIN user")
    void testSuccessfulTenantProvisioning() {
        TenantProvisionRequest request = TenantProvisionRequest.builder()
                .companyName("Apex Logistics")
                .slug("apex-logistics")
                .adminEmail("admin@apex.com")
                .adminPassword("Secret123!")
                .adminFullName("Apex Administrator")
                .planTier(PlanTier.GROWTH)
                .phone("+91-9876543210")
                .build();

        when(tenantRepository.existsBySlug("apex-logistics")).thenReturn(false);
        when(adminUserRepository.existsByEmail("admin@apex.com")).thenReturn(false);
        when(passwordEncoder.encode("Secret123!")).thenReturn("hashed_secret");

        Tenant savedTenant = Tenant.builder()
                .id(101L)
                .slug("apex-logistics")
                .companyName("Apex Logistics")
                .status(TenantStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build();
        when(tenantRepository.save(any(Tenant.class))).thenReturn(savedTenant);

        TenantSubscription savedSub = TenantSubscription.builder()
                .id(201L)
                .tenant(savedTenant)
                .planTier(PlanTier.GROWTH)
                .maxSeats(25)
                .maxStorageBytes(26843545600L)
                .validUntil(LocalDateTime.now().plusYears(1))
                .build();
        when(subscriptionRepository.save(any(TenantSubscription.class))).thenReturn(savedSub);

        CompanySettings savedSettings = CompanySettings.builder()
                .id(301L)
                .companyName("Apex Logistics")
                .email("admin@apex.com")
                .currencyCode("INR")
                .build();
        savedSettings.setTenantId(101L);
        when(companySettingsRepository.save(any(CompanySettings.class))).thenReturn(savedSettings);

        AdminUser savedUser = AdminUser.builder()
                .id(401L)
                .name("Apex Administrator")
                .email("admin@apex.com")
                .role(Role.COMPANY_ADMIN)
                .tenantId(101L)
                .enabled(true)
                .build();
        when(adminUserRepository.save(any(AdminUser.class))).thenReturn(savedUser);

        TenantProvisionResponse response = provisioningService.provisionTenant(request);

        assertNotNull(response);
        assertEquals(101L, response.getTenantId());
        assertEquals("apex-logistics", response.getSlug());
        assertEquals("Apex Logistics", response.getCompanyName());
        assertEquals(TenantStatus.ACTIVE, response.getStatus());

        // Verify Subscription
        assertNotNull(response.getSubscription());
        assertEquals(PlanTier.GROWTH, response.getSubscription().getPlanTier());
        assertEquals(25, response.getSubscription().getMaxSeats());

        // Verify Admin User strictly assigned as COMPANY_ADMIN and scoped to new tenantId
        assertNotNull(response.getAdminUser());
        assertEquals(Role.COMPANY_ADMIN, response.getAdminUser().getRole());
        assertEquals(101L, response.getAdminUser().getTenantId());
        assertEquals("admin@apex.com", response.getAdminUser().getEmail());

        // Verify CompanySettings scoped to tenantId
        ArgumentCaptor<CompanySettings> settingsCaptor = ArgumentCaptor.forClass(CompanySettings.class);
        verify(companySettingsRepository).save(settingsCaptor.capture());
        assertEquals(101L, settingsCaptor.getValue().getTenantId());
        assertEquals("Apex Logistics", settingsCaptor.getValue().getCompanyName());
    }

    @Test
    @DisplayName("Slug validation rejects reserved platform slugs")
    void testSlugValidationRejectsReservedSlugs() {
        for (String reserved : TenantProvisioningService.RESERVED_SLUGS) {
            IllegalArgumentException ex = assertThrows(
                    IllegalArgumentException.class,
                    () -> provisioningService.validateAndNormalizeSlug(reserved)
            );
            assertTrue(ex.getMessage().contains("reserved"));
        }
    }

    @Test
    @DisplayName("Slug validation rejects non-URL-friendly regex characters")
    void testSlugValidationRejectsInvalidRegex() {
        List<String> invalidSlugs = List.of(
                "Apex_Logistics",
                "apex logistics",
                "apex@logistics",
                "apex!",
                "-leading-hyphen", // wait: -leading-hyphen matches ^[a-z0-9-]+$, but let's test invalid chars:
                "apex.logistics",
                "apex#1"
        );

        for (String invalid : List.of("Apex_Logistics", "apex logistics", "apex@logistics", "apex!", "apex.logistics", "apex#1")) {
            IllegalArgumentException ex = assertThrows(
                    IllegalArgumentException.class,
                    () -> provisioningService.validateAndNormalizeSlug(invalid)
            );
            assertTrue(ex.getMessage().contains("invalid"));
        }
    }

    @Test
    @DisplayName("Slug validation rejects duplicates with ResourceConflictException")
    void testSlugValidationRejectsDuplicate() {
        when(tenantRepository.existsBySlug("existing-corp")).thenReturn(true);

        assertThrows(
                ResourceConflictException.class,
                () -> provisioningService.validateAndNormalizeSlug("existing-corp")
        );
    }

    @Test
    @DisplayName("Provisioning rejects duplicate administrator email with ResourceConflictException")
    void testProvisioningRejectsDuplicateEmail() {
        TenantProvisionRequest request = TenantProvisionRequest.builder()
                .companyName("Duplicate Corp")
                .slug("duplicate-corp")
                .adminEmail("existing@acrovix.com")
                .adminPassword("Secret123!")
                .adminFullName("Admin User")
                .build();

        when(tenantRepository.existsBySlug("duplicate-corp")).thenReturn(false);
        when(adminUserRepository.existsByEmail("existing@acrovix.com")).thenReturn(true);

        assertThrows(
                ResourceConflictException.class,
                () -> provisioningService.provisionTenant(request)
        );
    }

    @Test
    @DisplayName("Tenant 1 cannot be suspended or cancelled by status update")
    void testTenant1CannotBeSuspended() {
        Tenant tenant1 = Tenant.builder().id(1L).companyName("Acrovix Innovations").status(TenantStatus.ACTIVE).build();
        when(tenantRepository.findById(1L)).thenReturn(Optional.of(tenant1));

        assertThrows(
                IllegalArgumentException.class,
                () -> provisioningService.updateTenantStatus(1L, TenantStatus.SUSPENDED)
        );

        assertThrows(
                IllegalArgumentException.class,
                () -> provisioningService.updateTenantStatus(1L, TenantStatus.CANCELLED)
        );
    }

    @Test
    @DisplayName("Tenant 1 subscription cannot be downgraded from LIFETIME_INTERNAL")
    void testTenant1SubscriptionProtected() {
        Tenant tenant1 = Tenant.builder().id(1L).companyName("Acrovix Innovations").status(TenantStatus.ACTIVE).build();
        TenantSubscription sub1 = TenantSubscription.builder().tenant(tenant1).planTier(PlanTier.LIFETIME_INTERNAL).maxSeats(999999).build();

        when(tenantRepository.findById(1L)).thenReturn(Optional.of(tenant1));
        when(subscriptionRepository.findByTenantId(1L)).thenReturn(Optional.of(sub1));
        when(subscriptionRepository.save(any(TenantSubscription.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateSubscriptionRequest downgradeRequest = UpdateSubscriptionRequest.builder()
                .planTier(PlanTier.STARTER)
                .maxSeats(5)
                .build();

        TenantSubscription result = provisioningService.updateSubscription(1L, downgradeRequest);

        // Must remain LIFETIME_INTERNAL with 999999 seats
        assertEquals(PlanTier.LIFETIME_INTERNAL, result.getPlanTier());
        assertEquals(999999, result.getMaxSeats());
    }

    @Test
    @DisplayName("Subscriber tenant subscription can be updated by Super-Admin")
    void testSubscriberSubscriptionUpdate() {
        Tenant tenant2 = Tenant.builder().id(2L).companyName("Acme Corp").status(TenantStatus.ACTIVE).build();
        TenantSubscription sub2 = TenantSubscription.builder()
                .tenant(tenant2)
                .planTier(PlanTier.STARTER)
                .maxSeats(5)
                .build();

        when(tenantRepository.findById(2L)).thenReturn(Optional.of(tenant2));
        when(subscriptionRepository.findByTenantId(2L)).thenReturn(Optional.of(sub2));
        when(subscriptionRepository.save(any(TenantSubscription.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateSubscriptionRequest upgradeRequest = UpdateSubscriptionRequest.builder()
                .planTier(PlanTier.ENTERPRISE)
                .maxSeats(150)
                .build();

        TenantSubscription result = provisioningService.updateSubscription(2L, upgradeRequest);

        assertEquals(PlanTier.ENTERPRISE, result.getPlanTier());
        assertEquals(150, result.getMaxSeats());
    }
}
