package com.acrovix.admin.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class GeminiExtractionService {

    @Value("${gemini.api-key}")
    private String geminiApiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String extractQuotationRows(String roughText) {
        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=" + geminiApiKey;

        String prompt = "You are a pure data extractor. Extract quotation items from the following rough text. " +
                "NEVER invent prices, quantities, products, or services. If a value is missing, return null. " +
                "Return strictly valid JSON matching this schema exactly:\n" +
                "{\n" +
                "  \"type\": \"array\",\n" +
                "  \"items\": {\n" +
                "    \"type\": \"object\",\n" +
                "    \"properties\": {\n" +
                "      \"description\": { \"type\": \"string\" },\n" +
                "      \"category\": { \"type\": \"string\" },\n" +
                "      \"quantity\": { \"type\": \"number\" },\n" +
                "      \"unit\": { \"type\": \"string\" },\n" +
                "      \"unitPrice\": { \"type\": \"number\" },\n" +
                "      \"discountPercent\": { \"type\": \"number\" },\n" +
                "      \"taxPercent\": { \"type\": \"number\" },\n" +
                "      \"sourceText\": { \"type\": \"string\" }\n" +
                "    },\n" +
                "    \"required\": [\"description\", \"sourceText\"]\n" +
                "  }\n" +
                "}\n\n" +
                "Rough text to parse:\n" + roughText;

        Map<String, Object> requestBody = new HashMap<>();
        Map<String, Object> contents = new HashMap<>();
        Map<String, Object> parts = new HashMap<>();
        parts.put("text", prompt);
        contents.put("parts", new Object[]{parts});
        requestBody.put("contents", new Object[]{contents});
        
        Map<String, Object> generationConfig = new HashMap<>();
        generationConfig.put("response_mime_type", "application/json");
        requestBody.put("generationConfig", generationConfig);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            String response = restTemplate.postForObject(url, entity, String.class);
            JsonNode root = objectMapper.readTree(response);
            
            JsonNode textNode = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
            if (textNode.isMissingNode()) {
                throw new RuntimeException("Invalid response structure from Gemini API");
            }
            
            return textNode.asText();
        } catch (Exception e) {
            // Log a sanitized error message server-side for diagnostics.
            // Do NOT log the exception stack trace directly as it contains the raw API key in the URL parameter.
            String rawMessage = e.getMessage();
            String sanitizedMessage = (rawMessage != null && geminiApiKey != null && !geminiApiKey.isEmpty())
                    ? rawMessage.replace(geminiApiKey, "[REDACTED_KEY]")
                    : (rawMessage != null ? rawMessage : "Unknown error");
            org.slf4j.LoggerFactory.getLogger(GeminiExtractionService.class)
                    .error("Gemini extraction failed [Exception: {}, Message: {}]", e.getClass().getSimpleName(), sanitizedMessage);
            throw new RuntimeException("Failed to extract data from the provided text. Please try again.");
        }
    }
}
