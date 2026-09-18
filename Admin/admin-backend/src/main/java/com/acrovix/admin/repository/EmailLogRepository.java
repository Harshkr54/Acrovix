package com.acrovix.admin.repository;

import com.acrovix.admin.entity.EmailLog;
import com.acrovix.admin.entity.EmailType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface EmailLogRepository extends JpaRepository<EmailLog, Long> {
    List<EmailLog> findByRecipient(String recipient);
    List<EmailLog> findByEmailType(EmailType emailType);
    
    @Query("SELECT e FROM EmailLog e WHERE e.recipient = :recipient OR " +
           "(e.relatedEntityType = 'CUSTOMER' AND e.relatedEntityId = :customerId) OR " +
           "(e.relatedEntityType = 'CRM_LEAD' AND e.relatedEntityId IN :leadIds) OR " +
           "(e.relatedEntityType = 'QUOTATION' AND e.relatedEntityId IN :quoteIds) OR " +
           "(e.relatedEntityType = 'INVOICE' AND e.relatedEntityId IN :invoiceIds) OR " +
           "(e.relatedEntityType = 'PAYMENT' AND e.relatedEntityId IN :paymentIds) " +
           "ORDER BY e.sentAt DESC")
    Page<EmailLog> findCustomerEmails(
        @Param("recipient") String recipient,
        @Param("customerId") Long customerId,
        @Param("leadIds") List<Long> leadIds,
        @Param("quoteIds") List<Long> quoteIds,
        @Param("invoiceIds") List<Long> invoiceIds,
        @Param("paymentIds") List<Long> paymentIds,
        Pageable pageable
    );
}
