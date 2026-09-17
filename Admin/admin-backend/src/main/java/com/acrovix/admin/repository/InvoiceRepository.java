package com.acrovix.admin.repository;

import com.acrovix.admin.entity.Invoice;
import com.acrovix.admin.entity.InvoiceType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    Page<Invoice> findByInvoiceType(InvoiceType type, Pageable pageable);

    @Query("SELECT i FROM Invoice i WHERE " +
           "(:type IS NULL OR i.invoiceType = :type) AND " +
           "(:status IS NULL OR i.status = :status) AND " +
           "(:search IS NULL OR " +
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

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Invoice i WHERE i.id = :id")
    java.util.Optional<Invoice> findByIdForUpdate(@Param("id") Long id);
}
