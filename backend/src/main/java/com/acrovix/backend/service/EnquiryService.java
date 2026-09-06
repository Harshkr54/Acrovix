package com.acrovix.backend.service;

import com.acrovix.backend.dto.EnquiryRequest;
import com.acrovix.backend.dto.EnquiryResponseData;
import com.acrovix.backend.entity.Enquiry;
import com.acrovix.backend.repository.EnquiryRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.Year;

@Service
@RequiredArgsConstructor
public class EnquiryService {

    private static final Logger logger = LoggerFactory.getLogger(EnquiryService.class);

    private final EnquiryRepository enquiryRepository;
    private final EmailService emailService;
    private final SecureRandom random = new SecureRandom();

    public EnquiryResponseData createEnquiry(EnquiryRequest request) {
        // Step 1: Persist enquiry to PostgreSQL in transaction
        Enquiry savedEnquiry = saveEnquiryInTransaction(request);

        // Step 2: Send email notifications outside database transaction
        try {
            emailService.sendInternalNotification(savedEnquiry);
        } catch (Exception e) {
            logger.error("Unhandled exception during internal email dispatch for enquiry reference ID: {}", savedEnquiry.getReferenceId(), e);
        }

        try {
            emailService.sendCustomerAcknowledgement(savedEnquiry);
        } catch (Exception e) {
            logger.error("Unhandled exception during customer email dispatch for enquiry reference ID: {}", savedEnquiry.getReferenceId(), e);
        }

        // Step 3: Return successful API response metadata
        return EnquiryResponseData.builder()
                .id(savedEnquiry.getId())
                .referenceId(savedEnquiry.getReferenceId())
                .createdAt(savedEnquiry.getCreatedAt())
                .build();
    }

    @Transactional
    public Enquiry saveEnquiryInTransaction(EnquiryRequest request) {
        Enquiry enquiry = Enquiry.builder()
                .fullName(request.getFullName().trim())
                .businessEmail(request.getBusinessEmail().trim().toLowerCase())
                .companyName(request.getCompanyName().trim())
                .phoneNumber(request.getPhoneNumber().trim())
                .projectRequirement(request.getProjectRequirement().trim())
                .industrySector(request.getIndustrySector() != null && !request.getIndustrySector().trim().isEmpty()
                        ? request.getIndustrySector().trim() : null)
                .serviceRequired(request.getServiceRequired() != null && !request.getServiceRequired().trim().isEmpty()
                        ? request.getServiceRequired().trim() : null)
                .preferredContactMethod(request.getPreferredContactMethod() != null && !request.getPreferredContactMethod().trim().isEmpty()
                        ? request.getPreferredContactMethod().trim() : null)
                .build();

        // Generate unique Reference ID: ACR-YYYY-XXXXXX with pre-check collision retry
        String referenceId;
        int attempts = 0;
        do {
            int year = Year.now().getValue();
            int randomCode = 100000 + random.nextInt(900000);
            referenceId = String.format("ACR-%d-%d", year, randomCode);
            attempts++;
        } while (enquiryRepository.existsByReferenceId(referenceId) && attempts < 10);

        enquiry.setReferenceId(referenceId);
        enquiry.setCreatedAt(LocalDateTime.now());

        try {
            Enquiry saved = enquiryRepository.save(enquiry);
            logger.info("Enquiry reference ID: {} saved successfully to database with ID: {}", saved.getReferenceId(), saved.getId());
            return saved;
        } catch (DataIntegrityViolationException e) {
            logger.warn("Database constraint collision detected for reference ID {}. Retrying with fresh reference ID...", referenceId);
            int year = Year.now().getValue();
            int randomCode = 100000 + random.nextInt(900000);
            enquiry.setReferenceId(String.format("ACR-%d-%d", year, randomCode));
            Enquiry saved = enquiryRepository.save(enquiry);
            logger.info("Enquiry reference ID: {} saved successfully on retry to database with ID: {}", saved.getReferenceId(), saved.getId());
            return saved;
        }
    }
}
