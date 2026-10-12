package com.acrovix.admin;

import com.acrovix.admin.entity.*;
import com.acrovix.admin.service.PdfService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.io.FileOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;

@SpringBootTest
public class PdfVisualTest {

    @Autowired
    private PdfService pdfService;

    @Autowired
    private com.acrovix.admin.repository.CompanySettingsRepository companySettingsRepository;

    @Test
    public void generateTestPdf() throws Exception {
        CompanySettings settings = new CompanySettings();
        settings.setId(1L);
        settings.setCompanyName("ACROVIX INNOVATIONS PRIVATE LIMITED");
        settings.setLegalName("ACROVIX INNOVATIONS PRIVATE LIMITED");
        settings.setGstin("29ABCFA2588C1Z8");
        settings.setRegisteredAddress("3RD FLOOR, 956, VIGNESHWARA\n6TH CLASS 1ST MAIN, BENGALURU\nBengaluru Urban, KARNATAKA, 560060");
        settings.setPhone("+91 98765 43210");
        settings.setEmail("contact@acrovix.com");
        settings.setBankName("HDFC Bank");
        settings.setBankAccountNumber("5020001245678");
        settings.setBankIfsc("HDFC0001234");
        settings.setBankBranch("Koramangala, Bengaluru");
        settings.setWebsite("www.acrovix.com");
        companySettingsRepository.save(settings);

        Quotation quotation = new Quotation();
        quotation.setQuotationNumber("ACX-Q-2026-0008");
        quotation.setCreatedAt(LocalDateTime.of(2026, 10, 10, 10, 0));
        quotation.setValidUntil(LocalDate.of(2026, 11, 9));
        quotation.setClientName("Harsh Raj");
        quotation.setClientCompany("ABC Technologies Pvt. Ltd.");
        quotation.setClientEmail("harsh.raj@abc.com");
        quotation.setClientPhone("+91 98765 43210");
        quotation.setCurrency(Currency.INR);

        Customer customer = new Customer();
        customer.setGstin("20ABCDE1234F1Z5");
        customer.setState("Jharkhand");
        customer.setBillingAddress("Bishunpur ashram road\nCity: Koderma\nState: Jharkhand\nPincode: 825409\nCountry: India");
        quotation.setCustomer(customer);

        quotation.setTermsAndConditions(
            "1. Quotation is valid for 30 days from the quotation date.\n" +
            "2. Payment terms: 50% advance and 50% on completion.\n" +
            "3. Estimated delivery: 15 working days after confirmation and receipt of advance.\n" +
            "4. Any additional scope of work will be quoted separately.\n" +
            "5. Applicable taxes will be charged as shown in the quotation.\n" +
            "6. Work will commence after written approval of the quotation."
        );

        // Add standard configs
        String[] keys = {"rowNumber", "sku", "description", "hsnSac", "quantity", "listPrice", "discountPercent", "unitPrice", "taxPercent", "taxAmount", "total"};
        String[] displayNames = {"#", "SKU", "DESCRIPTION", "HSN / SAC", "QTY", "LIST PRICE\n(\u20B9)", "DISC %", "UNIT PRICE\n(\u20B9)", "TAX %", "TAX AMT.\n(\u20B9)", "TOTAL (\u20B9)"};
        for (int i = 0; i < keys.length; i++) {
            QuotationColumnConfig c = new QuotationColumnConfig();
            c.setColumnKey(keys[i]);
            c.setDisplayName(displayNames[i]);
            c.setVisible(true);
            c.setSortOrder(i);
            c.setIsCustom(false);
            quotation.getColumnConfigs().add(c);
        }

        Object[][] rawItems = {
            {"WEB-001", "Website Development", "998314", 1.0, 40000.0, 0.0, 40000.0, 18.0, 7200.0, 47200.0},
            {"AMC-001", "Annual Maintenance", "998313", 1.0, 12000.0, 0.0, 12000.0, 18.0, 2160.0, 14160.0},
            {"SUP-001", "Technical Support", "998313", 5.0, 2000.0, 10.0, 1800.0, 18.0, 1620.0, 10620.0},
            {"CLOUD-001", "Cloud Deployment", "998315", 2.0, 15000.0, 5.0, 14250.0, 18.0, 5130.0, 33630.0},
            {"LIC-001", "Software License", "998316", 10.0, 5000.0, 0.0, 5000.0, 18.0, 9000.0, 59000.0},
            {"DB-001", "Database Setup", "998314", 1.0, 25000.0, 0.0, 25000.0, 18.0, 4500.0, 29500.0},
            {"API-001", "API Integration", "998314", 1.0, 30000.0, 0.0, 30000.0, 18.0, 5400.0, 35400.0},
            {"TEST-001", "Testing & QA", "998316", 3.0, 8000.0, 0.0, 8000.0, 18.0, 4320.0, 28320.0},
            {"DOC-001", "Documentation", "998316", 1.0, 5000.0, 0.0, 5000.0, 18.0, 900.0, 5900.0},
            {"DEP-001", "Deployment Support", "998315", 2.0, 10000.0, 0.0, 10000.0, 18.0, 3600.0, 23600.0},
            {"TRAIN-001", "User Training", "998316", 2.0, 7500.0, 0.0, 7500.0, 18.0, 2700.0, 17700.0},
            {"CONS-001", "Consulting", "998313", 5.0, 5000.0, 0.0, 5000.0, 18.0, 4500.0, 29500.0},
            {"SUP-002", "Onsite Support", "998313", 3.0, 6000.0, 0.0, 6000.0, 18.0, 3240.0, 21240.0},
            {"MON-001", "Monthly Monitoring", "998314", 12.0, 3000.0, 0.0, 3000.0, 18.0, 6480.0, 42480.0},
            {"CUST-001", "Custom Development", "998314", 1.0, 50000.0, 0.0, 50000.0, 18.0, 9000.0, 59000.0}
        };

        BigDecimal totalLine = BigDecimal.ZERO;
        BigDecimal totalTax = BigDecimal.ZERO;

        for (Object[] r : rawItems) {
            QuotationItem item = new QuotationItem();
            item.setSku((String) r[0]);
            item.setDescription((String) r[1]);
            item.setHsnSac((String) r[2]);
            item.setQuantity(BigDecimal.valueOf(((Double) r[3])));
            item.setListPrice(BigDecimal.valueOf(((Double) r[4])));
            item.setDiscountPercent(BigDecimal.valueOf(((Double) r[5])));
            item.setUnitPrice(BigDecimal.valueOf(((Double) r[6])));
            item.setTaxPercent(BigDecimal.valueOf(((Double) r[7])));
            BigDecimal lineTotal = item.getQuantity().multiply(item.getUnitPrice());
            BigDecimal lineTax = lineTotal.multiply(item.getTaxPercent()).divide(BigDecimal.valueOf(100));
            item.setLineTotal(lineTotal.add(lineTax));

            quotation.getItems().add(item);
            totalLine = totalLine.add(lineTotal);
            totalTax = totalTax.add(lineTax);
        }

        quotation.setSubtotal(totalLine);
        quotation.setTaxAmount(totalTax);
        quotation.setGrandTotal(totalLine.add(totalTax));

        byte[] pdfBytes = pdfService.generateQuotationPdf(quotation);
        try (FileOutputStream fos = new FileOutputStream("test-quotation.pdf")) {
            fos.write(pdfBytes);
        }
        System.out.println("Saved PDF to test-quotation.pdf");
    }

