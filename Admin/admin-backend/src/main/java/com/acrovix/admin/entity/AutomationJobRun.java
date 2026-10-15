package com.acrovix.admin.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "automation_job_runs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AutomationJobRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_id", nullable = false, length = 64)
    private String jobId;

    @Column(name = "job_name", nullable = false, length = 128)
    private String jobName;

    @Enumerated(EnumType.STRING)
    @Column(name = "trigger_type", nullable = false, length = 32)
    private TriggerType triggerType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private JobExecutionStatus status;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "finished_at")
    private LocalDateTime finishedAt;

    @Column(name = "processed_records_count")
    private Integer processedRecordsCount;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @Column(name = "error_details", columnDefinition = "TEXT")
    private String errorDetails;

    public enum TriggerType {
        MANUAL,
        SCHEDULED
    }

    public enum JobExecutionStatus {
        RUNNING,
        SUCCESS,
        FAILED
    }
}
