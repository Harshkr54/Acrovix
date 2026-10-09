package com.acrovix.admin.dto.crm;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrmLeadImportPreviewRow {
    private int rowIndex;
    private Map<String, String> rowData;
    private String status; // "VALID", "INVALID", "DUPLICATE"
    private String fullName;
    private String businessEmail;
    private String companyName;
    private List<String> errors;
}
