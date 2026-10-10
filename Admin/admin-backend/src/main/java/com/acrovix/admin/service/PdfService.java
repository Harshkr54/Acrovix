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
            addBankDetailsAndSignatory(document, settings);
            addNotesAndTerms(document, quotation, settings);

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

        String companyName = (settings != null && settings.getCompanyName() != null) ? settings.getCompanyName() : "ACROVIX INNOVATIONS PRIVATE LIMITED";
        String gstin = (settings != null && settings.getGstin() != null) ? settings.getGstin() : "29ABFCA9588C1Z8";
        String compAddress = (settings != null && settings.getBillingAddress() != null) ? settings.getBillingAddress() : "3RD FLOOR, 956, VIGNESHWARA\n6TH CLASS 1ST MAIN, Bengaluru\nBengaluru Urban, KARNATAKA, 560060";
        if ((compAddress == null || compAddress.isEmpty()) && settings != null && settings.getRegisteredAddress() != null) {
            compAddress = settings.getRegisteredAddress();
        }

        PdfPTable topTable = new PdfPTable(2);
        topTable.setWidthPercentage(100);
        topTable.setWidths(new float[]{60f, 40f});

        PdfPCell leftHeader = new PdfPCell();
        leftHeader.setBorder(Rectangle.NO_BORDER);
        Paragraph quotLabel = new Paragraph("QUOTATION", blueTitleFont);
        quotLabel.setSpacingAfter(8f);
        leftHeader.addElement(quotLabel);
        leftHeader.addElement(new Paragraph(companyName, compNameFont));

        Paragraph gstinPara = new Paragraph();
        gstinPara.add(new Chunk("GSTIN ", regularFont));
        gstinPara.add(new Chunk(gstin, headerBoldFont));
        leftHeader.addElement(gstinPara);

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

        leftHeader.addElement(new Paragraph(compAddress, regularFont));

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

        PdfPTable custTable = new PdfPTable(2);
        custTable.setWidthPercentage(100);
        custTable.setWidths(new float[]{50f, 50f});

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

        PdfPCell custCell1 = new PdfPCell(); custCell1.setBorder(Rectangle.NO_BORDER);
        custCell1.addElement(new Paragraph("Customer Details:", regularFont));
        custCell1.addElement(new Paragraph(custCompany, headerBoldFont));
        if (!custGstin.isEmpty()) {
            Paragraph gPara = new Paragraph();
            gPara.add(new Chunk("GSTIN: ", regularFont));
            gPara.add(new Chunk(custGstin, headerBoldFont));
            custCell1.addElement(gPara);
        }
        if (!custPhone.isEmpty()) {
            custCell1.addElement(new Paragraph("Ph: " + custPhone, regularFont));
        }
        if (!custEmail.isEmpty()) {
            custCell1.addElement(new Paragraph("Email: " + custEmail, regularFont));
        }
        custCell1.addElement(new Paragraph(" "));
        custCell1.addElement(new Paragraph("Place of Supply:", regularFont));
        if (!state.isEmpty()) {
            custCell1.addElement(new Paragraph(state, headerBoldFont));
        }

        PdfPCell custCell2 = new PdfPCell(); custCell2.setBorder(Rectangle.NO_BORDER);
        if (!billAddress.isEmpty()) {
            custCell2.addElement(new Paragraph("Billing Address:", regularFont));
            custCell2.addElement(new Paragraph(billAddress, regularFont));
        }
        if (!shipAddress.isEmpty()) {
            if (!billAddress.isEmpty()) custCell2.addElement(new Paragraph(" "));
            custCell2.addElement(new Paragraph("Shipping Address:", regularFont));
            custCell2.addElement(new Paragraph(shipAddress, regularFont));
        }
        
        String ref = (quotation.getEnquiry() != null && quotation.getEnquiry().getReferenceId() != null ? quotation.getEnquiry().getReferenceId() : "");
        if (!ref.isEmpty()) {
            if (!billAddress.isEmpty() || !shipAddress.isEmpty()) custCell2.addElement(new Paragraph(" "));
            Paragraph refPara = new Paragraph();
            refPara.add(new Chunk("Reference: ", regularFont));
            refPara.add(new Chunk(ref, regularFont));
            custCell2.addElement(refPara);
        }

        custTable.addCell(custCell1);
        custTable.addCell(custCell2);
        document.add(custTable);
        document.add(new Paragraph(" "));
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

        for (com.acrovix.admin.entity.QuotationColumnConfig c : configs) {
            String dispName = c.getDisplayName();
            if (dispName != null && dispName.toUpperCase().contains("TAX AMOUNT")) {
                dispName = "TAX AMT.";
            }
            PdfPCell headerCell = new PdfPCell(new Phrase(dispName, headerBoldFont));
            headerCell.setBorderWidth(0);
            headerCell.setBorderWidthTop(1.5f);
            headerCell.setBorderWidthBottom(1.5f);
            headerCell.setBorderColor(new java.awt.Color(37, 99, 235)); 
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
                    cell.setBorderWidth(0);
                    cell.setBorderWidthBottom(0.5f);
                    cell.setBorderColorBottom(new java.awt.Color(220, 220, 220));
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

                    Paragraph p = new Paragraph(val, regularFont);
                    p.setAlignment(align);
                    cell.addElement(p);
                    table.addCell(cell);
                }
                index++;
            }
        }

        int emptyCols = colCount - 2;
        if (emptyCols < 1) emptyCols = 1;

        PdfPCell taxLabel = new PdfPCell(new Phrase("Taxable Amount", headerBoldFont));
        taxLabel.setColspan(emptyCols);
        taxLabel.setBorderWidth(0);
        taxLabel.setHorizontalAlignment(Element.ALIGN_RIGHT);
        taxLabel.setPaddingTop(10f);
        table.addCell(taxLabel);

        String curSym = quotation.getCurrency() != null && quotation.getCurrency().name().equals("USD") ? "$" : "₹";

        PdfPCell taxVal = new PdfPCell(new Phrase(curSym + (quotation.getSubtotal() != null ? quotation.getSubtotal().toString() : "0.00"), headerBoldFont));
        taxVal.setColspan(2);
        taxVal.setBorderWidth(0);
        taxVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
        taxVal.setPaddingTop(10f);
        table.addCell(taxVal);

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
            totalTaxLabel += " " + taxRates.iterator().next().toString() + "%";
        } else if (taxRates.size() > 1) {
            totalTaxLabel += " — Multiple Rates";
        } else {
            totalTaxLabel = "Total Tax";
        }

        PdfPCell igstLabel = new PdfPCell(new Phrase(totalTaxLabel, headerBoldFont)); 
        igstLabel.setColspan(emptyCols);
        igstLabel.setBorderWidth(0);
        igstLabel.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(igstLabel);

        PdfPCell igstVal = new PdfPCell(new Phrase(curSym + (quotation.getTaxAmount() != null ? quotation.getTaxAmount().toString() : "0.00"), headerBoldFont));
        igstVal.setColspan(2);
        igstVal.setBorderWidth(0);
        igstVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(igstVal);

        PdfPCell gTotalLabel = new PdfPCell(new Phrase("Total", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12)));
        gTotalLabel.setColspan(emptyCols);
        gTotalLabel.setBorderWidth(0);
        gTotalLabel.setBorderWidthBottom(1f);
        gTotalLabel.setHorizontalAlignment(Element.ALIGN_RIGHT);
        gTotalLabel.setPaddingBottom(5f);
        table.addCell(gTotalLabel);

        PdfPCell gTotalVal = new PdfPCell(new Phrase(curSym + (quotation.getGrandTotal() != null ? quotation.getGrandTotal().toString() : "0.00"), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12)));
        gTotalVal.setColspan(2);
        gTotalVal.setBorderWidth(0);
        gTotalVal.setBorderWidthBottom(1f);
        gTotalVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
        gTotalVal.setPaddingBottom(5f);
        gTotalVal.setNoWrap(true);
        table.addCell(gTotalVal);

        int leftColspan = Math.min(4, colCount - 1);
        int rightColspan = colCount - leftColspan;
        
        PdfPCell summaryCellLeft = new PdfPCell(new Phrase("Total Items: " + totalItems + "\nTotal Quantity: " + totalQty, tinyFont));
        summaryCellLeft.setColspan(leftColspan);
        summaryCellLeft.setBorderWidth(0);
        summaryCellLeft.setBorderWidthBottom(1.5f);
        summaryCellLeft.setBorderColorBottom(new java.awt.Color(37, 99, 235));
        summaryCellLeft.setPaddingTop(5f);
        summaryCellLeft.setPaddingBottom(5f);
        table.addCell(summaryCellLeft);

        String currencyCode = quotation.getCurrency() != null ? quotation.getCurrency().name() : "INR";
        String currencyName = "USD".equalsIgnoreCase(currencyCode) ? "USD " : "INR ";
        String words = currencyName + (quotation.getGrandTotal() != null ? convertAmountToWords(quotation.getGrandTotal().toString(), currencyCode) : ("Zero" + ("USD".equalsIgnoreCase(currencyCode) ? " Dollars Only" : " Rupees Only")));
        PdfPCell summaryCellRight = new PdfPCell(new Phrase("Total amount (in words): " + words, tinyFont));
        summaryCellRight.setColspan(rightColspan);
        summaryCellRight.setBorderWidth(0);
        summaryCellRight.setBorderWidthBottom(1.5f);
        summaryCellRight.setBorderColorBottom(new java.awt.Color(37, 99, 235));
        summaryCellRight.setHorizontalAlignment(Element.ALIGN_RIGHT);
        summaryCellRight.setPaddingTop(5f);
        summaryCellRight.setPaddingBottom(5f);
        table.addCell(summaryCellRight);

        document.add(table);
        document.add(new Paragraph(" "));
    }

    private void addBankDetailsAndSignatory(Document document, CompanySettingsResponse settings) throws DocumentException {
        Font headerBoldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
        Font regularFont = FontFactory.getFont(FontFactory.HELVETICA, 9);

        PdfPTable bottomTable = new PdfPTable(2);
        bottomTable.setWidthPercentage(100);
        bottomTable.setWidths(new float[]{50f, 50f});

        PdfPCell bankCell = new PdfPCell();
        bankCell.setBorder(Rectangle.NO_BORDER);

        String companyName = (settings != null && settings.getCompanyName() != null) ? settings.getCompanyName() : "ACROVIX INNOVATIONS PRIVATE LIMITED";
        String bBank = settings != null && settings.getBankName() != null ? settings.getBankName() : "";
        String bHolder = companyName;
        String bAcc = settings != null && settings.getBankAccountNumber() != null ? settings.getBankAccountNumber() : "";
        String bIfsc = settings != null && settings.getBankIfsc() != null ? settings.getBankIfsc() : "";
        String bBranch = settings != null && settings.getBankBranch() != null ? settings.getBankBranch() : "";

        boolean hasBankInfo = !bBank.trim().isEmpty() || !bAcc.trim().isEmpty() || !bIfsc.trim().isEmpty();

        if (hasBankInfo) {
            bankCell.addElement(new Paragraph("Bank Details:", headerBoldFont));
            bankCell.addElement(new Paragraph(" "));

            PdfPTable bankInfo = new PdfPTable(2);
            bankInfo.setWidthPercentage(100);
            bankInfo.setWidths(new float[]{30f, 70f});

            if (!bBank.trim().isEmpty()) addBankRow(bankInfo, "Bank:", bBank, regularFont, headerBoldFont);
            addBankRow(bankInfo, "Account Holder:", bHolder, regularFont, headerBoldFont);
            if (!bAcc.trim().isEmpty()) addBankRow(bankInfo, "Account #:", bAcc, regularFont, headerBoldFont);
            if (!bIfsc.trim().isEmpty()) addBankRow(bankInfo, "IFSC Code:", bIfsc, regularFont, headerBoldFont);
            if (!bBranch.trim().isEmpty()) addBankRow(bankInfo, "Branch:", bBranch, regularFont, headerBoldFont);

            bankCell.addElement(bankInfo);
        }

        PdfPCell sigCell = new PdfPCell();
        sigCell.setBorder(Rectangle.NO_BORDER);
        sigCell.setHorizontalAlignment(Element.ALIGN_RIGHT);

        Paragraph sigCompany = new Paragraph("For " + companyName, regularFont);
        sigCompany.setAlignment(Element.ALIGN_RIGHT);
        sigCell.addElement(sigCompany);

        sigCell.addElement(new Paragraph("\n\n\n")); 

        Paragraph authSig = new Paragraph("Authorized Signatory", regularFont);
        authSig.setAlignment(Element.ALIGN_RIGHT);
        sigCell.addElement(authSig);

        bottomTable.addCell(bankCell);
        bottomTable.addCell(sigCell);
        document.add(bottomTable);
        document.add(new Paragraph("\n"));
    }

    private void addNotesAndTerms(Document document, Quotation quotation, CompanySettingsResponse settings) throws DocumentException {
        Font regularFont = FontFactory.getFont(FontFactory.HELVETICA, 9);
        Font termsHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, new java.awt.Color(37, 99, 235));

        boolean hasQuotationTerms = quotation.getTermsAndConditions() != null && !quotation.getTermsAndConditions().isBlank();
        boolean hasDefaultTerms = settings != null && settings.getDefaultTermsAndConditions() != null && !settings.getDefaultTermsAndConditions().isBlank();

        if (hasQuotationTerms || hasDefaultTerms) {
            Paragraph termsHeader = new Paragraph("Terms & Conditions", termsHeaderFont);
            termsHeader.setSpacingBefore(15f);
            termsHeader.setSpacingAfter(5f);
            document.add(termsHeader);
            
            String terms = hasQuotationTerms ? quotation.getTermsAndConditions() : settings.getDefaultTermsAndConditions();
            String[] lines = terms.split("\n");
            for(String line : lines) {
                if(!line.trim().isEmpty()) {
                    document.add(new Paragraph(line.trim(), regularFont));
                }
            }
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


    public byte[] generateInvoicePdf(com.acrovix.admin.entity.Invoice invoice) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document();
            PdfWriter.getInstance(document, out);
            document.open();

            // Header
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20);
            Paragraph title = new Paragraph(invoice.getSupplierCompany() != null ? invoice.getSupplierCompany() : "ACROVIX INNOVATIONS PRIVATE LIMITED", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);
            
            String invoiceTypeName = invoice.getInvoiceType() == com.acrovix.admin.entity.InvoiceType.PROFORMA ? "PROFORMA INVOICE" : "TAX INVOICE";
            Paragraph subtitle = new Paragraph(invoiceTypeName, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16));
            subtitle.setAlignment(Element.ALIGN_CENTER);
            document.add(subtitle);
            
            document.add(new Paragraph(" "));

            // Details Table (2 columns: Left for Supplier/Invoice details, Right for Client details)
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            
            // Left Column (Supplier & Invoice Info)
            PdfPCell leftCell = new PdfPCell();
            leftCell.setBorder(Rectangle.NO_BORDER);
            leftCell.addElement(new Paragraph("Supplier Details:", FontFactory.getFont(FontFactory.HELVETICA_BOLD)));
            leftCell.addElement(new Paragraph(invoice.getSupplierAddress() != null ? invoice.getSupplierAddress() : ""));
            leftCell.addElement(new Paragraph("GSTIN: " + (invoice.getSupplierGstin() != null ? invoice.getSupplierGstin() : "")));
            leftCell.addElement(new Paragraph("State: " + (invoice.getSupplierState() != null ? invoice.getSupplierState() : "")));
            leftCell.addElement(new Paragraph(" "));
            leftCell.addElement(new Paragraph("Invoice No: " + (invoice.getInvoiceNumber() != null ? invoice.getInvoiceNumber() : "DRAFT"), FontFactory.getFont(FontFactory.HELVETICA_BOLD)));
            leftCell.addElement(new Paragraph("Invoice Date: " + (invoice.getInvoiceDate() != null ? invoice.getInvoiceDate().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy")) : "")));
            leftCell.addElement(new Paragraph("Due Date: " + (invoice.getDueDate() != null ? invoice.getDueDate().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy")) : "")));
            if (invoice.getPurchaseOrder() != null && invoice.getPurchaseOrder().getPoNumber() != null) {
                leftCell.addElement(new Paragraph("PO Ref: " + invoice.getPurchaseOrder().getPoNumber()));
            }
            if (invoice.getQuotation() != null && invoice.getQuotation().getQuotationNumber() != null) {
                leftCell.addElement(new Paragraph("Quote Ref: " + invoice.getQuotation().getQuotationNumber()));
            }
            headerTable.addCell(leftCell);
            
            // Right Column (Client Info)
            PdfPCell rightCell = new PdfPCell();
            rightCell.setBorder(Rectangle.NO_BORDER);
            rightCell.addElement(new Paragraph("Billed To:", FontFactory.getFont(FontFactory.HELVETICA_BOLD)));
            rightCell.addElement(new Paragraph(invoice.getClientName() != null ? invoice.getClientName() : ""));
            if (invoice.getClientCompany() != null && !invoice.getClientCompany().isBlank()) {
                rightCell.addElement(new Paragraph(invoice.getClientCompany()));
            }
            rightCell.addElement(new Paragraph(invoice.getClientAddress() != null ? invoice.getClientAddress() : ""));
            rightCell.addElement(new Paragraph("Email: " + (invoice.getClientEmail() != null ? invoice.getClientEmail() : "")));
            if (invoice.getClientPhone() != null && !invoice.getClientPhone().isBlank()) {
                rightCell.addElement(new Paragraph("Phone: " + invoice.getClientPhone()));
            }
            rightCell.addElement(new Paragraph("GSTIN: " + (invoice.getClientGstin() != null ? invoice.getClientGstin() : "")));
            rightCell.addElement(new Paragraph("Place of Supply: " + (invoice.getPlaceOfSupply() != null ? invoice.getPlaceOfSupply() : "")));
            headerTable.addCell(rightCell);
            
            document.add(headerTable);
            document.add(new Paragraph(" "));

            // Items Table
            boolean showIgst = invoice.getIgstAmount() != null && invoice.getIgstAmount().compareTo(BigDecimal.ZERO) > 0;
            
            int numCols = showIgst ? 9 : 10;
            PdfPTable table = new PdfPTable(numCols);
            table.setWidthPercentage(100);
            
            String[] headers = showIgst ? 
                new String[]{"S.No", "Description", "HSN/SAC", "Qty", "Price", "Discount", "Taxable", "IGST", "Total"} :
                new String[]{"S.No", "Description", "HSN/SAC", "Qty", "Price", "Discount", "Taxable", "CGST", "SGST", "Total"};
                
            for (String header : headers) {
                PdfPCell headerCell = new PdfPCell(new Phrase(header, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10)));
                headerCell.setBackgroundColor(new java.awt.Color(240, 240, 240));
                table.addCell(headerCell);
            }

            if (invoice.getItems() != null) {
                int index = 1;
                for (com.acrovix.admin.entity.InvoiceItem item : invoice.getItems()) {
                    table.addCell(new Phrase(String.valueOf(index++), FontFactory.getFont(FontFactory.HELVETICA, 9)));
                    table.addCell(new Phrase(item.getDescription() != null ? item.getDescription() : "", FontFactory.getFont(FontFactory.HELVETICA, 9)));
                    table.addCell(new Phrase(item.getHsnSac() != null ? item.getHsnSac() : "", FontFactory.getFont(FontFactory.HELVETICA, 9)));
                    table.addCell(new Phrase(item.getQuantity() != null ? item.getQuantity().toString() : "0", FontFactory.getFont(FontFactory.HELVETICA, 9)));
                    table.addCell(new Phrase(item.getListPrice() != null ? item.getListPrice().toString() : "0.00", FontFactory.getFont(FontFactory.HELVETICA, 9)));
                    table.addCell(new Phrase(item.getDiscountPercent() != null ? item.getDiscountPercent().toString() + "%" : "0%", FontFactory.getFont(FontFactory.HELVETICA, 9)));
                    table.addCell(new Phrase(item.getTaxableAmount() != null ? item.getTaxableAmount().toString() : "0.00", FontFactory.getFont(FontFactory.HELVETICA, 9)));
                    
                    if (showIgst) {
                        table.addCell(new Phrase(item.getIgstAmount() != null ? item.getIgstAmount().toString() : "0.00", FontFactory.getFont(FontFactory.HELVETICA, 9)));
                    } else {
                        table.addCell(new Phrase(item.getCgstAmount() != null ? item.getCgstAmount().toString() : "0.00", FontFactory.getFont(FontFactory.HELVETICA, 9)));
                        table.addCell(new Phrase(item.getSgstAmount() != null ? item.getSgstAmount().toString() : "0.00", FontFactory.getFont(FontFactory.HELVETICA, 9)));
                    }
                    
                    table.addCell(new Phrase(item.getLineTotal() != null ? item.getLineTotal().toString() : "0.00", FontFactory.getFont(FontFactory.HELVETICA, 9)));
                }
            }
            document.add(table);
            document.add(new Paragraph(" "));

            // Totals
            PdfPTable totalsTable = new PdfPTable(2);
            totalsTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
            
            totalsTable.addCell("Taxable Amount:");
            totalsTable.addCell(invoice.getTaxableAmount() != null ? invoice.getTaxableAmount().toString() : "0.00");
            if (showIgst) {
                totalsTable.addCell("IGST:");
                totalsTable.addCell(invoice.getIgstAmount() != null ? invoice.getIgstAmount().toString() : "0.00");
            } else {
                totalsTable.addCell("CGST:");
                totalsTable.addCell(invoice.getCgstAmount() != null ? invoice.getCgstAmount().toString() : "0.00");
                totalsTable.addCell("SGST:");
                totalsTable.addCell(invoice.getSgstAmount() != null ? invoice.getSgstAmount().toString() : "0.00");
            }
            totalsTable.addCell(new Phrase("Grand Total:", FontFactory.getFont(FontFactory.HELVETICA_BOLD)));
            totalsTable.addCell(new Phrase(invoice.getGrandTotal() != null ? invoice.getGrandTotal().toString() : "0.00", FontFactory.getFont(FontFactory.HELVETICA_BOLD)));
            
            document.add(totalsTable);
            document.add(new Paragraph(" "));
            
            if (invoice.getAmountInWords() != null && !invoice.getAmountInWords().isBlank()) {
                document.add(new Paragraph("Amount in Words:", FontFactory.getFont(FontFactory.HELVETICA_BOLD)));
                document.add(new Paragraph(invoice.getAmountInWords()));
                document.add(new Paragraph(" "));
            }
            
            if (invoice.getPaymentTerms() != null && !invoice.getPaymentTerms().isBlank()) {
                document.add(new Paragraph("Payment Terms:", FontFactory.getFont(FontFactory.HELVETICA_BOLD)));
                document.add(new Paragraph(invoice.getPaymentTerms()));
                document.add(new Paragraph(" "));
            }
            
            if (invoice.getTermsAndConditions() != null && !invoice.getTermsAndConditions().isBlank()) {
                document.add(new Paragraph("Terms & Conditions:", FontFactory.getFont(FontFactory.HELVETICA_BOLD)));
                document.add(new Paragraph(invoice.getTermsAndConditions()));
            }

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
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
