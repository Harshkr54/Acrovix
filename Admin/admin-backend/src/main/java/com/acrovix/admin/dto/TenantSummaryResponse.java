package com.acrovix.admin.dto;

import com.acrovix.admin.entity.PlanTier;
import com.acrovix.admin.entity.TenantStatus;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantSummaryResponse {

    private Long id;
    private String slug;
    private String companyName;
    private String customDomain;
    private TenantStatus status;
    private PlanTier planTier;
    private Integer maxSeats;
    private Long activeUserCount;
    private LocalDateTime validUntil;
    private LocalDateTime createdAt;
}
