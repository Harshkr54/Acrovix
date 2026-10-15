package com.acrovix.admin.service;

import com.acrovix.admin.dto.CompanySettingsResponse;
import com.acrovix.admin.entity.*;
import com.lowagie.text.pdf.PdfReader;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

class PdfDisclaimerAndDeliveryAddressTest {

    private PdfService pdfService;
    private CompanySettingsService companySettingsService;
    private CompanySettingsResponse sampleSettings;

    @BeforeEach
    void setUp() {
        sampleSettings = CompanySettingsResponse.builder()
                .companyName("ACROVIX INNOVATIONS PRIVATE LIMITED")
                .legalName("ACROVIX INNOVATIONS PRIVATE LIMITED")
                .registeredAddress("3rd Floor, 956, Vigneshwara, 6th Cross, Bengaluru, Karnataka - 560060")
                .billingAddress("3rd Floor, 956, Vigneshwara, 6th Cross, Bengaluru, Karnataka - 560060")
                .phone("+91 98765 43210")
                .email("contact@acrovix.com")
                .website("www.acrovix.com")
                .gstin("29ABCFA2588C1Z8")
                .build();

        companySettingsService = new CompanySettingsService(null, null) {
            @Override
            public CompanySettingsResponse getCompanySettings() {
                return sampleSettings;
            }
        };
        pdfService = new PdfService();

        try {
            var field = PdfService.class.getDeclaredField("companySettingsService");
            field.setAccessible(true);
            field.set(pdfService, companySettingsService);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private String extractAllPdfText(byte[] pdfBytes) throws Exception {
        PdfReader reader = new PdfReader(pdfBytes);
        StringBuilder sb = new StringBuilder();
        Pattern pattern = Pattern.compile("\\(((?:[^\\\\\\)]|\\\\.)*)\\)");
        for (int i = 1; i <= reader.getNumberOfPages(); i++) {
            byte[] pageBytes = reader.getPageContent(i);
            if (pageBytes != null) {
                String raw = new String(pageBytes, StandardCharsets.ISO_8859_1);
                Matcher m = pattern.matcher(raw);
                while (m.find()) {
                    String val = m.group(1).replace("\\(", "(").replace("\\)", ")");
                    sb.append(val).append(" ");
                }
                sb.append("\n");
            }
        }
        reader.close();
        return sb.toString().replaceAll("\\s+", " ").trim();
    }

    private Quotation createSampleQuotation(Customer customer) {
        Quotation quotation = new Quotation();
        quotation.setId(10L);
        quotation.setQuotationNumber("ACX-Q-2026-0001");
        quotation.setCreatedAt(LocalDateTime.of(2026, 10, 10, 10, 0));
        quotation.setValidUntil(LocalDate.of(2026, 11, 10));
        quotation.setClientCompany("RADIANT INFO SOLUTIONS PRIVATE LIMITED");
        quotation.setClientName("Mr. Amit Kumar");
        quotation.setClientEmail("amit@radiantinfosolutions.com");
        quotation.setClientPhone("+91 91234 56789");
        quotation.setCurrency(Currency.INR);
        quotation.setCustomer(customer);

        List<QuotationItem> items = new ArrayList<>();
        QuotationItem item = new QuotationItem();
        item.setSku("SRV-001");
        item.setDescription("Enterprise Cloud Migration & Setup");
        item.setHsnSac("998313");
        item.setQuantity(BigDecimal.ONE);
        item.setUnitPrice(new BigDecimal("100000.00"));
        item.setTaxPercent(new BigDecimal("18.00"));
        items.add(item);

        quotation.setItems(items);
        quotation.setSubtotal(new BigDecimal("100000.00"));
        quotation.setTaxAmount(new BigDecimal("18000.00"));
        quotation.setGrandTotal(new BigDecimal("118000.00"));
        return quotation;
    }

    private PurchaseOrder createSamplePurchaseOrder(Customer customer) {
        Quotation quotation = createSampleQuotation(customer);

        AdminUser creator = new AdminUser();
        creator.setName("Jane Admin");

        return PurchaseOrder.builder()
                .id(5L)
                .poNumber("PO-2026-0005")
                .poDate(LocalDate.of(2026, 10, 15))
                .currency(Currency.INR)
                .poValue(new BigDecimal("118000.00"))
                .quotation(quotation)
                .createdBy(creator)
                .deliveryDestinationType("CUSTOMER_SITE")
                .remarks("Deliver to recipient site as per schedule.")
                .build();
    }

    @Test
    @DisplayName("PO with separate customer shipping address renders shipping address in Delivery Address")
    void testPurchaseOrder_WithSeparateShippingAddress() throws Exception {
        Customer customer = new Customer();
        customer.setName("Mr. Amit Kumar");
        customer.setCompanyName("RADIANT INFO SOLUTIONS PRIVATE LIMITED");
        customer.setBillingAddress("101 Corporate Towers, Barakhamba Road, New Delhi");
        customer.setShippingAddress("Warehouse 4B, Sector 58, Industrial Area, Gurugram");
        customer.setState("06-Haryana");
        customer.setPincode("122001");

        PurchaseOrder po = createSamplePurchaseOrder(customer);
        byte[] pdfBytes = pdfService.generatePurchaseOrderPdf(po);

        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 0);

        String pdfText = extractAllPdfText(pdfBytes);

        // 1. Delivery Address must contain the shipping address
        assertTrue(pdfText.contains("Warehouse 4B, Sector 58, Industrial Area, Gurugram"),
                "Delivery Address must contain the customer's shipping address");

        // 2. Recipient client company is rendered
        assertTrue(pdfText.contains("RADIANT INFO SOLUTIONS PRIVATE LIMITED"));

        // 3. Digital document disclaimer must appear
        assertTrue(pdfText.contains(PdfService.DIGITAL_DOCUMENT_DISCLAIMER),
                "PO PDF must contain standard digital document disclaimer");

        // 4. No hardcoded Harsh Raj signature or Business Development designation
        assertFalse(pdfText.contains("Harsh Raj"), "PO PDF must not contain hardcoded Harsh Raj");
        assertFalse(pdfText.contains("Business Development"), "PO PDF must not contain Business Development designation");

        // 5. Dual authorization blocks must remain intact
        assertTrue(pdfText.contains("For Vendor"), "Vendor authorization section must be present");
        assertTrue(pdfText.contains("For " + sampleSettings.getCompanyName()), "Acrovix authorization section must be present");
    }

    @Test
    @DisplayName("PO with explicit delivery address uses explicit delivery address")
    void testPurchaseOrder_WithExplicitDeliveryAddress() throws Exception {
        Customer customer = new Customer();
        customer.setName("Mr. Amit Kumar");
        customer.setCompanyName("RADIANT INFO SOLUTIONS PRIVATE LIMITED");
        customer.setBillingAddress("101 Corporate Towers, Barakhamba Road, New Delhi");
        customer.setShippingAddress(null); // No registered shipping address
        customer.setState("07-Delhi");
        customer.setPincode("110001");

        PurchaseOrder po = createSamplePurchaseOrder(customer);
        po.setDeliveryAddress("Project Site B, Okhla Phase 3, New Delhi");
        po.setDeliveryContactName("Site Supervisor Rajesh");
        po.setDeliveryContactPhone("+91 98111 22233");
        byte[] pdfBytes = pdfService.generatePurchaseOrderPdf(po);

        assertNotNull(pdfBytes);
        String pdfText = extractAllPdfText(pdfBytes);

        // Should use explicit delivery address
        assertTrue(pdfText.contains("Project Site B, Okhla Phase 3, New Delhi"),
                "Delivery Address should render the explicitly specified delivery destination");
        assertTrue(pdfText.contains("Site Supervisor Rajesh"));
        assertTrue(pdfText.contains(PdfService.DIGITAL_DOCUMENT_DISCLAIMER));
        assertFalse(pdfText.contains("Harsh Raj"));
    }

    @Test
    @DisplayName("PO with no customer address shows 'Not Specified' and never ACROVIX address")
    void testPurchaseOrder_WithNoCustomerAddress_ShowsNotSpecified() throws Exception {
        Customer customer = new Customer();
        customer.setName("Mr. Amit Kumar");
        customer.setCompanyName("RADIANT INFO SOLUTIONS PRIVATE LIMITED");
        customer.setBillingAddress(null);
        customer.setShippingAddress(null);

        PurchaseOrder po = createSamplePurchaseOrder(customer);
        byte[] pdfBytes = pdfService.generatePurchaseOrderPdf(po);

        assertNotNull(pdfBytes);
        String pdfText = extractAllPdfText(pdfBytes);

        assertTrue(pdfText.contains("Not Specified"),
                "When no customer address exists, Delivery Address must show 'Not Specified'");
        assertTrue(pdfText.contains(PdfService.DIGITAL_DOCUMENT_DISCLAIMER));
        assertFalse(pdfText.contains("Harsh Raj"));
    }

    @Test
    @DisplayName("Historical PO with missing delivery destination and address renders 'Not Specified' and never silently assigns ACROVIX office")
    void testHistoricalPurchaseOrder_WithMissingDeliveryDestinationAndAddress_RendersNotSpecified() throws Exception {
        Customer customer = new Customer();
        customer.setName("Mr. Amit Kumar");
        customer.setCompanyName("RADIANT INFO SOLUTIONS PRIVATE LIMITED");
        customer.setBillingAddress("101 Corporate Towers, New Delhi");

        PurchaseOrder po = createSamplePurchaseOrder(customer);
        po.setDeliveryDestinationType(null); // Missing historical destination type
        po.setDeliveryAddress(null); // Missing historical delivery address
        po.setDeliveryContactName(null);
        po.setDeliveryContactPhone(null);

        byte[] pdfBytes = pdfService.generatePurchaseOrderPdf(po);
        assertNotNull(pdfBytes);
        String pdfText = extractAllPdfText(pdfBytes);

        // SHIP TO must display 'Not Specified' and NEVER ACROVIX's office address
        assertTrue(pdfText.contains("Destination: Not Specified"), "Historical PO without delivery data must show Destination: Not Specified");
        assertTrue(pdfText.contains("Not Specified"), "Ship To address must show 'Not Specified'");
        assertFalse(pdfText.contains("Destination: ACROVIX Office"), "Must not silently assign ACROVIX Office without business basis");
    }

    @Test
    @DisplayName("PO with COMPANY_OFFICE delivery destination renders ACROVIX Office in Ship To")
    void testPurchaseOrder_CompanyOfficeDelivery_ShipToIsAcrovixOffice() throws Exception {
        Customer customer = new Customer();
        customer.setName("Mr. Vendor Contact");
        customer.setCompanyName("HARDWARE VENDOR PVT LTD");
        customer.setBillingAddress("Vendor Complex, Nehru Place, New Delhi");
        customer.setShippingAddress("Vendor Warehouse, Noida Sector 62, UP");

        PurchaseOrder po = createSamplePurchaseOrder(customer);
        po.setDeliveryDestinationType("COMPANY_OFFICE");
        po.setDeliveryAddress("3rd Floor, 956, Vigneshwara, 6th Cross, Bengaluru, Karnataka - 560060");
        po.setDeliveryContactName("ACROVIX Operations");
        po.setDeliveryContactPhone("+91 98765 43210");

        byte[] pdfBytes = pdfService.generatePurchaseOrderPdf(po);
        assertNotNull(pdfBytes);
        String pdfText = extractAllPdfText(pdfBytes);

        // SHIP TO must contain ACROVIX company name & office address, NOT vendor address
        assertTrue(pdfText.contains("SHIP TO (DELIVERY ADDRESS)"));
        assertTrue(pdfText.contains("Destination: ACROVIX Office"));
        assertTrue(pdfText.contains("3rd Floor, 956, Vigneshwara"));
        assertFalse(pdfText.contains("Vendor Warehouse, Noida"), "Must not ship to vendor warehouse when destination is company office");
    }

    @Test
    @DisplayName("PO with CUSTOMER_SITE delivery destination renders customer site, not vendor address")
    void testPurchaseOrder_CustomerSiteDropShip_ShipToIsCustomerSiteNotVendor() throws Exception {
        Customer customer = new Customer();
        customer.setName("Mr. Client Lead");
        customer.setCompanyName("ENTERPRISE CLIENT LTD");
        customer.setBillingAddress("Client HQ, BKC, Mumbai");
        customer.setShippingAddress("Data Center Facility 2, Hinjewadi Phase 1, Pune 411057");

        PurchaseOrder po = createSamplePurchaseOrder(customer);
        po.setDeliveryDestinationType("CUSTOMER_SITE");
        po.setDeliveryAddress("Data Center Facility 2, Hinjewadi Phase 1, Pune 411057");
        po.setDeliveryContactName("Data Center Manager");
        po.setDeliveryContactPhone("+91 98220 11223");

        byte[] pdfBytes = pdfService.generatePurchaseOrderPdf(po);
        assertNotNull(pdfBytes);
        String pdfText = extractAllPdfText(pdfBytes);

        assertTrue(pdfText.contains("SHIP TO (DELIVERY ADDRESS)"));
        assertTrue(pdfText.contains("Destination: Client / Project Site"));
        assertTrue(pdfText.contains("ENTERPRISE CLIENT LTD"));
        assertTrue(pdfText.contains("Data Center Facility 2, Hinjewadi Phase 1, Pune 411057"));
        assertTrue(pdfText.contains("Data Center Manager"));
    }

    @Test
    @DisplayName("PO with CUSTOM delivery destination renders custom destination site")
    void testPurchaseOrder_CustomDestination_ShipToIsCustomSite() throws Exception {
        Customer customer = new Customer();
        customer.setName("Mr. Procurement");
        customer.setCompanyName("GLOBAL VENDOR CORP");

        PurchaseOrder po = createSamplePurchaseOrder(customer);
        po.setDeliveryDestinationType("CUSTOM");
        po.setDeliveryAddress("Third-party Assembly Hub, Whitefield, Bengaluru 560066");
        po.setDeliveryContactName("Hub Incharge Suresh");
        po.setDeliveryContactPhone("+91 97400 55667");

        byte[] pdfBytes = pdfService.generatePurchaseOrderPdf(po);
        assertNotNull(pdfBytes);
        String pdfText = extractAllPdfText(pdfBytes);

        assertTrue(pdfText.contains("SHIP TO (DELIVERY ADDRESS)"));
        assertTrue(pdfText.contains("Destination: Designated Site"));
        assertTrue(pdfText.contains("Third-party Assembly Hub, Whitefield, Bengaluru 560066"));
        assertTrue(pdfText.contains("Hub Incharge Suresh"));
    }

    @Test
    @DisplayName("PO retains ACROVIX company address in issuer header")
    void testPurchaseOrder_IssuerHeaderRetainsAcrovix() throws Exception {
        Customer customer = new Customer();
        customer.setCompanyName("CLIENT CORP");
        customer.setShippingAddress("Client Ship Address");

        PurchaseOrder po = createSamplePurchaseOrder(customer);
        byte[] pdfBytes = pdfService.generatePurchaseOrderPdf(po);

        String pdfText = extractAllPdfText(pdfBytes);
        // Header retains ACROVIX
        assertTrue(pdfText.contains("ACROVIX INNOVATIONS PRIVATE LIMITED"));
        assertTrue(pdfText.contains("contact@acrovix.com"));
        assertTrue(pdfText.contains("www.acrovix.com"));
    }

    @Test
    @DisplayName("Quotation PDF contains standard digital document disclaimer")
    void testQuotationPdf_ContainsStandardDisclaimer() throws Exception {
        Customer customer = new Customer();
        customer.setName("Mr. Test User");
        customer.setCompanyName("Test Company");
        customer.setBillingAddress("123 Test St, Test City");

        Quotation quotation = createSampleQuotation(customer);
        byte[] pdfBytes = pdfService.generateQuotationPdf(quotation);

        assertNotNull(pdfBytes);
        String pdfText = extractAllPdfText(pdfBytes);

        assertTrue(pdfText.contains(PdfService.DIGITAL_DOCUMENT_DISCLAIMER),
                "Quotation PDF must contain the standardized digital document disclaimer");
    }

    @Test
    @DisplayName("Tax Invoice PDF contains standard disclaimer and removes duplicate computer generated note")
    void testTaxInvoicePdf_ContainsStandardDisclaimer() throws Exception {
        Invoice invoice = new Invoice();
        invoice.setInvoiceNumber("INV-2026-0001");
        invoice.setInvoiceType(InvoiceType.TAX_INVOICE);
        invoice.setInvoiceDate(LocalDate.of(2026, 10, 15));
        invoice.setDueDate(LocalDate.of(2026, 11, 15));
        invoice.setCurrency(Currency.INR);
        invoice.setTaxableAmount(new BigDecimal("10000.00"));
        invoice.setGrandTotal(new BigDecimal("11800.00"));
        invoice.setClientCompany("RADIANT INFO SOLUTIONS PRIVATE LIMITED");
        invoice.setClientName("Mr. Amit Kumar");
        invoice.setClientAddress("101 Corporate Towers, New Delhi");

        List<InvoiceItem> items = new ArrayList<>();
        InvoiceItem item = new InvoiceItem();
        item.setDescription("Cloud Services");
        item.setQuantity(BigDecimal.ONE);
        item.setUnitPrice(new BigDecimal("10000.00"));
        item.setTaxPercent(new BigDecimal("18.00"));
        item.setTaxableAmount(new BigDecimal("10000.00"));
        items.add(item);
        invoice.setItems(items);

        byte[] pdfBytes = pdfService.generateInvoicePdf(invoice);
        assertNotNull(pdfBytes);
        String pdfText = extractAllPdfText(pdfBytes);

        assertTrue(pdfText.contains(PdfService.DIGITAL_DOCUMENT_DISCLAIMER),
                "Tax Invoice PDF must contain standard disclaimer");
        assertFalse(pdfText.contains("Computer Generated Tax Invoice"),
                "Tax Invoice must not contain redundant legacy computer generated label");
    }

    @Test
    @DisplayName("Proforma Invoice PDF contains standard disclaimer")
    void testProformaInvoicePdf_ContainsStandardDisclaimer() throws Exception {
        Invoice invoice = new Invoice();
        invoice.setInvoiceNumber("PI-2026-0001");
        invoice.setInvoiceType(InvoiceType.PROFORMA);
        invoice.setInvoiceDate(LocalDate.of(2026, 10, 15));
        invoice.setDueDate(LocalDate.of(2026, 11, 15));
        invoice.setCurrency(Currency.INR);
        invoice.setTaxableAmount(new BigDecimal("10000.00"));
        invoice.setGrandTotal(new BigDecimal("11800.00"));
        invoice.setClientCompany("RADIANT INFO SOLUTIONS PRIVATE LIMITED");
        invoice.setClientName("Mr. Amit Kumar");
        invoice.setClientAddress("101 Corporate Towers, New Delhi");

        List<InvoiceItem> items = new ArrayList<>();
        InvoiceItem item = new InvoiceItem();
        item.setDescription("Consulting");
        item.setQuantity(BigDecimal.ONE);
        item.setUnitPrice(new BigDecimal("10000.00"));
        item.setTaxPercent(new BigDecimal("18.00"));
        item.setTaxableAmount(new BigDecimal("10000.00"));
        items.add(item);
        invoice.setItems(items);

        byte[] pdfBytes = pdfService.generateInvoicePdf(invoice);
        assertNotNull(pdfBytes);
        String pdfText = extractAllPdfText(pdfBytes);

        assertTrue(pdfText.contains(PdfService.DIGITAL_DOCUMENT_DISCLAIMER),
                "Proforma Invoice PDF must contain standard disclaimer");
    }

    @Test
    @DisplayName("Payment Receipt PDF contains standard disclaimer and removes personal signature")
    void testPaymentReceiptPdf_ContainsStandardDisclaimerAndNoHarshRaj() throws Exception {
        Payment payment = new Payment();
        payment.setPaymentNumber("REC-2026-0001");
        payment.setPaymentDate(LocalDate.of(2026, 10, 15));
        payment.setAmount(new BigDecimal("11800.00"));
        payment.setPaymentMethod(PaymentMethod.BANK_TRANSFER);
        payment.setTransactionReference("UTR123456789");

        Invoice invoice = new Invoice();
        invoice.setInvoiceNumber("INV-2026-0001");
        invoice.setClientCompany("RADIANT INFO SOLUTIONS PRIVATE LIMITED");
        invoice.setClientName("Mr. Amit Kumar");
        payment.setInvoice(invoice);

        byte[] pdfBytes = pdfService.generatePaymentReceiptPdf(payment);
        assertNotNull(pdfBytes);
        String pdfText = extractAllPdfText(pdfBytes);

        assertTrue(pdfText.contains(PdfService.DIGITAL_DOCUMENT_DISCLAIMER),
                "Payment Receipt PDF must contain standard disclaimer");
        assertFalse(pdfText.contains("Harsh Raj"),
                "Payment Receipt PDF must not contain hardcoded Harsh Raj");
    }

    @Test
    @DisplayName("Approved PO Template: Renders centered title, 11-column table, Raised To, Bill To/Ship To, Terms & Remarks, Dual Authorization")
    void testPurchaseOrder_ApprovedDesignTemplate_AllElementsPresent() throws Exception {
        Customer customer = new Customer();
        customer.setName("Mr. Anil Joglekar");
        customer.setCompanyName("CS Infocomm Pvt. Ltd.");
        customer.setBillingAddress("504/A, 505/A, Sagar Tech Plaza, Sakinaka, Andheri East, Mumbai 400072");
        customer.setShippingAddress("504/A, 505/A, Sagar Tech Plaza, Sakinaka, Andheri East, Mumbai 400072");
        customer.setGstin("07AAECR0284N1Z2");
        customer.setPan("U72900DL2008PTC178862");
        customer.setPaymentTerms("As per Terms & Conditions");

        Quotation quotation = new Quotation();
        quotation.setId(7L);
        quotation.setQuotationNumber("ACX/Q/072111");
        quotation.setClientCompany("RADIANT INFO SOLUTIONS PVT LTD");
        quotation.setClientName("Mr. Anil Joglekar");
        quotation.setClientEmail("anil.joglekar@csinfocomm.com");
        quotation.setClientPhone("9867976149");
        quotation.setCurrency(Currency.INR);
        quotation.setCustomer(customer);
        quotation.setTermsAndConditions("1. This Purchase Order is issued for VMware vSphere Foundation subscription licenses.\n2. Year 1 pricing is quoted in INR; Year 2 and Year 3 in USD.\n3. Invoices must be raised to Acrovix.");

        List<QuotationItem> items = new ArrayList<>();

        // Row 1
        QuotationItem item1 = new QuotationItem();
        item1.setDescription("VMware vSphere Foundation");
        item1.setSku("VCF-VSP-FND-1Y");
        item1.setQuantity(new BigDecimal("128"));
        item1.setUnitPrice(new BigDecimal("11875.00"));
        item1.setListPrice(new BigDecimal("12500.00"));
        item1.setTaxPercent(new BigDecimal("18.00"));
        item1.setLineTotal(new BigDecimal("1520000.00"));
        java.util.Map<String, String> cv1 = new java.util.HashMap<>();
        cv1.put("productFamily", "VSPHERE");
        cv1.put("productSubFamily", "VSPHERE FOUNDATION");
        cv1.put("licenseMetric", "Core");
        cv1.put("licenseType", "Subscription");
        cv1.put("year", "Year 1");
        cv1.put("currency", "INR");
        item1.setCustomValues(cv1);
        items.add(item1);

        // Row 2
        QuotationItem item2 = new QuotationItem();
        item2.setDescription("VMware vSphere Foundation");
        item2.setSku("VCF-VSP-FND-1Y");
        item2.setQuantity(new BigDecimal("128"));
        item2.setUnitPrice(new BigDecimal("123.70"));
        item2.setListPrice(new BigDecimal("123.70"));
        item2.setTaxPercent(new BigDecimal("18.00"));
        item2.setLineTotal(new BigDecimal("15833.60"));
        java.util.Map<String, String> cv2 = new java.util.HashMap<>();
        cv2.put("productFamily", "VSPHERE");
        cv2.put("productSubFamily", "VSPHERE FOUNDATION");
        cv2.put("licenseMetric", "Core");
        cv2.put("licenseType", "Subscription");
        cv2.put("year", "Year 2");
        cv2.put("currency", "USD");
        item2.setCustomValues(cv2);
        items.add(item2);

        // Row 3
        QuotationItem item3 = new QuotationItem();
        item3.setDescription("VMware vSphere Foundation");
        item3.setSku("VCF-VSP-FND-1Y");
        item3.setQuantity(new BigDecimal("128"));
        item3.setUnitPrice(new BigDecimal("123.70"));
        item3.setListPrice(new BigDecimal("123.70"));
        item3.setTaxPercent(new BigDecimal("18.00"));
        item3.setLineTotal(new BigDecimal("15833.60"));
        java.util.Map<String, String> cv3 = new java.util.HashMap<>();
        cv3.put("productFamily", "VSPHERE");
        cv3.put("productSubFamily", "VSPHERE FOUNDATION");
        cv3.put("licenseMetric", "Core");
        cv3.put("licenseType", "Subscription");
        cv3.put("year", "Year 3");
        cv3.put("currency", "USD");
        item3.setCustomValues(cv3);
        items.add(item3);

        quotation.setItems(items);
        quotation.setSubtotal(new BigDecimal("1634000.00"));
        quotation.setTaxAmount(new BigDecimal("293550.00"));
        quotation.setGrandTotal(new BigDecimal("1927550.00"));

        PurchaseOrder po = PurchaseOrder.builder()
                .id(7L)
                .poNumber("ACX/PO/072111")
                .poDate(LocalDate.of(2026, 10, 9))
                .currency(Currency.INR)
                .poValue(new BigDecimal("1927550.00"))
                .quotation(quotation)
                .deliveryDestinationType("CUSTOMER_SITE")
                .deliveryAddress("504/A, 505/A, Sagar Tech Plaza, Sakinaka, Andheri East, Mumbai 400072")
                .deliveryContactName("Mr. Anil Joglekar")
                .deliveryContactPhone("9867976149")
                .remarks("30 days to pay")
                .build();

        byte[] pdfBytes = pdfService.generatePurchaseOrderPdf(po);
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 0);
        new java.io.File("target").mkdirs();
        try (java.io.FileOutputStream fos = new java.io.FileOutputStream("target/test-po-approved-design.pdf")) {
            fos.write(pdfBytes);
        }

        String pdfText = extractAllPdfText(pdfBytes);

        // Header Company Info Verification
        assertTrue(pdfText.contains("ACROVIX INNOVATIONS PRIVATE LIMITED"), "Header must contain company name");
        assertTrue(pdfText.contains("contact@acrovix.com") || pdfText.contains("sales@acrovix.com"), "Header must contain company email");

        // 1. Centered Title
        assertTrue(pdfText.contains("PURCHASE ORDER"), "Must contain centered PURCHASE ORDER title");

        // 2. Raised To Section
        assertTrue(pdfText.contains("Raised to,"), "Must contain 'Raised to,'");
        assertTrue(pdfText.contains("RADIANT INFO SOLUTIONS PVT LTD"), "Must contain vendor legal name");
        assertTrue(pdfText.contains("07AAECR0284N1Z2"), "Must contain vendor GSTIN");
        assertTrue(pdfText.contains("U72900DL2008PTC178862"), "Must contain vendor CIN/PAN");

        // 3. PO Information Grid
        assertTrue(pdfText.contains("PO Number"), "Must contain PO Number label");
        assertTrue(pdfText.contains("ACX/PO/072111"), "Must contain actual PO Number");
        assertTrue(pdfText.contains("09-OCT-2026"), "Must contain formatted PO Date");
        assertTrue(pdfText.contains("Payment Terms"), "Must contain Payment Terms label");
        assertTrue(pdfText.contains("As per Terms & Conditions"), "Must contain payment terms value");
        assertTrue(pdfText.contains("INR / USD (Year-wise)"), "Must reflect multi-currency year-wise breakdown");

        // 4. Side-by-side BILL TO & SHIP TO (DELIVERY ADDRESS)
        assertTrue(pdfText.contains("BILL TO"), "Must contain BILL TO panel");
        assertTrue(pdfText.contains("ACROVIX INNOVATIONS PRIVATE LIMITED"), "Must contain Acrovix company name in Bill To");
        assertTrue(pdfText.contains("SHIP TO (DELIVERY ADDRESS)"), "Must contain SHIP TO (DELIVERY ADDRESS) panel");
        assertTrue(pdfText.contains("CS Infocomm Pvt. Ltd."), "Must contain customer name in Ship To");
        assertTrue(pdfText.contains("504/A, 505/A, Sagar Tech Plaza, Sakinaka, Andheri East, Mumbai 400072"), "Must contain delivery address");
        assertTrue(pdfText.contains("Mr. Anil Joglekar"), "Must contain Kind Attn contact person");
        assertTrue(pdfText.contains("anil.joglekar@csinfocomm.com"), "Must contain contact email");
        assertTrue(pdfText.contains("9867976149"), "Must contain contact phone");

        // 5. ORDER DETAILS 11 Columns
        assertTrue(pdfText.contains("ORDER DETAILS"), "Must contain ORDER DETAILS section heading");
        assertTrue(pdfText.contains("Product Family"), "Must contain Product Family column header");
        assertTrue(pdfText.contains("Product SubFamily"), "Must contain Product SubFamily column header");
        assertTrue(pdfText.contains("Item Number"), "Must contain Item Number column header");
        assertTrue(pdfText.contains("Description"), "Must contain Description column header");
        assertTrue(pdfText.contains("License Metric"), "Must contain License Metric column header");
        assertTrue(pdfText.contains("License Type"), "Must contain License Type column header");
        assertTrue(pdfText.contains("Year"), "Must contain Year column header");
        assertTrue(pdfText.contains("Price/Core"), "Must contain Price/Core column header");
        assertTrue(pdfText.contains("Total Cores"), "Must contain Total Cores column header");
        assertTrue(pdfText.contains("Total Price"), "Must contain Total Price column header");

        // Line Item dynamic data
        assertTrue(pdfText.contains("VSPHERE"), "Must render Product Family data");
        assertTrue(pdfText.contains("VSPHERE FOUNDATION"), "Must render Product SubFamily data");
        assertTrue(pdfText.contains("VCF-VSP-FND-1Y"), "Must render Item Number data");
        assertTrue(pdfText.contains("VMware vSphere Foundation"), "Must render Description data");
        assertTrue(pdfText.contains("Subscription"), "Must render License Type data");
        assertTrue(pdfText.contains("Year 1"), "Must render Year 1");
        assertTrue(pdfText.contains("Year 2"), "Must render Year 2");
        assertTrue(pdfText.contains("Year 3"), "Must render Year 3");
        assertTrue(pdfText.contains("128"), "Must render Total Cores quantity");

        // 6. Financial Summary
        assertTrue(pdfText.contains("Subtotal"), "Must contain Subtotal");
        assertTrue(pdfText.contains("Discount"), "Must contain Discount");
        assertTrue(pdfText.contains("Taxable Amount"), "Must contain Taxable Amount");
        assertTrue(pdfText.contains("Total Tax (18%)"), "Must contain Total Tax with rate %");
        assertTrue(pdfText.contains("GRAND TOTAL"), "Must contain GRAND TOTAL");

        // 7. TERMS & CONDITIONS and REMARKS / ADDITIONAL NOTES
        assertTrue(pdfText.contains("TERMS & CONDITIONS"), "Must contain TERMS & CONDITIONS");
        assertTrue(pdfText.contains("REMARKS / ADDITIONAL NOTES"), "Must contain REMARKS / ADDITIONAL NOTES");
        assertTrue(pdfText.contains("30 days to pay"), "Must contain actual PO remarks");

        // 8. Dual Authorization & Footer
        assertTrue(pdfText.contains("For " + sampleSettings.getCompanyName()), "Must contain Acrovix authorization header");
        assertTrue(pdfText.contains("For Vendor"), "Must contain For Vendor authorization header");
        assertTrue(pdfText.contains("Authorized Signatory"), "Must contain Authorized Signatory");
        assertTrue(pdfText.contains(PdfService.DIGITAL_DOCUMENT_DISCLAIMER), "Must contain digital disclaimer");
    }

