package com.acrovix.admin.dto.crm;

import com.acrovix.admin.entity.LeadPriority;
import com.acrovix.admin.entity.LeadSource;
import com.acrovix.admin.entity.LeadStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrmLeadResponse {
    private Long id;
    private String leadNumber;

    private Long enquiryId;
    private String enquiryReferenceId;

    private Long customerId;
    private String customerCode;
    private String customerName;

    private String fullName;
    private String companyName;
    private String businessEmail;
    private String phoneNumber;
    private String industrySector;
    private String serviceRequired;

    private LeadStatus status;
    private LeadPriority priority;
    private LeadSource leadSource;

    private Long assignedToId;
    private String assignedToName;

    private BigDecimal estimatedValue;
    private LocalDate expectedClosingDate;
    private Integer probability;
    private LocalDateTime nextFollowUpDate;
    private String lostReason;
    private String notes;

    private Long createdById;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
