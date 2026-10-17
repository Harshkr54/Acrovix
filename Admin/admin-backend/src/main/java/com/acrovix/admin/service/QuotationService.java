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
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Predicate;
import com.acrovix.admin.exception.ResourceNotFoundException;
import com.acrovix.admin.exception.ResourceConflictException;
import com.acrovix.admin.repository.PurchaseOrderRepository;
import com.acrovix.admin.repository.InvoiceRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import com.acrovix.admin.entity.Currency;

@Service
public class QuotationService {

    private final QuotationRepository quotationRepository;
    private final AdminEnquiryRepository enquiryRepository;
    private final AdminUserRepository userRepository;
    private final SequenceGeneratorService sequenceGenerator;
    private final AdminActivityRepository activityRepository;
    private final NotificationService notificationService;
    private final AuthorizationService authorizationService;
    private final EmailService emailService;
    private final com.acrovix.admin.repository.CustomerRepository customerRepository;
    private final com.acrovix.admin.repository.ProductServiceRepository productServiceRepository;
    private final com.acrovix.admin.repository.CrmLeadRepository crmLeadRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final InvoiceRepository invoiceRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private AuditLogService auditLogService;

    @org.springframework.beans.factory.annotation.Autowired
    public QuotationService(
            QuotationRepository quotationRepository,
            AdminEnquiryRepository enquiryRepository,
            AdminUserRepository userRepository,
            SequenceGeneratorService sequenceGenerator,
            AdminActivityRepository activityRepository,
            NotificationService notificationService,
            AuthorizationService authorizationService,
            EmailService emailService,
            com.acrovix.admin.repository.CustomerRepository customerRepository,
            com.acrovix.admin.repository.ProductServiceRepository productServiceRepository,
            com.acrovix.admin.repository.CrmLeadRepository crmLeadRepository,
            PurchaseOrderRepository purchaseOrderRepository,
            InvoiceRepository invoiceRepository) {
        this.quotationRepository = quotationRepository;
        this.enquiryRepository = enquiryRepository;
        this.userRepository = userRepository;
        this.sequenceGenerator = sequenceGenerator;
        this.activityRepository = activityRepository;
        this.notificationService = notificationService;
        this.authorizationService = authorizationService;
        this.emailService = emailService;
        this.customerRepository = customerRepository;
        this.productServiceRepository = productServiceRepository;
        this.crmLeadRepository = crmLeadRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.invoiceRepository = invoiceRepository;
    }

    public QuotationService(
            QuotationRepository quotationRepository,
            AdminEnquiryRepository enquiryRepository,
            AdminUserRepository userRepository,
            SequenceGeneratorService sequenceGenerator,
            AdminActivityRepository activityRepository,
            NotificationService notificationService,
            AuthorizationService authorizationService,
            EmailService emailService,
            com.acrovix.admin.repository.CustomerRepository customerRepository,
            com.acrovix.admin.repository.ProductServiceRepository productServiceRepository,
            com.acrovix.admin.repository.CrmLeadRepository crmLeadRepository) {
        this(quotationRepository, enquiryRepository, userRepository, sequenceGenerator, activityRepository,
             notificationService, authorizationService, emailService, customerRepository, productServiceRepository,
             crmLeadRepository, null, null);
    }

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
                Predicate hasEnquiry = cb.isNotNull(root.get("enquiry"));
                Predicate enquiryAssignedToNull = cb.isNull(enquiryJoin.get("assignedTo"));
                Predicate enquiryAssignedToMe = cb.equal(enquiryJoin.get("assignedTo").get("id"), currentUser.getId());
                
