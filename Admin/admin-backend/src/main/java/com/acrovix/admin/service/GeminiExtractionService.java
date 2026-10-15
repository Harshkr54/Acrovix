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

    @Value("${gemini.api-key:}")
    private String geminiApiKey;

    @Value("${gemini.model:gemini-3.5-flash-lite}")
    private String geminiModel;

    private static final java.util.List<String> FALLBACK_MODELS = java.util.List.of(
            "gemini-3.5-flash-lite",
            "gemini-3.8-flash",
            "gemini-flash-latest",
            "gemini-3.5-flash"
    );

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String extractQuotationRows(String roughText) {
        if (geminiApiKey == null || geminiApiKey.trim().isEmpty()) {
            throw new IllegalStateException("Gemini API key is not configured.");
        }

        java.util.LinkedHashSet<String> modelsToTry = new java.util.LinkedHashSet<>();
        if (geminiModel != null && !geminiModel.trim().isEmpty()) {
            modelsToTry.add(geminiModel.trim());
        }
        modelsToTry.addAll(FALLBACK_MODELS);

        String prompt = "You are a pure data extractor for quotation line items. Extract all products, equipment, or services mentioned in the following rough text as quotation line items, even if price or quantity is not explicitly stated (in that case, leave quantity and unitPrice as null). " +
                "Extract taxPercent if GST or tax rate is stated (e.g. '18% for routers' -> description: 'routers', taxPercent: 18). " +
                "Extract descriptions and SKUs accurately. " +
                "If source text contains list price and discount, derive unit price. If it contains list price and selling price, derive discount. " +
                "Do NOT invent numbers. Do NOT include client names, terms & conditions, warranties, addresses, or payment terms as line items.\n" +
                "Return strictly valid JSON matching this schema exactly:\n" +
                "{\n" +
                "  \"type\": \"array\",\n" +
                "  \"items\": {\n" +
                "    \"type\": \"object\",\n" +
                "    \"properties\": {\n" +
                "      \"sku\": { \"type\": \"string\" },\n" +
                "      \"description\": { \"type\": \"string\" },\n" +
                "      \"hsnSac\": { \"type\": \"string\" },\n" +
                "      \"quantity\": { \"type\": \"number\" },\n" +
                "      \"listPrice\": { \"type\": \"number\" },\n" +
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

        Exception lastException = null;

        for (String modelName : modelsToTry) {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=" + geminiApiKey;

            try {
                String response = restTemplate.postForObject(url, entity, String.class);
                JsonNode root = objectMapper.readTree(response);
                
                JsonNode textNode = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
                if (textNode.isMissingNode()) {
                    throw new RuntimeException("Invalid response structure from Gemini API");
                }
                
                String rawText = textNode.asText().trim();
                if (rawText.startsWith("```json")) {
                    rawText = rawText.substring(7);
                } else if (rawText.startsWith("```")) {
                    rawText = rawText.substring(3);
                }
                if (rawText.endsWith("```")) {
                    rawText = rawText.substring(0, rawText.length() - 3);
                }
                rawText = rawText.trim();

                try {
                    JsonNode parsed = objectMapper.readTree(rawText);
                    if (parsed.isArray()) {
                        return objectMapper.writeValueAsString(parsed);
                    } else if (parsed.isObject()) {
                        if (parsed.has("items") && parsed.get("items").isArray()) {
                            return objectMapper.writeValueAsString(parsed.get("items"));
                        } else if (parsed.has("rows") && parsed.get("rows").isArray()) {
                            return objectMapper.writeValueAsString(parsed.get("rows"));
                        } else if (parsed.has("data") && parsed.get("data").isArray()) {
                            return objectMapper.writeValueAsString(parsed.get("data"));
                        }
                    }
                } catch (Exception parseEx) {
                    // Return cleaned text if Jackson unwrap not possible
                }

                return rawText;
            } catch (IllegalStateException e) {
                throw e;
            } catch (Exception e) {
                lastException = e;
                String rawMessage = e.getMessage();
                String sanitizedMessage = (rawMessage != null && geminiApiKey != null && !geminiApiKey.isEmpty())
                        ? rawMessage.replace(geminiApiKey, "[REDACTED_KEY]")
                        : (rawMessage != null ? rawMessage : "Unknown error");
                org.slf4j.LoggerFactory.getLogger(GeminiExtractionService.class)
                        .warn("Gemini model {} extraction attempt failed [Exception: {}, Message: {}]. Trying fallback...",
                                modelName, e.getClass().getSimpleName(), sanitizedMessage);
            }
        }

        String rawMessage = lastException != null ? lastException.getMessage() : "Unknown error";
        String sanitizedMessage = (rawMessage != null && geminiApiKey != null && !geminiApiKey.isEmpty())
                ? rawMessage.replace(geminiApiKey, "[REDACTED_KEY]")
                : (rawMessage != null ? rawMessage : "Unknown error");
        org.slf4j.LoggerFactory.getLogger(GeminiExtractionService.class)
                .error("All Gemini extraction models failed [Last Exception: {}, Message: {}]",
                        lastException != null ? lastException.getClass().getSimpleName() : "N/A", sanitizedMessage);
        throw new RuntimeException("Failed to extract data from the provided text. Please try again.");
    }
}
