package com.acrovix.admin.controller;


import com.acrovix.admin.security.ratelimit.RateLimit;
import com.acrovix.admin.security.ratelimit.RateLimitCategory;
import com.acrovix.admin.util.PaginationUtil;
import com.acrovix.admin.dto.TaxMasterRequest;
import com.acrovix.admin.dto.TaxMasterResponse;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.service.TaxMasterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/taxes")
@RequiredArgsConstructor
public class TaxMasterController {

    private final TaxMasterService taxMasterService;

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<TaxMasterResponse>> getAllTaxes() {
        return ResponseEntity.ok(taxMasterService.getAllTaxes());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<TaxMasterResponse> getTaxById(@PathVariable Long id) {
        return ResponseEntity.ok(taxMasterService.getTaxById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<TaxMasterResponse> createTax(
            @Valid @RequestBody TaxMasterRequest request,
            @AuthenticationPrincipal AdminUser adminUser) {
        TaxMasterResponse created = taxMasterService.createTax(request, adminUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<TaxMasterResponse> updateTax(
            @PathVariable Long id,
            @Valid @RequestBody TaxMasterRequest request,
            @AuthenticationPrincipal AdminUser adminUser) {
        TaxMasterResponse updated = taxMasterService.updateTax(id, request, adminUser.getId());
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> deleteTax(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser adminUser) {
        taxMasterService.deleteTax(id, adminUser.getId());
        return ResponseEntity.ok().build();
    }
    
    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> activateTax(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser adminUser) {
        taxMasterService.activateTax(id, adminUser.getId());
        return ResponseEntity.ok().build();
    }
}
