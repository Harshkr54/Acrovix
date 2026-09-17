package com.acrovix.admin.service;

import com.acrovix.admin.dto.*;
import com.acrovix.admin.entity.*;
import com.acrovix.admin.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
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

        if (paymentAmount.compareTo(currentBalanceDue) > 0) {
            throw new IllegalStateException("Payment amount (Rs. " + paymentAmount + 
                    ") exceeds remaining balance due (Rs. " + currentBalanceDue + ")");
        }

        String paymentNumber = sequenceGeneratorService.generateNextPaymentNumber(request.getPaymentDate());

        Payment payment = Payment.builder()
                .paymentNumber(paymentNumber)
                .invoice(invoice)
                .customer(invoice.getCustomer())
                .paymentDate(request.getPaymentDate())
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
    public Page<PaymentResponse> getPayments(PaymentStatus status, PaymentMethod method, Long customerId, Long invoiceId, String search, Pageable pageable) {
        Page<Payment> payments = paymentRepository.searchPayments(status, method, customerId, invoiceId, search, pageable);
        return payments.map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public PaymentResponse getPaymentById(Long id) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found with id: " + id));
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

            BigDecimal totalInvoiced = customerInvoices.stream()
                    .map(i -> i.getGrandTotal() != null ? i.getGrandTotal() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);

            BigDecimal totalReceived = customerInvoices.stream()
                    .map(i -> i.getAmountPaid() != null ? i.getAmountPaid() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);

            BigDecimal outstanding = customerInvoices.stream()
                    .map(i -> i.getBalanceDue() != null ? i.getBalanceDue() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);

            BigDecimal overdue = customerInvoices.stream()
                    .filter(i -> i.getDueDate() != null && i.getDueDate().isBefore(today) && i.getBalanceDue() != null && i.getBalanceDue().compareTo(BigDecimal.ZERO) > 0)
                    .map(Invoice::getBalanceDue)
                    .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);

            LocalDate oldestDueDate = customerInvoices.stream()
                    .filter(i -> i.getBalanceDue() != null && i.getBalanceDue().compareTo(BigDecimal.ZERO) > 0 && i.getDueDate() != null)
                    .map(Invoice::getDueDate)
                    .min(LocalDate::compareTo)
                    .orElse(null);

            list.add(ReceivableSummaryResponse.builder()
                    .customerId(c.getId())
                    .customerCode(c.getCustomerCode())
                    .customerName(c.getName())
                    .companyName(c.getCompanyName())
                    .totalInvoiced(totalInvoiced)
                    .totalReceived(totalReceived)
                    .outstandingAmount(outstanding)
                    .overdueAmount(overdue)
                    .oldestDueDate(oldestDueDate)
                    .build());
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
    public byte[] generatePaymentReceiptPdf(Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found with id: " + paymentId));
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
