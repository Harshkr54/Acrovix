export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api/admin';

export const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};
