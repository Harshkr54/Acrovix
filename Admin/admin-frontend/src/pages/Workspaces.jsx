import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Building2, Plus, Search, CheckCircle2, 
    XCircle, Database, Users, RefreshCw, 
    Edit3, X, Loader2, Sparkles, Layers, Shield, KeyRound
} from 'lucide-react';
import { 
    getAllTenants, 
    provisionTenant, 
    updateTenantSubscription, 
    updateTenantStatus 
} from '../services/api';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from '../components/ui/ConfirmDialog';

export default function Workspaces() {
    const { user } = useAuth();
    const { isPlatformOwner } = useTenant();
    const { showToast } = useToast();

    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
    const [selectedTenantForEdit, setSelectedTenantForEdit] = useState(null);
    const [statusModalTenant, setStatusModalTenant] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Provision Form State
    const [provisionForm, setProvisionForm] = useState({
        companyName: '',
        slug: '',
        customDomain: '',
        planTier: 'PRO',
        maxSeats: 15,
        maxStorageBytes: 53687091200, // 50 GB
        validUntil: '',
        adminName: '',
        adminEmail: '',
        adminPassword: ''
    });

    // Edit Subscription Form State
    const [subscriptionForm, setSubscriptionForm] = useState({
        planTier: 'PRO',
        maxSeats: 15,
        maxStorageBytes: 53687091200,
        validUntil: '',
        stripeSubscriptionId: '',
        stripeCustomerId: ''
    });

    const fetchTenantsList = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAllTenants();
            setTenants(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load workspaces:', err);
            showToast({
                type: 'error',
                message: err.message || 'Failed to load workspaces. Access denied or server error.'
            });
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        if (isPlatformOwner(user)) {
            fetchTenantsList();
        }
    }, [user, isPlatformOwner, fetchTenantsList]);

    const handleCompanyNameChange = (e) => {
        const val = e.target.value;
        const autoSlug = val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        setProvisionForm(prev => ({
            ...prev,
            companyName: val,
            slug: prev.slug === '' || prev.slug === autoSlug.slice(0, -1) ? autoSlug : prev.slug
        }));
    };

    const handleProvisionSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                companyName: provisionForm.companyName.trim(),
                slug: provisionForm.slug.trim().toLowerCase(),
                customDomain: provisionForm.customDomain.trim() || null,
                planTier: provisionForm.planTier,
                maxSeats: Number(provisionForm.maxSeats),
                maxStorageBytes: Number(provisionForm.maxStorageBytes),
                adminFullName: provisionForm.adminName.trim(),
                adminName: provisionForm.adminName.trim(),
                adminEmail: provisionForm.adminEmail.trim(),
                adminPassword: provisionForm.adminPassword
            };
            await provisionTenant(payload);
            showToast({
                type: 'success',
                message: `Workspace "${payload.companyName}" successfully provisioned!`
            });
            setIsProvisionModalOpen(false);
            setProvisionForm({
                companyName: '',
                slug: '',
                customDomain: '',
                planTier: 'PRO',
                maxSeats: 15,
                maxStorageBytes: 53687091200,
                validUntil: '',
                adminName: '',
                adminEmail: '',
                adminPassword: ''
            });
            fetchTenantsList();
        } catch (err) {
            showToast({
                type: 'error',
                message: err.message || 'Failed to provision workspace'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleStatus = (tenant) => {
        setStatusModalTenant(tenant);
    };

    const handleConfirmToggleStatus = async () => {
        if (!statusModalTenant) return;
        const newStatus = statusModalTenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        try {
            await updateTenantStatus(statusModalTenant.id, newStatus);
            showToast({
                type: 'success',
                message: `Workspace "${statusModalTenant.companyName}" status updated to ${newStatus}`
            });
            setStatusModalTenant(null);
            fetchTenantsList();
        } catch (err) {
            showToast({
                type: 'error',
                message: err.message || 'Failed to update tenant status'
            });
        }
    };

    const handleOpenEditSubscription = (t) => {
        setSelectedTenantForEdit(t);
        setSubscriptionForm({
            planTier: t.planTier || 'PRO',
            maxSeats: t.maxSeats || 10,
            maxStorageBytes: t.maxStorageBytes || 53687091200,
            validUntil: t.validUntil ? t.validUntil.split('T')[0] : '',
            stripeSubscriptionId: '',
            stripeCustomerId: ''
        });
    };

    const handleUpdateSubscriptionSubmit = async (e) => {
        e.preventDefault();
        if (!selectedTenantForEdit) return;
        setSubmitting(true);
        try {
            const payload = {
                planTier: subscriptionForm.planTier,
                maxSeats: Number(subscriptionForm.maxSeats),
                maxStorageBytes: Number(subscriptionForm.maxStorageBytes),
                validUntil: subscriptionForm.validUntil ? new Date(subscriptionForm.validUntil).toISOString() : null
            };
            await updateTenantSubscription(selectedTenantForEdit.id, payload);
            showToast({
                type: 'success',
                message: `Subscription quotas updated for "${selectedTenantForEdit.companyName}"`
            });
            setSelectedTenantForEdit(null);
            fetchTenantsList();
        } catch (err) {
            showToast({
                type: 'error',
                message: err.message || 'Failed to update subscription quotas'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const filteredTenants = useMemo(() => {
        return tenants.filter(t => {
            const matchesSearch = 
                (t.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t.slug || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [tenants, searchTerm, statusFilter]);

    const metrics = useMemo(() => {
        const total = tenants.length;
        const active = tenants.filter(t => t.status === 'ACTIVE').length;
        const lifetime = tenants.filter(t => t.planTier === 'LIFETIME_INTERNAL').length;
        const suspended = tenants.filter(t => t.status === 'SUSPENDED').length;
        return { total, active, lifetime, suspended };
    }, [tenants]);

    const formatBytes = (bytes) => {
        if (!bytes || bytes <= 0 || bytes > 1000000000000000) return 'Unlimited';
        const gb = bytes / (1024 * 1024 * 1024);
        if (gb >= 1024) return `${(gb / 1024).toFixed(1)} TB`;
        return `${gb.toFixed(0)} GB`;
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-card p-6 rounded-2xl border border-border-subtle shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2.5">
                        <Building2 className="w-7 h-7 text-brand-primary" />
                        Multi-Tenant Workspace Platform
                    </h1>
                    <p className="text-sm text-text-secondary mt-1">
                        Platform Super-Admin governance: provision organizations, inspect plan quotas, and control tenant lifecycles.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchTenantsList}
                        disabled={loading}
                        className="btn btn-secondary flex items-center gap-2 text-xs"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={() => setIsProvisionModalOpen(true)}
                        className="btn btn-primary flex items-center gap-2 text-xs"
                    >
                        <Plus className="w-4 h-4" />
                        Provision Workspace
                    </button>
                </div>
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-bg-card p-5 rounded-xl border border-border-subtle shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Total Workspaces</div>
                        <div className="text-2xl font-bold text-text-primary mt-1">{metrics.total}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                        <Layers className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-bg-card p-5 rounded-xl border border-border-subtle shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Active Organizations</div>
                        <div className="text-2xl font-bold text-emerald-600 mt-1">{metrics.active}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-bg-card p-5 rounded-xl border border-border-subtle shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Lifetime / Owner</div>
                        <div className="text-2xl font-bold text-indigo-600 mt-1">{metrics.lifetime}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                        <Shield className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-bg-card p-5 rounded-xl border border-border-subtle shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Suspended</div>
                        <div className="text-2xl font-bold text-rose-600 mt-1">{metrics.suspended}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                        <XCircle className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-bg-card p-4 rounded-xl border border-border-subtle shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search workspace by name or slug..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-xs rounded-lg bg-bg-main border border-border-subtle focus:border-brand-primary outline-none"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    {['ALL', 'ACTIVE', 'TRIAL', 'SUSPENDED', 'CANCELLED'].map((st) => (
                        <button
                            key={st}
                            onClick={() => setStatusFilter(st)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                                statusFilter === st
                                    ? 'bg-brand-primary text-white'
                                    : 'bg-bg-main text-text-secondary hover:text-text-primary'
                            }`}
                        >
                            {st}
                        </button>
                    ))}
                </div>
            </div>

            {/* Workspaces Table */}
            <div className="bg-bg-card rounded-2xl border border-border-subtle shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border-subtle bg-bg-surface/50 text-[11px] font-bold text-text-muted uppercase tracking-wider">
                                <th className="px-6 py-4">Workspace</th>
                                <th className="px-6 py-4">Plan Tier</th>
                                <th className="px-6 py-4">Seats Quota</th>
                                <th className="px-6 py-4">Storage Quota</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Validity</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle text-xs">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="py-12 text-center text-text-muted">
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
                                            <span>Loading workspace data...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredTenants.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-12 text-center text-text-muted">
                                        No workspaces found matching the criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredTenants.map((t) => {
                                    const isPlatformOwnerWorkspace = t.id === 1 || t.slug === 'default';
                                    const isLifetime = t.planTier === 'LIFETIME_INTERNAL';

                                    return (
                                        <tr key={t.id} className="hover:bg-bg-hover transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-brand-primary/10 text-brand-primary font-bold flex items-center justify-center shrink-0">
                                                        {t.companyName?.charAt(0)?.toUpperCase() || 'W'}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-text-primary flex items-center gap-1.5">
                                                            {t.companyName}
                                                            {isPlatformOwnerWorkspace && (
                                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                                                                    Platform Owner
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[11px] text-text-muted flex items-center gap-2 mt-0.5">
                                                            <span>slug: <span className="font-mono text-text-secondary">{t.slug}</span></span>
                                                            {t.customDomain && (
                                                                <span>• {t.customDomain}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold ${
                                                    isLifetime
                                                        ? 'bg-purple-500/10 text-purple-600 border border-purple-500/20'
                                                        : t.planTier === 'ENTERPRISE'
                                                        ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                                                        : t.planTier === 'PRO'
                                                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                                        : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                                }`}>
                                                    {t.planTier || 'PRO'}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-text-secondary font-medium">
                                                    <Users className="w-3.5 h-3.5 text-text-muted" />
                                                    <span>{t.maxSeats >= 9999 ? 'Unlimited' : `${t.maxSeats} seats`}</span>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-text-secondary font-medium">
                                                    <Database className="w-3.5 h-3.5 text-text-muted" />
                                                    <span>{formatBytes(t.maxStorageBytes)}</span>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                                    t.status === 'ACTIVE'
                                                        ? 'bg-emerald-500/10 text-emerald-600'
                                                        : t.status === 'SUSPENDED'
                                                        ? 'bg-rose-500/10 text-rose-600'
                                                        : 'bg-amber-500/10 text-amber-600'
                                                }`}>
                                                    {t.status}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4 text-text-muted">
                                                {isLifetime || !t.validUntil ? (
                                                    <span className="text-emerald-600 font-semibold">Never Expires</span>
                                                ) : (
                                                    <span>{new Date(t.validUntil).toLocaleDateString()}</span>
                                                )}
                                            </td>

                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleOpenEditSubscription(t)}
                                                        className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
                                                        title="Edit Plan Quotas"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                    {!isPlatformOwnerWorkspace && (
                                                        <button
                                                            onClick={() => handleToggleStatus(t)}
                                                            className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                                                                t.status === 'ACTIVE'
                                                                    ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20'
                                                                    : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                                                            }`}
                                                        >
                                                            {t.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal: Provision Workspace */}
            {isProvisionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div className="bg-bg-card w-full max-w-xl rounded-2xl border border-border-subtle shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
                            <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-brand-primary" />
                                Provision New Tenant Workspace
                            </h2>
                            <button
                                onClick={() => setIsProvisionModalOpen(false)}
                                className="text-text-muted hover:text-text-primary p-1"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleProvisionSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-text-primary mb-1">Company / Organization Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Acme Corporation"
                                    value={provisionForm.companyName}
                                    onChange={handleCompanyNameChange}
                                    className="w-full px-3 py-2 rounded-lg bg-bg-main border border-border-subtle focus:border-brand-primary outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-text-primary mb-1">Workspace Slug *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. acme"
                                        value={provisionForm.slug}
                                        onChange={(e) => setProvisionForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                                        className="w-full px-3 py-2 rounded-lg bg-bg-main border border-border-subtle focus:border-brand-primary outline-none font-mono"
                                    />
                                    <span className="text-[10px] text-text-muted">Subdomain: {provisionForm.slug || 'slug'}.yourdomain.com</span>
                                </div>
                                <div>
                                    <label className="block font-semibold text-text-primary mb-1">Custom Domain (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. erp.acme.com"
                                        value={provisionForm.customDomain}
                                        onChange={(e) => setProvisionForm(p => ({ ...p, customDomain: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg bg-bg-main border border-border-subtle focus:border-brand-primary outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block font-semibold text-text-primary mb-1">Plan Tier</label>
                                    <select
                                        value={provisionForm.planTier}
                                        onChange={(e) => setProvisionForm(p => ({ ...p, planTier: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg bg-bg-main border border-border-subtle focus:border-brand-primary outline-none"
                                    >
                                        <option value="FREE_TRIAL">Free Trial</option>
                                        <option value="GROWTH">Growth</option>
                                        <option value="PRO">Pro</option>
                                        <option value="ENTERPRISE">Enterprise</option>
                                        <option value="LIFETIME_INTERNAL">Lifetime Internal</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-semibold text-text-primary mb-1">Max Seats</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={provisionForm.maxSeats}
                                        onChange={(e) => setProvisionForm(p => ({ ...p, maxSeats: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg bg-bg-main border border-border-subtle focus:border-brand-primary outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block font-semibold text-text-primary mb-1">Storage (GB)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={Math.round(provisionForm.maxStorageBytes / (1024 * 1024 * 1024))}
                                        onChange={(e) => setProvisionForm(p => ({ ...p, maxStorageBytes: Number(e.target.value) * 1024 * 1024 * 1024 }))}
                                        className="w-full px-3 py-2 rounded-lg bg-bg-main border border-border-subtle focus:border-brand-primary outline-none"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 border-t border-border-subtle">
                                <h3 className="text-xs font-bold text-text-primary mb-2 flex items-center gap-1.5">
                                    <KeyRound className="w-3.5 h-3.5 text-brand-primary" /> Initial Tenant Administrator
                                </h3>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block font-semibold text-text-primary mb-1">Admin Full Name *</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. John Doe"
                                            value={provisionForm.adminName}
                                            onChange={(e) => setProvisionForm(p => ({ ...p, adminName: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-lg bg-bg-main border border-border-subtle focus:border-brand-primary outline-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block font-semibold text-text-primary mb-1">Admin Email *</label>
                                            <input
                                                type="email"
                                                required
                                                placeholder="admin@acme.com"
                                                value={provisionForm.adminEmail}
                                                onChange={(e) => setProvisionForm(p => ({ ...p, adminEmail: e.target.value }))}
                                                className="w-full px-3 py-2 rounded-lg bg-bg-main border border-border-subtle focus:border-brand-primary outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-semibold text-text-primary mb-1">Admin Password *</label>
                                            <input
                                                type="password"
                                                required
                                                placeholder="••••••••"
                                                value={provisionForm.adminPassword}
                                                onChange={(e) => setProvisionForm(p => ({ ...p, adminPassword: e.target.value }))}
                                                className="w-full px-3 py-2 rounded-lg bg-bg-main border border-border-subtle focus:border-brand-primary outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-border-subtle flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsProvisionModalOpen(false)}
                                    className="btn btn-secondary text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="btn btn-primary text-xs flex items-center gap-2"
                                >
                                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    Provision Organization
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Edit Subscription Quotas */}
            {selectedTenantForEdit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div className="bg-bg-card w-full max-w-lg rounded-2xl border border-border-subtle shadow-2xl overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
                            <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                                <Edit3 className="w-4 h-4 text-brand-primary" />
                                Edit Plan & Quotas: {selectedTenantForEdit.companyName}
                            </h2>
                            <button
                                onClick={() => setSelectedTenantForEdit(null)}
                                className="text-text-muted hover:text-text-primary p-1"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateSubscriptionSubmit} className="p-6 space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-text-primary mb-1">Plan Tier</label>
                                <select
                                    value={subscriptionForm.planTier}
                                    onChange={(e) => setSubscriptionForm(p => ({ ...p, planTier: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg bg-bg-main border border-border-subtle focus:border-brand-primary outline-none"
                                >
                                    <option value="FREE_TRIAL">Free Trial</option>
                                    <option value="GROWTH">Growth</option>
                                    <option value="PRO">Pro</option>
                                    <option value="ENTERPRISE">Enterprise</option>
                                    <option value="LIFETIME_INTERNAL">Lifetime Internal</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-text-primary mb-1">Max Seats</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={subscriptionForm.maxSeats}
                                        onChange={(e) => setSubscriptionForm(p => ({ ...p, maxSeats: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg bg-bg-main border border-border-subtle focus:border-brand-primary outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-text-primary mb-1">Max Storage (GB)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={Math.round(subscriptionForm.maxStorageBytes / (1024 * 1024 * 1024))}
                                        onChange={(e) => setSubscriptionForm(p => ({ ...p, maxStorageBytes: Number(e.target.value) * 1024 * 1024 * 1024 }))}
                                        className="w-full px-3 py-2 rounded-lg bg-bg-main border border-border-subtle focus:border-brand-primary outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-text-primary mb-1">Valid Until Date (Leave empty for Lifetime)</label>
                                <input
                                    type="date"
                                    value={subscriptionForm.validUntil}
                                    onChange={(e) => setSubscriptionForm(p => ({ ...p, validUntil: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg bg-bg-main border border-border-subtle focus:border-brand-primary outline-none"
                                />
                            </div>

                            <div className="pt-4 border-t border-border-subtle flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setSelectedTenantForEdit(null)}
                                    className="btn btn-secondary text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="btn btn-primary text-xs flex items-center gap-2"
                                >
                                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    Save Quotas
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Status Change Confirmation Dialog */}
            <ConfirmDialog
                isOpen={!!statusModalTenant}
                onClose={() => setStatusModalTenant(null)}
                onConfirm={handleConfirmToggleStatus}
                title={`${statusModalTenant?.status === 'ACTIVE' ? 'Suspend' : 'Activate'} Workspace?`}
                message={`Are you sure you want to change the status of "${statusModalTenant?.companyName || ''}" to ${statusModalTenant?.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'}? Users belonging to this workspace will ${statusModalTenant?.status === 'ACTIVE' ? 'lose' : 'regain'} access.`}
                confirmText={statusModalTenant?.status === 'ACTIVE' ? 'Suspend Workspace' : 'Activate Workspace'}
                variant={statusModalTenant?.status === 'ACTIVE' ? 'danger' : 'primary'}
            />
        </div>
    );
}
