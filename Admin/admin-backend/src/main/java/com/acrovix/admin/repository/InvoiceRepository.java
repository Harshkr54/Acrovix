package com.acrovix.admin.repository;

import com.acrovix.admin.entity.Invoice;
import com.acrovix.admin.entity.InvoiceType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface InvoiceRepository extends JpaRepository<Invoice, Long>, JpaSpecificationExecutor<Invoice> {
    Page<Invoice> findByInvoiceType(InvoiceType type, Pageable pageable);

    Page<Invoice> findByCustomerIdOrderByCreatedAtDesc(Long customerId, Pageable pageable);
    java.util.List<Invoice> findByCustomerId(Long customerId);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {
        "customer",
        "quotation",
        "purchaseOrder",
        "createdBy",
        "items",
        "items.productService"
    })
    @Query("SELECT i FROM Invoice i WHERE i.id = :id")
    java.util.Optional<Invoice> findByIdWithDetails(@Param("id") Long id);

    @Query("SELECT i.id FROM Invoice i WHERE i.quotation.id = :quotationId AND i.invoiceType = :type AND i.status != 'CANCELLED' ORDER BY i.createdAt DESC")
    java.util.List<Long> findActiveInvoiceIdsByQuotationIdAndType(@Param("quotationId") Long quotationId, @Param("type") InvoiceType type);

    @Query("SELECT i.id FROM Invoice i WHERE i.purchaseOrder.id = :poId AND i.invoiceType = :type AND i.status != 'CANCELLED' ORDER BY i.createdAt DESC")
    java.util.List<Long> findActiveInvoiceIdsByPurchaseOrderIdAndType(@Param("poId") Long poId, @Param("type") InvoiceType type);

    boolean existsByQuotationIdAndStatusNot(Long quotationId, com.acrovix.admin.entity.InvoiceStatus status);


    @Query("SELECT i FROM Invoice i WHERE " +
           "(:type IS NULL OR i.invoiceType = :type) AND " +
           "(:status IS NULL OR i.status = :status) AND " +
           "(:search IS NULL OR :search = '' OR " +
           "LOWER(i.invoiceNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(i.clientName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(i.clientCompany) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Invoice> searchInvoices(@Param("type") InvoiceType type,
                                 @Param("status") com.acrovix.admin.entity.InvoiceStatus status,
                                 @Param("search") String search,
                                 Pageable pageable);

    @Query("SELECT COALESCE(SUM(i.grandTotal), 0) FROM Invoice i WHERE i.purchaseOrder.id = :poId AND i.status != 'CANCELLED' AND i.id != :excludeInvoiceId")
    java.math.BigDecimal sumInvoicedAmountForPoExcluding(@Param("poId") Long poId, @Param("excludeInvoiceId") Long excludeInvoiceId);

    @Query("SELECT COALESCE(SUM(i.grandTotal), 0) FROM Invoice i WHERE i.purchaseOrder.id = :poId AND i.status != 'CANCELLED'")
    java.math.BigDecimal sumInvoicedAmountForPo(@Param("poId") Long poId);

    @Query("SELECT COALESCE(SUM(i.grandTotal), 0) FROM Invoice i WHERE i.invoiceType = 'TAX_INVOICE' AND i.status != 'CANCELLED' AND (:salesUserId IS NULL OR i.createdBy.id = :salesUserId)")
    java.math.BigDecimal sumActiveInvoicedAmountWithFilter(@Param("salesUserId") Long salesUserId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Invoice i WHERE i.id = :id")
    java.util.Optional<Invoice> findByIdForUpdate(@Param("id") Long id);

    @Query("SELECT i FROM Invoice i WHERE i.invoiceType = 'TAX_INVOICE' AND (i.status = 'ISSUED' OR i.status = 'PARTIALLY_PAID') AND i.dueDate < :now")
    java.util.List<Invoice> findOverdueInvoices(@Param("now") java.time.LocalDate now);

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE Invoice i SET i.reminderLevel = :newLevel, i.lastReminderSentAt = CURRENT_TIMESTAMP WHERE i.id = :id AND (i.reminderLevel IS NULL OR i.reminderLevel < :newLevel)")
    int updateReminderLevelSafely(@Param("id") Long id, @Param("newLevel") int newLevel);

    boolean existsByPaymentLinkId(String paymentLinkId);
    java.util.Optional<Invoice> findByPaymentLinkId(String paymentLinkId);

    // D-2: Targeted invoice lookup by invoice number for webhook resolution.
    // Replaces the O(N) findAll() + stream filter in PaymentWebhookController.
    java.util.Optional<Invoice> findByInvoiceNumber(String invoiceNumber);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Invoice i WHERE i.invoiceNumber = :invoiceNumber")
    java.util.Optional<Invoice> findByInvoiceNumberForUpdate(@Param("invoiceNumber") String invoiceNumber);

    java.util.Optional<Invoice> findByTenantIdAndId(Long tenantId, Long id);
    
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Invoice i WHERE i.tenantId = :tenantId AND i.id = :id")
    java.util.Optional<Invoice> findByTenantIdAndIdForUpdate(@Param("tenantId") Long tenantId, @Param("id") Long id);
    java.util.List<Invoice> findAllByTenantId(Long tenantId);
    Page<Invoice> findAllByTenantId(Long tenantId, Pageable pageable);
    void deleteByTenantIdAndId(Long tenantId, Long id);
    java.util.Optional<Invoice> findByTenantIdAndInvoiceNumber(Long tenantId, String invoiceNumber);
    java.util.Optional<Invoice> findByPublicToken(String publicToken);
    java.util.Optional<Invoice> findByTenantIdAndPublicToken(Long tenantId, String publicToken);
}


