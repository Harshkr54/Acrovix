package com.acrovix.admin.dto;

import com.acrovix.admin.entity.PlanTier;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantProvisionRequest {

    @NotBlank(message = "Company name is required")
    @Size(min = 2, max = 150, message = "Company name must be between 2 and 150 characters")
    private String companyName;

    @NotBlank(message = "Slug is required")
    @Size(min = 2, max = 100, message = "Slug must be between 2 and 100 characters")
    @Pattern(regexp = "^[a-z0-9-]+$", message = "Slug must contain only lowercase alphanumeric characters and hyphens")
    private String slug;

    @NotBlank(message = "Admin email is required")
    @Email(message = "Admin email must be a valid email address")
    @Size(max = 150, message = "Admin email cannot exceed 150 characters")
    private String adminEmail;

    @NotBlank(message = "Admin password is required")
    @Size(min = 6, max = 100, message = "Admin password must be at least 6 characters")
    private String adminPassword;

    private String adminFullName;

    private String adminName;

    private PlanTier planTier; // Defaults to STARTER or TRIAL if null

    private String customDomain;

    private String phone;
}
