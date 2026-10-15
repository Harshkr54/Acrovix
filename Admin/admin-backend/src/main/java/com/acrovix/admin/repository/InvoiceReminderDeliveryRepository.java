package com.acrovix.admin.repository;

import com.acrovix.admin.entity.InvoiceReminderDelivery;
import com.acrovix.admin.entity.InvoiceReminderDelivery.DeliveryStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceReminderDeliveryRepository extends JpaRepository<InvoiceReminderDelivery, Long> {

    Optional<InvoiceReminderDelivery> findByIdempotencyKey(String idempotencyKey);

    Optional<InvoiceReminderDelivery> findByInvoiceIdAndReminderLevel(Long invoiceId, Integer reminderLevel);

    boolean existsByInvoiceIdAndReminderLevelAndStatus(Long invoiceId, Integer reminderLevel, DeliveryStatus status);

    List<InvoiceReminderDelivery> findByStatusAndNextRetryAtBefore(DeliveryStatus status, LocalDateTime before);

    List<InvoiceReminderDelivery> findByStatus(DeliveryStatus status);
}
