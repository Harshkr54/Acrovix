package com.acrovix.admin;

import com.acrovix.admin.entity.Invoice;
import com.acrovix.admin.repository.InvoiceRepository;
import com.acrovix.admin.service.PdfService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.io.FileOutputStream;
import java.util.List;

@SpringBootTest
public class TestInvoicePdfGeneration {

    @Autowired
    private PdfService pdfService;

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Test
    @org.springframework.transaction.annotation.Transactional
    public void generateInvoicePdf() throws Exception {
        List<Invoice> invoices = invoiceRepository.findAll();
        Invoice invoice;
        if (invoices.isEmpty()) {
            System.out.println("Creating sample invoice for PDF generation...");
            invoice = new Invoice();
            invoice.setInvoiceNumber("INV-2026-001");
            invoice.setInvoiceDate(java.time.LocalDate.of(2026, 10, 10));
            invoice.setDueDate(java.time.LocalDate.of(2026, 11, 9));
            invoice.setStatus(com.acrovix.admin.entity.InvoiceStatus.DRAFT);
            invoice.setInvoiceType(com.acrovix.admin.entity.InvoiceType.TAX_INVOICE);
            invoice.setCurrency(com.acrovix.admin.entity.Currency.INR);
            invoice.setTaxableAmount(new java.math.BigDecimal("11080.80"));
            invoice.setCgstAmount(new java.math.BigDecimal("997.27"));
            invoice.setSgstAmount(new java.math.BigDecimal("997.27"));
            invoice.setGrandTotal(new java.math.BigDecimal("13075.34"));
            invoice.setAmountPaid(java.math.BigDecimal.ZERO);
            invoice.setPaymentTerms("Payment to be made as per the payment terms mentioned.\nFor any queries, please contact our finance team.\nThis is a computer generated invoice and does not require a physical signature.");
            invoice.setTermsAndConditions("1. Invoice is valid for 30 days from the date of issue.\n2. Payment terms: 50% advance and 50% on completion.\n3. Delivery must be made as per the agreed timeline.\n4. Any additional scope of work will be quoted separately.\n5. Applicable taxes will be charged as per government regulations.\n6. In case of delay or non-compliance, ACROVIX reserves the right to take appropriate action.\n7. For any disputes, subject to Bengaluru jurisdiction only.");

            invoice.setClientCompany("ABC Technologies Pvt. Ltd.");
            invoice.setClientName("Mr. Rohit Sharma");
            invoice.setClientEmail("rohit.sharma@abctech.com");
            invoice.setClientPhone("+91 98765 43210");
            invoice.setClientGstin("06ABCDE1234F1Z5");
            invoice.setClientAddress("123 Business Park, Sector 62, Gurgaon - 122001, Haryana, India");

            com.acrovix.admin.entity.Customer customer = new com.acrovix.admin.entity.Customer();
            customer.setCustomerCode("CUST-001");
            customer.setName("Mr. Rohit Sharma");
            customer.setCompanyName("ABC Technologies Pvt. Ltd.");
            customer.setEmail("rohit.sharma@abctech.com");
            customer.setPhone("+91 98765 43210");
            customer.setGstin("06ABCDE1234F1Z5");
            customer.setBillingAddress("123 Business Park, Sector 62, Gurgaon - 122001, Haryana, India");
            customer.setShippingAddress("123 Business Park, Sector 62, Gurgaon - 122001, Haryana, India");
            invoice.setCustomer(customer);

            com.acrovix.admin.entity.PurchaseOrder po = new com.acrovix.admin.entity.PurchaseOrder();
            po.setPoNumber("PO-2026-001");
            po.setPoDate(java.time.LocalDate.of(2026, 10, 1));
            invoice.setPurchaseOrder(po);

            java.util.List<com.acrovix.admin.entity.InvoiceItem> items = new java.util.ArrayList<>();
            String[][] rawItems = {
                {"ITM-001", "Website Development", "998314", "1", "40000.00", "18", "47200.00"},
                {"ITM-002", "Annual Maintenance", "998313", "1", "12000.00", "18", "14160.00"},
                {"ITM-003", "Technical Support", "998313", "5", "2000.00", "18", "10620.00"},
                {"ITM-004", "Cloud Deployment", "998315", "2", "15000.00", "18", "33630.00"},
                {"ITM-005", "Software License", "998316", "10", "5000.00", "18", "59000.00"},
                {"ITM-006", "Database Setup", "998314", "1", "25000.00", "18", "29500.00"},
                {"ITM-007", "API Integration", "998314", "1", "30000.00", "18", "35400.00"},
                {"ITM-008", "Testing & QA", "998316", "3", "8000.00", "18", "28320.00"},
                {"ITM-009", "Documentation", "998316", "1", "5000.00", "18", "5900.00"},
                {"ITM-010", "Deployment Support", "998315", "2", "10000.00", "18", "23600.00"}
            };

            for (String[] raw : rawItems) {
                com.acrovix.admin.entity.InvoiceItem item = new com.acrovix.admin.entity.InvoiceItem();
                item.setInvoice(invoice);
                item.setSku(raw[0]);
                item.setDescription(raw[1]);
                item.setHsnSac(raw[2]);
                item.setQuantity(new java.math.BigDecimal(raw[3]));
                item.setUnitPrice(new java.math.BigDecimal(raw[4]));
                item.setTaxPercent(new java.math.BigDecimal(raw[5]));
                item.setLineTotal(new java.math.BigDecimal(raw[6]));
                items.add(item);
            }
            invoice.setItems(items);
        } else {
            invoice = invoices.get(0);
        }
        
        byte[] pdfBytes = pdfService.generateInvoicePdf(invoice);
        
        try (FileOutputStream fos = new FileOutputStream("test-invoice-output.pdf")) {
            fos.write(pdfBytes);
        }
        System.out.println("Invoice PDF generated successfully at test-invoice-output.pdf");
    }
}
