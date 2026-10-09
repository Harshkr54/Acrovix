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
public class CrmLeadImportResultResponse {
    private int totalProcessed;
    private int successCount;
    private int duplicateCount;
    private int errorCount;
    private List<CrmLeadImportRowError> errors;
}
