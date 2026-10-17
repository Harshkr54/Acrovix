package com.acrovix.admin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthRequest {
    
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;
    
    @NotBlank(message = "Password is required")
    private String password;

    private String tenantSlug;
    private String workspaceSlug;
    private String companyId;

    public AuthRequest(String email, String password) {
        this.email = email;
        this.password = password;
    }

    public String getEffectiveSlug() {
        if (workspaceSlug != null && !workspaceSlug.isBlank()) return workspaceSlug.trim().toLowerCase();
        if (tenantSlug != null && !tenantSlug.isBlank()) return tenantSlug.trim().toLowerCase();
        if (companyId != null && !companyId.isBlank()) return companyId.trim().toLowerCase();
        return null;
    }
}
