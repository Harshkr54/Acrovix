package com.acrovix.admin.controller;

import com.acrovix.admin.entity.*;
import com.acrovix.admin.exception.ResourceNotFoundException;
import com.acrovix.admin.repository.*;
import com.acrovix.admin.service.PaymentService;
import com.acrovix.admin.service.SequenceGeneratorService;
import com.acrovix.admin.tenant.TenantContext;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/api/public/invoices")
@RequiredArgsConstructor
public class PublicInvoiceController {

    private final InvoiceRepository invoiceRepository;
    private final CompanySettingsRepository companySettingsRepository;
    private final CompanyBankAccountRepository companyBankAccountRepository;
    private final TenantRepository tenantRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentService paymentService;
    private final SequenceGeneratorService sequenceGeneratorService;
    private final AdminActivityRepository activityRepository;
    private final AdminUserRepository adminUserRepository;

    @org.springframework.beans.factory.annotation.Value("${razorpay.key-id:}")
    private String razorpayKeyId;

    @org.springframework.beans.factory.annotation.Value("${razorpay.key-secret:}")
    private String razorpayKeySecret;

    @GetMapping("/pay/{token}")
    public ResponseEntity<PublicInvoicePayResponse> getPublicInvoiceForPayment(@PathVariable String token) {
        if (token == null || token.isBlank()) {
            throw new ResourceNotFoundException("Invalid public payment token");
        }

        // Bypassing RLS allows cross-tenant token lookup securely
        Invoice invoice = TenantContext.callWithBypassRls(() ->
                invoiceRepository.findByPublicToken(token)
                        .orElseThrow(() -> new ResourceNotFoundException("Invoice not found or link has expired"))
        );

        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw new IllegalStateException("This invoice has been cancelled and cannot accept payments.");
        }

        Long tenantId = invoice.getTenantId();

