package com.acrovix.admin.service;

import com.acrovix.admin.dto.CompanySettingsRequest;
import com.acrovix.admin.dto.CompanySettingsResponse;
import com.acrovix.admin.entity.AdminActivity;
import com.acrovix.admin.entity.CompanySettings;
import com.acrovix.admin.repository.AdminActivityRepository;
import com.acrovix.admin.repository.CompanySettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CompanySettingsService {

    private final CompanySettingsRepository companySettingsRepository;
    private final AdminActivityRepository activityRepository;

    @Transactional(readOnly = true)
    public CompanySettingsResponse getCompanySettings() {
        CompanySettings settings = companySettingsRepository.findById(1L).orElse(null);
        if (settings == null) {
            return null; // Return null if not configured yet, client can handle it
        }
        return mapToResponse(settings);
    }

    @Transactional
    public CompanySettingsResponse updateCompanySettings(CompanySettingsRequest request, Long adminId) {
        CompanySettings settings = companySettingsRepository.findById(1L).orElse(new CompanySettings());
        
        if (settings.getId() == null) {
            settings.setId(1L); // Force singleton ID
        }

        settings.setCompanyName(request.getCompanyName());
        settings.setLegalName(request.getLegalName());
        settings.setGstin(request.getGstin());
        settings.setPan(request.getPan());
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
        settings.setSignatureUrl(request.getSignatureUrl());
        settings.setUpdatedBy(adminId);

        CompanySettings savedSettings = companySettingsRepository.save(settings);
        logActivity(adminId, "COMPANY_SETTINGS_UPDATED", savedSettings.getId(), "Updated company settings");

        return mapToResponse(savedSettings);
    }

    private CompanySettingsResponse mapToResponse(CompanySettings settings) {
        return CompanySettingsResponse.builder()
                .id(settings.getId())
                .companyName(settings.getCompanyName())
                .legalName(settings.getLegalName())
                .gstin(settings.getGstin())
                .pan(settings.getPan())
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
                .signatureUrl(settings.getSignatureUrl())
                .updatedBy(settings.getUpdatedBy())
                .createdAt(settings.getCreatedAt())
                .updatedAt(settings.getUpdatedAt())
                .build();
    }

    private void logActivity(Long adminId, String action, Long entityId, String description) {
        AdminActivity activity = AdminActivity.builder()
                .adminUserId(adminId)
                .action(action)
                .entityType("COMPANY_SETTINGS")
                .entityId(entityId)
                .description(description)
                .build();
        activityRepository.save(activity);
    }
}
