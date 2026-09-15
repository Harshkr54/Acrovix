package com.acrovix.admin.dto;

import com.acrovix.admin.entity.ProductServiceType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class ProductServiceResponse {
    private Long id;
    private String sku;
    private String name;
    private String description;
    private ProductServiceType type;
    private String hsnSac;
    private BigDecimal defaultRate;
    private BigDecimal defaultGstPercent;
    private String unit;
    private boolean active;
    private Long createdBy;
    private Long updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
