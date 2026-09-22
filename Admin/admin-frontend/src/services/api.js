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

            // Safe error mapping for known statuses
            let finalMessage = errorMessage;
            let dispatchToast = false;

            if (response.status >= 500) {
                finalMessage = "Something went wrong. Please try again.";
                dispatchToast = true;
            } else if (response.status === 404) {
                finalMessage = "Requested resource was not found.";
                dispatchToast = true;
            } else if (response.status === 403) {
                finalMessage = "You don't have permission to perform this action.";
                dispatchToast = true;
            } else if (response.status === 409) {
                finalMessage = "Unable to complete this action because the data has changed.";
                dispatchToast = true;
            } else if (errorMessage === 'An unexpected error occurred') {
                if (response.status === 400) finalMessage = "Please check the information you entered.";
                else if (response.status === 401) finalMessage = "Your session has expired or unauthorized.";
            }

            if (dispatchToast) {
                window.dispatchEvent(new CustomEvent('acrovix-toast', {
                    detail: { type: 'error', message: finalMessage }
                }));
            }
            
            const error = new Error(finalMessage);
            error.status = response.status;
            error.isGlobalToastHandled = dispatchToast;
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

        const method = options.method ? options.method.toUpperCase() : 'GET';
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            window.dispatchEvent(new Event('notification-update'));
        }

        try {
            return JSON.parse(text);
        } catch (e) {
            return {};
        }
    } catch (error) {
        // Network failures or manually thrown errors
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            const networkErrorMsg = 'Unable to connect to the server. Please try again.';
            window.dispatchEvent(new CustomEvent('acrovix-toast', {
                detail: { type: 'error', message: networkErrorMsg }
            }));
            const networkError = new Error(networkErrorMsg);
            networkError.isGlobalToastHandled = true;
            throw networkError;
        }
        throw error;
    }
};

// --- CUSTOMERS ---
export const getCustomers = (params) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.active !== undefined) query.append('active', params.active);
    if (params?.page !== undefined) query.append('page', params.page);
    if (params?.size !== undefined) query.append('size', params.size);
    return fetchApi(`/customers?${query.toString()}`);
};

export const getCustomerById = (id) => fetchApi(`/customers/${id}`);

export const getCustomer360 = (id) => fetchApi(`/customers/${id}/360`);

export const createCustomer = (data) => fetchApi('/customers', {
    method: 'POST',
    body: JSON.stringify(data)
});

export const updateCustomer = (id, data) => fetchApi(`/customers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
});

export const deleteCustomer = (id) => fetchApi(`/customers/${id}`, {
    method: 'DELETE'
});

export const activateCustomer = (id) => fetchApi(`/customers/${id}/activate`, {
    method: 'PATCH'
});

// --- CATALOG ---
export const getCatalog = (params) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.active !== undefined) query.append('active', params.active);
    if (params?.type) query.append('type', params.type);
    if (params?.page !== undefined) query.append('page', params.page);
    if (params?.size !== undefined) query.append('size', params.size);
    return fetchApi(`/catalog?${query.toString()}`);
};

// --- PURCHASE ORDERS ---
export const getPurchaseOrders = (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchApi(`/purchase-orders${qs ? `?${qs}` : ''}`);
};

export const getPurchaseOrderById = (id) => fetchApi(`/purchase-orders/${id}`);

export const createPurchaseOrder = (data) => fetchApi('/purchase-orders', {
    method: 'POST',
    body: JSON.stringify(data)
});

export const updatePurchaseOrderStatus = (id, data) => fetchApi(`/purchase-orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data)
});

export const verifyPurchaseOrder = (id) => fetchApi(`/purchase-orders/${id}/verify`, {
    method: 'POST'
});

export const getCatalogItemById = (id) => fetchApi(`/catalog/${id}`);

export const createCatalogItem = (data) => fetchApi('/catalog', {
    method: 'POST',
    body: JSON.stringify(data)
});

export const updateCatalogItem = (id, data) => fetchApi(`/catalog/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
});

export const deleteCatalogItem = (id) => fetchApi(`/catalog/${id}`, {
    method: 'DELETE'
});

export const activateCatalogItem = (id) => fetchApi(`/catalog/${id}/activate`, {
    method: 'PATCH'
});

// --- TAXES ---
export const getTaxes = () => fetchApi('/taxes');

export const createTax = (data) => fetchApi('/taxes', {
    method: 'POST',
    body: JSON.stringify(data)
});

export const updateTax = (id, data) => fetchApi(`/taxes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
});

export const deleteTax = (id) => fetchApi(`/taxes/${id}`, {
    method: 'DELETE'
});

export const activateTax = (id) => fetchApi(`/taxes/${id}/activate`, {
    method: 'PATCH'
});

// --- COMPANY SETTINGS ---
export const getCompanySettings = () => fetchApi('/company-settings');

export const updateCompanySettings = (data) => fetchApi('/company-settings', {
    method: 'PATCH',
    body: JSON.stringify(data)
});

// --- INVOICES ---
export const getInvoices = (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchApi(`/invoices${qs ? `?${qs}` : ''}`);
};

export const getInvoiceById = (id) => fetchApi(`/invoices/${id}`);

export const createInvoiceFromQuotation = (quotationId, type) => fetchApi(`/invoices/from-quotation/${quotationId}?type=${type}`, {
    method: 'POST'
});

export const createInvoiceFromPurchaseOrder = (poId, type) => fetchApi(`/invoices/from-po/${poId}?type=${type}`, {
    method: 'POST'
});

