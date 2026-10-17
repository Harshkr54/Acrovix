package com.acrovix.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CompanySettingsRequest {
    @NotBlank(message = "Company name is required")
    @Size(max = 150, message = "Company name cannot exceed 150 characters")
    private String companyName;

    @NotBlank(message = "Legal name is required")
    @Size(max = 150, message = "Legal name cannot exceed 150 characters")
    private String legalName;

    @Size(max = 150, message = "Brand name cannot exceed 150 characters")
    private String brandName;

    @Size(max = 50, message = "GSTIN cannot exceed 50 characters")
    private String gstin;

    @Size(max = 50, message = "PAN cannot exceed 50 characters")
    private String pan;

    @Size(max = 50, message = "VAT ID cannot exceed 50 characters")
    private String vatId;

    @NotBlank(message = "Email is required")
    @Size(max = 150, message = "Email cannot exceed 150 characters")
    private String email;

    @NotBlank(message = "Phone is required")
    @Size(max = 50, message = "Phone cannot exceed 50 characters")
    private String phone;

    @Size(max = 150, message = "Website cannot exceed 150 characters")
    private String website;

    private String registeredAddress;
    private String billingAddress;

    @Size(max = 100, message = "Bank name cannot exceed 100 characters")
    private String bankName;

    @Size(max = 50, message = "Bank account number cannot exceed 50 characters")
    private String bankAccountNumber;

    @Size(max = 20, message = "Bank IFSC cannot exceed 20 characters")
    private String bankIfsc;

    @Size(max = 100, message = "Bank branch cannot exceed 100 characters")
    private String bankBranch;

    private String defaultPaymentTerms;
    private String defaultTermsAndConditions;

    @Size(max = 255, message = "Logo URL cannot exceed 255 characters")
    private String logoUrl;

    @Size(max = 255, message = "Favicon URL cannot exceed 255 characters")
    private String faviconUrl;

    @Size(max = 50, message = "Primary color cannot exceed 50 characters")
    private String primaryColor;

    @Size(max = 50, message = "Secondary color cannot exceed 50 characters")
    private String secondaryColor;

    @Size(max = 10, message = "Currency code cannot exceed 10 characters")
    private String currencyCode;

    @Size(max = 10, message = "Currency symbol cannot exceed 10 characters")
    private String currencySymbol;

    @Size(max = 50, message = "Timezone cannot exceed 50 characters")
    private String timezone;

    @Size(max = 30, message = "Date format cannot exceed 30 characters")
    private String dateFormat;

    @Size(max = 255, message = "Signature URL cannot exceed 255 characters")
    private String signatureUrl;
}
