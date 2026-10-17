import React, { useState, useEffect, useRef } from 'react';
import { 
    Sun, Moon, Monitor, Check, RotateCcw, Sparkles, X, 
    AlertCircle, Palette, CheckCircle2
} from 'lucide-react';
import { useTheme, isValidHex, normalizeHex } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

export default function ThemeStudioPopover({ onClose }) {
    const { 
        mode, setMode, 
        resolvedTheme, 
        selectedPresetId, setPresetAccent, 
        customAccent, setCustomAccent, 
        presets, 
        resetTheme 
    } = useTheme();

    const { showToast } = useToast();
    const popoverRef = useRef(null);

    // Staging state for preview & edit
    const [stagedMode, setStagedMode] = useState(mode);
    const [stagedPreset, setStagedPreset] = useState(selectedPresetId);
    const [stagedCustomHex, setStagedCustomHex] = useState(customAccent || '');
    const [isCustomActive, setIsCustomActive] = useState(Boolean(customAccent));
    const [hexError, setHexError] = useState('');
    const [isSavedFeedback, setIsSavedFeedback] = useState(false);

    // Outside click & Escape listener
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                onClose?.();
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose?.();
            }
        };

        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }, 10);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    // Synchronize if external context updates
    useEffect(() => {
        setStagedMode(mode);
        setStagedPreset(selectedPresetId);
        setStagedCustomHex(customAccent || '');
        setIsCustomActive(Boolean(customAccent));
        setHexError('');
    }, [mode, selectedPresetId, customAccent]);

    // Active accent calculation
    const previewAccent = React.useMemo(() => {
        if (isCustomActive && isValidHex(stagedCustomHex)) {
            return normalizeHex(stagedCustomHex);
        }
        const found = presets.find(p => p.id === stagedPreset) || presets[0];
        const isDarkPreview = stagedMode === 'system' ? resolvedTheme === 'dark' : stagedMode === 'dark';
        return isDarkPreview ? found.darkHex : found.lightHex;
    }, [isCustomActive, stagedCustomHex, stagedPreset, stagedMode, resolvedTheme, presets]);

    const handleHexChange = (e) => {
        const val = e.target.value.trim();
        setStagedCustomHex(val);
        setIsCustomActive(true);

        if (!val) {
            setHexError('Enter HEX color code (e.g., #2563EB)');
        } else if (!isValidHex(val)) {
            setHexError('Invalid HEX. Use #RGB or #RRGGBB');
        } else {
            setHexError('');
        }
    };

    const handleSelectPreset = (presetId) => {
        setStagedPreset(presetId);
        setIsCustomActive(false);
        setHexError('');
    };

    const handleApply = () => {
        if (isCustomActive) {
            if (!isValidHex(stagedCustomHex)) {
                setHexError('Cannot apply invalid HEX color');
                showToast({ type: 'error', message: 'Please provide a valid hex color code.' });
                return;
            }
            setCustomAccent(stagedCustomHex);
        } else {
            setPresetAccent(stagedPreset);
        }

        setMode(stagedMode);
        setIsSavedFeedback(true);

        showToast({
            type: 'success',
            message: 'Theme & brand accent applied successfully.'
        });

        setTimeout(() => {
            setIsSavedFeedback(false);
            onClose?.();
        }, 400);
    };

    const handleReset = () => {
        resetTheme();
        setStagedMode('system');
        setStagedPreset('acrovix-blue');
        setStagedCustomHex('');
        setIsCustomActive(false);
        setHexError('');
        showToast({
            type: 'info',
            message: 'Theme preferences reset to default.'
        });
    };

    return (
        <div 
            ref={popoverRef}
            className="absolute right-0 top-full mt-2 w-[420px] max-w-[calc(100vw-24px)] max-h-[85vh] overflow-y-auto rounded-2xl bg-bg-card dark:bg-slate-900 border border-border-subtle dark:border-slate-800 shadow-2xl z-50 p-5 hide-scrollbar flex flex-col animate-dropdown-entrance"
            style={{ minWidth: '320px' }}
        >
            {/* Crisp Sticky Top Header inside Popover */}
            <div className="sticky -top-5 -mx-5 -mt-5 px-5 py-3.5 bg-bg-card/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-border-subtle dark:border-slate-800 flex items-center justify-between z-10 shrink-0 rounded-t-2xl">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                        <Palette className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-text-primary dark:text-slate-100 tracking-tight leading-none">
                            Theme & Brand Accent
                        </h3>
                        <p className="text-[11px] text-text-muted dark:text-slate-400 mt-1">
                            Customize appearance mode & enterprise accents
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-text-muted hover:text-text-primary dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
                    aria-label="Close"
                    title="Close"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="space-y-5 pt-3">
                {/* 1. Appearance Mode */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted dark:text-slate-400">
                            Appearance Mode
                        </label>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-border-subtle dark:border-slate-700">
                            Active: {stagedMode.toUpperCase()}
                        </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={() => setStagedMode('light')}
                            className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                                stagedMode === 'light'
                                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary font-semibold ring-1 ring-brand-primary/30 shadow-xs'
                                    : 'border-border-subtle dark:border-slate-800 bg-bg-card hover:bg-slate-50 dark:hover:bg-slate-850 text-text-secondary'
                            }`}
                        >
                            <Sun className="w-4 h-4 text-amber-500" />
                            <span className="text-xs">Light</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setStagedMode('dark')}
                            className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                                stagedMode === 'dark'
                                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary font-semibold ring-1 ring-brand-primary/30 shadow-xs'
                                    : 'border-border-subtle dark:border-slate-800 bg-bg-card hover:bg-slate-50 dark:hover:bg-slate-850 text-text-secondary'
                            }`}
                        >
                            <Moon className="w-4 h-4 text-purple-400" />
                            <span className="text-xs">Dark</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setStagedMode('system')}
                            className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                                stagedMode === 'system'
                                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary font-semibold ring-1 ring-brand-primary/30 shadow-xs'
                                    : 'border-border-subtle dark:border-slate-800 bg-bg-card hover:bg-slate-50 dark:hover:bg-slate-850 text-text-secondary'
                            }`}
                        >
                            <Monitor className="w-4 h-4 text-sky-400" />
                            <span className="text-xs">System</span>
                        </button>
                    </div>
                </div>

                {/* 2. Curated Brand Accent Swatches */}
                <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted dark:text-slate-400 mb-2">
                        Curated Brand Palette
                    </label>

                    <div className="grid grid-cols-4 gap-2">
                        {presets.map((preset) => {
                            const isSelected = !isCustomActive && stagedPreset === preset.id;
                            const swatchHex = resolvedTheme === 'dark' ? preset.darkHex : preset.lightHex;
                            return (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => handleSelectPreset(preset.id)}
                                    className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 group ${
                                        isSelected
                                            ? 'border-brand-primary ring-1.5 ring-brand-primary/30 bg-brand-primary/5 dark:bg-brand-primary/10 shadow-xs'
                                            : 'border-border-subtle dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-bg-card dark:bg-slate-850/50'
                                    }`}
                                >
                                    <div 
                                        className="w-6 h-6 rounded-full shadow-inner flex items-center justify-center text-white transition-transform group-hover:scale-110 shrink-0"
                                        style={{ backgroundColor: swatchHex }}
                                    >
                                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                    </div>
                                    <span className="text-[11px] font-medium text-text-primary dark:text-slate-300 truncate w-full">
                                        {preset.name.replace('Acrovix ', '')}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 3. Custom Hex Picker */}
                <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted dark:text-slate-400 mb-2">
                        Custom Hex Accent
                    </label>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-border-subtle dark:border-slate-800 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <input
                                type="color"
                                value={isValidHex(stagedCustomHex) ? normalizeHex(stagedCustomHex) : '#2563EB'}
                                onChange={(e) => {
                                    setStagedCustomHex(e.target.value.toUpperCase());
                                    setIsCustomActive(true);
                                    setHexError('');
                                }}
                                className="w-8 h-8 rounded-lg cursor-pointer border border-border-subtle p-0.5 bg-bg-card shrink-0"
                                title="Pick custom color"
                            />
                            <input
                                type="text"
                                placeholder="#2563EB"
                                maxLength={7}
                                value={stagedCustomHex}
                                onChange={handleHexChange}
                                className={`w-28 font-mono text-xs px-2.5 py-1.5 rounded-lg bg-bg-card dark:bg-slate-900 border uppercase ${
                                    hexError 
                                        ? 'border-brand-danger text-brand-danger focus:ring-1 focus:ring-brand-danger' 
                                        : isCustomActive 
                                            ? 'border-brand-primary ring-1 ring-brand-primary text-text-primary'
                                            : 'border-border-subtle dark:border-slate-700 text-text-primary'
                                } outline-none transition-all`}
                            />
                        </div>

                        {isCustomActive && (
                            <button
                                type="button"
                                onClick={() => handleSelectPreset('acrovix-blue')}
                                className="text-[11px] font-semibold text-text-muted hover:text-text-primary dark:hover:text-slate-300 px-2 py-1 rounded hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
                            >
                                Reset to Preset
                            </button>
                        )}
                    </div>

                    {hexError && (
                        <div className="flex items-center gap-1.5 text-[11px] text-brand-danger mt-1.5 px-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{hexError}</span>
                        </div>
                    )}
                </div>

                {/* 4. Live Component Accent Preview */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-border-subtle dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-text-muted dark:text-slate-400 uppercase tracking-wider">
                            Live Accent Preview
                        </span>
                        <span 
                            className="text-[10px] font-mono px-2 py-0.5 rounded font-bold"
                            style={{ 
                                backgroundColor: `${previewAccent}20`,
                                color: previewAccent
                            }}
                        >
                            {previewAccent}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white shadow-xs flex items-center gap-1.5 transition-all"
                            style={{ backgroundColor: previewAccent }}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            Primary Action
                        </button>

                        <div 
                            className="px-2.5 py-1 rounded-lg text-xs font-medium border"
                            style={{ 
                                borderColor: `${previewAccent}40`,
                                backgroundColor: `${previewAccent}15`,
                                color: previewAccent
                            }}
                        >
                            Active Filter
                        </div>
                    </div>
                </div>

                {/* 5. Popover Action Buttons */}
                <div className="pt-2 flex items-center justify-between border-t border-border-subtle dark:border-slate-800">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text-primary dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset
                    </button>

                    <button
                        type="button"
                        onClick={handleApply}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm inline-flex items-center gap-1.5 transition-all"
                        style={{ backgroundColor: previewAccent }}
                    >
                        {isSavedFeedback ? (
                            <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Applied!
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-3.5 h-3.5" />
                                Apply Theme
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
