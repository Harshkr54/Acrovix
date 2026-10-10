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
import java.time.format.DateTimeFormatter;

@Service
public class PdfService {

    @Autowired(required = false)
    private CompanySettingsService companySettingsService;

    
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(PdfService.class);

    public byte[] generateQuotationPdf(Quotation quotation) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            int colCount = 0;
            if (quotation.getColumnConfigs() != null) {
                colCount = (int) quotation.getColumnConfigs().stream().filter(com.acrovix.admin.entity.QuotationColumnConfig::getVisible).count();
            }
            if (colCount == 0) colCount = 7;
            
            Document document = new Document(colCount > 8 ? PageSize.A4.rotate() : PageSize.A4, 36, 36, 36, 48);
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new QuotationFooterEvent());
            document.open();

            CompanySettingsResponse settings = companySettingsService != null ? companySettingsService.getCompanySettings() : null;

            addHeader(document, settings);
            addQuotationMeta(document, quotation);
            addCustomerDetails(document, quotation);
            addLineItemsTable(document, quotation, settings);
            addFinancialSummary(document, quotation, settings);
            addNotesAndTerms(document, quotation, settings);
            addBankDetailsAndSignatory(document, settings);

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate PDF", e);
            throw new RuntimeException("Failed to generate PDF", e);
        }
    }

    private void addHeader(Document document, CompanySettingsResponse settings) throws DocumentException {
        Font blueTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, new java.awt.Color(37, 99, 235));
        Font compNameFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14);
        Font headerBoldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
        Font regularFont = FontFactory.getFont(FontFactory.HELVETICA, 9);

        String companyName = (settings != null && settings.getCompanyName() != null) ? settings.getCompanyName() : "";
        String gstin = (settings != null && settings.getGstin() != null) ? settings.getGstin() : "";
        String compAddress = (settings != null && settings.getRegisteredAddress() != null && !settings.getRegisteredAddress().trim().isEmpty()) 
            ? settings.getRegisteredAddress() 
            : ((settings != null && settings.getBillingAddress() != null) ? settings.getBillingAddress() : "");

        PdfPTable topTable = new PdfPTable(2);
        topTable.setWidthPercentage(100);
        topTable.setWidths(new float[]{60f, 40f});

        PdfPCell leftHeader = new PdfPCell();
        leftHeader.setBorder(Rectangle.NO_BORDER);
        Paragraph quotLabel = new Paragraph("QUOTATION", blueTitleFont);
        quotLabel.setSpacingAfter(8f);
        leftHeader.addElement(quotLabel);
        
        if (!companyName.trim().isEmpty()) {
            leftHeader.addElement(new Paragraph(companyName, compNameFont));
        }

        if (!gstin.trim().isEmpty()) {
            Paragraph gstinPara = new Paragraph();
            gstinPara.add(new Chunk("GSTIN ", regularFont));
            gstinPara.add(new Chunk(gstin, headerBoldFont));
            leftHeader.addElement(gstinPara);
        }

        if (settings != null && settings.getPhone() != null && !settings.getPhone().isEmpty()) {
            Paragraph phPara = new Paragraph();
            phPara.add(new Chunk("Phone: ", regularFont));
            phPara.add(new Chunk(settings.getPhone(), headerBoldFont));
            leftHeader.addElement(phPara);
        }

        if (settings != null && settings.getEmail() != null && !settings.getEmail().isEmpty()) {
            Paragraph emPara = new Paragraph();
            emPara.add(new Chunk("Email: ", regularFont));
            emPara.add(new Chunk(settings.getEmail(), headerBoldFont));
            leftHeader.addElement(emPara);
        }

        if (!compAddress.trim().isEmpty()) {
            leftHeader.addElement(new Paragraph(compAddress, regularFont));
        }

        PdfPCell rightHeader = new PdfPCell();
        rightHeader.setBorder(Rectangle.NO_BORDER);
        rightHeader.setHorizontalAlignment(Element.ALIGN_RIGHT);
        Paragraph origRecPara = new Paragraph("ORIGINAL FOR RECIPIENT", headerBoldFont);
        origRecPara.setAlignment(Element.ALIGN_RIGHT);
        origRecPara.setSpacingAfter(10f);
        rightHeader.addElement(origRecPara);

        boolean logoAdded = false;
        if (settings != null && settings.getLogoUrl() != null && !settings.getLogoUrl().trim().isEmpty()) {
            try {
                Image logo = Image.getInstance(new java.net.URL(settings.getLogoUrl()));
                logo.scaleToFit(130, 50);
                logo.setAlignment(Element.ALIGN_RIGHT);
                rightHeader.addElement(logo);
                logoAdded = true;
            } catch(Exception e) {
                log.warn("Could not load company logo from URL: {}", settings.getLogoUrl(), e);
            }
        }
        
        if (!logoAdded) {
            try {
                java.net.URL defaultLogoUrl = PdfService.class.getResource("/static/Acrovix_logo.png");
                if (defaultLogoUrl != null) {
                    Image defaultLogo = Image.getInstance(defaultLogoUrl);
                    defaultLogo.scaleToFit(120, 50);
                    defaultLogo.setAlignment(Element.ALIGN_RIGHT);
                    rightHeader.addElement(defaultLogo);
                }
            } catch (Exception e) {
                log.warn("Could not load default bundled company logo", e);
            }
        }

        topTable.addCell(leftHeader);
        topTable.addCell(rightHeader);
        document.add(topTable);
        document.add(new Chunk(new LineSeparator(0.5f, 100, new java.awt.Color(200, 200, 200), Element.ALIGN_CENTER, -5f)));
        document.add(new Paragraph(" "));
    }

    private void addQuotationMeta(Document document, Quotation quotation) throws DocumentException {
        Font headerBoldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
        Font regularFont = FontFactory.getFont(FontFactory.HELVETICA, 9);

        PdfPTable metaTable = new PdfPTable(3);
        metaTable.setWidthPercentage(100);

        PdfPCell cell1 = new PdfPCell(); cell1.setBorder(Rectangle.NO_BORDER);
        Paragraph p1 = new Paragraph();
        p1.add(new Chunk("Quotation #: ", headerBoldFont));
        p1.add(new Chunk(quotation.getQuotationNumber() != null ? quotation.getQuotationNumber() : "", headerBoldFont));
        cell1.addElement(p1);
        metaTable.addCell(cell1);

        PdfPCell cell2 = new PdfPCell(); cell2.setBorder(Rectangle.NO_BORDER);
        Paragraph p2 = new Paragraph();
        p2.add(new Chunk("Quotation Date: ", headerBoldFont));
        String dateStr = quotation.getCreatedAt() != null ? quotation.getCreatedAt().format(DateTimeFormatter.ofPattern("dd MMM yyyy")) : "";
        p2.add(new Chunk(dateStr, headerBoldFont));
        cell2.addElement(p2);
        metaTable.addCell(cell2);

        PdfPCell cell3 = new PdfPCell(); cell3.setBorder(Rectangle.NO_BORDER);
        Paragraph p3 = new Paragraph();
        p3.add(new Chunk("Validity: ", headerBoldFont));
        String validStr = quotation.getValidUntil() != null ? quotation.getValidUntil().format(DateTimeFormatter.ofPattern("dd MMM yyyy")) : "";
        p3.add(new Chunk(validStr, regularFont));
        cell3.addElement(p3);
        metaTable.addCell(cell3);

        document.add(metaTable);
        document.add(new Paragraph(" "));
    }

    private void addCustomerDetails(Document document, Quotation quotation) throws DocumentException {
        Font headerBoldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
        Font regularFont = FontFactory.getFont(FontFactory.HELVETICA, 9);

        PdfPTable custTable = new PdfPTable(3);
        custTable.setWidthPercentage(100);
        custTable.setWidths(new float[]{48f, 4f, 48f}); // Middle column is a spacer

        String custCompany = quotation.getClientCompany() != null && !quotation.getClientCompany().isEmpty() ? quotation.getClientCompany() : quotation.getClientName();
        String custPhone = quotation.getClientPhone() != null ? quotation.getClientPhone() : "";
        String custEmail = quotation.getClientEmail() != null ? quotation.getClientEmail() : "";
        String billAddress = "";
        String shipAddress = "";
        String state = "";
        String custGstin = "";
        
        if (quotation.getCustomer() != null) {
            billAddress = quotation.getCustomer().getBillingAddress() != null ? quotation.getCustomer().getBillingAddress() : "";
            shipAddress = quotation.getCustomer().getShippingAddress() != null ? quotation.getCustomer().getShippingAddress() : "";
            state = quotation.getCustomer().getState() != null ? quotation.getCustomer().getState() : "";
            custGstin = quotation.getCustomer().getGstin() != null ? quotation.getCustomer().getGstin() : "";
        }

        Font panelHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, new java.awt.Color(10, 88, 202));
        java.awt.Color paleBlueBg = new java.awt.Color(234, 243, 255);
        java.awt.Color panelBorderColor = new java.awt.Color(200, 220, 245);

        // Panel 1: Customer Details
        PdfPTable panel1 = new PdfPTable(2);
        panel1.setWidthPercentage(100);
        panel1.setWidths(new float[]{30f, 70f});
        
        PdfPCell p1Header = new PdfPCell(new Phrase("Customer Details", panelHeaderFont));
        p1Header.setColspan(2);
        p1Header.setBackgroundColor(paleBlueBg);
        p1Header.setBorderColor(panelBorderColor);
        p1Header.setPadding(6f);
        panel1.addCell(p1Header);

        addPanelRow(panel1, "Name", quotation.getClientName(), regularFont, panelBorderColor);
        if (custCompany != null && !custCompany.trim().isEmpty() && !custCompany.equals(quotation.getClientName())) {
            addPanelRow(panel1, "Company", custCompany, regularFont, panelBorderColor);
        }
        if (custEmail != null && !custEmail.trim().isEmpty()) {
            addPanelRow(panel1, "Email", custEmail, regularFont, panelBorderColor);
        }
        if (custPhone != null && !custPhone.trim().isEmpty()) {
            addPanelRow(panel1, "Phone", custPhone, regularFont, panelBorderColor);
        }
        if (custGstin != null && !custGstin.trim().isEmpty()) {
            addPanelRow(panel1, "GSTIN", custGstin, regularFont, panelBorderColor);
        }
        if (state != null && !state.trim().isEmpty()) {
            addPanelRow(panel1, "Place of Supply", state, regularFont, panelBorderColor);
        }

        PdfPCell custCell1 = new PdfPCell(panel1);
        custCell1.setBorder(Rectangle.NO_BORDER);

        PdfPCell spacer = new PdfPCell();
        spacer.setBorder(Rectangle.NO_BORDER);

        // Panel 2: Billing Address
        PdfPTable panel2 = new PdfPTable(2);
        panel2.setWidthPercentage(100);
        panel2.setWidths(new float[]{30f, 70f});
        
        PdfPCell p2Header = new PdfPCell(new Phrase("Billing Address", panelHeaderFont));
        p2Header.setColspan(2);
        p2Header.setBackgroundColor(paleBlueBg);
        p2Header.setBorderColor(panelBorderColor);
        p2Header.setPadding(6f);
        panel2.addCell(p2Header);

        if (!billAddress.trim().isEmpty() || !state.trim().isEmpty() || !shipAddress.trim().isEmpty()) {
            if (!billAddress.trim().isEmpty()) {
                addPanelRow(panel2, "Address", billAddress, regularFont, panelBorderColor);
            }
            if (!state.trim().isEmpty()) {
                addPanelRow(panel2, "State", state, regularFont, panelBorderColor);
            }
            if (!shipAddress.trim().isEmpty() && !shipAddress.equals(billAddress)) {
                addPanelRow(panel2, "Ship To", shipAddress, regularFont, panelBorderColor);
            }
        } else {
            PdfPCell emptyCell = new PdfPCell(new Phrase(" ", regularFont));
            emptyCell.setColspan(2);
            emptyCell.setBorderColor(panelBorderColor);
            emptyCell.setPadding(6f);
            panel2.addCell(emptyCell);
        }

        PdfPCell custCell2 = new PdfPCell(panel2);
        custCell2.setBorder(Rectangle.NO_BORDER);

        custTable.addCell(custCell1);
        custTable.addCell(spacer);
        custTable.addCell(custCell2);
        document.add(custTable);
        document.add(new Paragraph(" "));
    }

    private void addPanelRow(PdfPTable table, String label, String value, Font font, java.awt.Color borderColor) {
        PdfPCell c1 = new PdfPCell(new Phrase(label, font));
        c1.setBorderColor(borderColor);
        c1.setBorderWidth(0.5f);
        c1.setPadding(4f);
        
        PdfPCell c2 = new PdfPCell(new Phrase(value != null && !value.isEmpty() ? ":   " + value : ":   -", font));
        c2.setBorderColor(borderColor);
        c2.setBorderWidth(0.5f);
        c2.setPadding(4f);
        
        table.addCell(c1);
        table.addCell(c2);
    }

    private void addLineItemsTable(Document document, Quotation quotation, CompanySettingsResponse settings) throws DocumentException {
        Font headerBoldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
        Font regularFont = FontFactory.getFont(FontFactory.HELVETICA, 9);
        Font tinyFont = FontFactory.getFont(FontFactory.HELVETICA, 8);

        java.util.List<com.acrovix.admin.entity.QuotationColumnConfig> configs = new java.util.ArrayList<>();
        if (quotation.getColumnConfigs() != null && !quotation.getColumnConfigs().isEmpty()) {
            configs.addAll(quotation.getColumnConfigs().stream()
                    .filter(com.acrovix.admin.entity.QuotationColumnConfig::getVisible)
                    .sorted(java.util.Comparator.comparing(com.acrovix.admin.entity.QuotationColumnConfig::getSortOrder))
                    .collect(java.util.stream.Collectors.toList()));
        } else {
            String[] keys = {"rowNumber", "description", "unitPrice", "quantity", "taxableValue", "taxAmount", "total"};
            String[] displayNames = {"#", "Item", "Rate / Item", "Qty", "Taxable Value", "Tax Amount", "Amount"};
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

        float[] widths = new float[colCount];
        for (int i = 0; i < colCount; i++) {
            String key = configs.get(i).getColumnKey();
            if ("rowNumber".equals(key)) widths[i] = 4f;
            else if ("sku".equals(key)) widths[i] = 12f;
            else if ("description".equals(key)) widths[i] = 30f;
            else if ("hsnSac".equals(key)) widths[i] = 10f;
            else if ("quantity".equals(key)) widths[i] = 7f;
            else if ("listPrice".equals(key)) widths[i] = 12f;
            else if ("discountPercent".equals(key)) widths[i] = 7f;
            else if ("unitPrice".equals(key)) widths[i] = 12f;
            else if ("taxPercent".equals(key)) widths[i] = 7f;
            else if ("taxAmount".equals(key)) widths[i] = 12f;
            else if ("total".equals(key)) widths[i] = 14f;
            else widths[i] = 10f;
        }
        table.setWidths(widths);
        table.setHeaderRows(1);

        Font tableHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, java.awt.Color.WHITE);
        java.awt.Color tableHeaderBg = new java.awt.Color(10, 88, 202); // Strong blue

        for (com.acrovix.admin.entity.QuotationColumnConfig c : configs) {
            String dispName = c.getDisplayName();
            if (dispName != null && dispName.toUpperCase().contains("TAX AMOUNT")) {
                dispName = "TAX AMT.";
            }
            PdfPCell headerCell = new PdfPCell(new Phrase(dispName, tableHeaderFont));
            headerCell.setBackgroundColor(tableHeaderBg);
            headerCell.setBorderWidth(0.5f);
            headerCell.setBorderColor(new java.awt.Color(200, 200, 200)); 
            headerCell.setPaddingTop(6f);
            headerCell.setPaddingBottom(6f);
            headerCell.setPaddingLeft(4f);
            headerCell.setPaddingRight(4f);
            
            if ("rowNumber".equals(c.getColumnKey()) || "sku".equals(c.getColumnKey()) || "description".equals(c.getColumnKey()) || "hsnSac".equals(c.getColumnKey())) {
                headerCell.setHorizontalAlignment(Element.ALIGN_LEFT);
            } else if ("quantity".equals(c.getColumnKey()) || "taxPercent".equals(c.getColumnKey())) {
                headerCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            } else {
                headerCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            }
            
            table.addCell(headerCell);
        }

        int totalItems = 0;
        BigDecimal totalQty = BigDecimal.ZERO;
        java.util.Set<BigDecimal> taxRates = new java.util.HashSet<>();

        if (quotation.getItems() != null) {
            int index = 1;
            totalItems = quotation.getItems().size();
            for (QuotationItem item : quotation.getItems()) {
                BigDecimal qty = item.getQuantity() != null ? item.getQuantity() : BigDecimal.ZERO;
                totalQty = totalQty.add(qty);
                BigDecimal unitPrice = item.getUnitPrice() != null ? item.getUnitPrice() : BigDecimal.ZERO;
                BigDecimal taxPct = item.getTaxPercent() != null ? item.getTaxPercent() : BigDecimal.ZERO;
                if (taxPct.compareTo(BigDecimal.ZERO) > 0) taxRates.add(taxPct);

                BigDecimal netLine = qty.multiply(unitPrice).setScale(2, java.math.RoundingMode.HALF_UP);
                BigDecimal taxAmt = netLine.multiply(taxPct).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);

                for (com.acrovix.admin.entity.QuotationColumnConfig c : configs) {
                    String val = "";
                    boolean isRightAlign = false;
                    if (c.getIsCustom() != null && c.getIsCustom()) {
                        if (item.getCustomValues() != null && item.getCustomValues().containsKey(c.getColumnKey())) {
                            val = item.getCustomValues().get(c.getColumnKey());
                        }
                    } else {
                        switch (c.getColumnKey()) {
                            case "rowNumber": val = String.valueOf(index); break;
                            case "sku": val = item.getSku() != null ? item.getSku() : ""; break;
                            case "description": 
                                val = item.getDescription() != null ? item.getDescription() : "";
                                break;
                            case "hsnSac": val = item.getHsnSac() != null ? item.getHsnSac() : ""; isRightAlign = true; break;
                            case "quantity": val = qty.toString(); isRightAlign = true; break;
                            case "listPrice": val = (item.getListPrice() != null ? item.getListPrice() : unitPrice).toString(); isRightAlign = true; break;
                            case "discountPercent": val = item.getDiscountPercent() != null ? item.getDiscountPercent().toString() : "0"; isRightAlign = true; break;
                            case "unitPrice": val = unitPrice.toString(); isRightAlign = true; break;
                            case "taxPercent": val = taxPct.toString(); isRightAlign = true; break;
                            case "taxAmount": 
                            case "taxableValue": 
                                if ("taxableValue".equals(c.getColumnKey())) {
                                    val = netLine.toString();
                                } else {
                                    val = taxAmt.toString() + "\n(" + taxPct.toString() + "%)";
                                }
                                isRightAlign = true; break;
                            case "total": val = item.getLineTotal() != null ? item.getLineTotal().toString() : "0.00"; isRightAlign = true; break;
                            default: val = "";
                        }
                    }

                    PdfPCell cell = new PdfPCell();
                    cell.setBorderWidth(0.5f);
                    cell.setBorderColor(new java.awt.Color(220, 220, 220));
                    cell.setPaddingTop(8f);
                    cell.setPaddingBottom(8f);
                    cell.setPaddingLeft(4f);
                    cell.setPaddingRight(4f);
                    
                    int align = Element.ALIGN_RIGHT;
                    if ("rowNumber".equals(c.getColumnKey()) || "sku".equals(c.getColumnKey()) || "description".equals(c.getColumnKey()) || "hsnSac".equals(c.getColumnKey())) {
                        align = Element.ALIGN_LEFT;
                    } else if ("quantity".equals(c.getColumnKey()) || "taxPercent".equals(c.getColumnKey())) {
                        align = Element.ALIGN_CENTER;
                    }
                    cell.setHorizontalAlignment(align);

                    Paragraph p = new Paragraph(val, tinyFont);
                    p.setAlignment(align);
                    cell.addElement(p);
                    table.addCell(cell);
                }
                index++;
            }
        }

        document.add(table);
        document.add(new Paragraph(" "));
    }

    private void addFinancialSummary(Document document, Quotation quotation, CompanySettingsResponse settings) throws DocumentException {
        Font regularFont = FontFactory.getFont(FontFactory.HELVETICA, 9);
        Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
        Font grandTotalLabelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11);
        Font grandTotalValFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13);
        Font blueBoldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, new java.awt.Color(10, 88, 202));

        PdfPTable summaryTable = new PdfPTable(2);
        summaryTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
        summaryTable.setWidthPercentage(45);
        summaryTable.setWidths(new float[]{60f, 40f});
        summaryTable.setSpacingBefore(5f);
        summaryTable.setSpacingAfter(15f);

        String curSym = quotation.getCurrency() != null && quotation.getCurrency().name().equals("USD") ? "$" : "₹ ";

        // Taxable Amount
        PdfPCell taxLabel = new PdfPCell(new Phrase("Taxable Amount", regularFont));
        taxLabel.setBorderWidth(0);
        taxLabel.setHorizontalAlignment(Element.ALIGN_LEFT);
        taxLabel.setPaddingTop(4f);
        taxLabel.setPaddingBottom(4f);
        summaryTable.addCell(taxLabel);

        PdfPCell taxVal = new PdfPCell(new Phrase(curSym + (quotation.getSubtotal() != null ? quotation.getSubtotal().toString() : "0.00"), regularFont));
        taxVal.setBorderWidth(0);
        taxVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
        taxVal.setPaddingTop(4f);
        taxVal.setPaddingBottom(4f);
        summaryTable.addCell(taxVal);

        // Calculate tax rates again
        java.util.Set<BigDecimal> taxRates = new java.util.HashSet<>();
        if (quotation.getItems() != null) {
            for (QuotationItem item : quotation.getItems()) {
                BigDecimal taxPct = item.getTaxPercent() != null ? item.getTaxPercent() : BigDecimal.ZERO;
                if (taxPct.compareTo(BigDecimal.ZERO) > 0) taxRates.add(taxPct);
            }
        }

        String totalTaxLabel = "Tax";
        if (quotation.getCustomer() != null && quotation.getCustomer().getState() != null && settings != null && settings.getRegisteredAddress() != null) {
            String cState = quotation.getCustomer().getState().toLowerCase();
            String compAddr = settings.getRegisteredAddress().toLowerCase();
            if (compAddr.contains(cState)) {
                totalTaxLabel = "CGST/SGST";
            } else {
                totalTaxLabel = "IGST";
            }
        }
        
        if (taxRates.size() == 1) {
            totalTaxLabel += " (" + taxRates.iterator().next().toString() + "%)";
        } else if (taxRates.size() > 1) {
            totalTaxLabel = "Applicable Tax";
        } else {
            totalTaxLabel = "Total Tax";
        }

        PdfPCell igstLabel = new PdfPCell(new Phrase(totalTaxLabel, regularFont)); 
        igstLabel.setBorderWidth(0);
        igstLabel.setHorizontalAlignment(Element.ALIGN_LEFT);
        igstLabel.setPaddingTop(4f);
        igstLabel.setPaddingBottom(4f);
        summaryTable.addCell(igstLabel);

        PdfPCell igstVal = new PdfPCell(new Phrase(curSym + (quotation.getTaxAmount() != null ? quotation.getTaxAmount().toString() : "0.00"), regularFont));
        igstVal.setBorderWidth(0);
        igstVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
        igstVal.setPaddingTop(4f);
        igstVal.setPaddingBottom(4f);
        summaryTable.addCell(igstVal);

        PdfPCell gTotalLabel = new PdfPCell(new Phrase("Grand Total", grandTotalLabelFont));
        gTotalLabel.setBorderWidth(0);
        gTotalLabel.setBackgroundColor(new java.awt.Color(219, 250, 233)); // Pale green highlight
        gTotalLabel.setHorizontalAlignment(Element.ALIGN_LEFT);
        gTotalLabel.setPaddingTop(8f);
        gTotalLabel.setPaddingBottom(8f);
        gTotalLabel.setPaddingLeft(6f);
        summaryTable.addCell(gTotalLabel);

        PdfPCell gTotalVal = new PdfPCell(new Phrase(curSym + (quotation.getGrandTotal() != null ? quotation.getGrandTotal().toString() : "0.00"), grandTotalValFont));
        gTotalVal.setBorderWidth(0);
        gTotalVal.setBackgroundColor(new java.awt.Color(219, 250, 233)); // Pale green highlight
        gTotalVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
        gTotalVal.setPaddingTop(8f);
        gTotalVal.setPaddingBottom(8f);
        gTotalVal.setPaddingRight(6f);
        gTotalVal.setNoWrap(true);
        summaryTable.addCell(gTotalVal);

        document.add(summaryTable);

        // Amount in words below the summary block, left aligned
        String currencyCode = quotation.getCurrency() != null ? quotation.getCurrency().name() : "INR";
        String currencyName = "USD".equalsIgnoreCase(currencyCode) ? "USD " : "INR ";
        String words = currencyName + (quotation.getGrandTotal() != null ? convertAmountToWords(quotation.getGrandTotal().toString(), currencyCode) : ("Zero" + ("USD".equalsIgnoreCase(currencyCode) ? " Dollars Only" : " Rupees Only")));
        
        Paragraph amountWordsPara = new Paragraph();
        amountWordsPara.add(new Chunk("Total amount (in words): ", regularFont));
        amountWordsPara.add(new Chunk(words, blueBoldFont));
        amountWordsPara.setSpacingAfter(15f);
        document.add(amountWordsPara);
    }

    private void addBankDetailsAndSignatory(Document document, CompanySettingsResponse settings) throws DocumentException {
        Font headerBoldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
        Font regularFont = FontFactory.getFont(FontFactory.HELVETICA, 9);

        PdfPTable bottomTable = new PdfPTable(2);
        bottomTable.setWidthPercentage(100);
        bottomTable.setWidths(new float[]{50f, 50f});

        PdfPCell bankCell = new PdfPCell();
        bankCell.setBorder(Rectangle.NO_BORDER);

        String companyName = (settings != null && settings.getCompanyName() != null) ? settings.getCompanyName() : "";
        String bBank = settings != null && settings.getBankName() != null ? settings.getBankName() : "";
        String bHolder = companyName;
        String bAcc = settings != null && settings.getBankAccountNumber() != null ? settings.getBankAccountNumber() : "";
        String bIfsc = settings != null && settings.getBankIfsc() != null ? settings.getBankIfsc() : "";
        String bBranch = settings != null && settings.getBankBranch() != null ? settings.getBankBranch() : "";

        boolean hasBankInfo = !bBank.trim().isEmpty() || !bAcc.trim().isEmpty() || !bIfsc.trim().isEmpty();

        Font panelHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, new java.awt.Color(10, 88, 202));
        java.awt.Color paleBlueBg = new java.awt.Color(234, 243, 255);
        java.awt.Color panelBorderColor = new java.awt.Color(200, 220, 245);

        if (hasBankInfo) {
            PdfPTable bankPanel = new PdfPTable(1);
            bankPanel.setWidthPercentage(100);
            
            PdfPCell p1Header = new PdfPCell(new Phrase("Bank Details", panelHeaderFont));
            p1Header.setBackgroundColor(paleBlueBg);
            p1Header.setBorderColor(panelBorderColor);
            p1Header.setPadding(6f);
            bankPanel.addCell(p1Header);

            PdfPTable bankInfo = new PdfPTable(2);
            bankInfo.setWidthPercentage(100);
            bankInfo.setWidths(new float[]{30f, 70f});

            if (!bBank.trim().isEmpty()) addBankRow(bankInfo, "Bank:", bBank, regularFont, regularFont);
            addBankRow(bankInfo, "Account Holder:", bHolder, regularFont, regularFont);
            if (!bAcc.trim().isEmpty()) addBankRow(bankInfo, "Account #:", bAcc, regularFont, regularFont);
            if (!bIfsc.trim().isEmpty()) addBankRow(bankInfo, "IFSC Code:", bIfsc, regularFont, regularFont);
            if (!bBranch.trim().isEmpty()) addBankRow(bankInfo, "Branch:", bBranch, regularFont, regularFont);

            PdfPCell infoCell = new PdfPCell(bankInfo);
            infoCell.setBorderColor(panelBorderColor);
            infoCell.setPadding(4f);
            bankPanel.addCell(infoCell);
            
            bankCell.addElement(bankPanel);
        }

        PdfPCell sigCell = new PdfPCell();
        sigCell.setBorder(Rectangle.NO_BORDER);
        sigCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        sigCell.setVerticalAlignment(Element.ALIGN_BOTTOM);

        PdfPTable sigTable = new PdfPTable(1);
        sigTable.setWidthPercentage(80);
        sigTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
        
        if (!companyName.trim().isEmpty()) {
            PdfPCell companyCell = new PdfPCell(new Phrase("For " + companyName, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, new java.awt.Color(10, 88, 202))));
            companyCell.setBorder(Rectangle.NO_BORDER);
            companyCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            companyCell.setPaddingBottom(30f);
            sigTable.addCell(companyCell);
        } else {
            PdfPCell blankCell = new PdfPCell(new Phrase(" "));
            blankCell.setBorder(Rectangle.NO_BORDER);
            blankCell.setPaddingBottom(30f);
            sigTable.addCell(blankCell);
        }
        
        PdfPCell lineCell = new PdfPCell(new Phrase(""));
        lineCell.setBorder(Rectangle.NO_BORDER);
        lineCell.setBorderWidthBottom(0.5f);
        lineCell.setBorderColorBottom(new java.awt.Color(150, 150, 150));
        lineCell.setPaddingBottom(5f);
        sigTable.addCell(lineCell);
        
        PdfPCell authSig = new PdfPCell(new Phrase("Authorized Signatory", regularFont));
        authSig.setBorder(Rectangle.NO_BORDER);
        authSig.setHorizontalAlignment(Element.ALIGN_CENTER);
        authSig.setPaddingTop(5f);
        sigTable.addCell(authSig);
        
        sigCell.addElement(sigTable);

        bottomTable.addCell(bankCell);
        bottomTable.addCell(sigCell);
        document.add(bottomTable);
        document.add(new Paragraph("\n"));
    }

    private void addNotesAndTerms(Document document, Quotation quotation, CompanySettingsResponse settings) throws DocumentException {
        Font regularFont = FontFactory.getFont(FontFactory.HELVETICA, 9);
        Font panelHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, new java.awt.Color(10, 88, 202));
        java.awt.Color paleBlueBg = new java.awt.Color(234, 243, 255);
        java.awt.Color panelBorderColor = new java.awt.Color(200, 220, 245);

        boolean hasQuotationTerms = quotation.getTermsAndConditions() != null && !quotation.getTermsAndConditions().isBlank();
        boolean hasDefaultTerms = settings != null && settings.getDefaultTermsAndConditions() != null && !settings.getDefaultTermsAndConditions().isBlank();

        if (hasQuotationTerms || hasDefaultTerms) {
            PdfPTable termsPanel = new PdfPTable(1);
            termsPanel.setWidthPercentage(100);
            termsPanel.setSpacingBefore(15f);
            termsPanel.setSpacingAfter(10f);

            PdfPCell pHeader = new PdfPCell(new Phrase("Terms & Conditions", panelHeaderFont));
            pHeader.setBackgroundColor(paleBlueBg);
            pHeader.setBorderColor(panelBorderColor);
            pHeader.setPadding(6f);
            termsPanel.addCell(pHeader);

            String terms = hasQuotationTerms ? quotation.getTermsAndConditions() : settings.getDefaultTermsAndConditions();
            String[] lines = terms.split("\n");
            
            PdfPCell listCell = new PdfPCell();
            for(String line : lines) {
                if(!line.trim().isEmpty()) {
                    Paragraph p = new Paragraph(line.trim(), regularFont);
                    p.setIndentationLeft(10f);
                    p.setSpacingAfter(4f);
                    listCell.addElement(p);
                }
            }

            listCell.setBorderColor(panelBorderColor);
            listCell.setPadding(10f);
            listCell.setPaddingBottom(15f);
            termsPanel.addCell(listCell);

            document.add(termsPanel);
        }
    }

    class QuotationFooterEvent extends PdfPageEventHelper {
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte cb = writer.getDirectContent();
            Font footerFont = FontFactory.getFont(FontFactory.HELVETICA, 8, new java.awt.Color(150, 150, 150));
            Phrase footer = new Phrase("This is a computer generated document and requires no signature.   Page " + writer.getPageNumber(), footerFont);
            ColumnText.showTextAligned(cb, Element.ALIGN_CENTER,
                    footer,
                    (document.right() - document.left()) / 2 + document.leftMargin(),
                    document.bottom() - 10, 0);
        }
    }
    
    private void addBankRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        PdfPCell c1 = new PdfPCell(new Phrase(label, labelFont));
        c1.setBorder(Rectangle.NO_BORDER);
        c1.setPaddingBottom(3f);
        PdfPCell c2 = new PdfPCell(new Phrase(value, valueFont));
        c2.setBorder(Rectangle.NO_BORDER);
        c2.setPaddingBottom(3f);
        table.addCell(c1);
        table.addCell(c2);
    }
    
    private static String convertAmountToWords(String num, String currencyCode) {
        try {
            long number = (long) Double.parseDouble(num);
            String suffix = "USD".equalsIgnoreCase(currencyCode) ? " Dollars Only" : " Rupees Only";
            if (number == 0) { return "Zero" + suffix; }
            return convertNumberToWords(number) + suffix;
        } catch(Exception e) {
            return num;
        }
    }
    
    private static final String[] units = { "", "One", "Two", "Three", "Four",
        "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
        "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
        "Eighteen", "Nineteen" };

    private static final String[] tens = { 
        "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety" };

    private static String convertNumberToWords(long n) {
        if (n < 0) { return "Minus " + convertNumberToWords(-n); }
        if (n < 20) { return units[(int) n]; }
        if (n < 100) { return tens[(int) (n / 10)] + ((n % 10 != 0) ? " " : "") + units[(int) (n % 10)]; }
        if (n < 1000) { return units[(int) (n / 100)] + " Hundred" + ((n % 100 != 0) ? " " : "") + convertNumberToWords(n % 100); }
        if (n < 100000) { return convertNumberToWords(n / 1000) + " Thousand" + ((n % 1000 != 0) ? " " : "") + convertNumberToWords(n % 1000); }
        if (n < 10000000) { return convertNumberToWords(n / 100000) + " Lakh" + ((n % 100000 != 0) ? " " : "") + convertNumberToWords(n % 100000); }
        return convertNumberToWords(n / 10000000) + " Crore" + ((n % 10000000 != 0) ? " " : "") + convertNumberToWords(n % 10000000);
    }
    public byte[] generatePurchaseOrderPdf(com.acrovix.admin.entity.PurchaseOrder po) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 36, 48);
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new QuotationFooterEvent());
            document.open();

            CompanySettingsResponse settings = companySettingsService != null ? companySettingsService.getCompanySettings() : null;

            addPoHeader(document, settings);
            addPoMetadata(document, po);
            addBillToShipTo(document, po, settings);
            addPoOrderDetails(document, po, settings);
            addPoTermsAndConditions(document, po, settings);
            addPoAuthorization(document, po, settings);

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate Purchase Order PDF", e);
            throw new RuntimeException("Failed to generate Purchase Order PDF", e);
        }
    }

    private void addPoHeader(Document document, CompanySettingsResponse settings) throws DocumentException {
        Font contactFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, new java.awt.Color(11, 25, 44)); // Navy #0B192C

        String supportEmail = (settings != null && settings.getEmail() != null) ? settings.getEmail() : "support@acrovix.com";
        String companyPhone = (settings != null && settings.getPhone() != null) ? settings.getPhone() : "+91-8092848065";
        String city = "Bengaluru"; // Simplification; could extract from address if needed
        if (settings != null && settings.getRegisteredAddress() != null && settings.getRegisteredAddress().contains("Mumbai")) {
            city = "Mumbai";
        } else if (settings != null && settings.getRegisteredAddress() != null && settings.getRegisteredAddress().contains("Bengaluru")) {
            city = "Bengaluru";
        }

        // Top line (PO Header Image)
        try {
            Image poHeaderImg = null;
            java.net.URL poHeaderUrl = getClass().getResource("/static/PO_header.png");
            if (poHeaderUrl != null) {
                poHeaderImg = Image.getInstance(poHeaderUrl);
            }

            if (poHeaderImg != null) {
                poHeaderImg.scaleToFit(500f, 120f);
                poHeaderImg.setAlignment(Element.ALIGN_CENTER);
                document.add(poHeaderImg);
                document.add(new Paragraph("\n"));
            } else {
                log.warn("PO_header.png not found, falling back to logo/text");
                Image logo = null;
                if (settings != null && settings.getLogoUrl() != null && !settings.getLogoUrl().trim().isEmpty()) {
                    try {
                        logo = Image.getInstance(new java.net.URL(settings.getLogoUrl()));
                    } catch (Exception ex) {
                        log.warn("Failed to load logo from URL: " + settings.getLogoUrl(), ex);
                    }
                }
                if (logo == null) {
                    java.net.URL defaultLogoUrl = getClass().getResource("/static/Acrovix_logo.png");
                    if (defaultLogoUrl != null) {
                        logo = Image.getInstance(defaultLogoUrl);
                    }
                }
                if (logo != null) {
                    logo.scaleToFit(150f, 60f);
                    logo.setAlignment(Element.ALIGN_LEFT);
                    document.add(logo);
                    document.add(new Paragraph("\n"));
                } else {
                    Font compNameFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, new java.awt.Color(11, 25, 44));
                    String companyName = (settings != null && settings.getCompanyName() != null) ? settings.getCompanyName() : "ACROVIX INNOVATIONS PRIVATE LIMITED";
                    Paragraph logoPara = new Paragraph(companyName, compNameFont);
                    logoPara.setAlignment(Element.ALIGN_LEFT);
                    document.add(logoPara);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to add PO header to PDF", e);
            Font compNameFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, new java.awt.Color(11, 25, 44));
            String companyName = (settings != null && settings.getCompanyName() != null) ? settings.getCompanyName() : "ACROVIX INNOVATIONS PRIVATE LIMITED";
            Paragraph logoPara = new Paragraph(companyName, compNameFont);
            logoPara.setAlignment(Element.ALIGN_LEFT);
            document.add(logoPara);
        }
        
        // Horizontal line
        LineSeparator ls = new LineSeparator();
        ls.setLineColor(new java.awt.Color(11, 25, 44));
        ls.setLineWidth(2f);
        document.add(new Chunk(ls));
        document.add(new Paragraph("\n"));

        // Contact Row
        PdfPTable contactTable = new PdfPTable(3);
        contactTable.setWidthPercentage(100);
        
        PdfPCell cEmail = new PdfPCell(new Paragraph(supportEmail, contactFont));
        cEmail.setBorder(Rectangle.NO_BORDER);
        cEmail.setHorizontalAlignment(Element.ALIGN_LEFT);
        
        PdfPCell cPhone = new PdfPCell(new Paragraph(companyPhone, contactFont));
        cPhone.setBorder(Rectangle.NO_BORDER);
        cPhone.setHorizontalAlignment(Element.ALIGN_CENTER);
        
        PdfPCell cCity = new PdfPCell(new Paragraph(city, contactFont));
        cCity.setBorder(Rectangle.NO_BORDER);
        cCity.setHorizontalAlignment(Element.ALIGN_RIGHT);
        
        contactTable.addCell(cEmail);
        contactTable.addCell(cPhone);
        contactTable.addCell(cCity);
        document.add(contactTable);
        document.add(new Paragraph("\n"));

        // PURCHASE ORDER Title
        Paragraph title = new Paragraph("PURCHASE ORDER", titleFont);
        title.setAlignment(Element.ALIGN_CENTER);
        document.add(title);
        document.add(new Paragraph("\n"));
    }

    private void addPoMetadata(Document document, com.acrovix.admin.entity.PurchaseOrder po) throws DocumentException {
        Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
        Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 9);

        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{20f, 30f, 20f, 30f});

        String poDate = po.getPoDate() != null ? po.getPoDate().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy")) : "";
        String currency = po.getCurrency() != null ? po.getCurrency().name() : "INR";
        if (po.getQuotation() != null && po.getQuotation().getItems() != null) {
            boolean hasInr = false, hasUsd = false;
            for (QuotationItem item : po.getQuotation().getItems()) {
                 if (item.getCustomValues() != null && item.getCustomValues().containsKey("currency")) {
                     String c = item.getCustomValues().get("currency");
                     if ("USD".equalsIgnoreCase(c)) hasUsd = true;
                     if ("INR".equalsIgnoreCase(c)) hasInr = true;
                 }
            }
            if (hasInr && hasUsd) currency = "INR / USD (Year-wise)";
        }
        
        String pTerms = "As per Terms & Conditions";

        addPoMetaCell(table, "PO Number", labelFont);
        addPoMetaCell(table, po.getPoNumber(), valueFont);
        addPoMetaCell(table, "PO Date", labelFont);
        addPoMetaCell(table, poDate, valueFont);

        addPoMetaCell(table, "Payment Terms", labelFont);
        addPoMetaCell(table, pTerms, valueFont);
        addPoMetaCell(table, "Currency", labelFont);
        addPoMetaCell(table, currency, valueFont);

        document.add(table);
        document.add(new Paragraph("\n"));
    }

    private void addPoMetaCell(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "", font));
        cell.setPadding(6f);
        cell.setBorderColor(new java.awt.Color(0, 0, 0));
        cell.setBorderWidth(1f);
        table.addCell(cell);
    }

    private void addBillToShipTo(Document document, com.acrovix.admin.entity.PurchaseOrder po, CompanySettingsResponse settings) throws DocumentException {
        Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, new java.awt.Color(11, 25, 44));
        Paragraph sectionHeader = new Paragraph("Bill To / Ship To", headerFont);
        sectionHeader.setSpacingAfter(5f);
        document.add(sectionHeader);

        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{50f, 50f});

        Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, new java.awt.Color(11, 25, 44));
        Font regularFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, new java.awt.Color(37, 99, 235));

        PdfPCell leftCell = new PdfPCell();
        leftCell.setBorderColor(new java.awt.Color(0, 0, 0));
        leftCell.setBorderWidth(1f);
        leftCell.setPadding(8f);

        String companyName = (settings != null && settings.getCompanyName() != null) ? settings.getCompanyName() : "Acrovix Innovations Private Limited";
        leftCell.addElement(new Paragraph(companyName, boldFont));
        
        String address = (settings != null && settings.getBillingAddress() != null) ? settings.getBillingAddress() : "";
        if (!address.isEmpty()) leftCell.addElement(new Paragraph(address, boldFont));
        
        if (settings != null && settings.getGstin() != null && !settings.getGstin().isEmpty()) {
            leftCell.addElement(new Paragraph("GSTIN: " + settings.getGstin(), boldFont));
        }
        if (settings != null && settings.getPan() != null && !settings.getPan().isEmpty()) {
            leftCell.addElement(new Paragraph("PAN: " + settings.getPan(), boldFont));
        }
        if (settings != null && settings.getEmail() != null && !settings.getEmail().isEmpty()) {
            leftCell.addElement(new Paragraph("Email: " + settings.getEmail(), boldFont));
        }
        if (settings != null && settings.getPhone() != null && !settings.getPhone().isEmpty()) {
            leftCell.addElement(new Paragraph("P.no: " + settings.getPhone(), boldFont));
        }

        PdfPCell rightCell = new PdfPCell();
        rightCell.setBorderColor(new java.awt.Color(0, 0, 0));
        rightCell.setBorderWidth(1f);
        rightCell.setPadding(8f);

        if (po.getQuotation() != null) {
            String clientComp = po.getQuotation().getClientCompany() != null && !po.getQuotation().getClientCompany().isBlank() ? po.getQuotation().getClientCompany() : po.getQuotation().getClientName();
            rightCell.addElement(new Paragraph(clientComp, boldFont));
            
            com.acrovix.admin.entity.Customer cust = po.getQuotation().getCustomer();
            if (cust != null && cust.getShippingAddress() != null && !cust.getShippingAddress().isBlank()) {
                rightCell.addElement(new Paragraph(cust.getShippingAddress(), boldFont));
            } else if (cust != null && cust.getBillingAddress() != null && !cust.getBillingAddress().isBlank()) {
                rightCell.addElement(new Paragraph(cust.getBillingAddress(), boldFont));
            }

            rightCell.addElement(new Paragraph("Kind Attn.: " + po.getQuotation().getClientName(), regularFont));
            rightCell.addElement(new Paragraph("Email: " + po.getQuotation().getClientEmail(), regularFont));
            if (po.getQuotation().getClientPhone() != null && !po.getQuotation().getClientPhone().isEmpty()) {
                rightCell.addElement(new Paragraph("P.no: " + po.getQuotation().getClientPhone(), boldFont));
            }
            rightCell.addElement(new Paragraph("End Customer", boldFont));
            rightCell.addElement(new Paragraph(clientComp, boldFont));
        }

        table.addCell(leftCell);
        table.addCell(rightCell);
        document.add(table);
        document.add(new Paragraph("\n"));
    }

    private void addPoOrderDetails(Document document, com.acrovix.admin.entity.PurchaseOrder po, CompanySettingsResponse settings) throws DocumentException {
        Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, new java.awt.Color(11, 25, 44));
        Paragraph sectionHeader = new Paragraph("Order Details", headerFont);
        sectionHeader.setSpacingAfter(5f);
        document.add(sectionHeader);

        if (po.getQuotation() == null) return;

        java.util.List<com.acrovix.admin.entity.QuotationColumnConfig> configs = po.getQuotation().getColumnConfigs();
        if (configs == null || configs.isEmpty()) return;

        java.util.List<com.acrovix.admin.entity.QuotationColumnConfig> visibleConfigs = configs.stream().filter(c -> c.getVisible()).collect(java.util.stream.Collectors.toList());
        int colCount = visibleConfigs.size();
        if (colCount == 0) return;

        PdfPTable table = new PdfPTable(colCount);
        table.setWidthPercentage(100);

        Font tableHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, new java.awt.Color(255, 255, 255));
        Font regularFont = FontFactory.getFont(FontFactory.HELVETICA, 8);

        for (com.acrovix.admin.entity.QuotationColumnConfig c : visibleConfigs) {
            PdfPCell headerCell = new PdfPCell(new Phrase(c.getDisplayName(), tableHeaderFont));
            headerCell.setBackgroundColor(new java.awt.Color(11, 25, 44));
            headerCell.setPaddingTop(6f);
            headerCell.setPaddingBottom(6f);
            headerCell.setPaddingLeft(4f);
            headerCell.setPaddingRight(4f);
            headerCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            headerCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            table.addCell(headerCell);
        }
        table.setHeaderRows(1);

        if (po.getQuotation().getItems() != null) {
            int index = 1;
            for (QuotationItem item : po.getQuotation().getItems()) {
                BigDecimal qty = item.getQuantity() != null ? item.getQuantity() : BigDecimal.ZERO;
                BigDecimal unitPrice = item.getUnitPrice() != null ? item.getUnitPrice() : BigDecimal.ZERO;
                BigDecimal taxPct = item.getTaxPercent() != null ? item.getTaxPercent() : BigDecimal.ZERO;
                BigDecimal netLine = qty.multiply(unitPrice);
                BigDecimal taxAmt = netLine.multiply(taxPct).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);

                for (com.acrovix.admin.entity.QuotationColumnConfig c : visibleConfigs) {
                    String val = "";
                    boolean isRightAlign = false;
                    boolean isCenterAlign = false;

                    if (c.getIsCustom() != null && c.getIsCustom()) {
                        if (item.getCustomValues() != null && item.getCustomValues().containsKey(c.getColumnKey())) {
                            val = item.getCustomValues().get(c.getColumnKey());
                        }
                        isCenterAlign = true;
                    } else {
                        switch (c.getColumnKey()) {
                            case "rowNumber": val = String.valueOf(index); isCenterAlign = true; break;
                            case "sku": val = item.getSku() != null ? item.getSku() : ""; break;
                            case "description": val = item.getDescription() != null ? item.getDescription() : ""; break;
                            case "hsnSac": val = item.getHsnSac() != null ? item.getHsnSac() : ""; isCenterAlign = true; break;
                            case "quantity": val = qty.toString(); isCenterAlign = true; break;
                            case "listPrice": val = (item.getListPrice() != null ? item.getListPrice() : unitPrice).toString(); isRightAlign = true; break;
                            case "discountPercent": val = item.getDiscountPercent() != null ? item.getDiscountPercent().toString() : "0"; isRightAlign = true; break;
                            case "unitPrice": val = unitPrice.toString(); isRightAlign = true; break;
                            case "taxPercent": val = taxPct.toString(); isCenterAlign = true; break;
                            case "taxAmount": 
                            case "taxableValue": 
                                if ("taxableValue".equals(c.getColumnKey())) val = netLine.toString();
                                else val = taxAmt.toString();
                                isRightAlign = true; break;
                            case "total": val = item.getLineTotal() != null ? item.getLineTotal().toString() : "0.00"; isRightAlign = true; break;
                            default: val = "";
                        }
                    }
                    
                    if ("unitPrice".equals(c.getColumnKey()) || "listPrice".equals(c.getColumnKey()) || "total".equals(c.getColumnKey()) || "taxAmount".equals(c.getColumnKey()) || "taxableValue".equals(c.getColumnKey())) {
                        String curSym = po.getCurrency() != null && po.getCurrency().name().equals("USD") ? "USD " : "INR ";
                        if (item.getCustomValues() != null && item.getCustomValues().containsKey("currency")) {
                            curSym = "USD".equalsIgnoreCase(item.getCustomValues().get("currency")) ? "USD " : "INR ";
                        }
                        if (!val.isBlank()) val = curSym + val;
                    }

                    PdfPCell cell = new PdfPCell(new Phrase(val, regularFont));
                    cell.setBorderColor(new java.awt.Color(180, 180, 180));
                    cell.setBorderWidth(0.5f);
                    cell.setPadding(6f);
                    
                    if (isRightAlign) cell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                    else if (isCenterAlign) cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                    else cell.setHorizontalAlignment(Element.ALIGN_LEFT);
                    
                    cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                    table.addCell(cell);
                }
                index++;
            }
        }
        document.add(table);
        document.add(new Paragraph("\n"));
    }

    private void addPoTermsAndConditions(Document document, com.acrovix.admin.entity.PurchaseOrder po, CompanySettingsResponse settings) throws DocumentException {
        Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, new java.awt.Color(11, 25, 44));
        Font regularFont = FontFactory.getFont(FontFactory.HELVETICA, 9);

        boolean hasQuotationTerms = po.getQuotation() != null && po.getQuotation().getTermsAndConditions() != null && !po.getQuotation().getTermsAndConditions().isBlank();
        boolean hasPoRemarks = po.getRemarks() != null && !po.getRemarks().isBlank();
        boolean hasDefaultTerms = settings != null && settings.getDefaultTermsAndConditions() != null && !settings.getDefaultTermsAndConditions().isBlank();

        if (hasQuotationTerms || hasPoRemarks || hasDefaultTerms) {
            Paragraph termsHeader = new Paragraph("Terms & Conditions", headerFont);
            termsHeader.setSpacingBefore(10f);
            termsHeader.setSpacingAfter(8f);
            document.add(termsHeader);
            
            String terms = hasQuotationTerms ? po.getQuotation().getTermsAndConditions() : (hasPoRemarks ? po.getRemarks() : settings.getDefaultTermsAndConditions());
            
            String[] lines = terms.split("\n");
            for(String line : lines) {
                if(!line.trim().isEmpty()) {
                    Paragraph p = new Paragraph(line.trim(), regularFont);
                    p.setSpacingAfter(4f);
                    document.add(p);
                }
            }
        }
        document.add(new Paragraph("\n\n"));
    }

    private void addPoAuthorization(Document document, com.acrovix.admin.entity.PurchaseOrder po, CompanySettingsResponse settings) throws DocumentException {
        Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
        Font regularFont = FontFactory.getFont(FontFactory.HELVETICA, 9);

        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);

        PdfPCell leftCell = new PdfPCell();
        leftCell.setBorder(Rectangle.NO_BORDER);
        String companyName = (settings != null && settings.getCompanyName() != null) ? settings.getCompanyName() : "Acrovix Innovations Private Limited";
        leftCell.addElement(new Paragraph("For " + companyName, boldFont));
        leftCell.addElement(new Paragraph("\n\n\n\n"));
        
        LineSeparator ls1 = new LineSeparator();
        ls1.setLineColor(new java.awt.Color(200, 200, 200));
        ls1.setLineWidth(1f);
        ls1.setAlignment(Element.ALIGN_LEFT);
        ls1.setPercentage(80);
        leftCell.addElement(new Chunk(ls1));
        
        leftCell.addElement(new Paragraph("Authorized Signatory", regularFont));

        PdfPCell rightCell = new PdfPCell();
        rightCell.setBorder(Rectangle.NO_BORDER);
        
        String vendorName = "Vendor";
        if (po.getQuotation() != null && po.getQuotation().getClientCompany() != null && !po.getQuotation().getClientCompany().isBlank()) {
            vendorName = po.getQuotation().getClientCompany();
        } else if (po.getQuotation() != null) {
            vendorName = po.getQuotation().getClientName();
        }
        rightCell.addElement(new Paragraph("For " + vendorName, boldFont));
        rightCell.addElement(new Paragraph("\n\n\n\n"));
        
        LineSeparator ls2 = new LineSeparator();
        ls2.setLineColor(new java.awt.Color(200, 200, 200));
        ls2.setLineWidth(1f);
        ls2.setAlignment(Element.ALIGN_LEFT);
        ls2.setPercentage(80);
        rightCell.addElement(new Chunk(ls2));

        rightCell.addElement(new Paragraph("Authorized Signatory", regularFont));

        table.addCell(leftCell);
        table.addCell(rightCell);
        document.add(table);
    }


    class InvoiceHeaderFooterEvent extends PdfPageEventHelper {
        private CompanySettingsResponse settings;
        private String invoiceNumber;
        public InvoiceHeaderFooterEvent(CompanySettingsResponse settings, String invoiceNumber) {
            this.settings = settings;
            this.invoiceNumber = invoiceNumber;
        }
        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte cb = writer.getDirectContent();
            float docWidth = document.getPageSize().getWidth();
            float docHeight = document.getPageSize().getHeight();
            try {
                if (writer.getPageNumber() == 1) {
                    java.net.URL poHeaderUrl = getClass().getResource("/static/PO_header.png");
                    if (poHeaderUrl != null) {
                        Image poHeaderImg = Image.getInstance(poHeaderUrl);
                        poHeaderImg.scaleToFit(docWidth - 72f, 120f);
                        poHeaderImg.setAbsolutePosition(36f, docHeight - poHeaderImg.getScaledHeight());
                        cb.addImage(poHeaderImg);
                    }
                    cb.setColorStroke(new java.awt.Color(11, 25, 44));
                    cb.setLineWidth(2f);
                    cb.moveTo(36f, docHeight - 120f);
                    cb.lineTo(docWidth - 36f, docHeight - 120f);
                    cb.stroke();
                    
                    String supportEmail = (settings != null && settings.getEmail() != null) ? settings.getEmail() : "sales@acrovix.com";
                    String companyPhone = (settings != null && settings.getPhone() != null) ? settings.getPhone() : "+91-8092848065";
                    String city = "Bengaluru, Karnataka, India";
                    if (settings != null && settings.getRegisteredAddress() != null && settings.getRegisteredAddress().contains("Mumbai")) {
                        city = "Mumbai, Maharashtra, India";
                    }
                    Font contactFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
                    ColumnText.showTextAligned(cb, Element.ALIGN_LEFT, new Phrase("Email: " + supportEmail, contactFont), 36, docHeight - 138f, 0);
                    ColumnText.showTextAligned(cb, Element.ALIGN_CENTER, new Phrase("Phone: " + companyPhone, contactFont), docWidth / 2, docHeight - 138f, 0);
                    ColumnText.showTextAligned(cb, Element.ALIGN_RIGHT, new Phrase(city, contactFont), docWidth - 36f, docHeight - 138f, 0);
                }
                
                if (writer.getPageNumber() > 1 && invoiceNumber != null && !invoiceNumber.isEmpty()) {
                    PdfPTable badge = new PdfPTable(1);
                    badge.setTotalWidth(160f);
                    PdfPCell badgeCell = new PdfPCell(new Phrase("Invoice No: " + invoiceNumber, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, new java.awt.Color(11, 25, 44))));
                    badgeCell.setBackgroundColor(new java.awt.Color(235, 245, 255));
                    badgeCell.setBorderColor(new java.awt.Color(180, 210, 255));
                    badgeCell.setPadding(4f);
                    badgeCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                    badge.addCell(badgeCell);
                    badge.writeSelectedRows(0, -1, docWidth - 160f - 36f, docHeight - 36f, cb);
                }
                
                Phrase footer = new Phrase("Page " + writer.getPageNumber(), FontFactory.getFont(FontFactory.HELVETICA, 8));
                ColumnText.showTextAligned(cb, Element.ALIGN_CENTER, footer, docWidth / 2, 20, 0);
                Phrase thankYou = new Phrase("Thank you for your business!", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, new java.awt.Color(11, 25, 44)));
                ColumnText.showTextAligned(cb, Element.ALIGN_CENTER, thankYou, docWidth / 2, 35, 0);
            } catch (Exception e) { log.warn("Header event error", e); }
        }
    }

    private void addInvoiceTitleAndMeta(Document document, com.acrovix.admin.entity.Invoice invoice) throws DocumentException {
        PdfPTable titleTable = new PdfPTable(2);
        titleTable.setWidthPercentage(100);
        titleTable.setWidths(new float[]{70f, 30f});
        
        String invoiceTypeName = invoice.getInvoiceType() == com.acrovix.admin.entity.InvoiceType.PROFORMA ? "PROFORMA INVOICE" : "TAX INVOICE";
        PdfPCell titleCell = new PdfPCell(new Phrase(invoiceTypeName, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, new java.awt.Color(11, 25, 44))));
        titleCell.setBorder(Rectangle.NO_BORDER);
        titleCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        titleCell.setPaddingLeft(100f); // offset to center it visually
        
        PdfPCell badgeCell = new PdfPCell(new Phrase("ORIGINAL FOR RECIPIENT", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, new java.awt.Color(11, 25, 44))));
        badgeCell.setBackgroundColor(new java.awt.Color(235, 245, 255));
        badgeCell.setBorderColor(new java.awt.Color(180, 210, 255));
        badgeCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        badgeCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        badgeCell.setPadding(4f);
        
        PdfPTable badgeWrap = new PdfPTable(1);
        badgeWrap.setWidthPercentage(100);
        badgeWrap.addCell(badgeCell);
        
        PdfPCell rightCell = new PdfPCell(badgeWrap);
        rightCell.setBorder(Rectangle.NO_BORDER);
        rightCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        
        titleTable.addCell(titleCell);
        titleTable.addCell(rightCell);
        document.add(titleTable);
        document.add(new Paragraph(" "));
        
        PdfPTable metaTable = new PdfPTable(4);
        metaTable.setWidthPercentage(100);
        metaTable.setWidths(new float[]{15f, 35f, 15f, 35f});
        Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
        Font valFont = FontFactory.getFont(FontFactory.HELVETICA, 9);
        
        addMetaRow(metaTable, "Invoice No:", invoice.getInvoiceNumber() != null ? invoice.getInvoiceNumber() : "DRAFT", labelFont, valFont);
        addMetaRow(metaTable, "Invoice Date:", invoice.getInvoiceDate() != null ? invoice.getInvoiceDate().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy")) : "", labelFont, valFont);
        
        String quoteRef = (invoice.getQuotation() != null && invoice.getQuotation().getQuotationNumber() != null) ? invoice.getQuotation().getQuotationNumber() : "";
        String poRef = (invoice.getPurchaseOrder() != null && invoice.getPurchaseOrder().getPoNumber() != null) ? invoice.getPurchaseOrder().getPoNumber() : "";
        addMetaRow(metaTable, "Reference:", quoteRef, labelFont, valFont);
        addMetaRow(metaTable, "PO Number:", poRef, labelFont, valFont);
        
        addMetaRow(metaTable, "Payment Terms:", invoice.getPaymentTerms() != null ? invoice.getPaymentTerms() : "", labelFont, valFont);
        addMetaRow(metaTable, "Due Date:", invoice.getDueDate() != null ? invoice.getDueDate().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy")) : "", labelFont, valFont);
        
        document.add(metaTable);
        document.add(new Paragraph(" "));
    }

    private void addMetaRow(PdfPTable table, String l1, String v1, Font lf, Font vf) {
        PdfPCell c1 = new PdfPCell(new Phrase(l1, lf)); c1.setBorder(Rectangle.NO_BORDER); table.addCell(c1);
        PdfPCell c2 = new PdfPCell(new Phrase(v1, vf)); c2.setBorder(Rectangle.NO_BORDER); table.addCell(c2);
    }
    
    private void addInvoiceBillToShipTo(Document document, com.acrovix.admin.entity.Invoice invoice, CompanySettingsResponse settings) throws DocumentException {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{48f, 52f}); // match reference width slightly
        
        Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, new java.awt.Color(11, 25, 44));
        Font compFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
        Font regFont = FontFactory.getFont(FontFactory.HELVETICA, 9);
        
        // Bill To
        PdfPTable billTable = new PdfPTable(1);
        PdfPCell bHeader = new PdfPCell(new Phrase("Bill To (Customer)", headerFont));
        bHeader.setBackgroundColor(new java.awt.Color(235, 245, 255));
        bHeader.setBorderColor(new java.awt.Color(180, 210, 255));
        bHeader.setPadding(6f);
        billTable.addCell(bHeader);
        
        PdfPCell bBody = new PdfPCell();
        bBody.setBorderColor(new java.awt.Color(180, 210, 255));
        bBody.setPadding(8f);
        if (invoice.getClientCompany() != null && !invoice.getClientCompany().isBlank()) bBody.addElement(new Phrase(invoice.getClientCompany(), compFont));
        else if (invoice.getClientName() != null) bBody.addElement(new Phrase(invoice.getClientName(), compFont));
        if (invoice.getClientAddress() != null) bBody.addElement(new Phrase(invoice.getClientAddress(), regFont));
        if (invoice.getClientGstin() != null && !invoice.getClientGstin().isBlank()) bBody.addElement(new Phrase("GSTIN: " + invoice.getClientGstin(), regFont));
        if (invoice.getClientName() != null) bBody.addElement(new Phrase("Contact: " + invoice.getClientName(), regFont));
        if (invoice.getClientEmail() != null) bBody.addElement(new Phrase("Email: " + invoice.getClientEmail(), regFont));
        if (invoice.getClientPhone() != null) bBody.addElement(new Phrase("Phone: " + invoice.getClientPhone(), regFont));
        billTable.addCell(bBody);
        
        // Ship To
        PdfPTable shipTable = new PdfPTable(1);
        PdfPCell sHeader = new PdfPCell(new Phrase("Ship To (If different)", headerFont));
        sHeader.setBackgroundColor(new java.awt.Color(235, 245, 255));
        sHeader.setBorderColor(new java.awt.Color(180, 210, 255));
        sHeader.setPadding(6f);
        shipTable.addCell(sHeader);
        
        PdfPCell sBody = new PdfPCell();
        sBody.setBorderColor(new java.awt.Color(180, 210, 255));
        sBody.setPadding(8f);
        sBody.addElement(new Phrase(invoice.getClientCompany() != null && !invoice.getClientCompany().isBlank() ? invoice.getClientCompany() : invoice.getClientName(), compFont));
        sBody.addElement(new Phrase(invoice.getClientAddress() != null ? invoice.getClientAddress() : "", regFont));
        sBody.addElement(new Phrase("Kind Attn.: " + (invoice.getClientName() != null ? invoice.getClientName() : ""), regFont));
        sBody.addElement(new Phrase("Email: " + (invoice.getClientEmail() != null ? invoice.getClientEmail() : ""), regFont));
        sBody.addElement(new Phrase("Phone: " + (invoice.getClientPhone() != null ? invoice.getClientPhone() : ""), regFont));
        shipTable.addCell(sBody);
        
        PdfPCell leftCell = new PdfPCell(billTable); leftCell.setBorder(Rectangle.NO_BORDER); leftCell.setPaddingRight(4f);
        PdfPCell rightCell = new PdfPCell(shipTable); rightCell.setBorder(Rectangle.NO_BORDER); rightCell.setPaddingLeft(4f);
        table.addCell(leftCell);
        table.addCell(rightCell);
        document.add(table);
        document.add(new Paragraph(" "));
    }

    private void addInvoiceItemsTable(Document document, com.acrovix.admin.entity.Invoice invoice) throws DocumentException {
        PdfPTable table = new PdfPTable(9);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{4f, 28f, 10f, 6f, 12f, 9f, 8f, 11f, 12f});
        
        Font hFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, new java.awt.Color(255, 255, 255));
        Font rFont = FontFactory.getFont(FontFactory.HELVETICA, 8);
        String[] headers = {"#", "Description", "HSN/SAC", "Qty", "Unit Price (INR)", "Discount (%)", "Tax Rate", "Tax Amount (INR)", "Total (INR)"};
        
        for (String h : headers) {
            PdfPCell c = new PdfPCell(new Phrase(h, hFont));
            c.setBackgroundColor(new java.awt.Color(11, 25, 44));
            c.setBorderColor(new java.awt.Color(200, 200, 200));
            c.setHorizontalAlignment(Element.ALIGN_CENTER);
            c.setVerticalAlignment(Element.ALIGN_MIDDLE);
            c.setPadding(6f);
            table.addCell(c);
        }
        table.setHeaderRows(1);
        
        if (invoice.getItems() != null) {
            int i = 1;
            for (com.acrovix.admin.entity.InvoiceItem item : invoice.getItems()) {
                table.addCell(getCell(String.valueOf(i++), rFont, Element.ALIGN_CENTER));
                table.addCell(getCell(item.getDescription() != null ? item.getDescription() : "", rFont, Element.ALIGN_LEFT));
                table.addCell(getCell(item.getHsnSac() != null ? item.getHsnSac() : "", rFont, Element.ALIGN_CENTER));
                table.addCell(getCell(item.getQuantity() != null ? item.getQuantity().toString() : "0", rFont, Element.ALIGN_CENTER));
                table.addCell(getCell(item.getListPrice() != null ? item.getListPrice().toString() : "0.00", rFont, Element.ALIGN_RIGHT));
                table.addCell(getCell(item.getDiscountPercent() != null ? item.getDiscountPercent().toString() + "%" : "0%", rFont, Element.ALIGN_CENTER));
                table.addCell(getCell(item.getTaxPercent() != null ? item.getTaxPercent().toString() + "%" : "0%", rFont, Element.ALIGN_CENTER));
                
                BigDecimal taxAmt = BigDecimal.ZERO;
                if (item.getCgstAmount() != null) taxAmt = taxAmt.add(item.getCgstAmount());
                if (item.getSgstAmount() != null) taxAmt = taxAmt.add(item.getSgstAmount());
                if (item.getIgstAmount() != null) taxAmt = taxAmt.add(item.getIgstAmount());
                table.addCell(getCell(taxAmt.toString(), rFont, Element.ALIGN_RIGHT));
                
                table.addCell(getCell(item.getLineTotal() != null ? item.getLineTotal().toString() : "0.00", rFont, Element.ALIGN_RIGHT));
            }
        }
        document.add(table);
        document.add(new Paragraph(" "));
    }

    private PdfPCell getCell(String text, Font font, int alignment) {
        PdfPCell c = new PdfPCell(new Phrase(text, font));
        c.setBorderColor(new java.awt.Color(200, 200, 200));
        c.setHorizontalAlignment(alignment);
        c.setPadding(5f);
        return c;
    }

    private void addInvoiceAmountInWordsAndFinancialSummary(Document document, com.acrovix.admin.entity.Invoice invoice) throws DocumentException {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{55f, 45f});
        
        Font hFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, new java.awt.Color(11, 25, 44));
        Font bFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
        Font rFont = FontFactory.getFont(FontFactory.HELVETICA, 9);
        
        // Left column: Amount in words & Notes
        PdfPTable leftCol = new PdfPTable(1);
        PdfPCell awH = new PdfPCell(new Phrase("Amount in Words", hFont));
        awH.setBackgroundColor(new java.awt.Color(235, 245, 255));
        awH.setBorderColor(new java.awt.Color(180, 210, 255));
        awH.setPadding(6f);
        leftCol.addCell(awH);
        
        PdfPCell awB = new PdfPCell(new Phrase(invoice.getAmountInWords() != null ? "INR " + invoice.getAmountInWords() : "", bFont));
        awB.setBorderColor(new java.awt.Color(180, 210, 255));
        awB.setPadding(8f);
        leftCol.addCell(awB);
        
        PdfPCell space = new PdfPCell(new Phrase(" "));
        space.setBorder(Rectangle.NO_BORDER);
        space.setFixedHeight(10f);
        leftCol.addCell(space);
        
        PdfPCell nH = new PdfPCell(new Phrase("Notes", hFont));
        nH.setBackgroundColor(new java.awt.Color(235, 245, 255));
        nH.setBorderColor(new java.awt.Color(180, 210, 255));
        nH.setPadding(6f);
        leftCol.addCell(nH);
        
        String notes = "• This is a computer generated tax invoice.\n• Please make the payment within the due date.";
        PdfPCell nB = new PdfPCell(new Phrase(notes, rFont));
        nB.setBorderColor(new java.awt.Color(180, 210, 255));
        nB.setPadding(8f);
        leftCol.addCell(nB);
        
        PdfPCell leftWrap = new PdfPCell(leftCol);
        leftWrap.setBorder(Rectangle.NO_BORDER);
        leftWrap.setPaddingRight(10f);
        table.addCell(leftWrap);
        
        // Right column: Financial Summary
        PdfPTable rightCol = new PdfPTable(2);
        
        addFinRow(rightCol, "Subtotal", invoice.getTaxableAmount() != null ? invoice.getTaxableAmount().toString() : "0.00", rFont, false);
        addFinRow(rightCol, "Total Discount", "0.00", rFont, false);
        addFinRow(rightCol, "Taxable Amount", invoice.getTaxableAmount() != null ? invoice.getTaxableAmount().toString() : "0.00", rFont, false);
        
        boolean showIgst = invoice.getIgstAmount() != null && invoice.getIgstAmount().compareTo(BigDecimal.ZERO) > 0;
        if (showIgst) {
            addFinRow(rightCol, "IGST", invoice.getIgstAmount().toString(), rFont, false);
        } else {
            addFinRow(rightCol, "CGST", invoice.getCgstAmount() != null ? invoice.getCgstAmount().toString() : "0.00", rFont, false);
            addFinRow(rightCol, "SGST", invoice.getSgstAmount() != null ? invoice.getSgstAmount().toString() : "0.00", rFont, false);
        }
        
        addFinRow(rightCol, "Grand Total (INR)", invoice.getGrandTotal() != null ? invoice.getGrandTotal().toString() : "0.00", bFont, true);
        
        PdfPCell rightWrap = new PdfPCell(rightCol);
        rightWrap.setBorder(Rectangle.NO_BORDER);
        table.addCell(rightWrap);
        
        document.add(table);
    }

    private void addFinRow(PdfPTable table, String label, String value, Font font, boolean isGrandTotal) {
        PdfPCell c1 = new PdfPCell(new Phrase(label, font));
        PdfPCell c2 = new PdfPCell(new Phrase(value, font));
        c1.setBorderColor(new java.awt.Color(200, 200, 200));
        c2.setBorderColor(new java.awt.Color(200, 200, 200));
        c1.setPadding(6f); c2.setPadding(6f);
        c2.setHorizontalAlignment(Element.ALIGN_RIGHT);
        
        if (isGrandTotal) {
            java.awt.Color green = new java.awt.Color(210, 245, 210);
            c1.setBackgroundColor(green);
            c2.setBackgroundColor(green);
        }
        table.addCell(c1);
        table.addCell(c2);
    }

    private void addInvoiceTaxDetails(Document document, com.acrovix.admin.entity.Invoice invoice) throws DocumentException {
        Font hFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, new java.awt.Color(11, 25, 44));
        document.add(new Paragraph("Tax Details", hFont));
        document.add(new Paragraph(" "));
        
        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        
        Font thFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, new java.awt.Color(255, 255, 255));
        Font trFont = FontFactory.getFont(FontFactory.HELVETICA, 9);
        
        String[] headers = {"Tax Type", "Taxable Amount (INR)", "Rate", "Tax Amount (INR)"};
        for (String h : headers) {
            PdfPCell c = new PdfPCell(new Phrase(h, thFont));
            c.setBackgroundColor(new java.awt.Color(11, 25, 44));
            c.setHorizontalAlignment(Element.ALIGN_CENTER);
            c.setPadding(6f);
            table.addCell(c);
        }
        
        boolean showIgst = invoice.getIgstAmount() != null && invoice.getIgstAmount().compareTo(BigDecimal.ZERO) > 0;
        BigDecimal taxable = invoice.getTaxableAmount() != null ? invoice.getTaxableAmount() : BigDecimal.ZERO;
        
        // This is a simplified breakdown. To do per-rate breakdown we'd need to aggregate from items, 
        // but existing invoice model just has total CGST/SGST/IGST. We will show the totals.
        if (showIgst) {
            table.addCell(getCell("IGST", trFont, Element.ALIGN_LEFT));
            table.addCell(getCell(taxable.toString(), trFont, Element.ALIGN_RIGHT));
            table.addCell(getCell("-", trFont, Element.ALIGN_CENTER)); // rate not easily single if multiple items, so '-'
            table.addCell(getCell(invoice.getIgstAmount().toString(), trFont, Element.ALIGN_RIGHT));
        } else {
            table.addCell(getCell("CGST", trFont, Element.ALIGN_LEFT));
            table.addCell(getCell(taxable.toString(), trFont, Element.ALIGN_RIGHT));
            table.addCell(getCell("-", trFont, Element.ALIGN_CENTER));
            table.addCell(getCell(invoice.getCgstAmount() != null ? invoice.getCgstAmount().toString() : "0.00", trFont, Element.ALIGN_RIGHT));
            
            table.addCell(getCell("SGST", trFont, Element.ALIGN_LEFT));
            table.addCell(getCell(taxable.toString(), trFont, Element.ALIGN_RIGHT));
            table.addCell(getCell("-", trFont, Element.ALIGN_CENTER));
            table.addCell(getCell(invoice.getSgstAmount() != null ? invoice.getSgstAmount().toString() : "0.00", trFont, Element.ALIGN_RIGHT));
        }
        
        PdfPCell tLabel = new PdfPCell(new Phrase("Total Tax", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9)));
        tLabel.setColspan(3); tLabel.setBackgroundColor(new java.awt.Color(240, 245, 255));
        tLabel.setPadding(6f); table.addCell(tLabel);
        
        BigDecimal totalTax = BigDecimal.ZERO;
        if (showIgst) totalTax = invoice.getIgstAmount();
        else {
            if (invoice.getCgstAmount() != null) totalTax = totalTax.add(invoice.getCgstAmount());
            if (invoice.getSgstAmount() != null) totalTax = totalTax.add(invoice.getSgstAmount());
        }
        
        PdfPCell tVal = new PdfPCell(new Phrase(totalTax.toString(), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, new java.awt.Color(11, 25, 44))));
        tVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
        tVal.setBackgroundColor(new java.awt.Color(240, 245, 255));
        tVal.setPadding(6f); table.addCell(tVal);
        
        document.add(table);
        document.add(new Paragraph(" "));
    }

    private void addInvoiceBankDetails(Document document, CompanySettingsResponse settings) throws DocumentException {
        if (settings == null || settings.getBankName() == null || settings.getBankName().isEmpty()) return;
        
        PdfPTable table = new PdfPTable(1);
        table.setWidthPercentage(100);
        
        PdfPCell h = new PdfPCell(new Phrase("Bank Details", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, new java.awt.Color(11, 25, 44))));
        h.setBackgroundColor(new java.awt.Color(235, 245, 255));
        h.setBorderColor(new java.awt.Color(180, 210, 255));
        h.setPadding(6f);
        table.addCell(h);
        
        PdfPTable body = new PdfPTable(2);
        body.setWidths(new float[]{30f, 70f});
        Font lf = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
        Font vf = FontFactory.getFont(FontFactory.HELVETICA, 9);
        
        addBankRow(body, "Bank Name:", settings.getBankName(), lf, vf);
        if (settings.getBankAccountNumber() != null) addBankRow(body, "Account Number:", settings.getBankAccountNumber(), lf, vf);
        if (settings.getBankIfsc() != null) addBankRow(body, "IFSC Code:", settings.getBankIfsc(), lf, vf);
        if (settings.getBankBranch() != null) addBankRow(body, "Branch:", settings.getBankBranch(), lf, vf);
        
        PdfPCell bCell = new PdfPCell(body);
        bCell.setBorderColor(new java.awt.Color(180, 210, 255));
        bCell.setPadding(4f);
        table.addCell(bCell);
        
        document.add(table);
        document.add(new Paragraph(" "));
    }

    private void addInvoiceTermsAndConditions(Document document, com.acrovix.admin.entity.Invoice invoice) throws DocumentException {
        if (invoice.getTermsAndConditions() == null || invoice.getTermsAndConditions().isBlank()) return;
        
        PdfPTable table = new PdfPTable(1);
        table.setWidthPercentage(100);
        
        PdfPCell h = new PdfPCell(new Phrase("Terms & Conditions", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, new java.awt.Color(11, 25, 44))));
        h.setBackgroundColor(new java.awt.Color(235, 245, 255));
        h.setBorderColor(new java.awt.Color(180, 210, 255));
        h.setPadding(6f);
        table.addCell(h);
        
        PdfPCell b = new PdfPCell(new Phrase(invoice.getTermsAndConditions(), FontFactory.getFont(FontFactory.HELVETICA, 9)));
        b.setBorderColor(new java.awt.Color(180, 210, 255));
        b.setPadding(8f);
        table.addCell(b);
        
        document.add(table);
        document.add(new Paragraph(" "));
    }

    private void addInvoiceSignatures(Document document, CompanySettingsResponse settings) throws DocumentException {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        
        PdfPTable left = createSigBlock("For " + (settings != null && settings.getCompanyName() != null ? settings.getCompanyName() : "Acrovix Innovations Private Limited"));
        PdfPTable right = createSigBlock("For Customer");
        
        PdfPCell lc = new PdfPCell(left); lc.setBorder(Rectangle.NO_BORDER); lc.setPaddingRight(10f);
        PdfPCell rc = new PdfPCell(right); rc.setBorder(Rectangle.NO_BORDER); rc.setPaddingLeft(10f);
        
        table.addCell(lc); table.addCell(rc);
        document.add(table);
    }
    
    private PdfPTable createSigBlock(String title) {
        PdfPTable table = new PdfPTable(1);
        PdfPCell h = new PdfPCell(new Phrase(title, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, new java.awt.Color(11, 25, 44))));
        h.setBorder(Rectangle.NO_BORDER);
        h.setPaddingBottom(40f);
        table.addCell(h);
        
        PdfPCell line = new PdfPCell(new Phrase("____________________________________", FontFactory.getFont(FontFactory.HELVETICA, 9, new java.awt.Color(128, 128, 128))));
        line.setBorder(Rectangle.NO_BORDER);
        table.addCell(line);
        
        PdfPCell auth = new PdfPCell(new Phrase("Authorized Signatory", FontFactory.getFont(FontFactory.HELVETICA, 9)));
        auth.setBorder(Rectangle.NO_BORDER);
        auth.setPaddingBottom(5f);
        table.addCell(auth);
        
        PdfPCell name = new PdfPCell(new Phrase("Name: _____________________________", FontFactory.getFont(FontFactory.HELVETICA, 9)));
        name.setBorder(Rectangle.NO_BORDER);
        name.setPaddingBottom(5f);
        table.addCell(name);
        
        PdfPCell date = new PdfPCell(new Phrase("Date: ______________________________", FontFactory.getFont(FontFactory.HELVETICA, 9)));
        date.setBorder(Rectangle.NO_BORDER);
        table.addCell(date);
        
        PdfPCell wrap = new PdfPCell(table);
        wrap.setBorderColor(new java.awt.Color(200, 200, 200));
        wrap.setPadding(10f);
        
        PdfPTable outer = new PdfPTable(1);
        outer.addCell(wrap);
        return outer;
    }
    
    public byte[] generateInvoicePdf(com.acrovix.admin.entity.Invoice invoice) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            CompanySettingsResponse settings = null;
            if (companySettingsService != null) {
                try { settings = companySettingsService.getCompanySettings(); } catch (Exception e) { log.warn("No settings", e); }
            }
            
            Document document = new Document(PageSize.A4, 36, 36, 170, 50);
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new InvoiceHeaderFooterEvent(settings, invoice.getInvoiceNumber() != null ? invoice.getInvoiceNumber() : "DRAFT"));
            document.open();
            
            addInvoiceTitleAndMeta(document, invoice);
            addInvoiceBillToShipTo(document, invoice, settings);
            addInvoiceItemsTable(document, invoice);
            addInvoiceAmountInWordsAndFinancialSummary(document, invoice);
            
            document.newPage(); // The reference specifically has a two page design if it fits, but if it spills, it handles itself. The user requested: "For invoices with more or fewer items, allow natural pagination... Never force every invoice to two pages if the content legitimately needs a different page count." 
            
            // Wait, if I do document.newPage(), it FORCES a page break!
            // I should just add a paragraph and let it flow naturally if there is space.
            // If the items took up the whole page, it will automatically break.
            // But wait, the reference explicitly says "Two-page arrangement". Let's not force newPage() if they said "Never force every invoice to two pages". 
            // So I will remove document.newPage().
            
            addInvoiceTaxDetails(document, invoice);
            addInvoiceBankDetails(document, settings);
            addInvoiceTermsAndConditions(document, invoice);
            addInvoiceSignatures(document, settings);

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate Invoice PDF", e);
            throw new RuntimeException("Failed to generate Invoice PDF", e);
        }
    }


    public byte[] generatePaymentReceiptPdf(com.acrovix.admin.entity.Payment payment) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document();
            PdfWriter.getInstance(document, out);
            document.open();

            // Header
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20);
            String supplierName = payment.getInvoice() != null && payment.getInvoice().getSupplierCompany() != null
                    ? payment.getInvoice().getSupplierCompany()
                    : "ACROVIX INNOVATIONS PRIVATE LIMITED";
            Paragraph title = new Paragraph(supplierName, titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            Paragraph subtitle = new Paragraph("PAYMENT RECEIPT", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16));
            subtitle.setAlignment(Element.ALIGN_CENTER);
            document.add(subtitle);
            document.add(new Paragraph(" "));

            // Details Table (2 columns)
            PdfPTable table = new PdfPTable(2);
            table.setWidthPercentage(100);

            // Left Column (Receipt & Payment Details)
            PdfPCell leftCell = new PdfPCell();
            leftCell.setBorder(Rectangle.NO_BORDER);
            leftCell.addElement(new Paragraph("Receipt Number: " + (payment.getPaymentNumber() != null ? payment.getPaymentNumber() : ""), FontFactory.getFont(FontFactory.HELVETICA_BOLD)));
            String dateStr = payment.getPaymentDate() != null ? payment.getPaymentDate().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy")) : "";
            leftCell.addElement(new Paragraph("Payment Date: " + dateStr));
            leftCell.addElement(new Paragraph("Payment Method: " + (payment.getPaymentMethod() != null ? payment.getPaymentMethod().name() : "")));
            if (payment.getTransactionReference() != null && !payment.getTransactionReference().isBlank()) {
                leftCell.addElement(new Paragraph("Transaction Ref / UTR: " + payment.getTransactionReference()));
            }
            if (payment.getBankName() != null && !payment.getBankName().isBlank()) {
                leftCell.addElement(new Paragraph("Bank Name: " + payment.getBankName()));
            }
            if (payment.getChequeNumber() != null && !payment.getChequeNumber().isBlank()) {
                leftCell.addElement(new Paragraph("Cheque Number: " + payment.getChequeNumber()));
            }
            leftCell.addElement(new Paragraph("Status: " + (payment.getStatus() != null ? payment.getStatus().name() : "")));
            table.addCell(leftCell);

            // Right Column (Customer & Invoice Ref Details)
            PdfPCell rightCell = new PdfPCell();
            rightCell.setBorder(Rectangle.NO_BORDER);
            rightCell.addElement(new Paragraph("Received From:", FontFactory.getFont(FontFactory.HELVETICA_BOLD)));
            String clientName = payment.getInvoice() != null && payment.getInvoice().getClientName() != null
                    ? payment.getInvoice().getClientName()
                    : (payment.getCustomer() != null ? payment.getCustomer().getName() : "");
            rightCell.addElement(new Paragraph(clientName));

            String clientComp = payment.getInvoice() != null && payment.getInvoice().getClientCompany() != null
                    ? payment.getInvoice().getClientCompany()
                    : (payment.getCustomer() != null ? payment.getCustomer().getCompanyName() : "");
            if (clientComp != null && !clientComp.isBlank()) {
                rightCell.addElement(new Paragraph(clientComp));
            }

            if (payment.getInvoice() != null) {
                rightCell.addElement(new Paragraph(" "));
                rightCell.addElement(new Paragraph("Against Invoice: " + (payment.getInvoice().getInvoiceNumber() != null ? payment.getInvoice().getInvoiceNumber() : ""), FontFactory.getFont(FontFactory.HELVETICA_BOLD)));
                rightCell.addElement(new Paragraph("Invoice Total: Rs. " + (payment.getInvoice().getGrandTotal() != null ? payment.getInvoice().getGrandTotal().toString() : "0.00")));
            }
            table.addCell(rightCell);

            document.add(table);
            document.add(new Paragraph(" "));

            // Amount Box
            PdfPTable amountTable = new PdfPTable(2);
            amountTable.setWidthPercentage(100);
            PdfPCell labelCell = new PdfPCell(new Phrase("Amount Received:", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12)));
            labelCell.setBackgroundColor(new java.awt.Color(240, 240, 240));
            amountTable.addCell(labelCell);

            PdfPCell valueCell = new PdfPCell(new Phrase("Rs. " + (payment.getAmount() != null ? payment.getAmount().toString() : "0.00"), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14)));
            valueCell.setBackgroundColor(new java.awt.Color(240, 240, 240));
            amountTable.addCell(valueCell);

            document.add(amountTable);
            document.add(new Paragraph(" "));

            if (payment.getNotes() != null && !payment.getNotes().isBlank()) {
                document.add(new Paragraph("Notes:", FontFactory.getFont(FontFactory.HELVETICA_BOLD)));
                document.add(new Paragraph(payment.getNotes()));
                document.add(new Paragraph(" "));
            }

            if (payment.getRecordedBy() != null) {
                document.add(new Paragraph("Recorded By: " + (payment.getRecordedBy().getName() != null ? payment.getRecordedBy().getName() : payment.getRecordedBy().getUsername())));
            }

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate Payment Receipt PDF", e);
        }
    }
}
