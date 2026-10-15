package com.acrovix.admin.service;

import com.acrovix.admin.dto.crm.*;
import com.acrovix.admin.entity.*;
import com.acrovix.admin.entity.Currency;
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
public class CrmService {

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(CrmService.class);

    private final CrmLeadRepository crmLeadRepository;
    private final CrmFollowUpRepository crmFollowUpRepository;
    private final AdminEnquiryRepository enquiryRepository;
    private final CustomerRepository customerRepository;
    private final AdminUserRepository userRepository;
    private final AdminActivityRepository activityRepository;
    private final QuotationRepository quotationRepository;
    private final NotificationService notificationService;
    private final SequenceGeneratorService sequenceGeneratorService;
    private final EmailService emailService;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;

    @org.springframework.beans.factory.annotation.Autowired
    public CrmService(
            CrmLeadRepository crmLeadRepository,
            CrmFollowUpRepository crmFollowUpRepository,
            AdminEnquiryRepository enquiryRepository,
            CustomerRepository customerRepository,
            AdminUserRepository userRepository,
            AdminActivityRepository activityRepository,
            QuotationRepository quotationRepository,
            NotificationService notificationService,
            SequenceGeneratorService sequenceGeneratorService,
            EmailService emailService,
            InvoiceRepository invoiceRepository,
            PaymentRepository paymentRepository
    ) {
        this.crmLeadRepository = crmLeadRepository;
        this.crmFollowUpRepository = crmFollowUpRepository;
        this.enquiryRepository = enquiryRepository;
        this.customerRepository = customerRepository;
        this.userRepository = userRepository;
        this.activityRepository = activityRepository;
        this.quotationRepository = quotationRepository;
        this.notificationService = notificationService;
        this.sequenceGeneratorService = sequenceGeneratorService;
        this.emailService = emailService;
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
    }

    public CrmService(
            CrmLeadRepository crmLeadRepository,
            CrmFollowUpRepository crmFollowUpRepository,
            AdminEnquiryRepository enquiryRepository,
            CustomerRepository customerRepository,
            AdminUserRepository userRepository,
            AdminActivityRepository activityRepository,
            NotificationService notificationService,
            SequenceGeneratorService sequenceGeneratorService,
            EmailService emailService
    ) {
        this(crmLeadRepository, crmFollowUpRepository, enquiryRepository, customerRepository,
                userRepository, activityRepository, null, notificationService, sequenceGeneratorService, emailService, null, null);
    }

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
                .currency(request.getCurrency() != null ? request.getCurrency() : Currency.INR)
                .estimatedValue(request.getEstimatedValue())
                .expectedClosingDate(request.getExpectedClosingDate())
                .probability(request.getProbability())
                .notes(request.getNotes())
                .createdBy(currentUser)
                .build();

        lead = crmLeadRepository.save(lead);

        logActivity(currentUser.getId(), "LEAD_CREATED", "CRM_LEAD", lead.getId(), "Created CRM Lead #" + lead.getLeadNumber());
        
        notificationService.createNewLeadCreatedNotification(assignedUser != null ? assignedUser : currentUser, lead.getLeadNumber(), lead.getId(), companyName != null ? companyName : fullName);
        
        if (enquiry != null) {
            notificationService.createEnquiryConvertedNotification(assignedUser != null ? assignedUser : currentUser, enquiry.getId());
        }

        try {
            emailService.sendCrmLeadNotification(lead);
        } catch (Exception e) {
            logger.warn("CRM lead notification email failed for lead #{}: {}", lead.getLeadNumber(), e.getMessage());
        }

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
        if (request.getCurrency() != null) {
            lead.setCurrency(request.getCurrency());
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
        logActivity(currentUser.getId(), "LEAD_UPDATED", "CRM_LEAD", lead.getId(), "Updated CRM Lead #" + lead.getLeadNumber());
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
            lead.setProbability(0);

            // Stop/cancel active pending follow-ups for this lead
            List<CrmFollowUp> pendingFollowUps = crmFollowUpRepository.findByLeadIdOrderByScheduledAtDesc(lead.getId());
            for (CrmFollowUp fu : pendingFollowUps) {
                if (fu.getStatus() == FollowUpStatus.PENDING) {
                    fu.setStatus(FollowUpStatus.CANCELLED);
                    fu.setOutcome("Cancelled: Lead marked as LOST");
                    crmFollowUpRepository.save(fu);
                }
            }
            lead.setNextFollowUpDate(null);
        } else if (oldStatus == LeadStatus.LOST) {
            // Reopening lead from LOST
            lead.setLostReason(null);
            if (request.getProbability() != null) {
                lead.setProbability(request.getProbability());
            } else {
                lead.setProbability(50);
            }
        }

