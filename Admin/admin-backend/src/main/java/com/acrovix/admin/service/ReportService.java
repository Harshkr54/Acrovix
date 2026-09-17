package com.acrovix.admin.service;

import com.acrovix.admin.dto.report.*;
import com.acrovix.admin.entity.InvoiceStatus;
import com.acrovix.admin.entity.InvoiceType;
import com.acrovix.admin.entity.PaymentMethod;
import com.acrovix.admin.entity.PaymentStatus;
import com.acrovix.admin.entity.PurchaseOrderStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    @PersistenceContext
    private final EntityManager entityManager;

    private final PaymentService paymentService;

    public static class DateRange {
        public final LocalDate fromDate;
        public final LocalDate toDate;
        public final LocalDateTime startDateTime;
        public final LocalDateTime endDateTime;
        public final String preset;

        public DateRange(LocalDate fromDate, LocalDate toDate, String preset) {
            this.fromDate = fromDate;
            this.toDate = toDate;
            this.startDateTime = fromDate.atStartOfDay();
            this.endDateTime = toDate.atTime(LocalTime.MAX);
            this.preset = preset;
        }
    }

    public DateRange resolveDateRange(String presetOpt, String fromDateStr, String toDateStr) {
        String preset = (presetOpt == null || presetOpt.isBlank()) ? "THIS_FINANCIAL_YEAR" : presetOpt.toUpperCase().trim();
        LocalDate today = LocalDate.now();
        LocalDate fromDate;
        LocalDate toDate;

        switch (preset) {
            case "TODAY":
                fromDate = today;
                toDate = today;
                break;
            case "THIS_WEEK":
                fromDate = today.with(DayOfWeek.MONDAY);
                toDate = today.with(DayOfWeek.SUNDAY);
                break;
            case "THIS_MONTH":
                fromDate = today.withDayOfMonth(1);
                toDate = today.withDayOfMonth(today.lengthOfMonth());
                break;
            case "THIS_QUARTER":
                int month = today.getMonthValue();
                int qStartMonth = ((month - 1) / 3) * 3 + 1;
                fromDate = LocalDate.of(today.getYear(), qStartMonth, 1);
                toDate = fromDate.plusMonths(3).minusDays(1);
                break;
            case "THIS_FINANCIAL_YEAR":
                int yr = today.getYear();
                if (today.getMonthValue() >= 4) {
                    fromDate = LocalDate.of(yr, 4, 1);
                    toDate = LocalDate.of(yr + 1, 3, 31);
                } else {
                    fromDate = LocalDate.of(yr - 1, 4, 1);
                    toDate = LocalDate.of(yr, 3, 31);
                }
                break;
            case "PREVIOUS_FINANCIAL_YEAR":
                int currentYr = today.getYear();
                if (today.getMonthValue() >= 4) {
                    fromDate = LocalDate.of(currentYr - 1, 4, 1);
                    toDate = LocalDate.of(currentYr, 3, 31);
                } else {
                    fromDate = LocalDate.of(currentYr - 2, 4, 1);
                    toDate = LocalDate.of(currentYr - 1, 3, 31);
                }
                break;
            case "CUSTOM":
                if (fromDateStr == null || fromDateStr.isBlank() || toDateStr == null || toDateStr.isBlank()) {
                    throw new IllegalArgumentException("fromDate and toDate are required for CUSTOM date range.");
                }
                try {
                    fromDate = LocalDate.parse(fromDateStr.trim());
                    toDate = LocalDate.parse(toDateStr.trim());
                } catch (Exception e) {
                    throw new IllegalArgumentException("Invalid date format. Use YYYY-MM-DD.");
                }
                if (fromDate.isAfter(toDate)) {
                    throw new IllegalArgumentException("fromDate cannot be after toDate.");
                }
                break;
            default:
                // Default to THIS_FINANCIAL_YEAR
                int defaultYr = today.getYear();
                if (today.getMonthValue() >= 4) {
                    fromDate = LocalDate.of(defaultYr, 4, 1);
                    toDate = LocalDate.of(defaultYr + 1, 3, 31);
                } else {
                    fromDate = LocalDate.of(defaultYr - 1, 4, 1);
                    toDate = LocalDate.of(defaultYr, 3, 31);
                }
                preset = "THIS_FINANCIAL_YEAR";
                break;
        }

        return new DateRange(fromDate, toDate, preset);
    }

    @Transactional(readOnly = true)
    public ReportSummaryResponse getSummaryReport(String preset, String fromDateStr, String toDateStr) {
        DateRange range = resolveDateRange(preset, fromDateStr, toDateStr);

        long totalEnquiries = getScalarCount(
            "SELECT COUNT(e) FROM AdminEnquiry e WHERE e.createdAt BETWEEN :start AND :end",
            range.startDateTime, range.endDateTime
        );

        long totalQuotations = getScalarCount(
            "SELECT COUNT(q) FROM Quotation q WHERE q.deletedAt IS NULL AND q.createdAt BETWEEN :start AND :end",
            range.startDateTime, range.endDateTime
        );

        BigDecimal totalQuotationValue = getScalarSum(
            "SELECT COALESCE(SUM(q.grandTotal), 0) FROM Quotation q WHERE q.deletedAt IS NULL AND q.createdAt BETWEEN :start AND :end",
            range.startDateTime, range.endDateTime
        );

        BigDecimal acceptedQuotationValue = getScalarSum(
            "SELECT COALESCE(SUM(q.grandTotal), 0) FROM Quotation q WHERE q.deletedAt IS NULL AND q.status = 'ACCEPTED' AND q.createdAt BETWEEN :start AND :end",
            range.startDateTime, range.endDateTime
        );

        long totalPurchaseOrders = getScalarCountDate(
            "SELECT COUNT(p) FROM PurchaseOrder p WHERE p.deletedAt IS NULL AND p.poDate BETWEEN :fromDate AND :toDate",
            range.fromDate, range.toDate
        );

        BigDecimal totalPoValue = getScalarSumDate(
            "SELECT COALESCE(SUM(p.poValue), 0) FROM PurchaseOrder p WHERE p.deletedAt IS NULL AND p.poDate BETWEEN :fromDate AND :toDate",
            range.fromDate, range.toDate
        );

        long totalInvoices = getScalarCountDate(
            "SELECT COUNT(i) FROM Invoice i WHERE i.invoiceType = :type AND i.invoiceDate BETWEEN :fromDate AND :toDate",
            InvoiceType.TAX_INVOICE, range.fromDate, range.toDate
        );

        BigDecimal totalInvoiced = getScalarSumDateWithStatusNot(
            "SELECT COALESCE(SUM(i.grandTotal), 0) FROM Invoice i WHERE i.invoiceType = :type AND i.status != :status AND i.invoiceDate BETWEEN :fromDate AND :toDate",
            InvoiceType.TAX_INVOICE, InvoiceStatus.CANCELLED, range.fromDate, range.toDate
        );

        BigDecimal totalReceived = getScalarSumDatePayment(
            "SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.status = :status AND p.paymentDate BETWEEN :fromDate AND :toDate",
            PaymentStatus.RECORDED, range.fromDate, range.toDate
        );

        BigDecimal outstanding = totalInvoiced.subtract(totalReceived);
        if (outstanding.compareTo(BigDecimal.ZERO) < 0) {
            outstanding = BigDecimal.ZERO;
        }

        BigDecimal overdue = getScalarSumDateWithStatusNot(
            "SELECT COALESCE(SUM(i.balanceDue), 0) FROM Invoice i WHERE i.invoiceType = :type AND i.status IN ('ISSUED', 'PARTIALLY_PAID') AND i.dueDate < :today AND i.invoiceDate BETWEEN :fromDate AND :toDate",
            InvoiceType.TAX_INVOICE, LocalDate.now(), range.fromDate, range.toDate
        );

        return ReportSummaryResponse.builder()
                .totalEnquiries(totalEnquiries)
                .totalQuotations(totalQuotations)
                .totalQuotationValue(totalQuotationValue)
                .acceptedQuotationValue(acceptedQuotationValue)
                .totalPurchaseOrders(totalPurchaseOrders)
                .totalPoValue(totalPoValue)
                .totalInvoices(totalInvoices)
                .totalInvoiced(totalInvoiced)
                .totalReceived(totalReceived)
                .outstanding(outstanding)
                .overdue(overdue)
                .fromDate(range.fromDate)
                .toDate(range.toDate)
                .preset(range.preset)
                .build();
    }

    @Transactional(readOnly = true)
    public QuotationReportResponse getQuotationReport(String preset, String fromDateStr, String toDateStr) {
        DateRange range = resolveDateRange(preset, fromDateStr, toDateStr);

        long totalQuotations = getScalarCount(
            "SELECT COUNT(q) FROM Quotation q WHERE q.deletedAt IS NULL AND q.createdAt BETWEEN :start AND :end",
            range.startDateTime, range.endDateTime
        );

        List<Object[]> statusCounts = entityManager.createQuery(
            "SELECT q.status, COUNT(q), COALESCE(SUM(q.grandTotal), 0) FROM Quotation q WHERE q.deletedAt IS NULL AND q.createdAt BETWEEN :start AND :end GROUP BY q.status",
            Object[].class)
            .setParameter("start", range.startDateTime)
            .setParameter("end", range.endDateTime)
            .getResultList();

        long draft = 0, sent = 0, accepted = 0, rejected = 0, revised = 0, converted = 0;
        BigDecimal acceptedVal = BigDecimal.ZERO;
        BigDecimal rejectedVal = BigDecimal.ZERO;
        BigDecimal totalVal = BigDecimal.ZERO;

        for (Object[] row : statusCounts) {
            String st = row[0] != null ? row[0].toString() : "";
            long cnt = ((Number) row[1]).longValue();
            BigDecimal val = (BigDecimal) row[2];

            totalVal = totalVal.add(val);

            switch (st.toUpperCase()) {
                case "DRAFT": draft += cnt; break;
                case "SENT": sent += cnt; break;
                case "ACCEPTED": accepted += cnt; acceptedVal = acceptedVal.add(val); break;
                case "REJECTED": rejected += cnt; rejectedVal = rejectedVal.add(val); break;
                case "REVISED": revised += cnt; break;
                case "CONVERTED": converted += cnt; break;
            }
        }

        return QuotationReportResponse.builder()
                .totalQuotations(totalQuotations)
                .draftCount(draft)
                .sentCount(sent)
                .acceptedCount(accepted)
                .rejectedCount(rejected)
                .revisedCount(revised)
                .convertedCount(converted)
                .totalQuotationValue(totalVal)
                .acceptedQuotationValue(acceptedVal)
                .rejectedQuotationValue(rejectedVal)
                .build();
    }

    @Transactional(readOnly = true)
    public PurchaseOrderReportResponse getPurchaseOrderReport(String preset, String fromDateStr, String toDateStr) {
        DateRange range = resolveDateRange(preset, fromDateStr, toDateStr);

        long totalPOs = getScalarCountDate(
            "SELECT COUNT(p) FROM PurchaseOrder p WHERE p.deletedAt IS NULL AND p.poDate BETWEEN :fromDate AND :toDate",
            range.fromDate, range.toDate
        );

        List<Object[]> statusCounts = entityManager.createQuery(
            "SELECT p.status, COUNT(p), COALESCE(SUM(p.poValue), 0) FROM PurchaseOrder p WHERE p.deletedAt IS NULL AND p.poDate BETWEEN :fromDate AND :toDate GROUP BY p.status",
            Object[].class)
            .setParameter("fromDate", range.fromDate)
            .setParameter("toDate", range.toDate)
            .getResultList();

        long received = 0, verified = 0, partiallyFulfilled = 0, fulfilled = 0, cancelled = 0;
        BigDecimal totalVal = BigDecimal.ZERO;
        BigDecimal verifiedVal = BigDecimal.ZERO;

        for (Object[] row : statusCounts) {
            PurchaseOrderStatus st = (PurchaseOrderStatus) row[0];
            long cnt = ((Number) row[1]).longValue();
            BigDecimal val = (BigDecimal) row[2];

            totalVal = totalVal.add(val);

            if (st != null) {
                switch (st) {
                    case RECEIVED: received += cnt; break;
                    case VERIFIED: 
                        verified += cnt; 
                        verifiedVal = verifiedVal.add(val); 
                        break;
                    case PARTIALLY_FULFILLED: 
                        partiallyFulfilled += cnt; 
                        verifiedVal = verifiedVal.add(val); 
                        break;
                    case FULFILLED: 
                        fulfilled += cnt; 
                        verifiedVal = verifiedVal.add(val); 
                        break;
                    case CANCELLED: cancelled += cnt; break;
                }
            }
        }

        return PurchaseOrderReportResponse.builder()
                .totalPurchaseOrders(totalPOs)
                .receivedCount(received)
                .verifiedCount(verified)
                .partiallyFulfilledCount(partiallyFulfilled)
                .fulfilledCount(fulfilled)
                .cancelledCount(cancelled)
                .totalPoValue(totalVal)
                .verifiedPoValue(verifiedVal)
                .build();
    }

    @Transactional(readOnly = true)
    public InvoiceReportResponse getInvoiceReport(String preset, String fromDateStr, String toDateStr) {
        DateRange range = resolveDateRange(preset, fromDateStr, toDateStr);

        long totalInvoices = getScalarCountDate(
            "SELECT COUNT(i) FROM Invoice i WHERE i.invoiceType = :type AND i.invoiceDate BETWEEN :fromDate AND :toDate",
            InvoiceType.TAX_INVOICE, range.fromDate, range.toDate
        );

        List<Object[]> statusCounts = entityManager.createQuery(
            "SELECT i.status, COUNT(i) FROM Invoice i WHERE i.invoiceType = :type AND i.invoiceDate BETWEEN :fromDate AND :toDate GROUP BY i.status",
            Object[].class)
            .setParameter("type", InvoiceType.TAX_INVOICE)
            .setParameter("fromDate", range.fromDate)
            .setParameter("toDate", range.toDate)
            .getResultList();

        long draft = 0, issued = 0, partiallyPaid = 0, paid = 0, overdue = 0, cancelled = 0;
        for (Object[] row : statusCounts) {
            InvoiceStatus st = (InvoiceStatus) row[0];
            long cnt = ((Number) row[1]).longValue();
            if (st != null) {
                switch (st) {
                    case DRAFT: draft += cnt; break;
                    case ISSUED: issued += cnt; break;
                    case PARTIALLY_PAID: partiallyPaid += cnt; break;
                    case PAID: paid += cnt; break;
                    case CANCELLED: cancelled += cnt; break;
                }
            }
        }

        long overdueCount = getScalarCountDateWithStatusNot(
            "SELECT COUNT(i) FROM Invoice i WHERE i.invoiceType = :type AND i.status IN ('ISSUED', 'PARTIALLY_PAID') AND i.dueDate < :today AND i.invoiceDate BETWEEN :fromDate AND :toDate",
            InvoiceType.TAX_INVOICE, LocalDate.now(), range.fromDate, range.toDate
        );

        BigDecimal totalInvoiced = getScalarSumDateWithStatusNot(
            "SELECT COALESCE(SUM(i.grandTotal), 0) FROM Invoice i WHERE i.invoiceType = :type AND i.status != :status AND i.invoiceDate BETWEEN :fromDate AND :toDate",
            InvoiceType.TAX_INVOICE, InvoiceStatus.CANCELLED, range.fromDate, range.toDate
        );

        BigDecimal taxableValue = getScalarSumDateWithStatusNot(
            "SELECT COALESCE(SUM(i.taxableAmount), 0) FROM Invoice i WHERE i.invoiceType = :type AND i.status != :status AND i.invoiceDate BETWEEN :fromDate AND :toDate",
            InvoiceType.TAX_INVOICE, InvoiceStatus.CANCELLED, range.fromDate, range.toDate
        );

        BigDecimal taxAmount = getScalarSumDateWithStatusNot(
            "SELECT COALESCE(SUM(i.taxAmount), 0) FROM Invoice i WHERE i.invoiceType = :type AND i.status != :status AND i.invoiceDate BETWEEN :fromDate AND :toDate",
            InvoiceType.TAX_INVOICE, InvoiceStatus.CANCELLED, range.fromDate, range.toDate
        );

        BigDecimal discountAmount = getScalarSumDateWithStatusNot(
            "SELECT COALESCE(SUM(i.discountAmount), 0) FROM Invoice i WHERE i.invoiceType = :type AND i.status != :status AND i.invoiceDate BETWEEN :fromDate AND :toDate",
            InvoiceType.TAX_INVOICE, InvoiceStatus.CANCELLED, range.fromDate, range.toDate
        );

        BigDecimal amountReceived = getScalarSumDatePayment(
            "SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.status = :status AND p.paymentDate BETWEEN :fromDate AND :toDate",
            PaymentStatus.RECORDED, range.fromDate, range.toDate
        );

        BigDecimal outstanding = totalInvoiced.subtract(amountReceived);
        if (outstanding.compareTo(BigDecimal.ZERO) < 0) {
            outstanding = BigDecimal.ZERO;
        }

        BigDecimal overdueVal = getScalarSumDateWithStatusNot(
            "SELECT COALESCE(SUM(i.balanceDue), 0) FROM Invoice i WHERE i.invoiceType = :type AND i.status IN ('ISSUED', 'PARTIALLY_PAID') AND i.dueDate < :today AND i.invoiceDate BETWEEN :fromDate AND :toDate",
            InvoiceType.TAX_INVOICE, LocalDate.now(), range.fromDate, range.toDate
        );

        return InvoiceReportResponse.builder()
                .totalInvoices(totalInvoices)
                .draftCount(draft)
                .issuedCount(issued)
                .partiallyPaidCount(partiallyPaid)
                .paidCount(paid)
                .overdueCount(overdueCount)
                .cancelledCount(cancelled)
                .totalInvoiced(totalInvoiced)
                .taxableValue(taxableValue)
                .taxAmount(taxAmount)
                .discountAmount(discountAmount)
                .amountReceived(amountReceived)
                .outstanding(outstanding)
                .overdue(overdueVal)
                .build();
    }

    @Transactional(readOnly = true)
    public PaymentReportResponse getPaymentReport(String preset, String fromDateStr, String toDateStr) {
        DateRange range = resolveDateRange(preset, fromDateStr, toDateStr);

        long totalPayments = getScalarCountDatePayment(
            "SELECT COUNT(p) FROM Payment p WHERE p.status = :status AND p.paymentDate BETWEEN :fromDate AND :toDate",
            PaymentStatus.RECORDED, range.fromDate, range.toDate
        );

        BigDecimal totalReceived = getScalarSumDatePayment(
            "SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.status = :status AND p.paymentDate BETWEEN :fromDate AND :toDate",
            PaymentStatus.RECORDED, range.fromDate, range.toDate
        );

        List<Object[]> methodRows = entityManager.createQuery(
            "SELECT p.paymentMethod, COUNT(p), COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.status = :status AND p.paymentDate BETWEEN :fromDate AND :toDate GROUP BY p.paymentMethod",
            Object[].class)
            .setParameter("status", PaymentStatus.RECORDED)
            .setParameter("fromDate", range.fromDate)
            .setParameter("toDate", range.toDate)
            .getResultList();

        Map<PaymentMethod, PaymentMethodSummary> breakdownMap = new LinkedHashMap<>();
        for (PaymentMethod pm : PaymentMethod.values()) {
            breakdownMap.put(pm, new PaymentMethodSummary(pm.name(), 0L, BigDecimal.ZERO));
        }

        for (Object[] row : methodRows) {
            PaymentMethod pm = (PaymentMethod) row[0];
            if (pm != null && breakdownMap.containsKey(pm)) {
                long cnt = ((Number) row[1]).longValue();
                BigDecimal amt = (BigDecimal) row[2];
                breakdownMap.put(pm, new PaymentMethodSummary(pm.name(), cnt, amt));
            }
        }

        return PaymentReportResponse.builder()
                .totalPayments(totalPayments)
                .totalReceived(totalReceived)
                .methodBreakdown(new ArrayList<>(breakdownMap.values()))
                .build();
    }

    @Transactional(readOnly = true)
    public List<CustomerAnalyticsDto> getCustomerAnalytics(String preset, String fromDateStr, String toDateStr) {
        DateRange range = resolveDateRange(preset, fromDateStr, toDateStr);

        List<Object[]> customerRows = entityManager.createQuery(
            "SELECT c.id, c.name, c.customerCode, c.companyName FROM Customer c WHERE c.active = true ORDER BY c.name ASC",
            Object[].class)
            .getResultList();

        List<CustomerAnalyticsDto> result = new ArrayList<>();

        for (Object[] row : customerRows) {
            Long cId = (Long) row[0];
            String cName = (String) row[1];
            String cCode = (String) row[2];
            String cCompany = (String) row[3];

            // Quotations count
            long qCount = getScalarCountCustomer(
                "SELECT COUNT(q) FROM Quotation q WHERE q.deletedAt IS NULL AND q.customer.id = :cId AND q.createdAt BETWEEN :start AND :end",
                cId, range.startDateTime, range.endDateTime
            );

            long acceptedQCount = getScalarCountCustomer(
                "SELECT COUNT(q) FROM Quotation q WHERE q.deletedAt IS NULL AND q.status = 'ACCEPTED' AND q.customer.id = :cId AND q.createdAt BETWEEN :start AND :end",
                cId, range.startDateTime, range.endDateTime
            );

            // PO Value
            BigDecimal poVal = getScalarSumCustomerDate(
                "SELECT COALESCE(SUM(p.poValue), 0) FROM PurchaseOrder p WHERE p.deletedAt IS NULL AND p.quotation.customer.id = :cId AND p.poDate BETWEEN :fromDate AND :toDate",
                cId, range.fromDate, range.toDate
            );

            // Invoiced Value
            BigDecimal invVal = getScalarSumCustomerDateInvoice(
                "SELECT COALESCE(SUM(i.grandTotal), 0) FROM Invoice i WHERE i.customer.id = :cId AND i.invoiceType = 'TAX_INVOICE' AND i.status != 'CANCELLED' AND i.invoiceDate BETWEEN :fromDate AND :toDate",
                cId, range.fromDate, range.toDate
            );

            // Received Value
            BigDecimal recVal = getScalarSumCustomerDatePayment(
                "SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.customer.id = :cId AND p.status = 'RECORDED' AND p.paymentDate BETWEEN :fromDate AND :toDate",
                cId, range.fromDate, range.toDate
            );

            BigDecimal outstanding = invVal.subtract(recVal);
            if (outstanding.compareTo(BigDecimal.ZERO) < 0) {
                outstanding = BigDecimal.ZERO;
            }

            BigDecimal overdue = getScalarSumCustomerDateOverdue(
                "SELECT COALESCE(SUM(i.balanceDue), 0) FROM Invoice i WHERE i.customer.id = :cId AND i.invoiceType = 'TAX_INVOICE' AND i.status IN ('ISSUED', 'PARTIALLY_PAID') AND i.dueDate < :today AND i.invoiceDate BETWEEN :fromDate AND :toDate",
                cId, LocalDate.now(), range.fromDate, range.toDate
            );

            result.add(CustomerAnalyticsDto.builder()
                    .customerId(cId)
                    .customerName(cName)
                    .customerCode(cCode)
                    .companyName(cCompany)
                    .quotationCount(qCount)
                    .acceptedQuotationCount(acceptedQCount)
                    .poValue(poVal)
                    .invoicedValue(invVal)
                    .receivedAmount(recVal)
                    .outstandingAmount(outstanding)
                    .overdueAmount(overdue)
                    .build());
        }

        return result;
    }

    @Transactional(readOnly = true)
    public List<MonthlyTrendDto> getMonthlyTrends(String preset, String fromDateStr, String toDateStr) {
        DateRange range = resolveDateRange(preset, fromDateStr, toDateStr);

        YearMonth startYm = YearMonth.from(range.fromDate);
        YearMonth endYm = YearMonth.from(range.toDate);

        List<MonthlyTrendDto> trends = new ArrayList<>();
        YearMonth curr = startYm;

        while (!curr.isAfter(endYm)) {
            LocalDate mFrom = curr.atDay(1);
            LocalDate mTo = curr.atEndOfMonth();
            LocalDateTime mStartDT = mFrom.atStartOfDay();
            LocalDateTime mEndDT = mTo.atTime(LocalTime.MAX);
            String monthLabel = curr.format(DateTimeFormatter.ofPattern("yyyy-MM"));

            BigDecimal qVal = getScalarSum(
                "SELECT COALESCE(SUM(q.grandTotal), 0) FROM Quotation q WHERE q.deletedAt IS NULL AND q.createdAt BETWEEN :start AND :end",
                mStartDT, mEndDT
            );

            BigDecimal iVal = getScalarSumDateWithStatusNot(
                "SELECT COALESCE(SUM(i.grandTotal), 0) FROM Invoice i WHERE i.invoiceType = :type AND i.status != :status AND i.invoiceDate BETWEEN :fromDate AND :toDate",
                InvoiceType.TAX_INVOICE, InvoiceStatus.CANCELLED, mFrom, mTo
            );

            BigDecimal pVal = getScalarSumDatePayment(
                "SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.status = :status AND p.paymentDate BETWEEN :fromDate AND :toDate",
                PaymentStatus.RECORDED, mFrom, mTo
            );

            trends.add(MonthlyTrendDto.builder()
                    .month(monthLabel)
                    .quotationValue(qVal)
                    .invoiceValue(iVal)
                    .paymentValue(pVal)
                    .build());

            curr = curr.plusMonths(1);
        }

        return trends;
    }

    @Transactional(readOnly = true)
    public String exportReportCsv(String reportType, String preset, String fromDateStr, String toDateStr) {
        String type = (reportType == null || reportType.isBlank()) ? "SUMMARY" : reportType.toUpperCase().trim();
        StringBuilder csv = new StringBuilder();

        switch (type) {
            case "QUOTATIONS":
                QuotationReportResponse qRep = getQuotationReport(preset, fromDateStr, toDateStr);
                csv.append("Metric,Value\n");
                csv.append("Total Quotations,").append(qRep.getTotalQuotations()).append("\n");
                csv.append("Draft Count,").append(qRep.getDraftCount()).append("\n");
                csv.append("Sent Count,").append(qRep.getSentCount()).append("\n");
                csv.append("Accepted Count,").append(qRep.getAcceptedCount()).append("\n");
                csv.append("Rejected Count,").append(qRep.getRejectedCount()).append("\n");
                csv.append("Revised Count,").append(qRep.getRevisedCount()).append("\n");
                csv.append("Converted Count,").append(qRep.getConvertedCount()).append("\n");
                csv.append("Total Quotation Value,").append(qRep.getTotalQuotationValue()).append("\n");
                csv.append("Accepted Quotation Value,").append(qRep.getAcceptedQuotationValue()).append("\n");
                csv.append("Rejected Quotation Value,").append(qRep.getRejectedQuotationValue()).append("\n");
                break;

            case "PAYMENTS":
                PaymentReportResponse pRep = getPaymentReport(preset, fromDateStr, toDateStr);
                csv.append("Metric / Method,Count,Amount Received\n");
                csv.append("Total Recorded Payments,").append(pRep.getTotalPayments()).append(",").append(pRep.getTotalReceived()).append("\n");
                for (PaymentMethodSummary ms : pRep.getMethodBreakdown()) {
                    csv.append(ms.getMethod()).append(",").append(ms.getCount()).append(",").append(ms.getAmount()).append("\n");
                }
                break;

            case "CUSTOMERS":
                List<CustomerAnalyticsDto> cList = getCustomerAnalytics(preset, fromDateStr, toDateStr);
                csv.append("Customer Code,Customer Name,Company,Quotations,Accepted,PO Value,Invoiced,Received,Outstanding,Overdue\n");
                for (CustomerAnalyticsDto c : cList) {
                    csv.append(sanitizeCsv(c.getCustomerCode())).append(",")
                       .append(sanitizeCsv(c.getCustomerName())).append(",")
                       .append(sanitizeCsv(c.getCompanyName())).append(",")
                       .append(c.getQuotationCount()).append(",")
                       .append(c.getAcceptedQuotationCount()).append(",")
                       .append(c.getPoValue()).append(",")
                       .append(c.getInvoicedValue()).append(",")
                       .append(c.getReceivedAmount()).append(",")
                       .append(c.getOutstandingAmount()).append(",")
                       .append(c.getOverdueAmount()).append("\n");
                }
                break;

            default: // SUMMARY
                ReportSummaryResponse sRep = getSummaryReport(preset, fromDateStr, toDateStr);
                csv.append("Metric,Value\n");
                csv.append("Preset,").append(sRep.getPreset()).append("\n");
                csv.append("From Date,").append(sRep.getFromDate()).append("\n");
                csv.append("To Date,").append(sRep.getToDate()).append("\n");
                csv.append("Total Enquiries,").append(sRep.getTotalEnquiries()).append("\n");
                csv.append("Total Quotations,").append(sRep.getTotalQuotations()).append("\n");
                csv.append("Total Quotation Value,").append(sRep.getTotalQuotationValue()).append("\n");
                csv.append("Accepted Quotation Value,").append(sRep.getAcceptedQuotationValue()).append("\n");
                csv.append("Total Purchase Orders,").append(sRep.getTotalPurchaseOrders()).append("\n");
                csv.append("Total PO Value,").append(sRep.getTotalPoValue()).append("\n");
                csv.append("Total Tax Invoices,").append(sRep.getTotalInvoices()).append("\n");
                csv.append("Total Invoiced,").append(sRep.getTotalInvoiced()).append("\n");
                csv.append("Total Received,").append(sRep.getTotalReceived()).append("\n");
                csv.append("Outstanding,").append(sRep.getOutstanding()).append("\n");
                csv.append("Overdue,").append(sRep.getOverdue()).append("\n");
                break;
        }

        return csv.toString();
    }

    private String sanitizeCsv(String val) {
        if (val == null) return "\"\"";
        return "\"" + val.replace("\"", "\"\"") + "\"";
    }

    // Helper query executions
    private long getScalarCount(String jpql, LocalDateTime start, LocalDateTime end) {
        return entityManager.createQuery(jpql, Long.class)
                .setParameter("start", start)
                .setParameter("end", end)
                .getSingleResult();
    }

    private BigDecimal getScalarSum(String jpql, LocalDateTime start, LocalDateTime end) {
        return entityManager.createQuery(jpql, BigDecimal.class)
                .setParameter("start", start)
                .setParameter("end", end)
                .getSingleResult();
    }

    private long getScalarCountDate(String jpql, LocalDate fromDate, LocalDate toDate) {
        return entityManager.createQuery(jpql, Long.class)
                .setParameter("fromDate", fromDate)
                .setParameter("toDate", toDate)
                .getSingleResult();
    }

    private BigDecimal getScalarSumDate(String jpql, LocalDate fromDate, LocalDate toDate) {
        return entityManager.createQuery(jpql, BigDecimal.class)
                .setParameter("fromDate", fromDate)
                .setParameter("toDate", toDate)
                .getSingleResult();
    }

    private long getScalarCountDate(String jpql, InvoiceType type, LocalDate fromDate, LocalDate toDate) {
        return entityManager.createQuery(jpql, Long.class)
                .setParameter("type", type)
                .setParameter("fromDate", fromDate)
                .setParameter("toDate", toDate)
                .getSingleResult();
    }

    private long getScalarCountDateWithStatusNot(String jpql, InvoiceType type, LocalDate today, LocalDate fromDate, LocalDate toDate) {
        return entityManager.createQuery(jpql, Long.class)
                .setParameter("type", type)
                .setParameter("today", today)
                .setParameter("fromDate", fromDate)
                .setParameter("toDate", toDate)
                .getSingleResult();
    }

    private BigDecimal getScalarSumDateWithStatusNot(String jpql, InvoiceType type, InvoiceStatus status, LocalDate fromDate, LocalDate toDate) {
        return entityManager.createQuery(jpql, BigDecimal.class)
                .setParameter("type", type)
                .setParameter("status", status)
                .setParameter("fromDate", fromDate)
                .setParameter("toDate", toDate)
                .getSingleResult();
    }

    private BigDecimal getScalarSumDateWithStatusNot(String jpql, InvoiceType type, LocalDate today, LocalDate fromDate, LocalDate toDate) {
        return entityManager.createQuery(jpql, BigDecimal.class)
                .setParameter("type", type)
                .setParameter("today", today)
                .setParameter("fromDate", fromDate)
                .setParameter("toDate", toDate)
                .getSingleResult();
    }

    private long getScalarCountDatePayment(String jpql, PaymentStatus status, LocalDate fromDate, LocalDate toDate) {
        return entityManager.createQuery(jpql, Long.class)
                .setParameter("status", status)
                .setParameter("fromDate", fromDate)
                .setParameter("toDate", toDate)
                .getSingleResult();
    }

    private BigDecimal getScalarSumDatePayment(String jpql, PaymentStatus status, LocalDate fromDate, LocalDate toDate) {
        return entityManager.createQuery(jpql, BigDecimal.class)
                .setParameter("status", status)
                .setParameter("fromDate", fromDate)
                .setParameter("toDate", toDate)
                .getSingleResult();
    }

    private long getScalarCountCustomer(String jpql, Long cId, LocalDateTime start, LocalDateTime end) {
        return entityManager.createQuery(jpql, Long.class)
                .setParameter("cId", cId)
                .setParameter("start", start)
                .setParameter("end", end)
                .getSingleResult();
    }

    private BigDecimal getScalarSumCustomerDate(String jpql, Long cId, LocalDate fromDate, LocalDate toDate) {
        return entityManager.createQuery(jpql, BigDecimal.class)
                .setParameter("cId", cId)
                .setParameter("fromDate", fromDate)
                .setParameter("toDate", toDate)
                .getSingleResult();
    }

    private BigDecimal getScalarSumCustomerDateInvoice(String jpql, Long cId, LocalDate fromDate, LocalDate toDate) {
        return entityManager.createQuery(jpql, BigDecimal.class)
                .setParameter("cId", cId)
                .setParameter("fromDate", fromDate)
                .setParameter("toDate", toDate)
                .getSingleResult();
    }

    private BigDecimal getScalarSumCustomerDatePayment(String jpql, Long cId, LocalDate fromDate, LocalDate toDate) {
        return entityManager.createQuery(jpql, BigDecimal.class)
                .setParameter("cId", cId)
                .setParameter("fromDate", fromDate)
                .setParameter("toDate", toDate)
                .getSingleResult();
    }

    private BigDecimal getScalarSumCustomerDateOverdue(String jpql, Long cId, LocalDate today, LocalDate fromDate, LocalDate toDate) {
        return entityManager.createQuery(jpql, BigDecimal.class)
                .setParameter("cId", cId)
                .setParameter("today", today)
                .setParameter("fromDate", fromDate)
                .setParameter("toDate", toDate)
                .getSingleResult();
    }
}
