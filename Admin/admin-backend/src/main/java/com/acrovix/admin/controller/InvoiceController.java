package com.acrovix.admin.controller;

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
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
public class InvoiceController {

    private final InvoiceService invoiceService;

    @GetMapping
    public ResponseEntity<Page<InvoiceResponse>> getInvoices(
            @RequestParam(required = false) InvoiceType type,
            @RequestParam(required = false) InvoiceStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal AdminUser admin) {
        
        Page<InvoiceResponse> invoices = invoiceService.searchInvoices(type, status, search, PageRequest.of(page, size, Sort.by("createdAt").descending()));
        return ResponseEntity.ok(invoices);
    }

    @GetMapping("/{id}")
    public ResponseEntity<InvoiceResponse> getInvoice(@PathVariable Long id, @AuthenticationPrincipal AdminUser admin) {
        InvoiceResponse invoice = invoiceService.getInvoiceResponseById(id, admin);
        return ResponseEntity.ok(invoice);
    }

    @PostMapping
    public ResponseEntity<InvoiceResponse> createDraftInvoice(
            @Valid @RequestBody InvoiceRequest request,
            @AuthenticationPrincipal AdminUser admin) {
        Invoice invoice = invoiceService.createDraftInvoice(request, admin);
        return ResponseEntity.ok(invoiceService.mapToResponse(invoice));
    }

    @PostMapping("/from-quotation/{quotationId}")
    public ResponseEntity<InvoiceResponse> createInvoiceFromQuotation(
            @PathVariable Long quotationId,
            @RequestParam InvoiceType type,
            @AuthenticationPrincipal AdminUser admin) {
        Invoice invoice = invoiceService.createInvoiceFromQuotation(quotationId, type, admin);
        return ResponseEntity.ok(invoiceService.mapToResponse(invoice));
    }

    @PostMapping("/from-po/{poId}")
    public ResponseEntity<InvoiceResponse> createInvoiceFromPurchaseOrder(
            @PathVariable Long poId,
            @RequestParam InvoiceType type,
            @AuthenticationPrincipal AdminUser admin) {
        Invoice invoice = invoiceService.createInvoiceFromPurchaseOrder(poId, type, admin);
        return ResponseEntity.ok(invoiceService.mapToResponse(invoice));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<InvoiceResponse> updateDraftInvoice(
            @PathVariable Long id,
            @Valid @RequestBody InvoiceRequest request,
            @AuthenticationPrincipal AdminUser admin) {
        Invoice invoice = invoiceService.updateDraftInvoice(id, request, admin);
        return ResponseEntity.ok(invoiceService.mapToResponse(invoice));
    }

    @PostMapping("/{id}/issue")
    public ResponseEntity<InvoiceResponse> issueInvoice(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser admin) {
        Invoice invoice = invoiceService.issueInvoice(id, admin);
        return ResponseEntity.ok(invoiceService.mapToResponse(invoice));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<InvoiceResponse> cancelInvoice(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser admin) {
        Invoice invoice = invoiceService.cancelInvoice(id, admin);
        return ResponseEntity.ok(invoiceService.mapToResponse(invoice));
    }

    @PostMapping("/proforma/{id}/convert-to-tax-invoice")
    public ResponseEntity<InvoiceResponse> convertProformaToTaxInvoice(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser admin) {
        Invoice invoice = invoiceService.convertProformaToTaxInvoice(id, admin);
        return ResponseEntity.ok(invoiceService.mapToResponse(invoice));
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> getInvoicePdf(@PathVariable Long id, @AuthenticationPrincipal AdminUser admin) {
        Invoice invoice = invoiceService.getInvoiceById(id, admin); // Just for auth check
        byte[] pdfBytes = invoiceService.generateInvoicePdf(id);
        
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_PDF);
        String filename = invoice.getInvoiceNumber() != null ? invoice.getInvoiceNumber().replace("/", "_") : "DRAFT_INVOICE_" + id;
        headers.setContentDispositionFormData("filename", filename + ".pdf");
        
        return new ResponseEntity<>(pdfBytes, headers, org.springframework.http.HttpStatus.OK);
    }

    @PostMapping("/{id}/send-email")
    public ResponseEntity<java.util.Map<String, Object>> sendInvoiceEmail(
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, String> body,
            @AuthenticationPrincipal AdminUser admin) {
        String overrideEmail = body != null ? body.get("recipientEmail") : null;
        invoiceService.sendInvoiceEmail(id, overrideEmail, admin);
        return ResponseEntity.ok(java.util.Map.of("success", true, "message", "Invoice email sent successfully"));
    }
}
