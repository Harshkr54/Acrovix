package com.acrovix.admin.security;

import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.Role;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Evaluates tenant security expressions for Spring Method Security (@PreAuthorize).
 * Strictly guards Platform Owner operations to Tenant 1 Super Admins.
 */
@Component("tenantSecurity")
public class TenantSecurityService {

    public static final Long PLATFORM_OWNER_TENANT_ID = 1L;

    public boolean isPlatformOwner(Object principal) {
        if (principal instanceof AdminUser user) {
            return user.getRole() == Role.SUPER_ADMIN && PLATFORM_OWNER_TENANT_ID.equals(user.getTenantId());
        }
        return false;
    }

    public boolean isPlatformOwner() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AdminUser user) {
            return isPlatformOwner(user);
        }
        return false;
    }

    public boolean isCompanyAdminOrAbove(Object principal) {
        if (principal instanceof AdminUser user) {
            return user.getRole() == Role.SUPER_ADMIN || user.getRole() == Role.COMPANY_ADMIN;
        }
        return false;
    }
}
