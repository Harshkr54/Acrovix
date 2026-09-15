package com.acrovix.admin.service;

import com.acrovix.admin.dto.ProductServiceRequest;
import com.acrovix.admin.dto.ProductServiceResponse;
import com.acrovix.admin.entity.ProductService;
import com.acrovix.admin.entity.ProductServiceType;
import com.acrovix.admin.exception.ResourceConflictException;
import com.acrovix.admin.repository.AdminActivityRepository;
import com.acrovix.admin.repository.ProductServiceRepository;
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
class ProductServiceServiceTest {

    @Mock
    private ProductServiceRepository catalogRepository;

    @Mock
    private AdminActivityRepository activityRepository;

    @InjectMocks
    private ProductServiceService catalogService;

    private ProductServiceRequest request;

    @BeforeEach
    void setUp() {
        request = new ProductServiceRequest();
        request.setSku("SKU-001");
        request.setName("Service A");
        request.setType(ProductServiceType.SERVICE);
        request.setDefaultRate(new BigDecimal("100.00"));
    }

    @Test
    void createCatalogItem_Success() {
        when(catalogRepository.findBySku(request.getSku())).thenReturn(Optional.empty());
        ProductService savedItem = ProductService.builder().id(1L).sku("SKU-001").name("Service A").build();
        when(catalogRepository.save(any(ProductService.class))).thenReturn(savedItem);

        ProductServiceResponse response = catalogService.createCatalogItem(request, 100L);

        assertNotNull(response);
        assertEquals("SKU-001", response.getSku());
        verify(activityRepository).save(any());
    }

    @Test
    void createCatalogItem_DuplicateSku() {
        when(catalogRepository.findBySku(request.getSku())).thenReturn(Optional.of(new ProductService()));

        assertThrows(ResourceConflictException.class, () -> catalogService.createCatalogItem(request, 100L));
    }
}
