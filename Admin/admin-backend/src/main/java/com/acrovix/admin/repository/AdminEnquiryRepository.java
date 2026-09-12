package com.acrovix.admin.repository;

import com.acrovix.admin.entity.AdminEnquiry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AdminEnquiryRepository extends JpaRepository<AdminEnquiry, Long>, JpaSpecificationExecutor<AdminEnquiry> {
    long countByStatus(String status);
    long countByCreatedAtAfter(LocalDateTime date);

    // For Dashboard
    List<AdminEnquiry> findTop5ByOrderByCreatedAtDesc();
}
