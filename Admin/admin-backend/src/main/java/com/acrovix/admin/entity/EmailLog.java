package com.acrovix.admin.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "email_logs")
public class EmailLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String recipient;

    @Column(nullable = false)
    private String subject;

    @Enumerated(EnumType.STRING)
    @Column(name = "email_type", nullable = false)
    private EmailType emailType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EmailStatus status;

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "related_entity_type")
    private String relatedEntityType;

    @Column(name = "related_entity_id")
    private Long relatedEntityId;

    public EmailLog() {
    }

    public EmailLog(Long id, String recipient, String subject, EmailType emailType, EmailStatus status,
                    LocalDateTime sentAt, String errorMessage, String relatedEntityType, Long relatedEntityId) {
        this.id = id;
        this.recipient = recipient;
        this.subject = subject;
        this.emailType = emailType;
        this.status = status;
        this.sentAt = sentAt;
        this.errorMessage = errorMessage;
        this.relatedEntityType = relatedEntityType;
        this.relatedEntityId = relatedEntityId;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Long id;
        private String recipient;
        private String subject;
        private EmailType emailType;
        private EmailStatus status;
        private LocalDateTime sentAt;
        private String errorMessage;
        private String relatedEntityType;
        private Long relatedEntityId;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder recipient(String recipient) { this.recipient = recipient; return this; }
        public Builder subject(String subject) { this.subject = subject; return this; }
        public Builder emailType(EmailType emailType) { this.emailType = emailType; return this; }
        public Builder status(EmailStatus status) { this.status = status; return this; }
        public Builder sentAt(LocalDateTime sentAt) { this.sentAt = sentAt; return this; }
        public Builder errorMessage(String errorMessage) { this.errorMessage = errorMessage; return this; }
        public Builder relatedEntityType(String relatedEntityType) { this.relatedEntityType = relatedEntityType; return this; }
        public Builder relatedEntityId(Long relatedEntityId) { this.relatedEntityId = relatedEntityId; return this; }

        public EmailLog build() {
            return new EmailLog(id, recipient, subject, emailType, status, sentAt, errorMessage, relatedEntityType, relatedEntityId);
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRecipient() { return recipient; }
    public void setRecipient(String recipient) { this.recipient = recipient; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public EmailType getEmailType() { return emailType; }
    public void setEmailType(EmailType emailType) { this.emailType = emailType; }

    public EmailStatus getStatus() { return status; }
    public void setStatus(EmailStatus status) { this.status = status; }

    public LocalDateTime getSentAt() { return sentAt; }
    public void setSentAt(LocalDateTime sentAt) { this.sentAt = sentAt; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public String getRelatedEntityType() { return relatedEntityType; }
    public void setRelatedEntityType(String relatedEntityType) { this.relatedEntityType = relatedEntityType; }

    public Long getRelatedEntityId() { return relatedEntityId; }
    public void setRelatedEntityId(Long relatedEntityId) { this.relatedEntityId = relatedEntityId; }
}
