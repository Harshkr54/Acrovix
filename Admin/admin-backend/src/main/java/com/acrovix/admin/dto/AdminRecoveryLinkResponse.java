package com.acrovix.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminRecoveryLinkResponse {
    private String status;
    private String deliveryStatus;
    private String message;
    private String recipientEmail;
}
