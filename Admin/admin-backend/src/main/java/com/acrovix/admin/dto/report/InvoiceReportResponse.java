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
public class InvoiceReportResponse {
    private long totalInvoices;
    private long draftCount;
    private long issuedCount;
    private long partiallyPaidCount;
    private long paidCount;
    private long overdueCount;
    private long cancelledCount;
    private BigDecimal totalInvoiced;
    private BigDecimal taxableValue;
    private BigDecimal taxAmount;
    private BigDecimal discountAmount;
    private BigDecimal amountReceived;
    private BigDecimal outstanding;
    private BigDecimal overdue;
}
