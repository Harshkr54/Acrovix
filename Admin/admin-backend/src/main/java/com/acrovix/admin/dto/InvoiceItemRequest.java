package com.acrovix.admin.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.Map;

@Data
public class InvoiceItemRequest {
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
    private Integer sortOrder;
}
