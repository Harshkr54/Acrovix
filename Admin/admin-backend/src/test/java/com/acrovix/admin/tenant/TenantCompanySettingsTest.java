package com.acrovix.admin.tenant;

import com.acrovix.admin.controller.TenantPublicController;
import com.acrovix.admin.dto.CompanySettingsRequest;
import com.acrovix.admin.dto.CompanySettingsResponse;
import com.acrovix.admin.dto.TenantBrandingResponse;
import com.acrovix.admin.entity.CompanySettings;
import com.acrovix.admin.entity.Tenant;
import com.acrovix.admin.entity.TenantStatus;
import com.acrovix.admin.repository.AdminActivityRepository;
import com.acrovix.admin.repository.CompanySettingsRepository;
import com.acrovix.admin.repository.TenantRepository;
import com.acrovix.admin.service.CompanySettingsService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TenantCompanySettingsTest {

    @Mock
    private CompanySettingsRepository companySettingsRepository;

    @Mock
    private AdminActivityRepository activityRepository;

    @Mock
    private TenantRepository tenantRepository;

    private CompanySettingsService companySettingsService;
    private TenantPublicController publicController;

    @BeforeEach
    void setUp() {
        companySettingsService = new CompanySettingsService(companySettingsRepository, activityRepository, tenantRepository);
        publicController = new TenantPublicController(tenantRepository, companySettingsRepository);
        TenantContext.clear();
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("CompanySettings retrieval defaults to active tenant metadata when not yet configured")
    void testGetCompanySettingsDefaults() {
        TenantContext.setTenantId(2L);

        Tenant tenant = Tenant.builder()
                .id(2L)
                .slug("tenant-two")
                .companyName("Acme Global Corp")
                .status(TenantStatus.ACTIVE)
                .build();

        when(companySettingsRepository.findFirstByTenantIdOrderByIdAsc(2L)).thenReturn(Optional.empty());
        when(tenantRepository.findById(2L)).thenReturn(Optional.of(tenant));

        CompanySettingsResponse response = companySettingsService.getCompanySettings();

        assertNotNull(response);
        assertEquals(2L, response.getTenantId());
        assertEquals("Acme Global Corp", response.getCompanyName());
        assertEquals("Acme Global Corp", response.getLegalName());
        assertEquals("#2563EB", response.getPrimaryColor());
        assertEquals("#1E40AF", response.getSecondaryColor());
        assertEquals("INR", response.getCurrencyCode());
        assertEquals("₹", response.getCurrencySymbol());
    }

    @Test
    @DisplayName("CompanySettings update is isolated to calling tenant and persists dynamic branding/currency")
    void testUpdateCompanySettingsTenantIsolation() {
        TenantContext.setTenantId(2L);

        CompanySettingsRequest request = new CompanySettingsRequest();
        request.setCompanyName("Acme International");
        request.setLegalName("Acme International Inc");
        request.setBrandName("Acme");
        request.setEmail("contact@acme.com");
        request.setPhone("+1-800-555-0199");
        request.setPrimaryColor("#059669");
        request.setSecondaryColor("#047857");
        request.setCurrencyCode("USD");
        request.setCurrencySymbol("$");
        request.setTimezone("America/New_York");
        request.setDateFormat("MM/DD/YYYY");
        request.setLogoUrl("https://cdn.acme.com/logo.png");
        request.setFaviconUrl("https://cdn.acme.com/favicon.ico");

        when(companySettingsRepository.findFirstByTenantIdOrderByIdAsc(2L)).thenReturn(Optional.empty());
        when(companySettingsRepository.save(any(CompanySettings.class))).thenAnswer(invocation -> {
            CompanySettings cs = invocation.getArgument(0);
            cs.setId(50L);
            return cs;
        });

        CompanySettingsResponse response = companySettingsService.updateCompanySettings(request, 99L);

        assertNotNull(response);
        assertEquals(2L, response.getTenantId());
        assertEquals("Acme International", response.getCompanyName());
        assertEquals("Acme", response.getBrandName());
        assertEquals("#059669", response.getPrimaryColor());
        assertEquals("#047857", response.getSecondaryColor());
        assertEquals("USD", response.getCurrencyCode());
        assertEquals("$", response.getCurrencySymbol());
        assertEquals("America/New_York", response.getTimezone());

        verify(companySettingsRepository).save(argThat(cs ->
                Long.valueOf(2L).equals(cs.getTenantId()) &&
                "USD".equals(cs.getCurrencyCode()) &&
                "#059669".equals(cs.getPrimaryColor())
        ));
    }

    @Test
    @DisplayName("TenantPublicController branding endpoint serves dynamic branding from CompanySettings")
    void testTenantPublicControllerServesDynamicBranding() {
        Tenant tenant = Tenant.builder()
                .id(3L)
                .slug("starlight")
                .companyName("Starlight Enterprise")
                .status(TenantStatus.ACTIVE)
                .customDomain("starlight.erp.com")
                .build();

        CompanySettings settings = CompanySettings.builder()
                .id(101L)
                .companyName("Starlight Enterprise")
                .brandName("Starlight Cloud")
                .logoUrl("https://starlight.com/logo.svg")
                .faviconUrl("https://starlight.com/favicon.png")
                .primaryColor("#7C3AED")
                .secondaryColor("#5B21B6")
                .build();
        settings.setTenantId(3L);

        when(tenantRepository.findBySlug("starlight")).thenReturn(Optional.of(tenant));
        when(companySettingsRepository.findFirstByTenantIdOrderByIdAsc(3L)).thenReturn(Optional.of(settings));

        ResponseEntity<?> response = publicController.getTenantBranding("starlight");

        assertNotNull(response);
        assertTrue(response.getBody() instanceof TenantBrandingResponse);
        TenantBrandingResponse branding = (TenantBrandingResponse) response.getBody();

        assertEquals("starlight", branding.getSlug());
        assertEquals("Starlight Cloud", branding.getCompanyName());
        assertEquals("https://starlight.com/logo.svg", branding.getLogoUrl());
        assertEquals("https://starlight.com/favicon.png", branding.getFaviconUrl());
        assertEquals("#7C3AED", branding.getPrimaryColor());
        assertEquals("#5B21B6", branding.getSecondaryColor());
    }
}