                Predicate validEnquiry = cb.and(hasEnquiry, cb.or(enquiryAssignedToNull, enquiryAssignedToMe));
                
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
        saved.setBaseQuotationId(saved.getId());
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
    public Quotation createDraftQuotationFromLead(Long leadId, AdminUser admin) {
        com.acrovix.admin.entity.CrmLead lead = crmLeadRepository.findById(leadId)
                .orElseThrow(() -> new ResourceNotFoundException("CRM Lead not found #" + leadId));

        if (admin != null && admin.getRole() == Role.SALES) {
            if (lead.getAssignedTo() != null && !lead.getAssignedTo().getId().equals(admin.getId())) {
                throw new org.springframework.security.access.AccessDeniedException("Access denied: Lead is assigned to another sales representative");
            }
        }

        Quotation quotation = Quotation.builder()
                .quotationNumber(sequenceGenerator.generateNextQuotationNumber())
                .enquiry(lead.getEnquiry())
                .customer(lead.getCustomer())
                .clientName(lead.getFullName())
                .clientCompany(lead.getCompanyName())
                .clientEmail(lead.getBusinessEmail())
                .clientPhone(lead.getPhoneNumber())
                .quotationSource(QuotationSource.CRM_LEAD)
                .sourceNotes("Generated from CRM Lead #" + lead.getLeadNumber())
                .status("DRAFT")
                .currency(lead.getCurrency() != null ? lead.getCurrency() : Currency.INR)
                .subtotal(BigDecimal.ZERO)
                .discountAmount(BigDecimal.ZERO)
                .taxAmount(BigDecimal.ZERO)
                .grandTotal(BigDecimal.ZERO)
                .createdBy(admin)
                .validUntil(LocalDate.now().plusDays(30))
                .build();

        Quotation saved = quotationRepository.save(quotation);
        saved.setColumnConfigs(createDefaultColumnConfigs(saved));
        saved.setBaseQuotationId(saved.getId());
        saved = quotationRepository.save(saved);

        if (lead.getStatus() == com.acrovix.admin.entity.LeadStatus.NEW || 
            lead.getStatus() == com.acrovix.admin.entity.LeadStatus.CONTACTED || 
            lead.getStatus() == com.acrovix.admin.entity.LeadStatus.QUALIFIED) {
            lead.setStatus(com.acrovix.admin.entity.LeadStatus.PROPOSAL);
            crmLeadRepository.save(lead);
            activityRepository.save(AdminActivity.builder()
                    .adminUserId(admin.getId())
                    .action("LEAD_STATUS_CHANGED")
                    .entityType("CRM_LEAD")
                    .entityId(lead.getId())
                    .description("Advanced stage to PROPOSAL upon generating Quotation " + saved.getQuotationNumber())
                    .build());
        }

        activityRepository.save(AdminActivity.builder()
                .adminUserId(admin.getId())
                .action("QUOTATION_CREATED")
                .entityType("Quotation")
                .entityId(saved.getId())
                .description("Created draft Quotation " + saved.getQuotationNumber() + " for CRM Lead #" + lead.getLeadNumber())
                .build());

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
        if (request == null) {
            throw new IllegalArgumentException("Request cannot be null");
        }
        if (request.getBillingAddress() == null || request.getBillingAddress().trim().isEmpty()) {
            throw new IllegalArgumentException("Billing address is required");
        }

        Quotation quotation = Quotation.builder()
                .quotationNumber(sequenceGenerator.generateNextQuotationNumber())
                .enquiry(null)
                .clientName(request.getClientName())
                .clientCompany(request.getClientCompany())
                .clientEmail(request.getClientEmail())
                .clientPhone(request.getClientPhone())
                .currency(request.getCurrency() != null ? request.getCurrency() : Currency.INR)
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

        if (request.getCustomerId() != null) {
            Customer cust = customerRepository.findById(request.getCustomerId()).orElse(null);
            if (cust != null) {
                if (request.getBillingAddress() != null && !request.getBillingAddress().isBlank()) {
                    cust.setBillingAddress(request.getBillingAddress().trim());
                }
                if (request.getShippingAddress() != null && !request.getShippingAddress().isBlank()) {
                    cust.setShippingAddress(request.getShippingAddress().trim());
                }
                if (request.getState() != null && !request.getState().isBlank()) {
                    cust.setState(request.getState().trim());
                }
                if (request.getPincode() != null && !request.getPincode().isBlank()) {
                    cust.setPincode(request.getPincode().trim());
                }
                cust = customerRepository.save(cust);
            }
            quotation.setCustomer(cust);
        } else if ((request.getGstin() != null && !request.getGstin().trim().isEmpty()) ||
                   (request.getBillingAddress() != null && !request.getBillingAddress().trim().isEmpty()) ||
                   (request.getShippingAddress() != null && !request.getShippingAddress().trim().isEmpty()) ||
                   (request.getState() != null && !request.getState().trim().isEmpty()) ||
                   (request.getPincode() != null && !request.getPincode().trim().isEmpty())) {
            
            Customer cust = null;
            if (request.getGstin() != null && !request.getGstin().trim().isEmpty()) {
                cust = customerRepository.findByGstin(request.getGstin().trim()).orElse(null);
            }
            if (cust == null && request.getClientEmail() != null && !request.getClientEmail().trim().isEmpty()) {
                cust = customerRepository.findByEmail(request.getClientEmail().trim()).orElse(null);
            }
            
            if (cust == null) {
                Customer newCust = Customer.builder()
                        .customerCode("CUST-" + System.currentTimeMillis())
                        .name(request.getClientName())
                        .companyName(request.getClientCompany())
                        .email(request.getClientEmail())
                        .phone(request.getClientPhone())
                        .gstin(request.getGstin() != null ? request.getGstin().trim() : null)
                        .billingAddress(request.getBillingAddress() != null ? request.getBillingAddress().trim() : null)
                        .shippingAddress(request.getShippingAddress() != null ? request.getShippingAddress().trim() : null)
                        .state(request.getState() != null ? request.getState().trim() : null)
                        .pincode(request.getPincode() != null ? request.getPincode().trim() : null)
                        .currency(request.getCurrency() != null ? request.getCurrency() : Currency.INR)
                        .active(true)
                        .createdBy(admin.getId())
                        .build();
                cust = customerRepository.save(newCust);
            } else {
                if (request.getBillingAddress() != null && !request.getBillingAddress().isBlank()) {
                    cust.setBillingAddress(request.getBillingAddress().trim());
                }
                if (request.getState() != null && !request.getState().isBlank()) {
                    cust.setState(request.getState().trim());
                }
                if (request.getPincode() != null && !request.getPincode().isBlank()) {
                    cust.setPincode(request.getPincode().trim());
                }
                cust = customerRepository.save(cust);
            }
            quotation.setCustomer(cust);
        }

        Quotation saved = quotationRepository.save(quotation);
        saved.setColumnConfigs(createDefaultColumnConfigs(saved));
        saved.setBaseQuotationId(saved.getId());
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
            throw new ResourceConflictException("Cannot modify quotation with status " + quotation.getStatus() + ". Only DRAFT quotations can be modified.");
        }

