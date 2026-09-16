package com.acrovix.admin.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class InvoiceItemResponse {
    private Long id;
    private Long productServiceId;
    private String sku;
    private String description;
    private String hsnSac;
    private BigDecimal quantity;
    private String unit;
    private BigDecimal listPrice;
    private BigDecimal unitPrice;
    private BigDecimal discountPercent;
    private BigDecimal taxPercent;
    private BigDecimal taxableAmount;
    private BigDecimal cgstAmount;
    private BigDecimal sgstAmount;
    private BigDecimal igstAmount;
    private BigDecimal taxAmount;
    private BigDecimal lineTotal;
    private Integer sortOrder;
}
