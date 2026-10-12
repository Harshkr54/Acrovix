import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
    generatePaymentLink,
    getCompanySettings,
    getInvoicePdf,
    sendInvoiceEmail
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
    ArrowLeft, Clock, CheckCircle, FileText, Download, Edit3, X, CreditCard, 
    Plus, AlertCircle, RefreshCw, Mail, Link as LinkIcon, Copy, ExternalLink, 
    Eye, Trash2, User, Truck, Receipt, Landmark, ShieldCheck, MessageSquare, Calendar, Coins 
} from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import { formatCurrency } from '../utils/formatters';

export default function InvoiceDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [invoice, setInvoice] = useState(null);
    const [companySettings, setCompanySettings] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);

    // PDF Preview Modal state
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState(null);

    // Confirmation Modals state (no native window.confirm)
    const [isIssueConfirmOpen, setIsIssueConfirmOpen] = useState(false);
    const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
    const [isConvertConfirmOpen, setIsConvertConfirmOpen] = useState(false);

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

    // Clean up temporary blob URL on unmount or URL replacement
    useEffect(() => {
        return () => {
            if (previewPdfUrl) {
                window.URL.revokeObjectURL(previewPdfUrl);
            }
        };
    }, [previewPdfUrl]);

    const fetchInvoice = async () => {
        try {
            setLoading(true);
            setError(null);
            const [invoiceData, settingsData] = await Promise.all([
                getInvoiceById(id),
                getCompanySettings().catch(err => {
                    console.warn('Could not load company settings', err);
                    return null;
                })
            ]);

            setInvoice(invoiceData);
            if (settingsData) {
                setCompanySettings(settingsData);
            }

            if (invoiceData && invoiceData.invoiceType === 'TAX_INVOICE') {
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

    useEffect(() => {
        if (isRecordPaymentModalOpen) {
            const prevOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            const handleKeyDown = (e) => {
                if (e.key === 'Escape') {
                    setIsRecordPaymentModalOpen(false);
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => {
                document.body.style.overflow = prevOverflow;
                window.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [isRecordPaymentModalOpen]);

    const showToast = (type, message) => {
        window.dispatchEvent(new CustomEvent('acrovix-toast', {
            detail: { type, message }
        }));
    };

    // --- PDF PREVIEW & DOWNLOAD ---
    const handlePreviewPdf = async () => {
        setIsPreviewModalOpen(true);
        setPreviewLoading(true);
        setPreviewError(null);
        try {
            const response = await getInvoicePdf(id);
            const blob = await response.blob();
            if (previewPdfUrl) {
                window.URL.revokeObjectURL(previewPdfUrl);
            }
            const url = window.URL.createObjectURL(blob);
            setPreviewPdfUrl(url);
        } catch (err) {
            console.error('Failed to generate preview PDF', err);
            setPreviewError(err.message || 'Could not load PDF preview. Please try again.');
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleClosePreviewModal = () => {
        setIsPreviewModalOpen(false);
        if (previewPdfUrl) {
            window.URL.revokeObjectURL(previewPdfUrl);
            setPreviewPdfUrl(null);
        }
    };

    const handleDownloadPdf = async () => {
        try {
            const response = await getInvoicePdf(id);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${invoice.invoiceNumber || 'DRAFT_INVOICE'}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Could not download PDF', err);
            showToast('error', 'Could not download Invoice PDF.');
        }
    };

    // --- SEND EMAIL ---
    const handleSendEmail = async () => {
        try {
            setSendingEmail(true);
            await sendInvoiceEmail(id);
            showToast('success', 'Invoice email sent successfully!');
        } catch (err) {
            console.error('Failed to send invoice email', err);
            showToast('error', err.message || 'Failed to send invoice email.');
        } finally {
            setSendingEmail(false);
        }
    };

    // --- ISSUE INVOICE ---
    const handleIssueConfirm = async () => {
        try {
            setActionLoading(true);
            await issueInvoice(id);
            setIsIssueConfirmOpen(false);
            showToast('success', 'Invoice issued successfully!');
            await fetchInvoice();
        } catch (err) {
            console.error('Failed to issue Invoice', err);
            showToast('error', err.message || 'Failed to issue Invoice.');
        } finally {
            setActionLoading(false);
        }
    };

    // --- CANCEL INVOICE ---
    const handleCancelConfirm = async () => {
        try {
            setActionLoading(true);
            await cancelInvoice(id);
            setIsCancelConfirmOpen(false);
            showToast('success', 'Invoice cancelled successfully.');
            await fetchInvoice();
        } catch (err) {
            console.error('Failed to cancel Invoice', err);
            showToast('error', err.message || 'Failed to cancel Invoice.');
        } finally {
            setActionLoading(false);
        }
    };

    // --- CONVERT PROFORMA ---
    const handleConvertToTaxInvoiceConfirm = async () => {
        try {
            setActionLoading(true);
            const res = await convertProformaToTaxInvoice(id);
            setIsConvertConfirmOpen(false);
            showToast('success', 'Converted to Tax Invoice successfully.');
            navigate(`/invoices/${res.id}`);
        } catch (err) {
            console.error('Failed to convert to Tax Invoice', err);
            showToast('error', err.message || 'Failed to convert to Tax Invoice.');
        } finally {
            setActionLoading(false);
        }
    };

    // --- PAYMENT GATEWAY / LINK ---
    const handleCreatePaymentLink = async () => {
        try {
            setActionLoading(true);
            await generatePaymentLink(id);
            showToast('success', 'Payment link generated successfully.');
            await fetchInvoice();
        } catch (err) {
            console.error('Failed to generate payment link', err);
            showToast('error', err.message || 'Failed to generate payment link.');
        } finally {
            setActionLoading(false);
        }
    };

    const copyPaymentLink = () => {
        if (invoice?.paymentLinkUrl) {
            navigator.clipboard.writeText(invoice.paymentLinkUrl);
            showToast('success', 'Payment link copied to clipboard.');
        }
    };

    // --- RECORD PAYMENT MODAL ---
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
            setPaymentError(`Payment amount (${formatCurrency(numAmount, invoice.currency)}) cannot exceed remaining balance (${formatCurrency(currentBalance, invoice.currency)}).`);
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
            showToast('success', 'Payment recorded successfully.');
            await fetchInvoice();
        } catch (err) {
            console.error('Failed to record payment', err);
            setPaymentError(err.message || 'Failed to record payment.');
        } finally {
            setRecordingPayment(false);
        }
    };

    // --- CANCEL PAYMENT MODAL ---
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
            showToast('success', 'Payment cancelled successfully.');
            await fetchInvoice();
        } catch (err) {
            console.error('Failed to cancel payment', err);
            setCancelError(err.message || 'Failed to cancel payment.');
        } finally {
            setSubmittingCancel(false);
        }
    };

    const handleDownloadReceipt = (paymentId, paymentNumber) => {
        const token = localStorage.getItem('adminToken');
        fetch(`${API_BASE_URL}/payments/${paymentId}/pdf`, {
            headers: { 'Authorization': `Bearer ${token}` }
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
            showToast('error', 'Could not download Payment Receipt PDF.');
        });
    };

    // --- EDIT MODAL ---
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
            showToast('success', 'Invoice details updated successfully.');
            await fetchInvoice();
        } catch (err) {
            console.error('Failed to update invoice details', err);
            setEditError(err.message || 'Failed to update invoice details.');
        } finally {
            setSavingEdit(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-text-muted">Loading Invoice details...</div>;
    if (error) return (
        <div className="p-8 text-center max-w-md mx-auto my-12 bg-bg-card border border-border-subtle rounded-2xl p-6">
            <h3 className="text-base font-bold text-text-primary mb-1">Failed to Load Invoice</h3>
            <p className="text-xs text-text-muted mb-4">{error}</p>
            <button onClick={fetchInvoice} className="btn btn-secondary btn-sm">Retry</button>
        </div>
    );
    if (!invoice) return <div className="p-8 text-center text-text-muted">Invoice not found.</div>;

    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const isRecordPaymentEligible = isSuperAdmin && invoice.invoiceType === 'TAX_INVOICE' && (invoice.status === 'ISSUED' || invoice.status === 'PARTIALLY_PAID');
    const currencySymbol = invoice.currency === 'USD' ? '$' : '₹';

    const formatDate = (d) => {
        if (!d) return '-';
        return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const calculateDuePeriod = () => {
        if (!invoice.invoiceDate || !invoice.dueDate) return '';
        const start = new Date(invoice.invoiceDate);
        const end = new Date(invoice.dueDate);
        const diffTime = end - start;
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? ` (${diffDays} Days)` : '';
    };

    // Bank Details fallback
    const bankDetails = {
        bankName: (companySettings && companySettings.bankName) ? companySettings.bankName : 'HDFC Bank',
        accountHolder: (companySettings && companySettings.legalName) ? companySettings.legalName : ((companySettings && companySettings.companyName) ? companySettings.companyName : 'ACROVIX INNOVATIONS PRIVATE LIMITED'),
        accountNumber: (companySettings && companySettings.bankAccountNumber) ? companySettings.bankAccountNumber : '50200001245678',
        ifsc: (companySettings && companySettings.bankIfsc) ? companySettings.bankIfsc : 'HDFC0001234',
        branch: (companySettings && companySettings.bankBranch) ? companySettings.bankBranch : 'Koramangala, Bengaluru'
    };

    // Remarks bullets
    const rawRemarks = invoice.paymentTerms || '';
    const remarksList = rawRemarks.trim().length > 0 
        ? rawRemarks.split('\n').map(s => s.replace(/^[•\-*]\s*/, '').trim()).filter(Boolean)
        : [
            'Payment to be made as per the payment terms mentioned.',
            'For any queries, please contact our finance team.',
            'This is a computer generated invoice and does not require a physical signature.'
        ];

    // Terms & Conditions list
    const rawTerms = invoice.termsAndConditions || (companySettings && companySettings.defaultTermsAndConditions) || '';
    const defaultTerms = [
        'Invoice is valid for 30 days from the date of issue.',
        'Payment terms: 50% advance and 50% on completion.',
        'Delivery must be made as per the agreed timeline.',
        'Any additional scope of work will be quoted separately.',
        'Applicable taxes will be charged as per government regulations.',
        'In case of delay or non-compliance, ACROVIX reserves the right to take appropriate action.',
        'For any disputes, subject to Bengaluru jurisdiction only.'
    ];
    const termsList = rawTerms.trim().length > 0
        ? rawTerms.split('\n').map(s => s.replace(/^\d+[.)]\s*/, '').trim()).filter(Boolean)
        : defaultTerms;

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto pb-24 font-sans text-text-primary">
            {/* Top Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/invoices')}
                        className="btn btn-secondary btn-icon h-10 w-10 flex items-center justify-center rounded-xl border border-border-subtle bg-white dark:bg-bg-card hover:bg-bg-hover"
                        title="Back to Invoices"
                    >
                        <ArrowLeft className="w-5 h-5 text-text-primary" />
                    </button>

                    <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/40 border border-[#DBEAFE] dark:border-blue-800 flex items-center justify-center text-[#2563EB] dark:text-blue-400 shrink-0">
                        <Receipt className="w-5 h-5 text-[#2563EB] dark:text-blue-400" />
                    </div>

                    <h1 className="text-2xl font-black text-[#0B192C] dark:text-text-primary tracking-tight uppercase">
                        {invoice.status === 'DRAFT' ? 'DRAFT INVOICE' : (invoice.invoiceNumber || 'TAX INVOICE')}
                    </h1>

                    {/* Status Badge */}
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold gap-1.5 border ${
                        invoice.status === 'PAID' ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300' :
                        invoice.status === 'PARTIALLY_PAID' ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300' :
                        invoice.status === 'ISSUED' ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300' :
                        invoice.status === 'CANCELLED' ? 'bg-red-50 border-red-300 text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300' :
                        'bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                    }`}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>{invoice.status}</span>
                    </span>

                    {/* Tax Invoice Badge */}
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold gap-1.5 border bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46] dark:bg-emerald-950/40 dark:border-emerald-800/40 dark:text-emerald-300">
                        <CheckCircle className="w-3.5 h-3.5 text-[#059669]" />
                        <span>{invoice.invoiceType === 'PROFORMA' ? 'Proforma Invoice' : 'Tax Invoice'}</span>
                    </span>
                </div>

                {/* Right Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {isSuperAdmin && invoice.status === 'DRAFT' && (
                        <button 
                            type="button"
                            onClick={handleOpenEditModal}
                            className="h-[38px] px-3.5 rounded-xl border border-border-subtle bg-white dark:bg-bg-card text-[#0B192C] dark:text-text-primary hover:bg-slate-50 dark:hover:bg-bg-hover text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-all"
                        >
                            <Edit3 className="w-4 h-4 text-[#2563EB]" />
                            <span>Edit Details</span>
                        </button>
                    )}

                    {/* Prominent Preview PDF Button */}
                    <button 
                        type="button"
                        onClick={handlePreviewPdf}
                        className="h-[38px] px-3.5 rounded-xl border border-[#2563EB] bg-white dark:bg-bg-card text-[#2563EB] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-all"
                    >
                        <Eye className="w-4 h-4 text-[#2563EB] dark:text-blue-400" />
                        <span>Preview PDF</span>
                    </button>

                    <button 
                        type="button"
                        onClick={handleDownloadPdf}
                        className="h-[38px] px-3.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-all"
                    >
                        <Download className="w-4 h-4 text-white" />
                        <span>PDF</span>
                    </button>

                    <button 
                        type="button"
                        onClick={handleSendEmail}
                        disabled={sendingEmail || actionLoading}
                        className="h-[38px] px-3.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                    >
                        {sendingEmail ? (
                            <>
                                <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span>
                                <span>Sending...</span>
                            </>
                        ) : (
                            <>
                                <Mail className="w-4 h-4 text-white" />
                                <span>Send Email</span>
                            </>
                        )}
                    </button>

                    {isSuperAdmin && invoice.status === 'DRAFT' && (
                        <button 
                            type="button"
                            onClick={() => setIsIssueConfirmOpen(true)}
                            disabled={actionLoading}
                            className="h-[38px] px-3.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-all"
                        >
                            <CheckCircle className="w-4 h-4 text-white" />
                            <span>Issue Invoice</span>
                        </button>
                    )}

                    {isSuperAdmin && (invoice.status === 'DRAFT' || invoice.status === 'ISSUED') && (
                        <button 
                            type="button"
                            onClick={() => setIsCancelConfirmOpen(true)}
                            disabled={actionLoading}
                            className="h-[38px] px-3.5 rounded-xl border border-red-300 bg-white dark:bg-bg-card text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-all"
                        >
                            <Trash2 className="w-4 h-4 text-red-600" />
                            <span>Cancel</span>
                        </button>
                    )}

                    {isSuperAdmin && invoice.invoiceType === 'PROFORMA' && invoice.status === 'ISSUED' && (
                        <button 
                            type="button"
                            onClick={() => setIsConvertConfirmOpen(true)}
                            disabled={actionLoading}
                            className="h-[38px] px-3.5 rounded-xl border border-purple-300 text-purple-700 hover:bg-purple-50 text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-all"
                        >
                            <RefreshCw className="w-4 h-4 text-purple-600" />
                            <span>Convert to Tax Invoice</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Horizontal Metadata Strip */}
            <div className="bg-white dark:bg-bg-card border border-border-subtle rounded-2xl p-4 shadow-sm mb-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-y lg:divide-y-0 lg:divide-x divide-border-subtle gap-y-3 lg:gap-y-0">
                    {/* 1. Invoice No. */}
                    <div className="flex items-center gap-3 px-3 pt-2 lg:pt-0">
                        <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/40 border border-[#DBEAFE] dark:border-blue-800/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-[#2563EB] dark:text-blue-400" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[11px] text-text-muted font-medium">Invoice No.</div>
                            <div className="text-xs md:text-sm font-bold text-text-primary truncate">
                                {invoice.invoiceNumber || 'INV-DRAFT'}
                            </div>
                        </div>
                    </div>

                    {/* 2. Invoice Date */}
                    <div className="flex items-center gap-3 px-3 pt-2 lg:pt-0">
                        <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/40 border border-[#DBEAFE] dark:border-blue-800/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
                            <Calendar className="w-5 h-5 text-[#2563EB] dark:text-blue-400" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[11px] text-text-muted font-medium">Invoice Date</div>
                            <div className="text-xs md:text-sm font-bold text-text-primary truncate">
                                {formatDate(invoice.invoiceDate)}
                            </div>
                        </div>
                    </div>

                    {/* 3. PO Number */}
                    <div className="flex items-center gap-3 px-3 pt-2 lg:pt-0">
                        <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/40 border border-[#DBEAFE] dark:border-blue-800/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-[#2563EB] dark:text-blue-400" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[11px] text-text-muted font-medium">PO Number</div>
                            <div className="text-xs md:text-sm font-bold text-text-primary truncate">
                                {invoice.poNumber || 'N/A'}
                            </div>
                        </div>
                    </div>

                    {/* 4. PO Date */}
                    <div className="flex items-center gap-3 px-3 pt-2 lg:pt-0">
                        <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/40 border border-[#DBEAFE] dark:border-blue-800/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
                            <Calendar className="w-5 h-5 text-[#2563EB] dark:text-blue-400" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[11px] text-text-muted font-medium">PO Date</div>
                            <div className="text-xs md:text-sm font-bold text-text-primary truncate">
                                {formatDate(invoice.poDate)}
                            </div>
                        </div>
                    </div>

                    {/* 5. Due Date */}
                    <div className="flex items-center gap-3 px-3 pt-2 lg:pt-0">
                        <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/40 border border-[#DBEAFE] dark:border-blue-800/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
                            <Calendar className="w-5 h-5 text-[#2563EB] dark:text-blue-400" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[11px] text-text-muted font-medium">Due Date</div>
                            <div className="text-xs md:text-sm font-bold text-text-primary truncate">
                                {formatDate(invoice.dueDate)}{calculateDuePeriod()}
                            </div>
                        </div>
                    </div>

                    {/* 6. Currency */}
                    <div className="flex items-center gap-3 px-3 pt-2 lg:pt-0">
                        <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/40 border border-[#DBEAFE] dark:border-blue-800/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
                            <Coins className="w-5 h-5 text-[#2563EB] dark:text-blue-400" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[11px] text-text-muted font-medium">Currency</div>
                            <div className="text-xs md:text-sm font-bold text-text-primary truncate">
                                {invoice.currency === 'USD' ? 'USD ($)' : 'INR (₹)'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Three-Column Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* 1. Left: BILL TO (CUSTOMER) */}
                <div className="bg-white dark:bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B192C] dark:text-text-primary">
                                BILL TO (CUSTOMER)
                            </h3>
                        </div>
                        <h4 className="font-bold text-sm text-text-primary mb-1">
                            {invoice.clientCompany || invoice.clientName || 'Customer Name'}
                        </h4>
                        <p className="text-xs text-text-muted leading-relaxed mb-4 whitespace-pre-line">
                            {invoice.clientAddress || 'Address not provided'}
                        </p>
                    </div>
                    <div className="space-y-1.5 text-xs pt-2 border-t border-border-subtle/60">
                        <div className="flex">
                            <span className="w-28 text-text-muted shrink-0">GSTIN</span>
                            <span className="text-text-muted mr-2">:</span>
                            <span className="font-semibold text-text-primary uppercase truncate">{invoice.clientGstin || 'N/A'}</span>
                        </div>
                        <div className="flex">
                            <span className="w-28 text-text-muted shrink-0">Contact Person</span>
                            <span className="text-text-muted mr-2">:</span>
                            <span className="font-medium text-text-primary truncate">{invoice.clientName || 'N/A'}</span>
                        </div>
                        <div className="flex">
                            <span className="w-28 text-text-muted shrink-0">Email</span>
                            <span className="text-text-muted mr-2">:</span>
                            <span className="text-text-secondary truncate">{invoice.clientEmail || 'N/A'}</span>
                        </div>
                        <div className="flex">
                            <span className="w-28 text-text-muted shrink-0">Phone</span>
                            <span className="text-text-muted mr-2">:</span>
                            <span className="text-text-secondary truncate">{invoice.clientPhone || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* 2. Middle: SHIP TO (DELIVERY ADDRESS) */}
                <div className="bg-white dark:bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B192C] dark:text-text-primary">
                                SHIP TO (DELIVERY ADDRESS)
                            </h3>
                        </div>
                        <h4 className="font-bold text-sm text-text-primary mb-1">
                            {invoice.clientCompany || invoice.clientName || 'Customer Name'}
                        </h4>
                        <p className="text-xs text-text-muted leading-relaxed mb-4 whitespace-pre-line">
                            {invoice.clientAddress || 'Address not provided'}
                        </p>
                    </div>
                    <div className="space-y-1.5 text-xs pt-2 border-t border-border-subtle/60">
                        <div className="flex">
                            <span className="w-28 text-text-muted shrink-0">Contact Person</span>
                            <span className="text-text-muted mr-2">:</span>
                            <span className="font-medium text-text-primary truncate">{invoice.clientName || 'N/A'}</span>
                        </div>
                        <div className="flex">
                            <span className="w-28 text-text-muted shrink-0">Phone</span>
                            <span className="text-text-muted mr-2">:</span>
                            <span className="text-text-secondary truncate">{invoice.clientPhone || 'N/A'}</span>
                        </div>
                        <div className="flex">
                            <span className="w-28 text-text-muted shrink-0">Email</span>
                            <span className="text-text-muted mr-2">:</span>
                            <span className="text-text-secondary truncate">{invoice.clientEmail || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* 3. Right: INVOICE SUMMARY */}
                <div className="bg-white dark:bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B192C] dark:text-text-primary">
                                INVOICE SUMMARY
                            </h3>
                        </div>
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center text-text-secondary">
                                <span>Taxable Amount</span>
                                <span className="font-semibold text-text-primary">
                                    {formatCurrency(invoice.taxableAmount || 0, invoice.currency, 2)}
                                </span>
                            </div>

                            {invoice.igstAmount > 0 ? (
                                <div className="flex justify-between items-center text-text-secondary">
                                    <span>IGST (18%)</span>
                                    <span className="font-semibold text-text-primary">
                                        {formatCurrency(invoice.igstAmount || 0, invoice.currency, 2)}
                                    </span>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center text-text-secondary">
                                        <span>CGST (9%)</span>
                                        <span className="font-semibold text-text-primary">
                                            {formatCurrency(invoice.cgstAmount || 0, invoice.currency, 2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-text-secondary">
                                        <span>SGST (9%)</span>
                                        <span className="font-semibold text-text-primary">
                                            {formatCurrency(invoice.sgstAmount || 0, invoice.currency, 2)}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="pt-3 border-t border-border-subtle mt-3">
                        <div className="flex justify-between items-baseline mb-2">
                            <span className="text-sm font-bold text-text-primary">Grand Total</span>
                            <span className="text-xl font-extrabold text-[#059669] dark:text-emerald-400">
                                {formatCurrency(invoice.grandTotal || 0, invoice.currency, 2)}
                            </span>
                        </div>
                        {invoice.amountInWords && (
                            <div className="text-[11px] text-text-muted leading-relaxed">
                                <span className="font-medium not-italic text-text-muted">Amount in words:</span><br />
                                <span className="italic text-text-secondary">{invoice.amountInWords}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Section: Two-Column Composition */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Left (2 Columns): INVOICE ITEMS, REMARKS, BANK DETAILS */}
                <div className="lg:col-span-2 space-y-6">
                    {/* INVOICE ITEMS Table Card */}
                    <div className="bg-white dark:bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B192C] dark:text-text-primary">
                                    INVOICE ITEMS
                                </h3>
                            </div>
                            <span className="text-xs text-text-muted">
                                {invoice.items?.length || 0} {invoice.items?.length === 1 ? 'item' : 'items'}
                            </span>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-border-subtle">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead className="bg-[#0B192C] text-white">
                                    <tr>
                                        <th className="py-2.5 px-3 text-center font-semibold w-10">#</th>
                                        <th className="py-2.5 px-3 font-semibold w-24">Item Code</th>
                                        <th className="py-2.5 px-3 font-semibold">Description</th>
                                        <th className="py-2.5 px-3 text-center font-semibold w-20">HSN / SAC</th>
                                        <th className="py-2.5 px-3 text-center font-semibold w-14">Qty</th>
                                        <th className="py-2.5 px-3 text-right font-semibold w-28">Unit Price ({currencySymbol})</th>
                                        <th className="py-2.5 px-3 text-center font-semibold w-16">GST %</th>
                                        <th className="py-2.5 px-3 text-right font-semibold w-28">Amount ({currencySymbol})</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-subtle bg-white dark:bg-bg-card">
                                    {invoice.items && invoice.items.length > 0 ? (
                                        invoice.items.map((item, idx) => {
                                            const itemPrice = item.unitPrice || item.listPrice || 0;
                                            const itemAmount = item.lineTotal !== undefined && item.lineTotal !== null 
                                                ? item.lineTotal 
                                                : (item.taxableAmount ? Number(item.taxableAmount) + Number(item.taxAmount || 0) : 0);
                                            return (
                                                <tr key={item.id || idx} className="hover:bg-bg-main/50 transition-colors">
                                                    <td className="py-2.5 px-3 text-center text-text-muted">{idx + 1}</td>
                                                    <td className="py-2.5 px-3 font-medium text-text-primary">
                                                        {item.sku || `ITM-${String(idx + 1).padStart(3, '0')}`}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-text-primary font-medium">
                                                        {item.description}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center text-text-muted">
                                                        {item.hsnSac || '-'}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center font-medium text-text-primary">
                                                        {item.quantity}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right text-text-primary">
                                                        {Number(itemPrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center text-text-muted">
                                                        {item.taxPercent !== undefined && item.taxPercent !== null ? `${item.taxPercent}%` : '18%'}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-bold text-text-primary">
                                                        {Number(itemAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="8" className="py-8 text-center text-text-muted">
                                                No line items recorded for this invoice.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* REMARKS Card */}
                    <div className="bg-white dark:bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B192C] dark:text-text-primary">
                                REMARKS
                            </h3>
                        </div>
                        <ul className="space-y-1.5 text-xs text-text-secondary list-disc list-inside">
                            {remarksList.map((r, i) => (
                                <li key={i} className="leading-relaxed">{r}</li>
                            ))}
                        </ul>
                    </div>

                    {/* BANK DETAILS Card */}
                    <div className="bg-white dark:bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <Landmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B192C] dark:text-text-primary">
                                BANK DETAILS
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div className="space-y-2">
                                <div className="flex">
                                    <span className="w-28 text-text-muted shrink-0">Bank</span>
                                    <span className="text-text-muted mr-2">:</span>
                                    <span className="font-semibold text-text-primary">{bankDetails.bankName}</span>
                                </div>
                                <div className="flex">
                                    <span className="w-28 text-text-muted shrink-0">Account Holder</span>
                                    <span className="text-text-muted mr-2">:</span>
                                    <span className="font-semibold text-text-primary">{bankDetails.accountHolder}</span>
                                </div>
                                <div className="flex">
                                    <span className="w-28 text-text-muted shrink-0">Account Number</span>
                                    <span className="text-text-muted mr-2">:</span>
                                    <span className="font-mono font-bold text-text-primary">{bankDetails.accountNumber}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex">
                                    <span className="w-24 text-text-muted shrink-0">IFSC Code</span>
                                    <span className="text-text-muted mr-2">:</span>
                                    <span className="font-mono font-bold text-text-primary">{bankDetails.ifsc}</span>
                                </div>
                                <div className="flex">
                                    <span className="w-24 text-text-muted shrink-0">Branch</span>
                                    <span className="text-text-muted mr-2">:</span>
                                    <span className="text-text-secondary">{bankDetails.branch}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right (1 Column): TERMS & CONDITIONS */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm h-full">
                        <div className="flex items-center gap-2 mb-4">
                            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B192C] dark:text-text-primary">
                                TERMS & CONDITIONS
                            </h3>
                        </div>

                        <div className="space-y-3 text-xs text-text-secondary">
                            {termsList.map((term, index) => (
                                <div key={index} className="flex items-start gap-2.5">
                                    <span className="w-5 h-5 rounded-full border border-blue-500 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 bg-blue-50/50 dark:bg-blue-950/20">
                                        {index + 1}
                                    </span>
                                    <span className="leading-relaxed">{term}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Summary & Ledger Status (for TAX_INVOICE when issued/partially paid/paid) */}
            {invoice.invoiceType === 'TAX_INVOICE' && invoice.status !== 'DRAFT' && (
                <div className="mb-6 bg-white dark:bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-blue-600" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                                Payment & Ledger Status
                            </h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {invoice.paymentLinkUrl ? (
                                <div className="flex items-center gap-2 bg-bg-main border border-border-subtle rounded-lg p-1 pr-2">
                                    <span className="px-2 py-1 text-xs font-mono text-text-secondary truncate max-w-[200px]">
                                        {invoice.paymentLinkUrl}
                                    </span>
                                    <button onClick={copyPaymentLink} className="p-1.5 hover:bg-bg-hover rounded text-text-muted hover:text-blue-600 transition-colors" title="Copy Link">
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>
                                    <a href={invoice.paymentLinkUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-bg-hover rounded text-text-muted hover:text-blue-600 transition-colors" title="Open Link">
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                            ) : isRecordPaymentEligible && (
                                <button 
                                    onClick={handleCreatePaymentLink}
                                    disabled={actionLoading}
                                    className="btn btn-secondary btn-sm border-border-subtle flex items-center gap-1.5"
                                >
                                    <LinkIcon className="w-3.5 h-3.5 text-blue-600" /> 
                                    <span>Generate Payment Link</span>
                                </button>
                            )}
                            
                            {isRecordPaymentEligible && (
                                <button 
                                    onClick={handleOpenRecordPaymentModal}
                                    className="btn btn-success btn-sm flex items-center gap-1.5"
                                >
                                    <Plus className="w-3.5 h-3.5" /> 
                                    <span>Record Payment</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="p-4 bg-bg-main rounded-xl border border-border-subtle">
                            <div className="text-xs text-text-muted font-medium mb-1">Grand Total</div>
                            <div className="text-lg font-bold text-text-primary">
                                {formatCurrency(invoice.grandTotal || 0, invoice.currency, 2)}
                            </div>
                        </div>
                        <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">Amount Received</div>
                            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(invoice.amountPaid || 0, invoice.currency, 2)}
                            </div>
                        </div>
                        <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/20">
                            <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">Balance Due</div>
                            <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                                {formatCurrency(invoice.balanceDue !== undefined && invoice.balanceDue !== null ? invoice.balanceDue : invoice.grandTotal, invoice.currency, 2)}
                            </div>
                        </div>
                        <div className="p-4 bg-bg-main rounded-xl border border-border-subtle flex flex-col justify-center">
                            <div className="text-xs text-text-muted font-medium mb-1">Payment Status</div>
                            <div className="font-bold text-sm text-text-primary flex items-center gap-1.5">
                                <span className={`w-2.5 h-2.5 rounded-full ${
                                    invoice.status === 'PAID' ? 'bg-emerald-500' :
                                    invoice.status === 'PARTIALLY_PAID' ? 'bg-amber-500' :
                                    invoice.status === 'ISSUED' ? 'bg-blue-500' : 'bg-bg-muted'
                                }`}></span>
                                {invoice.status}
                            </div>
                        </div>
                    </div>

                    {/* Payment History Table */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">Payment History</h4>
                            <span className="text-xs text-text-muted">{payments.length} {payments.length === 1 ? 'Record' : 'Records'}</span>
                        </div>

                        {payments.length === 0 ? (
                            <div className="p-6 text-center text-text-muted text-xs border border-dashed border-border-subtle rounded-xl">
                                No payments have been recorded for this invoice yet.
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-border-subtle">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead className="border-b border-border-subtle text-text-muted bg-bg-main/50">
                                        <tr>
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
                                                <td className="p-3 text-text-muted">{formatDate(p.paymentDate)}</td>
                                                <td className="p-3 text-text-primary font-medium">{p.paymentMethod}</td>
                                                <td className="p-3 text-text-muted">
                                                    {p.transactionReference && <div>Ref: {p.transactionReference}</div>}
                                                    {p.chequeNumber && <div>Chq: {p.chequeNumber}</div>}
                                                    {p.bankName && <div className="text-[11px] text-text-muted">{p.bankName}</div>}
                                                    {!p.transactionReference && !p.chequeNumber && '-'}
                                                </td>
                                                <td className="p-3 font-bold text-text-primary text-right">{formatCurrency(p.amount, invoice.currency, 2)}</td>
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
                                                            className="btn btn-secondary btn-icon h-7 w-7 flex items-center justify-center rounded-lg border border-border-subtle"
                                                            title="Download Receipt PDF"
                                                        >
                                                            <Download className="w-3.5 h-3.5 text-text-primary" />
                                                        </button>
                                                        {isSuperAdmin && p.status === 'RECORDED' && (
                                                            <button 
                                                                onClick={() => handleOpenCancelModal(p.id)}
                                                                className="btn btn-danger btn-sm h-7 px-2 text-xs"
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
                </div>
            )}

            {/* --- MODALS --- */}

            {/* 1. PDF Preview Modal */}
            {isPreviewModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-bg-card border border-border-subtle rounded-2xl w-full max-w-5xl flex flex-col h-[90vh] overflow-hidden shadow-2xl animate-modal-entrance">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle shrink-0">
                            <div className="flex items-center gap-2.5">
                                <Eye className="w-5 h-5 text-blue-600" />
                                <h2 className="text-base font-bold text-text-primary">
                                    Tax Invoice PDF Preview — {invoice.invoiceNumber || 'DRAFT'}
                                </h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    type="button"
                                    onClick={handleDownloadPdf}
                                    className="btn btn-primary btn-sm flex items-center gap-1.5 h-8 px-3 rounded-lg"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download PDF</span>
                                </button>
                                <button 
                                    type="button"
                                    onClick={handleClosePreviewModal}
                                    className="btn btn-ghost btn-icon h-8 w-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 bg-slate-100 dark:bg-slate-900 p-3 overflow-hidden flex items-center justify-center">
                            {previewLoading ? (
                                <div className="flex flex-col items-center gap-3">
                                    <span className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full"></span>
                                    <span className="text-sm font-medium text-text-muted">Generating invoice PDF preview...</span>
                                </div>
                            ) : previewError ? (
                                <div className="text-center p-6 bg-white dark:bg-bg-card border border-border-subtle rounded-xl max-w-sm shadow-sm">
                                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                                    <div className="text-sm font-bold text-text-primary mb-1">Failed to Load Preview</div>
                                    <p className="text-xs text-text-muted mb-4">{previewError}</p>
                                    <button onClick={handlePreviewPdf} className="btn btn-secondary btn-sm">
                                        <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry
                                    </button>
                                </div>
                            ) : previewPdfUrl ? (
                                <iframe 
                                    src={previewPdfUrl} 
                                    title="Invoice PDF Preview" 
                                    className="w-full h-full rounded-lg border border-border-subtle shadow-inner bg-white"
                                />
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Issue Invoice Confirmation Modal */}
            {isIssueConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-bg-card border border-border-subtle rounded-2xl w-full max-w-md p-6 shadow-2xl animate-modal-entrance">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <CheckCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-text-primary">Issue Invoice?</h3>
                                <p className="text-xs text-text-muted">Assign sequential invoice number</p>
                            </div>
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed mb-6">
                            Are you sure you want to issue this Invoice? This will lock line items and assign the authoritative sequential tax invoice number. This action cannot be undone.
                        </p>
                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsIssueConfirmOpen(false)}
                                disabled={actionLoading}
                                className="btn btn-secondary btn-md h-9 px-4 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleIssueConfirm}
                                disabled={actionLoading}
                                className="btn btn-primary btn-md h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
                            >
                                {actionLoading ? 'Issuing...' : 'Confirm & Issue'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. Cancel Invoice Confirmation Modal */}
            {isCancelConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-bg-card border border-border-subtle rounded-2xl w-full max-w-md p-6 shadow-2xl animate-modal-entrance">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-red-600">Cancel Invoice?</h3>
                                <p className="text-xs text-text-muted">Irreversible action</p>
                            </div>
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed mb-6">
                            Are you sure you want to cancel this Invoice? The invoice status will be marked as CANCELLED and any ledger balance will be updated accordingly.
                        </p>
                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsCancelConfirmOpen(false)}
                                disabled={actionLoading}
                                className="btn btn-secondary btn-md h-9 px-4 rounded-lg"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={handleCancelConfirm}
                                disabled={actionLoading}
                                className="btn btn-danger btn-md h-9 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium"
                            >
                                {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. Convert Proforma Confirmation Modal */}
            {isConvertConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-bg-card border border-border-subtle rounded-2xl w-full max-w-md p-6 shadow-2xl animate-modal-entrance">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                <RefreshCw className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-text-primary">Convert to Tax Invoice?</h3>
                                <p className="text-xs text-text-muted">Proforma lifecycle conversion</p>
                            </div>
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed mb-6">
                            Are you sure you want to convert this Proforma Invoice to a full Tax Invoice? A new sequential Tax Invoice will be created from this proforma.
                        </p>
                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsConvertConfirmOpen(false)}
                                disabled={actionLoading}
                                className="btn btn-secondary btn-md h-9 px-4 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConvertToTaxInvoiceConfirm}
                                disabled={actionLoading}
                                className="btn btn-primary btn-md h-9 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium"
                            >
                                {actionLoading ? 'Converting...' : 'Convert to Tax Invoice'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. Record Payment Modal */}
            {isRecordPaymentModalOpen && createPortal(
                <div 
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setIsRecordPaymentModalOpen(false);
                        }
                    }}
                >
                    <div 
                        className="bg-white dark:bg-bg-card border border-border-subtle rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-modal-entrance w-full"
                        style={{
                            width: 'min(550px, calc(100vw - 32px))',
                            maxHeight: 'calc(100dvh - 32px)'
                        }}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle shrink-0">
                            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-emerald-600 shrink-0" /> Record Payment
                            </h2>
                            <button 
                                type="button"
                                onClick={() => setIsRecordPaymentModalOpen(false)}
                                className="btn btn-ghost btn-icon h-8 w-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary"
                                aria-label="Close modal"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleRecordPaymentSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0 overscroll-contain">
                                {paymentError && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 font-medium flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{paymentError}</span>
                                    </div>
                                )}

                                <div className="p-4 bg-bg-main rounded-xl border border-border-subtle grid grid-cols-3 gap-2 text-center">
                                    <div>
                                        <div className="text-[11px] text-text-muted font-medium">Grand Total</div>
                                        <div className="text-xs font-bold text-text-primary mt-0.5">{formatCurrency(invoice.grandTotal || 0, invoice.currency, 2)}</div>
                                    </div>
                                    <div>
                                        <div className="text-[11px] text-text-muted font-medium">Already Paid</div>
                                        <div className="text-xs font-bold text-emerald-600 mt-0.5">{formatCurrency(invoice.amountPaid || 0, invoice.currency, 2)}</div>
                                    </div>
                                    <div>
                                        <div className="text-[11px] text-text-muted font-medium">Balance Due</div>
                                        <div className="text-xs font-bold text-amber-600 mt-0.5">{formatCurrency(invoice.balanceDue !== undefined && invoice.balanceDue !== null ? invoice.balanceDue : invoice.grandTotal, invoice.currency, 2)}</div>
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
                                        <label className="block text-xs font-semibold text-text-muted mb-1">Amount ({currencySymbol}) *</label>
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
                                    className="btn btn-secondary btn-md"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={recordingPayment}
                                    className="btn btn-success btn-md"
                                >
                                    {recordingPayment ? 'Recording...' : 'Record Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* 6. Cancel Payment Modal */}
            {cancellingPaymentId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-bg-card border border-border-subtle rounded-2xl w-full max-w-md flex flex-col overflow-hidden shadow-2xl animate-modal-entrance">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle shrink-0">
                            <h2 className="text-base font-bold text-red-500 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5" /> Cancel Payment Record
                            </h2>
                            <button 
                                onClick={() => setCancellingPaymentId(null)}
                                className="btn btn-ghost btn-icon h-8 w-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary"
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
                                    className="btn btn-primary btn-md"
                                >
                                    Close
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingCancel}
                                    className="btn btn-danger btn-md"
                                >
                                    {submittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 7. Edit Invoice Details Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-bg-card border border-border-subtle rounded-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden shadow-2xl animate-modal-entrance">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle shrink-0">
                            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                <Edit3 className="w-5 h-5 text-blue-600" /> Edit Invoice Details
                            </h2>
                            <button 
                                onClick={() => setIsEditModalOpen(false)}
                                className="btn btn-ghost btn-icon h-8 w-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

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
                                        <label className="block text-xs font-semibold text-text-muted mb-1">Payment Terms / Remarks</label>
                                        <textarea
                                            rows={2}
                                            placeholder="e.g. Payment within 30 days"
                                            value={editForm.paymentTerms}
                                            onChange={(e) => setEditForm({ ...editForm, paymentTerms: e.target.value })}
                                            className="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand-primary resize-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-subtle bg-bg-card shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="btn btn-secondary btn-md"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingEdit}
                                    className="btn btn-primary btn-md"
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
