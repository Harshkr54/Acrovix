import React, { useEffect, useState } from 'react';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, activateCustomer } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { UsersRound, Plus, ShieldAlert, AlertCircle, RefreshCw, X, Building, Mail, Phone, MapPin, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CustomerMaster() {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [customers, setCustomers] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingId, setEditingId] = useState(null);
    
    // Form State
    const [formData, setFormData] = useState({
        customerCode: '',
        name: '',
        companyName: '',
        email: '',
        phone: '',
        gstin: '',
        currency: 'INR',
        billingAddress: '',
        shippingAddress: ''
    });

    const resetForm = () => {
        setFormData({
            customerCode: '', name: '', companyName: '', email: '', phone: '', gstin: '', currency: 'INR', billingAddress: '', shippingAddress: ''
        });
        setEditingId(null);
        setShowForm(false);
    };

    const fetchCustomersList = React.useCallback(() => {
        setIsLoading(true);
        setError(null);
        getCustomers({ size: 100 })
            .then(data => {
                setCustomers(data.content || []);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Error fetching customers", err);
                setError(err.message);
                setIsLoading(false);
            });
    }, []);

    useEffect(() => {
        fetchCustomersList();
    }, [fetchCustomersList]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateCustomer(editingId, formData);
            } else {
                await createCustomer(formData);
            }
            fetchCustomersList();
            resetForm();
        } catch (error) {
            alert(error.message || "Failed to save customer.");
        }
    };

    const handleEdit = (customer) => {
        setFormData({
            customerCode: customer.customerCode || '',
            name: customer.name || '',
            companyName: customer.companyName || '',
            email: customer.email || '',
            phone: customer.phone || '',
            gstin: customer.gstin || '',
            currency: customer.currency || 'INR',
            billingAddress: customer.billingAddress || '',
            shippingAddress: customer.shippingAddress || ''
        });
        setEditingId(customer.id);
        setShowForm(true);
    };

    const toggleStatus = async (id, currentStatus) => {
        if (!window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this customer?`)) return;
        try {
            if (currentStatus) {
                await deleteCustomer(id);
            } else {
                await activateCustomer(id);
            }
            fetchCustomersList();
        } catch (error) {
            alert(error.message || "Failed to update status");
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
                    <p className="text-[13px] text-text-secondary">You do not have permission to view customers.</p>
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
                        <UsersRound className="w-7 h-7 mr-3 text-brand-teal" />
                        Customers
                    </h1>
                    <p className="text-[13px] text-text-secondary mt-1">Manage customer database and billing information.</p>
                </div>
                <button 
                    onClick={() => {
                        if (showForm) resetForm();
                        else setShowForm(true);
                    }}
                    className={showForm ? "inline-flex items-center px-4 py-2.5 bg-bg-card hover:bg-bg-hover border border-border-subtle rounded-xl text-[13px] font-semibold text-text-primary transition-colors shadow-sm" : "acx-btn-primary flex items-center px-4 py-2.5 shadow-[0_4px_14px_rgba(79,70,229,0.25)]"}
                >
                    {showForm ? 'Cancel' : <><Plus className="w-4 h-4 mr-2" /> Add Customer</>}
                </button>
            </div>

            {/* Form Drawer / Card */}
            {showForm && (
                <div className="acx-card p-6 border border-brand-teal/20 mb-6 relative overflow-hidden">
                    <div className="absolute top-4 right-4">
                        <button onClick={resetForm} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5"/></button>
                    </div>
                    <h2 className="text-[16px] font-bold text-text-primary mb-6 flex items-center tracking-tight">
                        <UsersRound className="w-5 h-5 mr-2 text-brand-teal" />
                        {editingId ? 'Edit Customer' : 'Add New Customer'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Customer Code</label>
                                <input required type="text" value={formData.customerCode} onChange={e => setFormData({...formData, customerCode: e.target.value})} className="acx-input rounded-xl text-[13px] bg-bg-main h-11" placeholder="CUST-001" disabled={editingId !== null} />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Contact Name</label>
                                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="acx-input rounded-xl text-[13px] bg-bg-main h-11" placeholder="John Doe" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Company Name</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Building className="h-4 w-4 text-text-muted" /></div>
                                    <input type="text" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="acx-input pl-9 rounded-xl text-[13px] bg-bg-main h-11" placeholder="Acme Corp" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Email</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-4 w-4 text-text-muted" /></div>
                                    <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="acx-input pl-9 rounded-xl text-[13px] bg-bg-main h-11" placeholder="john@acme.com" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Phone</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Phone className="h-4 w-4 text-text-muted" /></div>
                                    <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="acx-input pl-9 rounded-xl text-[13px] bg-bg-main h-11" placeholder="+1 234 567 890" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">GSTIN</label>
                                <input type="text" value={formData.gstin} onChange={e => setFormData({...formData, gstin: e.target.value})} className="acx-input rounded-xl text-[13px] bg-bg-main h-11" placeholder="22AAAAA0000A1Z5" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Default Billing Currency</label>
                                <select 
                                    value={formData.currency} 
                                    onChange={e => setFormData({...formData, currency: e.target.value})} 
                                    className="acx-input rounded-xl text-[13px] bg-bg-main h-11 cursor-pointer font-semibold"
                                >
                                    <option value="INR">INR (₹)</option>
                                    <option value="USD">USD ($)</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Billing Address</label>
                                <textarea value={formData.billingAddress} onChange={e => setFormData({...formData, billingAddress: e.target.value})} className="acx-input rounded-xl text-[13px] bg-bg-main min-h-[80px] p-3" placeholder="Enter billing address..."></textarea>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Shipping Address</label>
                                <textarea value={formData.shippingAddress} onChange={e => setFormData({...formData, shippingAddress: e.target.value})} className="acx-input rounded-xl text-[13px] bg-bg-main min-h-[80px] p-3" placeholder="Enter shipping address..."></textarea>
                            </div>
                        </div>
                        <div className="pt-2 flex justify-end">
                            <button type="submit" className="acx-btn-primary px-8 py-2.5 text-[13px] font-semibold shadow-[0_4px_14px_rgba(20,184,166,0.25)] bg-brand-teal hover:bg-[#0F766E] border-transparent">
                                {editingId ? 'Update Customer' : 'Save Customer'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="acx-card flex flex-col">
                <div className="acx-table-container">
                    <table className="acx-table">
                        <thead>
                            <tr>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card rounded-tl-[24px]">Code / Name</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Company / GSTIN</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Contact Info</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Currency</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Status</th>
                                <th className="px-6 py-4 text-right text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card rounded-tr-[24px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-bg-card divide-y divide-border-subtle/40 rounded-b-[24px]">
                            {error ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-4 max-w-sm mx-auto">
                                            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-1">
                                                <AlertCircle className="w-6 h-6 text-red-500" />
                                            </div>
                                            <p className="text-[15px] font-bold text-text-primary">Failed to load customers</p>
                                            <p className="text-[13px] text-text-secondary leading-relaxed">{error}</p>
                                            <button onClick={fetchCustomersList} className="acx-btn-primary mt-2">
                                                <RefreshCw className="w-4 h-4 mr-2" />
                                                Retry
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : isLoading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-16 text-center">
                                        <div className="flex justify-center mb-4">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal"></div>
                                        </div>
                                        <p className="text-[13px] font-medium text-text-muted">Loading customers...</p>
                                    </td>
                                </tr>
                            ) : customers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-16 text-center text-text-muted text-[13px] font-medium">
                                        No customers found.
                                    </td>
                                </tr>
                            ) : (
                                customers.map(c => (
                                    <tr key={c.id} className="hover:bg-bg-hover transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap align-top">
                                            <div className="text-[11px] font-bold text-text-muted mb-0.5 uppercase tracking-wider">{c.customerCode}</div>
                                            <div className="text-[13px] font-bold text-text-primary tracking-tight">{c.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap align-top">
                                            <div className="text-[13px] font-medium text-text-primary">{c.companyName || '-'}</div>
                                            {c.gstin && <div className="text-[11px] text-text-secondary mt-0.5 tracking-wider">{c.gstin}</div>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap align-top">
                                            <div className="text-text-secondary text-[13px] font-medium flex items-center"><Mail className="w-3 h-3 mr-1.5"/>{c.email}</div>
                                            {c.phone && <div className="text-text-secondary text-[12px] mt-1 flex items-center"><Phone className="w-3 h-3 mr-1.5"/>{c.phone}</div>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap align-top">
                                            <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-text-primary bg-bg-main border border-border-subtle px-2 py-1 rounded-md">
                                                {c.currency || 'INR'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap align-top">
                                            {c.active ? (
                                                <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-brand-success bg-[#059669]/10 px-2 py-1 rounded-md">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-brand-danger bg-[#DC2626]/10 px-2 py-1 rounded-md">
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap align-top text-right">
                                            <button 
                                                onClick={() => navigate(`/customers/${c.id}/360`)}
                                                className="text-[12px] font-semibold text-brand-teal hover:text-brand-teal transition-colors mr-4"
                                            >
                                                360 View
                                            </button>
                                            <button 
                                                onClick={() => handleEdit(c)}
                                                className="text-[12px] font-semibold text-text-secondary hover:text-text-primary transition-colors mr-4"
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                onClick={() => toggleStatus(c.id, c.active)}
                                                className={`text-[12px] font-semibold transition-colors ${c.active ? 'text-brand-danger hover:text-[#B91C1C]' : 'text-[var(--color-brand-primary)] hover:text-brand-primary/90'}`}
                                            >
                                                {c.active ? 'Deactivate' : 'Activate'}
                                            </button>
                                        </td>
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
