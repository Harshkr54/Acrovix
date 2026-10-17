package com.acrovix.admin.controller;

import com.acrovix.admin.dto.TenantBrandingResponse;
import com.acrovix.admin.entity.CompanySettings;
import com.acrovix.admin.entity.Tenant;
import com.acrovix.admin.entity.TenantStatus;
import com.acrovix.admin.repository.CompanySettingsRepository;
import com.acrovix.admin.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping({"/api/v1/public/tenants", "/api/public/tenants"})
public class TenantPublicController {

    private final TenantRepository tenantRepository;
    private final CompanySettingsRepository companySettingsRepository;
    private final com.acrovix.admin.service.TenantProvisioningService provisioningService;

    @org.springframework.beans.factory.annotation.Autowired
    public TenantPublicController(TenantRepository tenantRepository,
                                  CompanySettingsRepository companySettingsRepository,
                                  com.acrovix.admin.service.TenantProvisioningService provisioningService) {
        this.tenantRepository = tenantRepository;
        this.companySettingsRepository = companySettingsRepository;
        this.provisioningService = provisioningService;
    }

    public TenantPublicController(TenantRepository tenantRepository, CompanySettingsRepository companySettingsRepository) {
        this(tenantRepository, companySettingsRepository, null);
    }

    @GetMapping("/{slug}/branding")
    public ResponseEntity<?> getTenantBranding(@PathVariable String slug) {
        if (slug == null || slug.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Slug parameter is required", "status", 400));
        }

        Optional<Tenant> tenantOpt = tenantRepository.findBySlug(slug.trim().toLowerCase());
        if (tenantOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Workspace not found", "status", 404));
        }

        Tenant tenant = tenantOpt.get();
        if (tenant.getStatus() == TenantStatus.SUSPENDED || tenant.getStatus() == TenantStatus.CANCELLED) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Tenant account inactive or suspended", "status", 403));
        }

        // Fetch company settings if configured for this tenant, fallback to default if id=1
        Optional<CompanySettings> settingsOpt = companySettingsRepository.findFirstByTenantIdOrderByIdAsc(tenant.getId());
        if (settingsOpt.isEmpty() && Long.valueOf(1L).equals(tenant.getId())) {
            settingsOpt = companySettingsRepository.findFirstByOrderByIdAsc();
        }

        String logoUrl = settingsOpt.map(CompanySettings::getLogoUrl).orElse(null);
        String faviconUrl = settingsOpt.map(CompanySettings::getFaviconUrl).orElse(null);
        String primaryColor = settingsOpt.map(CompanySettings::getPrimaryColor).filter(c -> !c.isBlank()).orElse("#2563EB");
        String secondaryColor = settingsOpt.map(CompanySettings::getSecondaryColor).filter(c -> !c.isBlank()).orElse("#1E40AF");
        String displayName = settingsOpt
                .map(s -> (s.getBrandName() != null && !s.getBrandName().isBlank()) 
                        ? s.getBrandName() 
                        : (s.getLegalName() != null && !s.getLegalName().isBlank() ? s.getLegalName() : s.getCompanyName()))
                .filter(name -> name != null && !name.isBlank())
                .orElse(tenant.getCompanyName());

        String brandName = settingsOpt.map(CompanySettings::getBrandName).filter(b -> !b.isBlank()).orElse(null);
        String currencyCode = settingsOpt.map(CompanySettings::getCurrencyCode).filter(c -> !c.isBlank()).orElse("INR");
        String currencySymbol = settingsOpt.map(CompanySettings::getCurrencySymbol).filter(s -> !s.isBlank()).orElse("₹");

        TenantBrandingResponse response = TenantBrandingResponse.builder()
                .slug(tenant.getSlug())
                .companyName(displayName)
                .brandName(brandName != null ? brandName : displayName)
                .status(tenant.getStatus().name())
                .logoUrl(logoUrl)
                .faviconUrl(faviconUrl)
                .primaryColor(primaryColor)
                .secondaryColor(secondaryColor)
                .currencyCode(currencyCode)
                .currencySymbol(currencySymbol)
                .customDomain(tenant.getCustomDomain())
                .build();

        return ResponseEntity.ok(response);
    }

    @PostMapping("/register")
    public ResponseEntity<com.acrovix.admin.dto.TenantProvisionResponse> registerTenant(
            @jakarta.validation.Valid @RequestBody com.acrovix.admin.dto.TenantProvisionRequest request) {
        if (provisioningService == null) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
        }
        com.acrovix.admin.dto.TenantProvisionResponse response = provisioningService.provisionTenant(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
