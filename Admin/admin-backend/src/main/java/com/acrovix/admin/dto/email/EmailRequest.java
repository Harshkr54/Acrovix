package com.acrovix.admin.dto.email;

import com.acrovix.admin.entity.EmailType;
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
public class EmailRequest {
    private String to;
    
    @Builder.Default
    private List<String> toRecipients = new ArrayList<>();
    
    private String subject;
    private String body;
    private String htmlBody;
    private boolean isHtml;
    
    private String fromName;
    private String replyTo;
    private Long tenantId;

    @Builder.Default
    private EmailType emailType = EmailType.GENERAL;
    
    private String relatedEntityType;
    private Long relatedEntityId;
    
    @Builder.Default
    private List<EmailAttachment> attachments = new ArrayList<>();

    /**
     * Resolves all recipients from both toRecipients and to fields,
     * handling comma/semicolon separation and case-insensitive deduplication while preserving ordering.
     */
    public List<String> getAllToRecipients() {
        Set<String> unique = new LinkedHashSet<>();

        if (toRecipients != null) {
            for (String r : toRecipients) {
                if (r != null) {
                    for (String part : r.split("[,;]")) {
                        String trimmed = part.trim();
                        if (!trimmed.isEmpty()) {
                            unique.add(trimmed);
                        }
                    }
                }
            }
        }

        if (to != null) {
            for (String part : to.split("[,;]")) {
                String trimmed = part.trim();
                if (!trimmed.isEmpty()) {
                    unique.add(trimmed);
                }
            }
        }

        return new ArrayList<>(unique);
    }
}
