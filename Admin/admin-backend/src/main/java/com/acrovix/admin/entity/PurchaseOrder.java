package com.acrovix.admin.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "purchase_orders", indexes = {
    @Index(name = "idx_po_number", columnList = "po_number"),
    @Index(name = "idx_po_client_po_number", columnList = "client_po_number"),
    @Index(name = "idx_po_status", columnList = "status"),
    @Index(name = "idx_po_quotation_id", columnList = "quotation_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseOrder extends TenantAwareEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "po_number", unique = true, nullable = false, length = 50)
    private String poNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quotation_id", nullable = false)
    private Quotation quotation;

    @Column(name = "client_po_number", length = 100)
    private String clientPoNumber;

    @Column(name = "po_date", nullable = false)
    private LocalDate poDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "currency", length = 10)
    @Builder.Default
    private Currency currency = Currency.INR;

    @Column(name = "po_value", nullable = false, precision = 12, scale = 2)
    private BigDecimal poValue;

    public Currency getCurrency() {
        return currency != null ? currency : Currency.INR;
    }

    @Column(name = "po_document_url")
    private String poDocumentUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "received_via", length = 50)
    private PurchaseOrderReceivedVia receivedVia;

    @Column(name = "delivery_address", columnDefinition = "TEXT")
    private String deliveryAddress;

    @Column(name = "delivery_contact_name", length = 150)
    private String deliveryContactName;

    @Column(name = "delivery_contact_phone", length = 50)
    private String deliveryContactPhone;

    @Column(name = "delivery_destination_type", length = 50)
    private String deliveryDestinationType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "verified_by")
    private AdminUser verifiedBy;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    @Builder.Default
    private PurchaseOrderStatus status = PurchaseOrderStatus.RECEIVED;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private AdminUser createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
