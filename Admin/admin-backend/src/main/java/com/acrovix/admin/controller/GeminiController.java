package com.acrovix.admin.controller;

import com.acrovix.admin.security.ratelimit.RateLimit;
import com.acrovix.admin.security.ratelimit.RateLimitCategory;
import com.acrovix.admin.service.GeminiExtractionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/gemini")
@RequiredArgsConstructor
public class GeminiController {

    private final GeminiExtractionService geminiExtractionService;

    @RateLimit(category = RateLimitCategory.AI)
    @PostMapping(value = "/extract", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'SALES')")
    public ResponseEntity<?> extractQuotationRows(@RequestBody Map<String, String> body) {
        String text = body.get("roughText");
        if (text == null || text.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("[]");
        }
        try {
            String json = geminiExtractionService.extractQuotationRows(text);
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(json);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("message", "AI extraction failed. Please check the text format or try again."));
        }
    }
}
