package com.acrovix.admin.controller;

import com.acrovix.admin.security.ratelimit.RateLimit;
import com.acrovix.admin.security.ratelimit.RateLimitCategory;
import com.acrovix.admin.util.PaginationUtil;
import com.acrovix.admin.dto.Customer360Response;
import com.acrovix.admin.service.Customer360Service;
import com.acrovix.admin.entity.AdminUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/customers")
@RequiredArgsConstructor
public class Customer360Controller {

    private final Customer360Service customer360Service;

    @GetMapping("/{id}/360")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SALES')")
    @Transactional(readOnly = true)
    public ResponseEntity<Customer360Response> getCustomer360(
            @PathVariable Long id,
            @AuthenticationPrincipal AdminUser admin) {
        Customer360Response response = customer360Service.getCustomer360(id, admin);
        return ResponseEntity.ok(response);
    }
}
