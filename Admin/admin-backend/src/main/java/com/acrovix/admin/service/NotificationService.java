package com.acrovix.admin.service;

import com.acrovix.admin.dto.NotificationResponse;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.Notification;
import com.acrovix.admin.entity.NotificationType;
import com.acrovix.admin.exception.ResourceNotFoundException;
import com.acrovix.admin.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Transactional
    public void createEnquiryAssignedNotification(AdminUser recipient, Long enquiryId) {
        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(NotificationType.ENQUIRY_ASSIGNED)
                .title("Enquiry Assigned")
                .message("Enquiry #" + enquiryId + " has been assigned to you.")
                .relatedEntityType("ENQUIRY")
                .relatedEntityId(enquiryId)
                .read(false)
                .build();
        notificationRepository.save(notification);
    }

    @Transactional
    public void createQuotationSentNotification(AdminUser recipient, Long quotationId, String quotationNumber) {
        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(NotificationType.QUOTATION_SENT)
                .title("Quotation Sent")
                .message("Quotation " + quotationNumber + " was sent successfully.")
                .relatedEntityType("QUOTATION")
                .relatedEntityId(quotationId)
                .read(false)
                .build();
        notificationRepository.save(notification);
    }

    @Transactional
    public void createQuotationRespondedNotification(AdminUser recipient, Long quotationId, String quotationNumber, String status) {
        String verb = "ACCEPTED".equals(status) ? "accepted" : "rejected";
        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(NotificationType.QUOTATION_RESPONDED)
                .title("Client Response Received")
                .message("Client has " + verb + " quotation " + quotationNumber + " via the client portal.")
                .relatedEntityType("QUOTATION")
                .relatedEntityId(quotationId)
                .read(false)
                .build();
        notificationRepository.save(notification);
    }

    @Transactional
    public void createNewLeadCreatedNotification(AdminUser recipient, String leadNumber, Long leadId, String companyName) {
        if (recipient == null) return;
        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(NotificationType.NEW_LEAD_CREATED)
                .title("New Lead Created")
                .message("New CRM lead " + leadNumber + " has been created for " + companyName + ".")
                .relatedEntityType("CRM_LEAD")
                .relatedEntityId(leadId)
                .read(false)
                .build();
        notificationRepository.save(notification);
    }

    @Transactional
    public void createLeadAssignedNotification(AdminUser recipient, String leadNumber, Long leadId) {
        if (recipient == null) return;
        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(NotificationType.LEAD_ASSIGNED)
                .title("Lead Assigned")
                .message("Lead " + leadNumber + " has been assigned to you.")
                .relatedEntityType("CRM_LEAD")
                .relatedEntityId(leadId)
                .read(false)
                .build();
        notificationRepository.save(notification);
    }

    @Transactional
    public void createFollowUpDueNotification(AdminUser recipient, String customerName, Long leadId, Long followUpId) {
        if (recipient == null) return;
        boolean exists = notificationRepository.existsByRecipientIdAndTypeAndRelatedEntityTypeAndRelatedEntityId(
                recipient.getId(), NotificationType.FOLLOW_UP_DUE, "CRM_FOLLOW_UP", followUpId);
        if (exists) return;
        
        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(NotificationType.FOLLOW_UP_DUE)
                .title("Follow-up Due")
                .message("Your follow-up with " + customerName + " is due today.")
                .relatedEntityType("CRM_FOLLOW_UP")
                .relatedEntityId(followUpId)
                .read(false)
                .build();
        notificationRepository.save(notification);
    }

    @Transactional
    public void createFollowUpOverdueNotification(AdminUser recipient, String customerName, Long leadId, Long followUpId) {
        if (recipient == null) return;
        boolean exists = notificationRepository.existsByRecipientIdAndTypeAndRelatedEntityTypeAndRelatedEntityId(
                recipient.getId(), NotificationType.FOLLOW_UP_OVERDUE, "CRM_FOLLOW_UP", followUpId);
        if (exists) return;

        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(NotificationType.FOLLOW_UP_OVERDUE)
                .title("Follow-up Overdue")
                .message("Your follow-up with " + customerName + " is overdue.")
                .relatedEntityType("CRM_FOLLOW_UP")
                .relatedEntityId(followUpId)
                .read(false)
                .build();
        notificationRepository.save(notification);
    }

    @Transactional
    public void createInvoiceCreatedNotification(AdminUser recipient, String invoiceNumber, Long invoiceId) {
        if (recipient == null) return;
        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(NotificationType.INVOICE_CREATED)
                .title("Invoice Created")
                .message("Invoice " + invoiceNumber + " has been created.")
                .relatedEntityType("INVOICE")
                .relatedEntityId(invoiceId)
                .read(false)
                .build();
        notificationRepository.save(notification);
    }

    @Transactional
    public void createInvoiceOverdueNotification(AdminUser recipient, String invoiceNumber, Long invoiceId) {
        if (recipient == null) return;
        boolean exists = notificationRepository.existsByRecipientIdAndTypeAndRelatedEntityTypeAndRelatedEntityId(
                recipient.getId(), NotificationType.INVOICE_OVERDUE, "INVOICE", invoiceId);
        if (exists) return;

        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(NotificationType.INVOICE_OVERDUE)
                .title("Invoice Overdue")
                .message("Invoice " + invoiceNumber + " is overdue.")
                .relatedEntityType("INVOICE")
                .relatedEntityId(invoiceId)
                .read(false)
                .build();
        notificationRepository.save(notification);
    }

    @Transactional
    public void createPaymentReceivedNotification(AdminUser recipient, String invoiceNumber, Long invoiceId, Long paymentId, java.math.BigDecimal amount) {
        if (recipient == null) return;
        boolean exists = notificationRepository.existsByRecipientIdAndTypeAndRelatedEntityTypeAndRelatedEntityId(
                recipient.getId(), NotificationType.PAYMENT_RECEIVED, "PAYMENT", paymentId);
        if (exists) return;

        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(NotificationType.PAYMENT_RECEIVED)
                .title("Payment Received")
                .message("Payment of " + amount + " has been received for invoice " + invoiceNumber + ".")
                .relatedEntityType("PAYMENT")
                .relatedEntityId(paymentId)
                .read(false)
                .build();
        notificationRepository.save(notification);
    }

    @Transactional
    public void createPaymentPartialNotification(AdminUser recipient, String invoiceNumber, Long invoiceId, Long paymentId, java.math.BigDecimal amount) {
        if (recipient == null) return;
        boolean exists = notificationRepository.existsByRecipientIdAndTypeAndRelatedEntityTypeAndRelatedEntityId(
                recipient.getId(), NotificationType.PAYMENT_PARTIAL, "PAYMENT", paymentId);
        if (exists) return;

        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(NotificationType.PAYMENT_PARTIAL)
                .title("Partial Payment Received")
                .message("Partial payment of " + amount + " has been received for invoice " + invoiceNumber + ".")
                .relatedEntityType("PAYMENT")
                .relatedEntityId(paymentId)
                .read(false)
                .build();
        notificationRepository.save(notification);
    }

    @Transactional
    public void createInvoiceFullyPaidNotification(AdminUser recipient, String invoiceNumber, Long invoiceId) {
        if (recipient == null) return;
        boolean exists = notificationRepository.existsByRecipientIdAndTypeAndRelatedEntityTypeAndRelatedEntityId(
                recipient.getId(), NotificationType.INVOICE_FULLY_PAID, "INVOICE", invoiceId);
        if (exists) return;

        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(NotificationType.INVOICE_FULLY_PAID)
                .title("Invoice Fully Paid")
                .message("Invoice " + invoiceNumber + " has been fully paid.")
                .relatedEntityType("INVOICE")
                .relatedEntityId(invoiceId)
                .read(false)
                .build();
        notificationRepository.save(notification);
    }

    @Transactional
    public void createCustomerCreatedNotification(AdminUser recipient, String customerName, Long customerId) {
        if (recipient == null) return;
        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(NotificationType.CUSTOMER_CREATED)
                .title("Customer Created")
                .message("Customer " + customerName + " has been created.")
                .relatedEntityType("CUSTOMER")
                .relatedEntityId(customerId)
                .read(false)
                .build();
        notificationRepository.save(notification);
    }

    @Transactional
    public void createEnquiryConvertedNotification(AdminUser recipient, Long enquiryId) {
        if (recipient == null) return;
        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(NotificationType.ENQUIRY_CONVERTED)
                .title("Enquiry Converted")
                .message("Enquiry has been converted to CRM/customer workflow.")
                .relatedEntityType("ENQUIRY")
                .relatedEntityId(enquiryId)
                .read(false)
                .build();
        notificationRepository.save(notification);
    }

    @Transactional
    public void createLoginFailedNotification(AdminUser recipient) {
        if (recipient == null) return;
        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(NotificationType.LOGIN_FAILED)
                .title("Failed Login Attempt")
                .message("An unsuccessful login attempt was detected.")
                .relatedEntityType("ADMIN_USER")
                .relatedEntityId(recipient.getId())
                .read(false)
                .build();
        notificationRepository.save(notification);
    }

    @Transactional
    public void createLoginRateLimitedNotification(AdminUser recipient) {
        if (recipient == null) return;
        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(NotificationType.LOGIN_RATE_LIMITED)
                .title("Login Rate Limited")
                .message("Multiple unsuccessful login attempts triggered temporary rate limiting.")
                .relatedEntityType("ADMIN_USER")
                .relatedEntityId(recipient.getId())
                .read(false)
                .build();
        notificationRepository.save(notification);
    }

    public Page<NotificationResponse> getNotifications(Long adminId, Pageable pageable) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(adminId, pageable)
                .map(this::mapToResponse);
    }

    public long getUnreadCount(Long adminId) {
        return notificationRepository.countByRecipientIdAndReadFalse(adminId);
    }

    @Transactional
    public void markAsRead(Long notificationId, Long adminId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));

        if (!notification.getRecipient().getId().equals(adminId)) {
            throw new AccessDeniedException("Cannot mark another admin's notification as read");
        }

        if (!notification.isRead()) {
            notification.setRead(true);
            notification.setReadAt(LocalDateTime.now());
            notificationRepository.save(notification);
        }
    }

    @Transactional
    public void markAllAsRead(Long adminId) {
        notificationRepository.markAllAsRead(adminId, LocalDateTime.now());
    }

    private NotificationResponse mapToResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .type(notification.getType().name())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .relatedEntityType(notification.getRelatedEntityType())
                .relatedEntityId(notification.getRelatedEntityId())
                .read(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .readAt(notification.getReadAt())
                .build();
    }
}
