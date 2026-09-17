/**
 * Formats a numeric amount to currency representation (INR ₹ or USD $).
 * Examples: 
 * formatCurrency(250000) -> "₹2,50,000"
 * formatCurrency(1000, "USD") -> "$1,000"
 * formatCurrency(1000, "USD", 2) -> "$1,000.00"
 */
export const formatCurrency = (amount, currencyOrDecimals = 'INR', decimals = 0) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
        const isUsd = currencyOrDecimals === 'USD' || currencyOrDecimals === '$';
        return isUsd ? '$0' : '₹0';
    }

    let currency = 'INR';
    let fracDigits = decimals;

    if (typeof currencyOrDecimals === 'string') {
        currency = (currencyOrDecimals.toUpperCase() === 'USD' || currencyOrDecimals === '$') ? 'USD' : 'INR';
    } else if (typeof currencyOrDecimals === 'number') {
        fracDigits = currencyOrDecimals;
    }

    const locale = currency === 'USD' ? 'en-US' : 'en-IN';

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: fracDigits,
        minimumFractionDigits: fracDigits
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
