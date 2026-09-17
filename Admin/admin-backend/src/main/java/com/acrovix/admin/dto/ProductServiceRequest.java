package com.acrovix.admin.dto;

import com.acrovix.admin.entity.Currency;
import com.acrovix.admin.entity.ProductServiceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ProductServiceRequest {
    private Currency currency;
    
    @NotBlank(message = "SKU is required")
    @Size(max = 100, message = "SKU cannot exceed 100 characters")
    private String sku;

    @NotBlank(message = "Name is required")
    @Size(max = 200, message = "Name cannot exceed 200 characters")
    private String name;

    private String description;

    @NotNull(message = "Type is required")
    private ProductServiceType type;

    @Size(max = 50, message = "HSN/SAC cannot exceed 50 characters")
    private String hsnSac;

    private BigDecimal defaultRate;

    private BigDecimal defaultGstPercent;

    @Size(max = 50, message = "Unit cannot exceed 50 characters")
    private String unit;
}
