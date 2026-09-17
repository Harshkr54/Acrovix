package com.acrovix.admin.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PaymentCancelRequest {

    @NotBlank(message = "Cancellation reason is required")
    private String reason;
}
