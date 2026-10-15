package com.acrovix.admin.service;

import com.acrovix.admin.entity.*;
import com.acrovix.admin.entity.InvoiceReminderDelivery.DeliveryStatus;
import com.acrovix.admin.repository.CrmFollowUpRepository;
import com.acrovix.admin.repository.EmailLogRepository;
import com.acrovix.admin.repository.InvoiceReminderDeliveryRepository;
import com.acrovix.admin.repository.InvoiceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class InvoiceReminderDeliveryTest {

    @Mock
    private CrmFollowUpRepository followUpRepository;

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private EmailLogRepository emailLogRepository;

    @Mock
    private InvoiceReminderDeliveryRepository reminderDeliveryRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private AutomationService automationService;

    private EmailSchedulerService schedulerService;

    private Invoice testInvoice;

    @BeforeEach
    void setUp() {
        schedulerService = new EmailSchedulerService(
                followUpRepository,
                invoiceRepository,
                emailLogRepository,
                emailService,
                notificationService,
                automationService,
                reminderDeliveryRepository
        );

        testInvoice = new Invoice();
        testInvoice.setId(501L);
        testInvoice.setInvoiceNumber("INV-2026-0501");
        testInvoice.setStatus(InvoiceStatus.ISSUED);
        testInvoice.setGrandTotal(new BigDecimal("5000.00"));
        testInvoice.setBalanceDue(new BigDecimal("5000.00"));
        testInvoice.setClientEmail("client@example.com");
        testInvoice.setClientName("Acme Corp");
        testInvoice.setInvoiceDate(LocalDate.now().minusDays(10));
        testInvoice.setDueDate(LocalDate.now().minusDays(4)); // 4 days overdue -> expectedLevel = 1
        testInvoice.setReminderLevel(null);

        when(invoiceRepository.findOverdueInvoices(any(LocalDate.class))).thenReturn(List.of(testInvoice));
        when(reminderDeliveryRepository.saveAndFlush(any(InvoiceReminderDelivery.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(reminderDeliveryRepository.save(any(InvoiceReminderDelivery.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    @DisplayName("Req 1 & 3: Successful delivery creates SENT record, commits business level, and creates notification")
    void testSuccessfulDeliveryWorkflow() {
        when(reminderDeliveryRepository.findByInvoiceIdAndReminderLevel(501L, 1))
                .thenReturn(Optional.empty());
        when(emailService.sendInvoiceOverdue(testInvoice)).thenReturn(true);
        when(invoiceRepository.updateReminderLevelSafely(501L, 1)).thenReturn(1);

        int processed = schedulerService.processOverdueInvoicesInternal();

        assertEquals(1, processed);

        // Verify delivery record status transitioned to SENT
        ArgumentCaptor<InvoiceReminderDelivery> deliveryCaptor = ArgumentCaptor.forClass(InvoiceReminderDelivery.class);
        verify(reminderDeliveryRepository, atLeastOnce()).save(deliveryCaptor.capture());
        InvoiceReminderDelivery savedDelivery = deliveryCaptor.getValue();
        assertEquals(DeliveryStatus.SENT, savedDelivery.getStatus());
        assertEquals("client@example.com", savedDelivery.getRecipientEmail());
        assertEquals(1, savedDelivery.getReminderLevel());
        assertEquals(1, savedDelivery.getAttemptCount());
        assertNotNull(savedDelivery.getDeliveredAt());
        assertNull(savedDelivery.getLastError());

        // Verify business level committed ONLY after success
        verify(invoiceRepository, times(1)).updateReminderLevelSafely(501L, 1);
        verify(notificationService, times(1)).createInvoiceOverdueNotification(any(), eq("INV-2026-0501"), eq(501L));
    }

    @Test
    @DisplayName("Req 1 & 4: Temporary failure marks attempt FAILED with backoff and leaves business reminderLevel uncommitted")
    void testTemporaryFailureLeavesBusinessLevelUncommitted() {
        when(reminderDeliveryRepository.findByInvoiceIdAndReminderLevel(501L, 1))
                .thenReturn(Optional.empty());
        when(emailService.sendInvoiceOverdue(testInvoice))
                .thenThrow(new IllegalStateException("SMTP connection timeout"));

        int processed = schedulerService.processOverdueInvoicesInternal();

        assertEquals(0, processed, "Failed delivery should not count as successful processed escalation");

        // Verify delivery record status transitioned to FAILED with backoff
        ArgumentCaptor<InvoiceReminderDelivery> deliveryCaptor = ArgumentCaptor.forClass(InvoiceReminderDelivery.class);
        verify(reminderDeliveryRepository, atLeastOnce()).save(deliveryCaptor.capture());
        InvoiceReminderDelivery savedDelivery = deliveryCaptor.getValue();
        assertEquals(DeliveryStatus.FAILED, savedDelivery.getStatus());
        assertEquals(1, savedDelivery.getAttemptCount());
        assertTrue(savedDelivery.getLastError().contains("SMTP connection timeout"));
        assertNotNull(savedDelivery.getNextRetryAt());
        assertTrue(savedDelivery.getNextRetryAt().isAfter(LocalDateTime.now().minusSeconds(1)));

        // CRITICAL: Invoice business level MUST NOT be committed upon email failure!
        verify(invoiceRepository, never()).updateReminderLevelSafely(anyLong(), anyInt());
        verify(notificationService, never()).createInvoiceOverdueNotification(any(), any(), anyLong());
    }

    @Test
    @DisplayName("Req 4: Bounded retries: 3rd failure transitions attempt to PERMANENTLY_FAILED")
    void testBoundedRetriesExceedsLimit() {
        InvoiceReminderDelivery existingAttempt = InvoiceReminderDelivery.builder()
                .id(901L)
                .invoiceId(501L)
                .invoiceNumber("INV-2026-0501")
                .reminderLevel(1)
                .recipientEmail("client@example.com")
                .idempotencyKey("INV_501_LVL_1")
                .status(DeliveryStatus.FAILED)
                .attemptCount(2) // 2 prior attempts
                .maxAttempts(3)
                .nextRetryAt(LocalDateTime.now().minusMinutes(5)) // Backoff elapsed
                .build();

        when(reminderDeliveryRepository.findByInvoiceIdAndReminderLevel(501L, 1))
                .thenReturn(Optional.of(existingAttempt));
        when(emailService.sendInvoiceOverdue(testInvoice))
                .thenThrow(new IllegalStateException("Mailbox unavailable 550"));

        int processed = schedulerService.processOverdueInvoicesInternal();

        assertEquals(0, processed);

        // Verify status transitioned to PERMANENTLY_FAILED
        assertEquals(DeliveryStatus.PERMANENTLY_FAILED, existingAttempt.getStatus());
        assertEquals(3, existingAttempt.getAttemptCount());
        assertNull(existingAttempt.getNextRetryAt());
        verify(invoiceRepository, never()).updateReminderLevelSafely(anyLong(), anyInt());
    }

    @Test
    @DisplayName("Req 3: Duplicate protection: already SENT reminder is never dispatched again")
    void testDuplicateProtectionForAlreadySentReminder() {
        InvoiceReminderDelivery delivered = InvoiceReminderDelivery.builder()
                .id(801L)
                .invoiceId(501L)
                .invoiceNumber("INV-2026-0501")
                .reminderLevel(1)
                .recipientEmail("client@example.com")
                .idempotencyKey("INV_501_LVL_1")
                .status(DeliveryStatus.SENT)
                .deliveredAt(LocalDateTime.now().minusDays(1))
                .attemptCount(1)
                .build();

        when(reminderDeliveryRepository.findByInvoiceIdAndReminderLevel(501L, 1))
                .thenReturn(Optional.of(delivered));

        int processed = schedulerService.processOverdueInvoicesInternal();

        assertEquals(0, processed);
        // Verify emailService was never called
        verify(emailService, never()).sendInvoiceOverdue(any());
    }

    @Test
    @DisplayName("Req 5: Concurrency guard: in-flight SENDING attempt by another worker is skipped")
    void testConcurrentWorkerSkippingInFlightAttempt() {
        InvoiceReminderDelivery inFlight = InvoiceReminderDelivery.builder()
                .id(701L)
                .invoiceId(501L)
                .invoiceNumber("INV-2026-0501")
                .reminderLevel(1)
                .recipientEmail("client@example.com")
                .idempotencyKey("INV_501_LVL_1")
                .status(DeliveryStatus.SENDING)
                .lastAttemptAt(LocalDateTime.now().minusSeconds(30)) // Recent attempt by another thread
                .attemptCount(1)
                .build();

        when(reminderDeliveryRepository.findByInvoiceIdAndReminderLevel(501L, 1))
                .thenReturn(Optional.of(inFlight));

        int processed = schedulerService.processOverdueInvoicesInternal();

        assertEquals(0, processed);
        verify(emailService, never()).sendInvoiceOverdue(any());
    }

    @Test
    @DisplayName("Req 6: Escalation policy adheres to 3, 7, and 15 days overdue thresholds")
    void testEscalationPolicyThresholds() {
        // 1. 2 days overdue (< 3): expectedLevel = 0
        testInvoice.setDueDate(LocalDate.now().minusDays(2));
        schedulerService.processOverdueInvoicesInternal();
        verify(reminderDeliveryRepository, never()).findByInvoiceIdAndReminderLevel(501L, 1);

        // 2. 5 days overdue (>= 3, < 7): expectedLevel = 1
        testInvoice.setDueDate(LocalDate.now().minusDays(5));
        when(reminderDeliveryRepository.findByInvoiceIdAndReminderLevel(501L, 1)).thenReturn(Optional.empty());
        when(emailService.sendInvoiceOverdue(testInvoice)).thenReturn(true);
        schedulerService.processOverdueInvoicesInternal();
        verify(reminderDeliveryRepository, times(1)).findByInvoiceIdAndReminderLevel(501L, 1);

        // 3. 10 days overdue (>= 7, < 15): expectedLevel = 2
        testInvoice.setDueDate(LocalDate.now().minusDays(10));
        when(reminderDeliveryRepository.findByInvoiceIdAndReminderLevel(501L, 2)).thenReturn(Optional.empty());
        schedulerService.processOverdueInvoicesInternal();
        verify(reminderDeliveryRepository, times(1)).findByInvoiceIdAndReminderLevel(501L, 2);

        // 4. 20 days overdue (>= 15): expectedLevel = 3
        testInvoice.setDueDate(LocalDate.now().minusDays(20));
        when(reminderDeliveryRepository.findByInvoiceIdAndReminderLevel(501L, 3)).thenReturn(Optional.empty());
        schedulerService.processOverdueInvoicesInternal();
        verify(reminderDeliveryRepository, times(1)).findByInvoiceIdAndReminderLevel(501L, 3);
    }

    @Test
    @DisplayName("Req 9: Process restart reconciles stale SENDING deliveries to FAILED for retry")
    void testProcessRestartReconciliationOfSendingDeliveries() {
        InvoiceReminderDelivery interruptedDelivery = InvoiceReminderDelivery.builder()
                .id(601L)
                .invoiceId(501L)
                .invoiceNumber("INV-2026-0501")
                .reminderLevel(1)
                .recipientEmail("client@example.com")
                .status(DeliveryStatus.SENDING)
                .lastAttemptAt(LocalDateTime.now().minusHours(1))
                .build();

        when(reminderDeliveryRepository.findByStatus(DeliveryStatus.SENDING))
                .thenReturn(List.of(interruptedDelivery));

        com.acrovix.admin.repository.AutomationJobRunRepository jobRunRepository = 
                mock(com.acrovix.admin.repository.AutomationJobRunRepository.class);
        when(jobRunRepository.findByStatus(any())).thenReturn(List.of());

        AutomationService realAutomationService = new AutomationService(
                schedulerService, jobRunRepository, reminderDeliveryRepository
        );

        realAutomationService.reconcileStaleRunningJobs();

        assertEquals(DeliveryStatus.FAILED, interruptedDelivery.getStatus());
        assertNotNull(interruptedDelivery.getNextRetryAt());
        assertTrue(interruptedDelivery.getLastError().contains("application restart"));
        verify(reminderDeliveryRepository, times(1)).saveAll(any());
    }
}
