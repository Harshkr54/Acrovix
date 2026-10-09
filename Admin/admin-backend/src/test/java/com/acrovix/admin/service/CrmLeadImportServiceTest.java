package com.acrovix.admin.service;

import com.acrovix.admin.dto.crm.*;
import com.acrovix.admin.entity.*;
import com.acrovix.admin.entity.Currency;
import com.acrovix.admin.repository.CrmLeadRepository;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.encryption.AccessPermission;
import org.apache.pdfbox.pdmodel.encryption.StandardProtectionPolicy;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CrmLeadImportServiceTest {

    @Mock
    private CrmLeadRepository crmLeadRepository;

    @Mock
    private CrmService crmService;

    @InjectMocks
    private CrmLeadImportService crmLeadImportService;

    private AdminUser testAdmin;

    @BeforeEach
    void setUp() {
        testAdmin = AdminUser.builder()
                .id(1L)
                .name("Test Admin")
                .email("admin@acrovix.com")
                .role(Role.SUPER_ADMIN)
                .build();
    }

    @Test
    @DisplayName("1. Valid CSV Import Success")
    void test01_ValidCsvImportSuccess() {
        String csv = "Full Name,Business Email,Phone,Company,Status\n" +
                "Rahul Sharma,rahul@example.com,+919876543210,Acme Corp,NEW\n" +
                "Amit Kumar,amit@example.com,+919876543211,XYZ Ltd,QUALIFIED\n";

        MockMultipartFile file = new MockMultipartFile(
                "file", "leads.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8)
        );

        when(crmLeadRepository.existsByBusinessEmailIgnoreCase(anyString())).thenReturn(false);
        when(crmService.createLead(any(CrmLeadRequest.class), eq(testAdmin)))
                .thenReturn(CrmLeadResponse.builder().id(100L).leadNumber("LEAD-001").build());

        CrmLeadImportResultResponse result = crmLeadImportService.importLeads(file, null, testAdmin);

        assertEquals(2, result.getTotalProcessed());
        assertEquals(2, result.getSuccessCount());
        assertEquals(0, result.getDuplicateCount());
        assertEquals(0, result.getErrorCount());
        assertTrue(result.getErrors().isEmpty());

        verify(crmService, times(2)).createLead(any(CrmLeadRequest.class), eq(testAdmin));
    }

    @Test
    @DisplayName("2. Valid XLSX Import Success")
    void test02_ValidXlsxImportSuccess() throws Exception {
        byte[] xlsxBytes = createMockXlsxWorkbook(new String[][]{
                {"Full Name", "Business Email", "Company", "Industry Sector"},
                {"Priya Verma", "priya@tech.com", "TechCorp", "Software"},
                {"Vikram Singh", "vikram@innovate.com", "Innovate LLC", "Finance"}
        });

        MockMultipartFile file = new MockMultipartFile(
                "file", "leads.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xlsxBytes
        );

        when(crmLeadRepository.existsByBusinessEmailIgnoreCase(anyString())).thenReturn(false);
        when(crmService.createLead(any(CrmLeadRequest.class), eq(testAdmin)))
                .thenReturn(CrmLeadResponse.builder().id(101L).build());

        CrmLeadImportResultResponse result = crmLeadImportService.importLeads(file, null, testAdmin);

        assertEquals(2, result.getTotalProcessed());
        assertEquals(2, result.getSuccessCount());
        assertEquals(0, result.getErrorCount());
    }

    @Test
    @DisplayName("3. Empty File Rejection")
    void test03_EmptyFileRejection() {
        MockMultipartFile emptyFile = new MockMultipartFile("file", "empty.csv", "text/csv", new byte[0]);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> crmLeadImportService.previewImport(emptyFile)
        );
        assertEquals("Uploaded file is empty.", ex.getMessage());
    }

    @Test
    @DisplayName("4. Malformed CSV Handling")
    void test04_MalformedCsvHandling() {
        MockMultipartFile malformedFile = new MockMultipartFile(
                "file", "corrupt.csv", "text/csv", "".getBytes(StandardCharsets.UTF_8)
        );

        assertThrows(
                IllegalArgumentException.class,
                () -> crmLeadImportService.previewImport(malformedFile)
        );
    }

    @Test
    @DisplayName("5. Malformed XLSX Handling")
    void test05_MalformedXlsxHandling() {
        MockMultipartFile corruptedXlsx = new MockMultipartFile(
                "file", "corrupt.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "NOT_AN_EXCEL_ZIP_STREAM".getBytes(StandardCharsets.UTF_8)
        );

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> crmLeadImportService.previewImport(corruptedXlsx)
        );
        assertTrue(ex.getMessage().contains("Failed to parse Excel sheet"));
    }

    @Test
    @DisplayName("6. Unsupported File Extension Rejection")
    void test06_UnsupportedFileRejection() {
        MockMultipartFile docFile = new MockMultipartFile(
                "file", "document.docx", "application/docx", "dummy docx content".getBytes(StandardCharsets.UTF_8)
        );

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> crmLeadImportService.previewImport(docFile)
        );
        assertTrue(ex.getMessage().contains("Unsupported file extension"));
    }

    @Test
    @DisplayName("7. Missing Required Field Validation")
    void test07_MissingRequiredFieldValidation() {
        String csv = "Full Name,Business Email,Company\n" +
                ",test1@example.com,Acme\n" +
                "John Doe,,Acme\n";

        MockMultipartFile file = new MockMultipartFile("file", "missing.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8));

        CrmLeadImportPreviewResponse preview = crmLeadImportService.previewImport(file);

        assertEquals(2, preview.getTotalRows());
        assertEquals(0, preview.getValidCount());
        assertEquals(2, preview.getInvalidCount());
        assertTrue(preview.getPreviewRows().get(0).getErrors().contains("Full Name is required"));
        assertTrue(preview.getPreviewRows().get(1).getErrors().contains("Business Email is required"));
    }

    @Test
    @DisplayName("8. Invalid Email Format Validation")
    void test08_InvalidEmailFormatValidation() {
        String csv = "Full Name,Business Email\n" +
                "Rahul Sharma,invalid-email-address\n";

        MockMultipartFile file = new MockMultipartFile("file", "invalid_email.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8));

        CrmLeadImportPreviewResponse preview = crmLeadImportService.previewImport(file);

        assertEquals(1, preview.getTotalRows());
        assertEquals(1, preview.getInvalidCount());
        assertTrue(preview.getPreviewRows().get(0).getErrors().contains("Invalid business email format"));
    }

    @Test
    @DisplayName("9. Invalid Field Values (Enums, Numeric)")
    void test09_InvalidFieldValuesValidation() {
        String csv = "Full Name,Business Email,Status,Priority,Currency,Estimated Value,Probability\n" +
                "Valid Name,valid@email.com,INVALID_STATUS,INVALID_PRIORITY,INVALID_CURRENCY,abc_amount,150\n";

        MockMultipartFile file = new MockMultipartFile("file", "bad_values.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8));

        CrmLeadImportPreviewResponse preview = crmLeadImportService.previewImport(file);

        assertEquals(1, preview.getTotalRows());
        assertEquals(1, preview.getInvalidCount());

        List<String> errors = preview.getPreviewRows().get(0).getErrors();
        assertTrue(errors.stream().anyMatch(e -> e.contains("Invalid status")));
        assertTrue(errors.stream().anyMatch(e -> e.contains("Invalid priority")));
        assertTrue(errors.stream().anyMatch(e -> e.contains("Invalid currency")));
        assertTrue(errors.stream().anyMatch(e -> e.contains("Probability must be between 0 and 100")));
    }

    @Test
    @DisplayName("10. Duplicate Existing Lead in Database")
    void test10_DuplicateExistingLeadInDb() {
        String csv = "Full Name,Business Email\n" +
                "Existing Lead,existing@acme.com\n";

        MockMultipartFile file = new MockMultipartFile("file", "duplicate_db.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8));

        when(crmLeadRepository.existsByBusinessEmailIgnoreCase("existing@acme.com")).thenReturn(true);

        CrmLeadImportPreviewResponse preview = crmLeadImportService.previewImport(file);

        assertEquals(1, preview.getTotalRows());
        assertEquals(1, preview.getDuplicateCount());
        assertEquals("DUPLICATE", preview.getPreviewRows().get(0).getStatus());
    }

    @Test
    @DisplayName("11. Duplicate Within Uploaded File")
    void test11_DuplicateWithinUploadedFile() {
        String csv = "Full Name,Business Email\n" +
                "Lead First,same@example.com\n" +
                "Lead Second,same@example.com\n";

        MockMultipartFile file = new MockMultipartFile("file", "duplicate_file.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8));

        when(crmLeadRepository.existsByBusinessEmailIgnoreCase(anyString())).thenReturn(false);

        CrmLeadImportPreviewResponse preview = crmLeadImportService.previewImport(file);

        assertEquals(2, preview.getTotalRows());
        assertEquals(1, preview.getValidCount());
        assertEquals(1, preview.getDuplicateCount());
        assertEquals("VALID", preview.getPreviewRows().get(0).getStatus());
        assertEquals("DUPLICATE", preview.getPreviewRows().get(1).getStatus());
    }

    @Test
    @DisplayName("12. Mixed Valid, Invalid and Duplicate Rows")
    void test12_MixedRowsImport() {
        String csv = "Full Name,Business Email\n" +
                "Valid One,valid1@example.com\n" +
                "Invalid One,invalid-email\n" +
                "Valid One Dup,valid1@example.com\n" +
                "Valid Two,valid2@example.com\n";

        MockMultipartFile file = new MockMultipartFile("file", "mixed.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8));

        when(crmLeadRepository.existsByBusinessEmailIgnoreCase(anyString())).thenReturn(false);
        when(crmService.createLead(any(CrmLeadRequest.class), eq(testAdmin)))
                .thenReturn(CrmLeadResponse.builder().id(200L).build());

        CrmLeadImportResultResponse result = crmLeadImportService.importLeads(file, null, testAdmin);

        assertEquals(4, result.getTotalProcessed());
        assertEquals(2, result.getSuccessCount());
        assertEquals(1, result.getDuplicateCount());
        assertEquals(1, result.getErrorCount());
        assertEquals(2, result.getErrors().size());
    }

    @Test
    @DisplayName("16 & 17. Special Characters & Unicode Names Handling")
    void test16_SpecialCharsAndUnicodeNames() {
        String csv = "Full Name,Business Email,Company,Notes\n" +
                "Rémi François,remi@enterprise.fr,Société Générale & Cie,Enterprise client with €100k budget & special requirements <test>\n" +
                "한글 이름,hangul@korea.kr,한국 Corp,Unicode test note\n";

        MockMultipartFile file = new MockMultipartFile("file", "unicode.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8));

        when(crmLeadRepository.existsByBusinessEmailIgnoreCase(anyString())).thenReturn(false);
        when(crmService.createLead(any(CrmLeadRequest.class), eq(testAdmin)))
                .thenReturn(CrmLeadResponse.builder().id(300L).build());

        CrmLeadImportResultResponse result = crmLeadImportService.importLeads(file, null, testAdmin);

        assertEquals(2, result.getTotalProcessed());
        assertEquals(2, result.getSuccessCount());
        assertEquals(0, result.getErrorCount());
    }

    @Test
    @DisplayName("19. Template Generation Verification")
    void test19_GenerateTemplateCsv() {
        byte[] templateBytes = crmLeadImportService.generateTemplateCsv();
        assertNotNull(templateBytes);
        String templateStr = new String(templateBytes, StandardCharsets.UTF_8);

        assertTrue(templateStr.contains("Full Name,Business Email,Phone,Company"));
        assertTrue(templateStr.contains("john.doe@example.com"));
    }

    // --- PDF IMPORT UNIT TESTS ---

    @Test
    @DisplayName("20. Valid Text-Based PDF Import Success")
    void test20_ValidPdfImportSuccess() throws Exception {
        byte[] pdfBytes = createMockPdf("Name | Email | Phone | Company\nRahul Sharma | rahul@pdf.com | +919876543210 | PDF Corp\nPriya Verma | priya@pdf.com | +919876543211 | Tech Solutions");

        MockMultipartFile file = new MockMultipartFile("file", "leads.pdf", "application/pdf", pdfBytes);

        when(crmLeadRepository.existsByBusinessEmailIgnoreCase(anyString())).thenReturn(false);
        when(crmService.createLead(any(CrmLeadRequest.class), eq(testAdmin)))
                .thenReturn(CrmLeadResponse.builder().id(400L).build());

        CrmLeadImportResultResponse result = crmLeadImportService.importLeads(file, null, testAdmin);

        assertEquals(2, result.getTotalProcessed());
        assertEquals(2, result.getSuccessCount());
        assertEquals(0, result.getErrorCount());
    }

    @Test
    @DisplayName("21. Password-Protected PDF Rejection")
    void test21_PasswordProtectedPdfRejection() throws Exception {
        byte[] encryptedPdfBytes = createEncryptedMockPdf("Name | Email\nJohn | john@locked.com");

        MockMultipartFile file = new MockMultipartFile("file", "protected.pdf", "application/pdf", encryptedPdfBytes);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> crmLeadImportService.previewImport(file)
        );

        assertTrue(ex.getMessage().contains("Password-protected PDF files cannot be read"));
    }

    @Test
    @DisplayName("22. Scanned / Image-Only PDF Rejection")
    void test22_ScannedPdfRejection() throws Exception {
        // PDF with empty page / no readable text
        byte[] emptyPdfBytes = createMockPdf("");

        MockMultipartFile file = new MockMultipartFile("file", "scanned.pdf", "application/pdf", emptyPdfBytes);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> crmLeadImportService.previewImport(file)
        );

        assertTrue(ex.getMessage().contains("This PDF appears to be scanned"));
    }

    @Test
    @DisplayName("23. PDF With Alias Column Headers Matching")
    void test23_PdfColumnAliasesMatching() throws Exception {
        byte[] pdfBytes = createMockPdf("Contact | Work Email | Mobile Number | Organization\nAnkit Patel | ankit@org.com | 9876543210 | Global Org");

        MockMultipartFile file = new MockMultipartFile("file", "alias.pdf", "application/pdf", pdfBytes);

        CrmLeadImportPreviewResponse preview = crmLeadImportService.previewImport(file);

        assertEquals(1, preview.getTotalRows());
        assertEquals(1, preview.getValidCount());
        assertEquals("fullName", preview.getSuggestedMapping().get("Contact"));
        assertEquals("businessEmail", preview.getSuggestedMapping().get("Work Email"));
        assertEquals("phoneNumber", preview.getSuggestedMapping().get("Mobile Number"));
        assertEquals("companyName", preview.getSuggestedMapping().get("Organization"));
    }

    @Test
    @DisplayName("24. Batch Lead Requests Import Success and Duplicate Skipping")
    void test24_ImportLeadRequestsBatchSuccess() throws Exception {
        CrmLeadRequest req1 = CrmLeadRequest.builder()
                .fullName("Rahul Sharma")
                .businessEmail("rahul@example.com")
                .companyName("Acme Corp")
                .build();

        CrmLeadRequest req2 = CrmLeadRequest.builder()
                .fullName("Rahul Duplicate")
                .businessEmail("rahul@example.com")
                .companyName("Acme Corp")
                .build();

        when(crmLeadRepository.existsByBusinessEmailIgnoreCase("rahul@example.com")).thenReturn(false);
        when(crmService.createLead(any(CrmLeadRequest.class), eq(testAdmin)))
                .thenReturn(CrmLeadResponse.builder().id(500L).build());

        CrmLeadImportResultResponse result = crmLeadImportService.importLeadRequests(List.of(req1, req2), testAdmin);

        assertEquals(2, result.getTotalProcessed());
        assertEquals(1, result.getSuccessCount());
        assertEquals(1, result.getDuplicateCount());
        assertEquals(0, result.getErrorCount());
    }

    @Test
    @DisplayName("25. Batch Lead Requests Exceeds Maximum Limit Rejection")
    void test25_ImportLeadRequestsBatchLimitExceeded() {
        List<CrmLeadRequest> oversizedList = new ArrayList<>();
        for (int i = 0; i < 1001; i++) {
            oversizedList.add(CrmLeadRequest.builder().fullName("User " + i).businessEmail("user" + i + "@example.com").build());
        }

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> crmLeadImportService.importLeadRequests(oversizedList, testAdmin)
        );

        assertTrue(ex.getMessage().contains("Batch size exceeds maximum allowed limit"));
    }

    // Helper method to create in-memory XLSX byte array
    private byte[] createMockXlsxWorkbook(String[][] grid) throws Exception {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Leads");

            for (int r = 0; r < grid.length; r++) {
                Row row = sheet.createRow(r);
                for (int c = 0; c < grid[r].length; c++) {
                    Cell cell = row.createCell(c);
                    cell.setCellValue(grid[r][c]);
                }
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    // Helper method to create in-memory text PDF byte array
    private byte[] createMockPdf(String text) throws Exception {
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            document.addPage(page);
            if (text != null && !text.isBlank()) {
                try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                    contentStream.setFont(PDType1Font.HELVETICA, 12);
                    contentStream.beginText();
                    contentStream.newLineAtOffset(50, 700);
                    for (String line : text.split("\\r?\\n")) {
                        contentStream.showText(line.trim());
                        contentStream.newLineAtOffset(0, -15);
                    }
                    contentStream.endText();
                }
            }
            document.save(out);
            return out.toByteArray();
        }
    }

    // Helper method to create encrypted PDF
    private byte[] createEncryptedMockPdf(String text) throws Exception {
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                contentStream.setFont(PDType1Font.HELVETICA, 12);
                contentStream.beginText();
                contentStream.newLineAtOffset(50, 700);
                for (String line : text.split("\\r?\\n")) {
                    contentStream.showText(line.trim());
                    contentStream.newLineAtOffset(0, -15);
                }
                contentStream.endText();
            }
            AccessPermission ap = new AccessPermission();
            StandardProtectionPolicy spp = new StandardProtectionPolicy("secret123", "secret123", ap);
            spp.setEncryptionKeyLength(128);
            document.protect(spp);
            document.save(out);
            return out.toByteArray();
        }
    }

    @Test
    @DisplayName("27. Structured PDF Table Extraction Regression Test")
    void test27_StructuredTablePdfExtractionTest() throws Exception {
        byte[] pdfBytes = createStructuredSamplePdf();
        MockMultipartFile file = new MockMultipartFile("file", "sample_crm_leads.pdf", "application/pdf", pdfBytes);

        when(crmLeadRepository.existsByBusinessEmailIgnoreCase(anyString())).thenReturn(false);

        CrmLeadImportPreviewResponse preview = crmLeadImportService.previewImport(file);

        // 1. Verify exact 8 records parsed (not 15 fragments)
        assertEquals(8, preview.getTotalRows());
        assertEquals(8, preview.getValidCount());
        assertEquals(0, preview.getInvalidCount());
        assertEquals(0, preview.getDuplicateCount());

        // 2. Assert Record 1 details
        CrmLeadImportPreviewRow row1 = preview.getPreviewRows().get(0);
        assertEquals("Aarav Sharma", row1.getFullName());
        assertEquals("aarav.sharma@example.com", row1.getBusinessEmail());
        assertEquals("Northstar Retail Pvt Ltd", row1.getCompanyName());
        assertEquals("+91-90000-10001", row1.getRowData().get("Phone"));
        assertEquals("Retail", row1.getRowData().get("Industry"));
        assertEquals("LinkedIn", row1.getRowData().get("Source"));
        assertEquals("High", row1.getRowData().get("Priority"));
        assertEquals("CRM integration", row1.getRowData().get("Requirement"));
        assertEquals("Delhi", row1.getRowData().get("City"));
        assertEquals("VALID", row1.getStatus());

        // 3. Assert Record 2 details
        CrmLeadImportPreviewRow row2 = preview.getPreviewRows().get(1);
        assertEquals("Priya Mehta", row2.getFullName());
        assertEquals("priya.mehta@example.com", row2.getBusinessEmail());
        assertEquals("BluePeak Technologies", row2.getCompanyName());
        assertEquals("VALID", row2.getStatus());
    }

    private byte[] createStructuredSamplePdf() throws Exception {
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream cs = new PDPageContentStream(document, page)) {
                cs.setFont(PDType1Font.HELVETICA_BOLD, 10);

                // Document header title
                cs.beginText();
                cs.newLineAtOffset(40, 750);
                cs.showText("ACROVIX CRM Leads Import Sample Document");
                cs.endText();

                // Table Header line at Y = 710
                drawPdfRow(cs, 710, "Lead Name", "Email", "Company", "Phone", "Industry", "Source", "Priority", "Requirement", "City");

                cs.setFont(PDType1Font.HELVETICA, 8);
                float y = 680;

                // Record 1 - Line 1 (Visual line wrap on Email and Requirement)
                drawPdfRow(cs, y, "Aarav Sharma", "aarav.sharma@example.co", "Northstar Retail Pvt Ltd", "+91-90000-10001", "Retail", "LinkedIn", "High", "CRM", "Delhi");

                // Record 1 - Line 2 (wrapped email suffix 'm' and requirement 'integration')
                y -= 12;
                cs.beginText();
                cs.newLineAtOffset(130, y); // Email column (X = 130)
                cs.showText("m");
                cs.newLineAtOffset(530, 0); // 130 + 530 = 660 (Requirement column)
                cs.showText("integration");
                cs.endText();

                // Record 2
                y -= 20;
                drawPdfRow(cs, y, "Priya Mehta", "priya.mehta@example.com", "BluePeak Technologies", "+91-90000-10002", "Technology", "Website", "Medium", "API development", "Mumbai");

                // Record 3
                y -= 20;
                drawPdfRow(cs, y, "Rohan Verma", "rohan.verma@example.com", "Apex Logistics", "+91-90000-10003", "Logistics", "Referral", "High", "Fleet management", "Bangalore");

                // Record 4
                y -= 20;
                drawPdfRow(cs, y, "Ananya Roy", "ananya.roy@example.com", "Crest Financials", "+91-90000-10004", "Finance", "Partner", "Urgent", "Audit automation", "Kolkata");

                // Record 5
                y -= 20;
                drawPdfRow(cs, y, "Vikram Patel", "vikram.patel@example.com", "Sunrise Foods", "+91-90000-10005", "FMCG", "Email", "Low", "Inventory tracking", "Ahmedabad");

                // Record 6
                y -= 20;
                drawPdfRow(cs, y, "Sneha Rao", "sneha.rao@example.com", "Zenith Healthcare", "+91-90000-10006", "Healthcare", "Phone", "High", "Patient portal", "Hyderabad");

                // Record 7
                y -= 20;
                drawPdfRow(cs, y, "Kabir Singh", "kabir.singh@example.com", "Horizon Media", "+91-90000-10007", "Media", "WhatsApp", "Medium", "Ad analytics", "Pune");

                // Record 8
                y -= 20;
                drawPdfRow(cs, y, "Neha Gupta", "neha.gupta@example.com", "Vantage Edu", "+91-90000-10008", "Education", "Other", "Medium", "LMS platform", "Jaipur");

                // Footer
                cs.beginText();
                cs.newLineAtOffset(250, 30);
                cs.showText("Page 1 of 1");
                cs.endText();
            }
            document.save(out);
            return out.toByteArray();
        }
    }

    @Test
    @DisplayName("28. Batch Lead Requests Import Endpoint Payload Validation")
    void test28_BatchLeadRequestsImportPayloadValidationTest() {
        CrmLeadRequest valid1 = CrmLeadRequest.builder()
                .fullName("Aarav Sharma")
                .businessEmail("aarav.sharma@example.com")
                .companyName("Northstar Retail Pvt Ltd")
                .phoneNumber("+91-90000-10001")
                .industrySector("Retail")
                .leadSource(LeadSource.LINKEDIN)
                .priority(LeadPriority.HIGH)
                .status(LeadStatus.NEW)
                .notes("Delhi")
                .build();

        CrmLeadRequest valid2 = CrmLeadRequest.builder()
                .fullName("Priya Mehta")
                .businessEmail("priya.mehta@example.com")
                .companyName("BluePeak Technologies")
                .status(LeadStatus.QUALIFIED)
                .build();

        // Existing DB Duplicate
        CrmLeadRequest dbDuplicate = CrmLeadRequest.builder()
                .fullName("Existing User")
                .businessEmail("existing.db@example.com")
                .build();

        // In-batch Duplicate of valid1
        CrmLeadRequest batchDuplicate = CrmLeadRequest.builder()
                .fullName("Aarav Duplicate")
                .businessEmail("aarav.sharma@example.com")
                .build();

        // Invalid record: missing full name
        CrmLeadRequest invalidMissingName = CrmLeadRequest.builder()
                .fullName("")
                .businessEmail("noname@example.com")
                .build();

        // Invalid record: invalid probability
        CrmLeadRequest invalidProb = CrmLeadRequest.builder()
                .fullName("Bad Probability")
                .businessEmail("badprob@example.com")
                .probability(150)
                .build();

        List<CrmLeadRequest> batch = List.of(valid1, valid2, dbDuplicate, batchDuplicate, invalidMissingName, invalidProb);

        when(crmLeadRepository.existsByBusinessEmailIgnoreCase("aarav.sharma@example.com")).thenReturn(false);
        when(crmLeadRepository.existsByBusinessEmailIgnoreCase("priya.mehta@example.com")).thenReturn(false);
        when(crmLeadRepository.existsByBusinessEmailIgnoreCase("existing.db@example.com")).thenReturn(true);
        when(crmLeadRepository.existsByBusinessEmailIgnoreCase("noname@example.com")).thenReturn(false);
        when(crmLeadRepository.existsByBusinessEmailIgnoreCase("badprob@example.com")).thenReturn(false);

        when(crmService.createLead(any(CrmLeadRequest.class), eq(testAdmin)))
                .thenReturn(CrmLeadResponse.builder().id(800L).build());

        CrmLeadImportResultResponse result = crmLeadImportService.importLeadRequests(batch, testAdmin);

        assertEquals(6, result.getTotalProcessed());
        assertEquals(2, result.getSuccessCount());
        assertEquals(2, result.getDuplicateCount());
        assertEquals(2, result.getErrorCount());

        verify(crmService, times(2)).createLead(any(CrmLeadRequest.class), eq(testAdmin));
    }

    private void drawPdfRow(PDPageContentStream cs, float y, String name, String email, String company, String phone, String industry, String source, String priority, String requirement, String city) throws Exception {
        cs.beginText();
        cs.newLineAtOffset(40, y);
        cs.showText(name);
        cs.newLineAtOffset(90, 0); // X = 130
        cs.showText(email);
        cs.newLineAtOffset(150, 0); // X = 280
        cs.showText(company);
        cs.newLineAtOffset(130, 0); // X = 410
        cs.showText(phone);
        cs.newLineAtOffset(90, 0); // X = 500
        cs.showText(industry);
        cs.newLineAtOffset(60, 0); // X = 560
        cs.showText(source);
        cs.newLineAtOffset(50, 0); // X = 610
        cs.showText(priority);
        cs.newLineAtOffset(50, 0); // X = 660
        cs.showText(requirement);
        cs.newLineAtOffset(80, 0); // X = 740
        cs.showText(city);
        cs.endText();
    }
}