    @Test
    public void generateShortQuotationPdf() throws Exception {
        Quotation quotation = new Quotation();
        quotation.setQuotationNumber("ACX-Q-2026-0001");
        quotation.setCreatedAt(LocalDateTime.of(2026, 10, 10, 10, 0));
        quotation.setValidUntil(LocalDate.of(2026, 11, 9));
        quotation.setClientName("Harsh Raj");
        quotation.setClientCompany("ABC Technologies Pvt. Ltd.");
        quotation.setCurrency(Currency.USD);

        quotation.setTermsAndConditions(
            "1. Quotation is valid for 30 days.\n" +
            "2. Payment terms: 100% on delivery."
        );

        for (int i = 1; i <= 3; i++) {
            QuotationItem item = new QuotationItem();
            item.setSku("SRV-00" + i);
            item.setDescription("Software Development Service Phase " + i);
            item.setHsnSac("998314");
            item.setQuantity(BigDecimal.valueOf(1));
            item.setUnitPrice(BigDecimal.valueOf(2500));
            item.setTaxPercent(BigDecimal.valueOf(18));
            item.setLineTotal(BigDecimal.valueOf(2950));
            quotation.getItems().add(item);
        }

        quotation.setSubtotal(BigDecimal.valueOf(7500));
        quotation.setTaxAmount(BigDecimal.valueOf(1350));
        quotation.setGrandTotal(BigDecimal.valueOf(8850));

        byte[] pdfBytes = pdfService.generateQuotationPdf(quotation);
        try (FileOutputStream fos = new FileOutputStream("test-short-quotation.pdf")) {
            fos.write(pdfBytes);
        }
        System.out.println("Saved PDF to test-short-quotation.pdf");
    }

