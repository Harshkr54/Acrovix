package com.acrovix.admin.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PublicQuotationAcceptRequest {

    @NotBlank(message = "Signer name is required")
    private String signerName;

    private String signatureData;

    private String signerNotes;
}
