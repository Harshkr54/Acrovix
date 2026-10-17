package com.acrovix.admin.repository;

import com.acrovix.admin.entity.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TenantRepository extends JpaRepository<Tenant, Long> {
    Optional<Tenant> findBySlug(String slug);
    Optional<Tenant> findByCustomDomain(String customDomain);
    boolean existsBySlug(String slug);
}