        return TenantContext.callWithTenant(tenantId, () -> {
            Optional<CompanySettings> settingsOpt = companySettingsRepository.findByTenantId(tenantId)
                    .or(() -> companySettingsRepository.findFirstByTenantIdOrderByIdAsc(tenantId));

            Optional<CompanyBankAccount> bankOpt = companyBankAccountRepository.findFirstByTenantIdAndIsDefaultTrueAndIsActiveTrue(tenantId)
                    .or(() -> companyBankAccountRepository.findFirstByTenantIdAndIsActiveTrueOrderByIdAsc(tenantId));

            Optional<Tenant> tenantOpt = tenantRepository.findById(tenantId);

            String companyName = settingsOpt.map(CompanySettings::getCompanyName)
                    .filter(s -> !s.isBlank())
                    .orElseGet(() -> tenantOpt.map(Tenant::getCompanyName).orElse("Acrovix"));

            String companyLogo = settingsOpt.map(CompanySettings::getLogoUrl).orElse(null);

            PublicBankDetails bankDetails = PublicBankDetails.builder()
                    .bankName(bankOpt.map(CompanyBankAccount::getBankName).orElseGet(() -> settingsOpt.map(CompanySettings::getBankName).orElse(null)))
                    .accountHolder(bankOpt.map(CompanyBankAccount::getAccountHolder).orElseGet(() -> settingsOpt.map(CompanySettings::getLegalName).orElse(companyName)))
                    .accountNumber(bankOpt.map(CompanyBankAccount::getBankAccountNumber).orElseGet(() -> settingsOpt.map(CompanySettings::getBankAccountNumber).orElse(null)))
                    .ifsc(bankOpt.map(CompanyBankAccount::getBankIfsc).orElseGet(() -> settingsOpt.map(CompanySettings::getBankIfsc).orElse(null)))
                    .branch(bankOpt.map(CompanyBankAccount::getBankBranch).orElseGet(() -> settingsOpt.map(CompanySettings::getBankBranch).orElse(null)))
                    .upiId(bankOpt.map(CompanyBankAccount::getUpiId).filter(u -> !u.isBlank()).orElse(null))
                    .build();

            BigDecimal grandTotal = invoice.getGrandTotal() != null ? invoice.getGrandTotal() : BigDecimal.ZERO;
            BigDecimal amountPaid = invoice.getAmountPaid() != null ? invoice.getAmountPaid() : BigDecimal.ZERO;
            BigDecimal balanceDue = invoice.getBalanceDue() != null ? invoice.getBalanceDue() : grandTotal;

            String companyLegalName = settingsOpt.map(CompanySettings::getLegalName).filter(s -> !s.isBlank()).orElse(companyName);
            String companyGstin = settingsOpt.map(CompanySettings::getGstin).filter(s -> !s.isBlank()).orElse(null);
            String companyAddress = settingsOpt.map(CompanySettings::getRegisteredAddress).filter(s -> !s.isBlank())
                    .orElseGet(() -> settingsOpt.map(CompanySettings::getBillingAddress).filter(s -> !s.isBlank()).orElse(null));
            String companyEmail = settingsOpt.map(CompanySettings::getEmail).filter(s -> !s.isBlank()).orElse(null);
            String companyPhone = settingsOpt.map(CompanySettings::getPhone).filter(s -> !s.isBlank()).orElse(null);

            PublicInvoicePayResponse response = PublicInvoicePayResponse.builder()
                    .invoiceId(invoice.getId())
                    .invoiceNumber(invoice.getInvoiceNumber())
                    .publicToken(invoice.getPublicToken())
                    .customerName(invoice.getClientName())
                    .clientCompany(invoice.getClientCompany())
                    .clientEmail(invoice.getClientEmail())
                    .clientPhone(invoice.getClientPhone())
                    .clientAddress(invoice.getClientAddress())
                    .clientGstin(invoice.getClientGstin())
                    .clientShippingAddress(invoice.getClientShippingAddress())
                    .grandTotal(grandTotal)
                    .amountPaid(amountPaid)
                    .balanceDue(balanceDue)
                    .currency(invoice.getCurrency() != null ? invoice.getCurrency().name() : "INR")
                    .status(invoice.getStatus() != null ? invoice.getStatus().name() : "ISSUED")
                    .invoiceDate(invoice.getInvoiceDate())
                    .dueDate(invoice.getDueDate())
                    .companyName(companyName)
                    .companyLegalName(companyLegalName)
                    .companyGstin(companyGstin)
                    .companyAddress(companyAddress)
                    .companyEmail(companyEmail)
                    .companyPhone(companyPhone)
                    .companyLogo(companyLogo)
                    .bankDetails(bankDetails)
                    .razorpayKeyId((razorpayKeyId != null && !razorpayKeyId.isBlank()) ? razorpayKeyId : "rzp_test_acrovix")
                    .build();

            return ResponseEntity.ok(response);
        });
    }

    @PostMapping("/pay/{token}/create-order")
    public ResponseEntity<Map<String, Object>> createRazorpayOrder(
            @PathVariable String token,
            @RequestBody(required = false) Map<String, Object> req) {

        if (token == null || token.isBlank()) {
            throw new ResourceNotFoundException("Invalid public payment token");
        }

        Invoice invoice = TenantContext.callWithBypassRls(() ->
                invoiceRepository.findByPublicToken(token)
                        .orElseThrow(() -> new ResourceNotFoundException("Invoice not found or link has expired"))
        );

        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw new IllegalStateException("This invoice has been cancelled and cannot accept payments.");
        }
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new IllegalStateException("Invoice is already fully paid.");
        }

        Long tenantId = invoice.getTenantId();

        return TenantContext.callWithTenant(tenantId, () -> {
            BigDecimal currentBalance = invoice.getBalanceDue() != null ? invoice.getBalanceDue() : invoice.getGrandTotal();
            BigDecimal amount = currentBalance;
            if (req != null && req.get("amount") != null) {
                try {
                    BigDecimal customAmount = new BigDecimal(req.get("amount").toString());
                    if (customAmount.compareTo(BigDecimal.ZERO) > 0 && customAmount.compareTo(currentBalance) <= 0) {
                        amount = customAmount;
                    }
                } catch (Exception ignored) {}
            }

            long amountInPaise = amount.multiply(new BigDecimal("100")).setScale(0, RoundingMode.HALF_UP).longValue();
            String currency = invoice.getCurrency() != null ? invoice.getCurrency().name() : "INR";
            String orderId;
            boolean isDemo = false;

            if (razorpayKeyId != null && !razorpayKeyId.isBlank() && razorpayKeySecret != null && !razorpayKeySecret.isBlank()) {
                try {
                    com.razorpay.RazorpayClient razorpay = new com.razorpay.RazorpayClient(razorpayKeyId, razorpayKeySecret);
                    org.json.JSONObject orderRequest = new org.json.JSONObject();
                    orderRequest.put("amount", amountInPaise);
                    orderRequest.put("currency", currency);
                    orderRequest.put("receipt", invoice.getInvoiceNumber());
                    orderRequest.put("payment_capture", 1);
                    com.razorpay.Order order = razorpay.orders.create(orderRequest);
                    orderId = order.get("id");
                } catch (Exception e) {
                    log.warn("Razorpay order creation fallback to simulated order due to: {}", e.getMessage());
                    orderId = "order_rzp_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 14);
                    isDemo = true;
                }
            } else {
                orderId = "order_demo_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 14);
                isDemo = true;
            }

            Map<String, Object> resp = new HashMap<>();
            resp.put("orderId", orderId);
            resp.put("amount", amountInPaise);
            resp.put("amountRupees", amount);
            resp.put("currency", currency);
            resp.put("keyId", (razorpayKeyId != null && !razorpayKeyId.isBlank()) ? razorpayKeyId : "rzp_test_acrovix");
            resp.put("invoiceNumber", invoice.getInvoiceNumber());
            resp.put("clientName", invoice.getClientName());
            resp.put("clientEmail", invoice.getClientEmail());
            resp.put("clientPhone", invoice.getClientPhone());
            resp.put("isDemo", isDemo);

            return ResponseEntity.ok(resp);
        });
    }

    @PostMapping("/pay/{token}/verify-payment")
    public ResponseEntity<Map<String, Object>> verifyPayment(
            @PathVariable String token,
            @RequestBody PublicPaymentVerifyRequest request) {

        if (token == null || token.isBlank()) {
            throw new ResourceNotFoundException("Invalid public payment token");
        }
        if (request.getRazorpayPaymentId() == null || request.getRazorpayPaymentId().isBlank()) {
            throw new IllegalArgumentException("Payment reference ID is required.");
        }

        Invoice invoice = TenantContext.callWithBypassRls(() ->
                invoiceRepository.findByPublicToken(token)
                        .orElseThrow(() -> new ResourceNotFoundException("Invoice not found or link has expired"))
        );

        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw new IllegalStateException("Cannot record payment for a cancelled invoice.");
        }
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new IllegalStateException("Invoice is already fully paid.");
        }

        Long tenantId = invoice.getTenantId();

        return TenantContext.callWithTenant(tenantId, () -> {
            if (razorpayKeySecret != null && !razorpayKeySecret.isBlank() 
                    && request.getRazorpaySignature() != null && !request.getRazorpaySignature().isBlank()
                    && request.getRazorpayOrderId() != null && !request.getRazorpayOrderId().startsWith("order_demo_")) {
                try {
                    org.json.JSONObject options = new org.json.JSONObject();
                    options.put("razorpay_order_id", request.getRazorpayOrderId());
                    options.put("razorpay_payment_id", request.getRazorpayPaymentId());
                    options.put("razorpay_signature", request.getRazorpaySignature());
                    boolean signatureValid = com.razorpay.Utils.verifyPaymentSignature(options, razorpayKeySecret);
                    if (!signatureValid) {
                        throw new IllegalArgumentException("Razorpay payment signature verification failed.");
                    }
                } catch (IllegalArgumentException ex) {
                    throw ex;
                } catch (Exception e) {
                    log.warn("Signature verification warning: {}", e.getMessage());
                }
            }

            BigDecimal currentBalance = invoice.getBalanceDue() != null ? invoice.getBalanceDue() : invoice.getGrandTotal();
            BigDecimal amountToPay = (request.getAmount() != null && request.getAmount().compareTo(BigDecimal.ZERO) > 0)
                    ? request.getAmount().setScale(2, RoundingMode.HALF_UP)
                    : currentBalance;

            if (amountToPay.compareTo(currentBalance) > 0) {
                amountToPay = currentBalance;
            }

            String paymentNumber = sequenceGeneratorService.generateNextPaymentNumber(LocalDate.now());
            String paymentRef = request.getRazorpayPaymentId().trim();

            StringBuilder notes = new StringBuilder();
            notes.append("Online Gateway Payment via Razorpay");
            if (request.getRazorpayOrderId() != null) {
                notes.append(" | Order: ").append(request.getRazorpayOrderId());
            }
            if (request.getPayerName() != null && !request.getPayerName().isBlank()) {
                notes.append(" | Payer: ").append(request.getPayerName().trim());
            }

            AdminUser tenantAdmin = adminUserRepository.findFirstByTenantIdOrderByIdAsc(tenantId).orElse(null);

            Payment payment = Payment.builder()
                    .paymentNumber(paymentNumber)
                    .invoice(invoice)
                    .customer(invoice.getCustomer())
                    .paymentDate(LocalDate.now())
                    .currency(invoice.getCurrency())
                    .amount(amountToPay)
                    .paymentMethod(PaymentMethod.UPI)
                    .transactionReference(paymentRef)
                    .bankName("Razorpay Online Checkout")
                    .notes(notes.toString())
                    .status(PaymentStatus.RECORDED)
                    .recordedBy(tenantAdmin)
                    .build();
            payment.setTenantId(tenantId);

            Payment savedPayment = paymentRepository.save(payment);
            paymentService.recalculateInvoiceTotalsAndStatus(invoice);

            AdminActivity activity = AdminActivity.builder()
                    .action("CLIENT_ONLINE_PAYMENT_RECONCILED")
                    .entityType("PAYMENT")
                    .entityId(savedPayment.getId())
                    .description("Client completed online payment of " + amountToPay + " " + invoice.getCurrency() + " for " + invoice.getInvoiceNumber() + " (Ref: " + paymentRef + ")")
                    .createdAt(LocalDateTime.now())
                    .build();
            activity.setTenantId(tenantId);
            activityRepository.save(activity);

            Map<String, Object> resp = new HashMap<>();
            resp.put("success", true);
            resp.put("message", "Payment reconciled successfully. Reference: " + paymentRef);
            resp.put("paymentNumber", savedPayment.getPaymentNumber());
            resp.put("paymentId", savedPayment.getId());
            resp.put("transactionReference", paymentRef);
            resp.put("amountPaid", amountToPay);
            resp.put("balanceDue", invoice.getBalanceDue());
            resp.put("status", invoice.getStatus() != null ? invoice.getStatus().name() : "PAID");

            return ResponseEntity.ok(resp);
        });
    }

    @PostMapping("/pay/{token}/submit-proof")
    public ResponseEntity<Map<String, Object>> submitPaymentProof(
            @PathVariable String token,
            @RequestBody PublicPaymentProofRequest request) {

        if (token == null || token.isBlank()) {
            throw new ResourceNotFoundException("Invalid public payment token");
        }
        if (request.getUtrNumber() == null || request.getUtrNumber().isBlank()) {
            throw new IllegalArgumentException("Transaction reference / UTR number is required.");
        }
        if (request.getPayerName() == null || request.getPayerName().isBlank()) {
            throw new IllegalArgumentException("Payer name is required.");
        }

        Invoice invoice = TenantContext.callWithBypassRls(() ->
                invoiceRepository.findByPublicToken(token)
                        .orElseThrow(() -> new ResourceNotFoundException("Invoice not found or link has expired"))
        );

        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw new IllegalStateException("Cannot record payment for a cancelled invoice.");
        }
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new IllegalStateException("Invoice is already fully paid.");
        }

        Long tenantId = invoice.getTenantId();

        return TenantContext.callWithTenant(tenantId, () -> {
            BigDecimal currentBalance = invoice.getBalanceDue() != null ? invoice.getBalanceDue() : invoice.getGrandTotal();
            BigDecimal amountToPay = (request.getAmount() != null && request.getAmount().compareTo(BigDecimal.ZERO) > 0)
                    ? request.getAmount().setScale(2, RoundingMode.HALF_UP)
                    : currentBalance;

            if (amountToPay.compareTo(currentBalance) > 0) {
                throw new IllegalArgumentException("Payment amount (" + amountToPay + ") cannot exceed balance due (" + currentBalance + ").");
            }

            String paymentNumber = sequenceGeneratorService.generateNextPaymentNumber(LocalDate.now());
            String utr = request.getUtrNumber().trim();

            StringBuilder notes = new StringBuilder();
            notes.append("Client proof submitted by: ").append(request.getPayerName().trim());
            if (request.getScreenshotUrl() != null && !request.getScreenshotUrl().isBlank()) {
                notes.append(" | Screenshot: ").append(request.getScreenshotUrl().trim());
            }
            if (request.getNotes() != null && !request.getNotes().isBlank()) {
                notes.append(" | Notes: ").append(request.getNotes().trim());
            }

            AdminUser tenantAdmin = adminUserRepository.findFirstByTenantIdOrderByIdAsc(tenantId).orElse(null);

            Payment payment = Payment.builder()
                    .paymentNumber(paymentNumber)
                    .invoice(invoice)
                    .customer(invoice.getCustomer())
                    .paymentDate(LocalDate.now())
                    .currency(invoice.getCurrency())
                    .amount(amountToPay)
                    .paymentMethod(PaymentMethod.BANK_TRANSFER)
                    .transactionReference(utr)
                    .bankName("Online Transfer / UPI")
                    .notes(notes.toString())
                    .status(PaymentStatus.RECORDED)
                    .recordedBy(tenantAdmin)
                    .build();
            payment.setTenantId(tenantId);

            Payment savedPayment = paymentRepository.save(payment);
            paymentService.recalculateInvoiceTotalsAndStatus(invoice);

            AdminActivity activity = AdminActivity.builder()
                    .action("CLIENT_PAYMENT_PROOF_SUBMITTED")
                    .entityType("PAYMENT")
                    .entityId(savedPayment.getId())
                    .description("Client " + request.getPayerName() + " submitted payment proof for " + invoice.getInvoiceNumber() + " with UTR " + utr)
                    .createdAt(LocalDateTime.now())
                    .build();
            activity.setTenantId(tenantId);
            activityRepository.save(activity);

            Map<String, Object> resp = new HashMap<>();
            resp.put("success", true);
            resp.put("message", "Payment proof submitted successfully. Reference: " + savedPayment.getPaymentNumber());
            resp.put("paymentNumber", savedPayment.getPaymentNumber());
            resp.put("balanceDue", invoice.getBalanceDue());
            resp.put("status", invoice.getStatus() != null ? invoice.getStatus().name() : "RECORDED");

            return ResponseEntity.ok(resp);
        });
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PublicInvoicePayResponse {
        private Long invoiceId;
        private String invoiceNumber;
        private String publicToken;
        private String customerName;
        private String clientCompany;
        private String clientEmail;
        private String clientPhone;
        private String clientAddress;
        private String clientGstin;
        private String clientShippingAddress;
        private BigDecimal grandTotal;
        private BigDecimal amountPaid;
        private BigDecimal balanceDue;
        private String currency;
        private String status;
        private LocalDate invoiceDate;
        private LocalDate dueDate;
        private String companyName;
        private String companyLegalName;
        private String companyGstin;
        private String companyAddress;
        private String companyEmail;
        private String companyPhone;
        private String companyLogo;
        private PublicBankDetails bankDetails;
        private String razorpayKeyId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PublicBankDetails {
        private String bankName;
        private String accountHolder;
        private String accountNumber;
        private String ifsc;
        private String branch;
        private String upiId;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PublicPaymentProofRequest {
        @NotBlank(message = "UTR number is required")
        private String utrNumber;

        @NotBlank(message = "Payer name is required")
        private String payerName;

        private BigDecimal amount;
        private String screenshotUrl;
        private String notes;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PublicPaymentVerifyRequest {
        private String razorpayOrderId;
        @NotBlank(message = "Payment reference is required")
        private String razorpayPaymentId;
        private String razorpaySignature;
        private BigDecimal amount;
        private String payerName;
    }
}
