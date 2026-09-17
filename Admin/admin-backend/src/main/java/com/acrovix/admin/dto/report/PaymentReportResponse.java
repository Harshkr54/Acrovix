package com.acrovix.admin.dto.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentReportResponse {
    private long totalPayments;
    private BigDecimal totalReceived;
    private List<PaymentMethodSummary> methodBreakdown;
}
