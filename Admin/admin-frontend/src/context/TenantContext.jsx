import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { fetchApi } from '../services/api';
import { formatCurrency as formatCurrencyUtil } from '../utils/formatters';
import { extractDominantColor } from '../utils/colorExtractor';

export { extractDominantColor };

const TenantContext = createContext(null);

const DEFAULT_BRANDING = {
    slug: 'default',
    companyName: 'Acrovix Innovations Private Limited',
    brandName: 'Acrovix Innovations',
    logoUrl: null,
    faviconUrl: null,
    primaryColor: '#2563EB',
    secondaryColor: '#1E40AF',
    currencyCode: 'INR',
    currencySymbol: '₹',
    status: 'ACTIVE',
    customDomain: null,
    isLoaded: false
};

const RESERVED_SUBDOMAINS = new Set([
    'admin', 'app', 'api', 'www', 'localhost', 'dev', 'staging', 'test', 'mail', 'portal'
]);

/**
 * Extracts the tenant workspace slug from:
 * 1. Subdomain (e.g. acme.domain.com -> 'acme')
 * 2. URL route /workspace/:slug or search params (?workspace=... or ?tenant=...)
 * 3. Stored admin user object in localStorage (active session takes priority)
 * 4. Active JWT token claims (tenant_slug / tenant_id)
 * 5. Local storage fallback ('acrovix_tenant_slug')
 */
export const resolveWorkspaceSlug = () => {
    if (typeof window !== 'undefined' && window.location) {
        // 1. Path matching /workspace/:slug (app.domain.com/workspace/:slug)
        const pathMatch = window.location.pathname.match(/^\/workspace\/([a-zA-Z0-9_-]+)/i);
        if (pathMatch && pathMatch[1]) {
            const pathSlug = pathMatch[1].trim().toLowerCase();
            if (pathSlug && !RESERVED_SUBDOMAINS.has(pathSlug)) {
                return pathSlug;
            }
        }

        // 2. Wildcard Subdomain parsing ({tenant-slug}.domain.com or {tenant-slug}.localhost)
        const hostname = window.location.hostname;
        if (hostname && !hostname.match(/^[0-9.]+$/)) {
            const parts = hostname.split('.');
            // If subdomain exists (e.g. acme.acrovix.com or acme.localhost)
            if (parts.length >= 3 || (parts.length === 2 && (parts[1] === 'localhost' || parts[1] === 'local'))) {
                const sub = parts[0].toLowerCase().trim();
                if (sub && !RESERVED_SUBDOMAINS.has(sub)) {
                    return sub;
                }
            }
        }

        // 3. URL search parameter (?workspace=... or ?tenant=...)
        const searchParams = new URLSearchParams(window.location.search);
        const querySlug = searchParams.get('workspace') || searchParams.get('tenant') || searchParams.get('slug');
        if (querySlug && querySlug.trim()) {
            return querySlug.trim().toLowerCase();
        }

        // 4. Universal /login route check (defaults to platform brand unless explicitly scoped)
        const pathname = window.location.pathname;
        if (pathname === '/login') {
            return 'default';
        }
    }

    // 5. Stored adminUser object (active authenticated session takes precedence over stale cache)
    try {
        const storedUser = localStorage.getItem('adminUser');
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            if (parsed?.email && (parsed.email.toLowerCase().endsWith('@acrovix.com') || parsed.email.toLowerCase() === 'sales@acrovix.com' || parsed.email.toLowerCase() === 'admin@acrovix.com')) {
                return 'default';
            }
            if (parsed?.tenantId === 1 || parsed?.tenantId === '1' || parsed?.tenantSlug === 'default') {
                return 'default';
            }
            if (parsed?.tenantSlug && parsed.tenantSlug.trim()) {
                return parsed.tenantSlug.trim().toLowerCase();
            }
        }
    } catch (_) {}

    // 6. Active JWT token claims
    try {
        const token = localStorage.getItem('adminToken');
        if (token && token.includes('.')) {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            const claims = JSON.parse(jsonPayload);
            if (claims?.tenant_id === 1 || claims?.tenantId === 1 || claims?.tenant_slug === 'default') {
                return 'default';
            }
            if (claims?.tenant_slug) return claims.tenant_slug.toLowerCase();
            if (claims?.tenantSlug) return claims.tenantSlug.toLowerCase();
        }
    } catch (_) {}

    // 7. Local storage fallback
    try {
        const storedSlug = localStorage.getItem('acrovix_tenant_slug');
        if (storedSlug && storedSlug.trim()) {
            return storedSlug.trim().toLowerCase();
        }
    } catch (_) {}

    return 'default';
};

