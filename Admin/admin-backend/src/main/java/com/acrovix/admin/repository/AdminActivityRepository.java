package com.acrovix.admin.repository;

import com.acrovix.admin.entity.AdminActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AdminActivityRepository extends JpaRepository<AdminActivity, Long> {
    List<AdminActivity> findTop50ByOrderByCreatedAtDesc();
    List<AdminActivity> findTop50ByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(LocalDateTime start, LocalDateTime end);
    void deleteByEntityTypeAndEntityIdIn(String entityType, List<Long> entityIds);
}
