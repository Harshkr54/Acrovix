package com.acrovix.admin.dto.crm;

import com.acrovix.admin.entity.LeadStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrmPipelineResponse {
    private Map<LeadStatus, List<CrmLeadResponse>> pipeline;
}
