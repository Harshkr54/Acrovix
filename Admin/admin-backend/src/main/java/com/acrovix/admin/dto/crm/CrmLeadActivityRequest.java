package com.acrovix.admin.dto.crm;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrmLeadActivityRequest {

    @NotBlank(message = "Activity type is required")
    private String type; // CALL, EMAIL, MEETING, WHATSAPP, NOTE, OTHER

    @NotBlank(message = "Subject is required")
    private String subject;

    private String notes;
    private String outcome;
    private String nextAction;
    private LocalDateTime performedAt;
}
