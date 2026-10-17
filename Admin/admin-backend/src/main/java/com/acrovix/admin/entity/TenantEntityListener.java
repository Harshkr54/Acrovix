package com.acrovix.admin.entity;

import com.acrovix.admin.tenant.TenantContext;
import jakarta.persistence.PrePersist;
import lombok.extern.slf4j.Slf4j;

/**
 * JPA EntityListener that automatically injects tenant_id into TenantAwareEntity
 * instances prior to database persistence, guaranteeing consistent scoping.
 */
@Slf4j
public class TenantEntityListener {

    @PrePersist
    public void setTenantId(Object entity) {
        if (entity instanceof TenantAwareEntity tenantAware) {
            if (tenantAware.getTenantId() == null) {
                Long parentTenantId = resolveParentTenantId(entity);
                if (parentTenantId != null) {
                    tenantAware.setTenantId(parentTenantId);
                    return;
                }

                Long activeTenantId = TenantContext.getTenantId();
                if (activeTenantId != null) {
                    tenantAware.setTenantId(activeTenantId);
                } else {
                    log.warn("Persisting TenantAwareEntity {} without an active TenantContext. Defaulting to root tenant (1L).",
                            entity.getClass().getSimpleName());
                    tenantAware.setTenantId(1L);
                }
            }
        }
    }

    private Long resolveParentTenantId(Object entity) {
        if (entity instanceof QuotationItem qi && qi.getQuotation() != null) {
            return qi.getQuotation().getTenantId();
        }
        if (entity instanceof QuotationColumnConfig qcc && qcc.getQuotation() != null) {
            return qcc.getQuotation().getTenantId();
        }
        if (entity instanceof InvoiceItem ii && ii.getInvoice() != null) {
            return ii.getInvoice().getTenantId();
        }
        if (entity instanceof CrmFollowUp cfu && cfu.getLead() != null) {
            return cfu.getLead().getTenantId();
        }
        if (entity instanceof Payment payment && payment.getInvoice() != null) {
            return payment.getInvoice().getTenantId();
        }
        return null;
    }
}
