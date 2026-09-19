package com.acrovix.admin.controller;

import com.acrovix.admin.dto.ClientQuotationResponseRequest;
import com.acrovix.admin.entity.*;
import com.acrovix.admin.entity.QuotationResponseSource;
import com.acrovix.admin.exception.ResourceConflictException;
import com.acrovix.admin.exception.ResourceNotFoundException;
import com.acrovix.admin.repository.AdminActivityRepository;
import com.acrovix.admin.repository.NotificationRepository;
import com.acrovix.admin.repository.QuotationRepository;
import com.acrovix.admin.security.ratelimit.RateLimit;
import com.acrovix.admin.security.ratelimit.RateLimitCategory;
import com.acrovix.admin.service.NotificationService;
import com.acrovix.admin.service.QuotationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Public (unauthenticated) controller for client-facing quotation responses.
 *
 * Endpoints are intentionally outside /api/admin/** so they bypass JWT security.
 * Clients access quotations via a secure random token, not by sequential ID.
 */
@RestController
@RequestMapping("/api/public/quotations")
@RequiredArgsConstructor
public class ClientQuotationController {

    private final QuotationRepository quotationRepository;
    private final AdminActivityRepository activityRepository;
    private final NotificationService notificationService;

    /**
     * View the public quotation summary for a client (no admin data exposed).
     * GET /api/public/quotations/{token}
     */
    @RateLimit(category = RateLimitCategory.PUBLIC)
    @GetMapping("/{token}")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> viewQuotation(@PathVariable String token) {
        Quotation q = quotationRepository.findByClientToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation not found or link has expired."));

        if (q.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Quotation not found or link has expired.");
        }

        return ResponseEntity.ok(buildPublicDto(q));
    }

    /**
     * Client submits Accept or Reject.
     * POST /api/public/quotations/{token}/respond
     */
    @RateLimit(category = RateLimitCategory.PUBLIC)
    @PostMapping("/{token}/respond")
    @Transactional
    public ResponseEntity<Map<String, Object>> respondToQuotation(
            @PathVariable String token,
            @RequestBody ClientQuotationResponseRequest request) {

        Quotation q = quotationRepository.findByClientToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation not found or link has expired."));

        if (q.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Quotation not found or link has expired.");
        }

        if (!"SENT".equals(q.getStatus())) {
            throw new ResourceConflictException(
                "This quotation is no longer awaiting a response (current status: " + q.getStatus() + ").");
        }

        String action = request.getAction() != null ? request.getAction().toUpperCase() : "";
        if (!"ACCEPT".equals(action) && !"REJECT".equals(action)) {
            throw new IllegalArgumentException("Action must be ACCEPT or REJECT.");
        }

        String newStatus = "ACCEPT".equals(action) ? "ACCEPTED" : "REJECTED";
        q.setStatus(newStatus);
        q.setResponseSource(QuotationResponseSource.CLIENT_PORTAL);
        q.setResponseNotes(request.getRejectionNotes());

        Quotation saved = quotationRepository.save(q);

        // Log AdminActivity (null adminUserId = client-initiated action)
        AdminActivity activity = AdminActivity.builder()
                .adminUserId(null)
                .action("QUOTATION_" + newStatus + "_BY_CLIENT via CLIENT_PORTAL")
                .entityType("Quotation")
                .entityId(saved.getId())
                .createdAt(LocalDateTime.now())
                .build();
        activityRepository.save(activity);

        // Notify the quotation creator
        if (saved.getCreatedBy() != null) {
            notificationService.createQuotationRespondedNotification(
                saved.getCreatedBy(),
                saved.getId(),
                saved.getQuotationNumber(),
                newStatus
            );
        }

        return ResponseEntity.ok(Map.of(
            "status", newStatus,
            "message", "ACCEPTED".equals(newStatus)
                ? "Thank you! Your acceptance has been recorded."
                : "Your rejection has been recorded. Our team will be in touch."
        ));
    }

    private Map<String, Object> buildPublicDto(Quotation q) {
        java.util.Map<String, Object> map = new java.util.LinkedHashMap<>();
        map.put("quotationNumber", q.getQuotationNumber());
        map.put("status", q.getStatus());
        map.put("clientName", q.getClientName());
        map.put("clientCompany", q.getClientCompany());
        map.put("validUntil", q.getValidUntil());
        map.put("grandTotal", q.getGrandTotal());
        map.put("termsAndConditions", q.getTermsAndConditions());
        map.put("createdAt", q.getCreatedAt());
        // Do NOT expose internal IDs, admin user info, or raw DB fields
        return map;
    }
}
