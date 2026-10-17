package com.acrovix.admin.service;

import com.acrovix.admin.dto.CompanySettingsResponse;
import com.acrovix.admin.entity.Quotation;
import com.acrovix.admin.entity.QuotationItem;
import com.lowagie.text.*;
import com.lowagie.text.pdf.ColumnText;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfWriter;
import com.lowagie.text.pdf.draw.LineSeparator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
public class PdfService {

    @Autowired(required = false)
    private CompanySettingsService companySettingsService;

    @Autowired(required = false)
    private com.acrovix.admin.repository.CompanyBankAccountRepository companyBankAccountRepository;

    @Autowired(required = false)
    private com.acrovix.admin.repository.PaymentRepository paymentRepository;

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(PdfService.class);

    public CompanySettingsResponse resolveTenantSettings(Long tenantId) {
        if (companySettingsService != null && tenantId != null) {
            try {
                return companySettingsService.getCompanySettingsForTenant(tenantId);
            } catch (Exception e) {
                log.warn("Could not load company settings for tenant {}: {}", tenantId, e.getMessage());
            }
        } else if (companySettingsService != null) {
            try {
                return companySettingsService.getCompanySettings();
            } catch (Exception e) {
                log.warn("Could not load default company settings: {}", e.getMessage());
            }
        }
        return null;
    }

    public static String resolveCurrencySymbol(String currencyCode, CompanySettingsResponse settings) {
        if (settings != null && settings.getCurrencySymbol() != null && !settings.getCurrencySymbol().isBlank()) {
            if (currencyCode == null || settings.getCurrencyCode() == null || currencyCode.equalsIgnoreCase(settings.getCurrencyCode())) {
                return settings.getCurrencySymbol();
            }
        }
        if (currencyCode == null) return "₹";
        return switch (currencyCode.toUpperCase()) {
            case "USD" -> "$";
            case "EUR" -> "€";
            case "GBP" -> "£";
            case "AED" -> "AED ";
            case "JPY" -> "¥";
            case "CAD" -> "CA$";
            case "AUD" -> "A$";
            case "INR" -> "₹";
            default -> currencyCode + " ";
        };
    }

    public byte[] generateQuotationPdf(Quotation quotation) {
        return generateQuotationPdf(quotation, true);
    }

    public byte[] generateStandardQuotationPdf(Quotation quotation) {
        return generateQuotationPdf(quotation, false);
    }

    public byte[] generateQuotationPdf(Quotation quotation, boolean useCustomLayout) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            CompanySettingsResponse settings = resolveTenantSettings(quotation != null ? quotation.getTenantId() : null);
            java.awt.Color themeColor = useCustomLayout ? resolveQuotationThemeColor(quotation, settings) : resolveQuotationThemeColor(null, settings);

            // Always A4 Portrait
            Document document = new Document(PageSize.A4, 24f, 24f, 22f, 36f);
            PdfWriter writer = PdfWriter.getInstance(document, out);

            QuotationPageEvent pageEvent = new QuotationPageEvent(settings, themeColor);
            writer.setPageEvent(pageEvent);

            document.open();

            // Page 1: Header, Metadata, Customer details, Line Items
            addQuotationHeader(document, settings, themeColor, useCustomLayout ? quotation : null);
            addQuotationMetaPanel(document, writer, quotation);
            addQuotationCustomerPanels(document, writer, quotation);
            
            // Line items table with continuation support
            addQuotationLineItems(document, quotation, settings, themeColor, useCustomLayout);