    @Test
    public void generatePurchaseOrderReferencePdf() throws Exception {
        CompanySettings settings = new CompanySettings();
        settings.setId(1L);
        settings.setCompanyName("ACROVIX INNOVATIONS PRIVATE LIMITED");
        settings.setLegalName("ACROVIX INNOVATIONS PRIVATE LIMITED");
        settings.setGstin("29ABCFA2588C1Z8");
        settings.setRegisteredAddress("Manikonda, Hyderabad, Telangana, India - 500089");
        settings.setBillingAddress("3rd Floor, 956, Vigneshwara,\n6th Cross 1st Main, Bengaluru Urban, Karnataka - 560060");
        settings.setPhone("+91 98765 43210");
        settings.setEmail("contact@acrovix.com");
        settings.setBankName("HDFC Bank");
        settings.setBankAccountNumber("5020001245678");
        settings.setBankIfsc("HDFC0001234");
        settings.setBankBranch("Koramangala, Bengaluru");
        settings.setWebsite("www.acrovix.com");
        companySettingsRepository.save(settings);

        Quotation quotation = new Quotation();
        quotation.setQuotationNumber("ACX-Q-2026-0001");
        quotation.setCreatedAt(LocalDateTime.of(2026, 10, 10, 10, 0));
        quotation.setValidUntil(LocalDate.of(2026, 10, 25));
        quotation.setClientName("Mr. Rohit Sharma");
        quotation.setClientCompany("ABC Technologies Pvt. Ltd.");
        quotation.setClientEmail("rohit.sharma@abctech.com");
        quotation.setClientPhone("+91 98765 43210");
        quotation.setCurrency(Currency.INR);

        Customer customer = new Customer();
        customer.setGstin("06ABCDE1234F1Z5");
        customer.setBillingAddress("123 Business Park, Sector 62,\nGurgaon - 122001, Haryana, India");
        quotation.setCustomer(customer);

        String[] skus = {
            "ITM-001", "ITM-002", "ITM-003", "ITM-004", "ITM-005",
            "ITM-006", "ITM-007", "ITM-008", "ITM-009", "ITM-010",
            "ITM-011", "ITM-012", "ITM-013", "ITM-014", "ITM-015"
        };
        String[] descs = {
            "Laptop Dell Inspiron 16", "Monitor 24 Inch", "Keyboard & Mouse Set", "Office Chair", "Installation & Setup",
            "Annual Support", "Additional Accessories", "Software License", "Cables & Connectors", "Delivery Charges",
            "User Training", "Consulting", "Onsite Support", "Monthly Monitoring", "Custom Development"
        };
        String[] hsns = {
            "84713010", "85285200", "84716060", "94013090", "998714",
            "998713", "84733099", "997331", "85444290", "996812",
            "998316", "998313", "998313", "998314", "998314"
        };
        int[] qtys = { 2, 2, 2, 3, 1, 1, 1, 5, 1, 1, 2, 5, 3, 12, 1 };
        double[] prices = {
            45000, 12000, 1500, 5000, 5000,
            10000, 8000, 6000, 4000, 2000,
            7500, 5000, 6000, 3000, 50000
        };

        quotation.setItems(new ArrayList<>());
        BigDecimal totalSub = BigDecimal.ZERO;
        BigDecimal totalTax = BigDecimal.ZERO;

        for (int i = 0; i < 15; i++) {
            QuotationItem item = new QuotationItem();
            item.setSku(skus[i]);
            item.setDescription(descs[i]);
            item.setHsnSac(hsns[i]);
            item.setQuantity(BigDecimal.valueOf(qtys[i]));
            item.setUnitPrice(BigDecimal.valueOf(prices[i]));
            item.setTaxPercent(BigDecimal.valueOf(18));
            BigDecimal lineNet = item.getQuantity().multiply(item.getUnitPrice());
            BigDecimal lineTax = lineNet.multiply(BigDecimal.valueOf(0.18));
            item.setLineTotal(lineNet.add(lineTax));
            quotation.getItems().add(item);
            totalSub = totalSub.add(lineNet);
            totalTax = totalTax.add(lineTax);
        }

        quotation.setSubtotal(totalSub);
        quotation.setTaxAmount(totalTax);
        quotation.setGrandTotal(totalSub.add(totalTax));

        AdminUser preparer = new AdminUser();
        preparer.setName("Harsh Raj");

        PurchaseOrder po = PurchaseOrder.builder()
                .poNumber("PO-2026-001")
                .poDate(LocalDate.of(2026, 10, 10))
                .currency(Currency.INR)
                .poValue(quotation.getGrandTotal())
                .quotation(quotation)
                .createdBy(preparer)
                .remarks("Please deliver the items as per the agreed specifications.\nContact the procurement team for any clarification.")
                .build();

        byte[] pdfBytes = pdfService.generatePurchaseOrderPdf(po);
        org.junit.jupiter.api.Assertions.assertNotNull(pdfBytes);
        org.junit.jupiter.api.Assertions.assertTrue(pdfBytes.length > 1000);

        try (FileOutputStream fos = new FileOutputStream("test-po-reference.pdf")) {
            fos.write(pdfBytes);
        }
        System.out.println("Saved reference PO PDF to test-po-reference.pdf (" + pdfBytes.length + " bytes)");
    }

