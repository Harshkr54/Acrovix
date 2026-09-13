export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api/admin';

export const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

export const fetchApi = async (endpoint, options = {}) => {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const defaultHeaders = getAuthHeaders();
    
    // Prevent overriding Authorization unless explicitly provided
    const headers = {
        ...defaultHeaders,
        ...(options.headers || {})
    };

    const finalOptions = {
        ...options,
        headers
    };

    try {
        const response = await fetch(url, finalOptions);

        if (!response.ok) {
            // Check for 401 Unauthorized
            if (response.status === 401) {
                // If it's a password change, we handle it gracefully inside the component.
                // Otherwise, it's a session expiration.
                if (!url.includes('/profile/password')) {
                    localStorage.removeItem('adminToken');
                    localStorage.removeItem('adminUser');
                    window.location.href = '/login';
                }
            }

            // Attempt to parse JSON error from backend
            let errorMessage = 'An unexpected error occurred';
            try {
                const text = await response.text();
                if (text && text.trim().length > 0) {
                    const errorData = JSON.parse(text);
                    if (errorData.message) {
                        errorMessage = errorData.message;
                    } else if (errorData.error) {
                        errorMessage = errorData.error;
                    }
                }
            } catch (e) {
                // Fallback to HTTP status messages below
            }

            if (errorMessage === 'An unexpected error occurred') {
                if (response.status === 400) errorMessage = "Please check the information you entered.";
                else if (response.status === 401) errorMessage = "Your session has expired or unauthorized.";
                else if (response.status === 403) errorMessage = "You do not have permission to perform this action.";
                else if (response.status === 404) errorMessage = "The requested item could not be found.";
                else if (response.status === 409) errorMessage = "The requested change conflicts with existing data.";
                else if (response.status === 500) errorMessage = "Something went wrong on the server. Please try again.";
            }
            
            const error = new Error(errorMessage);
            error.status = response.status;
            throw error;
        }

        // Return empty object for 204 No Content
        if (response.status === 204) {
            return {};
        }

        // Return response object for PDF endpoints
        if (url.includes('/pdf')) {
            return response;
        }

        // Read text first to safely handle empty bodies on 200/201
        const text = await response.text();
        if (!text || text.trim() === '') {
            return {};
        }

        try {
            return JSON.parse(text);
        } catch (e) {
            return {};
        }
    } catch (error) {
        // Network failures or manually thrown errors
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            throw new Error('Network error. Please check your connection.');
        }
        throw error;
    }
};
