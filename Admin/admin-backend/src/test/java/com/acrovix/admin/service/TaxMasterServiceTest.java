package com.acrovix.admin.service;

import com.acrovix.admin.dto.TaxMasterRequest;
import com.acrovix.admin.dto.TaxMasterResponse;
import com.acrovix.admin.entity.TaxMaster;
import com.acrovix.admin.repository.AdminActivityRepository;
import com.acrovix.admin.repository.TaxMasterRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaxMasterServiceTest {

    @Mock
    private TaxMasterRepository taxMasterRepository;

    @Mock
    private AdminActivityRepository activityRepository;

    @InjectMocks
    private TaxMasterService taxMasterService;

    private TaxMasterRequest request;

    @BeforeEach
    void setUp() {
        request = new TaxMasterRequest();
        request.setName("GST 18%");
        request.setGstPercent(new BigDecimal("18.00"));
    }

    @Test
    void createTax_Success() {
        TaxMaster savedTax = TaxMaster.builder().id(1L).name("GST 18%").gstPercent(new BigDecimal("18.00")).build();
        when(taxMasterRepository.save(any(TaxMaster.class))).thenReturn(savedTax);

        TaxMasterResponse response = taxMasterService.createTax(request, 100L);

        assertNotNull(response);
        assertEquals("GST 18%", response.getName());
        verify(activityRepository).save(any());
    }
}
