import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL, fetchApi } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const storedUser = localStorage.getItem('adminUser');
            if (storedUser) {
                try {
                    setUser(JSON.parse(storedUser));
                } catch (e) {
                    console.error("Failed to parse stored user", e);
                }
            }

            const token = localStorage.getItem('adminToken');
            if (token) {
                try {
                    const data = await fetchApi('/profile');
                    if (data && data.name) {
                        const userData = { 
                            name: data.name, 
                            email: data.email, 
                            role: data.role,
                            mustChangePassword: !!data.mustChangePassword,
                            tenantId: data.tenantId,
                            tenantSlug: data.tenantSlug
                        };
                        localStorage.setItem('adminUser', JSON.stringify(userData));
                        if (data.tenantSlug) {
                            localStorage.setItem('acrovix_tenant_slug', data.tenantSlug);
                        }
                        setUser(userData);
                    }
                } catch (err) {
                    console.error("Failed to sync profile on init:", err);
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const login = async (email, password, workspaceSlug = null) => {
        try {
            const payload = { email, password };
            const cleanSlug = workspaceSlug && workspaceSlug.trim() ? workspaceSlug.trim().toLowerCase() : null;
            if (cleanSlug) {
                payload.tenantSlug = cleanSlug;
                payload.workspaceSlug = cleanSlug;
            }

            const data = await fetchApi('/auth/login', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(cleanSlug ? { 'X-Tenant-Slug': cleanSlug } : {})
                },
                body: JSON.stringify(payload)
            });
            
            localStorage.setItem('adminToken', data.token);
            const userData = { 
                name: data.name, 
                email: data.email, 
                role: data.role,
                mustChangePassword: !!data.mustChangePassword,
                tenantId: data.tenantId,
                tenantSlug: data.tenantSlug
            };
            localStorage.setItem('adminUser', JSON.stringify(userData));
            const effectiveSlug = data.tenantSlug || cleanSlug || 'default';
            localStorage.setItem('acrovix_tenant_slug', effectiveSlug);
            localStorage.setItem('acrovix_last_activity', Date.now().toString());
            setUser(userData);
            window.dispatchEvent(new Event('auth-change'));
            return { success: true, tenantSlug: effectiveSlug, user: userData };
        } catch (error) {
            console.error("Login Error:", error.message);
            return { success: false, error: error.message };
        }
    };

    const setPasswordChangedSuccessfully = () => {
        setUser(prev => {
            if (!prev) return null;
            const updated = { ...prev, mustChangePassword: false };
            localStorage.setItem('adminUser', JSON.stringify(updated));
            return updated;
        });
    };

    const logout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        localStorage.removeItem('acrovix_last_activity');
        localStorage.setItem('acrovix_tenant_slug', 'default');
        document.title = "Acrovix Innovations | ERP & Operations Platform";
        setUser(null);
        window.dispatchEvent(new Event('auth-change'));
    };

    return (
        <AuthContext.Provider value={{ user, setUser, login, logout, loading, setPasswordChangedSuccessfully }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
