package com.acrovix.admin.service;

import com.acrovix.admin.entity.AutomationJobRun;
import com.acrovix.admin.entity.AutomationJobRun.JobExecutionStatus;
import com.acrovix.admin.entity.AutomationJobRun.TriggerType;
import com.acrovix.admin.repository.AutomationJobRunRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AutomationService {

    private static final Logger logger = LoggerFactory.getLogger(AutomationService.class);

    private final EmailSchedulerService emailSchedulerService;
    private final AutomationJobRunRepository jobRunRepository;
    private final com.acrovix.admin.repository.InvoiceReminderDeliveryRepository reminderDeliveryRepository;

    @Value("${gemini.api-key:}")
    private String geminiApiKey;

    @Value("${acrovix.scheduling.timezone:Asia/Kolkata}")
    private String configuredTimezone;

    // Concurrent lock guard to prevent overlapping runs of the same job
    private final ConcurrentHashMap<String, Boolean> activeLocks = new ConcurrentHashMap<>();

    public AutomationService(EmailSchedulerService emailSchedulerService, AutomationJobRunRepository jobRunRepository) {
        this(emailSchedulerService, jobRunRepository, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public AutomationService(
            EmailSchedulerService emailSchedulerService, 
            AutomationJobRunRepository jobRunRepository,
            @org.springframework.beans.factory.annotation.Autowired(required = false) com.acrovix.admin.repository.InvoiceReminderDeliveryRepository reminderDeliveryRepository
    ) {
        this.emailSchedulerService = emailSchedulerService;
        this.jobRunRepository = jobRunRepository;
        this.reminderDeliveryRepository = reminderDeliveryRepository;
    }

    public static class JobExecutionInfo {
        private final String jobId;
        private final String name;
        private final String schedule;
        private final String description;
        private final boolean enabled;
        private LocalDateTime lastRunAt;
        private String lastStatus; // "ENABLED", "RUNNING", "SUCCESS", "FAILED", "NEVER_RUN"
        private String lastMessage;
        private Integer lastProcessedCount;
        private long totalRuns = 0;

        public JobExecutionInfo(String jobId, String name, String schedule, String description, boolean enabled) {
            this.jobId = jobId;
            this.name = name;
            this.schedule = schedule;
            this.description = description;
            this.enabled = enabled;
            this.lastStatus = "NEVER_RUN";
            this.lastMessage = "Job scheduled; no executions recorded yet.";
        }

        public String getJobId() { return jobId; }
        public String getName() { return name; }
        public String getSchedule() { return schedule; }
        public String getDescription() { return description; }
        public boolean isEnabled() { return enabled; }
        public LocalDateTime getLastRunAt() { return lastRunAt; }
        public String getLastStatus() { return lastStatus; }
        public String getLastMessage() { return lastMessage; }
        public Integer getLastProcessedCount() { return lastProcessedCount; }
        public long getTotalRuns() { return totalRuns; }

        public void setLastRunAt(LocalDateTime lastRunAt) { this.lastRunAt = lastRunAt; }
        public void setLastStatus(String lastStatus) { this.lastStatus = lastStatus; }
        public void setLastMessage(String lastMessage) { this.lastMessage = lastMessage; }
        public void setLastProcessedCount(Integer lastProcessedCount) { this.lastProcessedCount = lastProcessedCount; }
        public void setTotalRuns(long totalRuns) { this.totalRuns = totalRuns; }
    }

    private String resolveJobName(String jobId) {
        switch (jobId) {
            case "follow-ups":
                return "CRM Follow-up Alerts & Reminders";
            case "invoices":
                return "Overdue Invoice Escalation";
            case "ai-extraction":
                return "Gemini API Health & Guard";
            default:
                return jobId;
        }
    }

    public List<JobExecutionInfo> getAutomationStatus() {
        List<JobExecutionInfo> list = new ArrayList<>();

        // 1. Follow-ups job
        JobExecutionInfo followUps = new JobExecutionInfo(
                "follow-ups",
                "CRM Follow-up Alerts & Reminders",
                "Hourly (0 0 * * * *) [" + configuredTimezone + "]",
                "Scans for follow-ups due today and overdue. Creates in-app notifications and dispatches internal alert emails.",
                true
        );
        populateDurableState(followUps);
        list.add(followUps);

        // 2. Invoices job
        JobExecutionInfo invoices = new JobExecutionInfo(
                "invoices",
                "Overdue Invoice Escalation",
                "Daily at 09:00 AM (0 0 9 * * *) [" + configuredTimezone + "]",
                "Scans unpaid and partially-paid past-due invoices, executes multi-tier customer reminder notices.",
                true
        );
        populateDurableState(invoices);
        list.add(invoices);

        // 3. Gemini Health check
        boolean hasKey = geminiApiKey != null && !geminiApiKey.trim().isEmpty();
        JobExecutionInfo aiJob = new JobExecutionInfo(
                "ai-extraction",
                "Gemini API Health & Guard",
                "On-demand Health Check",
                "Verifies Gemini API credentials and rate-limiting readiness. Actual extractions execute on-demand within Quotation Builder.",
                hasKey
        );
        populateDurableState(aiJob);
        if (!hasKey && "NEVER_RUN".equals(aiJob.getLastStatus())) {
            aiJob.setLastStatus("FAILED");
            aiJob.setLastMessage("GEMINI_API_KEY environment variable is not configured.");
        }
        list.add(aiJob);

        return list;
    }

    private void populateDurableState(JobExecutionInfo info) {
        String jobId = info.getJobId();
        
        // Check if currently running
        if (Boolean.TRUE.equals(activeLocks.get(jobId))) {
            info.setLastStatus(JobExecutionStatus.RUNNING.name());
            info.setLastMessage("Job is currently executing...");
            return;
        }

        // Query durable database history
        Optional<AutomationJobRun> latestRun = jobRunRepository.findFirstByJobIdOrderByStartedAtDesc(jobId);
        long total = jobRunRepository.countByJobId(jobId);
        info.setTotalRuns(total);

        if (latestRun.isPresent()) {
            AutomationJobRun run = latestRun.get();
            info.setLastRunAt(run.getStartedAt());
            info.setLastStatus(run.getStatus().name());
            info.setLastMessage(run.getMessage() != null ? run.getMessage() : run.getErrorDetails());
            info.setLastProcessedCount(run.getProcessedRecordsCount());
        } else {
            info.setLastStatus("NEVER_RUN");
            info.setLastMessage("Job scheduled; no executions recorded yet.");
        }
    }

    @jakarta.annotation.PostConstruct
    public void reconcileStaleRunningJobs() {
        // 1. Reconcile AutomationJobRun
        List<AutomationJobRun> staleRuns = jobRunRepository.findByStatus(JobExecutionStatus.RUNNING);
        if (!staleRuns.isEmpty()) {
            logger.info("Found {} stale RUNNING job(s) from previous application run. Reconciling to FAILED...", staleRuns.size());
            LocalDateTime now = LocalDateTime.now();
            for (AutomationJobRun run : staleRuns) {
                run.setStatus(JobExecutionStatus.FAILED);
                run.setFinishedAt(now);
                run.setErrorDetails("Execution interrupted by application restart / JVM termination.");
                run.setMessage("Execution interrupted by application restart.");
            }
            jobRunRepository.saveAll(staleRuns);
        }

        // 2. Reconcile InvoiceReminderDelivery stuck in SENDING from previous application run
        if (reminderDeliveryRepository != null) {
            List<com.acrovix.admin.entity.InvoiceReminderDelivery> staleDeliveries = 
                    reminderDeliveryRepository.findByStatus(com.acrovix.admin.entity.InvoiceReminderDelivery.DeliveryStatus.SENDING);
            if (!staleDeliveries.isEmpty()) {
                logger.info("Found {} stale SENDING invoice reminder delivery record(s). Reconciling to FAILED for safe retry...", staleDeliveries.size());
                LocalDateTime now = LocalDateTime.now();
                for (com.acrovix.admin.entity.InvoiceReminderDelivery d : staleDeliveries) {
                    d.setStatus(com.acrovix.admin.entity.InvoiceReminderDelivery.DeliveryStatus.FAILED);
                    d.setNextRetryAt(now);
                    d.setLastError("Delivery attempt interrupted by application restart / JVM termination.");
                }
                reminderDeliveryRepository.saveAll(staleDeliveries);
            }
        }
    }

    public List<AutomationJobRun> getRecentExecutions() {
        return jobRunRepository.findTop20ByOrderByStartedAtDesc();
    }

    public org.springframework.data.domain.Page<AutomationJobRun> getExecutionHistory(org.springframework.data.domain.Pageable pageable) {
        return jobRunRepository.findAllByOrderByStartedAtDesc(pageable);
    }

    public AutomationJobRun runJobManually(String jobId) {
        return executeJob(jobId, TriggerType.MANUAL);
    }

    public AutomationJobRun executeJob(String jobId, TriggerType triggerType) {
        // Idempotency / Concurrency Guard: reject overlapping execution
        Boolean previous = activeLocks.putIfAbsent(jobId, Boolean.TRUE);
        if (Boolean.TRUE.equals(previous)) {
            logger.warn("Job '{}' execution rejected: overlapping run already in progress.", jobId);
            throw new IllegalStateException("Job '" + jobId + "' is currently RUNNING. Overlapping execution was rejected.");
        }

        String jobName = resolveJobName(jobId);
        AutomationJobRun run = AutomationJobRun.builder()
                .jobId(jobId)
                .jobName(jobName)
                .triggerType(triggerType)
                .status(JobExecutionStatus.RUNNING)
                .startedAt(LocalDateTime.now())
                .message("Execution in progress (" + triggerType + ")...")
                .build();
        run = jobRunRepository.save(run);

        logger.info("Starting automation execution for '{}' [Trigger: {}]", jobId, triggerType);

        try {
            int count = 0;
            String resultMessage;
            switch (jobId) {
                case "follow-ups":
                    count = emailSchedulerService.processDueAndOverdueFollowUpsInternal();
                    resultMessage = "Processed " + count + " due/overdue follow-up alert(s).";
                    break;
                case "invoices":
                    count = emailSchedulerService.processOverdueInvoicesInternal();
                    resultMessage = "Processed " + count + " overdue invoice escalation(s).";
                    break;
                case "ai-extraction":
                    if (geminiApiKey == null || geminiApiKey.trim().isEmpty()) {
                        throw new IllegalStateException("GEMINI_API_KEY environment variable is not configured.");
                    }
                    count = 1;
                    resultMessage = "Gemini API key is configured and rate-limit guard is ready.";
                    break;
                default:
                    throw new IllegalArgumentException("Unknown automation job ID: " + jobId);
            }

            run.setStatus(JobExecutionStatus.SUCCESS);
            run.setFinishedAt(LocalDateTime.now());
            run.setProcessedRecordsCount(count);
            run.setMessage(resultMessage);
            run = jobRunRepository.save(run);
            logger.info("Successfully finished automation job '{}': {}", jobId, resultMessage);
            return run;
        } catch (Exception e) {
            logger.error("Automation job '{}' failed: {}", jobId, e.getMessage(), e);
            run.setStatus(JobExecutionStatus.FAILED);
            run.setFinishedAt(LocalDateTime.now());
            run.setErrorDetails(e.getMessage());
            run.setMessage("Execution failed: " + e.getMessage());
            jobRunRepository.save(run);
            throw (e instanceof RuntimeException ? (RuntimeException) e : new RuntimeException(e));
        } finally {
            activeLocks.remove(jobId);
        }
    }
}
