package com.acrovix.admin.repository;

import com.acrovix.admin.entity.AdminActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface AdminActivityRepository extends JpaRepository<AdminActivity, Long> {
    List<AdminActivity> findTop50ByOrderByCreatedAtDesc();
    List<AdminActivity> findTop50ByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(LocalDateTime start, LocalDateTime end);
    void deleteByEntityTypeAndEntityIdIn(String entityType, List<Long> entityIds);

    @Query("SELECT a FROM AdminActivity a WHERE " +
           "(a.entityType = 'CUSTOMER' AND a.entityId = :customerId) OR " +
           "(a.entityType = 'CRM_LEAD' AND a.entityId IN :leadIds) OR " +
           "(a.entityType = 'QUOTATION' AND a.entityId IN :quoteIds) OR " +
           "(a.entityType = 'INVOICE' AND a.entityId IN :invoiceIds) OR " +
           "(a.entityType = 'PAYMENT' AND a.entityId IN :paymentIds) " +
           "ORDER BY a.createdAt DESC")
    Page<AdminActivity> findCustomerActivities(
        @Param("customerId") Long customerId,
        @Param("leadIds") List<Long> leadIds,
        @Param("quoteIds") List<Long> quoteIds,
        @Param("invoiceIds") List<Long> invoiceIds,
        @Param("paymentIds") List<Long> paymentIds,
        Pageable pageable
    );
}
