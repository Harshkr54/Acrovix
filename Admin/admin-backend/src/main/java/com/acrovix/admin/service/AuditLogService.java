package com.acrovix.admin.service;

import com.acrovix.admin.entity.EntityAuditLog;
import com.acrovix.admin.repository.EntityAuditLogRepository;
import com.acrovix.admin.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final EntityAuditLogRepository auditLogRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String entityType, Long entityId, String action, String performedByName, String details) {
        try {
            Long tenantId = TenantContext.getTenantId();
            if (tenantId == null) {
                tenantId = 1L; // fallback default
            }
            logForTenant(tenantId, entityType, entityId, action, performedByName, details);
        } catch (Exception e) {
            log.error("Failed to write audit log for entityType={}, entityId={}: {}", entityType, entityId, e.getMessage());
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logForTenant(Long tenantId, String entityType, Long entityId, String action, String performedByName, String details) {
        try {
            EntityAuditLog entry = EntityAuditLog.builder()
                    .entityType(entityType)
                    .entityId(entityId)
                    .action(action)
                    .performedByName(performedByName != null ? performedByName : "System")
                    .details(details)
                    .createdAt(LocalDateTime.now())
                    .build();
            entry.setTenantId(tenantId);
            auditLogRepository.save(entry);
            log.debug("Recorded audit log [tenant={}, entity={}/{}, action={}]", tenantId, entityType, entityId, action);
        } catch (Exception e) {
            log.error("Failed to write tenant audit log [tenant={}, entity={}/{}]: {}", tenantId, entityType, entityId, e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<EntityAuditLog> getLogs(String entityType, Long entityId) {
        Long tenantId = TenantContext.getTenantId();
        if (tenantId != null) {
            return auditLogRepository.findByTenantIdAndEntityTypeAndEntityIdOrderByCreatedAtAsc(tenantId, entityType, entityId);
        }
        return auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtAsc(entityType, entityId);
    }
}
