package com.acrovix.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class TaxMasterRequest {

    @NotBlank(message = "Tax name is required")
    @Size(max = 100, message = "Tax name cannot exceed 100 characters")
    private String name;

    @NotNull(message = "GST percent is required")
    private BigDecimal gstPercent;

    private String description;
}
