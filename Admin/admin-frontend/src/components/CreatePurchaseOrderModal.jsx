import React, { useState } from 'react';
import { XCircle, ShoppingCart } from 'lucide-react';
import { createPurchaseOrder } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/formatters';

export default function CreatePurchaseOrderModal({ isOpen, onClose, quotation, onSuccess }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        clientPoNumber: '',
        poDate: new Date().toISOString().split('T')[0],
        poValue: quotation?.grandTotal || '',
        receivedVia: 'EMAIL',
        remarks: ''
    });

    if (!isOpen || !quotation) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const payload = {
                quotationId: quotation.id,
                clientPoNumber: formData.clientPoNumber,
                poDate: formData.poDate,
                poValue: Number(formData.poValue),
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
            <div className="bg-bg-card border border-border-subtle rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
                        <div className="text-xs text-text-muted">Value: {formatCurrency(quotation.grandTotal, quotation.currency)}</div>
                    </div>

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
                            <label className="block text-sm font-medium text-text-primary mb-1">PO Value ({quotation.currency === 'USD' ? '$' : '₹'}) *</label>
                            <input
                                type="number"
                                name="poValue"
                                required
                                step="0.01"
                                min="0"
                                value={formData.poValue}
                                onChange={handleChange}
                                className="w-full bg-bg-main border border-border-subtle rounded-lg px-4 py-2 text-sm text-text-primary focus:border-brand-primary"
                            />
                            {Number(formData.poValue) !== Number(quotation.grandTotal) && formData.poValue !== '' && (
                                <div className="text-xs text-red-500 mt-1 font-medium">Value differs from quotation</div>
                            )}
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
                            <label className="block text-sm font-medium text-text-primary mb-1">Remarks</label>
                            <textarea
                                name="remarks"
                                value={formData.remarks}
                                onChange={handleChange}
                                rows="3"
                                className="w-full bg-bg-main border border-border-subtle rounded-lg px-4 py-2 text-sm text-text-primary focus:border-brand-primary"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-primary btn-md"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !formData.poDate || !formData.poValue}
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
