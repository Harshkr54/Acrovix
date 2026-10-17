package com.acrovix.admin.tenant;

import java.util.Objects;
import java.util.function.Supplier;

/**
 * ThreadLocal-based context holder for current active tenant ID.
 * Guarantees zero cross-thread tenant leakage when properly cleared in filter finally-blocks.
 */
public final class TenantContext {

    private static final ThreadLocal<Long> CURRENT_TENANT_ID = new ThreadLocal<>();
    private static final ThreadLocal<Boolean> BYPASS_RLS = ThreadLocal.withInitial(() -> false);

    private TenantContext() {
    }

    public static void setBypassRls(boolean bypass) {
        if (bypass) {
            BYPASS_RLS.set(true);
        } else {
            BYPASS_RLS.remove();
        }
    }

    public static boolean isBypassRls() {
        return Boolean.TRUE.equals(BYPASS_RLS.get());
    }

    public static <T> T callWithBypassRls(Supplier<T> supplier) {
        Objects.requireNonNull(supplier, "Supplier cannot be null");
        boolean previousBypass = isBypassRls();
        try {
            setBypassRls(true);
            return supplier.get();
        } finally {
            setBypassRls(previousBypass);
        }
    }

    public static void setTenantId(Long tenantId) {
        if (tenantId == null) {
            clear();
        } else {
            CURRENT_TENANT_ID.set(tenantId);
        }
    }

    public static Long getTenantId() {
        return CURRENT_TENANT_ID.get();
    }

    public static Long requireTenantId() {
        Long tenantId = getTenantId();
        if (tenantId == null) {
            throw new IllegalStateException("Tenant context missing: No active tenant resolved for this operation.");
        }
        return tenantId;
    }

    public static void clear() {
        CURRENT_TENANT_ID.remove();
    }

    public static void runWithTenant(Long tenantId, Runnable runnable) {
        Objects.requireNonNull(runnable, "Runnable cannot be null");
        Long previousTenantId = getTenantId();
        try {
            setTenantId(tenantId);
            runnable.run();
        } finally {
            setTenantId(previousTenantId);
        }
    }

    public static <T> T callWithTenant(Long tenantId, Supplier<T> supplier) {
        Objects.requireNonNull(supplier, "Supplier cannot be null");
        Long previousTenantId = getTenantId();
        try {
            setTenantId(tenantId);
            return supplier.get();
        } finally {
            setTenantId(previousTenantId);
        }
    }
}
