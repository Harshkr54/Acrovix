package com.acrovix.admin.dto;

import com.acrovix.admin.entity.PurchaseOrderReceivedVia;
import com.acrovix.admin.entity.PurchaseOrderStatus;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class PurchaseOrderResponse {
    private Long id;
    private String poNumber;
    private Long quotationId;
    private String quotationNumber;
    private String clientName;
    private String clientCompany;
    private BigDecimal quotationValue;
    
    private String clientPoNumber;
    private LocalDate poDate;
    private BigDecimal poValue;
    
    private boolean valueMismatch;
    private BigDecimal difference;

    private String poDocumentUrl;
    private PurchaseOrderReceivedVia receivedVia;
    private String remarks;
    private PurchaseOrderStatus status;
    
    private AdminUserResponse verifiedBy;
    private LocalDateTime verifiedAt;
    
    private AdminUserResponse createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
