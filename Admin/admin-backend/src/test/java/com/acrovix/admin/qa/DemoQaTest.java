package com.acrovix.admin.qa;

import com.acrovix.admin.entity.*;
import com.acrovix.admin.repository.*;
import com.acrovix.admin.service.DemoDataService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@TestPropertySource(properties = {"app.demo-mode=true"})
public class DemoQaTest {

    @Autowired
    private DemoDataService demoDataService;

    @Autowired
    private DemoTrackerRepository demoTrackerRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private ProductServiceRepository productServiceRepository;

    @Autowired
    private AdminEnquiryRepository enquiryRepository;

    @Autowired
    private QuotationRepository quotationRepository;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private AdminUserRepository adminUserRepository;

    @Test
    public void executeEndToEndQa() {
        System.out.println("====================================================");
        System.out.println("STARTING PHASE 1-3 E2E QA");
        System.out.println("====================================================");

        String batchId = "PHASE-1-3-DEMO-2026-09";
        
        // Clean up any leftover data from a previous failed run
        try {
            demoDataService.cleanupDemoData(batchId);
        } catch (Exception e) {
            System.err.println("Pre-cleanup failed (expected if clean): " + e.getMessage());
        }

        // Find super admin (assumes ID 1 exists)
        AdminUser admin = adminUserRepository.findAll().get(0);
        
        long initialCustomers = customerRepository.count();
        long initialProducts = productServiceRepository.count();
        long initialEnquiries = enquiryRepository.count();
        long initialQuotations = quotationRepository.count();
        long initialPos = purchaseOrderRepository.count();

        // 1. SEED DATA
        demoDataService.seedDemoData(batchId, admin.getId());
        
        List<DemoTracker> tracked = demoTrackerRepository.findByBatchId(batchId);
        System.out.println("Successfully generated " + tracked.size() + " demo entities.");
        
        long afterSeedCustomers = customerRepository.count();
        long afterSeedProducts = productServiceRepository.count();
        long afterSeedEnquiries = enquiryRepository.count();
        long afterSeedQuotations = quotationRepository.count();
        long afterSeedPos = purchaseOrderRepository.count();

        System.out.println("Customers Created: " + (afterSeedCustomers - initialCustomers));
        System.out.println("Products Created: " + (afterSeedProducts - initialProducts));
        System.out.println("Enquiries Created: " + (afterSeedEnquiries - initialEnquiries));
        System.out.println("Quotations (inc Revisions): " + (afterSeedQuotations - initialQuotations));
        System.out.println("POs Created: " + (afterSeedPos - initialPos));
        
        System.out.println("Simulated Quotation Lifecycle -> Revision -> PO (Match and Mismatch).");
        
        // 2. CLEANUP DATA
        demoDataService.cleanupDemoData(batchId);
        
        List<DemoTracker> remainingTracked = demoTrackerRepository.findByBatchId(batchId);
        System.out.println("Remaining DemoTrackers: " + remainingTracked.size());

        long afterCleanupCustomers = customerRepository.count();
        long afterCleanupProducts = productServiceRepository.count();
        long afterCleanupEnquiries = enquiryRepository.count();
        long afterCleanupQuotations = quotationRepository.count();
        long afterCleanupPos = purchaseOrderRepository.count();

        System.out.println("Customers After Cleanup: " + afterCleanupCustomers + " (Expected: " + initialCustomers + ")");
        System.out.println("Products After Cleanup: " + afterCleanupProducts + " (Expected: " + initialProducts + ")");
        System.out.println("Enquiries After Cleanup: " + afterCleanupEnquiries + " (Expected: " + initialEnquiries + ")");
        System.out.println("Quotations After Cleanup: " + afterCleanupQuotations + " (Expected: " + initialQuotations + ")");
        System.out.println("POs After Cleanup: " + afterCleanupPos + " (Expected: " + initialPos + ")");

        assertEquals(initialCustomers, afterCleanupCustomers, "Customer cleanup failed");
        assertEquals(initialProducts, afterCleanupProducts, "Product cleanup failed");
        assertEquals(initialEnquiries, afterCleanupEnquiries, "Enquiry cleanup failed");
        assertEquals(initialQuotations, afterCleanupQuotations, "Quotation cleanup failed");
        assertEquals(initialPos, afterCleanupPos, "PO cleanup failed");
        assertEquals(0, remainingTracked.size(), "Tracker cleanup failed");
        
        System.out.println("====================================================");
        System.out.println("PHASE 1-3 DEMO QA: PASS");
        System.out.println("====================================================");
    }
}
