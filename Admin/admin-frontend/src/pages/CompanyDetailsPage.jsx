import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
    Building2, ChevronRight, Edit3, Save, X, Loader2, CheckCircle, 
    AlertCircle, FileText, Globe, Mail, Phone, MapPin, Image as ImageIcon,
    Palette, DollarSign, Clock, ShieldCheck, Upload, Sparkles
} from 'lucide-react';
import { getCompanySettings, updateCompanySettings, uploadTenantLogo, resolveAssetUrl } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useTenant } from '../context/TenantContext';
import logoDarkExpanded from '../assets/acrovix_logo_dark.png';
import { extractDominantColor } from '../utils/colorExtractor';

const CURRENCIES = [
    { code: 'USD', symbol: '$', label: 'USD ($) - US Dollar' },
    { code: 'INR', symbol: '₹', label: 'INR (₹) - Indian Rupee' },
    { code: 'EUR', symbol: '€', label: 'EUR (€) - Euro' },
    { code: 'GBP', symbol: '£', label: 'GBP (£) - British Pound' },
    { code: 'AED', symbol: 'AED', label: 'AED - UAE Dirham' },
    { code: 'CAD', symbol: 'CA$', label: 'CAD ($) - Canadian Dollar' },
    { code: 'AUD', symbol: 'AU$', label: 'AUD ($) - Australian Dollar' },
    { code: 'SGD', symbol: 'SG$', label: 'SGD ($) - Singapore Dollar' }
];

const TIMEZONES = [
    { value: 'America/New_York', label: 'America/New_York (EST/EDT, UTC-5/UTC-4)' },
    { value: 'America/Chicago', label: 'America/Chicago (CST/CDT, UTC-6/UTC-5)' },
    { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT, UTC-8/UTC-7)' },
    { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, UTC+5:30)' },
    { value: 'Europe/London', label: 'Europe/London (GMT/BST, UTC+0/UTC+1)' },
    { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST, UTC+1/UTC+2)' },
    { value: 'Asia/Dubai', label: 'Asia/Dubai (GST, UTC+4)' },
    { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT, UTC+8)' },
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' }
];

