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
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/invoices")
@RequiredArgsConstructor
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
        
        Page<Invoice> invoices = invoiceService.searchInvoices(type, status, search, PageRequest.of(page, size, Sort.by("createdAt").descending()));
        return ResponseEntity.ok(invoices.map(this::mapToResponse));
    }

    @GetMapping("/{id}")
    public ResponseEntity<InvoiceResponse> getInvoice(@PathVariable Long id, @AuthenticationPrincipal AdminUser admin) {
        Invoice invoice = invoiceService.getInvoiceById(id, admin);
        return ResponseEntity.ok(mapToResponse(invoice));
    }

    @PostMapping
    public ResponseEntity<InvoiceResponse> createDraftInvoice(
            @Valid @RequestBody InvoiceRequest request,
            @AuthenticationPrincipal AdminUser admin) {
        Invoice invoice = invoiceService.createDraftInvoice(request, admin);
        return ResponseEntity.ok(mapToResponse(invoice));
    }

    @PostMapping("/from-quotation/{quotationId}")
    public ResponseEntity<InvoiceResponse> createInvoiceFromQuotation(
            @PathVariable Long quotationId,
            @RequestParam InvoiceType type,
            @AuthenticationPrincipal AdminUser admin) {
        Invoice invoice = invoiceService.createInvoiceFromQuotation(quotationId, type, admin);
        return ResponseEntity.ok(mapToResponse(invoice));
    }

    @PostMapping("/from-po/{poId}")
    public ResponseEntity<InvoiceResponse> createInvoiceFromPurchaseOrder(
            @PathVariable Long poId,
            @RequestParam InvoiceType type,
            @AuthenticationPrincipal AdminUser admin) {
        Invoice invoice = invoiceService.createInvoiceFromPurchaseOrder(poId, type, admin);
        return ResponseEntity.ok(mapToResponse(invoice));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<InvoiceResponse> updateDraftInvoice(
            @PathVariable Long id,
            @Valid @RequestBody InvoiceRequest request,
            @AuthenticationPrincipal AdminUser admin) {
        Invoice invoice = invoiceService.updateDraftInvoice(id, request, admin);
        return ResponseEntity.ok(mapToResponse(invoice));
    }

    @PostMapping("/{id}/issue")
    public ResponseEntity<InvoiceResponse> issueInvoice(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser admin) {
        Invoice invoice = invoiceService.issueInvoice(id, admin);
        return ResponseEntity.ok(mapToResponse(invoice));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<InvoiceResponse> cancelInvoice(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser admin) {
        Invoice invoice = invoiceService.cancelInvoice(id, admin);
        return ResponseEntity.ok(mapToResponse(invoice));
    }

    @PostMapping("/proforma/{id}/convert-to-tax-invoice")
    public ResponseEntity<InvoiceResponse> convertProformaToTaxInvoice(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser admin) {
        Invoice invoice = invoiceService.convertProformaToTaxInvoice(id, admin);
        return ResponseEntity.ok(mapToResponse(invoice));
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

    private InvoiceResponse mapToResponse(Invoice invoice) {
        InvoiceResponse response = new InvoiceResponse();
        response.setId(invoice.getId());
        response.setInvoiceNumber(invoice.getInvoiceNumber());
        response.setInvoiceType(invoice.getInvoiceType());
        response.setStatus(invoice.getStatus());
        response.setLocked(invoice.isLocked());

        response.setCustomerId(invoice.getCustomer() != null ? invoice.getCustomer().getId() : null);
        response.setQuotationId(invoice.getQuotation() != null ? invoice.getQuotation().getId() : null);
        response.setPurchaseOrderId(invoice.getPurchaseOrder() != null ? invoice.getPurchaseOrder().getId() : null);

        response.setClientName(invoice.getClientName());
        response.setClientCompany(invoice.getClientCompany());
        response.setClientEmail(invoice.getClientEmail());
        response.setClientPhone(invoice.getClientPhone());
        response.setClientAddress(invoice.getClientAddress());
        response.setClientGstin(invoice.getClientGstin());
        response.setPlaceOfSupply(invoice.getPlaceOfSupply());

        response.setSupplierCompany(invoice.getSupplierCompany());
        response.setSupplierAddress(invoice.getSupplierAddress());
        response.setSupplierGstin(invoice.getSupplierGstin());
        response.setSupplierState(invoice.getSupplierState());

        response.setInvoiceDate(invoice.getInvoiceDate());
        response.setDueDate(invoice.getDueDate());
        response.setIssuedAt(invoice.getIssuedAt());
        response.setCancelledAt(invoice.getCancelledAt());
        response.setPaymentTerms(invoice.getPaymentTerms());
        response.setTermsAndConditions(invoice.getTermsAndConditions());

        response.setSubtotal(invoice.getSubtotal());
        response.setDiscountAmount(invoice.getDiscountAmount());
        response.setTaxableAmount(invoice.getTaxableAmount());
        response.setCgstAmount(invoice.getCgstAmount());
        response.setSgstAmount(invoice.getSgstAmount());
        response.setIgstAmount(invoice.getIgstAmount());
        response.setTaxAmount(invoice.getTaxAmount());
        response.setGrandTotal(invoice.getGrandTotal());
        response.setAmountPaid(invoice.getAmountPaid());
        response.setBalanceDue(invoice.getBalanceDue());
        response.setAmountInWords(invoice.getAmountInWords());

        response.setCreatedAt(invoice.getCreatedAt());
        response.setUpdatedAt(invoice.getUpdatedAt());

        if (invoice.getCreatedBy() != null) {
            response.setCreatedByUsername(invoice.getCreatedBy().getUsername());
            response.setCreatedByFullName(invoice.getCreatedBy().getName());
        }

        if (invoice.getItems() != null) {
            List<InvoiceItemResponse> items = invoice.getItems().stream().map(item -> {
                InvoiceItemResponse ir = new InvoiceItemResponse();
                ir.setId(item.getId());
                ir.setProductServiceId(item.getProductService() != null ? item.getProductService().getId() : null);
                ir.setSku(item.getSku());
                ir.setDescription(item.getDescription());
                ir.setHsnSac(item.getHsnSac());
                ir.setQuantity(item.getQuantity());
                ir.setUnit(item.getUnit());
                ir.setListPrice(item.getListPrice());
                ir.setUnitPrice(item.getUnitPrice());
                ir.setDiscountPercent(item.getDiscountPercent());
                ir.setTaxPercent(item.getTaxPercent());
                ir.setTaxableAmount(item.getTaxableAmount());
                ir.setCgstAmount(item.getCgstAmount());
                ir.setSgstAmount(item.getSgstAmount());
                ir.setIgstAmount(item.getIgstAmount());
                ir.setTaxAmount(item.getTaxAmount());
                ir.setLineTotal(item.getLineTotal());
                ir.setSortOrder(item.getSortOrder());
                return ir;
            }).collect(Collectors.toList());
            response.setItems(items);
        }

        return response;
    }
}
