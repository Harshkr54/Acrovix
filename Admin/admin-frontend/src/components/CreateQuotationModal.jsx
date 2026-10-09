import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi, getCustomers } from '../services/api';
import { Globe, UserPlus, X, ArrowLeft, Plus, Phone, MessageSquare, Mail, UserCheck, Store, HelpCircle, FileText, Loader2 } from 'lucide-react';
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

    const inputClasses = "w-full bg-white border border-[#D9E2EC] focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 rounded-[12px] px-3.5 min-h-[44px] text-[13px] font-medium text-[#0B192C] placeholder:text-text-muted outline-none transition-all duration-200";
    const labelClasses = "block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5";

    return (
        <div className="fixed inset-0 bg-[#0B192C]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className={`bg-white w-full shadow-2xl relative animate-modal-entrance flex flex-col ${step === 1 ? 'max-w-4xl p-6 md:p-8 rounded-[20px] my-8 h-auto overflow-y-auto' : 'max-w-[950px] w-[calc(100vw-32px)] max-h-[88vh] rounded-[24px]'}`}>
                
                {/* Close Button - Kept absolute for both steps */}
                <button
                    onClick={handleClose}
                    className={`absolute w-9 h-9 flex items-center justify-center rounded-[10px] border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors z-[60] ${step === 1 ? 'top-5 right-5 bg-bg-card' : 'top-5 right-5 md:top-6 md:right-6 bg-white'}`}
                >
                    <X className="w-5 h-5" />
                </button>

                {step === 1 ? (
                    <div>
                        <div className="mb-6">
                            <h2 className="text-[22px] font-bold text-[#0B192C] tracking-tight">Create New Quotation</h2>
                            <p className="text-[13px] text-text-secondary mt-1">Choose how you want to create this quotation.</p>
                        </div>

                        <div className="space-y-3 mt-2">
                            {/* Option 1: From Website Enquiry */}
                            <button
                                onClick={handleSelectEnquiry}
                                className="group w-full min-h-[88px] p-4 bg-white hover:bg-brand-primary/5 border border-border-subtle hover:border-brand-primary/40 rounded-[14px] transition-all duration-200 text-left flex items-center gap-4 shadow-sm hover:shadow"
                            >
                                <div className="w-11 h-11 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0 transition-transform">
                                    <Globe className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-[15px] font-bold text-[#0B192C] group-hover:text-brand-primary transition-colors truncate">
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
                                className="group w-full min-h-[88px] p-4 bg-white hover:bg-[#0D9488]/5 border border-border-subtle hover:border-[#0D9488]/40 rounded-[14px] transition-all duration-200 text-left flex items-center gap-4 shadow-sm hover:shadow"
                            >
                                <div className="w-11 h-11 rounded-xl bg-[#14B8A6]/10 flex items-center justify-center text-[#0D9488] shrink-0 transition-transform">
                                    <UserPlus className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-[15px] font-bold text-[#0B192C] group-hover:text-[#0D9488] transition-colors truncate">
                                            Direct / Manual Quotation
                                        </h3>
                                        <span className="text-[12px] font-bold text-[#0D9488] group-hover:translate-x-0.5 transition-transform shrink-0 whitespace-nowrap">
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
                    <>
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 md:px-8 border-b border-border-subtle shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-[12px] bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-[18px] md:text-[22px] font-bold text-[#0B192C] tracking-tight leading-none">Direct Quotation Details</h2>
                                    <p className="text-[13px] text-text-secondary mt-1">Enter client and order source information.</p>
                                </div>
                            </div>
                        </div>

                        {/* Scrollable Body */}
                        <div className="flex-1 overflow-y-auto p-6 md:px-8 bg-white">
                            {error && (
                                <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-[12px] text-[13px] text-red-600 font-medium flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form id="direct-quotation-form" onSubmit={handleCreateDirectQuotation} className="space-y-8 pb-4">
                                
                                {/* 1. CUSTOMER & GST VERIFICATION */}
                                <div>
                                    <div className="mb-3">
                                        <h3 className="text-[14px] font-bold text-[#0B192C] uppercase tracking-wide">Customer & GST Verification</h3>
                                        <p className="text-[12px] text-text-secondary mt-0.5">Select an existing customer or verify a new GSTIN to auto-fill details.</p>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-6 items-start bg-[#F3F7FA] border border-border-subtle rounded-[16px] p-5">
                                        <div className="relative">
                                            <label className={labelClasses}>
                                                Customer Master
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
                                                className={inputClasses}
                                            />
                                            {isCustomerDropdownOpen && (
                                                <div className="absolute z-50 w-full mt-1 bg-white border border-[#D9E2EC] rounded-[12px] shadow-lg max-h-48 overflow-y-auto">
                                                    {isLoadingCustomers ? (
                                                        <div className="p-3 text-[12px] text-text-muted text-center flex items-center justify-center gap-2">
                                                            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                                                        </div>
                                                    ) : customers.length === 0 ? (
                                                        <div className="p-3 text-[12px] text-text-muted text-center">No customers found</div>
                                                    ) : (
                                                        customers.map(c => (
                                                            <div 
                                                                key={c.id}
                                                                onMouseDown={(e) => e.preventDefault()}
                                                                onClick={() => selectCustomer(c)}
                                                                className="px-4 py-2.5 hover:bg-bg-hover cursor-pointer border-b border-border-subtle/40 last:border-0 transition-colors"
                                                            >
                                                                <div className="text-[13px] font-bold text-[#0B192C]">{c.name} {c.companyName ? `(${c.companyName})` : ''}</div>
                                                                <div className="text-[11px] text-text-muted mt-0.5">{c.email} | {c.phone}</div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="hidden md:flex flex-col items-center justify-center self-stretch pt-6">
                                            <div className="w-[1px] h-6 bg-[#D9E2EC]"></div>
                                            <span className="text-[11px] font-bold text-text-muted uppercase tracking-widest my-2">OR</span>
                                            <div className="w-[1px] h-6 bg-[#D9E2EC]"></div>
                                        </div>

                                        <div>
                                            <label className={labelClasses}>
                                                GSTIN Verification
                                            </label>
                                            <GstinAutoLookup 
                                                value={formData.gstin}
                                                onChange={(val) => handleInputChange({ target: { name: 'gstin', value: val } })}
                                                placeholder="Enter GSTIN"
                                                className="bg-white border-[#D9E2EC] focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 rounded-[12px]"
                                                onVerified={(data) => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        customerId: null,
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
                                </div>

                                <div className="h-[1px] w-full bg-border-subtle"></div>

                                {/* 2. CLIENT INFORMATION */}
                                <div>
                                    <div className="mb-4 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-[14px] font-bold text-[#0B192C] uppercase tracking-wide flex items-center gap-2">
                                                Client Information
                                                {formData.gstin && formData.clientName && (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#047857] bg-[#ECFDF5] px-2 py-0.5 rounded-[4px] border border-[#A7F3D0]">
                                                        Auto-filled
                                                    </span>
                                                )}
                                            </h3>
                                            <p className="text-[12px] text-text-secondary mt-0.5">Primary contact and billing details for this quotation.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelClasses}>
                                                    Client Name <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    name="clientName"
                                                    value={formData.clientName}
                                                    onChange={handleInputChange}
                                                    required
                                                    placeholder="e.g. Harsh Raj"
                                                    className={inputClasses}
                                                />
                                            </div>

                                            <div>
                                                <label className={labelClasses}>
                                                    Company Name
                                                </label>
                                                <input
                                                    type="text"
                                                    name="clientCompany"
                                                    value={formData.clientCompany}
                                                    onChange={handleInputChange}
                                                    placeholder="e.g. ACROVIX"
                                                    className={inputClasses}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelClasses}>
                                                    Client Email <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="email"
                                                    name="clientEmail"
                                                    value={formData.clientEmail}
                                                    onChange={handleInputChange}
                                                    required
                                                    placeholder="client@company.com"
                                                    className={inputClasses}
                                                />
                                            </div>

                                            <div>
                                                <label className={labelClasses}>
                                                    Client Phone
                                                </label>
                                                <input
                                                    type="text"
                                                    name="clientPhone"
                                                    value={formData.clientPhone}
                                                    onChange={handleInputChange}
                                                    placeholder="+91 9876543210"
                                                    className={inputClasses}
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
                                            <div className="sm:col-span-4">
                                                <label className={labelClasses}>
                                                    Billing Address
                                                </label>
                                                <input
                                                    type="text"
                                                    name="billingAddress"
                                                    value={formData.billingAddress}
                                                    onChange={handleInputChange}
                                                    placeholder="123 Business St."
                                                    className={inputClasses}
                                                />
                                            </div>
                                            <div className="sm:col-span-1">
                                                <label className={labelClasses}>
                                                    State
                                                </label>
                                                <input
                                                    type="text"
                                                    name="state"
                                                    value={formData.state}
                                                    onChange={handleInputChange}
                                                    placeholder="State"
                                                    className={inputClasses}
                                                />
                                            </div>
                                            <div className="sm:col-span-1">
                                                <label className={labelClasses}>
                                                    Pincode
                                                </label>
                                                <input
                                                    type="text"
                                                    name="pincode"
                                                    value={formData.pincode}
                                                    onChange={handleInputChange}
                                                    placeholder="Zip Code"
                                                    className={inputClasses}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-[1px] w-full bg-border-subtle"></div>

                                {/* 3. QUOTATION SOURCE */}
                                <div>
                                    <div className="mb-4">
                                        <h3 className="text-[14px] font-bold text-[#0B192C] uppercase tracking-wide">Quotation Source</h3>
                                        <p className="text-[12px] text-text-secondary mt-0.5">Specify how this quotation request was received.</p>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelClasses}>
                                                    Currency <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    name="currency"
                                                    value={formData.currency}
                                                    onChange={handleInputChange}
                                                    className={`${inputClasses} cursor-pointer appearance-none bg-no-repeat bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.75rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                                                >
                                                    <option value="INR">INR (₹)</option>
                                                    <option value="USD">USD ($)</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className={labelClasses}>
                                                    Quotation Source <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    name="quotationSource"
                                                    value={formData.quotationSource}
                                                    onChange={handleInputChange}
                                                    className={`${inputClasses} cursor-pointer appearance-none bg-no-repeat bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.75rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
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
                                            <label className={labelClasses}>
                                                Source Notes / Reference (Optional)
                                            </label>
                                            <textarea
                                                name="sourceNotes"
                                                value={formData.sourceNotes}
                                                onChange={handleInputChange}
                                                placeholder="e.g. Client called sales team on 13 Sep"
                                                className={`${inputClasses} py-3 min-h-[90px] resize-none leading-relaxed`}
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>

                            </form>
                        </div>

                        {/* Sticky Footer */}
                        <div className="p-5 md:px-8 border-t border-border-subtle bg-white shrink-0 rounded-b-[24px]">
                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    disabled={isCreating}
                                    className="px-5 h-[44px] rounded-[12px] border border-border-subtle text-[13px] font-bold text-[#0B192C] bg-white hover:bg-bg-hover transition-colors flex items-center justify-center min-w-[100px]"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    form="direct-quotation-form"
                                    disabled={isCreating}
                                    className="px-6 h-[44px] rounded-[12px] border border-transparent text-[13px] font-bold text-white bg-brand-primary hover:bg-[#1D4ED8] transition-colors flex items-center justify-center space-x-2 min-w-[180px] shadow-sm hover:shadow"
                                >
                                    {isCreating ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> <span>Creating...</span></>
                                    ) : (
                                        <><Plus className="w-4 h-4" /> <span>Create & Open Builder</span></>
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
