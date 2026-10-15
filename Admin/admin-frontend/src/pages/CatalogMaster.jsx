import React, { useEffect, useState } from 'react';
import { getCatalog, createCatalogItem, updateCatalogItem, deleteCatalogItem, activateCatalogItem } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { 
    Package, Plus, ShieldAlert, AlertCircle, RefreshCw, X, Box, Tag, DollarSign, Percent,
    Table, LayoutGrid, Edit3, Power, Ban
} from 'lucide-react';

export default function CatalogMaster() {
    const { user: currentUser } = useAuth();
    const [items, setItems] = useState([]);
    const [viewMode, setViewMode] = useState('table'); // 'table' (default) or 'card'
    const [showForm, setShowForm] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingId, setEditingId] = useState(null);
    
    // Authorization Check
    const canManage = currentUser?.role === 'SUPER_ADMIN';

    // Form State
    const [formData, setFormData] = useState({
        sku: '',
        name: '',
        description: '',
        type: 'PRODUCT',
        hsnSac: '',
        defaultRate: '',
        defaultGstPercent: '',
        unit: 'NOS',
        currency: 'INR'
    });

    const resetForm = () => {
        setFormData({
            sku: '', name: '', description: '', type: 'PRODUCT', hsnSac: '', defaultRate: '', defaultGstPercent: '', unit: 'NOS', currency: 'INR'
        });
        setEditingId(null);
        setShowForm(false);
    };

    const fetchCatalog = React.useCallback(() => {
        setIsLoading(true);
        setError(null);
        getCatalog({ size: 100 })
            .then(data => {
                setItems(data.content || []);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Error fetching catalog", err);
                setError(err.message);
                setIsLoading(false);
            });
    }, []);

    useEffect(() => {
        fetchCatalog();
    }, [fetchCatalog]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canManage) return;
        try {
            if (editingId) {
                await updateCatalogItem(editingId, formData);
            } else {
                await createCatalogItem(formData);
            }
            fetchCatalog();
            resetForm();
        } catch (error) {
            alert(error.message || "Failed to save item.");
        }
    };

    const handleEdit = (item) => {
        setFormData({
            sku: item.sku || '',
            name: item.name || '',
            description: item.description || '',
            type: item.type || 'PRODUCT',
            hsnSac: item.hsnSac || '',
            defaultRate: item.defaultRate || '',
            defaultGstPercent: item.defaultGstPercent || '',
            unit: item.unit || 'NOS',
            currency: item.currency || 'INR'
        });
        setEditingId(item.id);
        setShowForm(true);
    };

    const [catalogStatusTarget, setCatalogStatusTarget] = useState(null);
    const [isTogglingCatalogStatus, setIsTogglingCatalogStatus] = useState(false);

    const toggleStatus = (id, currentStatus, name) => {
        if (!canManage) return;
        setCatalogStatusTarget({ id, currentStatus, name: name || 'this item' });
    };

    const handleConfirmCatalogStatus = async () => {
        if (!catalogStatusTarget) return;
        const { id, currentStatus } = catalogStatusTarget;
        setIsTogglingCatalogStatus(true);
        try {
            if (currentStatus) {
                await deleteCatalogItem(id);
            } else {
                await activateCatalogItem(id);
            }
            fetchCatalog();
            setCatalogStatusTarget(null);
        } catch (error) {
            alert(error.message || "Failed to update status");
        } finally {
            setIsTogglingCatalogStatus(false);
        }
    };

    if (!['SUPER_ADMIN', 'SALES'].includes(currentUser?.role)) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh]">
                <div className="acx-card p-8 text-center max-w-md w-full border-t-4 border-[#DC2626]">
                    <div className="w-16 h-16 bg-brand-danger/10 border border-brand-danger/30 mx-auto rounded-[20px] flex items-center justify-center mb-6 shadow-sm">
                        <ShieldAlert className="w-8 h-8 text-brand-danger" />
                    </div>
                    <h2 className="text-[20px] font-bold text-text-primary mb-2 tracking-tight">Unauthorized Access</h2>
                    <p className="text-[13px] text-text-secondary">You do not have permission to view catalog.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-[28px] font-bold text-text-primary tracking-tight leading-tight flex items-center gap-2">
                        <Package className="w-7 h-7 text-[var(--color-brand-primary)]" />
                        Product & Service Catalog
                    </h1>
                    <p className="text-[13px] text-text-secondary mt-1">View our available products and services database.</p>
                </div>
                <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
                    {/* View Toggle */}
                    <div className="flex items-center bg-bg-main p-1 rounded-xl border border-border-subtle shrink-0">
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                                viewMode === 'table'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-text-secondary hover:text-text-primary'
                            }`}
                            title="Switch to Table View"
                        >
                            <Table className="w-4 h-4" />
                            Table View
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('card')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                                viewMode === 'card'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-text-secondary hover:text-text-primary'
                            }`}
                            title="Switch to Card View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                            Card View
                        </button>
                    </div>

                    {canManage && (
                        <button 
                            type="button"
                            onClick={() => {
                                if (showForm) resetForm();
                                else setShowForm(true);
                            }}
                            className={showForm ? "btn btn-secondary btn-md" : "btn btn-primary btn-md"}
                        >
                            {showForm ? 'Cancel' : <><Plus className="w-4 h-4 mr-1.5" /> Add Item</>}
                        </button>
                    )}
                </div>
            </div>

            {/* Form Drawer / Card */}
            {showForm && canManage && (
                <div className="acx-card p-6 border border-[var(--color-brand-primary)]/20 mb-6 relative overflow-hidden">
                    <div className="absolute top-4 right-4">
                        <button onClick={resetForm} className="btn btn-ghost btn-icon text-text-muted"><X className="w-4 h-4"/></button>
                    </div>
                    <h2 className="text-[16px] font-bold text-text-primary mb-6 flex items-center tracking-tight">
                        <Package className="w-5 h-5 text-[var(--color-brand-primary)]" />
                        {editingId ? 'Edit Item' : 'Add New Item'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Item Type</label>
                                <select required value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="acx-input rounded-xl text-[13px] bg-bg-main h-11 appearance-none cursor-pointer">
                                    <option value="PRODUCT">Product</option>
                                    <option value="SERVICE">Service</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">SKU Code</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Tag className="h-4 w-4 text-text-muted" /></div>
                                    <input required type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="acx-input pl-9 rounded-xl text-[13px] bg-bg-main h-11" placeholder="SKU-001" />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Item Name</label>
                                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="acx-input rounded-xl text-[13px] bg-bg-main h-11" placeholder="Product/Service Name" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">HSN / SAC Code</label>
                                <input type="text" value={formData.hsnSac} onChange={e => setFormData({...formData, hsnSac: e.target.value})} className="acx-input rounded-xl text-[13px] bg-bg-main h-11" placeholder="Optional" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Unit</label>
                                <input type="text" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="acx-input rounded-xl text-[13px] bg-bg-main h-11" placeholder="NOS, KG, HR..." />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Currency</label>
                                <select 
                                    value={formData.currency} 
                                    onChange={e => setFormData({...formData, currency: e.target.value})} 
                                    className="acx-input rounded-xl text-[13px] bg-bg-main h-11 cursor-pointer font-semibold"
                                >
                                    <option value="INR">INR (₹)</option>
                                    <option value="USD">USD ($)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Default Rate</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><DollarSign className="h-4 w-4 text-text-muted" /></div>
                                    <input required type="number" step="0.01" value={formData.defaultRate} onChange={e => setFormData({...formData, defaultRate: e.target.value})} className="acx-input pl-9 rounded-xl text-[13px] bg-bg-main h-11" placeholder="0.00" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Default GST %</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Percent className="h-4 w-4 text-text-muted" /></div>
                                    <input type="number" step="0.01" value={formData.defaultGstPercent} onChange={e => setFormData({...formData, defaultGstPercent: e.target.value})} className="acx-input pl-9 rounded-xl text-[13px] bg-bg-main h-11" placeholder="18.0" />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Description</label>
                            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="acx-input rounded-xl text-[13px] bg-bg-main min-h-[60px] p-3" placeholder="Enter optional item description..."></textarea>
                        </div>
                        <div className="pt-2 flex justify-end">
                            <button type="submit" className="btn btn-primary btn-md">
                                {editingId ? 'Update Item' : 'Save Item'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Error State */}
            {error ? (
                <div className="acx-card p-12 text-center rounded-2xl border border-border-subtle bg-bg-card">
                    <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
                        <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-1">
                            <AlertCircle className="w-6 h-6 text-red-500" />
                        </div>
                        <p className="text-[16px] font-bold text-text-primary">Failed to load catalog</p>
                        <p className="text-[13px] text-text-secondary leading-relaxed">{error}</p>
                        <button onClick={fetchCatalog} className="btn btn-secondary btn-md mt-2">
                            <RefreshCw className="w-4 h-4 mr-1.5" />
                            Retry
                        </button>
                    </div>
                </div>
            ) : isLoading ? (
                /* Loading State */
                <div className="acx-card p-16 text-center rounded-2xl border border-border-subtle bg-bg-card">
                    <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="text-[13px] font-medium text-text-muted">Loading catalog...</p>
                    </div>
                </div>
            ) : items.length === 0 ? (
                /* Empty State */
                <div className="acx-card p-16 text-center rounded-2xl border border-border-subtle bg-bg-card">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <div className="w-12 h-12 rounded-full bg-bg-main border border-border-subtle flex items-center justify-center mb-3">
                            <Package className="w-6 h-6 text-text-muted opacity-60" />
                        </div>
                        <p className="text-[15px] font-bold text-text-primary">No items found</p>
                        <p className="text-[13px] text-text-secondary mt-1">Get started by adding your first product or service.</p>
                        {canManage && (
                            <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm mt-4">
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                Add Item
                            </button>
                        )}
                    </div>
                </div>
            ) : viewMode === 'table' ? (
                /* ========================================================
                   TABLE VIEW
                   ======================================================== */
                <div className="acx-card rounded-2xl shadow-sm border border-border-subtle overflow-hidden flex flex-col bg-bg-card">
                    <div className="w-full overflow-x-auto">
                        <table className="acx-table w-full border-collapse">
                            <thead>
                                <tr className="border-b border-border-subtle bg-bg-card">
                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider">SKU / Name</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider">Tax Info</th>
                                    <th className="px-6 py-4 text-right text-[11px] font-bold text-text-muted uppercase tracking-wider">Pricing</th>
                                    <th className="px-6 py-4 text-center text-[11px] font-bold text-text-muted uppercase tracking-wider">Status</th>
                                    {canManage && <th className="px-6 py-4 text-right text-[11px] font-bold text-text-muted uppercase tracking-wider">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="bg-bg-card divide-y divide-border-subtle/40">
                                {items.map(c => (
                                    <tr key={c.id} className="hover:bg-bg-hover transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap align-top">
                                            <div className="text-[11px] font-bold text-text-muted mb-0.5 tracking-wider">{c.sku}</div>
                                            <div className="text-[13px] font-bold text-text-primary tracking-tight">{c.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap align-top">
                                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                                                c.type === 'PRODUCT' 
                                                    ? 'bg-[#F3E8FF] text-[#7E22CE] dark:bg-purple-950/40 dark:text-purple-300' 
                                                    : 'bg-[#E0F2FE] text-[#0369A1] dark:bg-sky-950/40 dark:text-sky-300'
                                            }`}>
                                                {c.type === 'PRODUCT' ? <Box className="w-3 h-3" /> : <Tag className="w-3 h-3" />}
                                                {c.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap align-top">
                                            <div className="text-[12px] font-medium text-text-secondary">HSN: {c.hsnSac || 'N/A'}</div>
                                            <div className="text-[12px] font-medium text-text-secondary mt-0.5">GST: {c.defaultGstPercent ? `${c.defaultGstPercent}%` : 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap align-top text-right">
                                            <div className="text-[14px] font-bold text-text-primary">{formatCurrency(c.defaultRate, c.currency, 2)}</div>
                                            <div className="text-[11px] font-medium text-text-muted uppercase mt-0.5">per {c.unit}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap align-top text-center">
                                            {c.active ? (
                                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        {canManage && (
                                            <td className="px-6 py-4 whitespace-nowrap align-top text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleEdit(c)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-semibold text-text-secondary hover:text-text-primary bg-bg-main border border-border-subtle hover:bg-bg-hover transition-colors cursor-pointer"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                        Edit
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={() => toggleStatus(c.id, c.active, c.name)}
                                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-semibold transition-colors border cursor-pointer ${
                                                            c.active 
                                                                ? 'text-amber-700 dark:text-amber-400 border-amber-200/80 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100' 
                                                                : 'text-emerald-700 dark:text-emerald-400 border-emerald-200/80 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100'
                                                        }`}
                                                    >
                                                        {c.active ? (
                                                            <>
                                                                <Ban className="w-3.5 h-3.5" />
                                                                Deactivate
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Power className="w-3.5 h-3.5" />
                                                                Activate
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* ========================================================
                   CARD VIEW (Responsive Grid)
                   ======================================================== */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {items.map(c => (
                        <div
                            key={c.id}
                            className="acx-card p-5 rounded-2xl border border-border-subtle bg-bg-card shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                        >
                            {/* Card Body */}
                            <div>
                                {/* Top Header: SKU, Type Badge & Status */}
                                <div className="flex items-start justify-between gap-3 mb-2.5">
                                    <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                                        {c.sku}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {/* Product / Service Badge */}
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                            c.type === 'PRODUCT' 
                                                ? 'bg-[#F3E8FF] text-[#7E22CE] dark:bg-purple-950/40 dark:text-purple-300' 
                                                : 'bg-[#E0F2FE] text-[#0369A1] dark:bg-sky-950/40 dark:text-sky-300'
                                        }`}>
                                            {c.type === 'PRODUCT' ? <Box className="w-3 h-3" /> : <Tag className="w-3 h-3" />}
                                            {c.type}
                                        </span>

                                        {/* Status Badge */}
                                        {c.active ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 px-2 py-0.5 rounded-md">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                Inactive
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Item Name */}
                                <h3 className="text-[15px] font-bold text-text-primary tracking-tight leading-snug">
                                    {c.name}
                                </h3>

                                {/* Description */}
                                {c.description && (
                                    <p className="text-[12px] text-text-secondary line-clamp-2 mt-1.5 leading-relaxed">
                                        {c.description}
                                    </p>
                                )}

                                {/* Metadata: Tax Info (HSN/SAC and GST %) */}
                                <div className="mt-4 pt-3 border-t border-border-subtle/60 grid grid-cols-2 gap-2 text-[12px]">
                                    <div>
                                        <span className="text-text-muted text-[11px] block font-medium">HSN / SAC</span>
                                        <span className="font-semibold text-text-primary">{c.hsnSac || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-text-muted text-[11px] block font-medium">GST Rate</span>
                                        <span className="font-semibold text-text-primary">{c.defaultGstPercent ? `${c.defaultGstPercent}%` : 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Card Footer: Pricing & Actions */}
                            <div className="mt-5 pt-3 border-t border-border-subtle flex flex-col gap-3">
                                <div className="flex items-baseline justify-between">
                                    <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Rate</span>
                                    <div className="text-right">
                                        <span className="text-[17px] font-extrabold text-text-primary">
                                            {formatCurrency(c.defaultRate, c.currency, 2)}
                                        </span>
                                        <span className="text-[11px] font-medium text-text-muted uppercase ml-1">
                                            / {c.unit}
                                        </span>
                                    </div>
                                </div>

                                {canManage && (
                                    <div className="flex items-center gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => handleEdit(c)}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold text-text-secondary hover:text-text-primary bg-bg-main border border-border-subtle hover:bg-bg-hover transition-colors cursor-pointer"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => toggleStatus(c.id, c.active, c.name)}
                                            className={`flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold transition-colors border cursor-pointer ${
                                                c.active 
                                                    ? 'text-amber-700 dark:text-amber-400 border-amber-200/80 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100' 
                                                    : 'text-emerald-700 dark:text-emerald-400 border-emerald-200/80 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100'
                                            }`}
                                        >
                                            {c.active ? (
                                                <>
                                                    <Ban className="w-3.5 h-3.5" />
                                                    Deactivate
                                                </>
                                            ) : (
                                                <>
                                                    <Power className="w-3.5 h-3.5" />
                                                    Activate
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {/* Catalog Item Status Confirmation Dialog */}
            {catalogStatusTarget && (
                <ConfirmDialog
                    isOpen={Boolean(catalogStatusTarget)}
                    title={catalogStatusTarget.currentStatus ? "Deactivate Catalog Item" : "Activate Catalog Item"}
                    description={catalogStatusTarget.currentStatus 
                        ? `Are you sure you want to deactivate "${catalogStatusTarget.name}"? It will no longer appear in active quotation or catalog selection menus.`
                        : `Are you sure you want to activate "${catalogStatusTarget.name}"? It will become available for new quotations and orders.`}
                    confirmText={catalogStatusTarget.currentStatus ? "Deactivate Item" : "Activate Item"}
                    cancelText="Cancel"
                    variant={catalogStatusTarget.currentStatus ? "destructive" : "primary"}
                    isLoading={isTogglingCatalogStatus}
                    onConfirm={handleConfirmCatalogStatus}
                    onCancel={() => !isTogglingCatalogStatus && setCatalogStatusTarget(null)}
                />
            )}
        </div>
    );
}
