package com.acrovix.backend.controller;

import com.acrovix.backend.dto.ApiResponse;
import com.acrovix.backend.dto.EnquiryRequest;
import com.acrovix.backend.dto.EnquiryResponseData;
import com.acrovix.backend.service.EnquiryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/enquiries")
@RequiredArgsConstructor
public class EnquiryController {

    private final EnquiryService enquiryService;

    @PostMapping
    public ResponseEntity<ApiResponse<EnquiryResponseData>> submitEnquiry(@Valid @RequestBody EnquiryRequest request) {
        EnquiryResponseData responseData = enquiryService.createEnquiry(request);
        ApiResponse<EnquiryResponseData> response = ApiResponse.success(
                "Your enquiry has been submitted successfully.",
                responseData
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
