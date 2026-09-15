package com.acrovix.admin.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class CompanySettingsResponse {
    private Long id;
    private String companyName;
    private String legalName;
    private String gstin;
    private String pan;
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
    private String signatureUrl;
    private Long updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