export default function CompanyDetailsPage() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { refreshBranding } = useTenant();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);

    const [form, setForm] = useState({
        companyName: '',
        brandName: '',
        legalName: '',
        gstin: '',
        pan: '',
        vatId: '',
        email: '',
        phone: '',
        website: '',
        registeredAddress: '',
        billingAddress: '',
        logoUrl: '',
        primaryColor: '#0f766e',
        secondaryColor: '#0284c7',
        currencyCode: 'USD',
        currencySymbol: '$',
        timezone: 'America/New_York',
        defaultPaymentTerms: '',
        defaultTermsAndConditions: '',
        signatureUrl: ''
    });

    const [initialForm, setInitialForm] = useState({});

    const handleLogoColorExtraction = async (logoSrc) => {
        if (!logoSrc) return;
        try {
            const resolvedSrc = resolveAssetUrl(logoSrc);
            const detectedColor = await extractDominantColor(resolvedSrc);
            if (detectedColor && detectedColor !== '#000000') {
                setForm(prev => ({
                    ...prev,
                    logoUrl: logoSrc,
                    primaryColor: detectedColor
                }));

                // Immediately inject into root CSS variables
                const root = document.documentElement;
                root.style.setProperty('--primary-color', detectedColor);
                root.style.setProperty('--brand-primary', detectedColor);
                root.style.setProperty('--theme-brand-primary', detectedColor);
                root.style.setProperty('--color-primary', detectedColor);

                showToast({
                    type: 'success',
                    message: 'Theme color auto-detected from your logo!'
                });
            }
        } catch (err) {
            console.error('Failed to auto-extract logo color:', err);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Restrict file size to max 2MB
        if (file.size > 2 * 1024 * 1024) {
            showToast({ type: 'error', message: 'Logo file size exceeds 2MB limit.' });
            return;
        }

        // Restrict file types: PNG, JPEG, WEBP, SVG
        const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
            showToast({ type: 'error', message: 'Allowed image types: PNG, JPEG, WEBP, SVG.' });
            return;
        }

        try {
            setIsUploadingLogo(true);
            const res = await uploadTenantLogo(file);
            if (res && res.url) {
                const shortUrl = res.url;
                setForm(prev => ({ ...prev, logoUrl: shortUrl }));
                showToast({ type: 'success', message: 'Logo uploaded successfully.' });
                // Trigger auto-color extraction from uploaded logo
                handleLogoColorExtraction(shortUrl);
            }
        } catch (err) {
            showToast({ type: 'error', message: err.message || 'Failed to upload logo.' });
        } finally {
            setIsUploadingLogo(false);
            if (e.target) e.target.value = '';
        }
    };

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await getCompanySettings();
            if (data) {
                const loaded = {
                    companyName: data.companyName || '',
                    brandName: data.brandName || data.companyName || '',
                    legalName: data.legalName || data.companyName || '',
                    gstin: data.gstin || '',
                    pan: data.pan || '',
                    vatId: data.vatId || data.vatNumber || data.taxIdentifier || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    website: data.website || '',
                    registeredAddress: data.registeredAddress || '',
                    billingAddress: data.billingAddress || '',
                    logoUrl: data.logoUrl || '',
                    primaryColor: data.primaryColor || '#0f766e',
                    secondaryColor: data.secondaryColor || '#0284c7',
                    currencyCode: data.currencyCode || 'USD',
                    currencySymbol: data.currencySymbol || '$',
                    timezone: data.timezone || 'America/New_York',
                    defaultPaymentTerms: data.defaultPaymentTerms || '',
                    defaultTermsAndConditions: data.defaultTermsAndConditions || '',
                    signatureUrl: data.signatureUrl || ''
                };
                setForm(loaded);
                setInitialForm(loaded);
            }
        } catch (error) {
            console.error('Failed to load company details', error);
            showToast({ type: 'error', message: 'Failed to load company details.' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCurrencySelect = (code) => {
        const found = CURRENCIES.find(c => c.code === code) || { code: 'USD', symbol: '$' };
        setForm(prev => ({
            ...prev,
            currencyCode: found.code,
            currencySymbol: found.symbol
        }));
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setIsSaving(true);
        try {
            // Ensure companyName, legalName, email, phone have safe defaults for backend bean validation
            const payload = {
                ...form,
                companyName: form.companyName || form.brandName || 'Acrovix Innovations Private Limited',
                legalName: form.legalName || form.companyName || form.brandName || 'Acrovix Innovations Private Limited',
                brandName: form.brandName || form.companyName || 'Acrovix Innovations',
                email: form.email || 'billing@acrovix.com',
                phone: form.phone || '+91 98765 43210'
            };

            await updateCompanySettings(payload);
            if (refreshBranding) {
                await refreshBranding();
            }

            showToast({ type: 'success', message: 'Company settings and branding saved successfully.' });
            setInitialForm(payload);
            setForm(payload);
            setIsEditing(false);
        } catch (error) {
            showToast({ type: 'error', message: error.message || 'Failed to save company details.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setForm(initialForm);
        setIsEditing(false);
    };

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-16 max-w-6xl mx-auto">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-[12px] text-text-muted">
                <Link to="/company-bank-details" className="hover:text-brand-primary transition-colors">
                    Company & Bank Details
                </Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="font-semibold text-text-primary">Company & Branding Settings</span>
            </div>

            {/* Heading & Edit Button Bar */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                        <h1 className="text-[24px] font-bold text-text-primary tracking-tight leading-tight">
                            Company & Branding Settings
                        </h1>
                        <p className="text-[12px] text-text-muted mt-0.5">
                            Manage your tenant identity, custom logo, theme brand colors, and localization.
                        </p>
                    </div>
                </div>

                {!isEditing ? (
                    <button
                        id="editCompanySettingsBtn"
                        onClick={() => setIsEditing(true)}
                        className="btn btn-primary btn-md shadow-sm"
                    >
                        <Edit3 className="w-4 h-4" />
                        <span>Edit Settings</span>
                    </button>
                ) : (
                    <div className="flex items-center gap-2">
                        <button
                            id="cancelCompanySettingsBtn"
                            type="button"
                            onClick={handleCancel}
                            disabled={isSaving}
                            className="btn btn-secondary btn-md"
                        >
                            <X className="w-4 h-4" />
                            <span>Cancel</span>
                        </button>
                        <button
                            id="saveCompanySettingsBtn"
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="btn btn-primary btn-md shadow-sm"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            <span>Save Changes</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Card 1: Company Profile & Identity */}
            <div className="acx-card p-6 bg-white dark:bg-bg-card border border-border-subtle rounded-[20px] shadow-sm">
                <div className="flex items-center gap-2.5 mb-6 pb-3 border-b border-border-subtle/60">
                    <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
                        <Building2 className="w-4 h-4" />
                    </div>
                    <h2 className="text-[15px] font-bold text-text-primary tracking-tight">
                        Company Identity & Profile
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">
                                Brand Name (Navbar Display) *
                            </label>
                            {isEditing ? (
                                <input
                                    id="brandNameInput"
                                    type="text"
                                    placeholder="e.g. Apex Global Technologies"
                                    value={form.brandName}
                                    onChange={(e) => setForm({ ...form, brandName: e.target.value })}
                                    className="acx-input text-[13px] font-semibold"
                                    required
                                />
                            ) : (
                                <div id="displayBrandName" className="text-[15px] font-bold text-text-primary">
                                    {form.brandName || form.companyName || 'Acrovix Innovations'}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">
                                Company / Legal Name *
                            </label>
                            {isEditing ? (
                                <input
                                    id="companyNameInput"
                                    type="text"
                                    placeholder="Full registered legal company name"
                                    value={form.companyName}
                                    onChange={(e) => setForm({ ...form, companyName: e.target.value, legalName: form.legalName || e.target.value })}
                                    className="acx-input text-[13px]"
                                    required
                                />
                            ) : (
                                <div id="displayCompanyName" className="text-[13px] font-medium text-text-primary">
                                    {form.companyName}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">
                                Tax / VAT / EIN ID
                            </label>
                            {isEditing ? (
                                <input
                                    id="vatIdInput"
                                    type="text"
                                    placeholder="e.g. US-EIN-987654321"
                                    value={form.vatId}
                                    onChange={(e) => setForm({ ...form, vatId: e.target.value })}
                                    className="acx-input text-[13px] font-mono"
                                />
                            ) : (
                                <div id="displayVatId" className="text-[13px] font-mono font-semibold text-text-primary">
                                    {form.vatId || 'N/A'}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">GSTIN</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        placeholder="Optional GSTIN"
                                        value={form.gstin}
                                        onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                                        className="acx-input text-[13px] font-mono"
                                    />
                                ) : (
                                    <div className="text-[13px] font-mono font-medium text-text-primary">
                                        {form.gstin || '—'}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">PAN</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        placeholder="Optional PAN"
                                        value={form.pan}
                                        onChange={(e) => setForm({ ...form, pan: e.target.value })}
                                        className="acx-input text-[13px] font-mono"
                                    />
                                ) : (
                                    <div className="text-[13px] font-mono font-medium text-text-primary">
                                        {form.pan || '—'}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">Website</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    placeholder="https://apexglobal.tech"
                                    value={form.website}
                                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                                    className="acx-input text-[13px]"
                                />
                            ) : (
                                <div className="text-[13px] font-medium text-blue-600 dark:text-blue-400">
                                    {form.website || '—'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold text-text-muted uppercase mb-1.5">
                                Company Logo
                            </label>
                            <div className="p-3 bg-slate-50 dark:bg-bg-hover rounded-xl border border-border-subtle flex items-center gap-4">
                                {form.logoUrl ? (
                                    <img
                                        id="previewLogoImg"
                                        src={resolveAssetUrl(form.logoUrl)}
                                        alt="Company Logo Preview"
                                        className="h-10 max-w-[160px] object-contain rounded"
                                        onError={(e) => { e.target.src = logoDarkExpanded; }}
                                    />
                                ) : (
                                    <div className="h-10 px-4 bg-teal-700 text-white rounded-lg flex items-center justify-center font-bold text-sm tracking-tight shadow-xs">
                                        {(form.brandName || form.companyName || 'APEX').slice(0, 4).toUpperCase()}
                                    </div>
                                )}
                                <span className="text-[11px] text-text-muted">
                                    {form.logoUrl ? 'Custom tenant logo configured' : 'Using default dynamic tenant badge'}
                                </span>
                            </div>
                            {isEditing && (
                                <div className="mt-2.5 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <input
                                            id="logoUrlInput"
                                            type="url"
                                            placeholder="https://example.com/logo.png"
                                            value={form.logoUrl}
                                            onChange={(e) => setForm(prev => ({ ...prev, logoUrl: e.target.value }))}
                                            onBlur={(e) => {
                                                if (e.target.value && e.target.value.startsWith('http')) {
                                                    handleLogoColorExtraction(e.target.value);
                                                }
                                            }}
                                            className="acx-input text-[12px] flex-1"
                                        />
                                        <label 
                                            htmlFor="logoFileInput"
                                            className={`px-3 py-1.5 rounded-lg border border-border-subtle bg-bg-card hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-text-primary cursor-pointer shrink-0 flex items-center gap-1.5 transition-colors shadow-xs ${
                                                isUploadingLogo ? 'opacity-60 pointer-events-none' : ''
                                            }`}
                                            title="Upload logo file from computer (max 2MB)"
                                        >
                                            {isUploadingLogo ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-primary" />
                                            ) : (
                                                <Upload className="w-3.5 h-3.5 text-brand-primary" />
                                            )}
                                            <span>{isUploadingLogo ? 'Uploading...' : 'Upload'}</span>
                                        </label>
                                        <input 
                                            id="logoFileInput"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-text-muted">
                                        <span>Provide a direct URL or upload an image file.</span>
                                        {form.logoUrl && (
                                            <button
                                                type="button"
                                                onClick={() => handleLogoColorExtraction(form.logoUrl)}
                                                className="text-brand-primary font-semibold hover:underline inline-flex items-center gap-1 shrink-0"
                                            >
                                                <Sparkles className="w-3 h-3" />
                                                <span>Re-detect color</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">
                                Official Email Address *
                            </label>
                            {isEditing ? (
                                <input
                                    id="officialEmailInput"
                                    type="email"
                                    placeholder="billing@apex.com"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="acx-input text-[13px]"
                                    required
                                />
                            ) : (
                                <div id="displayOfficialEmail" className="text-[13px] font-medium text-text-primary">
                                    {form.email}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">
                                Phone Number *
                            </label>
                            {isEditing ? (
                                <input
                                    id="phoneInput"
                                    type="text"
                                    placeholder="+1-555-0199"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    className="acx-input text-[13px]"
                                    required
                                />
                            ) : (
                                <div id="displayPhone" className="text-[13px] font-medium text-text-primary">
                                    {form.phone}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">
                                Registered Company Address
                            </label>
                            {isEditing ? (
                                <textarea
                                    id="registeredAddressInput"
                                    placeholder="100 Wall Street, Suite 2400, New York, NY 10005, USA"
                                    value={form.registeredAddress}
                                    onChange={(e) => setForm({ ...form, registeredAddress: e.target.value })}
                                    className="acx-input text-[13px] min-h-[70px]"
                                    rows={3}
                                />
                            ) : (
                                <div id="displayRegisteredAddress" className="text-[13px] text-text-secondary leading-relaxed max-w-md">
                                    {form.registeredAddress || '—'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Card 2: Branding & Dynamic Theme Colors */}
            <div className="acx-card p-6 bg-white dark:bg-bg-card border border-border-subtle rounded-[20px] shadow-sm">
                <div className="flex items-center gap-2.5 mb-6 pb-3 border-b border-border-subtle/60">
                    <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
                        <Palette className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-[15px] font-bold text-text-primary tracking-tight">
                            Branding & Dynamic Theme Colors
                        </h2>
                        <p className="text-[11px] text-text-muted">
                            Custom CSS colors injected dynamically into all workspace views and buttons.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Primary Brand Color */}
                    <div className="p-4 rounded-xl border border-border-subtle bg-slate-50/50 dark:bg-bg-hover/30 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[12px] font-bold text-text-primary">
                                Primary Brand Color (Teal)
                            </label>
                            <div 
                                id="primaryColorBadge"
                                className="w-6 h-6 rounded-lg border border-white/40 shadow-xs" 
                                style={{ backgroundColor: form.primaryColor }}
                            />
                        </div>

                        {isEditing ? (
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={form.primaryColor.startsWith('#') ? form.primaryColor : '#0f766e'}
                                    onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                                    className="w-10 h-10 rounded-lg cursor-pointer border border-border-subtle bg-transparent p-1"
                                />
                                <input
                                    id="primaryColorInput"
                                    type="text"
                                    placeholder="#0f766e"
                                    value={form.primaryColor}
                                    onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                                    className="acx-input text-[13px] font-mono uppercase"
                                />
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-[13px] font-bold text-text-primary">
                                    {form.primaryColor}
                                </span>
                                <span className="text-[11px] text-text-muted">(Active Primary Brand Color)</span>
                            </div>
                        )}
                        <p className="text-[11px] text-text-muted">
                            Applied to buttons, active navigation links, and primary UI highlights.
                        </p>
                    </div>

                    {/* Secondary Brand Color */}
                    <div className="p-4 rounded-xl border border-border-subtle bg-slate-50/50 dark:bg-bg-hover/30 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[12px] font-bold text-text-primary">
                                Secondary Brand Color (Sky)
                            </label>
                            <div 
                                id="secondaryColorBadge"
                                className="w-6 h-6 rounded-lg border border-white/40 shadow-xs" 
                                style={{ backgroundColor: form.secondaryColor }}
                            />
                        </div>

                        {isEditing ? (
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={form.secondaryColor.startsWith('#') ? form.secondaryColor : '#0284c7'}
                                    onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                                    className="w-10 h-10 rounded-lg cursor-pointer border border-border-subtle bg-transparent p-1"
                                />
                                <input
                                    id="secondaryColorInput"
                                    type="text"
                                    placeholder="#0284c7"
                                    value={form.secondaryColor}
                                    onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                                    className="acx-input text-[13px] font-mono uppercase"
                                />
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-[13px] font-bold text-text-primary">
                                    {form.secondaryColor}
                                </span>
                                <span className="text-[11px] text-text-muted">(Active Secondary Accent)</span>
                            </div>
                        )}
                        <p className="text-[11px] text-text-muted">
                            Applied to badges, secondary accents, and hover highlights.
                        </p>
                    </div>
                </div>
            </div>

            {/* Card 3: Currency, Timezone & Regional Localization */}
            <div className="acx-card p-6 bg-white dark:bg-bg-card border border-border-subtle rounded-[20px] shadow-sm">
                <div className="flex items-center gap-2.5 mb-6 pb-3 border-b border-border-subtle/60">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-[15px] font-bold text-text-primary tracking-tight">
                            Currency & Localization
                        </h2>
                        <p className="text-[11px] text-text-muted">
                            Default currency and timezone used for Invoices, Quotations, and Timestamps.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Currency */}
                    <div>
                        <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">
                            Default Currency *
                        </label>
                        {isEditing ? (
                            <select
                                id="currencySelect"
                                value={form.currencyCode}
                                onChange={(e) => handleCurrencySelect(e.target.value)}
                                className="acx-input text-[13px] font-medium"
                            >
                                {CURRENCIES.map(curr => (
                                    <option key={curr.code} value={curr.code}>
                                        {curr.label}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <div id="displayCurrency" className="text-[14px] font-bold text-text-primary flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-md font-mono font-bold">
                                    {form.currencyCode} ({form.currencySymbol})
                                </span>
                                <span className="text-[12px] text-text-muted font-normal">
                                    Used across all quotations, POs, and invoices
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Timezone */}
                    <div>
                        <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">
                            Timezone *
                        </label>
                        {isEditing ? (
                            <select
                                id="timezoneSelect"
                                value={form.timezone}
                                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                                className="acx-input text-[13px]"
                            >
                                {TIMEZONES.map(tz => (
                                    <option key={tz.value} value={tz.value}>
                                        {tz.label}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <div id="displayTimezone" className="text-[14px] font-medium text-text-primary flex items-center gap-2">
                                <Clock className="w-4 h-4 text-text-muted" />
                                <span>{form.timezone}</span>
                            </div>
                        )}
                    </div>

                    {/* Default Payment Terms */}
                    <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">
                            Default Payment Terms
                        </label>
                        {isEditing ? (
                            <textarea
                                id="defaultPaymentTermsInput"
                                value={form.defaultPaymentTerms}
                                onChange={(e) => setForm({ ...form, defaultPaymentTerms: e.target.value })}
                                className="acx-input text-[13px] min-h-[60px]"
                                placeholder="e.g. Net 30 days from invoice issuance date."
                                rows={2}
                            />
                        ) : (
                            <div className="text-[13px] font-medium text-text-primary">
                                {form.defaultPaymentTerms || 'Standard Payment Terms: Net 30 days.'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
