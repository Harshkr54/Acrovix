package com.acrovix.admin.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkCustomerStatusRequest {

    @NotEmpty(message = "Customer IDs list cannot be empty")
    private List<Long> customerIds;

    @NotNull(message = "Active status must be specified")
    private Boolean active;
}
