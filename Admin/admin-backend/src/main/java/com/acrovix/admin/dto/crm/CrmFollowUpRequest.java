package com.acrovix.admin.dto.crm;

import com.acrovix.admin.entity.FollowUpType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrmFollowUpRequest {
    @NotNull(message = "Follow-up type is required")
    private FollowUpType type;

    @NotNull(message = "Scheduled date & time is required")
    private LocalDateTime scheduledAt;

    @NotBlank(message = "Subject is required")
    private String subject;

    private Long assignedToId;
    private String notes;
    private String outcome;
}
