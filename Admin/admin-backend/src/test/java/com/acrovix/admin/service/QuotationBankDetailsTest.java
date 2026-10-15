package com.acrovix.admin.service;

import com.acrovix.admin.dto.CompanyBankAccountRequest;
import com.acrovix.admin.dto.CompanyBankAccountResponse;
import com.acrovix.admin.dto.CompanySettingsResponse;
import com.acrovix.admin.dto.QuotationPreviewRequest;
import com.acrovix.admin.dto.QuotationRequest;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.CompanyBankAccount;
import com.acrovix.admin.entity.Currency;
import com.acrovix.admin.entity.Quotation;
import com.acrovix.admin.entity.Role;
import com.acrovix.admin.repository.CompanyBankAccountRepository;
import com.acrovix.admin.repository.QuotationRepository;
import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.parser.PdfTextExtractor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class QuotationBankDetailsTest {

    @Mock
    private CompanySettingsService companySettingsService;

    @Mock
    private CompanyBankAccountRepository bankAccountRepository;

    @Mock
    private QuotationRepository quotationRepository;

    @Mock
    private com.acrovix.admin.repository.AdminActivityRepository activityRepository;

    @Mock
    private AuthorizationService authorizationService;

    @InjectMocks
    private PdfService pdfService;

    @InjectMocks
    private CompanyBankAccountService bankAccountService;

    @InjectMocks
    private QuotationService quotationService;

    private AdminUser testAdmin;
    private CompanySettingsResponse defaultSettings;

    @BeforeEach
    void setUp() {
        testAdmin = AdminUser.builder()
                .id(1L)
                .email("admin@acrovix.com")
                .role(Role.SUPER_ADMIN)
                .build();

        defaultSettings = CompanySettingsResponse.builder()
                .companyName("ACROVIX INNOVATIONS PRIVATE LIMITED")
                .bankName("Default HDFC Bank")
                .bankAccountNumber("987654321000")
                .bankIfsc("HDFC0000123")
                .bankBranch("Connaught Place, New Delhi")
                .build();
    }

    @Test
    void testPdfRendersSelectedAccountA() throws Exception {
        when(companySettingsService.getCompanySettings()).thenReturn(defaultSettings);

        Quotation quotation = Quotation.builder()
                .id(101L)
                .quotationNumber("QT-2026-001")
                .clientName("Tata Motors")
                .clientEmail("tata@motors.com")
                .currency(Currency.INR)
                .bankName("ICICI Bank Corporate")
                .bankAccountHolder("Acrovix Innovations Pvt Ltd")
                .bankAccountNumber("112233445566")
                .bankIfsc("ICIC0009988")
                .bankBranch("BKC, Mumbai")
                .companyBankAccountId(10L)
                .createdAt(LocalDateTime.now())
                .validUntil(LocalDate.now().plusDays(30))
                .items(new ArrayList<>())
                .columnConfigs(new ArrayList<>())
                .build();

        byte[] pdfBytes = pdfService.generateQuotationPdf(quotation);
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 0);

        PdfReader reader = new PdfReader(pdfBytes);
        PdfTextExtractor extractor = new PdfTextExtractor(reader);
        String pdfText = extractor.getTextFromPage(1);

        // Account A details must be present
        assertTrue(pdfText.contains("ICICI Bank Corporate"), "Should contain Account A bank name");
        assertTrue(pdfText.contains("Acrovix Innovations Pvt Ltd"), "Should contain Account A holder");
        assertTrue(pdfText.contains("112233445566"), "Should contain Account A full account number");
        assertTrue(pdfText.contains("ICIC0009988"), "Should contain Account A IFSC");
        assertTrue(pdfText.contains("BKC, Mumbai"), "Should contain Account A branch");

        // Account B and default settings details must NOT be mixed in
        assertFalse(pdfText.contains("Default HDFC Bank"), "Should not contain default settings bank");
        assertFalse(pdfText.contains("987654321000"), "Should not contain default settings account number");

        reader.close();
    }

    @Test
    void testPdfRendersSelectedAccountB() throws Exception {
        when(companySettingsService.getCompanySettings()).thenReturn(defaultSettings);

        Quotation quotation = Quotation.builder()
                .id(102L)
                .quotationNumber("QT-2026-002")
                .clientName("Reliance Industries")
                .clientEmail("reliance@ril.com")
                .currency(Currency.INR)
                .bankName("State Bank of India")
                .bankAccountHolder("Acrovix Innovations P Ltd")
                .bankAccountNumber("554433221100")
                .bankIfsc("SBIN0001122")
                .bankBranch("Nariman Point, Mumbai")
                .companyBankAccountId(20L)
                .createdAt(LocalDateTime.now())
                .validUntil(LocalDate.now().plusDays(30))
                .items(new ArrayList<>())
                .columnConfigs(new ArrayList<>())
                .build();

        byte[] pdfBytes = pdfService.generateQuotationPdf(quotation);
        assertNotNull(pdfBytes);

        PdfReader reader = new PdfReader(pdfBytes);
        PdfTextExtractor extractor = new PdfTextExtractor(reader);
        String pdfText = extractor.getTextFromPage(1);

        // Account B details must be present
        assertTrue(pdfText.contains("State Bank of India"), "Should contain Account B bank name");
        assertTrue(pdfText.contains("554433221100"), "Should contain Account B account number");
        assertTrue(pdfText.contains("SBIN0001122"), "Should contain Account B IFSC");

        // Must NOT contain Account A
        assertFalse(pdfText.contains("ICICI Bank Corporate"), "Should not contain Account A");
        assertFalse(pdfText.contains("112233445566"), "Should not contain Account A account number");

        reader.close();
    }

    @Test
    void testPdfFallbackToSettingsWhenNoAccountSelected() throws Exception {
        when(companySettingsService.getCompanySettings()).thenReturn(defaultSettings);

        Quotation quotation = Quotation.builder()
                .id(103L)
                .quotationNumber("QT-2026-003")
                .clientName("Infosys Ltd")
                .clientEmail("info@infosys.com")
                .currency(Currency.INR)
                .bankName(null)
                .bankAccountNumber(null)
                .bankIfsc(null)
                .bankBranch(null)
                .createdAt(LocalDateTime.now())
                .validUntil(LocalDate.now().plusDays(30))
                .items(new ArrayList<>())
                .columnConfigs(new ArrayList<>())
                .build();

        byte[] pdfBytes = pdfService.generateQuotationPdf(quotation);
        assertNotNull(pdfBytes);

        PdfReader reader = new PdfReader(pdfBytes);
        PdfTextExtractor extractor = new PdfTextExtractor(reader);
        String pdfText = extractor.getTextFromPage(1);

        // Fallback to company settings
        assertTrue(pdfText.contains("Default HDFC Bank"));
        assertTrue(pdfText.contains("987654321000"));
        assertTrue(pdfText.contains("HDFC0000123"));

        reader.close();
    }

    @Test
    void testPdfGeneratesGracefullyWhenNoBankAccountsConfiguredAtAll() throws Exception {
        when(companySettingsService.getCompanySettings()).thenReturn(null);

        Quotation quotation = Quotation.builder()
                .id(104L)
                .quotationNumber("QT-2026-004")
                .clientName("Wipro Ltd")
                .clientEmail("contact@wipro.com")
                .currency(Currency.INR)
                .bankName(null)
                .bankAccountNumber(null)
                .createdAt(LocalDateTime.now())
                .validUntil(LocalDate.now().plusDays(30))
                .items(new ArrayList<>())
                .columnConfigs(new ArrayList<>())
                .build();

        // Must not crash or throw exceptions
        byte[] pdfBytes = pdfService.generateQuotationPdf(quotation);
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 0);
    }

    @Test
    void testSaveDraftPreservesBankDetails() {
        Quotation existing = Quotation.builder()
                .id(200L)
                .status("DRAFT")
                .clientName("Client Initial")
                .clientEmail("initial@test.com")
                .items(new ArrayList<>())
                .columnConfigs(new ArrayList<>())
                .build();

        when(quotationRepository.findById(200L)).thenReturn(Optional.of(existing));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        QuotationRequest request = QuotationRequest.builder()
                .clientName("Client Initial")
                .clientEmail("initial@test.com")
                .bankName("Kotak Mahindra Bank")
                .bankAccountHolder("Acrovix Innovations Pvt Ltd")
                .bankAccountNumber("8877665544")
                .bankIfsc("KKBK0001122")
                .bankBranch("MG Road, Bengaluru")
                .companyBankAccountId(42L)
                .build();

        Quotation updated = quotationService.saveQuotationDraft(200L, request, testAdmin);

        assertEquals("Kotak Mahindra Bank", updated.getBankName());
        assertEquals("Acrovix Innovations Pvt Ltd", updated.getBankAccountHolder());
        assertEquals("8877665544", updated.getBankAccountNumber());
        assertEquals("KKBK0001122", updated.getBankIfsc());
        assertEquals("MG Road, Bengaluru", updated.getBankBranch());
        assertEquals(42L, updated.getCompanyBankAccountId());
    }

    @Test
    void testBuildTransientPreviewQuotationPreservesBankDetails() {
        QuotationPreviewRequest request = new QuotationPreviewRequest();
        request.setClientName("Preview Client");
        request.setClientEmail("preview@client.com");
        request.setTermsAndConditions("Payment within 30 days of invoice date.");
        request.setBankName("Axis Bank");
        request.setBankAccountHolder("Acrovix Innovations");
        request.setBankAccountNumber("998877665544");
        request.setBankIfsc("UTIB0000001");
        request.setBankBranch("Bandra, Mumbai");
        request.setCompanyBankAccountId(99L);

        Quotation transientQ = quotationService.buildTransientPreviewQuotation(request, testAdmin);

        assertEquals("Axis Bank", transientQ.getBankName());
        assertEquals("Acrovix Innovations", transientQ.getBankAccountHolder());
        assertEquals("998877665544", transientQ.getBankAccountNumber());
        assertEquals("UTIB0000001", transientQ.getBankIfsc());
        assertEquals("Bandra, Mumbai", transientQ.getBankBranch());
        assertEquals(99L, transientQ.getCompanyBankAccountId());
        assertEquals("Payment within 30 days of invoice date.", transientQ.getTermsAndConditions());
    }

    @Test
    void testBuildTransientPreviewQuotationMissingTermsThrowsException() {
        QuotationPreviewRequest request = new QuotationPreviewRequest();
        request.setClientName("Preview Client");
        request.setClientEmail("preview@client.com");
        request.setBankName("Axis Bank");
        request.setBankAccountNumber("998877665544");
        request.setCompanyBankAccountId(99L);
        // termsAndConditions is null

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            quotationService.buildTransientPreviewQuotation(request, testAdmin);
        });
        assertTrue(ex.getMessage().contains("Terms & Conditions are mandatory"));
    }

    @Test
    void testBuildTransientPreviewQuotationMissingBankThrowsException() {
        QuotationPreviewRequest request = new QuotationPreviewRequest();
        request.setClientName("Preview Client");
        request.setClientEmail("preview@client.com");
        request.setTermsAndConditions("Payment within 30 days");
        // bank account is omitted

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            quotationService.buildTransientPreviewQuotation(request, testAdmin);
        });
        assertTrue(ex.getMessage().contains("Bank Account is mandatory"));
    }

    @Test
    void testCompanyBankAccountServiceFallbackWhenTableEmpty() {
        when(bankAccountRepository.findByIsActiveTrueOrderByIsDefaultDescIdAsc()).thenReturn(List.of());
        when(companySettingsService.getCompanySettings()).thenReturn(defaultSettings);

        List<CompanyBankAccountResponse> list = bankAccountService.getActiveBankAccounts();
        assertEquals(1, list.size());
        assertEquals("Default HDFC Bank", list.get(0).getBankName());
        assertEquals("987654321000", list.get(0).getBankAccountNumber());
        assertEquals("•••• 1000", list.get(0).getMaskedAccountNumber());
        assertTrue(list.get(0).getIsDefault());
    }
}
