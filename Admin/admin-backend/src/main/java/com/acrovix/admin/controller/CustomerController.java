package com.acrovix.admin.controller;


import com.acrovix.admin.security.ratelimit.RateLimit;
import com.acrovix.admin.security.ratelimit.RateLimitCategory;
import com.acrovix.admin.util.PaginationUtil;
import com.acrovix.admin.dto.CustomerRequest;
import com.acrovix.admin.dto.CustomerResponse;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<Page<CustomerResponse>> getCustomers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        search = com.acrovix.admin.util.PaginationUtil.getSafeSearch(search);
        
        Page<CustomerResponse> customers = customerService.getCustomers(search, active, page, size);
        return ResponseEntity.ok(customers);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<CustomerResponse> getCustomerById(@PathVariable Long id) {
        return ResponseEntity.ok(customerService.getCustomerById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<CustomerResponse> createCustomer(
            @Valid @RequestBody CustomerRequest request,
            @AuthenticationPrincipal AdminUser adminUser) {
        CustomerResponse created = customerService.createCustomer(request, adminUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<CustomerResponse> updateCustomer(
            @PathVariable Long id,
            @Valid @RequestBody CustomerRequest request,
            @AuthenticationPrincipal AdminUser adminUser) {
        CustomerResponse updated = customerService.updateCustomer(id, request, adminUser.getId());
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<Void> deleteCustomer(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser adminUser) {
        customerService.deleteCustomer(id, adminUser.getId());
        return ResponseEntity.ok().build();
    }
    
    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    public ResponseEntity<Void> activateCustomer(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser adminUser) {
        customerService.activateCustomer(id, adminUser.getId());
        return ResponseEntity.ok().build();
    }
}
