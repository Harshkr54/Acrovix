package com.acrovix.admin.service;

import com.acrovix.admin.dto.InvoiceItemRequest;
import com.acrovix.admin.dto.InvoiceItemResponse;
import com.acrovix.admin.dto.InvoiceRequest;
import com.acrovix.admin.dto.InvoiceResponse;
import com.acrovix.admin.entity.*;
import com.acrovix.admin.repository.*;
import com.acrovix.admin.util.AmountToWordsConverter;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final CustomerRepository customerRepository;
    private final QuotationRepository quotationRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final ProductServiceRepository productServiceRepository;
    private final CompanySettingsRepository companySettingsRepository;
    private final SequenceGeneratorService sequenceGeneratorService;
    private final AdminActivityRepository activityRepository;
    private final NotificationService notificationService;
    private final PdfService pdfService;
    private final EmailService emailService;
    private final AuthorizationService authorizationService;
    private final PaymentRepository paymentRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private AuditLogService auditLogService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private QrCodeService qrCodeService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private CompanyBankAccountService companyBankAccountService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private CompanySettingsService companySettingsService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private EmailTemplateBuilder templateBuilder;

    @org.springframework.beans.factory.annotation.Value("${acrovix.app.frontend-url:${app.frontend.url:https://admin.acrovix.com}}")
    private String frontendUrl;

    @org.springframework.beans.factory.annotation.Autowired
    public InvoiceService(
            InvoiceRepository invoiceRepository,
            CustomerRepository customerRepository,
            QuotationRepository quotationRepository,
            PurchaseOrderRepository purchaseOrderRepository,
            ProductServiceRepository productServiceRepository,
            CompanySettingsRepository companySettingsRepository,
            SequenceGeneratorService sequenceGeneratorService,
            AdminActivityRepository activityRepository,
            NotificationService notificationService,
            PdfService pdfService,
            EmailService emailService,
            AuthorizationService authorizationService,
            PaymentRepository paymentRepository) {
        this.invoiceRepository = invoiceRepository;
        this.customerRepository = customerRepository;
        this.quotationRepository = quotationRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.productServiceRepository = productServiceRepository;
        this.companySettingsRepository = companySettingsRepository;
        this.sequenceGeneratorService = sequenceGeneratorService;
        this.activityRepository = activityRepository;
        this.notificationService = notificationService;
        this.pdfService = pdfService;
        this.emailService = emailService;
        this.authorizationService = authorizationService;
        this.paymentRepository = paymentRepository;
    }

    public InvoiceService(
            InvoiceRepository invoiceRepository,
            CustomerRepository customerRepository,
            QuotationRepository quotationRepository,
            PurchaseOrderRepository purchaseOrderRepository,
            ProductServiceRepository productServiceRepository,
            CompanySettingsRepository companySettingsRepository,
            SequenceGeneratorService sequenceGeneratorService,
            AdminActivityRepository activityRepository,
            NotificationService notificationService,
            PdfService pdfService,
            EmailService emailService,
            AuthorizationService authorizationService) {
        this(invoiceRepository, customerRepository, quotationRepository,
                purchaseOrderRepository, productServiceRepository, companySettingsRepository,
                sequenceGeneratorService, activityRepository, notificationService,
                pdfService, emailService, authorizationService, null);
    }

    @Transactional(readOnly = true)
    public void sendInvoiceEmail(Long id, String overrideEmail, AdminUser admin) {
        Invoice invoice = getInvoiceById(id, admin);

        String targetEmail = overrideEmail != null ? overrideEmail.trim() : null;
        if (targetEmail == null || targetEmail.isEmpty()) {
            if (invoice.getCustomer() != null && invoice.getCustomer().getEmail() != null) {
                targetEmail = invoice.getCustomer().getEmail().trim();
            } else if (invoice.getClientEmail() != null) {
                targetEmail = invoice.getClientEmail().trim();
            }
        }

        if (targetEmail == null || targetEmail.isEmpty()) {
            throw new IllegalArgumentException("Recipient email is required to send invoice");
        }

        if (!targetEmail.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new IllegalArgumentException("Invalid recipient email format");
        }

        emailService.sendInvoiceEmail(invoice, targetEmail);
    }

    @Transactional
    public String sendPaymentQrEmail(Long id, String overrideEmail, AdminUser admin) {
        Long tenantId = com.acrovix.admin.tenant.TenantContext.requireTenantId();
        Invoice invoice = getInvoiceById(id, admin);

        if (invoice.getPublicToken() == null || invoice.getPublicToken().isBlank()) {
            invoice.setPublicToken(java.util.UUID.randomUUID().toString());
            invoice = invoiceRepository.save(invoice);
        }

        String targetEmail = (overrideEmail != null && !overrideEmail.trim().isEmpty())
                ? overrideEmail.trim()
                : (invoice.getCustomer() != null && invoice.getCustomer().getEmail() != null
                        ? invoice.getCustomer().getEmail().trim()
                        : invoice.getClientEmail());

        if (targetEmail == null || targetEmail.trim().isEmpty()) {
            throw new IllegalArgumentException("Recipient email is required to send payment request.");
        }

        if (!targetEmail.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new IllegalArgumentException("Invalid recipient email format: " + targetEmail);
        }

        com.acrovix.admin.dto.CompanySettingsResponse settings = companySettingsService != null
                ? companySettingsService.getCompanySettingsForTenant(tenantId)
                : null;

        List<com.acrovix.admin.dto.CompanyBankAccountResponse> banks = companyBankAccountService != null
                ? companyBankAccountService.getActiveBankAccounts()
                : List.of();

        com.acrovix.admin.dto.CompanyBankAccountResponse activeBank = banks.stream()
                .filter(b -> Boolean.TRUE.equals(b.getIsDefault()))
                .findFirst()
                .orElse(!banks.isEmpty() ? banks.get(0) : null);

        String upiId = activeBank != null && activeBank.getUpiId() != null && !activeBank.getUpiId().isBlank()
                ? activeBank.getUpiId().trim()
                : "";

        String brandName = (settings != null && settings.getBrandName() != null && !settings.getBrandName().isBlank())
                ? settings.getBrandName().trim()
                : ((settings != null && settings.getCompanyName() != null && !settings.getCompanyName().isBlank())
                        ? settings.getCompanyName().trim() : "Acrovix Innovations");

        BigDecimal grandTotal = invoice.getGrandTotal() != null ? invoice.getGrandTotal() : BigDecimal.ZERO;
        BigDecimal paidAmount = invoice.getAmountPaid() != null ? invoice.getAmountPaid() : BigDecimal.ZERO;
        BigDecimal balanceDue = invoice.getBalanceDue() != null && invoice.getBalanceDue().compareTo(BigDecimal.ZERO) > 0
                ? invoice.getBalanceDue()
                : grandTotal.subtract(paidAmount).max(BigDecimal.ONE);

        String invoiceNo = invoice.getInvoiceNumber() != null ? invoice.getInvoiceNumber() : String.valueOf(invoice.getId());

        // Official NPCI UPI payload
        String effectiveUpiId = !upiId.isBlank() ? upiId : "payments@acrovix";
        String upiPayload = "upi://pay?pa=" + effectiveUpiId
                + "&pn=" + java.net.URLEncoder.encode(brandName, java.nio.charset.StandardCharsets.UTF_8)
                + "&am=" + balanceDue.setScale(2, RoundingMode.HALF_UP).toPlainString()
                + "&cu=INR&tn=Invoice-" + invoiceNo + "&tr=INV-" + invoice.getId();

        byte[] qrCodeBytes;
        if (qrCodeService != null) {
            qrCodeBytes = qrCodeService.generateQrCodePng(upiPayload, 260, 260);
        } else {
            qrCodeBytes = new QrCodeService().generateQrCodePng(upiPayload, 260, 260);
        }

        String baseAppUrl = (frontendUrl != null && !frontendUrl.isBlank()) ? frontendUrl.trim() : "https://admin.acrovix.com";
        while (baseAppUrl.endsWith("/")) {
            baseAppUrl = baseAppUrl.substring(0, baseAppUrl.length() - 1);
        }
        String paymentUrl = baseAppUrl + "/pay/invoice/" + invoice.getPublicToken();

        EmailTemplateBuilder builder = templateBuilder != null ? templateBuilder : new EmailTemplateBuilder();
        String htmlBody = builder.buildInvoicePaymentQrEmailHtml(invoice, settings, activeBank, paymentUrl);

        String subject = "Payment Request for Invoice #" + invoiceNo + " - " + brandName;

        com.acrovix.admin.dto.email.EmailAttachment qrAttachment = com.acrovix.admin.dto.email.EmailAttachment.builder()
                .filename("invoice-qr-" + invoice.getId() + ".png")
                .content(qrCodeBytes)
                .contentType("image/png")
                .contentId("qrCodeImage")
                .build();

        com.acrovix.admin.dto.email.EmailRequest request = com.acrovix.admin.dto.email.EmailRequest.builder()
                .to(targetEmail)
                .fromName(brandName)
                .replyTo(settings != null ? settings.getEmail() : null)
                .tenantId(tenantId)
                .subject(subject)
                .htmlBody(htmlBody)
                .isHtml(true)
                .emailType(EmailType.INVOICE)
                .relatedEntityType("INVOICE")
                .relatedEntityId(invoice.getId())
                .inlineImages(java.util.Map.of("qrCodeImage", qrAttachment))
                .attachments(List.of(qrAttachment))
                .build();

        emailService.sendEmail(request);

        // Audit log
        if (auditLogService != null) {
            try {
                auditLogService.log(
                        "INVOICE",
                        invoice.getId(),
                        "INVOICE_PAYMENT_QR_EMAIL_SENT",
                        admin != null ? admin.getUsername() : "SYSTEM",
                        "Payment request with UPI QR sent to " + targetEmail
                );
            } catch (Exception ignored) {}
        }

        return targetEmail;
    }

    @Transactional(readOnly = true)
    public byte[] generateSettlementReceiptPdf(Long id, AdminUser admin) {
        Invoice invoice = getInvoiceById(id, admin);
        List<Payment> payments = paymentRepository.findByInvoiceIdOrderByCreatedAtDesc(id);
        return pdfService.generatePaymentSettlementStatementPdf(invoice, payments, admin);
    }

    @Transactional
    public String sendSettlementEmail(Long id, String overrideEmail, AdminUser admin) {
        Long tenantId = com.acrovix.admin.tenant.TenantContext.requireTenantId();
        Invoice invoice = getInvoiceById(id, admin);
        List<Payment> payments = paymentRepository.findByInvoiceIdOrderByCreatedAtDesc(id);

        String targetEmail = (overrideEmail != null && !overrideEmail.trim().isEmpty())
                ? overrideEmail.trim()
                : (invoice.getCustomer() != null && invoice.getCustomer().getEmail() != null
                        ? invoice.getCustomer().getEmail().trim()
                        : invoice.getClientEmail());

        if (targetEmail == null || targetEmail.trim().isEmpty()) {
            throw new IllegalArgumentException("Recipient email is required to send settlement statement.");
        }

        if (!targetEmail.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new IllegalArgumentException("Invalid recipient email format: " + targetEmail);
        }

        com.acrovix.admin.dto.CompanySettingsResponse settings = companySettingsService != null
                ? companySettingsService.getCompanySettingsForTenant(tenantId)
                : null;

        String brandName = (settings != null && settings.getBrandName() != null && !settings.getBrandName().isBlank())
                ? settings.getBrandName().trim()
                : ((settings != null && settings.getCompanyName() != null && !settings.getCompanyName().isBlank())
                        ? settings.getCompanyName().trim() : "Acrovix Innovations");

        String invoiceNo = invoice.getInvoiceNumber() != null ? invoice.getInvoiceNumber() : String.valueOf(invoice.getId());

        byte[] pdfBytes = pdfService.generatePaymentSettlementStatementPdf(invoice, payments, admin);

        EmailTemplateBuilder builder = templateBuilder != null ? templateBuilder : new EmailTemplateBuilder();
        String htmlBody = builder.buildSettlementStatementEmailHtml(invoice, settings, payments);

        String subject = "Payment Clearance & Settlement Statement - Invoice #" + invoiceNo + " - " + brandName;

        String safeFileName = "Settlement_Statement_" + (invoice.getInvoiceNumber() != null ? invoice.getInvoiceNumber().replace("/", "_") : "INV_" + invoice.getId()) + ".pdf";

        com.acrovix.admin.dto.email.EmailAttachment statementAttachment = com.acrovix.admin.dto.email.EmailAttachment.builder()
                .filename(safeFileName)
                .content(pdfBytes)
                .contentType("application/pdf")
                .build();

        com.acrovix.admin.dto.email.EmailRequest request = com.acrovix.admin.dto.email.EmailRequest.builder()
                .to(targetEmail)
                .fromName(brandName)
                .replyTo(settings != null ? settings.getEmail() : null)
                .tenantId(tenantId)
                .subject(subject)
                .htmlBody(htmlBody)
                .isHtml(true)
                .emailType(EmailType.INVOICE)
                .relatedEntityType("INVOICE")
                .relatedEntityId(invoice.getId())
                .attachments(List.of(statementAttachment))
                .build();

        emailService.sendEmail(request);

        // Audit log
        if (auditLogService != null) {
            try {
                auditLogService.log(
                        "INVOICE",
                        invoice.getId(),
                        "INVOICE_SETTLEMENT_EMAIL_SENT",
                        admin != null ? admin.getUsername() : "SYSTEM",
                        "Payment settlement clearance statement PDF sent to " + targetEmail
                );
            } catch (Exception ignored) {}
        }

        return targetEmail;
    }


    @Transactional(readOnly = true)
    public Page<InvoiceResponse> searchInvoices(InvoiceType type, InvoiceStatus status, String search, Pageable pageable, AdminUser currentUser) {
        return searchInvoices(type, status, search, null, pageable, currentUser);
    }

    @Transactional(readOnly = true)
    public Page<InvoiceResponse> searchInvoices(InvoiceType type, InvoiceStatus status, String search, Long purchaseOrderId, Pageable pageable, AdminUser currentUser) {
        Specification<Invoice> spec = Specification.where(null);

        if (type != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("invoiceType"), type));
        }
        
        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }

        if (purchaseOrderId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("purchaseOrder").get("id"), purchaseOrderId));
        }

        if (search != null && !search.trim().isEmpty()) {
            String s = "%" + search.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> {
                var poJoin = root.join("purchaseOrder", jakarta.persistence.criteria.JoinType.LEFT);
                return cb.or(
                    cb.like(cb.lower(root.get("invoiceNumber")), s),
                    cb.like(cb.lower(root.get("clientName")), s),
                    cb.like(cb.lower(root.get("clientCompany")), s),
                    cb.like(cb.lower(poJoin.get("poNumber")), s),
                    cb.like(cb.lower(poJoin.get("clientPoNumber")), s)
                );
            });
        }

        if (currentUser.getRole() == Role.SALES) {
            spec = spec.and((root, query, cb) -> {
                var poJoin = root.join("purchaseOrder", jakarta.persistence.criteria.JoinType.LEFT);
                var poQuotationJoin = poJoin.join("quotation", jakarta.persistence.criteria.JoinType.LEFT);
                var poEnquiryJoin = poQuotationJoin.join("enquiry", jakarta.persistence.criteria.JoinType.LEFT);

                var quotationJoin = root.join("quotation", jakarta.persistence.criteria.JoinType.LEFT);
                var enquiryJoin = quotationJoin.join("enquiry", jakarta.persistence.criteria.JoinType.LEFT);
                
                return cb.or(
                        cb.equal(root.get("createdBy").get("id"), currentUser.getId()),
                        
                        cb.equal(poJoin.get("createdBy").get("id"), currentUser.getId()),
                        cb.equal(poQuotationJoin.get("createdBy").get("id"), currentUser.getId()),
                        cb.isNull(poEnquiryJoin.get("assignedTo")),
                        cb.equal(poEnquiryJoin.get("assignedTo").get("id"), currentUser.getId()),
                        
                        cb.equal(quotationJoin.get("createdBy").get("id"), currentUser.getId()),
                        cb.isNull(enquiryJoin.get("assignedTo")),
                        cb.equal(enquiryJoin.get("assignedTo").get("id"), currentUser.getId())
                );
            });
        }

        Page<Invoice> invoices = invoiceRepository.findAll(spec, pageable);
        return invoices.map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceResponseById(Long id, AdminUser admin) {
        Invoice invoice = invoiceRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found"));
        authorizationService.checkInvoiceAccess(admin, invoice);
        return mapToResponse(invoice);
    }

    @Transactional(readOnly = true)
    public Invoice getInvoiceById(Long id, AdminUser admin) {
        Invoice invoice = invoiceRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found"));
        authorizationService.checkInvoiceAccess(admin, invoice);
        return invoice;
    }

    @Transactional
    public InvoiceResponse createDraftInvoice(InvoiceRequest request, AdminUser admin) {
        Invoice invoice = new Invoice();
        invoice.setInvoiceType(request.getInvoiceType());
        invoice.setInvoiceDate(request.getInvoiceDate());
        invoice.setDueDate(request.getDueDate());
        invoice.setPaymentTerms(request.getPaymentTerms());
        invoice.setTermsAndConditions(request.getTermsAndConditions());
        invoice.setPlaceOfSupply(request.getPlaceOfSupply());
        invoice.setStatus(InvoiceStatus.DRAFT);
        invoice.setLocked(false);
        invoice.setCreatedBy(admin);

        Long targetTenantId = null;

        if (request.getQuotationId() != null) {
            Quotation quotation = quotationRepository.findById(request.getQuotationId())
                    .orElseThrow(() -> new IllegalArgumentException("Quotation not found"));
            if (!"ACCEPTED".equals(quotation.getStatus()) && !"CONVERTED".equals(quotation.getStatus())) {
                throw new IllegalStateException("Invoice can only be created from ACCEPTED or CONVERTED quotation");
            }
            if (admin != null && admin.getTenantId() != null && !admin.getTenantId().equals(1L) && !admin.getTenantId().equals(quotation.getTenantId())) {
                throw new org.springframework.security.access.AccessDeniedException("Cannot create invoice from quotation belonging to another workspace");
            }
            targetTenantId = quotation.getTenantId();
            invoice.setQuotation(quotation);
            invoice.setCurrency(quotation.getCurrency());
        }

        if (request.getPurchaseOrderId() != null) {
            PurchaseOrder po = purchaseOrderRepository.findById(request.getPurchaseOrderId())
                    .orElseThrow(() -> new IllegalArgumentException("Purchase Order not found"));
            if (po.getStatus() != PurchaseOrderStatus.VERIFIED && po.getStatus() != PurchaseOrderStatus.PARTIALLY_FULFILLED) {
                throw new IllegalStateException("Invoice can only be created from VERIFIED or PARTIALLY_FULFILLED Purchase Order");
            }
            if (admin != null && admin.getTenantId() != null && !admin.getTenantId().equals(1L) && !admin.getTenantId().equals(po.getTenantId())) {
                throw new org.springframework.security.access.AccessDeniedException("Cannot create invoice from purchase order belonging to another workspace");
            }
            if (targetTenantId == null) {
                targetTenantId = po.getTenantId();
            }
            invoice.setPurchaseOrder(po);
            invoice.setCurrency(po.getCurrency());
        }

        if (targetTenantId == null) {
            targetTenantId = (admin != null && admin.getTenantId() != null) ? admin.getTenantId() : com.acrovix.admin.tenant.TenantContext.getTenantId();
        }
        if (targetTenantId == null) {
            targetTenantId = 1L;
        }
        invoice.setTenantId(targetTenantId);

        if (invoice.getCurrency() == null) {
            invoice.setCurrency(request.getCurrency() != null ? request.getCurrency() : Currency.INR);
        }
        if (request.getCustomerId() != null) {
            Customer customer = customerRepository.findById(request.getCustomerId())
                    .orElseThrow(() -> new IllegalArgumentException("Customer not found"));
            invoice.setCustomer(customer);
            invoice.setClientName(customer.getName());
            invoice.setClientCompany(customer.getCompanyName());
            invoice.setClientEmail(customer.getEmail());
            invoice.setClientPhone(customer.getPhone());
            invoice.setClientAddress(customer.getBillingAddress());
            invoice.setClientShippingAddress(customer.getShippingAddress());
            invoice.setClientGstin(customer.getGstin());
            if (invoice.getPlaceOfSupply() == null || invoice.getPlaceOfSupply().isEmpty()) {
                invoice.setPlaceOfSupply(customer.getState());
            }
        }

        // Allow explicit request fields to set/override client snapshot fields
        if (request.getClientName() != null) invoice.setClientName(request.getClientName());
        if (request.getClientCompany() != null) invoice.setClientCompany(request.getClientCompany());
        if (request.getClientEmail() != null) invoice.setClientEmail(request.getClientEmail());
        if (request.getClientPhone() != null) invoice.setClientPhone(request.getClientPhone());
        if (request.getClientAddress() != null) invoice.setClientAddress(request.getClientAddress());
        if (request.getClientShippingAddress() != null) invoice.setClientShippingAddress(request.getClientShippingAddress());
        if (request.getClientGstin() != null) invoice.setClientGstin(request.getClientGstin());

        // Snapshot Supplier strictly scoped to target tenant
        final Long effectiveTenantId = targetTenantId;
        CompanySettings settings = companySettingsRepository.findFirstByTenantIdOrderByIdAsc(effectiveTenantId)
                .orElseGet(() -> companySettingsRepository.findAll().stream()
                        .filter(s -> effectiveTenantId != null && effectiveTenantId.equals(s.getTenantId()))
                        .findFirst()
                        .orElseGet(() -> companySettingsRepository.findFirstByTenantIdOrderByIdAsc(1L)
                                .orElseGet(() -> companySettingsRepository.findAll().stream().findFirst()
                                        .orElseGet(() -> CompanySettings.builder()
                                                .companyName("Acrovix Innovations")
                                                .legalName("Acrovix Innovations")
                                                .build()))));
        invoice.setSupplierCompany(settings.getLegalName() != null ? settings.getLegalName() : settings.getCompanyName());
        invoice.setSupplierAddress(settings.getRegisteredAddress());
        invoice.setSupplierGstin(settings.getGstin());
        invoice.setSupplierState(settings.getState());

        if (request.getQuotationId() != null) {
            Quotation quotation = quotationRepository.findById(request.getQuotationId())
                    .orElseThrow(() -> new IllegalArgumentException("Quotation not found"));
            if (!"ACCEPTED".equals(quotation.getStatus()) && !"CONVERTED".equals(quotation.getStatus())) {
                throw new IllegalStateException("Invoice can only be created from ACCEPTED or CONVERTED quotation");
            }
            invoice.setQuotation(quotation);
            
            // Fallback client details if customer is null or missing fields
            if (invoice.getClientName() == null) invoice.setClientName(quotation.getClientName());
            if (invoice.getClientCompany() == null) invoice.setClientCompany(quotation.getClientCompany());
            if (invoice.getClientEmail() == null) invoice.setClientEmail(quotation.getClientEmail());
            if (invoice.getClientPhone() == null) invoice.setClientPhone(quotation.getClientPhone());
        }

        if (request.getPurchaseOrderId() != null) {
            PurchaseOrder po = purchaseOrderRepository.findById(request.getPurchaseOrderId())
                    .orElseThrow(() -> new IllegalArgumentException("Purchase Order not found"));
            if (po.getStatus() != PurchaseOrderStatus.VERIFIED && po.getStatus() != PurchaseOrderStatus.PARTIALLY_FULFILLED) {
                throw new IllegalStateException("Invoice can only be created from VERIFIED or PARTIALLY_FULFILLED Purchase Order");
            }
            invoice.setPurchaseOrder(po);
            // Only adopt PO delivery address if goods/services were drop-shipped to a customer site.
            // Never copy ACROVIX office address into client shipping address on a sales invoice.
            if (request.getClientShippingAddress() == null && ("CUSTOMER_SITE".equalsIgnoreCase(po.getDeliveryDestinationType()) || "CUSTOM".equalsIgnoreCase(po.getDeliveryDestinationType())) && po.getDeliveryAddress() != null && !po.getDeliveryAddress().isBlank()) {
                invoice.setClientShippingAddress(po.getDeliveryAddress());
            }
        }

        calculateAndSetTotals(invoice, request.getItems());

        if (invoice.getPurchaseOrder() != null) {
            validatePartialInvoicing(invoice);
        }

        Invoice saved = invoiceRepository.save(invoice);
        logActivity(admin.getId(), "Created Draft Invoice", "Invoice", saved.getId());
        
        notificationService.createInvoiceCreatedNotification(admin, saved.getInvoiceNumber() != null ? saved.getInvoiceNumber() : "Draft", saved.getId());
        
        try {
            emailService.sendInvoiceNotificationAsync(saved, "CREATED");
        } catch (Exception e) {
            // Ignore email error
        }

        return getInvoiceResponseById(saved.getId(), admin);
    }

    @Transactional
    public InvoiceResponse updateDraftInvoice(Long id, InvoiceRequest request, AdminUser admin) {
        Invoice invoice = getInvoiceById(id, admin);
        if (invoice.isLocked() || invoice.getStatus() != InvoiceStatus.DRAFT) {
            throw new IllegalStateException("Cannot update an issued or locked invoice");
        }

        if (request.getInvoiceType() != null) {
            invoice.setInvoiceType(request.getInvoiceType());
        }
        if (request.getInvoiceDate() != null) {
            invoice.setInvoiceDate(request.getInvoiceDate());
        }
        invoice.setDueDate(request.getDueDate());
        invoice.setPaymentTerms(request.getPaymentTerms());
        invoice.setTermsAndConditions(request.getTermsAndConditions());
        invoice.setPlaceOfSupply(request.getPlaceOfSupply());

        if (request.getClientName() != null) invoice.setClientName(request.getClientName());
        if (request.getClientCompany() != null) invoice.setClientCompany(request.getClientCompany());
        if (request.getClientEmail() != null) invoice.setClientEmail(request.getClientEmail());
        if (request.getClientPhone() != null) invoice.setClientPhone(request.getClientPhone());
        if (request.getClientAddress() != null) invoice.setClientAddress(request.getClientAddress());
        if (request.getClientShippingAddress() != null) invoice.setClientShippingAddress(request.getClientShippingAddress());
        if (request.getClientGstin() != null) invoice.setClientGstin(request.getClientGstin());

        calculateAndSetTotals(invoice, request.getItems());

        if (invoice.getPurchaseOrder() != null) {
            validatePartialInvoicing(invoice);
        }

        Invoice saved = invoiceRepository.save(invoice);
        logActivity(admin.getId(), "Updated Draft Invoice details", "Invoice", saved.getId());
        return getInvoiceResponseById(saved.getId(), admin);
    }

    @Transactional
    public InvoiceResponse issueInvoice(Long id, AdminUser admin) {
        Invoice invoice = getInvoiceById(id, admin);
        if (invoice.isLocked() || invoice.getStatus() != InvoiceStatus.DRAFT) {
            throw new IllegalStateException("Invoice is already issued or not in DRAFT state");
        }

        if (invoice.getPurchaseOrder() != null) {
            validatePartialInvoicing(invoice);
        }

        String nextNumber = sequenceGeneratorService.generateNextInvoiceNumber(invoice.getInvoiceType(), invoice.getInvoiceDate(), invoice.getTenantId());
        invoice.setInvoiceNumber(nextNumber);
        invoice.setStatus(InvoiceStatus.ISSUED);
        invoice.setLocked(true);
        invoice.setIssuedAt(LocalDateTime.now());

        Invoice saved = invoiceRepository.save(invoice);

        logActivity(admin.getId(), "Issued Invoice: " + saved.getInvoiceNumber(), "Invoice", saved.getId());
        
        // Optionally update PO status if fully invoiced - deferred to Phase 5 or handle simply:
        if (saved.getPurchaseOrder() != null) {
            PurchaseOrder po = saved.getPurchaseOrder();
            if (po.getStatus() == PurchaseOrderStatus.VERIFIED) {
                po.setStatus(PurchaseOrderStatus.PARTIALLY_FULFILLED);
                purchaseOrderRepository.save(po);
            }
        }
        
        try {
            emailService.sendInvoiceNotificationAsync(saved, "ISSUED");
        } catch (Exception e) {
            // Ignore email error
        }

        return getInvoiceResponseById(saved.getId(), admin);
    }

    @Transactional
    public InvoiceResponse cancelInvoice(Long id, AdminUser admin) {
        Invoice invoice = invoiceRepository.findByIdForUpdate(id)
                .or(() -> invoiceRepository.findById(id))
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found"));
        authorizationService.checkInvoiceAccess(admin, invoice);

        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw new IllegalStateException("Invoice is already cancelled");
        }

        List<Payment> payments = paymentRepository.findByInvoiceIdOrderByCreatedAtDesc(id);
        List<Payment> activePayments = payments.stream()
                .filter(p -> p.getStatus() == PaymentStatus.RECORDED)
                .toList();

        if (!activePayments.isEmpty()) {
            BigDecimal activeTotal = activePayments.stream()
                    .map(Payment::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            throw new IllegalStateException("Cannot cancel invoice " + 
                    (invoice.getInvoiceNumber() != null ? invoice.getInvoiceNumber() : invoice.getId()) + 
                    " with " + activePayments.size() + " active recorded payment(s) totaling " + activeTotal + 
                    ". Active payments must be cancelled/refunded first.");
        }
        
        invoice.setStatus(InvoiceStatus.CANCELLED);
        invoice.setCancelledAt(LocalDateTime.now());
        // Do not unlock the invoice. It remains locked.
        
        Invoice saved = invoiceRepository.save(invoice);
        logActivity(admin.getId(), "Cancelled Invoice: " + (saved.getInvoiceNumber() != null ? saved.getInvoiceNumber() : "Draft"), "Invoice", saved.getId());
        return getInvoiceResponseById(saved.getId(), admin);
    }

    private void calculateAndSetTotals(Invoice invoice, List<InvoiceItemRequest> itemRequests) {
        boolean isIntraState = isIntraState(invoice.getSupplierGstin(), invoice.getSupplierState(), invoice.getClientGstin(), invoice.getPlaceOfSupply());

        if (itemRequests != null) {
            invoice.getItems().clear();

            BigDecimal grossSubtotal = BigDecimal.ZERO;
            BigDecimal totalDiscount = BigDecimal.ZERO;
            BigDecimal totalTaxable = BigDecimal.ZERO;
            BigDecimal totalCgst = BigDecimal.ZERO;
            BigDecimal totalSgst = BigDecimal.ZERO;
            BigDecimal totalIgst = BigDecimal.ZERO;
            BigDecimal totalTax = BigDecimal.ZERO;

            int sortOrder = 0;
            for (InvoiceItemRequest req : itemRequests) {
                InvoiceItem item = new InvoiceItem();
                item.setInvoice(invoice);
                item.setSku(req.getSku());
                item.setDescription(req.getDescription());
                item.setHsnSac(req.getHsnSac());
                item.setQuantity(req.getQuantity() != null ? req.getQuantity() : BigDecimal.ZERO);
                item.setUnit(req.getUnit());
                
                BigDecimal unitPrice = req.getUnitPrice() != null ? req.getUnitPrice() : BigDecimal.ZERO;
                BigDecimal listPrice = req.getListPrice() != null ? req.getListPrice() : unitPrice;
                BigDecimal discountPct = req.getDiscountPercent() != null ? req.getDiscountPercent() : BigDecimal.ZERO;
                BigDecimal taxPct = req.getTaxPercent() != null ? req.getTaxPercent() : BigDecimal.ZERO;

                item.setUnitPrice(unitPrice);
                item.setListPrice(listPrice);
                item.setDiscountPercent(discountPct);
                item.setTaxPercent(taxPct);
                item.setSortOrder(req.getSortOrder() != null ? req.getSortOrder() : sortOrder++);

                if (req.getProductServiceId() != null) {
                    productServiceRepository.findById(req.getProductServiceId()).ifPresent(item::setProductService);
                }

                // Financial Calculation
                BigDecimal grossLineAmount = item.getQuantity().multiply(listPrice).setScale(2, RoundingMode.HALF_UP);
                BigDecimal lineDiscount = grossLineAmount.multiply(discountPct).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
                BigDecimal taxable = grossLineAmount.subtract(lineDiscount);
                
                BigDecimal lineTax = taxable.multiply(taxPct).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
                
                item.setTaxableAmount(taxable);
                item.setTaxAmount(lineTax);

                if (taxPct.compareTo(BigDecimal.ZERO) > 0) {
                    if (isIntraState) {
                        BigDecimal halfTax = lineTax.divide(new BigDecimal("2"), 2, RoundingMode.HALF_UP);
                        BigDecimal otherHalfTax = lineTax.subtract(halfTax);
                        item.setCgstAmount(halfTax);
                        item.setSgstAmount(otherHalfTax);
                        item.setIgstAmount(BigDecimal.ZERO);
                    } else {
                        item.setCgstAmount(BigDecimal.ZERO);
                        item.setSgstAmount(BigDecimal.ZERO);
                        item.setIgstAmount(lineTax);
                    }
                }

                item.setLineTotal(taxable.add(lineTax));
                invoice.getItems().add(item);

                grossSubtotal = grossSubtotal.add(grossLineAmount);
                totalDiscount = totalDiscount.add(lineDiscount);
                totalTaxable = totalTaxable.add(taxable);
                totalCgst = totalCgst.add(item.getCgstAmount());
                totalSgst = totalSgst.add(item.getSgstAmount());
                totalIgst = totalIgst.add(item.getIgstAmount());
                totalTax = totalTax.add(item.getTaxAmount());
            }

            invoice.setSubtotal(grossSubtotal);
            invoice.setDiscountAmount(totalDiscount);
            invoice.setTaxableAmount(totalTaxable);
            invoice.setCgstAmount(totalCgst);
            invoice.setSgstAmount(totalSgst);
            invoice.setIgstAmount(totalIgst);
            invoice.setTaxAmount(totalTax);
            
            BigDecimal grandTotal = totalTaxable.add(totalTax);
            invoice.setGrandTotal(grandTotal);
            invoice.setBalanceDue(grandTotal);
            invoice.setAmountInWords(AmountToWordsConverter.convert(grandTotal));
        } else if (invoice.getItems() != null && !invoice.getItems().isEmpty()) {
            // Recalculate CGST/SGST vs IGST split for existing items if client GSTIN/State changed
            BigDecimal totalCgst = BigDecimal.ZERO;
            BigDecimal totalSgst = BigDecimal.ZERO;
            BigDecimal totalIgst = BigDecimal.ZERO;

            for (InvoiceItem item : invoice.getItems()) {
                BigDecimal lineTax = item.getTaxAmount() != null ? item.getTaxAmount() : BigDecimal.ZERO;
                if (lineTax.compareTo(BigDecimal.ZERO) > 0) {
                    if (isIntraState) {
                        BigDecimal halfTax = lineTax.divide(new BigDecimal("2"), 2, RoundingMode.HALF_UP);
                        BigDecimal otherHalfTax = lineTax.subtract(halfTax);
                        item.setCgstAmount(halfTax);
                        item.setSgstAmount(otherHalfTax);
                        item.setIgstAmount(BigDecimal.ZERO);
                    } else {
                        item.setCgstAmount(BigDecimal.ZERO);
                        item.setSgstAmount(BigDecimal.ZERO);
                        item.setIgstAmount(lineTax);
                    }
                } else {
                    item.setCgstAmount(BigDecimal.ZERO);
                    item.setSgstAmount(BigDecimal.ZERO);
                    item.setIgstAmount(BigDecimal.ZERO);
                }
                totalCgst = totalCgst.add(item.getCgstAmount());
                totalSgst = totalSgst.add(item.getSgstAmount());
                totalIgst = totalIgst.add(item.getIgstAmount());
            }

            invoice.setCgstAmount(totalCgst);
            invoice.setSgstAmount(totalSgst);
            invoice.setIgstAmount(totalIgst);
        }
    }

    private boolean isIntraState(String supplierGstin, String supplierState, String clientGstin, String placeOfSupply) {
        if (supplierGstin != null && supplierGstin.length() >= 2 && clientGstin != null && clientGstin.length() >= 2) {
            return supplierGstin.substring(0, 2).equals(clientGstin.substring(0, 2));
        }
        if (supplierState != null && placeOfSupply != null) {
            return supplierState.trim().equalsIgnoreCase(placeOfSupply.trim());
        }
        // Default to inter-state if unsure, or intra-state. Standard is intra if identical.
        return true;
    }

    @Transactional
    public InvoiceResponse convertProformaToTaxInvoice(Long proformaId, AdminUser admin) {
        Invoice proforma = invoiceRepository.findByIdForUpdate(proformaId)
                .or(() -> invoiceRepository.findById(proformaId))
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found"));
        authorizationService.checkInvoiceAccess(admin, proforma);

        if (proforma.getInvoiceType() != InvoiceType.PROFORMA) {
            throw new IllegalStateException("Can only convert a PROFORMA invoice");
        }

        if (proforma.getStatus() == InvoiceStatus.CANCELLED) {
            throw new IllegalStateException("Cannot convert a CANCELLED proforma invoice");
        }

        // Primary gate: the proforma's own marker is written last inside the same transaction
        // and is NEVER touched by payment-gateway code, making it the most reliable idempotency signal.
        // Secondary gate: existsByPaymentLinkId checks the tax invoice side as defence-in-depth.
        // Both checks remain because a partial rollback (proforma marker not yet written) could
        // result in only the tax-invoice marker existing; keeping both prevents re-conversion in that edge case.
        if ((proforma.getPaymentLinkId() != null && proforma.getPaymentLinkId().startsWith("CONVERTED_TO_TAX_INVOICE:"))
                || invoiceRepository.existsByPaymentLinkId("CONVERTED_FROM_PROFORMA:" + proforma.getId())) {
            throw new com.acrovix.admin.exception.ResourceConflictException("Proforma invoice " + 
                (proforma.getInvoiceNumber() != null ? proforma.getInvoiceNumber() : proforma.getId()) + 
                " has already been converted to Tax Invoice.");
        }
        
        Invoice taxInvoice = new Invoice();
        taxInvoice.setInvoiceType(InvoiceType.TAX_INVOICE);
        taxInvoice.setStatus(InvoiceStatus.DRAFT);
        taxInvoice.setLocked(false);
        taxInvoice.setInvoiceDate(LocalDate.now());
        taxInvoice.setDueDate(proforma.getDueDate());
        taxInvoice.setPaymentTerms(proforma.getPaymentTerms());
        taxInvoice.setTermsAndConditions(proforma.getTermsAndConditions());
        taxInvoice.setCreatedBy(admin);
        
        // Copy Client
        taxInvoice.setCustomer(proforma.getCustomer());
        taxInvoice.setClientName(proforma.getClientName());
        taxInvoice.setClientCompany(proforma.getClientCompany());
        taxInvoice.setClientEmail(proforma.getClientEmail());
        taxInvoice.setClientPhone(proforma.getClientPhone());
        taxInvoice.setClientAddress(proforma.getClientAddress());
        taxInvoice.setClientShippingAddress(proforma.getClientShippingAddress());
        taxInvoice.setClientGstin(proforma.getClientGstin());
        taxInvoice.setPlaceOfSupply(proforma.getPlaceOfSupply());
        
        // Copy Supplier
        taxInvoice.setSupplierCompany(proforma.getSupplierCompany());
        taxInvoice.setSupplierAddress(proforma.getSupplierAddress());
        taxInvoice.setSupplierGstin(proforma.getSupplierGstin());
        taxInvoice.setSupplierState(proforma.getSupplierState());
        
        // Copy Refs
        taxInvoice.setQuotation(proforma.getQuotation());
        taxInvoice.setPurchaseOrder(proforma.getPurchaseOrder());
        taxInvoice.setCurrency(proforma.getCurrency());
        
        // Copy Totals
        taxInvoice.setSubtotal(proforma.getSubtotal());
        taxInvoice.setDiscountAmount(proforma.getDiscountAmount());
        taxInvoice.setTaxableAmount(proforma.getTaxableAmount());
        taxInvoice.setCgstAmount(proforma.getCgstAmount());
        taxInvoice.setSgstAmount(proforma.getSgstAmount());
        taxInvoice.setIgstAmount(proforma.getIgstAmount());
        taxInvoice.setTaxAmount(proforma.getTaxAmount());
        taxInvoice.setGrandTotal(proforma.getGrandTotal());
        taxInvoice.setBalanceDue(proforma.getGrandTotal());
        taxInvoice.setAmountInWords(proforma.getAmountInWords());
        
        // Persist linkage
        taxInvoice.setPaymentLinkId("CONVERTED_FROM_PROFORMA:" + proforma.getId());

        // Copy Items
        if (proforma.getItems() != null) {
            for (InvoiceItem pItem : proforma.getItems()) {
                InvoiceItem tItem = new InvoiceItem();
                tItem.setInvoice(taxInvoice);
                tItem.setProductService(pItem.getProductService());
                tItem.setSku(pItem.getSku());
                tItem.setDescription(pItem.getDescription());
                tItem.setHsnSac(pItem.getHsnSac());
                tItem.setQuantity(pItem.getQuantity());
                tItem.setUnit(pItem.getUnit());
                tItem.setListPrice(pItem.getListPrice());
                tItem.setUnitPrice(pItem.getUnitPrice());
                tItem.setDiscountPercent(pItem.getDiscountPercent());
                tItem.setTaxPercent(pItem.getTaxPercent());
                tItem.setTaxableAmount(pItem.getTaxableAmount());
                tItem.setCgstAmount(pItem.getCgstAmount());
                tItem.setSgstAmount(pItem.getSgstAmount());
                tItem.setIgstAmount(pItem.getIgstAmount());
                tItem.setTaxAmount(pItem.getTaxAmount());
                tItem.setLineTotal(pItem.getLineTotal());
                tItem.setSortOrder(pItem.getSortOrder());
                taxInvoice.getItems().add(tItem);
            }
        }
        
        if (taxInvoice.getPurchaseOrder() != null) {
            validatePartialInvoicing(taxInvoice);
        }
        
        Invoice saved = invoiceRepository.save(taxInvoice);

        // Mark proforma as converted and lock it
        proforma.setPaymentLinkId("CONVERTED_TO_TAX_INVOICE:" + saved.getId());
        proforma.setLocked(true);
        invoiceRepository.save(proforma);

        logActivity(admin.getId(), "Converted Proforma " + proforma.getInvoiceNumber() + " to Tax Invoice Draft", "Invoice", saved.getId());
        
        notificationService.createInvoiceCreatedNotification(admin, saved.getInvoiceNumber() != null ? saved.getInvoiceNumber() : "Draft", saved.getId());
        
        return getInvoiceResponseById(saved.getId(), admin);
    }

    @Transactional
    public InvoiceResponse createInvoiceFromQuotation(Long quotationId, InvoiceType type, AdminUser admin) {
        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new IllegalArgumentException("Quotation not found"));
                
        if (admin != null && admin.getTenantId() != null && !admin.getTenantId().equals(1L) && !admin.getTenantId().equals(quotation.getTenantId())) {
            throw new org.springframework.security.access.AccessDeniedException("Cannot create invoice from quotation belonging to another workspace");
        }

        if (!"ACCEPTED".equals(quotation.getStatus()) && !"CONVERTED".equals(quotation.getStatus())) {
            throw new IllegalStateException("Invoice can only be created from ACCEPTED or CONVERTED quotation");
        }
        
        InvoiceRequest request = new InvoiceRequest();
        request.setInvoiceType(type);
        request.setInvoiceDate(LocalDate.now());
        request.setQuotationId(quotationId);
        if (quotation.getCustomer() != null) {
            request.setCustomerId(quotation.getCustomer().getId());
        }
        request.setTermsAndConditions(quotation.getTermsAndConditions());
        
        List<InvoiceItemRequest> itemRequests = new ArrayList<>();
        if (quotation.getItems() != null) {
            int i = 0;
            for (QuotationItem qItem : quotation.getItems()) {
                InvoiceItemRequest iReq = new InvoiceItemRequest();
                iReq.setProductServiceId(qItem.getProductService() != null ? qItem.getProductService().getId() : null);
                iReq.setSku(qItem.getSku());
                iReq.setDescription(qItem.getDescription());
                iReq.setHsnSac(qItem.getHsnSac());
                iReq.setQuantity(qItem.getQuantity());
                iReq.setUnit(qItem.getUnit());
                iReq.setListPrice(qItem.getListPrice());
                iReq.setUnitPrice(qItem.getUnitPrice());
                iReq.setDiscountPercent(qItem.getDiscountPercent());
                iReq.setTaxPercent(qItem.getTaxPercent());
                iReq.setSortOrder(qItem.getSortOrder() != null ? qItem.getSortOrder() : i++);
                itemRequests.add(iReq);
            }
        }
        request.setItems(itemRequests);
        
        return createDraftInvoice(request, admin);
    }
    
    @Transactional
    public InvoiceResponse createInvoiceFromPurchaseOrder(Long poId, InvoiceType type, AdminUser admin) {
        return createInvoiceFromPurchaseOrder(poId, type, null, admin);
    }

    @Transactional
    public InvoiceResponse createInvoiceFromPurchaseOrder(Long poId, InvoiceType type, InvoiceRequest customRequest, AdminUser admin) {
        PurchaseOrder po = purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new IllegalArgumentException("Purchase Order not found"));
                
        if (po.getStatus() != PurchaseOrderStatus.VERIFIED && po.getStatus() != PurchaseOrderStatus.PARTIALLY_FULFILLED) {
            throw new IllegalStateException("Invoice can only be created from VERIFIED or PARTIALLY_FULFILLED Purchase Order");
        }
        
        Quotation quotation = po.getQuotation();
        
        InvoiceRequest request = customRequest != null ? customRequest : new InvoiceRequest();
        if (request.getInvoiceType() == null) {
            request.setInvoiceType(type != null ? type : InvoiceType.TAX_INVOICE);
        }
        if (request.getInvoiceDate() == null) {
            request.setInvoiceDate(LocalDate.now());
        }
        request.setPurchaseOrderId(poId);
        if (quotation != null) {
            if (request.getQuotationId() == null) {
                request.setQuotationId(quotation.getId());
            }
            if (request.getCustomerId() == null && quotation.getCustomer() != null) {
                request.setCustomerId(quotation.getCustomer().getId());
            }
            if (request.getTermsAndConditions() == null) {
                request.setTermsAndConditions(quotation.getTermsAndConditions());
            }
            if (request.getPaymentTerms() == null && quotation.getCustomer() != null) {
                request.setPaymentTerms(quotation.getCustomer().getPaymentTerms());
            }
            if (request.getPlaceOfSupply() == null && quotation.getCustomer() != null) {
                request.setPlaceOfSupply(quotation.getCustomer().getState());
            }
        }
        
        if (request.getItems() == null || request.getItems().isEmpty()) {
            List<InvoiceItemRequest> itemRequests = new ArrayList<>();
            if (quotation != null && quotation.getItems() != null) {
                int i = 0;
                for (QuotationItem qItem : quotation.getItems()) {
                    InvoiceItemRequest iReq = new InvoiceItemRequest();
                    iReq.setProductServiceId(qItem.getProductService() != null ? qItem.getProductService().getId() : null);
                    iReq.setSku(qItem.getSku());
                    iReq.setDescription(qItem.getDescription());
                    iReq.setHsnSac(qItem.getHsnSac());
                    iReq.setQuantity(qItem.getQuantity());
                    iReq.setUnit(qItem.getUnit());
                    iReq.setListPrice(qItem.getListPrice());
                    iReq.setUnitPrice(qItem.getUnitPrice());
                    iReq.setDiscountPercent(qItem.getDiscountPercent());
                    iReq.setTaxPercent(qItem.getTaxPercent());
                    iReq.setSortOrder(qItem.getSortOrder() != null ? qItem.getSortOrder() : i++);
                    itemRequests.add(iReq);
                }
            }
            request.setItems(itemRequests);
        }
        
        return createDraftInvoice(request, admin);
    }

    private void validatePartialInvoicing(Invoice currentInvoice) {
        PurchaseOrder po = currentInvoice.getPurchaseOrder();
        if (po == null) return;
        
        BigDecimal currentTotal = currentInvoice.getGrandTotal() != null ? currentInvoice.getGrandTotal() : BigDecimal.ZERO;
        
        BigDecimal previousInvoiced;
        if (currentInvoice.getId() != null) {
            previousInvoiced = invoiceRepository.sumInvoicedAmountForPoExcluding(po.getId(), currentInvoice.getId());
        } else {
            previousInvoiced = invoiceRepository.sumInvoicedAmountForPo(po.getId());
        }
        
        BigDecimal totalAfterCurrent = previousInvoiced.add(currentTotal);
        
        if (totalAfterCurrent.compareTo(po.getPoValue()) > 0) {
            throw new IllegalStateException("Over-invoicing is not allowed. PO Value: " + po.getPoValue() + 
                                            ", Previously Invoiced: " + previousInvoiced + 
                                            ", Current Invoice: " + currentTotal);
        }
    }

    @Transactional(readOnly = true)
    public byte[] generateInvoicePdf(Long id, AdminUser admin) {
        Invoice invoice = getInvoiceById(id, admin);
        return pdfService.generateInvoicePdf(invoice);
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
            String performedBy = adminId != null ? "Admin #" + adminId : "System";
            auditLogService.log(entityType != null ? entityType.toUpperCase() : "INVOICE", entityId, action, performedBy, action);
        }
    }

    public InvoiceResponse mapToResponse(Invoice invoice) {
        if (invoice == null) return null;
        InvoiceResponse response = new InvoiceResponse();
        response.setId(invoice.getId());
        response.setInvoiceNumber(invoice.getInvoiceNumber());
        response.setCurrency(invoice.getCurrency());
        response.setInvoiceType(invoice.getInvoiceType());
        response.setStatus(invoice.getStatus());
        response.setLocked(invoice.isLocked());

        response.setCustomerId(invoice.getCustomer() != null ? invoice.getCustomer().getId() : null);
        response.setQuotationId(invoice.getQuotation() != null ? invoice.getQuotation().getId() : null);
        if (invoice.getPurchaseOrder() != null) {
            response.setPurchaseOrderId(invoice.getPurchaseOrder().getId());
            response.setPoNumber(invoice.getPurchaseOrder().getPoNumber());
            response.setPoDate(invoice.getPurchaseOrder().getPoDate());
            response.setClientPoNumber(invoice.getPurchaseOrder().getClientPoNumber());
        } else {
            response.setPurchaseOrderId(null);
        }

        response.setClientName(invoice.getClientName());
        response.setClientCompany(invoice.getClientCompany());
        response.setClientEmail(invoice.getClientEmail());
        response.setClientPhone(invoice.getClientPhone());
        response.setClientAddress(invoice.getClientAddress());
        response.setClientShippingAddress(invoice.getClientShippingAddress());
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

        response.setSubtotal(invoice.getSubtotal() != null ? invoice.getSubtotal() : BigDecimal.ZERO);
        response.setDiscountAmount(invoice.getDiscountAmount() != null ? invoice.getDiscountAmount() : BigDecimal.ZERO);
        response.setTaxableAmount(invoice.getTaxableAmount() != null ? invoice.getTaxableAmount() : BigDecimal.ZERO);
        response.setCgstAmount(invoice.getCgstAmount() != null ? invoice.getCgstAmount() : BigDecimal.ZERO);
        response.setSgstAmount(invoice.getSgstAmount() != null ? invoice.getSgstAmount() : BigDecimal.ZERO);
        response.setIgstAmount(invoice.getIgstAmount() != null ? invoice.getIgstAmount() : BigDecimal.ZERO);
        response.setTaxAmount(invoice.getTaxAmount() != null ? invoice.getTaxAmount() : BigDecimal.ZERO);
        
        BigDecimal grandTotal = invoice.getGrandTotal() != null ? invoice.getGrandTotal() : BigDecimal.ZERO;
        response.setGrandTotal(grandTotal);
        response.setAmountPaid(invoice.getAmountPaid() != null ? invoice.getAmountPaid() : BigDecimal.ZERO);
        response.setBalanceDue(invoice.getBalanceDue() != null ? invoice.getBalanceDue() : grandTotal);
        response.setAmountInWords(invoice.getAmountInWords());

        response.setPaymentLinkUrl(invoice.getPaymentLinkUrl());
        response.setPublicToken(invoice.getPublicToken());
        response.setReminderLevel(invoice.getReminderLevel());

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

    @Transactional
    public InvoiceResponse generatePaymentLink(Long id, AdminUser admin) {
        Invoice invoice = getInvoiceById(id, admin);
        if (invoice.getPublicToken() == null || invoice.getPublicToken().isBlank()) {
            invoice.setPublicToken(java.util.UUID.randomUUID().toString());
        }
        String paymentLink = "/pay/invoice/" + invoice.getPublicToken();
        invoice.setPaymentLinkUrl(paymentLink);
        invoice = invoiceRepository.save(invoice);
        logActivity(admin != null ? admin.getId() : null, "PAYMENT_LINK_GENERATED", "Generated self-hosted payment link for " + invoice.getInvoiceNumber(), invoice.getId());
        return mapToResponse(invoice);
    }
}
