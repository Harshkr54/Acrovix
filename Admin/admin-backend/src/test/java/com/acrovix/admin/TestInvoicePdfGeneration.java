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
        if (invoices.isEmpty()) {
            System.out.println("No invoices found to generate PDF.");
            return;
        }
        
        Invoice invoice = invoices.get(0);
        byte[] pdfBytes = pdfService.generateInvoicePdf(invoice);
        
        try (FileOutputStream fos = new FileOutputStream("test-invoice-output.pdf")) {
            fos.write(pdfBytes);
        }
        System.out.println("Invoice PDF generated successfully at test-invoice-output.pdf");
    }
}