        // Numeric and stage-specific updates & validation
        if (request.getEstimatedValue() != null) {
            if (request.getEstimatedValue().compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Estimated deal value cannot be negative.");
            }
            lead.setEstimatedValue(request.getEstimatedValue());
        }

        if (request.getProbability() != null) {
            if (request.getProbability() < 0 || request.getProbability() > 100) {
                throw new IllegalArgumentException("Win probability must be between 0 and 100.");
            }
            lead.setProbability(request.getProbability());
        }

        if (request.getExpectedClosingDate() != null) {
            lead.setExpectedClosingDate(request.getExpectedClosingDate());
        }

        if (request.getServiceRequired() != null && !request.getServiceRequired().isBlank()) {
            lead.setServiceRequired(request.getServiceRequired().trim());
        }

        if (request.getIndustrySector() != null && !request.getIndustrySector().isBlank()) {
            lead.setIndustrySector(request.getIndustrySector().trim());
        }

        // Stage WON specific checks
        if (newStatus == LeadStatus.WON) {
            lead.setProbability(100);
        }

        // Notes and requirement update
        if (request.getNotes() != null && !request.getNotes().isBlank()) {
            String noteText = request.getNotes().trim();
            if (lead.getNotes() == null || lead.getNotes().isBlank()) {
                lead.setNotes(noteText);
            } else {
                lead.setNotes(lead.getNotes() + "\n\n[" + newStatus + " Update] " + noteText);
            }
        }

        lead.setStatus(newStatus);
        lead = crmLeadRepository.save(lead);

        // Schedule follow-up if requested during stage change
        if (request.getNextFollowUpDate() != null && newStatus != LeadStatus.LOST && newStatus != LeadStatus.WON) {
            FollowUpType fType = parseFollowUpType(request.getInteractionType());
            String fSubject = (request.getSubject() != null && !request.getSubject().isBlank())
                    ? request.getSubject().trim()
                    : "Follow-up for " + newStatus;
            String fNotes = (request.getNextAction() != null && !request.getNextAction().isBlank())
                    ? request.getNextAction().trim()
                    : request.getNotes();

            CrmFollowUp fu = CrmFollowUp.builder()
                    .lead(lead)
                    .assignedTo(lead.getAssignedTo() != null ? lead.getAssignedTo() : currentUser)
                    .type(fType)
                    .scheduledAt(request.getNextFollowUpDate())
                    .subject(fSubject)
                    .notes(fNotes)
                    .status(FollowUpStatus.PENDING)
                    .createdBy(currentUser)
                    .build();
            crmFollowUpRepository.save(fu);
            syncLeadNextFollowUpDate(lead);

            logActivity(currentUser.getId(), "FOLLOW_UP_CREATED", "CRM_LEAD", lead.getId(),
                    "Scheduled " + fu.getType() + " follow-up: \"" + fu.getSubject() + "\" for " + fu.getScheduledAt());
        }

        // Build descriptive activity audit
        StringBuilder auditDesc = new StringBuilder();
        auditDesc.append("Status changed from ").append(oldStatus).append(" to ").append(newStatus);

