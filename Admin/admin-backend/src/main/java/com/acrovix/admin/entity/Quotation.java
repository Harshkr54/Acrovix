package com.acrovix.admin.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "quotations", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"base_quotation_id", "version"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Quotation extends TenantAwareEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "quotation_number", unique = true, nullable = false, length = 50)
    private String quotationNumber;

    @Column(nullable = false, columnDefinition = "INTEGER DEFAULT 0")
    @Builder.Default
    private Integer version = 0;

    @Column(name = "base_quotation_id")
    private Long baseQuotationId;

    @Column(name = "parent_quotation_id")
    private Long parentQuotationId;

    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enquiry_id")
    private AdminEnquiry enquiry;

    @Column(name = "client_name", nullable = false, length = 150)
    private String clientName;

    @Column(name = "client_company", length = 150)
    private String clientCompany;

    @Column(name = "client_email", nullable = false, length = 150)
    private String clientEmail;

    @Column(name = "client_phone", length = 50)
    private String clientPhone;

    @Enumerated(EnumType.STRING)
    @Column(name = "quotation_source", length = 50)
    private QuotationSource quotationSource;

    @Column(name = "source_notes", columnDefinition = "TEXT")
    private String sourceNotes;

    @Enumerated(EnumType.STRING)
    @Column(name = "response_source", length = 50)
    private QuotationResponseSource responseSource;

    @Column(name = "response_notes", columnDefinition = "TEXT")
    private String responseNotes;

    @Column(name = "client_token", unique = true, length = 64)
    private String clientToken;

    @Column(name = "public_token", unique = true, length = 64)
    private String publicToken;

    @Column(name = "signed_at")
    private LocalDateTime signedAt;

    @Column(name = "signer_name", length = 150)
    private String signerName;

    @Column(name = "signer_ip", length = 64)
    private String signerIp;

    @Column(name = "signature_data", columnDefinition = "TEXT")
    private String signatureData;

    @Column(name = "signer_notes", columnDefinition = "TEXT")
    private String signerNotes;

    public LocalDateTime getAcceptedAt() {
        return this.signedAt;
    }

    public void setAcceptedAt(LocalDateTime acceptedAt) {
        this.signedAt = acceptedAt;
    }

    public String getAcceptedByName() {
        return this.signerName;
    }

    public void setAcceptedByName(String acceptedByName) {
        this.signerName = acceptedByName;
    }

    public String getAcceptedByIp() {
        return this.signerIp;
    }

    public void setAcceptedByIp(String acceptedByIp) {
        this.signerIp = acceptedByIp;
    }

    @Column(nullable = false, length = 50)
    private String status = "DRAFT"; // DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED

    @Enumerated(EnumType.STRING)
    @Column(name = "currency", length = 10)
    @Builder.Default
    private Currency currency = Currency.INR;

    @Column(precision = 12, scale = 2)
    private BigDecimal subtotal;

    public Currency getCurrency() {
        return currency != null ? currency : Currency.INR;
    }

    @Column(name = "discount_amount", precision = 12, scale = 2)
    private BigDecimal discountAmount;

    @Column(name = "tax_amount", precision = 12, scale = 2)
    private BigDecimal taxAmount;

    @Column(name = "grand_total", precision = 12, scale = 2)
    private BigDecimal grandTotal;

    @Column(name = "valid_until")
    private LocalDate validUntil;

    @Column(name = "terms_and_conditions", columnDefinition = "TEXT")
    private String termsAndConditions;

    @Column(name = "bank_name", length = 100)
    private String bankName;

    @Column(name = "bank_account_holder", length = 150)
    private String bankAccountHolder;

    @Column(name = "bank_account_number", length = 50)
    private String bankAccountNumber;

    @Column(name = "bank_ifsc", length = 20)
    private String bankIfsc;

    @Column(name = "bank_branch", length = 100)
    private String bankBranch;

    @Column(name = "company_bank_account_id")
    private Long companyBankAccountId;

    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private AdminUser createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @OneToMany(mappedBy = "quotation", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<QuotationItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "quotation", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<QuotationColumnConfig> columnConfigs = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.publicToken == null) {
            this.publicToken = java.util.UUID.randomUUID().toString().replace("-", "");
        }
        if (this.clientToken == null) {
            this.clientToken = this.publicToken;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
