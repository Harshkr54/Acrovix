package com.acrovix.admin.service;

import com.acrovix.admin.dto.GstLookupResponse;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class GstLookupService {
    
    public GstLookupResponse lookupGstin(String gstin) {
        if (gstin == null || gstin.trim().isEmpty()) {
            throw new IllegalArgumentException("GSTIN is required");
        }
        
        String cleanGstin = gstin.trim().toUpperCase();
        
        if (cleanGstin.equals("INVALIDGSTIN") || cleanGstin.length() != 15) {
            throw new IllegalArgumentException("Invalid GSTIN or provider error");
        }
        
        // Mock provider implementation
        // In a real scenario, this would call an external API using RestTemplate/WebClient
        log.info("Mocking GST lookup for {}", cleanGstin);
        
        String stateName = cleanGstin.startsWith("29") ? "Karnataka" : "Maharashtra";
        String pos = cleanGstin.substring(0, 2) + "-" + stateName;
        
        return GstLookupResponse.builder()
            .gstin(cleanGstin)
            .legalName("ACME CORP PVT LTD")
            .tradeName("ACME CORPORATION")
            .address("123 Tech Park, Innovation Way")
            .state(stateName)
            .pincode("560001")
            .placeOfSupply(pos)
            .build();
    }
}
