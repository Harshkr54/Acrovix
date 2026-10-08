package com.acrovix.admin.service;

import com.acrovix.admin.dto.GstVerificationResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

class GstinApiVerificationServiceTest {

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private GstinApiVerificationService gstinApiVerificationService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        ReflectionTestUtils.setField(gstinApiVerificationService, "apiBaseUrl", "https://www.gstinapi.in");
        ReflectionTestUtils.setField(gstinApiVerificationService, "apiKey", "test-api-key");
    }

    @Test
    void testSuccessfulVerification() {
        Map<String, Object> data = new HashMap<>();
        data.put("legal_name", "Test Legal Name");
        data.put("trade_name", "Test Trade Name");
        data.put("status", "Active");
        data.put("taxpayer_type", "Regular");
        data.put("registration_date", "2020-01-01");
        data.put("address", "123 Test St");
        data.put("state_code", "MH");

        Map<String, Object> addressDetails = new HashMap<>();
        addressDetails.put("state", "Maharashtra");
        addressDetails.put("pincode", "400001");
        data.put("address_details", addressDetails);

        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("success", true);
        responseBody.put("data", data);

        ResponseEntity<Map> responseEntity = new ResponseEntity<>(responseBody, HttpStatus.OK);

        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(responseEntity);

        GstVerificationResponse response = gstinApiVerificationService.verify("22AAAAA0000A1Z5");

        assertTrue(response.isSuccess());
        assertEquals("Test Legal Name", response.getLegalName());
        assertEquals("Test Trade Name", response.getTradeName());
        assertEquals("Active", response.getStatus());
        assertEquals("Regular", response.getTaxpayerType());
        assertEquals("123 Test St", response.getBillingAddress());
        assertEquals("Maharashtra", response.getState());
        assertEquals("400001", response.getPincode());
    }

    @Test
    void testMissingApiKey() {
        ReflectionTestUtils.setField(gstinApiVerificationService, "apiKey", "");
        
        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> {
            gstinApiVerificationService.verify("22AAAAA0000A1Z5");
        });
        
        assertEquals("GST verification service is not configured. Please enter customer details manually.", exception.getMessage());
    }

    @Test
    void testInvalidGstinFormat() {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            gstinApiVerificationService.verify("INVALIDGSTIN");
        });
        
        assertEquals("Enter a valid GSTIN.", exception.getMessage());
    }

    @Test
    void testNotFound404() {
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenThrow(HttpClientErrorException.create(HttpStatus.NOT_FOUND, "Not Found", new HttpHeaders(), null, null));

        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> {
            gstinApiVerificationService.verify("22AAAAA0000A1Z5");
        });
        
        assertEquals("GSTIN is invalid or not registered.", exception.getMessage());
    }

    @Test
    void testUnauthorized401() {
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenThrow(HttpClientErrorException.create(HttpStatus.UNAUTHORIZED, "Unauthorized", new HttpHeaders(), null, null));

        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> {
            gstinApiVerificationService.verify("22AAAAA0000A1Z5");
        });
        
        assertEquals("GST verification service is not configured correctly.", exception.getMessage());
    }

    @Test
    void testTooManyRequests429() {
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenThrow(HttpClientErrorException.create(HttpStatus.TOO_MANY_REQUESTS, "Too Many", new HttpHeaders(), null, null));

        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> {
            gstinApiVerificationService.verify("22AAAAA0000A1Z5");
        });
        
        assertEquals("GST verification limit reached. Please try again later.", exception.getMessage());
    }

    @Test
    void testBadGateway502() {
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenThrow(HttpServerErrorException.create(HttpStatus.BAD_GATEWAY, "Bad Gateway", new HttpHeaders(), null, null));

        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> {
            gstinApiVerificationService.verify("22AAAAA0000A1Z5");
        });
        
        assertEquals("GST verification service is temporarily unavailable.", exception.getMessage());
    }

    @Test
    void testMalformedResponse() {
        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("success", false);
        
        ResponseEntity<Map> responseEntity = new ResponseEntity<>(responseBody, HttpStatus.OK);

        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(responseEntity);

        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> {
            gstinApiVerificationService.verify("22AAAAA0000A1Z5");
        });
        
        assertEquals("GSTIN is invalid or not registered.", exception.getMessage());
    }

    @Test
    void testTimeout() {
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenThrow(new ResourceAccessException("Timeout"));

        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> {
            gstinApiVerificationService.verify("22AAAAA0000A1Z5");
        });
        
        assertEquals("GST verification timed out. Please try again.", exception.getMessage());
    }
}
