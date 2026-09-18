package com.acrovix.admin.service;

import com.acrovix.admin.dto.Customer360Response;
import com.acrovix.admin.entity.*;
import com.acrovix.admin.exception.ResourceNotFoundException;
import com.acrovix.admin.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class Customer360ServiceTest {

    @Mock
    private CustomerRepository customerRepository;
    @Mock
    private AdminEnquiryRepository adminEnquiryRepository;
    @Mock
    private CrmLeadRepository crmLeadRepository;
    @Mock
    private CrmFollowUpRepository crmFollowUpRepository;
    @Mock
    private QuotationRepository quotationRepository;
    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private EmailLogRepository emailLogRepository;
    @Mock
    private AdminActivityRepository adminActivityRepository;

    @InjectMocks
    private Customer360Service customer360Service;

    private Customer customer;

    @BeforeEach
    void setUp() {
        customer = Customer.builder()
                .id(1L)
                .customerCode("C-001")
                .name("John Doe")
                .companyName("Doe Inc")
                .email("john@doe.com")
                .currency(Currency.INR)
                .active(true)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    void getCustomer360_Success_EmptyRelations() {
        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        when(crmLeadRepository.findByCustomerIdOrderByCreatedAtDesc(eq(1L), any(Pageable.class))).thenReturn(new PageImpl<>(new ArrayList<>()));
        when(adminEnquiryRepository.findByBusinessEmailOrderByCreatedAtDesc(eq("john@doe.com"), any(Pageable.class))).thenReturn(new PageImpl<>(new ArrayList<>()));
        when(quotationRepository.findByCustomerIdAndDeletedAtIsNullOrderByCreatedAtDesc(eq(1L), any(Pageable.class))).thenReturn(new PageImpl<>(new ArrayList<>()));
        when(invoiceRepository.findByCustomerIdOrderByCreatedAtDesc(eq(1L), any(Pageable.class))).thenReturn(new PageImpl<>(new ArrayList<>()));
        when(paymentRepository.findByCustomerIdOrderByCreatedAtDesc(eq(1L), any(Pageable.class))).thenReturn(new PageImpl<>(new ArrayList<>()));
        when(emailLogRepository.findCustomerEmails(eq("john@doe.com"), eq(1L), any(), any(), any(), any(), any(Pageable.class))).thenReturn(new PageImpl<>(new ArrayList<>()));
        when(adminActivityRepository.findCustomerActivities(eq(1L), any(), any(), any(), any(), any(Pageable.class))).thenReturn(new PageImpl<>(new ArrayList<>()));

        Customer360Response response = customer360Service.getCustomer360(1L);

        assertNotNull(response);
        assertEquals(1L, response.getCustomer().getId());
        assertEquals("john@doe.com", response.getCustomer().getEmail());
        assertTrue(response.getEnquiries().isEmpty());
        assertTrue(response.getLeads().isEmpty());
        assertTrue(response.getFollowUps().isEmpty());
        assertTrue(response.getQuotations().isEmpty());
        assertTrue(response.getInvoices().isEmpty());
        assertTrue(response.getPayments().isEmpty());
        assertTrue(response.getEmails().isEmpty());
        assertTrue(response.getActivities().isEmpty());
        
        // Currency grouping should still put the default currency (INR) even with no invoices
        assertNotNull(response.getSummaryByCurrency());
        assertTrue(response.getSummaryByCurrency().containsKey(Currency.INR));
        assertEquals(BigDecimal.ZERO.setScale(2), response.getSummaryByCurrency().get(Currency.INR).getTotalInvoiced());
    }

    @Test
    void getCustomer360_NotFound() {
        when(customerRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> customer360Service.getCustomer360(99L));
    }

    @Test
    void getCustomer360_WithMultiCurrencyInvoices() {
        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        
        Invoice inrInvoice = Invoice.builder()
                .id(101L)
                .invoiceType(InvoiceType.TAX_INVOICE)
                .status(InvoiceStatus.ISSUED)
                .currency(Currency.INR)
                .grandTotal(new BigDecimal("1000"))
                .amountPaid(new BigDecimal("200"))
                .balanceDue(new BigDecimal("800"))
                .build();
                
        Invoice usdInvoice = Invoice.builder()
                .id(102L)
                .invoiceType(InvoiceType.TAX_INVOICE)
                .status(InvoiceStatus.ISSUED)
                .currency(Currency.USD)
                .grandTotal(new BigDecimal("500"))
                .amountPaid(new BigDecimal("0"))
                .balanceDue(new BigDecimal("500"))
                .build();

        when(crmLeadRepository.findByCustomerIdOrderByCreatedAtDesc(eq(1L), any(Pageable.class))).thenReturn(new PageImpl<>(new ArrayList<>()));
        when(adminEnquiryRepository.findByBusinessEmailOrderByCreatedAtDesc(eq("john@doe.com"), any(Pageable.class))).thenReturn(new PageImpl<>(new ArrayList<>()));
        when(quotationRepository.findByCustomerIdAndDeletedAtIsNullOrderByCreatedAtDesc(eq(1L), any(Pageable.class))).thenReturn(new PageImpl<>(new ArrayList<>()));
        when(invoiceRepository.findByCustomerIdOrderByCreatedAtDesc(eq(1L), any(Pageable.class))).thenReturn(new PageImpl<>(List.of(inrInvoice, usdInvoice)));
        when(paymentRepository.findByCustomerIdOrderByCreatedAtDesc(eq(1L), any(Pageable.class))).thenReturn(new PageImpl<>(new ArrayList<>()));
        when(emailLogRepository.findCustomerEmails(eq("john@doe.com"), eq(1L), any(), any(), any(), any(), any(Pageable.class))).thenReturn(new PageImpl<>(new ArrayList<>()));
        when(adminActivityRepository.findCustomerActivities(eq(1L), any(), any(), any(), any(), any(Pageable.class))).thenReturn(new PageImpl<>(new ArrayList<>()));

        Customer360Response response = customer360Service.getCustomer360(1L);

        assertNotNull(response);
        assertEquals(2, response.getInvoices().size());
        
        assertNotNull(response.getSummaryByCurrency());
        assertEquals(2, response.getSummaryByCurrency().size());
        
        assertEquals(new BigDecimal("1000.00"), response.getSummaryByCurrency().get(Currency.INR).getTotalInvoiced());
        assertEquals(new BigDecimal("200.00"), response.getSummaryByCurrency().get(Currency.INR).getTotalReceived());
        assertEquals(new BigDecimal("800.00"), response.getSummaryByCurrency().get(Currency.INR).getOutstandingAmount());
        
        assertEquals(new BigDecimal("500.00"), response.getSummaryByCurrency().get(Currency.USD).getTotalInvoiced());
        assertEquals(new BigDecimal("0.00"), response.getSummaryByCurrency().get(Currency.USD).getTotalReceived());
        assertEquals(new BigDecimal("500.00"), response.getSummaryByCurrency().get(Currency.USD).getOutstandingAmount());
    }
}
