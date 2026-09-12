package com.acrovix.admin.controller;

import com.acrovix.admin.dto.AdminUserRequest;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.service.AdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService userService;

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<AdminUser>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<AdminUser> createUser(
            @RequestBody AdminUserRequest request,
            @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(userService.createUser(request, admin.getId()));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> body,
            @AuthenticationPrincipal AdminUser admin) {
        userService.updateUserStatus(id, body.get("enabled"), admin.getId());
        return ResponseEntity.ok().build();
    }
    
    @PatchMapping("/{id}/role")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> updateRole(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal AdminUser admin) {
        userService.updateUserRole(id, body.get("role"), admin.getId());
        return ResponseEntity.ok().build();
    }
}