            // Closing sections (Totals, Amount in Words, Terms, Bank & Signatory)
            addQuotationClosingSections(document, writer, quotation, settings, themeColor, useCustomLayout);

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate Quotation PDF", e);
            throw new RuntimeException("Failed to generate Quotation PDF", e);
        }
    }

    public boolean isSectionVisible(Quotation quotation, String sectionKey, boolean defaultValue) {
        if (quotation == null || quotation.getColumnConfigs() == null) return defaultValue;
        for (com.acrovix.admin.entity.QuotationColumnConfig c : quotation.getColumnConfigs()) {
            if (sectionKey.equalsIgnoreCase(c.getColumnKey())) {
                return c.getVisible() != null ? c.getVisible() : defaultValue;
            }
        }
        return defaultValue;
    }

    public java.awt.Color resolveQuotationThemeColor(Quotation quotation, CompanySettingsResponse settings) {
        if (quotation != null && quotation.getColumnConfigs() != null) {
            for (com.acrovix.admin.entity.QuotationColumnConfig c : quotation.getColumnConfigs()) {
                if ("themeColor".equalsIgnoreCase(c.getColumnKey()) && c.getDisplayName() != null && !c.getDisplayName().isBlank()) {
                    try {
                        String hex = c.getDisplayName().trim();
                        if (hex.startsWith("#")) {
                            return java.awt.Color.decode(hex);
                        }
                    } catch (Exception ignored) {}
                }
            }
        }
        if (settings != null && settings.getPrimaryColor() != null && !settings.getPrimaryColor().isBlank()) {
            try {
                String hex = settings.getPrimaryColor().trim();
                if (hex.startsWith("#")) {
                    return java.awt.Color.decode(hex);
                }
            } catch (Exception ignored) {}
        }
        return NAVY_PRIMARY;
    }

    public static final java.util.Set<String> PDF_DOCUMENT_METADATA_KEYS = java.util.Set.of(
            "themeColor", "templateStyle", "brandDisplayMode", "bankDetails", "signature", "termsAndConditions", "customLayoutEnabled"
    );

    // Colors Palette matching reference
    private static final java.awt.Color NAVY_PRIMARY = new java.awt.Color(11, 25, 44);       // #0B192C Dark Navy
    private static final java.awt.Color BLUE_ACCENT = new java.awt.Color(29, 78, 216);        // #1D4ED8 Royal Blue
    private static final java.awt.Color TEAL_ACCENT = new java.awt.Color(0, 163, 196);        // #00A3C4 Cyan/Teal
    private static final java.awt.Color ICE_BLUE_BG = new java.awt.Color(240, 246, 254);      // #F0F6FE Panel background
    private static final java.awt.Color ICE_BLUE_BORDER = new java.awt.Color(208, 226, 255);  // #D0E2FF Panel border
    private static final java.awt.Color GRID_BORDER = new java.awt.Color(226, 232, 240);      // #E2E8F0 Subtle grid line
    private static final java.awt.Color TEXT_MUTED = new java.awt.Color(71, 85, 105);         // #475569 Slate text
    private static final java.awt.Color TEXT_DARK = new java.awt.Color(15, 23, 42);           // #0F172A Dark text

    public static final String DIGITAL_DOCUMENT_DISCLAIMER = "This is a digitally generated document and does not require a physical signature.";

    private static final java.util.Map<String, String> GST_STATE_MAP = java.util.Map.ofEntries(
        java.util.Map.entry("01", "Jammu and Kashmir"),
        java.util.Map.entry("02", "Himachal Pradesh"),
        java.util.Map.entry("03", "Punjab"),
        java.util.Map.entry("04", "Chandigarh"),
        java.util.Map.entry("05", "Uttarakhand"),
        java.util.Map.entry("06", "Haryana"),
        java.util.Map.entry("07", "Delhi"),
        java.util.Map.entry("08", "Rajasthan"),
        java.util.Map.entry("09", "Uttar Pradesh"),
        java.util.Map.entry("10", "Bihar"),
        java.util.Map.entry("11", "Sikkim"),
        java.util.Map.entry("12", "Arunachal Pradesh"),
        java.util.Map.entry("13", "Nagaland"),
        java.util.Map.entry("14", "Manipur"),
        java.util.Map.entry("15", "Mizoram"),
        java.util.Map.entry("16", "Tripura"),
        java.util.Map.entry("17", "Meghalaya"),
        java.util.Map.entry("18", "Assam"),
        java.util.Map.entry("19", "West Bengal"),
        java.util.Map.entry("20", "Jharkhand"),
        java.util.Map.entry("21", "Odisha"),
        java.util.Map.entry("22", "Chhattisgarh"),
        java.util.Map.entry("23", "Madhya Pradesh"),
        java.util.Map.entry("24", "Gujarat"),
        java.util.Map.entry("26", "Dadra and Nagar Haveli and Daman and Diu"),
        java.util.Map.entry("27", "Maharashtra"),
        java.util.Map.entry("28", "Andhra Pradesh (Old)"),
        java.util.Map.entry("29", "Karnataka"),
        java.util.Map.entry("30", "Goa"),
        java.util.Map.entry("31", "Lakshadweep"),
        java.util.Map.entry("32", "Kerala"),
        java.util.Map.entry("33", "Tamil Nadu"),
        java.util.Map.entry("34", "Puducherry"),
        java.util.Map.entry("35", "Andaman and Nicobar Islands"),
        java.util.Map.entry("36", "Telangana"),
        java.util.Map.entry("37", "Andhra Pradesh"),
        java.util.Map.entry("38", "Ladakh"),
        java.util.Map.entry("97", "Other Territory"),
        java.util.Map.entry("99", "Centre Jurisdiction")
    );

    public static String resolveStateName(String stateInput) {
        if (stateInput == null || stateInput.isBlank()) {
            return "";
        }
        String trimmed = stateInput.trim();
        if (trimmed.contains("-")) {
            String[] parts = trimmed.split("-", 2);
            if (parts.length > 1 && !parts[1].trim().isBlank()) {
                return parts[1].trim();
            }
        }
        String code = trimmed;
        if (code.length() == 1 && Character.isDigit(code.charAt(0))) {
            code = "0" + code;
        }
        String name = GST_STATE_MAP.get(code);
        if (name != null) {
            return name;
        }
        return trimmed;
    }

    private String formatAddressWithStateAndPin(String address, String state, String pincode) {
        if (address == null || address.isBlank()) {
            return "Not Specified";
        }
        String formatted = address.trim();
        if (state != null && !state.isBlank()) {
            String resolvedState = resolveStateName(state);
            if (!resolvedState.isBlank() && !formatted.toLowerCase().contains(resolvedState.toLowerCase())) {
                formatted += ", " + resolvedState;
            }
        }
        if (pincode != null && !pincode.isBlank()) {
            String pinTrim = pincode.trim();
            if (!formatted.contains(pinTrim)) {
                formatted += " - " + pinTrim;
            }
        }
        return formatted;
    }

    private void addDigitalDocumentDisclaimer(Document document) throws DocumentException {
        Paragraph disclaimer = new Paragraph(DIGITAL_DOCUMENT_DISCLAIMER,
                FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 6.8f, TEXT_MUTED));
        disclaimer.setAlignment(Element.ALIGN_CENTER);
        disclaimer.setSpacingBefore(6f);
        disclaimer.setSpacingAfter(0f);
        document.add(disclaimer);
    }

    private static com.lowagie.text.pdf.BaseFont cachedUnicodeFont = null;
    private static boolean unicodeFontInitialized = false;

    private static synchronized com.lowagie.text.pdf.BaseFont getUnicodeBaseFont() {
        if (!unicodeFontInitialized) {
            unicodeFontInitialized = true;
            String[] fontCandidates = {
                "C:/Windows/Fonts/arial.ttf",
                "C:/Windows/Fonts/segoeui.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
            };
            for (String path : fontCandidates) {
                try {
                    java.io.File file = new java.io.File(path);
                    if (file.exists() && file.canRead()) {
                        cachedUnicodeFont = com.lowagie.text.pdf.BaseFont.createFont(path, com.lowagie.text.pdf.BaseFont.IDENTITY_H, com.lowagie.text.pdf.BaseFont.EMBEDDED);
                        break;
                    }
                } catch (Exception ignored) {}
            }
        }
        return cachedUnicodeFont;
    }

    private static Font getAppropriateFont(boolean bold, float size, java.awt.Color color) {
        com.lowagie.text.pdf.BaseFont bf = getUnicodeBaseFont();
        if (bf != null) {
            return new Font(bf, size, bold ? Font.BOLD : Font.NORMAL, color);
        }
        return FontFactory.getFont(bold ? FontFactory.HELVETICA_BOLD : FontFactory.HELVETICA, size, color);
    }

    private void addQuotationHeader(Document document, CompanySettingsResponse settings) throws DocumentException {
        addQuotationHeader(document, settings, NAVY_PRIMARY, null);
    }

    private void addQuotationHeader(Document document, CompanySettingsResponse settings, java.awt.Color themeColor) throws DocumentException {
        addQuotationHeader(document, settings, themeColor, null);
    }

    private void addQuotationHeader(Document document, CompanySettingsResponse settings, java.awt.Color themeColor, Quotation quotation) throws DocumentException {
        java.awt.Color headerColor = themeColor != null ? themeColor : NAVY_PRIMARY;
        Font quotTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22f, headerColor);
        Font compNameFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10.5f, headerColor);
        Font gstinBoldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, new java.awt.Color(51, 65, 85));
        Font compRegFont = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, TEXT_MUTED);
        Font origRecFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.0f, new java.awt.Color(100, 116, 139));

        String companyName = (settings != null && settings.getCompanyName() != null && !settings.getCompanyName().isBlank()) 
                ? settings.getCompanyName() : "ACROVIX INNOVATIONS PRIVATE LIMITED";
        String brandName = (settings != null && settings.getBrandName() != null && !settings.getBrandName().isBlank())
                ? settings.getBrandName() : companyName;
        String gstin = (settings != null && settings.getGstin() != null) ? settings.getGstin() : "";
        String pan = (settings != null && settings.getPan() != null) ? settings.getPan() : "";
        String vatId = (settings != null && settings.getVatId() != null) ? settings.getVatId() : "";
        String compAddress = (settings != null && settings.getRegisteredAddress() != null && !settings.getRegisteredAddress().isBlank()) 
                ? settings.getRegisteredAddress() 
                : ((settings != null && settings.getBillingAddress() != null) ? settings.getBillingAddress() : "");

        PdfPTable headerTable = new PdfPTable(2);
        headerTable.setWidthPercentage(100);
        headerTable.setWidths(new float[]{62f, 38f});

        // Left Header: Title + Company Info
        PdfPCell leftCell = new PdfPCell();
        leftCell.setBorder(Rectangle.NO_BORDER);
        leftCell.setPadding(0);

        Paragraph titlePara = new Paragraph("QUOTATION", quotTitleFont);
        titlePara.setSpacingAfter(4f);
        leftCell.addElement(titlePara);

        Paragraph compNamePara = new Paragraph(companyName, compNameFont);
        compNamePara.setSpacingAfter(3f);
        leftCell.addElement(compNamePara);

        if (!gstin.trim().isEmpty()) {
            Paragraph gstinPara = new Paragraph();
            gstinPara.add(new Chunk("GSTIN: ", gstinBoldFont));
            gstinPara.add(new Chunk(gstin, gstinBoldFont));
            gstinPara.setSpacingAfter(2f);
            leftCell.addElement(gstinPara);
        }

        if (!vatId.trim().isEmpty()) {
            Paragraph vatPara = new Paragraph();
            vatPara.add(new Chunk("VAT / Tax ID: ", gstinBoldFont));
            vatPara.add(new Chunk(vatId, gstinBoldFont));
            vatPara.setSpacingAfter(2f);
            leftCell.addElement(vatPara);
        }

        if (!pan.trim().isEmpty()) {
            Paragraph panPara = new Paragraph();
            panPara.add(new Chunk("PAN: ", gstinBoldFont));
            panPara.add(new Chunk(pan, gstinBoldFont));
            panPara.setSpacingAfter(2f);
            leftCell.addElement(panPara);
        }

        if (!compAddress.trim().isEmpty()) {
            String[] addrLines = compAddress.replace("\\n", "\n").split("\n");
            for (String line : addrLines) {
                if (!line.trim().isEmpty()) {
                    Paragraph addrPara = new Paragraph(line.trim(), compRegFont);
                    addrPara.setLeading(9f);
                    leftCell.addElement(addrPara);
                }
            }
        }

        headerTable.addCell(leftCell);

        // Right Header: ORIGINAL FOR RECIPIENT + Company Logo with tagline
        PdfPCell rightCell = new PdfPCell();
        rightCell.setBorder(Rectangle.NO_BORDER);
        rightCell.setPadding(0);
        rightCell.setHorizontalAlignment(Element.ALIGN_RIGHT);

        Paragraph origPara = new Paragraph("ORIGINAL FOR RECIPIENT", origRecFont);
        origPara.setAlignment(Element.ALIGN_RIGHT);
        origPara.setSpacingAfter(10f);
        rightCell.addElement(origPara);

        boolean wordmarkMode = false;
        if (quotation != null && quotation.getColumnConfigs() != null) {
            for (com.acrovix.admin.entity.QuotationColumnConfig c : quotation.getColumnConfigs()) {
                if ("brandDisplayMode".equalsIgnoreCase(c.getColumnKey()) && "WORDMARK".equalsIgnoreCase(c.getDisplayName())) {
                    wordmarkMode = true;
                    break;
                }
            }
        }

        if (wordmarkMode) {
            Font brandFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 15.0f, headerColor);
            Paragraph brandPara = new Paragraph(brandName.toUpperCase(), brandFont);
            brandPara.setAlignment(Element.ALIGN_RIGHT);
            brandPara.setSpacingBefore(6f);
            rightCell.addElement(brandPara);
        } else {
            boolean logoLoaded = false;
            if (settings != null && settings.getLogoUrl() != null && !settings.getLogoUrl().isBlank()) {
                try {
                    Image logo = Image.getInstance(new java.net.URL(settings.getLogoUrl()));
                    logo.scaleToFit(140f, 48f);
                    logo.setAlignment(Element.ALIGN_RIGHT);
                    rightCell.addElement(logo);
                    logoLoaded = true;
                } catch (Exception e) {
                    log.warn("Could not load logo from URL: {}", settings.getLogoUrl());
                }
            }

            if (!logoLoaded) {
                boolean isAcrovix = (settings == null || settings.getTenantId() == null || settings.getTenantId().equals(1L) 
                        || (settings.getCompanyName() != null && settings.getCompanyName().toUpperCase().contains("ACROVIX")));
                if (isAcrovix) {
                    try {
                        java.net.URL bundledLogo = getClass().getResource("/static/Acrovix_logo.png");
                        if (bundledLogo != null) {
                            Image logo = Image.getInstance(bundledLogo);
                            logo.scaleToFit(140f, 48f);
                            logo.setAlignment(Element.ALIGN_RIGHT);
                            rightCell.addElement(logo);
                            logoLoaded = true;
                        }
                    } catch (Exception e) {
                        log.warn("Could not load bundled Acrovix logo", e);
                    }
                }
                if (!logoLoaded) {
                    Font brandFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13.5f, headerColor);
                    Paragraph brandPara = new Paragraph(brandName.toUpperCase(), brandFont);
                    brandPara.setAlignment(Element.ALIGN_RIGHT);
                    brandPara.setSpacingBefore(4f);
                    rightCell.addElement(brandPara);
                }
            }
        }

        headerTable.addCell(rightCell);
        document.add(headerTable);
    }

    private static Image createVectorIcon(PdfWriter writer, String type, float w, float h, java.awt.Color color) {
        try {
            com.lowagie.text.pdf.PdfTemplate t = writer.getDirectContent().createTemplate(w, h);
            t.setColorFill(color);
            t.setColorStroke(color);
            t.setLineWidth(0.7f);

            if ("quotation".equalsIgnoreCase(type)) {
                t.roundRectangle(1f, 1f, w - 2f, h - 2f, 1.5f);
                t.stroke();
                t.rectangle(2.8f, h - 3f, w - 5.6f, 1.8f);
                t.fill();
                t.moveTo(2.8f, h * 0.58f); t.lineTo(w - 2.8f, h * 0.58f); t.stroke();
                t.moveTo(2.8f, h * 0.38f); t.lineTo(w - 4.5f, h * 0.38f); t.stroke();
            } else if ("user".equalsIgnoreCase(type)) {
                float cx = w / 2f;
                t.circle(cx, h * 0.72f, 2.5f);
                t.fill();
                t.arc(cx - 4.8f, h * 0.1f, cx + 4.8f, h * 0.7f, 0, 180);
                t.fill();
            } else if ("building".equalsIgnoreCase(type)) {
                t.rectangle(2f, 1f, w - 4f, h - 2f);
                t.stroke();
                t.rectangle(w / 2f - 1.2f, 1f, 2.4f, 3.2f);
                t.fill();
                t.rectangle(3.2f, h - 4.2f, 1.6f, 1.6f); t.fill();
                t.rectangle(w - 4.8f, h - 4.2f, 1.6f, 1.6f); t.fill();
                t.rectangle(3.2f, h - 7.0f, 1.6f, 1.6f); t.fill();
                t.rectangle(w - 4.8f, h - 7.0f, 1.6f, 1.6f); t.fill();
            } else if ("terms".equalsIgnoreCase(type)) {
                t.roundRectangle(1.5f, 1f, w - 3f, h - 2f, 1.5f);
                t.stroke();
                t.moveTo(3.5f, h - 3.8f); t.lineTo(w - 3.5f, h - 3.8f); t.stroke();
                t.moveTo(3.5f, h - 6.2f); t.lineTo(w - 3.5f, h - 6.2f); t.stroke();
                t.moveTo(3.5f, h - 8.6f); t.lineTo(w - 5.5f, h - 8.6f); t.stroke();
            } else if ("bank".equalsIgnoreCase(type)) {
                t.moveTo(1.5f, h - 4.2f); t.lineTo(w / 2f, h - 1.2f); t.lineTo(w - 1.5f, h - 4.2f); t.closePath(); t.fill();
                t.rectangle(2.2f, 2.2f, 1.6f, h - 7.0f); t.fill();
                t.rectangle(w / 2f - 0.8f, 2.2f, 1.6f, h - 7.0f); t.fill();
                t.rectangle(w - 3.8f, 2.2f, 1.6f, h - 7.0f); t.fill();
                t.rectangle(1.2f, 0.8f, w - 2.4f, 1.4f); t.fill();
            } else if ("phone".equalsIgnoreCase(type)) {
                t.roundRectangle(2.2f, 1f, w - 4.4f, h - 2f, 1.6f);
                t.stroke();
                t.circle(w / 2f, 2.4f, 0.7f);
                t.fill();
            } else if ("email".equalsIgnoreCase(type)) {
                t.rectangle(1.2f, 1.8f, w - 2.4f, h - 3.6f);
                t.stroke();
                t.moveTo(1.2f, h - 1.8f); t.lineTo(w / 2f, h * 0.42f); t.lineTo(w - 1.2f, h - 1.8f);
                t.stroke();
            } else if ("globe".equalsIgnoreCase(type)) {
                float cx = w / 2f, cy = h / 2f, r = (w - 2.4f) / 2f;
                t.circle(cx, cy, r);
                t.stroke();
                t.moveTo(cx - r, cy); t.lineTo(cx + r, cy); t.stroke();
                t.ellipse(cx - r * 0.5f, cy - r, cx + r * 0.5f, cy + r);
                t.stroke();
            } else if ("truck".equalsIgnoreCase(type)) {
                t.roundRectangle(1f, 2.5f, w * 0.58f, h - 3.5f, 1f);
                t.stroke();
                t.roundRectangle(w * 0.60f, 2.5f, w * 0.36f, (h - 3.5f) * 0.75f, 1f);
                t.stroke();
                t.rectangle(w * 0.65f, 2.5f + (h - 3.5f) * 0.28f, w * 0.22f, (h - 3.5f) * 0.38f);
                t.stroke();
                t.circle(w * 0.25f, 1.8f, 1.4f); t.fill();
                t.circle(w * 0.78f, 1.8f, 1.4f); t.fill();
            } else if ("items".equalsIgnoreCase(type)) {
                t.roundRectangle(1.2f, 1f, w - 2.4f, h - 2f, 1.2f);
                t.stroke();
                t.circle(3.2f, h - 3.8f, 0.9f); t.fill();
                t.moveTo(5.2f, h - 3.8f); t.lineTo(w - 3.2f, h - 3.8f); t.stroke();
                t.circle(3.2f, h - 6.2f, 0.9f); t.fill();
                t.moveTo(5.2f, h - 6.2f); t.lineTo(w - 3.2f, h - 6.2f); t.stroke();
                t.circle(3.2f, h - 8.6f, 0.9f); t.fill();
                t.moveTo(5.2f, h - 8.6f); t.lineTo(w - 4.5f, h - 8.6f); t.stroke();
            } else if ("remarks".equalsIgnoreCase(type) || "note".equalsIgnoreCase(type)) {
                t.roundRectangle(1.2f, 2.2f, w - 2.4f, h - 3.4f, 1.2f);
                t.stroke();
                t.moveTo(3.5f, 2.2f); t.lineTo(5.5f, 0.8f); t.lineTo(7.5f, 2.2f); t.fill();
                t.moveTo(3.2f, h - 3.6f); t.lineTo(w - 3.2f, h - 3.6f); t.stroke();
                t.moveTo(3.2f, h - 6.0f); t.lineTo(w - 4.8f, h - 6.0f); t.stroke();
            } else if ("pin".equalsIgnoreCase(type) || "location".equalsIgnoreCase(type)) {
                float cx = w / 2f;
                t.circle(cx, h - 3.6f, 2.6f);
                t.fill();
                t.moveTo(cx - 2.6f, h - 3.6f);
                t.lineTo(cx, 1.2f);
                t.lineTo(cx + 2.6f, h - 3.6f);
                t.fill();
                t.setColorFill(java.awt.Color.WHITE);
                t.circle(cx, h - 3.6f, 1.0f);
                t.fill();
                t.setColorFill(color);
            } else if ("receipt".equalsIgnoreCase(type) || "document".equalsIgnoreCase(type)) {
                t.roundRectangle(1.2f, 1f, w - 2.4f, h - 2f, 1.2f);
                t.stroke();
                t.moveTo(3.0f, h - 3.5f); t.lineTo(w - 3.0f, h - 3.5f); t.stroke();
                t.moveTo(3.0f, h - 5.8f); t.lineTo(w - 3.0f, h - 5.8f); t.stroke();
                t.moveTo(3.0f, h - 8.1f); t.lineTo(w - 4.8f, h - 8.1f); t.stroke();
            } else if ("calendar".equalsIgnoreCase(type)) {
                t.roundRectangle(1.2f, 1.0f, w - 2.4f, h - 2.8f, 1.2f);
                t.stroke();
                t.rectangle(1.2f, h - 4.8f, w - 2.4f, 3.0f);
                t.fill();
                t.moveTo(3.2f, h - 1.2f); t.lineTo(3.2f, h); t.stroke();
                t.moveTo(w - 3.2f, h - 1.2f); t.lineTo(w - 3.2f, h); t.stroke();
                t.circle(3.5f, 3.0f, 0.6f); t.fill();
                t.circle(w / 2f, 3.0f, 0.6f); t.fill();
                t.circle(w - 3.5f, 3.0f, 0.6f); t.fill();
            } else if ("chart".equalsIgnoreCase(type) || "breakdown".equalsIgnoreCase(type)) {
                t.rectangle(1.5f, 1.0f, 2.2f, 4.0f); t.fill();
                t.rectangle(4.6f, 1.0f, 2.2f, 7.0f); t.fill();
                t.rectangle(7.7f, 1.0f, 2.2f, 9.5f); t.fill();
            } else if ("check".equalsIgnoreCase(type)) {
                t.setLineWidth(1.3f);
                t.moveTo(1.8f, h * 0.45f);
                t.lineTo(w * 0.42f, 1.8f);
                t.lineTo(w - 1.8f, h - 1.8f);
                t.stroke();
            } else if ("link".equalsIgnoreCase(type)) {
                t.setLineWidth(1.0f);
                t.roundRectangle(1.2f, 2.2f, 4.8f, 4.2f, 1.6f);
                t.stroke();
                t.roundRectangle(4.0f, 3.6f, 4.8f, 4.2f, 1.6f);
                t.stroke();
            } else if ("arrow-up-right".equalsIgnoreCase(type)) {
                t.setLineWidth(1.2f);
                t.moveTo(1.8f, 1.8f); t.lineTo(w - 1.8f, h - 1.8f); t.stroke();
                t.moveTo(w - 5.0f, h - 1.8f); t.lineTo(w - 1.8f, h - 1.8f); t.lineTo(w - 1.8f, h - 5.0f); t.stroke();
            } else if ("box".equalsIgnoreCase(type) || "order".equalsIgnoreCase(type)) {
                t.setLineWidth(0.8f);
                t.rectangle(1.2f, 1.2f, w - 2.4f, h - 2.4f);
                t.stroke();
                t.moveTo(1.2f, h * 0.62f); t.lineTo(w - 1.2f, h * 0.62f); t.stroke();
                t.moveTo(w / 2f, 1.2f); t.lineTo(w / 2f, h * 0.62f); t.stroke();
            } else if ("pen".equalsIgnoreCase(type) || "edit".equalsIgnoreCase(type)) {
                t.setLineWidth(0.8f);
                t.moveTo(1.5f, 1.5f); t.lineTo(3.2f, 1.5f); t.lineTo(w - 1.8f, h - 3.2f);
                t.lineTo(w - 3.2f, h - 1.8f); t.lineTo(1.5f, 3.2f); t.closePath(); t.stroke();
            }
            return Image.getInstance(t);
        } catch (Exception e) {
            return null;
        }
    }

    private static Image createCircleNumberIcon(PdfWriter writer, int number, float size, java.awt.Color color) {
        try {
            com.lowagie.text.pdf.PdfTemplate t = writer.getDirectContent().createTemplate(size, size);
            t.setColorStroke(color);
            t.setLineWidth(0.7f);
            float r = (size - 1.4f) / 2f;
            t.circle(size / 2f, size / 2f, r);
            t.stroke();

            com.lowagie.text.pdf.BaseFont bf = com.lowagie.text.pdf.BaseFont.createFont(
                    com.lowagie.text.pdf.BaseFont.HELVETICA_BOLD,
                    com.lowagie.text.pdf.BaseFont.WINANSI,
                    com.lowagie.text.pdf.BaseFont.NOT_EMBEDDED);
            t.beginText();
            float fSize = size * 0.6f;
            t.setFontAndSize(bf, fSize);
            t.setColorFill(color);
            String s = String.valueOf(number);
            float w = bf.getWidthPoint(s, fSize);
            t.setTextMatrix((size - w) / 2f, size * 0.28f);
            t.showText(s);
            t.endText();
            return Image.getInstance(t);
        } catch (Exception e) {
            return null;
        }
    }

    private void addQuotationMetaPanel(Document document, PdfWriter writer, Quotation quotation) throws DocumentException {
        Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.0f, TEXT_MUTED);
        Font valueBoldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, TEXT_DARK);
        Font valueRegFont = FontFactory.getFont(FontFactory.HELVETICA, 8.5f, TEXT_DARK);

        String quotNumber = quotation.getQuotationNumber() != null ? quotation.getQuotationNumber() : "-";
        String dateStr = quotation.getCreatedAt() != null 
                ? quotation.getCreatedAt().format(DateTimeFormatter.ofPattern("dd MMM yyyy")) : "-";

        String validStr = "-";
        if (quotation.getValidUntil() != null) {
            validStr = quotation.getValidUntil().format(DateTimeFormatter.ofPattern("dd MMM yyyy"));
            LocalDate baseDate = quotation.getCreatedAt() != null ? quotation.getCreatedAt().toLocalDate() : LocalDate.now();
            long days = java.time.temporal.ChronoUnit.DAYS.between(baseDate, quotation.getValidUntil());
            if (days > 0) {
                validStr += " (" + days + " Days)";
            }
        }

        PdfPTable metaCard = new PdfPTable(3);
        metaCard.setWidthPercentage(100);
        metaCard.setWidths(new float[]{36f, 32f, 32f});
        metaCard.setSpacingBefore(8f);
        metaCard.setSpacingAfter(8f);

        // Col 1: Quotation No. with icon
        PdfPCell c1 = new PdfPCell();
        c1.setBackgroundColor(ICE_BLUE_BG);
        c1.setBorderColor(ICE_BLUE_BORDER);
        c1.setBorderWidth(0.5f);
        c1.setPadding(6f);

        PdfPTable c1Inner = new PdfPTable(2);
        c1Inner.setWidthPercentage(100);
        c1Inner.setWidths(new float[]{14f, 86f});

        Image qIcon = createVectorIcon(writer, "quotation", 11f, 13f, BLUE_ACCENT);
        PdfPCell qIconCell = new PdfPCell();
        qIconCell.setBorder(Rectangle.NO_BORDER);
        qIconCell.setPadding(0);
        qIconCell.setPaddingTop(2f);
        if (qIcon != null) qIconCell.addElement(qIcon);
        c1Inner.addCell(qIconCell);

        PdfPCell qTextCell = new PdfPCell();
        qTextCell.setBorder(Rectangle.NO_BORDER);
        qTextCell.setPadding(0);
        qTextCell.addElement(new Paragraph("Quotation No.", labelFont));
        qTextCell.addElement(new Paragraph(quotNumber, valueBoldFont));
        c1Inner.addCell(qTextCell);

        c1.addElement(c1Inner);
        metaCard.addCell(c1);

        // Col 2: Quotation Date
        PdfPCell c2 = new PdfPCell();
        c2.setBackgroundColor(ICE_BLUE_BG);
        c2.setBorderColor(ICE_BLUE_BORDER);
        c2.setBorderWidth(0.5f);
        c2.setPadding(6f);
        c2.addElement(new Paragraph("Quotation Date", labelFont));
        c2.addElement(new Paragraph(dateStr, valueRegFont));
        metaCard.addCell(c2);

        // Col 3: Validity
        PdfPCell c3 = new PdfPCell();
        c3.setBackgroundColor(ICE_BLUE_BG);
        c3.setBorderColor(ICE_BLUE_BORDER);
        c3.setBorderWidth(0.5f);
        c3.setPadding(6f);
        c3.addElement(new Paragraph("Validity", labelFont));
        c3.addElement(new Paragraph(validStr, valueRegFont));
        metaCard.addCell(c3);

        document.add(metaCard);
    }

    private void addQuotationCustomerPanels(Document document, PdfWriter writer, Quotation quotation) throws DocumentException {
        Font cardHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, BLUE_ACCENT);
        Font labelFont = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, TEXT_MUTED);
        Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, TEXT_DARK);
        Font valueBoldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, TEXT_DARK);

        PdfPTable outerTable = new PdfPTable(3);
        outerTable.setWidthPercentage(100);
        outerTable.setWidths(new float[]{49f, 2f, 49f});
        outerTable.setSpacingAfter(8f);

        // Left Panel: Customer Details
        PdfPTable leftInner = new PdfPTable(2);
        leftInner.setWidthPercentage(100);
        leftInner.setWidths(new float[]{32f, 68f});

        Phrase leftHeaderPhrase = new Phrase();
        Image userIcon = createVectorIcon(writer, "user", 10f, 10f, BLUE_ACCENT);
        if (userIcon != null) {
            userIcon.setAlignment(Image.ALIGN_MIDDLE);
            leftHeaderPhrase.add(new Chunk(userIcon, 0, -1.5f));
            leftHeaderPhrase.add(new Chunk("  "));
        }
        leftHeaderPhrase.add(new Chunk("Customer Details", cardHeaderFont));

        PdfPCell leftHeader = new PdfPCell(leftHeaderPhrase);
        leftHeader.setColspan(2);
        leftHeader.setBorder(Rectangle.NO_BORDER);
        leftHeader.setPaddingBottom(5f);
        leftInner.addCell(leftHeader);

        addKeyValueRow(leftInner, "Name", quotation.getClientName(), labelFont, valueBoldFont);
        if (quotation.getClientCompany() != null && !quotation.getClientCompany().isBlank() && !quotation.getClientCompany().equalsIgnoreCase(quotation.getClientName())) {
            addKeyValueRow(leftInner, "Company", quotation.getClientCompany(), labelFont, valueFont);
        }
        if (quotation.getClientEmail() != null && !quotation.getClientEmail().isBlank()) {
            addKeyValueRow(leftInner, "Email", quotation.getClientEmail(), labelFont, valueFont);
        }
        if (quotation.getClientPhone() != null && !quotation.getClientPhone().isBlank()) {
            addKeyValueRow(leftInner, "Phone", quotation.getClientPhone(), labelFont, valueFont);
        }

        String gstin = "";
        String state = "";
        String billAddress = "";

        if (quotation.getCustomer() != null) {
            if (quotation.getCustomer().getGstin() != null && !quotation.getCustomer().getGstin().isBlank()) {
                gstin = quotation.getCustomer().getGstin();
            }
            if (quotation.getCustomer().getState() != null && !quotation.getCustomer().getState().isBlank()) {
                state = quotation.getCustomer().getState();
            }
            if (quotation.getCustomer().getBillingAddress() != null && !quotation.getCustomer().getBillingAddress().isBlank()) {
                billAddress = quotation.getCustomer().getBillingAddress();
            }
        }

        if (!gstin.isBlank() && !"-".equals(gstin.trim())) {
            addKeyValueRow(leftInner, "GSTIN", gstin, labelFont, valueFont);
        }
        if (!state.isBlank()) {
            addKeyValueRow(leftInner, "Place of Supply", resolveStateName(state), labelFont, valueFont);
        }

        PdfPCell leftCard = new PdfPCell(leftInner);
        leftCard.setBackgroundColor(ICE_BLUE_BG);
        leftCard.setBorderColor(ICE_BLUE_BORDER);
        leftCard.setBorderWidth(0.5f);
        leftCard.setPadding(6f);
        leftCard.setPaddingBottom(8f);

        // Middle spacer
        PdfPCell spacer = new PdfPCell();
        spacer.setBorder(Rectangle.NO_BORDER);

        // Right Panel: Billing Address
        PdfPTable rightInner = new PdfPTable(2);
        rightInner.setWidthPercentage(100);
        rightInner.setWidths(new float[]{32f, 68f});

        Phrase rightHeaderPhrase = new Phrase();
        Image bldIcon = createVectorIcon(writer, "building", 10f, 11f, BLUE_ACCENT);
        if (bldIcon != null) {
            bldIcon.setAlignment(Image.ALIGN_MIDDLE);
            rightHeaderPhrase.add(new Chunk(bldIcon, 0, -1.5f));
            rightHeaderPhrase.add(new Chunk("  "));
        }
        rightHeaderPhrase.add(new Chunk("Billing Address", cardHeaderFont));

        PdfPCell rightHeader = new PdfPCell(rightHeaderPhrase);
        rightHeader.setColspan(2);
        rightHeader.setBorder(Rectangle.NO_BORDER);
        rightHeader.setPaddingBottom(5f);
        rightInner.addCell(rightHeader);

        // Parse structured address lines if available
        String street = "";
        String city = "";
        String addrState = state;
        String pincode = "";
        String country = "India";

        if (!billAddress.isBlank()) {
            String[] lines = billAddress.split("\n");
            for (String l : lines) {
                String lineTrim = l.trim();
                String lower = lineTrim.toLowerCase();
                if (lower.startsWith("city:")) {
                    city = lineTrim.substring(5).trim();
                } else if (lower.startsWith("state:")) {
                    addrState = lineTrim.substring(6).trim();
                } else if (lower.startsWith("pincode:") || lower.startsWith("pin:") || lower.startsWith("zip:")) {
                    int colon = lineTrim.indexOf(':');
                    pincode = lineTrim.substring(colon + 1).trim();
                } else if (lower.startsWith("country:")) {
                    country = lineTrim.substring(8).trim();
                } else if (street.isEmpty()) {
                    street = lineTrim;
                } else {
                    street += ", " + lineTrim;
                }
            }
        }

        if (quotation.getClientName() != null && !quotation.getClientName().isBlank()) {
            addKeyValueRow(rightInner, "Name", quotation.getClientName(), labelFont, valueBoldFont);
        }
        if (quotation.getClientCompany() != null && !quotation.getClientCompany().isBlank() && !quotation.getClientCompany().equalsIgnoreCase(quotation.getClientName())) {
            addKeyValueRow(rightInner, "Company", quotation.getClientCompany(), labelFont, valueFont);
        }

        if (pincode.isBlank() && quotation.getCustomer() != null && quotation.getCustomer().getPincode() != null) {
            pincode = quotation.getCustomer().getPincode();
        }
        if (addrState.isBlank() && quotation.getCustomer() != null && quotation.getCustomer().getState() != null) {
            addrState = quotation.getCustomer().getState();
        }

        if (!street.isBlank()) addKeyValueRow(rightInner, "Address", street, labelFont, valueFont);
        if (!city.isBlank()) addKeyValueRow(rightInner, "City", city, labelFont, valueFont);
        if (!addrState.isBlank()) addKeyValueRow(rightInner, "State", resolveStateName(addrState), labelFont, valueFont);
        if (!pincode.isBlank()) addKeyValueRow(rightInner, "Pincode", pincode, labelFont, valueFont);
        if (!country.isBlank()) addKeyValueRow(rightInner, "Country", country, labelFont, valueFont);

        // If no structured fields found, render whatever address text is present
        if (street.isBlank() && city.isBlank() && addrState.isBlank()) {
            addKeyValueRow(rightInner, "Address", !billAddress.isBlank() ? billAddress : "-", labelFont, valueFont);
        }

        PdfPCell rightCard = new PdfPCell(rightInner);
        rightCard.setBackgroundColor(ICE_BLUE_BG);
        rightCard.setBorderColor(ICE_BLUE_BORDER);
        rightCard.setBorderWidth(0.5f);
        rightCard.setPadding(6f);
        rightCard.setPaddingBottom(8f);

        outerTable.addCell(leftCard);
        outerTable.addCell(spacer);
        outerTable.addCell(rightCard);

        document.add(outerTable);
    }

    private void addKeyValueRow(PdfPTable table, String label, String value, Font labelFont, Font valFont) {
        PdfPCell c1 = new PdfPCell(new Phrase(label, labelFont));
        c1.setBorder(Rectangle.NO_BORDER);
        c1.setPaddingTop(1.5f);
        c1.setPaddingBottom(1.5f);

        PdfPCell c2 = new PdfPCell(new Phrase(":  " + (value != null && !value.isBlank() ? value : "-"), valFont));
        c2.setBorder(Rectangle.NO_BORDER);
        c2.setPaddingTop(1.5f);
        c2.setPaddingBottom(1.5f);

        table.addCell(c1);
        table.addCell(c2);
    }

    private void addQuotationLineItems(Document document, Quotation quotation, CompanySettingsResponse settings) throws DocumentException {
        addQuotationLineItems(document, quotation, settings, NAVY_PRIMARY, true);
    }

    private void addQuotationLineItems(Document document, Quotation quotation, CompanySettingsResponse settings, java.awt.Color themeColor) throws DocumentException {
        addQuotationLineItems(document, quotation, settings, themeColor, true);
    }

    private void addQuotationLineItems(Document document, Quotation quotation, CompanySettingsResponse settings, java.awt.Color themeColor, boolean useCustomLayout) throws DocumentException {
        java.util.List<QuotationItem> allItems = quotation.getItems() != null ? quotation.getItems() : java.util.Collections.emptyList();
        int totalItems = allItems.size();

        // When quotation has more than 10 items (like reference 15-item quotation):
        // Page 1 gets items 1..10, Page 2 continues with items 11..end.
        if (totalItems > 10) {
            java.util.List<QuotationItem> page1Items = allItems.subList(0, 10);
            java.util.List<QuotationItem> page2Items = allItems.subList(10, totalItems);

            PdfPTable table1 = buildLineItemsTable(quotation, page1Items, 1, themeColor, useCustomLayout);
            document.add(table1);

            Paragraph contPara = new Paragraph("This page intentionally left with next items continuing...", 
                    FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 7.0f, new java.awt.Color(100, 116, 139)));
            contPara.setSpacingBefore(4f);
            document.add(contPara);

            document.newPage();

            PdfPTable table2 = buildLineItemsTable(quotation, page2Items, 11, themeColor, useCustomLayout);
            document.add(table2);
        } else {
            PdfPTable table = buildLineItemsTable(quotation, allItems, 1, themeColor, useCustomLayout);
            document.add(table);
        }
    }

    private PdfPTable buildLineItemsTable(Quotation quotation, java.util.List<QuotationItem> items, int startRowNumber) throws DocumentException {
        return buildLineItemsTable(quotation, items, startRowNumber, NAVY_PRIMARY, true);
    }

    private PdfPTable buildLineItemsTable(Quotation quotation, java.util.List<QuotationItem> items, int startRowNumber, java.awt.Color themeColor) throws DocumentException {
        return buildLineItemsTable(quotation, items, startRowNumber, themeColor, true);
    }

    private PdfPTable buildLineItemsTable(Quotation quotation, java.util.List<QuotationItem> items, int startRowNumber, java.awt.Color themeColor, boolean useCustomLayout) throws DocumentException {
        Font headerFont = getAppropriateFont(true, 6.8f, java.awt.Color.WHITE);
        Font cellFont = FontFactory.getFont(FontFactory.HELVETICA, 7.0f, TEXT_DARK);

        String currencyCode = quotation.getCurrency() != null ? quotation.getCurrency().name() : "INR";
        String curSym = "USD".equalsIgnoreCase(currencyCode) ? "$" : "₹";

        java.util.List<com.acrovix.admin.entity.QuotationColumnConfig> configs = new java.util.ArrayList<>();
        if (useCustomLayout && quotation.getColumnConfigs() != null && !quotation.getColumnConfigs().isEmpty()) {
            configs.addAll(quotation.getColumnConfigs().stream()
                    .filter(c -> c.getVisible() != null && c.getVisible())
                    .filter(c -> !PDF_DOCUMENT_METADATA_KEYS.contains(c.getColumnKey()))
                    .sorted(java.util.Comparator.comparing(com.acrovix.admin.entity.QuotationColumnConfig::getSortOrder))
                    .collect(java.util.stream.Collectors.toList()));
        }
        if (configs.isEmpty()) {
            // Default 11 columns matching reference
            String[] keys = {"rowNumber", "sku", "description", "hsnSac", "quantity", "listPrice", "discountPercent", "unitPrice", "taxPercent", "taxAmount", "total"};
            String[] displayNames = {"#", "SKU", "DESCRIPTION", "HSN / SAC", "QTY", "LIST PRICE (" + curSym + ")", "DISC %", "UNIT PRICE (" + curSym + ")", "TAX %", "TAX AMT. (" + curSym + ")", "TOTAL (" + curSym + ")"};
            for (int i = 0; i < keys.length; i++) {
                com.acrovix.admin.entity.QuotationColumnConfig c = new com.acrovix.admin.entity.QuotationColumnConfig();
                c.setColumnKey(keys[i]);
                c.setDisplayName(displayNames[i]);
                c.setVisible(true);
                c.setIsCustom(false);
                configs.add(c);
            }
        }

        int colCount = configs.size();
        PdfPTable table = new PdfPTable(colCount);
        table.setWidthPercentage(100);
        table.setSpacingBefore(4f);
        table.setSpacingAfter(4f);

        float[] widths = new float[colCount];
        for (int i = 0; i < colCount; i++) {
            String key = configs.get(i).getColumnKey();
            if ("rowNumber".equals(key)) widths[i] = 3.5f;
            else if ("sku".equals(key)) widths[i] = 7.5f;
            else if ("description".equals(key)) widths[i] = 21.5f;
            else if ("hsnSac".equals(key)) widths[i] = 7.5f;
            else if ("quantity".equals(key)) widths[i] = 5.0f;
            else if ("listPrice".equals(key)) widths[i] = 9.5f;
            else if ("discountPercent".equals(key)) widths[i] = 5.5f;
            else if ("unitPrice".equals(key)) widths[i] = 9.5f;
            else if ("taxPercent".equals(key)) widths[i] = 6.0f;
            else if ("taxAmount".equals(key)) widths[i] = 10.5f;
            else if ("total".equals(key)) widths[i] = 14.0f;
            else widths[i] = 8.0f;
        }
        table.setWidths(widths);
        table.setHeaderRows(1);

        // Header Cells
        for (com.acrovix.admin.entity.QuotationColumnConfig c : configs) {
            String dispName = c.getDisplayName();
            if (dispName != null) {
                // Ensure currency symbol in header matches quotation currency
                if (dispName.contains("(₹)") && "USD".equalsIgnoreCase(currencyCode)) {
                    dispName = dispName.replace("(₹)", "($)");
                } else if (!dispName.contains("(") && !dispName.contains(")")) {
                    if ("listPrice".equals(c.getColumnKey()) || "unitPrice".equals(c.getColumnKey()) || "taxAmount".equals(c.getColumnKey()) || "total".equals(c.getColumnKey())) {
                        dispName += " (" + curSym + ")";
                    }
                }
            } else {
                dispName = c.getColumnKey();
            }

            PdfPCell hCell = new PdfPCell(new Phrase(dispName, headerFont));
            hCell.setBackgroundColor(themeColor != null ? themeColor : NAVY_PRIMARY);
            hCell.setBorderColor(new java.awt.Color(30, 41, 59));
            hCell.setBorderWidth(0.5f);
            hCell.setPaddingTop(5f);
            hCell.setPaddingBottom(5f);
            hCell.setPaddingLeft(3f);
            hCell.setPaddingRight(3f);

            int align = Element.ALIGN_RIGHT;
            if ("rowNumber".equals(c.getColumnKey()) || "hsnSac".equals(c.getColumnKey())) {
                align = Element.ALIGN_CENTER;
            } else if ("sku".equals(c.getColumnKey()) || "description".equals(c.getColumnKey())) {
                align = Element.ALIGN_LEFT;
            }
            hCell.setHorizontalAlignment(align);
            table.addCell(hCell);
        }

        // Data Rows
        int rowIndex = startRowNumber;
        for (QuotationItem item : items) {
            BigDecimal qty = item.getQuantity() != null ? item.getQuantity() : BigDecimal.ZERO;
            BigDecimal unitPrice = item.getUnitPrice() != null ? item.getUnitPrice() : BigDecimal.ZERO;
            BigDecimal listPrice = item.getListPrice() != null ? item.getListPrice() : unitPrice;
            BigDecimal discount = item.getDiscountPercent() != null ? item.getDiscountPercent() : BigDecimal.ZERO;
            BigDecimal taxPct = item.getTaxPercent() != null ? item.getTaxPercent() : BigDecimal.ZERO;

            BigDecimal netLine = qty.multiply(unitPrice).setScale(2, java.math.RoundingMode.HALF_UP);
            BigDecimal taxAmt = netLine.multiply(taxPct).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
            BigDecimal lineTotal = item.getLineTotal() != null ? item.getLineTotal() : netLine.add(taxAmt);

            for (com.acrovix.admin.entity.QuotationColumnConfig c : configs) {
                String val = "";
                int align = Element.ALIGN_RIGHT;

                if (c.getIsCustom() != null && c.getIsCustom()) {
                    if (item.getCustomValues() != null && item.getCustomValues().containsKey(c.getColumnKey())) {
                        val = item.getCustomValues().get(c.getColumnKey());
                    }
                    align = Element.ALIGN_LEFT;
                } else {
                    switch (c.getColumnKey()) {
                        case "rowNumber":
                            val = String.valueOf(rowIndex);
                            align = Element.ALIGN_CENTER;
                            break;
                        case "sku":
                            val = item.getSku() != null ? item.getSku() : "";
                            align = Element.ALIGN_LEFT;
                            break;
                        case "description":
                            val = item.getDescription() != null ? item.getDescription() : "";
                            align = Element.ALIGN_LEFT;
                            break;
                        case "hsnSac":
                            val = item.getHsnSac() != null ? item.getHsnSac() : "";
                            align = Element.ALIGN_CENTER;
                            break;
                        case "quantity":
                            val = formatDecimal(qty);
                            align = Element.ALIGN_RIGHT;
                            break;
                        case "listPrice":
                            val = formatAmount(listPrice, currencyCode);
                            align = Element.ALIGN_RIGHT;
                            break;
                        case "discountPercent":
                            val = formatDecimal(discount);
                            align = Element.ALIGN_RIGHT;
                            break;
                        case "unitPrice":
                            val = formatAmount(unitPrice, currencyCode);
                            align = Element.ALIGN_RIGHT;
                            break;
                        case "taxPercent":
                            val = formatDecimal(taxPct);
                            align = Element.ALIGN_RIGHT;
                            break;
                        case "taxAmount":
                            val = formatAmount(taxAmt, currencyCode);
                            align = Element.ALIGN_RIGHT;
                            break;
                        case "taxableValue":
                            val = formatAmount(netLine, currencyCode);
                            align = Element.ALIGN_RIGHT;
                            break;
                        case "total":
                            val = formatAmount(lineTotal, currencyCode);
                            align = Element.ALIGN_RIGHT;
                            break;
                        default:
                            val = "";
                    }
                }

                PdfPCell cell = new PdfPCell(new Phrase(val, cellFont));
                cell.setBorderColor(GRID_BORDER);
                cell.setBorderWidth(0.5f);
                cell.setPaddingTop(4.5f);
                cell.setPaddingBottom(4.5f);
                cell.setPaddingLeft(3f);
                cell.setPaddingRight(3f);
                cell.setHorizontalAlignment(align);
                table.addCell(cell);
            }
            rowIndex++;
        }

        return table;
    }

    private void addQuotationClosingSections(Document document, PdfWriter writer, Quotation quotation, CompanySettingsResponse settings) throws DocumentException {
        addQuotationClosingSections(document, writer, quotation, settings, NAVY_PRIMARY, true);
    }

    private void addQuotationClosingSections(Document document, PdfWriter writer, Quotation quotation, CompanySettingsResponse settings, java.awt.Color themeColor) throws DocumentException {
        addQuotationClosingSections(document, writer, quotation, settings, themeColor, true);
    }

    private void addQuotationClosingSections(Document document, PdfWriter writer, Quotation quotation, CompanySettingsResponse settings, java.awt.Color themeColor, boolean useCustomLayout) throws DocumentException {
        String currencyCode = quotation.getCurrency() != null ? quotation.getCurrency().name() : "INR";
        String curSym = "USD".equalsIgnoreCase(currencyCode) ? "$ " : "₹ ";

        // 1. Totals Summary Block (Right Aligned)
        Font summaryLabelFont = FontFactory.getFont(FontFactory.HELVETICA, 8.0f, TEXT_DARK);
        Font summaryBoldFont = getAppropriateFont(true, 8.5f, TEXT_DARK);
        Font grandLabelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9.5f, java.awt.Color.WHITE);
        Font grandValFont = getAppropriateFont(true, 11.5f, java.awt.Color.WHITE);

        PdfPTable summaryTable = new PdfPTable(2);
        summaryTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
        summaryTable.setWidthPercentage(45);
        summaryTable.setWidths(new float[]{55f, 45f});
        summaryTable.setSpacingBefore(8f);
        summaryTable.setSpacingAfter(8f);

        BigDecimal subtotal = quotation.getSubtotal() != null ? quotation.getSubtotal() : BigDecimal.ZERO;
        BigDecimal discount = quotation.getDiscountAmount() != null ? quotation.getDiscountAmount() : BigDecimal.ZERO;

        if (discount.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal grossSubtotal = subtotal.add(discount);
            PdfPCell grossLabel = new PdfPCell(new Phrase("Subtotal (Gross)", summaryLabelFont));
            grossLabel.setBorder(Rectangle.NO_BORDER);
            grossLabel.setPaddingTop(3f);
            grossLabel.setPaddingBottom(3f);
            summaryTable.addCell(grossLabel);

            PdfPCell grossVal = new PdfPCell(new Phrase(curSym + formatAmount(grossSubtotal, currencyCode), summaryBoldFont));
            grossVal.setBorder(Rectangle.NO_BORDER);
            grossVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
            grossVal.setPaddingTop(3f);
            grossVal.setPaddingBottom(3f);
            summaryTable.addCell(grossVal);

            PdfPCell discLabel = new PdfPCell(new Phrase("Total Discount", summaryLabelFont));
            discLabel.setBorder(Rectangle.NO_BORDER);
            discLabel.setPaddingTop(3f);
            discLabel.setPaddingBottom(3f);
            summaryTable.addCell(discLabel);

            PdfPCell discVal = new PdfPCell(new Phrase("-" + curSym + formatAmount(discount, currencyCode), summaryBoldFont));
            discVal.setBorder(Rectangle.NO_BORDER);
            discVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
            discVal.setPaddingTop(3f);
            discVal.setPaddingBottom(3f);
            summaryTable.addCell(discVal);
        }

        // Taxable Amount
        PdfPCell taxLabel = new PdfPCell(new Phrase("Taxable Amount", summaryLabelFont));
        taxLabel.setBorder(Rectangle.NO_BORDER);
        taxLabel.setPaddingTop(3f);
        taxLabel.setPaddingBottom(3f);
        summaryTable.addCell(taxLabel);

        PdfPCell taxVal = new PdfPCell(new Phrase(curSym + formatAmount(subtotal, currencyCode), summaryBoldFont));
        taxVal.setBorder(Rectangle.NO_BORDER);
        taxVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
        taxVal.setPaddingTop(3f);
        taxVal.setPaddingBottom(3f);
        summaryTable.addCell(taxVal);

        // Tax summary / rate
        java.util.Set<BigDecimal> taxRates = new java.util.HashSet<>();
        if (quotation.getItems() != null) {
            for (QuotationItem it : quotation.getItems()) {
                if (it.getTaxPercent() != null && it.getTaxPercent().compareTo(BigDecimal.ZERO) > 0) {
                    taxRates.add(it.getTaxPercent());
                }
            }
        }
        String taxLabelText = "Total Tax";
        if (taxRates.size() == 1) {
            taxLabelText = "Total Tax (" + formatDecimal(taxRates.iterator().next()) + "%)";
        } else if (taxRates.size() > 1) {
            taxLabelText = "Total Tax (Applicable)";
        }

        BigDecimal taxAmount = quotation.getTaxAmount() != null ? quotation.getTaxAmount() : BigDecimal.ZERO;
        PdfPCell totTaxLabel = new PdfPCell(new Phrase(taxLabelText, summaryLabelFont));
        totTaxLabel.setBorder(Rectangle.NO_BORDER);
        totTaxLabel.setPaddingTop(3f);
        totTaxLabel.setPaddingBottom(4f);
        summaryTable.addCell(totTaxLabel);

        PdfPCell totTaxVal = new PdfPCell(new Phrase(curSym + formatAmount(taxAmount, currencyCode), summaryBoldFont));
        totTaxVal.setBorder(Rectangle.NO_BORDER);
        totTaxVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
        totTaxVal.setPaddingTop(3f);
        totTaxVal.setPaddingBottom(4f);
        summaryTable.addCell(totTaxVal);

        // Grand Total row (Solid Theme Color Banner)
        BigDecimal grandTotal = quotation.getGrandTotal() != null ? quotation.getGrandTotal() : subtotal.add(taxAmount);
        java.awt.Color grandTotalBg = themeColor != null ? themeColor : BLUE_ACCENT;
        PdfPCell gtLabel = new PdfPCell(new Phrase("Grand Total", grandLabelFont));
        gtLabel.setBackgroundColor(grandTotalBg);
        gtLabel.setBorder(Rectangle.NO_BORDER);
        gtLabel.setPaddingTop(6f);
        gtLabel.setPaddingBottom(6f);
        gtLabel.setPaddingLeft(8f);
        summaryTable.addCell(gtLabel);

        PdfPCell gtVal = new PdfPCell(new Phrase(curSym + formatAmount(grandTotal, currencyCode), grandValFont));
        gtVal.setBackgroundColor(grandTotalBg);
        gtVal.setBorder(Rectangle.NO_BORDER);
        gtVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
        gtVal.setPaddingTop(6f);
        gtVal.setPaddingBottom(6f);
        gtVal.setPaddingRight(8f);
        summaryTable.addCell(gtVal);

        document.add(summaryTable);

        // 2. Amount in words horizontal panel
        PdfPTable wordsPanel = new PdfPTable(1);
        wordsPanel.setWidthPercentage(100);
        wordsPanel.setSpacingBefore(4f);
        wordsPanel.setSpacingAfter(8f);

        String wordsText = convertAmountToWords(grandTotal, currencyCode);
        Paragraph wordsPara = new Paragraph();
        wordsPara.add(new Chunk("Total amount (in words):  ", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, TEXT_DARK)));
        wordsPara.add(new Chunk(wordsText, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, themeColor != null ? themeColor : NAVY_PRIMARY)));

        PdfPCell wordsCell = new PdfPCell(wordsPara);
        wordsCell.setBackgroundColor(ICE_BLUE_BG);
        wordsCell.setBorderColor(ICE_BLUE_BORDER);
        wordsCell.setBorderWidth(0.5f);
        wordsCell.setPadding(6f);
        wordsCell.setPaddingLeft(8f);
        wordsPanel.addCell(wordsCell);
        document.add(wordsPanel);

        // 3. Terms & Conditions Card
        boolean showTerms = useCustomLayout ? isSectionVisible(quotation, "termsAndConditions", true) : true;
        boolean hasQuotationTerms = quotation.getTermsAndConditions() != null && !quotation.getTermsAndConditions().isBlank();
        boolean hasDefaultTerms = settings != null && settings.getDefaultTermsAndConditions() != null && !settings.getDefaultTermsAndConditions().isBlank();

        if (showTerms && (hasQuotationTerms || hasDefaultTerms)) {
            String terms = hasQuotationTerms ? quotation.getTermsAndConditions() : settings.getDefaultTermsAndConditions();
            String[] termsLines = terms.split("\n");

            PdfPTable termsCard = new PdfPTable(1);
            termsCard.setWidthPercentage(100);
            termsCard.setSpacingBefore(4f);
            termsCard.setSpacingAfter(8f);

            PdfPTable termsInner = new PdfPTable(1);
            termsInner.setWidthPercentage(100);

            Phrase termsHeaderPhrase = new Phrase();
            Image termsIcon = createVectorIcon(writer, "terms", 10f, 11f, BLUE_ACCENT);
            if (termsIcon != null) {
                termsIcon.setAlignment(Image.ALIGN_MIDDLE);
                termsHeaderPhrase.add(new Chunk(termsIcon, 0, -1.5f));
                termsHeaderPhrase.add(new Chunk("  "));
            }
            termsHeaderPhrase.add(new Chunk("Terms & Conditions", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, BLUE_ACCENT)));

            PdfPCell termsHeader = new PdfPCell(termsHeaderPhrase);
            termsHeader.setBorder(Rectangle.NO_BORDER);
            termsHeader.setPaddingBottom(5f);
            termsInner.addCell(termsHeader);

            int termIndex = 1;
            Font termFont = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, TEXT_DARK);

            for (String tLine : termsLines) {
                String cleanLine = tLine.trim();
                if (!cleanLine.isEmpty()) {
                    // Strip leading numbers if already present (e.g., "1. " or "1) ")
                    cleanLine = cleanLine.replaceFirst("^[0-9]+[.)]\\s*", "");

                    PdfPTable rowTbl = new PdfPTable(2);
                    rowTbl.setWidthPercentage(100);
                    rowTbl.setWidths(new float[]{3.2f, 96.8f});

                    Image numIcon = createCircleNumberIcon(writer, termIndex, 9.5f, BLUE_ACCENT);
                    PdfPCell numCell = new PdfPCell();
                    numCell.setBorder(Rectangle.NO_BORDER);
                    numCell.setPaddingTop(1f);
                    numCell.setPaddingBottom(2.5f);
                    if (numIcon != null) {
                        numCell.addElement(numIcon);
                    } else {
                        numCell.addElement(new Phrase("(" + termIndex + ")", termFont));
                    }

                    PdfPCell textCell = new PdfPCell(new Phrase(cleanLine, termFont));
                    textCell.setBorder(Rectangle.NO_BORDER);
                    textCell.setPaddingTop(0.5f);
                    textCell.setPaddingBottom(2.5f);

                    rowTbl.addCell(numCell);
                    rowTbl.addCell(textCell);

                    PdfPCell wrapCell = new PdfPCell(rowTbl);
                    wrapCell.setBorder(Rectangle.NO_BORDER);
                    wrapCell.setPadding(0);
                    termsInner.addCell(wrapCell);

                    termIndex++;
                }
            }

            PdfPCell mainTermsCell = new PdfPCell(termsInner);
            mainTermsCell.setBackgroundColor(ICE_BLUE_BG);
            mainTermsCell.setBorderColor(ICE_BLUE_BORDER);
            mainTermsCell.setBorderWidth(0.5f);
            mainTermsCell.setPadding(6f);
            mainTermsCell.setPaddingLeft(8f);
            termsCard.addCell(mainTermsCell);

            document.add(termsCard);
        }

        // 4. Bank Details & Authorized Signatory Card
        String companyName = (settings != null && settings.getCompanyName() != null && !settings.getCompanyName().isBlank()) 
                ? settings.getCompanyName() : "ACROVIX INNOVATIONS PRIVATE LIMITED";

        Long tenantId = (quotation != null && quotation.getTenantId() != null) ? quotation.getTenantId() 
                : (settings != null && settings.getTenantId() != null ? settings.getTenantId() : Long.valueOf(1L));
        com.acrovix.admin.entity.CompanyBankAccount defaultBankAcc = null;
        if (companyBankAccountRepository != null && tenantId != null) {
            defaultBankAcc = companyBankAccountRepository.findFirstByTenantIdAndIsDefaultTrueAndIsActiveTrue(tenantId).orElse(null);
            if (defaultBankAcc == null) {
                defaultBankAcc = companyBankAccountRepository.findFirstByTenantIdAndIsActiveTrueOrderByIdAsc(tenantId).orElse(null);
            }
        }

        // Dynamic bank details: use quotation-specific selected bank account, fallback to default bank account, then settings
        boolean hasQuotationBank = quotation != null && quotation.getBankName() != null && !quotation.getBankName().isBlank();
        String bBank = hasQuotationBank ? quotation.getBankName() 
                : (defaultBankAcc != null && defaultBankAcc.getBankName() != null ? defaultBankAcc.getBankName() 
                : (settings != null && settings.getBankName() != null ? settings.getBankName() : ""));
        String bHolder = hasQuotationBank && quotation.getBankAccountHolder() != null && !quotation.getBankAccountHolder().isBlank()
                ? quotation.getBankAccountHolder()
                : (defaultBankAcc != null && defaultBankAcc.getAccountHolder() != null ? defaultBankAcc.getAccountHolder() : companyName);
        String bAcc = hasQuotationBank ? (quotation.getBankAccountNumber() != null ? quotation.getBankAccountNumber() : "")
                : (defaultBankAcc != null && defaultBankAcc.getBankAccountNumber() != null ? defaultBankAcc.getBankAccountNumber() 
                : (settings != null && settings.getBankAccountNumber() != null ? settings.getBankAccountNumber() : ""));
        String bIfsc = hasQuotationBank ? (quotation.getBankIfsc() != null ? quotation.getBankIfsc() : "")
                : (defaultBankAcc != null && defaultBankAcc.getBankIfsc() != null ? defaultBankAcc.getBankIfsc() 
                : (settings != null && settings.getBankIfsc() != null ? settings.getBankIfsc() : ""));
        String bBranch = hasQuotationBank ? (quotation.getBankBranch() != null ? quotation.getBankBranch() : "")
                : (defaultBankAcc != null && defaultBankAcc.getBankBranch() != null ? defaultBankAcc.getBankBranch() 
                : (settings != null && settings.getBankBranch() != null ? settings.getBankBranch() : ""));

        boolean showBank = useCustomLayout ? isSectionVisible(quotation, "bankDetails", true) : true;
        boolean showSignature = useCustomLayout ? isSectionVisible(quotation, "signature", true) : true;

        PdfPCell bankCard = null;
        if (showBank) {
            PdfPTable bankInner = new PdfPTable(2);
            bankInner.setWidthPercentage(100);
            bankInner.setWidths(new float[]{34f, 66f});

            Phrase bankHeaderPhrase = new Phrase();
            Image bankIcon = createVectorIcon(writer, "bank", 11f, 10f, BLUE_ACCENT);
            if (bankIcon != null) {
                bankIcon.setAlignment(Image.ALIGN_MIDDLE);
                bankHeaderPhrase.add(new Chunk(bankIcon, 0, -1.5f));
                bankHeaderPhrase.add(new Chunk("  "));
            }
            bankHeaderPhrase.add(new Chunk("Bank Details", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, BLUE_ACCENT)));

            PdfPCell bankHeader = new PdfPCell(bankHeaderPhrase);
            bankHeader.setColspan(2);
            bankHeader.setBorder(Rectangle.NO_BORDER);
            bankHeader.setPaddingBottom(5f);
            bankInner.addCell(bankHeader);

            Font bLabel = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, TEXT_MUTED);
            Font bVal = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, TEXT_DARK);

            if (!bBank.isBlank()) addKeyValueRow(bankInner, "Bank", bBank, bLabel, bVal);
            if (!bHolder.isBlank() && (!bBank.isBlank() || !bAcc.isBlank())) addKeyValueRow(bankInner, "Account Holder", bHolder, bLabel, bVal);
            if (!bAcc.isBlank()) addKeyValueRow(bankInner, "Account Number", bAcc, bLabel, bVal);
            if (!bIfsc.isBlank()) addKeyValueRow(bankInner, "IFSC Code", bIfsc, bLabel, bVal);
            if (!bBranch.isBlank()) addKeyValueRow(bankInner, "Branch", bBranch, bLabel, bVal);

            bankCard = new PdfPCell(bankInner);
            bankCard.setBackgroundColor(ICE_BLUE_BG);
            bankCard.setBorderColor(ICE_BLUE_BORDER);
            bankCard.setBorderWidth(0.5f);
            bankCard.setPadding(6f);
            bankCard.setPaddingLeft(8f);
        }

        PdfPCell sigContainer = null;
        if (showSignature) {
            PdfPTable sigInner = new PdfPTable(1);
            sigInner.setWidthPercentage(100);

            PdfPCell forCompanyCell = new PdfPCell(new Phrase("For " + companyName, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.0f, NAVY_PRIMARY)));
            forCompanyCell.setBorder(Rectangle.NO_BORDER);
            forCompanyCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            forCompanyCell.setPaddingBottom(6f);
            sigInner.addCell(forCompanyCell);

            // Signature image or spacing
            boolean sigRendered = false;
            if (settings != null && settings.getSignatureUrl() != null && !settings.getSignatureUrl().isBlank()) {
                try {
                    Image sigImg = Image.getInstance(new java.net.URL(settings.getSignatureUrl()));
                    sigImg.scaleToFit(110f, 32f);
                    sigImg.setAlignment(Element.ALIGN_CENTER);
                    PdfPCell sigImgCell = new PdfPCell(sigImg);
                    sigImgCell.setBorder(Rectangle.NO_BORDER);
                    sigImgCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                    sigInner.addCell(sigImgCell);
                    sigRendered = true;
                } catch (Exception e) {
                    log.warn("Could not load signature image from URL");
                }
            }

            if (!sigRendered) {
                PdfPCell blankSig = new PdfPCell(new Phrase(" "));
                blankSig.setBorder(Rectangle.NO_BORDER);
                blankSig.setPaddingBottom(32f);
                sigInner.addCell(blankSig);
            }

            PdfPCell authTextCell = new PdfPCell(new Phrase("Authorized Signatory", FontFactory.getFont(FontFactory.HELVETICA, 7.5f, TEXT_MUTED)));
            authTextCell.setBorder(Rectangle.NO_BORDER);
            authTextCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            authTextCell.setPaddingTop(3f);
            sigInner.addCell(authTextCell);

            sigContainer = new PdfPCell(sigInner);
            sigContainer.setBorder(Rectangle.NO_BORDER);
            sigContainer.setVerticalAlignment(Element.ALIGN_BOTTOM);
            sigContainer.setPaddingLeft(12f);
        }

        if (showBank && showSignature) {
            PdfPTable bankSigTable = new PdfPTable(2);
            bankSigTable.setWidthPercentage(100);
            bankSigTable.setWidths(new float[]{55f, 45f});
            bankSigTable.setSpacingBefore(4f);
            bankSigTable.addCell(bankCard);
            bankSigTable.addCell(sigContainer);
            document.add(bankSigTable);
        } else if (showBank) {
            PdfPTable bankTable = new PdfPTable(1);
            bankTable.setWidthPercentage(100);
            bankTable.setSpacingBefore(4f);
            bankTable.addCell(bankCard);
            document.add(bankTable);
        } else if (showSignature) {
            PdfPTable sigTable = new PdfPTable(1);
            sigTable.setWidthPercentage(45);
            sigTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
            sigTable.setSpacingBefore(4f);
            sigTable.addCell(sigContainer);
            document.add(sigTable);
        }
        addDigitalDocumentDisclaimer(document);
    }

    private static String formatDecimal(BigDecimal val) {
        if (val == null) return "0.00";
        return val.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString();
    }

    public static String formatAmount(BigDecimal amount, String currencyCode) {
        if (amount == null) amount = BigDecimal.ZERO;
        BigDecimal scaled = amount.setScale(2, java.math.RoundingMode.HALF_UP);

        if (!"INR".equalsIgnoreCase(currencyCode)) {
            java.text.NumberFormat nf = java.text.NumberFormat.getNumberInstance(java.util.Locale.US);
            nf.setMinimumFractionDigits(2);
            nf.setMaximumFractionDigits(2);
            return nf.format(scaled);
        }

        // Indian Currency grouping (Lakh, Crore)
        String str = scaled.toPlainString();
        int dot = str.indexOf('.');
        String intPart = dot >= 0 ? str.substring(0, dot) : str;
        String decPart = dot >= 0 ? str.substring(dot) : ".00";

        boolean neg = intPart.startsWith("-");
        if (neg) intPart = intPart.substring(1);

        if (intPart.length() <= 3) {
            return (neg ? "-" : "") + intPart + decPart;
        }

        String lastThree = intPart.substring(intPart.length() - 3);
        String remaining = intPart.substring(0, intPart.length() - 3);

        StringBuilder sb = new StringBuilder();
        while (remaining.length() > 2) {
            sb.insert(0, "," + remaining.substring(remaining.length() - 2));
            remaining = remaining.substring(0, remaining.length() - 2);
        }
        sb.insert(0, remaining);
        sb.append(",").append(lastThree).append(decPart);
        return (neg ? "-" : "") + sb.toString();
    }

    public static String convertAmountToWords(BigDecimal amount, String currencyCode) {
        String code = (currencyCode != null && !currencyCode.trim().isEmpty()) ? currencyCode.trim().toUpperCase() : "INR";
        if (amount == null || amount.compareTo(BigDecimal.ZERO) == 0) {
            String majorZero = switch (code) {
                case "USD" -> "Zero Dollars";
                case "EUR" -> "Zero Euros";
                case "GBP" -> "Zero Pounds";
                case "AED" -> "Zero Dirhams";
                case "CAD" -> "Zero Canadian Dollars";
                case "AUD" -> "Zero Australian Dollars";
                case "JPY" -> "Zero Yen";
                case "INR" -> "Zero Rupees";
                default -> "Zero " + code;
            };
            return code + " " + majorZero + " Only";
        }

        boolean isIndian = "INR".equalsIgnoreCase(code);
        BigDecimal abs = amount.abs().setScale(2, java.math.RoundingMode.HALF_UP);
        long whole = abs.longValue();
        long fraction = abs.remainder(BigDecimal.ONE).multiply(BigDecimal.valueOf(100)).longValue();

        String majorUnit;
        String minorUnit;
        boolean hasMinor = true;

        switch (code) {
            case "USD":
                majorUnit = whole == 1 ? "Dollar" : "Dollars";
                minorUnit = fraction == 1 ? "Cent" : "Cents";
                break;
            case "EUR":
                majorUnit = whole == 1 ? "Euro" : "Euros";
                minorUnit = fraction == 1 ? "Cent" : "Cents";
                break;
            case "GBP":
                majorUnit = whole == 1 ? "Pound" : "Pounds";
                minorUnit = fraction == 1 ? "Penny" : "Pence";
                break;
            case "AED":
                majorUnit = "Dirhams";
                minorUnit = fraction == 1 ? "Fil" : "Fils";
                break;
            case "CAD":
                majorUnit = whole == 1 ? "Canadian Dollar" : "Canadian Dollars";
                minorUnit = fraction == 1 ? "Cent" : "Cents";
                break;
            case "AUD":
                majorUnit = whole == 1 ? "Australian Dollar" : "Australian Dollars";
                minorUnit = fraction == 1 ? "Cent" : "Cents";
                break;
            case "JPY":
                majorUnit = "Yen";
                minorUnit = "";
                hasMinor = false;
                break;
            case "INR":
                majorUnit = whole == 1 ? "Rupee" : "Rupees";
                minorUnit = fraction == 1 ? "Paisa" : "Paise";
                break;
            default:
                majorUnit = code;
                minorUnit = fraction == 1 ? "Cent" : "Cents";
                break;
        }

        StringBuilder sb = new StringBuilder();
        sb.append(code).append(" ");

        if (isIndian) {
            if (whole > 0) {
                sb.append(convertNumberToWords(whole)).append(" ").append(majorUnit);
            }
            if (fraction > 0) {
                if (whole > 0) sb.append(" and ");
                sb.append(convertNumberToWords(fraction)).append(" ").append(minorUnit);
            }
        } else {
            if (whole > 0) {
                sb.append(convertNumberToUsWords(whole)).append(" ").append(majorUnit);
            }
            if (hasMinor && fraction > 0) {
                if (whole > 0) sb.append(" and ");
                sb.append(convertNumberToUsWords(fraction)).append(" ").append(minorUnit);
            }
        }

        sb.append(" Only");
        return sb.toString();
    }

    private static String convertNumberToUsWords(long n) {
        if (n < 0) return "Minus " + convertNumberToUsWords(-n);
        if (n < 20) return units[(int) n];
        if (n < 100) return tens[(int) (n / 10)] + ((n % 10 != 0) ? " " : "") + units[(int) (n % 10)];
        if (n < 1000) return units[(int) (n / 100)] + " Hundred" + ((n % 100 != 0) ? " " : "") + convertNumberToUsWords(n % 100);
        if (n < 1000000) return convertNumberToUsWords(n / 1000) + " Thousand" + ((n % 1000 != 0) ? " " : "") + convertNumberToUsWords(n % 1000);
        if (n < 1000000000) return convertNumberToUsWords(n / 1000000) + " Million" + ((n % 1000000 != 0) ? " " : "") + convertNumberToUsWords(n % 1000000);
        return convertNumberToUsWords(n / 1000000000) + " Billion" + ((n % 1000000000 != 0) ? " " : "") + convertNumberToUsWords(n % 1000000000);
    }

    private static final String[] units = { "", "One", "Two", "Three", "Four",
        "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
        "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
        "Eighteen", "Nineteen" };

    private static final String[] tens = { 
        "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety" };

    private static String convertNumberToWords(long n) {
        if (n < 0) return "Minus " + convertNumberToWords(-n);
        if (n < 20) return units[(int) n];
        if (n < 100) return tens[(int) (n / 10)] + ((n % 10 != 0) ? " " : "") + units[(int) (n % 10)];
        if (n < 1000) return units[(int) (n / 100)] + " Hundred" + ((n % 100 != 0) ? " " : "") + convertNumberToWords(n % 100);
        if (n < 100000) return convertNumberToWords(n / 1000) + " Thousand" + ((n % 1000 != 0) ? " " : "") + convertNumberToWords(n % 1000);
        if (n < 10000000) return convertNumberToWords(n / 100000) + " Lakh" + ((n % 100000 != 0) ? " " : "") + convertNumberToWords(n % 100000);
        return convertNumberToWords(n / 10000000) + " Crore" + ((n % 10000000 != 0) ? " " : "") + convertNumberToWords(n % 10000000);
    }

    static class QuotationPageEvent extends PdfPageEventHelper {
        private final CompanySettingsResponse settings;
        private final java.awt.Color themeColor;
        private com.lowagie.text.pdf.PdfTemplate totalPagesTemplate;
        private com.lowagie.text.pdf.BaseFont baseFont;

        public QuotationPageEvent(CompanySettingsResponse settings) {
            this(settings, NAVY_PRIMARY);
        }

        public QuotationPageEvent(CompanySettingsResponse settings, java.awt.Color themeColor) {
            this.settings = settings;
            this.themeColor = themeColor != null ? themeColor : NAVY_PRIMARY;
        }

        @Override
        public void onOpenDocument(PdfWriter writer, Document document) {
            try {
                totalPagesTemplate = writer.getDirectContent().createTemplate(30f, 16f);
                baseFont = com.lowagie.text.pdf.BaseFont.createFont(
                        com.lowagie.text.pdf.BaseFont.HELVETICA,
                        com.lowagie.text.pdf.BaseFont.WINANSI,
                        com.lowagie.text.pdf.BaseFont.NOT_EMBEDDED);
            } catch (Exception e) {
                log.warn("Could not initialize footer template fonts", e);
            }
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte cb = writer.getDirectContentUnder();
            float pageWidth = document.getPageSize().getWidth();
            float pageHeight = document.getPageSize().getHeight();

            java.awt.Color primaryAccent = themeColor != null ? themeColor : new java.awt.Color(20, 55, 120);

            // 1. Top-Right decorative triangles (Page 1)
            if (writer.getPageNumber() == 1) {
                cb.saveState();
                cb.setColorFill(primaryAccent); // Theme Color
                cb.moveTo(pageWidth - 75f, pageHeight);
                cb.lineTo(pageWidth, pageHeight);
                cb.lineTo(pageWidth, pageHeight - 75f);
                cb.closePath();
                cb.fill();

                cb.setColorFill(new java.awt.Color(56, 145, 235)); // Sky Blue
                cb.moveTo(pageWidth - 100f, pageHeight);
                cb.lineTo(pageWidth - 60f, pageHeight);
                cb.lineTo(pageWidth, pageHeight - 35f);
                cb.lineTo(pageWidth, pageHeight - 75f);
                cb.closePath();
                cb.fill();
                cb.restoreState();
            }

            // 2. Bottom-Right decorative triangles (All pages)
            cb.saveState();
            cb.setColorFill(new java.awt.Color(56, 145, 235)); // Sky Blue
            cb.moveTo(pageWidth - 85f, 0);
            cb.lineTo(pageWidth, 0);
            cb.lineTo(pageWidth, 75f);
            cb.closePath();
            cb.fill();

            cb.setColorFill(primaryAccent); // Theme Color
            cb.moveTo(pageWidth - 55f, 0);
            cb.lineTo(pageWidth, 0);
            cb.lineTo(pageWidth, 48f);
            cb.closePath();
            cb.fill();
            cb.restoreState();

            // 3. Footer Contact Information & Page Numbering
            PdfContentByte fg = writer.getDirectContent();
            float footerY = 16f;
            Font footerFont = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, new java.awt.Color(71, 85, 105));

            boolean isAcrovix = (settings == null || settings.getTenantId() == null || settings.getTenantId().equals(1L) 
                    || (settings.getCompanyName() != null && settings.getCompanyName().toUpperCase().contains("ACROVIX")));
            String phone = (settings != null && settings.getPhone() != null && !settings.getPhone().isBlank()) 
                    ? settings.getPhone() : (isAcrovix ? "+91 98765 43210" : "");
            String email = (settings != null && settings.getEmail() != null && !settings.getEmail().isBlank()) 
                    ? settings.getEmail() : (isAcrovix ? "contact@acrovix.com" : "");
            String website = (settings != null && settings.getWebsite() != null && !settings.getWebsite().isBlank()) 
                    ? settings.getWebsite() : (isAcrovix ? "www.acrovix.com" : "");

            PdfPTable footerTable = new PdfPTable(3);
            footerTable.setTotalWidth(pageWidth * 0.65f);
            footerTable.setWidths(new float[]{32f, 38f, 30f});

            Image pIcon = createVectorIcon(writer, "phone", 9f, 9f, BLUE_ACCENT);
            Phrase pPhrase = new Phrase();
            if (pIcon != null) { pPhrase.add(new Chunk(pIcon, 0, -1.5f)); pPhrase.add(new Chunk("  ")); }
            pPhrase.add(new Chunk(phone, footerFont));
            PdfPCell cPhone = new PdfPCell(pPhrase);
            cPhone.setBorder(Rectangle.NO_BORDER);
            cPhone.setPadding(0);
            footerTable.addCell(cPhone);

            Image mIcon = createVectorIcon(writer, "email", 10f, 8f, BLUE_ACCENT);
            Phrase mPhrase = new Phrase();
            if (mIcon != null) { mPhrase.add(new Chunk(mIcon, 0, -1.5f)); mPhrase.add(new Chunk("  ")); }
            mPhrase.add(new Chunk(email, footerFont));
            PdfPCell cEmail = new PdfPCell(mPhrase);
            cEmail.setBorder(Rectangle.NO_BORDER);
            cEmail.setPadding(0);
            footerTable.addCell(cEmail);

            Image gIcon = createVectorIcon(writer, "globe", 9f, 9f, BLUE_ACCENT);
            Phrase gPhrase = new Phrase();
            if (gIcon != null) { gPhrase.add(new Chunk(gIcon, 0, -1.5f)); gPhrase.add(new Chunk("  ")); }
            gPhrase.add(new Chunk(website, footerFont));
            PdfPCell cWeb = new PdfPCell(gPhrase);
            cWeb.setBorder(Rectangle.NO_BORDER);
            cWeb.setPadding(0);
            footerTable.addCell(cWeb);

            footerTable.writeSelectedRows(0, -1, 24f, footerY + 9f, fg);

            String pageText = "Page " + writer.getPageNumber() + " of ";
            float pageNumX = pageWidth - 65f;
            ColumnText.showTextAligned(fg, Element.ALIGN_RIGHT, new Phrase(pageText, footerFont), pageNumX, footerY, 0);
            if (totalPagesTemplate != null) {
                fg.addTemplate(totalPagesTemplate, pageNumX + 1f, footerY - 1f);
            }
        }

        @Override
        public void onCloseDocument(PdfWriter writer, Document document) {
            if (totalPagesTemplate != null && baseFont != null) {
                totalPagesTemplate.beginText();
                totalPagesTemplate.setFontAndSize(baseFont, 7.5f);
                totalPagesTemplate.setColorFill(new java.awt.Color(71, 85, 105));
                totalPagesTemplate.setTextMatrix(0, 1f);
                int total = Math.max(1, writer.getPageNumber() - 1);
                totalPagesTemplate.showText(String.valueOf(total));
                totalPagesTemplate.endText();
            }
        }
    }

    static class PurchaseOrderPageEvent extends PdfPageEventHelper {
        private final com.acrovix.admin.entity.PurchaseOrder po;
        private final CompanySettingsResponse settings;
        private com.lowagie.text.pdf.PdfTemplate totalPagesTemplate;
        private com.lowagie.text.pdf.BaseFont baseFont;

        public PurchaseOrderPageEvent(com.acrovix.admin.entity.PurchaseOrder po, CompanySettingsResponse settings) {
            this.po = po;
            this.settings = settings;
        }

        @Override
        public void onOpenDocument(PdfWriter writer, Document document) {
            try {
                totalPagesTemplate = writer.getDirectContent().createTemplate(30f, 16f);
                baseFont = com.lowagie.text.pdf.BaseFont.createFont(
                        com.lowagie.text.pdf.BaseFont.HELVETICA,
                        com.lowagie.text.pdf.BaseFont.WINANSI,
                        com.lowagie.text.pdf.BaseFont.NOT_EMBEDDED);
            } catch (Exception e) {
                log.warn("Could not initialize footer template fonts for PO", e);
            }
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte cb = writer.getDirectContentUnder();
            float pageWidth = document.getPageSize().getWidth();
            float pageHeight = document.getPageSize().getHeight();

            // 1. Top-Right decorative triangles on Page 1 (Subtle, outside company info area)
            if (writer.getPageNumber() == 1) {
                cb.saveState();
                // Subtle Teal / Cyan accent in the corner
                cb.setColorFill(new java.awt.Color(0, 163, 196)); // #00A3C4
                cb.moveTo(pageWidth - 65f, pageHeight);
                cb.lineTo(pageWidth, pageHeight);
                cb.lineTo(pageWidth, pageHeight - 55f);
                cb.closePath();
                cb.fill();

                // Dark Navy inner corner accent
                cb.setColorFill(new java.awt.Color(20, 55, 120)); // Navy #143778
                cb.moveTo(pageWidth - 38f, pageHeight);
                cb.lineTo(pageWidth, pageHeight);
                cb.lineTo(pageWidth, pageHeight - 35f);
                cb.closePath();
                cb.fill();
                cb.restoreState();
            }

            // 2. Bottom-Right decorative triangles on all pages
            cb.saveState();
            cb.setColorFill(new java.awt.Color(56, 145, 235)); // Sky Blue
            cb.moveTo(pageWidth - 85f, 0);
            cb.lineTo(pageWidth, 0);
            cb.lineTo(pageWidth, 55f);
            cb.closePath();
            cb.fill();

            cb.setColorFill(new java.awt.Color(20, 55, 120)); // Navy
            cb.moveTo(pageWidth - 55f, 0);
            cb.lineTo(pageWidth, 0);
            cb.lineTo(pageWidth, 36f);
            cb.closePath();
            cb.fill();

            // 3. Bottom accent bar along bottom edge
            cb.setColorFill(BLUE_ACCENT);
            cb.rectangle(0, 0, pageWidth - 85f, 3.5f);
            cb.fill();
            cb.restoreState();

            // 4. Thin horizontal divider line above footer text
            PdfContentByte fg = writer.getDirectContent();
            fg.saveState();
            fg.setColorStroke(ICE_BLUE_BORDER);
            fg.setLineWidth(0.6f);
            fg.moveTo(28f, 25f);
            fg.lineTo(pageWidth - 28f, 25f);
            fg.stroke();
            fg.restoreState();

            // 5. Digital document disclaimer on left
            float footerY = 13f;
            Font footerFont = FontFactory.getFont(FontFactory.HELVETICA, 7.2f, TEXT_MUTED);
            ColumnText.showTextAligned(fg, Element.ALIGN_LEFT, new Phrase(DIGITAL_DOCUMENT_DISCLAIMER, footerFont), 28f, footerY, 0);

            // 6. Footer Page Numbering (e.g. Page 1 of 1)
            String pageText = "Page " + writer.getPageNumber() + " of ";
            float pageNumX = pageWidth - 60f;
            ColumnText.showTextAligned(fg, Element.ALIGN_RIGHT, new Phrase(pageText, footerFont), pageNumX, footerY, 0);
            if (totalPagesTemplate != null) {
                fg.addTemplate(totalPagesTemplate, pageNumX + 1f, footerY - 1f);
            }

            // 7. Continuation header on Page 2+
            if (writer.getPageNumber() > 1) {
                float headerY = pageHeight - 20f;
                String poNum = po.getPoNumber() != null ? po.getPoNumber() : "";
                String poDateStr = po.getPoDate() != null ? po.getPoDate().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy")).toUpperCase() : "";

                Phrase poNumPhrase = new Phrase();
                poNumPhrase.add(new Chunk("PO Number : ", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.8f, NAVY_PRIMARY)));
                poNumPhrase.add(new Chunk(poNum, FontFactory.getFont(FontFactory.HELVETICA, 7.8f, TEXT_DARK)));

                Phrase poDatePhrase = new Phrase();
                poDatePhrase.add(new Chunk("PO Date : ", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.8f, NAVY_PRIMARY)));
                poDatePhrase.add(new Chunk(poDateStr, FontFactory.getFont(FontFactory.HELVETICA, 7.8f, TEXT_DARK)));

                ColumnText.showTextAligned(fg, Element.ALIGN_RIGHT, poNumPhrase, pageWidth - 28f, headerY, 0);
                ColumnText.showTextAligned(fg, Element.ALIGN_RIGHT, poDatePhrase, pageWidth - 28f, headerY - 10f, 0);

                fg.saveState();
                fg.setColorStroke(ICE_BLUE_BORDER);
                fg.setLineWidth(0.6f);
                fg.moveTo(28f, headerY - 15f);
                fg.lineTo(pageWidth - 28f, headerY - 15f);
                fg.stroke();
                fg.restoreState();
            }
        }

        @Override
        public void onCloseDocument(PdfWriter writer, Document document) {
            if (totalPagesTemplate != null && baseFont != null) {
                totalPagesTemplate.beginText();
                totalPagesTemplate.setFontAndSize(baseFont, 7.2f);
                totalPagesTemplate.setColorFill(new java.awt.Color(71, 85, 105));
                totalPagesTemplate.setTextMatrix(0, 1f);
                int total = Math.max(1, writer.getPageNumber() - 1);
                totalPagesTemplate.showText(String.valueOf(total));
                totalPagesTemplate.endText();
            }
        }
    }

    public byte[] generatePurchaseOrderPdf(com.acrovix.admin.entity.PurchaseOrder po) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            // A4 Portrait, clean 28pt horizontal margins, 26pt top, 34pt bottom
            Document document = new Document(PageSize.A4, 28f, 28f, 26f, 34f);
            PdfWriter writer = PdfWriter.getInstance(document, out);
            CompanySettingsResponse settings = resolveTenantSettings(po != null ? po.getTenantId() : null);
            writer.setPageEvent(new PurchaseOrderPageEvent(po, settings));
            document.open();

            // 1. Company Header (Logo + Tagline on left, Contact Details on right)
            addPurchaseOrderPage1Header(document, writer, settings);

            // 2. Centered PURCHASE ORDER Title
            addPurchaseOrderCenteredTitle(document);

            // 3. Raised To / Vendor Information Section
            addPurchaseOrderRaisedToBox(document, po);

            // 4. PO Metadata Grid (PO Number, PO Date, Payment Terms, Currency)
            addPurchaseOrderInfoGrid(document, po);

            // 5. Side-by-side BILL TO & SHIP TO (DELIVERY ADDRESS) Panels
            addPurchaseOrderPartiesPanels(document, writer, po, settings);

            // 6. ORDER DETAILS 11-column Table
            addPurchaseOrderItemsTable(document, writer, po);

            // 7. Right-aligned Financial Summary
            addPurchaseOrderFinancialSummary(document, po);

            // 8. Side-by-side TERMS & CONDITIONS and REMARKS / ADDITIONAL NOTES
            addPurchaseOrderTermsAndRemarks(document, writer, po, settings);

            // 9. Dual Authorization Signatures (For Acrovix Innovations Private Limited & For Vendor)
            addPurchaseOrderSignatures(document, settings);

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate Purchase Order PDF", e);
            throw new RuntimeException("Failed to generate Purchase Order PDF", e);
        }
    }

    private void addPurchaseOrderPage1Header(Document document, PdfWriter writer, CompanySettingsResponse settings) throws DocumentException {
        PdfPTable headerTable = new PdfPTable(2);
        headerTable.setWidthPercentage(100);
        headerTable.setWidths(new float[]{45f, 55f});
        headerTable.setSpacingAfter(5f);

        // ====================================================
        // Left Column: Branding / Logo
        // ====================================================
        PdfPCell logoCell = new PdfPCell();
        logoCell.setBorder(Rectangle.NO_BORDER);
        logoCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        logoCell.setHorizontalAlignment(Element.ALIGN_LEFT);
        logoCell.setPadding(0);
        logoCell.setPaddingTop(3f);

        boolean isAcrovix = (settings == null || settings.getTenantId() == null || settings.getTenantId().equals(1L) 
                || (settings.getCompanyName() != null && settings.getCompanyName().toUpperCase().contains("ACROVIX")));

        Image logo = null;
        if (settings != null && settings.getLogoUrl() != null && !settings.getLogoUrl().trim().isEmpty()) {
            try {
                logo = Image.getInstance(new java.net.URL(settings.getLogoUrl()));
            } catch (Exception ex) {
                log.warn("Failed to load logo from URL for PO: " + settings.getLogoUrl(), ex);
            }
        }
        if (logo == null && isAcrovix) {
            java.net.URL defaultLogoUrl = getClass().getResource("/static/Acrovix_logo.png");
            if (defaultLogoUrl != null) {
                try {
                    logo = Image.getInstance(defaultLogoUrl);
                } catch (Exception ignored) {}
            }
        }

        if (logo != null) {
            logo.scaleToFit(160f, 50f);
            logoCell.addElement(logo);
        } else {
            String companyName = (settings != null && settings.getCompanyName() != null && !settings.getCompanyName().isBlank()) 
                    ? settings.getCompanyName() : (isAcrovix ? "ACROVIX INNOVATIONS PRIVATE LIMITED" : "PURCHASE ORDER");
            String brandName = (settings != null && settings.getBrandName() != null && !settings.getBrandName().isBlank())
                    ? settings.getBrandName() : companyName;
            logoCell.addElement(new Paragraph(brandName, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13f, NAVY_PRIMARY)));

            if (isAcrovix) {
                Paragraph taglinePara = new Paragraph();
                taglinePara.setSpacingBefore(3.5f);
                Image linkIc = createVectorIcon(writer, "link", 8f, 7.5f, NAVY_PRIMARY);
                if (linkIc != null) { taglinePara.add(new Chunk(linkIc, 0, -1f)); taglinePara.add(new Chunk(" ")); }
                taglinePara.add(new Chunk("SYNC", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.2f, NAVY_PRIMARY)));
                taglinePara.add(new Chunk("   |   ", FontFactory.getFont(FontFactory.HELVETICA, 7.2f, new java.awt.Color(148, 163, 184))));

                Image scaleIc = createVectorIcon(writer, "chart", 8f, 7.5f, TEAL_ACCENT);
                if (scaleIc != null) { taglinePara.add(new Chunk(scaleIc, 0, -1f)); taglinePara.add(new Chunk(" ")); }
                taglinePara.add(new Chunk("SCALE", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.2f, NAVY_PRIMARY)));
                taglinePara.add(new Chunk("   |   ", FontFactory.getFont(FontFactory.HELVETICA, 7.2f, new java.awt.Color(148, 163, 184))));

                Image succIc = createVectorIcon(writer, "arrow-up-right", 8f, 7.5f, TEAL_ACCENT);
                if (succIc != null) { taglinePara.add(new Chunk(succIc, 0, -1f)); taglinePara.add(new Chunk(" ")); }
                taglinePara.add(new Chunk("SUCCEED", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.2f, NAVY_PRIMARY)));

                logoCell.addElement(taglinePara);
            }
        }

        headerTable.addCell(logoCell);

        // ====================================================
        // Right Column: Company Information (Unified left-aligned block)
        // ====================================================
        PdfPCell compCell = new PdfPCell();
        compCell.setBorder(Rectangle.NO_BORDER);
        compCell.setPadding(0);
        compCell.setPaddingLeft(15f);
        compCell.setPaddingRight(10f);
        compCell.setVerticalAlignment(Element.ALIGN_MIDDLE);

        String companyName = (settings != null && settings.getCompanyName() != null && !settings.getCompanyName().isBlank()) 
                ? settings.getCompanyName() : (isAcrovix ? "ACROVIX INNOVATIONS PRIVATE LIMITED" : "");
        String compAddress = (settings != null && settings.getRegisteredAddress() != null && !settings.getRegisteredAddress().isBlank()) 
                ? settings.getRegisteredAddress() 
                : ((settings != null && settings.getBillingAddress() != null) ? settings.getBillingAddress() : (isAcrovix ? "3RD FLOOR, 956, VIGNESHWARA\n6TH CROSS, 1ST MAIN, BENGALURU\nKARNATAKA, 560060" : ""));
        compAddress = compAddress.replace("\\n", "\n");
        String compPhone = (settings != null && settings.getPhone() != null && !settings.getPhone().isBlank()) 
                ? settings.getPhone() : (isAcrovix ? "+91 80000 222" : "");
        String compEmail = (settings != null && settings.getEmail() != null && !settings.getEmail().isBlank()) 
                ? settings.getEmail() : (isAcrovix ? "sales@acrovix.com" : "");
        String compWeb = (settings != null && settings.getWebsite() != null && !settings.getWebsite().isBlank()) 
                ? settings.getWebsite() : (isAcrovix ? "https://acrovix.com" : "");

        PdfPTable compTable = new PdfPTable(2);
        compTable.setWidthPercentage(100);
        compTable.setWidths(new float[]{5.5f, 94.5f});

        Font nameFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9.5f, NAVY_PRIMARY);
        Font textFont = FontFactory.getFont(FontFactory.HELVETICA, 7.0f, TEXT_MUTED);

        // 1. Company Name (spans both columns, prominent on one line, aligned to common left edge)
        PdfPCell cName = new PdfPCell(new Phrase(companyName.toUpperCase(), nameFont));
        cName.setColspan(2);
        cName.setBorder(Rectangle.NO_BORDER);
        cName.setPadding(0);
        cName.setPaddingBottom(3.5f);
        compTable.addCell(cName);

        // 2. Address (Pin icon + address text)
        Image pinIcon = createVectorIcon(writer, "pin", 6.5f, 8.0f, BLUE_ACCENT);
        PdfPCell cPin = new PdfPCell();
        cPin.setBorder(Rectangle.NO_BORDER);
        cPin.setPadding(0);
        cPin.setPaddingTop(1f);
        if (pinIcon != null) cPin.addElement(pinIcon);
        compTable.addCell(cPin);

        Paragraph pAddr = new Paragraph(compAddress, textFont);
        pAddr.setLeading(8.5f);
        PdfPCell cAddr = new PdfPCell(pAddr);
        cAddr.setBorder(Rectangle.NO_BORDER);
        cAddr.setPadding(0);
        cAddr.setPaddingBottom(2.5f);
        compTable.addCell(cAddr);

        // 3. Phone (Phone icon + phone text)
        if (compPhone != null && !compPhone.isBlank()) {
            Image phIc = createVectorIcon(writer, "phone", 6.5f, 6.5f, BLUE_ACCENT);
            PdfPCell cPhIc = new PdfPCell();
            cPhIc.setBorder(Rectangle.NO_BORDER);
            cPhIc.setPadding(0);
            cPhIc.setPaddingTop(1f);
            if (phIc != null) cPhIc.addElement(phIc);
            compTable.addCell(cPhIc);

            PdfPCell cPhVal = new PdfPCell(new Phrase(compPhone, textFont));
            cPhVal.setBorder(Rectangle.NO_BORDER);
            cPhVal.setPadding(0);
            cPhVal.setPaddingBottom(1.5f);
            compTable.addCell(cPhVal);
        }

        // 4. Email (Email icon + email text)
        if (compEmail != null && !compEmail.isBlank()) {
            Image emIc = createVectorIcon(writer, "email", 7.0f, 5.5f, BLUE_ACCENT);
            PdfPCell cEmIc = new PdfPCell();
            cEmIc.setBorder(Rectangle.NO_BORDER);
            cEmIc.setPadding(0);
            cEmIc.setPaddingTop(1f);
            if (emIc != null) cEmIc.addElement(emIc);
            compTable.addCell(cEmIc);

            PdfPCell cEmVal = new PdfPCell(new Phrase(compEmail, textFont));
            cEmVal.setBorder(Rectangle.NO_BORDER);
            cEmVal.setPadding(0);
            cEmVal.setPaddingBottom(1.5f);
            compTable.addCell(cEmVal);
        }

        // 5. Website (Globe icon + website text)
        if (compWeb != null && !compWeb.isBlank()) {
            Image wbIc = createVectorIcon(writer, "globe", 6.5f, 6.5f, BLUE_ACCENT);
            PdfPCell cWbIc = new PdfPCell();
            cWbIc.setBorder(Rectangle.NO_BORDER);
            cWbIc.setPadding(0);
            cWbIc.setPaddingTop(1f);
            if (wbIc != null) cWbIc.addElement(wbIc);
            compTable.addCell(cWbIc);

            PdfPCell cWbVal = new PdfPCell(new Phrase(compWeb, textFont));
            cWbVal.setBorder(Rectangle.NO_BORDER);
            cWbVal.setPadding(0);
            compTable.addCell(cWbVal);
        }

        compCell.addElement(compTable);
        headerTable.addCell(compCell);
        document.add(headerTable);

        // ====================================================
        // Clean Horizontal Divider below header
        // ====================================================
        PdfPTable divTable = new PdfPTable(1);
        divTable.setWidthPercentage(100);
        divTable.setSpacingBefore(4f);
        divTable.setSpacingAfter(7f);

        PdfPCell bar1 = new PdfPCell();
        bar1.setFixedHeight(2.0f);
        bar1.setBackgroundColor(NAVY_PRIMARY);
        bar1.setBorder(Rectangle.NO_BORDER);
        divTable.addCell(bar1);

        PdfPCell bar2 = new PdfPCell();
        bar2.setFixedHeight(1.0f);
        bar2.setBackgroundColor(TEAL_ACCENT);
        bar2.setBorder(Rectangle.NO_BORDER);
        divTable.addCell(bar2);

        document.add(divTable);
    }

    private void addPurchaseOrderCenteredTitle(Document document) throws DocumentException {
        Paragraph titlePara = new Paragraph();
        titlePara.setAlignment(Element.ALIGN_CENTER);
        titlePara.setSpacingBefore(2f);
        titlePara.setSpacingAfter(7f);
        titlePara.add(new Chunk("PURCHASE ", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20f, NAVY_PRIMARY)));
        titlePara.add(new Chunk("ORDER", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20f, BLUE_ACCENT)));
        document.add(titlePara);
    }

    private void addPurchaseOrderRaisedToBox(Document document, com.acrovix.admin.entity.PurchaseOrder po) throws DocumentException {
        PdfPTable boxTable = new PdfPTable(1);
        boxTable.setWidthPercentage(100);
        boxTable.setSpacingAfter(6f);

        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(java.awt.Color.WHITE);
        cell.setBorderColor(ICE_BLUE_BORDER);
        cell.setBorderWidth(0.6f);
        cell.setPadding(5f);
        cell.setPaddingLeft(8f);
        cell.setPaddingRight(8f);

        Paragraph pRaised = new Paragraph("Raised to,", FontFactory.getFont(FontFactory.HELVETICA, 7.5f, TEXT_MUTED));
        pRaised.setSpacingAfter(1.5f);
        cell.addElement(pRaised);

        com.acrovix.admin.entity.Quotation quot = po.getQuotation();
        com.acrovix.admin.entity.Customer cust = quot != null ? quot.getCustomer() : null;

        String vendorName = "-";
        if (quot != null && quot.getClientCompany() != null && !quot.getClientCompany().isBlank()) {
            vendorName = quot.getClientCompany();
        } else if (cust != null && cust.getCompanyName() != null && !cust.getCompanyName().isBlank()) {
            vendorName = cust.getCompanyName();
        } else if (quot != null && quot.getClientName() != null && !quot.getClientName().isBlank()) {
            vendorName = quot.getClientName();
        } else if (cust != null && cust.getName() != null && !cust.getName().isBlank()) {
            vendorName = cust.getName();
        }

        Paragraph pName = new Paragraph(vendorName, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9.2f, NAVY_PRIMARY));
        pName.setSpacingAfter(2f);
        cell.addElement(pName);

        String vendorAddress = (cust != null && cust.getBillingAddress() != null && !cust.getBillingAddress().isBlank())
                ? formatAddressWithStateAndPin(cust.getBillingAddress(), cust.getState(), cust.getPincode()) : null;
        if (vendorAddress != null) {
            Paragraph pAddr = new Paragraph(vendorAddress, FontFactory.getFont(FontFactory.HELVETICA, 7.2f, TEXT_DARK));
            pAddr.setSpacingAfter(2f);
            cell.addElement(pAddr);
        }

        String gstin = (cust != null && cust.getGstin() != null && !cust.getGstin().isBlank()) ? cust.getGstin() : null;
        if (gstin != null && !gstin.equalsIgnoreCase("-")) {
            Paragraph pGst = new Paragraph("GST No.- " + gstin, FontFactory.getFont(FontFactory.HELVETICA, 7.2f, TEXT_DARK));
            pGst.setSpacingAfter(1f);
            cell.addElement(pGst);
        }

        String cin = (cust != null && cust.getPan() != null && !cust.getPan().isBlank()) ? cust.getPan() : null;
        if (cin != null && !cin.equalsIgnoreCase("-")) {
            Paragraph pCin = new Paragraph("CIN NO.- " + cin, FontFactory.getFont(FontFactory.HELVETICA, 7.2f, TEXT_DARK));
            cell.addElement(pCin);
        }

        boxTable.addCell(cell);
        document.add(boxTable);
    }

    private void addPurchaseOrderInfoGrid(Document document, com.acrovix.admin.entity.PurchaseOrder po) throws DocumentException {
        PdfPTable grid = new PdfPTable(4);
        grid.setWidthPercentage(100);
        grid.setWidths(new float[]{18f, 32f, 18f, 32f});
        grid.setSpacingAfter(7f);

        Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, NAVY_PRIMARY);
        Font valFont = FontFactory.getFont(FontFactory.HELVETICA, 7.8f, TEXT_DARK);

        String poNum = po.getPoNumber() != null ? po.getPoNumber() : "-";
        String poDateStr = po.getPoDate() != null 
                ? po.getPoDate().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy")).toUpperCase() : "-";

        com.acrovix.admin.entity.Customer cust = (po.getQuotation() != null) ? po.getQuotation().getCustomer() : null;
        String payTerms = (cust != null && cust.getPaymentTerms() != null && !cust.getPaymentTerms().isBlank()) 
                ? cust.getPaymentTerms() : "As per Terms & Conditions";

        String curDisplay;
        if (isMultiCurrencyPo(po)) {
            curDisplay = "INR / USD (Year-wise)";
        } else if (po.getCurrency() != null && po.getCurrency().name().equalsIgnoreCase("USD")) {
            curDisplay = "USD";
        } else {
            curDisplay = "INR";
        }

        // Row 1
        addGridLabelCell(grid, "PO Number", labelFont);
        addGridValueCell(grid, poNum, valFont);
        addGridLabelCell(grid, "PO Date", labelFont);
        addGridValueCell(grid, poDateStr, valFont);

        // Row 2
        addGridLabelCell(grid, "Payment Terms", labelFont);
        addGridValueCell(grid, payTerms, valFont);
        addGridLabelCell(grid, "Currency", labelFont);
        addGridValueCell(grid, curDisplay, valFont);

        document.add(grid);
    }

    private void addGridLabelCell(PdfPTable table, String text, Font font) {
        PdfPCell c = new PdfPCell(new Phrase(text, font));
        c.setBackgroundColor(ICE_BLUE_BG);
        c.setBorderColor(ICE_BLUE_BORDER);
        c.setBorderWidth(0.5f);
        c.setPadding(4.5f);
        c.setPaddingLeft(6f);
        c.setVerticalAlignment(Element.ALIGN_MIDDLE);
        table.addCell(c);
    }

    private void addGridValueCell(PdfPTable table, String text, Font font) {
        PdfPCell c = new PdfPCell(new Phrase(text != null ? text : "-", font));
        c.setBackgroundColor(java.awt.Color.WHITE);
        c.setBorderColor(ICE_BLUE_BORDER);
        c.setBorderWidth(0.5f);
        c.setPadding(4.5f);
        c.setPaddingLeft(6f);
        c.setVerticalAlignment(Element.ALIGN_MIDDLE);
        table.addCell(c);
    }

    private void addPurchaseOrderPartiesPanels(Document document, PdfWriter writer, com.acrovix.admin.entity.PurchaseOrder po, CompanySettingsResponse settings) throws DocumentException {
        Font cardHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, BLUE_ACCENT);
        Font labelFont = FontFactory.getFont(FontFactory.HELVETICA, 7.2f, TEXT_MUTED);
        Font valFont = FontFactory.getFont(FontFactory.HELVETICA, 7.2f, TEXT_DARK);
        Font valBoldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, NAVY_PRIMARY);

        PdfPTable panelsTable = new PdfPTable(3);
        panelsTable.setWidthPercentage(100);
        panelsTable.setWidths(new float[]{49f, 2f, 49f});
        panelsTable.setSpacingAfter(7f);

        // ==========================================
        // 1. LEFT PANEL: BILL TO
        // ==========================================
        PdfPCell billCell = new PdfPCell();
        billCell.setBackgroundColor(ICE_BLUE_BG);
        billCell.setBorderColor(ICE_BLUE_BORDER);
        billCell.setBorderWidth(0.6f);
        billCell.setPadding(6f);
        billCell.setPaddingLeft(8f);
        billCell.setPaddingRight(8f);

        Phrase bHeaderPhrase = new Phrase();
        Image bDocIcon = createVectorIcon(writer, "receipt", 9.5f, 9.5f, BLUE_ACCENT);
        if (bDocIcon != null) { bHeaderPhrase.add(new Chunk(bDocIcon, 0, -1f)); bHeaderPhrase.add(new Chunk("  ")); }
        bHeaderPhrase.add(new Chunk("BILL TO", cardHeaderFont));
        Paragraph pBillHeader = new Paragraph(bHeaderPhrase);
        pBillHeader.setSpacingAfter(4f);
        billCell.addElement(pBillHeader);

        boolean isAcrovix = (settings == null || settings.getTenantId() == null || settings.getTenantId().equals(1L) 
                || (settings.getCompanyName() != null && settings.getCompanyName().toUpperCase().contains("ACROVIX")));
        String companyName = (settings != null && settings.getCompanyName() != null && !settings.getCompanyName().isBlank()) 
                ? settings.getCompanyName() : (isAcrovix ? "Acrovix Innovations Private Limited" : "Buyer");
        String compAddress = (settings != null && settings.getRegisteredAddress() != null && !settings.getRegisteredAddress().isBlank()) 
                ? settings.getRegisteredAddress() 
                : ((settings != null && settings.getBillingAddress() != null) ? settings.getBillingAddress() : (isAcrovix ? "956, 3rd Floor, Vigneshwara, 6th Cross, 1st Main Kengeri, Bengaluru, Karnataka, 560060" : ""));
        compAddress = compAddress.replace("\\n", "\n");
        String compGstin = (settings != null && settings.getGstin() != null && !settings.getGstin().isBlank()) ? settings.getGstin() : (isAcrovix ? "29ABFCA9588C1Z8" : "");
        String compPan = (settings != null && settings.getPan() != null && !settings.getPan().isBlank()) ? settings.getPan() : (isAcrovix ? "U46511BR2026PTC085813." : "");
        String compVat = (settings != null && settings.getVatId() != null && !settings.getVatId().isBlank()) ? settings.getVatId() : "";
        String compEmail = (settings != null && settings.getEmail() != null && !settings.getEmail().isBlank()) ? settings.getEmail() : (isAcrovix ? "Sales@acrovix.com" : "");
        String compPhone = (settings != null && settings.getPhone() != null && !settings.getPhone().isBlank()) ? settings.getPhone() : (isAcrovix ? "8092848065" : "");

        Paragraph pBillName = new Paragraph(companyName, valBoldFont);
        pBillName.setSpacingAfter(3f);
        billCell.addElement(pBillName);

        // Address with Pin Icon
        if (!compAddress.isBlank()) {
            Paragraph pBillAddr = new Paragraph();
            Image bPin = createVectorIcon(writer, "pin", 7.0f, 8.0f, BLUE_ACCENT);
            if (bPin != null) { pBillAddr.add(new Chunk(bPin, 0, -1f)); pBillAddr.add(new Chunk(" ")); }
            pBillAddr.add(new Chunk(compAddress, valFont));
            pBillAddr.setLeading(9f);
            pBillAddr.setSpacingAfter(3f);
            billCell.addElement(pBillAddr);
        }

        // Tax Registration (GSTIN / VAT / PAN) with Document Icon
        StringBuilder regText = new StringBuilder();
        if (!compGstin.isBlank()) regText.append("GSTIN: ").append(compGstin);
        if (!compVat.isBlank()) {
            if (regText.length() > 0) regText.append("\n");
            regText.append("VAT / Tax ID: ").append(compVat);
        }
        if (!compPan.isBlank()) {
            if (regText.length() > 0) regText.append("\n");
            regText.append(isAcrovix ? "CIN: " : "PAN: ").append(compPan);
        }
        if (regText.length() > 0) {
            Paragraph pBillReg = new Paragraph();
            Image bDoc = createVectorIcon(writer, "receipt", 7.0f, 7.0f, BLUE_ACCENT);
            if (bDoc != null) { pBillReg.add(new Chunk(bDoc, 0, -1f)); pBillReg.add(new Chunk(" ")); }
            pBillReg.add(new Chunk(regText.toString(), valFont));
            pBillReg.setLeading(9f);
            pBillReg.setSpacingAfter(3f);
            billCell.addElement(pBillReg);
        }

        // Email with Email Icon
        if (!compEmail.isBlank()) {
            Paragraph pBillEm = new Paragraph();
            Image bEm = createVectorIcon(writer, "email", 7.5f, 6.0f, BLUE_ACCENT);
            if (bEm != null) { pBillEm.add(new Chunk(bEm, 0, -1f)); pBillEm.add(new Chunk(" ")); }
            pBillEm.add(new Chunk("Email: " + compEmail, valFont));
            pBillEm.setSpacingAfter(2f);
            billCell.addElement(pBillEm);
        }

        // Phone with Phone Icon
        if (!compPhone.isBlank()) {
            Paragraph pBillPh = new Paragraph();
            Image bPh = createVectorIcon(writer, "phone", 7.0f, 7.0f, BLUE_ACCENT);
            if (bPh != null) { pBillPh.add(new Chunk(bPh, 0, -1f)); pBillPh.add(new Chunk(" ")); }
            pBillPh.add(new Chunk("Phone: " + compPhone, valFont));
            billCell.addElement(pBillPh);
        }

        // Spacer
        PdfPCell spacer = new PdfPCell();
        spacer.setBorder(Rectangle.NO_BORDER);

        // ==========================================
        // 2. RIGHT PANEL: SHIP TO (DELIVERY ADDRESS)
        // ==========================================
        PdfPCell shipCell = new PdfPCell();
        shipCell.setBackgroundColor(ICE_BLUE_BG);
        shipCell.setBorderColor(ICE_BLUE_BORDER);
        shipCell.setBorderWidth(0.6f);
        shipCell.setPadding(6f);
        shipCell.setPaddingLeft(8f);
        shipCell.setPaddingRight(8f);

        Phrase sHeaderPhrase = new Phrase();
        Image sTruckIcon = createVectorIcon(writer, "truck", 10.5f, 9.5f, BLUE_ACCENT);
        if (sTruckIcon != null) { sHeaderPhrase.add(new Chunk(sTruckIcon, 0, -1f)); sHeaderPhrase.add(new Chunk("  ")); }
        sHeaderPhrase.add(new Chunk("SHIP TO (DELIVERY ADDRESS)", cardHeaderFont));
        Paragraph pShipHeader = new Paragraph(sHeaderPhrase);
        pShipHeader.setSpacingAfter(4f);
        shipCell.addElement(pShipHeader);

        String destType = po.getDeliveryDestinationType();
        String poDeliveryAddr = po.getDeliveryAddress();
        String poContactName = po.getDeliveryContactName();
        String poContactPhone = po.getDeliveryContactPhone();

        if (destType == null || destType.isBlank()) {
            if (poDeliveryAddr != null && !poDeliveryAddr.isBlank()) {
                if (compAddress != null && poDeliveryAddr.equalsIgnoreCase(compAddress)) {
                    destType = "COMPANY_OFFICE";
                } else {
                    destType = "CUSTOM";
                }
            } else {
                destType = "NOT_SPECIFIED";
            }
        }

        String recipientComp;
        String shipAddress;
        String contactPerson;
        String contactPhone;
        String contactEmail;
        String destinationNote;

        if ("NOT_SPECIFIED".equalsIgnoreCase(destType)) {
            destinationNote = "Destination: Not Specified";
            recipientComp = "Not Specified";
            shipAddress = "Not Specified";
            contactPerson = (poContactName != null && !poContactName.isBlank()) ? poContactName : "Not Specified";
            contactPhone = (poContactPhone != null && !poContactPhone.isBlank()) ? poContactPhone : null;
            contactEmail = null;

        } else if ("CUSTOMER_SITE".equalsIgnoreCase(destType)) {
            com.acrovix.admin.entity.Quotation quot = po.getQuotation();
            com.acrovix.admin.entity.Customer cust = quot != null ? quot.getCustomer() : null;

            destinationNote = "Destination: Client / Project Site";
            recipientComp = (cust != null && cust.getCompanyName() != null && !cust.getCompanyName().isBlank()) 
                    ? cust.getCompanyName() 
                    : ((quot != null && quot.getClientCompany() != null && !quot.getClientCompany().isBlank()) 
                            ? quot.getClientCompany() 
                            : ((quot != null && quot.getClientName() != null && !quot.getClientName().isBlank()) 
                                    ? quot.getClientName() 
                                    : "Client Project Site"));

            if (poDeliveryAddr != null && !poDeliveryAddr.isBlank()) {
                shipAddress = poDeliveryAddr.replace("\\n", "\n");
            } else if (cust != null && cust.getShippingAddress() != null && !cust.getShippingAddress().isBlank()) {
                shipAddress = formatAddressWithStateAndPin(cust.getShippingAddress(), cust.getState(), cust.getPincode());
            } else {
                shipAddress = "Not Specified";
            }

            contactPerson = (poContactName != null && !poContactName.isBlank()) 
                    ? poContactName 
                    : ((quot != null && quot.getClientName() != null) ? quot.getClientName() : ((cust != null && cust.getName() != null) ? cust.getName() : "Site Contact"));
            contactPhone = (poContactPhone != null && !poContactPhone.isBlank()) 
                    ? poContactPhone 
                    : ((quot != null && quot.getClientPhone() != null) ? quot.getClientPhone() : ((cust != null && cust.getPhone() != null) ? cust.getPhone() : compPhone));
            contactEmail = (quot != null && quot.getClientEmail() != null && !quot.getClientEmail().isBlank()) 
                    ? quot.getClientEmail() 
                    : ((cust != null && cust.getEmail() != null) ? cust.getEmail() : null);

        } else if ("CUSTOM".equalsIgnoreCase(destType)) {
            destinationNote = "Destination: Designated Site";
            recipientComp = (poContactName != null && !poContactName.isBlank()) ? poContactName : companyName;
            shipAddress = (poDeliveryAddr != null && !poDeliveryAddr.isBlank()) ? poDeliveryAddr.replace("\\n", "\n") : compAddress;
            contactPerson = (poContactName != null && !poContactName.isBlank()) ? poContactName : "Operations / Receiving";
            contactPhone = (poContactPhone != null && !poContactPhone.isBlank()) ? poContactPhone : compPhone;
            contactEmail = null;

        } else {
            // Default: COMPANY_OFFICE (ACROVIX Office Delivery)
            destinationNote = "Destination: ACROVIX Office";
            recipientComp = companyName;
            shipAddress = (poDeliveryAddr != null && !poDeliveryAddr.isBlank()) ? poDeliveryAddr.replace("\\n", "\n") : compAddress;
            contactPerson = (poContactName != null && !poContactName.isBlank()) ? poContactName : "ACROVIX Operations";
            contactPhone = (poContactPhone != null && !poContactPhone.isBlank()) ? poContactPhone : compPhone;
            contactEmail = compEmail;
        }

        Paragraph pShipName = new Paragraph(recipientComp, valBoldFont);
        pShipName.setSpacingAfter(3f);
        shipCell.addElement(pShipName);

        // Address with Pin Icon
        Paragraph pShipAddr = new Paragraph();
        Image sPin = createVectorIcon(writer, "pin", 7.0f, 8.0f, BLUE_ACCENT);
        if (sPin != null) { pShipAddr.add(new Chunk(sPin, 0, -1f)); pShipAddr.add(new Chunk(" ")); }
        pShipAddr.add(new Chunk(shipAddress, valFont));
        pShipAddr.setLeading(9f);
        pShipAddr.setSpacingAfter(3f);
        shipCell.addElement(pShipAddr);

        // Kind Attn with User Icon
        Paragraph pShipAttn = new Paragraph();
        Image sUser = createVectorIcon(writer, "user", 7.0f, 7.0f, BLUE_ACCENT);
        if (sUser != null) { pShipAttn.add(new Chunk(sUser, 0, -1f)); pShipAttn.add(new Chunk(" ")); }
        pShipAttn.add(new Chunk("Kind Attn.: " + contactPerson, valFont));
        pShipAttn.setSpacingAfter(2f);
        shipCell.addElement(pShipAttn);

        // Email with Email Icon
        if (contactEmail != null && !contactEmail.isBlank() && !"-".equals(contactEmail)) {
            Paragraph pShipEm = new Paragraph();
            Image sEm = createVectorIcon(writer, "email", 7.5f, 6.0f, BLUE_ACCENT);
            if (sEm != null) { pShipEm.add(new Chunk(sEm, 0, -1f)); pShipEm.add(new Chunk(" ")); }
            pShipEm.add(new Chunk("Email: " + contactEmail, valFont));
            pShipEm.setSpacingAfter(2f);
            shipCell.addElement(pShipEm);
        }

        // Phone with Phone Icon
        if (contactPhone != null && !contactPhone.isBlank() && !"-".equals(contactPhone)) {
            Paragraph pShipPh = new Paragraph();
            Image sPh = createVectorIcon(writer, "phone", 7.0f, 7.0f, BLUE_ACCENT);
            if (sPh != null) { pShipPh.add(new Chunk(sPh, 0, -1f)); pShipPh.add(new Chunk(" ")); }
            pShipPh.add(new Chunk("Phone: " + contactPhone, valFont));
            pShipPh.setSpacingAfter(2f);
            shipCell.addElement(pShipPh);
        }

        // Destination Type with Building / Truck Icon
        Paragraph pShipEnd = new Paragraph();
        Image sBld = createVectorIcon(writer, "building", 7.0f, 7.0f, BLUE_ACCENT);
        if (sBld != null) { pShipEnd.add(new Chunk(sBld, 0, -1f)); pShipEnd.add(new Chunk(" ")); }
        pShipEnd.add(new Chunk(destinationNote, valFont));
        pShipEnd.setLeading(9f);
        shipCell.addElement(pShipEnd);

        panelsTable.addCell(billCell);
        panelsTable.addCell(spacer);
        panelsTable.addCell(shipCell);

        document.add(panelsTable);
    }

    private void addPurchaseOrderItemsTable(Document document, PdfWriter writer, com.acrovix.admin.entity.PurchaseOrder po) throws DocumentException {
        // Section Header: ORDER DETAILS
        PdfPTable orderHeader = new PdfPTable(1);
        orderHeader.setWidthPercentage(100);
        orderHeader.setSpacingBefore(1f);
        orderHeader.setSpacingAfter(3f);

        PdfPCell oCell = new PdfPCell();
        oCell.setBackgroundColor(ICE_BLUE_BG);
        oCell.setBorderColor(ICE_BLUE_BORDER);
        oCell.setBorderWidth(0.5f);
        oCell.setPadding(4f);
        oCell.setPaddingLeft(6f);

        Phrase oPhrase = new Phrase();
        Image oIcon = createVectorIcon(writer, "box", 9f, 9f, BLUE_ACCENT);
        if (oIcon != null) { oPhrase.add(new Chunk(oIcon, 0, -1f)); oPhrase.add(new Chunk("  ")); }
        oPhrase.add(new Chunk("ORDER DETAILS", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, BLUE_ACCENT)));
        oCell.addElement(new Paragraph(oPhrase));
        orderHeader.addCell(oCell);
        document.add(orderHeader);

        // 11-column Table exactly as approved
        PdfPTable table = new PdfPTable(11);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{ 3.0f, 9.0f, 10.5f, 12.5f, 15.0f, 7.5f, 9.5f, 6.0f, 9.0f, 6.5f, 11.5f });
        table.setSpacingAfter(6f);
        table.setHeaderRows(1);

        Font thFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 6.5f, java.awt.Color.WHITE);
        Font tdFont = FontFactory.getFont(FontFactory.HELVETICA, 6.5f, TEXT_DARK);
        Font tdBoldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 6.5f, TEXT_DARK);

        String[] headers = {
            "#", 
            "Product Family", 
            "Product SubFamily", 
            "Item Number", 
            "Description", 
            "License Metric", 
            "License Type", 
            "Year", 
            "Price/Core", 
            "Total Cores", 
            "Total Price"
        };

        for (int i = 0; i < headers.length; i++) {
            PdfPCell hCell = new PdfPCell(new Phrase(headers[i], thFont));
            hCell.setBackgroundColor(NAVY_PRIMARY);
            hCell.setBorderColor(NAVY_PRIMARY);
            hCell.setPaddingTop(4.5f);
            hCell.setPaddingBottom(4.5f);
            hCell.setPaddingLeft(2.5f);
            hCell.setPaddingRight(2.5f);
            int align = Element.ALIGN_CENTER;
            if (i == 4) align = Element.ALIGN_LEFT;
            else if (i == 8 || i == 10) align = Element.ALIGN_RIGHT;
            hCell.setHorizontalAlignment(align);
            hCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            table.addCell(hCell);
        }

        com.acrovix.admin.entity.Quotation quot = po.getQuotation();
        java.util.List<QuotationItem> items = (quot != null && quot.getItems() != null) ? quot.getItems() : java.util.Collections.emptyList();

        int rowIdx = 1;
        boolean multiCur = isMultiCurrencyPo(po);

        for (QuotationItem item : items) {
            String family = getCustomOrItemValue(item, "productFamily", "Product Family", "family");
            if (family == null || family.isBlank()) family = item.getCategory();
            if ((family == null || family.isBlank()) && item.getProductService() != null && item.getProductService().getType() != null) {
                family = item.getProductService().getType().name();
            }
            if (family == null || family.isBlank()) family = "-";

            String subFamily = getCustomOrItemValue(item, "productSubFamily", "Product SubFamily", "subFamily", "subfamily");
            if (subFamily == null || subFamily.isBlank()) subFamily = "-";

            String itemNumber = item.getSku();
            if (itemNumber == null || itemNumber.isBlank()) {
                itemNumber = getCustomOrItemValue(item, "itemNumber", "Item Number", "itemCode", "partNumber");
            }
            if ((itemNumber == null || itemNumber.isBlank()) && item.getProductService() != null) {
                itemNumber = item.getProductService().getSku();
            }
            if (itemNumber == null || itemNumber.isBlank()) itemNumber = "-";

            String desc = item.getDescription() != null ? item.getDescription() : "-";

            String metric = getCustomOrItemValue(item, "licenseMetric", "License Metric", "metric");
            if (metric == null || metric.isBlank()) metric = item.getUnit();
            if (metric == null || metric.isBlank()) metric = "Core";

            String type = getCustomOrItemValue(item, "licenseType", "License Type", "type");
            if (type == null || type.isBlank()) {
                if (item.getProductService() != null && item.getProductService().getType() != null) {
                    type = item.getProductService().getType().name();
                }
            }
            if (type == null || type.isBlank()) type = "Subscription";

            String year = getCustomOrItemValue(item, "year", "Year", "period");
            if (year == null || year.isBlank()) year = "Year " + rowIdx;

            // Determine line item currency
            String itemCur = getCustomOrItemValue(item, "currency", "Currency");
            if (itemCur == null || itemCur.isBlank()) {
                if (multiCur && year != null && (year.contains("2") || year.contains("3"))) {
                    itemCur = "USD";
                } else {
                    itemCur = (po.getCurrency() != null) ? po.getCurrency().name() : "INR";
                }
            }

            BigDecimal unitPrice = item.getUnitPrice() != null ? item.getUnitPrice() : BigDecimal.ZERO;
            BigDecimal qty = item.getQuantity() != null ? item.getQuantity() : BigDecimal.ONE;
            BigDecimal lineTotal = item.getLineTotal() != null ? item.getLineTotal() : qty.multiply(unitPrice);

            String priceCoreStr = formatLineItemCurrency(unitPrice, itemCur);
            String totalCoresStr = qty.stripTrailingZeros().toPlainString();
            String totalPriceStr = formatLineItemCurrency(lineTotal, itemCur);

            // 1. #
            table.addCell(createPoTableCell(String.valueOf(rowIdx), tdFont, Element.ALIGN_CENTER));
            // 2. Product Family
            table.addCell(createPoTableCell(family, tdFont, Element.ALIGN_CENTER));
            // 3. Product SubFamily
            table.addCell(createPoTableCell(subFamily, tdFont, Element.ALIGN_CENTER));
            // 4. Item Number
            table.addCell(createPoTableCell(itemNumber, tdFont, Element.ALIGN_CENTER));
            // 5. Description
            table.addCell(createPoTableCell(desc, tdFont, Element.ALIGN_LEFT));
            // 6. License Metric
            table.addCell(createPoTableCell(metric, tdFont, Element.ALIGN_CENTER));
            // 7. License Type
            table.addCell(createPoTableCell(type, tdFont, Element.ALIGN_CENTER));
            // 8. Year
            table.addCell(createPoTableCell(year, tdFont, Element.ALIGN_CENTER));
            // 9. Price/Core
            table.addCell(createPoTableCell(priceCoreStr, tdFont, Element.ALIGN_RIGHT));
            // 10. Total Cores
            table.addCell(createPoTableCell(totalCoresStr, tdFont, Element.ALIGN_CENTER));
            // 11. Total Price
            table.addCell(createPoTableCell(totalPriceStr, tdBoldFont, Element.ALIGN_RIGHT));

            rowIdx++;
        }

        document.add(table);
    }

    private PdfPCell createPoTableCell(String text, Font font, int align) {
        PdfPCell c = new PdfPCell(new Phrase(text != null ? text : "", font));
        c.setBorderColor(GRID_BORDER);
        c.setBorderWidth(0.5f);
        c.setPaddingTop(4.5f);
        c.setPaddingBottom(4.5f);
        c.setPaddingLeft(3.5f);
        c.setPaddingRight(3.5f);
        c.setHorizontalAlignment(align);
        c.setVerticalAlignment(Element.ALIGN_MIDDLE);
        return c;
    }

    private void addPoMetaRow(PdfPTable table, String label, String value, Font labelFont, Font valFont) {
        PdfPCell c1 = new PdfPCell(new Phrase(label, labelFont));
        c1.setBorder(Rectangle.NO_BORDER);
        c1.setPaddingTop(1.5f);
        c1.setPaddingBottom(1.5f);

        PdfPCell c2 = new PdfPCell(new Phrase(":  " + (value != null ? value : "-"), valFont));
        c2.setBorder(Rectangle.NO_BORDER);
        c2.setPaddingTop(1.5f);
        c2.setPaddingBottom(1.5f);

        table.addCell(c1);
        table.addCell(c2);
    }

    private void addPoSectionHeading(Document document, PdfWriter writer, String iconType, String text) throws DocumentException {
        Paragraph heading = new Paragraph();
        heading.setSpacingBefore(4f);
        heading.setSpacingAfter(4f);

        Image icon = createVectorIcon(writer, iconType, 10f, 10f, BLUE_ACCENT);
        if (icon != null) {
            heading.add(new Chunk(icon, 0, -1.5f));
            heading.add(new Chunk("  "));
        }
        heading.add(new Chunk(text, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, BLUE_ACCENT)));
        document.add(heading);
    }

    private String getCustomOrItemValue(QuotationItem item, String... keys) {
        if (item.getCustomValues() != null) {
            for (String k : keys) {
                for (java.util.Map.Entry<String, String> entry : item.getCustomValues().entrySet()) {
                    if (entry.getKey().equalsIgnoreCase(k) && entry.getValue() != null && !entry.getValue().isBlank()) {
                        return entry.getValue().trim();
                    }
                }
            }
        }
        return null;
    }

    private boolean isMultiCurrencyPo(com.acrovix.admin.entity.PurchaseOrder po) {
        if (po.getRemarks() != null && po.getRemarks().toUpperCase().contains("USD")) return true;
        if (po.getQuotation() != null && po.getQuotation().getTermsAndConditions() != null 
                && po.getQuotation().getTermsAndConditions().toUpperCase().contains("USD")) return true;
        if (po.getQuotation() != null && po.getQuotation().getItems() != null) {
            for (QuotationItem it : po.getQuotation().getItems()) {
                if (it.getCustomValues() != null && "USD".equalsIgnoreCase(it.getCustomValues().get("currency"))) return true;
            }
        }
        return false;
    }

    private String formatLineItemCurrency(BigDecimal amount, String currencyCode) {
        if (amount == null) amount = BigDecimal.ZERO;
        String cur = ("USD".equalsIgnoreCase(currencyCode)) ? "USD" : "INR";
        String formatted = formatAmount(amount, cur);
        // If whole number without cents, strip .00 for compact rendering matching reference
        if (amount.remainder(BigDecimal.ONE).compareTo(BigDecimal.ZERO) == 0 && formatted.endsWith(".00")) {
            formatted = formatted.substring(0, formatted.length() - 3);
        }
        return cur + " " + formatted;
    }

    private void addPurchaseOrderFinancialSummary(Document document, com.acrovix.admin.entity.PurchaseOrder po) throws DocumentException {
        com.acrovix.admin.entity.Quotation quot = po.getQuotation();
        java.util.List<QuotationItem> items = (quot != null && quot.getItems() != null) ? quot.getItems() : java.util.Collections.emptyList();

        BigDecimal subtotalBeforeDiscount = BigDecimal.ZERO;
        BigDecimal totalDiscount = BigDecimal.ZERO;
        BigDecimal taxableAmount = BigDecimal.ZERO;
        BigDecimal totalTax = BigDecimal.ZERO;
        BigDecimal effectiveTaxRate = BigDecimal.valueOf(18);

        for (QuotationItem item : items) {
            BigDecimal qty = (item.getQuantity() != null) ? item.getQuantity() : BigDecimal.ONE;
            BigDecimal lp = (item.getListPrice() != null && item.getListPrice().compareTo(BigDecimal.ZERO) > 0) ? item.getListPrice() : item.getUnitPrice();
            BigDecimal up = (item.getUnitPrice() != null) ? item.getUnitPrice() : BigDecimal.ZERO;
            BigDecimal taxPct = (item.getTaxPercent() != null) ? item.getTaxPercent() : BigDecimal.ZERO;
            if (taxPct.compareTo(BigDecimal.ZERO) > 0) effectiveTaxRate = taxPct;

            BigDecimal gross = qty.multiply(lp != null ? lp : up);
            BigDecimal net = qty.multiply(up);
            BigDecimal disc = gross.subtract(net);
            if (disc.compareTo(BigDecimal.ZERO) > 0) {
                totalDiscount = totalDiscount.add(disc);
            }
            subtotalBeforeDiscount = subtotalBeforeDiscount.add(gross);
            taxableAmount = taxableAmount.add(net);
            BigDecimal tax = net.multiply(taxPct).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
            totalTax = totalTax.add(tax);
        }

        if (quot != null) {
            if (quot.getSubtotal() != null && quot.getSubtotal().compareTo(BigDecimal.ZERO) > 0) {
                if (totalDiscount.compareTo(BigDecimal.ZERO) > 0) {
                    taxableAmount = quot.getSubtotal();
                    subtotalBeforeDiscount = taxableAmount.add(totalDiscount);
                } else {
                    subtotalBeforeDiscount = quot.getSubtotal();
                    taxableAmount = quot.getSubtotal();
                }
            }
            if (quot.getTaxAmount() != null && quot.getTaxAmount().compareTo(BigDecimal.ZERO) > 0) {
                totalTax = quot.getTaxAmount();
            }
        }

        BigDecimal grandTotal;
        if (po.getPoValue() != null && po.getPoValue().compareTo(BigDecimal.ZERO) > 0) {
            grandTotal = po.getPoValue();
        } else if (quot != null && quot.getGrandTotal() != null && quot.getGrandTotal().compareTo(BigDecimal.ZERO) > 0) {
            grandTotal = quot.getGrandTotal();
        } else {
            grandTotal = taxableAmount.add(totalTax);
        }

        String curCode = (po.getCurrency() != null) ? po.getCurrency().name() : "INR";
        String curSym = "USD".equalsIgnoreCase(curCode) ? "$" : "₹";

        // Right-aligned Financial Summary Table
        PdfPTable totalsTable = new PdfPTable(2);
        totalsTable.setWidthPercentage(100);
        totalsTable.setWidths(new float[]{52f, 48f});
        totalsTable.setSpacingBefore(2f);
        totalsTable.setSpacingAfter(6f);

        // Spacer column on left
        PdfPCell leftSpacer = new PdfPCell();
        leftSpacer.setBorder(Rectangle.NO_BORDER);
        totalsTable.addCell(leftSpacer);

        // Right summary card
        PdfPTable card = new PdfPTable(2);
        card.setWidthPercentage(100);
        card.setWidths(new float[]{50f, 50f});

        Font tLabel = FontFactory.getFont(FontFactory.HELVETICA, 7.8f, TEXT_DARK);
        Font tVal = getAppropriateFont(true, 8.2f, TEXT_DARK);
        Font tDiscVal = getAppropriateFont(true, 8.2f, new java.awt.Color(220, 38, 38)); // Red discount

        // 1. Subtotal
        addSummaryRow(card, "Subtotal", curSym + formatSummaryNumber(subtotalBeforeDiscount, curCode), tLabel, tVal, false);

        // 2. Discount (if present)
        if (totalDiscount.compareTo(BigDecimal.ZERO) > 0) {
            addSummaryRow(card, "Discount", "-" + curSym + formatSummaryNumber(totalDiscount, curCode), tLabel, tDiscVal, false);
            addSummaryRow(card, "Taxable Amount", curSym + formatSummaryNumber(taxableAmount, curCode), tLabel, tVal, false);
        }

        // 3. Total Tax
        String taxLabel = "Total Tax (" + effectiveTaxRate.stripTrailingZeros().toPlainString() + "%)";
        addSummaryRow(card, taxLabel, curSym + formatSummaryNumber(totalTax, curCode), tLabel, tVal, false);

        // 4. GRAND TOTAL (Prominent row with TEAL_ACCENT text matching approved reference)
        PdfPCell cGtLabel = new PdfPCell(new Phrase("GRAND TOTAL", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9.5f, NAVY_PRIMARY)));
        cGtLabel.setBackgroundColor(new java.awt.Color(230, 249, 249)); // Soft cyan background
        cGtLabel.setBorderColor(ICE_BLUE_BORDER);
        cGtLabel.setPadding(6f);
        cGtLabel.setVerticalAlignment(Element.ALIGN_MIDDLE);

        Font gtFont = getAppropriateFont(true, 12.5f, TEAL_ACCENT);
        PdfPCell cGtVal = new PdfPCell(new Phrase(curSym + formatSummaryNumber(grandTotal, curCode), gtFont));
        cGtVal.setBackgroundColor(new java.awt.Color(230, 249, 249));
        cGtVal.setBorderColor(ICE_BLUE_BORDER);
        cGtVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
        cGtVal.setPadding(6f);
        cGtVal.setVerticalAlignment(Element.ALIGN_MIDDLE);

        card.addCell(cGtLabel);
        card.addCell(cGtVal);

        PdfPCell rightCol = new PdfPCell(card);
        rightCol.setBorderColor(ICE_BLUE_BORDER);
        rightCol.setBorderWidth(0.5f);
        rightCol.setPadding(2f);
        totalsTable.addCell(rightCol);

        document.add(totalsTable);
    }

    private void addSummaryRow(PdfPTable card, String label, String value, Font labelFont, Font valFont, boolean topBorder) {
        PdfPCell cLabel = new PdfPCell(new Phrase(label, labelFont));
        cLabel.setBorder(Rectangle.NO_BORDER);
        if (topBorder) {
            cLabel.setBorderWidthTop(0.5f);
            cLabel.setBorderColorTop(ICE_BLUE_BORDER);
        }
        cLabel.setPadding(3.5f);
        card.addCell(cLabel);

        PdfPCell cVal = new PdfPCell(new Phrase(value, valFont));
        cVal.setBorder(Rectangle.NO_BORDER);
        if (topBorder) {
            cVal.setBorderWidthTop(0.5f);
            cVal.setBorderColorTop(ICE_BLUE_BORDER);
        }
        cVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
        cVal.setPadding(3.5f);
        card.addCell(cVal);
    }

    private String formatSummaryNumber(BigDecimal amount, String curCode) {
        if (amount == null) amount = BigDecimal.ZERO;
        String formatted = formatAmount(amount, curCode);
        if (amount.remainder(BigDecimal.ONE).compareTo(BigDecimal.ZERO) == 0 && formatted.endsWith(".00")) {
            formatted = formatted.substring(0, formatted.length() - 3);
        }
        return formatted;
    }

    private void addPurchaseOrderTermsAndRemarks(Document document, PdfWriter writer, com.acrovix.admin.entity.PurchaseOrder po, CompanySettingsResponse settings) throws DocumentException {
        PdfPTable container = new PdfPTable(3);
        container.setWidthPercentage(100);
        container.setWidths(new float[]{49f, 2f, 49f});
        container.setSpacingAfter(8f);

        // ==========================================
        // 1. LEFT PANEL: TERMS & CONDITIONS
        // ==========================================
        PdfPCell termsCell = new PdfPCell();
        termsCell.setBackgroundColor(ICE_BLUE_BG);
        termsCell.setBorderColor(ICE_BLUE_BORDER);
        termsCell.setBorderWidth(0.6f);
        termsCell.setPadding(6f);
        termsCell.setPaddingLeft(8f);
        termsCell.setPaddingRight(8f);

        Phrase tHeaderPhrase = new Phrase();
        Image tIcon = createVectorIcon(writer, "terms", 10f, 10f, BLUE_ACCENT);
        if (tIcon != null) { tHeaderPhrase.add(new Chunk(tIcon, 0, -1f)); tHeaderPhrase.add(new Chunk("  ")); }
        tHeaderPhrase.add(new Chunk("TERMS & CONDITIONS", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, BLUE_ACCENT)));

        Paragraph pTermsHeader = new Paragraph(tHeaderPhrase);
        pTermsHeader.setSpacingAfter(4f);
        termsCell.addElement(pTermsHeader);

        java.util.List<String> termsList = new java.util.ArrayList<>();
        if (po.getQuotation() != null && po.getQuotation().getTermsAndConditions() != null && !po.getQuotation().getTermsAndConditions().isBlank()) {
            String[] rawLines = po.getQuotation().getTermsAndConditions().split("\n");
            for (String l : rawLines) {
                if (!l.trim().isEmpty()) termsList.add(l.trim());
            }
        }
        if (termsList.isEmpty()) {
            if (settings != null && settings.getDefaultTermsAndConditions() != null && !settings.getDefaultTermsAndConditions().isBlank()) {
                String[] rawLines = settings.getDefaultTermsAndConditions().split("\n");
                for (String l : rawLines) {
                    if (!l.trim().isEmpty()) termsList.add(l.trim());
                }
            } else {
                boolean isAcrovix = (settings == null || settings.getTenantId() == null || settings.getTenantId().equals(1L) 
                        || (settings.getCompanyName() != null && settings.getCompanyName().toUpperCase().contains("ACROVIX")));
                if (isAcrovix) {
                    termsList.add("This Purchase Order is issued for subscription licenses and services as per the line items above.");
                    termsList.add("Invoices for all payments under this PO must be raised in the name and address of Acrovix Innovations Private Limited quoting GSTIN 29ABFCA9588C1Z8.");
                    termsList.add("This PO is valid subject to mutual agreement on delivery timelines and standard terms of sale/service applicable to the vendor.");
                    termsList.add("Any change to product, pricing, or term of this order must be documented via a written amendment to this PO.");
                    termsList.add("Payment term: As agreed upon delivery.");
                } else {
                    String compName = (settings != null && settings.getCompanyName() != null && !settings.getCompanyName().isBlank()) 
                            ? settings.getCompanyName() : "Buyer";
                    String taxRef = (settings != null && settings.getGstin() != null && !settings.getGstin().isBlank()) 
                            ? "quoting GSTIN " + settings.getGstin() 
                            : ((settings != null && settings.getVatId() != null && !settings.getVatId().isBlank()) ? "quoting VAT ID " + settings.getVatId() : "");
                    termsList.add("This Purchase Order is issued for the products and services as per the line items above.");
                    termsList.add("Invoices for all payments under this PO must be raised in the name and address of " + compName + (taxRef.isEmpty() ? "." : " " + taxRef + "."));
                    termsList.add("This PO is valid subject to mutual agreement on delivery timelines and standard terms of sale/service applicable to the vendor.");
                    termsList.add("Any change to product, pricing, or term of this order must be documented via a written amendment to this PO.");
                }
            }
        }

        Font tItemFont = FontFactory.getFont(FontFactory.HELVETICA, 6.5f, TEXT_DARK);
        for (int i = 0; i < termsList.size(); i++) {
            String raw = termsList.get(i);
            String display = raw.matches("^\\d+[\\.\\)].*") ? raw : ((i + 1) + ".  " + raw);
            Paragraph itemP = new Paragraph(display, tItemFont);
            itemP.setLeading(8.5f);
            itemP.setSpacingAfter(2f);
            termsCell.addElement(itemP);
        }

        // Spacer
        PdfPCell spacer = new PdfPCell();
        spacer.setBorder(Rectangle.NO_BORDER);

        // ==========================================
        // 2. RIGHT PANEL: REMARKS / ADDITIONAL NOTES
        // ==========================================
        PdfPCell remarksCell = new PdfPCell();
        remarksCell.setBackgroundColor(ICE_BLUE_BG);
        remarksCell.setBorderColor(ICE_BLUE_BORDER);
        remarksCell.setBorderWidth(0.6f);
        remarksCell.setPadding(6f);
        remarksCell.setPaddingLeft(8f);
        remarksCell.setPaddingRight(8f);

        Phrase rHeaderPhrase = new Phrase();
        Image rIcon = createVectorIcon(writer, "pen", 9.5f, 9.5f, BLUE_ACCENT);
        if (rIcon != null) { rHeaderPhrase.add(new Chunk(rIcon, 0, -1f)); rHeaderPhrase.add(new Chunk("  ")); }
        rHeaderPhrase.add(new Chunk("REMARKS / ADDITIONAL NOTES", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, BLUE_ACCENT)));

        Paragraph pRemarksHeader = new Paragraph(rHeaderPhrase);
        pRemarksHeader.setSpacingAfter(4f);
        remarksCell.addElement(pRemarksHeader);

        Font rTextFont = FontFactory.getFont(FontFactory.HELVETICA, 7.2f, TEXT_DARK);
        String remarks = po.getRemarks();
        if (remarks != null && !remarks.trim().isEmpty()) {
            String[] rLines = remarks.split("\n");
            for (String line : rLines) {
                Paragraph pLine = new Paragraph(line.trim(), rTextFont);
                pLine.setLeading(9.5f);
                pLine.setSpacingAfter(1.5f);
                remarksCell.addElement(pLine);
            }
        } else {
            Paragraph pEmpty = new Paragraph("-", rTextFont);
            remarksCell.addElement(pEmpty);
        }

        container.addCell(termsCell);
        container.addCell(spacer);
        container.addCell(remarksCell);

        document.add(container);
    }

    private void addPurchaseOrderSignatures(Document document, CompanySettingsResponse settings) throws DocumentException {
        PdfPTable sigTable = new PdfPTable(3);
        sigTable.setWidthPercentage(100);
        sigTable.setWidths(new float[]{49f, 2f, 49f});
        sigTable.setKeepTogether(true);
        sigTable.setSpacingBefore(4f);
        sigTable.setSpacingAfter(6f);

        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.0f, NAVY_PRIMARY);
        Font lineFont = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, TEXT_MUTED);

        String companyName = (settings != null && settings.getCompanyName() != null && !settings.getCompanyName().isBlank()) 
                ? settings.getCompanyName() : "Acrovix Innovations Private Limited";

        // 1. LEFT CARD: For Acrovix Innovations Private Limited
        PdfPCell compSigCard = new PdfPCell();
        compSigCard.setBorder(Rectangle.NO_BORDER);
        compSigCard.setPadding(0);

        Paragraph cTitle = new Paragraph("For " + companyName, titleFont);
        cTitle.setSpacingAfter(24f);
        compSigCard.addElement(cTitle);

        Paragraph cLine = new Paragraph("________________________________________", FontFactory.getFont(FontFactory.HELVETICA, 7.5f, ICE_BLUE_BORDER));
        cLine.setSpacingAfter(2f);
        compSigCard.addElement(cLine);

        Paragraph cAuth = new Paragraph("Authorized Signatory", lineFont);
        compSigCard.addElement(cAuth);

        // Spacer
        PdfPCell spacer = new PdfPCell();
        spacer.setBorder(Rectangle.NO_BORDER);

        // 2. RIGHT CARD: For Vendor
        PdfPCell vendorSigCard = new PdfPCell();
        vendorSigCard.setBorder(Rectangle.NO_BORDER);
        vendorSigCard.setPadding(0);

        Paragraph vTitle = new Paragraph("For Vendor", titleFont);
        vTitle.setSpacingAfter(24f);
        vendorSigCard.addElement(vTitle);

        Paragraph vLine = new Paragraph("________________________________________", FontFactory.getFont(FontFactory.HELVETICA, 7.5f, ICE_BLUE_BORDER));
        vLine.setSpacingAfter(2f);
        vendorSigCard.addElement(vLine);

        Paragraph vAuth = new Paragraph("Authorized Signatory", lineFont);
        vendorSigCard.addElement(vAuth);

        sigTable.addCell(compSigCard);
        sigTable.addCell(spacer);
        sigTable.addCell(vendorSigCard);

        document.add(sigTable);
    }


    // =========================================================================
    // EXACT TAX INVOICE PDF GENERATION (A4 Portrait, Reference Redesign)
    // =========================================================================

    static class InvoicePageEvent extends PdfPageEventHelper {
        private final com.acrovix.admin.entity.Invoice invoice;
        private final CompanySettingsResponse settings;
        private com.lowagie.text.pdf.PdfTemplate totalPagesTemplate;
        private com.lowagie.text.pdf.BaseFont baseFont;

        public InvoicePageEvent(com.acrovix.admin.entity.Invoice invoice, CompanySettingsResponse settings) {
            this.invoice = invoice;
            this.settings = settings;
        }

        @Override
        public void onOpenDocument(PdfWriter writer, Document document) {
            try {
                totalPagesTemplate = writer.getDirectContent().createTemplate(30f, 16f);
                baseFont = com.lowagie.text.pdf.BaseFont.createFont(
                        com.lowagie.text.pdf.BaseFont.HELVETICA,
                        com.lowagie.text.pdf.BaseFont.WINANSI,
                        com.lowagie.text.pdf.BaseFont.NOT_EMBEDDED);
            } catch (Exception e) {
                log.warn("Could not initialize footer template fonts for Invoice", e);
            }
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            float pageWidth = document.getPageSize().getWidth();
            float pageHeight = document.getPageSize().getHeight();

            // 1. Bottom navy/blue bar across bottom edge
            PdfContentByte cbUnder = writer.getDirectContentUnder();
            cbUnder.saveState();
            cbUnder.setColorFill(BLUE_ACCENT);
            cbUnder.rectangle(0, 0, pageWidth, 5f);
            cbUnder.fill();
            cbUnder.restoreState();

            // 2. Footer Contact Information & Page Numbering (e.g. Page 1 of 2)
            PdfContentByte fg = writer.getDirectContent();
            float footerY = 14f;
            Font footerFont = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, TEXT_MUTED);

            boolean isAcrovix = (settings == null || settings.getTenantId() == null || settings.getTenantId().equals(1L) 
                    || (settings.getCompanyName() != null && settings.getCompanyName().toUpperCase().contains("ACROVIX")));
            String phone = (settings != null && settings.getPhone() != null && !settings.getPhone().isBlank()) 
                    ? settings.getPhone() : (isAcrovix ? "+91 98765 43210" : "");
            String email = (settings != null && settings.getEmail() != null && !settings.getEmail().isBlank()) 
                    ? settings.getEmail() : (isAcrovix ? "contact@acrovix.com" : "");
            String website = (settings != null && settings.getWebsite() != null && !settings.getWebsite().isBlank()) 
                    ? settings.getWebsite() : (isAcrovix ? "www.acrovix.com" : "");

            PdfPTable footerTable = new PdfPTable(3);
            footerTable.setTotalWidth(pageWidth * 0.65f);
            try {
                footerTable.setWidths(new float[]{32f, 38f, 30f});
            } catch (Exception ignored) {}

            Phrase pPhrase = new Phrase(phone.isBlank() ? "" : "Phone: " + phone, footerFont);
            PdfPCell cPhone = new PdfPCell(pPhrase);
            cPhone.setBorder(Rectangle.NO_BORDER);
            cPhone.setPadding(0);
            footerTable.addCell(cPhone);

            Phrase mPhrase = new Phrase(email.isBlank() ? "" : "Email: " + email, footerFont);
            PdfPCell cEmail = new PdfPCell(mPhrase);
            cEmail.setBorder(Rectangle.NO_BORDER);
            cEmail.setPadding(0);
            footerTable.addCell(cEmail);

            Phrase gPhrase = new Phrase(website.isBlank() ? "" : "Web: " + website, footerFont);
            PdfPCell cWeb = new PdfPCell(gPhrase);
            cWeb.setBorder(Rectangle.NO_BORDER);
            cWeb.setPadding(0);
            footerTable.addCell(cWeb);

            footerTable.writeSelectedRows(0, -1, 36f, footerY + 9f, fg);

            String pageText = "Page " + writer.getPageNumber() + " of ";
            float pageNumX = pageWidth - 60f;
            ColumnText.showTextAligned(fg, Element.ALIGN_RIGHT, new Phrase(pageText, footerFont), pageNumX, footerY, 0);
            if (totalPagesTemplate != null) {
                fg.addTemplate(totalPagesTemplate, pageNumX + 1f, footerY - 1f);
            }

            // 3. Continuation header on Page 2+ (Invoice Number, Invoice Date, thin divider)
            if (writer.getPageNumber() > 1) {
                float headerY = pageHeight - 24f;
                String invNum = invoice.getInvoiceNumber() != null ? invoice.getInvoiceNumber() : "DRAFT";
                String invDateStr = invoice.getInvoiceDate() != null ? invoice.getInvoiceDate().format(DateTimeFormatter.ofPattern("dd MMM yyyy")) : "";

                Phrase titlePhrase = new Phrase("TAX INVOICE (CONTINUED)", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9.0f, NAVY_PRIMARY));
                ColumnText.showTextAligned(fg, Element.ALIGN_LEFT, titlePhrase, 36f, headerY - 5f, 0);

                Phrase invNumPhrase = new Phrase();
                invNumPhrase.add(new Chunk("Invoice No : ", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.0f, NAVY_PRIMARY)));
                invNumPhrase.add(new Chunk(invNum + "   ", FontFactory.getFont(FontFactory.HELVETICA, 8.0f, TEXT_DARK)));
                invNumPhrase.add(new Chunk("Date : ", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.0f, NAVY_PRIMARY)));
                invNumPhrase.add(new Chunk(invDateStr, FontFactory.getFont(FontFactory.HELVETICA, 8.0f, TEXT_DARK)));

                ColumnText.showTextAligned(fg, Element.ALIGN_RIGHT, invNumPhrase, pageWidth - 36f, headerY - 5f, 0);

                // Thin divider line
                PdfContentByte cbLine = writer.getDirectContent();
                cbLine.saveState();
                cbLine.setColorStroke(ICE_BLUE_BORDER);
                cbLine.setLineWidth(0.8f);
                cbLine.moveTo(36f, headerY - 15f);
                cbLine.lineTo(pageWidth - 36f, headerY - 15f);
                cbLine.stroke();
                cbLine.restoreState();
            }
        }

        @Override
        public void onCloseDocument(PdfWriter writer, Document document) {
            if (totalPagesTemplate != null && baseFont != null) {
                totalPagesTemplate.beginText();
                totalPagesTemplate.setFontAndSize(baseFont, 7.5f);
                totalPagesTemplate.setColorFill(new java.awt.Color(71, 85, 105));
                totalPagesTemplate.setTextMatrix(0, 1f);
                int total = Math.max(1, writer.getPageNumber() - 1);
                totalPagesTemplate.showText(String.valueOf(total));
                totalPagesTemplate.endText();
            }
        }
    }

    public byte[] generateInvoicePdf(com.acrovix.admin.entity.Invoice invoice) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 42, 36);
            PdfWriter writer = PdfWriter.getInstance(document, out);

            CompanySettingsResponse settings = resolveTenantSettings(invoice != null ? invoice.getTenantId() : null);

            writer.setPageEvent(new InvoicePageEvent(invoice, settings));
            document.open();

            // 1. Company Header (Logo on left, Details on right)
            addInvoicePage1Header(document, writer, settings);

            // 2. Title & Metadata Panel
            addInvoiceTitleAndMetaStrip(document, invoice);

            // 3. Information Panels: Bill To & Ship To
            addInvoiceCustomerPanels(document, writer, invoice);

            // 4. Line items table with continuation support & Closing sections
            addInvoiceItemsAndClosing(document, writer, invoice, settings);

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate Invoice PDF", e);
            throw new RuntimeException("Failed to generate Invoice PDF", e);
        }
    }

    private void addInvoicePage1Header(Document document, PdfWriter writer, CompanySettingsResponse settings) throws DocumentException {
        PdfPTable headerTable = new PdfPTable(2);
        headerTable.setWidthPercentage(100);
        headerTable.setWidths(new float[]{42f, 58f});
        headerTable.setSpacingAfter(8f);

        // Left Cell: Logo or Brand Name
        PdfPCell logoCell = new PdfPCell();
        logoCell.setBorder(Rectangle.NO_BORDER);
        logoCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        logoCell.setPadding(0);

        boolean isAcrovix = (settings == null || settings.getTenantId() == null || settings.getTenantId().equals(1L) 
                || (settings.getCompanyName() != null && settings.getCompanyName().toUpperCase().contains("ACROVIX")));

        Image logo = null;
        if (settings != null && settings.getLogoUrl() != null && !settings.getLogoUrl().trim().isEmpty()) {
            try {
                logo = Image.getInstance(new java.net.URL(settings.getLogoUrl()));
            } catch (Exception ex) {
                log.warn("Failed to load logo from URL for invoice: " + settings.getLogoUrl(), ex);
            }
        }
        if (logo == null && isAcrovix) {
            java.net.URL defaultLogoUrl = getClass().getResource("/static/Acrovix_logo.png");
            if (defaultLogoUrl != null) {
                try {
                    logo = Image.getInstance(defaultLogoUrl);
                } catch (Exception ignored) {}
            }
        }

        if (logo != null) {
            logo.scaleToFit(140f, 48f);
            logoCell.addElement(logo);
        } else {
            String companyName = (settings != null && settings.getCompanyName() != null) 
                    ? settings.getCompanyName() : (isAcrovix ? "ACROVIX INNOVATIONS PRIVATE LIMITED" : "INVOICE");
            String brandName = (settings != null && settings.getBrandName() != null && !settings.getBrandName().isBlank())
                    ? settings.getBrandName() : companyName;
            logoCell.addElement(new Paragraph(brandName.toUpperCase(), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14f, NAVY_PRIMARY)));
        }
        headerTable.addCell(logoCell);

        // Right Cell: Company Contact & Address details
        PdfPCell compCell = new PdfPCell();
        compCell.setBorder(Rectangle.NO_BORDER);
        compCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        compCell.setPadding(0);

        String companyName = (settings != null && settings.getCompanyName() != null && !settings.getCompanyName().isBlank()) 
                ? settings.getCompanyName() : (isAcrovix ? "ACROVIX INNOVATIONS PRIVATE LIMITED" : "");
        String compAddress = (settings != null && settings.getRegisteredAddress() != null && !settings.getRegisteredAddress().isBlank()) 
                ? settings.getRegisteredAddress() 
                : ((settings != null && settings.getBillingAddress() != null) ? settings.getBillingAddress() : "Manikonda, Hyderabad, Telangana, India - 500089");
        String compPhone = (settings != null && settings.getPhone() != null && !settings.getPhone().isBlank()) 
                ? settings.getPhone() : (isAcrovix ? "+91 98765 43210" : "");
        String compEmail = (settings != null && settings.getEmail() != null && !settings.getEmail().isBlank()) 
                ? settings.getEmail() : (isAcrovix ? "contact@acrovix.com" : "");
        String compWeb = (settings != null && settings.getWebsite() != null && !settings.getWebsite().isBlank()) 
                ? settings.getWebsite() : (isAcrovix ? "www.acrovix.com" : "");
        String compGstin = (settings != null && settings.getGstin() != null && !settings.getGstin().isBlank())
                ? settings.getGstin() : "";
        String compVat = (settings != null && settings.getVatId() != null && !settings.getVatId().isBlank())
                ? settings.getVatId() : "";
        String compPan = (settings != null && settings.getPan() != null && !settings.getPan().isBlank())
                ? settings.getPan() : "";

        Paragraph pName = new Paragraph(companyName, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9.5f, NAVY_PRIMARY));
        pName.setAlignment(Element.ALIGN_RIGHT);
        compCell.addElement(pName);

        Paragraph pAddr = new Paragraph(compAddress, FontFactory.getFont(FontFactory.HELVETICA, 7.5f, TEXT_MUTED));
        pAddr.setAlignment(Element.ALIGN_RIGHT);
        pAddr.setSpacingAfter(2f);
        compCell.addElement(pAddr);

        if (!compGstin.isEmpty()) {
            Paragraph pGstin = new Paragraph("GSTIN: " + compGstin, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, TEXT_DARK));
            pGstin.setAlignment(Element.ALIGN_RIGHT);
            pGstin.setSpacingAfter(2f);
            compCell.addElement(pGstin);
        }

        if (!compVat.isEmpty()) {
            Paragraph pVat = new Paragraph("VAT / Tax ID: " + compVat, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, TEXT_DARK));
            pVat.setAlignment(Element.ALIGN_RIGHT);
            pVat.setSpacingAfter(2f);
            compCell.addElement(pVat);
        }

        if (!compPan.isEmpty()) {
            Paragraph pPan = new Paragraph("PAN: " + compPan, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, TEXT_DARK));
            pPan.setAlignment(Element.ALIGN_RIGHT);
            pPan.setSpacingAfter(2f);
            compCell.addElement(pPan);
        }

        StringBuilder contactLine = new StringBuilder();
        if (!compPhone.isBlank()) contactLine.append("Phone: ").append(compPhone);
        if (!compEmail.isBlank()) {
            if (contactLine.length() > 0) contactLine.append("  |  ");
            contactLine.append("Email: ").append(compEmail);
        }
        if (!compWeb.isBlank()) {
            if (contactLine.length() > 0) contactLine.append("  |  ");
            contactLine.append("Web: ").append(compWeb);
        }

        if (contactLine.length() > 0) {
            Font contactFont = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, TEXT_MUTED);
            Paragraph pContact = new Paragraph(contactLine.toString(), contactFont);
            pContact.setAlignment(Element.ALIGN_RIGHT);
            compCell.addElement(pContact);
        }

        headerTable.addCell(compCell);
        document.add(headerTable);
    }

    private void addInvoiceTitleAndMetaStrip(Document document, com.acrovix.admin.entity.Invoice invoice) throws DocumentException {
        // 1. Title row with badge
        PdfPTable titleTable = new PdfPTable(2);
        titleTable.setWidthPercentage(100);
        titleTable.setWidths(new float[]{65f, 35f});
        titleTable.setSpacingAfter(6f);

        PdfPCell titleCell = new PdfPCell();
        titleCell.setBorder(Rectangle.NO_BORDER);
        titleCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        titleCell.setPadding(0);

        String typeStr = (invoice.getInvoiceType() == com.acrovix.admin.entity.InvoiceType.PROFORMA) ? "PROFORMA INVOICE" : "TAX INVOICE";
        Paragraph mainTitle = new Paragraph(typeStr, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18f, NAVY_PRIMARY));
        mainTitle.setSpacingAfter(2f);
        titleCell.addElement(mainTitle);

        Paragraph subTitle = new Paragraph("Original for Recipient", FontFactory.getFont(FontFactory.HELVETICA, 8.0f, TEXT_MUTED));
        titleCell.addElement(subTitle);
        titleTable.addCell(titleCell);

        // Status & Type Badge on right
        PdfPCell badgeCell = new PdfPCell();
        badgeCell.setBorder(Rectangle.NO_BORDER);
        badgeCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        badgeCell.setVerticalAlignment(Element.ALIGN_MIDDLE);

        PdfPTable badgeWrap = new PdfPTable(1);
        badgeWrap.setTotalWidth(130f);
        badgeWrap.setLockedWidth(true);
        badgeWrap.setHorizontalAlignment(Element.ALIGN_RIGHT);

        String statusStr = invoice.getStatus() != null ? invoice.getStatus().name() : "DRAFT";
        PdfPCell innerBadge = new PdfPCell(new Phrase(statusStr + "  •  " + (invoice.getInvoiceType() == com.acrovix.admin.entity.InvoiceType.PROFORMA ? "PROFORMA" : "TAX INVOICE"),
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, BLUE_ACCENT)));
        innerBadge.setBackgroundColor(ICE_BLUE_BG);
        innerBadge.setBorderColor(ICE_BLUE_BORDER);
        innerBadge.setBorderWidth(0.5f);
        innerBadge.setHorizontalAlignment(Element.ALIGN_CENTER);
        innerBadge.setPadding(4f);
        badgeWrap.addCell(innerBadge);

        badgeCell.addElement(badgeWrap);
        titleTable.addCell(badgeCell);
        document.add(titleTable);

        // 2. Metadata Strip (Horizontal table with 6 columns)
        PdfPTable metaStrip = new PdfPTable(6);
        metaStrip.setWidthPercentage(100);
        metaStrip.setWidths(new float[]{18f, 16f, 17f, 16f, 20f, 13f});
        metaStrip.setSpacingAfter(10f);

        Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.0f, TEXT_MUTED);
        Font valFont = getAppropriateFont(true, 8.0f, TEXT_DARK);

        String invNum = invoice.getInvoiceNumber() != null ? invoice.getInvoiceNumber() : "DRAFT";
        String invDate = invoice.getInvoiceDate() != null ? invoice.getInvoiceDate().format(DateTimeFormatter.ofPattern("dd MMM yyyy")) : "-";
        
        String poNum = "-";
        String poDate = "-";
        if (invoice.getPurchaseOrder() != null) {
            if (invoice.getPurchaseOrder().getPoNumber() != null) poNum = invoice.getPurchaseOrder().getPoNumber();
            if (invoice.getPurchaseOrder().getPoDate() != null) poDate = invoice.getPurchaseOrder().getPoDate().format(DateTimeFormatter.ofPattern("dd MMM yyyy"));
        }

        String dueDate = "-";
        if (invoice.getDueDate() != null) {
            dueDate = invoice.getDueDate().format(DateTimeFormatter.ofPattern("dd MMM yyyy"));
            if (invoice.getInvoiceDate() != null) {
                long days = java.time.temporal.ChronoUnit.DAYS.between(invoice.getInvoiceDate(), invoice.getDueDate());
                if (days > 0) dueDate += " (" + days + "d)";
            }
        }

        String currencyStr = (invoice.getCurrency() != null && invoice.getCurrency().name().equalsIgnoreCase("USD")) ? "USD ($)" : "INR (₹)";

        addInvoiceMetaCell(metaStrip, "Invoice No.", invNum, labelFont, valFont);
        addInvoiceMetaCell(metaStrip, "Invoice Date", invDate, labelFont, valFont);
        addInvoiceMetaCell(metaStrip, "PO Number", poNum, labelFont, valFont);
        addInvoiceMetaCell(metaStrip, "PO Date", poDate, labelFont, valFont);
        addInvoiceMetaCell(metaStrip, "Due Date", dueDate, labelFont, valFont);
        addInvoiceMetaCell(metaStrip, "Currency", currencyStr, labelFont, valFont);

        document.add(metaStrip);
    }

    private void addInvoiceMetaCell(PdfPTable table, String label, String value, Font labelFont, Font valFont) {
        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(ICE_BLUE_BG);
        cell.setBorderColor(ICE_BLUE_BORDER);
        cell.setBorderWidth(0.5f);
        cell.setPadding(4f);
        cell.setPaddingLeft(6f);
        cell.setPaddingRight(6f);

        Paragraph pL = new Paragraph(label, labelFont);
        pL.setSpacingAfter(1.5f);
        cell.addElement(pL);

        Paragraph pV = new Paragraph(value, valFont);
        cell.addElement(pV);

        table.addCell(cell);
    }

    private void addInvoiceCustomerPanels(Document document, PdfWriter writer, com.acrovix.admin.entity.Invoice invoice) throws DocumentException {
        Font cardHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, BLUE_ACCENT);
        Font labelFont = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, TEXT_MUTED);
        Font valFont = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, TEXT_DARK);
        Font valBoldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, TEXT_DARK);

        PdfPTable panelsTable = new PdfPTable(3);
        panelsTable.setWidthPercentage(100);
        panelsTable.setWidths(new float[]{49f, 2f, 49f});
        panelsTable.setSpacingAfter(10f);

        // 1. LEFT PANEL: Bill To (Customer)
        PdfPTable billInner = new PdfPTable(2);
        billInner.setWidthPercentage(100);
        billInner.setWidths(new float[]{32f, 68f});

        Phrase bHeaderPhrase = new Phrase();
        Image bIcon = createVectorIcon(writer, "user", 9f, 9f, BLUE_ACCENT);
        if (bIcon != null) {
            bHeaderPhrase.add(new Chunk(bIcon, 0, -1.5f));
            bHeaderPhrase.add(new Chunk("  "));
        }
        bHeaderPhrase.add(new Chunk("BILL TO (CUSTOMER)", cardHeaderFont));

        PdfPCell bHeaderCell = new PdfPCell(bHeaderPhrase);
        bHeaderCell.setColspan(2);
        bHeaderCell.setBorder(Rectangle.NO_BORDER);
        bHeaderCell.setPaddingBottom(5f);
        billInner.addCell(bHeaderCell);

        String clientCompany = (invoice.getClientCompany() != null && !invoice.getClientCompany().isBlank()) 
                ? invoice.getClientCompany() : (invoice.getClientName() != null ? invoice.getClientName() : "-");
        String clientContact = invoice.getClientName() != null ? invoice.getClientName() : "-";
        String clientAddress = invoice.getClientAddress() != null && !invoice.getClientAddress().isBlank() ? invoice.getClientAddress() : "-";
        String clientPhone = invoice.getClientPhone() != null && !invoice.getClientPhone().isBlank() ? invoice.getClientPhone() : "-";
        String clientEmail = invoice.getClientEmail() != null && !invoice.getClientEmail().isBlank() ? invoice.getClientEmail() : "-";
        String clientGstin = invoice.getClientGstin() != null && !invoice.getClientGstin().isBlank() ? invoice.getClientGstin() : "-";

        addPoMetaRow(billInner, "Customer", clientCompany, labelFont, valBoldFont);
        addPoMetaRow(billInner, "Address", clientAddress, labelFont, valFont);
        addPoMetaRow(billInner, "GSTIN", clientGstin, labelFont, valFont);
        addPoMetaRow(billInner, "Contact Person", clientContact, labelFont, valFont);
        addPoMetaRow(billInner, "Email", clientEmail, labelFont, valFont);
        addPoMetaRow(billInner, "Phone", clientPhone, labelFont, valFont);

        PdfPCell billCard = new PdfPCell(billInner);
        billCard.setBackgroundColor(ICE_BLUE_BG);
        billCard.setBorderColor(ICE_BLUE_BORDER);
        billCard.setBorderWidth(0.5f);
        billCard.setPadding(6f);
        billCard.setPaddingBottom(8f);

        // Spacer
        PdfPCell spacer = new PdfPCell();
        spacer.setBorder(Rectangle.NO_BORDER);

        // 2. RIGHT PANEL: Ship To (Delivery Address)
        PdfPTable shipInner = new PdfPTable(2);
        shipInner.setWidthPercentage(100);
        shipInner.setWidths(new float[]{32f, 68f});

        Phrase sHeaderPhrase = new Phrase();
        Image sIcon = createVectorIcon(writer, "truck", 11f, 10f, BLUE_ACCENT);
        if (sIcon != null) {
            sHeaderPhrase.add(new Chunk(sIcon, 0, -1.5f));
            sHeaderPhrase.add(new Chunk("  "));
        }
        sHeaderPhrase.add(new Chunk("SHIP TO (DELIVERY ADDRESS)", cardHeaderFont));

        PdfPCell sHeaderCell = new PdfPCell(sHeaderPhrase);
        sHeaderCell.setColspan(2);
        sHeaderCell.setBorder(Rectangle.NO_BORDER);
        sHeaderCell.setPaddingBottom(5f);
        shipInner.addCell(sHeaderCell);

        String shipToAddress = (invoice.getClientShippingAddress() != null && !invoice.getClientShippingAddress().isBlank())
                ? invoice.getClientShippingAddress()
                : clientAddress;
        addPoMetaRow(shipInner, "Delivery Name", clientCompany, labelFont, valBoldFont);
        addPoMetaRow(shipInner, "Address", shipToAddress, labelFont, valFont);
        addPoMetaRow(shipInner, "Contact Person", clientContact, labelFont, valFont);
        addPoMetaRow(shipInner, "Phone", clientPhone, labelFont, valFont);
        addPoMetaRow(shipInner, "Email", clientEmail, labelFont, valFont);

        PdfPCell shipCard = new PdfPCell(shipInner);
        shipCard.setBackgroundColor(ICE_BLUE_BG);
        shipCard.setBorderColor(ICE_BLUE_BORDER);
        shipCard.setBorderWidth(0.5f);
        shipCard.setPadding(6f);
        shipCard.setPaddingBottom(8f);

        panelsTable.addCell(billCard);
        panelsTable.addCell(spacer);
        panelsTable.addCell(shipCard);

        document.add(panelsTable);
    }

    private void addInvoiceItemsAndClosing(Document document, PdfWriter writer, com.acrovix.admin.entity.Invoice invoice, CompanySettingsResponse settings) throws DocumentException {
        java.util.List<com.acrovix.admin.entity.InvoiceItem> allItems = invoice.getItems() != null ? invoice.getItems() : java.util.Collections.emptyList();
        int totalItems = allItems.size();

        String currencyCode = (invoice.getCurrency() != null) ? invoice.getCurrency().name() : "INR";
        String curSym = "USD".equalsIgnoreCase(currencyCode) ? "$" : "₹";

        // Multi-page strategy:
        // When totalItems > 10: Page 1 gets items 1..10. Page 2 gets Items (Continued) 11..end + Totals, Terms, Bank, Remarks, Signatures.
        // When 6 < totalItems <= 10: Page 1 gets items; Page 2 gets Totals, Terms, Bank, Remarks, Signatures cleanly.
        // When totalItems <= 6: Page 1 gets items, Totals, Terms, Bank, Remarks, Signatures in one clean page.
        if (totalItems > 10) {
            java.util.List<com.acrovix.admin.entity.InvoiceItem> p1Items = allItems.subList(0, 10);
            java.util.List<com.acrovix.admin.entity.InvoiceItem> p2Items = allItems.subList(10, totalItems);

            // Page 1: Items header + Table 1 (1..10)
            addPoSectionHeading(document, writer, "items", "Invoice Items");
            PdfPTable t1 = buildInvoiceItemsTable(p1Items, 1, curSym);
            document.add(t1);

            // Advance to Page 2
            document.newPage();

            // Page 2: Items (Continued) + Table 2 (11..end)
            addPoSectionHeading(document, writer, "items", "Invoice Items (Continued)");
            PdfPTable t2 = buildInvoiceItemsTable(p2Items, 11, curSym);
            document.add(t2);

            // Page 2 Totals, Terms, Bank, Remarks, Signatures
            addInvoiceTotalsBlock(document, invoice, curSym);
            addInvoiceTermsAndBankPanels(document, writer, invoice, settings);
            addInvoiceRemarksAndSignatures(document, writer, invoice, settings);

        } else if (totalItems > 6) {
            // Page 1: Items header + Table (all items fit on Page 1)
            addPoSectionHeading(document, writer, "items", "Invoice Items");
            PdfPTable t = buildInvoiceItemsTable(allItems, 1, curSym);
            document.add(t);

            // Advance to Page 2 for closing sections cleanly
            document.newPage();

            // Page 2 Totals, Terms, Bank, Remarks, Signatures
            addInvoiceTotalsBlock(document, invoice, curSym);
            addInvoiceTermsAndBankPanels(document, writer, invoice, settings);
            addInvoiceRemarksAndSignatures(document, writer, invoice, settings);

        } else {
            // Single page layout
            addPoSectionHeading(document, writer, "items", "Invoice Items");
            PdfPTable t = buildInvoiceItemsTable(allItems, 1, curSym);
            document.add(t);

            addInvoiceTotalsBlock(document, invoice, curSym);
            addInvoiceTermsAndBankPanels(document, writer, invoice, settings);
            addInvoiceRemarksAndSignatures(document, writer, invoice, settings);
        }
    }

    private PdfPTable buildInvoiceItemsTable(java.util.List<com.acrovix.admin.entity.InvoiceItem> items, int startIdx, String curSym) {
        PdfPTable table = new PdfPTable(8);
        table.setWidthPercentage(100);
        try {
            table.setWidths(new float[]{4f, 13f, 30f, 11f, 7f, 14f, 8f, 13f});
        } catch (Exception ignored) {}
        table.setSpacingAfter(8f);
        table.setHeaderRows(1);

        Font thFont = getAppropriateFont(true, 7.5f, java.awt.Color.WHITE);
        String[] headers = new String[]{
                "#", "Item Code", "Description", "HSN / SAC", "Qty", "Unit Price (" + curSym + ")", "GST %", "Amount (" + curSym + ")"
        };

        for (int i = 0; i < headers.length; i++) {
            PdfPCell hCell = new PdfPCell(new Phrase(headers[i], thFont));
            hCell.setBackgroundColor(NAVY_PRIMARY);
            hCell.setBorderColor(NAVY_PRIMARY);
            hCell.setPadding(4.5f);
            hCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            if (i == 0 || i == 3 || i == 4 || i == 6) {
                hCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            } else if (i == 5 || i == 7) {
                hCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            } else {
                hCell.setHorizontalAlignment(Element.ALIGN_LEFT);
            }
            table.addCell(hCell);
        }

        Font tbFont = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, TEXT_DARK);
        Font tbCodeFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.2f, TEXT_DARK);
        Font tbAmtFont = getAppropriateFont(true, 7.5f, TEXT_DARK);

        int idx = startIdx;
        for (com.acrovix.admin.entity.InvoiceItem item : items) {
            java.awt.Color rowBg = (idx % 2 == 0) ? new java.awt.Color(248, 250, 252) : java.awt.Color.WHITE;

            // #
            table.addCell(createItemCell(String.valueOf(idx), tbFont, Element.ALIGN_CENTER, rowBg));

            // Item Code / SKU
            String code = (item.getSku() != null && !item.getSku().isBlank()) ? item.getSku() : ("ITM-" + String.format("%03d", idx));
            table.addCell(createItemCell(code, tbCodeFont, Element.ALIGN_LEFT, rowBg));

            // Description
            String desc = item.getDescription() != null ? item.getDescription() : "-";
            table.addCell(createItemCell(desc, tbFont, Element.ALIGN_LEFT, rowBg));

            // HSN / SAC
            String hsn = (item.getHsnSac() != null && !item.getHsnSac().isBlank()) ? item.getHsnSac() : "-";
            table.addCell(createItemCell(hsn, tbFont, Element.ALIGN_CENTER, rowBg));

            // Qty
            String qty = item.getQuantity() != null ? item.getQuantity().stripTrailingZeros().toPlainString() : "0";
            table.addCell(createItemCell(qty, tbFont, Element.ALIGN_CENTER, rowBg));

            // Unit Price
            BigDecimal price = item.getUnitPrice() != null ? item.getUnitPrice() : (item.getListPrice() != null ? item.getListPrice() : BigDecimal.ZERO);
            table.addCell(createItemCell(String.format("%,.2f", price), tbFont, Element.ALIGN_RIGHT, rowBg));

            // GST %
            String gst = (item.getTaxPercent() != null) ? (item.getTaxPercent().stripTrailingZeros().toPlainString() + "%") : "18%";
            table.addCell(createItemCell(gst, tbFont, Element.ALIGN_CENTER, rowBg));

            // Amount
            BigDecimal amount = item.getLineTotal() != null ? item.getLineTotal() : 
                    (item.getTaxableAmount() != null ? item.getTaxableAmount().add(item.getTaxAmount() != null ? item.getTaxAmount() : BigDecimal.ZERO) : BigDecimal.ZERO);
            table.addCell(createItemCell(String.format("%,.2f", amount), tbAmtFont, Element.ALIGN_RIGHT, rowBg));

            idx++;
        }

        return table;
    }

    private PdfPCell createItemCell(String text, Font font, int alignment, java.awt.Color bg) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(bg);
        cell.setBorderColor(GRID_BORDER);
        cell.setBorderWidth(0.5f);
        cell.setPadding(4f);
        cell.setHorizontalAlignment(alignment);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        return cell;
    }

    private void addInvoiceTotalsBlock(Document document, com.acrovix.admin.entity.Invoice invoice, String curSym) throws DocumentException {
        PdfPTable totalsTable = new PdfPTable(2);
        totalsTable.setWidthPercentage(100);
        totalsTable.setWidths(new float[]{55f, 45f});
        totalsTable.setSpacingAfter(8f);

        // Left Cell: Amount in Words
        PdfPCell wordsCell = new PdfPCell();
        wordsCell.setBackgroundColor(ICE_BLUE_BG);
        wordsCell.setBorderColor(ICE_BLUE_BORDER);
        wordsCell.setBorderWidth(0.5f);
        wordsCell.setPadding(6f);
        wordsCell.setPaddingLeft(10f);
        wordsCell.setPaddingRight(10f);

        Paragraph wLabel = new Paragraph("Amount in Words:", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, TEXT_MUTED));
        wLabel.setSpacingAfter(2f);
        wordsCell.addElement(wLabel);

        String words = (invoice.getAmountInWords() != null && !invoice.getAmountInWords().isBlank()) 
                ? invoice.getAmountInWords() 
                : convertAmountToWords(invoice.getGrandTotal(), invoice.getCurrency() != null ? invoice.getCurrency().name() : "INR");
        Paragraph wText = new Paragraph(words, FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 8.0f, NAVY_PRIMARY));
        wText.setLeading(11f);
        wordsCell.addElement(wText);

        totalsTable.addCell(wordsCell);

        // Right Cell: Financial Breakdown (Taxable, CGST, SGST, Grand Total)
        PdfPTable finTable = new PdfPTable(2);
        finTable.setWidthPercentage(100);
        finTable.setWidths(new float[]{55f, 45f});

        Font fLabelFont = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, TEXT_MUTED);
        Font fValFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.8f, TEXT_DARK);

        BigDecimal taxable = invoice.getTaxableAmount() != null ? invoice.getTaxableAmount() : BigDecimal.ZERO;
        addFinRowClean(finTable, "Taxable Amount", String.format("%,.2f", taxable), fLabelFont, fValFont, false);

        boolean showIgst = invoice.getIgstAmount() != null && invoice.getIgstAmount().compareTo(BigDecimal.ZERO) > 0;
        if (showIgst) {
            addFinRowClean(finTable, "IGST (18%)", String.format("%,.2f", invoice.getIgstAmount()), fLabelFont, fValFont, false);
        } else {
            BigDecimal cgst = invoice.getCgstAmount() != null ? invoice.getCgstAmount() : BigDecimal.ZERO;
            BigDecimal sgst = invoice.getSgstAmount() != null ? invoice.getSgstAmount() : BigDecimal.ZERO;
            addFinRowClean(finTable, "CGST (9%)", String.format("%,.2f", cgst), fLabelFont, fValFont, false);
            addFinRowClean(finTable, "SGST (9%)", String.format("%,.2f", sgst), fLabelFont, fValFont, false);
        }

        // Grand Total Bar: Prominent solid blue bar
        Font gtLabelFont = getAppropriateFont(true, 9.0f, java.awt.Color.WHITE);
        Font gtValFont = getAppropriateFont(true, 10.0f, java.awt.Color.WHITE);

        BigDecimal grandTotal = invoice.getGrandTotal() != null ? invoice.getGrandTotal() : BigDecimal.ZERO;
        addGrandTotalRow(finTable, "Grand Total (" + curSym + ")", String.format("%,.2f", grandTotal), gtLabelFont, gtValFont);

        PdfPCell finWrapCell = new PdfPCell(finTable);
        finWrapCell.setBorder(Rectangle.NO_BORDER);
        finWrapCell.setPadding(0);
        finWrapCell.setPaddingLeft(6f);
        totalsTable.addCell(finWrapCell);

        document.add(totalsTable);
    }

    private void addFinRowClean(PdfPTable table, String label, String value, Font labelFont, Font valFont, boolean isBold) {
        PdfPCell c1 = new PdfPCell(new Phrase(label, labelFont));
        c1.setBorderColor(GRID_BORDER);
        c1.setBorderWidth(0.5f);
        c1.setPadding(3.5f);
        c1.setVerticalAlignment(Element.ALIGN_MIDDLE);

        PdfPCell c2 = new PdfPCell(new Phrase(value, valFont));
        c2.setBorderColor(GRID_BORDER);
        c2.setBorderWidth(0.5f);
        c2.setPadding(3.5f);
        c2.setHorizontalAlignment(Element.ALIGN_RIGHT);
        c2.setVerticalAlignment(Element.ALIGN_MIDDLE);

        table.addCell(c1);
        table.addCell(c2);
    }

    private void addGrandTotalRow(PdfPTable table, String label, String value, Font labelFont, Font valFont) {
        PdfPCell c1 = new PdfPCell(new Phrase(label, labelFont));
        c1.setBackgroundColor(BLUE_ACCENT);
        c1.setBorderColor(BLUE_ACCENT);
        c1.setPadding(5f);
        c1.setVerticalAlignment(Element.ALIGN_MIDDLE);

        PdfPCell c2 = new PdfPCell(new Phrase(value, valFont));
        c2.setBackgroundColor(BLUE_ACCENT);
        c2.setBorderColor(BLUE_ACCENT);
        c2.setPadding(5f);
        c2.setHorizontalAlignment(Element.ALIGN_RIGHT);
        c2.setVerticalAlignment(Element.ALIGN_MIDDLE);

        table.addCell(c1);
        table.addCell(c2);
    }

    private void addInvoiceTermsAndBankPanels(Document document, PdfWriter writer, com.acrovix.admin.entity.Invoice invoice, CompanySettingsResponse settings) throws DocumentException {
        PdfPTable panelsTable = new PdfPTable(3);
        panelsTable.setWidthPercentage(100);
        panelsTable.setWidths(new float[]{49f, 2f, 49f});
        panelsTable.setSpacingAfter(8f);

        Font cardHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, BLUE_ACCENT);
        Font labelFont = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, TEXT_MUTED);
        Font valFont = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, TEXT_DARK);
        Font valBoldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, TEXT_DARK);

        // 1. LEFT: Bank Details
        PdfPTable bankInner = new PdfPTable(2);
        bankInner.setWidthPercentage(100);
        bankInner.setWidths(new float[]{34f, 66f});

        Phrase bHeaderPhrase = new Phrase();
        Image bIcon = createVectorIcon(writer, "bank", 10f, 9f, BLUE_ACCENT);
        if (bIcon != null) {
            bHeaderPhrase.add(new Chunk(bIcon, 0, -1.5f));
            bHeaderPhrase.add(new Chunk("  "));
        }
        bHeaderPhrase.add(new Chunk("BANK DETAILS", cardHeaderFont));

        PdfPCell bHeaderCell = new PdfPCell(bHeaderPhrase);
        bHeaderCell.setColspan(2);
        bHeaderCell.setBorder(Rectangle.NO_BORDER);
        bHeaderCell.setPaddingBottom(4f);
        bankInner.addCell(bHeaderCell);

        Long tenantId = (invoice != null && invoice.getTenantId() != null) ? invoice.getTenantId() 
                : (settings != null && settings.getTenantId() != null ? settings.getTenantId() : Long.valueOf(1L));
        com.acrovix.admin.entity.CompanyBankAccount defaultBankAcc = null;
        if (companyBankAccountRepository != null && tenantId != null) {
            defaultBankAcc = companyBankAccountRepository.findFirstByTenantIdAndIsDefaultTrueAndIsActiveTrue(tenantId).orElse(null);
            if (defaultBankAcc == null) {
                defaultBankAcc = companyBankAccountRepository.findFirstByTenantIdAndIsActiveTrueOrderByIdAsc(tenantId).orElse(null);
            }
        }

        boolean isAcrovix = (settings == null || tenantId == null || tenantId.equals(1L) 
                || (settings.getCompanyName() != null && settings.getCompanyName().toUpperCase().contains("ACROVIX")));

        String bName = (defaultBankAcc != null && defaultBankAcc.getBankName() != null) ? defaultBankAcc.getBankName() 
                : ((settings != null && settings.getBankName() != null && !settings.getBankName().isBlank()) ? settings.getBankName() : (isAcrovix ? "HDFC Bank" : ""));
        String bHolder = (defaultBankAcc != null && defaultBankAcc.getAccountHolder() != null) ? defaultBankAcc.getAccountHolder() 
                : ((settings != null && settings.getLegalName() != null && !settings.getLegalName().isBlank()) ? settings.getLegalName() : 
                ((settings != null && settings.getCompanyName() != null) ? settings.getCompanyName() : (isAcrovix ? "ACROVIX INNOVATIONS PRIVATE LIMITED" : "")));
        String bAcc = (defaultBankAcc != null && defaultBankAcc.getBankAccountNumber() != null) ? defaultBankAcc.getBankAccountNumber() 
                : ((settings != null && settings.getBankAccountNumber() != null && !settings.getBankAccountNumber().isBlank()) ? settings.getBankAccountNumber() : (isAcrovix ? "50200001245678" : ""));
        String bIfsc = (defaultBankAcc != null && defaultBankAcc.getBankIfsc() != null) ? defaultBankAcc.getBankIfsc() 
                : ((settings != null && settings.getBankIfsc() != null && !settings.getBankIfsc().isBlank()) ? settings.getBankIfsc() : (isAcrovix ? "HDFC0001234" : ""));
        String bBranch = (defaultBankAcc != null && defaultBankAcc.getBankBranch() != null) ? defaultBankAcc.getBankBranch() 
                : ((settings != null && settings.getBankBranch() != null && !settings.getBankBranch().isBlank()) ? settings.getBankBranch() : (isAcrovix ? "Koramangala, Bengaluru" : ""));

        if (!bName.isBlank()) addPoMetaRow(bankInner, "Bank", bName, labelFont, valBoldFont);
        if (!bHolder.isBlank()) addPoMetaRow(bankInner, "Account Holder", bHolder, labelFont, valFont);
        if (!bAcc.isBlank()) addPoMetaRow(bankInner, "Account Number", bAcc, labelFont, valBoldFont);
        if (!bIfsc.isBlank()) addPoMetaRow(bankInner, (bIfsc.length() <= 11 && bIfsc.matches("^[A-Z0-9]+$") ? "IFSC / SWIFT" : "IFSC Code"), bIfsc, labelFont, valFont);
        if (!bBranch.isBlank()) addPoMetaRow(bankInner, "Branch", bBranch, labelFont, valFont);

        PdfPCell bankCard = new PdfPCell(bankInner);
        bankCard.setBackgroundColor(ICE_BLUE_BG);
        bankCard.setBorderColor(ICE_BLUE_BORDER);
        bankCard.setBorderWidth(0.5f);
        bankCard.setPadding(6f);
        bankCard.setPaddingBottom(7f);

        // Spacer
        PdfPCell spacer = new PdfPCell();
        spacer.setBorder(Rectangle.NO_BORDER);

        // 2. RIGHT: Terms & Conditions
        PdfPCell termsCard = new PdfPCell();
        termsCard.setBackgroundColor(ICE_BLUE_BG);
        termsCard.setBorderColor(ICE_BLUE_BORDER);
        termsCard.setBorderWidth(0.5f);
        termsCard.setPadding(6f);
        termsCard.setPaddingBottom(7f);

        Phrase tHeaderPhrase = new Phrase();
        Image tIcon = createVectorIcon(writer, "shield", 9f, 10f, BLUE_ACCENT);
        if (tIcon != null) {
            tHeaderPhrase.add(new Chunk(tIcon, 0, -1.5f));
            tHeaderPhrase.add(new Chunk("  "));
        }
        tHeaderPhrase.add(new Chunk("TERMS & CONDITIONS", cardHeaderFont));

        Paragraph pTermsHeader = new Paragraph(tHeaderPhrase);
        pTermsHeader.setSpacingAfter(4f);
        termsCard.addElement(pTermsHeader);

        String rawTerms = invoice.getTermsAndConditions();
        if (rawTerms == null || rawTerms.isBlank()) {
            if (settings != null && settings.getDefaultTermsAndConditions() != null && !settings.getDefaultTermsAndConditions().isBlank()) {
                rawTerms = settings.getDefaultTermsAndConditions();
            } else {
                rawTerms = "1. Invoice is valid for 30 days from the date of issue.\n" +
                        "2. Payment terms: 50% advance and 50% on completion.\n" +
                        "3. Delivery must be made as per the agreed timeline.\n" +
                        "4. Applicable taxes will be charged as per government regulations.\n" +
                        "5. For any disputes, subject to Bengaluru jurisdiction only.";
            }
        }

        Font tFont = FontFactory.getFont(FontFactory.HELVETICA, 7.0f, TEXT_DARK);
        String[] termLines = rawTerms.split("\n");
        int count = 1;
        for (String line : termLines) {
            String clean = line.trim();
            if (clean.isEmpty()) continue;
            if (clean.matches("^\\d+\\.\\s*.*")) {
                clean = clean.replaceFirst("^\\d+\\.\\s*", "");
            }
            Paragraph tPara = new Paragraph();
            tPara.setLeading(9f);
            tPara.add(new Chunk(count + ".  ", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.0f, BLUE_ACCENT)));
            tPara.add(new Chunk(clean, tFont));
            tPara.setSpacingAfter(1.5f);
            termsCard.addElement(tPara);
            count++;
            if (count > 6) break; // keep compact
        }

        panelsTable.addCell(bankCard);
        panelsTable.addCell(spacer);
        panelsTable.addCell(termsCard);

        document.add(panelsTable);
    }

    private void addInvoiceRemarksAndSignatures(Document document, PdfWriter writer, com.acrovix.admin.entity.Invoice invoice, CompanySettingsResponse settings) throws DocumentException {
        PdfPTable bottomTable = new PdfPTable(3);
        bottomTable.setWidthPercentage(100);
        bottomTable.setWidths(new float[]{55f, 2f, 43f});

        Font cardHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, BLUE_ACCENT);

        // 1. LEFT: Remarks
        PdfPCell remCard = new PdfPCell();
        remCard.setBackgroundColor(ICE_BLUE_BG);
        remCard.setBorderColor(ICE_BLUE_BORDER);
        remCard.setBorderWidth(0.5f);
        remCard.setPadding(6f);
        remCard.setPaddingBottom(8f);

        Phrase rHeaderPhrase = new Phrase();
        Image rIcon = createVectorIcon(writer, "chat", 10f, 9f, BLUE_ACCENT);
        if (rIcon != null) {
            rHeaderPhrase.add(new Chunk(rIcon, 0, -1.5f));
            rHeaderPhrase.add(new Chunk("  "));
        }
        rHeaderPhrase.add(new Chunk("REMARKS", cardHeaderFont));

        Paragraph pRemHeader = new Paragraph(rHeaderPhrase);
        pRemHeader.setSpacingAfter(4f);
        remCard.addElement(pRemHeader);

        Font remFont = FontFactory.getFont(FontFactory.HELVETICA, 7.2f, TEXT_DARK);
        String remText = invoice.getPaymentTerms();
        if (remText == null || remText.isBlank()) {
            remText = "• Payment to be made as per the payment terms mentioned.\n" +
                    "• For any queries, please contact our finance team.";
        }

        String[] remLines = remText.split("\n");
        for (String line : remLines) {
            String clean = line.trim();
            if (clean.isEmpty()) continue;
            if (!clean.startsWith("•") && !clean.startsWith("-")) clean = "•  " + clean;
            Paragraph rP = new Paragraph(clean, remFont);
            rP.setLeading(9.5f);
            rP.setSpacingAfter(2f);
            remCard.addElement(rP);
        }

        // Spacer
        PdfPCell spacer = new PdfPCell();
        spacer.setBorder(Rectangle.NO_BORDER);

        // 2. RIGHT: Authorized Signatory
        PdfPCell sigCard = new PdfPCell();
        sigCard.setBackgroundColor(ICE_BLUE_BG);
        sigCard.setBorderColor(ICE_BLUE_BORDER);
        sigCard.setBorderWidth(0.5f);
        sigCard.setPadding(6f);
        sigCard.setPaddingBottom(8f);

        String companyName = (settings != null && settings.getCompanyName() != null) ? settings.getCompanyName() : "ACROVIX INNOVATIONS PRIVATE LIMITED";
        Paragraph forP = new Paragraph("For " + companyName, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, NAVY_PRIMARY));
        forP.setAlignment(Element.ALIGN_RIGHT);
        forP.setSpacingAfter(4f);
        sigCard.addElement(forP);

        // Configured signature image if available
        Image sigImage = null;
        if (settings != null && settings.getSignatureUrl() != null && !settings.getSignatureUrl().isBlank()) {
            try {
                sigImage = Image.getInstance(new java.net.URL(settings.getSignatureUrl()));
                sigImage.scaleToFit(85f, 26f);
                sigImage.setAlignment(Element.ALIGN_RIGHT);
                sigCard.addElement(sigImage);
            } catch (Exception ignored) {}
        }
        if (sigImage == null) {
            Paragraph sigSpacer = new Paragraph(" ");
            sigSpacer.setSpacingBefore(18f);
            sigCard.addElement(sigSpacer);
        }

        Paragraph authLine = new Paragraph("Authorized Signatory", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, TEXT_DARK));
        authLine.setAlignment(Element.ALIGN_RIGHT);
        sigCard.addElement(authLine);

        bottomTable.addCell(remCard);
        bottomTable.addCell(spacer);
        bottomTable.addCell(sigCard);

        document.add(bottomTable);
        addDigitalDocumentDisclaimer(document);
    }



    // =========================================================================
    // EXACT PAYMENT RECEIPT PDF GENERATION (A4 Portrait, Reference Redesign)
    // =========================================================================

    static class PaymentReceiptPageEvent extends PdfPageEventHelper {
        private final CompanySettingsResponse settings;
        private com.lowagie.text.pdf.PdfTemplate totalPagesTemplate;
        private com.lowagie.text.pdf.BaseFont baseFont;

        public PaymentReceiptPageEvent(CompanySettingsResponse settings) {
            this.settings = settings;
        }

        @Override
        public void onOpenDocument(PdfWriter writer, Document document) {
            try {
                totalPagesTemplate = writer.getDirectContent().createTemplate(30f, 16f);
                baseFont = com.lowagie.text.pdf.BaseFont.createFont(
                        com.lowagie.text.pdf.BaseFont.HELVETICA,
                        com.lowagie.text.pdf.BaseFont.WINANSI,
                        com.lowagie.text.pdf.BaseFont.NOT_EMBEDDED);
            } catch (Exception e) {
                log.warn("Could not initialize footer template fonts for Payment Receipt", e);
            }
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            float pageWidth = document.getPageSize().getWidth();
            float pageHeight = document.getPageSize().getHeight();

            PdfContentByte cbUnder = writer.getDirectContentUnder();

            // 1. Top-Right subtle decorative facets (Page 1)
            if (writer.getPageNumber() == 1) {
                cbUnder.saveState();
                cbUnder.setColorFill(new java.awt.Color(20, 55, 120, 35));
                cbUnder.moveTo(pageWidth - 85f, pageHeight);
                cbUnder.lineTo(pageWidth, pageHeight);
                cbUnder.lineTo(pageWidth, pageHeight - 85f);
                cbUnder.closePath();
                cbUnder.fill();

                cbUnder.setColorFill(new java.awt.Color(56, 145, 235, 50));
                cbUnder.moveTo(pageWidth - 115f, pageHeight);
                cbUnder.lineTo(pageWidth - 70f, pageHeight);
                cbUnder.lineTo(pageWidth, pageHeight - 45f);
                cbUnder.lineTo(pageWidth, pageHeight - 85f);
                cbUnder.closePath();
                cbUnder.fill();
                cbUnder.restoreState();
            }

            // 2. Full-width dark navy bottom footer bar
            float footerBarH = 28f;
            cbUnder.saveState();
            cbUnder.setColorFill(NAVY_PRIMARY);
            cbUnder.rectangle(0, 0, pageWidth, footerBarH);
            cbUnder.fill();

            // Bottom-Left decorative geometric accents
            cbUnder.setColorFill(new java.awt.Color(37, 99, 235)); // #2563EB
            cbUnder.moveTo(0, 0);
            cbUnder.lineTo(36f, 0);
            cbUnder.lineTo(25f, footerBarH);
            cbUnder.lineTo(0, footerBarH);
            cbUnder.closePath();
            cbUnder.fill();

            cbUnder.setColorFill(new java.awt.Color(13, 148, 136)); // #0D9488 Teal
            cbUnder.moveTo(36f, 0);
            cbUnder.lineTo(44f, 0);
            cbUnder.lineTo(33f, footerBarH);
            cbUnder.lineTo(25f, footerBarH);
            cbUnder.closePath();
            cbUnder.fill();

            // Bottom-Right decorative geometric accent
            cbUnder.setColorFill(new java.awt.Color(37, 99, 235));
            cbUnder.moveTo(pageWidth - 36f, 0);
            cbUnder.lineTo(pageWidth, 0);
            cbUnder.lineTo(pageWidth, footerBarH);
            cbUnder.lineTo(pageWidth - 25f, footerBarH);
            cbUnder.closePath();
            cbUnder.fill();
            cbUnder.restoreState();

            // 3. Footer Content Table across bottom edge
            PdfContentByte fg = writer.getDirectContent();
            float footerY = 9.5f;
            Font footFont = FontFactory.getFont(FontFactory.HELVETICA, 6.8f, java.awt.Color.WHITE);
            Font footNoteFont = FontFactory.getFont(FontFactory.HELVETICA, 6.6f, new java.awt.Color(203, 213, 225));

            boolean isAcrovix = (settings == null || settings.getTenantId() == null || settings.getTenantId().equals(1L) 
                    || (settings.getCompanyName() != null && settings.getCompanyName().toUpperCase().contains("ACROVIX")));
            String phone = (settings != null && settings.getPhone() != null && !settings.getPhone().isBlank()) 
                    ? settings.getPhone() : (isAcrovix ? "+91 98765 43210" : "");
            String email = (settings != null && settings.getEmail() != null && !settings.getEmail().isBlank()) 
                    ? settings.getEmail() : (isAcrovix ? "contact@acrovix.com" : "");
            String website = (settings != null && settings.getWebsite() != null && !settings.getWebsite().isBlank()) 
                    ? settings.getWebsite() : (isAcrovix ? "www.acrovix.com" : "");

            PdfPTable footerTable = new PdfPTable(3);
            footerTable.setTotalWidth(pageWidth - 48f);
            try {
                footerTable.setWidths(new float[]{45f, 43f, 12f});
            } catch (Exception ignored) {}

            // Left: Contact channels with icons on single line
            Phrase contactPhrase = new Phrase();
            if (!phone.isBlank()) {
                Image phIcon = createVectorIcon(writer, "phone", 7.0f, 7.0f, java.awt.Color.WHITE);
                if (phIcon != null) { contactPhrase.add(new Chunk(phIcon, 0, -1f)); contactPhrase.add(new Chunk(" ")); }
                contactPhrase.add(new Chunk(phone + "   ", footFont));
            }

            if (!email.isBlank()) {
                Image emIcon = createVectorIcon(writer, "email", 8.0f, 6.0f, java.awt.Color.WHITE);
                if (emIcon != null) { contactPhrase.add(new Chunk(emIcon, 0, -1f)); contactPhrase.add(new Chunk(" ")); }
                contactPhrase.add(new Chunk(email + "   ", footFont));
            }

            if (!website.isBlank()) {
                Image wbIcon = createVectorIcon(writer, "globe", 7.0f, 7.0f, java.awt.Color.WHITE);
                if (wbIcon != null) { contactPhrase.add(new Chunk(wbIcon, 0, -1f)); contactPhrase.add(new Chunk(" ")); }
                contactPhrase.add(new Chunk(website, footFont));
            }

            PdfPCell cContact = new PdfPCell(contactPhrase);
            cContact.setBorder(Rectangle.NO_BORDER);
            cContact.setVerticalAlignment(Element.ALIGN_MIDDLE);
            cContact.setPadding(0);
            footerTable.addCell(cContact);

            // Center: Separator + Computer generated receipt disclaimer
            Phrase discPhrase = new Phrase();
            discPhrase.add(new Chunk("|   ", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, new java.awt.Color(59, 130, 246))));
            discPhrase.add(new Chunk(DIGITAL_DOCUMENT_DISCLAIMER, footNoteFont));
            PdfPCell cDisc = new PdfPCell(discPhrase);
            cDisc.setBorder(Rectangle.NO_BORDER);
            cDisc.setVerticalAlignment(Element.ALIGN_MIDDLE);
            cDisc.setPadding(0);
            footerTable.addCell(cDisc);

            // Right: Page Number
            PdfPCell cPage = new PdfPCell(new Phrase("Page " + writer.getPageNumber() + " of 1", footFont));
            cPage.setBorder(Rectangle.NO_BORDER);
            cPage.setHorizontalAlignment(Element.ALIGN_RIGHT);
            cPage.setVerticalAlignment(Element.ALIGN_MIDDLE);
            cPage.setPadding(0);
            footerTable.addCell(cPage);

            footerTable.writeSelectedRows(0, -1, 30f, footerY + 12f, fg);

        }

        @Override
        public void onCloseDocument(PdfWriter writer, Document document) {
            if (totalPagesTemplate != null && baseFont != null) {
                totalPagesTemplate.beginText();
                totalPagesTemplate.setFontAndSize(baseFont, 7.0f);
                totalPagesTemplate.setColorFill(java.awt.Color.WHITE);
                totalPagesTemplate.setTextMatrix(0, 1f);
                int total = Math.max(1, writer.getPageNumber() - 1);
                totalPagesTemplate.showText(String.valueOf(total));
                totalPagesTemplate.endText();
            }
        }
    }

    public byte[] generatePaymentReceiptPdf(com.acrovix.admin.entity.Payment payment) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 34f, 34f, 26f, 38f);
            PdfWriter writer = PdfWriter.getInstance(document, out);

            CompanySettingsResponse settings = resolveTenantSettings(payment != null ? payment.getTenantId() : null);

            writer.setPageEvent(new PaymentReceiptPageEvent(settings));
            document.open();

            // 1. Company Header
            addPaymentReceiptHeader(document, writer, settings);

            // 2. Title Banner
            addPaymentReceiptTitleBanner(document, writer, payment);

            // 3. Two Information Cards (RECEIVED FROM & PAYMENT DETAILS)
            addPaymentReceiptInfoCards(document, writer, payment);

            // 4. Amount Received Highlight
            addPaymentReceiptAmountHighlight(document, writer, payment, settings);

            // 5. Payment Breakdown Table
            addPaymentReceiptBreakdownTable(document, writer, payment, settings);

            // 6. Payment Notes and Authorized Signatory
            addPaymentReceiptNotesAndSignatory(document, writer, payment, settings);

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate Payment Receipt PDF", e);
            throw new RuntimeException("Failed to generate Payment Receipt PDF", e);
        }
    }

    private void addPaymentReceiptHeader(Document document, PdfWriter writer, CompanySettingsResponse settings) throws DocumentException {
        PdfPTable headerTable = new PdfPTable(2);
        headerTable.setWidthPercentage(100);
        headerTable.setWidths(new float[]{42f, 58f});
        headerTable.setSpacingAfter(7f);

        boolean isAcrovix = (settings == null || settings.getTenantId() == null || settings.getTenantId().equals(1L) 
                || (settings.getCompanyName() != null && settings.getCompanyName().toUpperCase().contains("ACROVIX")));

        // Left Cell: Tenant Logo or Text Brand Badge
        PdfPCell logoCell = new PdfPCell();
        logoCell.setBorder(Rectangle.NO_BORDER);
        logoCell.setVerticalAlignment(Element.ALIGN_TOP);
        logoCell.setPadding(0);

        Image logo = null;
        if (settings != null && settings.getLogoUrl() != null && !settings.getLogoUrl().trim().isEmpty()) {
            try {
                logo = Image.getInstance(new java.net.URL(settings.getLogoUrl()));
            } catch (Exception ex) {
                log.warn("Failed to load logo from URL for payment receipt: " + settings.getLogoUrl(), ex);
            }
        }
        if (logo == null && isAcrovix) {
            java.net.URL defaultLogoUrl = getClass().getResource("/static/Acrovix_logo.png");
            if (defaultLogoUrl != null) {
                try {
                    logo = Image.getInstance(defaultLogoUrl);
                } catch (Exception ignored) {}
            }
        }

        if (logo != null) {
            logo.scaleToFit(140f, 44f);
            logoCell.addElement(logo);
        } else {
            String brandOrCompany = (settings != null && settings.getBrandName() != null && !settings.getBrandName().isBlank())
                    ? settings.getBrandName().trim()
                    : ((settings != null && settings.getCompanyName() != null && !settings.getCompanyName().isBlank())
                            ? settings.getCompanyName().trim() : (isAcrovix ? "ACROVIX INNOVATIONS PRIVATE LIMITED" : "COMPANY"));
            Paragraph brandBadge = new Paragraph(brandOrCompany.toUpperCase(), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13f, NAVY_PRIMARY));
            logoCell.addElement(brandBadge);
            if (isAcrovix) {
                Paragraph taglinePara = new Paragraph();
                taglinePara.setSpacingBefore(3.5f);
                taglinePara.add(new Chunk("SYNC   |   SCALE   |   SUCCEED", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 6.8f, new java.awt.Color(13, 148, 136))));
                logoCell.addElement(taglinePara);
            }
        }

        headerTable.addCell(logoCell);

        // Right Cell: Company Information
        PdfPCell compCell = new PdfPCell();
        compCell.setBorder(Rectangle.NO_BORDER);
        compCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        compCell.setPadding(0);

        String companyName = (settings != null && settings.getCompanyName() != null && !settings.getCompanyName().isBlank()) 
                ? settings.getCompanyName() : (isAcrovix ? "ACROVIX INNOVATIONS PRIVATE LIMITED" : "");
        String compAddress = (settings != null && settings.getRegisteredAddress() != null && !settings.getRegisteredAddress().isBlank()) 
                ? settings.getRegisteredAddress() 
                : ((settings != null && settings.getBillingAddress() != null) ? settings.getBillingAddress() : (isAcrovix ? "3rd Floor, 956, Vigneshwara, 6th Cross 1st Main,\nBengaluru Urban, Karnataka - 560060, India" : ""));
        String compPhone = (settings != null && settings.getPhone() != null && !settings.getPhone().isBlank()) 
                ? settings.getPhone() : (isAcrovix ? "+91 98765 43210" : "");
        String compEmail = (settings != null && settings.getEmail() != null && !settings.getEmail().isBlank()) 
                ? settings.getEmail() : (isAcrovix ? "contact@acrovix.com" : "");
        String compWeb = (settings != null && settings.getWebsite() != null && !settings.getWebsite().isBlank()) 
                ? settings.getWebsite() : (isAcrovix ? "www.acrovix.com" : "");

        if (!companyName.isBlank()) {
            Paragraph pName = new Paragraph(companyName, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9.2f, NAVY_PRIMARY));
            pName.setAlignment(Element.ALIGN_RIGHT);
            compCell.addElement(pName);
        }

        // Info Block
        PdfPTable infoBlock = new PdfPTable(2);
        infoBlock.setHorizontalAlignment(Element.ALIGN_RIGHT);
        infoBlock.setWidthPercentage(95);
        try { infoBlock.setWidths(new float[]{8f, 92f}); } catch (Exception ignored) {}

        Font cFont = FontFactory.getFont(FontFactory.HELVETICA, 7.2f, TEXT_MUTED);

        if (!compAddress.isBlank()) {
            Image pinIcon = createVectorIcon(writer, "pin", 7.0f, 8.5f, new java.awt.Color(37, 99, 235));
            PdfPCell cPin = new PdfPCell();
            cPin.setBorder(Rectangle.NO_BORDER);
            cPin.setPadding(0);
            cPin.setPaddingTop(1f);
            if (pinIcon != null) cPin.addElement(pinIcon);
            infoBlock.addCell(cPin);

            PdfPCell cAddr = new PdfPCell(new Phrase(compAddress, cFont));
            cAddr.setBorder(Rectangle.NO_BORDER);
            cAddr.setPadding(0);
            cAddr.setPaddingBottom(1.5f);
            infoBlock.addCell(cAddr);
        }

        if (!compPhone.isBlank()) {
            Image phIc = createVectorIcon(writer, "phone", 7.0f, 7.0f, new java.awt.Color(37, 99, 235));
            PdfPCell cPhIc = new PdfPCell();
            cPhIc.setBorder(Rectangle.NO_BORDER);
            cPhIc.setPadding(0);
            cPhIc.setPaddingTop(1f);
            if (phIc != null) cPhIc.addElement(phIc);
            infoBlock.addCell(cPhIc);

            PdfPCell cPhVal = new PdfPCell(new Phrase(compPhone, cFont));
            cPhVal.setBorder(Rectangle.NO_BORDER);
            cPhVal.setPadding(0);
            cPhVal.setPaddingBottom(1.0f);
            infoBlock.addCell(cPhVal);
        }

        if (!compEmail.isBlank()) {
            Image emIc = createVectorIcon(writer, "email", 7.5f, 6.0f, new java.awt.Color(37, 99, 235));
            PdfPCell cEmIc = new PdfPCell();
            cEmIc.setBorder(Rectangle.NO_BORDER);
            cEmIc.setPadding(0);
            cEmIc.setPaddingTop(1f);
            if (emIc != null) cEmIc.addElement(emIc);
            infoBlock.addCell(cEmIc);

            PdfPCell cEmVal = new PdfPCell(new Phrase(compEmail, cFont));
            cEmVal.setBorder(Rectangle.NO_BORDER);
            cEmVal.setPadding(0);
            cEmVal.setPaddingBottom(1.0f);
            infoBlock.addCell(cEmVal);
        }

        if (!compWeb.isBlank()) {
            Image wbIc = createVectorIcon(writer, "globe", 7.0f, 7.0f, new java.awt.Color(37, 99, 235));
            PdfPCell cWbIc = new PdfPCell();
            cWbIc.setBorder(Rectangle.NO_BORDER);
            cWbIc.setPadding(0);
            cWbIc.setPaddingTop(1f);
            if (wbIc != null) cWbIc.addElement(wbIc);
            infoBlock.addCell(cWbIc);

            PdfPCell cWbVal = new PdfPCell(new Phrase(compWeb, cFont));
            cWbVal.setBorder(Rectangle.NO_BORDER);
            cWbVal.setPadding(0);
            infoBlock.addCell(cWbVal);
        }

        // Dynamic GSTIN / VAT / PAN
        String gstin = (settings != null && settings.getGstin() != null && !settings.getGstin().isBlank()) ? settings.getGstin().trim() : null;
        String vatNumber = (settings != null && settings.getVatNumber() != null && !settings.getVatNumber().isBlank()) ? settings.getVatNumber().trim() : null;
        String pan = (settings != null && settings.getPan() != null && !settings.getPan().isBlank()) ? settings.getPan().trim() : null;

        if (gstin != null) {
            PdfPCell cLbl = new PdfPCell(new Phrase("GST:", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 6.8f, BLUE_ACCENT)));
            cLbl.setBorder(Rectangle.NO_BORDER);
            cLbl.setPadding(0);
            cLbl.setPaddingTop(1f);
            infoBlock.addCell(cLbl);

            PdfPCell cVal = new PdfPCell(new Phrase(gstin, cFont));
            cVal.setBorder(Rectangle.NO_BORDER);
            cVal.setPadding(0);
            cVal.setPaddingBottom(1.0f);
            infoBlock.addCell(cVal);
        }

        if (vatNumber != null) {
            PdfPCell cLbl = new PdfPCell(new Phrase("VAT:", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 6.8f, BLUE_ACCENT)));
            cLbl.setBorder(Rectangle.NO_BORDER);
            cLbl.setPadding(0);
            cLbl.setPaddingTop(1f);
            infoBlock.addCell(cLbl);

            PdfPCell cVal = new PdfPCell(new Phrase(vatNumber, cFont));
            cVal.setBorder(Rectangle.NO_BORDER);
            cVal.setPadding(0);
            cVal.setPaddingBottom(1.0f);
            infoBlock.addCell(cVal);
        }

        if (pan != null) {
            PdfPCell cLbl = new PdfPCell(new Phrase("PAN:", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 6.8f, BLUE_ACCENT)));
            cLbl.setBorder(Rectangle.NO_BORDER);
            cLbl.setPadding(0);
            cLbl.setPaddingTop(1f);
            infoBlock.addCell(cLbl);

            PdfPCell cVal = new PdfPCell(new Phrase(pan, cFont));
            cVal.setBorder(Rectangle.NO_BORDER);
            cVal.setPadding(0);
            cVal.setPaddingBottom(1.0f);
            infoBlock.addCell(cVal);
        }

        compCell.addElement(infoBlock);
        headerTable.addCell(compCell);
        document.add(headerTable);
    }


    private void addPaymentReceiptTitleBanner(Document document, PdfWriter writer, com.acrovix.admin.entity.Payment payment) throws DocumentException {
        PdfPTable banner = new PdfPTable(3);
        banner.setWidthPercentage(100);
        banner.setWidths(new float[]{38f, 24f, 38f});
        banner.setSpacingAfter(7f);

        PdfPCell mainCell = new PdfPCell();
        mainCell.setBackgroundColor(ICE_BLUE_BG);
        mainCell.setBorderColor(ICE_BLUE_BORDER);
        mainCell.setBorderWidth(0.5f);
        mainCell.setPadding(7f);
        mainCell.setPaddingTop(6f);
        mainCell.setPaddingBottom(6f);

        // 1. Left: PAYMENT RECEIPT & Subtitle
        Paragraph titlePara = new Paragraph();
        titlePara.add(new Chunk("PAYMENT ", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 17f, NAVY_PRIMARY)));
        titlePara.add(new Chunk("RECEIPT", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 17f, new java.awt.Color(37, 99, 235))));
        mainCell.addElement(titlePara);

        Paragraph subPara = new Paragraph("Thank you for your payment.", FontFactory.getFont(FontFactory.HELVETICA, 7.8f, TEXT_MUTED));
        subPara.setSpacingBefore(2f);
        mainCell.addElement(subPara);
        banner.addCell(mainCell);

        // 2. Middle: Status Badge
        PdfPCell badgeCell = new PdfPCell();
        badgeCell.setBackgroundColor(ICE_BLUE_BG);
        badgeCell.setBorderColor(ICE_BLUE_BORDER);
        badgeCell.setBorderWidth(0.5f);
        badgeCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        badgeCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        badgeCell.setPadding(6f);

        boolean isRecorded = payment.getStatus() == null || payment.getStatus() == com.acrovix.admin.entity.PaymentStatus.RECORDED;
        boolean isCancelled = payment.getStatus() == com.acrovix.admin.entity.PaymentStatus.CANCELLED;

        java.awt.Color badgeBg = isRecorded ? new java.awt.Color(236, 253, 245) : (isCancelled ? new java.awt.Color(254, 242, 242) : ICE_BLUE_BG);
        java.awt.Color badgeBorder = isRecorded ? new java.awt.Color(167, 243, 208) : (isCancelled ? new java.awt.Color(254, 202, 202) : ICE_BLUE_BORDER);
        java.awt.Color badgeText = isRecorded ? new java.awt.Color(5, 150, 105) : (isCancelled ? new java.awt.Color(220, 38, 38) : new java.awt.Color(37, 99, 235));
        String badgeLabel = isRecorded ? "RECEIVED" : (payment.getStatus() != null ? payment.getStatus().name() : "RECORDED");

        PdfPTable badgeWrap = new PdfPTable(1);
        badgeWrap.setTotalWidth(100f);
        badgeWrap.setLockedWidth(true);
        badgeWrap.setHorizontalAlignment(Element.ALIGN_CENTER);

        Phrase bPhrase = new Phrase();
        if (isRecorded) {
            Image checkIc = createVectorIcon(writer, "check", 8.5f, 8.5f, badgeText);
            if (checkIc != null) { bPhrase.add(new Chunk(checkIc, 0, -1f)); bPhrase.add(new Chunk("  ")); }
        }
        bPhrase.add(new Chunk(badgeLabel, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.0f, badgeText)));

        PdfPCell innerBadge = new PdfPCell(bPhrase);
        innerBadge.setBackgroundColor(badgeBg);
        innerBadge.setBorderColor(badgeBorder);
        innerBadge.setBorderWidth(0.8f);
        innerBadge.setHorizontalAlignment(Element.ALIGN_CENTER);
        innerBadge.setVerticalAlignment(Element.ALIGN_MIDDLE);
        innerBadge.setPaddingTop(4.5f);
        innerBadge.setPaddingBottom(4.5f);
        innerBadge.setPaddingLeft(8f);
        innerBadge.setPaddingRight(8f);
        badgeWrap.addCell(innerBadge);

        badgeCell.addElement(badgeWrap);
        banner.addCell(badgeCell);

        // 3. Right: Receipt No. & Payment Date
        PdfPCell metaCell = new PdfPCell();
        metaCell.setBackgroundColor(ICE_BLUE_BG);
        metaCell.setBorderColor(ICE_BLUE_BORDER);
        metaCell.setBorderWidth(0.5f);
        metaCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        metaCell.setPadding(6f);

        PdfPTable metaGrid = new PdfPTable(3);
        metaGrid.setWidthPercentage(100);
        metaGrid.setWidths(new float[]{48f, 4f, 48f});

        // Receipt No
        PdfPCell cRec = new PdfPCell();
        cRec.setBorder(Rectangle.NO_BORDER);
        cRec.setPadding(0);
        Phrase pRecLabel = new Phrase();
        Image recIc = createVectorIcon(writer, "receipt", 8.0f, 8.0f, new java.awt.Color(37, 99, 235));
        if (recIc != null) { pRecLabel.add(new Chunk(recIc, 0, -1f)); pRecLabel.add(new Chunk(" ")); }
        pRecLabel.add(new Chunk("Receipt No.", FontFactory.getFont(FontFactory.HELVETICA, 6.8f, TEXT_MUTED)));
        cRec.addElement(new Paragraph(pRecLabel));
        String recNo = payment.getPaymentNumber() != null ? payment.getPaymentNumber() : "-";
        Paragraph pRecVal = new Paragraph(recNo, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.0f, NAVY_PRIMARY));
        pRecVal.setSpacingBefore(1f);
        cRec.addElement(pRecVal);
        metaGrid.addCell(cRec);

        // Divider
        PdfPCell cDiv = new PdfPCell(new Phrase("|", FontFactory.getFont(FontFactory.HELVETICA, 10f, new java.awt.Color(203, 213, 225))));
        cDiv.setBorder(Rectangle.NO_BORDER);
        cDiv.setHorizontalAlignment(Element.ALIGN_CENTER);
        cDiv.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cDiv.setPadding(0);
        metaGrid.addCell(cDiv);

        // Payment Date
        PdfPCell cDate = new PdfPCell();
        cDate.setBorder(Rectangle.NO_BORDER);
        cDate.setPadding(0);
        Phrase pDateLabel = new Phrase();
        Image calIc = createVectorIcon(writer, "calendar", 8.0f, 8.0f, new java.awt.Color(37, 99, 235));
        if (calIc != null) { pDateLabel.add(new Chunk(calIc, 0, -1f)); pDateLabel.add(new Chunk(" ")); }
        pDateLabel.add(new Chunk("Payment Date", FontFactory.getFont(FontFactory.HELVETICA, 6.8f, TEXT_MUTED)));
        cDate.addElement(new Paragraph(pDateLabel));
        String dateStr = payment.getPaymentDate() != null ? payment.getPaymentDate().format(DateTimeFormatter.ofPattern("dd MMM yyyy")) : "-";
        Paragraph pDateVal = new Paragraph(dateStr, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.0f, NAVY_PRIMARY));
        pDateVal.setSpacingBefore(1f);
        cDate.addElement(pDateVal);
        metaGrid.addCell(cDate);

        metaCell.addElement(metaGrid);
        banner.addCell(metaCell);

        document.add(banner);
    }

    private void addPaymentReceiptInfoCards(Document document, PdfWriter writer, com.acrovix.admin.entity.Payment payment) throws DocumentException {
        PdfPTable cardsTable = new PdfPTable(3);
        cardsTable.setWidthPercentage(100);
        cardsTable.setWidths(new float[]{49f, 2f, 49f});
        cardsTable.setSpacingAfter(7f);

        // 1. LEFT CARD: RECEIVED FROM
        PdfPCell leftCard = new PdfPCell();
        leftCard.setBackgroundColor(ICE_BLUE_BG);
        leftCard.setBorderColor(ICE_BLUE_BORDER);
        leftCard.setBorderWidth(0.5f);
        leftCard.setPadding(7f);

        // Card Header
        Phrase lHead = new Phrase();
        Image userIc = createVectorIcon(writer, "user", 8.5f, 8.5f, new java.awt.Color(37, 99, 235));
        if (userIc != null) { lHead.add(new Chunk(userIc, 0, -1f)); lHead.add(new Chunk("  ")); }
        lHead.add(new Chunk("RECEIVED FROM", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.2f, NAVY_PRIMARY)));
        Paragraph pLHead = new Paragraph(lHead);
        pLHead.setSpacingAfter(5f);
        leftCard.addElement(pLHead);

        // Customer details resolution
        String clientName = payment.getInvoice() != null && payment.getInvoice().getClientName() != null && !payment.getInvoice().getClientName().isBlank()
                ? payment.getInvoice().getClientName()
                : (payment.getCustomer() != null && payment.getCustomer().getName() != null ? payment.getCustomer().getName() : "Customer");

        String clientCompany = payment.getInvoice() != null && payment.getInvoice().getClientCompany() != null && !payment.getInvoice().getClientCompany().isBlank()
                ? payment.getInvoice().getClientCompany()
                : (payment.getCustomer() != null && payment.getCustomer().getCompanyName() != null ? payment.getCustomer().getCompanyName() : "");

        String clientEmail = payment.getInvoice() != null && payment.getInvoice().getClientEmail() != null && !payment.getInvoice().getClientEmail().isBlank()
                ? payment.getInvoice().getClientEmail()
                : (payment.getCustomer() != null && payment.getCustomer().getEmail() != null ? payment.getCustomer().getEmail() : "");

        String clientPhone = payment.getInvoice() != null && payment.getInvoice().getClientPhone() != null && !payment.getInvoice().getClientPhone().isBlank()
                ? payment.getInvoice().getClientPhone()
                : (payment.getCustomer() != null && payment.getCustomer().getPhone() != null ? payment.getCustomer().getPhone() : "");

        String clientAddress = payment.getInvoice() != null && payment.getInvoice().getClientAddress() != null && !payment.getInvoice().getClientAddress().isBlank()
                ? payment.getInvoice().getClientAddress()
                : (payment.getCustomer() != null && payment.getCustomer().getBillingAddress() != null && !payment.getCustomer().getBillingAddress().isBlank()
                        ? payment.getCustomer().getBillingAddress() : "Address not provided");

        String clientGstin = payment.getInvoice() != null && payment.getInvoice().getClientGstin() != null && !payment.getInvoice().getClientGstin().isBlank()
                ? payment.getInvoice().getClientGstin()
                : (payment.getCustomer() != null && payment.getCustomer().getGstin() != null && !payment.getCustomer().getGstin().isBlank()
                        ? payment.getCustomer().getGstin() : "N/A");

        PdfPTable leftInner = new PdfPTable(2);
        leftInner.setWidthPercentage(100);
        leftInner.setWidths(new float[]{55f, 45f});

        // Left Sub-Col
        PdfPCell lSub1 = new PdfPCell();
        lSub1.setBorder(Rectangle.NO_BORDER);
        lSub1.setPadding(0);

        lSub1.addElement(new Paragraph(clientName, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9.5f, NAVY_PRIMARY)));
        if (!clientCompany.isBlank()) {
            lSub1.addElement(new Paragraph(clientCompany, FontFactory.getFont(FontFactory.HELVETICA, 7.8f, TEXT_MUTED)));
        }

        if (!clientEmail.isBlank()) {
            Paragraph pEm = new Paragraph();
            pEm.setSpacingBefore(3f);
            Image emI = createVectorIcon(writer, "email", 7.5f, 6.0f, new java.awt.Color(37, 99, 235));
            if (emI != null) { pEm.add(new Chunk(emI, 0, -1f)); pEm.add(new Chunk(" ")); }
            pEm.add(new Chunk(clientEmail, FontFactory.getFont(FontFactory.HELVETICA, 7.2f, TEXT_DARK)));
            lSub1.addElement(pEm);
        }

        if (!clientPhone.isBlank()) {
            Paragraph pPh = new Paragraph();
            pPh.setSpacingBefore(2f);
            Image phI = createVectorIcon(writer, "phone", 7.5f, 7.5f, new java.awt.Color(37, 99, 235));
            if (phI != null) { pPh.add(new Chunk(phI, 0, -1f)); pPh.add(new Chunk(" ")); }
            pPh.add(new Chunk(clientPhone, FontFactory.getFont(FontFactory.HELVETICA, 7.2f, TEXT_DARK)));
            lSub1.addElement(pPh);
        }

        leftInner.addCell(lSub1);

        // Right Sub-Col (Address & GSTIN)
        PdfPCell lSub2 = new PdfPCell();
        lSub2.setBorder(Rectangle.NO_BORDER);
        lSub2.setPadding(0);

        Phrase pAddrH = new Phrase();
        Image pinI = createVectorIcon(writer, "pin", 7.0f, 8.0f, new java.awt.Color(37, 99, 235));
        if (pinI != null) { pAddrH.add(new Chunk(pinI, 0, -1f)); pAddrH.add(new Chunk(" ")); }
        pAddrH.add(new Chunk("Address", FontFactory.getFont(FontFactory.HELVETICA, 7.0f, TEXT_MUTED)));
        lSub2.addElement(new Paragraph(pAddrH));

        Paragraph pAddrV = new Paragraph(clientAddress, FontFactory.getFont(FontFactory.HELVETICA, 7.2f, TEXT_DARK));
        pAddrV.setLeading(8.5f);
        pAddrV.setSpacingAfter(4f);
        lSub2.addElement(pAddrV);

        lSub2.addElement(new Paragraph("GSTIN", FontFactory.getFont(FontFactory.HELVETICA, 7.0f, TEXT_MUTED)));
        lSub2.addElement(new Paragraph(clientGstin, FontFactory.getFont(FontFactory.HELVETICA, 7.2f, TEXT_DARK)));

        leftInner.addCell(lSub2);
        leftCard.addElement(leftInner);

        // Spacer
        PdfPCell spacer = new PdfPCell();
        spacer.setBorder(Rectangle.NO_BORDER);

        // 2. RIGHT CARD: PAYMENT DETAILS
        PdfPCell rightCard = new PdfPCell();
        rightCard.setBackgroundColor(ICE_BLUE_BG);
        rightCard.setBorderColor(ICE_BLUE_BORDER);
        rightCard.setBorderWidth(0.5f);
        rightCard.setPadding(7f);

        Phrase rHead = new Phrase();
        Image docIc = createVectorIcon(writer, "document", 8.5f, 8.5f, new java.awt.Color(37, 99, 235));
        if (docIc != null) { rHead.add(new Chunk(docIc, 0, -1f)); rHead.add(new Chunk("  ")); }
        rHead.add(new Chunk("PAYMENT DETAILS", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.2f, NAVY_PRIMARY)));
        Paragraph pRHead = new Paragraph(rHead);
        pRHead.setSpacingAfter(5f);
        rightCard.addElement(pRHead);

        PdfPTable rightGrid = new PdfPTable(2);
        rightGrid.setWidthPercentage(100);
        rightGrid.setWidths(new float[]{42f, 58f});

        Font rLabelFont = FontFactory.getFont(FontFactory.HELVETICA, 7.2f, TEXT_MUTED);
        Font rValFont = FontFactory.getFont(FontFactory.HELVETICA, 7.2f, TEXT_DARK);

        // Method
        String methodStr = "Other";
        if (payment.getPaymentMethod() != null) {
            switch (payment.getPaymentMethod()) {
                case BANK_TRANSFER: methodStr = "Bank Transfer (NEFT/RTGS/IMPS)"; break;
                case UPI: methodStr = "UPI"; break;
                case CHEQUE: methodStr = "Cheque"; break;
                case CASH: methodStr = "Cash"; break;
                case CARD: methodStr = "Credit / Debit Card"; break;
                default: methodStr = payment.getPaymentMethod().name();
            }
        }
        addReceiptDetailRow(rightGrid, "Payment Method", methodStr, rLabelFont, rValFont);

        // Transaction Ref / UTR
        String txRef = payment.getTransactionReference() != null && !payment.getTransactionReference().isBlank()
                ? payment.getTransactionReference() : "-";
        addReceiptDetailRow(rightGrid, "Transaction Ref.", txRef, rLabelFont, rValFont);

        // Cheque Number
        String chqNo = payment.getChequeNumber() != null && !payment.getChequeNumber().isBlank()
                ? payment.getChequeNumber() : "-";
        addReceiptDetailRow(rightGrid, "Cheque Number", chqNo, rLabelFont, rValFont);

        // Status
        PdfPCell cStLabel = new PdfPCell(new Phrase("Status", rLabelFont));
        cStLabel.setBorder(Rectangle.NO_BORDER);
        cStLabel.setPaddingTop(1.5f);
        cStLabel.setPaddingBottom(1.5f);
        rightGrid.addCell(cStLabel);

        PdfPCell cStVal = new PdfPCell();
        cStVal.setBorder(Rectangle.NO_BORDER);
        cStVal.setPaddingTop(1.5f);
        cStVal.setPaddingBottom(1.5f);

        PdfPTable miniBadge = new PdfPTable(1);
        miniBadge.setTotalWidth(65f);
        miniBadge.setLockedWidth(true);
        miniBadge.setHorizontalAlignment(Element.ALIGN_LEFT);

        String stText = payment.getStatus() != null ? payment.getStatus().name() : "RECORDED";
        boolean isStRecorded = "RECORDED".equalsIgnoreCase(stText);
        PdfPCell innerStBadge = new PdfPCell(new Phrase(stText, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 6.8f, isStRecorded ? new java.awt.Color(5, 150, 105) : new java.awt.Color(220, 38, 38))));
        innerStBadge.setBackgroundColor(isStRecorded ? new java.awt.Color(236, 253, 245) : new java.awt.Color(254, 242, 242));
        innerStBadge.setBorderColor(isStRecorded ? new java.awt.Color(167, 243, 208) : new java.awt.Color(254, 202, 202));
        innerStBadge.setBorderWidth(0.5f);
        innerStBadge.setHorizontalAlignment(Element.ALIGN_CENTER);
        innerStBadge.setPaddingTop(1.5f);
        innerStBadge.setPaddingBottom(1.5f);
        miniBadge.addCell(innerStBadge);

        Phrase stPhrase = new Phrase(":   ");
        stPhrase.setFont(rValFont);
        PdfPCell cWrap = new PdfPCell();
        cWrap.setBorder(Rectangle.NO_BORDER);
        cWrap.setPadding(0);
        PdfPTable cWrapTable = new PdfPTable(2);
        try {
            cWrapTable.setWidths(new float[]{8f, 92f});
            cWrapTable.setWidthPercentage(100);
            PdfPCell cColon = new PdfPCell(new Phrase(":", rValFont));
            cColon.setBorder(Rectangle.NO_BORDER);
            cColon.setPadding(0);
            cWrapTable.addCell(cColon);
            PdfPCell cB = new PdfPCell(miniBadge);
            cB.setBorder(Rectangle.NO_BORDER);
            cB.setPadding(0);
            cWrapTable.addCell(cB);
            cStVal.addElement(cWrapTable);
        } catch (Exception e) {
            cStVal.addElement(miniBadge);
        }

        rightGrid.addCell(cStVal);

        // Recorded By
        String recBy = "Admin";
        if (payment.getRecordedBy() != null) {
            recBy = (payment.getRecordedBy().getName() != null && !payment.getRecordedBy().getName().isBlank())
                    ? payment.getRecordedBy().getName() : payment.getRecordedBy().getUsername();
        }
        addReceiptDetailRow(rightGrid, "Recorded By", recBy, rLabelFont, rValFont);

        rightCard.addElement(rightGrid);

        cardsTable.addCell(leftCard);
        cardsTable.addCell(spacer);
        cardsTable.addCell(rightCard);

        document.add(cardsTable);
    }

    private void addReceiptDetailRow(PdfPTable table, String label, String value, Font labelFont, Font valFont) {
        PdfPCell c1 = new PdfPCell(new Phrase(label, labelFont));
        c1.setBorder(Rectangle.NO_BORDER);
        c1.setPaddingTop(1.5f);
        c1.setPaddingBottom(1.5f);

        PdfPCell c2 = new PdfPCell(new Phrase(":   " + value, valFont));
        c2.setBorder(Rectangle.NO_BORDER);
        c2.setPaddingTop(1.5f);
        c2.setPaddingBottom(1.5f);

        table.addCell(c1);
        table.addCell(c2);
    }

    private void addPaymentReceiptAmountHighlight(Document document, PdfWriter writer, com.acrovix.admin.entity.Payment payment, CompanySettingsResponse settings) throws DocumentException {
        PdfPTable amountCard = new PdfPTable(2);
        amountCard.setWidthPercentage(100);
        amountCard.setWidths(new float[]{11f, 89f});
        amountCard.setSpacingAfter(7f);

        String curCode = payment.getCurrency() != null ? payment.getCurrency().name() : (settings != null && settings.getCurrencyCode() != null ? settings.getCurrencyCode() : "INR");
        String curSym = resolveCurrencySymbol(curCode, settings);

        // Circular Currency Icon Cell
        PdfPCell iconCell = new PdfPCell();
        iconCell.setBackgroundColor(ICE_BLUE_BG);
        iconCell.setBorderColor(ICE_BLUE_BORDER);
        iconCell.setBorderWidth(0.5f);
        iconCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        iconCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        iconCell.setPadding(8f);

        Image currBadge = createCurrencyCircleBadge(writer, 34f, curSym.trim());
        if (currBadge != null) {
            currBadge.setAlignment(Element.ALIGN_CENTER);
            iconCell.addElement(currBadge);
        }
        amountCard.addCell(iconCell);

        // Amount & Words Content Cell
        PdfPCell contentCell = new PdfPCell();
        contentCell.setBackgroundColor(ICE_BLUE_BG);
        contentCell.setBorderColor(ICE_BLUE_BORDER);
        contentCell.setBorderWidth(0.5f);
        contentCell.setBorderWidthLeft(0.8f);
        contentCell.setBorderColorLeft(new java.awt.Color(208, 226, 255));
        contentCell.setPadding(7f);
        contentCell.setPaddingLeft(12f);

        // AMOUNT RECEIVED Label
        Paragraph pLabel = new Paragraph("AMOUNT RECEIVED", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.2f, TEXT_MUTED));
        pLabel.setSpacingAfter(1.5f);
        contentCell.addElement(pLabel);

        // Large Formatted Amount
        BigDecimal amt = payment.getAmount() != null ? payment.getAmount() : BigDecimal.ZERO;
        String formattedAmt = curSym + formatAmount(amt, curCode);

        Font amtFont = getAppropriateFont(true, 19.5f, new java.awt.Color(29, 78, 216));
        Paragraph pAmt = new Paragraph(formattedAmt, amtFont);
        pAmt.setSpacingAfter(2.5f);
        contentCell.addElement(pAmt);

        // Amount in words
        Paragraph pWords = new Paragraph();
        pWords.add(new Chunk("Amount in words: \n", FontFactory.getFont(FontFactory.HELVETICA, 6.8f, TEXT_MUTED)));
        String wordsText = convertAmountToWords(amt, curCode);
        pWords.add(new Chunk(wordsText, FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 7.5f, NAVY_PRIMARY)));
        contentCell.addElement(pWords);

        amountCard.addCell(contentCell);
        document.add(amountCard);
    }

    private void addPaymentReceiptBreakdownTable(Document document, PdfWriter writer, com.acrovix.admin.entity.Payment payment, CompanySettingsResponse settings) throws DocumentException {
        // Section Header
        Phrase bHead = new Phrase();
        Image chartIc = createVectorIcon(writer, "chart", 8.5f, 8.5f, new java.awt.Color(37, 99, 235));
        if (chartIc != null) { bHead.add(new Chunk(chartIc, 0, -1f)); bHead.add(new Chunk("  ")); }
        bHead.add(new Chunk("PAYMENT BREAKDOWN", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.2f, NAVY_PRIMARY)));
        Paragraph pBHead = new Paragraph(bHead);
        pBHead.setSpacingAfter(4f);
        document.add(pBHead);

        // Data calculation
        com.acrovix.admin.entity.Invoice invoice = payment.getInvoice();
        String curCode = payment.getCurrency() != null ? payment.getCurrency().name() : (settings != null && settings.getCurrencyCode() != null ? settings.getCurrencyCode() : "INR");
        String curSym = resolveCurrencySymbol(curCode, settings);
        BigDecimal thisPayment = payment.getAmount() != null ? payment.getAmount() : BigDecimal.ZERO;

        BigDecimal invoiceTotal = BigDecimal.ZERO;
        String invoiceNumber = "-";
        BigDecimal previousPayments = BigDecimal.ZERO;
        BigDecimal balanceDue = BigDecimal.ZERO;

        if (invoice != null) {
            invoiceTotal = invoice.getGrandTotal() != null ? invoice.getGrandTotal() : BigDecimal.ZERO;
            invoiceNumber = invoice.getInvoiceNumber() != null ? invoice.getInvoiceNumber() : "-";

            // Query previous payments if repository is present
            if (paymentRepository != null && invoice.getId() != null) {
                try {
                    java.util.List<com.acrovix.admin.entity.Payment> allInvPayments = paymentRepository.findByInvoiceIdOrderByCreatedAtDesc(invoice.getId());
                    if (allInvPayments != null) {
                        for (com.acrovix.admin.entity.Payment p : allInvPayments) {
                            if (p.getStatus() == com.acrovix.admin.entity.PaymentStatus.RECORDED) {
                                // Skip current payment
                                if (payment.getId() != null && payment.getId().equals(p.getId())) {
                                    continue;
                                }
                                // Check if created prior to this payment
                                boolean isPrior = false;
                                if (payment.getId() != null && p.getId() != null && p.getId() < payment.getId()) {
                                    isPrior = true;
                                } else if (payment.getCreatedAt() != null && p.getCreatedAt() != null && p.getCreatedAt().isBefore(payment.getCreatedAt())) {
                                    isPrior = true;
                                } else if (payment.getId() == null) {
                                    isPrior = true;
                                }
                                if (isPrior && p.getAmount() != null) {
                                    previousPayments = previousPayments.add(p.getAmount());
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    log.warn("Could not calculate previous payments from repository", e);
                }
            }

            balanceDue = invoiceTotal.subtract(previousPayments).subtract(thisPayment);
        } else {
            // Standalone payment without invoice
            invoiceTotal = thisPayment;
            invoiceNumber = "DIRECT / ADVANCE";
            balanceDue = BigDecimal.ZERO;
        }

        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{78f, 22f});
        table.setSpacingAfter(7f);

        Font thFont = getAppropriateFont(true, 7.5f, new java.awt.Color(71, 85, 105));
        PdfPCell h1 = new PdfPCell(new Phrase("Particulars", thFont));
        h1.setBackgroundColor(new java.awt.Color(248, 250, 252));
        h1.setBorderColor(new java.awt.Color(226, 232, 240));
        h1.setPadding(4.5f);
        table.addCell(h1);

        String curHeader = "Amount (" + curSym.trim() + ")";
        PdfPCell h2 = new PdfPCell(new Phrase(curHeader, thFont));
        h2.setBackgroundColor(new java.awt.Color(248, 250, 252));
        h2.setBorderColor(new java.awt.Color(226, 232, 240));
        h2.setHorizontalAlignment(Element.ALIGN_RIGHT);
        h2.setPadding(4.5f);
        table.addCell(h2);

        // Row 1: Invoice Total
        addBreakdownRow(table, "Invoice Total (" + invoiceNumber + ")", formatAmount(invoiceTotal, curCode), true, false);

        // Row 2: Previous Payments
        addBreakdownRow(table, "Previous Payments", formatAmount(previousPayments, curCode), false, false);

        // Row 3: This Payment
        addBreakdownRow(table, "This Payment", formatAmount(thisPayment, curCode), true, false);

        // Row 4: Balance Due (Highlighted green row)
        Font balLabelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.0f, new java.awt.Color(5, 150, 105));
        PdfPCell cBalLabel = new PdfPCell(new Phrase("Balance Due", balLabelFont));
        cBalLabel.setBackgroundColor(new java.awt.Color(236, 253, 245));
        cBalLabel.setBorderColor(new java.awt.Color(167, 243, 208));
        cBalLabel.setPadding(5.0f);
        table.addCell(cBalLabel);

        PdfPCell cBalVal = new PdfPCell(new Phrase(formatAmount(balanceDue, curCode), balLabelFont));
        cBalVal.setBackgroundColor(new java.awt.Color(236, 253, 245));
        cBalVal.setBorderColor(new java.awt.Color(167, 243, 208));
        cBalVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
        cBalVal.setPadding(5.0f);
        table.addCell(cBalVal);

        document.add(table);
    }

    private void addBreakdownRow(PdfPTable table, String label, String value, boolean isBold, boolean isSuccess) {
        Font fLabel = isBold ? FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, TEXT_DARK) : FontFactory.getFont(FontFactory.HELVETICA, 7.5f, TEXT_DARK);
        Font fVal = isBold ? FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, TEXT_DARK) : FontFactory.getFont(FontFactory.HELVETICA, 7.5f, TEXT_DARK);

        PdfPCell c1 = new PdfPCell(new Phrase(label, fLabel));
        c1.setBorderColor(new java.awt.Color(226, 232, 240));
        c1.setPadding(4.5f);
        table.addCell(c1);

        PdfPCell c2 = new PdfPCell(new Phrase(value, fVal));
        c2.setBorderColor(new java.awt.Color(226, 232, 240));
        c2.setHorizontalAlignment(Element.ALIGN_RIGHT);
        c2.setPadding(4.5f);
        table.addCell(c2);
    }

    private void addPaymentReceiptNotesAndSignatory(Document document, PdfWriter writer, com.acrovix.admin.entity.Payment payment, CompanySettingsResponse settings) throws DocumentException {
        PdfPTable bottomTable = new PdfPTable(3);
        bottomTable.setWidthPercentage(100);
        bottomTable.setWidths(new float[]{49f, 2f, 49f});

        // 1. LEFT CARD: PAYMENT NOTES
        PdfPCell notesCard = new PdfPCell();
        notesCard.setBackgroundColor(java.awt.Color.WHITE);
        notesCard.setBorderColor(ICE_BLUE_BORDER);
        notesCard.setBorderWidth(0.5f);
        notesCard.setPadding(7f);

        Phrase nHead = new Phrase();
        Image noteIc = createVectorIcon(writer, "note", 8.5f, 8.5f, new java.awt.Color(37, 99, 235));
        if (noteIc != null) { nHead.add(new Chunk(noteIc, 0, -1f)); nHead.add(new Chunk("  ")); }
        nHead.add(new Chunk("PAYMENT NOTES", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.2f, NAVY_PRIMARY)));
        Paragraph pNHead = new Paragraph(nHead);
        pNHead.setSpacingAfter(6f);
        notesCard.addElement(pNHead);

        String noteText = payment.getNotes() != null && !payment.getNotes().isBlank() 
                ? payment.getNotes().trim() : "Payment received via NEFT. Thank you for your business.";
        Paragraph pNoteBody = new Paragraph(noteText, FontFactory.getFont(FontFactory.HELVETICA, 7.2f, TEXT_DARK));
        pNoteBody.setLeading(9.5f);
        notesCard.addElement(pNoteBody);

        bottomTable.addCell(notesCard);

        // Spacer
        PdfPCell spacer = new PdfPCell();
        spacer.setBorder(Rectangle.NO_BORDER);
        bottomTable.addCell(spacer);

        // 2. RIGHT CARD: AUTHORIZED SIGNATORY
        PdfPCell sigCard = new PdfPCell();
        sigCard.setBackgroundColor(java.awt.Color.WHITE);
        sigCard.setBorderColor(ICE_BLUE_BORDER);
        sigCard.setBorderWidth(0.5f);
        sigCard.setPadding(7f);

        String companyName = (settings != null && settings.getCompanyName() != null && !settings.getCompanyName().isBlank()) 
                ? settings.getCompanyName() : "ACROVIX INNOVATIONS PRIVATE LIMITED";

        Paragraph pFor = new Paragraph("For " + companyName, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, NAVY_PRIMARY));
        pFor.setSpacingAfter(3f);
        sigCard.addElement(pFor);

        PdfPTable sigContentTable = new PdfPTable(2);
        sigContentTable.setWidthPercentage(100);
        sigContentTable.setWidths(new float[]{56f, 44f});

        // Left of Sig Card: Signature + Name & Designation
        PdfPCell leftSig = new PdfPCell();
        leftSig.setBorder(Rectangle.NO_BORDER);
        leftSig.setPadding(0);

        boolean sigImageLoaded = false;
        if (settings != null && settings.getSignatureUrl() != null && !settings.getSignatureUrl().isBlank()) {
            try {
                Image sigImg = Image.getInstance(new java.net.URL(settings.getSignatureUrl()));
                sigImg.scaleToFit(95f, 26f);
                sigImg.setAlignment(Element.ALIGN_LEFT);
                leftSig.addElement(sigImg);
                sigImageLoaded = true;
            } catch (Exception ignored) {}
        }
        if (!sigImageLoaded) {
            Paragraph sigSpacer = new Paragraph(" ");
            sigSpacer.setSpacingBefore(18f);
            leftSig.addElement(sigSpacer);
        }

        Paragraph pDesig = new Paragraph("Authorized Signatory", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, NAVY_PRIMARY));
        leftSig.addElement(pDesig);

        sigContentTable.addCell(leftSig);

        // Right of Sig Card: Official Stamp
        PdfPCell rightStamp = new PdfPCell();
        rightStamp.setBorder(Rectangle.NO_BORDER);
        rightStamp.setHorizontalAlignment(Element.ALIGN_RIGHT);
        rightStamp.setVerticalAlignment(Element.ALIGN_MIDDLE);
        rightStamp.setPadding(0);
        rightStamp.setPaddingRight(2f);

        String stampCity = (settings != null && settings.getRegisteredAddress() != null && settings.getRegisteredAddress().contains("Bengaluru"))
                ? "BENGALURU" : "OFFICIAL";
        Image stampImage = createOfficialStamp(writer, 38f, companyName, stampCity);
        if (stampImage != null) {
            stampImage.setAlignment(Element.ALIGN_RIGHT);
            rightStamp.addElement(stampImage);
        }
        sigContentTable.addCell(rightStamp);

        sigCard.addElement(sigContentTable);
        bottomTable.addCell(sigCard);

        document.add(bottomTable);
    }

    private static Image createCurrencyCircleBadge(PdfWriter writer, float size, String symbol) {
        try {
            com.lowagie.text.pdf.PdfTemplate t = writer.getDirectContent().createTemplate(size, size);
            java.awt.Color bgBlue = new java.awt.Color(37, 99, 235); // #2563EB
            t.setColorFill(bgBlue);
            float cx = size / 2f;
            float cy = size / 2f;
            t.circle(cx, cy, (size - 1.5f) / 2f);
            t.fill();

            com.lowagie.text.pdf.BaseFont bf = getUnicodeBaseFont();
            if (bf == null) {
                bf = com.lowagie.text.pdf.BaseFont.createFont(
                        com.lowagie.text.pdf.BaseFont.HELVETICA_BOLD,
                        com.lowagie.text.pdf.BaseFont.WINANSI,
                        com.lowagie.text.pdf.BaseFont.NOT_EMBEDDED);
            }
            t.beginText();
            String sym = (symbol != null && !symbol.isBlank()) ? symbol.trim() : "₹";
            float fSize = sym.length() > 2 ? size * 0.35f : (sym.length() > 1 ? size * 0.42f : size * 0.52f);
            t.setFontAndSize(bf, fSize);
            t.setColorFill(java.awt.Color.WHITE);
            float w = bf.getWidthPoint(sym, fSize);
            t.setTextMatrix(cx - w / 2f, cy - fSize * 0.35f);
            t.showText(sym);
            t.endText();

            return Image.getInstance(t);
        } catch (Exception e) {
            return null;
        }
    }

    private static Image createOfficialStamp(PdfWriter writer, float size, String companyName, String city) {
        try {
            com.lowagie.text.pdf.PdfTemplate t = writer.getDirectContent().createTemplate(size, size);
            java.awt.Color stampNavy = new java.awt.Color(20, 55, 120);
            t.setColorStroke(stampNavy);
            t.setColorFill(stampNavy);

            float cx = size / 2f;
            float cy = size / 2f;
            float rOuter = (size - 2f) / 2f;
            float rInner = rOuter - 2.8f;
            float rCenter = rInner - 4.5f;

            // Outer circle
            t.setLineWidth(1.1f);
            t.circle(cx, cy, rOuter);
            t.stroke();

            // Inner circle
            t.setLineWidth(0.6f);
            t.circle(cx, cy, rInner);
            t.stroke();

            // Innermost circle
            t.setLineWidth(0.5f);
            t.circle(cx, cy, rCenter);
            t.stroke();

            com.lowagie.text.pdf.BaseFont bf = com.lowagie.text.pdf.BaseFont.createFont(
                    com.lowagie.text.pdf.BaseFont.HELVETICA_BOLD,
                    com.lowagie.text.pdf.BaseFont.WINANSI,
                    com.lowagie.text.pdf.BaseFont.NOT_EMBEDDED);

            // Center box
            t.setLineWidth(0.5f);
            t.rectangle(cx - 13f, cy - 3.8f, 26f, 7.6f);
            t.stroke();

            // City in box
            t.beginText();
            t.setFontAndSize(bf, 3.8f);
            String displayCity = (city != null && !city.isBlank()) ? city.toUpperCase() : "OFFICIAL";
            float wCity = bf.getWidthPoint(displayCity, 3.8f);
            t.setTextMatrix(cx - wCity / 2f, cy - 1.2f);
            t.showText(displayCity);

            // Bottom star
            t.setFontAndSize(bf, 4.5f);
            float wStar = bf.getWidthPoint("*", 4.5f);
            t.setTextMatrix(cx - wStar / 2f, cy - 8.5f);
            t.showText("*");
            t.endText();

            // Circular ring text
            String text = (companyName != null && !companyName.isBlank()) ? companyName.trim().toUpperCase() : "OFFICIAL SEAL";
            if (text.length() > 38) {
                text = text.substring(0, 38).trim();
            }
            float ringR = (rOuter + rInner) / 2f;
            float charAngle = Math.min(8.5f, 240f / Math.max(text.length(), 1));
            float startAngle = 90f + (text.length() * charAngle) / 2f;

            t.beginText();
            t.setFontAndSize(bf, 2.7f);
            for (int i = 0; i < text.length(); i++) {
                char ch = text.charAt(i);
                float angleDeg = startAngle - (i * charAngle);
                float angleRad = (float) Math.toRadians(angleDeg);
                float x = cx + ringR * (float) Math.cos(angleRad);
                float y = cy + ringR * (float) Math.sin(angleRad);

                float rot = angleDeg - 90f;
                float cosR = (float) Math.cos(Math.toRadians(rot));
                float sinR = (float) Math.sin(Math.toRadians(rot));

                t.setTextMatrix(cosR, sinR, -sinR, cosR, x - 1.0f, y - 1.0f);
                t.showText(String.valueOf(ch));
            }
            t.endText();

            return Image.getInstance(t);
        } catch (Exception e) {
            return null;
        }
    }

    // =========================================================================
    // PAYMENT SETTLEMENT CERTIFICATE & STATEMENT PDF GENERATION
    // =========================================================================

    static class SettlementStatementPageEvent extends PdfPageEventHelper {
        private final CompanySettingsResponse settings;
        private com.lowagie.text.pdf.PdfTemplate totalPagesTemplate;
        private com.lowagie.text.pdf.BaseFont baseFont;

        public SettlementStatementPageEvent(CompanySettingsResponse settings) {
            this.settings = settings;
        }

        @Override
        public void onOpenDocument(PdfWriter writer, Document document) {
            try {
                totalPagesTemplate = writer.getDirectContent().createTemplate(30f, 16f);
                baseFont = com.lowagie.text.pdf.BaseFont.createFont(
                        com.lowagie.text.pdf.BaseFont.HELVETICA,
                        com.lowagie.text.pdf.BaseFont.WINANSI,
                        com.lowagie.text.pdf.BaseFont.NOT_EMBEDDED);
            } catch (Exception e) {
                log.warn("Could not initialize footer template fonts for Settlement Statement", e);
            }
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            float pageWidth = document.getPageSize().getWidth();
            float pageHeight = document.getPageSize().getHeight();

            PdfContentByte cbUnder = writer.getDirectContentUnder();
            try {
                cbUnder.saveState();
                com.lowagie.text.pdf.BaseFont bf = getUnicodeBaseFont();
                if (bf == null) {
                    bf = com.lowagie.text.pdf.BaseFont.createFont(
                            com.lowagie.text.pdf.BaseFont.HELVETICA_BOLD,
                            com.lowagie.text.pdf.BaseFont.WINANSI,
                            com.lowagie.text.pdf.BaseFont.NOT_EMBEDDED);
                }
                cbUnder.beginText();
                cbUnder.setFontAndSize(bf, 36f);
                cbUnder.setColorFill(new java.awt.Color(236, 253, 245)); // Soft subtle emerald
                cbUnder.showTextAligned(Element.ALIGN_CENTER, "PAID IN FULL - NO DUES", pageWidth / 2f, pageHeight / 2f, 42f);
                cbUnder.endText();
                cbUnder.restoreState();
            } catch (Exception ignored) {}

            float footerBarH = 26f;
            cbUnder.saveState();
            cbUnder.setColorFill(new java.awt.Color(6, 78, 59)); // Deep Emerald #064E3B
            cbUnder.rectangle(0, 0, pageWidth, footerBarH);
            cbUnder.fill();

            cbUnder.setColorFill(new java.awt.Color(16, 185, 129)); // Vibrant Emerald #10B981
            cbUnder.moveTo(0, 0);
            cbUnder.lineTo(34f, 0);
            cbUnder.lineTo(24f, footerBarH);
            cbUnder.lineTo(0, footerBarH);
            cbUnder.closePath();
            cbUnder.fill();
            cbUnder.restoreState();

            PdfContentByte fg = writer.getDirectContent();
            float footerY = 8.5f;
            Font footFont = FontFactory.getFont(FontFactory.HELVETICA, 6.8f, java.awt.Color.WHITE);
            Font footNoteFont = FontFactory.getFont(FontFactory.HELVETICA, 6.5f, new java.awt.Color(209, 250, 229));

            PdfPTable footerTable = new PdfPTable(2);
            footerTable.setTotalWidth(pageWidth - 48f);
            try {
                footerTable.setWidths(new float[]{78f, 22f});
            } catch (Exception ignored) {}

            PdfPCell cDisc = new PdfPCell(new Phrase("Official Payment Settlement Certificate & Clearance Statement • Acrovix ERP & Compliance Engine", footNoteFont));
            cDisc.setBorder(Rectangle.NO_BORDER);
            cDisc.setVerticalAlignment(Element.ALIGN_MIDDLE);
            cDisc.setPadding(0);
            footerTable.addCell(cDisc);

            PdfPCell cPage = new PdfPCell(new Phrase("Page " + writer.getPageNumber() + " of 1", footFont));
            cPage.setBorder(Rectangle.NO_BORDER);
            cPage.setHorizontalAlignment(Element.ALIGN_RIGHT);
            cPage.setVerticalAlignment(Element.ALIGN_MIDDLE);
            cPage.setPadding(0);
            footerTable.addCell(cPage);

            footerTable.writeSelectedRows(0, -1, 24f, footerY + 9f, fg);
        }

        @Override
        public void onCloseDocument(PdfWriter writer, Document document) {
            if (totalPagesTemplate != null && baseFont != null) {
                totalPagesTemplate.beginText();
                totalPagesTemplate.setFontAndSize(baseFont, 6.8f);
                totalPagesTemplate.setColorFill(java.awt.Color.WHITE);
                totalPagesTemplate.setTextMatrix(0, 1f);
                int total = Math.max(1, writer.getPageNumber() - 1);
                totalPagesTemplate.showText(String.valueOf(total));
                totalPagesTemplate.endText();
            }
        }
    }

    public byte[] generatePaymentSettlementStatementPdf(com.acrovix.admin.entity.Invoice invoice, java.util.List<com.acrovix.admin.entity.Payment> payments, com.acrovix.admin.entity.AdminUser admin) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 30f, 30f, 24f, 34f);
            PdfWriter writer = PdfWriter.getInstance(document, out);

            CompanySettingsResponse settings = resolveTenantSettings(invoice != null ? invoice.getTenantId() : null);

            writer.setPageEvent(new SettlementStatementPageEvent(settings));
            document.open();

            // 1. Company Header
            addPaymentReceiptHeader(document, writer, settings);

            // 2. Title Banner
            addSettlementTitleBanner(document, writer, invoice);

            // 3. Client & Invoice Info Cards
            addSettlementInfoCards(document, writer, invoice, payments);

            // 4. Financial Summary Cards (Total Value, Total Paid, Balance Due = 0)
            addSettlementSummaryCards(document, writer, invoice, settings, payments);

            // 5. Complete Transaction Ledger Table
            addSettlementLedgerTable(document, writer, invoice, settings, payments);

            // 6. Signatory and Green Settlement Stamp
            addSettlementSignatoryAndStamp(document, writer, invoice, settings, admin);

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate Payment Settlement Statement PDF", e);
            throw new RuntimeException("Failed to generate Payment Settlement Statement PDF", e);
        }
    }

    private void addSettlementTitleBanner(Document document, PdfWriter writer, com.acrovix.admin.entity.Invoice invoice) throws DocumentException {
        PdfPTable banner = new PdfPTable(2);
        banner.setWidthPercentage(100);
        banner.setWidths(new float[]{65f, 35f});
        banner.setSpacingAfter(7f);

        PdfPCell leftCell = new PdfPCell();
        leftCell.setBackgroundColor(new java.awt.Color(236, 253, 245)); // Emerald 50
        leftCell.setBorderColor(new java.awt.Color(167, 243, 208)); // Emerald 200
        leftCell.setBorderWidth(0.6f);
        leftCell.setPadding(7f);
        leftCell.setPaddingLeft(10f);

        Paragraph titlePara = new Paragraph();
        titlePara.add(new Chunk("PAYMENT RECEIPT & ", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13.5f, new java.awt.Color(6, 78, 59))));
        titlePara.add(new Chunk("CLEARANCE STATEMENT", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13.5f, new java.awt.Color(5, 150, 105))));
        leftCell.addElement(titlePara);

        Paragraph subPara = new Paragraph("OFFICIAL SETTLEMENT CERTIFICATE • ZERO DUES OUTSTANDING", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.0f, new java.awt.Color(4, 120, 87)));
        subPara.setSpacingBefore(2f);
        leftCell.addElement(subPara);

        PdfPCell rightCell = new PdfPCell();
        rightCell.setBackgroundColor(new java.awt.Color(236, 253, 245));
        rightCell.setBorderColor(new java.awt.Color(167, 243, 208));
        rightCell.setBorderWidth(0.6f);
        rightCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        rightCell.setPadding(7f);
        rightCell.setPaddingRight(10f);

        Paragraph badgeP = new Paragraph("ACCOUNT FULLY SETTLED", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, new java.awt.Color(5, 150, 105)));
        badgeP.setAlignment(Element.ALIGN_RIGHT);
        rightCell.addElement(badgeP);

        String invNo = invoice != null && invoice.getInvoiceNumber() != null ? invoice.getInvoiceNumber() : "INV";
        Paragraph invP = new Paragraph("Invoice #" + invNo, FontFactory.getFont(FontFactory.HELVETICA, 7.5f, TEXT_MUTED));
        invP.setAlignment(Element.ALIGN_RIGHT);
        invP.setSpacingBefore(2f);
        rightCell.addElement(invP);

        banner.addCell(leftCell);
        banner.addCell(rightCell);
        document.add(banner);
    }

    private void addSettlementInfoCards(Document document, PdfWriter writer, com.acrovix.admin.entity.Invoice invoice, java.util.List<com.acrovix.admin.entity.Payment> payments) throws DocumentException {
        PdfPTable cardsTable = new PdfPTable(3);
        cardsTable.setWidthPercentage(100);
        cardsTable.setWidths(new float[]{49f, 2f, 49f});
        cardsTable.setSpacingAfter(7f);

        Font cardHeadFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.2f, NAVY_PRIMARY);
        Font labelFont = FontFactory.getFont(FontFactory.HELVETICA, 7.2f, TEXT_MUTED);
        Font valFont = FontFactory.getFont(FontFactory.HELVETICA, 7.2f, TEXT_DARK);
        Font valBoldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.2f, TEXT_DARK);

        // LEFT CARD: ISSUED TO / CLIENT DETAILS
        PdfPCell leftCard = new PdfPCell();
        leftCard.setBackgroundColor(ICE_BLUE_BG);
        leftCard.setBorderColor(ICE_BLUE_BORDER);
        leftCard.setBorderWidth(0.5f);
        leftCard.setPadding(7f);

        Paragraph pLHead = new Paragraph("ISSUED TO / CLIENT DETAILS", cardHeadFont);
        pLHead.setSpacingAfter(4f);
        leftCard.addElement(pLHead);

        PdfPTable leftGrid = new PdfPTable(2);
        leftGrid.setWidthPercentage(100);
        try { leftGrid.setWidths(new float[]{34f, 66f}); } catch (Exception ignored) {}

        String clientName = (invoice.getCustomer() != null && invoice.getCustomer().getName() != null && !invoice.getCustomer().getName().isBlank())
                ? invoice.getCustomer().getName()
                : (invoice.getClientName() != null ? invoice.getClientName() : "Customer");
        String clientAddress = invoice.getClientAddress() != null && !invoice.getClientAddress().isBlank()
                ? invoice.getClientAddress() : "-";
        String clientGstin = invoice.getClientGstin() != null && !invoice.getClientGstin().isBlank()
                ? invoice.getClientGstin() : "-";
        String clientEmail = (invoice.getCustomer() != null && invoice.getCustomer().getEmail() != null)
                ? invoice.getCustomer().getEmail() : (invoice.getClientEmail() != null ? invoice.getClientEmail() : "-");

        addReceiptDetailRow(leftGrid, "Client Name", clientName, labelFont, valBoldFont);
        addReceiptDetailRow(leftGrid, "Client GSTIN", clientGstin, labelFont, valFont);
        addReceiptDetailRow(leftGrid, "Client Email", clientEmail, labelFont, valFont);
        addReceiptDetailRow(leftGrid, "Billing Address", clientAddress.replace("\n", ", "), labelFont, valFont);

        leftCard.addElement(leftGrid);

        // Spacer
        PdfPCell spacer = new PdfPCell();
        spacer.setBorder(Rectangle.NO_BORDER);

        // RIGHT CARD: INVOICE & SETTLEMENT REFERENCE
        PdfPCell rightCard = new PdfPCell();
        rightCard.setBackgroundColor(ICE_BLUE_BG);
        rightCard.setBorderColor(ICE_BLUE_BORDER);
        rightCard.setBorderWidth(0.5f);
        rightCard.setPadding(7f);

        Paragraph pRHead = new Paragraph("INVOICE & CLEARANCE REFERENCE", cardHeadFont);
        pRHead.setSpacingAfter(4f);
        rightCard.addElement(pRHead);

        PdfPTable rightGrid = new PdfPTable(2);
        rightGrid.setWidthPercentage(100);
        try { rightGrid.setWidths(new float[]{38f, 62f}); } catch (Exception ignored) {}

        String invNo = invoice.getInvoiceNumber() != null ? invoice.getInvoiceNumber() : "-";
        String invDate = invoice.getInvoiceDate() != null ? invoice.getInvoiceDate().format(DateTimeFormatter.ofPattern("dd MMM yyyy")) : "-";
        
        LocalDate settlementDate = LocalDate.now();
        if (payments != null && !payments.isEmpty()) {
            for (com.acrovix.admin.entity.Payment p : payments) {
                if (p.getPaymentDate() != null) {
                    settlementDate = p.getPaymentDate();
                    break;
                }
            }
        }
        String settlementDateStr = settlementDate.format(DateTimeFormatter.ofPattern("dd MMM yyyy"));

        addReceiptDetailRow(rightGrid, "Invoice Number", invNo, labelFont, valBoldFont);
        addReceiptDetailRow(rightGrid, "Invoice Date", invDate, labelFont, valFont);
        addReceiptDetailRow(rightGrid, "Settlement Date", settlementDateStr, labelFont, valFont);
        addReceiptDetailRow(rightGrid, "Settlement Status", "PAID IN FULL (CLEARED)", labelFont, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.2f, new java.awt.Color(5, 150, 105)));

        rightCard.addElement(rightGrid);

        cardsTable.addCell(leftCard);
        cardsTable.addCell(spacer);
        cardsTable.addCell(rightCard);

        document.add(cardsTable);
    }

    private void addSettlementSummaryCards(Document document, PdfWriter writer, com.acrovix.admin.entity.Invoice invoice, CompanySettingsResponse settings, java.util.List<com.acrovix.admin.entity.Payment> payments) throws DocumentException {
        PdfPTable sumTable = new PdfPTable(5);
        sumTable.setWidthPercentage(100);
        try { sumTable.setWidths(new float[]{32f, 2f, 32f, 2f, 32f}); } catch (Exception ignored) {}
        sumTable.setSpacingAfter(7f);

        String curCode = invoice.getCurrency() != null ? invoice.getCurrency().name() : "INR";
        String curSym = resolveCurrencySymbol(curCode, settings);

        BigDecimal invoiceTotal = invoice.getGrandTotal() != null ? invoice.getGrandTotal() : BigDecimal.ZERO;
        BigDecimal totalPaid = BigDecimal.ZERO;
        if (payments != null) {
            for (com.acrovix.admin.entity.Payment p : payments) {
                if (p.getStatus() == com.acrovix.admin.entity.PaymentStatus.RECORDED && p.getAmount() != null) {
                    totalPaid = totalPaid.add(p.getAmount());
                }
            }
        }
        if (totalPaid.compareTo(BigDecimal.ZERO) == 0 && invoice.getAmountPaid() != null) {
            totalPaid = invoice.getAmountPaid();
        }

        // Card 1: Total Invoice Value
        PdfPCell c1 = createMetricCard("TOTAL INVOICE VALUE", curSym + formatAmount(invoiceTotal, curCode), NAVY_PRIMARY, new java.awt.Color(241, 245, 249), new java.awt.Color(203, 213, 225));
        // Spacer
        PdfPCell sp1 = new PdfPCell(); sp1.setBorder(Rectangle.NO_BORDER);
        // Card 2: Total Amount Settled
        PdfPCell c2 = createMetricCard("TOTAL AMOUNT SETTLED", curSym + formatAmount(totalPaid, curCode), new java.awt.Color(5, 150, 105), new java.awt.Color(236, 253, 245), new java.awt.Color(167, 243, 208));
        // Spacer
        PdfPCell sp2 = new PdfPCell(); sp2.setBorder(Rectangle.NO_BORDER);
        // Card 3: Balance Outstanding
        PdfPCell c3 = createMetricCard("BALANCE OUTSTANDING", curSym + "0.00 (NIL DUES)", new java.awt.Color(16, 185, 129), new java.awt.Color(236, 253, 245), new java.awt.Color(167, 243, 208));

        sumTable.addCell(c1);
        sumTable.addCell(sp1);
        sumTable.addCell(c2);
        sumTable.addCell(sp2);
        sumTable.addCell(c3);

        document.add(sumTable);
    }

    private PdfPCell createMetricCard(String label, String value, java.awt.Color textColor, java.awt.Color bgColor, java.awt.Color borderColor) {
        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(bgColor);
        cell.setBorderColor(borderColor);
        cell.setBorderWidth(0.6f);
        cell.setPadding(6f);
        cell.setPaddingTop(5f);
        cell.setPaddingBottom(5f);

        Paragraph pL = new Paragraph(label, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 6.8f, TEXT_MUTED));
        pL.setSpacingAfter(2f);
        cell.addElement(pL);

        Font vFont = getAppropriateFont(true, 11f, textColor);
        Paragraph pV = new Paragraph(value, vFont);
        cell.addElement(pV);

        return cell;
    }

    private void addSettlementLedgerTable(Document document, PdfWriter writer, com.acrovix.admin.entity.Invoice invoice, CompanySettingsResponse settings, java.util.List<com.acrovix.admin.entity.Payment> payments) throws DocumentException {
        Paragraph headP = new Paragraph("PAYMENT TRANSACTIONS & RECONCILIATION LEDGER", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.2f, NAVY_PRIMARY));
        headP.setSpacingAfter(4f);
        document.add(headP);

        PdfPTable table = new PdfPTable(7);
        table.setWidthPercentage(100);
        try {
            table.setWidths(new float[]{5f, 21f, 13f, 17f, 19f, 13f, 12f});
        } catch (Exception ignored) {}
        table.setSpacingAfter(7f);

        String curCode = invoice.getCurrency() != null ? invoice.getCurrency().name() : "INR";
        String curSym = resolveCurrencySymbol(curCode, settings);

        Font hFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 6.8f, java.awt.Color.WHITE);
        String[] headers = new String[]{"#", "Payment Ref", "Date", "Payment Method", "UTR / Cheque No", "Bank Deposited", "Amount"};
        for (int i = 0; i < headers.length; i++) {
            PdfPCell hc = new PdfPCell(new Phrase(headers[i], hFont));
            hc.setBackgroundColor(new java.awt.Color(15, 23, 42)); // Slate 900
            hc.setBorderColor(new java.awt.Color(51, 65, 85));
            hc.setPaddingTop(4.5f);
            hc.setPaddingBottom(4.5f);
            hc.setPaddingLeft(3f);
            hc.setPaddingRight(3f);
            hc.setHorizontalAlignment(i == 6 ? Element.ALIGN_RIGHT : (i == 0 ? Element.ALIGN_CENTER : Element.ALIGN_LEFT));
            hc.setVerticalAlignment(Element.ALIGN_MIDDLE);
            table.addCell(hc);
        }

        Font rowFont = FontFactory.getFont(FontFactory.HELVETICA, 7.0f, TEXT_DARK);
        Font rowMonoBold = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.0f, NAVY_PRIMARY);
        Font rowAmtFont = getAppropriateFont(true, 7.2f, new java.awt.Color(5, 150, 105));

        int seq = 1;
        BigDecimal totalPaid = BigDecimal.ZERO;
        if (payments != null && !payments.isEmpty()) {
            for (com.acrovix.admin.entity.Payment p : payments) {
                if (p.getStatus() != com.acrovix.admin.entity.PaymentStatus.RECORDED) continue;

                java.awt.Color rowBg = (seq % 2 == 0) ? new java.awt.Color(248, 250, 252) : java.awt.Color.WHITE;

                // #
                PdfPCell cSeq = new PdfPCell(new Phrase(String.valueOf(seq++), rowFont));
                cSeq.setHorizontalAlignment(Element.ALIGN_CENTER);
                styleLedgerCell(cSeq, rowBg);
                table.addCell(cSeq);

                // Ref
                PdfPCell cRef = new PdfPCell(new Phrase(p.getPaymentNumber() != null ? p.getPaymentNumber() : "-", rowMonoBold));
                styleLedgerCell(cRef, rowBg);
                table.addCell(cRef);

                // Date
                String dtStr = p.getPaymentDate() != null ? p.getPaymentDate().format(DateTimeFormatter.ofPattern("dd MMM yyyy")) : "-";
                PdfPCell cDt = new PdfPCell(new Phrase(dtStr, rowFont));
                styleLedgerCell(cDt, rowBg);
                table.addCell(cDt);

                // Method
                String method = p.getPaymentMethod() != null ? p.getPaymentMethod().name().replace("_", " ") : "BANK TRANSFER";
                PdfPCell cMethod = new PdfPCell(new Phrase(method, rowFont));
                styleLedgerCell(cMethod, rowBg);
                table.addCell(cMethod);

                // UTR / Cheque
                String ref = p.getTransactionReference() != null && !p.getTransactionReference().isBlank()
                        ? p.getTransactionReference() : (p.getChequeNumber() != null ? p.getChequeNumber() : "-");
                PdfPCell cUtr = new PdfPCell(new Phrase(ref, rowFont));
                styleLedgerCell(cUtr, rowBg);
                table.addCell(cUtr);

                // Bank Deposited
                String bank = p.getBankName() != null && !p.getBankName().isBlank() ? p.getBankName() : "-";
                PdfPCell cBank = new PdfPCell(new Phrase(bank, rowFont));
                styleLedgerCell(cBank, rowBg);
                table.addCell(cBank);

                // Amount
                BigDecimal amt = p.getAmount() != null ? p.getAmount() : BigDecimal.ZERO;
                totalPaid = totalPaid.add(amt);
                PdfPCell cAmt = new PdfPCell(new Phrase(curSym + formatAmount(amt, curCode), rowAmtFont));
                cAmt.setHorizontalAlignment(Element.ALIGN_RIGHT);
                styleLedgerCell(cAmt, rowBg);
                table.addCell(cAmt);
            }
        }

        if (seq == 1) {
            // Fallback if no individual payment row exists
            PdfPCell cEmpty = new PdfPCell(new Phrase("Payment recorded directly against invoice (Full settlement).", rowFont));
            cEmpty.setColspan(7);
            cEmpty.setPadding(6f);
            cEmpty.setHorizontalAlignment(Element.ALIGN_CENTER);
            table.addCell(cEmpty);
            totalPaid = invoice.getAmountPaid() != null ? invoice.getAmountPaid() : invoice.getGrandTotal();
        }

        // Total Row
        PdfPCell cTotalLabel = new PdfPCell(new Phrase("Total Reconciled & Cleared Amount:", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, NAVY_PRIMARY)));
        cTotalLabel.setColspan(6);
        cTotalLabel.setHorizontalAlignment(Element.ALIGN_RIGHT);
        cTotalLabel.setBackgroundColor(new java.awt.Color(236, 253, 245));
        cTotalLabel.setBorderColor(new java.awt.Color(167, 243, 208));
        cTotalLabel.setPadding(5f);
        table.addCell(cTotalLabel);

        PdfPCell cTotalVal = new PdfPCell(new Phrase(curSym + formatAmount(totalPaid, curCode), getAppropriateFont(true, 8.0f, new java.awt.Color(5, 150, 105))));
        cTotalVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
        cTotalVal.setBackgroundColor(new java.awt.Color(236, 253, 245));
        cTotalVal.setBorderColor(new java.awt.Color(167, 243, 208));
        cTotalVal.setPadding(5f);
        table.addCell(cTotalVal);

        document.add(table);
    }

    private void styleLedgerCell(PdfPCell cell, java.awt.Color bgColor) {
        cell.setBackgroundColor(bgColor);
        cell.setBorderColor(new java.awt.Color(226, 232, 240));
        cell.setBorderWidth(0.5f);
        cell.setPaddingTop(3.5f);
        cell.setPaddingBottom(3.5f);
        cell.setPaddingLeft(3f);
        cell.setPaddingRight(3f);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
    }

    private void addSettlementSignatoryAndStamp(Document document, PdfWriter writer, com.acrovix.admin.entity.Invoice invoice, CompanySettingsResponse settings, com.acrovix.admin.entity.AdminUser admin) throws DocumentException {
        PdfPTable bottomTable = new PdfPTable(3);
        bottomTable.setWidthPercentage(100);
        try { bottomTable.setWidths(new float[]{54f, 2f, 44f}); } catch (Exception ignored) {}

        // LEFT CARD: Official Certification Note
        PdfPCell certCard = new PdfPCell();
        certCard.setBackgroundColor(new java.awt.Color(248, 250, 252));
        certCard.setBorderColor(new java.awt.Color(226, 232, 240));
        certCard.setBorderWidth(0.5f);
        certCard.setPadding(7f);

        Paragraph certHead = new Paragraph("OFFICIAL SETTLEMENT & CLEARANCE CERTIFICATE", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, NAVY_PRIMARY));
        certHead.setSpacingAfter(4f);
        certCard.addElement(certHead);

        String invNo = invoice.getInvoiceNumber() != null ? invoice.getInvoiceNumber() : "-";
        Paragraph certBody = new Paragraph(
                "This official certificate confirms that all payment dues and financial obligations for Invoice #" + invNo + " have been settled and reconciled in full. There are no outstanding charges or dues against this invoice.\n\n" +
                "This statement may be maintained by the client as proof of clearance for tax, auditing, and accounting compliance purposes.",
                FontFactory.getFont(FontFactory.HELVETICA, 6.8f, TEXT_DARK)
        );
        certBody.setLeading(9f);
        certCard.addElement(certBody);

        bottomTable.addCell(certCard);

        // Spacer
        PdfPCell sp = new PdfPCell(); sp.setBorder(Rectangle.NO_BORDER);
        bottomTable.addCell(sp);

        // RIGHT CARD: Signatory & Stamp
        PdfPCell sigCard = new PdfPCell();
        sigCard.setBackgroundColor(java.awt.Color.WHITE);
        sigCard.setBorderColor(new java.awt.Color(226, 232, 240));
        sigCard.setBorderWidth(0.5f);
        sigCard.setPadding(6f);

        String companyName = settings != null && settings.getCompanyName() != null ? settings.getCompanyName() : "Acrovix Innovations";
        Paragraph pFor = new Paragraph("For " + companyName, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.2f, NAVY_PRIMARY));
        pFor.setSpacingAfter(2f);
        sigCard.addElement(pFor);

        PdfPTable innerSigTable = new PdfPTable(2);
        innerSigTable.setWidthPercentage(100);
        try { innerSigTable.setWidths(new float[]{55f, 45f}); } catch (Exception ignored) {}

        // Left of inner: Signatory name, role, timestamp
        PdfPCell sigInfo = new PdfPCell();
        sigInfo.setBorder(Rectangle.NO_BORDER);
        sigInfo.setPadding(0);

        String adminName = admin != null ? admin.getName() : "Authorized Officer";
        Paragraph pSigTitle = new Paragraph("Authorized Signatory", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.2f, TEXT_DARK));
        pSigTitle.setSpacingBefore(12f);
        pSigTitle.setSpacingAfter(2f);
        sigInfo.addElement(pSigTitle);

        Paragraph pAdmin = new Paragraph("Reconciled by: " + adminName, FontFactory.getFont(FontFactory.HELVETICA, 6.8f, TEXT_MUTED));
        sigInfo.addElement(pAdmin);

        String nowStr = java.time.LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"));
        Paragraph pTime = new Paragraph("Date: " + nowStr, FontFactory.getFont(FontFactory.HELVETICA, 6.5f, TEXT_MUTED));
        pTime.setSpacingBefore(1.5f);
        sigInfo.addElement(pTime);

        innerSigTable.addCell(sigInfo);

        // Right of inner: Circular Green Stamp
        PdfPCell stampCell = new PdfPCell();
        stampCell.setBorder(Rectangle.NO_BORDER);
        stampCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        stampCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        stampCell.setPadding(0);

        Image greenStamp = createSettlementPaidStamp(writer, 62f);
        if (greenStamp != null) {
            greenStamp.setAlignment(Element.ALIGN_RIGHT);
            stampCell.addElement(greenStamp);
        }
        innerSigTable.addCell(stampCell);

        sigCard.addElement(innerSigTable);
        bottomTable.addCell(sigCard);

        document.add(bottomTable);
    }

    public static Image createSettlementPaidStamp(PdfWriter writer, float size) {
        try {
            com.lowagie.text.pdf.PdfTemplate t = writer.getDirectContent().createTemplate(size, size);
            java.awt.Color stampGreen = new java.awt.Color(5, 150, 105); // Emerald green
            t.setColorStroke(stampGreen);
            t.setColorFill(stampGreen);

            float cx = size / 2f;
            float cy = size / 2f;
            float rOuter = (size - 2f) / 2f;
            float rInner = rOuter - 2.8f;
            float rCenter = rInner - 4.5f;

            // Outer circle
            t.setLineWidth(1.3f);
            t.circle(cx, cy, rOuter);
            t.stroke();

            // Inner circle
            t.setLineWidth(0.6f);
            t.circle(cx, cy, rInner);
            t.stroke();

            // Innermost circle
            t.setLineWidth(0.5f);
            t.circle(cx, cy, rCenter);
            t.stroke();

            com.lowagie.text.pdf.BaseFont bf = com.lowagie.text.pdf.BaseFont.createFont(
                    com.lowagie.text.pdf.BaseFont.HELVETICA_BOLD,
                    com.lowagie.text.pdf.BaseFont.WINANSI,
                    com.lowagie.text.pdf.BaseFont.NOT_EMBEDDED);

            // Center box
            t.setLineWidth(0.6f);
            t.rectangle(cx - 15f, cy - 4.2f, 30f, 8.4f);
            t.stroke();

            // "PAID IN FULL" in box
            t.beginText();
            t.setFontAndSize(bf, 3.8f);
            String displayCenter = "PAID IN FULL";
            float wCenter = bf.getWidthPoint(displayCenter, 3.8f);
            t.setTextMatrix(cx - wCenter / 2f, cy - 1.4f);
            t.showText(displayCenter);

            // Sub text below box: "ZERO DUES"
            t.setFontAndSize(bf, 3.0f);
            String displaySub = "ZERO DUES";
            float wSub = bf.getWidthPoint(displaySub, 3.0f);
            t.setTextMatrix(cx - wSub / 2f, cy - 8.2f);
            t.showText(displaySub);

            // Top star
            t.setFontAndSize(bf, 4.5f);
            float wTop = bf.getWidthPoint("*", 4.5f);
            t.setTextMatrix(cx - wTop / 2f, cy + 5.5f);
            t.showText("*");
            t.endText();

            // Circular ring text: "PAID IN FULL • NO DUES OUTSTANDING •"
            String text = "PAID IN FULL • NO DUES OUTSTANDING •";
            float ringR = (rOuter + rInner) / 2f;
            float charAngle = Math.min(9.5f, 260f / Math.max(text.length(), 1));
            float startAngle = 90f + (text.length() * charAngle) / 2f;

            t.beginText();
            t.setFontAndSize(bf, 2.7f);
            for (int i = 0; i < text.length(); i++) {
                char ch = text.charAt(i);
                float angleDeg = startAngle - (i * charAngle);
                float angleRad = (float) Math.toRadians(angleDeg);
                float x = cx + ringR * (float) Math.cos(angleRad);
                float y = cy + ringR * (float) Math.sin(angleRad);

                float rot = angleDeg - 90f;
                float cosR = (float) Math.cos(Math.toRadians(rot));
                float sinR = (float) Math.sin(Math.toRadians(rot));

                t.setTextMatrix(cosR, sinR, -sinR, cosR, x - 1.0f, y - 1.0f);
                t.showText(String.valueOf(ch));
            }
            t.endText();

            return Image.getInstance(t);
        } catch (Exception e) {
            return null;
        }
    }
}