export const updateDraftInvoice = (id, data) => fetchApi(`/invoices/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
});

export const deleteDraftInvoice = (id) => fetchApi(`/invoices/${id}`, {
    method: 'DELETE'
});

export const issueInvoice = (id) => fetchApi(`/invoices/${id}/issue`, {
    method: 'POST'
});

export const cancelInvoice = (id) => fetchApi(`/invoices/${id}/cancel`, {
    method: 'POST'
});

export const convertProformaToTaxInvoice = (id) => fetchApi(`/invoices/proforma/${id}/convert-to-tax-invoice`, {
    method: 'POST'
});

// --- PAYMENTS & RECEIVABLES ---
export const recordPayment = (data) => fetchApi('/payments', {
    method: 'POST',
    body: JSON.stringify(data)
});

export const cancelPayment = (id, data) => fetchApi(`/payments/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify(data)
});

export const getPayments = (params = {}) => {
    const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    );
    const qs = new URLSearchParams(cleanParams).toString();
    return fetchApi(`/payments${qs ? `?${qs}` : ''}`);
};

export const getPaymentById = (id) => fetchApi(`/payments/${id}`);

export const getInvoicePayments = (invoiceId) => fetchApi(`/invoices/${invoiceId}/payments`);

export const getReceivables = (params = {}) => {
    const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    );
    const qs = new URLSearchParams(cleanParams).toString();
    return fetchApi(`/receivables${qs ? `?${qs}` : ''}`);
};

export const getDashboardReceivables = () => fetchApi('/dashboard/receivables');

export const getPaymentReceiptPdf = (id) => fetchApi(`/payments/${id}/pdf`);

export const getEligibleInvoicesForPayment = (search) => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return fetchApi(`/payments/eligible-invoices${qs}`);
};

// --- REPORTS & BUSINESS ANALYTICS ---
export const getReportSummary = (preset, fromDate, toDate) => {
    const params = new URLSearchParams();
    if (preset) params.append('preset', preset);
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    return fetchApi(`/reports/summary?${params.toString()}`);
};

export const getQuotationReport = (preset, fromDate, toDate) => {
    const params = new URLSearchParams();
    if (preset) params.append('preset', preset);
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    return fetchApi(`/reports/quotations?${params.toString()}`);
};

export const getPurchaseOrderReport = (preset, fromDate, toDate) => {
    const params = new URLSearchParams();
    if (preset) params.append('preset', preset);
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    return fetchApi(`/reports/purchase-orders?${params.toString()}`);
};

export const getInvoiceReport = (preset, fromDate, toDate) => {
    const params = new URLSearchParams();
    if (preset) params.append('preset', preset);
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    return fetchApi(`/reports/invoices?${params.toString()}`);
};

export const getPaymentReport = (preset, fromDate, toDate) => {
    const params = new URLSearchParams();
    if (preset) params.append('preset', preset);
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    return fetchApi(`/reports/payments?${params.toString()}`);
};

export const getCustomerAnalytics = (preset, fromDate, toDate) => {
    const params = new URLSearchParams();
    if (preset) params.append('preset', preset);
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    return fetchApi(`/reports/customers?${params.toString()}`);
};

export const getMonthlyTrends = (preset, fromDate, toDate) => {
    const params = new URLSearchParams();
    if (preset) params.append('preset', preset);
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    return fetchApi(`/reports/trends?${params.toString()}`);
};

export const exportReportCsv = async (reportType, preset, fromDate, toDate) => {
    const params = new URLSearchParams();
    if (reportType) params.append('type', reportType);
    if (preset) params.append('preset', preset);
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);

    const url = `${API_BASE_URL}/reports/export?${params.toString()}`;
    const response = await fetch(url, {
        headers: getAuthHeaders()
    });
    if (!response.ok) {
        throw new Error('Failed to export CSV report');
    }
    return await response.text();
};

// --- CRM & SALES PIPELINE ---
export const getCrmLeads = (params = {}) => {
    const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    );
    const qs = new URLSearchParams(cleanParams).toString();
    return fetchApi(`/crm/leads${qs ? `?${qs}` : ''}`);
};

export const getCrmLeadById = (id) => fetchApi(`/crm/leads/${id}`);

export const createCrmLead = (data) => fetchApi('/crm/leads', {
    method: 'POST',
    body: JSON.stringify(data)
});

export const updateCrmLead = (id, data) => fetchApi(`/crm/leads/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
});

export const updateCrmLeadStatus = (id, data) => fetchApi(`/crm/leads/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data)
});

export const assignCrmLead = (id, assigneeId) => fetchApi(`/crm/leads/${id}/assign`, {
    method: 'PATCH',
    body: JSON.stringify({ assigneeId })
});

export const createCrmFollowUp = (leadId, data) => fetchApi(`/crm/leads/${leadId}/follow-ups`, {
    method: 'POST',
    body: JSON.stringify(data)
});

export const getCrmFollowUpsForLead = (leadId) => fetchApi(`/crm/leads/${leadId}/follow-ups`);

export const updateCrmFollowUp = (id, data) => fetchApi(`/crm/follow-ups/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
});

export const completeCrmFollowUp = (id, outcome) => fetchApi(`/crm/follow-ups/${id}/complete`, {
    method: 'PATCH',
    body: JSON.stringify({ outcome })
});

export const cancelCrmFollowUp = (id) => fetchApi(`/crm/follow-ups/${id}/cancel`, {
    method: 'PATCH'
});

export const getDueFollowUpsToday = () => fetchApi('/crm/follow-ups/due');

export const getUpcomingFollowUps = (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchApi(`/crm/follow-ups/upcoming${qs ? `?${qs}` : ''}`);
};

export const getCrmPipeline = () => fetchApi('/crm/pipeline');

export const getCrmDashboardSummary = () => fetchApi('/crm/dashboard');

export const getAdminUsers = () => fetchApi('/users');




