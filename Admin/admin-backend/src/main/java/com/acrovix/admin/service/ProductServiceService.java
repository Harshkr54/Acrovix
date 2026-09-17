package com.acrovix.admin.service;

import com.acrovix.admin.dto.ProductServiceRequest;
import com.acrovix.admin.dto.ProductServiceResponse;
import com.acrovix.admin.entity.AdminActivity;
import com.acrovix.admin.entity.Currency;
import com.acrovix.admin.entity.ProductService;
import com.acrovix.admin.entity.ProductServiceType;
import com.acrovix.admin.exception.ResourceConflictException;
import com.acrovix.admin.exception.ResourceNotFoundException;
import com.acrovix.admin.repository.AdminActivityRepository;
import com.acrovix.admin.repository.ProductServiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductServiceService {

    private final ProductServiceRepository catalogRepository;
    private final AdminActivityRepository activityRepository;

    @Transactional(readOnly = true)
    public Page<ProductServiceResponse> getCatalog(String search, Boolean active, ProductServiceType type, int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<ProductService> catalog = catalogRepository.searchCatalog(search, active, type, pageRequest);

        List<ProductServiceResponse> responseList = catalog.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return new PageImpl<>(responseList, pageRequest, catalog.getTotalElements());
    }

    @Transactional(readOnly = true)
    public ProductServiceResponse getCatalogItemById(Long id) {
        return mapToResponse(catalogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Catalog item not found with id: " + id)));
    }

    @Transactional
    public ProductServiceResponse createCatalogItem(ProductServiceRequest request, Long adminId) {
        if (catalogRepository.findBySku(request.getSku()).isPresent()) {
            throw new ResourceConflictException("SKU already exists: " + request.getSku());
        }

        ProductService item = ProductService.builder()
                .sku(request.getSku())
                .name(request.getName())
                .description(request.getDescription())
                .currency(request.getCurrency() != null ? request.getCurrency() : Currency.INR)
                .type(request.getType())
                .hsnSac(request.getHsnSac())
                .defaultRate(request.getDefaultRate())
                .defaultGstPercent(request.getDefaultGstPercent())
                .unit(request.getUnit())
                .active(true)
                .createdBy(adminId)
                .build();

        ProductService savedItem = catalogRepository.save(item);
        logActivity(adminId, "CATALOG_ITEM_CREATED", savedItem.getId(), "Created catalog item: " + savedItem.getName());

        return mapToResponse(savedItem);
    }

    @Transactional
    public ProductServiceResponse updateCatalogItem(Long id, ProductServiceRequest request, Long adminId) {
        ProductService item = catalogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Catalog item not found with id: " + id));

        if (!item.getSku().equals(request.getSku()) &&
                catalogRepository.findBySku(request.getSku()).isPresent()) {
            throw new ResourceConflictException("SKU already exists: " + request.getSku());
        }

        item.setSku(request.getSku());
        item.setName(request.getName());
        item.setDescription(request.getDescription());
        if (request.getCurrency() != null) {
            item.setCurrency(request.getCurrency());
        }
        item.setType(request.getType());
        item.setHsnSac(request.getHsnSac());
        item.setDefaultRate(request.getDefaultRate());
        item.setDefaultGstPercent(request.getDefaultGstPercent());
        item.setUnit(request.getUnit());
        item.setUpdatedBy(adminId);

        ProductService updatedItem = catalogRepository.save(item);
        logActivity(adminId, "CATALOG_ITEM_UPDATED", updatedItem.getId(), "Updated catalog item: " + updatedItem.getName());

        return mapToResponse(updatedItem);
    }

    @Transactional
    public void deleteCatalogItem(Long id, Long adminId) {
        ProductService item = catalogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Catalog item not found with id: " + id));

        item.setActive(false);
        item.setUpdatedBy(adminId);
        catalogRepository.save(item);

        logActivity(adminId, "CATALOG_ITEM_DEACTIVATED", item.getId(), "Deactivated catalog item: " + item.getName());
    }
    
    @Transactional
    public void activateCatalogItem(Long id, Long adminId) {
        ProductService item = catalogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Catalog item not found with id: " + id));

        item.setActive(true);
        item.setUpdatedBy(adminId);
        catalogRepository.save(item);

        logActivity(adminId, "CATALOG_ITEM_ACTIVATED", item.getId(), "Activated catalog item: " + item.getName());
    }

    private ProductServiceResponse mapToResponse(ProductService item) {
        return ProductServiceResponse.builder()
                .id(item.getId())
                .currency(item.getCurrency())
                .sku(item.getSku())
                .name(item.getName())
                .description(item.getDescription())
                .type(item.getType())
                .hsnSac(item.getHsnSac())
                .defaultRate(item.getDefaultRate())
                .defaultGstPercent(item.getDefaultGstPercent())
                .unit(item.getUnit())
                .active(item.isActive())
                .createdBy(item.getCreatedBy())
                .updatedBy(item.getUpdatedBy())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }

    private void logActivity(Long adminId, String action, Long entityId, String description) {
        AdminActivity activity = AdminActivity.builder()
                .adminUserId(adminId)
                .action(action)
                .entityType("CATALOG")
                .entityId(entityId)
                .description(description)
                .build();
        activityRepository.save(activity);
    }
}
