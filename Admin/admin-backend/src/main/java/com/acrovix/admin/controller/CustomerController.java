package com.acrovix.admin.controller;

import com.acrovix.admin.security.ratelimit.RateLimit;
import com.acrovix.admin.security.ratelimit.RateLimitCategory;
import com.acrovix.admin.util.PaginationUtil;
import com.acrovix.admin.dto.BulkCustomerOperationResponse;
import com.acrovix.admin.dto.BulkCustomerStatusRequest;
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

import com.acrovix.admin.entity.Currency;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/admin/customers")
public class CustomerController {

    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'SALES')")
    public ResponseEntity<Page<CustomerResponse>> getCustomers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) Currency currency,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal AdminUser admin) {
        search = com.acrovix.admin.util.PaginationUtil.getSafeSearch(search);
        
        Page<CustomerResponse> customers = customerService.getCustomers(search, active, currency, fromDate, toDate, page, PaginationUtil.getSafeSize(size), admin);
        return ResponseEntity.ok(customers);
    }

    @GetMapping("/next-code")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'SALES')")
    public ResponseEntity<java.util.Map<String, String>> getNextCustomerCode() {
        String nextCode = customerService.getNextCustomerCode();
        return ResponseEntity.ok(java.util.Map.of("customerCode", nextCode));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'SALES')")
    public ResponseEntity<CustomerResponse> getCustomerById(@PathVariable Long id, @AuthenticationPrincipal AdminUser admin) {
        return ResponseEntity.ok(customerService.getCustomerById(id, admin));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'SALES')")
    public ResponseEntity<CustomerResponse> createCustomer(
            @Valid @RequestBody CustomerRequest request,
            @AuthenticationPrincipal AdminUser adminUser) {
        CustomerResponse created = customerService.createCustomer(request, adminUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'SALES')")
    public ResponseEntity<CustomerResponse> updateCustomer(
            @PathVariable Long id,
            @Valid @RequestBody CustomerRequest request,
            @AuthenticationPrincipal AdminUser adminUser) {
        CustomerResponse updated = customerService.updateCustomer(id, request, adminUser);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<Void> deleteCustomer(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser adminUser) {
        customerService.deleteCustomer(id, adminUser);
        return ResponseEntity.ok().build();
    }
    
    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<Void> activateCustomer(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser adminUser) {
        customerService.activateCustomer(id, adminUser);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/bulk-status")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<BulkCustomerOperationResponse> bulkUpdateStatus(
            @Valid @RequestBody BulkCustomerStatusRequest request,
            @AuthenticationPrincipal AdminUser adminUser) {
        BulkCustomerOperationResponse response = customerService.bulkUpdateCustomerStatus(request, adminUser);
        return ResponseEntity.ok(response);
    }
}

