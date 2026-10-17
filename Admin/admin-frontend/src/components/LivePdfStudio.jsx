import React, { useState, useMemo } from 'react';
import { 
    Palette, Layout, Eye, Download, ZoomIn, ZoomOut, Maximize2, Minimize2, 
    Check, Sparkles, Building2, Landmark, FileText, CheckCircle2, ShieldCheck,
    SlidersHorizontal, Layers, Image as ImageIcon, Type, MapPin, User, Hash,
    Calendar, Clock, CheckSquare, Square, ChevronDown, ChevronUp, Lock
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import logoExpanded from '../assets/Acrovix_logo.png';

const PRESET_COLORS = [
    { name: 'Corporate Blue', hex: '#2563EB' },
    { name: 'Modern Teal', hex: '#0F766E' },
    { name: 'Emerald', hex: '#059669' },
    { name: 'Slate Grey', hex: '#475569' },
    { name: 'Crimson', hex: '#DC2626' }
];

export default function LivePdfStudio({
    quotationNumber,
    issueDate,
    validUntil,
    clientName,
    clientCompany,
    clientEmail,
    clientPhone,
    billingAddress,
    shippingAddress,
    state,
    gstin,
    items = [],
    currency = 'INR',
    totals = { subtotal: 0, subtotalBeforeTax: 0, discount: 0, taxableAmount: 0, tax: 0, grandTotal: 0 },
    selectedBank,
    termsAndConditions,
    tenant,
    companySettings,
    columnConfigs = [],
    onColumnConfigsChange,
    onDownloadPdf,
    isDownloadingPdf = false,
    isReadOnly: isReadOnlyProp = false,
    quotationStatus = 'DRAFT'
}) {
    // Zoom & display control state
    const [zoomLevel, setZoomLevel] = useState(75);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Helpers to extract config values from columnConfigs array
    const getConfig = (key, defaultVal) => {
        const found = columnConfigs.find(c => c.columnKey === key);
        return found ? found.visible : defaultVal;
    };

    const getCustomString = (key, defaultVal) => {
        const found = columnConfigs.find(c => c.columnKey === key);
        return found && found.displayName ? found.displayName : defaultVal;
    };

    // Color theme
    const activeColor = useMemo(() => {
        return getCustomString('themeColor', '#2563EB');
    }, [columnConfigs]);

    // Template style: 'modern' | 'minimalist'
    const templateStyle = useMemo(() => {
        return getCustomString('templateStyle', 'modern');
    }, [columnConfigs]);

    // Brand Display Mode: 'LOGO' | 'WORDMARK'
    const brandDisplayMode = useMemo(() => {
        return getCustomString('brandDisplayMode', 'LOGO');
    }, [columnConfigs]);

    // Read-only / Locked Status (Status is NOT DRAFT -> e.g. SENT, ACCEPTED, REJECTED, CONVERTED_TO_INVOICE)
    const isReadOnly = Boolean(isReadOnlyProp || (quotationStatus && quotationStatus !== 'DRAFT'));

    // Update or insert a config in the columnConfigs list
    const updateConfig = (key, updates) => {
        if (isReadOnly || !onColumnConfigsChange) return;
        const exists = columnConfigs.some(c => c.columnKey === key);
        let nextConfigs;
        if (exists) {
            nextConfigs = columnConfigs.map(c => {
                if (c.columnKey === key) {
                    return { ...c, ...updates };
                }
                return c;
            });
        } else {
            const nextSortOrder = columnConfigs.length > 0 ? Math.max(...columnConfigs.map(c => c.sortOrder || 0)) + 1 : 0;
            nextConfigs = [
                ...columnConfigs,
                {
                    columnKey: key,
                    displayName: updates.displayName || key,
                    columnType: updates.columnType || 'TEXT',
                    visible: updates.visible !== undefined ? updates.visible : true,
                    sortOrder: updates.sortOrder !== undefined ? updates.sortOrder : nextSortOrder,
                    isCustom: updates.isCustom !== undefined ? updates.isCustom : true
                }
            ];
        }
        onColumnConfigsChange(nextConfigs);
    };

    // Toggle helper for multi-key pairs
    const toggleColumns = (keys, isVisible) => {
        if (isReadOnly || !onColumnConfigsChange) return;
        const keySet = new Set(keys);
        const nextConfigs = columnConfigs.map(c => {
            if (keySet.has(c.columnKey)) {
                return { ...c, visible: isVisible };
            }
            return c;
        });
        onColumnConfigsChange(nextConfigs);
    };

    // Visibility getters
    const showHsn = getConfig('hsnSac', true);
    const showSku = getConfig('sku', true);
    const showPrice = getConfig('unitPrice', true);
    const showDiscount = getConfig('discountPercent', true);
    const showTax = getConfig('taxPercent', true) || getConfig('taxAmount', true);
    const showBank = getConfig('bankDetails', true);
    const showTerms = getConfig('termsAndConditions', true);
    const showSignature = getConfig('signature', true);

    // Master Toggle: customLayoutEnabled (default: false)
    const customLayoutEnabled = useMemo(() => {
        return getConfig('customLayoutEnabled', false);
    }, [columnConfigs]);

    // Effective styling (defaults to standard system layout if customLayoutEnabled is false)
    const effectiveColor = customLayoutEnabled ? activeColor : (tenant?.primaryColor || '#2563EB');
    const effectiveBrandDisplayMode = customLayoutEnabled ? brandDisplayMode : 'LOGO';
    const effectiveTemplateStyle = customLayoutEnabled ? templateStyle : 'modern';

    // Effective Visibility getters (if customLayoutEnabled is false, all official details/columns are standard visible)
    const effectiveShowHsn = customLayoutEnabled ? showHsn : true;
    const effectiveShowSku = customLayoutEnabled ? showSku : true;
    const effectiveShowPrice = customLayoutEnabled ? showPrice : true;
    const effectiveShowDiscount = customLayoutEnabled ? showDiscount : true;
    const effectiveShowTax = customLayoutEnabled ? showTax : true;
    const effectiveShowBank = customLayoutEnabled ? showBank : true;
    const effectiveShowTerms = customLayoutEnabled ? showTerms : true;
    const effectiveShowSignature = customLayoutEnabled ? showSignature : true;

    const handleCustomLayoutToggle = (enabled) => {
        if (isReadOnly) return;
        updateConfig('customLayoutEnabled', { displayName: String(enabled), visible: enabled, isCustom: true, columnType: 'TEXT' });
    };

    const handleColorChange = (hex) => {
        if (isReadOnly) return;
        updateConfig('themeColor', { displayName: hex, visible: true, isCustom: true, columnType: 'TEXT' });
    };

    const handleTemplateChange = (style) => {
        if (isReadOnly) return;
        updateConfig('templateStyle', { displayName: style, visible: true, isCustom: true, columnType: 'TEXT' });
    };

    const handleBrandDisplayModeChange = (mode) => {
        if (isReadOnly) return;
        updateConfig('brandDisplayMode', { displayName: mode, visible: true, isCustom: true, columnType: 'TEXT' });
    };

    const curSym = currency === 'USD' ? '$' : '₹';

    // Strict Tenant Identity Binding (Zero Leaks)
    const isAcrovixWorkspace = (tenant?.slug === 'default' || tenant?.id === 1 || tenant?.tenantId === 1 || (!tenant?.slug && !companySettings?.companyName?.toLowerCase().includes('apex')));
    
    const resolvedCompanyName = companySettings?.companyName || (isAcrovixWorkspace ? 'Acrovix Innovations Private Limited' : (tenant?.companyName || 'Acrovix Innovations Private Limited'));
    const resolvedBrandName = companySettings?.brandName || (isAcrovixWorkspace ? 'Acrovix Innovations' : (tenant?.brandName || resolvedCompanyName));
    const resolvedLogoUrl = companySettings?.logoUrl || tenant?.logoUrl || (isAcrovixWorkspace ? logoExpanded : null);
    const resolvedGstin = companySettings?.gstin || (isAcrovixWorkspace ? '07AAACA1234A1Z5' : (tenant?.gstin || ''));
    const resolvedPan = companySettings?.pan || (isAcrovixWorkspace ? 'AAACA1234A' : (tenant?.pan || ''));
    const resolvedVatId = companySettings?.vatId || tenant?.vatId || '';
    const resolvedAddress = companySettings?.registeredAddress || (isAcrovixWorkspace ? 'Plot 14, Tech Zone IV, Greater Noida West, Uttar Pradesh - 201306' : (tenant?.registeredAddress || ''));
    const resolvedPhone = companySettings?.phone || (isAcrovixWorkspace ? '+91 98765 43210' : (tenant?.phone || ''));
    const resolvedEmail = companySettings?.email || (isAcrovixWorkspace ? 'contact@acrovix.com' : (tenant?.email || ''));
    const resolvedWebsite = companySettings?.website || (isAcrovixWorkspace ? 'www.acrovix.com' : (tenant?.website || ''));

    // Split address lines for clean PDF layout
    const addressLines = resolvedAddress ? resolvedAddress.split(',').map(s => s.trim()).filter(Boolean) : [];

    // Amount in words conversion for live preview
    const amountInWords = useMemo(() => {
        const val = Math.round(totals.grandTotal || 0);
        if (val === 0) return `${currency} Zero Only`;
        return `${currency} ${val.toLocaleString('en-IN')} Only (Converted from numeric total)`;
    }, [totals.grandTotal, currency]);

    // Conditional visibility: hide left customizer panel if quotation is delivered with standard layout
    const shouldShowLeftPanel = !isReadOnly || customLayoutEnabled;

    return (
        <section 
            id="live-pdf-studio" 
            className="acx-card border border-border-subtle bg-bg-card rounded-2xl shadow-sm overflow-hidden mt-8 transition-all duration-300"
        >
            {/* Header Ribbon */}
            <div className="px-6 py-4 border-b border-border-subtle flex flex-wrap items-center justify-between gap-4 bg-bg-surface/50">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: effectiveColor }}>
                        {isReadOnly ? <Lock className="w-5 h-5" /> : <SlidersHorizontal className="w-5 h-5" />}
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-text-primary tracking-tight flex flex-wrap items-center gap-2">
                            Interactive Live PDF Studio & Column Customizer
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                OpenPDF 1:1 Matched
                            </span>
                            {isReadOnly && (
                                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1 shadow-2xs">
                                    <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                    <span>🔒 Design Locked (Quotation delivered to client)</span>
                                </span>
                            )}
                        </h2>
                        <p className="text-xs text-text-muted">
                            {isReadOnly 
                                ? (customLayoutEnabled 
                                    ? 'Viewing locked custom PDF studio layout as delivered to the client. Design controls are read-only.' 
                                    : 'Official standard system layout delivered to the client. Studio customizer is hidden and locked.')
                                : 'Real-time synchronization between live visual canvas and backend binary OpenPDF export.'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsCollapsed(prev => !prev)}
                        className="btn btn-secondary btn-sm flex items-center gap-1.5 shadow-sm font-medium"
                        title={isCollapsed ? "Expand Studio" : "Collapse Studio"}
                    >
                        {isCollapsed ? (
                            <>
                                <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
                                <span>Expand Studio</span>
                            </>
                        ) : (
                            <>
                                <ChevronUp className="w-3.5 h-3.5 text-text-muted" />
                                <span>Collapse Studio</span>
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={onDownloadPdf}
                        disabled={isDownloadingPdf}
                        className="btn btn-primary btn-sm flex items-center gap-1.5 shadow-sm font-semibold"
                        style={{ backgroundColor: effectiveColor, borderColor: effectiveColor }}
                    >
                        <Download className="w-3.5 h-3.5" />
                        {isDownloadingPdf 
                            ? 'Generating PDF...' 
                            : (isReadOnly ? 'Download Delivered PDF' : (customLayoutEnabled ? 'Download Customized PDF' : 'Download Standard PDF'))}
                    </button>
                </div>
            </div>

            {/* Collapsed State Quick Info Bar */}
            {isCollapsed && (
                <div className="p-4 flex flex-wrap items-center justify-between gap-3 bg-bg-surface/30 text-xs text-text-muted">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeColor }} />
                            <span>Accent Color: <strong className="text-text-primary uppercase font-mono">{activeColor}</strong></span>
                        </span>
                        <span>•</span>
                        <span>Header: <strong className="text-text-primary">{brandDisplayMode === 'LOGO' ? 'Logo' : 'Wordmark'}</strong></span>
                        <span>•</span>
                        <span>Layout: <strong className="text-text-primary capitalize">{templateStyle}</strong></span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsCollapsed(false)}
                        className="text-brand-primary hover:underline font-semibold"
                    >
                        Click to customize layout and preview A4 document &rarr;
                    </button>
                </div>
            )}

            {/* Split Screen 50/50 Grid */}
            {!isCollapsed && (
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border-subtle">
                
                {/* LEFT PANEL: PDF Customizer & Styling Controls (50% width) */}
                {shouldShowLeftPanel && (
                <div className="lg:col-span-6 p-6 space-y-6 bg-bg-surface/30">
                    
                    {/* Master Toggle: Enable Custom PDF Design */}
                    <div className={`p-4 rounded-xl border transition-all ${
                        customLayoutEnabled 
                            ? 'border-brand-primary/40 bg-brand-primary/5 shadow-sm ring-1 ring-brand-primary/20' 
                            : 'border-border-subtle bg-bg-card'
                    }`}>
                        <div className="flex items-center justify-between gap-4">
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                    <SlidersHorizontal className={`w-4 h-4 ${customLayoutEnabled ? 'text-brand-primary' : 'text-text-muted'}`} />
                                    <span className="text-sm font-bold text-text-primary">
                                        Enable Custom PDF Design
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                        customLayoutEnabled 
                                            ? 'bg-brand-primary text-white shadow-xs' 
                                            : 'bg-bg-surface border border-border-subtle text-text-muted'
                                    }`}>
                                        {customLayoutEnabled ? 'Enabled' : 'Disabled (Default)'}
                                    </span>
                                    {isReadOnly && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                                            <Lock className="w-2.5 h-2.5" /> Locked
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-text-muted">
                                    {isReadOnly 
                                        ? (customLayoutEnabled 
                                            ? 'Custom theme colors and selective columns were delivered to client. Layout is locked.' 
                                            : 'Standard system layout was delivered to client. Layout is locked.')
                                        : (customLayoutEnabled 
                                            ? 'Custom theme colors, selective column visibility, and studio layout are active.' 
                                            : 'Standard system layout is active. Toggle ON to customize theme color, visible columns, and brand display.')}
                                </p>
                            </div>
                            <button
                                type="button"
                                id="toggle-custom-pdf-design-btn"
                                disabled={isReadOnly}
                                onClick={() => !isReadOnly && handleCustomLayoutToggle(!customLayoutEnabled)}
                                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                    isReadOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                                } ${customLayoutEnabled ? 'bg-brand-primary' : 'bg-border-subtle'}`}
                                role="switch"
                                aria-checked={customLayoutEnabled}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                        customLayoutEnabled ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>

                    {isReadOnly && (
                        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center gap-2.5 shadow-2xs">
                            <Lock className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                            <span>🔒 Design Locked (Quotation delivered to client) &mdash; All controls are read-only. Create a revision to make edits.</span>
                        </div>
                    )}

                    <div className={`space-y-6 transition-all duration-200 ${
                        customLayoutEnabled 
                            ? (isReadOnly ? 'opacity-75 pointer-events-none select-none' : 'opacity-100') 
                            : 'opacity-60 pointer-events-none select-none'
                    }`}>
                    {/* Brand Header Display Toggle (Logo vs Wordmark) */}
                    <div className="space-y-3 p-4 rounded-xl border border-border-subtle bg-bg-card">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-brand-primary" />
                                Brand Header Display Mode
                            </label>
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-bg-surface border border-border-subtle text-text-secondary">
                                {brandDisplayMode === 'LOGO' ? 'Image Logo' : 'Text Wordmark'}
                            </span>
                        </div>
                        <p className="text-xs text-text-secondary">
                            Switch between the high-resolution logo graphic or an editorial typography wordmark.
                        </p>

                        <div className="grid grid-cols-2 gap-2.5 pt-1">
                            <button
                                type="button"
                                disabled={isReadOnly}
                                onClick={() => handleBrandDisplayModeChange('LOGO')}
                                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                                    isReadOnly ? 'cursor-not-allowed opacity-75' : ''
                                } ${
                                    brandDisplayMode === 'LOGO'
                                        ? 'border-brand-primary bg-brand-primary/10 text-brand-primary ring-1 ring-brand-primary shadow-xs'
                                        : 'border-border-subtle bg-bg-surface hover:border-border-strong text-text-secondary'
                                }`}
                            >
                                <ImageIcon className="w-3.5 h-3.5" />
                                Image Logo
                            </button>
                            <button
                                type="button"
                                disabled={isReadOnly}
                                onClick={() => handleBrandDisplayModeChange('WORDMARK')}
                                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                                    isReadOnly ? 'cursor-not-allowed opacity-75' : ''
                                } ${
                                    brandDisplayMode === 'WORDMARK'
                                        ? 'border-brand-primary bg-brand-primary/10 text-brand-primary ring-1 ring-brand-primary shadow-xs'
                                        : 'border-border-subtle bg-bg-surface hover:border-border-strong text-text-secondary'
                                }`}
                            >
                                <Type className="w-3.5 h-3.5" />
                                Text Wordmark
                            </button>
                        </div>
                    </div>

                    {/* Theme Color Palette */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                            <Palette className="w-4 h-4 text-brand-primary" />
                            Theme Color Palette
                        </label>
                        <p className="text-xs text-text-secondary">
                            Select the primary accent color for table headers, borders, corner slants, and total banners.
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-2.5 pt-1">
                            {PRESET_COLORS.map(p => {
                                const isSelected = activeColor?.toLowerCase() === p.hex.toLowerCase();
                                return (
                                    <button
                                        key={p.hex}
                                        type="button"
                                        disabled={isReadOnly}
                                        onClick={() => handleColorChange(p.hex)}
                                        className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                                            isReadOnly ? 'cursor-not-allowed opacity-75' : ''
                                        } ${
                                            isSelected 
                                                ? 'border-transparent text-text-primary shadow-sm ring-2 ring-offset-2 ring-offset-bg-card' 
                                                : 'border-border-subtle text-text-secondary hover:border-border-strong bg-bg-card'
                                        }`}
                                        style={isSelected ? { borderColor: p.hex, outlineColor: p.hex } : {}}
                                        title={p.name}
                                    >
                                        <span 
                                            className="w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-xs shrink-0" 
                                            style={{ backgroundColor: p.hex }}
                                        >
                                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                        </span>
                                        <span>{p.name}</span>
                                    </button>
                                );
                            })}

                            {/* Custom Color Picker Chip */}
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border-subtle bg-bg-card text-xs">
                                <input
                                    type="color"
                                    id="custom-pdf-theme-color"
                                    disabled={isReadOnly}
                                    value={activeColor}
                                    onChange={(e) => handleColorChange(e.target.value)}
                                    className={`w-6 h-6 rounded border-0 bg-transparent p-0 ${isReadOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                    title={isReadOnly ? "Color Locked" : "Choose Custom Color"}
                                />
                                <span className="font-mono text-text-secondary text-[11px] uppercase font-bold">
                                    {activeColor}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Template Style Switch */}
                    <div className="space-y-3 pt-1">
                        <label className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                            <Layout className="w-4 h-4 text-brand-primary" />
                            Template Layout Style
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                disabled={isReadOnly}
                                onClick={() => handleTemplateChange('modern')}
                                className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                                    isReadOnly ? 'cursor-not-allowed opacity-75' : ''
                                } ${
                                    templateStyle === 'modern'
                                        ? 'border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary'
                                        : 'border-border-subtle hover:border-border-strong bg-bg-card'
                                }`}
                            >
                                <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                                    Modern Standard
                                    {templateStyle === 'modern' && <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary" />}
                                </span>
                                <span className="text-[11px] text-text-muted mt-0.5">
                                    Full color banner headers, corner triangles, and shaded panels.
                                </span>
                            </button>

                            <button
                                type="button"
                                disabled={isReadOnly}
                                onClick={() => handleTemplateChange('minimalist')}
                                className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                                    isReadOnly ? 'cursor-not-allowed opacity-75' : ''
                                } ${
                                    templateStyle === 'minimalist'
                                        ? 'border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary'
                                        : 'border-border-subtle hover:border-border-strong bg-bg-card'
                                }`}
                            >
                                <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                                    Clean Minimalist
                                    {templateStyle === 'minimalist' && <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary" />}
                                </span>
                                <span className="text-[11px] text-text-muted mt-0.5">
                                    Subtle borders, clean editorial lines, and monochromatic highlights.
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Column Visibility Toggles */}
                    <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                                <Layers className="w-4 h-4 text-brand-primary" />
                                Column & Section Visibility Toggles
                            </label>
                            <span className="text-[11px] text-text-muted">Dynamic Reflow</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {/* Show HSN / SAC */}
                            <label className={`flex items-center justify-between p-3 rounded-xl border border-border-subtle bg-bg-card transition-colors ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'hover:bg-bg-surface cursor-pointer'}`}>
                                <span className="text-xs font-medium text-text-primary">Show HSN / SAC Code</span>
                                <input
                                    type="checkbox"
                                    disabled={isReadOnly}
                                    checked={showHsn}
                                    onChange={(e) => updateConfig('hsnSac', { visible: e.target.checked })}
                                    className="toggle-checkbox h-4 w-4 rounded text-brand-primary focus:ring-0 cursor-pointer accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </label>

                            {/* Show SKU */}
                            <label className={`flex items-center justify-between p-3 rounded-xl border border-border-subtle bg-bg-card transition-colors ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'hover:bg-bg-surface cursor-pointer'}`}>
                                <span className="text-xs font-medium text-text-primary">Show SKU</span>
                                <input
                                    type="checkbox"
                                    disabled={isReadOnly}
                                    checked={showSku}
                                    onChange={(e) => updateConfig('sku', { visible: e.target.checked })}
                                    className="toggle-checkbox h-4 w-4 rounded text-brand-primary focus:ring-0 cursor-pointer accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </label>

                            {/* Show Unit & List Price */}
                            <label className={`flex items-center justify-between p-3 rounded-xl border border-border-subtle bg-bg-card transition-colors ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'hover:bg-bg-surface cursor-pointer'}`}>
                                <span className="text-xs font-medium text-text-primary">Show Unit & List Price</span>
                                <input
                                    type="checkbox"
                                    disabled={isReadOnly}
                                    checked={showPrice}
                                    onChange={(e) => toggleColumns(['unitPrice', 'listPrice'], e.target.checked)}
                                    className="toggle-checkbox h-4 w-4 rounded text-brand-primary focus:ring-0 cursor-pointer accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </label>

                            {/* Show Discount Column */}
                            <label className={`flex items-center justify-between p-3 rounded-xl border border-border-subtle bg-bg-card transition-colors ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'hover:bg-bg-surface cursor-pointer'}`}>
                                <span className="text-xs font-medium text-text-primary">Show Discount Column</span>
                                <input
                                    type="checkbox"
                                    disabled={isReadOnly}
                                    checked={showDiscount}
                                    onChange={(e) => updateConfig('discountPercent', { visible: e.target.checked })}
                                    className="toggle-checkbox h-4 w-4 rounded text-brand-primary focus:ring-0 cursor-pointer accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </label>

                            {/* Show Tax Breakdown */}
                            <label className={`flex items-center justify-between p-3 rounded-xl border border-border-subtle bg-bg-card transition-colors ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'hover:bg-bg-surface cursor-pointer'}`}>
                                <span className="text-xs font-medium text-text-primary">Show Tax Breakdown</span>
                                <input
                                    type="checkbox"
                                    disabled={isReadOnly}
                                    checked={showTax}
                                    onChange={(e) => toggleColumns(['taxPercent', 'taxAmount'], e.target.checked)}
                                    className="toggle-checkbox h-4 w-4 rounded text-brand-primary focus:ring-0 cursor-pointer accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </label>

                            {/* Show Bank Details Card */}
                            <label className={`flex items-center justify-between p-3 rounded-xl border border-border-subtle bg-bg-card transition-colors ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'hover:bg-bg-surface cursor-pointer'}`}>
                                <span className="text-xs font-medium text-text-primary">Show Bank Details Card</span>
                                <input
                                    type="checkbox"
                                    disabled={isReadOnly}
                                    checked={showBank}
                                    onChange={(e) => updateConfig('bankDetails', { visible: e.target.checked, isCustom: true })}
                                    className="toggle-checkbox h-4 w-4 rounded text-brand-primary focus:ring-0 cursor-pointer accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </label>

                            {/* Show Terms & Conditions */}
                            <label className={`flex items-center justify-between p-3 rounded-xl border border-border-subtle bg-bg-card transition-colors ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'hover:bg-bg-surface cursor-pointer'}`}>
                                <span className="text-xs font-medium text-text-primary">Show Terms & Conditions</span>
                                <input
                                    type="checkbox"
                                    disabled={isReadOnly}
                                    checked={showTerms}
                                    onChange={(e) => updateConfig('termsAndConditions', { visible: e.target.checked, isCustom: true })}
                                    className="toggle-checkbox h-4 w-4 rounded text-brand-primary focus:ring-0 cursor-pointer accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </label>

                            {/* Show Company Stamp & Signature */}
                            <label className={`flex items-center justify-between p-3 rounded-xl border border-border-subtle bg-bg-card transition-colors ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'hover:bg-bg-surface cursor-pointer'}`}>
                                <span className="text-xs font-medium text-text-primary">Show Authorized Signature</span>
                                <input
                                    type="checkbox"
                                    disabled={isReadOnly}
                                    checked={showSignature}
                                    onChange={(e) => updateConfig('signature', { visible: e.target.checked, isCustom: true })}
                                    className="toggle-checkbox h-4 w-4 rounded text-brand-primary focus:ring-0 cursor-pointer accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </label>
                        </div>
                    </div>
                </div>
                </div>
                )}

                {/* RIGHT PANEL: Dynamic Live PDF Canvas */}
                <div className={`${shouldShowLeftPanel ? 'lg:col-span-6' : 'lg:col-span-12 max-w-4xl mx-auto w-full'} p-6 flex flex-col bg-slate-900/5 dark:bg-black/20`}>
                    
                    {/* Canvas Controls Toolbar */}
                    <div className="flex flex-wrap items-center justify-between pb-4 border-b border-border-subtle gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5 text-brand-primary" />
                                {isReadOnly && !customLayoutEnabled ? 'Official Standard Delivered PDF Preview' : 'Live A4 Document Canvas'}
                            </span>
                            {isReadOnly && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 shadow-2xs">
                                    <CheckCircle2 className="w-2.5 h-2.5" /> Delivered to Client
                                </span>
                            )}
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-surface border border-border-subtle text-text-muted">
                                {zoomLevel}%
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            {isReadOnly && !customLayoutEnabled && (
                                <button
                                    type="button"
                                    onClick={onDownloadPdf}
                                    disabled={isDownloadingPdf}
                                    className="btn btn-primary btn-xs flex items-center gap-1.5 font-semibold shadow-xs mr-1"
                                    style={{ backgroundColor: effectiveColor, borderColor: effectiveColor }}
                                    title="Download Official Delivered PDF"
                                >
                                    <Download className="w-3 h-3" />
                                    {isDownloadingPdf ? 'Downloading...' : 'Download Delivered PDF'}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))}
                                className="p-1.5 rounded-lg border border-border-subtle bg-bg-card hover:bg-bg-surface text-text-secondary"
                                title="Zoom Out"
                            >
                                <ZoomOut className="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setZoomLevel(75)}
                                className="px-2 py-1 text-[11px] font-semibold rounded-lg border border-border-subtle bg-bg-card hover:bg-bg-surface text-text-secondary"
                                title="Reset Zoom to 75% (Best Fit)"
                            >
                                Fit
                            </button>
                            <button
                                type="button"
                                onClick={() => setZoomLevel(prev => Math.min(140, prev + 10))}
                                className="p-1.5 rounded-lg border border-border-subtle bg-bg-card hover:bg-bg-surface text-text-secondary"
                                title="Zoom In"
                            >
                                <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsFullScreen(prev => !prev)}
                                className="p-1.5 rounded-lg border border-border-subtle bg-bg-card hover:bg-bg-surface text-text-secondary"
                                title="Full-Screen Preview"
                            >
                                {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    </div>

                    {/* Live A4 Canvas Container */}
                    <div className={`mt-4 overflow-x-hidden overflow-y-auto flex justify-center py-4 rounded-xl transition-all ${
                        isFullScreen 
                            ? 'fixed inset-0 z-50 bg-black/85 backdrop-blur-sm p-8 flex items-center justify-center overflow-auto' 
                            : 'max-h-[780px]'
                    }`}>
                        {isFullScreen && (
                            <button
                                type="button"
                                onClick={() => setIsFullScreen(false)}
                                className="absolute top-4 right-4 p-2.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors shadow-lg z-50"
                            >
                                <Minimize2 className="w-5 h-5" />
                            </button>
                        )}

                        {/* High-Fidelity A4 Paper Document Preview Container (Dimension-Matched) */}
                        <div 
                            style={{ 
                                width: `${Math.round(595 * (zoomLevel / 100))}px`,
                                height: `${Math.round(842 * (zoomLevel / 100))}px`,
                                minHeight: `${Math.round(842 * (zoomLevel / 100))}px`
                            }}
                            className="relative shrink-0 transition-all duration-150"
                        >
                            <div 
                                style={{ 
                                    transform: `scale(${zoomLevel / 100})`, 
                                    transformOrigin: 'top left',
                                    width: '595px',
                                    minHeight: '842px',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0
                                }}
                                className="bg-white text-slate-800 rounded shadow-2xl p-8 border border-slate-200 transition-transform duration-150 flex flex-col justify-between overflow-hidden"
                            >
                            {/* Decorative Top-Right Corner Slant Triangles (Matching OpenPDF PageEvent) */}
                            <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden pointer-events-none rounded-tr z-0">
                                <div 
                                    className="absolute top-0 right-0 w-28 h-28 transform rotate-45 translate-x-14 -translate-y-14"
                                    style={{ backgroundColor: '#3891EB' }}
                                />
                                <div 
                                    className="absolute top-0 right-0 w-20 h-20 transform rotate-45 translate-x-10 -translate-y-10"
                                    style={{ backgroundColor: effectiveColor }}
                                />
                            </div>

                            {/* Decorative Bottom-Right Corner Slant Triangles (Matching OpenPDF PageEvent) */}
                            <div className="absolute bottom-0 right-0 w-20 h-20 overflow-hidden pointer-events-none rounded-br z-0">
                                <div 
                                    className="absolute bottom-0 right-0 w-24 h-24 transform rotate-45 translate-x-14 translate-y-14"
                                    style={{ backgroundColor: '#3891EB' }}
                                />
                                <div 
                                    className="absolute bottom-0 right-0 w-16 h-16 transform rotate-45 translate-x-8 translate-y-8"
                                    style={{ backgroundColor: effectiveColor }}
                                />
                            </div>

                            {/* Inner Page Document Content */}
                            <div className="relative z-10 space-y-3.5">
                                                            {/* 1. Top Header: Title & Company Info + Logo/Wordmark */}
                                <div className="flex justify-between items-start pb-3 border-b border-slate-200">
                                    <div className="space-y-0.5 max-w-[340px]">
                                        <h1 
                                            className="text-[22px] font-black tracking-tight leading-none mb-1"
                                            style={{ color: effectiveColor }}
                                        >
                                            QUOTATION
                                        </h1>
                                        <p 
                                            className="text-[11px] font-bold uppercase tracking-tight leading-snug"
                                            style={{ color: effectiveColor }}
                                        >
                                            {resolvedCompanyName}
                                        </p>
                                        {resolvedGstin && (
                                            <p className="text-[9.5px] text-slate-700 font-bold font-mono">
                                                GSTIN: <span className="font-semibold">{resolvedGstin}</span>
                                            </p>
                                        )}
                                        {resolvedPan && (
                                            <p className="text-[9.5px] text-slate-700 font-bold font-mono">
                                                PAN: <span className="font-semibold">{resolvedPan}</span>
                                            </p>
                                        )}
                                        {resolvedVatId && (
                                            <p className="text-[9.5px] text-slate-700 font-bold font-mono">
                                                VAT/Tax ID: <span className="font-semibold">{resolvedVatId}</span>
                                            </p>
                                        )}
                                        {addressLines.length > 0 && (
                                            <div className="text-[9px] text-slate-500 leading-tight pt-0.5">
                                                {addressLines.map((line, idx) => (
                                                    <p key={idx}>{line}</p>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="text-right flex flex-col items-end pr-10">
                                        <span className="text-[8.5px] font-bold tracking-wider text-slate-400 uppercase mb-2">
                                            Original for Recipient
                                        </span>
                                        {effectiveBrandDisplayMode === 'WORDMARK' ? (
                                            <div className="text-right pt-1">
                                                <span 
                                                    className="text-base font-black uppercase tracking-wider block"
                                                    style={{ color: effectiveColor }}
                                                >
                                                    {resolvedBrandName}
                                                </span>
                                                <span className="text-[9px] text-slate-400 font-bold tracking-tight block">
                                                    CORPORATE SALES
                                                </span>
                                            </div>
                                        ) : resolvedLogoUrl ? (
                                            <img 
                                                src={resolvedLogoUrl} 
                                                alt="Company Logo" 
                                                className="h-10 max-w-[140px] object-contain" 
                                            />
                                        ) : (
                                            <div 
                                                 className="px-3 py-1.5 rounded font-black text-xs tracking-tight text-white shadow-xs"
                                                style={{ backgroundColor: effectiveColor }}
                                            >
                                                {resolvedBrandName.slice(0, 16)}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 2. Metadata Cards Row (Quotation No, Date, Validity) */}
                                <div className="grid grid-cols-3 gap-2">
                                    {/* Quotation No Card */}
                                    <div className="p-2 rounded bg-[#F0F6FE] border border-[#D0E2FF] flex items-center gap-2">
                                        <div 
                                            className="w-6 h-6 rounded flex items-center justify-center text-white shrink-0 shadow-2xs"
                                            style={{ backgroundColor: effectiveColor }}
                                        >
                                            <FileText className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[8.5px] text-slate-500 uppercase font-bold tracking-tight leading-none">Quotation No.</p>
                                            <p className="text-[11px] font-bold text-slate-900 font-mono mt-0.5 truncate">
                                                {quotationNumber || 'QT-DRAFT'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Quotation Date Card */}
                                    <div className="p-2 rounded bg-[#F0F6FE] border border-[#D0E2FF]">
                                        <p className="text-[8.5px] text-slate-500 uppercase font-bold tracking-tight leading-none">Quotation Date</p>
                                        <p className="text-[11px] font-semibold text-slate-800 mt-0.5">
                                            {issueDate || 'Today'}
                                        </p>
                                    </div>

                                    {/* Validity Card */}
                                    <div className="p-2 rounded bg-[#F0F6FE] border border-[#D0E2FF]">
                                        <p className="text-[8.5px] text-slate-500 uppercase font-bold tracking-tight leading-none">Validity</p>
                                        <p className="text-[11px] font-semibold text-slate-800 mt-0.5">
                                            {validUntil || '30 Days'}
                                        </p>
                                    </div>
                                </div>

                                {/* 3. Customer & Place of Supply Details (2-Column Box Layout) */}
                                <div className="grid grid-cols-2 gap-2">
                                    {/* Left Box: Customer Details */}
                                    <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-[9.5px] space-y-0.5">
                                        <div className="flex items-center gap-1.5 font-bold mb-1" style={{ color: effectiveColor }}>
                                            <User className="w-3 h-3" />
                                            <span className="uppercase text-[9px] tracking-wider">Customer Details</span>
                                        </div>
                                        <div className="text-slate-900 font-bold text-[11px]">
                                            {clientName || 'Valued Customer'}
                                        </div>
                                        {clientCompany && (
                                            <p className="text-slate-700 font-medium">{clientCompany}</p>
                                        )}
                                        {clientEmail && (
                                            <p className="text-slate-500 font-mono text-[9px]">Email: {clientEmail}</p>
                                        )}
                                        {clientPhone && (
                                            <p className="text-slate-500 font-mono text-[9px]">Phone: {clientPhone}</p>
                                        )}
                                    </div>

                                    {/* Right Box: Billing & Supply Details */}
                                    <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-[9.5px] space-y-0.5">
                                        <div className="flex items-center gap-1.5 font-bold mb-1" style={{ color: effectiveColor }}>
                                            <MapPin className="w-3 h-3" />
                                            <span className="uppercase text-[9px] tracking-wider">Billing & Place of Supply</span>
                                        </div>
                                        {gstin && (
                                            <p className="text-slate-700 font-mono font-bold">
                                                GSTIN: <span className="font-semibold">{gstin}</span>
                                            </p>
                                        )}
                                        {state && (
                                            <p className="text-slate-700 font-medium">Place of Supply: {state}</p>
                                        )}
                                        {billingAddress && (
                                            <p className="text-slate-600 leading-tight pt-0.5">{billingAddress}</p>
                                        )}
                                        {shippingAddress && (
                                            <p className="text-slate-500 text-[8.5px] italic pt-0.5">Ship: {shippingAddress}</p>
                                        )}
                                    </div>
                                </div>

                                {/* 4. Line Items Table (Dynamic Columns matching OpenPDF) */}
                                <div className="overflow-hidden rounded border border-slate-200">
                                    <table className="w-full text-left text-[9.5px] border-collapse">
                                        <thead>
                                            <tr 
                                                className="text-white font-bold"
                                                style={{ 
                                                    backgroundColor: effectiveTemplateStyle === 'modern' ? effectiveColor : '#0F172A'
                                                }}
                                            >
                                                <th className="py-2 px-1.5 text-center w-7">#</th>
                                                {effectiveShowSku && <th className="py-2 px-1.5">SKU</th>}
                                                <th className="py-2 px-2">DESCRIPTION</th>
                                                {effectiveShowHsn && <th className="py-2 px-1.5 text-center">HSN/SAC</th>}
                                                <th className="py-2 px-1.5 text-center w-9">QTY</th>
                                                {effectiveShowPrice && <th className="py-2 px-2 text-right">UNIT PRICE</th>}
                                                {effectiveShowDiscount && <th className="py-2 px-1.5 text-center">DISC %</th>}
                                                {effectiveShowTax && <th className="py-2 px-2 text-right">TAX AMT</th>}
                                                <th className="py-2 px-2 text-right">TOTAL ({curSym})</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {items.length > 0 ? (
                                                 items.map((it, idx) => (
                                                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                                                        <td className="py-2 px-1.5 text-center text-slate-400 font-mono text-[9px]">{idx + 1}</td>
                                                        {effectiveShowSku && <td className="py-2 px-1.5 font-mono text-slate-600 text-[9px]">{it.sku || '—'}</td>}
                                                        <td className="py-2 px-2 font-medium text-slate-800">
                                                            {it.name || it.description || `Item ${idx + 1}`}
                                                        </td>
                                                        {effectiveShowHsn && <td className="py-2 px-1.5 text-center font-mono text-slate-500 text-[9px]">{it.hsnSac || '—'}</td>}
                                                        <td className="py-2 px-1.5 text-center font-bold text-slate-800">{it.quantity || 1}</td>
                                                        {effectiveShowPrice && (
                                                            <td className="py-2 px-2 text-right font-mono text-slate-700">
                                                                {formatCurrency(it.unitPrice || it.listPrice || 0, currency, 2)}
                                                            </td>
                                                        )}
                                                        {effectiveShowDiscount && (
                                                            <td className="py-2 px-1.5 text-center font-mono text-slate-500">
                                                                {it.discountPercent ? `${it.discountPercent}%` : '0%'}
                                                            </td>
                                                        )}
                                                        {effectiveShowTax && (
                                                            <td className="py-2 px-2 text-right font-mono text-slate-500">
                                                                {formatCurrency(it.taxAmount || 0, currency, 2)}
                                                            </td>
                                                        )}
                                                        <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                                                            {formatCurrency(it.total || 0, currency, 2)}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={10} className="py-6 text-center text-slate-400 text-xs italic">
                                                        No quotation line items added yet.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* 5. Totals Summary Block (Right Aligned) */}
                                <div className="flex justify-end">
                                    <div className="w-56 text-[10px] space-y-1">
                                        <div className="flex justify-between text-slate-600">
                                            <span>Subtotal (Gross):</span>
                                            <span className="font-mono font-semibold text-slate-800">
                                                {formatCurrency(totals.subtotalBeforeTax || 0, currency, 2)}
                                            </span>
                                        </div>
                                        {totals.discount > 0 && (
                                            <div className="flex justify-between text-rose-600">
                                                <span>Total Discount:</span>
                                                <span className="font-mono font-semibold">
                                                    -{formatCurrency(totals.discount, currency, 2)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-slate-600">
                                            <span>Taxable Amount:</span>
                                            <span className="font-mono font-semibold text-slate-800">
                                                {formatCurrency(totals.taxableAmount || 0, currency, 2)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-slate-600 pb-1 border-b border-slate-200">
                                            <span>Total Tax:</span>
                                            <span className="font-mono font-semibold text-slate-800">
                                                {formatCurrency(totals.tax || 0, currency, 2)}
                                            </span>
                                        </div>
                                        {/* Grand Total Solid Theme Banner */}
                                        <div 
                                            className="flex justify-between p-2 rounded text-white font-bold text-xs shadow-xs"
                                            style={{ backgroundColor: effectiveColor }}
                                        >
                                            <span className="uppercase tracking-wider">Grand Total:</span>
                                            <span className="font-mono text-sm tracking-tight">
                                                {formatCurrency(totals.grandTotal || 0, currency, 2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* 6. Total Amount in Words Panel (Matching OpenPDF) */}
                                <div className="p-2 rounded bg-[#F0F6FE] border border-[#D0E2FF] text-[9.5px]">
                                    <span className="font-bold text-slate-800">Total amount (in words): </span>
                                    <span className="font-bold font-mono" style={{ color: effectiveColor }}>
                                        {amountInWords}
                                    </span>
                                </div>

                                {/* 7. Terms & Conditions Card (if effectiveShowTerms) */}
                                {effectiveShowTerms && (
                                    <div className="p-2.5 rounded bg-[#F0F6FE] border border-[#D0E2FF] text-[9px]">
                                        <p className="font-bold flex items-center gap-1.5 mb-1 text-[9.5px]" style={{ color: effectiveColor }}>
                                            <FileText className="w-3 h-3" /> Terms & Conditions
                                        </p>
                                        <div className="text-slate-600 leading-snug space-y-0.5 whitespace-pre-line pl-1">
                                            {termsAndConditions || '1. Validity of this quotation is 30 days from date of issue.\n2. Payment terms as agreed upon.\n3. Goods once dispatched cannot be cancelled.'}
                                        </div>
                                    </div>
                                )}

                                {/* 8. Bottom Grid: Bank Details + Authorized Signatory */}
                                {(effectiveShowBank || effectiveShowSignature) && (
                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                        {/* Bank Details Panel */}
                                        {effectiveShowBank ? (
                                            <div className="p-2.5 rounded bg-[#F0F6FE] border border-[#D0E2FF] text-[9px] space-y-0.5">
                                                <p className="font-bold flex items-center gap-1.5 mb-1 text-[9.5px]" style={{ color: effectiveColor }}>
                                                    <Landmark className="w-3 h-3" /> Bank Details
                                                </p>
                                                <div className="grid grid-cols-3 gap-1">
                                                    <span className="text-slate-500">Bank:</span>
                                                    <span className="col-span-2 text-slate-800 font-semibold">{selectedBank?.bankName || 'Acrovix Operating Bank'}</span>
                                                    
                                                    <span className="text-slate-500">Account:</span>
                                                    <span className="col-span-2 text-slate-800 font-mono font-bold">{selectedBank?.bankAccountNumber || '••••••••1234'}</span>

                                                    <span className="text-slate-500">IFSC:</span>
                                                    <span className="col-span-2 text-slate-800 font-mono">{selectedBank?.bankIfsc || 'HDFC0001234'}</span>

                                                    {selectedBank?.bankBranch && (
                                                         <>
                                                            <span className="text-slate-500">Branch:</span>
                                                            <span className="col-span-2 text-slate-700">{selectedBank.bankBranch}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ) : <div />}

                                        {/* Authorized Signatory Panel */}
                                        {effectiveShowSignature ? (
                                            <div className="p-2 rounded border border-dashed border-slate-300 text-center flex flex-col justify-end bg-slate-50/50">
                                                <p className="text-[9.5px] font-bold text-slate-800">
                                                    For {resolvedCompanyName}
                                                </p>
                                                <div className="h-9 flex items-center justify-center my-0.5">
                                                    <ShieldCheck className="w-5 h-5 text-emerald-600 opacity-70" />
                                                </div>
                                                <p className="text-[8.5px] text-slate-500 uppercase font-semibold">
                                                    Authorized Signatory
                                                </p>
                                            </div>
                                        ) : <div />}
                                    </div>
                                )}
                            </div>

                            {/* 9. Digital Document Disclaimer & Footer Contact Bar */}
                            <div className="relative z-10 pt-4 border-t border-slate-200 text-center space-y-1">
                                <p className="text-[8px] text-slate-400 italic">
                                    This is a digitally generated document and does not require a physical signature. Powered by Acrovix Innovations.
                                </p>
                                <div className="flex flex-wrap items-center justify-center gap-x-4 text-[8.5px] text-slate-500 font-medium">
                                    {resolvedPhone && <span>Phone: {resolvedPhone}</span>}
                                    {resolvedEmail && <span>Email: {resolvedEmail}</span>}
                                    {resolvedWebsite && <span>Web: {resolvedWebsite}</span>}
                                </div>
                            </div>

                        </div>
                        </div>
                    </div>
                </div>

            </div>
            )}
        </section>
    );
}
