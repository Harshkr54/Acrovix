package com.acrovix.admin.repository;

import com.acrovix.admin.entity.AdminEnquiry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AdminEnquiryRepository extends JpaRepository<AdminEnquiry, Long>, JpaSpecificationExecutor<AdminEnquiry> {
    long countByStatus(String status);
    long countByCreatedAtAfter(LocalDateTime date);

    // For Dashboard
    List<AdminEnquiry> findTop5ByOrderByCreatedAtDesc();

    /**
     * Returns all enquiry status counts in a single DB round-trip.
     * Each element is Object[]{statusString, count}.
     * Replaces individual countByStatus() calls in DashboardController.
     */
    @Query("SELECT e.status, COUNT(e) FROM AdminEnquiry e GROUP BY e.status")
    List<Object[]> countGroupByStatus();
}
