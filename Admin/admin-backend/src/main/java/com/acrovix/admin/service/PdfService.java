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
            document.add(new Paragraph("Quotation: " + quotation.getQuotationNumber()));
            document.add(new Paragraph("Date: " + quotation.getCreatedAt().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy"))));
            document.add(new Paragraph("Valid Until: " + quotation.getValidUntil().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy"))));
            document.add(new Paragraph(" "));

            // Client Info
            document.add(new Paragraph("To: " + quotation.getClientName()));
            document.add(new Paragraph(quotation.getClientCompany()));
            document.add(new Paragraph("Email: " + quotation.getClientEmail()));
            document.add(new Paragraph(" "));

            // Items Table
            PdfPTable table = new PdfPTable(7);
            table.setWidthPercentage(100);
            table.addCell("Description");
            table.addCell("Qty");
            table.addCell("Unit");
            table.addCell("Price");
            table.addCell("Disc %");
            table.addCell("Tax %");
            table.addCell("Line Total");

            for (QuotationItem item : quotation.getItems()) {
                table.addCell(item.getDescription());
                table.addCell(item.getQuantity().toString());
                table.addCell(item.getUnit() != null ? item.getUnit() : "");
                table.addCell(item.getUnitPrice().toString());
                table.addCell(item.getDiscountPercent() != null ? item.getDiscountPercent().toString() : "0");
                table.addCell(item.getTaxPercent() != null ? item.getTaxPercent().toString() : "0");
                table.addCell(item.getLineTotal().toString());
            }
            document.add(table);
            document.add(new Paragraph(" "));

            // Totals
            PdfPTable totalsTable = new PdfPTable(2);
            totalsTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totalsTable.addCell("Subtotal:");
            totalsTable.addCell(quotation.getSubtotal().toString());
            totalsTable.addCell("Discount:");
            totalsTable.addCell(quotation.getDiscountAmount().toString());
            totalsTable.addCell("Tax:");
            totalsTable.addCell(quotation.getTaxAmount().toString());
            totalsTable.addCell(new Phrase("Grand Total:", FontFactory.getFont(FontFactory.HELVETICA_BOLD)));
            totalsTable.addCell(new Phrase(quotation.getGrandTotal().toString(), FontFactory.getFont(FontFactory.HELVETICA_BOLD)));
            
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
}
