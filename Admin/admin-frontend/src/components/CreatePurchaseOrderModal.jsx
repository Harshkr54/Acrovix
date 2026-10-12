import React, { useState, useEffect } from 'react';
import { XCircle, ShoppingCart, Lock, AlertCircle } from 'lucide-react';
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
        remarks: ''
    });

    useEffect(() => {
        if (isOpen && quotation) {
            setFormData({
                clientPoNumber: '',
                poDate: new Date().toISOString().split('T')[0],
                poValue: quotation.grandTotal !== undefined && quotation.grandTotal !== null ? quotation.grandTotal : '',
                receivedVia: 'EMAIL',
                remarks: ''
            });
        }
    }, [isOpen, quotation]);

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
                remarks: formData.remarks
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-primary/20 backdrop-blur-sm">
            <div className="bg-bg-card border border-border-subtle rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-modal-entrance">
                <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-bg-main/50">
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-brand-primary" />
                        <h2 className="text-lg font-bold text-text-primary">Convert to Purchase Order</h2>
                    </div>
                    <button onClick={onClose} className="btn btn-primary btn-md">
                        <XCircle className="w-5 h-5" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="mb-6 bg-brand-primary/5 border border-brand-primary/20 rounded-lg p-4">
                        <div className="text-sm text-brand-primary font-semibold mb-1">Source Quotation</div>
                        <div className="text-sm font-medium text-text-primary">{quotation.quotationNumber} - {quotation.clientName}</div>
                        <div className="text-xs text-text-muted mt-0.5">
                            Quotation Value: <span className="font-semibold text-text-primary">{formattedExactTotal}</span>
                        </div>
                    </div>

                    {!hasValidGrandTotal && (
                        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-600 text-xs flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <div>
                                <div className="font-semibold">Invalid Quotation Total</div>
                                <div>This quotation does not have a valid grand total ({quotation.grandTotal ?? 'missing'}). A Purchase Order cannot be created until the quotation has a valid total amount.</div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-text-primary mb-1">Client PO Number</label>
                            <input
                                type="text"
                                name="clientPoNumber"
                                value={formData.clientPoNumber}
                                onChange={handleChange}
                                placeholder="e.g. PO-2023-001"
                                className="w-full bg-bg-main border border-border-subtle rounded-lg px-4 py-2 text-sm text-text-primary focus:border-brand-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1">PO Date *</label>
                            <input
                                type="date"
                                name="poDate"
                                required
                                value={formData.poDate}
                                onChange={handleChange}
                                className="w-full bg-bg-main border border-border-subtle rounded-lg px-4 py-2 text-sm text-text-primary focus:border-brand-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1">
                                PO Value ({currencyCode}) *
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="poValue"
                                    readOnly
                                    required
                                    value={formattedExactTotal}
                                    className="w-full bg-bg-card border border-border-subtle rounded-lg px-4 py-2 text-sm font-semibold text-text-primary cursor-not-allowed select-all outline-none"
                                    title="PO Value is automatically populated and derived from the source quotation grand total"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted flex items-center gap-1 pointer-events-none">
                                    <Lock className="w-3.5 h-3.5 text-text-muted" />
                                    <span className="font-normal text-[11px]">Derived</span>
                                </div>
                            </div>
                            <div className="text-[11px] text-text-muted mt-1">
                                Matches quotation total ({formattedExactTotal}).
                            </div>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-text-primary mb-1">Received Via</label>
                            <select
                                name="receivedVia"
                                value={formData.receivedVia}
                                onChange={handleChange}
                                className="w-full bg-bg-main border border-border-subtle rounded-lg px-4 py-2 text-sm text-text-primary focus:border-brand-primary"
                            >
                                <option value="EMAIL">Email</option>
                                <option value="PORTAL">Portal</option>
                                <option value="PHYSICAL_COPY">Physical Copy</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium text-text-primary">
                                    Remarks / Additional Notes
                                </label>
                                <span className="text-[11px] text-text-muted">
                                    {(formData.remarks || '').length} / 2000
                                </span>
                            </div>
                            <textarea
                                name="remarks"
                                value={formData.remarks}
                                onChange={handleChange}
                                maxLength={2000}
                                rows="3"
                                placeholder="Add delivery instructions, special requirements, or other notes..."
                                className="w-full bg-bg-main border border-border-subtle rounded-lg px-4 py-2 text-sm text-text-primary focus:border-brand-primary placeholder:text-text-muted/60"
                            />
                            <p className="text-[11px] text-text-muted mt-1">
                                Optional instructions rendered in a dedicated Remarks panel on the PO PDF, kept separate from Terms & Conditions.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary btn-md"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !formData.poDate || !hasValidGrandTotal}
                            className="btn btn-primary btn-md"
                        >
                            {loading ? 'Creating...' : 'Create Purchase Order'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
