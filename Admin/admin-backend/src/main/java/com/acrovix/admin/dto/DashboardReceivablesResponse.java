package com.acrovix.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardReceivablesResponse {

    private BigDecimal totalInvoiced;
    private BigDecimal totalReceived;
    private BigDecimal outstandingAmount;
    private BigDecimal overdueAmount;
}
