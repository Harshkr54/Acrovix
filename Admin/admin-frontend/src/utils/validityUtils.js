/**
 * ACROVIX ERP — Quotation Validity Period Utilities
 * Handles calendar-day arithmetic, month/year boundaries, leap years,
 * and mapping between predefined validity periods and calendar dates.
 */

export const VALIDITY_PERIOD_OPTIONS = [
    { value: '30', label: '30 Days', days: 30 },
    { value: '45', label: '45 Days', days: 45 },
    { value: '60', label: '60 Days', days: 60 },
    { value: '90', label: '90 Days', days: 90 },
    { value: 'custom', label: 'Custom Date', days: null }
];

/**
 * Extracts or computes the quotation issue date in standard YYYY-MM-DD format.
 * Prioritizes the quotation's established creation/issue date (createdAt).
 * Falls back to current computer date in local time only if no creation date exists.
 *
 * @param {string|Date|null|undefined} createdAt - Established creation timestamp or date string
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function getIssueDateStr(createdAt) {
    if (!createdAt) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    if (typeof createdAt === 'string') {
        const match = createdAt.match(/^\d{4}-\d{2}-\d{2}/);
        if (match) {
            return match[0];
        }
    }

    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/**
 * Adds an exact number of calendar days to a base date (YYYY-MM-DD),
 * correctly handling month boundaries, leap years, and year boundaries.
 * Uses UTC date calculations to prevent daylight saving time / timezone skew.
 *
 * @param {string} baseDateStr - Base issue date in YYYY-MM-DD format
 * @param {number|string} days - Number of calendar days to add
 * @returns {string} Calculated date string in YYYY-MM-DD format
 */
export function calculateValidUntilDate(baseDateStr, days) {
    if (!baseDateStr || days === null || days === undefined || days === '') {
        return '';
    }

    const numDays = Number(days);
    if (isNaN(numDays)) {
        return '';
    }

    const parts = String(baseDateStr).split('-');
    if (parts.length < 3) return '';

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) return '';

    // Create Date object in UTC to guarantee 24-hour day additions
    const utcDate = new Date(Date.UTC(year, month - 1, day));
    utcDate.setUTCDate(utcDate.getUTCDate() + numDays);

    const resYear = utcDate.getUTCFullYear();
    const resMonth = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
    const resDay = String(utcDate.getUTCDate()).padStart(2, '0');

    return `${resYear}-${resMonth}-${resDay}`;
}

/**
 * Computes the calendar-day difference between two dates (endDate - startDate).
 *
 * @param {string} startDateStr - Start date in YYYY-MM-DD format
 * @param {string} endDateStr - End date in YYYY-MM-DD format
 * @returns {number|null} Difference in days, or null if either date is invalid
 */
export function getDaysBetweenDates(startDateStr, endDateStr) {
    if (!startDateStr || !endDateStr) return null;

    const p1 = String(startDateStr).split('-');
    const p2 = String(endDateStr).split('-');
    if (p1.length < 3 || p2.length < 3) return null;

    const y1 = parseInt(p1[0], 10);
    const m1 = parseInt(p1[1], 10);
    const d1 = parseInt(p1[2], 10);

    const y2 = parseInt(p2[0], 10);
    const m2 = parseInt(p2[1], 10);
    const d2 = parseInt(p2[2], 10);

    if (isNaN(y1) || isNaN(m1) || isNaN(d1) || isNaN(y2) || isNaN(m2) || isNaN(d2)) {
        return null;
    }

    const t1 = Date.UTC(y1, m1 - 1, d1);
    const t2 = Date.UTC(y2, m2 - 1, d2);
    const diffMs = t2 - t1;

    return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Determines whether a given validUntil date matches one of the predefined validity periods
 * (30, 45, 60, 90) or should be classified as 'custom'.
 *
 * @param {string} issueDateStr - Base issue date in YYYY-MM-DD format
 * @param {string} validUntilStr - Valid Until date in YYYY-MM-DD format
 * @returns {string} '30' | '45' | '60' | '90' | 'custom'
 */
export function determineValidityPeriod(issueDateStr, validUntilStr) {
    if (!validUntilStr || !issueDateStr) {
        return 'custom';
    }

    const diff = getDaysBetweenDates(issueDateStr, validUntilStr);
    if (diff !== null && [30, 45, 60, 90].includes(diff)) {
        return String(diff);
    }

    return 'custom';
}

/**
 * Validates whether validUntil is on or after the issue date.
 * Returns true if validUntil is strictly earlier than the issue date.
 *
 * @param {string} validUntilStr - Valid Until date in YYYY-MM-DD format
 * @param {string} issueDateStr - Issue date in YYYY-MM-DD format
 * @returns {boolean} True if invalid (validUntil < issueDate)
 */
export function isDateBeforeIssueDate(validUntilStr, issueDateStr) {
    if (!validUntilStr || !issueDateStr) return false;
    return validUntilStr < issueDateStr;
}
