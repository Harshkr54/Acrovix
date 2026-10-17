package com.acrovix.admin.controller;

import com.acrovix.admin.security.ratelimit.RateLimit;
import com.acrovix.admin.security.ratelimit.RateLimitCategory;
import com.acrovix.admin.util.PaginationUtil;
import com.acrovix.admin.dto.AdminUserRequest;
import com.acrovix.admin.dto.AdminUserResponse;
import com.acrovix.admin.dto.UpdateProfileRequest;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.service.AdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService userService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<List<AdminUserResponse>> getAllUsers(
            @RequestParam(required = false) Boolean enabled) {
        return ResponseEntity.ok(userService.getAllUsers(enabled));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<AdminUserResponse> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<AdminUserResponse> createUser(
            @Valid @RequestBody AdminUserRequest request,
            @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(userService.createUser(request, admin.getId()));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<AdminUserResponse> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateProfileRequest request,
            @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(userService.updateUser(id, request, admin.getId()));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal AdminUser admin) {
        boolean enabled = Boolean.TRUE.equals(body.get("enabled"));
        Long reassignToUserId = null;
        if (body.containsKey("reassignToUserId") && body.get("reassignToUserId") != null) {
            reassignToUserId = Long.valueOf(body.get("reassignToUserId").toString());
        }
        userService.updateUserStatus(id, enabled, reassignToUserId, admin.getId());
        return ResponseEntity.ok().build();
    }
    
    @PatchMapping("/{id}/role")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<?> updateRole(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal AdminUser admin) {
        userService.updateUserRole(id, body.get("role"), admin.getId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/send-reset-link")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    @RateLimit(category = RateLimitCategory.EMAIL)
    public ResponseEntity<com.acrovix.admin.dto.AdminRecoveryLinkResponse> sendResetLink(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(userService.sendPasswordResetLink(id, admin.getId()));
    }

    @PostMapping("/{id}/reset-temporary-password")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    @RateLimit(category = RateLimitCategory.LOGIN)
    public ResponseEntity<com.acrovix.admin.dto.TemporaryPasswordResetResponse> resetTemporaryPassword(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(userService.resetTemporaryPassword(id, admin.getId()));
    }
}
