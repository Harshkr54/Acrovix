package com.acrovix.admin.service;

import com.acrovix.admin.dto.CompanySettingsRequest;
import com.acrovix.admin.dto.CompanySettingsResponse;
import com.acrovix.admin.entity.AdminActivity;
import com.acrovix.admin.entity.CompanySettings;
import com.acrovix.admin.entity.Tenant;
import com.acrovix.admin.repository.AdminActivityRepository;
import com.acrovix.admin.repository.CompanySettingsRepository;
import com.acrovix.admin.repository.TenantRepository;
import com.acrovix.admin.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class CompanySettingsService {

    private final CompanySettingsRepository companySettingsRepository;
    private final AdminActivityRepository activityRepository;
    private final TenantRepository tenantRepository;

    @org.springframework.beans.factory.annotation.Autowired
    public CompanySettingsService(CompanySettingsRepository companySettingsRepository,
                                  AdminActivityRepository activityRepository,
                                  TenantRepository tenantRepository) {
        this.companySettingsRepository = companySettingsRepository;
        this.activityRepository = activityRepository;
        this.tenantRepository = tenantRepository;
    }

    public CompanySettingsService(CompanySettingsRepository companySettingsRepository,
                                  AdminActivityRepository activityRepository) {
        this(companySettingsRepository, activityRepository, null);
    }

    @Transactional(readOnly = true)
    public CompanySettingsResponse getCompanySettings() {
        return getCompanySettingsForTenant(TenantContext.getTenantId());
    }

    @Transactional(readOnly = true)
    public CompanySettingsResponse getCompanySettingsForTenant(Long tenantId) {
        if (tenantId == null) {
            tenantId = TenantContext.getTenantId();
            if (tenantId == null) {
                tenantId = 1L;
            }
        }

        Optional<CompanySettings> settingsOpt = companySettingsRepository.findFirstByTenantIdOrderByIdAsc(tenantId);
        if (settingsOpt.isPresent()) {
            return mapToResponse(settingsOpt.get());
        }

        // If not configured yet, return sensible defaults seeded from active Tenant
        String defaultName = (tenantId == 1L) ? "Acrovix Innovations" : "Workspace " + tenantId;
        String brandName = defaultName;
        String email = "contact@workspace" + tenantId + ".com";
        String primaryColor = "#2563EB";
        String secondaryColor = "#1E40AF";
        String currencyCode = "INR";
        String currencySymbol = "₹";

        if (tenantRepository != null) {
            Optional<Tenant> tenantOpt = tenantRepository.findById(tenantId);
            if (tenantOpt.isPresent()) {
                Tenant t = tenantOpt.get();
                if (t.getCompanyName() != null && !t.getCompanyName().isBlank()) {
                    defaultName = t.getCompanyName();
                    brandName = t.getCompanyName();
                }
            }
        }

        CompanySettings defaults = CompanySettings.builder()
                .companyName(defaultName)
                .legalName(defaultName)
                .brandName(brandName)
                .email(email)
                .phone("+91-0000000000")
                .primaryColor(primaryColor)
                .secondaryColor(secondaryColor)
                .currencyCode(currencyCode)
                .currencySymbol(currencySymbol)
                .timezone("Asia/Kolkata")
                .dateFormat("YYYY-MM-DD")
                .build();
        defaults.setTenantId(tenantId);

        return mapToResponse(defaults);
    }

    @Transactional
    public CompanySettingsResponse updateCompanySettings(CompanySettingsRequest request, Long adminId) {
        Long tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            tenantId = 1L;
        }

        final Long currentTenantId = tenantId;
        CompanySettings settings = companySettingsRepository.findFirstByTenantIdOrderByIdAsc(currentTenantId)
                .orElseGet(() -> {
                    CompanySettings cs = new CompanySettings();
                    cs.setTenantId(currentTenantId);
                    return cs;
                });

        settings.setTenantId(currentTenantId);
        settings.setCompanyName(request.getCompanyName());
        settings.setLegalName(request.getLegalName());
        settings.setBrandName(request.getBrandName() != null ? request.getBrandName() : request.getCompanyName());
        settings.setGstin(request.getGstin());
        settings.setPan(request.getPan());
        settings.setVatId(request.getVatId());
        settings.setEmail(request.getEmail());
        settings.setPhone(request.getPhone());
        settings.setWebsite(request.getWebsite());
        settings.setRegisteredAddress(request.getRegisteredAddress());
        settings.setBillingAddress(request.getBillingAddress());
        settings.setBankName(request.getBankName());
        settings.setBankAccountNumber(request.getBankAccountNumber());
        settings.setBankIfsc(request.getBankIfsc());
        settings.setBankBranch(request.getBankBranch());
        settings.setDefaultPaymentTerms(request.getDefaultPaymentTerms());
        settings.setDefaultTermsAndConditions(request.getDefaultTermsAndConditions());
        settings.setLogoUrl(request.getLogoUrl());
        settings.setFaviconUrl(request.getFaviconUrl());

        if (request.getPrimaryColor() != null && !request.getPrimaryColor().isBlank()) {
            settings.setPrimaryColor(request.getPrimaryColor());
        }
        if (request.getSecondaryColor() != null && !request.getSecondaryColor().isBlank()) {
            settings.setSecondaryColor(request.getSecondaryColor());
        }
        if (request.getCurrencyCode() != null && !request.getCurrencyCode().isBlank()) {
            settings.setCurrencyCode(request.getCurrencyCode());
        }
        if (request.getCurrencySymbol() != null && !request.getCurrencySymbol().isBlank()) {
            settings.setCurrencySymbol(request.getCurrencySymbol());
        }
        if (request.getTimezone() != null && !request.getTimezone().isBlank()) {
            settings.setTimezone(request.getTimezone());
        }
        if (request.getDateFormat() != null && !request.getDateFormat().isBlank()) {
            settings.setDateFormat(request.getDateFormat());
        }

        settings.setSignatureUrl(request.getSignatureUrl());
        settings.setUpdatedBy(adminId);

        CompanySettings savedSettings = companySettingsRepository.save(settings);
        logActivity(adminId, "COMPANY_SETTINGS_UPDATED", savedSettings.getId(), "Updated company settings", currentTenantId);

        return mapToResponse(savedSettings);
    }

    private CompanySettingsResponse mapToResponse(CompanySettings settings) {
        return CompanySettingsResponse.builder()
                .id(settings.getId())
                .tenantId(settings.getTenantId())
                .companyName(settings.getCompanyName())
                .legalName(settings.getLegalName())
                .brandName(settings.getBrandName())
                .gstin(settings.getGstin())
                .pan(settings.getPan())
                .vatId(settings.getVatId())
                .email(settings.getEmail())
                .phone(settings.getPhone())
                .website(settings.getWebsite())
                .registeredAddress(settings.getRegisteredAddress())
                .billingAddress(settings.getBillingAddress())
                .bankName(settings.getBankName())
                .bankAccountNumber(settings.getBankAccountNumber())
                .bankIfsc(settings.getBankIfsc())
                .bankBranch(settings.getBankBranch())
                .defaultPaymentTerms(settings.getDefaultPaymentTerms())
                .defaultTermsAndConditions(settings.getDefaultTermsAndConditions())
                .logoUrl(settings.getLogoUrl())
                .faviconUrl(settings.getFaviconUrl())
                .primaryColor(settings.getPrimaryColor())
                .secondaryColor(settings.getSecondaryColor())
                .currencyCode(settings.getCurrencyCode())
                .currencySymbol(settings.getCurrencySymbol())
                .timezone(settings.getTimezone())
                .dateFormat(settings.getDateFormat())
                .signatureUrl(settings.getSignatureUrl())
                .updatedBy(settings.getUpdatedBy())
                .createdAt(settings.getCreatedAt())
                .updatedAt(settings.getUpdatedAt())
                .vatNumber(settings.getVatId())
                .taxIdentifier(settings.getVatId() != null ? settings.getVatId() : settings.getGstin())
                .build();
    }

    private void logActivity(Long adminId, String action, Long entityId, String description, Long tenantId) {
        AdminActivity activity = AdminActivity.builder()
                .adminUserId(adminId)
                .action(action)
                .entityType("COMPANY_SETTINGS")
                .entityId(entityId)
                .description(description)
                .build();
        activity.setTenantId(tenantId);
        activityRepository.save(activity);
    }
}
