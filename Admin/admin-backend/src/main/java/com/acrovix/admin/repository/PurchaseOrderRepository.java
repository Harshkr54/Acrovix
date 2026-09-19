package com.acrovix.admin.repository;

import com.acrovix.admin.entity.PurchaseOrder;
import com.acrovix.admin.entity.PurchaseOrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long>, JpaSpecificationExecutor<PurchaseOrder> {

    Optional<PurchaseOrder> findByIdAndDeletedAtIsNull(Long id);

    boolean existsByQuotationIdAndDeletedAtIsNull(Long quotationId);

    @Query("SELECT p FROM PurchaseOrder p WHERE p.deletedAt IS NULL AND (" +
           "LOWER(p.poNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(p.clientPoNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(p.quotation.quotationNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(p.quotation.clientName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(p.quotation.clientCompany) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<PurchaseOrder> search(@Param("search") String search, Pageable pageable);

    @Query("SELECT p FROM PurchaseOrder p WHERE p.deletedAt IS NULL AND p.status = :status AND (" +
           "LOWER(p.poNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(p.clientPoNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(p.quotation.quotationNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(p.quotation.clientName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(p.quotation.clientCompany) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<PurchaseOrder> searchByStatus(@Param("search") String search, @Param("status") PurchaseOrderStatus status, Pageable pageable);

    @Query("SELECT COUNT(p) FROM PurchaseOrder p WHERE p.deletedAt IS NULL AND p.status NOT IN ('CANCELLED', 'FULFILLED')")
    long countOpenPurchaseOrders();
}
