package com.acrovix.admin.controller;

import com.acrovix.admin.dto.GstVerificationRequest;
import com.acrovix.admin.dto.GstVerificationResponse;
import com.acrovix.admin.service.GstVerificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/gst")
@RequiredArgsConstructor
public class GstVerificationController {
    
    private final GstVerificationService gstVerificationService;
    
    @PostMapping("/verify")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<GstVerificationResponse> verifyGstin(@Valid @RequestBody GstVerificationRequest request) {
        return ResponseEntity.ok(gstVerificationService.verify(request.getGstin()));
    }
}
