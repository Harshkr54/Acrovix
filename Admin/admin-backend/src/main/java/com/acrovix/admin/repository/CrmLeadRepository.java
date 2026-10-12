package com.acrovix.admin.repository;

import com.acrovix.admin.entity.CrmLead;
import com.acrovix.admin.entity.Currency;
import com.acrovix.admin.entity.LeadStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Repository
public interface CrmLeadRepository extends JpaRepository<CrmLead, Long>, JpaSpecificationExecutor<CrmLead> {

    Optional<CrmLead> findByLeadNumber(String leadNumber);

    Optional<CrmLead> findByEnquiryId(Long enquiryId);

    @Query("SELECT l FROM CrmLead l WHERE l.enquiry.id = :enquiryId AND l.status NOT IN (:inactiveStatuses)")
    List<CrmLead> findActiveLeadsForEnquiry(@Param("enquiryId") Long enquiryId, @Param("inactiveStatuses") List<LeadStatus> inactiveStatuses);

    long countByStatus(LeadStatus status);

    @Query("SELECT COUNT(l) FROM CrmLead l WHERE l.status = :status AND (:salesUserId IS NULL OR l.assignedTo IS NULL OR l.assignedTo.id = :salesUserId)")
    long countByStatusWithFilter(@Param("status") LeadStatus status, @Param("salesUserId") Long salesUserId);

    @Query("SELECT COALESCE(SUM(l.estimatedValue), 0) FROM CrmLead l WHERE l.status IN (:statuses)")
    BigDecimal sumEstimatedValueByStatusIn(@Param("statuses") List<LeadStatus> statuses);

    @Query("SELECT COALESCE(SUM(l.estimatedValue), 0) FROM CrmLead l WHERE l.status IN (:statuses) AND (:salesUserId IS NULL OR l.assignedTo IS NULL OR l.assignedTo.id = :salesUserId)")
    BigDecimal sumEstimatedValueByStatusInWithFilter(@Param("statuses") List<LeadStatus> statuses, @Param("salesUserId") Long salesUserId);

    @Query("SELECT COALESCE(SUM(l.estimatedValue), 0) FROM CrmLead l WHERE l.status = :status")
    BigDecimal sumEstimatedValueByStatus(@Param("status") LeadStatus status);

    @Query("SELECT COALESCE(SUM(l.estimatedValue), 0) FROM CrmLead l WHERE l.status = :status AND (:salesUserId IS NULL OR l.assignedTo IS NULL OR l.assignedTo.id = :salesUserId)")
    BigDecimal sumEstimatedValueByStatusWithFilter(@Param("status") LeadStatus status, @Param("salesUserId") Long salesUserId);

    @Query("SELECT COALESCE(SUM(l.estimatedValue), 0) FROM CrmLead l WHERE l.status IN (:statuses) AND COALESCE(l.currency, com.acrovix.admin.entity.Currency.INR) = :currency")
    BigDecimal sumEstimatedValueByStatusInAndCurrency(@Param("statuses") List<LeadStatus> statuses, @Param("currency") Currency currency);

    @Query("SELECT COALESCE(SUM(l.estimatedValue), 0) FROM CrmLead l WHERE l.status IN (:statuses) AND COALESCE(l.currency, com.acrovix.admin.entity.Currency.INR) = :currency AND (:salesUserId IS NULL OR l.assignedTo IS NULL OR l.assignedTo.id = :salesUserId)")
    BigDecimal sumEstimatedValueByStatusInAndCurrencyWithFilter(@Param("statuses") List<LeadStatus> statuses, @Param("currency") Currency currency, @Param("salesUserId") Long salesUserId);

    @Query("SELECT COALESCE(SUM(l.estimatedValue), 0) FROM CrmLead l WHERE l.status = :status AND COALESCE(l.currency, com.acrovix.admin.entity.Currency.INR) = :currency")
    BigDecimal sumEstimatedValueByStatusAndCurrency(@Param("status") LeadStatus status, @Param("currency") Currency currency);

    @Query("SELECT COALESCE(SUM(l.estimatedValue), 0) FROM CrmLead l WHERE l.status = :status AND COALESCE(l.currency, com.acrovix.admin.entity.Currency.INR) = :currency AND (:salesUserId IS NULL OR l.assignedTo IS NULL OR l.assignedTo.id = :salesUserId)")
    BigDecimal sumEstimatedValueByStatusAndCurrencyWithFilter(@Param("status") LeadStatus status, @Param("currency") Currency currency, @Param("salesUserId") Long salesUserId);

    Page<CrmLead> findByCustomerIdOrderByCreatedAtDesc(Long customerId, Pageable pageable);

    List<CrmLead> findByStatusOrderByCreatedAtDesc(LeadStatus status);

    boolean existsByCustomerIdAndAssignedToId(Long customerId, Long assignedToId);

    boolean existsByBusinessEmailIgnoreCase(String businessEmail);

    Optional<CrmLead> findByBusinessEmailIgnoreCase(String businessEmail);

    boolean existsByPhoneNumber(String phoneNumber);

    Optional<CrmLead> findFirstByPhoneNumber(String phoneNumber);

    List<CrmLead> findByFullNameIgnoreCaseAndCompanyNameIgnoreCase(String fullName, String companyName);

}
