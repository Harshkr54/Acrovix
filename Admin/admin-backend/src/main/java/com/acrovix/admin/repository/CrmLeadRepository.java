package com.acrovix.admin.repository;

import com.acrovix.admin.entity.CrmLead;
import com.acrovix.admin.entity.LeadStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface CrmLeadRepository extends JpaRepository<CrmLead, Long>, JpaSpecificationExecutor<CrmLead> {

    Optional<CrmLead> findByLeadNumber(String leadNumber);

    Optional<CrmLead> findByEnquiryId(Long enquiryId);

    @Query("SELECT l FROM CrmLead l WHERE l.enquiry.id = :enquiryId AND l.status NOT IN (:inactiveStatuses)")
    List<CrmLead> findActiveLeadsForEnquiry(@Param("enquiryId") Long enquiryId, @Param("inactiveStatuses") List<LeadStatus> inactiveStatuses);

    long countByStatus(LeadStatus status);

    @Query("SELECT COALESCE(SUM(l.estimatedValue), 0) FROM CrmLead l WHERE l.status IN (:statuses)")
    BigDecimal sumEstimatedValueByStatusIn(@Param("statuses") List<LeadStatus> statuses);

    @Query("SELECT COALESCE(SUM(l.estimatedValue), 0) FROM CrmLead l WHERE l.status = :status")
    BigDecimal sumEstimatedValueByStatus(@Param("status") LeadStatus status);

    List<CrmLead> findByStatusOrderByCreatedAtDesc(LeadStatus status);
}
