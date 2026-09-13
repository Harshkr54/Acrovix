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

        // Overview Chart Data synchronized with applied dateRange
        List<Map<String, Object>> monthlyOverview = generateOverviewChartData(dateRange, start, end, enquiryStatus);

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

    private List<Map<String, Object>> generateOverviewChartData(
            String dateRange,
            LocalDateTime start,
            LocalDateTime end,
            String enquiryStatus) {

        List<Map<String, Object>> list = new ArrayList<>();
        LocalDate today = LocalDate.now();

        switch (dateRange) {
            case "TODAY": {
                // 24 Hourly buckets (00:00 to 23:00)
                for (int hour = 0; hour < 24; hour++) {
                    LocalDateTime hStart = today.atTime(hour, 0, 0);
                    LocalDateTime hEnd = hStart.plusHours(1);

                    long total = countEnquiriesInRange(hStart, hEnd, enquiryStatus);
                    long newCount = countEnquiriesInRange(hStart, hEnd, "ALL".equals(enquiryStatus) ? "NEW" : enquiryStatus);

                    Map<String, Object> bucketData = new HashMap<>();
                    bucketData.put("month", String.format("%02d:00", hour));
                    bucketData.put("totalEnquiries", total);
                    bucketData.put("newEnquiries", newCount);
                    list.add(bucketData);
                }
                break;
            }
            case "LAST_7_DAYS": {
                // 7 Daily buckets
                for (int i = 6; i >= 0; i--) {
                    LocalDate d = today.minusDays(i);
                    LocalDateTime dStart = d.atStartOfDay();
                    LocalDateTime dEnd = d.plusDays(1).atStartOfDay();

                    long total = countEnquiriesInRange(dStart, dEnd, enquiryStatus);
                    long newCount = countEnquiriesInRange(dStart, dEnd, "ALL".equals(enquiryStatus) ? "NEW" : enquiryStatus);

                    Map<String, Object> bucketData = new HashMap<>();
                    bucketData.put("month", d.format(DateTimeFormatter.ofPattern("dd MMM")));
                    bucketData.put("totalEnquiries", total);
                    bucketData.put("newEnquiries", newCount);
                    list.add(bucketData);
                }
                break;
            }
            case "LAST_30_DAYS": {
                // 30 Daily buckets
                for (int i = 29; i >= 0; i--) {
                    LocalDate d = today.minusDays(i);
                    LocalDateTime dStart = d.atStartOfDay();
                    LocalDateTime dEnd = d.plusDays(1).atStartOfDay();

                    long total = countEnquiriesInRange(dStart, dEnd, enquiryStatus);
                    long newCount = countEnquiriesInRange(dStart, dEnd, "ALL".equals(enquiryStatus) ? "NEW" : enquiryStatus);

                    Map<String, Object> bucketData = new HashMap<>();
                    bucketData.put("month", d.format(DateTimeFormatter.ofPattern("dd MMM")));
                    bucketData.put("totalEnquiries", total);
                    bucketData.put("newEnquiries", newCount);
                    list.add(bucketData);
                }
                break;
            }
            case "THIS_MONTH": {
                // Daily buckets for every day in current month
                YearMonth ym = YearMonth.now();
                int daysInMonth = ym.lengthOfMonth();
                for (int day = 1; day <= daysInMonth; day++) {
                    LocalDate d = ym.atDay(day);
                    LocalDateTime dStart = d.atStartOfDay();
                    LocalDateTime dEnd = d.plusDays(1).atStartOfDay();

                    long total = countEnquiriesInRange(dStart, dEnd, enquiryStatus);
                    long newCount = countEnquiriesInRange(dStart, dEnd, "ALL".equals(enquiryStatus) ? "NEW" : enquiryStatus);

                    Map<String, Object> bucketData = new HashMap<>();
                    bucketData.put("month", d.format(DateTimeFormatter.ofPattern("dd MMM")));
                    bucketData.put("totalEnquiries", total);
                    bucketData.put("newEnquiries", newCount);
                    list.add(bucketData);
                }
                break;
            }
            case "THIS_YEAR": {
                // 12 Monthly buckets for current year
                int currentYear = today.getYear();
                for (int month = 1; month <= 12; month++) {
                    YearMonth ym = YearMonth.of(currentYear, month);
                    LocalDateTime mStart = ym.atDay(1).atStartOfDay();
                    LocalDateTime mEnd = ym.plusMonths(1).atDay(1).atStartOfDay();

                    long total = countEnquiriesInRange(mStart, mEnd, enquiryStatus);
                    long newCount = countEnquiriesInRange(mStart, mEnd, "ALL".equals(enquiryStatus) ? "NEW" : enquiryStatus);

                    Map<String, Object> bucketData = new HashMap<>();
                    bucketData.put("month", ym.format(DateTimeFormatter.ofPattern("MMM")));
                    bucketData.put("totalEnquiries", total);
                    bucketData.put("newEnquiries", newCount);
                    list.add(bucketData);
                }
                break;
            }
            case "CUSTOM": {
                if (start != null && end != null) {
                    long daysDiff = java.time.temporal.ChronoUnit.DAYS.between(start.toLocalDate(), end.toLocalDate());
                    if (daysDiff <= 31) {
                        // Daily buckets
                        LocalDate curr = start.toLocalDate();
                        LocalDate endDate = end.toLocalDate();
                        while (!curr.isAfter(endDate)) {
                            LocalDateTime dStart = curr.atStartOfDay();
                            LocalDateTime dEnd = curr.plusDays(1).atStartOfDay();

                            long total = countEnquiriesInRange(dStart, dEnd, enquiryStatus);
                            long newCount = countEnquiriesInRange(dStart, dEnd, "ALL".equals(enquiryStatus) ? "NEW" : enquiryStatus);

                            Map<String, Object> bucketData = new HashMap<>();
                            bucketData.put("month", curr.format(DateTimeFormatter.ofPattern("dd MMM")));
                            bucketData.put("totalEnquiries", total);
                            bucketData.put("newEnquiries", newCount);
                            list.add(bucketData);

                            curr = curr.plusDays(1);
                        }
                    } else {
                        // Monthly buckets
                        YearMonth startYm = YearMonth.from(start);
                        YearMonth endYm = YearMonth.from(end);
                        YearMonth curr = startYm;
                        while (!curr.isAfter(endYm)) {
                            LocalDateTime mStart = curr.atDay(1).atStartOfDay();
                            LocalDateTime mEnd = curr.plusMonths(1).atDay(1).atStartOfDay();

                            long total = countEnquiriesInRange(mStart, mEnd, enquiryStatus);
                            long newCount = countEnquiriesInRange(mStart, mEnd, "ALL".equals(enquiryStatus) ? "NEW" : enquiryStatus);

                            Map<String, Object> bucketData = new HashMap<>();
                            bucketData.put("month", curr.format(DateTimeFormatter.ofPattern("MMM yy")));
                            bucketData.put("totalEnquiries", total);
                            bucketData.put("newEnquiries", newCount);
                            list.add(bucketData);

                            curr = curr.plusMonths(1);
                        }
                    }
                }
                break;
            }
            case "ALL_TIME":
            default: {
                // True all-time monthly aggregation from earliest enquiry to current month
                LocalDateTime minCreated = enquiryRepository.findMinCreatedAt();
                YearMonth startYm = minCreated != null ? YearMonth.from(minCreated) : YearMonth.now().minusMonths(5);
                YearMonth currentYm = YearMonth.now();

                // Guarantee at least 6 months if history is short
                if (java.time.temporal.ChronoUnit.MONTHS.between(startYm, currentYm) < 5) {
                    startYm = currentYm.minusMonths(5);
                }

                YearMonth curr = startYm;
                boolean spansMultipleYears = startYm.getYear() != currentYm.getYear();
                DateTimeFormatter fmt = spansMultipleYears ? DateTimeFormatter.ofPattern("MMM yy") : DateTimeFormatter.ofPattern("MMM");

                while (!curr.isAfter(currentYm)) {
                    LocalDateTime mStart = curr.atDay(1).atStartOfDay();
                    LocalDateTime mEnd = curr.plusMonths(1).atDay(1).atStartOfDay();

                    long total = countEnquiriesInRange(mStart, mEnd, enquiryStatus);
                    long newCount = countEnquiriesInRange(mStart, mEnd, "ALL".equals(enquiryStatus) ? "NEW" : enquiryStatus);

                    Map<String, Object> bucketData = new HashMap<>();
                    bucketData.put("month", curr.format(fmt));
                    bucketData.put("totalEnquiries", total);
                    bucketData.put("newEnquiries", newCount);
                    list.add(bucketData);

                    curr = curr.plusMonths(1);
                }
                break;
            }
        }

        return list;
    }

    private long countEnquiriesInRange(LocalDateTime start, LocalDateTime end, String status) {
        Specification<AdminEnquiry> spec = getEnquirySpec(start, end, status);
        return enquiryRepository.count(spec);
    }
}
