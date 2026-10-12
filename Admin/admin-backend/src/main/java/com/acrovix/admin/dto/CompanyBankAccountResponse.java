package com.acrovix.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyBankAccountResponse {
    private Long id;
    private String bankName;
    private String accountHolder;
    private String bankAccountNumber;
    private String maskedAccountNumber;
    private String bankIfsc;
    private String bankBranch;
    private Boolean isDefault;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static String maskAccountNumber(String acc) {
        if (acc == null || acc.isBlank()) return "";
        String clean = acc.trim();
        if (clean.length() <= 4) return clean;
        return "•••• " + clean.substring(clean.length() - 4);
    }
}
