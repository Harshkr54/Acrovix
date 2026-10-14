/**
 * Utilities for CRM lead communication actions (Call, Email, Activity validation).
 * Ensures safe execution without triggering blank tabs, premature submissions,
 * or unhandled protocol errors.
 */

export const VALID_ACTIVITY_TYPES = ['CALL', 'MEETING', 'EMAIL', 'WHATSAPP', 'NOTE', 'OTHER'];

/**
 * Sanitizes phone numbers for telephony actions.
 * Strips formatting spaces, dashes, and parentheses while preserving leading '+' and digits.
 */
export function sanitizePhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') return '';
    const trimmed = phone.trim();
    const hasPlus = trimmed.startsWith('+');
    const digitsOnly = trimmed.replace(/[^\d]/g, '');
    if (!digitsOnly) return '';
    return hasPlus ? `+${digitsOnly}` : digitsOnly;
}

/**
 * Generates a valid tel: protocol URI.
 */
export function createTelUri(phone) {
    const sanitized = sanitizePhoneNumber(phone);
    if (!sanitized) return null;
    return `tel:${sanitized}`;
}

/**
 * Generates a properly encoded mailto: URI.
 */
export function createMailtoUri(email, leadNumber = '', subject = '') {
    if (!email || typeof email !== 'string' || !email.includes('@')) return null;
    const cleanEmail = email.trim();
    const defaultSubject = subject || (leadNumber ? `ACROVIX Enquiry Follow-up: ${leadNumber}` : 'ACROVIX Enquiry Follow-up');
    return `mailto:${cleanEmail}?subject=${encodeURIComponent(defaultSubject)}`;
}

/**
 * Safely triggers an external protocol URI (tel:, mailto:)
 * without navigating the current page away or opening an empty about:blank tab.
 */
export function triggerSafeProtocol(uri) {
    if (!uri || typeof uri !== 'string') return false;
    
    try {
        // Create a hidden anchor element and dispatch click
        const link = document.createElement('a');
        link.href = uri;
        link.style.display = 'none';
        link.setAttribute('rel', 'noopener noreferrer');
        document.body.appendChild(link);
        link.click();
        
        // Clean up immediately
        setTimeout(() => {
            if (document.body.contains(link)) {
                document.body.removeChild(link);
            }
        }, 150);
        return true;
    } catch (err) {
        console.warn('Failed to trigger safe protocol link:', err);
        return false;
    }
}

/**
 * Copies text to clipboard with fallback for non-secure / older browser contexts.
 */
export async function copyToClipboard(text) {
    if (!text) return false;
    
    if (navigator?.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.warn('navigator.clipboard failed, attempting fallback:', err);
        }
    }
    
    // Fallback using textarea element
    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        return successful;
    } catch (err) {
        console.error('Clipboard copy fallback failed:', err);
        return false;
    }
}

/**
 * Validates a CRM lead activity payload.
 */
export function validateActivityPayload(payload = {}) {
    const errors = {};
    
    if (!payload.type || !VALID_ACTIVITY_TYPES.includes(payload.type)) {
        errors.type = 'A valid activity type is required (Call, Meeting, Email, WhatsApp, Note, or Other)';
    }
    
    if (!payload.subject || typeof payload.subject !== 'string' || !payload.subject.trim()) {
        errors.subject = 'Subject or summary title is required';
    } else if (payload.subject.trim().length > 255) {
        errors.subject = 'Subject cannot exceed 255 characters';
    }

    if (payload.performedAt) {
        const date = new Date(payload.performedAt);
        if (isNaN(date.getTime())) {
            errors.performedAt = 'Invalid date and time';
        }
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}