        quotation.setClientName(request.getClientName());
        quotation.setClientCompany(request.getClientCompany());
        quotation.setClientEmail(request.getClientEmail());
        quotation.setClientPhone(request.getClientPhone());
        if (request.getCurrency() != null) {
            quotation.setCurrency(request.getCurrency());
        }
        if (request.getQuotationSource() != null) {
            quotation.setQuotationSource(request.getQuotationSource());
        }
        quotation.setSourceNotes(request.getSourceNotes());
        quotation.setTermsAndConditions(request.getTermsAndConditions());
        quotation.setBankName(request.getBankName());
        quotation.setBankAccountHolder(request.getBankAccountHolder());
        quotation.setBankAccountNumber(request.getBankAccountNumber());
        quotation.setBankIfsc(request.getBankIfsc());
        quotation.setBankBranch(request.getBankBranch());
        quotation.setCompanyBankAccountId(request.getCompanyBankAccountId());
        if (request.getValidUntil() != null) {
            LocalDate issueDate = quotation.getCreatedAt() != null ? quotation.getCreatedAt().toLocalDate() : LocalDate.now();
            if (request.getValidUntil().isBefore(issueDate)) {
                throw new IllegalArgumentException("Valid Until date cannot be earlier than quotation issue date (" + issueDate + ").");
            }
            quotation.setValidUntil(request.getValidUntil());
        }
        
        Customer cust = null;
        if (request.getCustomerId() != null) {
            cust = customerRepository.findById(request.getCustomerId()).orElse(null);
        } else if (quotation.getCustomer() != null) {
            cust = quotation.getCustomer();
        }

