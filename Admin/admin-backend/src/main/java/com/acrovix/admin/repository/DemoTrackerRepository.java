package com.acrovix.admin.repository;

import com.acrovix.admin.entity.DemoTracker;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DemoTrackerRepository extends JpaRepository<DemoTracker, Long> {
    List<DemoTracker> findByBatchId(String batchId);
    List<DemoTracker> findByBatchIdAndEntityType(String batchId, String entityType);
    void deleteByBatchId(String batchId);
}
