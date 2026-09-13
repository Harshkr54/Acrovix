package com.acrovix.admin.service;

import com.acrovix.admin.entity.AdminActivity;
import com.acrovix.admin.entity.AdminEnquiry;
import com.acrovix.admin.entity.Quotation;
import com.acrovix.admin.repository.AdminActivityRepository;
import com.acrovix.admin.repository.AdminEnquiryRepository;
import com.acrovix.admin.repository.QuotationRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final AdminEnquiryRepository enquiryRepository;
    private final QuotationRepository quotationRepository;
    private final AdminActivityRepository activityRepository;

    private static final Set<String> VALID_DATE_RANGES = Set.of(
            "ALL_TIME", "TODAY", "LAST_7_DAYS", "LAST_30_DAYS", "THIS_MONTH", "THIS_YEAR", "CUSTOM"
    );

    private static final Set<String> VALID_ENQUIRY_STATUSES = Set.of(
            "ALL", "NEW", "CONTACTED", "QUOTED", "CONVERTED", "CLOSED"
    );

    private static final Set<String> VALID_QUOTATION_STATUSES = Set.of(
            "ALL", "DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"
    );

    @Transactional(readOnly = true)
    public Map<String, Object> getDashboardStats(
            String dateRangeOpt,
            String enquiryStatusOpt,
            String quotationStatusOpt,
            String fromDateStr,
            String toDateStr) {

        String dateRange = (dateRangeOpt == null || dateRangeOpt.isBlank()) ? "ALL_TIME" : dateRangeOpt.toUpperCase().trim();
        String enquiryStatus = (enquiryStatusOpt == null || enquiryStatusOpt.isBlank()) ? "ALL" : enquiryStatusOpt.toUpperCase().trim();
        String quotationStatus = (quotationStatusOpt == null || quotationStatusOpt.isBlank()) ? "ALL" : quotationStatusOpt.toUpperCase().trim();

        validateParameters(dateRange, enquiryStatus, quotationStatus);

        LocalDateTime[] timeBounds = resolveTimeBounds(dateRange, fromDateStr, toDateStr);
        LocalDateTime start = timeBounds[0];
        LocalDateTime end = timeBounds[1];

        // Specification for Enquiries
        Specification<AdminEnquiry> enquirySpec = getEnquirySpec(start, end, enquiryStatus);
        long totalEnquiries = enquiryRepository.count(enquirySpec);

        // New enquiries count
        long newEnquiries = 0;
        if ("ALL".equals(enquiryStatus) || "NEW".equals(enquiryStatus)) {
            Specification<AdminEnquiry> newEnquirySpec = getEnquirySpec(start, end, "NEW");
            newEnquiries = enquiryRepository.count(newEnquirySpec);
        }

        // Enquiries this month count
        LocalDateTime startOfMonth = YearMonth.now().atDay(1).atStartOfDay();
        LocalDateTime startOfNextMonth = YearMonth.now().plusMonths(1).atDay(1).atStartOfDay();
        Specification<AdminEnquiry> monthEnquirySpec = getEnquirySpec(startOfMonth, startOfNextMonth, enquiryStatus);
        long enquiriesThisMonth = enquiryRepository.count(monthEnquirySpec);

        // Specification for Quotations (Strict Trash Exclusion: deletedAt IS NULL)
        Specification<Quotation> quotationSpec = getQuotationSpec(start, end, quotationStatus);
        long totalQuotations = quotationRepository.count(quotationSpec);

        // Accepted quotations count (Strict Trash Exclusion)
        long acceptedQuotations = 0;
        if ("ALL".equals(quotationStatus) || "ACCEPTED".equals(quotationStatus)) {
            Specification<Quotation> acceptedSpec = getQuotationSpec(start, end, "ACCEPTED");
            acceptedQuotations = quotationRepository.count(acceptedSpec);
        }

        double conversionRate = 0.0;
        if (totalQuotations > 0) {
            conversionRate = (double) acceptedQuotations / totalQuotations * 100.0;
        }

        // Quotation Status Breakdown (Strict Trash Exclusion)
        Map<String, Long> quotationsByStatus = getQuotationStatusBreakdown(start, end, quotationStatus);

        // Recent Activities (filtered by date range if specified)
        List<AdminActivity> recentActivities;
        if (start != null && end != null) {
            recentActivities = activityRepository.findTop50ByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(start, end);
        } else {
            recentActivities = activityRepository.findTop50ByOrderByCreatedAtDesc();
        }

        // Recent Enquiries
        List<AdminEnquiry> recentEnquiries = enquiryRepository.findAll(
                enquirySpec,
                PageRequest.of(0, 5, Sort.by("createdAt").descending())
        ).getContent();

        // Monthly Overview Chart Data (Last 6 Months)
        List<Map<String, Object>> monthlyOverview = generateMonthlyOverview(enquiryStatus);

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalEnquiries", totalEnquiries);
        stats.put("newEnquiries", newEnquiries);
        stats.put("enquiriesThisMonth", enquiriesThisMonth);
        stats.put("totalQuotations", totalQuotations);
        stats.put("acceptedQuotations", acceptedQuotations);
        stats.put("conversionRate", Math.round(conversionRate * 10.0) / 10.0);
        stats.put("quotationsByStatus", quotationsByStatus);
        stats.put("recentActivities", recentActivities);
        stats.put("recentEnquiries", recentEnquiries);
        stats.put("monthlyOverview", monthlyOverview);

        return stats;
    }

    private void validateParameters(String dateRange, String enquiryStatus, String quotationStatus) {
        if (!VALID_DATE_RANGES.contains(dateRange)) {
            throw new IllegalArgumentException("Invalid date range parameter: " + dateRange);
        }
        if (!VALID_ENQUIRY_STATUSES.contains(enquiryStatus)) {
            throw new IllegalArgumentException("Invalid enquiry status parameter: " + enquiryStatus);
        }
        if (!VALID_QUOTATION_STATUSES.contains(quotationStatus)) {
            throw new IllegalArgumentException("Invalid quotation status parameter: " + quotationStatus);
        }
    }

    private LocalDateTime[] resolveTimeBounds(String dateRange, String fromDateStr, String toDateStr) {
        LocalDateTime start = null;
        LocalDateTime end = null;
        LocalDate today = LocalDate.now();

        switch (dateRange) {
            case "TODAY":
                start = today.atStartOfDay();
                end = today.plusDays(1).atStartOfDay();
                break;
            case "LAST_7_DAYS":
                start = today.minusDays(6).atStartOfDay();
                end = today.plusDays(1).atStartOfDay();
                break;
            case "LAST_30_DAYS":
                start = today.minusDays(29).atStartOfDay();
                end = today.plusDays(1).atStartOfDay();
                break;
            case "THIS_MONTH":
                start = YearMonth.now().atDay(1).atStartOfDay();
                end = YearMonth.now().plusMonths(1).atDay(1).atStartOfDay();
                break;
            case "THIS_YEAR":
                start = today.withDayOfYear(1).atStartOfDay();
                end = today.plusYears(1).withDayOfYear(1).atStartOfDay();
                break;
            case "CUSTOM":
                if (fromDateStr == null || fromDateStr.isBlank() || toDateStr == null || toDateStr.isBlank()) {
                    throw new IllegalArgumentException("fromDate and toDate are required for CUSTOM date range");
                }
                try {
                    LocalDate fromDate = LocalDate.parse(fromDateStr.trim());
                    LocalDate toDate = LocalDate.parse(toDateStr.trim());
                    if (fromDate.isAfter(toDate)) {
                        throw new IllegalArgumentException("fromDate cannot be after toDate");
                    }
                    start = fromDate.atStartOfDay();
                    end = toDate.plusDays(1).atStartOfDay();
                } catch (DateTimeParseException e) {
                    throw new IllegalArgumentException("Invalid date format for custom range. Expected YYYY-MM-DD");
                }
                break;
            case "ALL_TIME":
            default:
                break;
        }

        return new LocalDateTime[]{start, end};
    }

    private Specification<AdminEnquiry> getEnquirySpec(LocalDateTime start, LocalDateTime end, String status) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (start != null && end != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), start));
                predicates.add(cb.lessThan(root.get("createdAt"), end));
            }
            if (status != null && !"ALL".equalsIgnoreCase(status)) {
                predicates.add(cb.equal(cb.upper(root.get("status")), status.toUpperCase()));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Specification<Quotation> getQuotationSpec(LocalDateTime start, LocalDateTime end, String status) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            // Mandatory Trash Exclusion rule
            predicates.add(cb.isNull(root.get("deletedAt")));

            if (start != null && end != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), start));
                predicates.add(cb.lessThan(root.get("createdAt"), end));
            }
            if (status != null && !"ALL".equalsIgnoreCase(status)) {
                predicates.add(cb.equal(cb.upper(root.get("status")), status.toUpperCase()));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Map<String, Long> getQuotationStatusBreakdown(LocalDateTime start, LocalDateTime end, String filterStatus) {
        Map<String, Long> map = new HashMap<>();
        List<String> statuses = "ALL".equals(filterStatus)
                ? List.of("DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED")
                : List.of(filterStatus);

        for (String st : statuses) {
            Specification<Quotation> spec = getQuotationSpec(start, end, st);
            long count = quotationRepository.count(spec);
            map.put(st, count);
        }
        return map;
    }

    private List<Map<String, Object>> generateMonthlyOverview(String enquiryStatus) {
        List<Map<String, Object>> list = new ArrayList<>();
        YearMonth current = YearMonth.now();

        for (int i = 5; i >= 0; i--) {
            YearMonth ym = current.minusMonths(i);
            LocalDateTime monthStart = ym.atDay(1).atStartOfDay();
            LocalDateTime monthEnd = ym.plusMonths(1).atDay(1).atStartOfDay();

            Specification<AdminEnquiry> totalSpec = getEnquirySpec(monthStart, monthEnd, enquiryStatus);
            long total = enquiryRepository.count(totalSpec);

            Specification<AdminEnquiry> newSpec = getEnquirySpec(monthStart, monthEnd, "ALL".equals(enquiryStatus) ? "NEW" : enquiryStatus);
            long newCount = enquiryRepository.count(newSpec);

            Map<String, Object> monthData = new HashMap<>();
            monthData.put("month", ym.format(DateTimeFormatter.ofPattern("MMM")));
            monthData.put("totalEnquiries", total);
            monthData.put("newEnquiries", newCount);
            list.add(monthData);
        }

        return list;
    }
}
