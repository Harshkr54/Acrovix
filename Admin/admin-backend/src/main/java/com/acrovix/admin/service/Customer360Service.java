package com.acrovix.admin.service;

import com.acrovix.admin.dto.*;
import com.acrovix.admin.dto.crm.CrmLeadResponse;
import com.acrovix.admin.dto.crm.CrmFollowUpResponse;
import com.acrovix.admin.entity.*;
import com.acrovix.admin.exception.ResourceNotFoundException;
import com.acrovix.admin.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class Customer360Service {

    private final CustomerRepository customerRepository;
    private final AdminEnquiryRepository adminEnquiryRepository;
    private final CrmLeadRepository crmLeadRepository;
    private final CrmFollowUpRepository crmFollowUpRepository;
    private final QuotationRepository quotationRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final EmailLogRepository emailLogRepository;
    private final AdminActivityRepository adminActivityRepository;

    @Transactional(readOnly = true)
    public Customer360Response getCustomer360(Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + customerId));

        Pageable limit50 = PageRequest.of(0, 50);

        // 1. Leads
        List<CrmLead> leads = crmLeadRepository.findByCustomerIdOrderByCreatedAtDesc(customerId, limit50).getContent();
        List<Long> leadIds = leads.stream().map(CrmLead::getId).collect(Collectors.toList());

        // 2. Enquiries (from Leads + Email match)
        List<AdminEnquiry> enquiriesFromLeads = leads.stream()
                .map(CrmLead::getEnquiry)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        List<AdminEnquiry> enquiriesFromEmail = new ArrayList<>();
        if (customer.getEmail() != null && !customer.getEmail().trim().isEmpty()) {
            enquiriesFromEmail = adminEnquiryRepository.findByBusinessEmailOrderByCreatedAtDesc(customer.getEmail().trim(), limit50).getContent();
        }

        List<AdminEnquiry> mergedEnquiries = Stream.concat(enquiriesFromLeads.stream(), enquiriesFromEmail.stream())
                .filter(distinctByKey(AdminEnquiry::getId))
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .limit(50)
                .collect(Collectors.toList());

        // 3. Follow-ups
        List<CrmFollowUp> followUps = new ArrayList<>();
        if (!leadIds.isEmpty()) {
            followUps = crmFollowUpRepository.findByLeadIdInOrderByScheduledAtDesc(leadIds, limit50).getContent();
        }

        // 4. Quotations
        List<Quotation> quotations = quotationRepository.findByCustomerIdAndDeletedAtIsNullOrderByCreatedAtDesc(customerId, limit50).getContent();
        List<Long> quoteIds = quotations.stream().map(Quotation::getId).collect(Collectors.toList());

        // 5. Invoices
        List<Invoice> invoices = invoiceRepository.findByCustomerIdOrderByCreatedAtDesc(customerId, limit50).getContent();
        List<Long> invoiceIds = invoices.stream().map(Invoice::getId).collect(Collectors.toList());

        // 6. Payments
        List<Payment> payments = paymentRepository.findByCustomerIdOrderByCreatedAtDesc(customerId, limit50).getContent();
        List<Long> paymentIds = payments.stream().map(Payment::getId).collect(Collectors.toList());

        // 7. Receivables Summary
        Map<Currency, ReceivableSummaryResponse> summaryByCurrency = calculateReceivablesSummary(customer, invoices);

        // 8. Emails
        List<EmailLog> fullEmails = emailLogRepository.findCustomerEmails(
                customer.getEmail(),
                customerId,
                leadIds.isEmpty() ? List.of(-1L) : leadIds,
                quoteIds.isEmpty() ? List.of(-1L) : quoteIds,
                invoiceIds.isEmpty() ? List.of(-1L) : invoiceIds,
                paymentIds.isEmpty() ? List.of(-1L) : paymentIds,
                limit50
        ).getContent();

        // 9. Activities
        List<AdminActivity> activities = adminActivityRepository.findCustomerActivities(
                customerId, 
                leadIds.isEmpty() ? List.of(-1L) : leadIds, 
                quoteIds.isEmpty() ? List.of(-1L) : quoteIds, 
                invoiceIds.isEmpty() ? List.of(-1L) : invoiceIds, 
                paymentIds.isEmpty() ? List.of(-1L) : paymentIds, 
                limit50
        ).getContent();

        return Customer360Response.builder()
                .customer(mapCustomer(customer))
                .summaryByCurrency(summaryByCurrency)
                .enquiries(mergedEnquiries.stream().map(this::mapEnquiry).collect(Collectors.toList()))
                .leads(leads.stream().map(this::mapLead).collect(Collectors.toList()))
                .followUps(followUps.stream().map(this::mapFollowUp).collect(Collectors.toList()))
                .quotations(quotations.stream().map(this::mapQuotation).collect(Collectors.toList()))
                .invoices(invoices.stream().map(this::mapInvoice).collect(Collectors.toList()))
                .payments(payments.stream().map(this::mapPayment).collect(Collectors.toList()))
                .emails(fullEmails.stream().map(this::mapEmail).collect(Collectors.toList()))
                .activities(activities.stream().map(this::mapActivity).collect(Collectors.toList()))
                .build();
    }
    
    private Map<Currency, ReceivableSummaryResponse> calculateReceivablesSummary(Customer c, List<Invoice> allInvoices) {
        Map<Currency, ReceivableSummaryResponse> summaryMap = new HashMap<>();
        LocalDate today = LocalDate.now();

        List<Invoice> taxInvoices = allInvoices.stream()
                .filter(i -> i.getInvoiceType() == InvoiceType.TAX_INVOICE && i.getStatus() != InvoiceStatus.DRAFT && i.getStatus() != InvoiceStatus.CANCELLED)
                .collect(Collectors.toList());

        Map<Currency, List<Invoice>> byCurrency = taxInvoices.stream()
                .collect(Collectors.groupingBy(i -> i.getCurrency() != null ? i.getCurrency() : Currency.INR));

        // Ensure default currency exists even if no invoices
        Currency defaultCurrency = c.getCurrency() != null ? c.getCurrency() : Currency.INR;
        byCurrency.putIfAbsent(defaultCurrency, new ArrayList<>());

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

            summaryMap.put(curr, ReceivableSummaryResponse.builder()
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

        return summaryMap;
    }

    private static <T> java.util.function.Predicate<T> distinctByKey(java.util.function.Function<? super T, ?> keyExtractor) {
        java.util.Set<Object> seen = java.util.concurrent.ConcurrentHashMap.newKeySet();
        return t -> seen.add(keyExtractor.apply(t));
    }

    // Mapping Methods
    private CustomerResponse mapCustomer(Customer customer) {
        return CustomerResponse.builder()
                .id(customer.getId())
                .customerCode(customer.getCustomerCode())
                .name(customer.getName())
                .companyName(customer.getCompanyName())
                .currency(customer.getCurrency())
                .email(customer.getEmail())
                .phone(customer.getPhone())
                .active(customer.isActive())
                .createdAt(customer.getCreatedAt())
                .build();
    }

    private AdminEnquiryDTO mapEnquiry(AdminEnquiry e) {
        AdminEnquiryDTO dto = new AdminEnquiryDTO();
        dto.setId(e.getId());
        dto.setReferenceId(e.getReferenceId());
        dto.setFullName(e.getFullName());
        dto.setBusinessEmail(e.getBusinessEmail());
        dto.setStatus(e.getStatus());
        dto.setCreatedAt(e.getCreatedAt());
        return dto;
    }

    private CrmLeadResponse mapLead(CrmLead l) {
        CrmLeadResponse r = new CrmLeadResponse();
        r.setId(l.getId());
        r.setLeadNumber(l.getLeadNumber());
        r.setFullName(l.getFullName());
        r.setStatus(l.getStatus());
        r.setPriority(l.getPriority());
        r.setEstimatedValue(l.getEstimatedValue());
        r.setCreatedAt(l.getCreatedAt());
        return r;
    }

    private CrmFollowUpResponse mapFollowUp(CrmFollowUp f) {
        CrmFollowUpResponse r = new CrmFollowUpResponse();
        r.setId(f.getId());
        r.setSubject(f.getSubject());
        r.setStatus(f.getStatus());
        r.setType(f.getType());
        r.setScheduledAt(f.getScheduledAt());
        return r;
    }

    private Customer360Response.QuotationDto mapQuotation(Quotation q) {
        return Customer360Response.QuotationDto.builder()
                .id(q.getId())
                .quotationNumber(q.getQuotationNumber())
                .clientName(q.getClientName())
                .clientCompany(q.getClientCompany())
                .currency(q.getCurrency())
                .grandTotal(q.getGrandTotal())
                .status(q.getStatus())
                .version(q.getVersion())
                .validUntil(q.getValidUntil())
                .createdAt(q.getCreatedAt())
                .build();
    }

    private InvoiceResponse mapInvoice(Invoice i) {
        InvoiceResponse r = new InvoiceResponse();
        r.setId(i.getId());
        r.setInvoiceNumber(i.getInvoiceNumber());
        r.setInvoiceType(i.getInvoiceType());
        r.setStatus(i.getStatus());
        r.setCurrency(i.getCurrency());
        r.setGrandTotal(i.getGrandTotal());
        r.setAmountPaid(i.getAmountPaid());
        r.setBalanceDue(i.getBalanceDue());
        r.setDueDate(i.getDueDate());
        r.setInvoiceDate(i.getInvoiceDate());
        r.setCreatedAt(i.getCreatedAt());
        return r;
    }

    private PaymentResponse mapPayment(Payment p) {
        PaymentResponse r = new PaymentResponse();
        r.setId(p.getId());
        r.setPaymentNumber(p.getPaymentNumber());
        if (p.getInvoice() != null) {
            r.setInvoiceNumber(p.getInvoice().getInvoiceNumber());
        }
        r.setAmount(p.getAmount());
        r.setPaymentMethod(p.getPaymentMethod());
        r.setStatus(p.getStatus());
        r.setPaymentDate(p.getPaymentDate());
        r.setCreatedAt(p.getCreatedAt());
        return r;
    }

    private Customer360Response.EmailLogDto mapEmail(EmailLog e) {
        return Customer360Response.EmailLogDto.builder()
                .id(e.getId())
                .recipient(e.getRecipient())
                .subject(e.getSubject())
                .emailType(e.getEmailType() != null ? e.getEmailType().name() : null)
                .status(e.getStatus() != null ? e.getStatus().name() : null)
                .sentAt(e.getSentAt())
                .errorMessage(e.getErrorMessage())
                .relatedEntityType(e.getRelatedEntityType())
                .relatedEntityId(e.getRelatedEntityId())
                .build();
    }

    private AdminActivityResponse mapActivity(AdminActivity a) {
        AdminActivityResponse r = new AdminActivityResponse();
        r.setId(a.getId());
        r.setAction(a.getAction());
        r.setEntityType(a.getEntityType());
        r.setEntityId(a.getEntityId());
        r.setDescription(a.getDescription());
        r.setCreatedAt(a.getCreatedAt());
        return r;
    }
}
