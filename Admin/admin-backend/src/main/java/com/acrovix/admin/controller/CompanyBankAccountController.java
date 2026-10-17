package com.acrovix.admin.controller;

import com.acrovix.admin.dto.CompanyBankAccountRequest;
import com.acrovix.admin.dto.CompanyBankAccountResponse;
import com.acrovix.admin.service.CompanyBankAccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/admin/company-settings/bank-accounts", "/api/admin/company-bank-accounts"})
@RequiredArgsConstructor
public class CompanyBankAccountController {

    private final CompanyBankAccountService bankAccountService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'SALES', 'EDITOR')")
    public ResponseEntity<List<CompanyBankAccountResponse>> getBankAccounts() {
        return ResponseEntity.ok(bankAccountService.getActiveBankAccounts());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<CompanyBankAccountResponse> getBankAccountById(@PathVariable Long id) {
        return ResponseEntity.ok(bankAccountService.getBankAccountById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<CompanyBankAccountResponse> createBankAccount(@Valid @RequestBody CompanyBankAccountRequest request) {
        return ResponseEntity.ok(bankAccountService.createBankAccount(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<CompanyBankAccountResponse> updateBankAccount(@PathVariable Long id, @Valid @RequestBody CompanyBankAccountRequest request) {
        return ResponseEntity.ok(bankAccountService.updateBankAccount(id, request));
    }

    @PatchMapping("/{id}/default")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<CompanyBankAccountResponse> setDefaultAccount(@PathVariable Long id) {
        return ResponseEntity.ok(bankAccountService.setAsDefault(id));
    }

    @PatchMapping("/{id}/deactivate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<CompanyBankAccountResponse> deactivateAccount(@PathVariable Long id) {
        return ResponseEntity.ok(bankAccountService.deactivateAccount(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<Void> deleteBankAccount(@PathVariable Long id) {
        bankAccountService.deleteBankAccount(id);
        return ResponseEntity.noContent().build();
    }
}
