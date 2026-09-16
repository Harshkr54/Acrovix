package com.acrovix.admin.service;

import com.acrovix.admin.dto.InvoiceItemRequest;
import com.acrovix.admin.dto.InvoiceRequest;
import com.acrovix.admin.entity.*;
import com.acrovix.admin.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class InvoiceServiceTest {

    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private CustomerRepository customerRepository;
    @Mock
    private QuotationRepository quotationRepository;
    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;
    @Mock
    private ProductServiceRepository productServiceRepository;
    @Mock
    private CompanySettingsRepository companySettingsRepository;
    @Mock
    private SequenceGeneratorService sequenceGeneratorService;
    @Mock
    private AdminActivityRepository activityRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private PdfService pdfService;

    @InjectMocks
    private InvoiceService invoiceService;

    private AdminUser adminUser;
    private CompanySettings companySettings;
    private Customer customer;

    @BeforeEach
    void setUp() {
        adminUser = new AdminUser();
        adminUser.setId(1L);
        adminUser.setName("Test Admin");

        companySettings = new CompanySettings();
        companySettings.setCompanyName("Acrovix");
        companySettings.setGstin("27AAAAA0000A1Z5");
        companySettings.setState("Maharashtra");

        customer = new Customer();
        customer.setId(100L);
        customer.setName("Test Customer");
        customer.setGstin("27BBBBB0000B1Z5");
        customer.setState("Maharashtra");
    }

    @Test
    void testCreateDraftInvoice() {
        InvoiceRequest request = new InvoiceRequest();
        request.setInvoiceType(InvoiceType.TAX_INVOICE);
        request.setInvoiceDate(LocalDate.now());
        request.setCustomerId(100L);

        List<InvoiceItemRequest> items = new ArrayList<>();
        InvoiceItemRequest item1 = new InvoiceItemRequest();
        item1.setDescription("Item 1");
        item1.setQuantity(new BigDecimal("2"));
        item1.setUnitPrice(new BigDecimal("500"));
        item1.setTaxPercent(new BigDecimal("18"));
        items.add(item1);
        request.setItems(items);

        when(customerRepository.findById(100L)).thenReturn(Optional.of(customer));
        when(companySettingsRepository.findAll()).thenReturn(List.of(companySettings));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        Invoice draft = invoiceService.createDraftInvoice(request, adminUser);

        assertNotNull(draft);
        assertEquals(InvoiceStatus.DRAFT, draft.getStatus());
        assertEquals(InvoiceType.TAX_INVOICE, draft.getInvoiceType());
        assertFalse(draft.isLocked());
        
        // 2 * 500 = 1000
        assertEquals(0, new BigDecimal("1000.00").compareTo(draft.getTaxableAmount()));
        
        // 18% of 1000 = 180
        assertEquals(0, new BigDecimal("180.00").compareTo(draft.getTaxAmount()));
        
        // Same state (Maharashtra) -> CGST 90, SGST 90, IGST 0
        assertEquals(0, new BigDecimal("90.00").compareTo(draft.getCgstAmount()));
        assertEquals(0, new BigDecimal("90.00").compareTo(draft.getSgstAmount()));
        assertEquals(0, BigDecimal.ZERO.compareTo(draft.getIgstAmount()));
        
        assertEquals(0, new BigDecimal("1180.00").compareTo(draft.getGrandTotal()));
    }

    @Test
    void testConvertProformaToTaxInvoice() {
        Invoice proforma = new Invoice();
        proforma.setId(50L);
        proforma.setInvoiceType(InvoiceType.PROFORMA);
        proforma.setStatus(InvoiceStatus.ISSUED);
        proforma.setGrandTotal(new BigDecimal("1000.00"));
        
        InvoiceItem pItem = new InvoiceItem();
        pItem.setDescription("PItem");
        proforma.setItems(new ArrayList<>(List.of(pItem)));

        when(invoiceRepository.findById(50L)).thenReturn(Optional.of(proforma));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        Invoice taxInvoice = invoiceService.convertProformaToTaxInvoice(50L, adminUser);

        assertNotNull(taxInvoice);
        assertEquals(InvoiceType.TAX_INVOICE, taxInvoice.getInvoiceType());
        assertEquals(InvoiceStatus.DRAFT, taxInvoice.getStatus());
        assertEquals(new BigDecimal("1000.00"), taxInvoice.getGrandTotal());
        assertEquals(1, taxInvoice.getItems().size());
    }

    @Test
    void testPartialInvoicingValidationPasses() {
        PurchaseOrder po = new PurchaseOrder();
        po.setId(200L);
        po.setPoValue(new BigDecimal("10000.00"));
        po.setStatus(PurchaseOrderStatus.VERIFIED);

        Invoice currentInvoice = new Invoice();
        currentInvoice.setPurchaseOrder(po);
        currentInvoice.setGrandTotal(new BigDecimal("4000.00"));

        when(invoiceRepository.sumInvoicedAmountForPo(200L)).thenReturn(new BigDecimal("5000.00"));
        
        assertDoesNotThrow(() -> {
            java.lang.reflect.Method method = InvoiceService.class.getDeclaredMethod("validatePartialInvoicing", Invoice.class);
            method.setAccessible(true);
            method.invoke(invoiceService, currentInvoice);
        });
    }

    @Test
    void testPartialInvoicingValidationFails() {
        PurchaseOrder po = new PurchaseOrder();
        po.setId(200L);
        po.setPoValue(new BigDecimal("10000.00"));
        po.setStatus(PurchaseOrderStatus.VERIFIED);

        Invoice currentInvoice = new Invoice();
        currentInvoice.setPurchaseOrder(po);
        currentInvoice.setGrandTotal(new BigDecimal("4000.00"));

        when(invoiceRepository.sumInvoicedAmountForPo(200L)).thenReturn(new BigDecimal("7000.00"));
        
        Exception ex = assertThrows(Exception.class, () -> {
            java.lang.reflect.Method method = InvoiceService.class.getDeclaredMethod("validatePartialInvoicing", Invoice.class);
            method.setAccessible(true);
            method.invoke(invoiceService, currentInvoice);
        });

        assertTrue(ex.getCause().getMessage().contains("Over-invoicing is not allowed"));
    }
}
