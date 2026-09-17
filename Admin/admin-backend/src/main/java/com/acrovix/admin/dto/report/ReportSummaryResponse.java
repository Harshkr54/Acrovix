package com.acrovix.admin.dto.report;

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
public class ReportSummaryResponse {
    private long totalEnquiries;
    private long totalQuotations;
    private BigDecimal totalQuotationValue;
    private BigDecimal acceptedQuotationValue;
    private long totalPurchaseOrders;
    private BigDecimal totalPoValue;
    private long totalInvoices;
    private BigDecimal totalInvoiced;
    private BigDecimal totalReceived;
    private BigDecimal outstanding;
    private BigDecimal overdue;
    private LocalDate fromDate;
    private LocalDate toDate;
    private String preset;
}
