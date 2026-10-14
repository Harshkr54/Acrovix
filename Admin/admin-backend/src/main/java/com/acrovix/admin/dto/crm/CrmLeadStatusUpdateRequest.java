package com.acrovix.admin.dto.crm;

import com.acrovix.admin.entity.LeadStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrmLeadStatusUpdateRequest {

    @NotNull(message = "Status is required")
    private LeadStatus status;

    private String lostReason;

    // Backward-compatible constructors
    public CrmLeadStatusUpdateRequest(LeadStatus status) {
        this.status = status;
    }

    public CrmLeadStatusUpdateRequest(LeadStatus status, String lostReason) {
        this.status = status;
        this.lostReason = lostReason;
    }

    // Stage-aware workflow fields (additive and backward compatible)
    private String notes;
    private String interactionType;
    private String subject;
    private String customerResponse;
    private String outcome;
    private String nextAction;
    private LocalDateTime nextFollowUpDate;
    private BigDecimal estimatedValue;
    private LocalDate expectedClosingDate;
    private Integer probability;
    private String serviceRequired;
    private String industrySector;
    private Long quotationId;
    private String competitor;
}
