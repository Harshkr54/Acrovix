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
public class CrmLeadImportPreviewResponse {
    private String fileName;
    private long fileSize;
    private int totalRows;
    private int validCount;
    private int invalidCount;
    private int duplicateCount;
    private List<String> fileHeaders;
    private Map<String, String> suggestedMapping; // fileHeader -> crmFieldKey
    private List<CrmLeadImportFieldMeta> supportedFields;
    private List<CrmLeadImportPreviewRow> previewRows;
}