    @Test
    public void generateShortPurchaseOrderPdf() throws Exception {
        Quotation quotation = new Quotation();
        quotation.setQuotationNumber("ACX-Q-2026-0002");
        quotation.setCreatedAt(LocalDateTime.of(2026, 10, 10, 10, 0));
        quotation.setValidUntil(LocalDate.of(2026, 10, 25));
        quotation.setClientName("Mr. Rohit Sharma");
        quotation.setClientCompany("ABC Technologies Pvt. Ltd.");
        quotation.setCurrency(Currency.INR);

        quotation.setItems(new ArrayList<>());
        for (int i = 1; i <= 3; i++) {
            QuotationItem item = new QuotationItem();
            item.setSku("ITM-00" + i);
            item.setDescription("Equipment Item " + i);
            item.setHsnSac("84713010");
            item.setQuantity(BigDecimal.valueOf(2));
            item.setUnitPrice(BigDecimal.valueOf(10000));
            item.setTaxPercent(BigDecimal.valueOf(18));
            quotation.getItems().add(item);
        }
        quotation.setSubtotal(BigDecimal.valueOf(60000));
        quotation.setTaxAmount(BigDecimal.valueOf(10800));
        quotation.setGrandTotal(BigDecimal.valueOf(70800));

        AdminUser preparer = new AdminUser();
        preparer.setName("Harsh Raj");

        PurchaseOrder po = PurchaseOrder.builder()
                .poNumber("PO-2026-002")
                .poDate(LocalDate.of(2026, 10, 10))
                .currency(Currency.INR)
                .poValue(quotation.getGrandTotal())
                .quotation(quotation)
                .createdBy(preparer)
                .remarks("Expedited delivery requested.")
                .build();

        byte[] pdfBytes = pdfService.generatePurchaseOrderPdf(po);
        org.junit.jupiter.api.Assertions.assertNotNull(pdfBytes);
        org.junit.jupiter.api.Assertions.assertTrue(pdfBytes.length > 1000);

        try (FileOutputStream fos = new FileOutputStream("test-po-short.pdf")) {
            fos.write(pdfBytes);
        }
        System.out.println("Saved short PO PDF to test-po-short.pdf (" + pdfBytes.length + " bytes)");
    }

