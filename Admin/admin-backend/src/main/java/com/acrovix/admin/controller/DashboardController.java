package com.acrovix.admin.controller;


import com.acrovix.admin.security.ratelimit.RateLimit;
import com.acrovix.admin.security.ratelimit.RateLimitCategory;
import com.acrovix.admin.util.PaginationUtil;
import com.acrovix.admin.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<Map<String, Object>> getStats(
            @RequestParam(required = false, defaultValue = "ALL_TIME") String dateRange,
            @RequestParam(required = false, defaultValue = "ALL") String enquiryStatus,
            @RequestParam(required = false, defaultValue = "ALL") String quotationStatus,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {

        Map<String, Object> stats = dashboardService.getDashboardStats(
                dateRange,
                enquiryStatus,
                quotationStatus,
                fromDate,
                toDate
        );
        return ResponseEntity.ok(stats);
    }
}
