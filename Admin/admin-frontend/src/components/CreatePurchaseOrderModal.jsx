import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ShoppingCart, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { createPurchaseOrder } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/formatters';

export default function CreatePurchaseOrderModal({ isOpen, onClose, quotation, onSuccess }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        clientPoNumber: '',
        poDate: new Date().toISOString().split('T')[0],
        poValue: '',
        receivedVia: 'EMAIL',
        remarks: '',
        deliveryDestinationType: 'COMPANY_OFFICE',
        deliveryAddress: '',
        deliveryContactName: '',
        deliveryContactPhone: ''
    });

    useEffect(() => {
        if (isOpen && quotation) {
            setFormData({
                clientPoNumber: '',
                poDate: new Date().toISOString().split('T')[0],
                poValue: quotation.grandTotal !== undefined && quotation.grandTotal !== null ? quotation.grandTotal : '',
                receivedVia: 'EMAIL',
                remarks: '',
                deliveryDestinationType: 'COMPANY_OFFICE',
                deliveryAddress: '',
                deliveryContactName: '',
                deliveryContactPhone: ''
            });
        }
    }, [isOpen, quotation]);

    // Prevent background page / body from scrolling while modal is open
    useEffect(() => {
        if (!isOpen || !quotation) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen, quotation]);

    // Keyboard support: Escape closes modal unless currently submitting
    useEffect(() => {
        if (!isOpen || !quotation) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !loading) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, quotation, onClose, loading]);

    if (!isOpen || !quotation) return null;

    const grandTotalNum = Number(quotation.grandTotal);
    const hasValidGrandTotal = quotation.grandTotal !== null && 
        quotation.grandTotal !== undefined && 
        !isNaN(grandTotalNum) && 
        grandTotalNum > 0;

    const currencyCode = quotation.currency || 'INR';
    const formattedExactTotal = hasValidGrandTotal 
        ? formatCurrency(grandTotalNum, currencyCode, 2) 
        : 'N/A';

    const handleDestinationTypeChange = (newType) => {
        if (newType === 'CUSTOMER_SITE') {
            const custShippingAddr = quotation.customer?.shippingAddress || quotation.shippingAddress || '';
            const custContact = quotation.clientName || quotation.customer?.name || '';
            const custPhone = quotation.clientPhone || quotation.customer?.phone || '';
            setFormData(prev => ({
                ...prev,
                deliveryDestinationType: newType,
                deliveryAddress: custShippingAddr,
                deliveryContactName: custContact,
                deliveryContactPhone: custPhone
            }));
        } else if (newType === 'COMPANY_OFFICE') {
            setFormData(prev => ({
                ...prev,
                deliveryDestinationType: newType,
                deliveryAddress: '',
                deliveryContactName: 'ACROVIX Operations',
                deliveryContactPhone: ''
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                deliveryDestinationType: newType,
                deliveryAddress: '',
                deliveryContactName: '',
                deliveryContactPhone: ''
            }));
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!hasValidGrandTotal) {
            alert('Cannot convert to Purchase Order: Source quotation does not have a valid grand total.');
            return;
        }
        try {
            setLoading(true);
            const payload = {
                quotationId: quotation.id,
                clientPoNumber: formData.clientPoNumber,
                poDate: formData.poDate,
                poValue: grandTotalNum,
                receivedVia: formData.receivedVia,
                remarks: formData.remarks,
                deliveryDestinationType: formData.deliveryDestinationType,
                deliveryAddress: formData.deliveryAddress,
                deliveryContactName: formData.deliveryContactName,
                deliveryContactPhone: formData.deliveryContactPhone
            };
            const result = await createPurchaseOrder(payload);
            onClose();
            if (onSuccess) onSuccess();
            navigate(`/purchase-orders/${result.id}`);
        } catch (error) {
            console.error('Failed to create PO', error);
            alert(error.message || 'Failed to create Purchase Order');
        } finally {
            setLoading(false);
        }
    };

    const modalElement = (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/65 backdrop-blur-xs animate-fade-in"
            role="presentation"
        >
            <div 
                className="acx-card p-0 border border-border-subtle rounded-2xl shadow-2xl w-full max-w-[560px] max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-3rem)] flex flex-col overflow-hidden animate-modal-entrance bg-bg-card my-auto"
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-po-modal-title"
            >
                {/* Header (non-scrolling) */}
                <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between bg-bg-surface/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
                            <ShoppingCart className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 id="create-po-modal-title" className="text-base font-bold text-text-primary tracking-tight">Convert to Purchase Order</h2>
                            <p className="text-xs text-text-muted mt-0.5">Generate purchase order from accepted quotation</p>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={onClose} 
                        disabled={loading}
                        aria-label="Close dialog"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-hover active:bg-bg-muted transition-colors border border-transparent hover:border-border-subtle cursor-pointer disabled:cursor-not-allowed"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                
                {/* Form wrapping vertically scrollable body and fixed footer */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                    {/* Vertically scrollable form content */}
                    <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain flex-1 min-h-0 space-y-5">
                        {/* Source Quotation Banner */}
                        <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-800/40 flex items-start justify-between gap-3">
                            <div>
                                <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded mb-1">
                                    Source Quotation
                                </span>
                                <div className="text-[13px] font-bold text-text-primary mt-0.5 font-mono">
                                    {quotation.quotationNumber}
                                </div>
                                <div className="text-xs text-text-secondary mt-0.5">
                                    {quotation.clientName} {quotation.clientCompany ? `(${quotation.clientCompany})` : ''}
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold block">Quotation Value</span>
                                <span className="text-sm font-bold text-blue-700 dark:text-blue-400 font-mono">
                                    {formattedExactTotal}
                                </span>
                            </div>
                        </div>

                        {!hasValidGrandTotal && (
                            <div className="bg-brand-danger/10 border border-brand-danger/30 rounded-xl p-3.5 text-brand-danger text-xs flex items-start gap-2.5">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-bold">Invalid Quotation Total</div>
                                    <div className="mt-0.5">This quotation does not have a valid grand total ({quotation.grandTotal ?? 'missing'}). A Purchase Order cannot be created until the quotation has a valid total amount.</div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label className="block text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5">
                                    Client PO Number
                                </label>
                                <input
                                    type="text"
                                    name="clientPoNumber"
                                    value={formData.clientPoNumber}
                                    onChange={handleChange}
                                    placeholder="e.g. PO-2026-001"
                                    className="w-full h-10 bg-bg-main border border-border-subtle focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 rounded-xl px-3 text-[13px] font-medium text-text-primary outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5">
                                    PO Date <span className="text-brand-danger">*</span>
                                </label>
                                <input
                                    type="date"
                                    name="poDate"
                                    required
                                    value={formData.poDate}
                                    onChange={handleChange}
                                    className="w-full h-10 bg-bg-main border border-border-subtle focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 rounded-xl px-3 text-[13px] font-medium text-text-primary outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5">
                                    PO Value ({currencyCode}) <span className="text-brand-danger">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="poValue"
                                        readOnly
                                        required
                                        value={formattedExactTotal}
                                        className="w-full h-10 bg-bg-surface/80 border border-border-subtle rounded-xl px-3 pr-20 text-[13px] font-bold text-text-primary cursor-not-allowed select-all outline-none"
                                        title="PO Value is automatically populated and derived from the source quotation grand total"
                                    />
                                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted flex items-center gap-1 bg-bg-card px-1.5 py-0.5 rounded border border-border-subtle/80 pointer-events-none">
                                        <Lock className="w-3 h-3 text-text-muted" />
                                        <span className="font-semibold text-[10px]">Derived</span>
                                    </div>
                                </div>
                                <div className="text-[11px] text-text-muted mt-1 truncate">
                                    Matches quotation total ({formattedExactTotal}).
                                </div>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5">
                                    Received Via
                                </label>
                                <select
                                    name="receivedVia"
                                    value={formData.receivedVia}
                                    onChange={handleChange}
                                    className="w-full h-10 bg-bg-main border border-border-subtle focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 rounded-xl px-3 text-[13px] font-medium text-text-primary outline-none transition-colors cursor-pointer"
                                >
                                    <option value="EMAIL">Email</option>
                                    <option value="PORTAL">Portal</option>
                                    <option value="PHYSICAL_COPY">Physical Copy</option>
                                    <option value="OTHER">Other / Manual</option>
                                </select>
                            </div>

                            {/* Delivery Destination */}
                            <div className="sm:col-span-2 p-3.5 rounded-xl border border-border-subtle bg-bg-surface/40 space-y-3">
                                <div>
                                    <label className="block text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1">
                                        Ship To / Delivery Destination <span className="text-brand-danger">*</span>
                                    </label>
                                    <p className="text-[11px] text-text-muted mb-2">
                                        Specify the genuine delivery destination for this Purchase Order.
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleDestinationTypeChange('COMPANY_OFFICE')}
                                            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                                                formData.deliveryDestinationType === 'COMPANY_OFFICE'
                                                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary font-bold'
                                                    : 'border-border-subtle hover:bg-bg-hover text-text-secondary font-medium'
                                            }`}
                                        >
                                            <div className="text-xs">ACROVIX Office</div>
                                            <div className="text-[10px] text-text-muted mt-0.5 font-normal">Primary office address</div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDestinationTypeChange('CUSTOMER_SITE')}
                                            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                                                formData.deliveryDestinationType === 'CUSTOMER_SITE'
                                                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary font-bold'
                                                    : 'border-border-subtle hover:bg-bg-hover text-text-secondary font-medium'
                                            }`}
                                        >
                                            <div className="text-xs">Client Project Site</div>
                                            <div className="text-[10px] text-text-muted mt-0.5 font-normal">Drop-ship to client</div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDestinationTypeChange('CUSTOM')}
                                            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                                                formData.deliveryDestinationType === 'CUSTOM'
                                                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary font-bold'
                                                    : 'border-border-subtle hover:bg-bg-hover text-text-secondary font-medium'
                                            }`}
                                        >
                                            <div className="text-xs">Custom Address</div>
                                            <div className="text-[10px] text-text-muted mt-0.5 font-normal">Explicit location</div>
                                        </button>
                                    </div>
                                </div>

                                {formData.deliveryDestinationType !== 'COMPANY_OFFICE' && (
                                    <div className="space-y-3 pt-2 border-t border-border-subtle/50 animate-fade-in">
                                        <div>
                                            <label className="block text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1">
                                                Delivery Address <span className="text-brand-danger">*</span>
                                            </label>
                                            <textarea
                                                name="deliveryAddress"
                                                rows={2}
                                                required={formData.deliveryDestinationType !== 'COMPANY_OFFICE'}
                                                value={formData.deliveryAddress}
                                                onChange={handleChange}
                                                placeholder="Enter full physical delivery address including city, state, pin..."
                                                className="w-full bg-bg-main border border-border-subtle focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 rounded-xl p-2.5 text-[12px] font-medium text-text-primary outline-none resize-none"
                                            />
                                            {formData.deliveryDestinationType === 'CUSTOMER_SITE' && (quotation.customer?.billingAddress || quotation.billingAddress) && !formData.deliveryAddress && (
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({
                                                        ...prev,
                                                        deliveryAddress: quotation.customer?.billingAddress || quotation.billingAddress || ''
                                                    }))}
                                                    className="text-[11px] text-brand-primary hover:underline font-medium mt-1 inline-block"
                                                >
                                                    + Use customer's registered billing address as delivery destination
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1">
                                                    Receiving Contact Person
                                                </label>
                                                <input
                                                    type="text"
                                                    name="deliveryContactName"
                                                    value={formData.deliveryContactName}
                                                    onChange={handleChange}
                                                    placeholder="e.g. John Doe / Site Manager"
                                                    className="w-full h-9 bg-bg-main border border-border-subtle focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 rounded-xl px-3 text-[12px] font-medium text-text-primary outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1">
                                                    Receiving Contact Phone
                                                </label>
                                                <input
                                                    type="text"
                                                    name="deliveryContactPhone"
                                                    value={formData.deliveryContactPhone}
                                                    onChange={handleChange}
                                                    placeholder="e.g. +91 9876543210"
                                                    className="w-full h-9 bg-bg-main border border-border-subtle focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 rounded-xl px-3 text-[12px] font-medium text-text-primary outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="sm:col-span-2">
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-[11px] text-text-muted uppercase tracking-wider font-semibold">
                                        Remarks / Additional Notes
                                    </label>
                                    <span className="text-[10px] text-text-muted font-medium">
                                        {(formData.remarks || '').length} / 2000
                                    </span>
                                </div>
                                <textarea
                                    name="remarks"
                                    value={formData.remarks}
                                    onChange={handleChange}
                                    maxLength={2000}
                                    rows={3}
                                    placeholder="Add delivery instructions, special requirements, or other notes..."
                                    className="w-full bg-bg-main border border-border-subtle focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 rounded-xl p-3 text-[13px] font-medium text-text-primary outline-none transition-colors resize-none placeholder:text-text-muted/60"
                                />
                                <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                                    Optional instructions rendered in a dedicated Remarks panel on the PO PDF, kept separate from Terms & Conditions.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer (non-scrolling, always visible at bottom) */}
                    <div className="p-3.5 sm:p-4 sm:px-6 border-t border-border-subtle/60 bg-bg-surface/30 flex items-center justify-end gap-2.5 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="btn btn-secondary btn-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !formData.poDate || !hasValidGrandTotal}
                            className="btn btn-primary btn-sm flex items-center"
                        >
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />}
                            Create Purchase Order
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    if (typeof document !== 'undefined' && document.body) {
        return createPortal(modalElement, document.body);
    }

    return modalElement;
}