        if (cust != null) {
            if (request.getBillingAddress() != null) cust.setBillingAddress(request.getBillingAddress().trim());
            if (request.getShippingAddress() != null) cust.setShippingAddress(request.getShippingAddress().trim());
            if (request.getState() != null) cust.setState(request.getState().trim());
            if (request.getPincode() != null) cust.setPincode(request.getPincode().trim());
            if (request.getGstin() != null) cust.setGstin(request.getGstin().trim());
            cust = customerRepository.save(cust);
            quotation.setCustomer(cust);
        } else if (request.getBillingAddress() != null && !request.getBillingAddress().trim().isEmpty()) {
            Customer newCust = Customer.builder()
                    .customerCode("CUST-" + System.currentTimeMillis())
                    .name(request.getClientName())
                    .companyName(request.getClientCompany())
                    .email(request.getClientEmail())
                    .phone(request.getClientPhone())
                    .gstin(request.getGstin() != null ? request.getGstin().trim() : null)
                    .billingAddress(request.getBillingAddress().trim())
                    .shippingAddress(request.getShippingAddress() != null ? request.getShippingAddress().trim() : null)
                    .state(request.getState() != null ? request.getState().trim() : null)
                    .pincode(request.getPincode() != null ? request.getPincode().trim() : null)
                    .currency(request.getCurrency() != null ? request.getCurrency() : Currency.INR)
                    .active(true)
                    .createdBy(admin.getId())
                    .build();
            cust = customerRepository.save(newCust);
            quotation.setCustomer(cust);
        } else {
            quotation.setCustomer(null);
        }
        
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

                ProductService productService = null;
                if (itemReq.getProductServiceId() != null) {
                    productService = productServiceRepository.findById(itemReq.getProductServiceId()).orElse(null);
                }

                QuotationItem item = QuotationItem.builder()
                        .quotation(quotation)
                        .productService(productService)
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
        if (saved.getColumnConfigs() != null) {
            saved.getColumnConfigs().size();
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
        sendQuotation(id, overrideRecipientEmail, "STANDARD", admin);
    }

    @Transactional
    public void sendQuotation(Long id, String overrideRecipientEmail, String pdfVariant, AdminUser admin) {
        Quotation quotation = getQuotationById(id, admin);
        
        if (!"DRAFT".equals(quotation.getStatus())) {
            throw new ResourceConflictException("Cannot send quotation with status " + quotation.getStatus() + ". Only DRAFT quotations can be sent.");
        }

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
        } else {
            if (quotation.getClientEmail() != null && !quotation.getClientEmail().trim().isEmpty()) {
                finalRecipient = quotation.getClientEmail().trim();
            } else if (quotation.getCustomer() != null && quotation.getCustomer().getEmail() != null && !quotation.getCustomer().getEmail().trim().isEmpty()) {
                finalRecipient = quotation.getCustomer().getEmail().trim();
            }
        }

        if (finalRecipient == null || finalRecipient.isEmpty()) {
            throw new IllegalArgumentException("Recipient email is required to send quotation");
        }
        if (!finalRecipient.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new IllegalArgumentException("Invalid recipient email format");
        }

        // Generate a secure unique client token if not already set
        if (quotation.getClientToken() == null) {
            String token = java.util.UUID.randomUUID().toString().replace("-", "") +
                           java.util.UUID.randomUUID().toString().replace("-", "");
            // Trim to 64 chars
            token = token.substring(0, 64);
            quotation.setClientToken(token);
            quotationRepository.save(quotation);
        }
        
