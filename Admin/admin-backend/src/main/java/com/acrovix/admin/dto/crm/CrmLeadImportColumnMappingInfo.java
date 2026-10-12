package com.acrovix.admin.dto.crm;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrmLeadImportColumnMappingInfo {
    private String sourceColumn;
    private String suggestedField;
    private String sampleValue;
    private String confidence; // "HIGH", "MEDIUM", "DOMAIN_FIELD", "UNMAPPED"
    private int confidenceScore; // 0 - 100
    private boolean domainSpecific;
    private String description;
}
