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
    private Map<String, String> rowData; // Raw unmodified values
    private Map<String, String> normalizedData; // Cleaned/normalized values
    private String status; // "VALID", "INVALID", "DUPLICATE", "POSSIBLE_DUPLICATE"
    private String fullName;
    private String businessEmail;
    private String companyName;
    private String phoneNumber;
    private List<String> errors;
    private List<String> warnings;
    private Map<String, String> unmappedDomainData;
    private boolean isServerDuplicate;
    private boolean isPossibleDuplicate;
    private String duplicateReason;
    @Builder.Default
    private boolean included = true;
}
