package com.acrovix.admin.controller;

import com.acrovix.admin.security.ratelimit.RateLimit;
import com.acrovix.admin.security.ratelimit.RateLimitCategory;
import com.acrovix.admin.util.PaginationUtil;
import com.acrovix.admin.dto.InvoiceRequest;
import com.acrovix.admin.dto.InvoiceResponse;
import com.acrovix.admin.dto.InvoiceItemResponse;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.Invoice;
import com.acrovix.admin.entity.InvoiceItem;
import com.acrovix.admin.entity.InvoiceStatus;
import com.acrovix.admin.entity.InvoiceType;
import com.acrovix.admin.service.InvoiceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/invoices")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'SALES')")
public class InvoiceController {

    private final InvoiceService invoiceService;
    private final com.acrovix.admin.service.PaymentGatewayService paymentGatewayService;

    public InvoiceController(InvoiceService invoiceService, com.acrovix.admin.service.PaymentGatewayService paymentGatewayService) {
        this.invoiceService = invoiceService;
        this.paymentGatewayService = paymentGatewayService;
    }

    @GetMapping
    public ResponseEntity<Page<InvoiceResponse>> getInvoices(
            @RequestParam(required = false) InvoiceType type,
            @RequestParam(required = false) InvoiceStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long purchaseOrderId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal AdminUser admin) {
        search = PaginationUtil.getSafeSearch(search);
        
        Page<InvoiceResponse> invoices = invoiceService.searchInvoices(type, status, search, purchaseOrderId, PageRequest.of(page, PaginationUtil.getSafeSize(size), Sort.by("createdAt").descending()), admin);
        return ResponseEntity.ok(invoices);
    }

    @GetMapping("/{id}")
    public ResponseEntity<InvoiceResponse> getInvoice(@PathVariable Long id, @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(invoiceService.getInvoiceResponseById(id, admin));
    }

    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    @PostMapping
    public ResponseEntity<InvoiceResponse> createDraftInvoice(
            @Valid @RequestBody InvoiceRequest request,
            @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(invoiceService.createDraftInvoice(request, admin));
    }

    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    @PostMapping("/from-quotation/{quotationId}")
    public ResponseEntity<InvoiceResponse> createInvoiceFromQuotation(
            @PathVariable Long quotationId,
            @RequestParam InvoiceType type,
            @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(invoiceService.createInvoiceFromQuotation(quotationId, type, admin));
    }

    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    @PostMapping("/from-po/{poId}")
    public ResponseEntity<InvoiceResponse> createInvoiceFromPurchaseOrder(
            @PathVariable Long poId,
            @RequestParam InvoiceType type,
            @RequestBody(required = false) InvoiceRequest customRequest,
            @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(invoiceService.createInvoiceFromPurchaseOrder(poId, type, customRequest, admin));
    }

    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    @PatchMapping("/{id}")
    public ResponseEntity<InvoiceResponse> updateDraftInvoice(
            @PathVariable Long id,
            @Valid @RequestBody InvoiceRequest request,
            @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(invoiceService.updateDraftInvoice(id, request, admin));
    }

    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    @PostMapping("/{id}/issue")
    public ResponseEntity<InvoiceResponse> issueInvoice(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(invoiceService.issueInvoice(id, admin));
    }

    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    @PostMapping("/{id}/cancel")
    public ResponseEntity<InvoiceResponse> cancelInvoice(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(invoiceService.cancelInvoice(id, admin));
    }

    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    @PostMapping("/proforma/{id}/convert-to-tax-invoice")
    public ResponseEntity<InvoiceResponse> convertProformaToTaxInvoice(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(invoiceService.convertProformaToTaxInvoice(id, admin));
    }

    @RateLimit(category = RateLimitCategory.PDF)
    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> getInvoicePdf(@PathVariable Long id, @AuthenticationPrincipal AdminUser admin) {
        Invoice invoice = invoiceService.getInvoiceById(id, admin); // Just for auth check
        byte[] pdfBytes = invoiceService.generateInvoicePdf(id, admin);
        
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_PDF);
        String filename = invoice.getInvoiceNumber() != null ? invoice.getInvoiceNumber().replace("/", "_") : "DRAFT_INVOICE_" + id;
        headers.setContentDispositionFormData("filename", filename + ".pdf");
        
        return new ResponseEntity<>(pdfBytes, headers, org.springframework.http.HttpStatus.OK);
    }

    @RateLimit(category = RateLimitCategory.EMAIL)
    @PostMapping("/{id}/send-email")
    public ResponseEntity<java.util.Map<String, Object>> sendInvoiceEmail(
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, String> body,
            @AuthenticationPrincipal AdminUser admin) {
        String overrideEmail = body != null ? body.get("recipientEmail") : null;
        invoiceService.sendInvoiceEmail(id, overrideEmail, admin);
        return ResponseEntity.ok(java.util.Map.of("success", true, "message", "Invoice email sent successfully"));
    }

    @RateLimit(category = RateLimitCategory.EMAIL)
    @PostMapping("/{id}/send-payment-qr-email")
    public ResponseEntity<java.util.Map<String, Object>> sendPaymentQrEmail(
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, String> body,
            @AuthenticationPrincipal AdminUser admin) {
        String overrideEmail = body != null ? body.get("recipientEmail") : null;
        String recipient = invoiceService.sendPaymentQrEmail(id, overrideEmail, admin);
        return ResponseEntity.ok(java.util.Map.of(
                "success", true,
                "message", "Payment details and QR code sent to " + recipient,
                "recipient", recipient
        ));
    }

    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    @PostMapping("/{id}/payment-link")
    public ResponseEntity<java.util.Map<String, Object>> generatePaymentLink(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser admin) {
        InvoiceResponse invoice = invoiceService.generatePaymentLink(id, admin);
        String paymentLink = "/pay/invoice/" + invoice.getPublicToken();
        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("paymentLink", paymentLink);
        response.put("paymentLinkUrl", paymentLink);
        response.put("publicToken", invoice.getPublicToken());
        response.put("invoice", invoice);
        return ResponseEntity.ok(response);
    }

    @RateLimit(category = RateLimitCategory.PDF)
    @GetMapping("/{id}/settlement-receipt-pdf")
    public ResponseEntity<byte[]> getSettlementReceiptPdf(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser admin) {
        Invoice invoice = invoiceService.getInvoiceById(id, admin);
        byte[] pdfBytes = invoiceService.generateSettlementReceiptPdf(id, admin);

        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_PDF);
        String safeNumber = invoice.getInvoiceNumber() != null ? invoice.getInvoiceNumber().replace("/", "_") : "INV_" + id;
        headers.setContentDispositionFormData("filename", "Settlement_Statement_" + safeNumber + ".pdf");

        return new ResponseEntity<>(pdfBytes, headers, org.springframework.http.HttpStatus.OK);
    }

    @RateLimit(category = RateLimitCategory.EMAIL)
    @PostMapping("/{id}/send-settlement-email")
    public ResponseEntity<java.util.Map<String, Object>> sendSettlementEmail(
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, String> body,
            @AuthenticationPrincipal AdminUser admin) {
        String overrideEmail = body != null ? body.get("recipientEmail") : null;
        String recipient = invoiceService.sendSettlementEmail(id, overrideEmail, admin);
        return ResponseEntity.ok(java.util.Map.of(
                "success", true,
                "message", "Payment settlement statement sent to " + recipient,
                "recipient", recipient
        ));
    }
}
