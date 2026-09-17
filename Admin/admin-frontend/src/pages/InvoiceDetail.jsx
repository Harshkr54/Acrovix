import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    getInvoiceById, 
    updateDraftInvoice, 
    issueInvoice, 
    cancelInvoice, 
    convertProformaToTaxInvoice,
    getInvoicePayments,
    recordPayment,
    cancelPayment,
    getPaymentReceiptPdf
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Clock, CheckCircle, XCircle, FileText, Download, Edit3, X, CreditCard, Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../services/api';

export default function InvoiceDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [invoice, setInvoice] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Record Payment Modal state
    const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
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
    const [cancellingPaymentId, setCancellingPaymentId] = useState(null);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelError, setCancelError] = useState(null);
    const [submittingCancel, setSubmittingCancel] = useState(false);

    // Edit Modal state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        clientName: '',
        clientCompany: '',
        clientEmail: '',
        clientPhone: '',
        clientAddress: '',
        clientGstin: '',
        placeOfSupply: '',
        invoiceDate: '',
        dueDate: '',
        paymentTerms: ''
    });
    const [editError, setEditError] = useState(null);
    const [savingEdit, setSavingEdit] = useState(false);

    const fetchInvoice = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getInvoiceById(id);
            setInvoice(data);

            if (data && data.invoiceType === 'TAX_INVOICE') {
                try {
                    const paymentList = await getInvoicePayments(id);
                    setPayments(paymentList || []);
                } catch (pErr) {
                    console.error('Failed to fetch invoice payments', pErr);
                }
            }
        } catch (err) {
            console.error('Failed to fetch Invoice', err);
            setError(err.message || 'Failed to load invoice details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoice();
    }, [id]);

    const handleOpenRecordPaymentModal = () => {
        const bal = invoice.balanceDue !== undefined && invoice.balanceDue !== null ? invoice.balanceDue : invoice.grandTotal;
        setPaymentForm({
            paymentDate: new Date().toISOString().split('T')[0],
            amount: bal > 0 ? String(bal) : '',
            paymentMethod: 'BANK_TRANSFER',
            transactionReference: '',
            chequeNumber: '',
            bankName: '',
            notes: ''
        });
        setPaymentError(null);
        setIsRecordPaymentModalOpen(true);
    };

    const handleRecordPaymentSubmit = async (e) => {
        e.preventDefault();
        setPaymentError(null);
        
        const numAmount = parseFloat(paymentForm.amount);
        const currentBalance = invoice.balanceDue !== undefined && invoice.balanceDue !== null ? Number(invoice.balanceDue) : Number(invoice.grandTotal);

        if (isNaN(numAmount) || numAmount <= 0) {
            setPaymentError('Payment amount must be greater than zero.');
            return;
        }

        if (numAmount > currentBalance + 0.001) {
            setPaymentError(`Payment amount (Rs. ${numAmount.toLocaleString()}) cannot exceed remaining balance (Rs. ${currentBalance.toLocaleString()}).`);
            return;
        }

        try {
            setRecordingPayment(true);
            await recordPayment({
                invoiceId: Number(id),
                paymentDate: paymentForm.paymentDate,
                amount: numAmount,
                paymentMethod: paymentForm.paymentMethod,
                transactionReference: paymentForm.transactionReference.trim() || null,
                chequeNumber: paymentForm.chequeNumber.trim() || null,
                bankName: paymentForm.bankName.trim() || null,
                notes: paymentForm.notes.trim() || null
            });

            setIsRecordPaymentModalOpen(false);
            await fetchInvoice();
        } catch (err) {
            console.error('Failed to record payment', err);
            setPaymentError(err.message || 'Failed to record payment');
        } finally {
            setRecordingPayment(false);
        }
    };

    const handleOpenCancelModal = (paymentId) => {
        setCancellingPaymentId(paymentId);
        setCancelReason('');
        setCancelError(null);
    };

    const handleCancelPaymentSubmit = async (e) => {
        e.preventDefault();
        if (!cancelReason.trim()) {
            setCancelError('Cancellation reason is required.');
            return;
        }
        try {
            setSubmittingCancel(true);
            setCancelError(null);
            await cancelPayment(cancellingPaymentId, { reason: cancelReason.trim() });
            setCancellingPaymentId(null);
            await fetchInvoice();
        } catch (err) {
            console.error('Failed to cancel payment', err);
            setCancelError(err.message || 'Failed to cancel payment');
        } finally {
            setSubmittingCancel(false);
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

    const handleOpenEditModal = () => {
        setEditForm({
            clientName: invoice.clientName || '',
            clientCompany: invoice.clientCompany || '',
            clientEmail: invoice.clientEmail || '',
            clientPhone: invoice.clientPhone || '',
            clientAddress: invoice.clientAddress || '',
            clientGstin: invoice.clientGstin || '',
            placeOfSupply: invoice.placeOfSupply || '',
            invoiceDate: invoice.invoiceDate || '',
            dueDate: invoice.dueDate || '',
            paymentTerms: invoice.paymentTerms || ''
        });
        setEditError(null);
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        try {
            setSavingEdit(true);
            setEditError(null);
            await updateDraftInvoice(id, {
                invoiceType: invoice.invoiceType,
                ...editForm
            });
            setIsEditModalOpen(false);
            await fetchInvoice();
        } catch (err) {
            console.error('Failed to update invoice details', err);
            setEditError(err.message || 'Failed to update invoice details');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleIssue = async () => {
        if (!window.confirm('Are you sure you want to issue this Invoice? This action cannot be undone.')) return;
        try {
            setActionLoading(true);
            await issueInvoice(id);
            await fetchInvoice();
        } catch (error) {
            console.error('Failed to issue Invoice', error);
            alert(error.message || 'Failed to issue Invoice');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!window.confirm('Are you sure you want to cancel this Invoice?')) return;
        try {
            setActionLoading(true);
            await cancelInvoice(id);
            await fetchInvoice();
        } catch (error) {
            console.error('Failed to cancel Invoice', error);
            alert(error.message || 'Failed to cancel Invoice');
        } finally {
            setActionLoading(false);
        }
    };

    const handleConvertToTaxInvoice = async () => {
        if (!window.confirm('Are you sure you want to convert this Proforma Invoice to a Tax Invoice?')) return;
        try {
            setActionLoading(true);
            const res = await convertProformaToTaxInvoice(id);
            navigate(`/invoices/${res.id}`);
        } catch (error) {
            console.error('Failed to convert to Tax Invoice', error);
            alert(error.message || 'Failed to convert to Tax Invoice');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDownloadPdf = () => {
        const token = localStorage.getItem('adminToken');
        fetch(`${API_BASE_URL}/invoices/${id}/pdf`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(res => {
            if (!res.ok) throw new Error('Failed to generate PDF');
            return res.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${invoice.invoiceNumber || 'DRAFT_INVOICE'}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        })
        .catch(err => {
            console.error(err);
            alert('Could not download PDF');
        });
    };

    if (loading) return <div className="p-8 text-center text-text-muted">Loading Invoice details...</div>;
    if (error) return (
        <div className="p-8 text-center max-w-md mx-auto my-12 bg-bg-card border border-border-subtle rounded-2xl p-6">
            <h3 className="text-base font-bold text-text-primary mb-1">Failed to Load Invoice</h3>
            <p className="text-xs text-text-muted mb-4">{error}</p>
            <button onClick={fetchInvoice} className="px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-semibold hover:bg-brand-secondary transition-colors">
                Retry
            </button>
        </div>
    );
    if (!invoice) return <div className="p-8 text-center text-text-muted">Invoice not found.</div>;

    const getStatusIcon = (status) => {
        switch (status) {
            case 'DRAFT': return <Clock className="w-5 h-5 text-gray-500"/>;
            case 'ISSUED': return <CheckCircle className="w-5 h-5 text-blue-500"/>;
            case 'PARTIALLY_PAID': return <Clock className="w-5 h-5 text-amber-500"/>;
            case 'PAID': return <CheckCircle className="w-5 h-5 text-emerald-500"/>;
            case 'CANCELLED': return <XCircle className="w-5 h-5 text-red-500"/>;
            default: return null;
        }
    };

    const isRecordPaymentEligible = invoice.invoiceType === 'TAX_INVOICE' && (invoice.status === 'ISSUED' || invoice.status === 'PARTIALLY_PAID');

    return (
        <div className="p-8 max-w-5xl mx-auto pb-24">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button 
                    onClick={() => navigate('/invoices')}
                    className="p-2 hover:bg-bg-main rounded-full transition-colors text-text-muted hover:text-text-primary"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-text-primary">{invoice.invoiceNumber || 'DRAFT INVOICE'}</h1>
                        <span className={`px-3 py-1 border rounded-full text-xs font-medium flex items-center gap-1.5 ${
                            invoice.status === 'PAID' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' :
                            invoice.status === 'PARTIALLY_PAID' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' :
                            invoice.status === 'ISSUED' ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' :
                            invoice.status === 'CANCELLED' ? 'bg-red-500/10 border-red-500/30 text-red-500' :
                            'bg-gray-500/10 border-gray-500/30 text-gray-500'
                        }`}>
                            {getStatusIcon(invoice.status)}
                            {invoice.status}
                        </span>
                        <span className={`px-3 py-1 border rounded-full text-xs font-medium flex items-center gap-1.5 ${invoice.invoiceType === 'PROFORMA' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                            {invoice.invoiceType === 'PROFORMA' ? 'Proforma' : 'Tax Invoice'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {invoice.status === 'DRAFT' && (
                        <button 
                            onClick={handleOpenEditModal}
                            className="px-4 py-2 bg-bg-card border border-border-subtle hover:bg-bg-main text-text-primary rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <Edit3 className="w-4 h-4 text-brand-primary" /> Edit Details
                        </button>
                    )}
                    <button 
                        onClick={handleDownloadPdf}
                        className="px-4 py-2 bg-bg-card border border-border-subtle hover:bg-bg-main text-text-primary rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" /> PDF
                    </button>
                    {isRecordPaymentEligible && (
                        <button 
                            onClick={handleOpenRecordPaymentModal}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <CreditCard className="w-4 h-4" /> Record Payment
                        </button>
                    )}
                    {invoice.status === 'DRAFT' && (
                        <button 
                            onClick={handleIssue}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            <CheckCircle className="w-4 h-4" /> Issue Invoice
                        </button>
                    )}
                    {(invoice.status === 'DRAFT' || invoice.status === 'ISSUED') && (
                        <button 
                            onClick={handleCancel}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    )}
                    {invoice.invoiceType === 'PROFORMA' && invoice.status === 'ISSUED' && (
                        <button 
                            onClick={handleConvertToTaxInvoice}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            Convert to Tax Invoice
                        </button>
                    )}
                </div>
            </div>

            {/* Payment Summary Header Card for TAX_INVOICE */}
            {invoice.invoiceType === 'TAX_INVOICE' && invoice.status !== 'DRAFT' && (
                <div className="mb-6 bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-brand-primary" />
                            <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">Payment & Ledger Status</h3>
                        </div>
                        {isRecordPaymentEligible && (
                            <button 
                                onClick={handleOpenRecordPaymentModal}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                            >
                                <Plus className="w-3.5 h-3.5" /> Record Payment
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                        <div className="p-4 bg-bg-main rounded-xl border border-border-subtle">
                            <div className="text-xs text-text-muted font-medium mb-1">Grand Total</div>
                            <div className="text-lg font-bold text-text-primary">Rs. {Number(invoice.grandTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </div>
                        <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">Amount Received</div>
                            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Rs. {Number(invoice.amountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </div>
                        <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/20">
                            <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">Balance Due</div>
                            <div className="text-lg font-bold text-amber-600 dark:text-amber-400">Rs. {Number(invoice.balanceDue !== undefined && invoice.balanceDue !== null ? invoice.balanceDue : invoice.grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </div>
                        <div className="p-4 bg-bg-main rounded-xl border border-border-subtle flex flex-col justify-center">
                            <div className="text-xs text-text-muted font-medium mb-1">Payment Status</div>
                            <div className="font-bold text-sm text-text-primary flex items-center gap-1.5">
                                <span className={`w-2.5 h-2.5 rounded-full ${
                                    invoice.status === 'PAID' ? 'bg-emerald-500' :
                                    invoice.status === 'PARTIALLY_PAID' ? 'bg-amber-500' :
                                    invoice.status === 'ISSUED' ? 'bg-blue-500' : 'bg-gray-400'
                                }`}></span>
                                {invoice.status}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    {/* General Info */}
                    <div className="bg-bg-card border border-border-subtle rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Invoice Details</h3>
                            {invoice.status === 'DRAFT' && (
                                <button 
                                    onClick={handleOpenEditModal}
                                    className="text-xs text-brand-primary hover:underline flex items-center gap-1 font-medium"
                                >
                                    <Edit3 className="w-3.5 h-3.5" /> Edit
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs text-text-muted">Invoice Date</label>
                                <div className="font-medium text-text-primary mt-1">{invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</div>
                            </div>
                            <div>
                                <label className="text-xs text-text-muted">Due Date</label>
                                <div className="font-medium text-text-primary mt-1">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</div>
                            </div>
                            <div>
                                <label className="text-xs text-text-muted">Grand Total</label>
                                <div className="font-medium text-text-primary mt-1">Rs. {Number(invoice.grandTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </div>
                            <div>
                                <label className="text-xs text-text-muted">Payment Terms</label>
                                <div className="font-medium text-text-primary mt-1">{invoice.paymentTerms || 'N/A'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Amount Details */}
                    <div className="bg-bg-card border border-border-subtle rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">Financials</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-text-muted">Taxable Amount</span>
                                <span className="font-medium">Rs. {Number(invoice.taxableAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            {invoice.cgstAmount > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-text-muted">CGST</span>
                                    <span className="font-medium">Rs. {Number(invoice.cgstAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            {invoice.sgstAmount > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-text-muted">SGST</span>
                                    <span className="font-medium">Rs. {Number(invoice.sgstAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            {invoice.igstAmount > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-text-muted">IGST</span>
                                    <span className="font-medium">Rs. {Number(invoice.igstAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            <div className="flex justify-between pt-2 border-t border-border-subtle">
                                <span className="font-bold text-text-primary">Grand Total</span>
                                <span className="font-bold text-text-primary">Rs. {Number(invoice.grandTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            {invoice.amountInWords && (
                                <div className="pt-2 text-xs text-text-muted italic">
                                    Amount in words: {invoice.amountInWords}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payment History Table (TAX_INVOICE only) */}
                    {invoice.invoiceType === 'TAX_INVOICE' && (
                        <div className="bg-bg-card border border-border-subtle rounded-xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Payment History</h3>
                                <span className="text-xs text-text-muted">{payments.length} {payments.length === 1 ? 'Record' : 'Records'}</span>
                            </div>

                            {payments.length === 0 ? (
                                <div className="p-6 text-center text-text-muted text-xs border border-dashed border-border-subtle rounded-xl">
                                    No payments have been recorded for this invoice yet.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="border-b border-border-subtle text-text-muted bg-bg-main/50">
                                                <th className="p-3 font-semibold">Payment #</th>
                                                <th className="p-3 font-semibold">Date</th>
                                                <th className="p-3 font-semibold">Method</th>
                                                <th className="p-3 font-semibold">Reference / Cheque</th>
                                                <th className="p-3 font-semibold text-right">Amount</th>
                                                <th className="p-3 font-semibold">Status</th>
                                                <th className="p-3 font-semibold text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border-subtle">
                                            {payments.map((p) => (
                                                <tr key={p.id} className="hover:bg-bg-main/30">
                                                    <td className="p-3 font-medium text-text-primary">{p.paymentNumber}</td>
                                                    <td className="p-3 text-text-muted">{new Date(p.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                    <td className="p-3 text-text-primary font-medium">{p.paymentMethod}</td>
                                                    <td className="p-3 text-text-muted">
                                                        {p.transactionReference && <div>Ref: {p.transactionReference}</div>}
                                                        {p.chequeNumber && <div>Chq: {p.chequeNumber}</div>}
                                                        {p.bankName && <div className="text-[11px] text-text-muted">{p.bankName}</div>}
                                                        {!p.transactionReference && !p.chequeNumber && '-'}
                                                    </td>
                                                    <td className="p-3 font-bold text-text-primary text-right">Rs. {Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="p-3">
                                                        {p.status === 'RECORDED' ? (
                                                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 font-semibold rounded-full text-[11px]">RECORDED</span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 bg-red-500/10 text-red-500 font-semibold rounded-full text-[11px]" title={`Reason: ${p.cancellationReason || 'N/A'}`}>
                                                                CANCELLED
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button 
                                                                onClick={() => handleDownloadReceipt(p.id, p.paymentNumber)}
                                                                className="p-1 hover:bg-bg-main text-text-muted hover:text-text-primary rounded transition-colors"
                                                                title="Download Receipt PDF"
                                                            >
                                                                <Download className="w-3.5 h-3.5" />
                                                            </button>
                                                            {p.status === 'RECORDED' && (
                                                                <button 
                                                                    onClick={() => handleOpenCancelModal(p.id)}
                                                                    className="px-2 py-1 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded text-[11px] font-medium transition-colors"
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
                        </div>
                    )}
                </div>

                <div className="col-span-1 space-y-6">
                    {/* Billed To */}
                    <div className="bg-bg-card border border-border-subtle rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Billed To</h3>
                            {invoice.status === 'DRAFT' && (
                                <button 
                                    onClick={handleOpenEditModal}
                                    className="text-xs text-brand-primary hover:underline flex items-center gap-1 font-medium"
                                >
                                    <Edit3 className="w-3.5 h-3.5" /> Edit
                                </button>
                            )}
                        </div>
                        <div className="space-y-4">
                            <div>
                                <div className="font-medium text-text-primary mt-1">{invoice.clientName || 'N/A'}</div>
                                {invoice.clientCompany && <div className="text-xs text-text-muted">{invoice.clientCompany}</div>}
                                {invoice.clientAddress && <div className="text-sm mt-1 whitespace-pre-wrap">{invoice.clientAddress}</div>}
                                {invoice.clientEmail && <div className="text-xs text-text-muted mt-1">{invoice.clientEmail}</div>}
                                {invoice.clientPhone && <div className="text-xs text-text-muted">{invoice.clientPhone}</div>}
                            </div>
                            <div>
                                <label className="text-xs text-text-muted">GSTIN</label>
                                <div className="font-medium text-text-primary mt-1">{invoice.clientGstin || 'N/A'}</div>
                            </div>
                            <div>
                                <label className="text-xs text-text-muted">Place of Supply</label>
                                <div className="font-medium text-text-primary mt-1">{invoice.placeOfSupply || 'N/A'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-bg-card border border-border-subtle rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">Timeline</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-text-muted">Created</label>
                                <div className="text-sm text-text-primary mt-1">{new Date(invoice.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                <div className="text-xs text-text-muted">by {invoice.createdByFullName || 'Unknown'}</div>
                            </div>
                            {invoice.issuedAt && (
                                <div>
                                    <label className="text-xs text-text-muted">Issued</label>
                                    <div className="text-sm text-text-primary mt-1">{new Date(invoice.issuedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                            )}
                            {invoice.cancelledAt && (
                                <div>
                                    <label className="text-xs text-text-muted text-red-500">Cancelled</label>
                                    <div className="text-sm text-text-primary mt-1">{new Date(invoice.cancelledAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Record Payment Modal */}
            {isRecordPaymentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-bg-card border border-border-subtle rounded-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle shrink-0">
                            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-emerald-600" /> Record Payment
                            </h2>
                            <button 
                                onClick={() => setIsRecordPaymentModalOpen(false)}
                                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-main transition-colors"
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

                                <div className="p-4 bg-bg-main rounded-xl border border-border-subtle grid grid-cols-3 gap-2 text-center">
                                    <div>
                                        <div className="text-[11px] text-text-muted font-medium">Grand Total</div>
                                        <div className="text-xs font-bold text-text-primary mt-0.5">Rs. {Number(invoice.grandTotal || 0).toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div className="text-[11px] text-text-muted font-medium">Already Paid</div>
                                        <div className="text-xs font-bold text-emerald-600 mt-0.5">Rs. {Number(invoice.amountPaid || 0).toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div className="text-[11px] text-text-muted font-medium">Balance Due</div>
                                        <div className="text-xs font-bold text-amber-600 mt-0.5">Rs. {Number(invoice.balanceDue !== undefined && invoice.balanceDue !== null ? invoice.balanceDue : invoice.grandTotal).toLocaleString()}</div>
                                    </div>
                                </div>

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
                                        <label className="block text-xs font-semibold text-text-muted mb-1">Amount (Rs.) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            required
                                            value={paymentForm.amount}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                            placeholder="Enter amount"
                                            className="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand-primary font-bold"
                                        />
                                    </div>
                                </div>

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
                                        <label className="block text-xs font-semibold text-text-muted mb-1">Cheque Number</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. CHQ-998811"
                                            value={paymentForm.chequeNumber}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, chequeNumber: e.target.value })}
                                            className="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand-primary"
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
                                    onClick={() => setIsRecordPaymentModalOpen(false)}
                                    className="px-4 py-2 border border-border-subtle text-text-muted hover:text-text-primary rounded-lg text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={recordingPayment}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                                >
                                    {recordingPayment ? 'Recording...' : 'Record Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Cancel Payment Modal */}
            {cancellingPaymentId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-bg-card border border-border-subtle rounded-2xl w-full max-w-md flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle shrink-0">
                            <h2 className="text-base font-bold text-red-500 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5" /> Cancel Payment Record
                            </h2>
                            <button 
                                onClick={() => setCancellingPaymentId(null)}
                                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-main transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCancelPaymentSubmit} className="p-6 space-y-4">
                            {cancelError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 font-medium">
                                    {cancelError}
                                </div>
                            )}

                            <p className="text-xs text-text-muted leading-relaxed">
                                Are you sure you want to cancel this payment? The invoice balance and status will be automatically recalculated. The payment record will remain in history as CANCELLED.
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
                                    onClick={() => setCancellingPaymentId(null)}
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

            {/* Edit Invoice Details Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-bg-card border border-border-subtle rounded-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle shrink-0">
                            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                <Edit3 className="w-5 h-5 text-brand-primary" /> Edit Invoice Details
                            </h2>
                            <button 
                                onClick={() => setIsEditModalOpen(false)}
                                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-main transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-6 space-y-4 overflow-y-auto flex-1">
                                {editError && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 font-medium">
                                        {editError}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-text-muted mb-1">Client Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={editForm.clientName}
                                            onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })}
                                            className="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-text-muted mb-1">Company</label>
                                        <input
                                            type="text"
                                            value={editForm.clientCompany}
                                            onChange={(e) => setEditForm({ ...editForm, clientCompany: e.target.value })}
                                            className="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-text-muted mb-1">Email</label>
                                        <input
                                            type="email"
                                            value={editForm.clientEmail}
                                            onChange={(e) => setEditForm({ ...editForm, clientEmail: e.target.value })}
                                            className="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-text-muted mb-1">Phone</label>
                                        <input
                                            type="text"
                                            value={editForm.clientPhone}
                                            onChange={(e) => setEditForm({ ...editForm, clientPhone: e.target.value })}
                                            className="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-text-muted mb-1">Address</label>
                                        <textarea
                                            rows={2}
                                            value={editForm.clientAddress}
                                            onChange={(e) => setEditForm({ ...editForm, clientAddress: e.target.value })}
                                            className="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand-primary resize-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-text-muted mb-1">GSTIN</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 27AAAAA0000A1Z5"
                                            value={editForm.clientGstin}
                                            onChange={(e) => setEditForm({ ...editForm, clientGstin: e.target.value })}
                                            className="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand-primary uppercase"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-text-muted mb-1">Place of Supply</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Maharashtra"
                                            value={editForm.placeOfSupply}
                                            onChange={(e) => setEditForm({ ...editForm, placeOfSupply: e.target.value })}
                                            className="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-text-muted mb-1">Invoice Date</label>
                                        <input
                                            type="date"
                                            value={editForm.invoiceDate}
                                            onChange={(e) => setEditForm({ ...editForm, invoiceDate: e.target.value })}
                                            className="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-text-muted mb-1">Due Date</label>
                                        <input
                                            type="date"
                                            value={editForm.dueDate}
                                            onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                                            className="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-text-muted mb-1">Payment Terms</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 50% advance, 50% upon delivery"
                                            value={editForm.paymentTerms}
                                            onChange={(e) => setEditForm({ ...editForm, paymentTerms: e.target.value })}
                                            className="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Sticky Modal Footer */}
                            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-subtle bg-bg-card shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-4 py-2 border border-border-subtle text-text-muted hover:text-text-primary rounded-lg text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingEdit}
                                    className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                                >
                                    {savingEdit ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

