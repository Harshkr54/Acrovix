package com.acrovix.admin.controller;

import com.acrovix.admin.dto.NotificationResponse;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<Page<NotificationResponse>> getNotifications(
            @AuthenticationPrincipal AdminUser admin,
            Pageable pageable) {
        return ResponseEntity.ok(notificationService.getNotifications(admin.getId(), pageable));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(Map.of("unreadCount", notificationService.getUnreadCount(admin.getId())));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser admin) {
        notificationService.markAsRead(id, admin.getId());
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/read-all")
    public ResponseEntity<?> markAllAsRead(@AuthenticationPrincipal AdminUser admin) {
        notificationService.markAllAsRead(admin.getId());
        return ResponseEntity.ok().build();
    }
}
