package com.acrovix.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanySettingsResponse {
    private Long id;
    private Long tenantId;
    private String companyName;
    private String legalName;
    private String brandName;
    private String gstin;
    private String pan;
    private String vatId;
    private String email;
    private String phone;
    private String website;
    private String registeredAddress;
    private String billingAddress;
    private String bankName;
    private String bankAccountNumber;
    private String bankIfsc;
    private String bankBranch;
    private String defaultPaymentTerms;
    private String defaultTermsAndConditions;
    private String logoUrl;
    private String faviconUrl;
    private String primaryColor;
    private String secondaryColor;
    private String currencyCode;
    private String currencySymbol;
    private String timezone;
    private String dateFormat;
    private String signatureUrl;
    private Long updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String vatNumber;
    private String taxIdentifier;
}