        if (request.getInteractionType() != null && !request.getInteractionType().isBlank()) {
            auditDesc.append(" via ").append(request.getInteractionType().toUpperCase());
        }
        if (request.getSubject() != null && !request.getSubject().isBlank()) {
            auditDesc.append("\nSummary: ").append(request.getSubject().trim());
        }
        if (request.getOutcome() != null && !request.getOutcome().isBlank()) {
            auditDesc.append("\nOutcome: ").append(request.getOutcome().trim());
        }
        if (request.getCustomerResponse() != null && !request.getCustomerResponse().isBlank()) {
            auditDesc.append("\nCustomer Feedback: ").append(request.getCustomerResponse().trim());
        }
        if (request.getNextAction() != null && !request.getNextAction().isBlank()) {
            auditDesc.append("\nNext Action: ").append(request.getNextAction().trim());
        }
        if (request.getNotes() != null && !request.getNotes().isBlank()) {
            auditDesc.append("\nNotes: ").append(request.getNotes().trim());
        }
        if (newStatus == LeadStatus.LOST) {
            auditDesc.append("\nLoss Reason: ").append(request.getLostReason().trim());
            if (request.getCompetitor() != null && !request.getCompetitor().isBlank()) {
                auditDesc.append("\nCompetitor: ").append(request.getCompetitor().trim());
            }
        }

        String action = "LEAD_STATUS_CHANGED";
        if (newStatus == LeadStatus.WON) action = "OPPORTUNITY_WON";
        else if (newStatus == LeadStatus.LOST) action = "OPPORTUNITY_LOST";
        else if (oldStatus == LeadStatus.LOST) action = "LEAD_REOPENED";
        else action = "STAGE_" + newStatus;

        logActivity(currentUser.getId(), action, "CRM_LEAD", lead.getId(), auditDesc.toString());

