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
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.ss.usermodel.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
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
            CrmLeadImportFieldMeta.builder().key("fullName").label("Full Name").required(true).description("Lead full name").sampleValues(List.of("John Doe", "Rahul Sharma")).build(),
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
     * Preview endpoint logic: parses file headers, generates auto-mapping, and evaluates valid/invalid/duplicate status for preview rows without persisting anything.
     */
    public CrmLeadImportPreviewResponse previewImport(MultipartFile file) {
        validateFile(file);

        ParsedSheet parsedSheet = parseSpreadsheet(file);
        if (parsedSheet.getHeaders().isEmpty()) {
            throw new IllegalArgumentException("The uploaded file does not contain header columns.");
        }
        if (parsedSheet.getRows().isEmpty()) {
            throw new IllegalArgumentException("The uploaded sheet does not contain any data rows.");
        }

        Map<String, String> suggestedMapping = autoSuggestMapping(parsedSheet.getHeaders());
        
        Set<String> seenEmailsInFile = new HashSet<>();
        List<CrmLeadImportPreviewRow> previewRows = new ArrayList<>();
        
        int validCount = 0;
        int invalidCount = 0;
        int duplicateCount = 0;

        for (int i = 0; i < parsedSheet.getRows().size(); i++) {
            Map<String, String> rawRow = parsedSheet.getRows().get(i);
            int rowIndex = i + 1; // 1-indexed data row

            Map<String, String> mappedFields = mapRowFields(rawRow, suggestedMapping);
            List<String> rowErrors = new ArrayList<>();

            String fullName = mappedFields.getOrDefault("fullName", "").trim();
            String businessEmail = mappedFields.getOrDefault("businessEmail", "").trim();
            String companyName = mappedFields.getOrDefault("companyName", "").trim();

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

            // 3. Duplicate Detection
            boolean isDuplicate = false;
            if (!businessEmail.isBlank() && EMAIL_PATTERN.matcher(businessEmail).matches()) {
                String normalizedEmail = businessEmail.toLowerCase();
                if (seenEmailsInFile.contains(normalizedEmail)) {
                    isDuplicate = true;
                    rowErrors.add("Duplicate email within uploaded file: " + businessEmail);
                } else {
                    seenEmailsInFile.add(normalizedEmail);
                    if (crmLeadRepository.existsByBusinessEmailIgnoreCase(businessEmail)) {
                        isDuplicate = true;
                        rowErrors.add("Duplicate lead: email already exists in system (" + businessEmail + ")");
                    }
                }
            }

            String rowStatus;
            if (isDuplicate) {
                rowStatus = "DUPLICATE";
                duplicateCount++;
            } else if (!rowErrors.isEmpty()) {
                rowStatus = "INVALID";
                invalidCount++;
            } else {
                rowStatus = "VALID";
                validCount++;
            }

            previewRows.add(CrmLeadImportPreviewRow.builder()
                    .rowIndex(rowIndex)
                    .rowData(rawRow)
                    .status(rowStatus)
                    .fullName(fullName)
                    .businessEmail(businessEmail)
                    .companyName(companyName)
                    .errors(rowErrors)
                    .build());
        }

        return CrmLeadImportPreviewResponse.builder()
                .fileName(file.getOriginalFilename())
                .fileSize(file.getSize())
                .totalRows(parsedSheet.getRows().size())
                .validCount(validCount)
                .invalidCount(invalidCount)
                .duplicateCount(duplicateCount)
                .fileHeaders(parsedSheet.getHeaders())
                .suggestedMapping(suggestedMapping)
                .supportedFields(SUPPORTED_FIELDS)
                .previewRows(previewRows)
                .build();
    }

    /**
     * Import endpoint logic: parses file, applies explicit or auto column mapping, validates, filters duplicates, and imports valid leads.
     */
    public CrmLeadImportResultResponse importLeads(
            MultipartFile file,
            String columnMappingJson,
            AdminUser currentUser
    ) {
        validateFile(file);

        Map<String, String> columnMapping = parseMappingJson(columnMappingJson);
        ParsedSheet parsedSheet = parseSpreadsheet(file);

        if (columnMapping == null || columnMapping.isEmpty()) {
            columnMapping = autoSuggestMapping(parsedSheet.getHeaders());
        }

        Set<String> seenEmailsInFile = new HashSet<>();
        List<CrmLeadImportRowError> importErrors = new ArrayList<>();
        List<CrmLeadRequest> validRequests = new ArrayList<>();
        List<Integer> validRowIndices = new ArrayList<>();

        int duplicateCount = 0;
        int errorCount = 0;

        for (int i = 0; i < parsedSheet.getRows().size(); i++) {
            Map<String, String> rawRow = parsedSheet.getRows().get(i);
            int rowIndex = i + 1;

            Map<String, String> mappedFields = mapRowFields(rawRow, columnMapping);
            List<String> rowErrors = new ArrayList<>();

            String fullName = mappedFields.getOrDefault("fullName", "").trim();
            String businessEmail = mappedFields.getOrDefault("businessEmail", "").trim();

            if (fullName.isBlank()) {
                rowErrors.add("Full Name is required");
            }
            if (businessEmail.isBlank()) {
                rowErrors.add("Business Email is required");
            } else if (!EMAIL_PATTERN.matcher(businessEmail).matches()) {
                rowErrors.add("Invalid business email format");
            }

            validateFieldFormats(mappedFields, rowErrors);

            boolean isDuplicate = false;
            if (!businessEmail.isBlank() && EMAIL_PATTERN.matcher(businessEmail).matches()) {
                String normalizedEmail = businessEmail.toLowerCase();
                if (seenEmailsInFile.contains(normalizedEmail)) {
                    isDuplicate = true;
                    rowErrors.add("Duplicate lead within uploaded file");
                } else {
                    seenEmailsInFile.add(normalizedEmail);
                    if (crmLeadRepository.existsByBusinessEmailIgnoreCase(businessEmail)) {
                        isDuplicate = true;
                        rowErrors.add("Duplicate lead: email already exists in CRM");
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
                CrmLeadRequest request = buildLeadRequest(mappedFields);
                validRequests.add(request);
                validRowIndices.add(rowIndex);
            }
        }

        // Batch Persist Valid Records
        int successCount = 0;
        for (int i = 0; i < validRequests.size(); i++) {
            CrmLeadRequest req = validRequests.get(i);
            int rowIndex = validRowIndices.get(i);

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

        return CrmLeadImportResultResponse.builder()
                .totalProcessed(parsedSheet.getRows().size())
                .successCount(successCount)
                .duplicateCount(duplicateCount)
                .errorCount(errorCount)
                .errors(importErrors)
                .build();
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

    // --- HELPER METHODS ---

    private void validateFile(MultipartFile file) {
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
        if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
            throw new IllegalArgumentException("Unsupported file extension. Only CSV, XLSX, and XLS files are supported.");
        }
    }

    private ParsedSheet parseSpreadsheet(MultipartFile file) {
        String filename = file.getOriginalFilename().toLowerCase();
        if (filename.endsWith(".csv")) {
            return parseCsv(file);
        } else {
            return parseExcel(file);
        }
    }

    private ParsedSheet parseCsv(MultipartFile file) {
        List<String> headers = new ArrayList<>();
        List<Map<String, String>> rows = new ArrayList<>();

        try (InputStream is = file.getInputStream();
             InputStreamReader reader = new InputStreamReader(is, StandardCharsets.UTF_8);
             CSVParser parser = CSVFormat.DEFAULT.builder()
                     .setHeader()
                     .setSkipHeaderRecord(true)
                     .setIgnoreHeaderCase(true)
                     .setTrim(true)
                     .build().parse(reader)) {

            headers = new ArrayList<>(parser.getHeaderNames());
            // Filter out empty header strings
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
                }
            }
        } catch (Exception e) {
            logger.error("CSV parse failure", e);
            throw new IllegalArgumentException("Failed to parse CSV file: " + e.getMessage());
        }

        return new ParsedSheet(headers, rows);
    }

    private ParsedSheet parseExcel(MultipartFile file) {
        List<String> headers = new ArrayList<>();
        List<Map<String, String>> rows = new ArrayList<>();

        try (InputStream is = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null || sheet.getPhysicalNumberOfRows() == 0) {
                throw new IllegalArgumentException("The uploaded spreadsheet is empty.");
            }

            DataFormatter formatter = new DataFormatter();
            Row headerRow = sheet.getRow(0);
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

            for (int r = 1; r <= sheet.getLastRowNum(); r++) {
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
                }
            }
        } catch (IllegalArgumentException ie) {
            throw ie;
        } catch (Exception e) {
            logger.error("Excel parse failure", e);
            throw new IllegalArgumentException("Failed to parse Excel sheet. Ensure file is not corrupted: " + e.getMessage());
        }

        return new ParsedSheet(headers, rows);
    }

    private Map<String, String> autoSuggestMapping(List<String> headers) {
        Map<String, String> mapping = new LinkedHashMap<>();

        for (String header : headers) {
            String norm = header.toLowerCase().replaceAll("[^a-z0-9]", "");

            if (norm.equals("fullname") || norm.equals("name") || norm.equals("leadname") || norm.equals("clientname") || norm.contains("contactname")) {
                mapping.put(header, "fullName");
            } else if (norm.equals("businessemail") || norm.equals("email") || norm.equals("emailaddress") || norm.equals("mail") || norm.contains("email")) {
                mapping.put(header, "businessEmail");
            } else if (norm.equals("company") || norm.equals("companyname") || norm.equals("organization") || norm.equals("firm") || norm.contains("company")) {
                mapping.put(header, "companyName");
            } else if (norm.equals("phone") || norm.equals("phonenumber") || norm.equals("mobile") || norm.equals("mobilenumber") || norm.contains("phone") || norm.contains("mobile")) {
                mapping.put(header, "phoneNumber");
            } else if (norm.equals("industry") || norm.equals("industrysector") || norm.equals("sector")) {
                mapping.put(header, "industrySector");
            } else if (norm.equals("service") || norm.equals("servicerequired") || norm.equals("services")) {
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
            } else if (norm.equals("notes") || norm.equals("comment") || norm.equals("remarks")) {
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
                parseLocalDate(dateStr.trim());
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

    private CrmLeadRequest buildLeadRequest(Map<String, String> fields) {
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
                .notes(fields.get("notes") != null ? fields.get("notes").trim() : null)
                .assignedToId(assignedToId)
                .build();
    }

    private LocalDate parseLocalDate(String str) {
        try {
            return LocalDate.parse(str, DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (Exception e1) {
            try {
                return LocalDate.parse(str, DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            } catch (Exception e2) {
                return LocalDate.parse(str, DateTimeFormatter.ofPattern("MM/dd/yyyy"));
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

    private static class ParsedSheet {
        private final List<String> headers;
        private final List<Map<String, String>> rows;

        public ParsedSheet(List<String> headers, List<Map<String, String>> rows) {
            this.headers = headers;
            this.rows = rows;
        }

        public List<String> getHeaders() { return headers; }
        public List<Map<String, String>> getRows() { return rows; }
    }
}
