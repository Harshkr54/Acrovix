package com.acrovix.admin.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "company_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanySettings extends TenantAwareEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_name", nullable = false, length = 150)
    private String companyName;

    @Column(name = "legal_name", nullable = false, length = 150)
    private String legalName;

    @Column(name = "brand_name", length = 150)
    private String brandName;

    @Column(length = 50)
    private String gstin;

    @Column(length = 50)
    private String pan;

    @Column(name = "vat_id", length = 50)
    private String vatId;

    @Column(nullable = false, length = 150)
    private String email;

    @Column(nullable = false, length = 50)
    private String phone;

    @Column(length = 150)
    private String website;

    @Column(name = "registered_address", columnDefinition = "TEXT")
    private String registeredAddress;

    @Column(length = 100)
    private String state;

    @Column(name = "billing_address", columnDefinition = "TEXT")
    private String billingAddress;

    @Column(name = "bank_name", length = 100)
    private String bankName;

    @Column(name = "bank_account_number", length = 50)
    private String bankAccountNumber;

    @Column(name = "bank_ifsc", length = 20)
    private String bankIfsc;

    @Column(name = "bank_branch", length = 100)
    private String bankBranch;

    @Column(name = "default_payment_terms", columnDefinition = "TEXT")
    private String defaultPaymentTerms;

    @Column(name = "default_terms_and_conditions", columnDefinition = "TEXT")
    private String defaultTermsAndConditions;

    @Column(name = "logo_url", length = 255)
    private String logoUrl;

    @Column(name = "favicon_url", length = 255)
    private String faviconUrl;

    @Builder.Default
    @Column(name = "primary_color", length = 50)
    private String primaryColor = "#2563EB";

    @Builder.Default
    @Column(name = "secondary_color", length = 50)
    private String secondaryColor = "#1E40AF";

    @Builder.Default
    @Column(name = "currency_code", length = 10)
    private String currencyCode = "INR";

    @Builder.Default
    @Column(name = "currency_symbol", length = 10)
    private String currencySymbol = "₹";

    @Builder.Default
    @Column(name = "timezone", length = 50)
    private String timezone = "Asia/Kolkata";

    @Builder.Default
    @Column(name = "date_format", length = 30)
    private String dateFormat = "YYYY-MM-DD";

    @Column(name = "signature_url", length = 255)
    private String signatureUrl;

    @Column(name = "updated_by")
    private Long updatedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.primaryColor == null) this.primaryColor = "#2563EB";
        if (this.secondaryColor == null) this.secondaryColor = "#1E40AF";
        if (this.currencyCode == null) this.currencyCode = "INR";
        if (this.currencySymbol == null) this.currencySymbol = "₹";
        if (this.timezone == null) this.timezone = "Asia/Kolkata";
        if (this.dateFormat == null) this.dateFormat = "YYYY-MM-DD";
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