    @Test
    public void generatePaymentReceiptReferencePdfTest() throws Exception {
        CompanySettings settings = new CompanySettings();
        settings.setId(1L);
        settings.setCompanyName("ACROVIX INNOVATIONS PRIVATE LIMITED");
        settings.setLegalName("ACROVIX INNOVATIONS PRIVATE LIMITED");
        settings.setGstin("29ABCFA2588C1Z8");
        settings.setRegisteredAddress("3rd Floor, 956, Vigneshwara, 6th Cross 1st Main,\nBengaluru Urban, Karnataka - 560060, India");
        settings.setPhone("+91 98765 43210");
        settings.setEmail("contact@acrovix.com");
        settings.setWebsite("www.acrovix.com");
        companySettingsRepository.save(settings);

        Customer customer = new Customer();
        customer.setId(101L);
        customer.setName("Vineet Roy");
        customer.setCompanyName("acrovix");
        customer.setEmail("v.roy@acrovix.com");
        customer.setPhone("1236549870");
        customer.setBillingAddress("Address not provided");
        customer.setGstin("N/A");

        Invoice invoice = new Invoice();
        invoice.setId(201L);
        invoice.setInvoiceNumber("ACX/INV/26-27/0003");
        invoice.setGrandTotal(new BigDecimal("13075.34"));
        invoice.setClientName("Vineet Roy");
        invoice.setClientCompany("acrovix");
        invoice.setClientEmail("v.roy@acrovix.com");
        invoice.setClientPhone("1236549870");
        invoice.setClientAddress("Address not provided");
        invoice.setClientGstin("N/A");
        invoice.setCustomer(customer);

        AdminUser recordedBy = new AdminUser();
        recordedBy.setName("Vineet Roy");

        Payment payment = Payment.builder()
                .id(1L)
                .paymentNumber("ACX/PAY/26-27/0003")
                .invoice(invoice)
                .customer(customer)
                .paymentDate(LocalDate.of(2026, 10, 12))
                .currency(Currency.INR)
                .amount(new BigDecimal("13075.34"))
                .paymentMethod(PaymentMethod.BANK_TRANSFER)
                .transactionReference("UTR12345678")
                .chequeNumber("-")
                .status(PaymentStatus.RECORDED)
                .recordedBy(recordedBy)
                .notes("Payment received via NEFT. Thank you for your business.")
                .createdAt(LocalDateTime.of(2026, 10, 12, 14, 30))
                .build();

        byte[] pdfBytes = pdfService.generatePaymentReceiptPdf(payment);
        org.junit.jupiter.api.Assertions.assertNotNull(pdfBytes);
        org.junit.jupiter.api.Assertions.assertTrue(pdfBytes.length > 1000);

        try (FileOutputStream fos = new FileOutputStream("test-payment-receipt-reference.pdf")) {
            fos.write(pdfBytes);
        }

        // Render to PNG using PDFBox
        try {
            org.apache.pdfbox.pdmodel.PDDocument pdDoc = org.apache.pdfbox.pdmodel.PDDocument.load(pdfBytes);
            org.apache.pdfbox.rendering.PDFRenderer renderer = new org.apache.pdfbox.rendering.PDFRenderer(pdDoc);
            java.awt.image.BufferedImage img = renderer.renderImageWithDPI(0, 200);
            pdDoc.close();

            String artifactPath = "C:/Users/harsh/.gemini/antigravity-ide/brain/2ed42b3e-a58e-4ba9-80e5-8b130af6fb9b/payment_receipt_rendered.png";
            javax.imageio.ImageIO.write(img, "PNG", new java.io.File(artifactPath));
            System.out.println("Saved rendered PNG to " + artifactPath);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Test
    public void testPaymentReceiptEdgeCases() {
        // 1. Partial payment scenario
        Invoice inv = new Invoice();
        inv.setId(301L);
        inv.setInvoiceNumber("ACX/INV/26-27/0010");
        inv.setGrandTotal(new BigDecimal("50000.00"));
        inv.setClientName("Tech Innovations Ltd");
        inv.setClientCompany("Tech Innovations Ltd");

        Payment partialPayment = Payment.builder()
                .id(2L)
                .paymentNumber("ACX/PAY/26-27/0004")
                .invoice(inv)
                .paymentDate(LocalDate.now())
                .amount(new BigDecimal("20000.00"))
                .paymentMethod(PaymentMethod.UPI)
                .transactionReference("UPI/987654321/ref")
                .status(PaymentStatus.RECORDED)
                .build();

        byte[] partialPdf = pdfService.generatePaymentReceiptPdf(partialPayment);
        org.junit.jupiter.api.Assertions.assertNotNull(partialPdf);
        org.junit.jupiter.api.Assertions.assertTrue(partialPdf.length > 1000);

        // 2. Missing optional customer and payment fields
        Payment minimalPayment = Payment.builder()
                .paymentNumber("ACX/PAY/26-27/0005")
                .paymentDate(LocalDate.now())
                .amount(new BigDecimal("5000.00"))
                .paymentMethod(PaymentMethod.CASH)
                .status(PaymentStatus.RECORDED)
                .build();

        byte[] minimalPdf = pdfService.generatePaymentReceiptPdf(minimalPayment);
        org.junit.jupiter.api.Assertions.assertNotNull(minimalPdf);
        org.junit.jupiter.api.Assertions.assertTrue(minimalPdf.length > 1000);

        // 3. Cancelled payment
        Payment cancelledPayment = Payment.builder()
                .paymentNumber("ACX/PAY/26-27/0006")
                .invoice(inv)
                .paymentDate(LocalDate.now())
                .amount(new BigDecimal("10000.00"))
                .paymentMethod(PaymentMethod.CHEQUE)
                .chequeNumber("CHQ884920")
                .status(PaymentStatus.CANCELLED)
                .cancellationReason("Cheque bounced due to signature mismatch")
                .notes("Cancelled transaction")
                .build();

        byte[] cancelledPdf = pdfService.generatePaymentReceiptPdf(cancelledPayment);
        org.junit.jupiter.api.Assertions.assertNotNull(cancelledPdf);
        org.junit.jupiter.api.Assertions.assertTrue(cancelledPdf.length > 1000);

        // 4. Standalone payment without invoice
        Payment advancePayment = Payment.builder()
                .paymentNumber("ACX/PAY/26-27/0007")
                .paymentDate(LocalDate.now())
                .amount(new BigDecimal("75000.00"))
                .paymentMethod(PaymentMethod.BANK_TRANSFER)
                .transactionReference("NEFT-ADV-001")
                .status(PaymentStatus.RECORDED)
                .notes("Advance deposit for project onboarding.")
                .build();

        byte[] advancePdf = pdfService.generatePaymentReceiptPdf(advancePayment);
        org.junit.jupiter.api.Assertions.assertNotNull(advancePdf);
        org.junit.jupiter.api.Assertions.assertTrue(advancePdf.length > 1000);

        // 5. Long payment note
        Payment longNotesPayment = Payment.builder()
                .paymentNumber("ACX/PAY/26-27/0008")
                .invoice(inv)
                .paymentDate(LocalDate.now())
                .amount(new BigDecimal("15000.00"))
                .paymentMethod(PaymentMethod.BANK_TRANSFER)
                .transactionReference("TXN998877")
                .status(PaymentStatus.RECORDED)
                .notes("Payment received via RTGS in full settlement of milestone 1 delivery.\n" +
                        "All items inspected and accepted by client representative on site.\n" +
                        "Warranty period active from the date of this receipt as per MSA clause 4.2.")
                .build();

        byte[] longNotesPdf = pdfService.generatePaymentReceiptPdf(longNotesPayment);
        org.junit.jupiter.api.Assertions.assertNotNull(longNotesPdf);
        org.junit.jupiter.api.Assertions.assertTrue(longNotesPdf.length > 1000);
    }
}


