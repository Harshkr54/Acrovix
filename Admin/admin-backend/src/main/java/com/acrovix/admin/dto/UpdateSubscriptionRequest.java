package com.acrovix.admin.dto;

import com.acrovix.admin.entity.PlanTier;
import jakarta.validation.constraints.Min;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateSubscriptionRequest {

    private PlanTier planTier;

    @Min(value = 1, message = "Max seats must be at least 1")
    private Integer maxSeats;

    private Long maxStorageBytes;

    private LocalDateTime validUntil;
}
