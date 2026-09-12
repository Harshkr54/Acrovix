package com.acrovix.admin.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class NotificationResponse {
    private Long id;
    private String type;
    private String title;
    private String message;
    private String relatedEntityType;
    private Long relatedEntityId;
    private boolean read;
    private LocalDateTime createdAt;
    private LocalDateTime readAt;
}
