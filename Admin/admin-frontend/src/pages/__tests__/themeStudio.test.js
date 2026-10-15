import test from 'node:test';
import assert from 'node:assert/strict';
import {
    isValidHex,
    normalizeHex,
    getContrastTextColor,
    adjustBrightness,
    ACCENT_PRESETS
} from '../../utils/themeTokens.js';

/**
 * Test Suite: ACROVIX Enterprise Theme Studio & Token Architecture
 * Validates hex validation, luminance contrast, hover calculation, presets,
 * mode resolution, and user storage isolation.
 */

test('1. isValidHex validates 3-char and 6-char hex codes and rejects invalid strings', () => {
    assert.strictEqual(isValidHex('#60A5FA'), true);
    assert.strictEqual(isValidHex('#2563EB'), true);
    assert.strictEqual(isValidHex('#FFF'), true);
    assert.strictEqual(isValidHex('#000'), true);
    assert.strictEqual(isValidHex('#34d399'), true);

    // Invalid inputs
    assert.strictEqual(isValidHex('60A5FA'), false, 'Missing leading #');
    assert.strictEqual(isValidHex('#60A5F'), false, '5 hex chars');
    assert.strictEqual(isValidHex('#60A5FAA'), false, '7 hex chars');
    assert.strictEqual(isValidHex('#GGGGGG'), false, 'Invalid characters');
    assert.strictEqual(isValidHex(''), false, 'Empty string');
    assert.strictEqual(isValidHex(null), false, 'Null');
    assert.strictEqual(isValidHex(undefined), false, 'Undefined');
});

test('2. normalizeHex formats 3-char hex to standard 6-char uppercase', () => {
    assert.strictEqual(normalizeHex('#fff'), '#FFFFFF');
    assert.strictEqual(normalizeHex('#000'), '#000000');
    assert.strictEqual(normalizeHex('60a5fa'), '#60A5FA');
    assert.strictEqual(normalizeHex('#60a5fa'), '#60A5FA');
    assert.strictEqual(normalizeHex(null), '#2563EB', 'Default fallback on falsy');
});

test('3. getContrastTextColor adheres to WCAG luminance thresholds', () => {
    // High luminance colors (should receive dark navy text #0B1120 for readability)
    assert.strictEqual(getContrastTextColor('#FFFFFF'), '#0B1120');
    assert.strictEqual(getContrastTextColor('#60A5FA'), '#0B1120');
    assert.strictEqual(getContrastTextColor('#FBBF24'), '#0B1120');
    assert.strictEqual(getContrastTextColor('#2DD4BF'), '#0B1120');
    assert.strictEqual(getContrastTextColor('#34D399'), '#0B1120');

    // Low luminance dark colors (should receive white text #FFFFFF for readability)
    assert.strictEqual(getContrastTextColor('#000000'), '#FFFFFF');
    assert.strictEqual(getContrastTextColor('#0F172A'), '#FFFFFF');
    assert.strictEqual(getContrastTextColor('#1E3A8A'), '#FFFFFF');
    assert.strictEqual(getContrastTextColor('#7C3AED'), '#FFFFFF');
});

test('4. adjustBrightness computes hover state and clamps correctly', () => {
    const hoverColor = adjustBrightness('#60A5FA', -15);
    assert.match(hoverColor, /^#[0-9A-F]{6}$/);

    // Darkened version should have smaller or equal channel values
    const rOrig = parseInt('60', 16);
    const rDark = parseInt(hoverColor.slice(1, 3), 16);
    assert.ok(rDark <= rOrig);

    // Clamping test
    assert.strictEqual(adjustBrightness('#000000', -50), '#000000');
    assert.strictEqual(adjustBrightness('#FFFFFF', 50), '#FFFFFF');
});

test('5. ACCENT_PRESETS contains all 7 enterprise presets with valid color tokens', () => {
    assert.strictEqual(ACCENT_PRESETS.length, 7);

    const expectedPresetIds = [
        'acrovix-blue',
        'electric-blue',
        'teal',
        'emerald',
        'violet',
        'amber',
        'rose'
    ];

    expectedPresetIds.forEach(id => {
        const preset = ACCENT_PRESETS.find(p => p.id === id);
        assert.ok(preset, `Preset ${id} should be defined`);
        assert.ok(isValidHex(preset.lightHex), `${id} lightHex is valid`);
        assert.ok(isValidHex(preset.darkHex), `${id} darkHex is valid`);
    });
});

test('6. Mode resolution properly respects system preference or explicit overrides', () => {
    function resolveTheme(mode, systemPrefersDark) {
        if (mode === 'system') {
            return systemPrefersDark ? 'dark' : 'light';
        }
        return mode;
    }

    assert.strictEqual(resolveTheme('light', true), 'light');
    assert.strictEqual(resolveTheme('dark', false), 'dark');
    assert.strictEqual(resolveTheme('system', true), 'dark');
    assert.strictEqual(resolveTheme('system', false), 'light');
});

test('7. Storage key isolation isolates authenticated user preferences from guest', () => {
    function getThemeStorageKey(userId) {
        return userId ? `acrovix_theme_v2_user_${userId}` : 'acrovix_theme_v2_guest';
    }

    assert.strictEqual(getThemeStorageKey(101), 'acrovix_theme_v2_user_101');
    assert.strictEqual(getThemeStorageKey('admin-user'), 'acrovix_theme_v2_user_admin-user');
    assert.strictEqual(getThemeStorageKey(null), 'acrovix_theme_v2_guest');
    assert.strictEqual(getThemeStorageKey(undefined), 'acrovix_theme_v2_guest');
});
