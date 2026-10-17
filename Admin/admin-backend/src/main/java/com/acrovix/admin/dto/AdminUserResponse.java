package com.acrovix.admin.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class AdminUserResponse {
    private Long id;
    private String name;
    private String email;
    private String role;
    private boolean enabled;
    private boolean mustChangePassword;
    private Long tenantId;
    private LocalDateTime createdAt;
    private LocalDateTime lastLogin;
}
