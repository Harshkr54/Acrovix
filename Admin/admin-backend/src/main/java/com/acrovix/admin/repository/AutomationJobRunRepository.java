package com.acrovix.admin.repository;

import com.acrovix.admin.entity.AutomationJobRun;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AutomationJobRunRepository extends JpaRepository<AutomationJobRun, Long> {

    Optional<AutomationJobRun> findFirstByJobIdOrderByStartedAtDesc(String jobId);

    long countByJobId(String jobId);

    List<AutomationJobRun> findTop20ByOrderByStartedAtDesc();

    Page<AutomationJobRun> findAllByOrderByStartedAtDesc(Pageable pageable);

    List<AutomationJobRun> findTop10ByJobIdOrderByStartedAtDesc(String jobId);

    boolean existsByJobIdAndStatus(String jobId, AutomationJobRun.JobExecutionStatus status);

    List<AutomationJobRun> findByStatus(AutomationJobRun.JobExecutionStatus status);
}
