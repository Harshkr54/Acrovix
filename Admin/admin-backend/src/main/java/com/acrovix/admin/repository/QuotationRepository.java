package com.acrovix.admin.repository;

import com.acrovix.admin.entity.Quotation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuotationRepository extends JpaRepository<Quotation, Long> {
    List<Quotation> findByEnquiryId(Long enquiryId);
    long countByStatus(String status);

    /**
     * Returns all quotation status counts in a single DB round-trip.
     * Each element is Object[]{statusString, count}.
     * Replaces 5 separate countByStatus() calls in DashboardController.
     */
    @Query("SELECT q.status, COUNT(q) FROM Quotation q GROUP BY q.status")
    List<Object[]> countGroupByStatus();
}
