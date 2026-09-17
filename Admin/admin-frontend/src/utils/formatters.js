/**
 * Formats a numeric amount to Indian Rupee (INR ₹) currency representation.
 * Example: 250000 -> "₹2,50,000.00" or "₹2,50,000"
 */
export const formatCurrency = (amount, decimals = 0) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals
    }).format(amount);
};

/**
 * Formats a date string into readable date (e.g. "20 Sep 2026").
 */
export const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch {
        return 'N/A';
    }
};

/**
 * Formats a date string into date & time (e.g. "20 Sep 2026, 10:30 AM").
 */
export const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch {
        return 'N/A';
    }
};
