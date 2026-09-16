package com.acrovix.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class QuotationStatusUpdateRequest {
    @NotBlank(message = "Status is required")
    private String status;

    private com.acrovix.admin.entity.QuotationResponseSource responseSource;
    private String responseNotes;
}
