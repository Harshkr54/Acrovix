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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Predicate;

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
    private final EmailService emailService;

    public List<Quotation> getQuotationsByEnquiryId(Long enquiryId, AdminUser currentUser) {
        AdminEnquiry enquiry = enquiryRepository.findById(enquiryId)
                .orElseThrow(() -> new ResourceNotFoundException("Enquiry not found"));
        if (currentUser != null) {
            authorizationService.checkEnquiryAccess(currentUser, enquiry);
        }
        return quotationRepository.findByEnquiryIdAndDeletedAtIsNull(enquiryId);
    }

    public Page<Quotation> getAllQuotations(Pageable pageable, String search, AdminUser currentUser) {
        Specification<Quotation> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            // Authorization logic for SALES
            if (currentUser != null && currentUser.getRole() == Role.SALES) {
                Predicate createdByMe = cb.equal(root.get("createdBy").get("id"), currentUser.getId());
                
                // For enquiry access
                jakarta.persistence.criteria.Join<Object, Object> enquiryJoin = root.join("enquiry", jakarta.persistence.criteria.JoinType.LEFT);
                Predicate enquiryIsNull = cb.isNull(root.get("enquiry"));
                Predicate enquiryAssignedToNull = cb.isNull(enquiryJoin.get("assignedTo"));
                Predicate enquiryAssignedToMe = cb.equal(enquiryJoin.get("assignedTo").get("id"), currentUser.getId());
                
                Predicate validEnquiry = cb.or(enquiryIsNull, enquiryAssignedToNull, enquiryAssignedToMe);
                
                predicates.add(cb.or(createdByMe, validEnquiry));
            }
            
            // Only non-deleted
            predicates.add(cb.isNull(root.get("deletedAt")));
            
            // Search logic
            if (search != null && !search.isEmpty()) {
                String likePattern = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("quotationNumber")), likePattern),
                    cb.like(cb.lower(root.get("clientName")), likePattern),
                    cb.like(cb.lower(root.get("clientCompany")), likePattern),
                    cb.like(cb.lower(root.get("clientEmail")), likePattern)
                ));
            }
            
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        
        return quotationRepository.findAll(spec, pageable);
    }

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
                .quotationSource(QuotationSource.ENQUIRY)
                .status("DRAFT")
                .subtotal(BigDecimal.ZERO)
                .discountAmount(BigDecimal.ZERO)
                .taxAmount(BigDecimal.ZERO)
                .grandTotal(BigDecimal.ZERO)
                .createdBy(admin)
                .validUntil(LocalDate.now().plusDays(30))
                .build();

        Quotation saved = quotationRepository.save(quotation);
        saved.setColumnConfigs(createDefaultColumnConfigs(saved));
        saved = quotationRepository.save(saved);
        
        if (saved.getItems() != null) {
            saved.getItems().size();
        }
        if (saved.getEnquiry() != null) {
            saved.getEnquiry().getReferenceId();
        }
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
    public Quotation createDirectDraftQuotation(com.acrovix.admin.dto.CreateDirectQuotationRequest request, AdminUser admin) {
        if (admin == null) {
            throw new org.springframework.security.access.AccessDeniedException("Access denied: Unauthenticated user");
        }

        Quotation quotation = Quotation.builder()
                .quotationNumber(sequenceGenerator.generateNextQuotationNumber())
                .enquiry(null)
                .clientName(request.getClientName())
                .clientCompany(request.getClientCompany())
                .clientEmail(request.getClientEmail())
                .clientPhone(request.getClientPhone())
                .quotationSource(request.getQuotationSource() != null ? request.getQuotationSource() : QuotationSource.OTHER)
                .sourceNotes(request.getSourceNotes())
                .status("DRAFT")
                .subtotal(BigDecimal.ZERO)
                .discountAmount(BigDecimal.ZERO)
                .taxAmount(BigDecimal.ZERO)
                .grandTotal(BigDecimal.ZERO)
                .createdBy(admin)
                .validUntil(LocalDate.now().plusDays(30))
                .build();

        Quotation saved = quotationRepository.save(quotation);
        saved.setColumnConfigs(createDefaultColumnConfigs(saved));
        saved = quotationRepository.save(saved);

        if (saved.getItems() != null) {
            saved.getItems().size();
        }
        logActivity(admin.getId(), "Created Direct Quotation DRAFT: " + saved.getQuotationNumber(), "Quotation", saved.getId());
        return saved;
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
        if (request.getQuotationSource() != null) {
            quotation.setQuotationSource(request.getQuotationSource());
        }
        quotation.setSourceNotes(request.getSourceNotes());
        quotation.setTermsAndConditions(request.getTermsAndConditions());
        
        validateAndSetColumnConfigs(quotation, request.getColumnConfigs());

        quotation.getItems().clear(); // Clear existing

        BigDecimal totalDiscountAmount = BigDecimal.ZERO;
        BigDecimal totalTaxAmount = BigDecimal.ZERO;
        BigDecimal subtotal = BigDecimal.ZERO;

        if (request.getItems() != null) {
            for (QuotationItemRequest itemReq : request.getItems()) {
                BigDecimal qty = itemReq.getQuantity() != null ? itemReq.getQuantity() : BigDecimal.ZERO;
                BigDecimal unitPrice = itemReq.getUnitPrice() != null ? itemReq.getUnitPrice() : BigDecimal.ZERO;
                BigDecimal listPrice = itemReq.getListPrice() != null ? itemReq.getListPrice() : unitPrice;
                BigDecimal discountPct = itemReq.getDiscountPercent() != null ? itemReq.getDiscountPercent() : BigDecimal.ZERO;
                BigDecimal taxPct = itemReq.getTaxPercent() != null ? itemReq.getTaxPercent() : BigDecimal.ZERO;

                // Exact approved formulas (new pricing model)
                BigDecimal netLineAmount = qty.multiply(unitPrice).setScale(2, RoundingMode.HALF_UP);
                BigDecimal grossLineAmount = qty.multiply(listPrice).setScale(2, RoundingMode.HALF_UP);
                BigDecimal lineDiscount = grossLineAmount.subtract(netLineAmount);
                BigDecimal lineTax = netLineAmount.multiply(taxPct).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                BigDecimal lineTotal = netLineAmount.add(lineTax);

                totalDiscountAmount = totalDiscountAmount.add(lineDiscount);
                totalTaxAmount = totalTaxAmount.add(lineTax);
                subtotal = subtotal.add(netLineAmount);

                QuotationItem item = QuotationItem.builder()
                        .quotation(quotation)
                        .sku(itemReq.getSku())
                        .hsnSac(itemReq.getHsnSac())
                        .description(itemReq.getDescription())
                        .quantity(qty)
                        .listPrice(listPrice)
                        .unitPrice(unitPrice)
                        .discountPercent(discountPct)
                        .taxPercent(taxPct)
                        .lineTotal(lineTotal)
                        .sortOrder(itemReq.getSortOrder())
                        .customValues(itemReq.getCustomValues() != null ? new java.util.HashMap<>(itemReq.getCustomValues()) : new java.util.HashMap<>())
                        .build();
                quotation.getItems().add(item);
            }
        }

        quotation.setDiscountAmount(totalDiscountAmount);
        quotation.setTaxAmount(totalTaxAmount);
        quotation.setSubtotal(subtotal);
        quotation.setGrandTotal(subtotal.add(totalTaxAmount));

        Quotation saved = quotationRepository.save(quotation);
        if (saved.getItems() != null) {
            saved.getItems().size();
        }
        if (saved.getEnquiry() != null) {
            saved.getEnquiry().getReferenceId();
        }
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
    public void sendQuotation(Long id, String overrideRecipientEmail, AdminUser admin) {
        Quotation quotation = getQuotationById(id, admin);
        
        String finalRecipient = null;
        if (overrideRecipientEmail != null) {
            String trimmed = overrideRecipientEmail.trim();
            if (trimmed.isEmpty()) {
                throw new IllegalArgumentException("Recipient email cannot be blank");
            }
            if (!trimmed.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
                throw new IllegalArgumentException("Invalid recipient email format");
            }
            finalRecipient = trimmed;
        }
        
        emailService.sendQuotationEmail(quotation, finalRecipient);
        markAsSent(id, admin);
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
        Quotation quotation = quotationRepository.findWithDetailsById(id)
                .orElseGet(() -> quotationRepository.findById(id)
                        .orElseThrow(() -> new ResourceNotFoundException("Quotation not found")));
        if (quotation.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Quotation not found");
        }
        authorizationService.checkQuotationAccess(admin, quotation);
        if (quotation.getItems() != null) {
            quotation.getItems().size();
        }
        if (quotation.getEnquiry() != null) {
            quotation.getEnquiry().getReferenceId();
        }
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

    private List<QuotationColumnConfig> createDefaultColumnConfigs(Quotation quotation) {
        List<QuotationColumnConfig> configs = new ArrayList<>();
        String[] keys = {"rowNumber", "sku", "description", "hsnSac", "quantity", "listPrice", "discountPercent", "unitPrice", "taxPercent", "taxAmount", "total"};
        String[] displayNames = {"#", "SKU", "DESCRIPTION", "HSN / SAC", "QTY", "LIST PRICE", "DISC %", "UNIT PRICE", "TAX %", "TAX AMOUNT", "TOTAL"};
        String[] types = {"TEXT", "TEXT", "TEXT", "TEXT", "NUMBER", "CURRENCY", "NUMBER", "CURRENCY", "NUMBER", "CURRENCY", "CURRENCY"};
        for (int i = 0; i < keys.length; i++) {
            configs.add(QuotationColumnConfig.builder()
                    .quotation(quotation)
                    .columnKey(keys[i])
                    .displayName(displayNames[i])
                    .columnType(types[i])
                    .visible(true)
                    .sortOrder(i)
                    .isCustom(false)
                    .build());
        }
        return configs;
    }

    public Quotation buildTransientPreviewQuotation(com.acrovix.admin.dto.QuotationPreviewRequest request, AdminUser admin) {
        Quotation transientQ = new Quotation();
        transientQ.setClientName(request.getClientName());
        transientQ.setClientCompany(request.getClientCompany());
        transientQ.setClientEmail(request.getClientEmail());
        transientQ.setClientPhone(request.getClientPhone());
        transientQ.setQuotationSource(request.getQuotationSource() != null ? request.getQuotationSource() : QuotationSource.OTHER);
        transientQ.setSourceNotes(request.getSourceNotes());
        transientQ.setTermsAndConditions(request.getTermsAndConditions());
        
        // Always safe to initialize these for transient processing
        transientQ.setColumnConfigs(new ArrayList<>());
        transientQ.setItems(new ArrayList<>());

        if (request.getQuotationId() != null) {
            Quotation existing = getQuotationById(request.getQuotationId(), admin);
            transientQ.setId(existing.getId());
            transientQ.setQuotationNumber(existing.getQuotationNumber());
            transientQ.setCreatedAt(existing.getCreatedAt());
            transientQ.setValidUntil(existing.getValidUntil());
            transientQ.setEnquiry(existing.getEnquiry());
        } else {
            transientQ.setQuotationNumber("PREVIEW-DRAFT");
            transientQ.setCreatedAt(java.time.LocalDateTime.now());
            transientQ.setValidUntil(java.time.LocalDate.now().plusDays(30));
            if (request.getEnquiryId() != null) {
                transientQ.setEnquiry(enquiryRepository.findById(request.getEnquiryId()).orElse(null));
            }
        }
        
        // Reuse exact same logic for parsing and validaton (throws exceptions on invalid config safely)
        validateAndSetColumnConfigs(transientQ, request.getColumnConfigs());

        BigDecimal totalDiscountAmount = BigDecimal.ZERO;
        BigDecimal totalTaxAmount = BigDecimal.ZERO;
        BigDecimal subtotal = BigDecimal.ZERO;

        if (request.getItems() != null) {
            for (QuotationItemRequest itemReq : request.getItems()) {
                BigDecimal qty = itemReq.getQuantity() != null ? itemReq.getQuantity() : BigDecimal.ZERO;
                BigDecimal unitPrice = itemReq.getUnitPrice() != null ? itemReq.getUnitPrice() : BigDecimal.ZERO;
                BigDecimal listPrice = itemReq.getListPrice() != null ? itemReq.getListPrice() : unitPrice;
                BigDecimal discountPct = itemReq.getDiscountPercent() != null ? itemReq.getDiscountPercent() : BigDecimal.ZERO;
                BigDecimal taxPct = itemReq.getTaxPercent() != null ? itemReq.getTaxPercent() : BigDecimal.ZERO;

                BigDecimal netLineAmount = qty.multiply(unitPrice).setScale(2, RoundingMode.HALF_UP);
                BigDecimal grossLineAmount = qty.multiply(listPrice).setScale(2, RoundingMode.HALF_UP);
                BigDecimal lineDiscount = grossLineAmount.subtract(netLineAmount);
                BigDecimal lineTax = netLineAmount.multiply(taxPct).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                BigDecimal lineTotal = netLineAmount.add(lineTax);

                totalDiscountAmount = totalDiscountAmount.add(lineDiscount);
                totalTaxAmount = totalTaxAmount.add(lineTax);
                subtotal = subtotal.add(netLineAmount);

                QuotationItem item = QuotationItem.builder()
                        .quotation(transientQ)
                        .sku(itemReq.getSku())
                        .hsnSac(itemReq.getHsnSac())
                        .description(itemReq.getDescription())
                        .quantity(qty)
                        .listPrice(listPrice)
                        .unitPrice(unitPrice)
                        .discountPercent(discountPct)
                        .taxPercent(taxPct)
                        .lineTotal(lineTotal)
                        .sortOrder(itemReq.getSortOrder())
                        .customValues(itemReq.getCustomValues() != null ? new java.util.HashMap<>(itemReq.getCustomValues()) : new java.util.HashMap<>())
                        .build();
                transientQ.getItems().add(item);
            }
        }

        transientQ.setDiscountAmount(totalDiscountAmount);
        transientQ.setTaxAmount(totalTaxAmount);
        transientQ.setSubtotal(subtotal);
        transientQ.setGrandTotal(subtotal.add(totalTaxAmount));

        return transientQ;
    }

    private void validateAndSetColumnConfigs(Quotation quotation, List<com.acrovix.admin.dto.QuotationColumnConfigRequest> configRequests) {
        if (configRequests == null || configRequests.isEmpty()) {
            return;
        }

        java.util.Set<String> builtInKeys = java.util.Set.of("rowNumber", "sku", "description", "hsnSac", "quantity", "listPrice", "discountPercent", "unitPrice", "taxPercent", "taxAmount", "total");
        java.util.Set<String> validTypes = java.util.Set.of("TEXT", "NUMBER", "CURRENCY");

        java.util.Set<String> seenKeys = new java.util.HashSet<>();
        java.util.Set<Integer> seenSortOrders = new java.util.HashSet<>();
        
        quotation.getColumnConfigs().clear();

        for (com.acrovix.admin.dto.QuotationColumnConfigRequest req : configRequests) {
            String key = req.getColumnKey();
            if (key == null || key.trim().isEmpty()) {
                throw new IllegalArgumentException("Column key cannot be empty");
            }
            key = key.trim();

            String displayName = req.getDisplayName();
            if (displayName == null || displayName.trim().isEmpty()) {
                throw new IllegalArgumentException("Column display name cannot be empty for key: " + key);
            }

            String type = req.getColumnType();
            if (type == null || !validTypes.contains(type.toUpperCase())) {
                throw new IllegalArgumentException("Invalid column type for key: " + key);
            }

            if (req.getSortOrder() == null) {
                throw new IllegalArgumentException("Sort order cannot be null for key: " + key);
            }
            if (req.getVisible() == null) {
                throw new IllegalArgumentException("Visible flag cannot be null for key: " + key);
            }
            if (req.getIsCustom() == null) {
                throw new IllegalArgumentException("isCustom flag cannot be null for key: " + key);
            }

            if (!seenKeys.add(key)) {
                throw new IllegalArgumentException("Duplicate column key found: " + key);
            }
            if (!seenSortOrders.add(req.getSortOrder())) {
                throw new IllegalArgumentException("Duplicate sort order found: " + req.getSortOrder());
            }

            if (req.getIsCustom()) {
                if (builtInKeys.contains(key)) {
                    throw new IllegalArgumentException("Reserved built-in key cannot be used as a custom column: " + key);
                }
            } else {
                if (!builtInKeys.contains(key)) {
                    throw new IllegalArgumentException("Unknown built-in column key: " + key);
                }
            }

            QuotationColumnConfig config = QuotationColumnConfig.builder()
                    .quotation(quotation)
                    .columnKey(key)
                    .displayName(displayName.trim())
                    .columnType(type.toUpperCase())
                    .visible(req.getVisible())
                    .sortOrder(req.getSortOrder())
                    .isCustom(req.getIsCustom())
                    .build();
            quotation.getColumnConfigs().add(config);
        }
    }
}
