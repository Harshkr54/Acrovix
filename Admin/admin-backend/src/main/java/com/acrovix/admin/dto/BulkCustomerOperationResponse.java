package com.acrovix.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkCustomerOperationResponse {

    private int totalRequested;
    private int successCount;
    private int failureCount;
    private List<Long> successfulIds;
    private List<BulkFailureDetail> failures;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BulkFailureDetail {
        private Long customerId;
        private String reason;
    }
}
