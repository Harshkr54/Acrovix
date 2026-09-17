package com.acrovix.admin.dto.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuotationReportResponse {
    private long totalQuotations;
    private long draftCount;
    private long sentCount;
    private long acceptedCount;
    private long rejectedCount;
    private long revisedCount;
    private long convertedCount;
    private BigDecimal totalQuotationValue;
    private BigDecimal acceptedQuotationValue;
    private BigDecimal rejectedQuotationValue;
}
