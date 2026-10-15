import React, { useState, useEffect } from 'react';
import { 
    Sun, Moon, Monitor, Check, RotateCcw, Sparkles, Sliders, CheckCircle2, 
    AlertCircle, Eye, Palette, Layers, Radio
} from 'lucide-react';
import { useTheme, isValidHex, normalizeHex } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

export default function ThemeStudio({ onSaved, isModal = false }) {
    const { 
        mode, setMode, 
        resolvedTheme, 
        selectedPresetId, setPresetAccent, 
        customAccent, setCustomAccent, 
        activeAccent, presets, 
        resetTheme 
    } = useTheme();

    const { showToast } = useToast();

    // Staging state for studio changes
    const [stagedMode, setStagedMode] = useState(mode);
    const [stagedPreset, setStagedPreset] = useState(selectedPresetId);
    const [stagedCustomHex, setStagedCustomHex] = useState(customAccent || '');
    const [isCustomActive, setIsCustomActive] = useState(Boolean(customAccent));
    const [hexError, setHexError] = useState('');
    const [isSavedFeedback, setIsSavedFeedback] = useState(false);

    // Sync from context when context updates externally
    useEffect(() => {
        setStagedMode(mode);
        setStagedPreset(selectedPresetId);
        setStagedCustomHex(customAccent || '');
        setIsCustomActive(Boolean(customAccent));
        setHexError('');
    }, [mode, selectedPresetId, customAccent]);

    // Compute preview accent
    const previewAccent = React.useMemo(() => {
        if (isCustomActive && isValidHex(stagedCustomHex)) {
            return normalizeHex(stagedCustomHex);
        }
        const found = presets.find(p => p.id === stagedPreset) || presets[0];
        const isDarkPreview = stagedMode === 'system' ? resolvedTheme === 'dark' : stagedMode === 'dark';
        return isDarkPreview ? found.darkHex : found.lightHex;
    }, [isCustomActive, stagedCustomHex, stagedPreset, stagedMode, resolvedTheme, presets]);

    // Handle Custom Hex Typing
    const handleHexChange = (e) => {
        const val = e.target.value.trim();
        setStagedCustomHex(val);
        setIsCustomActive(true);

        if (!val) {
            setHexError('Please enter a HEX color code (e.g., #2563EB)');
        } else if (!isValidHex(val)) {
            setHexError('Invalid HEX color. Use format #RGB or #RRGGBB');
        } else {
            setHexError('');
        }
    };

    // Preset selection
    const handleSelectPreset = (presetId) => {
        setStagedPreset(presetId);
        setIsCustomActive(false);
        setHexError('');
    };

    // Apply / Save changes
    const handleApply = () => {
        if (isCustomActive) {
            if (!isValidHex(stagedCustomHex)) {
                setHexError('Cannot apply invalid HEX color code');
                showToast({ type: 'error', message: 'Please provide a valid 6-character hex color code.' });
                return;
            }
            setCustomAccent(stagedCustomHex);
        } else {
            setPresetAccent(stagedPreset);
        }

        setMode(stagedMode);
        setIsSavedFeedback(true);
        setTimeout(() => setIsSavedFeedback(false), 2500);

        showToast({
            type: 'success',
            message: 'Theme preferences applied successfully.'
        });

        if (onSaved) onSaved();
    };

    // Reset to defaults
    const handleReset = () => {
        resetTheme();
        setStagedMode('system');
        setStagedPreset('acrovix-blue');
        setStagedCustomHex('');
        setIsCustomActive(false);
        setHexError('');
        
        showToast({
            type: 'info',
            message: 'Theme reset to default ACROVIX Enterprise settings.'
        });

        if (onSaved) onSaved();
    };

    return (
        <div className="space-y-8">
            {/* Header info */}
            {!isModal && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
                    <div>
                        <h2 className="text-xl font-bold text-text-primary tracking-tight flex items-center gap-2">
                            <Palette className="w-5 h-5 text-brand-primary" />
                            Theme Studio
                        </h2>
                        <p className="text-[13px] text-text-muted mt-0.5">
                            Configure your enterprise appearance, contrast mode, and dynamic accent colors.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="btn btn-secondary btn-md inline-flex items-center gap-2 text-text-muted hover:text-text-primary"
                            title="Reset all settings to defaults"
                        >
                            <RotateCcw className="w-4 h-4" />
                            <span>Reset Defaults</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleApply}
                            className="btn btn-primary btn-md inline-flex items-center gap-2"
                        >
                            {isSavedFeedback ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Sparkles className="w-4 h-4" />}
                            <span>{isSavedFeedback ? 'Saved!' : 'Apply Theme'}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* SECTION 1: Appearance Mode */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider text-[11px]">
                            1. Appearance Mode
                        </h3>
                        <p className="text-[12px] text-text-muted">
                            Choose between crisp Light, Premium Midnight Dark, or follow your OS settings automatically.
                        </p>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-bg-muted text-text-secondary border border-border-subtle">
                        Active: {resolvedTheme.toUpperCase()}
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Light Mode Card */}
                    <button
                        type="button"
                        onClick={() => setStagedMode('light')}
                        className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between h-[104px] ${
                            stagedMode === 'light'
                                ? 'border-brand-primary ring-2 ring-brand-primary/20 bg-brand-primary/5 dark:bg-brand-primary/10 shadow-sm'
                                : 'border-border-subtle hover:border-slate-300 dark:hover:border-slate-700 bg-bg-card'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                <Sun className="w-5 h-5" />
                            </div>
                            {stagedMode === 'light' && (
                                <span className="w-5 h-5 rounded-full bg-brand-primary flex items-center justify-center text-white">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                </span>
                            )}
                        </div>
                        <div>
                            <p className="text-[13px] font-bold text-text-primary leading-none">Light Mode</p>
                            <p className="text-[11px] text-text-muted mt-1">Crisp high-contrast day theme</p>
                        </div>
                    </button>

                    {/* Dark Mode Card */}
                    <button
                        type="button"
                        onClick={() => setStagedMode('dark')}
                        className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between h-[104px] ${
                            stagedMode === 'dark'
                                ? 'border-brand-primary ring-2 ring-brand-primary/20 bg-brand-primary/5 dark:bg-brand-primary/10 shadow-sm'
                                : 'border-border-subtle hover:border-slate-300 dark:hover:border-slate-700 bg-bg-card'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                                <Moon className="w-5 h-5" />
                            </div>
                            {stagedMode === 'dark' && (
                                <span className="w-5 h-5 rounded-full bg-brand-primary flex items-center justify-center text-white">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                </span>
                            )}
                        </div>
                        <div>
                            <p className="text-[13px] font-bold text-text-primary leading-none">Midnight Dark</p>
                            <p className="text-[11px] text-text-muted mt-1">Deep enterprise OLED palette</p>
                        </div>
                    </button>

                    {/* System Sync Card */}
                    <button
                        type="button"
                        onClick={() => setStagedMode('system')}
                        className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between h-[104px] ${
                            stagedMode === 'system'
                                ? 'border-brand-primary ring-2 ring-brand-primary/20 bg-brand-primary/5 dark:bg-brand-primary/10 shadow-sm'
                                : 'border-border-subtle hover:border-slate-300 dark:hover:border-slate-700 bg-bg-card'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-500">
                                <Monitor className="w-5 h-5" />
                            </div>
                            {stagedMode === 'system' && (
                                <span className="w-5 h-5 rounded-full bg-brand-primary flex items-center justify-center text-white">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                </span>
                            )}
                        </div>
                        <div>
                            <p className="text-[13px] font-bold text-text-primary leading-none">System Sync</p>
                            <p className="text-[11px] text-text-muted mt-1">Adapts to device schedule</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* SECTION 2: Accent Color Selection */}
            <div className="space-y-4">
                <div>
                    <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider text-[11px]">
                        2. Enterprise Accent Palette
                    </h3>
                    <p className="text-[12px] text-text-muted">
                        Select a curated brand preset or enter your custom organization HEX color.
                    </p>
                </div>

                {/* Preset Swatches Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                    {presets.map((preset) => {
                        const isSelected = !isCustomActive && stagedPreset === preset.id;
                        const swatchHex = resolvedTheme === 'dark' ? preset.darkHex : preset.lightHex;
                        return (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => handleSelectPreset(preset.id)}
                                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 group ${
                                    isSelected
                                        ? 'border-brand-primary ring-2 ring-brand-primary/20 bg-bg-card shadow-sm'
                                        : 'border-border-subtle hover:border-slate-400 dark:hover:border-slate-600 bg-bg-card'
                                }`}
                            >
                                <div 
                                    className="w-8 h-8 rounded-full shadow-inner flex items-center justify-center text-white transition-transform group-hover:scale-110"
                                    style={{ backgroundColor: swatchHex }}
                                >
                                    {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                                </div>
                                <span className="text-[12px] font-bold text-text-primary truncate w-full">
                                    {preset.name}
                                </span>
                                <span className="text-[10px] font-mono text-text-muted">
                                    {swatchHex}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Custom Hex Selector */}
                <div className="p-4 rounded-2xl bg-bg-main border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                            <input
                                type="color"
                                value={isValidHex(stagedCustomHex) ? normalizeHex(stagedCustomHex) : '#2563EB'}
                                onChange={(e) => {
                                    setStagedCustomHex(e.target.value.toUpperCase());
                                    setIsCustomActive(true);
                                    setHexError('');
                                }}
                                className="w-10 h-10 rounded-xl cursor-pointer border border-border-subtle p-0.5 bg-bg-card"
                                title="Pick color"
                            />
                        </div>
                        <div>
                            <p className="text-[13px] font-bold text-text-primary">Custom Brand Accent</p>
                            <p className="text-[11px] text-text-muted">Enter any HEX color value (e.g., #2563EB)</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 max-w-xs w-full sm:w-auto">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="#60A5FA"
                                maxLength={7}
                                value={stagedCustomHex}
                                onChange={handleHexChange}
                                className={`w-full font-mono text-[13px] px-3 py-2 rounded-xl bg-bg-card border uppercase ${
                                    hexError 
                                        ? 'border-brand-danger text-brand-danger focus:ring-1 focus:ring-brand-danger' 
                                        : isCustomActive 
                                            ? 'border-brand-primary ring-1 ring-brand-primary text-text-primary'
                                            : 'border-border-subtle text-text-primary'
                                } outline-none transition-all`}
                            />
                        </div>
                        {isCustomActive && (
                            <button
                                type="button"
                                onClick={() => handleSelectPreset('acrovix-blue')}
                                className="text-[11px] font-semibold text-text-muted hover:text-text-primary px-2 py-1.5"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {hexError && (
                    <div className="flex items-center gap-1.5 text-[12px] text-brand-danger px-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{hexError}</span>
                    </div>
                )}
            </div>

            {/* SECTION 3: Live Real-Time Component Preview Widget */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <Eye className="w-4 h-4 text-brand-primary" />
                            3. Live Interactive UI Preview
                        </h3>
                        <p className="text-[12px] text-text-muted">
                            Real-time simulation of enterprise cards, buttons, focus rings, badges, and sparklines.
                        </p>
                    </div>
                    <span 
                        className="text-[11px] font-mono px-2 py-0.5 rounded-full font-bold shadow-xs"
                        style={{ backgroundColor: `${previewAccent}20`, color: previewAccent }}
                    >
                        {previewAccent}
                    </span>
                </div>

                {/* Preview Box Container */}
                <div className="p-5 sm:p-6 rounded-[24px] border border-border-subtle bg-bg-main relative overflow-hidden transition-all shadow-inner">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        
                        {/* Mock Card Left: Controls & Badges */}
                        <div className="p-4 rounded-2xl bg-bg-card border border-border-subtle shadow-xs space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Button States</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: previewAccent }}></span>
                                    <span className="text-[11px] font-semibold text-text-secondary">Simulated</span>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5">
                                <button
                                    type="button"
                                    className="px-3.5 py-2 text-[12px] font-bold rounded-xl shadow-xs transition-transform active:scale-95"
                                    style={{ 
                                        backgroundColor: previewAccent, 
                                        color: previewAccent === '#FFFFFF' ? '#0B1120' : '#FFFFFF' 
                                    }}
                                >
                                    Primary Action
                                </button>
                                <button
                                    type="button"
                                    className="px-3.5 py-2 text-[12px] font-bold rounded-xl bg-bg-card border border-border-subtle text-text-primary hover:bg-bg-hover transition-colors shadow-xs"
                                >
                                    Secondary Action
                                </button>
                            </div>

                            {/* Simulated Focus Ring Input */}
                            <div className="space-y-1.5 pt-1">
                                <label className="text-[11px] font-semibold text-text-secondary">Active Form Input</label>
                                <div 
                                    className="px-3 py-2 rounded-xl bg-bg-card border text-[13px] text-text-primary flex items-center justify-between"
                                    style={{ borderColor: previewAccent, boxShadow: `0 0 0 2px ${previewAccent}25` }}
                                >
                                    <span>Focus state with brand ring</span>
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: previewAccent }}></span>
                                </div>
                            </div>

                            {/* Semantic Status Badges (Kept isolated from accent) */}
                            <div className="pt-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-2">Semantic Statuses</span>
                                <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Active / Paid</span>
                                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">Pending Review</span>
                                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">Critical</span>
                                </div>
                            </div>
                        </div>

                        {/* Mock Card Right: Navigation & Data Visualization */}
                        <div className="p-4 rounded-2xl bg-bg-card border border-border-subtle shadow-xs space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Navigation & Visuals</span>
                                <span className="text-[11px] font-semibold text-text-muted">Simulated</span>
                            </div>

                            {/* Mock Sidebar Active Item */}
                            <div className="space-y-1.5">
                                <div 
                                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-bold shadow-xs transition-all"
                                    style={{ 
                                        backgroundColor: previewAccent, 
                                        color: previewAccent === '#FFFFFF' ? '#0B1120' : '#FFFFFF' 
                                    }}
                                >
                                    <Layers className="w-4 h-4" />
                                    <span>Active Navigation Item</span>
                                </div>
                                <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-text-muted hover:bg-bg-hover">
                                    <Sliders className="w-4 h-4" />
                                    <span>Inactive Navigation Item</span>
                                </div>
                            </div>

                            {/* Mini SVG Sparkline Chart in Preview Accent */}
                            <div className="p-3 rounded-xl bg-bg-main border border-border-subtle">
                                <div className="flex justify-between items-baseline mb-2">
                                    <span className="text-[11px] font-semibold text-text-muted">Monthly Revenue Trend</span>
                                    <span className="text-[12px] font-bold text-text-primary">+18.4%</span>
                                </div>
                                <svg className="w-full h-12 overflow-visible" viewBox="0 0 200 48">
                                    <defs>
                                        <linearGradient id="previewGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={previewAccent} stopOpacity="0.4" />
                                            <stop offset="100%" stopColor={previewAccent} stopOpacity="0.0" />
                                        </linearGradient>
                                    </defs>
                                    <path
                                        d="M 0 40 Q 30 20 60 30 T 120 15 T 160 25 T 200 8 L 200 48 L 0 48 Z"
                                        fill="url(#previewGrad)"
                                    />
                                    <path
                                        d="M 0 40 Q 30 20 60 30 T 120 15 T 160 25 T 200 8"
                                        fill="none"
                                        stroke={previewAccent}
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Modal Bottom Actions */}
            {isModal && (
                <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="btn btn-secondary btn-md inline-flex items-center gap-1.5 text-text-muted hover:text-text-primary"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleApply}
                            className="btn btn-primary btn-md inline-flex items-center gap-2 shadow-sm"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>Save & Apply</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
