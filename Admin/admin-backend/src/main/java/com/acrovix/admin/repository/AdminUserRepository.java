package com.acrovix.admin.repository;

import com.acrovix.admin.entity.AdminUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AdminUserRepository extends JpaRepository<AdminUser, Long> {
    Optional<AdminUser> findByEmail(String email);
    boolean existsByEmail(String email);
    long countByRoleAndEnabledTrue(com.acrovix.admin.entity.Role role);
    java.util.List<AdminUser> findByEnabled(boolean enabled);
    long countByEnabled(boolean enabled);

    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true)
    @org.springframework.data.jpa.repository.Query("UPDATE AdminEnquiry e SET e.assignedTo = :newAssignee WHERE e.assignedTo = :oldAssignee AND e.status NOT IN ('CONVERTED', 'CLOSED')")
    void reassignActiveEnquiries(@org.springframework.data.repository.query.Param("oldAssignee") AdminUser oldAssignee, @org.springframework.data.repository.query.Param("newAssignee") AdminUser newAssignee);

    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true)
    @org.springframework.data.jpa.repository.Query("UPDATE CrmLead l SET l.assignedTo = :newAssignee WHERE l.assignedTo = :oldAssignee AND l.status NOT IN (com.acrovix.admin.entity.LeadStatus.WON, com.acrovix.admin.entity.LeadStatus.LOST)")
    void reassignActiveLeads(@org.springframework.data.repository.query.Param("oldAssignee") AdminUser oldAssignee, @org.springframework.data.repository.query.Param("newAssignee") AdminUser newAssignee);

    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true)
    @org.springframework.data.jpa.repository.Query("UPDATE CrmFollowUp f SET f.assignedTo = :newAssignee WHERE f.assignedTo = :oldAssignee AND f.status = com.acrovix.admin.entity.FollowUpStatus.PENDING")
    void reassignPendingFollowUps(@org.springframework.data.repository.query.Param("oldAssignee") AdminUser oldAssignee, @org.springframework.data.repository.query.Param("newAssignee") AdminUser newAssignee);
}
