package com.acrovix.admin.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyBankAccountRequest {
    @NotBlank(message = "Bank name is required")
    private String bankName;

    @NotBlank(message = "Account holder name is required")
    private String accountHolder;

    @NotBlank(message = "Bank account number is required")
    private String bankAccountNumber;

    private String confirmAccountNumber;

    @NotBlank(message = "IFSC code is required")
    private String bankIfsc;

    private String bankBranch;
    private String upiId;
    private Boolean isDefault;
    private Boolean isActive;

    @AssertTrue(message = "Account numbers do not match.")
    public boolean isAccountNumberConfirmed() {
        if (confirmAccountNumber == null) {
            return true; // Optional for edit requests if not provided
        }
        if (bankAccountNumber == null) {
            return false;
        }
        return bankAccountNumber.trim().equals(confirmAccountNumber.trim());
    }
}
