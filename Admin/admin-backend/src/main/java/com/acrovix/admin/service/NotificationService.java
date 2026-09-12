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
