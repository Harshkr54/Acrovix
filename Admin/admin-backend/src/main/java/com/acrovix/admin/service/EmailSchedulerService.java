package com.acrovix.admin.service;

import com.acrovix.admin.entity.*;
import com.acrovix.admin.repository.CrmFollowUpRepository;
import com.acrovix.admin.repository.EmailLogRepository;
import com.acrovix.admin.repository.InvoiceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import com.acrovix.admin.entity.InvoiceReminderDelivery;
import com.acrovix.admin.entity.InvoiceReminderDelivery.DeliveryStatus;
import com.acrovix.admin.repository.InvoiceReminderDeliveryRepository;
import org.springframework.beans.factory.annotation.Autowired;

@Service
public class EmailSchedulerService {

    private static final Logger logger = LoggerFactory.getLogger(EmailSchedulerService.class);

    private final CrmFollowUpRepository followUpRepository;
    private final InvoiceRepository invoiceRepository;
    private final EmailLogRepository emailLogRepository;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final AutomationService automationService;
    private final InvoiceReminderDeliveryRepository reminderDeliveryRepository;

    public EmailSchedulerService(
            CrmFollowUpRepository followUpRepository,
            InvoiceRepository invoiceRepository,
            EmailLogRepository emailLogRepository,
            EmailService emailService,
            NotificationService notificationService,
            @Lazy AutomationService automationService
    ) {
        this(followUpRepository, invoiceRepository, emailLogRepository, emailService, notificationService, automationService, null);
    }

    @Autowired
    public EmailSchedulerService(
            CrmFollowUpRepository followUpRepository,
            InvoiceRepository invoiceRepository,
            EmailLogRepository emailLogRepository,
            EmailService emailService,
            NotificationService notificationService,
            @Lazy AutomationService automationService,
            @Autowired(required = false) InvoiceReminderDeliveryRepository reminderDeliveryRepository
    ) {
        this.followUpRepository = followUpRepository;
        this.invoiceRepository = invoiceRepository;
        this.emailLogRepository = emailLogRepository;
        this.emailService = emailService;
        this.notificationService = notificationService;
        this.automationService = automationService;
        this.reminderDeliveryRepository = reminderDeliveryRepository;
    }

    // Run every hour
    @Scheduled(cron = "0 0 * * * *", zone = "${acrovix.scheduling.timezone:Asia/Kolkata}")
    public void processDueAndOverdueFollowUps() {
        if (automationService != null) {
            automationService.executeJob("follow-ups", AutomationJobRun.TriggerType.SCHEDULED);
        } else {
            processDueAndOverdueFollowUpsInternal();
        }
    }

    // Run daily at 9:00 AM
    @Scheduled(cron = "0 0 9 * * *", zone = "${acrovix.scheduling.timezone:Asia/Kolkata}")
    @Transactional
    public void processOverdueInvoices() {
        if (automationService != null) {
            automationService.executeJob("invoices", AutomationJobRun.TriggerType.SCHEDULED);
        } else {
            processOverdueInvoicesInternal();
        }
    }

    public int processDueAndOverdueFollowUpsInternal() {
        logger.info("Executing follow-up alerts and overdue reminder scanning...");
        int processedCount = 0;

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfDay = now.toLocalDate().atStartOfDay();
        LocalDateTime endOfDay = now.toLocalDate().atTime(LocalTime.MAX);

        // Due Today
        List<CrmFollowUp> dueToday = followUpRepository.findDueBetween(startOfDay, endOfDay, null);
        for (CrmFollowUp followUp : dueToday) {
            notificationService.createFollowUpDueNotification(
                    followUp.getAssignedTo(), 
                    followUp.getLead().getCustomer() != null ? followUp.getLead().getCustomer().getName() : followUp.getLead().getFullName(), 
                    followUp.getLead().getId(), 
                    followUp.getId()
            );
            
            boolean alreadySent = emailLogRepository.existsByEmailTypeAndRelatedEntityTypeAndRelatedEntityIdAndStatus(
                    EmailType.FOLLOW_UP_DUE, "CRM_FOLLOW_UP", followUp.getId(), EmailStatus.SENT);
            if (!alreadySent) {
                try {
                    emailService.sendFollowUpDueNotificationAsync(followUp);
                } catch (Exception e) {
                    logger.error("Failed to send due follow-up email for ID: {}", followUp.getId(), e);
                }
            }
            processedCount++;
        }

        // Overdue (scheduled before today)
        List<CrmFollowUp> overdue = followUpRepository.findOverdueBefore(startOfDay, null);
        for (CrmFollowUp followUp : overdue) {
            notificationService.createFollowUpOverdueNotification(
                    followUp.getAssignedTo(), 
                    followUp.getLead().getCustomer() != null ? followUp.getLead().getCustomer().getName() : followUp.getLead().getFullName(), 
                    followUp.getLead().getId(), 
                    followUp.getId()
            );

            boolean alreadySent = emailLogRepository.existsByEmailTypeAndRelatedEntityTypeAndRelatedEntityIdAndStatus(
                    EmailType.FOLLOW_UP_OVERDUE, "CRM_FOLLOW_UP", followUp.getId(), EmailStatus.SENT);
            if (!alreadySent) {
                try {
                    emailService.sendFollowUpOverdueNotificationAsync(followUp);
                } catch (Exception e) {
                    logger.error("Failed to send overdue follow-up email for ID: {}", followUp.getId(), e);
                }
            }
            processedCount++;
        }
        
        logger.info("Completed follow-up alerts scanning: {} record(s) processed.", processedCount);
        return processedCount;
    }

