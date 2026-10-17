package com.acrovix.admin.dto;

import com.acrovix.admin.entity.PlanTier;
import com.acrovix.admin.entity.Role;
import com.acrovix.admin.entity.TenantStatus;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantProvisionResponse {

    private Long tenantId;
    private String slug;
    private String companyName;
    private String customDomain;
    private TenantStatus status;
    private LocalDateTime createdAt;

    private SubscriptionInfo subscription;
    private AdminUserInfo adminUser;
    private SettingsInfo settings;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubscriptionInfo {
        private Long id;
        private PlanTier planTier;
        private Integer maxSeats;
        private Long maxStorageBytes;
        private LocalDateTime validUntil;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdminUserInfo {
        private Long id;
        private String name;
        private String email;
        private Role role;
        private Long tenantId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SettingsInfo {
        private Long id;
        private String companyName;
        private String email;
        private String currencyCode;
    }
}
