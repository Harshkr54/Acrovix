package com.acrovix.admin.dto;

import com.acrovix.admin.entity.PurchaseOrderStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PurchaseOrderStatusRequest {
    @NotNull(message = "Status is required")
    private PurchaseOrderStatus status;
    private String remarks;
}
