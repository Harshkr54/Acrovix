package com.acrovix.admin.controller;

import com.acrovix.admin.dto.*;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.Role;
import com.acrovix.admin.entity.Tenant;
import com.acrovix.admin.entity.TenantStatus;
import com.acrovix.admin.entity.TenantSubscription;
import com.acrovix.admin.service.TenantProvisioningService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/super-admin/tenants")
@RequiredArgsConstructor
public class SuperAdminTenantController {

    private final TenantProvisioningService provisioningService;

    /**
     * Defense-in-depth platform owner assertion.
     * Enforces strictly that only SUPER_ADMIN from Tenant 1 (Platform Owner) can execute Super-Admin operations.
     */
    private void assertPlatformSuperAdmin(AdminUser user) {
        if (user == null || user.getRole() != Role.SUPER_ADMIN || !Long.valueOf(1L).equals(user.getTenantId())) {
            log.warn("Unauthorized attempt to access Super-Admin tenant endpoint by user: {}", user != null ? user.getEmail() : "anonymous");
            throw new AccessDeniedException("Access denied: Requires Platform Super-Admin privileges from the platform owner workspace (Tenant 1)");
        }
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') and @tenantSecurity.isPlatformOwner(principal)")
    public ResponseEntity<TenantProvisionResponse> provisionTenant(
            @Valid @RequestBody TenantProvisionRequest request,
            @AuthenticationPrincipal AdminUser admin) {
        assertPlatformSuperAdmin(admin);
        TenantProvisionResponse response = provisioningService.provisionTenant(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') and @tenantSecurity.isPlatformOwner(principal)")
    public ResponseEntity<List<TenantSummaryResponse>> getAllTenants(
            @AuthenticationPrincipal AdminUser admin) {
        assertPlatformSuperAdmin(admin);
        return ResponseEntity.ok(provisioningService.getAllTenants());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN') and @tenantSecurity.isPlatformOwner(principal)")
    public ResponseEntity<TenantDetailResponse> getTenantById(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser admin) {
        assertPlatformSuperAdmin(admin);
        return ResponseEntity.ok(provisioningService.getTenantById(id));
    }

    @PatchMapping("/{id}/subscription")
    @PreAuthorize("hasRole('SUPER_ADMIN') and @tenantSecurity.isPlatformOwner(principal)")
    public ResponseEntity<TenantSubscription> updateSubscription(
            @PathVariable Long id,
            @Valid @RequestBody UpdateSubscriptionRequest request,
            @AuthenticationPrincipal AdminUser admin) {
        assertPlatformSuperAdmin(admin);
        TenantSubscription updated = provisioningService.updateSubscription(id, request);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('SUPER_ADMIN') and @tenantSecurity.isPlatformOwner(principal)")
    public ResponseEntity<Tenant> updateTenantStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal AdminUser admin) {
        assertPlatformSuperAdmin(admin);
        String statusStr = body.get("status");
        if (statusStr == null || statusStr.isBlank()) {
            throw new IllegalArgumentException("Tenant status is required");
        }
        TenantStatus status = TenantStatus.valueOf(statusStr.trim().toUpperCase());
        Tenant updated = provisioningService.updateTenantStatus(id, status);
        return ResponseEntity.ok(updated);
    }
}
