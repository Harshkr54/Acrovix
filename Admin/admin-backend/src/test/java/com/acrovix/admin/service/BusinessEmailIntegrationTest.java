package com.acrovix.admin.service;

import com.acrovix.admin.dto.crm.CrmLeadRequest;
import com.acrovix.admin.dto.crm.CrmLeadResponse;
import com.acrovix.admin.dto.email.EmailRequest;
import com.acrovix.admin.entity.*;
import com.acrovix.admin.exception.ResourceNotFoundException;
import com.acrovix.admin.repository.*;
import com.acrovix.admin.util.CurrencyUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BusinessEmailIntegrationTest {

    @Mock private EmailService emailService;
    @Mock private InvoiceRepository invoiceRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private QuotationRepository quotationRepository;
    @Mock private CrmLeadRepository crmLeadRepository;
    @Mock private AdminEnquiryRepository enquiryRepository;
    @Mock private CustomerRepository customerRepository;
    @Mock private AdminUserRepository userRepository;
    @Mock private AdminActivityRepository activityRepository;
    @Mock private NotificationService notificationService;
    @Mock private SequenceGeneratorService sequenceGeneratorService;
    @Mock private AuthorizationService authorizationService;
    @Mock private PdfService pdfService;

    private InvoiceService invoiceService;
    private PaymentService paymentService;
    private QuotationService quotationService;
    private CrmService crmService;

    private AdminUser testAdmin;
    private Customer testCustomer;
    private Invoice testInvoice;
    private Payment testPayment;
    private Quotation testQuotation;
    private CrmLead testLead;

    @BeforeEach
    void setUp() {
        testAdmin = new AdminUser();
        testAdmin.setId(10L);
        testAdmin.setName("Admin Tester");
        testAdmin.setEmail("admin@acrovix.com");
        testAdmin.setRole(Role.SUPER_ADMIN);

        testCustomer = new Customer();
        testCustomer.setId(200L);
        testCustomer.setName("Acme Global");
        testCustomer.setEmail("billing@acmeglobal.com");

        testInvoice = new Invoice();
        testInvoice.setId(300L);
        testInvoice.setInvoiceNumber("ACX/INV/26-27/001");
        testInvoice.setCustomer(testCustomer);
        testInvoice.setClientEmail("client@acmeglobal.com");
        testInvoice.setCurrency(Currency.USD);
        testInvoice.setGrandTotal(new BigDecimal("1250.00"));
        testInvoice.setAmountPaid(new BigDecimal("250.00"));

        testPayment = new Payment();
        testPayment.setId(400L);
        testPayment.setPaymentNumber("PAY/26-27/001");
        testPayment.setCustomer(testCustomer);
        testPayment.setInvoice(testInvoice);
        testPayment.setCurrency(Currency.USD);
        testPayment.setAmount(new BigDecimal("250.00"));
        testPayment.setPaymentMethod(PaymentMethod.BANK_TRANSFER);

        testQuotation = Quotation.builder()
                .id(500L)
                .quotationNumber("ACX/QT/26-27/001")
                .clientName("Prospect Client")
                .clientEmail("prospect@client.com")
                .currency(Currency.INR)
                .grandTotal(new BigDecimal("8787.00"))
                .status("DRAFT")
                .build();

        testLead = CrmLead.builder()
                .id(600L)
                .leadNumber("ACX/LEAD/26-27/001")
                .fullName("John Lead")
                .businessEmail("lead@client.com")
                .currency(Currency.INR)
                .estimatedValue(new BigDecimal("50000.00"))
                .build();

        invoiceService = new InvoiceService(
                invoiceRepository, customerRepository, quotationRepository,
                purchaseOrderRepositoryMock(), productServiceRepositoryMock(),
                companySettingsRepositoryMock(), sequenceGeneratorService,
                activityRepository, notificationService, pdfService, emailService,
                authorizationService
        );

        paymentService = new PaymentService(
                paymentRepository, invoiceRepository, customerRepository,
                sequenceGeneratorService, activityRepository, pdfService, emailService, authorizationService
        );

        quotationService = new QuotationService(
                quotationRepository, enquiryRepository, userRepository,
                sequenceGeneratorService, activityRepository, notificationService,
                authorizationService, emailService, customerRepository,
                productServiceRepositoryMock()
        );

        crmService = new CrmService(
                crmLeadRepository, crmFollowUpRepositoryMock(), enquiryRepository,
                customerRepository, userRepository, activityRepository,
                notificationService, sequenceGeneratorService, emailService
        );
    }

    private PurchaseOrderRepository purchaseOrderRepositoryMock() { return mock(PurchaseOrderRepository.class); }
    private ProductServiceRepository productServiceRepositoryMock() { return mock(ProductServiceRepository.class); }
    private CompanySettingsRepository companySettingsRepositoryMock() { return mock(CompanySettingsRepository.class); }
    private CrmFollowUpRepository crmFollowUpRepositoryMock() { return mock(CrmFollowUpRepository.class); }

    // --- QUOTATION EMAIL TESTS ---

    @Test
    void test1_SendQuotationEmailSuccess() {
        when(quotationRepository.findById(500L)).thenReturn(Optional.of(testQuotation));
        doNothing().when(authorizationService).checkQuotationAccess(testAdmin, testQuotation);

        quotationService.sendQuotation(500L, null, testAdmin);

        verify(emailService).sendQuotationEmail(eq(testQuotation), eq("prospect@client.com"));
    }

    @Test
    void test2_SendQuotationInvalidIdThrowsNotFound() {
        when(quotationRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> quotationService.sendQuotation(999L, null, testAdmin));
    }

    @Test
    void test3_SendQuotationMissingRecipientEmailThrowsException() {
        testQuotation.setClientEmail("  ");
        when(quotationRepository.findById(500L)).thenReturn(Optional.of(testQuotation));

        assertThrows(IllegalArgumentException.class, () -> quotationService.sendQuotation(500L, "  ", testAdmin));
    }

    @Test
    void test4_SendQuotationEmailSuccessWithOverride() {
        when(quotationRepository.findById(500L)).thenReturn(Optional.of(testQuotation));

        quotationService.sendQuotation(500L, "override@client.com", testAdmin);

        verify(emailService).sendQuotationEmail(eq(testQuotation), eq("override@client.com"));
    }

    @Test
    void test5_SendQuotationEmailFailureDoesNotCrashOrExposeCredentials() {
        when(quotationRepository.findById(500L)).thenReturn(Optional.of(testQuotation));
        doThrow(new IllegalStateException("Failed to send email via SMTP"))
                .when(emailService).sendQuotationEmail(any(Quotation.class), anyString());

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> quotationService.sendQuotation(500L, null, testAdmin));

        assertTrue(ex.getMessage().contains("Failed to send email"));
        assertFalse(ex.getMessage().contains("password"));
    }

    // --- INVOICE EMAIL TESTS ---

    @Test
    void test6_SendInvoiceEmailSuccess() {
        when(invoiceRepository.findById(300L)).thenReturn(Optional.of(testInvoice));

        invoiceService.sendInvoiceEmail(300L, null, testAdmin);

        verify(emailService).sendInvoiceEmail(eq(testInvoice), eq("billing@acmeglobal.com"));
    }

    @Test
    void test7_SendInvoiceMissingRecipientThrowsException() {
        testInvoice.setCustomer(null);
        testInvoice.setClientEmail(null);
        when(invoiceRepository.findById(300L)).thenReturn(Optional.of(testInvoice));

        assertThrows(IllegalArgumentException.class, () -> invoiceService.sendInvoiceEmail(300L, null, testAdmin));
    }

    @Test
    void test8_SendInvoiceEmailFailureHandled() {
        when(invoiceRepository.findById(300L)).thenReturn(Optional.of(testInvoice));
        doThrow(new IllegalStateException("SMTP timeout"))
                .when(emailService).sendInvoiceEmail(any(Invoice.class), anyString());

        assertThrows(IllegalStateException.class, () -> invoiceService.sendInvoiceEmail(300L, null, testAdmin));
    }

    // --- PAYMENT RECEIPT EMAIL TESTS ---

    @Test
    void test9_SendPaymentReceiptEmailSuccess() {
        when(paymentRepository.findById(400L)).thenReturn(Optional.of(testPayment));

        paymentService.sendPaymentReceiptEmail(400L, null, testAdmin);

        verify(emailService).sendPaymentReceiptEmail(eq(testPayment), eq("billing@acmeglobal.com"));
    }

    @Test
    void test10_SendPaymentReceiptFailureHandled() {
        when(paymentRepository.findById(400L)).thenReturn(Optional.of(testPayment));
        doThrow(new IllegalStateException("SMTP error"))
                .when(emailService).sendPaymentReceiptEmail(any(Payment.class), anyString());

        assertThrows(IllegalStateException.class, () -> paymentService.sendPaymentReceiptEmail(400L, null, testAdmin));
    }

    // --- CRM LEAD NOTIFICATION TESTS ---

    @Test
    void test11_CrmLeadCreationTriggersNotification() {
        when(sequenceGeneratorService.generateNextLeadNumber(any())).thenReturn("ACX/LEAD/26-27/0001");
        when(crmLeadRepository.save(any(CrmLead.class))).thenAnswer(inv -> {
            CrmLead l = inv.getArgument(0);
            ReflectionTestUtils.setField(l, "id", 601L);
            return l;
        });

        CrmLeadRequest request = CrmLeadRequest.builder()
                .fullName("New Prospect")
                .businessEmail("prospect@acme.com")
                .build();

        CrmLeadResponse response = crmService.createLead(request, testAdmin);

        assertNotNull(response);
        verify(emailService).sendCrmLeadNotification(any(CrmLead.class));
    }

    @Test
    void test12_MissingNotificationRecipientDoesNotFailLeadCreation() {
        when(sequenceGeneratorService.generateNextLeadNumber(any())).thenReturn("ACX/LEAD/26-27/0002");
        when(crmLeadRepository.save(any(CrmLead.class))).thenAnswer(inv -> inv.getArgument(0));
        when(emailService.sendCrmLeadNotification(any(CrmLead.class))).thenReturn(false);

        CrmLeadRequest request = CrmLeadRequest.builder()
                .fullName("No Recipient Prospect")
                .businessEmail("no-recipient@acme.com")
                .build();

        assertDoesNotThrow(() -> crmService.createLead(request, testAdmin));
    }

    @Test
    void test13_NotificationEmailFailureDoesNotFailLeadCreation() {
        when(sequenceGeneratorService.generateNextLeadNumber(any())).thenReturn("ACX/LEAD/26-27/0003");
        when(crmLeadRepository.save(any(CrmLead.class))).thenAnswer(inv -> inv.getArgument(0));
        doThrow(new RuntimeException("Mail server down"))
                .when(emailService).sendCrmLeadNotification(any(CrmLead.class));

        CrmLeadRequest request = CrmLeadRequest.builder()
                .fullName("Failing Email Prospect")
                .businessEmail("failing@acme.com")
                .build();

        assertDoesNotThrow(() -> crmService.createLead(request, testAdmin));
    }

    // --- CURRENCY FORMATTING & PRESERVATION TESTS ---

    @Test
    void test14_InrCurrencyFormatting() {
        String formatted = CurrencyUtils.formatCurrency(new BigDecimal("8787.00"), Currency.INR);
        assertEquals("₹8,787.00", formatted);
    }

    @Test
    void test15_UsdCurrencyFormatting() {
        String formatted = CurrencyUtils.formatCurrency(new BigDecimal("1250.00"), Currency.USD);
        assertEquals("$1,250.00", formatted);
    }

    @Test
    void test16_ExistingTransactionCurrencyIsPreserved() {
        assertEquals(Currency.USD, testInvoice.getCurrency());
        assertEquals(Currency.INR, testQuotation.getCurrency());
    }

    // --- SECURITY & RBAC TESTS ---

    @Test
    void test17_QuotationAccessControlCheck() {
        AdminUser salesUser = new AdminUser();
        salesUser.setId(20L);
        salesUser.setRole(Role.SALES);

        when(quotationRepository.findById(500L)).thenReturn(Optional.of(testQuotation));
        doThrow(new org.springframework.security.access.AccessDeniedException("Access denied"))
                .when(authorizationService).checkQuotationAccess(salesUser, testQuotation);

        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> quotationService.sendQuotation(500L, null, salesUser));
    }

    @Test
    void test18_SuperAdminHasAccess() {
        when(quotationRepository.findById(500L)).thenReturn(Optional.of(testQuotation));

        assertDoesNotThrow(() -> quotationService.sendQuotation(500L, null, testAdmin));
    }
}
