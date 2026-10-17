package com.acrovix.admin.repository;

import com.acrovix.admin.entity.Currency;
import com.acrovix.admin.entity.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
    Optional<Customer> findByCustomerCode(String customerCode);
    Optional<Customer> findByGstin(String gstin);
    Optional<Customer> findByEmail(String email);

    @Query("SELECT c FROM Customer c WHERE " +
           "(LOWER(c.name) LIKE LOWER(CONCAT('%', coalesce(:search, ''), '%')) OR " +
           " LOWER(c.customerCode) LIKE LOWER(CONCAT('%', coalesce(:search, ''), '%')) OR " +
           " LOWER(c.companyName) LIKE LOWER(CONCAT('%', coalesce(:search, ''), '%')) OR " +
           " LOWER(coalesce(c.gstin, '')) LIKE LOWER(CONCAT('%', coalesce(:search, ''), '%')) OR " +
           " LOWER(coalesce(c.email, '')) LIKE LOWER(CONCAT('%', coalesce(:search, ''), '%')) OR " +
           " LOWER(coalesce(c.phone, '')) LIKE LOWER(CONCAT('%', coalesce(:search, ''), '%'))) " +
           "AND (:active IS NULL OR c.active = :active) " +
           "AND (:currency IS NULL OR c.currency = :currency) " +
           "AND (cast(:fromDate as timestamp) IS NULL OR c.createdAt >= :fromDate) " +
           "AND (cast(:toDate as timestamp) IS NULL OR c.createdAt <= :toDate)")
    Page<Customer> searchCustomers(
            @Param("search") String search,
            @Param("active") Boolean active,
            @Param("currency") Currency currency,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate,
            Pageable pageable);

    default Page<Customer> searchCustomers(String search, Boolean active, Pageable pageable) {
        return searchCustomers(search, active, null, null, null, pageable);
    }

    @Query("SELECT c FROM Customer c WHERE " +
           "(LOWER(c.name) LIKE LOWER(CONCAT('%', coalesce(:search, ''), '%')) OR " +
           " LOWER(c.customerCode) LIKE LOWER(CONCAT('%', coalesce(:search, ''), '%')) OR " +
           " LOWER(c.companyName) LIKE LOWER(CONCAT('%', coalesce(:search, ''), '%')) OR " +
           " LOWER(coalesce(c.gstin, '')) LIKE LOWER(CONCAT('%', coalesce(:search, ''), '%')) OR " +
           " LOWER(coalesce(c.email, '')) LIKE LOWER(CONCAT('%', coalesce(:search, ''), '%')) OR " +
           " LOWER(coalesce(c.phone, '')) LIKE LOWER(CONCAT('%', coalesce(:search, ''), '%'))) " +
           "AND (:active IS NULL OR c.active = :active) " +
           "AND (:currency IS NULL OR c.currency = :currency) " +
           "AND (cast(:fromDate as timestamp) IS NULL OR c.createdAt >= :fromDate) " +
           "AND (cast(:toDate as timestamp) IS NULL OR c.createdAt <= :toDate) " +
           "AND (:salesUserId IS NULL OR EXISTS (SELECT 1 FROM CrmLead l WHERE l.customer = c AND l.assignedTo.id = :salesUserId) " +
           "    OR EXISTS (SELECT 1 FROM Quotation q WHERE q.customer = c AND q.createdBy.id = :salesUserId))")
    Page<Customer> searchCustomersWithSalesFilter(
            @Param("search") String search,
            @Param("active") Boolean active,
            @Param("currency") Currency currency,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate,
            @Param("salesUserId") Long salesUserId,
            Pageable pageable);

    default Page<Customer> searchCustomersWithSalesFilter(String search, Boolean active, Long salesUserId, Pageable pageable) {
        return searchCustomersWithSalesFilter(search, active, null, null, null, salesUserId, pageable);
    }

    java.util.Optional<Customer> findByTenantIdAndId(Long tenantId, Long id);
    java.util.List<Customer> findAllByTenantId(Long tenantId);
    Page<Customer> findAllByTenantId(Long tenantId, Pageable pageable);
    void deleteByTenantIdAndId(Long tenantId, Long id);
    java.util.Optional<Customer> findByTenantIdAndCustomerCode(Long tenantId, String customerCode);
    java.util.Optional<Customer> findByTenantIdAndGstin(Long tenantId, String gstin);
    java.util.Optional<Customer> findByTenantIdAndEmail(Long tenantId, String email);

    @Query("SELECT c.customerCode FROM Customer c WHERE (c.tenantId = :tenantId OR :tenantId IS NULL) AND c.customerCode LIKE 'CUST-%'")
    java.util.List<String> findCustomerCodesLikePrefix(@Param("tenantId") Long tenantId);
}
