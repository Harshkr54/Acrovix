package com.acrovix.admin.service;

import com.acrovix.admin.entity.AdminActivity;
import com.acrovix.admin.entity.AdminEnquiry;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.repository.AdminActivityRepository;
import com.acrovix.admin.repository.AdminEnquiryRepository;
import com.acrovix.admin.repository.AdminUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.acrovix.admin.exception.ResourceNotFoundException;

import jakarta.persistence.criteria.Predicate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminEnquiryService {

    private final AdminEnquiryRepository enquiryRepository;
    private final AdminUserRepository userRepository;
    private final AdminActivityRepository activityRepository;
    private final NotificationService notificationService;
    private final AuthorizationService authorizationService;

    public Page<AdminEnquiry> getAllEnquiries(Pageable pageable, String search, String status, String industry, String serviceReq, LocalDateTime fromDate, LocalDateTime toDate) {
        Specification<AdminEnquiry> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (search != null && !search.isEmpty()) {
                String likePattern = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("fullName")), likePattern),
                    cb.like(cb.lower(root.get("companyName")), likePattern),
                    cb.like(cb.lower(root.get("referenceId")), likePattern)
                ));
            }
            if (status != null && !status.isEmpty()) predicates.add(cb.equal(root.get("status"), status));
            if (industry != null && !industry.isEmpty()) predicates.add(cb.equal(root.get("industrySector"), industry));
            if (serviceReq != null && !serviceReq.isEmpty()) predicates.add(cb.equal(root.get("serviceRequired"), serviceReq));
            if (fromDate != null) predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), fromDate));
            if (toDate != null) predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), toDate));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return enquiryRepository.findAll(spec, pageable);
    }

    public AdminEnquiry getEnquiry(Long id, AdminUser currentUser) {
        AdminEnquiry enquiry = enquiryRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Enquiry not found"));
        if (currentUser != null) {
            authorizationService.checkEnquiryAccess(currentUser, enquiry);
        }
        return enquiry;
    }

    public AdminEnquiry getEnquiry(Long id) {
        return enquiryRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Enquiry not found"));
    }

    @Transactional
    public void updateStatus(Long id, String status, AdminUser currentUser) {
        AdminEnquiry enquiry = getEnquiry(id, currentUser);
        enquiry.setStatus(status);
        enquiryRepository.save(enquiry);
        logActivity(currentUser.getId(), "Updated Status to " + status, "AdminEnquiry", id);
    }

    @Transactional
    public void updateStatus(Long id, String status, Long adminId) {
        AdminUser admin = userRepository.findById(adminId).orElseThrow(() -> new ResourceNotFoundException("Admin not found"));
        updateStatus(id, status, admin);
    }

    @Transactional
    public void assignAdmin(Long id, Long assigneeId, AdminUser currentUser) {
        AdminEnquiry enquiry = getEnquiry(id, currentUser);
        AdminUser assignee = userRepository.findById(assigneeId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        boolean isNewAssignment = (enquiry.getAssignedTo() == null || !enquiry.getAssignedTo().getId().equals(assigneeId));
        
        enquiry.setAssignedTo(assignee);
        enquiryRepository.save(enquiry);
        logActivity(currentUser.getId(), "Assigned enquiry #" + id + " to admin #" + assigneeId, "AdminEnquiry", id);

        if (isNewAssignment && !assignee.getId().equals(currentUser.getId())) {
            notificationService.createEnquiryAssignedNotification(assignee, id);
        }
    }

    @Transactional
    public void assignAdmin(Long id, Long assigneeId, Long adminId) {
        AdminUser admin = userRepository.findById(adminId).orElseThrow(() -> new ResourceNotFoundException("Admin not found"));
        assignAdmin(id, assigneeId, admin);
    }

    @Transactional
    public void updateNotes(Long id, String notes, AdminUser currentUser) {
        AdminEnquiry enquiry = getEnquiry(id, currentUser);
        enquiry.setNotes(notes);
        enquiryRepository.save(enquiry);
        logActivity(currentUser.getId(), "Updated notes for enquiry #" + id, "AdminEnquiry", id);
    }

    @Transactional
    public void updateNotes(Long id, String notes, Long adminId) {
        AdminUser admin = userRepository.findById(adminId).orElseThrow(() -> new ResourceNotFoundException("Admin not found"));
        updateNotes(id, notes, admin);
    }

    private void logActivity(Long adminId, String action, String entityType, Long entityId) {
        AdminActivity activity = AdminActivity.builder()
                .adminUserId(adminId)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .description("Action performed by admin ID: " + adminId)
                .build();
        activityRepository.save(activity);
    }
}
