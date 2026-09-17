package com.acrovix.admin.repository;

import com.acrovix.admin.entity.Payment;
import com.acrovix.admin.entity.PaymentMethod;
import com.acrovix.admin.entity.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long>, JpaSpecificationExecutor<Payment> {

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.invoice.id = :invoiceId AND p.status = 'RECORDED'")
    BigDecimal sumActivePaymentsForInvoice(@Param("invoiceId") Long invoiceId);

    List<Payment> findByInvoiceIdOrderByCreatedAtDesc(Long invoiceId);

    @Query("SELECT p FROM Payment p WHERE " +
           "(:status IS NULL OR p.status = :status) AND " +
           "(:method IS NULL OR p.paymentMethod = :method) AND " +
           "(:customerId IS NULL OR p.customer.id = :customerId) AND " +
           "(:invoiceId IS NULL OR p.invoice.id = :invoiceId) AND " +
           "(:search IS NULL OR " +
           "LOWER(p.paymentNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(p.invoice.invoiceNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(p.transactionReference) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(p.customer.name) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Payment> searchPayments(
            @Param("status") PaymentStatus status,
            @Param("method") PaymentMethod method,
            @Param("customerId") Long customerId,
            @Param("invoiceId") Long invoiceId,
            @Param("search") String search,
            Pageable pageable
    );
}
