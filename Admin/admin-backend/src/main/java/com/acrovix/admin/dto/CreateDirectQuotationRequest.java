package com.acrovix.admin.dto;

import com.acrovix.admin.entity.Currency;
import com.acrovix.admin.entity.QuotationSource;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CreateDirectQuotationRequest {

    @NotBlank(message = "Client name is required")
    private String clientName;

    private String clientCompany;

    @NotBlank(message = "Client email is required")
    @Email(message = "Invalid email format")
    private String clientEmail;

    private String clientPhone;
    private Currency currency;

    @NotNull(message = "Quotation source is required")
    private QuotationSource quotationSource;

    @Size(max = 500, message = "Source notes cannot exceed 500 characters")
    private String sourceNotes;
}
