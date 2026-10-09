package com.acrovix.admin.dto.crm;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrmLeadImportRowError {
    private int rowIndex;
    private String fullName;
    private String businessEmail;
    private String errorMessage;
}
