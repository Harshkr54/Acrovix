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
    @Autowired private CustomerRepository customerRepo;

    @Test
    public void testPoToInvoice() {
        AdminUser admin = adminRepo.findAll().get(0);
        
        CompanySettings cs = new CompanySettings();
        cs.setCompanyName("ACROVIX INNOVATIONS PRIVATE LIMITED");
        cs.setLegalName("ACROVIX INNOVATIONS PRIVATE LIMITED");
        cs.setRegisteredAddress("956, 3rd Floor, Bengaluru");
        cs.setGstin("29ABFCA9588C1Z8");
        cs.setState("Karnataka");
        cs.setEmail("sales@acrovix.com");
        cs.setPhone("8092848065");
        settingsRepo.save(cs);
        
        Customer customer = new Customer();
        customer.setCustomerCode("CUST-001");
        customer.setName("Test Client Person");
        customer.setCompanyName("RADIANT SOLUTIONS");
        customer.setBillingAddress("101 Client Tower, Delhi");
        customer.setShippingAddress("Client Warehouse, Gurgaon");
        customer.setState("Haryana");
        customer.setPincode("122001");
        customer.setCurrency(Currency.INR);
        customer.setCreatedBy(admin.getId());
        customer = customerRepo.save(customer);

        Quotation q = new Quotation();
        q.setQuotationNumber("Q-001");
        q.setClientName("Test Client Person");
        q.setClientCompany("RADIANT SOLUTIONS");
        q.setClientEmail("test@test.com");
        q.setCurrency(Currency.INR);
        q.setStatus("CONVERTED");
        q.setGrandTotal(new BigDecimal("1000"));
        q.setCreatedBy(admin);
        q.setCustomer(customer);
        q = qRepo.save(q);

        // Case 1: PO with COMPANY_OFFICE delivery
        PurchaseOrder poOffice = new PurchaseOrder();
        poOffice.setPoNumber("PO-001");
        poOffice.setQuotation(q);
        poOffice.setPoDate(LocalDate.now());
        poOffice.setPoValue(new BigDecimal("1000"));
        poOffice.setStatus(PurchaseOrderStatus.VERIFIED);
        poOffice.setDeliveryDestinationType("COMPANY_OFFICE");
        poOffice.setDeliveryAddress("956, 3rd Floor, Bengaluru"); // Acrovix office
        poOffice.setCreatedBy(admin);
        poOffice = poRepo.save(poOffice);

        var invResponse = invoiceService.createInvoiceFromPurchaseOrder(poOffice.getId(), InvoiceType.TAX_INVOICE, admin);
        org.junit.jupiter.api.Assertions.assertNotNull(invResponse);
        // CRITICAL: Invoice clientShippingAddress must NOT be poisoned with Acrovix's office address!
        org.junit.jupiter.api.Assertions.assertNotEquals("956, 3rd Floor, Bengaluru", invResponse.getClientShippingAddress(),
                "Client shipping address on sales invoice must never be populated with Acrovix's company office address");

        // Case 2: PO with CUSTOMER_SITE delivery
        PurchaseOrder poDropShip = new PurchaseOrder();
        poDropShip.setPoNumber("PO-002");
        poDropShip.setQuotation(q);
        poDropShip.setPoDate(LocalDate.now());
        poDropShip.setPoValue(new BigDecimal("1000"));
        poDropShip.setStatus(PurchaseOrderStatus.VERIFIED);
        poDropShip.setDeliveryDestinationType("CUSTOMER_SITE");
        poDropShip.setDeliveryAddress("Site 42, Hinjewadi Phase 2, Pune");
        poDropShip.setCreatedBy(admin);
        poDropShip = poRepo.save(poDropShip);

        var invDropShip = invoiceService.createInvoiceFromPurchaseOrder(poDropShip.getId(), InvoiceType.TAX_INVOICE, admin);
        org.junit.jupiter.api.Assertions.assertNotNull(invDropShip);
        org.junit.jupiter.api.Assertions.assertEquals("Site 42, Hinjewadi Phase 2, Pune", invDropShip.getClientShippingAddress(),
                "Client shipping address on sales invoice should adopt drop-ship customer delivery destination");
    }
}
