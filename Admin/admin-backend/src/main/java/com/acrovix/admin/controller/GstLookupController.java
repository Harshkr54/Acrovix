package com.acrovix.admin.controller;

import com.acrovix.admin.dto.GstLookupResponse;
import com.acrovix.admin.service.GstLookupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/gst-lookup")
@RequiredArgsConstructor
public class GstLookupController {
    
    private final GstLookupService gstLookupService;
    
    @GetMapping("/{gstin}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<GstLookupResponse> lookupGstin(@PathVariable String gstin) {
        try {
            return ResponseEntity.ok(gstLookupService.lookupGstin(gstin));
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
