package com.acrovix.admin.controller;


import com.acrovix.admin.security.ratelimit.RateLimit;
import com.acrovix.admin.security.ratelimit.RateLimitCategory;
import com.acrovix.admin.util.PaginationUtil;
import com.acrovix.admin.dto.crm.*;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.LeadPriority;
import com.acrovix.admin.entity.LeadSource;
import com.acrovix.admin.entity.LeadStatus;
import com.acrovix.admin.service.CrmService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/crm")
@RequiredArgsConstructor
public class CrmController {

    private final CrmService crmService;

    // --- LEADS ---

    @GetMapping("/leads")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<Page<CrmLeadResponse>> getAllLeads(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) LeadStatus status,
            @RequestParam(required = false) LeadPriority priority,
            @RequestParam(required = false) LeadSource leadSource,
            @RequestParam(required = false) Long assignedToId,
            @RequestParam(required = false) String industry,
            @RequestParam(required = false) String service,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDate,
            @AuthenticationPrincipal AdminUser admin) {
        search = com.acrovix.admin.util.PaginationUtil.getSafeSearch(search);
        return ResponseEntity.ok(crmService.getAllLeads(
                PageRequest.of(page, PaginationUtil.getSafeSize(size), Sort.by("updatedAt").descending()),
                search, status, priority, leadSource, assignedToId, industry, service, fromDate, toDate, admin
        ));
    }

    @GetMapping("/leads/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<CrmLeadResponse> getLeadById(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(crmService.getLeadById(id, admin));
    }

    @PostMapping("/leads")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<CrmLeadResponse> createLead(
            @Valid @RequestBody CrmLeadRequest request,
            @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(crmService.createLead(request, admin));
    }

    @RequestMapping(value = "/leads/{id}", method = {RequestMethod.PATCH, RequestMethod.PUT})
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<CrmLeadResponse> updateLead(
            @PathVariable Long id,
            @RequestBody CrmLeadRequest request,
            @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(crmService.updateLead(id, request, admin));
    }

    @PatchMapping("/leads/{id}/status")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<CrmLeadResponse> updateLeadStatus(
            @PathVariable Long id,
            @Valid @RequestBody CrmLeadStatusUpdateRequest request,
            @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(crmService.updateLeadStatus(id, request, admin));
    }

    @PatchMapping("/leads/{id}/assign")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<CrmLeadResponse> assignLead(
            @PathVariable Long id,
            @RequestBody Map<String, Long> body,
            @AuthenticationPrincipal AdminUser admin) {
        Long assigneeId = body.get("assigneeId") != null ? body.get("assigneeId") : body.get("adminId");
        if (assigneeId == null) {
            throw new IllegalArgumentException("assigneeId or adminId is required");
        }
        return ResponseEntity.ok(crmService.assignLead(id, assigneeId, admin));
    }

    // --- FOLLOW-UPS ---

    @PostMapping("/leads/{id}/follow-ups")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<CrmFollowUpResponse> createFollowUp(
            @PathVariable Long id,
            @Valid @RequestBody CrmFollowUpRequest request,
            @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(crmService.createFollowUp(id, request, admin));
    }

    @GetMapping("/leads/{id}/follow-ups")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<List<CrmFollowUpResponse>> getFollowUpsForLead(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(crmService.getFollowUpsForLead(id, admin));
    }

    @RequestMapping(value = "/follow-ups/{id}", method = {RequestMethod.PATCH, RequestMethod.PUT})
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<CrmFollowUpResponse> updateFollowUp(
            @PathVariable Long id,
            @RequestBody CrmFollowUpRequest request,
            @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(crmService.updateFollowUp(id, request, admin));
    }

    @PatchMapping("/follow-ups/{id}/complete")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<CrmFollowUpResponse> completeFollowUp(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal AdminUser admin) {
        String outcome = body != null ? body.get("outcome") : null;
        return ResponseEntity.ok(crmService.completeFollowUp(id, outcome, admin));
    }

    @PatchMapping("/follow-ups/{id}/cancel")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<CrmFollowUpResponse> cancelFollowUp(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(crmService.cancelFollowUp(id, admin));
    }

    @GetMapping("/follow-ups/due")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<List<CrmFollowUpResponse>> getDueFollowUpsToday(
            @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(crmService.getDueFollowUpsToday(admin));
    }

    @GetMapping("/follow-ups/upcoming")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<Page<CrmFollowUpResponse>> getUpcomingFollowUps(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(crmService.getUpcomingFollowUps(
                PageRequest.of(page, PaginationUtil.getSafeSize(size), Sort.by("scheduledAt").ascending()), admin
        ));
    }

    // --- PIPELINE & SUMMARY ---

    @GetMapping("/pipeline")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<CrmPipelineResponse> getPipeline(
            @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(crmService.getPipeline(admin));
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<CrmDashboardSummaryResponse> getDashboardSummary(
            @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(crmService.getDashboardSummary(admin));
    }
}
