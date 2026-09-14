package com.acrovix.admin.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Data
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
public class QuotationPreviewRequest extends QuotationRequest {
    private Long quotationId;
}
