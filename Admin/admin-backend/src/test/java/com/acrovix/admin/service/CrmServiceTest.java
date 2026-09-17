package com.acrovix.admin.service;

import com.acrovix.admin.dto.crm.*;
import com.acrovix.admin.entity.*;
import com.acrovix.admin.exception.ResourceConflictException;
import com.acrovix.admin.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class CrmServiceTest {

    @Autowired private CrmService crmService;
    @Autowired private CrmLeadRepository crmLeadRepository;
    @Autowired private CrmFollowUpRepository crmFollowUpRepository;
    @Autowired private AdminEnquiryRepository enquiryRepository;
    @Autowired private CustomerRepository customerRepository;
    @Autowired private AdminUserRepository userRepository;
    @Autowired private AdminActivityRepository activityRepository;

    private AdminUser superAdmin;
    private AdminUser salesRep1;
    private AdminUser salesRep2;
    private AdminEnquiry testEnquiry;

    @BeforeEach
    void setUp() {
        crmFollowUpRepository.deleteAll();
        crmLeadRepository.deleteAll();
        enquiryRepository.deleteAll();
        customerRepository.deleteAll();
        activityRepository.deleteAll();
        userRepository.deleteAll();

        superAdmin = new AdminUser();
        superAdmin.setName("Super Admin");
        superAdmin.setEmail("superadmin@acrovix.test");
        superAdmin.setPassword("hashedpassword");
        superAdmin.setRole(Role.SUPER_ADMIN);
        superAdmin = userRepository.save(superAdmin);

        salesRep1 = new AdminUser();
        salesRep1.setName("Sales Rep 1");
        salesRep1.setEmail("sales1@acrovix.test");
        salesRep1.setPassword("hashedpassword");
        salesRep1.setRole(Role.SALES);
        salesRep1 = userRepository.save(salesRep1);

        salesRep2 = new AdminUser();
        salesRep2.setName("Sales Rep 2");
        salesRep2.setEmail("sales2@acrovix.test");
        salesRep2.setPassword("hashedpassword");
        salesRep2.setRole(Role.SALES);
        salesRep2 = userRepository.save(salesRep2);

        testEnquiry = new AdminEnquiry();
        testEnquiry.setReferenceId("ENQ-2026-999");
        testEnquiry.setFullName("John Prospect");
        testEnquiry.setBusinessEmail("john@prospect.com");
        testEnquiry.setCompanyName("Prospect Corp");
        testEnquiry.setPhoneNumber("9876543210");
        testEnquiry.setProjectRequirement("ERP Implementation");
        testEnquiry.setStatus("NEW");
        testEnquiry = enquiryRepository.save(testEnquiry);
    }

    @Test
    void testCreateLeadFromEnquiry_Success() {
        CrmLeadRequest request = CrmLeadRequest.builder()
                .enquiryId(testEnquiry.getId())
                .estimatedValue(new BigDecimal("500000.00"))
                .priority(LeadPriority.HIGH)
                .leadSource(LeadSource.WEBSITE)
                .build();

        CrmLeadResponse resp = crmService.createLead(request, superAdmin);

        assertNotNull(resp);
        assertNotNull(resp.getId());
        assertTrue(resp.getLeadNumber().startsWith("ACX/LEAD/"));
        assertEquals("John Prospect", resp.getFullName());
        assertEquals("john@prospect.com", resp.getBusinessEmail());
        assertEquals(LeadStatus.NEW, resp.getStatus());
        assertEquals(LeadPriority.HIGH, resp.getPriority());
    }

    @Test
    void testPreventDuplicateActiveLeadsForSameEnquiry() {
        CrmLeadRequest req1 = CrmLeadRequest.builder()
                .enquiryId(testEnquiry.getId())
                .fullName("First Lead")
                .businessEmail("john@prospect.com")
                .build();

        crmService.createLead(req1, superAdmin);

        // Attempt second active lead creation for same enquiry -> MUST FAIL
        CrmLeadRequest req2 = CrmLeadRequest.builder()
                .enquiryId(testEnquiry.getId())
                .fullName("Duplicate Lead")
                .businessEmail("john@prospect.com")
                .build();

        assertThrows(ResourceConflictException.class, () -> crmService.createLead(req2, superAdmin));
    }

    @Test
    void testValidStatusLifecycleTransitions() {
        CrmLeadRequest req = CrmLeadRequest.builder()
                .fullName("Lifecycle Lead")
                .businessEmail("lifecycle@acme.com")
                .build();

        CrmLeadResponse lead = crmService.createLead(req, superAdmin);
        assertEquals(LeadStatus.NEW, lead.getStatus());

        // NEW -> CONTACTED
        lead = crmService.updateLeadStatus(lead.getId(), new CrmLeadStatusUpdateRequest(LeadStatus.CONTACTED, null), superAdmin);
        assertEquals(LeadStatus.CONTACTED, lead.getStatus());

        // CONTACTED -> QUALIFIED
        lead = crmService.updateLeadStatus(lead.getId(), new CrmLeadStatusUpdateRequest(LeadStatus.QUALIFIED, null), superAdmin);
        assertEquals(LeadStatus.QUALIFIED, lead.getStatus());

        // QUALIFIED -> PROPOSAL
        lead = crmService.updateLeadStatus(lead.getId(), new CrmLeadStatusUpdateRequest(LeadStatus.PROPOSAL, null), superAdmin);
        assertEquals(LeadStatus.PROPOSAL, lead.getStatus());

        // PROPOSAL -> NEGOTIATION
        lead = crmService.updateLeadStatus(lead.getId(), new CrmLeadStatusUpdateRequest(LeadStatus.NEGOTIATION, null), superAdmin);
        assertEquals(LeadStatus.NEGOTIATION, lead.getStatus());

        // NEGOTIATION -> WON
        lead = crmService.updateLeadStatus(lead.getId(), new CrmLeadStatusUpdateRequest(LeadStatus.WON, null), superAdmin);
        assertEquals(LeadStatus.WON, lead.getStatus());
    }

    @Test
    void testInvalidStatusTransition_Rejection() {
        CrmLeadRequest req = CrmLeadRequest.builder()
                .fullName("Direct Move")
                .businessEmail("direct@acme.com")
                .build();

        CrmLeadResponse lead = crmService.createLead(req, superAdmin);
        assertEquals(LeadStatus.NEW, lead.getStatus());

        // NEW -> NEGOTIATION is invalid without qualification & proposal
        assertThrows(IllegalArgumentException.class, () -> 
            crmService.updateLeadStatus(lead.getId(), new CrmLeadStatusUpdateRequest(LeadStatus.NEGOTIATION, null), superAdmin)
        );
    }

    @Test
    void testLostReasonEnforcementOnLostStatus() {
        CrmLeadRequest req = CrmLeadRequest.builder()
                .fullName("Lost Lead")
                .businessEmail("lost@acme.com")
                .build();

        CrmLeadResponse lead = crmService.createLead(req, superAdmin);

        // Missing lost reason -> MUST FAIL
        assertThrows(IllegalArgumentException.class, () -> 
            crmService.updateLeadStatus(lead.getId(), new CrmLeadStatusUpdateRequest(LeadStatus.LOST, null), superAdmin)
        );

        // With valid lost reason -> SUCCESS
        CrmLeadResponse updated = crmService.updateLeadStatus(lead.getId(), 
            new CrmLeadStatusUpdateRequest(LeadStatus.LOST, "Competitor offered lower pricing"), superAdmin);
        
        assertEquals(LeadStatus.LOST, updated.getStatus());
        assertEquals("Competitor offered lower pricing", updated.getLostReason());
    }

    @Test
    void testSalesOwnershipSecurityRules() {
        CrmLeadRequest req = CrmLeadRequest.builder()
                .fullName("Sales 1 Lead")
                .businessEmail("sales1lead@acme.com")
                .assignedToId(salesRep1.getId())
                .build();

        CrmLeadResponse lead = crmService.createLead(req, superAdmin);

        // SalesRep1 can access
        assertNotNull(crmService.getLeadById(lead.getId(), salesRep1));

        // SalesRep2 CANNOT access SalesRep1's assigned lead
        assertThrows(AccessDeniedException.class, () -> crmService.getLeadById(lead.getId(), salesRep2));

        // SuperAdmin can access any lead
        assertNotNull(crmService.getLeadById(lead.getId(), superAdmin));
    }

    @Test
    void testFollowUpLifecycleAndNextFollowUpDateSync() {
        CrmLeadRequest req = CrmLeadRequest.builder()
                .fullName("Followup Sync Lead")
                .businessEmail("followup@acme.com")
                .build();

        CrmLeadResponse lead = crmService.createLead(req, superAdmin);
        assertNull(lead.getNextFollowUpDate());

        LocalDateTime tomorrow = LocalDateTime.now().plusDays(1);
        CrmFollowUpRequest fuReq = CrmFollowUpRequest.builder()
                .type(FollowUpType.CALL)
                .scheduledAt(tomorrow)
                .subject("Introductory Discovery Call")
                .build();

        CrmFollowUpResponse fu = crmService.createFollowUp(lead.getId(), fuReq, superAdmin);
        assertNotNull(fu);
        assertEquals(FollowUpStatus.PENDING, fu.getStatus());

        // Check lead nextFollowUpDate synchronized to scheduledAt
        CrmLeadResponse syncedLead = crmService.getLeadById(lead.getId(), superAdmin);
        assertNotNull(syncedLead.getNextFollowUpDate());

        // Complete follow-up with outcome
        CrmFollowUpResponse completedFu = crmService.completeFollowUp(fu.getId(), "Client interested, requested proposal", superAdmin);
        assertEquals(FollowUpStatus.COMPLETED, completedFu.getStatus());
        assertNotNull(completedFu.getCompletedAt());
        assertEquals("Client interested, requested proposal", completedFu.getOutcome());

        // Lead nextFollowUpDate clears back to null since no pending follow-ups remain
        CrmLeadResponse updatedLead = crmService.getLeadById(lead.getId(), superAdmin);
        assertNull(updatedLead.getNextFollowUpDate());
    }

    @Test
    void testPipelineAndDashboardSummary() {
        CrmLeadRequest req1 = CrmLeadRequest.builder().fullName("Lead 1").businessEmail("l1@test.com").estimatedValue(new BigDecimal("100000")).build();
        CrmLeadRequest req2 = CrmLeadRequest.builder().fullName("Lead 2").businessEmail("l2@test.com").estimatedValue(new BigDecimal("200000")).build();
        
        crmService.createLead(req1, superAdmin);
        crmService.createLead(req2, superAdmin);

        CrmPipelineResponse pipeline = crmService.getPipeline(superAdmin);
        assertNotNull(pipeline);
        assertNotNull(pipeline.getPipeline());
        assertTrue(pipeline.getPipeline().containsKey(LeadStatus.NEW));

        CrmDashboardSummaryResponse dashboard = crmService.getDashboardSummary(superAdmin);
        assertNotNull(dashboard);
        assertTrue(dashboard.getTotalOpenLeads() >= 2);
        assertTrue(dashboard.getOpenPipelineValue().compareTo(new BigDecimal("300000")) >= 0);
    }
}
