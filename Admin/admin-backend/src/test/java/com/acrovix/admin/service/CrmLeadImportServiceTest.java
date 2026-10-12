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

    @Test
    @DisplayName("29. Multi-Sheet Excel Support and Sheet Selection")
    void test29_MultiSheetExcelSelection() throws Exception {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet1 = workbook.createSheet("East Leads");
            Row r0 = sheet1.createRow(0);
            r0.createCell(0).setCellValue("Full Name");
            r0.createCell(1).setCellValue("Business Email");
            Row r1 = sheet1.createRow(1);
            r1.createCell(0).setCellValue("East Lead 1");
            r1.createCell(1).setCellValue("east1@example.com");

            Sheet sheet2 = workbook.createSheet("West Leads");
            Row s0 = sheet2.createRow(0);
            s0.createCell(0).setCellValue("Full Name");
            s0.createCell(1).setCellValue("Business Email");
            Row s1 = sheet2.createRow(1);
            s1.createCell(0).setCellValue("West Lead 1");
            s1.createCell(1).setCellValue("west1@example.com");
            Row s2 = sheet2.createRow(2);
            s2.createCell(0).setCellValue("West Lead 2");
            s2.createCell(1).setCellValue("west2@example.com");

            workbook.write(out);

            MockMultipartFile file = new MockMultipartFile(
                    "file", "multi_sheet.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    out.toByteArray()
            );

            // 1. Default (Sheet 1)
            CrmLeadImportPreviewResponse preview1 = crmLeadImportService.previewImport(file);
            assertEquals(2, preview1.getAvailableSheets().size());
            assertEquals("East Leads", preview1.getActiveSheet());
            assertEquals(1, preview1.getTotalRows());

            // 2. Select Sheet 2 ("West Leads")
            CrmLeadImportPreviewResponse preview2 = crmLeadImportService.previewImport(file, "West Leads");
            assertEquals("West Leads", preview2.getActiveSheet());
            assertEquals(2, preview2.getTotalRows());
            assertEquals("West Lead 1", preview2.getPreviewRows().get(0).getFullName());
        }
    }

    @Test
    @DisplayName("30. Multi-Page PDF Table with Repeated Headers Extraction")
    void test30_MultiPagePdfWithRepeatedHeaders() throws Exception {
        try (PDDocument doc = new PDDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            // Page 1
            PDPage page1 = new PDPage();
            doc.addPage(page1);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page1)) {
                cs.setFont(PDType1Font.HELVETICA_BOLD, 10);
                drawPdfRow(cs, 700, "Full Name", "Business Email", "Company", "Phone", "Industry", "Source", "Priority", "Requirement", "City");
                cs.setFont(PDType1Font.HELVETICA, 10);
                drawPdfRow(cs, 670, "John Doe", "john.doe@example.com", "Acme", "+919876543210", "Tech", "WEBSITE", "HIGH", "Cloud", "Mumbai");
            }

            // Page 2 (with repeated header)
            PDPage page2 = new PDPage();
            doc.addPage(page2);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page2)) {
                cs.setFont(PDType1Font.HELVETICA_BOLD, 10);
                drawPdfRow(cs, 700, "Full Name", "Business Email", "Company", "Phone", "Industry", "Source", "Priority", "Requirement", "City");
                cs.setFont(PDType1Font.HELVETICA, 10);
                drawPdfRow(cs, 670, "Jane Smith", "jane.smith@example.com", "Beta LLC", "+919876543211", "Finance", "REFERRAL", "MEDIUM", "ERP", "Delhi");
            }

            doc.save(out);

            MockMultipartFile file = new MockMultipartFile(
                    "file", "leads_multipage.pdf", "application/pdf", out.toByteArray()
            );

            when(crmLeadRepository.existsByBusinessEmailIgnoreCase(anyString())).thenReturn(false);

            CrmLeadImportPreviewResponse preview = crmLeadImportService.previewImport(file);
            assertNotNull(preview);
            assertEquals("PDF", preview.getFileType());
            // Should extract 2 leads and skip the repeated header row
            assertEquals(2, preview.getTotalRows());
            assertEquals("John Doe", preview.getPreviewRows().get(0).getFullName());
            assertEquals("Jane Smith", preview.getPreviewRows().get(1).getFullName());
        }
    }

    @Test
    @DisplayName("31. Large Dataset Performance Test (1,861 records)")
    void test31_LargeDataset1861RecordsProcessing() {
        StringBuilder csv = new StringBuilder();
        csv.append("Full Name,Business Email,Phone,Company,Industry Sector,Status\n");
        for (int i = 1; i <= 1861; i++) {
            csv.append("Lead Number ").append(i).append(",");
            csv.append("lead").append(i).append("@enterprise.com,");
            csv.append("+9198765").append(String.format("%05d", i)).append(",");
            csv.append("Company ").append(i).append(",");
            csv.append("Technology,NEW\n");
        }

        MockMultipartFile file = new MockMultipartFile(
                "file", "large_dataset_1861.csv", "text/csv", csv.toString().getBytes(StandardCharsets.UTF_8)
        );

        when(crmLeadRepository.existsByBusinessEmailIgnoreCase(anyString())).thenReturn(false);

        long start = System.currentTimeMillis();
        CrmLeadImportPreviewResponse preview = crmLeadImportService.previewImport(file);
        long duration = System.currentTimeMillis() - start;

        assertEquals(1861, preview.getTotalRows());
        assertEquals(1861, preview.getValidCount());
        assertEquals(0, preview.getInvalidCount());
        assertEquals(0, preview.getDuplicateCount());
        assertTrue(duration < 4000, "1861 rows should be parsed within 4 seconds, took: " + duration + "ms");
    }

    @Test
    @DisplayName("32. Secondary Duplicate Signals (Phone and Company+Name)")
    void test32_SecondaryDuplicatePhoneAndCompanyDetection() {
        String csv = "Full Name,Business Email,Phone,Company\n" +
                "New Lead,unique1@example.com,+919999988888,Unique Org\n" +
                "Existing Person,unique2@example.com,+911111122222,Existing Org\n";

        MockMultipartFile file = new MockMultipartFile(
                "file", "possible_dup.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8)
        );

        when(crmLeadRepository.existsByBusinessEmailIgnoreCase(anyString())).thenReturn(false);
        // Phone duplicate trigger for first row
        when(crmLeadRepository.existsByPhoneNumber("+919999988888")).thenReturn(true);
        // Company + Name duplicate trigger for second row
        when(crmLeadRepository.existsByPhoneNumber("+911111122222")).thenReturn(false);
        when(crmLeadRepository.findByFullNameIgnoreCaseAndCompanyNameIgnoreCase("Existing Person", "Existing Org"))
                .thenReturn(List.of(CrmLead.builder().id(99L).leadNumber("LEAD-99").build()));

        CrmLeadImportPreviewResponse preview = crmLeadImportService.previewImport(file);

        assertEquals(2, preview.getTotalRows());
        assertEquals(2, preview.getPossibleDuplicateCount());
        assertEquals("POSSIBLE_DUPLICATE", preview.getPreviewRows().get(0).getStatus());
        assertEquals("POSSIBLE_DUPLICATE", preview.getPreviewRows().get(1).getStatus());
        assertTrue(preview.getPreviewRows().get(0).getWarnings().get(0).contains("Phone number already exists"));
        assertTrue(preview.getPreviewRows().get(1).getWarnings().get(0).contains("Contact name and company match"));
    }

    @Test
    @DisplayName("33. Domain-Specific Fields (CSI, Contract, Renewal) Preserved in Notes")
    void test33_DomainSpecificFieldsPreservedInNotes() {
        String csv = "Full Name,Business Email,CSI Number,Contract ID,Renewal Date\n" +
                "Robert Lang,robert@domain.com,CSI-9941,CT-8820,2026-11-30\n";

        MockMultipartFile file = new MockMultipartFile(
                "file", "domain_fields.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8)
        );

        when(crmLeadRepository.existsByBusinessEmailIgnoreCase(anyString())).thenReturn(false);
        when(crmService.createLead(any(CrmLeadRequest.class), eq(testAdmin)))
                .thenAnswer(inv -> {
                    CrmLeadRequest req = inv.getArgument(0);
                    // Verify domain fields were appended into notes
                    assertNotNull(req.getNotes());
                    assertTrue(req.getNotes().contains("CSI Number: CSI-9941"));
                    assertTrue(req.getNotes().contains("Contract ID: CT-8820"));
                    assertTrue(req.getNotes().contains("Renewal Date: 2026-11-30"));
                    // Verify they were not mapped into phone or company
                    assertNull(req.getPhoneNumber());
                    assertNull(req.getCompanyName());
                    return CrmLeadResponse.builder().id(123L).build();
                });

        CrmLeadImportResultResponse result = crmLeadImportService.importLeads(file, null, testAdmin);
        assertEquals(1, result.getSuccessCount());
    }

    @Test
    @DisplayName("34. Export Converted Records as CSV and XLSX")
    void test34_ExportConvertedRecordsCsvAndXlsx() {
        CrmLeadRequest req1 = CrmLeadRequest.builder()
                .fullName("John Doe")
                .businessEmail("john@example.com")
                .companyName("Acme")
                .phoneNumber("+919876543210")
                .status(LeadStatus.NEW)
                .build();

        byte[] csvBytes = crmLeadImportService.exportConvertedRecords(List.of(req1), "CSV");
        assertNotNull(csvBytes);
        String csvStr = new String(csvBytes, StandardCharsets.UTF_8);
        assertTrue(csvStr.contains("John Doe"));
        assertTrue(csvStr.contains("john@example.com"));

        byte[] xlsxBytes = crmLeadImportService.exportConvertedRecords(List.of(req1), "XLSX");
        assertNotNull(xlsxBytes);
        assertTrue(xlsxBytes.length > 500);
    }

    @Test
    @DisplayName("35. Export Error Report")
    void test35_ExportErrorReport() {
        CrmLeadImportPreviewRow row = CrmLeadImportPreviewRow.builder()
                .rowIndex(5)
                .fullName("Invalid Person")
                .businessEmail("bad-email")
                .status("INVALID")
                .errors(List.of("Invalid business email format"))
                .build();

        byte[] errorCsv = crmLeadImportService.exportErrorReport(List.of(row));
        assertNotNull(errorCsv);
        String errorStr = new String(errorCsv, StandardCharsets.UTF_8);
        assertTrue(errorStr.contains("Invalid Person"));
        assertTrue(errorStr.contains("Invalid business email format"));
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

