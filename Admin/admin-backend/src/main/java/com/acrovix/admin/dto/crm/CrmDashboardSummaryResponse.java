package com.acrovix.admin.dto.crm;

import com.acrovix.admin.entity.Currency;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrmDashboardSummaryResponse {
    private long totalOpenLeads;
    private long newLeads;
    private long qualifiedLeads;
    private long proposalCount;
    private long negotiationCount;
    private long wonCount;
    private long lostCount;

    private BigDecimal openPipelineValue;
    private BigDecimal wonValue;

    private Map<Currency, BigDecimal> openPipelineValueByCurrency;
    private Map<Currency, BigDecimal> wonValueByCurrency;

    private long followUpsDueToday;
    private long overdueFollowUps;

    private Map<String, Long> statusBreakdown;
}
