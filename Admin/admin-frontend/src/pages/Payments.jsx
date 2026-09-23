import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    getPayments, 
    cancelPayment, 
    getPaymentReceiptPdf, 
    getEligibleInvoicesForPayment, 
    recordPayment 
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE_URL } from '../services/api';
import { formatCurrency } from '../utils/formatters';
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
    ArrowUpRight,
    Plus,
    Check,
    Mail,
    Loader2
} from 'lucide-react';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';

export default function Payments() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();

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

    // Record Payment Modal state
    const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
    const [eligibleInvoices, setEligibleInvoices] = useState([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);
    const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    const [paymentForm, setPaymentForm] = useState({
        paymentDate: new Date().toISOString().split('T')[0],
        amount: '',
        paymentMethod: 'BANK_TRANSFER',
        transactionReference: '',
        chequeNumber: '',
        bankName: '',
        notes: ''
    });
    const [paymentError, setPaymentError] = useState(null);
    const [recordingPayment, setRecordingPayment] = useState(false);

    // Cancel Payment Modal state
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

    const fetchEligibleInvoices = async (query = '') => {
        try {
            setLoadingInvoices(true);
            const list = await getEligibleInvoicesForPayment(query);
            setEligibleInvoices(list || []);
        } catch (err) {
            console.error('Failed to fetch eligible invoices', err);
        } finally {
            setLoadingInvoices(false);
        }
    };

    const handleOpenRecordPaymentModal = async () => {
        setPaymentForm({
            paymentDate: new Date().toISOString().split('T')[0],
            amount: '',
            paymentMethod: 'BANK_TRANSFER',
            transactionReference: '',
            chequeNumber: '',
            bankName: '',
            notes: ''
        });
        setSelectedInvoice(null);
        setInvoiceSearchQuery('');
        setPaymentError(null);
        setIsRecordModalOpen(true);
        await fetchEligibleInvoices('');
    };

    const handleSelectInvoice = (inv) => {
        setSelectedInvoice(inv);
        setPaymentError(null);
        const bal = inv.balanceDue !== undefined && inv.balanceDue !== null ? inv.balanceDue : inv.grandTotal;
        setPaymentForm(prev => ({
            ...prev,
            amount: bal > 0 ? String(bal) : ''
        }));
    };

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

    const handleRecordPaymentSubmit = async (e) => {
        e.preventDefault();
        setPaymentError(null);

        if (!selectedInvoice) {
            setPaymentError('Please search and select an eligible Tax Invoice.');
            return;
        }

        const numAmount = parseFloat(paymentForm.amount);
        const currentBalance = selectedInvoice.balanceDue !== undefined && selectedInvoice.balanceDue !== null 
            ? Number(selectedInvoice.balanceDue) 
            : Number(selectedInvoice.grandTotal);

        if (isNaN(numAmount) || numAmount <= 0) {
            setPaymentError('Payment amount must be greater than zero.');
            return;
        }

        if (numAmount > currentBalance + 0.001) {
            setPaymentError(`Payment amount (${formatCurrency(numAmount, selectedInvoice?.currency)}) cannot exceed remaining balance (${formatCurrency(currentBalance, selectedInvoice?.currency)}).`);
            return;
        }

        try {
            setRecordingPayment(true);
            const result = await recordPayment({
                invoiceId: selectedInvoice.id,
                paymentDate: paymentForm.paymentDate,
                amount: numAmount,
                paymentMethod: paymentForm.paymentMethod,
                transactionReference: paymentForm.transactionReference.trim() || null,
                chequeNumber: paymentForm.chequeNumber.trim() || null,
                bankName: paymentForm.bankName.trim() || null,
                notes: paymentForm.notes.trim() || null
            });

            setIsRecordModalOpen(false);
            showToast({
                type: 'success',
                message: `Payment ${result.paymentNumber || 'record'} of ${formatCurrency(numAmount, selectedInvoice?.currency)} recorded successfully!`
            });
            await fetchPaymentsList();
        } catch (err) {
            console.error('Failed to record payment', err);
            setPaymentError(err.message || 'Failed to record payment');
        } finally {
            setRecordingPayment(false);
        }
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

    const [sendingReceiptId, setSendingReceiptId] = useState(null);

    const handleSendReceiptEmail = async (paymentId) => {
        try {
            setSendingReceiptId(paymentId);
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API_BASE_URL}/payments/${paymentId}/send-receipt-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to send payment receipt email');
            }
            alert(data.message || 'Payment receipt email sent successfully!');
        } catch (err) {
            console.error('Send Receipt Email Error:', err);
            alert(err.message || 'Failed to send payment receipt email');
        } finally {
            setSendingReceiptId(null);
        }
    };

    // Calculate dynamic UI previews for payment modal
    const currentInvoiceBalance = selectedInvoice ? Number(selectedInvoice.balanceDue || 0) : 0;
    const currentPaymentNumAmount = parseFloat(paymentForm.amount) || 0;
    const previewNewBalance = selectedInvoice ? Math.max(0, currentInvoiceBalance - currentPaymentNumAmount) : 0;
    const isOverpayment = selectedInvoice && currentPaymentNumAmount > currentInvoiceBalance + 0.001;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6 pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2.5">
                        <CreditCard className="w-7 h-7 text-brand-primary" /> Payment Ledger
                    </h1>
                    <p className="text-xs text-text-muted mt-1">
                        Track, inspect, and manually record customer payments for money received externally.
                    </p>
                </div>
                <button 
                    onClick={handleOpenRecordPaymentModal}
                    className="btn btn-primary btn-md self-start md:self-auto"
                >
                    <Plus className="w-4 h-4" /> Record Payment
                </button>
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
                        className="btn btn-secondary btn-sm"
                    >
                        Search
                    </button>

                    {(search || statusFilter || methodFilter || startDate || endDate) && (
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className="btn btn-ghost btn-sm"
                        >
                            Reset
                        </button>
                    )}
                </form>
            </div>

            {/* Table */}
            <div className="bg-bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-6">
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map(i => (
                                <Skeleton key={i} variant="table-row" className="h-16" />
                            ))}
                        </div>
                    </div>
                ) : error ? (
                    <div className="p-8 text-center text-xs text-red-500">{error}</div>
                ) : payments.length === 0 ? (
                    <EmptyState 
                        icon={CreditCard}
                        emptyMessage="No payment records found."
                        isFiltered={Boolean(search || statusFilter || methodFilter || startDate || endDate)}
                        actionLabel="Clear Filters"
                        onAction={handleClearFilters}
                    />
                ) : (
                    <div className="acx-table-container">
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
                                                className="font-bold text-text-primary hover:text-brand-primary transition-colors"
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
                                                className="inline-flex items-center gap-1 font-semibold text-text-primary hover:text-brand-primary transition-colors group"
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
                                            {formatCurrency(p.amount, p.currency, 2)}
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
                                                    className="btn btn-ghost btn-icon text-text-secondary"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDownloadReceipt(p.id, p.paymentNumber)}
                                                    className="btn btn-ghost btn-icon text-text-secondary"
                                                    title="Download Receipt PDF"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleSendReceiptEmail(p.id)}
                                                    disabled={sendingReceiptId === p.id}
                                                    className="btn btn-ghost btn-icon text-text-secondary"
                                                    title="Send Receipt Email"
                                                >
                                                    {sendingReceiptId === p.id ? (
                                                        <span className="animate-spin w-4 h-4 border-b-2 border-brand-primary rounded-full inline-block"></span>
                                                    ) : (
                                                        <Mail className="w-4 h-4 text-brand-primary" />
                                                    )}
                                                </button>
                                                {p.status === 'RECORDED' && (
                                                    <button 
                                                        onClick={() => handleOpenCancelModal(p)}
                                                        className="btn btn-danger btn-sm"
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
                                className="btn btn-secondary btn-icon"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                disabled={page >= totalPages - 1}
                                onClick={() => setPage(page + 1)}
                                className="btn btn-secondary btn-icon"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Record Payment Modal */}
            {isRecordModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-bg-card border border-border-subtle rounded-2xl w-full max-w-xl flex flex-col max-h-[92vh] overflow-hidden shadow-2xl animate-modal-entrance">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle shrink-0">
                            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-emerald-600" /> Record Manual Payment
                            </h2>
                            <button 
                                onClick={() => setIsRecordModalOpen(false)}
                                className="btn btn-ghost btn-icon text-text-muted"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleRecordPaymentSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-6 space-y-4 overflow-y-auto flex-1">
                                {paymentError && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 font-medium flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{paymentError}</span>
                                    </div>
                                )}

                                {/* Step 1: Select Eligible Invoice */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-text-muted">1. Select Tax Invoice *</label>
                                    
                                    <div className="relative">
                                        <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            placeholder="Search eligible invoices by number, client, company..."
                                            value={invoiceSearchQuery}
                                            onChange={(e) => {
                                                setInvoiceSearchQuery(e.target.value);
                                                fetchEligibleInvoices(e.target.value);
                                            }}
                                            className="w-full pl-9 pr-4 py-2 bg-bg-main border border-border-subtle rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand-primary"
                                        />
                                    </div>

                                    {/* Invoice Selector List */}
                                    <div className="border border-border-subtle rounded-xl max-h-40 overflow-y-auto divide-y divide-border-subtle bg-bg-main/30">
                                        {loadingInvoices ? (
                                            <div className="p-3 text-center text-xs text-text-muted flex items-center justify-center gap-2">
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading eligible invoices...
                                            </div>
                                        ) : eligibleInvoices.length === 0 ? (
                                            <div className="p-4 text-center text-xs text-text-muted">
                                                No eligible ISSUED or PARTIALLY_PAID Tax Invoices found.
                                            </div>
                                        ) : (
                                            eligibleInvoices.map((inv) => {
                                                const isSelected = selectedInvoice && selectedInvoice.id === inv.id;
                                                return (
                                                    <div
                                                        key={inv.id}
                                                        onClick={() => handleSelectInvoice(inv)}
                                                        className={`p-3 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                                                            isSelected ? 'bg-emerald-500/10 border-l-4 border-l-emerald-600' : 'hover:bg-bg-main'
                                                        }`}
                                                    >
                                                        <div>
                                                            <div className="font-bold text-text-primary flex items-center gap-2">
                                                                <span>{inv.invoiceNumber}</span>
                                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-bg-main border border-border-subtle font-medium text-text-muted">
                                                                    {inv.status}
                                                                </span>
                                                            </div>
                                                            <div className="text-[11px] text-text-muted mt-0.5">
                                                                {inv.clientName} {inv.clientCompany ? `(${inv.clientCompany})` : ''}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-bold text-amber-600 dark:text-amber-400">
                                                                Bal: {formatCurrency(inv.balanceDue || inv.grandTotal, inv.currency, 2)}
                                                            </div>
                                                            <div className="text-[11px] text-text-muted">
                                                                Total: {formatCurrency(inv.grandTotal, inv.currency, 2)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* Step 2: Authoritative Invoice & Customer Breakdown Card */}
                                {selectedInvoice && (
                                    <div className="p-4 bg-bg-main rounded-xl border border-border-subtle space-y-3 animate-modal-entrance">
                                        <div className="flex items-center justify-between">
                                            <div className="font-bold text-xs text-text-primary flex items-center gap-1.5">
                                                <Building2 className="w-4 h-4 text-brand-primary" />
                                                <span>Customer: {selectedInvoice.clientName} {selectedInvoice.clientCompany ? `(${selectedInvoice.clientCompany})` : ''}</span>
                                            </div>
                                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">Selected</span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-border-subtle">
                                            <div className="p-2 bg-bg-card rounded-lg border border-border-subtle">
                                                <div className="text-[10px] text-text-muted font-medium">Invoice Total</div>
                                                <div className="text-xs font-bold text-text-primary mt-0.5">
                                                    {formatCurrency(selectedInvoice.grandTotal || 0, selectedInvoice.currency, 2)}
                                                </div>
                                            </div>
                                            <div className="p-2 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Already Paid</div>
                                                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                                    {formatCurrency(selectedInvoice.amountPaid || 0, selectedInvoice.currency, 2)}
                                                </div>
                                            </div>
                                            <div className="p-2 bg-amber-500/5 rounded-lg border border-amber-500/20">
                                                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Current Balance</div>
                                                <div className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                                                    {formatCurrency(currentInvoiceBalance, selectedInvoice.currency, 2)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 3: Payment Entry Fields */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-text-muted mb-1">Payment Date *</label>
                                        <input
                                            type="date"
                                            required
                                            value={paymentForm.paymentDate}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                                            className="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-text-muted mb-1">Amount Received ({selectedInvoice?.currency === 'USD' ? '$' : '₹'}) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            required
                                            disabled={!selectedInvoice}
                                            value={paymentForm.amount}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                            placeholder={selectedInvoice ? "Enter amount" : "Select invoice first"}
                                            className={`w-full px-3 py-2 bg-bg-main border rounded-lg text-sm font-bold focus:outline-none ${
                                                isOverpayment ? 'border-red-500 text-red-500' : 'border-border-subtle text-text-primary focus:border-brand-primary'
                                            }`}
                                        />
                                    </div>
                                </div>

                                {/* Real-time Balance Preview */}
                                {selectedInvoice && currentPaymentNumAmount > 0 && (
                                    <div className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
                                        isOverpayment ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
                                    }`}>
                                        <span className="font-medium">
                                            {isOverpayment ? `Amount exceeds current balance by ${formatCurrency(currentPaymentNumAmount - currentInvoiceBalance, selectedInvoice.currency, 2)}` : 'New Remaining Balance Preview:'}
                                        </span>
                                        <span className="font-bold">
                                            {formatCurrency(previewNewBalance, selectedInvoice.currency, 2)}
                                        </span>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-semibold text-text-muted mb-1">Payment Method *</label>
                                    <select
                                        value={paymentForm.paymentMethod}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                                        className="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                                    >
                                        <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                                        <option value="UPI">UPI / GPay / PhonePe</option>
                                        <option value="CHEQUE">Cheque / Demand Draft</option>
                                        <option value="CASH">Cash</option>
                                        <option value="CARD">Debit / Credit Card</option>
                                        <option value="OTHER">Other External Method</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-text-muted mb-1">Transaction Ref / UTR</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. UTR12345678"
                                            value={paymentForm.transactionReference}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
                                            className="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-semibold mb-1 ${paymentForm.paymentMethod === 'CHEQUE' ? 'text-amber-600 font-bold' : 'text-text-muted'}`}>
                                            Cheque Number {paymentForm.paymentMethod === 'CHEQUE' ? '*' : ''}
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. CHQ-998811"
                                            value={paymentForm.chequeNumber}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, chequeNumber: e.target.value })}
                                            className={`w-full px-3 py-2 bg-bg-main border rounded-lg text-sm focus:outline-none ${
                                                paymentForm.paymentMethod === 'CHEQUE' ? 'border-amber-500/50 focus:border-amber-500' : 'border-border-subtle focus:border-brand-primary'
                                            }`}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-text-muted mb-1">Bank Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. HDFC Bank / ICICI Bank"
                                        value={paymentForm.bankName}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, bankName: e.target.value })}
                                        className="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-text-muted mb-1">Internal Notes</label>
                                    <textarea
                                        rows={2}
                                        placeholder="Optional payment notes..."
                                        value={paymentForm.notes}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                        className="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand-primary resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-subtle bg-bg-card shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsRecordModalOpen(false)}
                                    className="btn btn-secondary btn-md"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={recordingPayment || !selectedInvoice || isOverpayment}
                                    className="btn btn-primary btn-md"
                                >
                                    {recordingPayment ? (
                                        <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Recording...</>
                                    ) : 'Record Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Payment Details Modal */}
            {selectedPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-bg-card border border-border-subtle rounded-2xl w-full max-w-lg flex flex-col overflow-hidden shadow-2xl animate-modal-entrance">
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
                                className="btn btn-ghost btn-icon text-text-muted"
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
                                        {formatCurrency(selectedPayment.amount, selectedPayment.currency, 2)}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <div className="flex justify-between border-b border-border-subtle pb-2">
                                    <span className="text-text-muted">Associated Tax Invoice</span>
                                    <button 
                                        onClick={() => { setSelectedPayment(null); navigate(`/invoices/${selectedPayment.invoiceId}`); }}
                                        className="btn btn-primary btn-md"
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
                                    className="btn btn-danger btn-sm"
                                >
                                    Cancel Payment
                                </button>
                            ) : <div />}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleSendReceiptEmail(selectedPayment.id)}
                                    disabled={sendingReceiptId === selectedPayment.id}
                                    className="btn btn-secondary btn-sm"
                                >
                                    {sendingReceiptId === selectedPayment.id ? (
                                        <><span className="animate-spin w-3.5 h-3.5 border-b-2 border-brand-primary rounded-full inline-block"></span> Sending...</>
                                    ) : (
                                        <><Mail className="w-3.5 h-3.5 text-brand-primary" /> Send Receipt Email</>
                                    )}
                                </button>
                                <button
                                    onClick={() => handleDownloadReceipt(selectedPayment.id, selectedPayment.paymentNumber)}
                                    className="btn btn-secondary btn-sm"
                                >
                                    <Download className="w-3.5 h-3.5" /> PDF Receipt
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Payment Modal */}
            <ConfirmDialog 
                isOpen={Boolean(cancellingPayment)}
                title={`Cancel Payment ${cancellingPayment?.paymentNumber}`}
                description="Please confirm you want to cancel this payment. The associated Tax Invoice amount paid and balance due will be automatically updated."
                onConfirm={handleCancelSubmit}
                onCancel={() => setCancellingPayment(null)}
                isLoading={submittingCancel}
                variant="destructive"
                confirmText="Confirm Cancellation"
            />
            {cancellingPayment && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 pointer-events-none">
                    <div className="bg-bg-card border border-border-subtle rounded-2xl w-full max-w-md flex flex-col overflow-hidden shadow-2xl animate-modal-entrance pointer-events-auto mt-32 absolute">
                        <form onSubmit={(e) => { e.preventDefault(); handleCancelSubmit(e); }} className="p-6 space-y-4">
                            {cancelError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 font-medium">
                                    {cancelError}
                                </div>
                            )}
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
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
