package com.acrovix.admin.service;

import com.acrovix.admin.dto.*;
import com.acrovix.admin.entity.*;
import com.acrovix.admin.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DemoDataService {
    private static final Logger logger = LoggerFactory.getLogger(DemoDataService.class);

    private final DemoTrackerRepository demoTrackerRepository;
    private final CustomerService customerService;
    private final ProductServiceService productServiceService;
    private final QuotationService quotationService;
    private final PurchaseOrderService purchaseOrderService;
    private final AdminEnquiryRepository enquiryRepository;
    private final CustomerRepository customerRepository;
    private final ProductServiceRepository productServiceRepository;
    private final QuotationRepository quotationRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final NotificationRepository notificationRepository;
    private final AdminActivityRepository activityRepository;
    private final AdminUserRepository adminUserRepository;

    @Value("${app.demo-mode:false}")
    private boolean demoMode;

    @Transactional
    public void seedDemoData(String batchId, Long adminId) {
        if (!demoMode) throw new IllegalStateException("Demo mode is disabled");
        
        AdminUser admin = adminUserRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Admin not found"));

        logger.info("Starting demo data generation for batch {}", batchId);

        // 1. Create Customers
        List<Long> customerIds = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            CustomerRequest cr = new CustomerRequest();
            cr.setCustomerCode("DEMO-CUST-00" + i);
            cr.setName("Demo Contact " + i);
            cr.setCompanyName("Demo Company " + i + " Pvt Ltd");
            cr.setEmail("demo.cust." + i + "@acrovix.test");
            cr.setPhone("999999990" + i);
            CustomerResponse res = customerService.createCustomer(cr, adminId);
            customerIds.add(res.getId());
            track(batchId, "CUSTOMER", res.getId());
        }

        // 2. Create Products
        List<Long> productIds = new ArrayList<>();
        for (int i = 1; i <= 3; i++) {
            ProductServiceRequest pr = new ProductServiceRequest();
            pr.setSku("DEMO-PROD-00" + i);
            pr.setName("Demo Product " + i);
            pr.setType(ProductServiceType.PRODUCT);
            pr.setHsnSac("1234");
            pr.setDefaultRate(BigDecimal.valueOf(10000 * i));
            pr.setDefaultGstPercent(BigDecimal.valueOf(18));
            ProductServiceResponse res = productServiceService.createCatalogItem(pr, adminId);
            productIds.add(res.getId());
            track(batchId, "PRODUCT", res.getId());
        }

        // 3. Create Enquiries
        List<Long> enquiryIds = new ArrayList<>();
        for (int i = 1; i <= 3; i++) {
            AdminEnquiry enq = new AdminEnquiry();
            enq.setReferenceId("DEMO-ENQ-00" + i);
            enq.setFullName("Demo Enquiry Contact " + i);
            enq.setCompanyName("Demo Enquiry Company " + i);
            enq.setBusinessEmail("demo.enq." + i + "@acrovix.test");
            enq.setPhoneNumber("+1 555-010" + i);
            enq.setProjectRequirement("Need demo product " + i);
            enq.setStatus("NEW");
            enq.setCreatedAt(LocalDateTime.now());
            enq = enquiryRepository.save(enq);
            enquiryIds.add(enq.getId());
            track(batchId, "ENQUIRY", enq.getId());
        }

        // 4. Quotation Lifecycle (Draft -> Sent -> Revised -> Accepted -> PO)
        // Scenario A: Happy Path PO
        createFullLifecycleQuotation(batchId, admin, customerIds.get(0), productIds.get(0), enquiryIds.get(0), false);
        
        // Scenario B: Mismatch PO
        createFullLifecycleQuotation(batchId, admin, customerIds.get(1), productIds.get(1), enquiryIds.get(1), true);

        logger.info("Demo data generation complete for batch {}", batchId);
    }

    private void createFullLifecycleQuotation(String batchId, AdminUser admin, Long custId, Long prodId, Long enqId, boolean generateMismatch) {
        // Create Draft
        Customer cust = customerRepository.findById(custId).orElseThrow();
        ProductService prod = productServiceRepository.findById(prodId).orElseThrow();
        
        QuotationRequest qr = new QuotationRequest();
        qr.setCustomerId(custId);
        qr.setEnquiryId(enqId);
        qr.setClientName(cust.getName());
        qr.setClientCompany(cust.getCompanyName());
        qr.setClientEmail(cust.getEmail());
        qr.setQuotationSource(QuotationSource.ENQUIRY);
        qr.setSourceNotes(batchId);
        
        QuotationItemRequest item = new QuotationItemRequest();
        item.setProductServiceId(prodId);
        item.setDescription(prod.getName());
        item.setSku(prod.getSku());
        item.setQuantity(BigDecimal.valueOf(2));
        item.setListPrice(prod.getDefaultRate());
        item.setUnitPrice(prod.getDefaultRate());
        item.setTaxPercent(prod.getDefaultGstPercent());
        item.setSortOrder(1);
        
        qr.setItems(Collections.singletonList(item));
        
        Quotation quoteDraft = quotationService.createDraftQuotation(enqId, admin);
        quoteDraft = quotationService.saveQuotationDraft(quoteDraft.getId(), qr, admin);
        track(batchId, "QUOTATION", quoteDraft.getId());

        // Send Quotation
        QuotationStatusUpdateRequest sentReq = new QuotationStatusUpdateRequest();
        sentReq.setStatus("SENT");
        quotationService.updateStatus(quoteDraft.getId(), sentReq, admin);

        // Revise Quotation
        Quotation quoteRevised = quotationService.createRevision(quoteDraft.getId(), admin);
        track(batchId, "QUOTATION", quoteRevised.getId());
        
        // Accept Revised (Must transition through SENT first)
        quotationService.updateStatus(quoteRevised.getId(), sentReq, admin);
        QuotationStatusUpdateRequest acceptReq = new QuotationStatusUpdateRequest();
        acceptReq.setStatus("ACCEPTED");
        acceptReq.setResponseSource(QuotationResponseSource.OTHER);
        acceptReq.setResponseNotes(batchId);
        quotationService.updateStatus(quoteRevised.getId(), acceptReq, admin);

        // Convert to PO
        PurchaseOrderRequest por = new PurchaseOrderRequest();
        por.setQuotationId(quoteRevised.getId());
        por.setPoDate(LocalDate.now());
        // Calculate expected value
        BigDecimal actualValue = quoteRevised.getGrandTotal();
        if (generateMismatch) {
            por.setPoValue(actualValue.subtract(BigDecimal.valueOf(500)));
        } else {
            por.setPoValue(actualValue);
        }
        por.setClientPoNumber("DEMO-PO-CLIENT-" + quoteRevised.getId());
        por.setReceivedVia(PurchaseOrderReceivedVia.EMAIL);
        por.setRemarks(batchId);
        
        PurchaseOrderResponse poRes = purchaseOrderService.createPurchaseOrder(por, admin);
        track(batchId, "PURCHASE_ORDER", poRes.getId());

        // Verify PO
        PurchaseOrderStatusRequest psu = new PurchaseOrderStatusRequest();
        psu.setStatus(PurchaseOrderStatus.VERIFIED);
        purchaseOrderService.updateStatus(poRes.getId(), psu, admin);
    }

    private void track(String batchId, String type, Long id) {
        demoTrackerRepository.save(DemoTracker.builder()
                .batchId(batchId)
                .entityType(type)
                .entityId(id)
                .build());
    }

    @Transactional
    public void cleanupDemoData(String batchId) {
        if (!demoMode) throw new IllegalStateException("Demo mode is disabled");
        logger.info("Starting cleanup for batch {}", batchId);

        List<DemoTracker> tracked = demoTrackerRepository.findByBatchId(batchId);
        
        // 1. Purchase Orders (Child of Quotations)
        List<Long> poIds = getTrackedIds(tracked, "PURCHASE_ORDER");
        if (!poIds.isEmpty()) {
            activityRepository.deleteByEntityTypeAndEntityIdIn("PURCHASE_ORDER", poIds);
            notificationRepository.deleteByRelatedEntityTypeAndRelatedEntityIdIn("PURCHASE_ORDER", poIds);
            purchaseOrderRepository.deleteAllById(poIds);
        }

        // 2. Quotations (And Revisions)
        List<Long> quoteIds = getTrackedIds(tracked, "QUOTATION");
        if (!quoteIds.isEmpty()) {
            activityRepository.deleteByEntityTypeAndEntityIdIn("QUOTATION", quoteIds);
            notificationRepository.deleteByRelatedEntityTypeAndRelatedEntityIdIn("QUOTATION", quoteIds);
            // Must delete child quotations (revisions) before parents if FK exists on parent_quotation_id
            List<Quotation> quotes = quotationRepository.findAllById(quoteIds);
            // separate revisions from parents
            List<Quotation> revisions = quotes.stream().filter(q -> q.getParentQuotationId() != null).collect(Collectors.toList());
            List<Quotation> parents = quotes.stream().filter(q -> q.getParentQuotationId() == null).collect(Collectors.toList());
            quotationRepository.deleteAll(revisions);
            quotationRepository.deleteAll(parents);
        }

        // 3. Enquiries
        List<Long> enqIds = getTrackedIds(tracked, "ENQUIRY");
        if (!enqIds.isEmpty()) {
            activityRepository.deleteByEntityTypeAndEntityIdIn("ENQUIRY", enqIds);
            notificationRepository.deleteByRelatedEntityTypeAndRelatedEntityIdIn("ENQUIRY", enqIds);
            enquiryRepository.deleteAllById(enqIds);
        }

        // 4. Products
        List<Long> prodIds = getTrackedIds(tracked, "PRODUCT");
        if (!prodIds.isEmpty()) {
            activityRepository.deleteByEntityTypeAndEntityIdIn("PRODUCT", prodIds);
            productServiceRepository.deleteAllById(prodIds);
        }

        // 5. Customers
        List<Long> custIds = getTrackedIds(tracked, "CUSTOMER");
        if (!custIds.isEmpty()) {
            activityRepository.deleteByEntityTypeAndEntityIdIn("CUSTOMER", custIds);
            customerRepository.deleteAllById(custIds);
        }
        
        // Clear trackers
        demoTrackerRepository.deleteByBatchId(batchId);
        logger.info("Cleanup complete for batch {}", batchId);
    }

    private List<Long> getTrackedIds(List<DemoTracker> list, String type) {
        return list.stream()
                .filter(t -> t.getEntityType().equals(type))
                .map(DemoTracker::getEntityId)
                .collect(Collectors.toList());
    }
}
