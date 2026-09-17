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
public class MonthlyTrendDto {
    private String month;
    private BigDecimal quotationValue;
    private BigDecimal invoiceValue;
    private BigDecimal paymentValue;
}
