package com.acrovix.admin.controller;

import com.acrovix.admin.security.ratelimit.RateLimit;
import com.acrovix.admin.security.ratelimit.RateLimitCategory;
import com.acrovix.admin.util.PaginationUtil;
import com.acrovix.admin.dto.*;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.PaymentMethod;
import com.acrovix.admin.entity.PaymentStatus;
import com.acrovix.admin.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/payments")
    public ResponseEntity<PaymentResponse> recordPayment(
            @Valid @RequestBody PaymentRequest request,
            @AuthenticationPrincipal AdminUser admin) {
        var payment = paymentService.recordPayment(request, admin);
        return ResponseEntity.status(HttpStatus.CREATED).body(paymentService.getPaymentById(payment.getId(), admin));
    }

    @PostMapping("/payments/{id}/cancel")
    public ResponseEntity<PaymentResponse> cancelPayment(
            @PathVariable Long id,
            @Valid @RequestBody PaymentCancelRequest request,
            @AuthenticationPrincipal AdminUser admin) {
        var payment = paymentService.cancelPayment(id, request, admin);
        return ResponseEntity.ok(paymentService.getPaymentById(payment.getId(), admin));
    }

    @GetMapping("/payments")
    public ResponseEntity<Page<PaymentResponse>> getPayments(
            @RequestParam(required = false) PaymentStatus status,
            @RequestParam(required = false) PaymentMethod method,
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) Long invoiceId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal AdminUser admin) {
        search = PaginationUtil.getSafeSearch(search);
        Page<PaymentResponse> payments = paymentService.getPayments(status, method, customerId, invoiceId, search,
                PageRequest.of(page, PaginationUtil.getSafeSize(size), Sort.by("createdAt").descending()), admin);
        return ResponseEntity.ok(payments);
    }

    @GetMapping("/payments/eligible-invoices")
    public ResponseEntity<List<EligibleInvoiceResponse>> getEligibleInvoices(
            @RequestParam(required = false) String search) {
        search = PaginationUtil.getSafeSearch(search);
        return ResponseEntity.ok(paymentService.getEligibleInvoicesForPayment(search));
    }


    @GetMapping("/payments/{id}")
    public ResponseEntity<PaymentResponse> getPaymentById(@PathVariable Long id, @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(paymentService.getPaymentById(id, admin));
    }

    @GetMapping("/invoices/{invoiceId}/payments")
    public ResponseEntity<List<PaymentResponse>> getPaymentsByInvoiceId(@PathVariable Long invoiceId, @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(paymentService.getPaymentsByInvoiceId(invoiceId));
    }

    @RateLimit(category = RateLimitCategory.PDF)
    @GetMapping("/payments/{id}/pdf")
    public ResponseEntity<byte[]> getPaymentReceiptPdf(@PathVariable Long id, @AuthenticationPrincipal AdminUser admin) {
        PaymentResponse payment = paymentService.getPaymentById(id, admin);
        byte[] pdfBytes = paymentService.generatePaymentReceiptPdf(id, admin);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        String filename = payment.getPaymentNumber() != null ? payment.getPaymentNumber().replace("/", "_") : "PAYMENT_RECEIPT_" + id;
        headers.setContentDispositionFormData("filename", filename + ".pdf");

        return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
    }

    @GetMapping("/receivables")
    public ResponseEntity<Page<ReceivableSummaryResponse>> getReceivablesSummary(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal AdminUser admin) {
        search = PaginationUtil.getSafeSearch(search);
        Page<ReceivableSummaryResponse> receivables = paymentService.getReceivablesSummary(search, PageRequest.of(page, PaginationUtil.getSafeSize(size)));
        return ResponseEntity.ok(receivables);
    }

    @GetMapping("/dashboard/receivables")
    public ResponseEntity<DashboardReceivablesResponse> getDashboardReceivablesStats(@AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(paymentService.getDashboardReceivablesStats());
    }

    @RateLimit(category = RateLimitCategory.EMAIL)
    @PostMapping("/payments/{id}/send-receipt-email")
    public ResponseEntity<java.util.Map<String, Object>> sendPaymentReceiptEmail(
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, String> body,
            @AuthenticationPrincipal AdminUser admin) {
        String overrideEmail = body != null ? body.get("recipientEmail") : null;
        paymentService.sendPaymentReceiptEmail(id, overrideEmail, admin);
        return ResponseEntity.ok(java.util.Map.of("success", true, "message", "Payment receipt email sent successfully"));
    }
}
