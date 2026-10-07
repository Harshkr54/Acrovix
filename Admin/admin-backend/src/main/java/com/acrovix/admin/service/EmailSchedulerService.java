package com.acrovix.admin.service;

import com.acrovix.admin.entity.*;
import com.acrovix.admin.repository.CrmFollowUpRepository;
import com.acrovix.admin.repository.EmailLogRepository;
import com.acrovix.admin.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EmailSchedulerService {

    private static final Logger logger = LoggerFactory.getLogger(EmailSchedulerService.class);

    private final CrmFollowUpRepository followUpRepository;
    private final InvoiceRepository invoiceRepository;
    private final EmailLogRepository emailLogRepository;
    private final EmailService emailService;
    private final NotificationService notificationService;

    // Run every hour
    @Scheduled(cron = "0 0 * * * *")
    public void processDueAndOverdueFollowUps() {
        logger.info("Starting scheduled job: processDueAndOverdueFollowUps");

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
            
            boolean alreadySent = emailLogRepository.existsByEmailTypeAndRelatedEntityTypeAndRelatedEntityId(
                    EmailType.FOLLOW_UP_DUE, "CrmFollowUp", followUp.getId());
            if (!alreadySent) {
                try {
                    emailService.sendFollowUpNotificationAsync(followUp, "FOLLOW_UP_DUE", null);
                } catch (Exception e) {
                    logger.error("Failed to send due follow-up email for ID: {}", followUp.getId(), e);
                }
            }
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

            boolean alreadySent = emailLogRepository.existsByEmailTypeAndRelatedEntityTypeAndRelatedEntityId(
                    EmailType.FOLLOW_UP_OVERDUE, "CrmFollowUp", followUp.getId());
            if (!alreadySent) {
                try {
                    emailService.sendFollowUpNotificationAsync(followUp, "FOLLOW_UP_OVERDUE", null);
                } catch (Exception e) {
                    logger.error("Failed to send overdue follow-up email for ID: {}", followUp.getId(), e);
                }
            }
        }
        
        logger.info("Completed scheduled job: processDueAndOverdueFollowUps");
    }

    // Run daily at 9:00 AM
    @Scheduled(cron = "0 0 9 * * *")
    @org.springframework.transaction.annotation.Transactional
    public void processOverdueInvoices() {
        logger.info("Starting scheduled job: processOverdueInvoices");
        
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

            if (expectedLevel > 0 && (invoice.getReminderLevel() == null || invoice.getReminderLevel() < expectedLevel)) {
                // Ensure we don't send multiple in the same day if the job restarts
                if (invoice.getLastReminderSentAt() != null && 
                    invoice.getLastReminderSentAt().toLocalDate().isEqual(today)) {
                    continue;
                }

                // ATOMIC UPDATE: secure the lock by updating DB directly. If 0 updated, another thread won.
                int updatedRows = invoiceRepository.updateReminderLevelSafely(invoice.getId(), expectedLevel);
                if (updatedRows == 0) {
                    continue;
                }

                notificationService.createInvoiceOverdueNotification(
                        invoice.getCreatedBy(), 
                        invoice.getInvoiceNumber(), 
                        invoice.getId()
                );

                try {
                    emailService.sendInvoiceOverdueAsync(invoice);
                } catch (Exception e) {
                    logger.error("Failed to send invoice overdue email for ID: {}", invoice.getId(), e);
                }
            }
        }
        
        logger.info("Completed scheduled job: processOverdueInvoices");
    }
}
