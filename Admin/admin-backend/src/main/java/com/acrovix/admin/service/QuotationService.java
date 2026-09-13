package com.acrovix.admin.service;

import com.acrovix.admin.dto.QuotationItemRequest;
import com.acrovix.admin.dto.QuotationRequest;
import com.acrovix.admin.entity.*;
import com.acrovix.admin.repository.AdminActivityRepository;
import com.acrovix.admin.repository.AdminEnquiryRepository;
import com.acrovix.admin.repository.AdminUserRepository;
import com.acrovix.admin.repository.QuotationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.acrovix.admin.exception.ResourceNotFoundException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class QuotationService {

    private final QuotationRepository quotationRepository;
    private final AdminEnquiryRepository enquiryRepository;
    private final AdminUserRepository userRepository;
    private final SequenceGeneratorService sequenceGenerator;
    private final AdminActivityRepository activityRepository;
    private final NotificationService notificationService;
    private final AuthorizationService authorizationService;

    @Transactional
    public Quotation createDraftQuotation(Long enquiryId, AdminUser admin) {
        AdminEnquiry enquiry = enquiryRepository.findById(enquiryId)
                .orElseThrow(() -> new ResourceNotFoundException("Enquiry not found"));

        authorizationService.checkEnquiryAccess(admin, enquiry);

        Quotation quotation = Quotation.builder()
                .quotationNumber(sequenceGenerator.generateNextQuotationNumber())
                .enquiry(enquiry)
                .clientName(enquiry.getFullName())
                .clientCompany(enquiry.getCompanyName())
                .clientEmail(enquiry.getBusinessEmail())
                .clientPhone(enquiry.getPhoneNumber())
                .status("DRAFT")
                .subtotal(BigDecimal.ZERO)
                .discountAmount(BigDecimal.ZERO)
                .taxAmount(BigDecimal.ZERO)
                .grandTotal(BigDecimal.ZERO)
                .createdBy(admin)
                .validUntil(LocalDate.now().plusDays(30))
                .build();

        Quotation saved = quotationRepository.save(quotation);
        logActivity(admin.getId(), "Created Quotation DRAFT: " + saved.getQuotationNumber(), "Quotation", saved.getId());
        return saved;
    }

    @Transactional
    public Quotation createDraftQuotation(Long enquiryId, Long adminId) {
        AdminUser admin = userRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found"));
        return createDraftQuotation(enquiryId, admin);
    }

    @Transactional
    public Quotation saveQuotationDraft(Long quotationId, QuotationRequest request, AdminUser admin) {
        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation not found"));

        if (quotation.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Quotation not found");
        }

        authorizationService.checkQuotationAccess(admin, quotation);

        if (!"DRAFT".equals(quotation.getStatus())) {
            throw new IllegalArgumentException("Only DRAFT quotations can be modified");
        }

        quotation.setClientName(request.getClientName());
        quotation.setClientCompany(request.getClientCompany());
        quotation.setClientEmail(request.getClientEmail());
        quotation.setClientPhone(request.getClientPhone());
        quotation.setTermsAndConditions(request.getTermsAndConditions());

        quotation.getItems().clear(); // Clear existing

        BigDecimal totalDiscountAmount = BigDecimal.ZERO;
        BigDecimal totalTaxAmount = BigDecimal.ZERO;
        BigDecimal subtotal = BigDecimal.ZERO;

        if (request.getItems() != null) {
            for (QuotationItemRequest itemReq : request.getItems()) {
                BigDecimal qty = itemReq.getQuantity() != null ? itemReq.getQuantity() : BigDecimal.ZERO;
                BigDecimal unitPrice = itemReq.getUnitPrice() != null ? itemReq.getUnitPrice() : BigDecimal.ZERO;
                BigDecimal discountPct = itemReq.getDiscountPercent() != null ? itemReq.getDiscountPercent() : BigDecimal.ZERO;
                BigDecimal taxPct = itemReq.getTaxPercent() != null ? itemReq.getTaxPercent() : BigDecimal.ZERO;

                // Exact approved formulas
                BigDecimal grossLineAmount = qty.multiply(unitPrice).setScale(2, RoundingMode.HALF_UP);
                BigDecimal lineDiscount = grossLineAmount.multiply(discountPct).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                BigDecimal netLineAmount = grossLineAmount.subtract(lineDiscount);
                BigDecimal lineTax = netLineAmount.multiply(taxPct).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                BigDecimal lineTotal = netLineAmount.add(lineTax);

                totalDiscountAmount = totalDiscountAmount.add(lineDiscount);
                totalTaxAmount = totalTaxAmount.add(lineTax);
                subtotal = subtotal.add(netLineAmount);

                QuotationItem item = QuotationItem.builder()
                        .quotation(quotation)
                        .description(itemReq.getDescription())
                        .category(itemReq.getCategory())
                        .quantity(qty)
                        .unit(itemReq.getUnit())
                        .unitPrice(unitPrice)
                        .discountPercent(discountPct)
                        .taxPercent(taxPct)
                        .lineTotal(lineTotal)
                        .sortOrder(itemReq.getSortOrder())
                        .build();
                quotation.getItems().add(item);
            }
        }

        quotation.setDiscountAmount(totalDiscountAmount);
        quotation.setTaxAmount(totalTaxAmount);
        quotation.setSubtotal(subtotal);
        quotation.setGrandTotal(subtotal.add(totalTaxAmount));

        Quotation saved = quotationRepository.save(quotation);
        logActivity(admin.getId(), "Updated Quotation: " + saved.getQuotationNumber(), "Quotation", saved.getId());
        return saved;
    }

    @Transactional
    public Quotation saveQuotationDraft(Long quotationId, QuotationRequest request, Long adminId) {
        AdminUser admin = userRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found"));
        return saveQuotationDraft(quotationId, request, admin);
    }
    
    @Transactional
    public void markAsSent(Long quotationId, AdminUser admin) {
        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation not found"));

        if (quotation.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Quotation not found");
        }
        
        authorizationService.checkQuotationAccess(admin, quotation);

        quotation.setStatus("SENT");
        quotationRepository.save(quotation);
        
        if (quotation.getEnquiry() != null) {
            AdminEnquiry enquiry = quotation.getEnquiry();
            enquiry.setStatus("QUOTED");
            enquiryRepository.save(enquiry);
            logActivity(admin.getId(), "Enquiry marked as QUOTED due to SENT quotation", "AdminEnquiry", enquiry.getId());
            
            AdminUser assignee = enquiry.getAssignedTo();
            if (assignee != null && !assignee.getId().equals(admin.getId())) {
                notificationService.createQuotationSentNotification(assignee, quotationId, quotation.getQuotationNumber());
            }
        }
        
        logActivity(admin.getId(), "Sent Quotation: " + quotation.getQuotationNumber(), "Quotation", quotation.getId());
    }

    @Transactional
    public void markAsSent(Long quotationId, Long adminId) {
        AdminUser admin = userRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found"));
        markAsSent(quotationId, admin);
    }

    @Transactional(readOnly = true)
    public Quotation getQuotationById(Long id, AdminUser admin) {
        Quotation quotation = quotationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation not found"));
        if (quotation.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Quotation not found");
        }
        authorizationService.checkQuotationAccess(admin, quotation);
        return quotation;
    }

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<Quotation> getTrashQuotations(org.springframework.data.domain.Pageable pageable, AdminUser admin) {
        return quotationRepository.findByDeletedAtIsNotNullAndStatus("DRAFT", pageable);
    }

    @Transactional
    public Quotation moveToTrash(Long id, AdminUser admin) {
        Quotation quotation = quotationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation not found"));

        authorizationService.checkQuotationAccess(admin, quotation);

        if (!"DRAFT".equals(quotation.getStatus())) {
            throw new IllegalArgumentException("Only DRAFT quotations can be moved to trash");
        }

        if (quotation.getDeletedAt() != null) {
            throw new IllegalStateException("Quotation is already in trash");
        }

        quotation.setDeletedAt(java.time.LocalDateTime.now());
        Quotation saved = quotationRepository.save(quotation);
        logActivity(admin.getId(), "Moved Quotation DRAFT to Trash: " + saved.getQuotationNumber(), "Quotation", saved.getId());
        return saved;
    }

    @Transactional
    public Quotation restoreFromTrash(Long id, AdminUser admin) {
        Quotation quotation = quotationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation not found"));

        authorizationService.checkQuotationAccess(admin, quotation);

        if (quotation.getDeletedAt() == null) {
            throw new IllegalArgumentException("Quotation is not in trash");
        }

        quotation.setDeletedAt(null);
        Quotation saved = quotationRepository.save(quotation);
        logActivity(admin.getId(), "Restored Quotation DRAFT from Trash: " + saved.getQuotationNumber(), "Quotation", saved.getId());
        return saved;
    }

    @Transactional
    public void permanentlyDelete(Long id, AdminUser admin) {
        if (admin == null || admin.getRole() != Role.SUPER_ADMIN) {
            throw new org.springframework.security.access.AccessDeniedException("Only Super Admin can permanently delete quotations");
        }

        Quotation quotation = quotationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation not found"));

        if (quotation.getDeletedAt() == null) {
            throw new IllegalArgumentException("Quotation must be in trash before permanent deletion");
        }

        String quotationNumber = quotation.getQuotationNumber();
        logActivity(admin.getId(), "Permanently deleted Quotation: " + quotationNumber, "Quotation", quotation.getId());
        quotationRepository.delete(quotation);
    }

    private void logActivity(Long adminId, String action, String entityType, Long entityId) {
        AdminActivity activity = AdminActivity.builder()
                .adminUserId(adminId)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .build();
        activityRepository.save(activity);
    }
}
