package com.acrovix.admin.repository;

import com.acrovix.admin.entity.CompanySettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CompanySettingsRepository extends JpaRepository<CompanySettings, Long> {
    Optional<CompanySettings> findByTenantId(Long tenantId);
    Optional<CompanySettings> findFirstByTenantIdOrderByIdAsc(Long tenantId);
    Optional<CompanySettings> findFirstByOrderByIdAsc();
    Optional<CompanySettings> findByTenantIdAndId(Long tenantId, Long id);
    void deleteByTenantIdAndId(Long tenantId, Long id);
}
