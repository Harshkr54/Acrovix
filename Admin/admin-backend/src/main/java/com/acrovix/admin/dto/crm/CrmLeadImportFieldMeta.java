package com.acrovix.admin.dto.crm;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrmLeadImportFieldMeta {
    private String key;
    private String label;
    private boolean required;
    private String description;
    private List<String> sampleValues;
}
