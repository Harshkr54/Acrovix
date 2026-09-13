package com.acrovix.admin.controller;

import com.acrovix.admin.repository.AdminActivityRepository;
import com.acrovix.admin.repository.AdminEnquiryRepository;
import com.acrovix.admin.repository.QuotationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final AdminEnquiryRepository enquiryRepository;
    private final QuotationRepository quotationRepository;
    private final AdminActivityRepository activityRepository;

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = new HashMap<>();

        // --- Enquiries: 2 queries instead of 3 ---
        // One query for total count + one GROUP BY for status counts
        long totalEnquiries = enquiryRepository.count();
        LocalDateTime startOfMonth = YearMonth.now().atDay(1).atStartOfDay();
        long enquiriesThisMonth = enquiryRepository.countByCreatedAtAfter(startOfMonth);

        // Single GROUP BY query replaces individual countByStatus("NEW") calls
        List<Object[]> enquiryStatusCounts = enquiryRepository.countGroupByStatus();
        Map<String, Long> enquiriesByStatus = new HashMap<>();
        for (Object[] row : enquiryStatusCounts) {
            enquiriesByStatus.put((String) row[0], (Long) row[1]);
        }
        long newEnquiries = enquiriesByStatus.getOrDefault("NEW", 0L);

        // --- Quotations: 2 queries instead of 7 ---
        // One query for total count + one GROUP BY for all status counts
        long totalQuotations = quotationRepository.count();

        // Single GROUP BY query replaces 5 separate countByStatus() calls
        List<Object[]> quotationStatusCounts = quotationRepository.countGroupByStatus();
        Map<String, Long> quotationsByStatus = new HashMap<>();
        for (Object[] row : quotationStatusCounts) {
            quotationsByStatus.put((String) row[0], (Long) row[1]);
        }
        long acceptedQuotations = quotationsByStatus.getOrDefault("ACCEPTED", 0L);

        double conversionRate = 0.0;
        if (totalQuotations > 0) {
            conversionRate = (double) acceptedQuotations / totalQuotations * 100.0;
        }

        stats.put("totalEnquiries", totalEnquiries);
        stats.put("newEnquiries", newEnquiries);
        stats.put("enquiriesThisMonth", enquiriesThisMonth);
        stats.put("totalQuotations", totalQuotations);
        stats.put("acceptedQuotations", acceptedQuotations);
        stats.put("conversionRate", Math.round(conversionRate * 10.0) / 10.0);
        stats.put("quotationsByStatus", quotationsByStatus);

        stats.put("recentActivities", activityRepository.findTop50ByOrderByCreatedAtDesc());
        stats.put("recentEnquiries", enquiryRepository.findTop5ByOrderByCreatedAtDesc());
        return ResponseEntity.ok(stats);
    }
}