    @Transactional
    public int processOverdueInvoicesInternal() {
        logger.info("Executing overdue invoice escalation scanning...");
        int processedCount = 0;
        
        LocalDate today = LocalDate.now();
        List<Invoice> overdueInvoices = invoiceRepository.findOverdueInvoices(today);
        
        for (Invoice invoice : overdueInvoices) {
            // Safe guard: only process issued/partially_paid invoices with balance > 0
            if ((invoice.getStatus() != InvoiceStatus.ISSUED && invoice.getStatus() != InvoiceStatus.PARTIALLY_PAID) 
                    || invoice.getBalanceDue().compareTo(java.math.BigDecimal.ZERO) <= 0) {
                continue;
            }

            long daysOverdue = java.time.temporal.ChronoUnit.DAYS.between(invoice.getDueDate(), today);
            
            int expectedLevel = 0;
            if (daysOverdue >= 15) {
                expectedLevel = 3;
            } else if (daysOverdue >= 7) {
                expectedLevel = 2;
            } else if (daysOverdue >= 3) {
                expectedLevel = 1;
            }

            if (expectedLevel <= 0) {
                continue;
            }

            // Fallback for environments/mock tests where reminderDeliveryRepository is not wired
            if (reminderDeliveryRepository == null) {
                if (invoice.getReminderLevel() == null || invoice.getReminderLevel() < expectedLevel) {
                    if (invoice.getLastReminderSentAt() != null && 
                        invoice.getLastReminderSentAt().toLocalDate().isEqual(today)) {
                        continue;
                    }
                    int updatedRows = invoiceRepository.updateReminderLevelSafely(invoice.getId(), expectedLevel);
                    if (updatedRows > 0) {
                        notificationService.createInvoiceOverdueNotification(
                                invoice.getCreatedBy(), 
                                invoice.getInvoiceNumber(), 
                                invoice.getId()
                        );
                        try {
                            emailService.sendInvoiceOverdue(invoice);
                        } catch (Exception e) {
                            logger.error("Failed to send invoice overdue email for ID: {}", invoice.getId(), e);
                        }
                        processedCount++;
                    }
                }
                continue;
            }

            // === RELIABLE IDEMPOTENT DELIVERY WORKFLOW ===
            String recipient = invoice.getCustomer() != null && invoice.getCustomer().getEmail() != null 
                    ? invoice.getCustomer().getEmail() 
                    : invoice.getClientEmail();
            if (recipient == null || recipient.trim().isEmpty()) {
                logger.warn("Skipping overdue reminder for invoice {}: No recipient email found.", invoice.getInvoiceNumber());
                continue;
            }

            java.util.Optional<InvoiceReminderDelivery> deliveryOpt = 
                    reminderDeliveryRepository.findByInvoiceIdAndReminderLevel(invoice.getId(), expectedLevel);

            if (deliveryOpt.isPresent()) {
                InvoiceReminderDelivery delivery = deliveryOpt.get();
                // 1. Do not repeatedly send the same successful reminder
                if (delivery.getStatus() == DeliveryStatus.SENT) {
                    // Synchronize business level if it lagged behind delivery
                    if (invoice.getReminderLevel() == null || invoice.getReminderLevel() < expectedLevel) {
                        invoiceRepository.updateReminderLevelSafely(invoice.getId(), expectedLevel);
                    }
                    continue;
                }

                // 2. Do not retry permanently failed reminders beyond max attempts
                if (delivery.getStatus() == DeliveryStatus.PERMANENTLY_FAILED) {
                    continue;
                }

                // 3. Concurrency guard: skip if another worker is actively sending (within last 5 minutes)
                if (delivery.getStatus() == DeliveryStatus.SENDING) {
                    if (delivery.getLastAttemptAt() != null && 
                        delivery.getLastAttemptAt().isAfter(LocalDateTime.now().minusMinutes(5))) {
                        continue;
                    }
                    // Stale SENDING: eligible for recovery retry
                }

                // 4. Retry check: respect backoff window and attempt limits
                if (delivery.getStatus() == DeliveryStatus.FAILED) {
                    if (delivery.getAttemptCount() >= delivery.getMaxAttempts()) {
                        delivery.setStatus(DeliveryStatus.PERMANENTLY_FAILED);
                        reminderDeliveryRepository.save(delivery);
                        continue;
                    }
                    if (delivery.getNextRetryAt() != null && delivery.getNextRetryAt().isAfter(LocalDateTime.now())) {
                        continue; // Still within backoff period
                    }
                }
            } else {
                // If invoice business reminder level already reached/exceeded this level, skip
                if (invoice.getReminderLevel() != null && invoice.getReminderLevel() >= expectedLevel) {
                    continue;
                }
            }

            // Acquire delivery attempt lock
            final int targetLevel = expectedLevel;
            InvoiceReminderDelivery delivery = deliveryOpt.orElseGet(() -> InvoiceReminderDelivery.builder()
                    .invoiceId(invoice.getId())
                    .invoiceNumber(invoice.getInvoiceNumber())
                    .reminderLevel(targetLevel)
                    .recipientEmail(recipient)
                    .idempotencyKey("INV_" + invoice.getId() + "_LVL_" + targetLevel)
                    .status(DeliveryStatus.SENDING)
                    .attemptCount(0)
                    .maxAttempts(3)
                    .createdAt(LocalDateTime.now())
                    .build()
            );

            delivery.setStatus(DeliveryStatus.SENDING);
            delivery.setLastAttemptAt(LocalDateTime.now());
            delivery.setAttemptCount(delivery.getAttemptCount() + 1);

            try {
                delivery = reminderDeliveryRepository.saveAndFlush(delivery);
            } catch (Exception ex) {
                logger.warn("Concurrent lock collision for invoice {} level {}: {}", invoice.getId(), expectedLevel, ex.getMessage());
                continue;
            }

            // Execute synchronous delivery
            boolean sent = false;
            String deliveryError = null;
            try {
                sent = emailService.sendInvoiceOverdue(invoice);
            } catch (Exception e) {
                sent = false;
                deliveryError = e.getMessage() != null ? e.getMessage() : "Unknown email delivery error";
                logger.error("Failed to send overdue reminder for invoice {} level {} (Attempt {}): {}", 
                        invoice.getId(), expectedLevel, delivery.getAttemptCount(), deliveryError);
            }

            if (sent) {
                delivery.setStatus(DeliveryStatus.SENT);
                delivery.setDeliveredAt(LocalDateTime.now());
                delivery.setLastError(null);
                delivery.setNextRetryAt(null);
                reminderDeliveryRepository.save(delivery);

                // Commit business reminder level to Invoice ONLY AFTER delivery success!
                invoiceRepository.updateReminderLevelSafely(invoice.getId(), expectedLevel);

                notificationService.createInvoiceOverdueNotification(
                        invoice.getCreatedBy(), 
                        invoice.getInvoiceNumber(), 
                        invoice.getId()
                );
                processedCount++;
                logger.info("Successfully delivered invoice reminder for invoice {} level {}.", invoice.getInvoiceNumber(), expectedLevel);
            } else {
                delivery.setLastError(deliveryError != null ? deliveryError : "Email dispatch returned false");
                if (delivery.getAttemptCount() >= delivery.getMaxAttempts()) {
                    delivery.setStatus(DeliveryStatus.PERMANENTLY_FAILED);
                    delivery.setNextRetryAt(null);
                    logger.warn("Invoice reminder for invoice {} level {} permanently failed after {} attempts.", 
                            invoice.getId(), expectedLevel, delivery.getMaxAttempts());
                } else {
                    delivery.setStatus(DeliveryStatus.FAILED);
                    delivery.setNextRetryAt(LocalDateTime.now().plusHours(delivery.getAttemptCount()));
                    logger.info("Invoice reminder for invoice {} level {} failed (Attempt {}/{}); next retry scheduled at {}.", 
                            invoice.getId(), expectedLevel, delivery.getAttemptCount(), delivery.getMaxAttempts(), delivery.getNextRetryAt());
                }
                reminderDeliveryRepository.save(delivery);
                // DO NOT update invoice.reminderLevel! Keeps business level uncommitted for retry.
            }
        }
        
        logger.info("Completed overdue invoice escalation scanning: {} invoice(s) escalated.", processedCount);
        return processedCount;
    }
}
