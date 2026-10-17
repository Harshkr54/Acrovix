package com.acrovix.admin.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "tenant_subscriptions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TenantSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false, unique = true)
    private Tenant tenant;

    @Enumerated(EnumType.STRING)
    @Column(name = "plan_tier", nullable = false, length = 50)
    @Builder.Default
    private PlanTier planTier = PlanTier.STARTER;

    @Column(name = "max_seats", nullable = false)
    @Builder.Default
    private Integer maxSeats = 5;

    @Column(name = "max_storage_bytes", nullable = false)
    @Builder.Default
    private Long maxStorageBytes = 5368709120L; // 5 GB default

    @Column(name = "valid_until")
    private LocalDateTime validUntil;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onPersistOrUpdate() {
        this.updatedAt = LocalDateTime.now();
        if (this.planTier == null) {
            this.planTier = PlanTier.STARTER;
        }
        if (this.maxSeats == null) {
            this.maxSeats = 5;
        }
        if (this.maxStorageBytes == null) {
            this.maxStorageBytes = 5368709120L;
        }
    }
}
