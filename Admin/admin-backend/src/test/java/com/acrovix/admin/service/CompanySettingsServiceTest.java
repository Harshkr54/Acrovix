package com.acrovix.admin.service;

import com.acrovix.admin.dto.CompanySettingsRequest;
import com.acrovix.admin.dto.CompanySettingsResponse;
import com.acrovix.admin.entity.CompanySettings;
import com.acrovix.admin.repository.AdminActivityRepository;
import com.acrovix.admin.repository.CompanySettingsRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CompanySettingsServiceTest {

    @Mock
    private CompanySettingsRepository companySettingsRepository;

    @Mock
    private AdminActivityRepository activityRepository;

    @InjectMocks
    private CompanySettingsService companySettingsService;

    @Test
    void updateCompanySettings_Success() {
        CompanySettingsRequest request = new CompanySettingsRequest();
        request.setCompanyName("Acrovix");
        request.setLegalName("Acrovix Tech");

        CompanySettings existing = new CompanySettings();
        existing.setId(1L);

        when(companySettingsRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(companySettingsRepository.save(any(CompanySettings.class))).thenReturn(existing);

        CompanySettingsResponse response = companySettingsService.updateCompanySettings(request, 100L);

        assertNotNull(response);
        verify(activityRepository).save(any());
    }
}
