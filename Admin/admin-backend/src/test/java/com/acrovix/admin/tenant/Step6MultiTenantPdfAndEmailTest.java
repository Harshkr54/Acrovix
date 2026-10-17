package com.acrovix.admin.tenant;

import com.acrovix.admin.dto.CompanySettingsResponse;
import com.acrovix.admin.dto.InvoiceRequest;
import com.acrovix.admin.dto.InvoiceResponse;
import com.acrovix.admin.entity.*;
import com.acrovix.admin.repository.*;
import com.acrovix.admin.service.*;
import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.parser.PdfTextExtractor;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class Step6MultiTenantPdfAndEmailTest {

    @Mock
    private CompanySettingsService companySettingsService;

    @Mock
    private CompanyBankAccountRepository companyBankAccountRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private QuotationRepository quotationRepository;

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private ProductServiceRepository productServiceRepository;

    @Mock
    private CompanySettingsRepository companySettingsRepository;

    @Mock
    private SequenceGeneratorService sequenceGeneratorService;

    @Mock
    private AdminActivityRepository activityRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private EmailService emailService;

    @Mock
    private AuthorizationService authorizationService;

    @InjectMocks
    private PdfService pdfService;

    private CompanySettingsResponse tenant1Settings;
    private CompanySettingsResponse tenant2Settings;
    private AdminUser tenant2Admin;

    @BeforeEach
    void setUp() {
        TenantContext.clear();

        // Tenant 1 (Acrovix platform owner)
        tenant1Settings = new CompanySettingsResponse();
        tenant1Settings.setTenantId(1L);
        tenant1Settings.setCompanyName("ACROVIX INNOVATIONS PRIVATE LIMITED");
        tenant1Settings.setBrandName("Acrovix Innovations");
        tenant1Settings.setGstin("29AAACA1234A1Z5");
        tenant1Settings.setPan("AAACA1234A");
        tenant1Settings.setEmail("contact@acrovix.com");
        tenant1Settings.setPhone("+91 98765 43210");
        tenant1Settings.setWebsite("www.acrovix.com");
        tenant1Settings.setCurrencyCode("INR");
        tenant1Settings.setCurrencySymbol("₹");
        tenant1Settings.setPrimaryColor("#0f172a");

        // Tenant 2 (Nexus Corp Europe BV)
        tenant2Settings = new CompanySettingsResponse();
        tenant2Settings.setTenantId(2L);
        tenant2Settings.setCompanyName("NEXUS CORP EUROPE B.V.");
        tenant2Settings.setBrandName("Nexus Cloud Solutions");
        tenant2Settings.setVatId("NL854495200B01");
        tenant2Settings.setEmail("billing@nexuscorp.eu");
        tenant2Settings.setPhone("+31 20 123 4567");
        tenant2Settings.setWebsite("www.nexuscorp.eu");
        tenant2Settings.setRegisteredAddress("Keizersgracht 421, 1016 EK Amsterdam, Netherlands");
        tenant2Settings.setCurrencyCode("EUR");
        tenant2Settings.setCurrencySymbol("€");
        tenant2Settings.setPrimaryColor("#4f46e5");

        tenant2Admin = new AdminUser();
        tenant2Admin.setId(42L);
        tenant2Admin.setEmail("admin@nexuscorp.eu");
        tenant2Admin.setName("Nexus Admin");
        tenant2Admin.setRole(Role.COMPANY_ADMIN);
        tenant2Admin.setTenantId(2L);

        lenient().when(companySettingsService.getCompanySettingsForTenant(1L)).thenReturn(tenant1Settings);
        lenient().when(companySettingsService.getCompanySettingsForTenant(2L)).thenReturn(tenant2Settings);

        // Bank accounts
        CompanyBankAccount tenant2Bank = new CompanyBankAccount();
        tenant2Bank.setTenantId(2L);
        tenant2Bank.setBankName("ING Bank N.V.");
        tenant2Bank.setBankAccountNumber("NL91INGB0001234567");
        tenant2Bank.setBankIfsc("INGBNL2A");
        tenant2Bank.setBankBranch("Amsterdam Central");
        tenant2Bank.setAccountHolder("NEXUS CORP EUROPE B.V.");
        tenant2Bank.setIsDefault(true);
        tenant2Bank.setIsActive(true);

        lenient().when(companyBankAccountRepository.findFirstByTenantIdAndIsDefaultTrueAndIsActiveTrue(2L))
                .thenReturn(Optional.of(tenant2Bank));
        lenient().when(companyBankAccountRepository.findFirstByTenantIdAndIsDefaultTrueAndIsActiveTrue(1L))
                .thenReturn(Optional.empty());
        lenient().when(companyBankAccountRepository.findFirstByTenantIdAndIsActiveTrueOrderByIdAsc(1L))
                .thenReturn(Optional.empty());
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private String extractAllText(byte[] pdfBytes) {
        try {
            PdfReader reader = new PdfReader(new ByteArrayInputStream(pdfBytes));
            PdfTextExtractor extractor = new PdfTextExtractor(reader);
            StringBuilder sb = new StringBuilder();
            int numPages = reader.getNumberOfPages();
            for (int i = 1; i <= numPages; i++) {
                sb.append(extractor.getTextFromPage(i)).append("\n");
            }
            reader.close();
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("Failed to extract PDF text", e);
        }
    }

    @Test
    @DisplayName("PDF Generation: Tenant 2 Quotation displays tenant branding, VAT, EUR currency, and no Acrovix/HDFC leaks")
    void testQuotationPdfTenantIsolation() {
        Quotation quotation = new Quotation();
        quotation.setId(100L);
        quotation.setTenantId(2L);
        quotation.setQuotationNumber("QT-2026-0001");
        quotation.setCreatedAt(LocalDateTime.now());
        quotation.setValidUntil(LocalDate.now().plusDays(30));
        quotation.setClientName("Global Retailers B.V.");
        quotation.setSubtotal(new BigDecimal("5000.00"));
        quotation.setTaxAmount(new BigDecimal("1050.00"));
        quotation.setGrandTotal(new BigDecimal("6050.00"));

        QuotationItem item = new QuotationItem();
        item.setTenantId(2L);
        item.setDescription("Cloud Infrastructure Suite Enterprise");
        item.setQuantity(BigDecimal.valueOf(2));
        item.setUnitPrice(new BigDecimal("2500.00"));
        item.setLineTotal(new BigDecimal("5000.00"));
        quotation.setItems(Collections.singletonList(item));

        byte[] pdfBytes = pdfService.generateQuotationPdf(quotation);
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 1000);

        String pdfText = extractAllText(pdfBytes);

        // Verify Tenant 2 attributes are present
        assertTrue(pdfText.contains("NEXUS CORP EUROPE") || pdfText.contains("NEXUS CLOUD"), 
                "PDF must contain Tenant 2 company name or brand name");
        assertTrue(pdfText.contains("NL854495200B01"), "PDF must contain Tenant 2 VAT number");
        assertTrue(pdfText.contains("ING Bank"), "PDF must contain Tenant 2 bank account");
        assertTrue(pdfText.contains("NL91INGB0001234567"), "PDF must contain Tenant 2 IBAN");
        assertTrue(pdfText.contains("€") || pdfText.contains("EUR"), "PDF must contain EUR currency symbol");

        // Verify Platform Owner (Tenant 1) details DO NOT leak into Tenant 2 PDF
        assertFalse(pdfText.contains("ACROVIX INNOVATIONS PRIVATE LIMITED"), "Tenant 1 name must not leak into Tenant 2 PDF");
        assertFalse(pdfText.contains("29AAACA1234A1Z5"), "Tenant 1 GSTIN must not leak into Tenant 2 PDF");
        assertFalse(pdfText.contains("HDFC BANK"), "Tenant 1 default HDFC bank must not leak into Tenant 2 PDF");
        assertFalse(pdfText.contains("50200087654321"), "Tenant 1 default bank account must not leak into Tenant 2 PDF");
    }

    @Test
    @DisplayName("PDF Generation: Tenant 2 Invoice contains tenant branding and no Acrovix leaks")
    void testInvoicePdfTenantIsolation() {
        Invoice invoice = new Invoice();
        invoice.setId(200L);
        invoice.setTenantId(2L);
        invoice.setInvoiceNumber("INV-2026-0001");
        invoice.setInvoiceDate(LocalDate.now());
        invoice.setDueDate(LocalDate.now().plusDays(15));
        invoice.setClientName("Global Retailers B.V.");
        invoice.setClientEmail("ap@globalretailers.nl");
        invoice.setClientAddress("Damrak 50, Amsterdam");
        invoice.setSubtotal(new BigDecimal("10000.00"));
        invoice.setTaxAmount(new BigDecimal("2100.00"));
        invoice.setGrandTotal(new BigDecimal("12100.00"));

        InvoiceItem item = new InvoiceItem();
        item.setDescription("Dedicated Kubernetes Cluster Support");
        item.setQuantity(BigDecimal.ONE);
        item.setUnitPrice(new BigDecimal("10000.00"));
        item.setLineTotal(new BigDecimal("10000.00"));
        invoice.setItems(Collections.singletonList(item));

        byte[] pdfBytes = pdfService.generateInvoicePdf(invoice);
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 1000);

        String pdfText = extractAllText(pdfBytes);

        assertTrue(pdfText.contains("NEXUS CORP EUROPE") || pdfText.contains("NEXUS CLOUD"));
        assertTrue(pdfText.contains("NL854495200B01"));
        assertTrue(pdfText.contains("ING Bank"));
        assertFalse(pdfText.contains("ACROVIX INNOVATIONS"));
        assertFalse(pdfText.contains("HDFC BANK"));
    }

    @Test
    @DisplayName("PDF Generation: Payment Receipt displays dynamic currency and international words")
    void testPaymentReceiptPdfTenantIsolation() {
        Payment payment = new Payment();
        payment.setId(300L);
        payment.setTenantId(2L);
        payment.setCurrency(com.acrovix.admin.entity.Currency.EUR);
        payment.setPaymentNumber("REC-2026-0001");
        payment.setPaymentDate(LocalDate.now());
        payment.setAmount(new BigDecimal("1250000.50"));
        payment.setStatus(PaymentStatus.RECORDED);
        payment.setPaymentMethod(PaymentMethod.BANK_TRANSFER);
        payment.setTransactionReference("SEPA-TX-998877");

        byte[] pdfBytes = pdfService.generatePaymentReceiptPdf(payment);
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 1000);

        String pdfText = extractAllText(pdfBytes);

        assertTrue(pdfText.contains("NEXUS CORP EUROPE") || pdfText.contains("NEXUS CLOUD"));
        assertTrue(pdfText.contains("REC-2026-0001"));
        assertTrue(pdfText.contains("EUR") || pdfText.contains("€"));
        assertTrue(pdfText.contains("One Million Two Hundred Fifty Thousand"));
        assertFalse(pdfText.contains("ACROVIX INNOVATIONS PRIVATE LIMITED"));
    }

    @Test
    @DisplayName("Currency and Amount In Words formatting: Supports USD, EUR, GBP, AED, and INR")
    void testConvertAmountToWords() {
        // USD
        String usdWords = PdfService.convertAmountToWords(new BigDecimal("1250000.50"), "USD");
        assertEquals("USD One Million Two Hundred Fifty Thousand Dollars and Fifty Cents Only", usdWords);

        // EUR
        String eurWords = PdfService.convertAmountToWords(new BigDecimal("500.00"), "EUR");
        assertEquals("EUR Five Hundred Euros Only", eurWords);

        // GBP
        String gbpWords = PdfService.convertAmountToWords(new BigDecimal("750.25"), "GBP");
        assertEquals("GBP Seven Hundred Fifty Pounds and Twenty Five Pence Only", gbpWords);

        // AED
        String aedWords = PdfService.convertAmountToWords(new BigDecimal("1200.75"), "AED");
        assertEquals("AED One Thousand Two Hundred Dirhams and Seventy Five Fils Only", aedWords);

        // INR (Lakhs and Crores)
        String inrWords = PdfService.convertAmountToWords(new BigDecimal("1250000.50"), "INR");
        assertEquals("INR Twelve Lakh Fifty Thousand Rupees and Fifty Paise Only", inrWords);

        // INR Crores
        String inrCrores = PdfService.convertAmountToWords(new BigDecimal("15000000.00"), "INR");
        assertEquals("INR One Crore Fifty Lakh Rupees Only", inrCrores);
    }

    @Test
    @DisplayName("Quotation Revision: Revision strictly inherits parent tenantId and sequence")
    void testQuotationRevisionScoping() {
        Quotation parent = new Quotation();
        parent.setId(50L);
        parent.setTenantId(2L);
        parent.setQuotationNumber("QT-2026-0005");
        parent.setStatus("SENT");
        parent.setVersion(0);
        parent.setBaseQuotationId(50L);
        parent.setItems(new ArrayList<>());
        parent.setColumnConfigs(new ArrayList<>());

        QuotationItem item = new QuotationItem();
        item.setTenantId(2L);
        item.setDescription("Enterprise License");
        item.setUnitPrice(new BigDecimal("1000.00"));
        item.setQuantity(BigDecimal.ONE);
        item.setCustomValues(new HashMap<>());
        parent.getItems().add(item);

        when(quotationRepository.findWithDetailsById(50L)).thenReturn(Optional.of(parent));
        when(quotationRepository.findBaseQuotationForUpdate(50L)).thenReturn(Optional.of(parent));
        when(quotationRepository.findMaxVersionByBaseQuotationId(50L)).thenReturn(0);
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        QuotationService quotationService = new QuotationService(
                quotationRepository, null, null, sequenceGeneratorService, activityRepository,
                notificationService, authorizationService, emailService, customerRepository,
                productServiceRepository, null, purchaseOrderRepository, invoiceRepository
        );

        TenantContext.setTenantId(2L);
        Quotation revision = quotationService.createRevision(50L, tenant2Admin);

        assertNotNull(revision);
        assertEquals(2L, revision.getTenantId(), "Revision must inherit parent's tenantId");
        assertEquals("QT-2026-0005-R1", revision.getQuotationNumber(), "Revision number must have suffix -R1");
        assertEquals(1, revision.getVersion());
        assertEquals(2L, revision.getItems().get(0).getTenantId(), "Child item must inherit tenantId");
    }

    @Test
    @DisplayName("Quotation to Invoice conversion: Inherits tenantId and advances only tenant sequence")
    void testQuotationToInvoiceConversionTenantInheritance() {
        Quotation quotation = new Quotation();
        quotation.setId(88L);
        quotation.setTenantId(2L);
        quotation.setQuotationNumber("QT-2026-0088");
        quotation.setStatus("ACCEPTED");
        quotation.setClientName("Acme Europe");
        quotation.setSubtotal(new BigDecimal("3000.00"));
        quotation.setTaxAmount(new BigDecimal("630.00"));
        quotation.setGrandTotal(new BigDecimal("3630.00"));

        CompanySettings tenant2DbSettings = CompanySettings.builder()
                .companyName("NEXUS CORP EUROPE B.V.")
                .legalName("NEXUS CORP EUROPE B.V.")
                .gstin("NL854495200B01")
                .state("North Holland")
                .registeredAddress("Keizersgracht 421, Amsterdam")
                .build();
        tenant2DbSettings.setTenantId(2L);

        Invoice draftInvoice = new Invoice();
        draftInvoice.setId(999L);
        draftInvoice.setTenantId(2L);
        draftInvoice.setInvoiceType(InvoiceType.TAX_INVOICE);
        draftInvoice.setInvoiceDate(LocalDate.now());
        draftInvoice.setStatus(InvoiceStatus.DRAFT);
        draftInvoice.setLocked(false);
        draftInvoice.setSupplierCompany("NEXUS CORP EUROPE B.V.");

        when(quotationRepository.findById(88L)).thenReturn(Optional.of(quotation));
        when(companySettingsRepository.findFirstByTenantIdOrderByIdAsc(2L))
                .thenReturn(Optional.of(tenant2DbSettings));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> {
            Invoice inv = invocation.getArgument(0);
            inv.setId(999L);
            return inv;
        });
        when(invoiceRepository.findByIdWithDetails(999L)).thenReturn(Optional.of(draftInvoice));

        InvoiceService invoiceService = new InvoiceService(
                invoiceRepository, customerRepository, quotationRepository,
                purchaseOrderRepository, productServiceRepository, companySettingsRepository,
                sequenceGeneratorService, activityRepository, notificationService,
                pdfService, emailService, authorizationService, paymentRepository
        );

        InvoiceRequest request = new InvoiceRequest();
        request.setQuotationId(88L);
        request.setInvoiceType(InvoiceType.TAX_INVOICE);
        request.setInvoiceDate(LocalDate.now());
        request.setDueDate(LocalDate.now().plusDays(30));

        InvoiceResponse response = invoiceService.createDraftInvoice(request, tenant2Admin);

        assertNotNull(response);
        assertEquals("NEXUS CORP EUROPE B.V.", response.getSupplierCompany(), "Supplier snapshot must be strictly isolated to tenant 2");

        // Verify Issue Invoice invokes SequenceGenerator with tenantId = 2
        when(sequenceGeneratorService.generateNextInvoiceNumber(InvoiceType.TAX_INVOICE, LocalDate.now(), 2L))
                .thenReturn("INV-2026-0088");

        InvoiceResponse issued = invoiceService.issueInvoice(999L, tenant2Admin);
        assertNotNull(issued);
        assertEquals("INV-2026-0088", issued.getInvoiceNumber());
        verify(sequenceGeneratorService).generateNextInvoiceNumber(InvoiceType.TAX_INVOICE, LocalDate.now(), 2L);
    }

    @Test
    @DisplayName("Email White-Labeling: Template builder injects tenant branding, primary color, and contacts")
    void testEmailTemplateWhiteLabeling() {
        EmailTemplateBuilder builder = new EmailTemplateBuilder();
        String html = builder.buildCorporateEmail(
                "Quote Ready",
                "<p>Your quotation QT-2026-0001 has been generated.</p>",
                "View Quotation",
                "https://nexuscorp.eu/portal/quotes/1",
                tenant2Settings
        );

        assertNotNull(html);
        assertTrue(html.contains("Nexus Cloud Solutions") || html.contains("NEXUS CORP EUROPE"), 
                "Email must contain Tenant 2 brand name");
        assertTrue(html.contains("#4f46e5"), "Email must contain Tenant 2 primary brand color");
        assertTrue(html.contains("billing@nexuscorp.eu"), "Email must contain Tenant 2 contact email");
        assertFalse(html.contains("sales@acrovix.com"), "Platform owner contact email must not leak in white-label email");
    }
}
