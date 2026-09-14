package com.acrovix.admin.controller;

import com.acrovix.admin.dto.QuotationRequest;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.Quotation;
import com.acrovix.admin.service.QuotationService;
import com.acrovix.admin.service.EmailService;
import com.acrovix.admin.service.PdfService;
import com.acrovix.admin.service.AuthorizationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

@RestController
@RequestMapping("/api/admin/quotations")
@RequiredArgsConstructor
public class QuotationController {

    private final QuotationService quotationService;
    private final PdfService pdfService;
    private final EmailService emailService;
    private final com.acrovix.admin.repository.QuotationRepository quotationRepository;
    private final AuthorizationService authorizationService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<Page<java.util.Map<String, Object>>> getAllQuotations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @AuthenticationPrincipal AdminUser admin) {
        Page<Quotation> quotations = quotationService.getAllQuotations(PageRequest.of(page, size, Sort.by("createdAt").descending()), search, admin);
        Page<java.util.Map<String, Object>> dtoPage = quotations.map(this::mapToDto);
        return ResponseEntity.ok(dtoPage);
    }

    @GetMapping("/trash")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<Page<java.util.Map<String, Object>>> getTrashQuotations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal AdminUser admin) {
        Page<Quotation> trash = quotationService.getTrashQuotations(PageRequest.of(page, size, Sort.by("deletedAt").descending()), admin);
        Page<java.util.Map<String, Object>> dtoPage = trash.map(q -> {
            java.util.Map<String, Object> map = mapToDto(q);
            map.put("deletedAt", q.getDeletedAt());
            return map;
        });
        return ResponseEntity.ok(dtoPage);
    }

    @GetMapping("/trash/count")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<java.util.Map<String, Object>> getTrashCount() {
        long count = quotationRepository.countByDeletedAtIsNotNullAndStatus("DRAFT");
        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("count", count);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<java.util.Map<String, Object>> getQuotationById(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser admin) {
        Quotation q = quotationService.getQuotationById(id, admin);
        return ResponseEntity.ok(mapToDetailDto(q));
    }

    @GetMapping("/enquiry/{enquiryId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> getQuotationsByEnquiryId(
            @PathVariable Long enquiryId,
            @AuthenticationPrincipal AdminUser admin) {
        java.util.List<Quotation> list = quotationService.getQuotationsByEnquiryId(enquiryId, admin);
        java.util.List<java.util.Map<String, Object>> dtos = list.stream().map(this::mapToDto).collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/enquiry/{enquiryId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<java.util.Map<String, Object>> createDraftQuotation(
            @PathVariable Long enquiryId,
            @AuthenticationPrincipal AdminUser admin) {
        Quotation q = quotationService.createDraftQuotation(enquiryId, admin);
        return ResponseEntity.ok(mapToDetailDto(q));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<java.util.Map<String, Object>> saveQuotationDraft(
            @PathVariable Long id,
            @Valid @RequestBody QuotationRequest request,
            @AuthenticationPrincipal AdminUser admin) {
        Quotation q = quotationService.saveQuotationDraft(id, request, admin);
        return ResponseEntity.ok(mapToDetailDto(q));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<java.util.Map<String, Object>> moveToTrash(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser admin) {
        Quotation q = quotationService.moveToTrash(id, admin);
        java.util.Map<String, Object> map = mapToDto(q);
        map.put("deletedAt", q.getDeletedAt());
        return ResponseEntity.ok(map);
    }

    @PatchMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<java.util.Map<String, Object>> restoreFromTrash(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser admin) {
        Quotation q = quotationService.restoreFromTrash(id, admin);
        return ResponseEntity.ok(mapToDto(q));
    }

    @DeleteMapping("/{id}/permanent")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> permanentlyDelete(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser admin) {
        quotationService.permanentlyDelete(id, admin);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/pdf")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<byte[]> previewPdf(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser admin) {
        Quotation quotation = quotationService.getQuotationById(id, admin);
        byte[] pdf = pdfService.generateQuotationPdf(quotation);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=quotation.pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @PostMapping("/{id}/send")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<?> sendQuotation(
            @PathVariable Long id,
            @RequestBody(required = false) com.acrovix.admin.dto.SendQuotationRequest request,
            @AuthenticationPrincipal AdminUser admin) {
        quotationService.sendQuotation(id, request != null ? request.getRecipientEmail() : null, admin);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/direct")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<java.util.Map<String, Object>> createDirectDraftQuotation(
            @Valid @RequestBody com.acrovix.admin.dto.CreateDirectQuotationRequest request,
            @AuthenticationPrincipal AdminUser admin) {
        Quotation q = quotationService.createDirectDraftQuotation(request, admin);
        return ResponseEntity.ok(mapToDetailDto(q));
    }

    private java.util.Map<String, Object> mapToDto(Quotation q) {
        java.util.Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", q.getId());
        map.put("quotationNumber", q.getQuotationNumber());
        map.put("clientName", q.getClientName());
        map.put("clientCompany", q.getClientCompany());
        map.put("grandTotal", q.getGrandTotal());
        map.put("status", q.getStatus());
        map.put("createdAt", q.getCreatedAt());

        String sourceStr = null;
        if (q.getQuotationSource() != null) {
            sourceStr = q.getQuotationSource().name();
        } else if (q.getEnquiry() != null) {
            sourceStr = "ENQUIRY";
        } else {
            sourceStr = "DIRECT";
        }
        map.put("quotationSource", sourceStr);
        map.put("sourceNotes", q.getSourceNotes());
        return map;
    }

    private java.util.Map<String, Object> mapToDetailDto(Quotation q) {
        if (q == null) return null;
        java.util.Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", q.getId());
        map.put("quotationNumber", q.getQuotationNumber());
        map.put("clientName", q.getClientName());
        map.put("clientCompany", q.getClientCompany());
        map.put("clientEmail", q.getClientEmail());
        map.put("clientPhone", q.getClientPhone());
        map.put("status", q.getStatus());
        map.put("subtotal", q.getSubtotal());
        map.put("discountAmount", q.getDiscountAmount());
        map.put("taxAmount", q.getTaxAmount());
        map.put("grandTotal", q.getGrandTotal());
        map.put("validUntil", q.getValidUntil());
        map.put("termsAndConditions", q.getTermsAndConditions());
        map.put("createdAt", q.getCreatedAt());
        map.put("updatedAt", q.getUpdatedAt());
        map.put("deletedAt", q.getDeletedAt());

        String sourceStr = null;
        if (q.getQuotationSource() != null) {
            sourceStr = q.getQuotationSource().name();
        } else if (q.getEnquiry() != null) {
            sourceStr = "ENQUIRY";
        } else {
            sourceStr = "DIRECT";
        }
        map.put("quotationSource", sourceStr);
        map.put("sourceNotes", q.getSourceNotes());

        if (q.getEnquiry() != null) {
            java.util.Map<String, Object> enqMap = new java.util.HashMap<>();
            enqMap.put("id", q.getEnquiry().getId());
            enqMap.put("referenceId", q.getEnquiry().getReferenceId());
            enqMap.put("fullName", q.getEnquiry().getFullName());
            enqMap.put("companyName", q.getEnquiry().getCompanyName());
            enqMap.put("businessEmail", q.getEnquiry().getBusinessEmail());
            enqMap.put("phoneNumber", q.getEnquiry().getPhoneNumber());
            enqMap.put("projectRequirement", q.getEnquiry().getProjectRequirement());
            map.put("enquiry", enqMap);
        }

        java.util.List<java.util.Map<String, Object>> itemDtos = new java.util.ArrayList<>();
        if (q.getItems() != null) {
            for (com.acrovix.admin.entity.QuotationItem item : q.getItems()) {
                java.util.Map<String, Object> itemMap = new java.util.HashMap<>();
                itemMap.put("id", item.getId());
                itemMap.put("description", item.getDescription());
                itemMap.put("category", item.getCategory());
                itemMap.put("quantity", item.getQuantity());
                itemMap.put("unit", item.getUnit());
                itemMap.put("unitPrice", item.getUnitPrice());
                itemMap.put("discountPercent", item.getDiscountPercent());
                itemMap.put("taxPercent", item.getTaxPercent());
                itemMap.put("lineTotal", item.getLineTotal());
                itemMap.put("sortOrder", item.getSortOrder());
                itemDtos.add(itemMap);
            }
        }
        map.put("items", itemDtos);

        return map;
    }
}
