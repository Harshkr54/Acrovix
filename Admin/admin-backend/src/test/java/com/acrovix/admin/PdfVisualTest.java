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
        settings.setGstin("29ABFCA1234F1Z5");
        settings.setRegisteredAddress("3RD FLOOR, 956, VIGNESHWARA\n6TH CLASS 1ST MAIN, Bengaluru\nBengaluru Urban, KARNATAKA, 560060");
        settings.setPhone("+91 80000 00000");
        settings.setEmail("contact@acrovix.com");
        settings.setBankName("HDFC Bank");
        settings.setBankAccountNumber("50200000000000");
        settings.setBankIfsc("HDFC0001234");
        settings.setBankBranch("Koramangala, Bengaluru");
        companySettingsRepository.save(settings);

        Quotation quotation = new Quotation();
        quotation.setQuotationNumber("ACX-Q-2026-0008");
        quotation.setCreatedAt(LocalDateTime.now());
        quotation.setValidUntil(LocalDate.now().plusDays(30));
        quotation.setClientName("Harsh Raj");
        quotation.setClientCompany("abc");
        quotation.setClientEmail("harshkr540@gmail.com");
        quotation.setClientPhone("+91 6203261157");
        quotation.setCurrency(Currency.INR);

        Customer customer = new Customer();
        customer.setGstin("-");
        customer.setState("Jharkhand");
        customer.setBillingAddress("Bishunpur ashram road\nCity: Koderma\nState: Jharkhand\nPincode: 825409\nCountry: India");
        quotation.setCustomer(customer);

        quotation.setTermsAndConditions("1. Quotation is valid for 30 days from the quotation date.\n2. Payment terms: 50% advance and 50% on completion.\n3. Estimated delivery: 15 working days after confirmation.\n4. Any additional scope of work will be quoted separately.");

        // Add dummy configs
        String[] keys = {"rowNumber", "sku", "description", "hsnSac", "quantity", "listPrice", "discountPercent", "unitPrice", "taxPercent", "taxAmount", "total"};
        String[] displayNames = {"#", "SKU", "DESCRIPTION", "HSN / SAC", "QTY", "LIST PRICE", "DISC %", "UNIT PRICE", "TAX %", "TAX AMT.", "TOTAL"};
        for (int i = 0; i < keys.length; i++) {
            QuotationColumnConfig c = new QuotationColumnConfig();
            c.setColumnKey(keys[i]);
            c.setDisplayName(displayNames[i]);
            c.setVisible(true);
            c.setSortOrder(i);
            c.setIsCustom(false);
            quotation.getColumnConfigs().add(c);
        }

        // Add items to force pagination
        BigDecimal totalLine = BigDecimal.ZERO;
        BigDecimal totalTax = BigDecimal.ZERO;

        for (int i = 1; i <= 15; i++) {
            QuotationItem item = new QuotationItem();
            item.setSku("ITM-" + String.format("%03d", i));
            item.setDescription("Item Description for " + i + " that might be somewhat long to cause wrapping and wrapping and wrapping.");
            item.setHsnSac("998314");
            item.setQuantity(BigDecimal.valueOf(2));
            item.setListPrice(BigDecimal.valueOf(10000));
            item.setUnitPrice(BigDecimal.valueOf(10000));
            item.setDiscountPercent(BigDecimal.ZERO);
            item.setTaxPercent(BigDecimal.valueOf(18));
            item.setLineTotal(BigDecimal.valueOf(23600));

            quotation.getItems().add(item);
            totalLine = totalLine.add(item.getQuantity().multiply(item.getUnitPrice()));
            totalTax = totalTax.add(item.getQuantity().multiply(item.getUnitPrice()).multiply(BigDecimal.valueOf(0.18)));
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
}
