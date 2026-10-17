package com.acrovix.admin.dto;

import com.acrovix.admin.entity.PlanTier;
import com.acrovix.admin.entity.TenantStatus;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantDetailResponse {

    private Long id;
    private String slug;
    private String companyName;
    private String customDomain;
    private TenantStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private Long activeUserCount;
    private Long totalUserCount;

    private SubscriptionDetail subscription;
    private CompanySettingsResponse companySettings;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubscriptionDetail {
        private Long id;
        private PlanTier planTier;
        private Integer maxSeats;
        private Long maxStorageBytes;
        private LocalDateTime validUntil;
        private LocalDateTime updatedAt;
    }
}
