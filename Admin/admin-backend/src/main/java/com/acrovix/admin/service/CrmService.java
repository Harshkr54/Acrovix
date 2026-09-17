package com.acrovix.admin.service;

import com.acrovix.admin.dto.crm.*;
import com.acrovix.admin.entity.*;
import com.acrovix.admin.exception.ResourceConflictException;
import com.acrovix.admin.exception.ResourceNotFoundException;
import com.acrovix.admin.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CrmService {

    private final CrmLeadRepository crmLeadRepository;
    private final CrmFollowUpRepository crmFollowUpRepository;
    private final AdminEnquiryRepository enquiryRepository;
    private final CustomerRepository customerRepository;
    private final AdminUserRepository userRepository;
    private final AdminActivityRepository activityRepository;
    private final NotificationService notificationService;
    private final SequenceGeneratorService sequenceGeneratorService;

    // --- LEAD LIFECYCLE & CRUD ---

    @Transactional
    public CrmLeadResponse createLead(CrmLeadRequest request, AdminUser currentUser) {
        AdminEnquiry enquiry = null;
        if (request.getEnquiryId() != null) {
            enquiry = enquiryRepository.findById(request.getEnquiryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Enquiry not found #" + request.getEnquiryId()));

            // Check for duplicate active lead for the same enquiry
            List<CrmLead> activeLeads = crmLeadRepository.findActiveLeadsForEnquiry(
                    enquiry.getId(), List.of(LeadStatus.WON, LeadStatus.LOST)
            );
            if (!activeLeads.isEmpty()) {
                throw new ResourceConflictException("An active CRM lead already exists for enquiry #" + enquiry.getId());
            }
        }

        Customer customer = null;
        if (request.getCustomerId() != null) {
            customer = customerRepository.findById(request.getCustomerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Customer not found #" + request.getCustomerId()));
        }

        AdminUser assignedUser = null;
        if (request.getAssignedToId() != null) {
            assignedUser = userRepository.findById(request.getAssignedToId())
                    .orElseThrow(() -> new ResourceNotFoundException("Assigned user not found #" + request.getAssignedToId()));
        } else if (enquiry != null && enquiry.getAssignedTo() != null) {
            assignedUser = enquiry.getAssignedTo();
        }

        String leadNumber = sequenceGeneratorService.generateNextLeadNumber(LocalDate.now());

        String fullName = (request.getFullName() != null && !request.getFullName().isBlank())
                ? request.getFullName().trim()
                : (enquiry != null ? enquiry.getFullName() : "");

        String businessEmail = (request.getBusinessEmail() != null && !request.getBusinessEmail().isBlank())
                ? request.getBusinessEmail().trim()
                : (enquiry != null ? enquiry.getBusinessEmail() : "");

        String companyName = (request.getCompanyName() != null && !request.getCompanyName().isBlank())
                ? request.getCompanyName().trim()
                : (enquiry != null ? enquiry.getCompanyName() : null);

        String phoneNumber = (request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank())
                ? request.getPhoneNumber().trim()
                : (enquiry != null ? enquiry.getPhoneNumber() : null);

        String industry = (request.getIndustrySector() != null && !request.getIndustrySector().isBlank())
                ? request.getIndustrySector().trim()
                : (enquiry != null ? enquiry.getIndustrySector() : null);

        String service = (request.getServiceRequired() != null && !request.getServiceRequired().isBlank())
                ? request.getServiceRequired().trim()
                : (enquiry != null ? enquiry.getServiceRequired() : null);

        CrmLead lead = CrmLead.builder()
                .leadNumber(leadNumber)
                .enquiry(enquiry)
                .customer(customer)
                .fullName(fullName)
                .companyName(companyName)
                .businessEmail(businessEmail)
                .phoneNumber(phoneNumber)
                .industrySector(industry)
                .serviceRequired(service)
                .status(request.getStatus() != null ? request.getStatus() : LeadStatus.NEW)
                .priority(request.getPriority() != null ? request.getPriority() : LeadPriority.MEDIUM)
                .leadSource(request.getLeadSource() != null ? request.getLeadSource() : LeadSource.WEBSITE)
                .assignedTo(assignedUser)
                .estimatedValue(request.getEstimatedValue())
                .expectedClosingDate(request.getExpectedClosingDate())
                .probability(request.getProbability())
                .notes(request.getNotes())
                .createdBy(currentUser)
                .build();

        lead = crmLeadRepository.save(lead);

        logActivity(currentUser.getId(), "LEAD_CREATED", "CrmLead", lead.getId(), "Created CRM Lead #" + lead.getLeadNumber());
        return mapToLeadResponse(lead);
    }

    @Transactional(readOnly = true)
    public Page<CrmLeadResponse> getAllLeads(
            Pageable pageable,
            String search,
            LeadStatus status,
            LeadPriority priority,
            LeadSource leadSource,
            Long assignedToId,
            String industry,
            String service,
            LocalDateTime fromDate,
            LocalDateTime toDate,
            AdminUser currentUser
    ) {
        Specification<CrmLead> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // SALES record-level ownership rules
            if (currentUser != null && currentUser.getRole() == Role.SALES) {
                predicates.add(cb.or(
                        cb.isNull(root.get("assignedTo")),
                        cb.equal(root.get("assignedTo").get("id"), currentUser.getId())
                ));
            }

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("leadNumber")), pattern),
                        cb.like(cb.lower(root.get("fullName")), pattern),
                        cb.like(cb.lower(root.get("companyName")), pattern),
                        cb.like(cb.lower(root.get("businessEmail")), pattern)
                ));
            }

            if (status != null) predicates.add(cb.equal(root.get("status"), status));
            if (priority != null) predicates.add(cb.equal(root.get("priority"), priority));
            if (leadSource != null) predicates.add(cb.equal(root.get("leadSource"), leadSource));
            if (assignedToId != null) predicates.add(cb.equal(root.get("assignedTo").get("id"), assignedToId));
            if (industry != null && !industry.isBlank()) predicates.add(cb.equal(root.get("industrySector"), industry.trim()));
            if (service != null && !service.isBlank()) predicates.add(cb.equal(root.get("serviceRequired"), service.trim()));

            if (fromDate != null) predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), fromDate));
            if (toDate != null) predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), toDate));

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return crmLeadRepository.findAll(spec, pageable).map(this::mapToLeadResponse);
    }

    @Transactional(readOnly = true)
    public CrmLeadResponse getLeadById(Long id, AdminUser currentUser) {
        CrmLead lead = crmLeadRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CRM Lead not found #" + id));
        checkLeadAccess(currentUser, lead);
        return mapToLeadResponse(lead);
    }

    @Transactional
    public CrmLeadResponse updateLead(Long id, CrmLeadRequest request, AdminUser currentUser) {
        CrmLead lead = crmLeadRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CRM Lead not found #" + id));
        checkLeadAccess(currentUser, lead);

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            lead.setFullName(request.getFullName().trim());
        }
        if (request.getCompanyName() != null) {
            lead.setCompanyName(request.getCompanyName().trim());
        }
        if (request.getBusinessEmail() != null && !request.getBusinessEmail().isBlank()) {
            lead.setBusinessEmail(request.getBusinessEmail().trim());
        }
        if (request.getPhoneNumber() != null) {
            lead.setPhoneNumber(request.getPhoneNumber().trim());
        }
        if (request.getIndustrySector() != null) {
            lead.setIndustrySector(request.getIndustrySector().trim());
        }
        if (request.getServiceRequired() != null) {
            lead.setServiceRequired(request.getServiceRequired().trim());
        }
        if (request.getPriority() != null) {
            lead.setPriority(request.getPriority());
        }
        if (request.getLeadSource() != null) {
            lead.setLeadSource(request.getLeadSource());
        }
        if (request.getEstimatedValue() != null) {
            lead.setEstimatedValue(request.getEstimatedValue());
        }
        if (request.getExpectedClosingDate() != null) {
            lead.setExpectedClosingDate(request.getExpectedClosingDate());
        }
        if (request.getProbability() != null) {
            lead.setProbability(request.getProbability());
        }
        if (request.getNotes() != null) {
            lead.setNotes(request.getNotes());
        }
        if (request.getCustomerId() != null) {
            Customer customer = customerRepository.findById(request.getCustomerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Customer not found #" + request.getCustomerId()));
            lead.setCustomer(customer);
        }

        lead = crmLeadRepository.save(lead);
        logActivity(currentUser.getId(), "LEAD_UPDATED", "CrmLead", lead.getId(), "Updated CRM Lead #" + lead.getLeadNumber());
        return mapToLeadResponse(lead);
    }

    @Transactional
    public CrmLeadResponse updateLeadStatus(Long id, CrmLeadStatusUpdateRequest request, AdminUser currentUser) {
        CrmLead lead = crmLeadRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CRM Lead not found #" + id));
        checkLeadAccess(currentUser, lead);

        LeadStatus oldStatus = lead.getStatus();
        LeadStatus newStatus = request.getStatus();

        if (oldStatus == newStatus) {
            return mapToLeadResponse(lead);
        }

        // Validate Lifecycle Transitions
        validateStatusTransition(oldStatus, newStatus);

        // Validation rule for LOST status
        if (newStatus == LeadStatus.LOST) {
            if (request.getLostReason() == null || request.getLostReason().isBlank()) {
                throw new IllegalArgumentException("Lost reason is required when marking a lead as LOST.");
            }
            lead.setLostReason(request.getLostReason().trim());
        } else {
            lead.setLostReason(null);
        }

        lead.setStatus(newStatus);
        lead = crmLeadRepository.save(lead);

        String action = "LEAD_STATUS_CHANGED";
        if (newStatus == LeadStatus.WON) action = "OPPORTUNITY_WON";
        else if (newStatus == LeadStatus.LOST) action = "OPPORTUNITY_LOST";

        logActivity(currentUser.getId(), action, "CrmLead", lead.getId(),
                "Lead status changed from " + oldStatus + " to " + newStatus);

        return mapToLeadResponse(lead);
    }

    @Transactional
    public CrmLeadResponse assignLead(Long id, Long assigneeId, AdminUser currentUser) {
        CrmLead lead = crmLeadRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CRM Lead not found #" + id));
        checkLeadAccess(currentUser, lead);

        AdminUser assignee = userRepository.findById(assigneeId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignee user not found #" + assigneeId));

        lead.setAssignedTo(assignee);
        lead = crmLeadRepository.save(lead);

        logActivity(currentUser.getId(), "LEAD_ASSIGNED", "CrmLead", lead.getId(),
                "Assigned CRM Lead #" + lead.getLeadNumber() + " to user #" + assigneeId);

        return mapToLeadResponse(lead);
    }

    // --- FOLLOW-UP MANAGEMENT ---

    @Transactional
    public CrmFollowUpResponse createFollowUp(Long leadId, CrmFollowUpRequest request, AdminUser currentUser) {
        CrmLead lead = crmLeadRepository.findById(leadId)
                .orElseThrow(() -> new ResourceNotFoundException("CRM Lead not found #" + leadId));
        checkLeadAccess(currentUser, lead);

        AdminUser assignee = currentUser;
        if (request.getAssignedToId() != null) {
            assignee = userRepository.findById(request.getAssignedToId())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found #" + request.getAssignedToId()));
        } else if (lead.getAssignedTo() != null) {
            assignee = lead.getAssignedTo();
        }

        CrmFollowUp followUp = CrmFollowUp.builder()
                .lead(lead)
                .assignedTo(assignee)
                .type(request.getType())
                .scheduledAt(request.getScheduledAt())
                .subject(request.getSubject().trim())
                .notes(request.getNotes())
                .status(FollowUpStatus.PENDING)
                .createdBy(currentUser)
                .build();

        followUp = crmFollowUpRepository.save(followUp);
        syncLeadNextFollowUpDate(lead);

        logActivity(currentUser.getId(), "FOLLOW_UP_CREATED", "CrmFollowUp", followUp.getId(),
                "Created follow-up for Lead #" + lead.getLeadNumber());

        return mapToFollowUpResponse(followUp);
    }

    @Transactional(readOnly = true)
    public List<CrmFollowUpResponse> getFollowUpsForLead(Long leadId, AdminUser currentUser) {
        CrmLead lead = crmLeadRepository.findById(leadId)
                .orElseThrow(() -> new ResourceNotFoundException("CRM Lead not found #" + leadId));
        checkLeadAccess(currentUser, lead);

        return crmFollowUpRepository.findByLeadIdOrderByScheduledAtDesc(leadId)
                .stream().map(this::mapToFollowUpResponse).collect(Collectors.toList());
    }

    @Transactional
    public CrmFollowUpResponse updateFollowUp(Long followUpId, CrmFollowUpRequest request, AdminUser currentUser) {
        CrmFollowUp followUp = crmFollowUpRepository.findById(followUpId)
                .orElseThrow(() -> new ResourceNotFoundException("Follow-up not found #" + followUpId));
        checkLeadAccess(currentUser, followUp.getLead());

        if (followUp.getStatus() != FollowUpStatus.PENDING) {
            throw new IllegalStateException("Only PENDING follow-ups can be updated.");
        }

        if (request.getType() != null) followUp.setType(request.getType());
        if (request.getScheduledAt() != null) followUp.setScheduledAt(request.getScheduledAt());
        if (request.getSubject() != null && !request.getSubject().isBlank()) followUp.setSubject(request.getSubject().trim());
        if (request.getNotes() != null) followUp.setNotes(request.getNotes());

        if (request.getAssignedToId() != null) {
            AdminUser assignee = userRepository.findById(request.getAssignedToId())
                    .orElseThrow(() -> new ResourceNotFoundException("Assignee not found #" + request.getAssignedToId()));
            followUp.setAssignedTo(assignee);
        }

        followUp = crmFollowUpRepository.save(followUp);
        syncLeadNextFollowUpDate(followUp.getLead());

        return mapToFollowUpResponse(followUp);
    }

    @Transactional
    public CrmFollowUpResponse completeFollowUp(Long followUpId, String outcome, AdminUser currentUser) {
        CrmFollowUp followUp = crmFollowUpRepository.findById(followUpId)
                .orElseThrow(() -> new ResourceNotFoundException("Follow-up not found #" + followUpId));
        checkLeadAccess(currentUser, followUp.getLead());

        if (followUp.getStatus() != FollowUpStatus.PENDING) {
            throw new IllegalStateException("Follow-up is not PENDING. Cannot complete.");
        }

        followUp.setStatus(FollowUpStatus.COMPLETED);
        followUp.setCompletedAt(LocalDateTime.now());
        if (outcome != null) {
            followUp.setOutcome(outcome.trim());
        }

        followUp = crmFollowUpRepository.save(followUp);
        syncLeadNextFollowUpDate(followUp.getLead());

        logActivity(currentUser.getId(), "FOLLOW_UP_COMPLETED", "CrmFollowUp", followUp.getId(),
                "Completed follow-up for Lead #" + followUp.getLead().getLeadNumber());

        return mapToFollowUpResponse(followUp);
    }

    @Transactional
    public CrmFollowUpResponse cancelFollowUp(Long followUpId, AdminUser currentUser) {
        CrmFollowUp followUp = crmFollowUpRepository.findById(followUpId)
                .orElseThrow(() -> new ResourceNotFoundException("Follow-up not found #" + followUpId));
        checkLeadAccess(currentUser, followUp.getLead());

        if (followUp.getStatus() != FollowUpStatus.PENDING) {
            throw new IllegalStateException("Follow-up is not PENDING. Cannot cancel.");
        }

        followUp.setStatus(FollowUpStatus.CANCELLED);
        followUp = crmFollowUpRepository.save(followUp);
        syncLeadNextFollowUpDate(followUp.getLead());

        logActivity(currentUser.getId(), "FOLLOW_UP_CANCELLED", "CrmFollowUp", followUp.getId(),
                "Cancelled follow-up for Lead #" + followUp.getLead().getLeadNumber());

        return mapToFollowUpResponse(followUp);
    }

    @Transactional(readOnly = true)
    public List<CrmFollowUpResponse> getDueFollowUpsToday(AdminUser currentUser) {
        LocalDateTime start = LocalDate.now().atStartOfDay();
        LocalDateTime end = LocalDate.now().atTime(LocalTime.MAX);
        Long assignedId = (currentUser != null && currentUser.getRole() == Role.SALES) ? currentUser.getId() : null;

        return crmFollowUpRepository.findDueBetween(start, end, assignedId)
                .stream().map(this::mapToFollowUpResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<CrmFollowUpResponse> getUpcomingFollowUps(Pageable pageable, AdminUser currentUser) {
        LocalDateTime now = LocalDateTime.now();
        Long assignedId = (currentUser != null && currentUser.getRole() == Role.SALES) ? currentUser.getId() : null;

        return crmFollowUpRepository.findUpcomingAfter(now, assignedId, pageable)
                .map(this::mapToFollowUpResponse);
    }

    // --- PIPELINE & DASHBOARD SUMMARY ---

    @Transactional(readOnly = true)
    public CrmPipelineResponse getPipeline(AdminUser currentUser) {
        Pageable pageable = PageRequest.of(0, 100, Sort.by("updatedAt").descending());
        Map<LeadStatus, List<CrmLeadResponse>> pipelineMap = new LinkedHashMap<>();

        for (LeadStatus status : LeadStatus.values()) {
            Page<CrmLeadResponse> leads = getAllLeads(
                    pageable, null, status, null, null, null, null, null, null, null, currentUser
            );
            pipelineMap.put(status, leads.getContent());
        }

        return CrmPipelineResponse.builder().pipeline(pipelineMap).build();
    }

    @Transactional(readOnly = true)
    public CrmDashboardSummaryResponse getDashboardSummary(AdminUser currentUser) {
        long newLeads = crmLeadRepository.countByStatus(LeadStatus.NEW);
        long qualifiedLeads = crmLeadRepository.countByStatus(LeadStatus.QUALIFIED);
        long proposalCount = crmLeadRepository.countByStatus(LeadStatus.PROPOSAL);
        long negotiationCount = crmLeadRepository.countByStatus(LeadStatus.NEGOTIATION);
        long wonCount = crmLeadRepository.countByStatus(LeadStatus.WON);
        long lostCount = crmLeadRepository.countByStatus(LeadStatus.LOST);

        long openLeads = newLeads + crmLeadRepository.countByStatus(LeadStatus.CONTACTED)
                + qualifiedLeads + proposalCount + negotiationCount;

        BigDecimal openPipelineVal = crmLeadRepository.sumEstimatedValueByStatusIn(
                List.of(LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED, LeadStatus.PROPOSAL, LeadStatus.NEGOTIATION)
        );

        BigDecimal wonVal = crmLeadRepository.sumEstimatedValueByStatus(LeadStatus.WON);

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startToday = LocalDate.now().atStartOfDay();
        LocalDateTime endToday = LocalDate.now().atTime(LocalTime.MAX);

        long dueToday = crmFollowUpRepository.countByStatusAndScheduledAtBetween(
                FollowUpStatus.PENDING, startToday, endToday
        );

        long overdue = crmFollowUpRepository.countByStatusAndScheduledAtBefore(
                FollowUpStatus.PENDING, now
        );

        Map<String, Long> statusBreakdown = new LinkedHashMap<>();
        for (LeadStatus st : LeadStatus.values()) {
            statusBreakdown.put(st.name(), crmLeadRepository.countByStatus(st));
        }

        return CrmDashboardSummaryResponse.builder()
                .totalOpenLeads(openLeads)
                .newLeads(newLeads)
                .qualifiedLeads(qualifiedLeads)
                .proposalCount(proposalCount)
                .negotiationCount(negotiationCount)
                .wonCount(wonCount)
                .lostCount(lostCount)
                .openPipelineValue(openPipelineVal)
                .wonValue(wonVal)
                .followUpsDueToday(dueToday)
                .overdueFollowUps(overdue)
                .statusBreakdown(statusBreakdown)
                .build();
    }

    // --- HELPER & SECURITY RULES ---

    public void checkLeadAccess(AdminUser user, CrmLead lead) {
        if (user == null) {
            throw new AccessDeniedException("Access denied: Unauthenticated user");
        }
        if (user.getRole() == Role.SUPER_ADMIN) {
            return; // Full access for SUPER_ADMIN
        }
        if (user.getRole() == Role.SALES) {
            if (lead.getAssignedTo() == null) {
                return; // Unassigned lead accessible by SALES
            }
            if (lead.getAssignedTo().getId() != null && lead.getAssignedTo().getId().equals(user.getId())) {
                return; // Assigned to this SALES user
            }
            throw new AccessDeniedException("Access denied: Lead is assigned to another sales representative");
        }
        throw new AccessDeniedException("Access denied: Insufficient permissions");
    }

    private void validateStatusTransition(LeadStatus current, LeadStatus target) {
        if (current == target) return;

        // Terminal WON status cannot be changed directly
        if (current == LeadStatus.WON) {
            throw new IllegalStateException("Lead is already WON. Status cannot be changed.");
        }

        // Standard Lifecycle Paths
        switch (current) {
            case NEW:
                if (target == LeadStatus.CONTACTED || target == LeadStatus.QUALIFIED || target == LeadStatus.LOST) return;
                break;
            case CONTACTED:
                if (target == LeadStatus.QUALIFIED || target == LeadStatus.NEW || target == LeadStatus.LOST) return;
                break;
            case QUALIFIED:
                if (target == LeadStatus.PROPOSAL || target == LeadStatus.CONTACTED || target == LeadStatus.LOST) return;
                break;
            case PROPOSAL:
                if (target == LeadStatus.NEGOTIATION || target == LeadStatus.QUALIFIED || target == LeadStatus.LOST) return;
                break;
            case NEGOTIATION:
                if (target == LeadStatus.WON || target == LeadStatus.LOST || target == LeadStatus.PROPOSAL) return;
                break;
            case LOST:
                if (target == LeadStatus.QUALIFIED || target == LeadStatus.NEGOTIATION) return;
                break;
        }

        throw new IllegalArgumentException("Invalid status transition from " + current + " to " + target);
    }

    private void syncLeadNextFollowUpDate(CrmLead lead) {
        List<CrmFollowUp> pendingFollowUps = crmFollowUpRepository
                .findFirstByLeadIdAndStatusOrderByScheduledAtAsc(lead.getId(), FollowUpStatus.PENDING);

        if (!pendingFollowUps.isEmpty()) {
            lead.setNextFollowUpDate(pendingFollowUps.get(0).getScheduledAt());
        } else {
            lead.setNextFollowUpDate(null);
        }
        crmLeadRepository.save(lead);
    }

    private CrmLeadResponse mapToLeadResponse(CrmLead lead) {
        return CrmLeadResponse.builder()
                .id(lead.getId())
                .leadNumber(lead.getLeadNumber())
                .enquiryId(lead.getEnquiry() != null ? lead.getEnquiry().getId() : null)
                .enquiryReferenceId(lead.getEnquiry() != null ? lead.getEnquiry().getReferenceId() : null)
                .customerId(lead.getCustomer() != null ? lead.getCustomer().getId() : null)
                .customerCode(lead.getCustomer() != null ? lead.getCustomer().getCustomerCode() : null)
                .customerName(lead.getCustomer() != null ? lead.getCustomer().getName() : null)
                .fullName(lead.getFullName())
                .companyName(lead.getCompanyName())
                .businessEmail(lead.getBusinessEmail())
                .phoneNumber(lead.getPhoneNumber())
                .industrySector(lead.getIndustrySector())
                .serviceRequired(lead.getServiceRequired())
                .status(lead.getStatus())
                .priority(lead.getPriority())
                .leadSource(lead.getLeadSource())
                .assignedToId(lead.getAssignedTo() != null ? lead.getAssignedTo().getId() : null)
                .assignedToName(lead.getAssignedTo() != null ? lead.getAssignedTo().getName() : null)
                .estimatedValue(lead.getEstimatedValue())
                .expectedClosingDate(lead.getExpectedClosingDate())
                .probability(lead.getProbability())
                .nextFollowUpDate(lead.getNextFollowUpDate())
                .lostReason(lead.getLostReason())
                .notes(lead.getNotes())
                .createdById(lead.getCreatedBy() != null ? lead.getCreatedBy().getId() : null)
                .createdByName(lead.getCreatedBy() != null ? lead.getCreatedBy().getName() : null)
                .createdAt(lead.getCreatedAt())
                .updatedAt(lead.getUpdatedAt())
                .build();
    }

    private CrmFollowUpResponse mapToFollowUpResponse(CrmFollowUp f) {
        return CrmFollowUpResponse.builder()
                .id(f.getId())
                .leadId(f.getLead().getId())
                .leadNumber(f.getLead().getLeadNumber())
                .leadName(f.getLead().getFullName())
                .companyName(f.getLead().getCompanyName())
                .assignedToId(f.getAssignedTo().getId())
                .assignedToName(f.getAssignedTo().getName())
                .type(f.getType())
                .scheduledAt(f.getScheduledAt())
                .completedAt(f.getCompletedAt())
                .status(f.getStatus())
                .subject(f.getSubject())
                .notes(f.getNotes())
                .outcome(f.getOutcome())
                .createdById(f.getCreatedBy().getId())
                .createdByName(f.getCreatedBy().getName())
                .createdAt(f.getCreatedAt())
                .updatedAt(f.getUpdatedAt())
                .build();
    }

    private void logActivity(Long adminId, String action, String entityType, Long entityId, String description) {
        AdminActivity activity = AdminActivity.builder()
                .adminUserId(adminId)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .description(description)
                .build();
        activityRepository.save(activity);
    }
}
