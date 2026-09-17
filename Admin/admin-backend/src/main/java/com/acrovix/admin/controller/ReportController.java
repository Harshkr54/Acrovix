package com.acrovix.admin.controller;

import com.acrovix.admin.dto.report.*;
import com.acrovix.admin.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/reports")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES', 'EDITOR')")
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/summary")
    public ResponseEntity<ReportSummaryResponse> getSummary(
            @RequestParam(required = false) String preset,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {
        return ResponseEntity.ok(reportService.getSummaryReport(preset, fromDate, toDate));
    }

    @GetMapping("/quotations")
    public ResponseEntity<QuotationReportResponse> getQuotationReport(
            @RequestParam(required = false) String preset,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {
        return ResponseEntity.ok(reportService.getQuotationReport(preset, fromDate, toDate));
    }

    @GetMapping("/purchase-orders")
    public ResponseEntity<PurchaseOrderReportResponse> getPurchaseOrderReport(
            @RequestParam(required = false) String preset,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {
        return ResponseEntity.ok(reportService.getPurchaseOrderReport(preset, fromDate, toDate));
    }

    @GetMapping("/invoices")
    public ResponseEntity<InvoiceReportResponse> getInvoiceReport(
            @RequestParam(required = false) String preset,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {
        return ResponseEntity.ok(reportService.getInvoiceReport(preset, fromDate, toDate));
    }

    @GetMapping("/payments")
    public ResponseEntity<PaymentReportResponse> getPaymentReport(
            @RequestParam(required = false) String preset,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {
        return ResponseEntity.ok(reportService.getPaymentReport(preset, fromDate, toDate));
    }

    @GetMapping("/customers")
    public ResponseEntity<List<CustomerAnalyticsDto>> getCustomerAnalytics(
            @RequestParam(required = false) String preset,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {
        return ResponseEntity.ok(reportService.getCustomerAnalytics(preset, fromDate, toDate));
    }

    @GetMapping("/trends")
    public ResponseEntity<List<MonthlyTrendDto>> getMonthlyTrends(
            @RequestParam(required = false) String preset,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {
        return ResponseEntity.ok(reportService.getMonthlyTrends(preset, fromDate, toDate));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCsv(
            @RequestParam(required = false) String reportType,
            @RequestParam(required = false) String preset,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {

        String csvData = reportService.exportReportCsv(reportType, preset, fromDate, toDate);
        byte[] bytes = csvData.getBytes(java.nio.charset.StandardCharsets.UTF_8);

        String filename = (reportType != null ? reportType.toLowerCase() : "report") + "_export.csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(bytes);
    }
}
