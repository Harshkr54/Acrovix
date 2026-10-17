package com.acrovix.admin.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "invoice_reminder_deliveries",
    indexes = {
        @Index(name = "idx_ird_invoice_level", columnList = "invoice_id, reminder_level"),
        @Index(name = "idx_ird_status_next_retry", columnList = "status, next_retry_at")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_ird_idempotency_key", columnNames = {"idempotency_key"})
    }
)
public class InvoiceReminderDelivery extends TenantAwareEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "invoice_id", nullable = false)
    private Long invoiceId;

    @Column(name = "invoice_number", length = 64)
    private String invoiceNumber;

    @Column(name = "reminder_level", nullable = false)
    private Integer reminderLevel;

    @Column(name = "recipient_email", nullable = false)
    private String recipientEmail;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private DeliveryStatus status;

    @Column(name = "attempt_count", nullable = false)
    private Integer attemptCount = 0;

    @Column(name = "max_attempts", nullable = false)
    private Integer maxAttempts = 3;

    @Column(name = "idempotency_key", nullable = false, length = 128)
    private String idempotencyKey;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "last_attempt_at")
    private LocalDateTime lastAttemptAt;

    @Column(name = "next_retry_at")
    private LocalDateTime nextRetryAt;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @Column(name = "last_error", columnDefinition = "TEXT")
    private String lastError;

    public enum DeliveryStatus {
        PENDING,
        SENDING,
        SENT,
        FAILED,
        PERMANENTLY_FAILED
    }

    public InvoiceReminderDelivery() {
        this.attemptCount = 0;
        this.maxAttempts = 3;
    }

    public InvoiceReminderDelivery(Long id, Long invoiceId, String invoiceNumber, Integer reminderLevel,
                                   String recipientEmail, DeliveryStatus status, Integer attemptCount,
                                   Integer maxAttempts, String idempotencyKey, LocalDateTime createdAt,
                                   LocalDateTime lastAttemptAt, LocalDateTime nextRetryAt,
                                   LocalDateTime deliveredAt, String lastError) {
        this.id = id;
        this.invoiceId = invoiceId;
        this.invoiceNumber = invoiceNumber;
        this.reminderLevel = reminderLevel;
        this.recipientEmail = recipientEmail;
        this.status = status;
        this.attemptCount = attemptCount != null ? attemptCount : 0;
        this.maxAttempts = maxAttempts != null ? maxAttempts : 3;
        this.idempotencyKey = idempotencyKey;
        this.createdAt = createdAt;
        this.lastAttemptAt = lastAttemptAt;
        this.nextRetryAt = nextRetryAt;
        this.deliveredAt = deliveredAt;
        this.lastError = lastError;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Long id;
        private Long invoiceId;
        private String invoiceNumber;
        private Integer reminderLevel;
        private String recipientEmail;
        private DeliveryStatus status;
        private Integer attemptCount = 0;
        private Integer maxAttempts = 3;
        private String idempotencyKey;
        private LocalDateTime createdAt;
        private LocalDateTime lastAttemptAt;
        private LocalDateTime nextRetryAt;
        private LocalDateTime deliveredAt;
        private String lastError;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder invoiceId(Long invoiceId) { this.invoiceId = invoiceId; return this; }
        public Builder invoiceNumber(String invoiceNumber) { this.invoiceNumber = invoiceNumber; return this; }
        public Builder reminderLevel(Integer reminderLevel) { this.reminderLevel = reminderLevel; return this; }
        public Builder recipientEmail(String recipientEmail) { this.recipientEmail = recipientEmail; return this; }
        public Builder status(DeliveryStatus status) { this.status = status; return this; }
        public Builder attemptCount(Integer attemptCount) { this.attemptCount = attemptCount; return this; }
        public Builder maxAttempts(Integer maxAttempts) { this.maxAttempts = maxAttempts; return this; }
        public Builder idempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; return this; }
        public Builder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public Builder lastAttemptAt(LocalDateTime lastAttemptAt) { this.lastAttemptAt = lastAttemptAt; return this; }
        public Builder nextRetryAt(LocalDateTime nextRetryAt) { this.nextRetryAt = nextRetryAt; return this; }
        public Builder deliveredAt(LocalDateTime deliveredAt) { this.deliveredAt = deliveredAt; return this; }
        public Builder lastError(String lastError) { this.lastError = lastError; return this; }

        public InvoiceReminderDelivery build() {
            return new InvoiceReminderDelivery(id, invoiceId, invoiceNumber, reminderLevel, recipientEmail,
                    status, attemptCount, maxAttempts, idempotencyKey, createdAt, lastAttemptAt, nextRetryAt,
                    deliveredAt, lastError);
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getInvoiceId() { return invoiceId; }
    public void setInvoiceId(Long invoiceId) { this.invoiceId = invoiceId; }

    public String getInvoiceNumber() { return invoiceNumber; }
    public void setInvoiceNumber(String invoiceNumber) { this.invoiceNumber = invoiceNumber; }

    public Integer getReminderLevel() { return reminderLevel; }
    public void setReminderLevel(Integer reminderLevel) { this.reminderLevel = reminderLevel; }

    public String getRecipientEmail() { return recipientEmail; }
    public void setRecipientEmail(String recipientEmail) { this.recipientEmail = recipientEmail; }

    public DeliveryStatus getStatus() { return status; }
    public void setStatus(DeliveryStatus status) { this.status = status; }

    public Integer getAttemptCount() { return attemptCount; }
    public void setAttemptCount(Integer attemptCount) { this.attemptCount = attemptCount; }

    public Integer getMaxAttempts() { return maxAttempts; }
    public void setMaxAttempts(Integer maxAttempts) { this.maxAttempts = maxAttempts; }

    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getLastAttemptAt() { return lastAttemptAt; }
    public void setLastAttemptAt(LocalDateTime lastAttemptAt) { this.lastAttemptAt = lastAttemptAt; }

    public LocalDateTime getNextRetryAt() { return nextRetryAt; }
    public void setNextRetryAt(LocalDateTime nextRetryAt) { this.nextRetryAt = nextRetryAt; }

    public LocalDateTime getDeliveredAt() { return deliveredAt; }
    public void setDeliveredAt(LocalDateTime deliveredAt) { this.deliveredAt = deliveredAt; }

    public String getLastError() { return lastError; }
    public void setLastError(String lastError) { this.lastError = lastError; }
}
