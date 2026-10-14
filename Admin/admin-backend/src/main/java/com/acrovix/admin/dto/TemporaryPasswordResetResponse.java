package com.acrovix.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TemporaryPasswordResetResponse {
    private String temporaryPassword;
    private String message;
    private String userEmail;
    private Long userId;
}