        emailService.sendQuotationEmail(quotation, finalRecipient, pdfVariant);
        markAsSent(id, admin);
    }

    @Transactional
    public void sendQuotationToRecipients(Long id, List<String> overrideRecipientEmails, AdminUser admin) {
        sendQuotationToRecipients(id, overrideRecipientEmails, "STANDARD", admin);
    }

    @Transactional
    public void sendQuotationToRecipients(Long id, List<String> overrideRecipientEmails, String pdfVariant, AdminUser admin) {
        if (overrideRecipientEmails == null || overrideRecipientEmails.isEmpty()) {
            sendQuotation(id, (String) null, pdfVariant, admin);
            return;
        }

        Map<String, String> deduplicated = new LinkedHashMap<>();
        for (String raw : overrideRecipientEmails) {
            if (raw == null) {
                continue;
            }
            String[] parts = raw.split("[,;]");
            for (String part : parts) {
                String trimmed = part.trim();
                if (trimmed.isEmpty()) {
                    throw new IllegalArgumentException("Recipient email cannot be blank");
                }
                if (!trimmed.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
                    throw new IllegalArgumentException("Invalid recipient email format: " + trimmed);
                }
                deduplicated.putIfAbsent(trimmed.toLowerCase(), trimmed);
            }
        }

        List<String> finalRecipients = new ArrayList<>(deduplicated.values());
        if (finalRecipients.isEmpty()) {
            sendQuotation(id, (String) null, pdfVariant, admin);
            return;
        }

        if (finalRecipients.size() == 1) {
            sendQuotation(id, finalRecipients.get(0), pdfVariant, admin);
            return;
        }

        Quotation quotation = getQuotationById(id, admin);

        if (!"DRAFT".equals(quotation.getStatus())) {
            throw new ResourceConflictException("Cannot send quotation with status " + quotation.getStatus() + ". Only DRAFT quotations can be sent.");
        }

        // Generate a secure unique client token if not already set
        if (quotation.getClientToken() == null) {
            String token = java.util.UUID.randomUUID().toString().replace("-", "") +
                           java.util.UUID.randomUUID().toString().replace("-", "");
            token = token.substring(0, 64);
            quotation.setClientToken(token);
            quotationRepository.save(quotation);
        }

        emailService.sendQuotationEmailToRecipients(quotation, finalRecipients, pdfVariant);
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

        if (!"DRAFT".equals(quotation.getStatus())) {
            throw new ResourceConflictException("Cannot mark quotation as SENT from status " + quotation.getStatus() + ". Only DRAFT quotations can be sent.");
        }

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

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markAsExpired(Long quotationId) {
        quotationRepository.findById(quotationId).ifPresent(q -> {
            if (!"EXPIRED".equals(q.getStatus())) {
                q.setStatus("EXPIRED");
                quotationRepository.save(q);
            }
        });
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
        if (quotation.getColumnConfigs() != null) {
            quotation.getColumnConfigs().size();
        }
        return quotation;
    }

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<Quotation> getTrashQuotations(org.springframework.data.domain.Pageable pageable, AdminUser admin) {
        if (admin != null && admin.getRole() == Role.SALES) {
            Specification<Quotation> spec = (root, query, cb) -> {
                List<Predicate> predicates = new ArrayList<>();
                predicates.add(cb.isNotNull(root.get("deletedAt")));
                predicates.add(cb.equal(root.get("status"), "DRAFT"));

                Predicate createdByMe = cb.equal(root.get("createdBy").get("id"), admin.getId());
                jakarta.persistence.criteria.Join<Object, Object> enquiryJoin = root.join("enquiry", jakarta.persistence.criteria.JoinType.LEFT);
                Predicate hasEnquiry = cb.isNotNull(root.get("enquiry"));
                Predicate enquiryAssignedToNull = cb.isNull(enquiryJoin.get("assignedTo"));
                Predicate enquiryAssignedToMe = cb.equal(enquiryJoin.get("assignedTo").get("id"), admin.getId());

                Predicate validEnquiry = cb.and(hasEnquiry, cb.or(enquiryAssignedToNull, enquiryAssignedToMe));
                predicates.add(cb.or(createdByMe, validEnquiry));

                return cb.and(predicates.toArray(new Predicate[0]));
            };
            return quotationRepository.findAll(spec, pageable);
        }
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
        if (admin == null || (admin.getRole() != Role.SUPER_ADMIN && admin.getRole() != Role.COMPANY_ADMIN)) {
            throw new org.springframework.security.access.AccessDeniedException("Only Super Admin or Company Admin can permanently delete quotations");
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

        if (auditLogService != null && entityId != null) {
            String performedBy = "System";
            if (adminId != null) {
                performedBy = userRepository.findById(adminId)
                        .map(AdminUser::getName)
                        .orElse("Admin #" + adminId);
            }
            auditLogService.log(entityType != null ? entityType.toUpperCase() : "QUOTATION", entityId, action, performedBy, action);
        }
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
        if (request == null) {
            throw new IllegalArgumentException("Quotation preview request cannot be null");
        }
        if (request.getTermsAndConditions() == null || request.getTermsAndConditions().trim().isEmpty()) {
            throw new IllegalArgumentException("Terms & Conditions are mandatory before previewing the quotation PDF.");
        }
        boolean hasBank = request.getCompanyBankAccountId() != null 
                || (request.getBankAccountNumber() != null && !request.getBankAccountNumber().trim().isEmpty());
        if (!hasBank) {
            throw new IllegalArgumentException("Bank Account is mandatory before previewing the quotation PDF.");
        }

        Quotation transientQ = new Quotation();
        transientQ.setClientName(request.getClientName());
        transientQ.setClientCompany(request.getClientCompany());
        transientQ.setClientEmail(request.getClientEmail());
        transientQ.setClientPhone(request.getClientPhone());
        transientQ.setQuotationSource(request.getQuotationSource() != null ? request.getQuotationSource() : QuotationSource.OTHER);
        transientQ.setSourceNotes(request.getSourceNotes());
        transientQ.setTermsAndConditions(request.getTermsAndConditions());
        transientQ.setBankName(request.getBankName());
        transientQ.setBankAccountHolder(request.getBankAccountHolder());
        transientQ.setBankAccountNumber(request.getBankAccountNumber());
        transientQ.setBankIfsc(request.getBankIfsc());
        transientQ.setBankBranch(request.getBankBranch());
        transientQ.setCompanyBankAccountId(request.getCompanyBankAccountId());
        if (request.getValidUntil() != null) {
            transientQ.setValidUntil(request.getValidUntil());
        }
        
        Customer cust = null;
        if (request.getCustomerId() != null) {
            cust = customerRepository.findById(request.getCustomerId()).orElse(null);
        }
        if (cust == null && request.getQuotationId() != null) {
            Quotation existing = quotationRepository.findById(request.getQuotationId()).orElse(null);
            if (existing != null && existing.getCustomer() != null) {
                cust = existing.getCustomer();
            }
        }
        if (cust == null && ((request.getBillingAddress() != null && !request.getBillingAddress().isBlank()) || 
                             (request.getClientName() != null && !request.getClientName().isBlank()))) {
            cust = new Customer();
            cust.setName(request.getClientName());
            cust.setCompanyName(request.getClientCompany());
            cust.setEmail(request.getClientEmail());
            cust.setPhone(request.getClientPhone());
        }

        if (cust != null) {
            Customer previewCust = Customer.builder()
                    .id(cust.getId())
                    .customerCode(cust.getCustomerCode())
                    .name(request.getClientName() != null ? request.getClientName() : cust.getName())
                    .companyName(request.getClientCompany() != null ? request.getClientCompany() : cust.getCompanyName())
                    .email(request.getClientEmail() != null ? request.getClientEmail() : cust.getEmail())
                    .phone(request.getClientPhone() != null ? request.getClientPhone() : cust.getPhone())
                    .billingAddress(request.getBillingAddress() != null ? request.getBillingAddress() : cust.getBillingAddress())
                    .shippingAddress(request.getShippingAddress() != null ? request.getShippingAddress() : cust.getShippingAddress())
                    .state(request.getState() != null ? request.getState() : cust.getState())
                    .pincode(request.getPincode() != null ? request.getPincode() : cust.getPincode())
                    .gstin(request.getGstin() != null ? request.getGstin() : cust.getGstin())
                    .build();
            transientQ.setCustomer(previewCust);
        }
        
        // Always safe to initialize these for transient processing
        transientQ.setColumnConfigs(new ArrayList<>());
        transientQ.setItems(new ArrayList<>());

        if (request.getQuotationId() != null) {
            Quotation existing = getQuotationById(request.getQuotationId(), admin);
            transientQ.setId(existing.getId());
            transientQ.setQuotationNumber(existing.getQuotationNumber());
            transientQ.setCreatedAt(existing.getCreatedAt());
            transientQ.setValidUntil(request.getValidUntil() != null ? request.getValidUntil() : existing.getValidUntil());
            transientQ.setEnquiry(existing.getEnquiry());
        } else {
            transientQ.setQuotationNumber("PREVIEW-DRAFT");
            transientQ.setCreatedAt(java.time.LocalDateTime.now());
            if (request.getValidUntil() != null) {
                transientQ.setValidUntil(request.getValidUntil());
            } else {
                transientQ.setValidUntil(java.time.LocalDate.now().plusDays(30));
            }
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

                ProductService productService = null;
                if (itemReq.getProductServiceId() != null) {
                    productService = productServiceRepository.findById(itemReq.getProductServiceId()).orElse(null);
                }

                QuotationItem item = QuotationItem.builder()
                        .quotation(transientQ)
                        .productService(productService)
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

    @Transactional
    public Quotation createRevision(Long quotationId, AdminUser admin) {
        Quotation original = getQuotationById(quotationId, admin);
        
        if (original.getDeletedAt() != null) {
            throw new IllegalArgumentException("Cannot revise a deleted quotation");
        }
        
        if ("DRAFT".equals(original.getStatus())) {
            throw new com.acrovix.admin.exception.ResourceConflictException("Cannot create revision from a DRAFT quotation. Send it first.");
        }

        if (purchaseOrderRepository != null && purchaseOrderRepository.existsByQuotationIdAndDeletedAtIsNull(original.getId())) {
            throw new ResourceConflictException("Cannot create revision for quotation " + original.getQuotationNumber() + " because an active Purchase Order already exists for it.");
        }

        if (invoiceRepository != null && invoiceRepository.existsByQuotationIdAndStatusNot(original.getId(), com.acrovix.admin.entity.InvoiceStatus.CANCELLED)) {
            throw new ResourceConflictException("Cannot create revision for quotation " + original.getQuotationNumber() + " because active Invoice records already exist for it.");
        }

        Long baseId = original.getBaseQuotationId() != null ? original.getBaseQuotationId() : original.getId();

        // Transaction safe increment
        Quotation baseForLock = quotationRepository.findBaseQuotationForUpdate(baseId)
                .orElseThrow(() -> new IllegalStateException("Base quotation not found for lock"));
        
        Integer maxVersion = quotationRepository.findMaxVersionByBaseQuotationId(baseId);
        int nextVersion = (maxVersion != null ? maxVersion : 0) + 1;

        Quotation revision = Quotation.builder()
                .quotationNumber(baseForLock.getQuotationNumber() + "-R" + nextVersion)
                .version(nextVersion)
                .baseQuotationId(baseId)
                .parentQuotationId(original.getId())
                .enquiry(original.getEnquiry())
                .customer(original.getCustomer())
                .clientName(original.getClientName())
                .clientCompany(original.getClientCompany())
                .clientEmail(original.getClientEmail())
                .clientPhone(original.getClientPhone())
                .quotationSource(original.getQuotationSource())
                .sourceNotes(original.getSourceNotes())
                .status("DRAFT")
                .subtotal(original.getSubtotal())
                .discountAmount(original.getDiscountAmount())
                .taxAmount(original.getTaxAmount())
                .grandTotal(original.getGrandTotal())
                .validUntil(LocalDate.now().plusDays(30))
                .termsAndConditions(original.getTermsAndConditions())
                .bankName(original.getBankName())
                .bankAccountHolder(original.getBankAccountHolder())
                .bankAccountNumber(original.getBankAccountNumber())
                .bankIfsc(original.getBankIfsc())
                .bankBranch(original.getBankBranch())
                .companyBankAccountId(original.getCompanyBankAccountId())
                .createdBy(admin)
                .build();
        revision.setTenantId(original.getTenantId());

        Quotation saved = quotationRepository.save(revision);

        for (QuotationItem originalItem : original.getItems()) {
            QuotationItem newItem = QuotationItem.builder()
                    .quotation(saved)
                    .productService(originalItem.getProductService())
                    .description(originalItem.getDescription())
                    .sku(originalItem.getSku())
                    .hsnSac(originalItem.getHsnSac())
                    .category(originalItem.getCategory())
                    .quantity(originalItem.getQuantity())
                    .unit(originalItem.getUnit())
                    .listPrice(originalItem.getListPrice())
                    .unitPrice(originalItem.getUnitPrice())
                    .discountPercent(originalItem.getDiscountPercent())
                    .taxPercent(originalItem.getTaxPercent())
                    .lineTotal(originalItem.getLineTotal())
                    .sortOrder(originalItem.getSortOrder())
                    .customValues(new java.util.HashMap<>(originalItem.getCustomValues()))
                    .build();
            newItem.setTenantId(original.getTenantId());
            saved.getItems().add(newItem);
        }

        for (QuotationColumnConfig originalConfig : original.getColumnConfigs()) {
            QuotationColumnConfig newConfig = QuotationColumnConfig.builder()
                    .quotation(saved)
                    .columnKey(originalConfig.getColumnKey())
                    .displayName(originalConfig.getDisplayName())
                    .columnType(originalConfig.getColumnType())
                    .visible(originalConfig.getVisible())
                    .sortOrder(originalConfig.getSortOrder())
                    .isCustom(originalConfig.getIsCustom())
                    .build();
            newConfig.setTenantId(original.getTenantId());
            saved.getColumnConfigs().add(newConfig);
        }

        saved = quotationRepository.save(saved);
        
        // Mark original as REVISED
        original.setStatus("REVISED");
        quotationRepository.save(original);
        
        logActivity(admin.getId(), "Created revision R" + nextVersion + " from " + original.getQuotationNumber(), "Quotation", saved.getId());
        return saved;
    }

    @Transactional(noRollbackFor = {IllegalStateException.class})
    public Quotation updateStatus(Long quotationId, com.acrovix.admin.dto.QuotationStatusUpdateRequest request, AdminUser admin) {
        Quotation quotation = quotationRepository.findByIdForUpdate(quotationId)
                .or(() -> quotationRepository.findById(quotationId))
                .orElseThrow(() -> new ResourceNotFoundException("Quotation not found"));

        if (quotation.getDeletedAt() != null) {
            throw new IllegalArgumentException("Cannot update status of a deleted quotation");
        }

        authorizationService.checkQuotationAccess(admin, quotation);
        
        String newStatus = request.getStatus();
        String currentStatus = quotation.getStatus();
        
        if (currentStatus.equals(newStatus)) {
            return quotation; // No-op
        }

        boolean validTransition = false;

        switch (currentStatus) {
            case "DRAFT":
                if ("SENT".equals(newStatus)) validTransition = true;
                break;
            case "SENT":
                if ("ACCEPTED".equals(newStatus) || "REJECTED".equals(newStatus) || "EXPIRED".equals(newStatus)) {
                    validTransition = true;
                }
                break;
            case "ACCEPTED":
                if ("CONVERTED".equals(newStatus)) {
                    validTransition = true;
                }
                break;
            case "REVISED":
                // REVISED is a terminal historical state — cannot be modified via this endpoint.
                // Changes must be made on the revision (R1, R2...) quotation.
                break;
            default:
                break;
        }

        if (!validTransition) {
            throw new com.acrovix.admin.exception.ResourceConflictException("Invalid status transition from " + currentStatus + " to " + newStatus);
        }

        if ("ACCEPTED".equals(newStatus)) {
            if (quotation.getValidUntil() != null && quotation.getValidUntil().isBefore(LocalDate.now())) {
                quotation.setStatus("EXPIRED");
                quotationRepository.save(quotation);
                throw new IllegalStateException("Quotation expired on " + quotation.getValidUntil() + " and cannot be accepted.");
            }
        }

        if ("ACCEPTED".equals(newStatus) || "REJECTED".equals(newStatus)) {
            if (request.getResponseSource() == null) {
                throw new IllegalArgumentException("responseSource is required when manually accepting or rejecting a quotation.");
            }
            quotation.setResponseSource(request.getResponseSource());
            quotation.setResponseNotes(request.getResponseNotes());
            if ("ACCEPTED".equals(newStatus)) {
                if (quotation.getSignedAt() == null) {
                    quotation.setSignedAt(LocalDateTime.now());
                }
                if (quotation.getSignerName() == null || quotation.getSignerName().isBlank()) {
                    quotation.setSignerName(quotation.getClientName());
                }
            }
        }

        quotation.setStatus(newStatus);
        Quotation saved = quotationRepository.save(quotation);
        
        String activityMessage = "Quotation status updated to " + newStatus + ": " + quotation.getQuotationNumber();
        if ("ACCEPTED".equals(newStatus) || "REJECTED".equals(newStatus)) {
            activityMessage = "QUOTATION_" + newStatus + " via " + request.getResponseSource();
            if (request.getResponseNotes() != null && !request.getResponseNotes().trim().isEmpty()) {
                activityMessage += " - Note: " + request.getResponseNotes().trim();
            }
            try {
                emailService.sendQuotationResponseAsync(saved);
            } catch (Exception e) {
                // Ignore email failure
            }
        }
        
        logActivity(admin.getId(), activityMessage, "Quotation", saved.getId());
        return saved;
    }

    @Transactional(readOnly = true)
    public List<Quotation> getQuotationVersions(Long quotationId, AdminUser admin) {
        Quotation quotation = getQuotationById(quotationId, admin);
        Long baseId = quotation.getBaseQuotationId() != null ? quotation.getBaseQuotationId() : quotation.getId();
        return quotationRepository.findByBaseQuotationIdOrderByVersionAsc(baseId);
    }
}
