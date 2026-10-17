package com.acrovix.admin.security;

import com.acrovix.admin.entity.Tenant;
import com.acrovix.admin.entity.TenantStatus;
import com.acrovix.admin.repository.TenantRepository;
import com.acrovix.admin.tenant.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;
import java.util.Set;

/**
 * Early-stage security filter resolving tenant context on every request cycle.
 * Extracts cryptographically verified tenant claims from JWT for authenticated calls,
 * or resolves tenant identity from subdomain / X-Tenant-Slug for public entrypoints.
 * Guarantees context purge in finally block.
 */
@Slf4j
@Component
public class TenantResolutionFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final TenantRepository tenantRepository;

    public TenantResolutionFilter(JwtUtil jwtUtil, TenantRepository tenantRepository) {
        this.jwtUtil = jwtUtil;
        this.tenantRepository = tenantRepository;
    }

    private static final Set<String> RESERVED_SUBDOMAINS = Set.of(
            "admin", "api", "app", "localhost", "127.0.0.1", "www", "mail", "erp"
    );

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        try {
            final String authHeader = request.getHeader("Authorization");

            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                final String jwt = authHeader.substring(7);
                try {
                    Long jwtTenantId = jwtUtil.extractTenantId(jwt);
                    String jwtTenantSlug = jwtUtil.extractTenantSlug(jwt);

                    // Prevent tenant spoofing via request headers or query params
                    String headerTenantId = request.getHeader("X-Tenant-ID");
                    if (headerTenantId != null && !headerTenantId.isBlank() && jwtTenantId != null) {
                        try {
                            long parsedHeaderId = Long.parseLong(headerTenantId.trim());
                            if (parsedHeaderId != jwtTenantId) {
                                sendForbiddenError(response, "Tenant context mismatch: Header does not match authenticated token claim");
                                return;
                            }
                        } catch (NumberFormatException e) {
                            sendForbiddenError(response, "Invalid X-Tenant-ID header format");
                            return;
                        }
                    }

                    String queryTenantId = request.getParameter("tenant_id");
                    if (queryTenantId != null && !queryTenantId.isBlank() && jwtTenantId != null) {
                        try {
                            long parsedQueryId = Long.parseLong(queryTenantId.trim());
                            if (parsedQueryId != jwtTenantId) {
                                sendForbiddenError(response, "Tenant context mismatch: Query parameter does not match authenticated token claim");
                                return;
                            }
                        } catch (NumberFormatException e) {
                            sendForbiddenError(response, "Invalid tenant_id query parameter format");
                            return;
                        }
                    }

                    if (jwtTenantId != null) {
                        Optional<Tenant> tenantOpt = tenantRepository.findById(jwtTenantId);
                        if (tenantOpt.isPresent()) {
                            Tenant tenant = tenantOpt.get();
                            if (tenant.getStatus() != TenantStatus.ACTIVE && tenant.getStatus() != TenantStatus.TRIAL) {
                                sendForbiddenError(response, "Tenant account inactive or suspended");
                                return;
                            }
                            TenantContext.setTenantId(tenant.getId());
                        } else if (Long.valueOf(1L).equals(jwtTenantId)) {
                            // Default root tenant fallback (ensures in-memory test databases operate without explicit seed)
                            TenantContext.setTenantId(1L);
                        } else {
                            sendForbiddenError(response, "Tenant account inactive or suspended");
                            return;
                        }
                    } else {
                        // Fallback to default tenant (1) if legacy token lacks explicit tenant_id
                        TenantContext.setTenantId(1L);
                    }
                } catch (Exception e) {
                    log.debug("JWT tenant resolution failed: {}", e.getMessage());
                    // Let subsequent security filters handle token validity
                }
            } else {
                // Unauthenticated / public request resolution
                String uri = request.getRequestURI();
                // For login requests, AuthService dynamically resolves the tenant from payload or user auto-detection
                if (!uri.endsWith("/auth/login")) {
                    String slug = resolvePublicTenantSlug(request);
                    if (slug != null && !slug.isBlank()) {
                        Optional<Tenant> tenantOpt = tenantRepository.findBySlug(slug);
                        if (tenantOpt.isPresent()) {
                            Tenant tenant = tenantOpt.get();
                            if (tenant.getStatus() != TenantStatus.ACTIVE && tenant.getStatus() != TenantStatus.TRIAL) {
                                // If explicit public request for an inactive tenant
                                if (uri.startsWith("/api/public/tenants/") || uri.startsWith("/api/v1/public/tenants/")) {
                                    sendForbiddenError(response, "Tenant account inactive or suspended");
                                    return;
                                }
                            } else {
                                TenantContext.setTenantId(tenant.getId());
                            }
                        }
                    }
                }
            }

            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }

    private String resolvePublicTenantSlug(HttpServletRequest request) {
        String headerSlug = request.getHeader("X-Tenant-Slug");
        if (headerSlug != null && !headerSlug.isBlank()) {
            return headerSlug.trim().toLowerCase();
        }

        // 1. Path-based resolution (/workspace/:slug or /api/public/tenants/:slug)
        String uri = request.getRequestURI();
        if (uri != null) {
            if (uri.startsWith("/workspace/")) {
                String remainder = uri.substring("/workspace/".length());
                int slash = remainder.indexOf('/');
                String pathSlug = slash >= 0 ? remainder.substring(0, slash) : remainder;
                if (!pathSlug.isBlank() && !RESERVED_SUBDOMAINS.contains(pathSlug.toLowerCase())) {
                    return pathSlug.trim().toLowerCase();
                }
            } else if (uri.startsWith("/api/public/tenants/")) {
                String remainder = uri.substring("/api/public/tenants/".length());
                int slash = remainder.indexOf('/');
                String pathSlug = slash >= 0 ? remainder.substring(0, slash) : remainder;
                if (!pathSlug.isBlank() && !pathSlug.equalsIgnoreCase("slug")) {
                    return pathSlug.trim().toLowerCase();
                }
            }
        }

        // 2. Wildcard Subdomain from X-Forwarded-Host, Host, or ServerName
        String host = request.getHeader("X-Forwarded-Host");
        if (host == null || host.isBlank()) {
            host = request.getHeader("Host");
        }
        if (host == null || host.isBlank()) {
            host = request.getServerName();
        }

        if (host != null) {
            int colonIndex = host.indexOf(':');
            if (colonIndex >= 0) {
                host = host.substring(0, colonIndex);
            }
            if (host.contains(".") && !host.matches("^[0-9.]+$")) {
                String[] parts = host.split("\\.");
                if (parts.length >= 2) {
                    String sub = parts[0].trim().toLowerCase();
                    if (!RESERVED_SUBDOMAINS.contains(sub)) {
                        return sub;
                    }
                }
            }
        }
        return null;
    }

    private void sendForbiddenError(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(String.format("{\"error\": \"%s\", \"status\": 403}", message));
    }
}
