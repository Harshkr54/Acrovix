package com.acrovix.admin.dto.crm;

import com.acrovix.admin.entity.FollowUpStatus;
import com.acrovix.admin.entity.FollowUpType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrmFollowUpResponse {
    private Long id;

    private Long leadId;
    private String leadNumber;
    private String leadName;
    private String companyName;

    private Long assignedToId;
    private String assignedToName;

    private FollowUpType type;
    private LocalDateTime scheduledAt;
    private LocalDateTime completedAt;
    private FollowUpStatus status;

    private String subject;
    private String notes;
    private String outcome;

    private Long createdById;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