        return mapToLeadResponse(lead);
    }

    @Transactional
    public CrmLeadResponse assignLead(Long id, Long assigneeId, AdminUser currentUser) {
        CrmLead lead = crmLeadRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CRM Lead not found #" + id));
        checkLeadAccess(currentUser, lead);

        if (currentUser != null && currentUser.getRole() == Role.SALES) {
            if (lead.getAssignedTo() != null && !lead.getAssignedTo().getId().equals(currentUser.getId())) {
                throw new org.springframework.security.access.AccessDeniedException("Access denied: Only SUPER_ADMIN can reassign leads");
            }
            if (!assigneeId.equals(currentUser.getId())) {
                throw new org.springframework.security.access.AccessDeniedException("Access denied: Sales representatives can only assign leads to themselves");
            }
        }

        AdminUser assignee = userRepository.findById(assigneeId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignee user not found #" + assigneeId));

        lead.setAssignedTo(assignee);
        lead = crmLeadRepository.save(lead);

        logActivity(currentUser.getId(), "LEAD_ASSIGNED", "CRM_LEAD", lead.getId(),
                "Assigned CRM Lead #" + lead.getLeadNumber() + " to user #" + assigneeId + " (" + assignee.getName() + ")");

        if (!currentUser.getId().equals(assignee.getId())) {
            notificationService.createLeadAssignedNotification(assignee, lead.getLeadNumber(), lead.getId());
        }

        try {
            emailService.sendLeadAssignmentAsync(lead);
        } catch (Exception e) {
            logger.warn("Failed to send lead assignment email for lead #{}: {}", lead.getId(), e.getMessage());
        }

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

        logActivity(currentUser.getId(), "FOLLOW_UP_CREATED", "CRM_LEAD", lead.getId(),
                "Scheduled " + followUp.getType() + " follow-up: \"" + followUp.getSubject() + "\" for " + followUp.getScheduledAt());

        try {
            emailService.sendFollowUpNotificationAsync(followUp, "NEW_FOLLOW_UP", null);
        } catch (Exception e) {
            logger.warn("Failed to send follow-up notification email for followUp #{}: {}", followUp.getId(), e.getMessage());
        }

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

        LocalDateTime oldScheduledAt = followUp.getScheduledAt();
        boolean rescheduled = false;

        if (request.getType() != null) followUp.setType(request.getType());
        if (request.getScheduledAt() != null) {
            if (!request.getScheduledAt().equals(oldScheduledAt)) {
                rescheduled = true;
            }
            followUp.setScheduledAt(request.getScheduledAt());
        }
        if (request.getSubject() != null && !request.getSubject().isBlank()) followUp.setSubject(request.getSubject().trim());
        if (request.getNotes() != null) followUp.setNotes(request.getNotes());

        if (request.getAssignedToId() != null) {
            AdminUser assignee = userRepository.findById(request.getAssignedToId())
                    .orElseThrow(() -> new ResourceNotFoundException("Assignee not found #" + request.getAssignedToId()));
            followUp.setAssignedTo(assignee);
        }

        followUp = crmFollowUpRepository.save(followUp);
        syncLeadNextFollowUpDate(followUp.getLead());

        if (rescheduled) {
            logActivity(currentUser.getId(), "FOLLOW_UP_RESCHEDULED", "CRM_LEAD", followUp.getLead().getId(),
                    "Follow-up \"" + followUp.getSubject() + "\" rescheduled from " + oldScheduledAt + " to " + followUp.getScheduledAt());
        } else {
            logActivity(currentUser.getId(), "FOLLOW_UP_UPDATED", "CRM_LEAD", followUp.getLead().getId(),
                    "Updated follow-up \"" + followUp.getSubject() + "\"");
        }

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

        String desc = "Completed follow-up: \"" + followUp.getSubject() + "\"";
        if (outcome != null && !outcome.isBlank()) {
            desc += "\nOutcome: " + outcome.trim();
        }
        logActivity(currentUser.getId(), "FOLLOW_UP_COMPLETED", "CRM_LEAD", followUp.getLead().getId(), desc);

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

        logActivity(currentUser.getId(), "FOLLOW_UP_CANCELLED", "CRM_LEAD", followUp.getLead().getId(),
                "Cancelled follow-up: \"" + followUp.getSubject() + "\"");

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
        Long salesUserId = (currentUser != null && currentUser.getRole() == Role.SALES) ? currentUser.getId() : null;

        long newLeads = crmLeadRepository.countByStatusWithFilter(LeadStatus.NEW, salesUserId);
        long qualifiedLeads = crmLeadRepository.countByStatusWithFilter(LeadStatus.QUALIFIED, salesUserId);
        long proposalCount = crmLeadRepository.countByStatusWithFilter(LeadStatus.PROPOSAL, salesUserId);
        long negotiationCount = crmLeadRepository.countByStatusWithFilter(LeadStatus.NEGOTIATION, salesUserId);
        long wonCount = crmLeadRepository.countByStatusWithFilter(LeadStatus.WON, salesUserId);
        long lostCount = crmLeadRepository.countByStatusWithFilter(LeadStatus.LOST, salesUserId);

        long openLeads = newLeads + crmLeadRepository.countByStatusWithFilter(LeadStatus.CONTACTED, salesUserId)
                + qualifiedLeads + proposalCount + negotiationCount;

        BigDecimal openPipelineVal = crmLeadRepository.sumEstimatedValueByStatusInWithFilter(
                List.of(LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED, LeadStatus.PROPOSAL, LeadStatus.NEGOTIATION), salesUserId
        );

        BigDecimal wonVal = crmLeadRepository.sumEstimatedValueByStatusWithFilter(LeadStatus.WON, salesUserId);

        Map<Currency, BigDecimal> openPipelineValueByCurrency = new EnumMap<>(Currency.class);
        Map<Currency, BigDecimal> wonValueByCurrency = new EnumMap<>(Currency.class);
        for (Currency c : Currency.values()) {
            openPipelineValueByCurrency.put(c, crmLeadRepository.sumEstimatedValueByStatusInAndCurrencyWithFilter(
                    List.of(LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED, LeadStatus.PROPOSAL, LeadStatus.NEGOTIATION), c, salesUserId
            ));
            wonValueByCurrency.put(c, crmLeadRepository.sumEstimatedValueByStatusAndCurrencyWithFilter(LeadStatus.WON, c, salesUserId));
        }

        long totalLeads = crmLeadRepository.countTotalWithFilter(salesUserId);

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startToday = LocalDate.now().atStartOfDay();
        LocalDateTime endToday = LocalDate.now().atTime(LocalTime.MAX);

        long dueToday = crmFollowUpRepository.countByStatusAndScheduledAtBetweenWithFilter(
                FollowUpStatus.PENDING, startToday, endToday, salesUserId
        );

        long overdue = crmFollowUpRepository.countByStatusAndScheduledAtBeforeWithFilter(
                FollowUpStatus.PENDING, now, salesUserId
        );

        long upcomingFollowUps = crmFollowUpRepository.countByStatusAndScheduledAtBetweenWithFilter(
                FollowUpStatus.PENDING, endToday, now.plusDays(7), salesUserId
        );

        long staleOpportunities = crmLeadRepository.countStaleLeadsWithFilter(
                List.of(LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED, LeadStatus.PROPOSAL, LeadStatus.NEGOTIATION),
                now.minusDays(14),
                salesUserId
        );

        BigDecimal invoicedRevenue = (invoiceRepository != null)
                ? invoiceRepository.sumActiveInvoicedAmountWithFilter(salesUserId)
                : BigDecimal.ZERO;

        BigDecimal collectedRevenue = (paymentRepository != null)
                ? paymentRepository.sumRecordedPaymentsWithFilter(salesUserId)
                : BigDecimal.ZERO;

        double winRate = (wonCount + lostCount) > 0
                ? Math.round(((double) wonCount / (wonCount + lostCount) * 100.0) * 10.0) / 10.0
                : 0.0;

        Map<String, Long> statusBreakdown = new LinkedHashMap<>();
        for (LeadStatus st : LeadStatus.values()) {
            statusBreakdown.put(st.name(), crmLeadRepository.countByStatusWithFilter(st, salesUserId));
        }

        return CrmDashboardSummaryResponse.builder()
                .totalLeads(totalLeads)
                .totalOpenLeads(openLeads)
                .newLeads(newLeads)
                .qualifiedLeads(qualifiedLeads)
                .proposalCount(proposalCount)
                .negotiationCount(negotiationCount)
                .wonCount(wonCount)
                .lostCount(lostCount)
                .staleOpportunitiesCount(staleOpportunities)
                .openPipelineValue(openPipelineVal)
                .wonValue(wonVal)
                .invoicedRevenue(invoicedRevenue)
                .collectedRevenue(collectedRevenue)
                .winRatePercent(winRate)
                .openPipelineValueByCurrency(openPipelineValueByCurrency)
                .wonValueByCurrency(wonValueByCurrency)
                .followUpsDueToday(dueToday)
                .overdueFollowUps(overdue)
                .upcomingFollowUpsCount(upcomingFollowUps)
                .statusBreakdown(statusBreakdown)
                .build();
    }

    @Transactional(readOnly = true)
    public List<CrmFollowUpResponse> getOverdueFollowUps(AdminUser currentUser) {
        LocalDateTime now = LocalDateTime.now();
        Long assignedId = (currentUser != null && currentUser.getRole() == Role.SALES) ? currentUser.getId() : null;

        return crmFollowUpRepository.findOverdueBefore(now, assignedId)
                .stream().map(this::mapToFollowUpResponse).collect(Collectors.toList());
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
        Optional<CrmFollowUp> pendingFollowUp = crmFollowUpRepository
                .findFirstByLeadIdAndStatusOrderByScheduledAtAsc(lead.getId(), FollowUpStatus.PENDING);

        if (pendingFollowUp.isPresent()) {
            lead.setNextFollowUpDate(pendingFollowUp.get().getScheduledAt());
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
                .currency(lead.getCurrency())
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

    // --- TIMELINE ACTIVITIES & QUOTATIONS ---

    @Transactional(readOnly = true)
    public List<com.acrovix.admin.dto.AdminActivityResponse> getActivitiesForLead(Long leadId, AdminUser currentUser) {
        CrmLead lead = crmLeadRepository.findById(leadId)
                .orElseThrow(() -> new ResourceNotFoundException("CRM Lead not found #" + leadId));
        checkLeadAccess(currentUser, lead);

        List<AdminActivity> activities = activityRepository.findActivitiesForLead(leadId);

        Set<Long> userIds = activities.stream()
                .map(AdminActivity::getAdminUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, String> userNames = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(
                        AdminUser::getId,
                        u -> u.getName() != null && !u.getName().isBlank() ? u.getName() : u.getEmail(),
                        (existing, replacement) -> existing
                ));

        return activities.stream()
                .map(a -> com.acrovix.admin.dto.AdminActivityResponse.builder()
                        .id(a.getId())
                        .adminUserId(a.getAdminUserId())
                        .adminName(userNames.getOrDefault(a.getAdminUserId(), a.getAdminUserId() != null ? "User #" + a.getAdminUserId() : "System"))
                        .action(a.getAction())
                        .entityType(a.getEntityType())
                        .entityId(a.getEntityId())
                        .description(a.getDescription())
                        .createdAt(a.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public com.acrovix.admin.dto.AdminActivityResponse logLeadActivity(Long leadId, CrmLeadActivityRequest request, AdminUser currentUser) {
        CrmLead lead = crmLeadRepository.findById(leadId)
                .orElseThrow(() -> new ResourceNotFoundException("CRM Lead not found #" + leadId));
        checkLeadAccess(currentUser, lead);

        if (request.getType() == null || request.getType().isBlank()) {
            throw new IllegalArgumentException("Activity type is required.");
        }
        if (request.getSubject() == null || request.getSubject().isBlank()) {
            throw new IllegalArgumentException("Subject is required.");
        }

        StringBuilder desc = new StringBuilder();
        desc.append("[").append(request.getType().trim().toUpperCase()).append("] ").append(request.getSubject().trim());
        if (request.getOutcome() != null && !request.getOutcome().isBlank()) {
            desc.append("\nOutcome: ").append(request.getOutcome().trim());
        }
        if (request.getNotes() != null && !request.getNotes().isBlank()) {
            desc.append("\nNotes: ").append(request.getNotes().trim());
        }
        if (request.getNextAction() != null && !request.getNextAction().isBlank()) {
            desc.append("\nNext Action: ").append(request.getNextAction().trim());
        }

        LocalDateTime activityTime = request.getPerformedAt() != null ? request.getPerformedAt() : LocalDateTime.now();

        AdminActivity activity = AdminActivity.builder()
                .adminUserId(currentUser.getId())
                .action("ACTIVITY_" + request.getType().trim().toUpperCase())
                .entityType("CRM_LEAD")
                .entityId(lead.getId())
                .description(desc.toString())
                .createdAt(activityTime)
                .build();

        activity = activityRepository.save(activity);

        return com.acrovix.admin.dto.AdminActivityResponse.builder()
                .id(activity.getId())
                .adminUserId(currentUser.getId())
                .adminName(currentUser.getName() != null && !currentUser.getName().isBlank() ? currentUser.getName() : currentUser.getEmail())
                .action(activity.getAction())
                .entityType(activity.getEntityType())
                .entityId(activity.getEntityId())
                .description(activity.getDescription())
                .createdAt(activity.getCreatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getQuotationsForLead(Long leadId, AdminUser currentUser) {
        CrmLead lead = crmLeadRepository.findById(leadId)
                .orElseThrow(() -> new ResourceNotFoundException("CRM Lead not found #" + leadId));
        checkLeadAccess(currentUser, lead);

        if (quotationRepository == null) {
            return Collections.emptyList();
        }

        Long enquiryId = lead.getEnquiry() != null ? lead.getEnquiry().getId() : null;
        Long customerId = lead.getCustomer() != null ? lead.getCustomer().getId() : null;
        String email = lead.getBusinessEmail();

        List<Quotation> quotations = quotationRepository.findQuotationsForLead(enquiryId, customerId, email);

        return quotations.stream()
                .map(q -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("id", q.getId());
                    map.put("quotationNumber", q.getQuotationNumber());
                    map.put("status", q.getStatus());
                    map.put("currency", q.getCurrency() != null ? q.getCurrency().name() : "INR");
                    map.put("grandTotal", q.getGrandTotal());
                    map.put("subtotal", q.getSubtotal());
                    map.put("validUntil", q.getValidUntil());
                    map.put("version", q.getVersion());
                    map.put("clientName", q.getClientName());
                    map.put("clientEmail", q.getClientEmail());
                    map.put("clientCompany", q.getClientCompany());
                    map.put("createdAt", q.getCreatedAt());
                    map.put("updatedAt", q.getUpdatedAt());
                    return map;
                })
                .collect(Collectors.toList());
    }

    private FollowUpType parseFollowUpType(String typeStr) {
        if (typeStr == null || typeStr.isBlank()) return FollowUpType.CALL;
        try {
            return FollowUpType.valueOf(typeStr.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return FollowUpType.OTHER;
        }
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

