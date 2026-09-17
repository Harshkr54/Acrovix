package com.acrovix.admin.dto.email;

import com.acrovix.admin.entity.EmailType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailRequest {
    private String to;
    private String subject;
    private String body;
    private String htmlBody;
    private boolean isHtml;
    
    @Builder.Default
    private EmailType emailType = EmailType.GENERAL;
    
    private String relatedEntityType;
    private Long relatedEntityId;
    
    @Builder.Default
    private List<EmailAttachment> attachments = new ArrayList<>();
}
