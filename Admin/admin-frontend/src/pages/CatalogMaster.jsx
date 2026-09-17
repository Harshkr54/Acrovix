import React, { useEffect, useState } from 'react';
import { getCatalog, createCatalogItem, updateCatalogItem, deleteCatalogItem, activateCatalogItem } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Package, Plus, ShieldAlert, X, Tag, DollarSign, Percent } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';

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
        unit: 'NOS'
    });

    const resetForm = () => {
        setFormData({
            sku: '', name: '', description: '', type: 'PRODUCT', hsnSac: '', defaultRate: '', defaultGstPercent: '', unit: 'NOS'
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
                setError(err.message || 'Failed to load catalog');
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
            unit: item.unit || 'NOS'
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
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="bg-bg-card p-8 text-center max-w-md w-full border border-border-subtle rounded-2xl shadow-sm">
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 mx-auto rounded-2xl flex items-center justify-center mb-6">
                        <ShieldAlert className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-text-primary mb-2">Unauthorized Access</h2>
                    <p className="text-sm text-text-muted">You do not have permission to view catalog.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
            
            {/* Header */}
            <PageHeader
                title="Product & Service Catalog"
                subtitle="Manage products, services, default pricing, and HSN/SAC codes."
                icon={Package}
                action={
                    canManage ? (
                        <button 
                            onClick={() => {
                                if (showForm) resetForm();
                                else setShowForm(true);
                            }}
                            className={showForm ? "btn-secondary text-xs px-4 py-2.5 rounded-xl font-medium" : "btn-primary text-xs px-4 py-2.5 rounded-xl font-medium flex items-center gap-2"}
                        >
                            {showForm ? 'Cancel' : <><Plus className="w-4 h-4" /> Add Item</>}
                        </button>
                    ) : null
                }
            />

            {/* Form Drawer / Card */}
            {showForm && canManage && (
                <div className="bg-bg-card border border-brand-primary/20 rounded-2xl p-6 shadow-sm mb-6 relative">
                    <div className="absolute top-4 right-4">
                        <button onClick={resetForm} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5"/></button>
                    </div>
                    <h2 className="text-base font-bold text-text-primary mb-6 flex items-center gap-2">
                        <Package className="w-5 h-5 text-brand-primary" />
                        {editingId ? 'Edit Item' : 'Add New Item'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div>
                                <label className="block text-xs font-semibold text-text-muted uppercase mb-2">Item Type</label>
                                <select required value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary cursor-pointer">
                                    <option value="PRODUCT">Product</option>
                                    <option value="SERVICE">Service</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-text-muted uppercase mb-2">SKU Code</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Tag className="h-4 w-4 text-text-muted" /></div>
                                    <input required type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full bg-bg-main border border-border-subtle rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary" placeholder="SKU-001" />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-text-muted uppercase mb-2">Item Name</label>
                                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary" placeholder="Product/Service Name" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div>
                                <label className="block text-xs font-semibold text-text-muted uppercase mb-2">HSN / SAC Code</label>
                                <input type="text" value={formData.hsnSac} onChange={e => setFormData({...formData, hsnSac: e.target.value})} className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary" placeholder="Optional" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-text-muted uppercase mb-2">Unit</label>
                                <input type="text" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary" placeholder="NOS, KG, HR..." />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-text-muted uppercase mb-2">Default Rate</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><DollarSign className="h-4 w-4 text-text-muted" /></div>
                                    <input required type="number" step="0.01" value={formData.defaultRate} onChange={e => setFormData({...formData, defaultRate: e.target.value})} className="w-full bg-bg-main border border-border-subtle rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary" placeholder="0.00" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-text-muted uppercase mb-2">Default GST %</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Percent className="h-4 w-4 text-text-muted" /></div>
                                    <input type="number" step="0.01" value={formData.defaultGstPercent} onChange={e => setFormData({...formData, defaultGstPercent: e.target.value})} className="w-full bg-bg-main border border-border-subtle rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary" placeholder="18.0" />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-text-muted uppercase mb-2">Description</label>
                            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-bg-main border border-border-subtle rounded-xl p-3 text-sm text-text-primary focus:outline-none focus:border-brand-primary min-h-[70px]" placeholder="Enter optional item description..."></textarea>
                        </div>
                        <div className="pt-2 flex justify-end">
                            <button type="submit" className="btn-primary text-xs px-6 py-2.5 rounded-xl font-semibold">
                                {editingId ? 'Update Item' : 'Save Item'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-bg-main/50 text-text-muted text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4">SKU / Name</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Tax Info</th>
                                <th className="px-6 py-4 text-right">Pricing</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                {canManage && <th className="px-6 py-4 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={canManage ? "6" : "5"} className="py-8">
                                        <EmptyState type="loading" message="Loading catalog items..." />
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={canManage ? "6" : "5"} className="py-8">
                                        <EmptyState type="error" message={error} onRetry={fetchCatalog} />
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={canManage ? "6" : "5"} className="py-8">
                                        <EmptyState type="empty" message="No catalog items found." />
                                    </td>
                                </tr>
                            ) : (
                                items.map(c => (
                                    <tr key={c.id} className="hover:bg-bg-main/50 transition-colors">
                                        <td className="px-6 py-4 align-top">
                                            <div className="text-xs font-bold text-brand-primary uppercase tracking-wider mb-0.5">{c.sku}</div>
                                            <div className="text-sm font-semibold text-text-primary">{c.name}</div>
                                            {c.description && <div className="text-xs text-text-muted mt-1 max-w-md line-clamp-1">{c.description}</div>}
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <StatusBadge status={c.type} />
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <div className="text-xs text-text-secondary">HSN: {c.hsnSac || 'N/A'}</div>
                                            <div className="text-xs text-text-secondary mt-0.5">GST: {c.defaultGstPercent ? `${c.defaultGstPercent}%` : 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 align-top text-right">
                                            <div className="text-sm font-bold text-text-primary">₹{Number(c.defaultRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                            <div className="text-xs text-text-muted uppercase mt-0.5">per {c.unit}</div>
                                        </td>
                                        <td className="px-6 py-4 align-top text-center">
                                            <StatusBadge status={c.active ? 'ACTIVE' : 'INACTIVE'} />
                                        </td>
                                        {canManage && (
                                            <td className="px-6 py-4 align-top text-right whitespace-nowrap">
                                                <button 
                                                    onClick={() => handleEdit(c)}
                                                    className="text-xs font-semibold text-brand-primary hover:text-brand-hover transition-colors mr-4"
                                                >
                                                    Edit
                                                </button>
                                                <button 
                                                    onClick={() => toggleStatus(c.id, c.active)}
                                                    className={`text-xs font-semibold transition-colors ${c.active ? 'text-red-500 hover:text-red-600' : 'text-brand-primary hover:text-brand-hover'}`}
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

