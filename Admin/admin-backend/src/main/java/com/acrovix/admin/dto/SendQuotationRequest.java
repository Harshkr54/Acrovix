package com.acrovix.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SendQuotationRequest {
    private String recipientEmail;
    private List<String> recipientEmails;
    private String pdfVariant;

    public String getPdfVariant() {
        return (pdfVariant != null && !pdfVariant.trim().isEmpty()) ? pdfVariant.trim().toUpperCase() : "STANDARD";
    }

    /**
     * Resolves all recipients from both singular and list fields,
     * splitting comma or semicolon-delimited entries, trimming whitespace,
     * and deduplicating while preserving order.
     */
    public List<String> resolveRecipients() {
        Set<String> unique = new LinkedHashSet<>();

        if (recipientEmails != null) {
            for (String email : recipientEmails) {
                if (email != null) {
                    for (String part : email.split("[,;]")) {
                        String trimmed = part.trim();
                        if (!trimmed.isEmpty()) {
                            unique.add(trimmed);
                        }
                    }
                }
            }
        }

        if (recipientEmail != null) {
            for (String part : recipientEmail.split("[,;]")) {
                String trimmed = part.trim();
                if (!trimmed.isEmpty()) {
                    unique.add(trimmed);
                }
            }
        }

        return new ArrayList<>(unique);
    }
}
