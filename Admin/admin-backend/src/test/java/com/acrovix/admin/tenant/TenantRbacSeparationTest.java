package com.acrovix.admin.tenant;

import com.acrovix.admin.controller.SuperAdminTenantController;
import com.acrovix.admin.dto.*;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.Role;
import com.acrovix.admin.entity.TenantStatus;
import com.acrovix.admin.security.TenantSecurityService;
import com.acrovix.admin.service.TenantProvisioningService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TenantRbacSeparationTest {

    @Mock
    private TenantProvisioningService provisioningService;

    private SuperAdminTenantController superAdminController;
    private TenantSecurityService tenantSecurityService;

    private AdminUser platformSuperAdmin; // Tenant 1 Super Admin
    private AdminUser tenant2SuperAdmin;  // Tenant 2 (Unauthorized super admin attempt)
    private AdminUser tenant2CompanyAdmin;// Tenant 2 Company Admin
    private AdminUser salesUser;          // Sales User

    @BeforeEach
    void setUp() {
        superAdminController = new SuperAdminTenantController(provisioningService);
        tenantSecurityService = new TenantSecurityService();

        platformSuperAdmin = AdminUser.builder()
                .id(1L)
                .email("admin@acrovix.com")
                .role(Role.SUPER_ADMIN)
                .tenantId(1L)
                .build();

        tenant2SuperAdmin = AdminUser.builder()
                .id(2L)
                .email("admin@tenant2.com")
                .role(Role.SUPER_ADMIN)
                .tenantId(2L)
                .build();

        tenant2CompanyAdmin = AdminUser.builder()
                .id(3L)
                .email("admin@acme.com")
                .role(Role.COMPANY_ADMIN)
                .tenantId(2L)
                .build();

        salesUser = AdminUser.builder()
                .id(4L)
                .email("sales@acme.com")
                .role(Role.SALES)
                .tenantId(2L)
                .build();
    }

    @Test
    @DisplayName("TenantSecurityService evaluates Platform Owner strictly for Tenant 1 Super Admin")
    void testTenantSecurityServiceEvaluation() {
        assertTrue(tenantSecurityService.isPlatformOwner(platformSuperAdmin));
        assertFalse(tenantSecurityService.isPlatformOwner(tenant2SuperAdmin));
        assertFalse(tenantSecurityService.isPlatformOwner(tenant2CompanyAdmin));
        assertFalse(tenantSecurityService.isPlatformOwner(salesUser));
        assertFalse(tenantSecurityService.isPlatformOwner(null));

        // Company admin or above
        assertTrue(tenantSecurityService.isCompanyAdminOrAbove(platformSuperAdmin));
        assertTrue(tenantSecurityService.isCompanyAdminOrAbove(tenant2SuperAdmin));
        assertTrue(tenantSecurityService.isCompanyAdminOrAbove(tenant2CompanyAdmin));
        assertFalse(tenantSecurityService.isCompanyAdminOrAbove(salesUser));
    }

    @Test
    @DisplayName("Platform Super-Admin (Tenant 1) can access super-admin tenant provisioning endpoint")
    void testPlatformSuperAdminCanProvisionTenants() {
        TenantProvisionRequest request = TenantProvisionRequest.builder()
                .companyName("New Client")
                .slug("new-client")
                .adminEmail("client@client.com")
                .adminPassword("Secret123!")
                .adminFullName("Client Admin")
                .build();

        TenantProvisionResponse mockResponse = TenantProvisionResponse.builder()
                .tenantId(10L)
                .slug("new-client")
                .companyName("New Client")
                .status(TenantStatus.ACTIVE)
                .build();

        when(provisioningService.provisionTenant(any(TenantProvisionRequest.class))).thenReturn(mockResponse);

        ResponseEntity<TenantProvisionResponse> response = superAdminController.provisionTenant(request, platformSuperAdmin);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(10L, response.getBody().getTenantId());
        verify(provisioningService).provisionTenant(request);
    }

    @Test
    @DisplayName("Platform Super-Admin (Tenant 1) can list all tenants")
    void testPlatformSuperAdminCanListTenants() {
        when(provisioningService.getAllTenants()).thenReturn(List.of(
                TenantSummaryResponse.builder().id(1L).slug("default").companyName("Acrovix Innovations").build(),
                TenantSummaryResponse.builder().id(2L).slug("acme").companyName("Acme Corp").build()
        ));

        ResponseEntity<List<TenantSummaryResponse>> response = superAdminController.getAllTenants(platformSuperAdmin);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(2, response.getBody().size());
        verify(provisioningService).getAllTenants();
    }

    @Test
    @DisplayName("Non-owner tenant Super Admin (Tenant 2) is blocked from super-admin endpoints with AccessDeniedException")
    void testTenant2SuperAdminBlockedFromSuperAdminEndpoints() {
        TenantProvisionRequest request = TenantProvisionRequest.builder().slug("illegal").build();

        assertThrows(
                AccessDeniedException.class,
                () -> superAdminController.provisionTenant(request, tenant2SuperAdmin)
        );

        assertThrows(
                AccessDeniedException.class,
                () -> superAdminController.getAllTenants(tenant2SuperAdmin)
        );

        assertThrows(
                AccessDeniedException.class,
                () -> superAdminController.getTenantById(1L, tenant2SuperAdmin)
        );

        assertThrows(
                AccessDeniedException.class,
                () -> superAdminController.updateSubscription(1L, new UpdateSubscriptionRequest(), tenant2SuperAdmin)
        );

        assertThrows(
                AccessDeniedException.class,
                () -> superAdminController.updateTenantStatus(1L, Map.of("status", "SUSPENDED"), tenant2SuperAdmin)
        );

        verifyNoInteractions(provisioningService);
    }

    @Test
    @DisplayName("Company Admin (Tenant 2) is strictly blocked from super-admin endpoints with AccessDeniedException")
    void testCompanyAdminBlockedFromSuperAdminEndpoints() {
        TenantProvisionRequest request = TenantProvisionRequest.builder().slug("illegal").build();

        assertThrows(
                AccessDeniedException.class,
                () -> superAdminController.provisionTenant(request, tenant2CompanyAdmin)
        );

        assertThrows(
                AccessDeniedException.class,
                () -> superAdminController.getAllTenants(tenant2CompanyAdmin)
        );

        assertThrows(
                AccessDeniedException.class,
                () -> superAdminController.getTenantById(2L, tenant2CompanyAdmin)
        );

        verifyNoInteractions(provisioningService);
    }

    @Test
    @DisplayName("Unauthenticated caller is blocked from super-admin endpoints")
    void testUnauthenticatedBlocked() {
        assertThrows(
                AccessDeniedException.class,
                () -> superAdminController.getAllTenants(null)
        );
    }
}
