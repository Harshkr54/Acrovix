package com.acrovix.admin.service;

import com.acrovix.admin.dto.crm.*;
import com.acrovix.admin.entity.*;
import com.acrovix.admin.entity.Currency;
import com.acrovix.admin.repository.CrmLeadRepository;
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
        MockMultipartFile pdfFile = new MockMultipartFile(
                "file", "document.pdf", "application/pdf", "dummy pdf content".getBytes(StandardCharsets.UTF_8)
        );

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> crmLeadImportService.previewImport(pdfFile)
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
}
