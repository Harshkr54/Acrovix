package com.acrovix.admin.controller;


import com.acrovix.admin.security.ratelimit.RateLimit;
import com.acrovix.admin.security.ratelimit.RateLimitCategory;
import com.acrovix.admin.util.PaginationUtil;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.service.DemoDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/demo")
@RequiredArgsConstructor
public class DemoDataController {

    private final DemoDataService demoDataService;

    @PostMapping("/seed")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<String> seedDemoData(@RequestParam String batchId, Authentication authentication) {
        Long adminId = ((AdminUser) authentication.getPrincipal()).getId();
        demoDataService.seedDemoData(batchId, adminId);
        return ResponseEntity.ok("Demo data seeded for batch: " + batchId);
    }

    @DeleteMapping("/cleanup")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<String> cleanupDemoData(@RequestParam String batchId) {
        demoDataService.cleanupDemoData(batchId);
        return ResponseEntity.ok("Demo data cleaned up for batch: " + batchId);
    }
}
