package com.acrovix.admin.dto.crm;

import com.acrovix.admin.entity.LeadPriority;
import com.acrovix.admin.entity.LeadSource;
import com.acrovix.admin.entity.LeadStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrmLeadRequest {
    private Long enquiryId;
    private Long customerId;

    @NotBlank(message = "Full name is required")
    private String fullName;

    private String companyName;

    @NotBlank(message = "Business email is required")
    @Email(message = "Invalid email format")
    private String businessEmail;

    private String phoneNumber;
    private String industrySector;
    private String serviceRequired;

    private LeadStatus status;
    private LeadPriority priority;
    private LeadSource leadSource;
    private Long assignedToId;

    private BigDecimal estimatedValue;
    private LocalDate expectedClosingDate;
    private Integer probability;
    private String notes;
}
