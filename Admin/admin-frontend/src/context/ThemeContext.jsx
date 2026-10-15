import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
    ACCENT_PRESETS,
    isValidHex,
    normalizeHex,
    getContrastTextColor,
    adjustBrightness
} from '../utils/themeTokens.js';

export {
    ACCENT_PRESETS,
    isValidHex,
    normalizeHex,
    getContrastTextColor,
    adjustBrightness
};

function getActiveUserStorageKey() {
    try {
        const stored = localStorage.getItem('adminUser');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.email) {
                return `acrovix_theme_v2_user_${parsed.email}`;
            }
        }
    } catch {
        // Fallback to guest if localStorage is restricted
    }
    return 'acrovix_theme_v2_guest';
}

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const storageKey = useMemo(() => getActiveUserStorageKey(), []);

    // Initial state loader
    const [themeConfig, setThemeConfig] = useState(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                return {
                    mode: parsed.mode || 'system',
                    customAccent: parsed.customAccent || null,
                    selectedPresetId: parsed.selectedPresetId || 'acrovix-blue'
                };
            }
            // Migrate legacy single key if present
            const legacy = localStorage.getItem('acrovix_admin_theme');
            if (legacy === 'dark' || legacy === 'light') {
                return { mode: legacy, customAccent: null, selectedPresetId: 'acrovix-blue' };
            }
        } catch {
            // Default on parse error
        }
        return { mode: 'system', customAccent: null, selectedPresetId: 'acrovix-blue' };
    });

    // Detect system preference
    const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => setSystemPrefersDark(e.matches);

        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
        } else {
            mediaQuery.addListener(handleChange);
        }

        return () => {
            if (mediaQuery.removeEventListener) {
                mediaQuery.removeEventListener('change', handleChange);
            } else {
                mediaQuery.removeListener(handleChange);
            }
        };
    }, []);

    // Re-check storage when user identity changes
    useEffect(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                setThemeConfig({
                    mode: parsed.mode || 'system',
                    customAccent: parsed.customAccent || null,
                    selectedPresetId: parsed.selectedPresetId || 'acrovix-blue'
                });
            }
        } catch {
            // keep current config
        }
    }, [storageKey]);

    // Compute effective theme (light or dark)
    const resolvedTheme = useMemo(() => {
        if (themeConfig.mode === 'system') {
            return systemPrefersDark ? 'dark' : 'light';
        }
        return themeConfig.mode === 'dark' ? 'dark' : 'light';
    }, [themeConfig.mode, systemPrefersDark]);

    // Compute active accent hex
    const activeAccent = useMemo(() => {
        if (themeConfig.customAccent && isValidHex(themeConfig.customAccent)) {
            return normalizeHex(themeConfig.customAccent);
        }
        const preset = ACCENT_PRESETS.find((p) => p.id === themeConfig.selectedPresetId) || ACCENT_PRESETS[0];
        return resolvedTheme === 'dark' ? preset.darkHex : preset.lightHex;
    }, [themeConfig.customAccent, themeConfig.selectedPresetId, resolvedTheme]);

    // Apply tokens to DOM and persist
    useEffect(() => {
        const root = document.documentElement;

        // 1. Mode Attributes
        root.setAttribute('data-theme', resolvedTheme);
        root.style.colorScheme = resolvedTheme;
        if (resolvedTheme === 'dark') {
            root.classList.add('dark');
            root.classList.remove('light');
        } else {
            root.classList.add('light');
            root.classList.remove('dark');
        }

        // 2. Dynamic Accent Colors
        const contrastText = getContrastTextColor(activeAccent);
        // Calculate appropriate hover tint (lighter in dark mode, darker in light mode)
        const hoverTint = resolvedTheme === 'dark' 
            ? adjustBrightness(activeAccent, 12) 
            : adjustBrightness(activeAccent, -12);

        root.style.setProperty('--theme-brand-primary', activeAccent);
        root.style.setProperty('--theme-brand-primary-hover', hoverTint);
        root.style.setProperty('--theme-brand-primary-contrast', contrastText);

        // Sidebar active tokens sync
        root.style.setProperty('--theme-sidebar-active-bg', activeAccent);
        root.style.setProperty('--theme-sidebar-active-text', contrastText);

        // Save preferences
        try {
            localStorage.setItem(storageKey, JSON.stringify(themeConfig));
            // Keep legacy key synced for backwards compatibility
            localStorage.setItem('acrovix_admin_theme', resolvedTheme);
        } catch {
            // Storage quota or privacy sandbox error ignored
        }
    }, [resolvedTheme, activeAccent, themeConfig, storageKey]);

    // Public API Actions
    const setMode = useCallback((mode) => {
        if (mode !== 'light' && mode !== 'dark' && mode !== 'system') return;
        setThemeConfig((prev) => ({ ...prev, mode }));
    }, []);

    const setPresetAccent = useCallback((presetId) => {
        const exists = ACCENT_PRESETS.some((p) => p.id === presetId);
        if (!exists) return;
        setThemeConfig((prev) => ({ ...prev, selectedPresetId: presetId, customAccent: null }));
    }, []);

    const setCustomAccent = useCallback((hex) => {
        if (!isValidHex(hex)) return false;
        setThemeConfig((prev) => ({ ...prev, customAccent: normalizeHex(hex) }));
        return true;
    }, []);

    const resetTheme = useCallback(() => {
        setThemeConfig({
            mode: 'system',
            selectedPresetId: 'acrovix-blue',
            customAccent: null,
        });
    }, []);

    const toggleTheme = useCallback(() => {
        setThemeConfig((prev) => {
            const nextMode = resolvedTheme === 'dark' ? 'light' : 'dark';
            return { ...prev, mode: nextMode };
        });
    }, [resolvedTheme]);

    const contextValue = useMemo(() => ({
        mode: themeConfig.mode,
        setMode,
        theme: resolvedTheme, // backwards compatible alias
        resolvedTheme,
        toggleTheme,
        selectedPresetId: themeConfig.selectedPresetId,
        customAccent: themeConfig.customAccent,
        activeAccent,
        presets: ACCENT_PRESETS,
        setPresetAccent,
        setCustomAccent,
        resetTheme,
    }), [
        themeConfig,
        resolvedTheme,
        activeAccent,
        setMode,
        toggleTheme,
        setPresetAccent,
        setCustomAccent,
        resetTheme
    ]);

    return (
        <ThemeContext.Provider value={contextValue}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