export const TenantProvider = ({ children }) => {
    const [slug, setSlug] = useState(() => resolveWorkspaceSlug());
    const [tenant, setTenant] = useState(DEFAULT_BRANDING);
    const [loading, setLoading] = useState(true);

    const loadBranding = useCallback(async (targetSlug) => {
        const activeSlug = (targetSlug || slug || 'default').toLowerCase().trim();
        setLoading(true);

        try {
            const data = await fetchApi(`/api/public/tenants/${encodeURIComponent(activeSlug)}/branding`);
            if (data && data.companyName) {
                const isTenant1 = activeSlug === 'default' || data.slug === 'default';
                const resolvedCompanyName = isTenant1 ? 'Acrovix Innovations' : data.companyName;
                const resolvedBrandName = isTenant1 ? 'Acrovix Innovations' : (data.brandName || data.companyName || 'Acrovix Innovations');
                const brand = {
                    slug: data.slug || activeSlug,
                    companyName: resolvedCompanyName,
                    brandName: resolvedBrandName,
                    logoUrl: data.logoUrl || null,
                    faviconUrl: data.faviconUrl || null,
                    primaryColor: data.primaryColor || '#2563EB',
                    secondaryColor: data.secondaryColor || '#1E40AF',
                    currencyCode: data.currencyCode || 'INR',
                    currencySymbol: data.currencySymbol || '₹',
                    status: data.status || 'ACTIVE',
                    customDomain: data.customDomain || null,
                    isLoaded: true
                };
                setTenant(brand);
                try {
                    localStorage.setItem('acrovix_tenant_slug', activeSlug);
                } catch (_) {}
            } else {
                setTenant(prev => ({ ...prev, slug: activeSlug, isLoaded: true }));
            }
        } catch (err) {
            // Graceful fallback to default branding if tenant not found or offline
            setTenant(prev => ({
                ...DEFAULT_BRANDING,
                slug: activeSlug,
                isLoaded: true
            }));
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        loadBranding(slug);
    }, [slug, loadBranding]);

    // Synchronize slug and title on auth or storage updates
    useEffect(() => {
        const handleAuthOrStorageChange = () => {
            const currentSlug = resolveWorkspaceSlug();
            setSlug(currentSlug);
            loadBranding(currentSlug);
        };
        window.addEventListener('storage', handleAuthOrStorageChange);
        window.addEventListener('auth-change', handleAuthOrStorageChange);
        return () => {
            window.removeEventListener('storage', handleAuthOrStorageChange);
            window.removeEventListener('auth-change', handleAuthOrStorageChange);
        };
    }, [loadBranding]);

    // Dynamic Document Title and Favicon
    useEffect(() => {
        let activeTenantId = null;
        let activeTenantSlug = slug;
        try {
            const storedUser = localStorage.getItem('adminUser');
            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                activeTenantId = parsed?.tenantId;
                if (parsed?.tenantSlug) activeTenantSlug = parsed.tenantSlug;
            }
        } catch (_) {}

        const isDefaultWorkspace = 
            activeTenantId === 1 || 
            activeTenantId === '1' || 
            activeTenantSlug === 'default' || 
            tenant?.slug === 'default' || 
            !activeTenantSlug;

        if (isDefaultWorkspace) {
            document.title = "Acrovix Innovations | ERP & Operations Platform";
        } else if (tenant?.brandName || tenant?.companyName) {
            const brand = tenant.brandName || tenant.companyName;
            document.title = `${brand} | ERP & Operations Platform`;
        } else {
            document.title = "Acrovix Innovations | ERP & Operations Platform";
        }

        // Favicon link update
        if (tenant?.faviconUrl) {
            let link = document.querySelector("link[rel*='icon']");
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.head.appendChild(link);
            }
            link.href = tenant.faviconUrl;
        }
    }, [tenant, slug]);

    // Dynamic CSS Variables Injection
    useEffect(() => {
        if (!tenant) return;
        const root = document.documentElement;

        if (tenant.primaryColor) {
            root.style.setProperty('--primary-color', tenant.primaryColor);
            root.style.setProperty('--theme-brand-primary', tenant.primaryColor);
            root.style.setProperty('--color-primary', tenant.primaryColor);
        }
        if (tenant.secondaryColor) {
            root.style.setProperty('--secondary-color', tenant.secondaryColor);
            root.style.setProperty('--theme-color-secondary-accent', tenant.secondaryColor);
        }
    }, [tenant?.primaryColor, tenant?.secondaryColor]);

    const setWorkspaceSlug = useCallback((newSlug) => {
        if (!newSlug) return;
        const sanitized = newSlug.trim().toLowerCase();
        setSlug(sanitized);
        try {
            localStorage.setItem('acrovix_tenant_slug', sanitized);
        } catch (_) {}
        loadBranding(sanitized);
    }, [loadBranding]);

    const formatCurrency = useCallback((amount, decimals = 0) => {
        return formatCurrencyUtil(amount, tenant.currencyCode || 'INR', decimals);
    }, [tenant.currencyCode]);

    const isPlatformOwner = useCallback((user) => {
        if (!user || user.role !== 'SUPER_ADMIN') return false;
        // Tenant ID 1 is the Platform Owner workspace (Acrovix Innovations)
        const tId = user.tenantId;
        const tSlug = user.tenantSlug;
        return tId === 1 || tId === '1' || tSlug === 'default' || !tId;
    }, []);

    const value = useMemo(() => ({
        tenant,
        slug,
        loading,
        setWorkspaceSlug,
        refreshBranding: () => loadBranding(slug),
        formatCurrency,
        isPlatformOwner
    }), [tenant, slug, loading, setWorkspaceSlug, loadBranding, formatCurrency, isPlatformOwner]);

    return (
        <TenantContext.Provider value={value}>
            {children}
        </TenantContext.Provider>
    );
};

export const useTenant = () => {
    const context = useContext(TenantContext);
    if (!context) {
        throw new Error('useTenant must be used within a TenantProvider');
    }
    return context;
};

export default TenantContext;
