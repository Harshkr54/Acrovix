package com.acrovix.admin.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "crm_leads", indexes = {
    @Index(name = "idx_crm_lead_number", columnList = "lead_number"),
    @Index(name = "idx_crm_lead_status", columnList = "status"),
    @Index(name = "idx_crm_lead_assigned", columnList = "assigned_to"),
    @Index(name = "idx_crm_lead_enquiry", columnList = "enquiry_id"),
    @Index(name = "idx_crm_lead_customer", columnList = "customer_id"),
    @Index(name = "idx_crm_lead_next_followup", columnList = "next_follow_up_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CrmLead {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lead_number", unique = true, nullable = false, length = 50)
    private String leadNumber;

    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enquiry_id")
    private AdminEnquiry enquiry;

    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(name = "company_name", length = 150)
    private String companyName;

    @Column(name = "business_email", nullable = false, length = 150)
    private String businessEmail;

    @Column(name = "phone_number", length = 50)
    private String phoneNumber;

    @Column(name = "industry_sector", length = 100)
    private String industrySector;

    @Column(name = "service_required", length = 100)
    private String serviceRequired;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private LeadStatus status = LeadStatus.NEW;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private LeadPriority priority = LeadPriority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(name = "lead_source", length = 30)
    private LeadSource leadSource;

    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to")
    private AdminUser assignedTo;

    @Column(name = "estimated_value", precision = 12, scale = 2)
    private BigDecimal estimatedValue;

    @Column(name = "expected_closing_date")
    private LocalDate expectedClosingDate;

    @Column(name = "probability")
    private Integer probability;

    @Column(name = "next_follow_up_date")
    private LocalDateTime nextFollowUpDate;

    @Column(name = "lost_reason", columnDefinition = "TEXT")
    private String lostReason;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private AdminUser createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = LeadStatus.NEW;
        }
        if (this.priority == null) {
            this.priority = LeadPriority.MEDIUM;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
