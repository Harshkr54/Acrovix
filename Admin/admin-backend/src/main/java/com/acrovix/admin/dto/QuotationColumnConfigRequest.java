package com.acrovix.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class QuotationColumnConfigRequest {
    private Long id;
    
    @NotBlank(message = "Column key is required")
    private String columnKey;

    @NotBlank(message = "Display name is required")
    private String displayName;

    @NotBlank(message = "Column type is required")
    private String columnType;

    @NotNull(message = "Visibility flag is required")
    private Boolean visible;

    @NotNull(message = "Sort order is required")
    private Integer sortOrder;

    @NotNull(message = "isCustom flag is required")
    private Boolean isCustom;
}
