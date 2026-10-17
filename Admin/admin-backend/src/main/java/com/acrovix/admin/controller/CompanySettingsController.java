package com.acrovix.admin.controller;


import com.acrovix.admin.security.ratelimit.RateLimit;
import com.acrovix.admin.security.ratelimit.RateLimitCategory;
import com.acrovix.admin.util.PaginationUtil;
import com.acrovix.admin.dto.CompanySettingsRequest;
import com.acrovix.admin.dto.CompanySettingsResponse;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.service.CompanySettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/company-settings")
@RequiredArgsConstructor
public class CompanySettingsController {

    private final CompanySettingsService companySettingsService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'SALES', 'EDITOR')")
    public ResponseEntity<CompanySettingsResponse> getCompanySettings() {
        CompanySettingsResponse settings = companySettingsService.getCompanySettings();
        return ResponseEntity.ok(settings);
    }

    @PatchMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<CompanySettingsResponse> updateCompanySettings(
            @Valid @RequestBody CompanySettingsRequest request,
            @AuthenticationPrincipal AdminUser adminUser) {
        CompanySettingsResponse updated = companySettingsService.updateCompanySettings(request, adminUser.getId());
        return ResponseEntity.ok(updated);
    }
}
