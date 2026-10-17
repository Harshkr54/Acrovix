package com.acrovix.admin.controller;

import com.acrovix.admin.dto.PublicQuotationAcceptRequest;
import com.acrovix.admin.dto.PublicQuotationResponse;
import com.acrovix.admin.entity.*;
import com.acrovix.admin.exception.ResourceConflictException;
import com.acrovix.admin.exception.ResourceNotFoundException;
import com.acrovix.admin.repository.CompanySettingsRepository;
import com.acrovix.admin.repository.QuotationRepository;
import com.acrovix.admin.service.AuditLogService;
import com.acrovix.admin.tenant.TenantContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/public/quotes")
@RequiredArgsConstructor
public class PublicQuotationController {

    private final QuotationRepository quotationRepository;
    private final CompanySettingsRepository companySettingsRepository;
    private final AuditLogService auditLogService;
    private final com.acrovix.admin.service.NotificationService notificationService;
    private final com.acrovix.admin.service.EmailService emailService;

    @GetMapping("/view/{publicToken}")
    @Transactional(readOnly = true)
    public ResponseEntity<PublicQuotationResponse> viewPublicQuotation(@PathVariable String publicToken) {
        Quotation q = TenantContext.callWithBypassRls(() ->
                quotationRepository.findByToken(publicToken)
                        .orElseThrow(() -> new ResourceNotFoundException("Quotation not found or link has expired."))
        );

        if (q.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Quotation not found or link has expired.");
        }

        Long tenantId = q.getTenantId() != null ? q.getTenantId() : 1L;

        return ResponseEntity.ok(TenantContext.callWithTenant(tenantId, () -> buildPublicResponse(q)));
    }

