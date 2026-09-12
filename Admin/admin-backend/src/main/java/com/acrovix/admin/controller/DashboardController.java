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
        
        long totalEnquiries = enquiryRepository.count();
        long newEnquiries = enquiryRepository.countByStatus("NEW");
        LocalDateTime startOfMonth = YearMonth.now().atDay(1).atStartOfDay();
        long enquiriesThisMonth = enquiryRepository.countByCreatedAtAfter(startOfMonth);
        
        long totalQuotations = quotationRepository.count();
        long draftQuotations = quotationRepository.countByStatus("DRAFT");
        long sentQuotations = quotationRepository.countByStatus("SENT");
        long acceptedQuotations = quotationRepository.countByStatus("ACCEPTED");
        long rejectedQuotations = quotationRepository.countByStatus("REJECTED");
        long expiredQuotations = quotationRepository.countByStatus("EXPIRED");
        
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
        
        Map<String, Long> quotationsByStatus = new HashMap<>();
        quotationsByStatus.put("DRAFT", draftQuotations);
        quotationsByStatus.put("SENT", sentQuotations);
        quotationsByStatus.put("ACCEPTED", acceptedQuotations);
        quotationsByStatus.put("REJECTED", rejectedQuotations);
        quotationsByStatus.put("EXPIRED", expiredQuotations);
        stats.put("quotationsByStatus", quotationsByStatus);
        
        stats.put("recentActivities", activityRepository.findTop50ByOrderByCreatedAtDesc());
        stats.put("recentEnquiries", enquiryRepository.findTop5ByOrderByCreatedAtDesc());
        return ResponseEntity.ok(stats);
    }
}
