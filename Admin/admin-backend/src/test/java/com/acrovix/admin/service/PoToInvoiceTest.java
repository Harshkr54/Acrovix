package com.acrovix.admin.service;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import com.acrovix.admin.entity.*;
import com.acrovix.admin.repository.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@SpringBootTest
public class PoToInvoiceTest {
    @Autowired private InvoiceService invoiceService;
    @Autowired private PurchaseOrderRepository poRepo;
    @Autowired private QuotationRepository qRepo;
    @Autowired private AdminUserRepository adminRepo;
    @Autowired private CompanySettingsRepository settingsRepo;

    @Test
    public void testPoToInvoice() {
        AdminUser admin = adminRepo.findAll().get(0);
        
        CompanySettings cs = new CompanySettings();
        cs.setCompanyName("Test Company");
        cs.setLegalName("Test Legal Company");
        cs.setRegisteredAddress("123 Test St");
        cs.setGstin("27AAAAA0000A1Z5");
        cs.setState("Maharashtra");
        cs.setEmail("test@company.com");
        cs.setPhone("1234567890");
        settingsRepo.save(cs);
        
        Quotation q = new Quotation();
        q.setQuotationNumber("Q-001");
        q.setClientName("Test Client");
        q.setClientEmail("test@test.com");
        q.setCurrency(Currency.INR);
        q.setStatus("CONVERTED");
        q.setGrandTotal(new BigDecimal("1000"));
        q.setCreatedBy(admin);
        q = qRepo.save(q);

        PurchaseOrder po = new PurchaseOrder();
        po.setPoNumber("PO-001");
        po.setQuotation(q);
        po.setPoDate(LocalDate.now());
        po.setPoValue(new BigDecimal("1000"));
        po.setStatus(PurchaseOrderStatus.VERIFIED);
        po.setCreatedBy(admin);
        po = poRepo.save(po);

        try {
            invoiceService.createInvoiceFromPurchaseOrder(po.getId(), InvoiceType.TAX_INVOICE, admin);
        } catch (Exception e) {
            e.printStackTrace();
            throw e;
        }
    }
}
