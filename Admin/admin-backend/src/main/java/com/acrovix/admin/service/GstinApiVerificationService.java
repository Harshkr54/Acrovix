package com.acrovix.admin.service;

import com.acrovix.admin.dto.GstVerificationResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import lombok.extern.slf4j.Slf4j;
import java.util.Map;
import java.util.List;

@Service
@Slf4j
public class GstinApiVerificationService implements GstVerificationService {

    @Value("${gst.api.base-url:}")
    private String apiBaseUrl;

    @Value("${gst.api.key:}")
    private String apiKey;

    private final RestTemplate restTemplate;

    public GstinApiVerificationService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate != null ? restTemplate : new RestTemplate();
    }

    @Override
    public GstVerificationResponse verify(String gstin) {
        if (gstin == null || gstin.trim().isEmpty()) {
            throw new IllegalArgumentException("GSTIN is required");
        }

        String cleanGstin = gstin.trim().toUpperCase();

        if (!cleanGstin.matches("^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")) {
            throw new IllegalArgumentException("Enter a valid GSTIN.");
        }

        if (apiKey == null || apiKey.trim().isEmpty() || apiBaseUrl == null || apiBaseUrl.trim().isEmpty()) {
            log.warn("GST API key or base URL is not configured.");
            throw new IllegalStateException("GST verification service is not configured. Please enter customer details manually.");
        }

        try {
            // gstinapi.in endpoint: GET /v1/gstin/{gstin}
            String url = apiBaseUrl;
            if (!url.endsWith("/")) {
                url += "/";
            }
            url += "v1/gstin/" + cleanGstin;

            HttpHeaders headers = new HttpHeaders();
            headers.set("x-api-key", apiKey);
            
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            log.info("GST verification: GSTIN={} ProviderURL={}", cleanGstin, url);
            
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            Map<String, Object> body = response.getBody();
            
            log.info("GST verification: GSTIN={} ProviderStatus={} ProviderResponse={}", cleanGstin, response.getStatusCode(), body);
            
            if (body == null || !Boolean.TRUE.equals(body.get("success"))) {
                throw new IllegalStateException("GSTIN is invalid or not registered.");
            }

            Map<String, Object> data = (Map<String, Object>) body.get("data");
            if (data == null || data.isEmpty()) {
                throw new IllegalStateException("GSTIN is invalid or not registered.");
            }
            
            // Map the generic fields
            String legalName = extractString(data, "legal_name");
            String tradeName = extractString(data, "trade_name");
            String status = extractString(data, "status");
            String taxpayerType = extractString(data, "taxpayer_type");
            String regDate = extractString(data, "registration_date");
            
            // Address extraction
            String billingAddress = extractString(data, "address");
            String state = extractString(data, "state_code"); // sometimes available here
            String pincode = null;

            Object addrObj = data.get("address_details");
            if (addrObj instanceof Map) {
                Map<String, Object> addrMap = (Map<String, Object>) addrObj;
                String st = extractString(addrMap, "state");
                if (st != null && !st.isEmpty()) {
                    state = st;
                }
                pincode = extractString(addrMap, "pincode", "zipcode", "pin_code");
            }
            
            if (legalName == null && status == null) {
                throw new IllegalStateException("GSTIN is invalid or not registered.");
            }

            return GstVerificationResponse.builder()
                .success(true)
                .gstin(cleanGstin)
                .legalName(legalName)
                .tradeName(tradeName)
                .status(status)
                .taxpayerType(taxpayerType)
                .registrationDate(regDate)
                .billingAddress(billingAddress)
                .state(state)
                .pincode(pincode)
                .build();
                
        } catch (HttpClientErrorException.NotFound e) {
            log.info("GST verification: GSTIN={} ProviderStatus=404 ProviderResponse={}", cleanGstin, e.getResponseBodyAsString());
            throw new IllegalStateException("GSTIN is invalid or not registered.");
        } catch (HttpClientErrorException.Unauthorized e) {
            // 401
            log.error("GST API Unauthorized: API Key may be invalid.");
            throw new IllegalStateException("GST verification service is not configured correctly.");
        } catch (HttpClientErrorException.Forbidden e) {
            // 403
            log.error("GST API Forbidden: Access denied.");
            throw new IllegalStateException("GST verification service is not configured correctly.");
        } catch (HttpClientErrorException.TooManyRequests e) {
            log.warn("GST verification: GSTIN={} ProviderStatus=429", cleanGstin);
            throw new IllegalStateException("GST verification limit reached. Please try again later.");
        } catch (HttpClientErrorException.PaymentRequired e) {
            log.error("GST API Payment Required (402): {}", e.getResponseBodyAsString());
            throw new IllegalStateException("GST verification service requires configuration update (credits exhausted).");
        } catch (org.springframework.web.client.HttpServerErrorException.BadGateway e) {
            // 502
            log.error("GST API Bad Gateway (502)");
            throw new IllegalStateException("GST verification service is temporarily unavailable.");
        } catch (org.springframework.web.client.HttpServerErrorException e) {
            log.error("GST API server error: {}", e.getStatusCode());
            throw new IllegalStateException("GST verification service is temporarily unavailable.");
        } catch (HttpClientErrorException e) {
            log.error("GST verification: GSTIN={} ProviderStatus={} ProviderResponse={}", cleanGstin, e.getStatusCode(), e.getResponseBodyAsString());
            // Map 400 to a different message so it's not misclassified as "not registered"
            if (e.getStatusCode().value() == 400) {
                throw new IllegalStateException("GST verification request could not be processed.");
            }
            throw new IllegalStateException("GST verification is currently unavailable.");
        } catch (ResourceAccessException e) {
            log.error("GST API timeout or network error", e);
            throw new IllegalStateException("GST verification timed out. Please try again.");
        } catch (Exception e) {
            if (e instanceof IllegalStateException) {
                throw e;
            }
            log.error("Unexpected GST verification error", e);
            throw new IllegalStateException("GST verification service is temporarily unavailable. Please try again later.");
        }
    }

    private String extractString(Map<String, Object> map, String... keys) {
        if (map == null) return null;
        for (String key : keys) {
            if (map.containsKey(key) && map.get(key) != null) {
                return map.get(key).toString().trim();
            }
        }
        return null;
    }
}
