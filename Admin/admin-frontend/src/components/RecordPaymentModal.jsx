import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, AlertCircle, CheckCircle, DollarSign, CreditCard } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { recordPayment } from '../services/api';

export default function RecordPaymentModal({
    isOpen,
    onClose,
    invoice,
    onSuccess,
    showToast
}) {
    const balanceDue = invoice?.balanceDue !== undefined && invoice?.balanceDue !== null 
        ? invoice.balanceDue 
        : (invoice?.grandTotal || 0);

    const [form, setForm] = useState({
        paymentDate: new Date().toISOString().split('T')[0],
        amount: balanceDue > 0 ? String(balanceDue) : '',
        paymentMethod: 'BANK_TRANSFER',
        transactionReference: '',
        chequeNumber: '',
        bankName: '',
        notes: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && invoice) {
            const bal = invoice.balanceDue !== undefined && invoice.balanceDue !== null ? invoice.balanceDue : invoice.grandTotal;
            setForm({
                paymentDate: new Date().toISOString().split('T')[0],
                amount: bal > 0 ? String(bal) : '',
                paymentMethod: 'BANK_TRANSFER',
                transactionReference: '',
                chequeNumber: '',
                bankName: '',
                notes: ''
            });
            setError(null);
        }
    }, [isOpen, invoice]);

    // Prevent body scrolling behind open modal
    useEffect(() => {
        if (!isOpen) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prevOverflow;
        };
    }, [isOpen]);

    if (!isOpen || !invoice) return null;

    const currencySymbol = invoice?.currency === 'USD' ? '$' : invoice?.currency === 'EUR' ? '€' : invoice?.currency === 'GBP' ? '£' : '₹';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        const enteredAmount = parseFloat(form.amount);
        if (isNaN(enteredAmount) || enteredAmount <= 0) {
            setError('Please enter a valid payment amount greater than zero.');
            return;
        }

        if (enteredAmount > (balanceDue + 0.001)) {
            setError(`Payment amount cannot exceed the remaining balance due (${formatCurrency(balanceDue, invoice.currency)}).`);
            return;
        }

        try {
            setLoading(true);
            const payload = {
                invoiceId: invoice.id,
                paymentDate: form.paymentDate,
                amount: enteredAmount,
                paymentMethod: form.paymentMethod,
                transactionReference: form.transactionReference.trim() || null,
                chequeNumber: form.chequeNumber.trim() || null,
                bankName: form.bankName.trim() || null,
                notes: form.notes.trim() || null
            };

            await recordPayment(payload);
            if (showToast) {
                showToast('success', `Payment of ${formatCurrency(enteredAmount, invoice.currency)} recorded successfully.`);
            }
            if (onSuccess) {
                await onSuccess();
            }
            onClose();
        } catch (err) {
            console.error('Failed to record payment', err);
            setError(err.message || 'Failed to record payment. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
            onClick={onClose}
        >
            <div 
                className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col my-auto"
                onClick={(e) => e.stopPropagation()}
            >
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <Plus className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Invoice Payment</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Reconcile transaction against {invoice.invoiceNumber}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(85vh-130px)]">
                    
                    {error && (
                        <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Financial Snapshot */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-2 text-center">
                        <div>
                            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Grand Total</div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 font-mono">
                                {formatCurrency(invoice.grandTotal || 0, invoice.currency, 2)}
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Already Paid</div>
                            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                                {formatCurrency(invoice.amountPaid || 0, invoice.currency, 2)}
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Balance Due</div>
                            <div className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5 font-mono">
                                {formatCurrency(balanceDue, invoice.currency, 2)}
                            </div>
                        </div>
                    </div>

                    {/* Date & Amount */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                Payment Date *
                            </label>
                            <input
                                type="date"
                                required
                                value={form.paymentDate}
                                onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                Amount ({currencySymbol}) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={balanceDue > 0 ? balanceDue : undefined}
                                required
                                value={form.amount}
                                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            Payment Method *
                        </label>
                        <select
                            value={form.paymentMethod}
                            onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS / IMPS)</option>
                            <option value="UPI">UPI (Google Pay, PhonePe, Paytm, etc.)</option>
                            <option value="CHEQUE">Cheque / Demand Draft</option>
                            <option value="CASH">Cash</option>
                            <option value="CARD">Credit / Debit Card</option>
                            <option value="OTHER">Other / Offset</option>
                        </select>
                    </div>

                    {/* Method-specific conditional inputs */}
                    {form.paymentMethod === 'CHEQUE' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                    Cheque / DD Number *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={form.chequeNumber}
                                    onChange={(e) => setForm({ ...form, chequeNumber: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. 000452"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                    Drawee Bank Name
                                </label>
                                <input
                                    type="text"
                                    value={form.bankName}
                                    onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. HDFC Bank"
                                />
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                {form.paymentMethod === 'UPI' ? 'UPI Transaction ID / UTR' : 'Bank UTR / Transaction Reference'}
                            </label>
                            <input
                                type="text"
                                value={form.transactionReference}
                                onChange={(e) => setForm({ ...form, transactionReference: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={form.paymentMethod === 'UPI' ? 'e.g. 329482938472' : 'e.g. CMS982348274 or NEFT-0012'}
                            />
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            Internal Remarks / Notes
                        </label>
                        <textarea
                            rows="2"
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Optional reconciliation notes, payer name, or remarks..."
                        ></textarea>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                            {loading ? (
                                <>
                                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    <span>Recording...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span>Record Payment</span>
                                </>
                            )}
                        </button>
                    </div>

                </form>

            </div>
        </div>,
        document.body
    );
}
