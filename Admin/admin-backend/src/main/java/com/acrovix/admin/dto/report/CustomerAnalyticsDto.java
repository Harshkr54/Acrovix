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
public class CustomerAnalyticsDto {
    private Long customerId;
    private String customerName;
    private String customerCode;
    private String companyName;
    private long quotationCount;
    private long acceptedQuotationCount;
    private BigDecimal poValue;
    private BigDecimal invoicedValue;
    private BigDecimal receivedAmount;
    private BigDecimal outstandingAmount;
    private BigDecimal overdueAmount;
}
