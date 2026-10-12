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
public class CrmLeadImportExportRequest {
    private String format; // "CSV" or "XLSX"
    private List<CrmLeadRequest> records;
    private List<CrmLeadImportPreviewRow> previewRows;
}
