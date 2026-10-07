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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;

@Service
public class PdfService {

    @Autowired(required = false)
    private CompanySettingsService companySettingsService;

    public byte[] generateQuotationPdf(Quotation quotation) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 36, 48);
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new QuotationFooterEvent());
            document.open();

            Font blueTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, new java.awt.Color(37, 99, 235));
            Font compNameFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            Font headerBoldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
            Font regularFont = FontFactory.getFont(FontFactory.HELVETICA, 9);
            Font tinyFont = FontFactory.getFont(FontFactory.HELVETICA, 8);

            CompanySettingsResponse settings = companySettingsService != null ? companySettingsService.getCompanySettings() : null;
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
            gstinPara.add(new Chunk("GSTIN ", headerBoldFont));
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
                } catch(Exception ignored) {}
            }
            
            topTable.addCell(leftHeader);
            topTable.addCell(rightHeader);
            document.add(topTable);
            document.add(new Paragraph(" "));
            
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
            
            PdfPTable custTable = new PdfPTable(3);
            custTable.setWidthPercentage(100);
            
            String custCompany = quotation.getClientCompany() != null && !quotation.getClientCompany().isEmpty() ? quotation.getClientCompany() : quotation.getClientName();
            String custPhone = quotation.getClientPhone() != null ? quotation.getClientPhone() : "";
            String billAddress = "";
            String state = "";
            if (quotation.getCustomer() != null) {
                billAddress = quotation.getCustomer().getBillingAddress() != null ? quotation.getCustomer().getBillingAddress() : "";
                state = quotation.getCustomer().getState() != null ? quotation.getCustomer().getState() : "";
            }
            
            PdfPCell custCell1 = new PdfPCell(); custCell1.setBorder(Rectangle.NO_BORDER);
            custCell1.addElement(new Paragraph("Customer Details:", regularFont));
            custCell1.addElement(new Paragraph(custCompany, headerBoldFont));
            if (!custPhone.isEmpty()) {
                custCell1.addElement(new Paragraph("Ph: " + custPhone, regularFont));
            }
            custCell1.addElement(new Paragraph(" "));
            custCell1.addElement(new Paragraph("Place of Supply:", regularFont));
            custCell1.addElement(new Paragraph(state, headerBoldFont));
            
            PdfPCell custCell2 = new PdfPCell(); custCell2.setBorder(Rectangle.NO_BORDER);
            custCell2.setColspan(2);
            custCell2.addElement(new Paragraph("Billing Address:", regularFont));
            if (!billAddress.isEmpty()) {
                custCell2.addElement(new Paragraph(billAddress, regularFont));
            }
            custCell2.addElement(new Paragraph(" "));
            custCell2.addElement(new Paragraph("Reference: " + (quotation.getEnquiry() != null && quotation.getEnquiry().getReferenceId() != null ? quotation.getEnquiry().getReferenceId() : ""), regularFont));
            
            custTable.addCell(custCell1);
            custTable.addCell(custCell2);
            document.add(custTable);
            document.add(new Paragraph(" "));
            
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
            
            if (quotation.getItems() != null) {
                int index = 1;
                totalItems = quotation.getItems().size();
                for (QuotationItem item : quotation.getItems()) {
                    BigDecimal qty = item.getQuantity() != null ? item.getQuantity() : BigDecimal.ZERO;
                    totalQty = totalQty.add(qty);
                    BigDecimal unitPrice = item.getUnitPrice() != null ? item.getUnitPrice() : BigDecimal.ZERO;
                    BigDecimal taxPct = item.getTaxPercent() != null ? item.getTaxPercent() : BigDecimal.ZERO;
                    
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
                                case "description": val = item.getDescription() != null ? item.getDescription() : ""; break;
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
                        cell.setBorderColorBottom(new java.awt.Color(200, 200, 200));
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
            taxLabel.setPaddingTop(5f);
            table.addCell(taxLabel);
            
            String curSym = quotation.getCurrency() != null && quotation.getCurrency().name().equals("USD") ? "$" : "\u20B9";
            
            PdfPCell taxVal = new PdfPCell(new Phrase(curSym + (quotation.getSubtotal() != null ? quotation.getSubtotal().toString() : "0.00"), headerBoldFont));
            taxVal.setBorderWidth(0);
            taxVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
            taxVal.setPaddingTop(5f);
            table.addCell(taxVal);
            
            PdfPCell igstLabel = new PdfPCell(new Phrase("IGST 18.0%", headerBoldFont)); 
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
            table.addCell(summaryCellLeft);
            
            String words = "INR " + (quotation.getGrandTotal() != null ? convertToIndianCurrency(quotation.getGrandTotal().toString()) : "Zero");
            PdfPCell summaryCellRight = new PdfPCell(new Phrase("Total amount (in words): " + words, tinyFont));
            summaryCellRight.setColspan(colCount - 2);
            summaryCellRight.setBorderWidth(0);
            summaryCellRight.setBorderWidthBottom(1.5f);
            summaryCellRight.setBorderColorBottom(new java.awt.Color(37, 99, 235));
            summaryCellRight.setHorizontalAlignment(Element.ALIGN_RIGHT);
            table.addCell(summaryCellRight);
            
            document.add(table);
            document.add(new Paragraph(" "));
            
            PdfPTable bottomTable = new PdfPTable(2);
            bottomTable.setWidthPercentage(100);
            bottomTable.setWidths(new float[]{50f, 50f});
            
            PdfPCell bankCell = new PdfPCell();
            bankCell.setBorder(Rectangle.NO_BORDER);
            bankCell.addElement(new Paragraph("Bank Details:", headerBoldFont));
            bankCell.addElement(new Paragraph(" "));
            
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
            
            sigCell.addElement(new Paragraph("\n\n\n")); 
            
            Paragraph authSig = new Paragraph("Authorized Signatory", regularFont);
            authSig.setAlignment(Element.ALIGN_RIGHT);
            sigCell.addElement(authSig);
            
            bottomTable.addCell(bankCell);
            bottomTable.addCell(sigCell);
            document.add(bottomTable);
            
            document.add(new Paragraph("\n"));
            
            if (quotation.getTermsAndConditions() != null && !quotation.getTermsAndConditions().isBlank()) {
                document.add(new Paragraph("Notes:", headerBoldFont));
                document.add(new Paragraph("Terms & Conditions:-", regularFont));
                
                String[] lines = quotation.getTermsAndConditions().split("\n");
                for(String line : lines) {
                    if(!line.trim().isEmpty()) {
                        document.add(new Paragraph(line.trim(), regularFont));
                    }
                }
            } else if (settings != null && settings.getDefaultTermsAndConditions() != null && !settings.getDefaultTermsAndConditions().isBlank()) {
                document.add(new Paragraph("Notes:", headerBoldFont));
                document.add(new Paragraph("Terms & Conditions:-", regularFont));
                String[] lines = settings.getDefaultTermsAndConditions().split("\n");
                for(String line : lines) {
                    if(!line.trim().isEmpty()) {
                        document.add(new Paragraph(line.trim(), regularFont));
                    }
                }
            }
            
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF", e);
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
    
    private static String convertToIndianCurrency(String num) {
        try {
            long number = (long) Double.parseDouble(num);
            if (number == 0) { return "Zero"; }
            return convertNumberToWords(number) + " Rupees Only";
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
            Document document = new Document();
            PdfWriter.getInstance(document, out);
            document.open();

            // Header
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 24);
            Paragraph title = new Paragraph("ACROVIX INNOVATIONS PRIVATE LIMITED", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);
            
            document.add(new Paragraph("PURCHASE ORDER", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16)));
            document.add(new Paragraph("PO Number: " + (po.getPoNumber() != null ? po.getPoNumber() : "")));
            String createdDateStr = po.getPoDate() != null ? po.getPoDate().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy")) : "";
            document.add(new Paragraph("PO Date: " + createdDateStr));
            document.add(new Paragraph("Client PO Number: " + (po.getClientPoNumber() != null ? po.getClientPoNumber() : "N/A")));
            document.add(new Paragraph(" "));

            // Client Info (from Quotation)
            if (po.getQuotation() != null) {
                document.add(new Paragraph("To: " + (po.getQuotation().getClientName() != null ? po.getQuotation().getClientName() : "")));
                if (po.getQuotation().getClientCompany() != null && !po.getQuotation().getClientCompany().isBlank()) {
                    document.add(new Paragraph(po.getQuotation().getClientCompany()));
                }
                document.add(new Paragraph("Email: " + (po.getQuotation().getClientEmail() != null ? po.getQuotation().getClientEmail() : "")));
                if (po.getQuotation().getClientPhone() != null && !po.getQuotation().getClientPhone().isBlank()) {
                    document.add(new Paragraph("Phone: " + po.getQuotation().getClientPhone()));
                }
                document.add(new Paragraph("Source Quotation: " + po.getQuotation().getQuotationNumber()));
            }
            document.add(new Paragraph(" "));

            // PO Details
            document.add(new Paragraph("PO Value: Rs. " + (po.getPoValue() != null ? po.getPoValue().toString() : "0.00"), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12)));
            document.add(new Paragraph("Status: " + po.getStatus().name()));
            document.add(new Paragraph("Received Via: " + (po.getReceivedVia() != null ? po.getReceivedVia().name() : "N/A")));
            
            if (po.getRemarks() != null && !po.getRemarks().isBlank()) {
                document.add(new Paragraph(" "));
                document.add(new Paragraph("Remarks:", FontFactory.getFont(FontFactory.HELVETICA_BOLD)));
                document.add(new Paragraph(po.getRemarks()));
            }

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate Purchase Order PDF", e);
        }
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
