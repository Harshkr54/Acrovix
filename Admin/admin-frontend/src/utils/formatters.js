/**
 * Formats a numeric amount to currency representation (e.g. INR ₹, USD $, EUR €, AED, etc.).
 * Examples: 
 * formatCurrency(250000) -> "₹2,50,000"
 * formatCurrency(1000, "USD") -> "$1,000"
 * formatCurrency(1000, "EUR", 2) -> "€1,000.00"
 * formatCurrency(1000, "AED") -> "AED 1,000"
 */
export const formatCurrency = (amount, currencyOrDecimals = 'INR', decimals = 0) => {
    let currency = 'INR';
    let fracDigits = decimals;

    if (typeof currencyOrDecimals === 'string' && currencyOrDecimals.trim().length > 0) {
        const raw = currencyOrDecimals.trim().toUpperCase();
        if (raw === '$' || raw === 'USD') currency = 'USD';
        else if (raw === '₹' || raw === 'INR') currency = 'INR';
        else if (raw === '€' || raw === 'EUR') currency = 'EUR';
        else if (raw === '£' || raw === 'GBP') currency = 'GBP';
        else if (raw === 'AED') currency = 'AED';
        else currency = raw;
    } else if (typeof currencyOrDecimals === 'number') {
        fracDigits = currencyOrDecimals;
    } else if (currencyOrDecimals && typeof currencyOrDecimals === 'object') {
        if (currencyOrDecimals.currencyCode) currency = currencyOrDecimals.currencyCode.toUpperCase();
        if (currencyOrDecimals.decimals !== undefined) fracDigits = currencyOrDecimals.decimals;
    }

    if (amount === null || amount === undefined || isNaN(amount)) {
        if (currency === 'USD') return '$0';
        if (currency === 'EUR') return '€0';
        if (currency === 'GBP') return '£0';
        if (currency === 'AED') return 'AED 0';
        return '₹0';
    }

    const localeMap = {
        INR: 'en-IN',
        USD: 'en-US',
        EUR: 'de-DE',
        GBP: 'en-GB',
        AED: 'en-AE',
        CAD: 'en-CA',
        AUD: 'en-AU',
        JPY: 'ja-JP',
        SGD: 'en-SG'
    };
    const locale = localeMap[currency] || 'en-US';

    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: fracDigits,
            minimumFractionDigits: fracDigits
        }).format(amount);
    } catch (_e) {
        return `${currency} ${Number(amount).toLocaleString(undefined, {
            maximumFractionDigits: fracDigits,
            minimumFractionDigits: fracDigits
        })}`;
    }
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