    @Test
    @DisplayName("Approved PO Template: Empty remarks displays clean empty state")
    void testPurchaseOrder_EmptyRemarks_DisplaysCleanEmptyState() throws Exception {
        Customer customer = new Customer();
        customer.setName("Mr. Jane Doe");
        customer.setCompanyName("Acme Corp");
        customer.setBillingAddress("123 Business Way, Bangalore");

        Quotation quotation = createSampleQuotation(customer);
        PurchaseOrder po = PurchaseOrder.builder()
                .id(8L)
                .poNumber("ACX/PO/082222")
                .poDate(LocalDate.of(2026, 10, 10))
                .currency(Currency.INR)
                .poValue(new BigDecimal("118000.00"))
                .quotation(quotation)
                .remarks(null) // Empty remarks
                .build();

        byte[] pdfBytes = pdfService.generatePurchaseOrderPdf(po);
        assertNotNull(pdfBytes);
        String pdfText = extractAllPdfText(pdfBytes);

        assertTrue(pdfText.contains("REMARKS / ADDITIONAL NOTES"), "Must have REMARKS / ADDITIONAL NOTES header");
        assertTrue(pdfText.contains(PdfService.DIGITAL_DOCUMENT_DISCLAIMER));
    }

    @Test
    @DisplayName("Approved PO Template: Multi-page PO with 15 line items renders cleanly")
    void testPurchaseOrder_MultiPageItems_RendersCleanly() throws Exception {
        Customer customer = new Customer();
        customer.setName("Enterprise Client");
        customer.setCompanyName("Mega Corp Ltd");
        customer.setBillingAddress("Tower 1, Cyber City, Gurugram");

        Quotation quotation = new Quotation();
        quotation.setId(9L);
        quotation.setQuotationNumber("ACX/Q/09999");
        quotation.setClientCompany("Mega Corp Ltd");
        quotation.setCurrency(Currency.INR);
        quotation.setCustomer(customer);

        List<QuotationItem> items = new ArrayList<>();
        for (int i = 1; i <= 15; i++) {
            QuotationItem item = new QuotationItem();
            item.setDescription("Software License Module " + i);
            item.setSku("SKU-" + String.format("%03d", i));
            item.setQuantity(new BigDecimal("10"));
            item.setUnitPrice(new BigDecimal("5000.00"));
            item.setTaxPercent(new BigDecimal("18.00"));
            item.setLineTotal(new BigDecimal("50000.00"));
            items.add(item);
        }
        quotation.setItems(items);
        quotation.setSubtotal(new BigDecimal("750000.00"));
        quotation.setTaxAmount(new BigDecimal("135000.00"));
        quotation.setGrandTotal(new BigDecimal("885000.00"));

        PurchaseOrder po = PurchaseOrder.builder()
                .id(9L)
                .poNumber("ACX/PO/09999")
                .poDate(LocalDate.of(2026, 10, 11))
                .currency(Currency.INR)
                .poValue(new BigDecimal("885000.00"))
                .quotation(quotation)
                .remarks("Annual deployment schedule.")
                .build();

        byte[] pdfBytes = pdfService.generatePurchaseOrderPdf(po);
        assertNotNull(pdfBytes);

        PdfReader reader = new PdfReader(pdfBytes);
        assertTrue(reader.getNumberOfPages() >= 2, "15 items PO should paginate across at least 2 pages");
        reader.close();

        String pdfText = extractAllPdfText(pdfBytes);
        assertTrue(pdfText.contains("Software License Module 1"));
        assertTrue(pdfText.contains("Software License Module 15"));
        assertTrue(pdfText.contains("GRAND TOTAL"));
    }
}
