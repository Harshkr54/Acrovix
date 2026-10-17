package com.acrovix.admin.repository;

import com.acrovix.admin.entity.CompanyBankAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CompanyBankAccountRepository extends JpaRepository<CompanyBankAccount, Long> {
    List<CompanyBankAccount> findByIsActiveTrueOrderByIsDefaultDescIdAsc();
    List<CompanyBankAccount> findAllByOrderByIsDefaultDescIdAsc();
    Optional<CompanyBankAccount> findFirstByIsDefaultTrueAndIsActiveTrue();

    Optional<CompanyBankAccount> findFirstByTenantIdAndIsDefaultTrueAndIsActiveTrue(Long tenantId);
    Optional<CompanyBankAccount> findFirstByTenantIdAndIsActiveTrueOrderByIdAsc(Long tenantId);
    List<CompanyBankAccount> findByTenantIdAndIsActiveTrueOrderByIsDefaultDescIdAsc(Long tenantId);
    List<CompanyBankAccount> findAllByTenantIdOrderByIsDefaultDescIdAsc(Long tenantId);

    @Modifying
    @Query("UPDATE CompanyBankAccount b SET b.isDefault = false WHERE b.isDefault = true")
    void resetAllDefaults();

    @Modifying
    @Query("UPDATE CompanyBankAccount b SET b.isDefault = false WHERE b.tenantId = :tenantId AND b.isDefault = true")
    void resetAllDefaultsForTenant(@org.springframework.data.repository.query.Param("tenantId") Long tenantId);
}
