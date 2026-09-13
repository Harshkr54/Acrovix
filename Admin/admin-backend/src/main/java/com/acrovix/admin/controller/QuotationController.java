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
            @RequestParam(defaultValue = "10") int size) {
        Page<Quotation> quotations = quotationRepository.findAll(PageRequest.of(page, size, Sort.by("createdAt").descending()));
        
        Page<java.util.Map<String, Object>> dtoPage = quotations.map(q -> {
            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", q.getId());
            map.put("quotationNumber", q.getQuotationNumber());
            map.put("clientName", q.getClientName());
            map.put("clientCompany", q.getClientCompany());
            map.put("grandTotal", q.getGrandTotal());
            map.put("status", q.getStatus());
            map.put("createdAt", q.getCreatedAt());
            return map;
        });
        
        return ResponseEntity.ok(dtoPage);
    }

    @PostMapping("/enquiry/{enquiryId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<Quotation> createDraftQuotation(
            @PathVariable Long enquiryId,
            @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(quotationService.createDraftQuotation(enquiryId, admin));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<Quotation> saveQuotationDraft(
            @PathVariable Long id,
            @Valid @RequestBody QuotationRequest request,
            @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(quotationService.saveQuotationDraft(id, request, admin));
    }

    @GetMapping("/{id}/pdf")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<byte[]> previewPdf(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser admin) {
        Quotation quotation = quotationRepository.findById(id)
                .orElseThrow(() -> new com.acrovix.admin.exception.ResourceNotFoundException("Quotation not found"));
        authorizationService.checkQuotationAccess(admin, quotation);
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
            @AuthenticationPrincipal AdminUser admin) {
        Quotation quotation = quotationRepository.findById(id)
                .orElseThrow(() -> new com.acrovix.admin.exception.ResourceNotFoundException("Quotation not found"));
        authorizationService.checkQuotationAccess(admin, quotation);
        emailService.sendQuotationEmail(quotation);
        quotationService.markAsSent(id, admin);
        return ResponseEntity.ok().build();
    }
}
