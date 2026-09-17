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
public class PurchaseOrderReportResponse {
    private long totalPurchaseOrders;
    private long receivedCount;
    private long verifiedCount;
    private long partiallyFulfilledCount;
    private long fulfilledCount;
    private long cancelledCount;
    private BigDecimal totalPoValue;
    private BigDecimal verifiedPoValue;
}
