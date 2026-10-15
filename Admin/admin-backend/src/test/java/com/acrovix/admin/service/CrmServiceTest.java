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
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private QuotationRepository quotationRepository;

    private AdminUser superAdmin;
    private AdminUser salesRep1;
    private AdminUser salesRep2;
    private AdminEnquiry testEnquiry;

    @BeforeEach
    void setUp() {
        notificationRepository.deleteAll();
        quotationRepository.deleteAll();
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

    @Test
    void testNewToContactedAndTransitionsValidation() {
        CrmLeadRequest req = CrmLeadRequest.builder()
                .fullName("Status Test Lead")
                .businessEmail("statustest@acme.com")
                .companyName("Acme Status Inc")
                .build();

        CrmLeadResponse lead = crmService.createLead(req, superAdmin);
        assertEquals(LeadStatus.NEW, lead.getStatus());

        // 1. Valid transition: NEW -> CONTACTED
        CrmLeadResponse contactedResp = crmService.updateLeadStatus(
                lead.getId(),
                new CrmLeadStatusUpdateRequest(LeadStatus.CONTACTED, null),
                superAdmin
        );
        assertEquals(LeadStatus.CONTACTED, contactedResp.getStatus());

        // Verify state persistence
        CrmLeadResponse fetched = crmService.getLeadById(lead.getId(), superAdmin);
        assertEquals(LeadStatus.CONTACTED, fetched.getStatus());

        // 2. Invalid transition: CONTACTED -> WON (Must skip required pipeline steps)
        assertThrows(IllegalArgumentException.class, () ->
                crmService.updateLeadStatus(
                        lead.getId(),
                        new CrmLeadStatusUpdateRequest(LeadStatus.WON, null),
                        superAdmin
                )
        );

        // 3. Valid transition: CONTACTED -> LOST (With lost reason)
        CrmLeadResponse lostResp = crmService.updateLeadStatus(
                lead.getId(),
                new CrmLeadStatusUpdateRequest(LeadStatus.LOST, "Budget cancelled"),
                superAdmin
        );
        assertEquals(LeadStatus.LOST, lostResp.getStatus());
        assertEquals("Budget cancelled", lostResp.getLostReason());
    }

    @Test
    void testStageAwareContactedTransitionWithFollowUp() {
        CrmLeadRequest req = CrmLeadRequest.builder()
                .fullName("Contacted Stage Test")
                .businessEmail("contacted@test.com")
                .companyName("Contacted Corp")
                .build();
        CrmLeadResponse lead = crmService.createLead(req, superAdmin);

        LocalDateTime scheduledTime = LocalDateTime.now().plusDays(2).withNano(0);
        CrmLeadStatusUpdateRequest updateReq = CrmLeadStatusUpdateRequest.builder()
                .status(LeadStatus.CONTACTED)
                .interactionType("CALL")
                .subject("Introductory product discovery call")
                .outcome("Prospect requested solution architecture overview")
                .nextAction("Send product deck and schedule follow-up")
                .nextFollowUpDate(scheduledTime)
                .build();

        CrmLeadResponse resp = crmService.updateLeadStatus(lead.getId(), updateReq, superAdmin);
        assertEquals(LeadStatus.CONTACTED, resp.getStatus());
        assertNotNull(resp.getNextFollowUpDate());

        // Verify follow up was created
        List<CrmFollowUpResponse> followUps = crmService.getFollowUpsForLead(lead.getId(), superAdmin);
        assertEquals(1, followUps.size());
        assertEquals("Introductory product discovery call", followUps.get(0).getSubject());

        // Verify activities
        List<com.acrovix.admin.dto.AdminActivityResponse> activities = crmService.getActivitiesForLead(lead.getId(), superAdmin);
        assertFalse(activities.isEmpty());
        assertTrue(activities.stream().anyMatch(a -> a.getAction().equals("STAGE_CONTACTED") || a.getAction().equals("LEAD_STATUS_CHANGED")));
    }

    @Test
    void testStageAwareQualifiedTransitionAndValidation() {
        CrmLeadRequest req = CrmLeadRequest.builder()
                .fullName("Qualified Stage Test")
                .businessEmail("qualified@test.com")
                .build();
        CrmLeadResponse lead = crmService.createLead(req, superAdmin);

        // Negative estimated value rejected
        assertThrows(IllegalArgumentException.class, () -> {
            crmService.updateLeadStatus(lead.getId(), CrmLeadStatusUpdateRequest.builder()
                    .status(LeadStatus.QUALIFIED)
                    .estimatedValue(new BigDecimal("-500.00"))
                    .build(), superAdmin);
        });

        // Invalid probability rejected
        assertThrows(IllegalArgumentException.class, () -> {
            crmService.updateLeadStatus(lead.getId(), CrmLeadStatusUpdateRequest.builder()
                    .status(LeadStatus.QUALIFIED)
                    .probability(150)
                    .build(), superAdmin);
        });

        // Valid qualification
        LocalDate closingDate = LocalDate.now().plusMonths(1);
        CrmLeadStatusUpdateRequest validQual = CrmLeadStatusUpdateRequest.builder()
                .status(LeadStatus.QUALIFIED)
                .serviceRequired("Enterprise Cloud ERP")
                .industrySector("Information Technology")
                .estimatedValue(new BigDecimal("750000.00"))
                .expectedClosingDate(closingDate)
                .probability(60)
                .notes("Key decision maker is CIO. Urgency is Q4 implementation.")
                .build();

        CrmLeadResponse qualResp = crmService.updateLeadStatus(lead.getId(), validQual, superAdmin);
        assertEquals(LeadStatus.QUALIFIED, qualResp.getStatus());
        assertEquals(new BigDecimal("750000.00"), qualResp.getEstimatedValue());
        assertEquals("Enterprise Cloud ERP", qualResp.getServiceRequired());
        assertEquals("Information Technology", qualResp.getIndustrySector());
        assertEquals(Integer.valueOf(60), qualResp.getProbability());
        assertEquals(closingDate, qualResp.getExpectedClosingDate());
    }

    @Test
    void testProposalAndNegotiationTransitions() {
        CrmLeadRequest req = CrmLeadRequest.builder()
                .fullName("Proposal Test")
                .businessEmail("proposal@test.com")
                .build();
        CrmLeadResponse lead = crmService.createLead(req, superAdmin);
        crmService.updateLeadStatus(lead.getId(), new CrmLeadStatusUpdateRequest(LeadStatus.QUALIFIED), superAdmin);

        // QUALIFIED -> PROPOSAL
        CrmLeadStatusUpdateRequest proposalReq = CrmLeadStatusUpdateRequest.builder()
                .status(LeadStatus.PROPOSAL)
                .subject("Quotation submitted")
                .notes("Sent formal quotation with 15% enterprise tier discount")
                .build();
        CrmLeadResponse proposalResp = crmService.updateLeadStatus(lead.getId(), proposalReq, superAdmin);
        assertEquals(LeadStatus.PROPOSAL, proposalResp.getStatus());

        // PROPOSAL -> NEGOTIATION
        CrmLeadStatusUpdateRequest negReq = CrmLeadStatusUpdateRequest.builder()
                .status(LeadStatus.NEGOTIATION)
                .customerResponse("Client requested payment term extension to net 45")
                .notes("Agreed to net 30 with 2% early settlement discount")
                .build();
        CrmLeadResponse negResp = crmService.updateLeadStatus(lead.getId(), negReq, superAdmin);
        assertEquals(LeadStatus.NEGOTIATION, negResp.getStatus());

        // NEGOTIATION -> WON
        CrmLeadStatusUpdateRequest wonReq = CrmLeadStatusUpdateRequest.builder()
                .status(LeadStatus.WON)
                .notes("Contract signed and accepted")
                .estimatedValue(new BigDecimal("800000.00"))
                .build();
        CrmLeadResponse wonResp = crmService.updateLeadStatus(lead.getId(), wonReq, superAdmin);
        assertEquals(LeadStatus.WON, wonResp.getStatus());
        assertEquals(Integer.valueOf(100), wonResp.getProbability());
    }

    @Test
    void testLostTransitionCancelsPendingFollowUps() {
        CrmLeadRequest req = CrmLeadRequest.builder()
                .fullName("Lost FollowUp Test")
                .businessEmail("lostfu@test.com")
                .build();
        CrmLeadResponse lead = crmService.createLead(req, superAdmin);

        // Schedule a follow up
        crmService.createFollowUp(lead.getId(), CrmFollowUpRequest.builder()
                .type(FollowUpType.CALL)
                .scheduledAt(LocalDateTime.now().plusDays(3))
                .subject("Follow up call")
                .build(), superAdmin);

        List<CrmFollowUpResponse> pendingBefore = crmService.getFollowUpsForLead(lead.getId(), superAdmin);
        assertEquals(FollowUpStatus.PENDING, pendingBefore.get(0).getStatus());

        // Mark as LOST
        CrmLeadStatusUpdateRequest lostReq = CrmLeadStatusUpdateRequest.builder()
                .status(LeadStatus.LOST)
                .lostReason("Competitor offered cheaper cloud hosting")
                .competitor("Competitor X")
                .build();
        crmService.updateLeadStatus(lead.getId(), lostReq, superAdmin);

        List<CrmFollowUpResponse> followUpsAfter = crmService.getFollowUpsForLead(lead.getId(), superAdmin);
        assertEquals(FollowUpStatus.CANCELLED, followUpsAfter.get(0).getStatus());
        assertTrue(followUpsAfter.get(0).getOutcome().contains("LOST"));
    }

    @Test
    void testReopenLeadFromLost() {
        CrmLeadRequest req = CrmLeadRequest.builder()
                .fullName("Reopen Test")
                .businessEmail("reopen@test.com")
                .build();
        CrmLeadResponse lead = crmService.createLead(req, superAdmin);
        crmService.updateLeadStatus(lead.getId(), new CrmLeadStatusUpdateRequest(LeadStatus.LOST, "Budget lost"), superAdmin);

        // Reopening to QUALIFIED is allowed
        CrmLeadResponse reopened = crmService.updateLeadStatus(lead.getId(), CrmLeadStatusUpdateRequest.builder()
                .status(LeadStatus.QUALIFIED)
                .notes("Client secured new FY budget")
                .build(), superAdmin);

        assertEquals(LeadStatus.QUALIFIED, reopened.getStatus());
        assertNull(reopened.getLostReason());
    }

    @Test
    void testManualActivityLoggingAndTimeline() {
        CrmLeadRequest req = CrmLeadRequest.builder()
                .fullName("Activity Log Test")
                .businessEmail("actlog@test.com")
                .build();
        CrmLeadResponse lead = crmService.createLead(req, superAdmin);

        CrmLeadActivityRequest actReq = CrmLeadActivityRequest.builder()
                .type("MEETING")
                .subject("Discovery workshop with client CTO")
                .outcome("Requirements documented")
                .nextAction("Prepare custom demo")
                .notes("Client uses legacy on-prem setup")
                .build();

        com.acrovix.admin.dto.AdminActivityResponse actResp = crmService.logLeadActivity(lead.getId(), actReq, superAdmin);
        assertNotNull(actResp.getId());
        assertEquals("ACTIVITY_MEETING", actResp.getAction());
        assertEquals("Super Admin", actResp.getAdminName());

        List<com.acrovix.admin.dto.AdminActivityResponse> timeline = crmService.getActivitiesForLead(lead.getId(), superAdmin);
        assertFalse(timeline.isEmpty());
        assertTrue(timeline.stream().anyMatch(a -> a.getAction().equals("ACTIVITY_MEETING")));
    }

    @Test
    void testLogLeadActivityValidationAndPersistence() {
        CrmLeadRequest req = CrmLeadRequest.builder()
                .fullName("Validation and Persistence Test")
                .businessEmail("valpersist@test.com")
                .phoneNumber("+919876543210")
                .build();
        CrmLeadResponse lead = crmService.createLead(req, superAdmin);

        // 1. Rejects blank activity type
        assertThrows(IllegalArgumentException.class, () -> {
            crmService.logLeadActivity(lead.getId(), CrmLeadActivityRequest.builder()
                    .type("")
                    .subject("Valid Subject")
                    .build(), superAdmin);
        });

        // 2. Rejects blank subject
        assertThrows(IllegalArgumentException.class, () -> {
            crmService.logLeadActivity(lead.getId(), CrmLeadActivityRequest.builder()
                    .type("CALL")
                    .subject("   ")
                    .build(), superAdmin);
        });

        // 3. Log Call Activity
        CrmLeadActivityRequest callReq = CrmLeadActivityRequest.builder()
                .type("CALL")
                .subject("Outbound discovery phone call")
                .outcome("Client interested in enterprise cybersecurity audit")
                .notes("Spoke with IT Director Mr. Sharma")
                .nextAction("Send technical quotation")
                .build();
        var callResp = crmService.logLeadActivity(lead.getId(), callReq, superAdmin);
        assertNotNull(callResp.getId());
        assertEquals("ACTIVITY_CALL", callResp.getAction());
        assertTrue(callResp.getDescription().contains("Outbound discovery phone call"));
        assertTrue(callResp.getDescription().contains("Outcome: Client interested in enterprise cybersecurity audit"));

        // 4. Log Email Activity
        CrmLeadActivityRequest emailReq = CrmLeadActivityRequest.builder()
                .type("EMAIL")
                .subject("Follow-up email with product datasheet")
                .outcome("Awaiting feedback")
                .notes("Emailed brochure and compliance certificates")
                .build();
        var emailResp = crmService.logLeadActivity(lead.getId(), emailReq, superAdmin);
        assertNotNull(emailResp.getId());
        assertEquals("ACTIVITY_EMAIL", emailResp.getAction());

        // 5. Verify both appear in timeline
        List<com.acrovix.admin.dto.AdminActivityResponse> activities = crmService.getActivitiesForLead(lead.getId(), superAdmin);
        assertTrue(activities.stream().anyMatch(a -> a.getAction().equals("ACTIVITY_CALL")));
        assertTrue(activities.stream().anyMatch(a -> a.getAction().equals("ACTIVITY_EMAIL")));
    }

    @Test
    void testFollowUpReschedulingLogsActivity() {
        CrmLeadRequest req = CrmLeadRequest.builder()
                .fullName("Reschedule Test")
                .businessEmail("reschedule@test.com")
                .build();
        CrmLeadResponse lead = crmService.createLead(req, superAdmin);

        LocalDateTime originalTime = LocalDateTime.now().plusDays(2).withNano(0);
        CrmFollowUpResponse fu = crmService.createFollowUp(lead.getId(), CrmFollowUpRequest.builder()
                .type(FollowUpType.CALL)
                .scheduledAt(originalTime)
                .subject("Check-in Call")
                .build(), superAdmin);

        LocalDateTime rescheduledTime = LocalDateTime.now().plusDays(5).withNano(0);
        crmService.updateFollowUp(fu.getId(), CrmFollowUpRequest.builder()
                .scheduledAt(rescheduledTime)
                .build(), superAdmin);

        List<com.acrovix.admin.dto.AdminActivityResponse> timeline = crmService.getActivitiesForLead(lead.getId(), superAdmin);
        assertTrue(timeline.stream().anyMatch(a -> a.getAction().equals("FOLLOW_UP_RESCHEDULED")));
    }

    @Test
    void testSalesIsolationOnLeadStatusAndActivity() {
        CrmLeadRequest req = CrmLeadRequest.builder()
                .fullName("Sales Isolated Lead")
                .businessEmail("salesiso@test.com")
                .assignedToId(salesRep1.getId())
                .build();
        CrmLeadResponse lead = crmService.createLead(req, superAdmin);

        // Sales rep 2 attempts to change status -> AccessDeniedException
        assertThrows(AccessDeniedException.class, () -> {
            crmService.updateLeadStatus(lead.getId(), new CrmLeadStatusUpdateRequest(LeadStatus.CONTACTED), salesRep2);
        });

        // Sales rep 2 attempts to log activity -> AccessDeniedException
        assertThrows(AccessDeniedException.class, () -> {
            crmService.logLeadActivity(lead.getId(), CrmLeadActivityRequest.builder()
                    .type("CALL")
                    .subject("Unauthorized call attempt")
                    .build(), salesRep2);
        });

        // Assigned sales rep 1 CAN change status
        CrmLeadResponse rep1Resp = crmService.updateLeadStatus(lead.getId(), new CrmLeadStatusUpdateRequest(LeadStatus.CONTACTED), salesRep1);
        assertEquals(LeadStatus.CONTACTED, rep1Resp.getStatus());
    }

    @Test
    void testQuotationsForLeadLookup() {
        CrmLeadRequest req = CrmLeadRequest.builder()
                .fullName("Quotation Lookup Lead")
                .businessEmail("quotelookup@test.com")
                .build();
        CrmLeadResponse lead = crmService.createLead(req, superAdmin);

        // Create a quotation matching the lead's email
        Quotation q = Quotation.builder()
                .quotationNumber("ACX/QT/2026/999")
                .clientName("Quotation Lookup Lead")
                .clientEmail("quotelookup@test.com")
                .status("SENT")
                .grandTotal(new BigDecimal("250000.00"))
                .currency(Currency.INR)
                .createdBy(superAdmin)
                .build();
        quotationRepository.save(q);

        List<java.util.Map<String, Object>> quotations = crmService.getQuotationsForLead(lead.getId(), superAdmin);
        assertEquals(1, quotations.size());
        assertEquals("ACX/QT/2026/999", quotations.get(0).get("quotationNumber"));
        assertEquals("SENT", quotations.get(0).get("status"));
    }

    @Test
    void testSalesCannotReassignLeadToAnotherSalesUser() {
        CrmLeadRequest req = CrmLeadRequest.builder()
                .fullName("Sales Reassign Test")
                .businessEmail("reassign1@test.com")
                .assignedToId(salesRep1.getId())
                .build();
        CrmLeadResponse lead = crmService.createLead(req, superAdmin);

        // SalesRep1 attempts to assign their lead to SalesRep2 -> AccessDeniedException
        assertThrows(AccessDeniedException.class, () -> {
            crmService.assignLead(lead.getId(), salesRep2.getId(), salesRep1);
        });
    }

    @Test
    void testSalesCannotStealOtherUsersLead() {
        CrmLeadRequest req = CrmLeadRequest.builder()
                .fullName("Sales Steal Test")
                .businessEmail("steal@test.com")
                .assignedToId(salesRep1.getId())
                .build();
        CrmLeadResponse lead = crmService.createLead(req, superAdmin);

        // SalesRep2 attempts to assign SalesRep1's lead to themselves -> AccessDeniedException
        assertThrows(AccessDeniedException.class, () -> {
            crmService.assignLead(lead.getId(), salesRep2.getId(), salesRep2);
        });
    }

    @Test
    void testSuperAdminCanReassignLead() {
        CrmLeadRequest req = CrmLeadRequest.builder()
                .fullName("Admin Reassign Test")
                .businessEmail("adminreassign@test.com")
                .assignedToId(salesRep1.getId())
                .build();
        CrmLeadResponse lead = crmService.createLead(req, superAdmin);

        // SuperAdmin reassigns from SalesRep1 to SalesRep2 -> SUCCESS
        CrmLeadResponse reassigned = crmService.assignLead(lead.getId(), salesRep2.getId(), superAdmin);
        assertNotNull(reassigned);
        assertEquals(salesRep2.getId(), reassigned.getAssignedToId());
    }
}
