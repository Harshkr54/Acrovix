package com.acrovix.admin.dto.crm;

import com.acrovix.admin.entity.LeadStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrmLeadStatusUpdateRequest {
    @NotNull(message = "Status is required")
    private LeadStatus status;

    private String lostReason;
}
