package com.acrovix.admin.dto;

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
    private String clientName;
    private String clientCompany;
    private String clientEmail;
    private String clientPhone;
    private String termsAndConditions;
    private List<QuotationItemRequest> items;
}
