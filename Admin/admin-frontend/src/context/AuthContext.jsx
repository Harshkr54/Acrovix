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
                        const userData = { name: data.name, email: data.email, role: data.role };
                        localStorage.setItem('adminUser', JSON.stringify(userData));
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

    const login = async (email, password) => {
        try {
            const data = await fetchApi('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            localStorage.setItem('adminToken', data.token);
            const userData = { name: data.name, email: data.email, role: data.role };
            localStorage.setItem('adminUser', JSON.stringify(userData));
            setUser(userData);
            return true;
        } catch (error) {
            console.error("Login Error:", error.message);
            return false;
        }
    };

    const logout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
