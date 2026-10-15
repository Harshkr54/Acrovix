package com.acrovix.admin.controller;

import com.acrovix.admin.entity.AutomationJobRun;
import com.acrovix.admin.service.AutomationService;
import com.acrovix.admin.service.AutomationService.JobExecutionInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/automation")
public class AutomationController {

    private final AutomationService automationService;

    public AutomationController(AutomationService automationService) {
        this.automationService = automationService;
    }

    @GetMapping("/status")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN')")
    public ResponseEntity<List<JobExecutionInfo>> getAutomationStatus() {
        return ResponseEntity.ok(automationService.getAutomationStatus());
    }

    @GetMapping("/history")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN')")
    public ResponseEntity<?> getRecentExecutions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        if (page < 0 || size <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Page must be >= 0 and size must be > 0"));
        }
        int boundedSize = Math.min(size, 100);
        org.springframework.data.domain.Page<AutomationJobRun> historyPage = 
                automationService.getExecutionHistory(org.springframework.data.domain.PageRequest.of(page, boundedSize));
        return ResponseEntity.ok(historyPage);
    }

    @PostMapping("/run/{jobId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN')")
    public ResponseEntity<?> runJobManually(@PathVariable String jobId) {
        try {
            AutomationJobRun result = automationService.runJobManually(jobId);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }
}
