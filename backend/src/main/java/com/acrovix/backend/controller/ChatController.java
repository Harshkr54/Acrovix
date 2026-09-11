package com.acrovix.backend.controller;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.boot.web.client.RestTemplateBuilder;
import java.time.Duration;

import java.util.List;
import java.util.Map;

/**
 * Gemini AI Proxy Controller
 *
 * Safely proxies chat requests from the frontend to the Google Gemini API.
 * The API key never leaves the server, keeping it secure from the browser.
 *
 * POST /api/chat
 * Body: { "message": "...", "history": [...] }
 * Response: { "reply": "..." }
 */
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private static final Logger logger = LoggerFactory.getLogger(ChatController.class);
    private final RestTemplate restTemplate = new RestTemplateBuilder()
            .setConnectTimeout(Duration.ofSeconds(5))
            .setReadTimeout(Duration.ofSeconds(10))
            .build();

    @Value("${gemini.api-key:}")
    private String geminiApiKey;

    private static final String GEMINI_URL =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=";

    // ACROVIX system prompt — injected into every request so Gemini knows the business context
    private static final String SYSTEM_PROMPT = """
        You are the ACROVIX Assistant — an intelligent, professional, and friendly virtual assistant for ACROVIX INNOVATIONS PRIVATE LIMITED.
        
        COMPANY OVERVIEW:
        - Company: ACROVIX INNOVATIONS PRIVATE LIMITED
        - Tagline: SYNC | SCALE | SUCCEED
        - Positioning: Engineering Growth Through Technology & Infrastructure
        - Description: A modern enterprise technology, cybersecurity, and infrastructure solutions partner empowering organizations to build, secure, and scale resilient operations.
        - Contact: sales@acrovix.com | +91-8660947415 | www.acrovix.com
        - Offices: Bengaluru (Kengeri Satellite Town, Karnataka) | Bhagalpur (Near Mahadev Singh College, Sarai, Bihar)
        
        SERVICES:
        1. Enterprise IT Solutions — IT Licensing, System Integration, Cloud & DevOps, API Management, Database Migration, Managed Services
        2. Cybersecurity & Observability — Unified Observability, Data Masking & PII Protection, Ransomware Protection, VAPT, API Security, Compliance Monitoring
        
        FLAGSHIP PRODUCT:
        - ACROVIX XDA (Xcel Data Armour) — Unified platform for data security, protection, and observability with centralized visibility, threat telemetry, PII masking, and compliance assurance.
        
        INDUSTRIES SERVED: Banking & Financial Services, Healthcare, Government & Public Sector, Retail & E-commerce, Media & Broadcasting, Enterprise IT & SaaS
        
        WEBSITE PAGES: Home (/), About (/about), Services (/services), Products (/products), Industries (/industries), Portfolio (/portfolio), XDA (/xda), Contact (/contact), Enquiry Form (/enquiry)
        
        RESPONSE RULES:
        1. Be concise, helpful, and professional. Max 3-4 sentences per reply.
        2. Always answer in the same language the user writes in (English, Hindi, or Hinglish).
        3. If asked about pricing, say pricing is custom — direct them to /enquiry for a quote.
        4. If asked about careers, direct them to contact via email.
        5. Never make up services or products ACROVIX doesn't offer.
        6. When relevant, suggest the user visit a specific page on the website.
        7. For lead capture (when user provides name/email for consultation), acknowledge warmly and confirm their details will be shared with the ACROVIX team.
        8. Keep a warm, enterprise-professional tone — not too formal, not too casual.
        """;

    public record ChatRequest(String message, List<Map<String, String>> history) {}
    public record ChatResponse(String reply, boolean success) {}

    @PostMapping
    public ResponseEntity<ChatResponse> chat(@RequestBody ChatRequest request) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            logger.warn("Gemini API key not configured — returning fallback");
            return ResponseEntity.ok(new ChatResponse(
                "I'm currently unable to connect to the AI service. Please contact us directly at sales@acrovix.com or call +91-8660947415.",
                false
            ));
        }

        try {
            // Build conversation contents for Gemini
            var contents = new java.util.ArrayList<Map<String, Object>>();

            // Inject system prompt as first user+model exchange (Gemini 1.5 Flash style)
            contents.add(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", "System instructions: " + SYSTEM_PROMPT))
            ));
            contents.add(Map.of(
                "role", "model",
                "parts", List.of(Map.of("text", "Understood. I am the ACROVIX Assistant and will follow all instructions precisely."))
            ));

            // Add conversation history (max last 6 exchanges to stay within token limits)
            if (request.history() != null) {
                var recentHistory = request.history();
                int start = Math.max(0, recentHistory.size() - 12);
                for (int i = start; i < recentHistory.size(); i++) {
                    var h = recentHistory.get(i);
                    contents.add(Map.of(
                        "role", "user".equals(h.get("role")) ? "user" : "model",
                        "parts", List.of(Map.of("text", h.getOrDefault("text", "")))
                    ));
                }
            }

            // Add current user message
            contents.add(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", request.message()))
            ));

            Map<String, Object> requestBody = Map.of(
                "contents", contents,
                "generationConfig", Map.of(
                    "temperature", 0.7,
                    "maxOutputTokens", 300,
                    "topP", 0.9
                )
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> httpRequest = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map> geminiResponse = restTemplate.postForEntity(
                GEMINI_URL + geminiApiKey, httpRequest, Map.class
            );

            // Parse Gemini response
            var candidates = (List<?>) geminiResponse.getBody().get("candidates");
            if (candidates != null && !candidates.isEmpty()) {
                var candidate = (Map<?, ?>) candidates.get(0);
                var content = (Map<?, ?>) candidate.get("content");
                var parts = (List<?>) content.get("parts");
                var part = (Map<?, ?>) parts.get(0);
                String replyText = (String) part.get("text");

                logger.info("Gemini responded successfully for message: {}",
                    request.message().substring(0, Math.min(50, request.message().length())));
                return ResponseEntity.ok(new ChatResponse(replyText.trim(), true));
            }

            return ResponseEntity.ok(new ChatResponse(
                "I'm sorry, I couldn't process that. Please try again or contact us at sales@acrovix.com",
                false
            ));

        } catch (Exception e) {
            logger.error("Gemini API call failed: {}", e.getMessage());
            return ResponseEntity.ok(new ChatResponse(
                "I'm experiencing a temporary issue. Please reach out directly at sales@acrovix.com or call +91-8660947415.",
                false
            ));
        }
    }
}
