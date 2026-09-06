package com.acrovix.backend.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnquiryRequest {

    @NotBlank(message = "Full name is required")
    @Size(max = 150, message = "Full name must not exceed 150 characters")
    @JsonAlias({"name", "fullName"})
    private String fullName;

    @NotBlank(message = "Business email is required")
    @Email(message = "Enter a valid business email")
    @Size(max = 150, message = "Business email must not exceed 150 characters")
    @JsonAlias({"email", "businessEmail"})
    private String businessEmail;

    @NotBlank(message = "Company / Organization name is required")
    @Size(max = 150, message = "Company name must not exceed 150 characters")
    @JsonAlias({"company", "companyName"})
    private String companyName;

    @NotBlank(message = "Phone number is required")
    @Size(max = 50, message = "Phone number must not exceed 50 characters")
    @JsonAlias({"phone", "phoneNumber"})
    private String phoneNumber;

    @NotBlank(message = "Project / Business Requirement is required")
    @Size(max = 5000, message = "Project requirement must not exceed 5000 characters")
    @JsonAlias({"requirement", "projectRequirement"})
    private String projectRequirement;

    @Size(max = 100, message = "Industry sector must not exceed 100 characters")
    @JsonAlias({"industry", "industrySector"})
    private String industrySector;

    @Size(max = 100, message = "Service required must not exceed 100 characters")
    @JsonAlias({"service", "serviceRequired"})
    private String serviceRequired;

    @Size(max = 50, message = "Preferred contact method must not exceed 50 characters")
    private String preferredContactMethod;
}
