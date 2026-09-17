import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPayments, cancelPayment, getPaymentReceiptPdf } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../services/api';
import { 
    CreditCard, 
    Search, 
    Filter, 
    Download, 
    XCircle, 
    Eye, 
    ChevronLeft, 
    ChevronRight, 
    Calendar, 
    CheckCircle, 
    AlertCircle, 
    X,
    Building2,
    FileText,
    ArrowUpRight
} from 'lucide-react';

export default function Payments() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters & Pagination
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [methodFilter, setMethodFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // Selected Payment Modal (View Detail)
    const [selectedPayment, setSelectedPayment] = useState(null);

    // Cancel Payment Modal
    const [cancellingPayment, setCancellingPayment] = useState(null);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelError, setCancelError] = useState(null);
    const [submittingCancel, setSubmittingCancel] = useState(false);

    const fetchPaymentsList = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getPayments({
                search: search.trim() || undefined,
                status: statusFilter || undefined,
                paymentMethod: methodFilter || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                page,
                size: 10
            });

            if (data.content) {
                setPayments(data.content);
                setTotalPages(data.totalPages || 0);
                setTotalElements(data.totalElements || 0);
            } else {
                setPayments(Array.isArray(data) ? data : []);
                setTotalPages(1);
                setTotalElements(Array.isArray(data) ? data.length : 0);
            }
        } catch (err) {
            console.error('Failed to fetch payments', err);
            setError(err.message || 'Failed to load payments ledger');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPaymentsList();
    }, [page, statusFilter, methodFilter, startDate, endDate]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(0);
        fetchPaymentsList();
    };

    const handleClearFilters = () => {
        setSearch('');
        setStatusFilter('');
        setMethodFilter('');
        setStartDate('');
        setEndDate('');
        setPage(0);
    };

    const handleDownloadReceipt = (paymentId, paymentNumber) => {
        const token = localStorage.getItem('adminToken');
        fetch(`${API_BASE_URL}/payments/${paymentId}/pdf`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(res => {
            if (!res.ok) throw new Error('Failed to generate Receipt PDF');
            return res.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `RECEIPT_${paymentNumber || paymentId}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        })
        .catch(err => {
            console.error(err);
            alert('Could not download Payment Receipt PDF');
        });
    };

    const handleOpenCancelModal = (payment) => {
        setCancellingPayment(payment);
        setCancelReason('');
        setCancelError(null);
    };

    const handleCancelSubmit = async (e) => {
        e.preventDefault();
        if (!cancelReason.trim()) {
            setCancelError('Cancellation reason is required.');
            return;
        }
        try {
            setSubmittingCancel(true);
            setCancelError(null);
            await cancelPayment(cancellingPayment.id, { reason: cancelReason.trim() });
            setCancellingPayment(null);
            if (selectedPayment && selectedPayment.id === cancellingPayment.id) {
                setSelectedPayment(null);
            }
            await fetchPaymentsList();
        } catch (err) {
            console.error('Failed to cancel payment', err);
            setCancelError(err.message || 'Failed to cancel payment');
        } finally {
            setSubmittingCancel(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6 pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2.5">
                        <CreditCard className="w-7 h-7 text-brand-primary" /> Payment Ledger
                    </h1>
                    <p className="text-xs text-text-muted mt-1">
                        Track, inspect, and manage all recorded customer payment transactions and receipts.
                    </p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm space-y-4">
                <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by Payment #, Invoice #, Customer..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-bg-main border border-border-subtle rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand-primary"
                        />
                    </div>

                    {/* Method Filter */}
                    <select
                        value={methodFilter}
                        onChange={(e) => { setMethodFilter(e.target.value); setPage(0); }}
                        className="px-3 py-2 bg-bg-main border border-border-subtle rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand-primary"
                    >
                        <option value="">All Payment Methods</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="UPI">UPI</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="CASH">Cash</option>
                        <option value="CARD">Card</option>
                        <option value="OTHER">Other</option>
                    </select>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                        className="px-3 py-2 bg-bg-main border border-border-subtle rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand-primary"
                    >
                        <option value="">All Statuses</option>
                        <option value="RECORDED">RECORDED</option>
                        <option value="CANCELLED">CANCELLED</option>
                    </select>

                    {/* Date Range */}
                    <div className="flex items-center gap-1.5 bg-bg-main border border-border-subtle rounded-xl px-3 py-1.5">
                        <Calendar className="w-3.5 h-3.5 text-text-muted" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
                            className="bg-transparent text-xs text-text-primary focus:outline-none"
                            placeholder="From"
                        />
                        <span className="text-text-muted text-xs">to</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
                            className="bg-transparent text-xs text-text-primary focus:outline-none"
                            placeholder="To"
                        />
                    </div>

                    <button
                        type="submit"
                        className="px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-semibold hover:bg-brand-secondary transition-colors"
                    >
                        Search
                    </button>

                    {(search || statusFilter || methodFilter || startDate || endDate) && (
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className="px-3 py-2 text-xs text-text-muted hover:text-text-primary underline font-medium"
                        >
                            Reset
                        </button>
                    )}
                </form>
            </div>

            {/* Table */}
            <div className="bg-bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-12 text-center text-xs text-text-muted">Loading payments ledger...</div>
                ) : error ? (
                    <div className="p-8 text-center text-xs text-red-500">{error}</div>
                ) : payments.length === 0 ? (
                    <div className="p-12 text-center text-xs text-text-muted">No payment records found matching criteria.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-border-subtle text-text-muted bg-bg-main/50 uppercase tracking-wider font-semibold">
                                    <th className="p-4">Payment #</th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Invoice #</th>
                                    <th className="p-4">Customer</th>
                                    <th className="p-4">Method</th>
                                    <th className="p-4">Ref / Cheque</th>
                                    <th className="p-4 text-right">Amount</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-subtle">
                                {payments.map((p) => (
                                    <tr key={p.id} className="hover:bg-bg-main/40 transition-colors">
                                        <td className="p-4 font-bold text-text-primary">
                                            <button 
                                                onClick={() => setSelectedPayment(p)}
                                                className="hover:underline text-brand-primary text-left"
                                            >
                                                {p.paymentNumber}
                                            </button>
                                        </td>
                                        <td className="p-4 text-text-muted">
                                            {new Date(p.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="p-4 font-medium">
                                            <button 
                                                onClick={() => navigate(`/invoices/${p.invoiceId}`)}
                                                className="text-text-primary hover:text-brand-primary font-medium flex items-center gap-1 group"
                                            >
                                                <span>{p.invoiceNumber}</span>
                                                <ArrowUpRight className="w-3 h-3 text-text-muted group-hover:text-brand-primary" />
                                            </button>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-semibold text-text-primary">{p.customerName}</div>
                                            {p.companyName && <div className="text-[11px] text-text-muted">{p.companyName}</div>}
                                        </td>
                                        <td className="p-4 font-medium text-text-primary">
                                            <span className="px-2.5 py-1 bg-bg-main border border-border-subtle rounded-lg font-medium">
                                                {p.paymentMethod}
                                            </span>
                                        </td>
                                        <td className="p-4 text-text-muted">
                                            {p.transactionReference && <div>Ref: {p.transactionReference}</div>}
                                            {p.chequeNumber && <div>Chq: {p.chequeNumber}</div>}
                                            {p.bankName && <div className="text-[11px] text-text-muted">{p.bankName}</div>}
                                            {!p.transactionReference && !p.chequeNumber && '-'}
                                        </td>
                                        <td className="p-4 text-right font-bold text-text-primary">
                                            Rs. {Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-4">
                                            {p.status === 'RECORDED' ? (
                                                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 font-semibold rounded-full text-[11px]">
                                                    RECORDED
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 bg-red-500/10 text-red-500 font-semibold rounded-full text-[11px]" title={`Reason: ${p.cancellationReason || 'N/A'}`}>
                                                    CANCELLED
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => setSelectedPayment(p)}
                                                    className="p-1.5 hover:bg-bg-main text-text-muted hover:text-text-primary rounded-lg transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDownloadReceipt(p.id, p.paymentNumber)}
                                                    className="p-1.5 hover:bg-bg-main text-text-muted hover:text-text-primary rounded-lg transition-colors"
                                                    title="Download Receipt PDF"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                {p.status === 'RECORDED' && (
                                                    <button 
                                                        onClick={() => handleOpenCancelModal(p)}
                                                        className="px-2.5 py-1 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-[11px] font-semibold transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Footer */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle bg-bg-card">
                        <div className="text-xs text-text-muted">
                            Showing page <span className="font-semibold text-text-primary">{page + 1}</span> of <span className="font-semibold text-text-primary">{totalPages}</span> ({totalElements} total entries)
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                disabled={page === 0}
                                onClick={() => setPage(page - 1)}
                                className="p-2 border border-border-subtle rounded-lg text-text-muted hover:text-text-primary disabled:opacity-40 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                disabled={page >= totalPages - 1}
                                onClick={() => setPage(page + 1)}
                                className="p-2 border border-border-subtle rounded-lg text-text-muted hover:text-text-primary disabled:opacity-40 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* View Payment Details Modal */}
            {selectedPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-bg-card border border-border-subtle rounded-2xl w-full max-w-lg flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-brand-primary" /> {selectedPayment.paymentNumber}
                                </h2>
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold mt-1 ${
                                    selectedPayment.status === 'RECORDED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                                }`}>
                                    {selectedPayment.status}
                                </span>
                            </div>
                            <button 
                                onClick={() => setSelectedPayment(null)}
                                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-main transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-4 p-4 bg-bg-main rounded-xl border border-border-subtle">
                                <div>
                                    <span className="text-text-muted block">Payment Date</span>
                                    <span className="font-bold text-text-primary text-sm mt-0.5 block">
                                        {new Date(selectedPayment.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-text-muted block">Amount Received</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5 block">
                                        Rs. {Number(selectedPayment.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <div className="flex justify-between border-b border-border-subtle pb-2">
                                    <span className="text-text-muted">Associated Tax Invoice</span>
                                    <button 
                                        onClick={() => { setSelectedPayment(null); navigate(`/invoices/${selectedPayment.invoiceId}`); }}
                                        className="font-bold text-brand-primary hover:underline"
                                    >
                                        {selectedPayment.invoiceNumber}
                                    </button>
                                </div>
                                <div className="flex justify-between border-b border-border-subtle pb-2">
                                    <span className="text-text-muted">Customer Name</span>
                                    <span className="font-semibold text-text-primary">{selectedPayment.customerName}</span>
                                </div>
                                {selectedPayment.companyName && (
                                    <div className="flex justify-between border-b border-border-subtle pb-2">
                                        <span className="text-text-muted">Company</span>
                                        <span className="font-medium text-text-primary">{selectedPayment.companyName}</span>
                                    </div>
                                )}
                                <div className="flex justify-between border-b border-border-subtle pb-2">
                                    <span className="text-text-muted">Payment Method</span>
                                    <span className="font-semibold text-text-primary">{selectedPayment.paymentMethod}</span>
                                </div>
                                {selectedPayment.transactionReference && (
                                    <div className="flex justify-between border-b border-border-subtle pb-2">
                                        <span className="text-text-muted">Transaction Ref / UTR</span>
                                        <span className="font-mono text-text-primary">{selectedPayment.transactionReference}</span>
                                    </div>
                                )}
                                {selectedPayment.chequeNumber && (
                                    <div className="flex justify-between border-b border-border-subtle pb-2">
                                        <span className="text-text-muted">Cheque Number</span>
                                        <span className="font-mono text-text-primary">{selectedPayment.chequeNumber}</span>
                                    </div>
                                )}
                                {selectedPayment.bankName && (
                                    <div className="flex justify-between border-b border-border-subtle pb-2">
                                        <span className="text-text-muted">Bank Name</span>
                                        <span className="font-medium text-text-primary">{selectedPayment.bankName}</span>
                                    </div>
                                )}
                                <div className="flex justify-between border-b border-border-subtle pb-2">
                                    <span className="text-text-muted">Recorded By</span>
                                    <span className="font-medium text-text-primary">{selectedPayment.recordedByFullName || 'Admin'}</span>
                                </div>
                                {selectedPayment.notes && (
                                    <div className="pt-2">
                                        <span className="text-text-muted block mb-1">Internal Notes:</span>
                                        <p className="p-3 bg-bg-main border border-border-subtle rounded-xl text-text-primary font-mono text-[11px] whitespace-pre-wrap">
                                            {selectedPayment.notes}
                                        </p>
                                    </div>
                                )}
                                {selectedPayment.status === 'CANCELLED' && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-1">
                                        <div className="font-bold text-red-500">Cancelled Record</div>
                                        <div className="text-text-muted">Reason: {selectedPayment.cancellationReason}</div>
                                        <div className="text-[10px] text-text-muted">Cancelled at: {new Date(selectedPayment.cancelledAt).toLocaleString()}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle bg-bg-card shrink-0">
                            {selectedPayment.status === 'RECORDED' ? (
                                <button
                                    onClick={() => handleOpenCancelModal(selectedPayment)}
                                    className="px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-xs font-semibold transition-colors"
                                >
                                    Cancel Payment
                                </button>
                            ) : <div />}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleDownloadReceipt(selectedPayment.id, selectedPayment.paymentNumber)}
                                    className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                                >
                                    <Download className="w-3.5 h-3.5" /> PDF Receipt
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Payment Modal */}
            {cancellingPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-bg-card border border-border-subtle rounded-2xl w-full max-w-md flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle shrink-0">
                            <h2 className="text-base font-bold text-red-500 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5" /> Cancel Payment {cancellingPayment.paymentNumber}
                            </h2>
                            <button 
                                onClick={() => setCancellingPayment(null)}
                                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-main transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCancelSubmit} className="p-6 space-y-4">
                            {cancelError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 font-medium">
                                    {cancelError}
                                </div>
                            )}

                            <p className="text-xs text-text-muted leading-relaxed">
                                Please provide a non-empty cancellation reason. The associated Tax Invoice amount paid and balance due will be automatically updated.
                            </p>

                            <div>
                                <label className="block text-xs font-semibold text-text-muted mb-1">Cancellation Reason *</label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="Enter non-empty reason for cancellation..."
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    className="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-red-500 resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setCancellingPayment(null)}
                                    className="px-4 py-2 border border-border-subtle text-text-muted hover:text-text-primary rounded-lg text-sm font-medium transition-colors"
                                >
                                    Close
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingCancel}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                    {submittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
