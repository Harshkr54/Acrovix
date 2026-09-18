package com.acrovix.admin.repository;

import com.acrovix.admin.entity.CrmFollowUp;
import com.acrovix.admin.entity.FollowUpStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CrmFollowUpRepository extends JpaRepository<CrmFollowUp, Long> {

    List<CrmFollowUp> findByLeadIdOrderByScheduledAtDesc(Long leadId);

    Page<CrmFollowUp> findByLeadIdInOrderByScheduledAtDesc(List<Long> leadIds, Pageable pageable);

    List<CrmFollowUp> findFirstByLeadIdAndStatusOrderByScheduledAtAsc(Long leadId, FollowUpStatus status);

    @Query("SELECT f FROM CrmFollowUp f WHERE f.status = 'PENDING' AND f.scheduledAt BETWEEN :start AND :end AND (:assignedId IS NULL OR f.assignedTo.id = :assignedId) ORDER BY f.scheduledAt ASC")
    List<CrmFollowUp> findDueBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end, @Param("assignedId") Long assignedId);

    @Query("SELECT f FROM CrmFollowUp f WHERE f.status = 'PENDING' AND f.scheduledAt < :now AND (:assignedId IS NULL OR f.assignedTo.id = :assignedId) ORDER BY f.scheduledAt ASC")
    List<CrmFollowUp> findOverdueBefore(@Param("now") LocalDateTime now, @Param("assignedId") Long assignedId);

    @Query("SELECT f FROM CrmFollowUp f WHERE f.status = 'PENDING' AND f.scheduledAt >= :now AND (:assignedId IS NULL OR f.assignedTo.id = :assignedId) ORDER BY f.scheduledAt ASC")
    Page<CrmFollowUp> findUpcomingAfter(@Param("now") LocalDateTime now, @Param("assignedId") Long assignedId, Pageable pageable);

    long countByStatusAndScheduledAtBetween(FollowUpStatus status, LocalDateTime start, LocalDateTime end);

    long countByStatusAndScheduledAtBefore(FollowUpStatus status, LocalDateTime dateTime);
}
