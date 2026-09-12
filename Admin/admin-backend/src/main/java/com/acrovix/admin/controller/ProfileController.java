package com.acrovix.admin.controller;

import com.acrovix.admin.dto.AdminUserResponse;
import com.acrovix.admin.dto.ChangePasswordRequest;
import com.acrovix.admin.dto.UpdateProfileRequest;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.service.AdminUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final AdminUserService userService;

    @GetMapping
    public ResponseEntity<AdminUserResponse> getProfile(@AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(userService.getProfile(admin.getId()));
    }

    @PatchMapping
    public ResponseEntity<AdminUserResponse> updateProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(userService.updateProfile(admin.getId(), request));
    }

    @PatchMapping("/password")
    public ResponseEntity<?> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal AdminUser admin) {
        userService.changePassword(admin.getId(), request);
        return ResponseEntity.ok().build();
    }
}
