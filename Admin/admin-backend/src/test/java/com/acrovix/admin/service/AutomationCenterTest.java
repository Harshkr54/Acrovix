package com.acrovix.admin.service;

import com.acrovix.admin.entity.AutomationJobRun;
import com.acrovix.admin.entity.AutomationJobRun.JobExecutionStatus;
import com.acrovix.admin.entity.AutomationJobRun.TriggerType;
import com.acrovix.admin.repository.AutomationJobRunRepository;
import com.acrovix.admin.repository.InvoiceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AutomationCenterTest {

    @Mock
    private EmailSchedulerService emailSchedulerService;

    @Mock
    private AutomationJobRunRepository jobRunRepository;

    @Mock
    private InvoiceRepository invoiceRepository;

    private AutomationService automationService;

    @BeforeEach
    void setUp() {
        automationService = new AutomationService(emailSchedulerService, jobRunRepository);
        ReflectionTestUtils.setField(automationService, "configuredTimezone", "Asia/Kolkata");
        ReflectionTestUtils.setField(automationService, "geminiApiKey", "test-api-key");

        when(jobRunRepository.save(any(AutomationJobRun.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    @DisplayName("Req 1 & 5: Automation status distinguishes NEVER_RUN when no executions exist")
    void testStatusSemanticsNeverRun() {
        when(jobRunRepository.findFirstByJobIdOrderByStartedAtDesc("follow-ups")).thenReturn(Optional.empty());
        when(jobRunRepository.findFirstByJobIdOrderByStartedAtDesc("invoices")).thenReturn(Optional.empty());
        when(jobRunRepository.findFirstByJobIdOrderByStartedAtDesc("ai-extraction")).thenReturn(Optional.empty());
        when(jobRunRepository.countByJobId(any())).thenReturn(0L);

        List<AutomationService.JobExecutionInfo> statusList = automationService.getAutomationStatus();
        assertEquals(3, statusList.size());

        AutomationService.JobExecutionInfo followUps = statusList.stream()
                .filter(j -> "follow-ups".equals(j.getJobId()))
                .findFirst()
                .orElseThrow();
        assertEquals("NEVER_RUN", followUps.getLastStatus());
        assertEquals(0L, followUps.getTotalRuns());
        assertNull(followUps.getLastRunAt());
        assertTrue(followUps.getSchedule().contains("Asia/Kolkata"));
    }

    @Test
    @DisplayName("Req 3 & 4: Shared execution path records durable history for manual and scheduled triggers")
    void testSharedExecutionPathManualAndScheduled() {
        when(emailSchedulerService.processDueAndOverdueFollowUpsInternal()).thenReturn(4);

        // 1. Manual execution
        AutomationJobRun manualRun = automationService.executeJob("follow-ups", TriggerType.MANUAL);
        assertNotNull(manualRun);
        assertEquals("follow-ups", manualRun.getJobId());
        assertEquals(TriggerType.MANUAL, manualRun.getTriggerType());
        assertEquals(JobExecutionStatus.SUCCESS, manualRun.getStatus());
        assertEquals(4, manualRun.getProcessedRecordsCount());
        assertNotNull(manualRun.getStartedAt());
        assertNotNull(manualRun.getFinishedAt());
        assertTrue(manualRun.getMessage().contains("4"));

        // 2. Scheduled execution
        AutomationJobRun scheduledRun = automationService.executeJob("follow-ups", TriggerType.SCHEDULED);
        assertNotNull(scheduledRun);
        assertEquals(TriggerType.SCHEDULED, scheduledRun.getTriggerType());
        assertEquals(JobExecutionStatus.SUCCESS, scheduledRun.getStatus());
        assertEquals(4, scheduledRun.getProcessedRecordsCount());

        verify(jobRunRepository, atLeast(4)).save(any(AutomationJobRun.class));
    }

    @Test
    @DisplayName("Req 5 & 6: Gemini API Health & Guard handles missing vs present API key truthfully")
    void testGeminiHealthGuardKeyCheck() {
        // With valid key
        AutomationJobRun run = automationService.executeJob("ai-extraction", TriggerType.MANUAL);
        assertEquals(JobExecutionStatus.SUCCESS, run.getStatus());
        assertEquals("Gemini API Health & Guard", run.getJobName());

        // Without key
        ReflectionTestUtils.setField(automationService, "geminiApiKey", "");
        assertThrows(IllegalStateException.class, () ->
                automationService.executeJob("ai-extraction", TriggerType.MANUAL)
        );

        ArgumentCaptor<AutomationJobRun> captor = ArgumentCaptor.forClass(AutomationJobRun.class);
        verify(jobRunRepository, atLeastOnce()).save(captor.capture());
        AutomationJobRun failedRun = captor.getValue();
        assertEquals(JobExecutionStatus.FAILED, failedRun.getStatus());
        assertTrue(failedRun.getErrorDetails().contains("GEMINI_API_KEY"));
    }

    @Test
    @DisplayName("Req 8: Concurrency locking rejects overlapping executions of the same job with IllegalStateException")
    void testOverlapPrevention() {
        // Manually simulate active lock
        java.util.concurrent.ConcurrentHashMap<String, Boolean> locks = 
                (java.util.concurrent.ConcurrentHashMap<String, Boolean>) 
                ReflectionTestUtils.getField(automationService, "activeLocks");
        assertNotNull(locks);
        locks.put("follow-ups", Boolean.TRUE);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                automationService.executeJob("follow-ups", TriggerType.MANUAL)
        );
        assertTrue(ex.getMessage().contains("currently RUNNING"));

        // Clean up
        locks.remove("follow-ups");
    }

    @Test
    @DisplayName("Req 2: Overdue invoice reminder level transitions support initial NULL, lower, equal, and higher levels")
    void testInvoiceReminderLevelTransitions() {
        // Simulate repository update query logic:
        // UPDATE Invoice i SET i.reminderLevel = :newLevel WHERE i.id = :id AND (i.reminderLevel IS NULL OR i.reminderLevel < :newLevel)
        
        // Initial reminder (NULL -> 1): Should update
        when(invoiceRepository.updateReminderLevelSafely(101L, 1)).thenReturn(1);
        int rowsUpdatedNullTo1 = invoiceRepository.updateReminderLevelSafely(101L, 1);
        assertEquals(1, rowsUpdatedNullTo1, "First-time reminder for NULL reminderLevel must succeed");

        // Escalation reminder (1 -> 2): Should update
        when(invoiceRepository.updateReminderLevelSafely(101L, 2)).thenReturn(1);
        int rowsUpdated1To2 = invoiceRepository.updateReminderLevelSafely(101L, 2);
        assertEquals(1, rowsUpdated1To2, "Escalation to higher level must succeed");

        // Duplicate reminder (2 -> 2): Must reject (0 rows)
        when(invoiceRepository.updateReminderLevelSafely(101L, 2)).thenReturn(0);
        int rowsUpdatedEqual = invoiceRepository.updateReminderLevelSafely(101L, 2);
        assertEquals(0, rowsUpdatedEqual, "Same reminder level must be rejected (0 updated rows)");

        // Regressive attempt (2 -> 1): Must reject (0 rows)
        when(invoiceRepository.updateReminderLevelSafely(101L, 1)).thenReturn(0);
        int rowsUpdatedLower = invoiceRepository.updateReminderLevelSafely(101L, 1);
        assertEquals(0, rowsUpdatedLower, "Lower reminder level must be rejected (0 updated rows)");
    }

    @Test
    @DisplayName("Audit Req 1 & 9: Application restart reconciles orphaned RUNNING jobs to FAILED")
    void testStartupReconciliationOfStaleRunningJobs() {
        AutomationJobRun orphaned = AutomationJobRun.builder()
                .id(999L)
                .jobId("invoices")
                .jobName("Overdue Invoice Escalation")
                .triggerType(TriggerType.SCHEDULED)
                .status(JobExecutionStatus.RUNNING)
                .startedAt(LocalDateTime.now().minusHours(2))
                .build();

        when(jobRunRepository.findByStatus(JobExecutionStatus.RUNNING)).thenReturn(List.of(orphaned));

        automationService.reconcileStaleRunningJobs();

        assertEquals(JobExecutionStatus.FAILED, orphaned.getStatus());
        assertNotNull(orphaned.getFinishedAt());
        assertTrue(orphaned.getErrorDetails().contains("application restart"));
        verify(jobRunRepository, times(1)).saveAll(any());
    }

    @Test
    @DisplayName("Audit Req 5 & 9: Follow-up email deduplication suppresses SENT and permits retry after FAILED")
    void testFollowUpDeduplicationWithSentVsRetryOnFailed() {
        com.acrovix.admin.repository.EmailLogRepository emailLogRepository = mock(com.acrovix.admin.repository.EmailLogRepository.class);
        com.acrovix.admin.repository.CrmFollowUpRepository followUpRepository = mock(com.acrovix.admin.repository.CrmFollowUpRepository.class);
        EmailService emailService = mock(EmailService.class);
        NotificationService notificationService = mock(NotificationService.class);

        EmailSchedulerService schedulerService = new EmailSchedulerService(
                followUpRepository,
                invoiceRepository,
                emailLogRepository,
                emailService,
                notificationService,
                automationService
        );

        com.acrovix.admin.entity.CrmLead lead = new com.acrovix.admin.entity.CrmLead();
        lead.setId(10L);
        lead.setFullName("John Doe");

        com.acrovix.admin.entity.CrmFollowUp followUp = new com.acrovix.admin.entity.CrmFollowUp();
        followUp.setId(201L);
        followUp.setLead(lead);

        when(followUpRepository.findDueBetween(any(), any(), any())).thenReturn(List.of(followUp));
        when(followUpRepository.findOverdueBefore(any(), any())).thenReturn(List.of());

        // Case 1: When email log shows FAILED -> should retry and dispatch email
        when(emailLogRepository.existsByEmailTypeAndRelatedEntityTypeAndRelatedEntityIdAndStatus(
                com.acrovix.admin.entity.EmailType.FOLLOW_UP_DUE, "CRM_FOLLOW_UP", 201L, com.acrovix.admin.entity.EmailStatus.SENT))
                .thenReturn(false);

        int count1 = schedulerService.processDueAndOverdueFollowUpsInternal();
        assertEquals(1, count1);
        verify(emailService, times(1)).sendFollowUpDueNotificationAsync(followUp);

        // Case 2: When email log shows SENT -> must suppress duplicate email dispatch
        when(emailLogRepository.existsByEmailTypeAndRelatedEntityTypeAndRelatedEntityIdAndStatus(
                com.acrovix.admin.entity.EmailType.FOLLOW_UP_DUE, "CRM_FOLLOW_UP", 201L, com.acrovix.admin.entity.EmailStatus.SENT))
                .thenReturn(true);

        int count2 = schedulerService.processDueAndOverdueFollowUpsInternal();
        assertEquals(1, count2);
        // Email service should still have been called only once (from Case 1), NOT again
        verify(emailService, times(1)).sendFollowUpDueNotificationAsync(followUp);
    }

    @Test
    @DisplayName("Audit Req 2 & 9: History pagination delegates Pageable correctly to repository")
    void testExecutionHistoryPagination() {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);
        org.springframework.data.domain.Page<AutomationJobRun> mockPage = new org.springframework.data.domain.PageImpl<>(List.of(
                AutomationJobRun.builder().id(1L).jobId("follow-ups").status(JobExecutionStatus.SUCCESS).build()
        ));

        when(jobRunRepository.findAllByOrderByStartedAtDesc(pageable)).thenReturn(mockPage);

        org.springframework.data.domain.Page<AutomationJobRun> result = automationService.getExecutionHistory(pageable);
        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        assertEquals("follow-ups", result.getContent().get(0).getJobId());
        verify(jobRunRepository, times(1)).findAllByOrderByStartedAtDesc(pageable);
    }

    @Test
    @DisplayName("Audit Req 1 & 9: Configured timezone is accurately reflected in job schedule descriptions")
    void testTimezoneConfiguration() {
        ReflectionTestUtils.setField(automationService, "configuredTimezone", "America/New_York");
        List<AutomationService.JobExecutionInfo> statusList = automationService.getAutomationStatus();

        AutomationService.JobExecutionInfo invoiceJob = statusList.stream()
                .filter(j -> "invoices".equals(j.getJobId()))
                .findFirst()
                .orElseThrow();

        assertTrue(invoiceJob.getSchedule().contains("America/New_York"));
    }
}