    @PostMapping("/view/{publicToken}/accept")
    @Transactional
    public ResponseEntity<PublicQuotationResponse> acceptPublicQuotation(
            @PathVariable String publicToken,
            @Valid @RequestBody PublicQuotationAcceptRequest request,
            HttpServletRequest servletRequest
    ) {
        Quotation q = TenantContext.callWithBypassRls(() ->
                quotationRepository.findByPublicTokenForUpdate(publicToken)
                        .or(() -> quotationRepository.findByToken(publicToken))
                        .orElseThrow(() -> new ResourceNotFoundException("Quotation not found or link has expired."))
        );

        if (q.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Quotation not found or link has expired.");
        }

        if ("ACCEPTED".equalsIgnoreCase(q.getStatus()) || "CONVERTED".equalsIgnoreCase(q.getStatus())) {
            // Already accepted
            Long tenantId = q.getTenantId() != null ? q.getTenantId() : 1L;
            return ResponseEntity.ok(TenantContext.callWithTenant(tenantId, () -> buildPublicResponse(q)));
        }

        if ("REJECTED".equalsIgnoreCase(q.getStatus())) {
            throw new ResourceConflictException("This quotation was previously marked as rejected.");
        }

        if (q.getValidUntil() != null && q.getValidUntil().isBefore(LocalDate.now())) {
            q.setStatus("EXPIRED");
            quotationRepository.save(q);
            throw new ResourceConflictException("This quotation expired on " + q.getValidUntil() + " and can no longer be accepted.");
        }

        Long tenantId = q.getTenantId() != null ? q.getTenantId() : 1L;

        Quotation saved = TenantContext.callWithTenant(tenantId, () -> {
            String clientIp = extractClientIp(servletRequest);
            LocalDateTime now = LocalDateTime.now();
            String acceptedByName = request.getSignerName().trim();

            q.setStatus("ACCEPTED");
            q.setSignedAt(now);
            q.setSignerName(acceptedByName);
            q.setSignatureData(request.getSignatureData());
            q.setSignerNotes(request.getSignerNotes());
            q.setSignerIp(clientIp);
            q.setResponseSource(QuotationResponseSource.CLIENT_PORTAL);
            q.setResponseNotes(request.getSignerNotes() != null && !request.getSignerNotes().isBlank() 
                    ? request.getSignerNotes() 
                    : "Accepted via online public portal");

            Quotation updated = quotationRepository.save(q);

            // Record entry in entity_audit_logs: "Quotation accepted online by [Name] from IP [IP]"
            String auditDetails = "Quotation accepted online by " + acceptedByName + " from IP " + clientIp;
            if (request.getSignerNotes() != null && !request.getSignerNotes().isBlank()) {
                auditDetails += " (Notes: " + request.getSignerNotes().trim() + ")";
            }

            auditLogService.logForTenant(
                    tenantId,
                    "QUOTATION",
                    updated.getId(),
                    "ACCEPTED",
                    acceptedByName,
                    auditDetails
            );

            // Trigger automated in-app notification to the quotation owner (sales rep / admin)
            AdminUser owner = updated.getCreatedBy();
            if (owner != null && notificationService != null) {
                try {
                    notificationService.createQuotationRespondedNotification(
                            owner,
                            updated.getId(),
                            updated.getQuotationNumber(),
                            "ACCEPTED"
                    );
                } catch (Exception e) {
                    log.warn("Failed to create in-app notification for accepted quotation {}: {}", updated.getId(), e.getMessage());
                }
            }

            // Trigger automated email alert to quotation owner / sales rep
            try {
                String ownerEmail = (owner != null && owner.getEmail() != null && !owner.getEmail().isBlank())
                        ? owner.getEmail()
                        : null;

                if (ownerEmail != null && emailService != null && emailService.isEmailConfigured()) {
                    String alertSubject = "Quotation Accepted: " + updated.getQuotationNumber() + " - " + updated.getClientName();
                    String alertHtml = "<p>Quotation <strong>" + escapeHtml(updated.getQuotationNumber()) + "</strong> has been officially accepted online by <strong>" 
                            + escapeHtml(acceptedByName) + "</strong>.</p>"
                            + "<table style=\"width:100%; border-collapse:collapse; margin:16px 0; font-size:14px; background-color:#F8FAFC; border:1px solid #E2E8F0;\">"
                            + "<tr><td style=\"padding:8px 12px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Client:</td><td style=\"padding:8px 12px; border-bottom:1px solid #E2E8F0;\">" + escapeHtml(updated.getClientName()) + "</td></tr>"
                            + "<tr><td style=\"padding:8px 12px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Grand Total:</td><td style=\"padding:8px 12px; border-bottom:1px solid #E2E8F0;\">" + (updated.getCurrency() != null ? updated.getCurrency() : "INR") + " " + updated.getGrandTotal() + "</td></tr>"
                            + "<tr><td style=\"padding:8px 12px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Accepted At:</td><td style=\"padding:8px 12px; border-bottom:1px solid #E2E8F0;\">" + now + "</td></tr>"
                            + "<tr><td style=\"padding:8px 12px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Signer IP:</td><td style=\"padding:8px 12px; border-bottom:1px solid #E2E8F0;\">" + escapeHtml(clientIp) + "</td></tr>"
                            + (request.getSignerNotes() != null && !request.getSignerNotes().isBlank() ? "<tr><td style=\"padding:8px 12px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Notes:</td><td style=\"padding:8px 12px; border-bottom:1px solid #E2E8F0;\">" + escapeHtml(request.getSignerNotes()) + "</td></tr>" : "")
                            + "</table>"
                            + "<p>You can now convert this accepted quotation to a Tax Invoice in the admin dashboard.</p>";

                    emailService.sendHtmlEmail(ownerEmail, alertSubject, alertHtml);
                }
            } catch (Exception e) {
                log.warn("Failed to dispatch email alert for accepted quotation {}: {}", updated.getId(), e.getMessage());
            }

            return updated;
        });

        return ResponseEntity.ok(TenantContext.callWithTenant(tenantId, () -> buildPublicResponse(saved)));
    }

