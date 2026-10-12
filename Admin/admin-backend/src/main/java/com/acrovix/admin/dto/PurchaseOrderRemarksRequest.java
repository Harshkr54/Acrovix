package com.acrovix.admin.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseOrderRemarksRequest {
    @Size(max = 2000, message = "Remarks cannot exceed 2000 characters")
    private String remarks;
}
