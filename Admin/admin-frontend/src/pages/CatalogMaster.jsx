import React, { useEffect, useState } from 'react';
import { getCatalog, createCatalogItem, updateCatalogItem, deleteCatalogItem, activateCatalogItem } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';
import { Package, Plus, ShieldAlert, AlertCircle, RefreshCw, X, Box, Tag, DollarSign, Percent } from 'lucide-react';

export default function CatalogMaster() {
    const { user: currentUser } = useAuth();
    const [items, setItems] = useState([]);
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

    const toggleStatus = async (id, currentStatus) => {
        if (!canManage) return;
        if (!window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this item?`)) return;
        try {
            if (currentStatus) {
                await deleteCatalogItem(id);
            } else {
                await activateCatalogItem(id);
            }
            fetchCatalog();
        } catch (error) {
            alert(error.message || "Failed to update status");
        }
    };

    if (!['SUPER_ADMIN', 'SALES'].includes(currentUser?.role)) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh]">
                <div className="card p-8 text-center max-w-md w-full border-t-4 border-[#DC2626]">
                    <div className="w-16 h-16 bg-[#FEF2F2] border border-[#FCA5A5] mx-auto rounded-[20px] flex items-center justify-center mb-6 shadow-sm">
                        <ShieldAlert className="w-8 h-8 text-[#DC2626]" />
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
                    <h1 className="text-[28px] font-bold text-text-primary tracking-tight leading-tight flex items-center">
                        <Package className="w-7 h-7 mr-3 text-[#4F46E5]" />
                        Product & Service Catalog
                    </h1>
                    <p className="text-[13px] text-text-secondary mt-1">View our available products and services database.</p>
                </div>
                {canManage && (
                    <button 
                        onClick={() => {
                            if (showForm) resetForm();
                            else setShowForm(true);
                        }}
                        className={showForm ? "inline-flex items-center px-4 py-2.5 bg-bg-card hover:bg-bg-hover border border-border-subtle rounded-xl text-[13px] font-semibold text-text-primary transition-colors shadow-sm" : "btn-primary flex items-center px-4 py-2.5 shadow-[0_4px_14px_rgba(79,70,229,0.25)]"}
                    >
                        {showForm ? 'Cancel' : <><Plus className="w-4 h-4 mr-2" /> Add Item</>}
                    </button>
                )}
            </div>

            {/* Form Drawer / Card */}
            {showForm && canManage && (
                <div className="card p-6 border border-[#4F46E5]/20 mb-6 relative overflow-hidden">
                    <div className="absolute top-4 right-4">
                        <button onClick={resetForm} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5"/></button>
                    </div>
                    <h2 className="text-[16px] font-bold text-text-primary mb-6 flex items-center tracking-tight">
                        <Package className="w-5 h-5 mr-2 text-[#4F46E5]" />
                        {editingId ? 'Edit Item' : 'Add New Item'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Item Type</label>
                                <select required value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="input-field rounded-xl text-[13px] bg-bg-main h-11 appearance-none cursor-pointer">
                                    <option value="PRODUCT">Product</option>
                                    <option value="SERVICE">Service</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">SKU Code</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Tag className="h-4 w-4 text-text-muted" /></div>
                                    <input required type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="input-field pl-9 rounded-xl text-[13px] bg-bg-main h-11" placeholder="SKU-001" />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Item Name</label>
                                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-field rounded-xl text-[13px] bg-bg-main h-11" placeholder="Product/Service Name" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">HSN / SAC Code</label>
                                <input type="text" value={formData.hsnSac} onChange={e => setFormData({...formData, hsnSac: e.target.value})} className="input-field rounded-xl text-[13px] bg-bg-main h-11" placeholder="Optional" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Unit</label>
                                <input type="text" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="input-field rounded-xl text-[13px] bg-bg-main h-11" placeholder="NOS, KG, HR..." />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Currency</label>
                                <select 
                                    value={formData.currency} 
                                    onChange={e => setFormData({...formData, currency: e.target.value})} 
                                    className="input-field rounded-xl text-[13px] bg-bg-main h-11 cursor-pointer font-semibold"
                                >
                                    <option value="INR">INR (₹)</option>
                                    <option value="USD">USD ($)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Default Rate</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><DollarSign className="h-4 w-4 text-text-muted" /></div>
                                    <input required type="number" step="0.01" value={formData.defaultRate} onChange={e => setFormData({...formData, defaultRate: e.target.value})} className="input-field pl-9 rounded-xl text-[13px] bg-bg-main h-11" placeholder="0.00" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Default GST %</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Percent className="h-4 w-4 text-text-muted" /></div>
                                    <input type="number" step="0.01" value={formData.defaultGstPercent} onChange={e => setFormData({...formData, defaultGstPercent: e.target.value})} className="input-field pl-9 rounded-xl text-[13px] bg-bg-main h-11" placeholder="18.0" />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Description</label>
                            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="input-field rounded-xl text-[13px] bg-bg-main min-h-[60px] p-3" placeholder="Enter optional item description..."></textarea>
                        </div>
                        <div className="pt-2 flex justify-end">
                            <button type="submit" className="btn-primary px-8 py-2.5 text-[13px] font-semibold shadow-[0_4px_14px_rgba(79,70,229,0.25)] border-transparent">
                                {editingId ? 'Update Item' : 'Save Item'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card flex flex-col">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border-subtle">
                        <thead>
                            <tr>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card rounded-tl-[24px]">SKU / Name</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Type</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Tax Info</th>
                                <th className="px-6 py-4 text-right text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Pricing</th>
                                <th className="px-6 py-4 text-center text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Status</th>
                                {canManage && <th className="px-6 py-4 text-right text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card rounded-tr-[24px]">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="bg-bg-card divide-y divide-border-subtle/40 rounded-b-[24px]">
                            {error ? (
                                <tr>
                                    <td colSpan={canManage ? "6" : "5"} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-4 max-w-sm mx-auto">
                                            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-1">
                                                <AlertCircle className="w-6 h-6 text-red-500" />
                                            </div>
                                            <p className="text-[15px] font-bold text-text-primary">Failed to load catalog</p>
                                            <p className="text-[13px] text-text-secondary leading-relaxed">{error}</p>
                                            <button onClick={fetchCatalog} className="btn-primary mt-2">
                                                <RefreshCw className="w-4 h-4 mr-2" />
                                                Retry
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : isLoading ? (
                                <tr>
                                    <td colSpan={canManage ? "6" : "5"} className="px-6 py-16 text-center">
                                        <div className="flex justify-center mb-4">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4F46E5]"></div>
                                        </div>
                                        <p className="text-[13px] font-medium text-text-muted">Loading catalog...</p>
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={canManage ? "6" : "5"} className="px-6 py-16 text-center text-text-muted text-[13px] font-medium">
                                        No items found.
                                    </td>
                                </tr>
                            ) : (
                                items.map(c => (
                                    <tr key={c.id} className="hover:bg-bg-hover transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap align-top">
                                            <div className="text-[11px] font-bold text-text-muted mb-0.5 tracking-wider">{c.sku}</div>
                                            <div className="text-[13px] font-bold text-text-primary tracking-tight">{c.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap align-top">
                                            <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${c.type === 'PRODUCT' ? 'bg-[#F3E8FF] text-[#7E22CE]' : 'bg-[#E0F2FE] text-[#0369A1]'}`}>
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
                                                <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-[#059669] bg-[#059669]/10 px-2 py-1 rounded-md">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-[#DC2626] bg-[#DC2626]/10 px-2 py-1 rounded-md">
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        {canManage && (
                                            <td className="px-6 py-4 whitespace-nowrap align-top text-right">
                                                <button 
                                                    onClick={() => handleEdit(c)}
                                                    className="text-[12px] font-semibold text-[#4F46E5] hover:text-[#4338CA] transition-colors mr-4"
                                                >
                                                    Edit
                                                </button>
                                                <button 
                                                    onClick={() => toggleStatus(c.id, c.active)}
                                                    className={`text-[12px] font-semibold transition-colors ${c.active ? 'text-[#DC2626] hover:text-[#B91C1C]' : 'text-[#4F46E5] hover:text-[#4338CA]'}`}
                                                >
                                                    {c.active ? 'Deactivate' : 'Activate'}
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
