package com.acrovix.admin.service;

import com.acrovix.admin.dto.crm.*;
import com.acrovix.admin.entity.*;
import com.acrovix.admin.entity.Currency;
import com.acrovix.admin.repository.CrmLeadRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVPrinter;
import org.apache.commons.csv.CSVRecord;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CrmLeadImportService {

    private static final Logger logger = LoggerFactory.getLogger(CrmLeadImportService.class);

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");
    private static final long MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

    private final CrmLeadRepository crmLeadRepository;
    private final CrmService crmService;
    private final ObjectMapper objectMapper;

    // Supported Field Metadata Definitions
    private static final List<CrmLeadImportFieldMeta> SUPPORTED_FIELDS = List.of(
            CrmLeadImportFieldMeta.builder().key("fullName").label("Full Name").required(true).description("Lead contact full name").sampleValues(List.of("John Doe", "Rahul Sharma")).build(),
            CrmLeadImportFieldMeta.builder().key("businessEmail").label("Business Email").required(true).description("Work email address").sampleValues(List.of("john@example.com", "rahul@acme.com")).build(),
            CrmLeadImportFieldMeta.builder().key("companyName").label("Company").required(false).description("Company or organization name").sampleValues(List.of("Acme Corp", "Tech Solutions Ltd")).build(),
            CrmLeadImportFieldMeta.builder().key("phoneNumber").label("Phone").required(false).description("Contact phone number").sampleValues(List.of("+919876543210", "9876543210")).build(),
            CrmLeadImportFieldMeta.builder().key("industrySector").label("Industry Sector").required(false).description("Industry vertical").sampleValues(List.of("Technology", "Healthcare", "Finance")).build(),
            CrmLeadImportFieldMeta.builder().key("serviceRequired").label("Service Required").required(false).description("Required service or product").sampleValues(List.of("Software Development", "Cloud Migration")).build(),
            CrmLeadImportFieldMeta.builder().key("status").label("Status").required(false).description("Lead status (NEW, CONTACTED, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST)").sampleValues(List.of("NEW", "QUALIFIED")).build(),
            CrmLeadImportFieldMeta.builder().key("priority").label("Priority").required(false).description("Priority level (LOW, MEDIUM, HIGH, URGENT)").sampleValues(List.of("MEDIUM", "HIGH")).build(),
            CrmLeadImportFieldMeta.builder().key("leadSource").label("Source").required(false).description("Lead source (WEBSITE, REFERRAL, EMAIL, PHONE, WHATSAPP, LINKEDIN, ADVERTISEMENT, PARTNER, OTHER)").sampleValues(List.of("WEBSITE", "LINKEDIN")).build(),
            CrmLeadImportFieldMeta.builder().key("currency").label("Currency").required(false).description("Currency code (INR, USD, EUR, GBP, AED)").sampleValues(List.of("INR", "USD")).build(),
            CrmLeadImportFieldMeta.builder().key("estimatedValue").label("Estimated Value").required(false).description("Deal value amount").sampleValues(List.of("50000", "150000")).build(),
            CrmLeadImportFieldMeta.builder().key("expectedClosingDate").label("Expected Closing Date").required(false).description("Format: YYYY-MM-DD").sampleValues(List.of("2026-12-31")).build(),
            CrmLeadImportFieldMeta.builder().key("probability").label("Probability (%)").required(false).description("Win probability 0-100").sampleValues(List.of("75")).build(),
            CrmLeadImportFieldMeta.builder().key("notes").label("Notes").required(false).description("Additional notes or comments").sampleValues(List.of("Key enterprise prospect")).build(),
            CrmLeadImportFieldMeta.builder().key("assignedToId").label("Assigned Sales Rep ID").required(false).description("Internal User ID of assigned sales rep").sampleValues(List.of("1", "2")).build()
    );

    public List<CrmLeadImportFieldMeta> getSupportedFields() {
        return SUPPORTED_FIELDS;
    }

    /**
     * Preview endpoint logic with optional sheet selection for multi-sheet Excel files.
     */
    public CrmLeadImportPreviewResponse previewImport(MultipartFile file) {
        return previewImport(file, null);
    }

    public CrmLeadImportPreviewResponse previewImport(MultipartFile file, String sheetName) {
        String detectedFormat = inspectAndValidateFile(file);

        ParsedWorkbookResult workbookResult;
        if ("PDF".equalsIgnoreCase(detectedFormat)) {
            ParsedSheet pdfSheet = parsePdf(file);
            workbookResult = new ParsedWorkbookResult(List.of("Default"), "Default", pdfSheet.getHeaders(), pdfSheet.getRows(), pdfSheet.getSkippedRowCount());
        } else if ("CSV".equalsIgnoreCase(detectedFormat)) {
            ParsedSheet csvSheet = parseCsv(file);
            workbookResult = new ParsedWorkbookResult(List.of("Default"), "Default", csvSheet.getHeaders(), csvSheet.getRows(), csvSheet.getSkippedRowCount());
        } else {
            workbookResult = parseExcel(file, sheetName);
        }

        if (workbookResult.getHeaders().isEmpty()) {
            throw new IllegalArgumentException("The uploaded file does not contain header columns.");
        }
        if (workbookResult.getRows().isEmpty()) {
            throw new IllegalArgumentException("The uploaded sheet does not contain any data rows.");
        }

        // Generate mapping and confidence analysis
        List<CrmLeadImportColumnMappingInfo> columnMappings = analyzeColumnMappings(workbookResult.getHeaders(), workbookResult.getRows());
        Map<String, String> suggestedMapping = new LinkedHashMap<>();
        for (CrmLeadImportColumnMappingInfo info : columnMappings) {
            if (info.getSuggestedField() != null && !info.getSuggestedField().isBlank()) {
                suggestedMapping.put(info.getSourceColumn(), info.getSuggestedField());
            }
        }

        Set<String> seenEmailsInFile = new HashSet<>();
        Set<String> seenPhonesInFile = new HashSet<>();
        List<CrmLeadImportPreviewRow> previewRows = new ArrayList<>();

        int validCount = 0;
        int invalidCount = 0;
        int duplicateCount = 0;
        int possibleDuplicateCount = 0;

        for (int i = 0; i < workbookResult.getRows().size(); i++) {
            Map<String, String> rawRow = workbookResult.getRows().get(i);
            int rowIndex = i + 1; // 1-indexed data row

            // Normalize row values
            Map<String, String> normalizedRawRow = normalizeRawRow(rawRow);

            // Separate domain-specific and unmapped fields
            Map<String, String> unmappedDomainData = extractDomainSpecificFields(rawRow, suggestedMapping);

            // Map fields to CRM keys
            Map<String, String> mappedFields = mapRowFields(normalizedRawRow, suggestedMapping);
            List<String> rowErrors = new ArrayList<>();
            List<String> rowWarnings = new ArrayList<>();

            String fullName = mappedFields.getOrDefault("fullName", "").trim();
            String businessEmail = mappedFields.getOrDefault("businessEmail", "").trim();
            String companyName = mappedFields.getOrDefault("companyName", "").trim();
            String phoneNumber = mappedFields.getOrDefault("phoneNumber", "").trim();

            // 1. Required Field Validation
            if (fullName.isBlank()) {
                rowErrors.add("Full Name is required");
            }
            if (businessEmail.isBlank()) {
                rowErrors.add("Business Email is required");
            } else if (!EMAIL_PATTERN.matcher(businessEmail).matches()) {
                rowErrors.add("Invalid business email format");
            }

            // 2. Enum & Numeric Validations
            validateFieldFormats(mappedFields, rowErrors);

            // 3. Primary Duplicate Detection (Email)
            boolean isExactDuplicate = false;
            String duplicateReason = null;

            if (!businessEmail.isBlank() && EMAIL_PATTERN.matcher(businessEmail).matches()) {
                String normalizedEmail = businessEmail.toLowerCase();
                if (seenEmailsInFile.contains(normalizedEmail)) {
                    isExactDuplicate = true;
                    duplicateReason = "Duplicate email within uploaded file: " + businessEmail;
                    rowErrors.add(duplicateReason);
                } else {
                    seenEmailsInFile.add(normalizedEmail);
                    if (crmLeadRepository.existsByBusinessEmailIgnoreCase(businessEmail)) {
                        isExactDuplicate = true;
                        duplicateReason = "Duplicate lead: email already exists in system (" + businessEmail + ")";
                        rowErrors.add(duplicateReason);
                    }
                }
            }

            // 4. Secondary Duplicate Detection (Phone, Company + Name)
            boolean isPossibleDuplicate = false;
            if (!isExactDuplicate) {
                if (!phoneNumber.isBlank() && phoneNumber.length() >= 7) {
                    String cleanPhone = phoneNumber.replaceAll("[^0-9+]", "");
                    if (seenPhonesInFile.contains(cleanPhone)) {
                        isPossibleDuplicate = true;
                        String warn = "Possible duplicate: Phone number matches earlier row in file (" + phoneNumber + ")";
                        rowWarnings.add(warn);
                        duplicateReason = warn;
                    } else {
                        seenPhonesInFile.add(cleanPhone);
                        if (crmLeadRepository.existsByPhoneNumber(phoneNumber) || crmLeadRepository.existsByPhoneNumber(cleanPhone)) {
                            isPossibleDuplicate = true;
                            String warn = "Possible duplicate: Phone number already exists in CRM (" + phoneNumber + ")";
                            rowWarnings.add(warn);
                            duplicateReason = warn;
                        }
                    }
                }

                if (!isPossibleDuplicate && !companyName.isBlank() && !fullName.isBlank()) {
                    List<CrmLead> existingMatches = crmLeadRepository.findByFullNameIgnoreCaseAndCompanyNameIgnoreCase(fullName, companyName);
                    if (!existingMatches.isEmpty()) {
                        isPossibleDuplicate = true;
                        String warn = "Possible duplicate: Contact name and company match existing CRM lead #" + existingMatches.get(0).getLeadNumber();
                        rowWarnings.add(warn);
                        duplicateReason = warn;
                    }
                }
            }

            String rowStatus;
            boolean defaultIncluded = true;

            if (isExactDuplicate) {
                rowStatus = "DUPLICATE";
                duplicateCount++;
                defaultIncluded = false;
            } else if (isPossibleDuplicate) {
                rowStatus = "POSSIBLE_DUPLICATE";
                possibleDuplicateCount++;
                if (!rowErrors.isEmpty()) {
                    invalidCount++;
                } else {
                    validCount++;
                }
            } else if (!rowErrors.isEmpty()) {
                rowStatus = "INVALID";
                invalidCount++;
                defaultIncluded = false;
            } else {
                rowStatus = "VALID";
                validCount++;
            }

            previewRows.add(CrmLeadImportPreviewRow.builder()
                    .rowIndex(rowIndex)
                    .rowData(rawRow)
                    .normalizedData(normalizedRawRow)
                    .status(rowStatus)
                    .fullName(fullName)
                    .businessEmail(businessEmail)
                    .companyName(companyName)
                    .phoneNumber(phoneNumber)
                    .errors(rowErrors)
                    .warnings(rowWarnings)
                    .unmappedDomainData(unmappedDomainData)
                    .isServerDuplicate(isExactDuplicate)
                    .isPossibleDuplicate(isPossibleDuplicate)
                    .duplicateReason(duplicateReason)
                    .included(defaultIncluded)
                    .build());
        }

        return CrmLeadImportPreviewResponse.builder()
                .fileName(file.getOriginalFilename())
                .fileSize(file.getSize())
                .fileType(detectedFormat)
                .availableSheets(workbookResult.getSheetNames())
                .activeSheet(workbookResult.getActiveSheet())
                .totalRows(workbookResult.getRows().size())
                .validCount(validCount)
                .invalidCount(invalidCount)
                .duplicateCount(duplicateCount)
                .possibleDuplicateCount(possibleDuplicateCount)
                .skippedCount(workbookResult.getSkippedRowCount())
                .fileHeaders(workbookResult.getHeaders())
                .suggestedMapping(suggestedMapping)
                .columnMappings(columnMappings)
                .supportedFields(SUPPORTED_FIELDS)
                .previewRows(previewRows)
                .build();
    }

    /**
     * Import endpoint logic from file with optional mapping json.
     */
    public CrmLeadImportResultResponse importLeads(
            MultipartFile file,
            String columnMappingJson,
            AdminUser currentUser
    ) {
        String detectedFormat = inspectAndValidateFile(file);

        Map<String, String> columnMapping = parseMappingJson(columnMappingJson);
        ParsedWorkbookResult workbookResult;
        if ("PDF".equalsIgnoreCase(detectedFormat)) {
            ParsedSheet pdfSheet = parsePdf(file);
            workbookResult = new ParsedWorkbookResult(List.of("Default"), "Default", pdfSheet.getHeaders(), pdfSheet.getRows(), pdfSheet.getSkippedRowCount());
        } else if ("CSV".equalsIgnoreCase(detectedFormat)) {
            ParsedSheet csvSheet = parseCsv(file);
            workbookResult = new ParsedWorkbookResult(List.of("Default"), "Default", csvSheet.getHeaders(), csvSheet.getRows(), csvSheet.getSkippedRowCount());
        } else {
            workbookResult = parseExcel(file, null);
        }

        if (columnMapping == null || columnMapping.isEmpty()) {
            columnMapping = autoSuggestMapping(workbookResult.getHeaders());
        }

        List<CrmLeadRequest> requestsToImport = new ArrayList<>();
        for (Map<String, String> rawRow : workbookResult.getRows()) {
            Map<String, String> normalizedRaw = normalizeRawRow(rawRow);
            Map<String, String> mapped = mapRowFields(normalizedRaw, columnMapping);
            Map<String, String> domainData = extractDomainSpecificFields(rawRow, columnMapping);

            CrmLeadRequest request = buildLeadRequest(mapped, domainData);
            requestsToImport.add(request);
        }

        return importLeadRequests(requestsToImport, currentUser);
    }

    /**
     * Directly import pre-validated or user-edited CrmLeadRequest records with batching and transaction safety.
     */
    public CrmLeadImportResultResponse importLeadRequests(
            List<CrmLeadRequest> requests,
            AdminUser currentUser
    ) {
        if (requests == null || requests.isEmpty()) {
            throw new IllegalArgumentException("No lead records provided for import.");
        }
        if (requests.size() > 1000) {
            throw new IllegalArgumentException("Batch size exceeds maximum allowed limit of 1000 records.");
        }

        Set<String> seenEmailsInBatch = new HashSet<>();
        List<CrmLeadImportRowError> importErrors = new ArrayList<>();
        List<CrmLeadRequest> validRequests = new ArrayList<>();
        List<Integer> validRowIndices = new ArrayList<>();

        int duplicateCount = 0;
        int errorCount = 0;

        for (int i = 0; i < requests.size(); i++) {
            CrmLeadRequest req = requests.get(i);
            int rowIndex = i + 1;

            List<String> rowErrors = new ArrayList<>();
            String fullName = req.getFullName() != null ? req.getFullName().trim() : "";
            String businessEmail = req.getBusinessEmail() != null ? req.getBusinessEmail().trim() : "";

            if (fullName.isBlank()) {
                rowErrors.add("Full Name is required");
            }
            if (businessEmail.isBlank()) {
                rowErrors.add("Business Email is required");
            } else if (!EMAIL_PATTERN.matcher(businessEmail).matches()) {
                rowErrors.add("Invalid business email format");
            }

            if (req.getProbability() != null && (req.getProbability() < 0 || req.getProbability() > 100)) {
                rowErrors.add("Probability must be between 0 and 100");
            }
            if (req.getEstimatedValue() != null && req.getEstimatedValue().compareTo(BigDecimal.ZERO) < 0) {
                rowErrors.add("Estimated value cannot be negative");
            }

            boolean isDuplicate = false;
            if (!businessEmail.isBlank() && EMAIL_PATTERN.matcher(businessEmail).matches()) {
                String normalizedEmail = businessEmail.toLowerCase();
                if (seenEmailsInBatch.contains(normalizedEmail)) {
                    isDuplicate = true;
                    rowErrors.add("Duplicate lead within batch: " + businessEmail);
                } else {
                    seenEmailsInBatch.add(normalizedEmail);
                    if (crmLeadRepository.existsByBusinessEmailIgnoreCase(businessEmail)) {
                        isDuplicate = true;
                        rowErrors.add("Duplicate lead: email already exists in CRM (" + businessEmail + ")");
                    }
                }
            }

            if (isDuplicate) {
                duplicateCount++;
                importErrors.add(CrmLeadImportRowError.builder()
                        .rowIndex(rowIndex)
                        .fullName(fullName)
                        .businessEmail(businessEmail)
                        .errorMessage("Duplicate lead skipped: " + String.join("; ", rowErrors))
                        .build());
            } else if (!rowErrors.isEmpty()) {
                errorCount++;
                importErrors.add(CrmLeadImportRowError.builder()
                        .rowIndex(rowIndex)
                        .fullName(fullName)
                        .businessEmail(businessEmail)
                        .errorMessage(String.join("; ", rowErrors))
                        .build());
            } else {
                validRequests.add(req);
                validRowIndices.add(rowIndex);
            }
        }

        // Batch Persist Valid Records in chunks of 100
        int successCount = 0;
        int batchSize = 100;
        for (int b = 0; b < validRequests.size(); b += batchSize) {
            int end = Math.min(b + batchSize, validRequests.size());
            List<CrmLeadRequest> subBatch = validRequests.subList(b, end);
            List<Integer> subIndices = validRowIndices.subList(b, end);

            for (int j = 0; j < subBatch.size(); j++) {
                CrmLeadRequest req = subBatch.get(j);
                int rowIndex = subIndices.get(j);
                try {
                    crmService.createLead(req, currentUser);
                    successCount++;
                } catch (Exception e) {
                    logger.error("Failed to import lead at row {}: {}", rowIndex, e.getMessage());
                    errorCount++;
                    importErrors.add(CrmLeadImportRowError.builder()
                            .rowIndex(rowIndex)
                            .fullName(req.getFullName())
                            .businessEmail(req.getBusinessEmail())
                            .errorMessage("Import error: " + e.getMessage())
                            .build());
                }
            }
        }

        return CrmLeadImportResultResponse.builder()
                .totalProcessed(requests.size())
                .successCount(successCount)
                .duplicateCount(duplicateCount)
                .errorCount(errorCount)
                .errors(importErrors)
                .build();
    }

    /**
     * Generate Converted CSV or XLSX file representing normalized and reviewed records.
     */
    public byte[] exportConvertedRecords(List<CrmLeadRequest> records, String format) {
        if ("XLSX".equalsIgnoreCase(format)) {
            return generateXlsxFromRequests(records);
        } else {
            return generateCsvFromRequests(records);
        }
    }

    /**
     * Generate CSV Error Report containing rejected rows and validation failure reasons.
     */
    public byte[] exportErrorReport(List<CrmLeadImportPreviewRow> rejectedRows) {
        StringBuilder csv = new StringBuilder();
        csv.append("Row Index,Full Name,Business Email,Phone,Company,Status,Validation & Duplicate Errors\n");

        for (CrmLeadImportPreviewRow r : rejectedRows) {
            csv.append(r.getRowIndex()).append(",");
            csv.append(escapeCsv(r.getFullName())).append(",");
            csv.append(escapeCsv(r.getBusinessEmail())).append(",");
            csv.append(escapeCsv(r.getPhoneNumber())).append(",");
            csv.append(escapeCsv(r.getCompanyName())).append(",");
            csv.append(escapeCsv(r.getStatus())).append(",");
            List<String> combined = new ArrayList<>();
            if (r.getErrors() != null) combined.addAll(r.getErrors());
            if (r.getWarnings() != null) combined.addAll(r.getWarnings());
            csv.append(escapeCsv(String.join("; ", combined))).append("\n");
        }

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    /**
     * Generate CSV Template Content for Download
     */
    public byte[] generateTemplateCsv() {
        StringBuilder csv = new StringBuilder();
        csv.append("Full Name,Business Email,Phone,Company,Industry Sector,Service Required,Status,Priority,Source,Currency,Estimated Value,Expected Closing Date,Notes\n");
        csv.append("John Doe,john.doe@example.com,+919876543210,Acme Innovations,Technology,Software Development,NEW,HIGH,WEBSITE,INR,50000,2026-12-31,Key enterprise prospect\n");
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    // --- FILE INSPECTION & MAGIC BYTES VALIDATION ---

    public String inspectAndValidateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file is empty.");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File size exceeds maximum allowed limit (10MB).");
        }
        String filename = file.getOriginalFilename();
        if (filename == null || filename.isBlank()) {
            throw new IllegalArgumentException("Invalid filename.");
        }

        String lower = filename.toLowerCase();
        boolean hasExt = lower.endsWith(".csv") || lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".pdf");
        if (!hasExt) {
            throw new IllegalArgumentException("Unsupported file extension. Only CSV, XLSX, XLS, and PDF files are supported.");
        }

        // Sniff Magic Bytes
        byte[] magic = new byte[8];
        try (InputStream is = file.getInputStream()) {
            int read = is.read(magic);
            if (read < 4) {
                throw new IllegalArgumentException("Uploaded file is corrupted or too small.");
            }
        } catch (IllegalArgumentException ie) {
            throw ie;
        } catch (Exception e) {
            throw new IllegalArgumentException("Unable to read file contents: " + e.getMessage());
        }

        // Check PDF: %PDF
        if (magic[0] == 0x25 && magic[1] == 0x50 && magic[2] == 0x44 && magic[3] == 0x46) {
            if (!lower.endsWith(".pdf")) {
                throw new IllegalArgumentException("File contains PDF content but does not have a .pdf extension.");
            }
            return "PDF";
        }

        // Check ZIP / XLSX: PK\x03\x04
        if (magic[0] == 0x50 && magic[1] == 0x4B && magic[2] == 0x03 && magic[3] == 0x04) {
            if (!lower.endsWith(".xlsx")) {
                throw new IllegalArgumentException("File contains XLSX zip archive content but has mismatched extension.");
            }
            return "XLSX";
        }

        // Check OLE2 / XLS: \xD0\xCF\x11\xE0
        if ((magic[0] & 0xFF) == 0xD0 && (magic[1] & 0xFF) == 0xCF && (magic[2] & 0xFF) == 0x11 && (magic[3] & 0xFF) == 0xE0) {
            if (!lower.endsWith(".xls") && !lower.endsWith(".xlsx")) {
                throw new IllegalArgumentException("File contains Excel binary format content but has mismatched extension.");
            }
            return "XLS";
        }

        // If user declared XLSX or PDF but magic bytes mismatch
        if (lower.endsWith(".pdf")) {
            throw new IllegalArgumentException("File has .pdf extension but does not contain valid PDF header (%PDF).");
        }
        if (lower.endsWith(".xlsx")) {
            throw new IllegalArgumentException("Failed to parse Excel sheet. Ensure file is not corrupted: Invalid ZIP stream");
        }

        if (lower.endsWith(".csv")) {
            return "CSV";
        } else if (lower.endsWith(".xls")) {
            return "XLS";
        }

        return "CSV";
    }

    // --- SPREADSHEET PARSING (MULTI-SHEET & HEADER DETECTION) ---

    private ParsedWorkbookResult parseExcel(MultipartFile file, String requestedSheetName) {
        List<String> sheetNames = new ArrayList<>();
        String activeSheetName = "Sheet1";
        List<String> headers = new ArrayList<>();
        List<Map<String, String>> rows = new ArrayList<>();
        int skippedRowCount = 0;

        try (InputStream is = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(is)) {

            int numberOfSheets = workbook.getNumberOfSheets();
            if (numberOfSheets == 0) {
                throw new IllegalArgumentException("The uploaded spreadsheet contains no worksheets.");
            }

            for (int s = 0; s < numberOfSheets; s++) {
                sheetNames.add(workbook.getSheetName(s));
            }

            Sheet sheet = null;
            if (requestedSheetName != null && !requestedSheetName.isBlank()) {
                sheet = workbook.getSheet(requestedSheetName);
            }
            if (sheet == null) {
                sheet = workbook.getSheetAt(0);
                activeSheetName = sheetNames.get(0);
            } else {
                activeSheetName = sheet.getSheetName();
            }

            if (sheet.getPhysicalNumberOfRows() == 0) {
                throw new IllegalArgumentException("Worksheet '" + activeSheetName + "' is empty.");
            }

            DataFormatter formatter = new DataFormatter();

            // Detect Header Row within first 10 rows
            int headerRowIndex = 0;
            int maxScore = -1;

            int limit = Math.min(sheet.getLastRowNum(), 10);
            for (int r = 0; r <= limit; r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;

                int score = 0;
                int nonBlankCount = 0;
                int lastCell = row.getLastCellNum();
                for (int c = 0; c < lastCell; c++) {
                    Cell cell = row.getCell(c);
                    String val = cell != null ? formatter.formatCellValue(cell).trim() : "";
                    if (!val.isBlank()) {
                        nonBlankCount++;
                        if (isRecognizedHeader(val)) {
                            score += 5;
                        } else {
                            score += 1;
                        }
                    }
                }

                if (nonBlankCount >= 2 && score > maxScore) {
                    maxScore = score;
                    headerRowIndex = r;
                }
            }

            skippedRowCount = headerRowIndex;
            Row headerRow = sheet.getRow(headerRowIndex);
            if (headerRow == null) {
                throw new IllegalArgumentException("Spreadsheet contains no header row.");
            }

            int lastCellNum = headerRow.getLastCellNum();
            for (int c = 0; c < lastCellNum; c++) {
                Cell cell = headerRow.getCell(c);
                String val = cell != null ? formatter.formatCellValue(cell).trim() : "";
                if (!val.isBlank()) {
                    headers.add(val);
                } else {
                    headers.add("Column_" + (c + 1));
                }
            }

            for (int r = headerRowIndex + 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;

                Map<String, String> rowMap = new LinkedHashMap<>();
                boolean emptyRow = true;

                for (int c = 0; c < headers.size(); c++) {
                    Cell cell = row.getCell(c);
                    String val = cell != null ? formatter.formatCellValue(cell).trim() : "";
                    if (!val.isBlank()) emptyRow = false;
                    rowMap.put(headers.get(c), val);
                }

                if (!emptyRow) {
                    rows.add(rowMap);
                } else {
                    skippedRowCount++;
                }
            }

        } catch (IllegalArgumentException ie) {
            throw ie;
        } catch (Exception e) {
            logger.error("Excel parse failure", e);
            throw new IllegalArgumentException("Failed to parse Excel sheet. Ensure file is not corrupted: " + e.getMessage());
        }

        return new ParsedWorkbookResult(sheetNames, activeSheetName, headers, rows, skippedRowCount);
    }

    private ParsedSheet parseCsv(MultipartFile file) {
        List<String> headers = new ArrayList<>();
        List<Map<String, String>> rows = new ArrayList<>();
        int skippedRows = 0;

        try (InputStream is = file.getInputStream();
             InputStreamReader reader = new InputStreamReader(is, StandardCharsets.UTF_8);
             CSVParser parser = CSVFormat.DEFAULT.builder()
                     .setHeader()
                     .setSkipHeaderRecord(true)
                     .setIgnoreHeaderCase(true)
                     .setTrim(true)
                     .build().parse(reader)) {

            headers = new ArrayList<>(parser.getHeaderNames());
            headers = headers.stream().filter(h -> h != null && !h.isBlank()).collect(Collectors.toList());

            for (CSVRecord record : parser) {
                Map<String, String> row = new LinkedHashMap<>();
                boolean emptyRow = true;
                for (String h : headers) {
                    String val = record.isMapped(h) ? record.get(h) : "";
                    if (val != null && !val.isBlank()) emptyRow = false;
                    row.put(h, val != null ? val.trim() : "");
                }
                if (!emptyRow) {
                    rows.add(row);
                } else {
                    skippedRows++;
                }
            }
        } catch (Exception e) {
            logger.error("CSV parse failure", e);
            throw new IllegalArgumentException("Failed to parse CSV file: " + e.getMessage());
        }

        return new ParsedSheet(headers, rows, skippedRows);
    }

    // --- PDF PARSING (MULTI-PAGE & REPEATED HEADERS) ---

    private ParsedSheet parsePdf(MultipartFile file) {
        String pdfText = "";
        try (InputStream is = file.getInputStream();
             PDDocument document = PDDocument.load(is)) {

            if (document.isEncrypted()) {
                throw new IllegalArgumentException("Password-protected PDF files cannot be read. Please unlock the file first.");
            }

            // 1. Try positional table extraction first
            try {
                PositionAwarePdfStripper positionStripper = new PositionAwarePdfStripper();
                positionStripper.getText(document);
                List<PdfTextChunk> chunks = positionStripper.getChunks();

                ParsedSheet positionalSheet = extractTableFromPdfChunks(chunks);
                if (positionalSheet != null && positionalSheet.getRows() != null && !positionalSheet.getRows().isEmpty()) {
                    return positionalSheet;
                }
            } catch (Exception e) {
                logger.warn("Positional PDF table extraction failed, falling back to text stripper: {}", e.getMessage());
            }

            // 2. Fallback to standard PDFTextStripper text extraction
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            pdfText = stripper.getText(document);

        } catch (IllegalArgumentException ie) {
            throw ie;
        } catch (InvalidPasswordException e) {
            throw new IllegalArgumentException("Password-protected PDF files cannot be read. Please unlock the file first.");
        } catch (Exception e) {
            logger.error("PDF parse failure", e);
            throw new IllegalArgumentException("Failed to read PDF file. Ensure file is not corrupted: " + e.getMessage());
        }

        if (pdfText == null || pdfText.trim().isEmpty() || pdfText.replaceAll("\\s+", "").length() < 10) {
            throw new IllegalArgumentException("This PDF appears to be scanned or image-only. Please upload a text-based PDF or use an OCR-enabled document.");
        }

        return extractLeadRecordsFromPdfText(pdfText);
    }

    private ParsedSheet extractTableFromPdfChunks(List<PdfTextChunk> chunks) {
        if (chunks == null || chunks.isEmpty()) return null;

        Map<Integer, List<PdfTextChunk>> chunksByPage = new TreeMap<>();
        for (PdfTextChunk c : chunks) {
            chunksByPage.computeIfAbsent(c.getPageNum(), k -> new ArrayList<>()).add(c);
        }

        List<HeaderColumnDef> columnDefs = null;
        int headerPage = -1;
        float headerY = -1.0f;

        for (Map.Entry<Integer, List<PdfTextChunk>> entry : chunksByPage.entrySet()) {
            int pageNum = entry.getKey();
            List<PdfTextChunk> pageChunks = entry.getValue();

            List<List<PdfTextChunk>> pageLines = groupChunksIntoLines(pageChunks, 4.0f);
            for (List<PdfTextChunk> line : pageLines) {
                List<HeaderColumnDef> detected = detectHeaderRow(line);
                if (detected != null && detected.size() >= 2) {
                    columnDefs = detected;
                    headerPage = pageNum;
                    float maxY = 0f;
                    for (PdfTextChunk c : line) {
                        if (c.getY() > maxY) maxY = c.getY();
                    }
                    headerY = maxY;
                    break;
                }
            }
            if (columnDefs != null) break;
        }

        if (columnDefs == null || columnDefs.isEmpty()) return null;

        calculateColumnBoundaries(columnDefs);
        List<String> headers = columnDefs.stream().map(HeaderColumnDef::getName).collect(Collectors.toList());

        List<PdfTextChunk> dataChunks = new ArrayList<>();
        int skippedRepeatedHeaders = 0;

        for (Map.Entry<Integer, List<PdfTextChunk>> entry : chunksByPage.entrySet()) {
            int pageNum = entry.getKey();
            List<PdfTextChunk> pageChunks = entry.getValue();

            // Detect repeated headers on subsequent pages
            List<List<PdfTextChunk>> pageLines = groupChunksIntoLines(pageChunks, 4.0f);
            float repeatedHeaderY = -1.0f;

            if (pageNum > headerPage) {
                for (List<PdfTextChunk> line : pageLines) {
                    List<HeaderColumnDef> repHeader = detectHeaderRow(line);
                    if (repHeader != null && repHeader.size() >= 2) {
                        for (PdfTextChunk c : line) {
                            if (c.getY() > repeatedHeaderY) repeatedHeaderY = c.getY();
                        }
                        skippedRepeatedHeaders++;
                        break;
                    }
                }
            }

            for (PdfTextChunk c : pageChunks) {
                if (pageNum < headerPage) continue;
                if (pageNum == headerPage && c.getY() <= headerY + 2.0f) continue;
                if (repeatedHeaderY > 0 && c.getY() <= repeatedHeaderY + 2.0f) continue;
                if (isFooterOrHeaderNoise(c.getText())) continue;
                dataChunks.add(c);
            }
        }

        if (dataChunks.isEmpty()) return null;

        dataChunks.sort((a, b) -> {
            if (a.getPageNum() != b.getPageNum()) return Integer.compare(a.getPageNum(), b.getPageNum());
            if (Math.abs(a.getY() - b.getY()) > 3.0f) return Float.compare(a.getY(), b.getY());
            return Float.compare(a.getX(), b.getX());
        });

        List<Map<String, String>> rows = new ArrayList<>();
        Map<String, List<PdfTextChunk>> currentCellChunks = new LinkedHashMap<>();
        for (HeaderColumnDef col : columnDefs) {
            currentCellChunks.put(col.getName(), new ArrayList<>());
        }

        float currentY = -1.0f;
        int currentLinePage = -1;

        for (PdfTextChunk chunk : dataChunks) {
            int colIdx = getMatchingColumnIndex(chunk.getX(), columnDefs);
            if (colIdx == -1) continue;

            HeaderColumnDef colDef = columnDefs.get(colIdx);
            boolean isNewRow = false;

            if (currentY < 0) {
                isNewRow = false;
            } else if (chunk.getPageNum() != currentLinePage) {
                isNewRow = true;
            } else if (chunk.getY() - currentY > 5.0f && colIdx <= 2) {
                isNewRow = true;
            } else if (chunk.getY() - currentY > 16.0f) {
                isNewRow = true;
            }

            if (isNewRow) {
                Map<String, String> rowMap = flushRow(columnDefs, currentCellChunks);
                if (hasMeaningfulContent(rowMap)) {
                    rows.add(rowMap);
                }
                for (HeaderColumnDef c : columnDefs) {
                    currentCellChunks.get(c.getName()).clear();
                }
            }

            currentCellChunks.get(colDef.getName()).add(chunk);
            currentY = chunk.getY();
            currentLinePage = chunk.getPageNum();
        }

        Map<String, String> lastRowMap = flushRow(columnDefs, currentCellChunks);
        if (hasMeaningfulContent(lastRowMap)) {
            rows.add(lastRowMap);
        }

        if (rows.isEmpty()) return null;
        return new ParsedSheet(headers, rows, skippedRepeatedHeaders);
    }

    private ParsedSheet extractLeadRecordsFromPdfText(String pdfText) {
        String[] rawLines = pdfText.split("\\r?\\n");
        List<String> lines = new ArrayList<>();
        for (String line : rawLines) {
            if (line != null && !line.trim().isEmpty()) {
                lines.add(line.trim());
            }
        }

        if (lines.isEmpty()) {
            throw new IllegalArgumentException("No readable text lines found in PDF.");
        }

        List<String> headers = new ArrayList<>();
        List<Map<String, String>> rows = new ArrayList<>();

        // Check for table header line
        int headerLineIndex = -1;
        for (int i = 0; i < Math.min(lines.size(), 15); i++) {
            String l = lines.get(i).toLowerCase();
            if ((l.contains("name") || l.contains("lead") || l.contains("contact")) &&
                    (l.contains("email") || l.contains("mail") || l.contains("phone") || l.contains("company"))) {
                headerLineIndex = i;
                break;
            }
        }

        if (headerLineIndex != -1) {
            String headerLine = lines.get(headerLineIndex);
            String delimiter = detectDelimiter(headerLine);
            String[] rawHeaders = headerLine.split(delimiter);

            for (String h : rawHeaders) {
                String trimmed = h.trim();
                if (!trimmed.isEmpty()) {
                    headers.add(trimmed);
                }
            }

            for (int i = headerLineIndex + 1; i < lines.size(); i++) {
                String line = lines.get(i);
                if (isFooterOrHeaderNoise(line)) continue;

                String[] parts = line.split(delimiter);
                Map<String, String> rowMap = new LinkedHashMap<>();
                boolean hasContent = false;
                for (int c = 0; c < headers.size(); c++) {
                    String val = (c < parts.length && parts[c] != null) ? parts[c].trim() : "";
                    if (!val.isEmpty()) hasContent = true;
                    rowMap.put(headers.get(c), val);
                }

                if (hasContent) {
                    rows.add(rowMap);
                }
            }
        }

        // Fallback: Regex email matching
        if (rows.isEmpty()) {
            headers = List.of("Full Name", "Business Email", "Phone", "Company", "Notes");
            for (String line : lines) {
                Matcher emailMatcher = EMAIL_PATTERN.matcher(line);
                if (emailMatcher.find()) {
                    String email = emailMatcher.group();
                    String remaining = line.replace(email, "").trim();

                    String phone = "";
                    Matcher phoneMatcher = Pattern.compile("\\+?[0-9]{10,12}").matcher(remaining);
                    if (phoneMatcher.find()) {
                        phone = phoneMatcher.group();
                        remaining = remaining.replace(phone, "").trim();
                    }

                    String[] parts = remaining.split("[,|\\t]|\\s{2,}");
                    String name = parts.length > 0 ? parts[0].trim() : "Lead Record";
                    String company = parts.length > 1 ? parts[1].trim() : "";

                    Map<String, String> rowMap = new LinkedHashMap<>();
                    rowMap.put("Full Name", name.isBlank() ? "Lead Record" : name);
                    rowMap.put("Business Email", email);
                    rowMap.put("Phone", phone);
                    rowMap.put("Company", company);
                    rowMap.put("Notes", remaining);
                    rows.add(rowMap);
                }
            }
        }

        if (rows.isEmpty()) {
            throw new IllegalArgumentException("No recognizable lead records found in this PDF.");
        }

        return new ParsedSheet(headers, rows, 0);
    }

    // --- DATA NORMALIZATION & RECOVERY ---

    private Map<String, String> normalizeRawRow(Map<String, String> rawRow) {
        Map<String, String> normalized = new LinkedHashMap<>();
        for (Map.Entry<String, String> entry : rawRow.entrySet()) {
            String key = entry.getKey();
            String rawVal = entry.getValue();
            if (rawVal == null) {
                normalized.put(key, "");
                continue;
            }

            String clean = normalizeWhitespace(rawVal);
            String normKey = key.toLowerCase().replaceAll("[^a-z]", "");

            if (normKey.contains("email") || normKey.contains("mail")) {
                clean = normalizeEmail(clean);
            } else if (normKey.contains("phone") || normKey.contains("mobile") || normKey.contains("tel") || normKey.contains("contactno")) {
                clean = normalizePhone(clean);
            } else if (normKey.contains("date") || normKey.contains("closing")) {
                clean = normalizeDate(clean);
            }

            normalized.put(key, clean);
        }
        return normalized;
    }

    private String normalizeWhitespace(String val) {
        if (val == null) return "";
        return val.replaceAll("[\\r\\n\\t]+", " ").replaceAll("\\s{2,}", " ").trim();
    }

    private String normalizeEmail(String val) {
        if (val == null) return "";
        String clean = normalizeWhitespace(val).toLowerCase();
        // Strip trailing punctuation
        clean = clean.replaceAll("[.,;:>]+$", "");
        return clean;
    }

    private String normalizePhone(String val) {
        if (val == null) return "";
        String clean = normalizeWhitespace(val);
        // Retain leading +, strip invalid characters
        boolean hasPlus = clean.startsWith("+");
        String digits = clean.replaceAll("[^0-9]", "");
        if (digits.isEmpty()) return "";
        return hasPlus ? "+" + digits : digits;
    }

    private String normalizeDate(String val) {
        if (val == null || val.isBlank()) return "";
        String clean = normalizeWhitespace(val);
        LocalDate parsed = parseLocalDate(clean);
        return parsed != null ? parsed.format(DateTimeFormatter.ISO_LOCAL_DATE) : clean;
    }

    // --- DOMAIN FIELD EXTRACTION (CSI, CONTRACT, RENEWAL, ETC.) ---

    private Map<String, String> extractDomainSpecificFields(Map<String, String> rawRow, Map<String, String> columnMapping) {
        Map<String, String> domainData = new LinkedHashMap<>();
        for (Map.Entry<String, String> entry : rawRow.entrySet()) {
            String colName = entry.getKey();
            String value = entry.getValue();
            if (value == null || value.isBlank()) continue;

            String norm = colName.toLowerCase().replaceAll("[^a-z0-9]", "");
            boolean isDomainSpecific = norm.contains("csi") || norm.contains("contract") || norm.contains("renewal")
                    || norm.contains("license") || norm.contains("provider") || norm.contains("policy")
                    || norm.contains("accountno") || norm.contains("agreement");

            String mappedTarget = columnMapping.get(colName);
            // If domain specific or unmapped non-lead field
            if (isDomainSpecific || (mappedTarget == null && norm.length() > 2 && !norm.startsWith("col"))) {
                domainData.put(colName, value.trim());
            }
        }
        return domainData;
    }

    // --- SMART FIELD MAPPING & CONFIDENCE ANALYSIS ---

    private List<CrmLeadImportColumnMappingInfo> analyzeColumnMappings(List<String> headers, List<Map<String, String>> rows) {
        List<CrmLeadImportColumnMappingInfo> mappingInfos = new ArrayList<>();

        for (String header : headers) {
            String norm = header.toLowerCase().replaceAll("[^a-z0-9]", "");

            // Sample value
            String sample = "";
            for (Map<String, String> r : rows) {
                String v = r.get(header);
                if (v != null && !v.isBlank()) {
                    sample = v.trim();
                    break;
                }
            }

            // Check for domain specific fields first (CSI, Contract, Renewal)
            boolean isDomain = norm.contains("csi") || norm.contains("contract") || norm.contains("renewal")
                    || norm.contains("license") || norm.contains("provider") || norm.contains("policy")
                    || norm.contains("agreement");

            if (isDomain) {
                mappingInfos.add(CrmLeadImportColumnMappingInfo.builder()
                        .sourceColumn(header)
                        .suggestedField(null)
                        .sampleValue(sample)
                        .confidence("DOMAIN_FIELD")
                        .confidenceScore(90)
                        .domainSpecific(true)
                        .description("Domain-specific business identifier (Preserved in Lead Notes)")
                        .build());
                continue;
            }

            String suggestedField = null;
            String confidence = "UNMAPPED";
            int score = 0;
            String desc = "Unmapped source column";

            if (norm.equals("fullname") || norm.equals("leadname") || norm.equals("clientname") || norm.equals("contactname")) {
                suggestedField = "fullName";
                confidence = "HIGH";
                score = 98;
                desc = "Matched primary contact name";
            } else if (norm.equals("name") || norm.equals("contact") || norm.equals("person")) {
                suggestedField = "fullName";
                confidence = "MEDIUM";
                score = 80;
                desc = "Probable contact person name";
            } else if (norm.equals("businessemail") || norm.equals("email") || norm.equals("emailaddress") || norm.equals("workemail") || norm.equals("mail") || norm.contains("email")) {
                suggestedField = "businessEmail";
                confidence = "HIGH";
                score = 98;
                desc = "Work email address";
            } else if (norm.equals("company") || norm.equals("companyname") || norm.equals("organization") || norm.equals("firm") || norm.contains("company")) {
                suggestedField = "companyName";
                confidence = "HIGH";
                score = 95;
                desc = "Organization or company name";
            } else if (norm.equals("phone") || norm.equals("phonenumber") || norm.equals("mobile") || norm.equals("mobilenumber") || norm.contains("phone") || norm.contains("mobile") || norm.equals("contactnumber") || norm.equals("tel")) {
                suggestedField = "phoneNumber";
                confidence = "HIGH";
                score = 95;
                desc = "Telephone or mobile number";
            } else if (norm.equals("industry") || norm.equals("industrysector") || norm.equals("sector")) {
                suggestedField = "industrySector";
                confidence = "HIGH";
                score = 90;
                desc = "Industry sector";
            } else if (norm.equals("service") || norm.equals("servicerequired") || norm.equals("services") || norm.equals("requirement")) {
                suggestedField = "serviceRequired";
                confidence = "HIGH";
                score = 90;
                desc = "Required service or solution";
            } else if (norm.equals("status") || norm.equals("leadstatus")) {
                suggestedField = "status";
                confidence = "HIGH";
                score = 90;
                desc = "Lead status";
            } else if (norm.equals("priority") || norm.equals("leadpriority")) {
                suggestedField = "priority";
                confidence = "HIGH";
                score = 90;
                desc = "Lead priority";
            } else if (norm.equals("source") || norm.equals("leadsource")) {
                suggestedField = "leadSource";
                confidence = "HIGH";
                score = 90;
                desc = "Acquisition source";
            } else if (norm.equals("currency")) {
                suggestedField = "currency";
                confidence = "HIGH";
                score = 90;
                desc = "Deal currency";
            } else if (norm.equals("estimatedvalue") || norm.equals("value") || norm.equals("amount") || norm.equals("dealvalue")) {
                suggestedField = "estimatedValue";
                confidence = "HIGH";
                score = 90;
                desc = "Estimated deal value";
            } else if (norm.equals("expectedclosingdate") || norm.equals("closingdate") || norm.equals("targetdate")) {
                suggestedField = "expectedClosingDate";
                confidence = "HIGH";
                score = 90;
                desc = "Target closing date";
            } else if (norm.equals("probability") || norm.equals("winprobability")) {
                suggestedField = "probability";
                confidence = "HIGH";
                score = 90;
                desc = "Win probability";
            } else if (norm.equals("notes") || norm.equals("comment") || norm.equals("remarks") || norm.equals("city") || norm.equals("location") || norm.equals("address") || norm.equals("website")) {
                suggestedField = "notes";
                confidence = "MEDIUM";
                score = 75;
                desc = "Appended to lead notes";
            } else if (norm.equals("assignedto") || norm.equals("assignedtoid") || norm.equals("salesrep") || norm.equals("salesrepid")) {
                suggestedField = "assignedToId";
                confidence = "HIGH";
                score = 85;
                desc = "Assigned sales rep identifier";
            }

            mappingInfos.add(CrmLeadImportColumnMappingInfo.builder()
                    .sourceColumn(header)
                    .suggestedField(suggestedField)
                    .sampleValue(sample)
                    .confidence(confidence)
                    .confidenceScore(score)
                    .domainSpecific(false)
                    .description(desc)
                    .build());
        }

        return mappingInfos;
    }

    private Map<String, String> autoSuggestMapping(List<String> headers) {
        Map<String, String> mapping = new LinkedHashMap<>();
        for (String header : headers) {
            String norm = header.toLowerCase().replaceAll("[^a-z0-9]", "");

            // Ignore domain-specific fields from false mapping
            if (norm.contains("csi") || norm.contains("contract") || norm.contains("renewal") || norm.contains("license") || norm.contains("provider")) {
                continue;
            }

            if (norm.equals("fullname") || norm.equals("name") || norm.equals("leadname") || norm.equals("clientname") || norm.contains("contactname") || norm.equals("contact")) {
                mapping.put(header, "fullName");
            } else if (norm.equals("businessemail") || norm.equals("email") || norm.equals("emailaddress") || norm.equals("workemail") || norm.equals("mail") || norm.contains("email")) {
                mapping.put(header, "businessEmail");
            } else if (norm.equals("company") || norm.equals("companyname") || norm.equals("organization") || norm.equals("firm") || norm.contains("company")) {
                mapping.put(header, "companyName");
            } else if (norm.equals("phone") || norm.equals("phonenumber") || norm.equals("mobile") || norm.equals("mobilenumber") || norm.contains("phone") || norm.contains("mobile") || norm.equals("contactnumber") || norm.equals("tel")) {
                mapping.put(header, "phoneNumber");
            } else if (norm.equals("industry") || norm.equals("industrysector") || norm.equals("sector")) {
                mapping.put(header, "industrySector");
            } else if (norm.equals("service") || norm.equals("servicerequired") || norm.equals("services") || norm.equals("requirement")) {
                mapping.put(header, "serviceRequired");
            } else if (norm.equals("status") || norm.equals("leadstatus")) {
                mapping.put(header, "status");
            } else if (norm.equals("priority") || norm.equals("leadpriority")) {
                mapping.put(header, "priority");
            } else if (norm.equals("source") || norm.equals("leadsource")) {
                mapping.put(header, "leadSource");
            } else if (norm.equals("currency")) {
                mapping.put(header, "currency");
            } else if (norm.equals("estimatedvalue") || norm.equals("value") || norm.equals("amount") || norm.equals("dealvalue")) {
                mapping.put(header, "estimatedValue");
            } else if (norm.equals("expectedclosingdate") || norm.equals("closingdate") || norm.equals("targetdate")) {
                mapping.put(header, "expectedClosingDate");
            } else if (norm.equals("probability") || norm.equals("winprobability")) {
                mapping.put(header, "probability");
            } else if (norm.equals("notes") || norm.equals("comment") || norm.equals("remarks") || norm.equals("city") || norm.equals("location") || norm.equals("address")) {
                mapping.put(header, "notes");
            } else if (norm.equals("assignedto") || norm.equals("assignedtoid") || norm.equals("salesrep") || norm.equals("salesrepid")) {
                mapping.put(header, "assignedToId");
            }
        }
        return mapping;
    }

    private Map<String, String> mapRowFields(Map<String, String> rawRow, Map<String, String> columnMapping) {
        Map<String, String> result = new HashMap<>();
        if (columnMapping == null) return result;

        for (Map.Entry<String, String> entry : columnMapping.entrySet()) {
            String fileHeader = entry.getKey();
            String targetKey = entry.getValue();

            if (targetKey != null && !targetKey.isBlank() && rawRow.containsKey(fileHeader)) {
                result.put(targetKey, rawRow.get(fileHeader));
            }
        }
        return result;
    }

    private void validateFieldFormats(Map<String, String> fields, List<String> errors) {
        // Status enum check
        String statusStr = fields.get("status");
        if (statusStr != null && !statusStr.isBlank()) {
            try {
                LeadStatus.valueOf(statusStr.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                errors.add("Invalid status: '" + statusStr + "'. Allowed: NEW, CONTACTED, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST");
            }
        }

        // Priority enum check
        String priorityStr = fields.get("priority");
        if (priorityStr != null && !priorityStr.isBlank()) {
            try {
                LeadPriority.valueOf(priorityStr.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                errors.add("Invalid priority: '" + priorityStr + "'. Allowed: LOW, MEDIUM, HIGH, URGENT");
            }
        }

        // LeadSource enum check
        String sourceStr = fields.get("leadSource");
        if (sourceStr != null && !sourceStr.isBlank()) {
            try {
                LeadSource.valueOf(sourceStr.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                errors.add("Invalid lead source: '" + sourceStr + "'. Allowed: WEBSITE, REFERRAL, EMAIL, PHONE, WHATSAPP, LINKEDIN, ADVERTISEMENT, PARTNER, OTHER");
            }
        }

        // Currency enum check
        String currStr = fields.get("currency");
        if (currStr != null && !currStr.isBlank()) {
            try {
                Currency.valueOf(currStr.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                errors.add("Invalid currency: '" + currStr + "'. Allowed: INR, USD, EUR, GBP, AED");
            }
        }

        // Estimated Value check
        String valStr = fields.get("estimatedValue");
        if (valStr != null && !valStr.isBlank()) {
            try {
                new BigDecimal(valStr.trim().replaceAll("[^0-9.]", ""));
            } catch (Exception e) {
                errors.add("Invalid estimated value: '" + valStr + "'");
            }
        }

        // Expected Closing Date check
        String dateStr = fields.get("expectedClosingDate");
        if (dateStr != null && !dateStr.isBlank()) {
            try {
                if (parseLocalDate(dateStr.trim()) == null) {
                    errors.add("Invalid expected closing date: '" + dateStr + "'. Expected format: YYYY-MM-DD");
                }
            } catch (Exception e) {
                errors.add("Invalid expected closing date: '" + dateStr + "'. Expected format: YYYY-MM-DD");
            }
        }

        // Probability check
        String probStr = fields.get("probability");
        if (probStr != null && !probStr.isBlank()) {
            try {
                int prob = Integer.parseInt(probStr.trim());
                if (prob < 0 || prob > 100) {
                    errors.add("Probability must be between 0 and 100");
                }
            } catch (Exception e) {
                errors.add("Invalid probability value: '" + probStr + "'");
            }
        }

        // Assigned To ID check
        String assignedStr = fields.get("assignedToId");
        if (assignedStr != null && !assignedStr.isBlank()) {
            try {
                Long.parseLong(assignedStr.trim());
            } catch (Exception e) {
                errors.add("Invalid sales rep ID: '" + assignedStr + "'");
            }
        }
    }

    private CrmLeadRequest buildLeadRequest(Map<String, String> fields, Map<String, String> domainData) {
        LeadStatus status = LeadStatus.NEW;
        if (fields.containsKey("status") && !fields.get("status").isBlank()) {
            status = LeadStatus.valueOf(fields.get("status").trim().toUpperCase());
        }

        LeadPriority priority = LeadPriority.MEDIUM;
        if (fields.containsKey("priority") && !fields.get("priority").isBlank()) {
            priority = LeadPriority.valueOf(fields.get("priority").trim().toUpperCase());
        }

        LeadSource source = LeadSource.WEBSITE;
        if (fields.containsKey("leadSource") && !fields.get("leadSource").isBlank()) {
            source = LeadSource.valueOf(fields.get("leadSource").trim().toUpperCase());
        }

        Currency currency = Currency.INR;
        if (fields.containsKey("currency") && !fields.get("currency").isBlank()) {
            currency = Currency.valueOf(fields.get("currency").trim().toUpperCase());
        }

        BigDecimal estValue = null;
        if (fields.containsKey("estimatedValue") && !fields.get("estimatedValue").isBlank()) {
            estValue = new BigDecimal(fields.get("estimatedValue").trim().replaceAll("[^0-9.]", ""));
        }

        LocalDate closingDate = null;
        if (fields.containsKey("expectedClosingDate") && !fields.get("expectedClosingDate").isBlank()) {
            closingDate = parseLocalDate(fields.get("expectedClosingDate").trim());
        }

        Integer probability = null;
        if (fields.containsKey("probability") && !fields.get("probability").isBlank()) {
            probability = Integer.parseInt(fields.get("probability").trim());
        }

        Long assignedToId = null;
        if (fields.containsKey("assignedToId") && !fields.get("assignedToId").isBlank()) {
            assignedToId = Long.parseLong(fields.get("assignedToId").trim());
        }

        // Build combined notes with domain-specific metadata preserved
        StringBuilder notesBuilder = new StringBuilder();
        if (fields.containsKey("notes") && fields.get("notes") != null && !fields.get("notes").isBlank()) {
            notesBuilder.append(fields.get("notes").trim());
        }
        if (domainData != null && !domainData.isEmpty()) {
            for (Map.Entry<String, String> entry : domainData.entrySet()) {
                if (notesBuilder.length() > 0) notesBuilder.append(" | ");
                notesBuilder.append(entry.getKey()).append(": ").append(entry.getValue());
            }
        }

        return CrmLeadRequest.builder()
                .fullName(fields.get("fullName").trim())
                .businessEmail(fields.get("businessEmail").trim())
                .companyName(fields.get("companyName") != null ? fields.get("companyName").trim() : null)
                .phoneNumber(fields.get("phoneNumber") != null ? fields.get("phoneNumber").trim() : null)
                .industrySector(fields.get("industrySector") != null ? fields.get("industrySector").trim() : null)
                .serviceRequired(fields.get("serviceRequired") != null ? fields.get("serviceRequired").trim() : null)
                .status(status)
                .priority(priority)
                .leadSource(source)
                .currency(currency)
                .estimatedValue(estValue)
                .expectedClosingDate(closingDate)
                .probability(probability)
                .notes(notesBuilder.length() > 0 ? notesBuilder.toString() : null)
                .assignedToId(assignedToId)
                .build();
    }

    private LocalDate parseLocalDate(String str) {
        if (str == null || str.isBlank()) return null;
        try {
            return LocalDate.parse(str, DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (Exception e1) {
            try {
                return LocalDate.parse(str, DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            } catch (Exception e2) {
                try {
                    return LocalDate.parse(str, DateTimeFormatter.ofPattern("MM/dd/yyyy"));
                } catch (Exception e3) {
                    try {
                        return LocalDate.parse(str, DateTimeFormatter.ofPattern("dd-MM-yyyy"));
                    } catch (Exception e4) {
                        return null;
                    }
                }
            }
        }
    }

    private Map<String, String> parseMappingJson(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, String>>() {});
        } catch (Exception e) {
            logger.warn("Failed to parse columnMapping JSON: {}", e.getMessage());
            return null;
        }
    }

    private byte[] generateCsvFromRequests(List<CrmLeadRequest> records) {
        StringBuilder csv = new StringBuilder();
        csv.append("Full Name,Business Email,Company,Phone,Industry Sector,Service Required,Status,Priority,Lead Source,Currency,Estimated Value,Expected Closing Date,Probability,Notes\n");
        for (CrmLeadRequest r : records) {
            csv.append(escapeCsv(r.getFullName())).append(",");
            csv.append(escapeCsv(r.getBusinessEmail())).append(",");
            csv.append(escapeCsv(r.getCompanyName())).append(",");
            csv.append(escapeCsv(r.getPhoneNumber())).append(",");
            csv.append(escapeCsv(r.getIndustrySector())).append(",");
            csv.append(escapeCsv(r.getServiceRequired())).append(",");
            csv.append(r.getStatus() != null ? r.getStatus().name() : "NEW").append(",");
            csv.append(r.getPriority() != null ? r.getPriority().name() : "MEDIUM").append(",");
            csv.append(r.getLeadSource() != null ? r.getLeadSource().name() : "WEBSITE").append(",");
            csv.append(r.getCurrency() != null ? r.getCurrency().name() : "INR").append(",");
            csv.append(r.getEstimatedValue() != null ? r.getEstimatedValue().toString() : "").append(",");
            csv.append(r.getExpectedClosingDate() != null ? r.getExpectedClosingDate().toString() : "").append(",");
            csv.append(r.getProbability() != null ? r.getProbability().toString() : "").append(",");
            csv.append(escapeCsv(r.getNotes())).append("\n");
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private byte[] generateXlsxFromRequests(List<CrmLeadRequest> records) {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Converted Leads");

            String[] headers = {"Full Name", "Business Email", "Company", "Phone", "Industry Sector", "Service Required", "Status", "Priority", "Lead Source", "Currency", "Estimated Value", "Expected Closing Date", "Probability", "Notes"};
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
            }

            int rowIdx = 1;
            for (CrmLeadRequest r : records) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(r.getFullName() != null ? r.getFullName() : "");
                row.createCell(1).setCellValue(r.getBusinessEmail() != null ? r.getBusinessEmail() : "");
                row.createCell(2).setCellValue(r.getCompanyName() != null ? r.getCompanyName() : "");
                row.createCell(3).setCellValue(r.getPhoneNumber() != null ? r.getPhoneNumber() : "");
                row.createCell(4).setCellValue(r.getIndustrySector() != null ? r.getIndustrySector() : "");
                row.createCell(5).setCellValue(r.getServiceRequired() != null ? r.getServiceRequired() : "");
                row.createCell(6).setCellValue(r.getStatus() != null ? r.getStatus().name() : "NEW");
                row.createCell(7).setCellValue(r.getPriority() != null ? r.getPriority().name() : "MEDIUM");
                row.createCell(8).setCellValue(r.getLeadSource() != null ? r.getLeadSource().name() : "WEBSITE");
                row.createCell(9).setCellValue(r.getCurrency() != null ? r.getCurrency().name() : "INR");
                row.createCell(10).setCellValue(r.getEstimatedValue() != null ? r.getEstimatedValue().doubleValue() : 0.0);
                row.createCell(11).setCellValue(r.getExpectedClosingDate() != null ? r.getExpectedClosingDate().toString() : "");
                row.createCell(12).setCellValue(r.getProbability() != null ? r.getProbability() : 0);
                row.createCell(13).setCellValue(r.getNotes() != null ? r.getNotes() : "");
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            logger.error("Failed to generate XLSX: {}", e.getMessage());
            return generateCsvFromRequests(records);
        }
    }

    private String escapeCsv(String str) {
        if (str == null) return "";
        if (str.contains(",") || str.contains("\"") || str.contains("\n")) {
            return "\"" + str.replace("\"", "\"\"") + "\"";
        }
        return str;
    }

    // --- POSITIONAL PDF EXTRACTOR CLASSES & HELPERS ---

    private static class PdfTextChunk {
        private final String text;
        private final float x;
        private final float y;
        private final float width;
        private final float height;
        private final int pageNum;

        public PdfTextChunk(String text, float x, float y, float width, float height, int pageNum) {
            this.text = text;
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.pageNum = pageNum;
        }

        public String getText() { return text; }
        public float getX() { return x; }
        public float getY() { return y; }
        public float getWidth() { return width; }
        public float getHeight() { return height; }
        public int getPageNum() { return pageNum; }
    }

    private static class PositionAwarePdfStripper extends PDFTextStripper {
        private final List<PdfTextChunk> chunks = new ArrayList<>();
        private final StringBuilder currentWord = new StringBuilder();
        private float wordStartX = -1;
        private float wordY = -1;
        private float wordMaxX = -1;
        private float wordHeight = 0;

        public PositionAwarePdfStripper() throws java.io.IOException {
            super();
            setSortByPosition(true);
        }

        @Override
        protected void processTextPosition(TextPosition text) {
            if (text != null && text.getUnicode() != null) {
                String unicode = text.getUnicode();
                float x = text.getXDirAdj();
                float y = text.getYDirAdj();
                float width = text.getWidthDirAdj();
                float height = text.getHeightDir();

                boolean isSpace = unicode.isBlank() || unicode.equals("\u00a0");

                if (isSpace) {
                    flushWord();
                } else {
                    if (wordStartX >= 0) {
                        if (Math.abs(y - wordY) > 3.0f || (x - wordMaxX) > 4.0f || x < wordStartX - 2.0f) {
                            flushWord();
                        }
                    }

                    if (wordStartX < 0) {
                        wordStartX = x;
                        wordY = y;
                        wordMaxX = x + width;
                        wordHeight = height;
                    } else {
                        wordMaxX = Math.max(wordMaxX, x + width);
                    }
                    currentWord.append(unicode);
                }
            }
            super.processTextPosition(text);
        }

        @Override
        protected void writeString(String text, List<TextPosition> textPositions) throws java.io.IOException {
            flushWord();
            super.writeString(text, textPositions);
        }

        private void flushWord() {
            if (currentWord.length() > 0 && wordStartX >= 0) {
                String word = currentWord.toString().trim();
                if (!word.isEmpty()) {
                    chunks.add(new PdfTextChunk(word, wordStartX, wordY, wordMaxX - wordStartX, wordHeight, getCurrentPageNo()));
                }
                currentWord.setLength(0);
                wordStartX = -1;
                wordY = -1;
                wordMaxX = -1;
            }
        }

        public List<PdfTextChunk> getChunks() {
            flushWord();
            return chunks;
        }
    }

    private static class HeaderColumnDef {
        private final String name;
        private float minX;
        private float maxX;
        private float startX;
        private float endX;

        public HeaderColumnDef(String name, float minX, float maxX) {
            this.name = name;
            this.minX = minX;
            this.maxX = maxX;
            this.startX = minX;
            this.endX = maxX;
        }

        public String getName() { return name; }
        public float getMinX() { return minX; }
        public float getMaxX() { return maxX; }
        public float getStartX() { return startX; }
        public float getEndX() { return endX; }

        public void setStartX(float startX) { this.startX = startX; }
        public void setEndX(float endX) { this.endX = endX; }
    }

    private List<List<PdfTextChunk>> groupChunksIntoLines(List<PdfTextChunk> pageChunks, float yTolerance) {
        List<List<PdfTextChunk>> lines = new ArrayList<>();
        List<PdfTextChunk> sorted = new ArrayList<>(pageChunks);
        sorted.sort(Comparator.comparingDouble(PdfTextChunk::getY));

        for (PdfTextChunk chunk : sorted) {
            boolean added = false;
            for (List<PdfTextChunk> line : lines) {
                if (!line.isEmpty() && Math.abs(line.get(0).getY() - chunk.getY()) <= yTolerance) {
                    line.add(chunk);
                    added = true;
                    break;
                }
            }
            if (!added) {
                List<PdfTextChunk> newLine = new ArrayList<>();
                newLine.add(chunk);
                lines.add(newLine);
            }
        }

        for (List<PdfTextChunk> line : lines) {
            line.sort(Comparator.comparingDouble(PdfTextChunk::getX));
        }

        return lines;
    }

    private List<HeaderColumnDef> detectHeaderRow(List<PdfTextChunk> line) {
        if (line == null || line.isEmpty()) return null;

        List<HeaderColumnDef> candidates = new ArrayList<>();
        StringBuilder nameBuf = new StringBuilder();
        float minX = -1;
        float lastMaxX = -1;

        for (PdfTextChunk chunk : line) {
            String txt = chunk.getText().trim();
            if (txt.isEmpty()) continue;

            if (minX < 0) {
                minX = chunk.getX();
                lastMaxX = chunk.getX() + chunk.getWidth();
                nameBuf.append(txt);
            } else {
                float gap = chunk.getX() - lastMaxX;
                String currentName = nameBuf.toString().trim();

                boolean shouldMerge = false;
                if (gap < 10.0f) {
                    shouldMerge = true;
                } else if (gap < 20.0f && !isRecognizedHeader(currentName)) {
                    shouldMerge = true;
                }

                if (shouldMerge) {
                    nameBuf.append(" ").append(txt);
                    lastMaxX = Math.max(lastMaxX, chunk.getX() + chunk.getWidth());
                } else {
                    candidates.add(new HeaderColumnDef(currentName, minX, lastMaxX));
                    minX = chunk.getX();
                    lastMaxX = chunk.getX() + chunk.getWidth();
                    nameBuf.setLength(0);
                    nameBuf.append(txt);
                }
            }
        }
        if (minX >= 0) {
            candidates.add(new HeaderColumnDef(nameBuf.toString().trim(), minX, lastMaxX));
        }

        int matchCount = 0;
        for (HeaderColumnDef candidate : candidates) {
            if (isRecognizedHeader(candidate.getName())) {
                matchCount++;
            }
        }

        if (matchCount >= 2) {
            return candidates;
        }

        return null;
    }

    private boolean isRecognizedHeader(String rawHeaderName) {
        if (rawHeaderName == null) return false;
        String norm = rawHeaderName.toLowerCase().replaceAll("[^a-z0-9]", "");
        return norm.equals("fullname") || norm.equals("name") || norm.equals("leadname") || norm.equals("clientname") || norm.contains("contact")
                || norm.equals("businessemail") || norm.equals("email") || norm.equals("mail") || norm.contains("email")
                || norm.equals("company") || norm.equals("companyname") || norm.equals("organization") || norm.equals("firm")
                || norm.equals("phone") || norm.equals("phonenumber") || norm.equals("mobile") || norm.equals("tel")
                || norm.equals("industry") || norm.equals("industrysector") || norm.equals("sector")
                || norm.equals("service") || norm.equals("servicerequired") || norm.equals("requirement")
                || norm.equals("status") || norm.equals("priority") || norm.equals("source") || norm.equals("leadsource")
                || norm.equals("city") || norm.equals("location") || norm.equals("notes");
    }

    private void calculateColumnBoundaries(List<HeaderColumnDef> columnDefs) {
        int n = columnDefs.size();
        for (int i = 0; i < n; i++) {
            HeaderColumnDef col = columnDefs.get(i);
            float startX = (i == 0) ? 0.0f : (columnDefs.get(i - 1).getMaxX() + col.getMinX()) / 2.0f;
            float endX = (i == n - 1) ? Float.MAX_VALUE : (col.getMaxX() + columnDefs.get(i + 1).getMinX()) / 2.0f;
            col.setStartX(startX);
            col.setEndX(endX);
        }
    }

    private int getMatchingColumnIndex(float x, List<HeaderColumnDef> columnDefs) {
        for (int i = 0; i < columnDefs.size(); i++) {
            HeaderColumnDef col = columnDefs.get(i);
            if (x >= col.getStartX() && x < col.getEndX()) {
                return i;
            }
        }
        return -1;
    }

    private static String joinCellChunks(List<PdfTextChunk> chunks) {
        if (chunks == null || chunks.isEmpty()) return "";
        StringBuilder sb = new StringBuilder();
        for (PdfTextChunk chunk : chunks) {
            String text = chunk.getText().trim();
            if (text.isEmpty()) continue;
            if (sb.length() == 0) {
                sb.append(text);
            } else {
                String prev = sb.toString();
                if ((prev.contains("@") || text.contains("@")) && EMAIL_PATTERN.matcher(prev + text).matches()) {
                    sb.append(text);
                } else if (prev.endsWith("-") || prev.endsWith(".")) {
                    sb.append(text);
                } else {
                    sb.append(" ").append(text);
                }
            }
        }
        return sb.toString().trim();
    }

    private Map<String, String> flushRow(List<HeaderColumnDef> columnDefs, Map<String, List<PdfTextChunk>> cellChunks) {
        Map<String, String> row = new LinkedHashMap<>();
        for (HeaderColumnDef col : columnDefs) {
            List<PdfTextChunk> chunks = cellChunks.get(col.getName());
            String val = joinCellChunks(chunks);
            row.put(col.getName(), val);
        }
        return row;
    }

    private boolean hasMeaningfulContent(Map<String, String> rowMap) {
        if (rowMap == null || rowMap.isEmpty()) return false;
        boolean hasValue = false;
        for (String val : rowMap.values()) {
            if (val != null && !val.isBlank() && !isFooterOrHeaderNoise(val)) {
                hasValue = true;
                break;
            }
        }
        return hasValue;
    }

    private boolean isFooterOrHeaderNoise(String text) {
        if (text == null || text.isBlank()) return true;
        String t = text.trim();
        return t.matches("(?i)^page\\s+\\d+(\\s+of\\s+\\d+)?$")
                || t.matches("(?i)^confidential$")
                || t.matches("(?i)^acrovix\\s+crm.*$");
    }

    private String detectDelimiter(String line) {
        if (line.contains("|")) return "\\|";
        if (line.contains("\t")) return "\t";
        if (line.contains(",")) return ",";
        return "\\s{2,}";
    }

    // --- VALUE OBJECTS ---

    private static class ParsedSheet {
        private final List<String> headers;
        private final List<Map<String, String>> rows;
        private final int skippedRowCount;

        public ParsedSheet(List<String> headers, List<Map<String, String>> rows, int skippedRowCount) {
            this.headers = headers;
            this.rows = rows;
            this.skippedRowCount = skippedRowCount;
        }

        public List<String> getHeaders() { return headers; }
        public List<Map<String, String>> getRows() { return rows; }
        public int getSkippedRowCount() { return skippedRowCount; }
    }

    private static class ParsedWorkbookResult {
        private final List<String> sheetNames;
        private final String activeSheet;
        private final List<String> headers;
        private final List<Map<String, String>> rows;
        private final int skippedRowCount;

        public ParsedWorkbookResult(List<String> sheetNames, String activeSheet, List<String> headers, List<Map<String, String>> rows, int skippedRowCount) {
            this.sheetNames = sheetNames;
            this.activeSheet = activeSheet;
            this.headers = headers;
            this.rows = rows;
            this.skippedRowCount = skippedRowCount;
        }

        public List<String> getSheetNames() { return sheetNames; }
        public String getActiveSheet() { return activeSheet; }
        public List<String> getHeaders() { return headers; }
        public List<Map<String, String>> getRows() { return rows; }
        public int getSkippedRowCount() { return skippedRowCount; }
    }
}
