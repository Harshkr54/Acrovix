package com.acrovix.admin.qa;

import com.acrovix.admin.entity.*;
import com.acrovix.admin.repository.*;
import com.acrovix.admin.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestPropertySource(properties = {"app.demo-mode=true"})
@Transactional
public class Phase3SecurityIntegrationTest {

    @Autowired private CustomerRepository customerRepository;
    @Autowired private AdminUserRepository adminUserRepository;
    @Autowired private AdminEnquiryRepository enquiryRepository;
    @Autowired private QuotationRepository quotationRepository;
    @Autowired private PurchaseOrderRepository poRepository;
    @Autowired private InvoiceRepository invoiceRepository;
    @Autowired private PaymentRepository paymentRepository;
    
    @Autowired private PurchaseOrderService poService;
    @Autowired private InvoiceService invoiceService;
    @Autowired private PaymentService paymentService;
    @Autowired private Customer360Service customer360Service;
    @Autowired private AuthorizationService authService;

    private AdminUser superAdmin;
    private AdminUser salesA;
    private AdminUser salesB;
    
    private Customer customer;
    private AdminEnquiry enquiryA;
    private Quotation quotationA;
    private PurchaseOrder poA;
    private Invoice invoiceA;
    private Payment paymentA;

    @BeforeEach
    void setup() {
        superAdmin = AdminUser.builder()
                .email("super_phase3@test.com")
                .password("dummy")
                .role(Role.SUPER_ADMIN)
                .name("Super Admin")
                .build();
        adminUserRepository.save(superAdmin);

        salesA = AdminUser.builder()
                .email("salesA_phase3@test.com")
                .password("dummy")
                .role(Role.SALES)
                .name("Sales A")
                .build();
        adminUserRepository.save(salesA);

        salesB = AdminUser.builder()
                .email("salesB_phase3@test.com")
                .password("dummy")
                .role(Role.SALES)
                .name("Sales B")
                .build();
        adminUserRepository.save(salesB);

        customer = Customer.builder()
                .customerCode("C-PHASE3")
                .name("Customer Phase3")
                .email("cust_phase3@test.com")
                .createdBy(salesA.getId())
                .build();
        customerRepository.save(customer);

        enquiryA = AdminEnquiry.builder()
                .fullName("Enquiry Phase3")
                .businessEmail("enq_phase3@test.com")
                .companyName("Phase3 Corp")
                .phoneNumber("1234567890")
                .projectRequirement("Security Audit")
                .assignedTo(salesA)
                .build();
        enquiryRepository.save(enquiryA);

        quotationA = Quotation.builder()
                .quotationNumber("Q-PHASE3-001")
                .clientName("Customer Phase3")
                .clientEmail("cust_phase3@test.com")
                .createdBy(salesA)
                .enquiry(enquiryA)
                .customer(customer)
                .status("ACCEPTED")
                .build();
        quotationRepository.save(quotationA);

        poA = PurchaseOrder.builder()
                .poNumber("PO-PHASE3-001")
                .poDate(LocalDate.now())
                .poValue(new BigDecimal("1000"))
                .createdBy(salesA)
                .quotation(quotationA)
                .status(PurchaseOrderStatus.VERIFIED)
                .build();
        poRepository.save(poA);

        invoiceA = Invoice.builder()
                .invoiceNumber("INV-PHASE3-001")
                .invoiceDate(LocalDate.now())
                .clientEmail("cust_phase3@test.com")
                .createdBy(salesA)
                .purchaseOrder(poA)
                .quotation(quotationA)
                .customer(customer)
                .invoiceType(InvoiceType.TAX_INVOICE)
                .status(InvoiceStatus.ISSUED)
                .grandTotal(new BigDecimal("1000"))
                .balanceDue(new BigDecimal("1000"))
                .build();
        invoiceRepository.save(invoiceA);

        paymentA = Payment.builder()
                .paymentNumber("PAY-PHASE3-001")
                .paymentDate(LocalDate.now())
                .paymentMethod(PaymentMethod.BANK_TRANSFER)
                .recordedBy(salesA)
                .invoice(invoiceA)
                .customer(customer)
                .amount(new BigDecimal("100"))
                .status(PaymentStatus.RECORDED)
                .build();
        paymentRepository.save(paymentA);
    }

    @Test
    void testSuperAdminAccess() {
        assertDoesNotThrow(() -> poService.getPurchaseOrder(poA.getId(), superAdmin));
        assertDoesNotThrow(() -> invoiceService.getInvoiceById(invoiceA.getId(), superAdmin));
        assertDoesNotThrow(() -> paymentService.getPaymentById(paymentA.getId(), superAdmin));
        assertDoesNotThrow(() -> customer360Service.getCustomer360(customer.getId(), superAdmin));
    }

    @Test
    void testSalesOwnerAccess() {
        assertDoesNotThrow(() -> poService.getPurchaseOrder(poA.getId(), salesA));
        assertDoesNotThrow(() -> invoiceService.getInvoiceById(invoiceA.getId(), salesA));
        assertDoesNotThrow(() -> paymentService.getPaymentById(paymentA.getId(), salesA));
        assertDoesNotThrow(() -> customer360Service.getCustomer360(customer.getId(), salesA));
    }

    @Test
    void testSalesNonOwnerAccessDenied() {
        assertThrows(AccessDeniedException.class, () -> poService.getPurchaseOrder(poA.getId(), salesB));
        assertThrows(AccessDeniedException.class, () -> invoiceService.getInvoiceById(invoiceA.getId(), salesB));
        assertThrows(AccessDeniedException.class, () -> paymentService.getPaymentById(paymentA.getId(), salesB));
        assertThrows(AccessDeniedException.class, () -> customer360Service.getCustomer360(customer.getId(), salesB));
    }
}
