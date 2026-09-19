package com.acrovix.admin.service;

import com.acrovix.admin.dto.*;
import com.acrovix.admin.entity.*;
import com.acrovix.admin.exception.ResourceNotFoundException;
import com.acrovix.admin.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
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
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;
    private final CustomerRepository customerRepository;
    private final SequenceGeneratorService sequenceGeneratorService;
    private final AdminActivityRepository activityRepository;
    private final PdfService pdfService;
    private final EmailService emailService;
    private final AuthorizationService authorizationService;

    @Transactional(readOnly = true)
    public void sendPaymentReceiptEmail(Long id, String overrideEmail, AdminUser admin) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));

        String targetEmail = overrideEmail != null ? overrideEmail.trim() : null;
        if (targetEmail == null || targetEmail.isEmpty()) {
            if (payment.getCustomer() != null && payment.getCustomer().getEmail() != null) {
                targetEmail = payment.getCustomer().getEmail().trim();
            } else if (payment.getInvoice() != null && payment.getInvoice().getClientEmail() != null) {
                targetEmail = payment.getInvoice().getClientEmail().trim();
            }
        }

        if (targetEmail == null || targetEmail.isEmpty()) {
            throw new IllegalArgumentException("Recipient email is required to send payment receipt");
        }

        if (!targetEmail.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new IllegalArgumentException("Invalid recipient email format");
        }

        emailService.sendPaymentReceiptEmail(payment, targetEmail);
    }

    @Transactional
    public Payment recordPayment(PaymentRequest request, AdminUser admin) {
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Payment amount must be greater than zero");
        }

        // Row-level locking to prevent concurrent overpayments
        Invoice invoice = invoiceRepository.findByIdForUpdate(request.getInvoiceId())
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found with id: " + request.getInvoiceId()));

        if (invoice.getInvoiceType() != InvoiceType.TAX_INVOICE) {
            throw new IllegalStateException("Payments can only be recorded against Tax Invoices (Proforma invoices are preliminary)");
        }

        if (invoice.getStatus() == InvoiceStatus.DRAFT) {
            throw new IllegalStateException("Payment cannot be recorded against a DRAFT invoice. Issue the invoice first.");
        }

        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw new IllegalStateException("Payment cannot be recorded against a CANCELLED invoice.");
        }

        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new IllegalStateException("Invoice is already fully PAID.");
        }

        BigDecimal activePaidAmount = paymentRepository.sumActivePaymentsForInvoice(invoice.getId());
        BigDecimal grandTotal = invoice.getGrandTotal() != null ? invoice.getGrandTotal() : BigDecimal.ZERO;
        BigDecimal currentBalanceDue = grandTotal.subtract(activePaidAmount);

        BigDecimal paymentAmount = request.getAmount().setScale(2, RoundingMode.HALF_UP);

        if (request.getCurrency() != null && request.getCurrency() != invoice.getCurrency()) {
            throw new IllegalArgumentException("Payment currency (" + request.getCurrency() + ") does not match invoice currency (" + invoice.getCurrency() + "). Cross-currency payments are not allowed.");
        }

        if (paymentAmount.compareTo(currentBalanceDue) > 0) {
            throw new IllegalStateException("Payment amount (" + paymentAmount + 
                    ") exceeds remaining balance due (" + currentBalanceDue + ")");
        }

        String paymentNumber = sequenceGeneratorService.generateNextPaymentNumber(request.getPaymentDate());

        Payment payment = Payment.builder()
                .paymentNumber(paymentNumber)
                .invoice(invoice)
                .customer(invoice.getCustomer())
                .paymentDate(request.getPaymentDate())
                .currency(invoice.getCurrency())
                .amount(paymentAmount)
                .paymentMethod(request.getPaymentMethod())
                .transactionReference(request.getTransactionReference())
                .chequeNumber(request.getChequeNumber())
                .bankName(request.getBankName())
                .notes(request.getNotes())
                .status(PaymentStatus.RECORDED)
                .recordedBy(admin)
                .build();

        Payment savedPayment = paymentRepository.save(payment);

        // Recalculate Invoice totals and status
        recalculateInvoiceTotalsAndStatus(invoice);

        logActivity(admin.getId(), "PAYMENT_RECORDED", "Recorded payment " + savedPayment.getPaymentNumber() + 
                " of Rs. " + savedPayment.getAmount() + " against " + invoice.getInvoiceNumber(), savedPayment.getId());

        try {
            emailService.sendPaymentNotificationAsync(savedPayment, "RECORDED");
        } catch (Exception e) {
            // Ignore email error
        }

        return savedPayment;
    }

    @Transactional
    public Payment cancelPayment(Long id, PaymentCancelRequest request, AdminUser admin) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found with id: " + id));

        if (payment.getStatus() == PaymentStatus.CANCELLED) {
            throw new IllegalStateException("Payment is already cancelled");
        }

        if (request.getReason() == null || request.getReason().isBlank()) {
            throw new IllegalArgumentException("Cancellation reason is required");
        }

        // Lock parent invoice
        Invoice invoice = invoiceRepository.findByIdForUpdate(payment.getInvoice().getId())
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found"));

        payment.setStatus(PaymentStatus.CANCELLED);
        payment.setCancelledAt(LocalDateTime.now());
        payment.setCancellationReason(request.getReason());
        Payment savedPayment = paymentRepository.save(payment);

        // Recalculate Invoice totals and status after cancellation
        recalculateInvoiceTotalsAndStatus(invoice);

        logActivity(admin.getId(), "PAYMENT_CANCELLED", "Cancelled payment " + savedPayment.getPaymentNumber() + 
                ": " + request.getReason(), savedPayment.getId());

        return savedPayment;
    }

    private void recalculateInvoiceTotalsAndStatus(Invoice invoice) {
        BigDecimal totalPaid = paymentRepository.sumActivePaymentsForInvoice(invoice.getId()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal grandTotal = invoice.getGrandTotal() != null ? invoice.getGrandTotal() : BigDecimal.ZERO;
        BigDecimal balanceDue = grandTotal.subtract(totalPaid).setScale(2, RoundingMode.HALF_UP);

        if (balanceDue.compareTo(BigDecimal.ZERO) < 0) {
            balanceDue = BigDecimal.ZERO;
        }

        invoice.setAmountPaid(totalPaid);
        invoice.setBalanceDue(balanceDue);

        if (invoice.getStatus() != InvoiceStatus.CANCELLED) {
            if (balanceDue.compareTo(BigDecimal.ZERO) == 0 && grandTotal.compareTo(BigDecimal.ZERO) > 0) {
                invoice.setStatus(InvoiceStatus.PAID);
            } else if (totalPaid.compareTo(BigDecimal.ZERO) > 0) {
                invoice.setStatus(InvoiceStatus.PARTIALLY_PAID);
            } else {
                invoice.setStatus(InvoiceStatus.ISSUED);
            }
        }

        invoiceRepository.save(invoice);
    }

    @Transactional(readOnly = true)
    public Page<PaymentResponse> getPayments(PaymentStatus status, PaymentMethod method, Long customerId, Long invoiceId, String search, Pageable pageable, AdminUser currentUser) {
        Specification<Payment> spec = Specification.where(null);

        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (method != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("paymentMethod"), method));
        }
        if (customerId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("customer").get("id"), customerId));
        }
        if (invoiceId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("invoice").get("id"), invoiceId));
        }

        if (search != null && !search.trim().isEmpty()) {
            String s = "%" + search.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> {
                var invoiceJoin = root.join("invoice", jakarta.persistence.criteria.JoinType.LEFT);
                var customerJoin = root.join("customer", jakarta.persistence.criteria.JoinType.LEFT);
                return cb.or(
                        cb.like(cb.lower(root.get("paymentNumber")), s),
                        cb.like(cb.lower(invoiceJoin.get("invoiceNumber")), s),
                        cb.like(cb.lower(root.get("transactionReference")), s),
                        cb.like(cb.lower(customerJoin.get("name")), s),
                        cb.like(cb.lower(customerJoin.get("companyName")), s)
                );
            });
        }

        if (currentUser.getRole() == Role.SALES) {
            spec = spec.and((root, query, cb) -> {
                var invoiceJoin = root.join("invoice", jakarta.persistence.criteria.JoinType.LEFT);
                
                var poJoin = invoiceJoin.join("purchaseOrder", jakarta.persistence.criteria.JoinType.LEFT);
                var poQuotationJoin = poJoin.join("quotation", jakarta.persistence.criteria.JoinType.LEFT);
                var poEnquiryJoin = poQuotationJoin.join("enquiry", jakarta.persistence.criteria.JoinType.LEFT);

                var quotationJoin = invoiceJoin.join("quotation", jakarta.persistence.criteria.JoinType.LEFT);
                var enquiryJoin = quotationJoin.join("enquiry", jakarta.persistence.criteria.JoinType.LEFT);
                
                return cb.or(
                        cb.equal(root.get("recordedBy").get("id"), currentUser.getId()),
                        cb.equal(invoiceJoin.get("createdBy").get("id"), currentUser.getId()),
                        
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

        Page<Payment> payments = paymentRepository.findAll(spec, pageable);
        return payments.map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public List<EligibleInvoiceResponse> getEligibleInvoicesForPayment(String search) {
        String cleanSearch = (search != null && !search.trim().isEmpty()) ? search.trim().toLowerCase() : null;

        return invoiceRepository.findAll().stream()
                .filter(i -> i.getInvoiceType() == InvoiceType.TAX_INVOICE &&
                        (i.getStatus() == InvoiceStatus.ISSUED || i.getStatus() == InvoiceStatus.PARTIALLY_PAID))
                .filter(i -> {
                    if (cleanSearch == null) return true;
                    boolean matchNum = i.getInvoiceNumber() != null && i.getInvoiceNumber().toLowerCase().contains(cleanSearch);
                    boolean matchName = i.getClientName() != null && i.getClientName().toLowerCase().contains(cleanSearch);
                    boolean matchCompany = i.getClientCompany() != null && i.getClientCompany().toLowerCase().contains(cleanSearch);
                    return matchNum || matchName || matchCompany;
                })
                .map(i -> EligibleInvoiceResponse.builder()
                        .id(i.getId())
                        .invoiceNumber(i.getInvoiceNumber())
                        .currency(i.getCurrency())
                        .invoiceType(i.getInvoiceType())
                        .status(i.getStatus())
                        .customerId(i.getCustomer() != null ? i.getCustomer().getId() : null)
                        .clientName(i.getClientName())
                        .clientCompany(i.getClientCompany())
                        .grandTotal(i.getGrandTotal() != null ? i.getGrandTotal() : BigDecimal.ZERO)
                        .amountPaid(i.getAmountPaid() != null ? i.getAmountPaid() : BigDecimal.ZERO)
                        .balanceDue(i.getBalanceDue() != null ? i.getBalanceDue() : i.getGrandTotal())
                        .invoiceDate(i.getInvoiceDate())
                        .dueDate(i.getDueDate())
                        .build())
                .collect(Collectors.toList());
    }


    @Transactional(readOnly = true)
    public PaymentResponse getPaymentById(Long id, AdminUser admin) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found with id: " + id));
        authorizationService.checkPaymentAccess(admin, payment);
        return mapToResponse(payment);
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> getPaymentsByInvoiceId(Long invoiceId) {
        return paymentRepository.findByInvoiceIdOrderByCreatedAtDesc(invoiceId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<ReceivableSummaryResponse> getReceivablesSummary(String search, Pageable pageable) {
        Page<Customer> customers = customerRepository.searchCustomers(search, true, pageable);
        LocalDate today = LocalDate.now();

        List<Invoice> allTaxInvoices = invoiceRepository.findAll().stream()
                .filter(i -> i.getInvoiceType() == InvoiceType.TAX_INVOICE && i.getStatus() != InvoiceStatus.DRAFT && i.getStatus() != InvoiceStatus.CANCELLED)
                .collect(Collectors.toList());

        List<ReceivableSummaryResponse> list = new ArrayList<>();
        for (Customer c : customers.getContent()) {
            List<Invoice> customerInvoices = allTaxInvoices.stream()
                    .filter(i -> i.getCustomer() != null && i.getCustomer().getId().equals(c.getId()))
                    .collect(Collectors.toList());

            if (customerInvoices.isEmpty()) {
                list.add(ReceivableSummaryResponse.builder()
                        .customerId(c.getId())
                        .customerCode(c.getCustomerCode())
                        .customerName(c.getName())
                        .companyName(c.getCompanyName())
                        .currency(c.getCurrency() != null ? c.getCurrency() : Currency.INR)
                        .totalInvoiced(BigDecimal.ZERO.setScale(2))
                        .totalReceived(BigDecimal.ZERO.setScale(2))
                        .outstandingAmount(BigDecimal.ZERO.setScale(2))
                        .overdueAmount(BigDecimal.ZERO.setScale(2))
                        .oldestDueDate(null)
                        .build());
            } else {
                Map<Currency, List<Invoice>> byCurrency = customerInvoices.stream()
                        .collect(Collectors.groupingBy(i -> i.getCurrency() != null ? i.getCurrency() : Currency.INR));

                for (Map.Entry<Currency, List<Invoice>> entry : byCurrency.entrySet()) {
                    Currency curr = entry.getKey();
                    List<Invoice> invs = entry.getValue();

                    BigDecimal totalInvoiced = invs.stream()
                            .map(i -> i.getGrandTotal() != null ? i.getGrandTotal() : BigDecimal.ZERO)
                            .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);

                    BigDecimal totalReceived = invs.stream()
                            .map(i -> i.getAmountPaid() != null ? i.getAmountPaid() : BigDecimal.ZERO)
                            .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);

                    BigDecimal outstanding = invs.stream()
                            .map(i -> i.getBalanceDue() != null ? i.getBalanceDue() : BigDecimal.ZERO)
                            .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);

                    BigDecimal overdue = invs.stream()
                            .filter(i -> i.getDueDate() != null && i.getDueDate().isBefore(today) && i.getBalanceDue() != null && i.getBalanceDue().compareTo(BigDecimal.ZERO) > 0)
                            .map(Invoice::getBalanceDue)
                            .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);

                    LocalDate oldestDueDate = invs.stream()
                            .filter(i -> i.getBalanceDue() != null && i.getBalanceDue().compareTo(BigDecimal.ZERO) > 0 && i.getDueDate() != null)
                            .map(Invoice::getDueDate)
                            .min(LocalDate::compareTo)
                            .orElse(null);

                    list.add(ReceivableSummaryResponse.builder()
                            .customerId(c.getId())
                            .customerCode(c.getCustomerCode())
                            .customerName(c.getName())
                            .companyName(c.getCompanyName())
                            .currency(curr)
                            .totalInvoiced(totalInvoiced)
                            .totalReceived(totalReceived)
                            .outstandingAmount(outstanding)
                            .overdueAmount(overdue)
                            .oldestDueDate(oldestDueDate)
                            .build());
                }
            }
        }

        return new PageImpl<>(list, pageable, customers.getTotalElements());
    }

    @Transactional(readOnly = true)
    public DashboardReceivablesResponse getDashboardReceivablesStats() {
        LocalDate today = LocalDate.now();

        List<Invoice> taxInvoices = invoiceRepository.findAll().stream()
                .filter(i -> i.getInvoiceType() == InvoiceType.TAX_INVOICE && i.getStatus() != InvoiceStatus.DRAFT && i.getStatus() != InvoiceStatus.CANCELLED)
                .collect(Collectors.toList());

        BigDecimal totalInvoiced = taxInvoices.stream()
                .map(i -> i.getGrandTotal() != null ? i.getGrandTotal() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);

        BigDecimal totalReceived = taxInvoices.stream()
                .map(i -> i.getAmountPaid() != null ? i.getAmountPaid() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);

        BigDecimal outstanding = taxInvoices.stream()
                .map(i -> i.getBalanceDue() != null ? i.getBalanceDue() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);

        BigDecimal overdue = taxInvoices.stream()
                .filter(i -> i.getDueDate() != null && i.getDueDate().isBefore(today) && i.getBalanceDue() != null && i.getBalanceDue().compareTo(BigDecimal.ZERO) > 0)
                .map(Invoice::getBalanceDue)
                .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);

        return DashboardReceivablesResponse.builder()
                .totalInvoiced(totalInvoiced)
                .totalReceived(totalReceived)
                .outstandingAmount(outstanding)
                .overdueAmount(overdue)
                .build();
    }

    @Transactional(readOnly = true)
    public byte[] generatePaymentReceiptPdf(Long paymentId, AdminUser admin) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found with id: " + paymentId));
        authorizationService.checkPaymentAccess(admin, payment);
        return pdfService.generatePaymentReceiptPdf(payment);
    }

    private PaymentResponse mapToResponse(Payment payment) {
        PaymentResponse response = new PaymentResponse();
        response.setId(payment.getId());
        response.setPaymentNumber(payment.getPaymentNumber());

        if (payment.getInvoice() != null) {
            response.setInvoiceId(payment.getInvoice().getId());
            response.setInvoiceNumber(payment.getInvoice().getInvoiceNumber());
            response.setClientName(payment.getInvoice().getClientName());
            response.setClientCompany(payment.getInvoice().getClientCompany());
        }

        if (payment.getCustomer() != null) {
            response.setCustomerId(payment.getCustomer().getId());
            response.setCustomerCode(payment.getCustomer().getCustomerCode());
            response.setCustomerName(payment.getCustomer().getName());
        }

        response.setPaymentDate(payment.getPaymentDate());
        response.setAmount(payment.getAmount());
        response.setPaymentMethod(payment.getPaymentMethod());
        response.setTransactionReference(payment.getTransactionReference());
        response.setChequeNumber(payment.getChequeNumber());
        response.setBankName(payment.getBankName());
        response.setNotes(payment.getNotes());
        response.setStatus(payment.getStatus());

        if (payment.getRecordedBy() != null) {
            response.setRecordedById(payment.getRecordedBy().getId());
            response.setRecordedByUsername(payment.getRecordedBy().getUsername());
            response.setRecordedByFullName(payment.getRecordedBy().getName());
        }

        response.setCreatedAt(payment.getCreatedAt());
        response.setUpdatedAt(payment.getUpdatedAt());
        response.setCancelledAt(payment.getCancelledAt());
        response.setCancellationReason(payment.getCancellationReason());

        return response;
    }

    private void logActivity(Long adminId, String action, String description, Long entityId) {
        AdminActivity activity = AdminActivity.builder()
                .adminUserId(adminId)
                .action(action)
                .entityType("PAYMENT")
                .entityId(entityId)
                .description(description)
                .build();
        activityRepository.save(activity);
    }
}
