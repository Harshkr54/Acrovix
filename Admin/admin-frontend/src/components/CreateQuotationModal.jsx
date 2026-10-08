import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi, getCustomers } from '../services/api';
import { Globe, UserPlus, X, ArrowLeft, Plus, Phone, MessageSquare, Mail, UserCheck, Store, HelpCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import GstinAutoLookup from './GstinAutoLookup';

export default function CreateQuotationModal({ isOpen, onClose }) {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [step, setStep] = useState(1); // 1: Choose type, 2: Direct quotation client details
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        customerId: null,
        clientName: '',
        clientCompany: '',
        clientEmail: '',
        clientPhone: '',
        gstin: '',
        billingAddress: '',
        shippingAddress: '',
        state: '',
        pincode: '',
        currency: 'INR',
        quotationSource: 'PHONE',
        sourceNotes: ''
    });

    // Customer Selector State
    const [customerSearch, setCustomerSearch] = useState('');
    const [customers, setCustomers] = useState([]);
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);


    useEffect(() => {
        if (isCustomerDropdownOpen) {
            setIsLoadingCustomers(true);
            getCustomers({ search: customerSearch, active: true, size: 50 })
                .then(data => setCustomers(data.content || []))
                .catch(err => console.error(err))
                .finally(() => setIsLoadingCustomers(false));
        }
    }, [customerSearch, isCustomerDropdownOpen]);

    if (!isOpen) return null;

    const handleClose = () => {
        setStep(1);
        setError(null);
        setFormData({
            customerId: null,
            clientName: '',
            clientCompany: '',
            clientEmail: '',
            clientPhone: '',
            gstin: '',
            billingAddress: '',
            shippingAddress: '',
            state: '',
            pincode: '',
            currency: 'INR',
            quotationSource: 'PHONE',
            sourceNotes: ''
        });
        setCustomerSearch('');
        onClose();
    };

    const selectCustomer = (c) => {
        setFormData(prev => ({
            ...prev,
            customerId: c.id,
            clientName: c.name || '',
            clientCompany: c.companyName || '',
            clientEmail: c.email || '',
            clientPhone: c.phone || '',
            gstin: c.gstin || '',
            billingAddress: c.billingAddress || '',
            shippingAddress: c.shippingAddress || '',
            state: c.state || '',
            pincode: c.pincode || ''
        }));
        setCustomerSearch('');
        setIsCustomerDropdownOpen(false);
    };

    // handleGstLookup removed in favor of GstinAutoLookup component

    const handleSelectEnquiry = () => {
        handleClose();
        navigate('/enquiries');
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateDirectQuotation = async (e) => {
        e.preventDefault();
        if (isCreating) return;
        setError(null);

        if (!formData.clientName.trim()) {
            setError('Client name is required');
            return;
        }

        if (!formData.clientEmail.trim()) {
            setError('Client email is required');
            return;
        }

        setIsCreating(true);

        try {
            const data = await fetchApi('/quotations/direct', {
                method: 'POST',
                body: JSON.stringify({
                    customerId: formData.customerId,
                    clientName: formData.clientName.trim(),
                    clientCompany: formData.clientCompany.trim() || null,
                    clientEmail: formData.clientEmail.trim(),
                    clientPhone: formData.clientPhone.trim() || null,
                    gstin: formData.gstin.trim() || null,
                    billingAddress: formData.billingAddress.trim() || null,
                    shippingAddress: formData.shippingAddress.trim() || null,
                    state: formData.state.trim() || null,
                    pincode: formData.pincode.trim() || null,
                    currency: formData.currency,
                    quotationSource: formData.quotationSource,
                    sourceNotes: formData.sourceNotes.trim() || null
                })
            });

            handleClose();
            if (data && data.id) {
                navigate(`/quotations/edit/${data.id}`);
            } else {
                throw new Error("Invalid quotation creation response.");
            }
        } catch (err) {
            console.error("Error creating direct quotation:", err);
            setError(err.message || 'Failed to create direct quotation. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    const sourceOptions = [
        { value: 'PHONE', label: 'Phone Call', icon: Phone },
        { value: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquare },
        { value: 'EMAIL', label: 'Email Request', icon: Mail },
        { value: 'REFERRAL', label: 'Referral', icon: UserCheck },
        { value: 'WALK_IN', label: 'Walk-in Client', icon: Store },
        { value: 'OTHER', label: 'Other Source', icon: HelpCircle }
    ];

    return (
        <div className="fixed inset-0 bg-text-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-bg-card p-6 md:p-8 w-full max-w-4xl rounded-[20px] border border-border-subtle shadow-2xl relative animate-modal-entrance my-8">
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-[10px] bg-bg-card border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                {step === 1 ? (
                    <div>
                        <div className="mb-6">
                            <h2 className="text-[22px] font-bold text-text-primary tracking-tight">Create New Quotation</h2>
                            <p className="text-[13px] text-text-secondary mt-1">Choose how you want to create this quotation.</p>
                        </div>

                        <div className="space-y-3 mt-2">
                            {/* Option 1: From Website Enquiry */}
                            <button
                                onClick={handleSelectEnquiry}
                                className="group w-full min-h-[88px] p-4 bg-bg-card hover:bg-brand-primary/5 border border-border-subtle hover:border-brand-primary/40 rounded-[14px] transition-all duration-200 text-left flex items-center gap-4 shadow-sm hover:shadow"
                            >
                                <div className="w-11 h-11 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0 transition-transform">
                                    <Globe className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-[15px] font-bold text-text-primary group-hover:text-brand-primary transition-colors truncate">
                                            From Website Enquiry
                                        </h3>
                                        <span className="text-[12px] font-bold text-brand-primary group-hover:translate-x-0.5 transition-transform shrink-0 whitespace-nowrap">
                                            Select Enquiry &rarr;
                                        </span>
                                    </div>
                                    <p className="text-[13px] text-text-secondary mt-1 leading-[1.5] break-words whitespace-normal">
                                        Create a quotation from an existing website enquiry submitted via website contact forms.
                                    </p>
                                </div>
                            </button>

                            {/* Option 2: Direct / Manual Quotation */}
                            <button
                                onClick={() => setStep(2)}
                                className="group w-full min-h-[88px] p-4 bg-bg-card hover:bg-brand-teal/5 border border-border-subtle hover:border-brand-teal/40 rounded-[14px] transition-all duration-200 text-left flex items-center gap-4 shadow-sm hover:shadow"
                            >
                                <div className="w-11 h-11 rounded-xl bg-[#14B8A6]/10 flex items-center justify-center text-brand-teal shrink-0 transition-transform">
                                    <UserPlus className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-[15px] font-bold text-text-primary group-hover:text-brand-teal transition-colors truncate">
                                            Direct / Manual Quotation
                                        </h3>
                                        <span className="text-[12px] font-bold text-brand-teal group-hover:translate-x-0.5 transition-transform shrink-0 whitespace-nowrap">
                                            Create Manually &rarr;
                                        </span>
                                    </div>
                                    <p className="text-[13px] text-text-secondary mt-1 leading-[1.5] break-words whitespace-normal">
                                        Create a quotation for orders received directly through phone, WhatsApp, email, referral, walk-in, or other sources.
                                    </p>
                                </div>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center space-x-3 mb-6">
                            <button
                                onClick={() => setStep(1)}
                                className="btn btn-secondary btn-icon"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <div>
                                <h2 className="text-[20px] font-bold text-text-primary tracking-tight">Direct Quotation Details</h2>
                                <p className="text-[12px] text-text-secondary">Enter client and order source information.</p>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-xl text-[12px] text-red-600 dark:text-red-400 font-medium">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleCreateDirectQuotation} className="space-y-4">
                            
                            {/* Customer Loading / GSTIN Fetch */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 border border-border-subtle rounded-xl bg-bg-muted/30">
                                <div className="relative">
                                    <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                                        Load from Customer Master
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Search existing customer..."
                                        value={customerSearch}
                                        onChange={(e) => {
                                            setCustomerSearch(e.target.value);
                                            setIsCustomerDropdownOpen(true);
                                        }}
                                        onFocus={() => setIsCustomerDropdownOpen(true)}
                                        onBlur={() => setTimeout(() => setIsCustomerDropdownOpen(false), 200)}
                                        className="w-full bg-bg-main border border-border-subtle focus:border-brand-teal rounded-xl px-3 py-2 text-[13px] font-semibold text-text-primary outline-none transition-colors"
                                    />
                                    {isCustomerDropdownOpen && (
                                        <div className="absolute z-50 w-full mt-1 bg-bg-card border border-border-subtle rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                            {isLoadingCustomers ? (
                                                <div className="p-3 text-[12px] text-text-muted text-center">Loading...</div>
                                            ) : customers.length === 0 ? (
                                                <div className="p-3 text-[12px] text-text-muted text-center">No customers found</div>
                                            ) : (
                                                customers.map(c => (
                                                    <div 
                                                        key={c.id}
                                                        onClick={() => selectCustomer(c)}
                                                        className="px-4 py-2 hover:bg-bg-hover cursor-pointer border-b border-border-subtle/40 last:border-0"
                                                    >
                                                        <div className="text-[13px] font-bold text-text-primary">{c.name} {c.companyName ? `(${c.companyName})` : ''}</div>
                                                        <div className="text-[11px] text-text-muted">{c.email} | {c.phone}</div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                                        Or Verify GSTIN
                                    </label>
                                    <GstinAutoLookup 
                                        value={formData.gstin}
                                        onChange={(val) => handleInputChange({ target: { name: 'gstin', value: val } })}
                                        onVerified={(data) => {
                                            setFormData(prev => ({
                                                ...prev,
                                                customerId: null, // Clear existing customer linkage if any
                                                clientName: data.tradeName || data.legalName || prev.clientName,
                                                clientCompany: data.legalName || prev.clientCompany,
                                                billingAddress: data.billingAddress || prev.billingAddress,
                                                state: data.state || prev.state,
                                                pincode: data.pincode || prev.pincode
                                            }));
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                                        Client Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="clientName"
                                        value={formData.clientName}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="e.g. Harsh Raj"
                                        className="w-full bg-bg-main border border-border-subtle focus:border-brand-teal rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-text-primary outline-none transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                                        Company Name
                                    </label>
                                    <input
                                        type="text"
                                        name="clientCompany"
                                        value={formData.clientCompany}
                                        onChange={handleInputChange}
                                        placeholder="e.g. ACROVIX"
                                        className="w-full bg-bg-main border border-border-subtle focus:border-brand-teal rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-text-primary outline-none transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                                        Client Email <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        name="clientEmail"
                                        value={formData.clientEmail}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="client@company.com"
                                        className="w-full bg-bg-main border border-border-subtle focus:border-brand-teal rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-text-primary outline-none transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                                        Client Phone
                                    </label>
                                    <input
                                        type="text"
                                        name="clientPhone"
                                        value={formData.clientPhone}
                                        onChange={handleInputChange}
                                        placeholder="+91 9876543210"
                                        className="w-full bg-bg-main border border-border-subtle focus:border-brand-teal rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-text-primary outline-none transition-colors"
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                                        Billing Address
                                    </label>
                                    <input
                                        type="text"
                                        name="billingAddress"
                                        value={formData.billingAddress}
                                        onChange={handleInputChange}
                                        placeholder="123 Business St."
                                        className="w-full bg-bg-main border border-border-subtle focus:border-brand-teal rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-text-primary outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                                        State
                                    </label>
                                    <input
                                        type="text"
                                        name="state"
                                        value={formData.state}
                                        onChange={handleInputChange}
                                        placeholder="State"
                                        className="w-full bg-bg-main border border-border-subtle focus:border-brand-teal rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-text-primary outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                                        Pincode
                                    </label>
                                    <input
                                        type="text"
                                        name="pincode"
                                        value={formData.pincode}
                                        onChange={handleInputChange}
                                        placeholder="Zip Code"
                                        className="w-full bg-bg-main border border-border-subtle focus:border-brand-teal rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-text-primary outline-none transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                                        Currency <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        name="currency"
                                        value={formData.currency}
                                        onChange={handleInputChange}
                                        className="w-full bg-bg-main border border-border-subtle focus:border-brand-teal rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-text-primary outline-none transition-colors"
                                    >
                                        <option value="INR">INR (₹)</option>
                                        <option value="USD">USD ($)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                                        Quotation Source <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        name="quotationSource"
                                        value={formData.quotationSource}
                                        onChange={handleInputChange}
                                        className="w-full bg-bg-main border border-border-subtle focus:border-brand-teal rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-text-primary outline-none transition-colors"
                                    >
                                        {sourceOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                                    Source Notes / Reference (Optional)
                                </label>
                                <textarea
                                    name="sourceNotes"
                                    value={formData.sourceNotes}
                                    onChange={handleInputChange}
                                    placeholder="e.g. Client called sales team on 13 Sep"
                                    rows="2"
                                    className="w-full bg-bg-main border border-border-subtle focus:border-brand-teal rounded-xl px-3.5 py-2 text-[13px] font-medium text-text-primary outline-none transition-colors resize-none"
                                ></textarea>
                            </div>

                            <div className="flex items-center justify-end space-x-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    disabled={isCreating}
                                    className="btn btn-secondary btn-md"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="btn btn-primary btn-md"
                                >
                                    {isCreating ? (
                                        <><span className="animate-spin w-4 h-4 border-b-2 border-white rounded-full "></span> Creating...</>
                                    ) : (
                                        <><Plus className="w-4 h-4 " /> Create & Open Builder</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
