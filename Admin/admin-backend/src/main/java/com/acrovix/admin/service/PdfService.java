package com.acrovix.admin.service;

import com.acrovix.admin.entity.Quotation;
import com.acrovix.admin.entity.QuotationItem;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;

@Service
public class PdfService {

    public byte[] generateQuotationPdf(Quotation quotation) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document();
            PdfWriter.getInstance(document, out);
            document.open();

            // Header
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 24);
            Paragraph title = new Paragraph("ACROVIX INNOVATIONS PRIVATE LIMITED", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);
            document.add(new Paragraph("Quotation: " + (quotation.getQuotationNumber() != null ? quotation.getQuotationNumber() : "")));
            String createdDateStr = quotation.getCreatedAt() != null ? quotation.getCreatedAt().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy")) : "";
            document.add(new Paragraph("Date: " + createdDateStr));
            String validUntilStr = quotation.getValidUntil() != null ? quotation.getValidUntil().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy")) : "";
            document.add(new Paragraph("Valid Until: " + validUntilStr));
            document.add(new Paragraph(" "));

            // Client Info
            document.add(new Paragraph("To: " + (quotation.getClientName() != null ? quotation.getClientName() : "")));
            if (quotation.getClientCompany() != null && !quotation.getClientCompany().isBlank()) {
                document.add(new Paragraph(quotation.getClientCompany()));
            }
            document.add(new Paragraph("Email: " + (quotation.getClientEmail() != null ? quotation.getClientEmail() : "")));
            if (quotation.getClientPhone() != null && !quotation.getClientPhone().isBlank()) {
                document.add(new Paragraph("Phone: " + quotation.getClientPhone()));
            }

            String sourceDisplay;
            if (quotation.getQuotationSource() != null) {
                sourceDisplay = quotation.getQuotationSource().name();
            } else if (quotation.getEnquiry() != null) {
                sourceDisplay = "WEBSITE ENQUIRY";
            } else {
                sourceDisplay = "DIRECT";
            }
            document.add(new Paragraph("Source: " + sourceDisplay));

            if (quotation.getEnquiry() != null && quotation.getEnquiry().getReferenceId() != null) {
                document.add(new Paragraph("Enquiry Ref: " + quotation.getEnquiry().getReferenceId()));
            }

            if (quotation.getSourceNotes() != null && !quotation.getSourceNotes().isBlank()) {
                document.add(new Paragraph("Source Notes: " + quotation.getSourceNotes()));
            }
            document.add(new Paragraph(" "));

            // Dynamic Items Table based on configurations
            java.util.List<com.acrovix.admin.entity.QuotationColumnConfig> configs = new java.util.ArrayList<>();
            if (quotation.getColumnConfigs() != null && !quotation.getColumnConfigs().isEmpty()) {
                configs.addAll(quotation.getColumnConfigs().stream()
                        .filter(com.acrovix.admin.entity.QuotationColumnConfig::getVisible)
                        .sorted(java.util.Comparator.comparing(com.acrovix.admin.entity.QuotationColumnConfig::getSortOrder))
                        .collect(java.util.stream.Collectors.toList()));
            } else {
                // Fallback for legacy quotations
                String[] keys = {"rowNumber", "sku", "description", "hsnSac", "quantity", "listPrice", "discountPercent", "unitPrice", "taxPercent", "taxAmount", "total"};
                String[] displayNames = {"#", "SKU", "Description", "HSN/SAC", "Qty", "List Price", "Disc %", "Unit Price", "Tax %", "Tax Amount", "Total"};
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
            
            // Header
            for (com.acrovix.admin.entity.QuotationColumnConfig c : configs) {
                PdfPCell headerCell = new PdfPCell(new Phrase(c.getDisplayName(), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10)));
                table.addCell(headerCell);
            }

            if (quotation.getItems() != null) {
                int index = 1;
                for (QuotationItem item : quotation.getItems()) {
                    BigDecimal qty = item.getQuantity() != null ? item.getQuantity() : BigDecimal.ZERO;
                    BigDecimal unitPrice = item.getUnitPrice() != null ? item.getUnitPrice() : BigDecimal.ZERO;
                    BigDecimal listPrice = item.getListPrice() != null ? item.getListPrice() : unitPrice;
                    BigDecimal taxPct = item.getTaxPercent() != null ? item.getTaxPercent() : BigDecimal.ZERO;
                    
                    BigDecimal netLine = qty.multiply(unitPrice);
                    BigDecimal taxAmt = netLine.multiply(taxPct).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
                    
                    for (com.acrovix.admin.entity.QuotationColumnConfig c : configs) {
                        String val = "";
                        if (c.getIsCustom() != null && c.getIsCustom()) {
                            if (item.getCustomValues() != null && item.getCustomValues().containsKey(c.getColumnKey())) {
                                val = item.getCustomValues().get(c.getColumnKey());
                            }
                        } else {
                            switch (c.getColumnKey()) {
                                case "rowNumber": val = String.valueOf(index); break;
                                case "sku": val = item.getSku() != null ? item.getSku() : ""; break;
                                case "description": val = item.getDescription() != null ? item.getDescription() : ""; break;
                                case "hsnSac": val = item.getHsnSac() != null ? item.getHsnSac() : ""; break;
                                case "quantity": val = qty.toString(); break;
                                case "listPrice": val = listPrice.toString(); break;
                                case "discountPercent": val = item.getDiscountPercent() != null ? item.getDiscountPercent().toString() : "0"; break;
                                case "unitPrice": val = unitPrice.toString(); break;
                                case "taxPercent": val = taxPct.toString(); break;
                                case "taxAmount": val = taxAmt.toString(); break;
                                case "total": val = item.getLineTotal() != null ? item.getLineTotal().toString() : "0.00"; break;
                                default: val = "";
                            }
                        }
                        PdfPCell cell = new PdfPCell(new Phrase(val, FontFactory.getFont(FontFactory.HELVETICA, 10)));
                        table.addCell(cell);
                    }
                    index++;
                }
            }
            document.add(table);
            document.add(new Paragraph(" "));

            // Totals
            PdfPTable totalsTable = new PdfPTable(2);
            totalsTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
            
            BigDecimal subtotalBeforeTax = BigDecimal.ZERO;
            if (quotation.getSubtotal() != null && quotation.getDiscountAmount() != null) {
                subtotalBeforeTax = quotation.getSubtotal().add(quotation.getDiscountAmount());
            }
            
            totalsTable.addCell("Subtotal (Before Tax):");
            totalsTable.addCell(subtotalBeforeTax.toString());
            totalsTable.addCell("Total Discount:");
            totalsTable.addCell(quotation.getDiscountAmount() != null ? "-" + quotation.getDiscountAmount().toString() : "0.00");
            totalsTable.addCell("Taxable Amount:");
            totalsTable.addCell(quotation.getSubtotal() != null ? quotation.getSubtotal().toString() : "0.00");
            totalsTable.addCell("Total Tax:");
            totalsTable.addCell(quotation.getTaxAmount() != null ? quotation.getTaxAmount().toString() : "0.00");
            totalsTable.addCell(new Phrase("Grand Total:", FontFactory.getFont(FontFactory.HELVETICA_BOLD)));
            totalsTable.addCell(new Phrase(quotation.getGrandTotal() != null ? quotation.getGrandTotal().toString() : "0.00", FontFactory.getFont(FontFactory.HELVETICA_BOLD)));
            
            document.add(totalsTable);
            document.add(new Paragraph(" "));
            
            if (quotation.getTermsAndConditions() != null) {
                document.add(new Paragraph("Terms & Conditions:"));
                document.add(new Paragraph(quotation.getTermsAndConditions()));
            }

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF", e);
        }
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
}
