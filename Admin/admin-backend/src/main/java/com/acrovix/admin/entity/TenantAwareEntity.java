package com.acrovix.admin.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.Setter;

/**
 * Abstract mapped superclass for all multi-tenant scoped database entities.
 * Automatically receives tenant_id via TenantEntityListener on persist.
 */
@MappedSuperclass
@EntityListeners(TenantEntityListener.class)
@Getter
@Setter
public abstract class TenantAwareEntity {

    @Column(name = "tenant_id", nullable = false, updatable = false)
    private Long tenantId;
}
