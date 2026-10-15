import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, ChevronRight, Edit3, Save, X, Loader2, CheckCircle, AlertCircle, FileText, Globe, Mail, Phone, MapPin, Image as ImageIcon } from 'lucide-react';
import { getCompanySettings, updateCompanySettings } from '../services/api';
import { useToast } from '../context/ToastContext';
import logoDarkExpanded from '../assets/Acrovix_logo.png';

export default function CompanyDetailsPage() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const [form, setForm] = useState({
        companyName: '',
        legalName: '',
        gstin: '',
        pan: '',
        email: '',
        phone: '',
        website: '',
        registeredAddress: '',
        billingAddress: '',
        defaultPaymentTerms: '',
        defaultTermsAndConditions: '',
        logoUrl: '',
        signatureUrl: ''
    });

    const [initialForm, setInitialForm] = useState({});

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await getCompanySettings();
            if (data) {
                const loaded = {
                    companyName: data.companyName || '',
                    legalName: data.legalName || '',
                    gstin: data.gstin || '',
                    pan: data.pan || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    website: data.website || '',
                    registeredAddress: data.registeredAddress || '',
                    billingAddress: data.billingAddress || '',
                    defaultPaymentTerms: data.defaultPaymentTerms || '',
                    defaultTermsAndConditions: data.defaultTermsAndConditions || '',
                    logoUrl: data.logoUrl || '',
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

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setIsSaving(true);
        try {
            await updateCompanySettings(form);
            showToast({ type: 'success', message: 'Company details saved successfully.' });
            setInitialForm(form);
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
                <span className="font-semibold text-text-primary">Company Details</span>
            </div>

            {/* Heading & Edit Button Bar */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] dark:bg-blue-950/40 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-[#0284C7]" />
                    </div>
                    <div>
                        <h1 className="text-[24px] font-bold text-text-primary tracking-tight leading-tight">
                            Company Details
                        </h1>
                        <p className="text-[12px] text-text-muted mt-0.5">
                            Manage your company information and update it as needed.
                        </p>
                    </div>
                </div>

                {!isEditing ? (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="btn btn-primary btn-md shadow-sm"
                    >
                        <Edit3 className="w-4 h-4" />
                        <span>Edit</span>
                    </button>
                ) : (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={isSaving}
                            className="btn btn-secondary btn-md"
                        >
                            <X className="w-4 h-4" />
                            <span>Cancel</span>
                        </button>
                        <button
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

            {/* Card 1: Company Information matching bottom-left screenshot */}
            <div className="acx-card p-6 bg-white dark:bg-bg-card border border-border-subtle rounded-[20px] shadow-sm">
                <div className="flex items-center gap-2.5 mb-6 pb-3 border-b border-border-subtle/60">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-brand-primary">
                        <Building2 className="w-4 h-4" />
                    </div>
                    <h2 className="text-[15px] font-bold text-text-primary tracking-tight">
                        Company Information
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">Company Name</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={form.companyName}
                                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                                    className="acx-input text-[13px]"
                                    required
                                />
                            ) : (
                                <div className="text-[14px] font-bold text-text-primary">
                                    {form.companyName}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">Legal Name</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={form.legalName}
                                    onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                                    className="acx-input text-[13px]"
                                    required
                                />
                            ) : (
                                <div className="text-[13px] font-medium text-text-primary">
                                    {form.legalName}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">GSTIN</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={form.gstin}
                                    onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                                    className="acx-input text-[13px] font-mono"
                                />
                            ) : (
                                <div className="text-[13px] font-mono font-semibold text-text-primary">
                                    {form.gstin || 'N/A'}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">PAN</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={form.pan}
                                    onChange={(e) => setForm({ ...form, pan: e.target.value })}
                                    className="acx-input text-[13px] font-mono"
                                />
                            ) : (
                                <div className="text-[13px] font-mono font-semibold text-text-primary">
                                    {form.pan || 'N/A'}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">Website</label>
                            {isEditing ? (
                                <input
                                    type="url"
                                    value={form.website}
                                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                                    className="acx-input text-[13px]"
                                />
                            ) : (
                                <a
                                    href={form.website.startsWith('http') ? form.website : `https://${form.website}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[13px] font-medium text-[#2563EB] hover:underline"
                                >
                                    {form.website || 'N/A'}
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold text-text-muted uppercase mb-1.5">Logo</label>
                            <div className="p-3 bg-slate-50 dark:bg-bg-hover rounded-xl border border-border-subtle inline-block">
                                <img
                                    src={form.logoUrl || logoDarkExpanded}
                                    alt="Company Logo"
                                    className="h-10 w-auto object-contain"
                                    onError={(e) => { e.target.src = logoDarkExpanded; }}
                                />
                            </div>
                            {isEditing && (
                                <input
                                    type="text"
                                    placeholder="Optional Logo URL"
                                    value={form.logoUrl}
                                    onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                                    className="acx-input text-[12px] mt-2"
                                />
                            )}
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">Email Address</label>
                            {isEditing ? (
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="acx-input text-[13px]"
                                    required
                                />
                            ) : (
                                <div className="text-[13px] font-medium text-text-primary">
                                    {form.email}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">Phone Number</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    className="acx-input text-[13px]"
                                    required
                                />
                            ) : (
                                <div className="text-[13px] font-medium text-text-primary">
                                    {form.phone}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">Registered Address</label>
                            {isEditing ? (
                                <textarea
                                    value={form.registeredAddress}
                                    onChange={(e) => setForm({ ...form, registeredAddress: e.target.value })}
                                    className="acx-input text-[13px] min-h-[70px]"
                                    rows={3}
                                />
                            ) : (
                                <div className="text-[13px] text-text-secondary leading-relaxed max-w-md">
                                    {form.registeredAddress}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Card 2: Additional Information */}
            <div className="acx-card p-6 bg-white dark:bg-bg-card border border-border-subtle rounded-[20px] shadow-sm">
                <div className="flex items-center gap-2.5 mb-6 pb-3 border-b border-border-subtle/60">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-[#16A34A]">
                        <FileText className="w-4 h-4" />
                    </div>
                    <h2 className="text-[15px] font-bold text-text-primary tracking-tight">
                        Additional Information
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">Currency</label>
                        <div className="text-[14px] font-bold text-text-primary">
                            INR (₹)
                        </div>
                        <p className="text-[11px] text-text-muted mt-0.5">Primary currency used across ACROVIX ERP</p>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">Default Payment Terms</label>
                        {isEditing ? (
                            <textarea
                                value={form.defaultPaymentTerms}
                                onChange={(e) => setForm({ ...form, defaultPaymentTerms: e.target.value })}
                                className="acx-input text-[13px] min-h-[60px]"
                                rows={2}
                            />
                        ) : (
                            <div className="text-[13px] font-medium text-text-primary">
                                {form.defaultPaymentTerms}
                            </div>
                        )}
                    </div>

                    {isEditing && (
                        <div className="md:col-span-2">
                            <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">Default Terms and Conditions</label>
                            <textarea
                                value={form.defaultTermsAndConditions}
                                onChange={(e) => setForm({ ...form, defaultTermsAndConditions: e.target.value })}
                                className="acx-input text-[13px] min-h-[90px]"
                                rows={3}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
