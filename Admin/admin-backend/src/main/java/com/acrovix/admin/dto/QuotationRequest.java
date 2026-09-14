package com.acrovix.admin.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class QuotationRequest {
    private Long enquiryId;
    
    @NotBlank(message = "Client name is required")
    private String clientName;
    
    private String clientCompany;
    
    @Email(message = "Invalid email format")
    private String clientEmail;
    
    private String clientPhone;
    private com.acrovix.admin.entity.QuotationSource quotationSource;
    private String sourceNotes;
    private String termsAndConditions;
    
    @Valid
    private List<QuotationItemRequest> items;

    @Valid
    private List<QuotationColumnConfigRequest> columnConfigs;
}
