package com.acrovix.admin.controller;

import com.acrovix.admin.dto.TenantBrandingResponse;
import com.acrovix.admin.entity.CompanySettings;
import com.acrovix.admin.entity.Tenant;
import com.acrovix.admin.entity.TenantStatus;
import com.acrovix.admin.repository.CompanySettingsRepository;
import com.acrovix.admin.repository.TenantRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TenantPublicControllerTest {

    @Mock
    private TenantRepository tenantRepository;

    @Mock
    private CompanySettingsRepository companySettingsRepository;

    @InjectMocks
    private TenantPublicController controller;

    @Test
    @DisplayName("Public branding endpoint returns branding details for active tenant")
    void testGetTenantBrandingSuccess() {
        Tenant tenant = Tenant.builder()
                .id(2L)
                .slug("apex-logistics")
                .companyName("Apex Logistics Global")
                .status(TenantStatus.ACTIVE)
                .customDomain("portal.apexlogistics.com")
                .build();

        CompanySettings settings = CompanySettings.builder()
                .id(10L)
                .companyName("Apex Logistics Global")
                .legalName("Apex Logistics Solutions Pvt Ltd")
                .logoUrl("https://s3.amazonaws.com/apex-logo.png")
                .primaryColor("#0F766E")
                .secondaryColor("#115E59")
                .build();
        settings.setTenantId(2L);

        when(tenantRepository.findBySlug("apex-logistics")).thenReturn(Optional.of(tenant));
        when(companySettingsRepository.findFirstByTenantIdOrderByIdAsc(2L)).thenReturn(Optional.of(settings));

        ResponseEntity<?> response = controller.getTenantBranding("apex-logistics");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody() instanceof TenantBrandingResponse);
        TenantBrandingResponse branding = (TenantBrandingResponse) response.getBody();

        assertEquals("apex-logistics", branding.getSlug());
        assertEquals("Apex Logistics Solutions Pvt Ltd", branding.getCompanyName());
        assertEquals("https://s3.amazonaws.com/apex-logo.png", branding.getLogoUrl());
        assertEquals("#0F766E", branding.getPrimaryColor());
        assertEquals("#115E59", branding.getSecondaryColor());
        assertEquals("ACTIVE", branding.getStatus());
    }

    @Test
    @DisplayName("Public branding returns 404 for non-existent workspace slug")
    void testGetTenantBrandingNotFound() {
        when(tenantRepository.findBySlug("non-existent")).thenReturn(Optional.empty());

        ResponseEntity<?> response = controller.getTenantBranding("non-existent");

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    @DisplayName("Public branding returns 403 for suspended workspace")
    void testGetTenantBrandingSuspendedReturns403() {
        Tenant suspended = Tenant.builder()
                .id(5L)
                .slug("frozen-corp")
                .status(TenantStatus.SUSPENDED)
                .build();

        when(tenantRepository.findBySlug("frozen-corp")).thenReturn(Optional.of(suspended));

        ResponseEntity<?> response = controller.getTenantBranding("frozen-corp");

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }
}
