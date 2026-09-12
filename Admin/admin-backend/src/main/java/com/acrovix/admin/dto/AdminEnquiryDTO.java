package com.acrovix.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AdminEnquiryDTO {
    private Long id;
    private String referenceId;
    private String fullName;
    private String businessEmail;
    private String companyName;
    private String phoneNumber;
    private String projectRequirement;
    private String status;
    private String notes;
    private String assignedToName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
