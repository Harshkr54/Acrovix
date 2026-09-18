package com.acrovix.admin.repository;

import com.acrovix.admin.entity.Quotation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

@Repository
public interface QuotationRepository extends JpaRepository<Quotation, Long>, JpaSpecificationExecutor<Quotation> {
    List<Quotation> findByEnquiryId(Long enquiryId);
    List<Quotation> findByEnquiryIdAndDeletedAtIsNull(Long enquiryId);
    Page<Quotation> findByCustomerIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long customerId, Pageable pageable);
    java.util.Optional<Quotation> findByClientToken(String clientToken);
    long countByStatus(String status);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT q FROM Quotation q WHERE q.id = :baseId")
    java.util.Optional<Quotation> findBaseQuotationForUpdate(@org.springframework.data.repository.query.Param("baseId") Long baseId);

    @Query("SELECT MAX(q.version) FROM Quotation q WHERE q.baseQuotationId = :baseId")
    Integer findMaxVersionByBaseQuotationId(@org.springframework.data.repository.query.Param("baseId") Long baseId);

    List<Quotation> findByBaseQuotationIdOrderByVersionAsc(Long baseQuotationId);

    @Query("SELECT DISTINCT q FROM Quotation q LEFT JOIN FETCH q.enquiry LEFT JOIN FETCH q.items WHERE q.id = :id")
    java.util.Optional<Quotation> findWithDetailsById(@org.springframework.data.repository.query.Param("id") Long id);

    Page<Quotation> findByDeletedAtIsNull(Pageable pageable);
    Page<Quotation> findByDeletedAtIsNotNull(Pageable pageable);
    Page<Quotation> findByDeletedAtIsNotNullAndStatus(String status, Pageable pageable);
    long countByDeletedAtIsNull();
    long countByDeletedAtIsNotNull();
    long countByDeletedAtIsNotNullAndStatus(String status);

    /**
     * Returns active quotation status counts in a single DB round-trip.
     * Excludes soft-deleted quotations (deletedAt IS NOT NULL).
     * Each element is Object[]{statusString, count}.
     */
    @Query("SELECT q.status, COUNT(q) FROM Quotation q WHERE q.deletedAt IS NULL GROUP BY q.status")
    List<Object[]> countGroupByStatus();
}
