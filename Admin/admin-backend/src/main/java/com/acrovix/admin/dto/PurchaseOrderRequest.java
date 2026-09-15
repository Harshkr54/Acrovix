package com.acrovix.admin.dto;

import com.acrovix.admin.entity.PurchaseOrderReceivedVia;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class PurchaseOrderRequest {
    
    @NotNull(message = "Quotation ID is required")
    private Long quotationId;

    private String clientPoNumber;

    @NotNull(message = "PO Date is required")
    private LocalDate poDate;

    @NotNull(message = "PO Value is required")
    @Positive(message = "PO Value must be positive")
    private BigDecimal poValue;

    private String poDocumentUrl;

    private PurchaseOrderReceivedVia receivedVia;

    private String remarks;
}
