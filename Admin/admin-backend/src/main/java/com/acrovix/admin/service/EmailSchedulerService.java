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
    public void processOverdueInvoices() {
        logger.info("Starting scheduled job: processOverdueInvoices");
        
        LocalDate today = LocalDate.now();
        List<Invoice> overdueInvoices = invoiceRepository.findOverdueInvoices(today);
        
        for (Invoice invoice : overdueInvoices) {
            boolean alreadySent = emailLogRepository.existsByEmailTypeAndRelatedEntityTypeAndRelatedEntityId(
                    EmailType.INVOICE_OVERDUE, "Invoice", invoice.getId());
            if (!alreadySent) {
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
