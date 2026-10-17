package com.acrovix.admin.controller;

import com.acrovix.admin.entity.EntityAuditLog;
import com.acrovix.admin.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'COMPANY_ADMIN', 'EMPLOYEE', 'SALES')")
    public ResponseEntity<List<EntityAuditLog>> getAuditLogs(
            @RequestParam String entityType,
            @RequestParam Long entityId
    ) {
        List<EntityAuditLog> logs = auditLogService.getLogs(entityType.toUpperCase(), entityId);
        return ResponseEntity.ok(logs);
    }
}
