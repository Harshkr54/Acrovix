package com.acrovix.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "enquiries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Enquiry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reference_id", length = 30,unique = true)
    private String referenceId;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(name = "business_email", nullable = false, length = 150)
    private String businessEmail;

    @Column(name = "company_name", nullable = false, length = 150)
    private String companyName;

    @Column(name = "phone_number", nullable = false, length = 50)
    private String phoneNumber;

    @Column(name = "project_requirement", nullable = false, columnDefinition = "TEXT")
    private String projectRequirement;

    @Column(name = "industry_sector", length = 100)
    private String industrySector;

    @Column(name = "service_required", length = 100)
    private String serviceRequired;

    @Column(name = "preferred_contact_method", length = 50)
    private String preferredContactMethod;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
