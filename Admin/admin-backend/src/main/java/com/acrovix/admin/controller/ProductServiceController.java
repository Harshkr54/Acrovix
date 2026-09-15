package com.acrovix.admin.controller;

import com.acrovix.admin.dto.ProductServiceRequest;
import com.acrovix.admin.dto.ProductServiceResponse;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.ProductServiceType;
import com.acrovix.admin.service.ProductServiceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/catalog")
@RequiredArgsConstructor
public class ProductServiceController {

    private final ProductServiceService catalogService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<Page<ProductServiceResponse>> getCatalog(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) ProductServiceType type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Page<ProductServiceResponse> catalog = catalogService.getCatalog(search, active, type, page, size);
        return ResponseEntity.ok(catalog);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<ProductServiceResponse> getCatalogItemById(@PathVariable Long id) {
        return ResponseEntity.ok(catalogService.getCatalogItemById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ProductServiceResponse> createCatalogItem(
            @Valid @RequestBody ProductServiceRequest request,
            @AuthenticationPrincipal AdminUser adminUser) {
        ProductServiceResponse created = catalogService.createCatalogItem(request, adminUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ProductServiceResponse> updateCatalogItem(
            @PathVariable Long id,
            @Valid @RequestBody ProductServiceRequest request,
            @AuthenticationPrincipal AdminUser adminUser) {
        ProductServiceResponse updated = catalogService.updateCatalogItem(id, request, adminUser.getId());
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> deleteCatalogItem(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser adminUser) {
        catalogService.deleteCatalogItem(id, adminUser.getId());
        return ResponseEntity.ok().build();
    }
    
    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> activateCatalogItem(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser adminUser) {
        catalogService.activateCatalogItem(id, adminUser.getId());
        return ResponseEntity.ok().build();
    }
}
