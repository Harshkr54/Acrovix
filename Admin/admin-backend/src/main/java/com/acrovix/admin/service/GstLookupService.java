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
        
        log.warn("Mocking GST lookup attempted for {}, but no real provider is configured.", cleanGstin);
        throw new IllegalStateException("GST verification service is not configured. Please enter customer details manually.");
    }
}
