package com.acrovix.admin.repository;

import com.acrovix.admin.entity.Tenant;
import com.acrovix.admin.entity.TenantSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TenantSubscriptionRepository extends JpaRepository<TenantSubscription, Long> {

    @Query("SELECT s FROM TenantSubscription s WHERE s.tenant.id = :tenantId")
    Optional<TenantSubscription> findByTenantId(@Param("tenantId") Long tenantId);

    Optional<TenantSubscription> findByTenant(Tenant tenant);

    void deleteByTenant(Tenant tenant);
}
