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
    private long totalLeads;
    private long totalOpenLeads;
    private long newLeads;
    private long qualifiedLeads;
    private long proposalCount;
    private long negotiationCount;
    private long wonCount;
    private long lostCount;
    private long staleOpportunitiesCount;

    private BigDecimal openPipelineValue;
    private BigDecimal wonValue;
    private BigDecimal invoicedRevenue;
    private BigDecimal collectedRevenue;
    private double winRatePercent;

    private Map<Currency, BigDecimal> openPipelineValueByCurrency;
    private Map<Currency, BigDecimal> wonValueByCurrency;

    private long followUpsDueToday;
    private long overdueFollowUps;
    private long upcomingFollowUpsCount;

    private Map<String, Long> statusBreakdown;
}
