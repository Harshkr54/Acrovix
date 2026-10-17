package com.acrovix.admin.repository;

import com.acrovix.admin.entity.SequenceTracker;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SequenceTrackerRepository extends JpaRepository<SequenceTracker, Long> {
    
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM SequenceTracker s WHERE s.tenantId = :tenantId AND s.sequenceName = :sequenceName")
    Optional<SequenceTracker> findByTenantIdAndSequenceNameForUpdate(@Param("tenantId") Long tenantId, @Param("sequenceName") String sequenceName);

    Optional<SequenceTracker> findByTenantIdAndSequenceName(Long tenantId, String sequenceName);

    List<SequenceTracker> findAllByTenantId(Long tenantId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM SequenceTracker s WHERE s.sequenceName = :sequenceName")
    Optional<SequenceTracker> findBySequenceNameForUpdate(@Param("sequenceName") String sequenceName);
}
