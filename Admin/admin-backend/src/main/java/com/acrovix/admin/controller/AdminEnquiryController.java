package com.acrovix.admin.controller;

import com.acrovix.admin.entity.AdminEnquiry;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.service.AdminEnquiryService;
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
import java.util.Map;

@RestController
@RequestMapping("/api/admin/enquiries")
@RequiredArgsConstructor
public class AdminEnquiryController {

    private final AdminEnquiryService enquiryService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<Page<AdminEnquiry>> getAllEnquiries(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String industry,
            @RequestParam(required = false) String service,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDate) {
        return ResponseEntity.ok(enquiryService.getAllEnquiries(PageRequest.of(page, size, Sort.by("createdAt").descending()), search, status, industry, service, fromDate, toDate));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<AdminEnquiry> getEnquiry(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(enquiryService.getEnquiry(id, admin));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id, 
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal AdminUser admin) {
        enquiryService.updateStatus(id, body.get("status"), admin);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> assignAdmin(
            @PathVariable Long id, 
            @RequestBody Map<String, Long> body,
            @AuthenticationPrincipal AdminUser admin) {
        enquiryService.assignAdmin(id, body.get("adminId"), admin);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/notes")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<?> updateNotes(
            @PathVariable Long id, 
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal AdminUser admin) {
        enquiryService.updateNotes(id, body.get("notes"), admin);
        return ResponseEntity.ok().build();
    }
}
