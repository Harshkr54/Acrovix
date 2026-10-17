package com.acrovix.admin.repository;

import com.acrovix.admin.entity.EntityAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EntityAuditLogRepository extends JpaRepository<EntityAuditLog, Long> {
    
    List<EntityAuditLog> findByEntityTypeAndEntityIdOrderByCreatedAtAsc(String entityType, Long entityId);

    List<EntityAuditLog> findByTenantIdAndEntityTypeAndEntityIdOrderByCreatedAtAsc(Long tenantId, String entityType, Long entityId);
}