    private PublicQuotationResponse buildPublicResponse(Quotation q) {
        CompanySettings cs = companySettingsRepository.findAll().stream().findFirst().orElse(null);

        PublicQuotationResponse.TenantBrandingDto branding = null;
        if (cs != null) {
            branding = PublicQuotationResponse.TenantBrandingDto.builder()
                    .companyName(cs.getCompanyName())
                    .brandName(cs.getBrandName() != null ? cs.getBrandName() : cs.getCompanyName())
                    .legalName(cs.getLegalName() != null ? cs.getLegalName() : cs.getCompanyName())
                    .gstin(cs.getGstin())
                    .pan(cs.getPan())
                    .email(cs.getEmail())
                    .phone(cs.getPhone())
                    .website(cs.getWebsite())
                    .address(cs.getBillingAddress() != null ? cs.getBillingAddress() : cs.getRegisteredAddress())
                    .logoUrl(cs.getLogoUrl())
                    .primaryColor(cs.getPrimaryColor() != null ? cs.getPrimaryColor() : "#2563EB")
                    .secondaryColor(cs.getSecondaryColor() != null ? cs.getSecondaryColor() : "#1E40AF")
                    .currencyCode(cs.getCurrencyCode() != null ? cs.getCurrencyCode() : "INR")
                    .currencySymbol(cs.getCurrencySymbol() != null ? cs.getCurrencySymbol() : "₹")
                    .build();
        } else {
            branding = PublicQuotationResponse.TenantBrandingDto.builder()
                    .companyName("Acrovix Innovations")
                    .brandName("Acrovix Innovations")
                    .legalName("Acrovix Innovations Private Limited")
                    .primaryColor("#0f766e")
                    .secondaryColor("#0284c7")
                    .currencyCode("INR")
                    .currencySymbol("₹")
                    .build();
        }

        List<PublicQuotationResponse.ItemDto> items = new ArrayList<>();
        if (q.getItems() != null) {
            for (QuotationItem it : q.getItems()) {
                BigDecimal lineTot = it.getLineTotal() != null ? it.getLineTotal() : BigDecimal.ZERO;
                BigDecimal taxAmt = BigDecimal.ZERO;
                if (it.getLineTotal() != null && it.getTaxPercent() != null) {
                    taxAmt = it.getLineTotal().multiply(it.getTaxPercent()).divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP);
                }
                items.add(PublicQuotationResponse.ItemDto.builder()
                        .title(it.getDescription())
                        .description(it.getDescription())
                        .hsnSac(it.getHsnSac())
                        .quantity(it.getQuantity())
                        .unit(it.getUnit())
                        .listPrice(it.getListPrice())
                        .discountPercent(it.getDiscountPercent())
                        .unitPrice(it.getUnitPrice())
                        .taxPercent(it.getTaxPercent())
                        .taxAmount(taxAmt)
                        .total(lineTot)
                        .build());
            }
        }

        Map<String, Object> bankDetails = new LinkedHashMap<>();
        if (q.getBankName() != null) {
            bankDetails.put("bankName", q.getBankName());
            bankDetails.put("accountHolder", q.getBankAccountHolder());
            bankDetails.put("accountNumber", q.getBankAccountNumber());
            bankDetails.put("ifsc", q.getBankIfsc());
            bankDetails.put("branch", q.getBankBranch());
        }

        String effectiveToken = q.getPublicToken() != null ? q.getPublicToken() : q.getClientToken();

        return PublicQuotationResponse.builder()
                .id(q.getId())
                .publicToken(effectiveToken)
                .quotationNumber(q.getQuotationNumber())
                .status(q.getStatus())
                .version(q.getVersion())
                .currency(q.getCurrency() != null ? q.getCurrency().name() : "INR")
                .createdAt(q.getCreatedAt())
                .validUntil(q.getValidUntil())
                .termsAndConditions(q.getTermsAndConditions())
                .subtotal(q.getSubtotal())
                .discountAmount(q.getDiscountAmount())
                .taxAmount(q.getTaxAmount())
                .grandTotal(q.getGrandTotal())
                .clientName(q.getClientName())
                .clientCompany(q.getClientCompany())
                .clientEmail(q.getClientEmail())
                .clientPhone(q.getClientPhone())
                .signedAt(q.getSignedAt())
                .signerName(q.getSignerName())
                .signerNotes(q.getSignerNotes())
                .signatureData(q.getSignatureData())
                .acceptedAt(q.getSignedAt())
                .acceptedByName(q.getSignerName())
                .acceptedByIp(q.getSignerIp())
                .items(items)
                .tenant(branding)
                .bankDetails(bankDetails.isEmpty() ? null : bankDetails)
                .build();
    }

    private String extractClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String escapeHtml(String input) {
        if (input == null) return "";
        return input.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
