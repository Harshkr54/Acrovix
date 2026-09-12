package com.acrovix.admin.controller;

import com.acrovix.admin.service.GeminiExtractionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/gemini")
@RequiredArgsConstructor
public class GeminiController {

    private final GeminiExtractionService geminiExtractionService;

    @PostMapping("/extract")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<String> extractQuotationRows(@RequestBody Map<String, String> body) {
        String text = body.get("roughText");
        if (text == null || text.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("[]");
        }
        return ResponseEntity.ok(geminiExtractionService.extractQuotationRows(text));
    }
}
