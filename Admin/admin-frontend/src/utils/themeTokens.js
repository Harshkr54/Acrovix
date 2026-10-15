/**
 * ACROVIX ERP — Centralized Theme Tokens & Utility Functions
 * Single source of truth for accent presets, hex normalization,
 * WCAG AA contrast calculation, and hover state luminance shifting.
 */

export const ACCENT_PRESETS = [
    { id: 'acrovix-blue', name: 'ACROVIX Blue', lightHex: '#2563EB', darkHex: '#60A5FA' },
    { id: 'electric-blue', name: 'Electric Blue', lightHex: '#3B82F6', darkHex: '#3B82F6' },
    { id: 'teal', name: 'Teal', lightHex: '#0D9488', darkHex: '#2DD4BF' },
    { id: 'emerald', name: 'Emerald', lightHex: '#10B981', darkHex: '#34D399' },
    { id: 'violet', name: 'Violet', lightHex: '#7C3AED', darkHex: '#A78BFA' },
    { id: 'amber', name: 'Amber', lightHex: '#D97706', darkHex: '#FBBF24' },
    { id: 'rose', name: 'Rose', lightHex: '#E11D48', darkHex: '#FB7185' },
];

/**
 * Validates a 6-digit or 3-digit HEX color code
 */
export function isValidHex(hex) {
    if (!hex || typeof hex !== 'string') return false;
    return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex.trim());
}

/**
 * Normalizes 3-char hex to 6-char uppercase hex
 */
export function normalizeHex(hex) {
    if (!hex) return '#2563EB';
    let clean = hex.trim();
    if (!clean.startsWith('#')) clean = '#' + clean;
    if (clean.length === 4) {
        clean = '#' + clean[1] + clean[1] + clean[2] + clean[2] + clean[3] + clean[3];
    }
    return clean.toUpperCase();
}

/**
 * Calculates accessible contrast text color (either #0B1120 or #FFFFFF)
 * using WCAG relative luminance and contrast ratio formulas
 */
export function getContrastTextColor(hex) {
    const clean = normalizeHex(hex);
    const r = parseInt(clean.slice(1, 3), 16) / 255;
    const g = parseInt(clean.slice(3, 5), 16) / 255;
    const b = parseInt(clean.slice(5, 7), 16) / 255;

    const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

    // Dark text luminance (#0B1120) ~ 0.005, White text luminance (#FFFFFF) = 1.0
    const contrastWithDark = (L + 0.05) / (0.005 + 0.05);
    const contrastWithLight = (1.0 + 0.05) / (L + 0.05);

    return contrastWithDark >= contrastWithLight ? '#0B1120' : '#FFFFFF';
}

/**
 * Adjusts HEX color brightness for hover states
 */
export function adjustBrightness(hex, percent) {
    const clean = normalizeHex(hex);
    let r = parseInt(clean.slice(1, 3), 16);
    let g = parseInt(clean.slice(3, 5), 16);
    let b = parseInt(clean.slice(5, 7), 16);

    r = Math.min(255, Math.max(0, Math.round(r + (r * percent) / 100)));
    g = Math.min(255, Math.max(0, Math.round(g + (g * percent) / 100)));
    b = Math.min(255, Math.max(0, Math.round(b + (b * percent) / 100)));

    const toHex = (n) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}
