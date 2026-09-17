package com.acrovix.admin.dto;

import com.acrovix.admin.entity.Currency;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceivableSummaryResponse {

    private Long customerId;
    private String customerCode;
    private String customerName;
    private String companyName;
    private Currency currency;

    private BigDecimal totalInvoiced;
    private BigDecimal totalReceived;
    private BigDecimal outstandingAmount;
    private BigDecimal overdueAmount;
    private LocalDate oldestDueDate;
}
