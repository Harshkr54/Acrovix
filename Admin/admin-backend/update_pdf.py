import re

with open("src/main/java/com/acrovix/admin/service/PdfService.java", "r", encoding="utf-8") as f:
    content = f.read()

new_methods = """
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(PdfService.class);

    public byte[] generateQuotationPdf(Quotation quotation) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 36, 48);
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
        String compAddress = (settings != null && settings.getBillingAddress() != null) ? settings.getBillingAddress() : "3RD FLOOR, 956, VIGNESHWARA\\n6TH CLASS 1ST MAIN, Bengaluru\\nBengaluru Urban, KARNATAKA, 560060";
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

        leftHeader.addElement(new Paragraph(compAddress, regularFont));

        PdfPCell rightHeader = new PdfPCell();
        rightHeader.setBorder(Rectangle.NO_BORDER);
        rightHeader.setHorizontalAlignment(Element.ALIGN_RIGHT);
        Paragraph origRecPara = new Paragraph("ORIGINAL FOR RECIPIENT", headerBoldFont);
        origRecPara.setAlignment(Element.ALIGN_RIGHT);
        origRecPara.setSpacingAfter(10f);
        rightHeader.addElement(origRecPara);

        if (settings != null && settings.getLogoUrl() != null && !settings.getLogoUrl().isEmpty()) {
            try {
                Image logo = Image.getInstance(new java.net.URL(settings.getLogoUrl()));
                logo.scaleToFit(150, 50);
                logo.setAlignment(Element.ALIGN_RIGHT);
                rightHeader.addElement(logo);
            } catch(Exception e) {
                log.warn("Could not load company logo from URL: {}", settings.getLogoUrl(), e);
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
        custCell2.addElement(new Paragraph("Billing Address:", regularFont));
        if (!billAddress.isEmpty()) {
            custCell2.addElement(new Paragraph(billAddress, regularFont));
        }
        if (!shipAddress.isEmpty()) {
            custCell2.addElement(new Paragraph(" "));
            custCell2.addElement(new Paragraph("Shipping Address:", regularFont));
            custCell2.addElement(new Paragraph(shipAddress, regularFont));
        }
        custCell2.addElement(new Paragraph(" "));
        String ref = (quotation.getEnquiry() != null && quotation.getEnquiry().getReferenceId() != null ? quotation.getEnquiry().getReferenceId() : "");
        if (!ref.isEmpty()) {
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
            if ("rowNumber".equals(key)) widths[i] = 5f;
            else if ("description".equals(key) || "sku".equals(key)) widths[i] = 35f;
            else widths[i] = 12f;
        }
        table.setWidths(widths);

        for (com.acrovix.admin.entity.QuotationColumnConfig c : configs) {
            PdfPCell headerCell = new PdfPCell(new Phrase(c.getDisplayName(), headerBoldFont));
            headerCell.setBorderWidth(0);
            headerCell.setBorderWidthTop(1.5f);
            headerCell.setBorderWidthBottom(1.5f);
            headerCell.setBorderColor(new java.awt.Color(37, 99, 235)); 
            headerCell.setPaddingTop(5f);
            headerCell.setPaddingBottom(5f);
            if (!"rowNumber".equals(c.getColumnKey()) && !"description".equals(c.getColumnKey())) {
                headerCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            }
            table.addCell(headerCell);
        }

        int totalItems = 0;
        BigDecimal totalQty = BigDecimal.ZERO;
        BigDecimal overallTaxPct = BigDecimal.ZERO;

        if (quotation.getItems() != null) {
            int index = 1;
            totalItems = quotation.getItems().size();
            for (QuotationItem item : quotation.getItems()) {
                BigDecimal qty = item.getQuantity() != null ? item.getQuantity() : BigDecimal.ZERO;
                totalQty = totalQty.add(qty);
                BigDecimal unitPrice = item.getUnitPrice() != null ? item.getUnitPrice() : BigDecimal.ZERO;
                BigDecimal taxPct = item.getTaxPercent() != null ? item.getTaxPercent() : BigDecimal.ZERO;
                if (taxPct.compareTo(BigDecimal.ZERO) > 0) overallTaxPct = taxPct;

                BigDecimal netLine = qty.multiply(unitPrice);
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
                                if (item.getSku() != null && !item.getSku().isEmpty()) {
                                    val = item.getSku() + " :- " + val;
                                }
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
                                    val = taxAmt.toString() + "\\n(" + taxPct.toString() + "%)";
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
                    if (isRightAlign) {
                        cell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                    }

                    if (c.getColumnKey().equals("rowNumber")) {
                        cell.addElement(new Paragraph(val, regularFont));
                    } else if (c.getColumnKey().equals("description")) {
                        Paragraph desc = new Paragraph(val, regularFont);
                        cell.addElement(desc);
                    } else if (c.getColumnKey().equals("taxAmount")) {
                        Paragraph taxP = new Paragraph(val, regularFont);
                        taxP.setAlignment(Element.ALIGN_RIGHT);
                        cell.addElement(taxP);
                    } else {
                        Paragraph p = new Paragraph(val, regularFont);
                        p.setAlignment(Element.ALIGN_RIGHT);
                        cell.addElement(p);
                    }
                    table.addCell(cell);
                }
                index++;
            }
        }

        int emptyCols = colCount - 2;

        PdfPCell taxLabel = new PdfPCell(new Phrase("Taxable Amount", headerBoldFont));
        taxLabel.setColspan(emptyCols + 1);
        taxLabel.setBorderWidth(0);
        taxLabel.setHorizontalAlignment(Element.ALIGN_RIGHT);
        taxLabel.setPaddingTop(10f);
        table.addCell(taxLabel);

        String curSym = quotation.getCurrency() != null && quotation.getCurrency().name().equals("USD") ? "$" : "\u20B9";

        PdfPCell taxVal = new PdfPCell(new Phrase(curSym + (quotation.getSubtotal() != null ? quotation.getSubtotal().toString() : "0.00"), headerBoldFont));
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
        if (overallTaxPct.compareTo(BigDecimal.ZERO) > 0) {
            totalTaxLabel += " " + overallTaxPct.toString() + "%";
        } else {
            totalTaxLabel = "Total Tax";
        }

        PdfPCell igstLabel = new PdfPCell(new Phrase(totalTaxLabel, headerBoldFont)); 
        igstLabel.setColspan(emptyCols + 1);
        igstLabel.setBorderWidth(0);
        igstLabel.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(igstLabel);

        PdfPCell igstVal = new PdfPCell(new Phrase(curSym + (quotation.getTaxAmount() != null ? quotation.getTaxAmount().toString() : "0.00"), headerBoldFont));
        igstVal.setBorderWidth(0);
        igstVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(igstVal);

        PdfPCell gTotalLabel = new PdfPCell(new Phrase("Total", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14)));
        gTotalLabel.setColspan(emptyCols + 1);
        gTotalLabel.setBorderWidth(0);
        gTotalLabel.setBorderWidthBottom(1f);
        gTotalLabel.setHorizontalAlignment(Element.ALIGN_RIGHT);
        gTotalLabel.setPaddingBottom(5f);
        table.addCell(gTotalLabel);

        PdfPCell gTotalVal = new PdfPCell(new Phrase(curSym + (quotation.getGrandTotal() != null ? quotation.getGrandTotal().toString() : "0.00"), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14)));
        gTotalVal.setBorderWidth(0);
        gTotalVal.setBorderWidthBottom(1f);
        gTotalVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
        gTotalVal.setPaddingBottom(5f);
        table.addCell(gTotalVal);

        PdfPCell summaryCellLeft = new PdfPCell(new Phrase("Total Items / Qty : " + totalItems + " / " + totalQty, tinyFont));
        summaryCellLeft.setColspan(2);
        summaryCellLeft.setBorderWidth(0);
        summaryCellLeft.setBorderWidthBottom(1.5f);
        summaryCellLeft.setBorderColorBottom(new java.awt.Color(37, 99, 235));
        summaryCellLeft.setPaddingTop(5f);
        summaryCellLeft.setPaddingBottom(5f);
        table.addCell(summaryCellLeft);

        String currencyName = quotation.getCurrency() != null && quotation.getCurrency().name().equals("USD") ? "USD " : "INR ";
        String words = currencyName + (quotation.getGrandTotal() != null ? convertToIndianCurrency(quotation.getGrandTotal().toString()) : "Zero");
        PdfPCell summaryCellRight = new PdfPCell(new Phrase("Total amount (in words): " + words, tinyFont));
        summaryCellRight.setColspan(colCount - 2);
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
        bankCell.addElement(new Paragraph("Bank Details:", headerBoldFont));
        bankCell.addElement(new Paragraph(" "));

        String companyName = (settings != null && settings.getCompanyName() != null) ? settings.getCompanyName() : "ACROVIX INNOVATIONS PRIVATE LIMITED";
        String bBank = settings != null && settings.getBankName() != null ? settings.getBankName() : "";
        String bHolder = companyName;
        String bAcc = settings != null && settings.getBankAccountNumber() != null ? settings.getBankAccountNumber() : "";
        String bIfsc = settings != null && settings.getBankIfsc() != null ? settings.getBankIfsc() : "";
        String bBranch = settings != null && settings.getBankBranch() != null ? settings.getBankBranch() : "";

        PdfPTable bankInfo = new PdfPTable(2);
        bankInfo.setWidthPercentage(100);
        bankInfo.setWidths(new float[]{30f, 70f});

        addBankRow(bankInfo, "Bank:", bBank, regularFont, headerBoldFont);
        addBankRow(bankInfo, "Account Holder:", bHolder, regularFont, headerBoldFont);
        addBankRow(bankInfo, "Account #:", bAcc, regularFont, headerBoldFont);
        addBankRow(bankInfo, "IFSC Code:", bIfsc, regularFont, headerBoldFont);
        addBankRow(bankInfo, "Branch:", bBranch, regularFont, headerBoldFont);

        bankCell.addElement(bankInfo);

        PdfPCell sigCell = new PdfPCell();
        sigCell.setBorder(Rectangle.NO_BORDER);
        sigCell.setHorizontalAlignment(Element.ALIGN_RIGHT);

        Paragraph sigCompany = new Paragraph("For " + companyName, regularFont);
        sigCompany.setAlignment(Element.ALIGN_RIGHT);
        sigCell.addElement(sigCompany);

        sigCell.addElement(new Paragraph("\\n\\n\\n")); 

        Paragraph authSig = new Paragraph("Authorized Signatory", regularFont);
        authSig.setAlignment(Element.ALIGN_RIGHT);
        sigCell.addElement(authSig);

        bottomTable.addCell(bankCell);
        bottomTable.addCell(sigCell);
        document.add(bottomTable);
        document.add(new Paragraph("\\n"));
    }

    private void addNotesAndTerms(Document document, Quotation quotation, CompanySettingsResponse settings) throws DocumentException {
        Font headerBoldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
        Font regularFont = FontFactory.getFont(FontFactory.HELVETICA, 9);

        boolean hasQuotationTerms = quotation.getTermsAndConditions() != null && !quotation.getTermsAndConditions().isBlank();
        boolean hasDefaultTerms = settings != null && settings.getDefaultTermsAndConditions() != null && !settings.getDefaultTermsAndConditions().isBlank();

        if (hasQuotationTerms || hasDefaultTerms) {
            document.add(new Paragraph("Notes:", headerBoldFont));
            document.add(new Paragraph("Terms & Conditions:-", regularFont));
            
            String terms = hasQuotationTerms ? quotation.getTermsAndConditions() : settings.getDefaultTermsAndConditions();
            String[] lines = terms.split("\\n");
            for(String line : lines) {
                if(!line.trim().isEmpty()) {
                    document.add(new Paragraph(line.trim(), regularFont));
                }
            }
        }
    }
"""

start_marker = "public byte[] generateQuotationPdf(Quotation quotation) {"
end_marker = "class QuotationFooterEvent extends PdfPageEventHelper {"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

final_content = content[:start_idx] + new_methods + "\n    " + content[end_idx:]

with open("src/main/java/com/acrovix/admin/service/PdfService.java", "w", encoding="utf-8") as f:
    f.write(final_content)

print("Updated PdfService.java")
