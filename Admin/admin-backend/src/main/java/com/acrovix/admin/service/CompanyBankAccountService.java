package com.acrovix.admin.service;

import com.acrovix.admin.dto.CompanyBankAccountRequest;
import com.acrovix.admin.dto.CompanyBankAccountResponse;
import com.acrovix.admin.dto.CompanySettingsResponse;
import com.acrovix.admin.entity.CompanyBankAccount;
import com.acrovix.admin.exception.ResourceNotFoundException;
import com.acrovix.admin.repository.CompanyBankAccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CompanyBankAccountService {

    private final CompanyBankAccountRepository bankAccountRepository;
    private final CompanySettingsService companySettingsService;

    @Transactional(readOnly = true)
    public List<CompanyBankAccountResponse> getActiveBankAccounts() {
        List<CompanyBankAccount> accounts = bankAccountRepository.findByIsActiveTrueOrderByIsDefaultDescIdAsc();
        if (!accounts.isEmpty()) {
            return accounts.stream().map(this::mapToResponse).collect(Collectors.toList());
        }

        // Seamless fallback to legacy CompanySettings bank details if accounts table is empty
        CompanySettingsResponse settings = companySettingsService.getCompanySettings();
        if (settings != null && settings.getBankAccountNumber() != null && !settings.getBankAccountNumber().isBlank()) {
            List<CompanyBankAccountResponse> fallbackList = new ArrayList<>();
            fallbackList.add(CompanyBankAccountResponse.builder()
                    .id(1L)
                    .bankName(settings.getBankName() != null ? settings.getBankName() : "Bank Account")
                    .accountHolder(settings.getCompanyName() != null && !settings.getCompanyName().isBlank()
                            ? settings.getCompanyName() : "ACROVIX INNOVATIONS PRIVATE LIMITED")
                    .bankAccountNumber(settings.getBankAccountNumber())
                    .maskedAccountNumber(CompanyBankAccountResponse.maskAccountNumber(settings.getBankAccountNumber()))
                    .bankIfsc(settings.getBankIfsc() != null ? settings.getBankIfsc() : "")
                    .bankBranch(settings.getBankBranch() != null ? settings.getBankBranch() : "")
                    .isDefault(true)
                    .isActive(true)
                    .build());
            return fallbackList;
        }

        return List.of();
    }

    @Transactional(readOnly = true)
    public List<CompanyBankAccountResponse> getAllBankAccounts() {
        List<CompanyBankAccount> accounts = bankAccountRepository.findAllByOrderByIsDefaultDescIdAsc();
        if (!accounts.isEmpty()) {
            return accounts.stream().map(this::mapToResponse).collect(Collectors.toList());
        }
        return getActiveBankAccounts();
    }

    @Transactional(readOnly = true)
    public CompanyBankAccountResponse getBankAccountById(Long id) {
        CompanyBankAccount account = bankAccountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found: " + id));
        return mapToResponse(account);
    }

    @Transactional
    public CompanyBankAccountResponse createBankAccount(CompanyBankAccountRequest request) {
        boolean makeDefault = Boolean.TRUE.equals(request.getIsDefault());

        // Rule 4 & 5: If no default account exists, ensure the first active account becomes default
        long activeCount = bankAccountRepository.findByIsActiveTrueOrderByIsDefaultDescIdAsc().size();
        if (activeCount == 0 && (request.getIsActive() == null || Boolean.TRUE.equals(request.getIsActive()))) {
            makeDefault = true;
        }

        if (makeDefault) {
            bankAccountRepository.resetAllDefaults();
        }

        CompanyBankAccount account = CompanyBankAccount.builder()
                .bankName(request.getBankName().trim())
                .accountHolder(request.getAccountHolder().trim())
                .bankAccountNumber(request.getBankAccountNumber().trim())
                .bankIfsc(request.getBankIfsc().trim())
                .bankBranch(request.getBankBranch() != null ? request.getBankBranch().trim() : null)
                .isDefault(makeDefault)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();

        CompanyBankAccount saved = bankAccountRepository.save(account);
        return mapToResponse(saved);
    }

    @Transactional
    public CompanyBankAccountResponse updateBankAccount(Long id, CompanyBankAccountRequest request) {
        CompanyBankAccount existing = bankAccountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found: " + id));

        boolean willBeDefault = Boolean.TRUE.equals(request.getIsDefault());
        if (willBeDefault && !Boolean.TRUE.equals(existing.getIsDefault())) {
            // Cannot make inactive account default (Rule 6)
            boolean targetActive = request.getIsActive() != null ? request.getIsActive() : Boolean.TRUE.equals(existing.getIsActive());
            if (!targetActive) {
                throw new IllegalArgumentException("An inactive bank account cannot be set as default.");
            }
            bankAccountRepository.resetAllDefaults();
        }

        existing.setBankName(request.getBankName().trim());
        existing.setAccountHolder(request.getAccountHolder().trim());
        existing.setBankAccountNumber(request.getBankAccountNumber().trim());
        existing.setBankIfsc(request.getBankIfsc().trim());
        existing.setBankBranch(request.getBankBranch() != null ? request.getBankBranch().trim() : null);
        if (request.getIsDefault() != null) existing.setIsDefault(willBeDefault);
        if (request.getIsActive() != null) existing.setIsActive(request.getIsActive());

        CompanyBankAccount updated = bankAccountRepository.save(existing);
        return mapToResponse(updated);
    }

    @Transactional
    public CompanyBankAccountResponse setAsDefault(Long id) {
        CompanyBankAccount target = bankAccountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found: " + id));

        if (!Boolean.TRUE.equals(target.getIsActive())) {
            throw new IllegalArgumentException("Cannot set an inactive account as default.");
        }

        bankAccountRepository.resetAllDefaults();
        target.setIsDefault(true);
        CompanyBankAccount saved = bankAccountRepository.save(target);
        return mapToResponse(saved);
    }

    @Transactional
    public CompanyBankAccountResponse deactivateAccount(Long id) {
        CompanyBankAccount existing = bankAccountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found: " + id));

        boolean wasDefault = Boolean.TRUE.equals(existing.getIsDefault());
        existing.setIsActive(false);
        existing.setIsDefault(false);
        CompanyBankAccount updated = bankAccountRepository.save(existing);

        // Rule 7: If the default account is deactivated, auto-assign next available active account as default
        if (wasDefault) {
            List<CompanyBankAccount> remainingActive = bankAccountRepository.findByIsActiveTrueOrderByIsDefaultDescIdAsc();
            if (!remainingActive.isEmpty()) {
                CompanyBankAccount nextDefault = remainingActive.get(0);
                nextDefault.setIsDefault(true);
                bankAccountRepository.save(nextDefault);
            }
        }

        return mapToResponse(updated);
    }

    @Transactional
    public void deleteBankAccount(Long id) {
        deactivateAccount(id);
    }

    public CompanyBankAccountResponse mapToResponse(CompanyBankAccount entity) {
        if (entity == null) return null;
        return CompanyBankAccountResponse.builder()
                .id(entity.getId())
                .bankName(entity.getBankName())
                .accountHolder(entity.getAccountHolder())
                .bankAccountNumber(entity.getBankAccountNumber())
                .maskedAccountNumber(CompanyBankAccountResponse.maskAccountNumber(entity.getBankAccountNumber()))
                .bankIfsc(entity.getBankIfsc())
                .bankBranch(entity.getBankBranch())
                .isDefault(Boolean.TRUE.equals(entity.getIsDefault()))
                .isActive(Boolean.TRUE.equals(entity.getIsActive()))
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
