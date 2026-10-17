import React, { useState, useEffect, useRef } from 'react';
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
    reconcileInvoice,
    getCompanySettings,
    getCompanyBankAccounts,
    getInvoicePdf,
    sendInvoiceEmail,
    getSettlementReceiptPdf,
    sendSettlementEmail
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { useToast } from '../context/ToastContext';
import { 
    ArrowLeft, Clock, CheckCircle, FileText, Download, Edit3, X, CreditCard, 
    Plus, AlertCircle, RefreshCw, Mail, Link as LinkIcon, Copy, ExternalLink, 
    Eye, Trash2, User, Truck, Receipt, Landmark, ShieldCheck, MessageSquare, Calendar, Coins,
    QrCode, Share2, Building2
} from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import ActivityTimelineDrawer from '../components/ActivityTimelineDrawer';
import PayViaQrModal from '../components/PayViaQrModal';
import RecordPaymentModal from '../components/RecordPaymentModal';
import SendPaymentLinkModal from '../components/SendPaymentLinkModal';

export default function InvoiceDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { tenant } = useTenant();
    const { showToast } = useToast();
    
    const [invoice, setInvoice] = useState(null);
    const [companySettings, setCompanySettings] = useState(null);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [isTimelineOpen, setIsTimelineOpen] = useState(false);
    const [downloadingSettlement, setDownloadingSettlement] = useState(false);
    const [sendingSettlementEmail, setSendingSettlementEmail] = useState(false);

    // Dynamic height sync: Match TERMS & CONDITIONS card height to BANK DETAILS card
    const bankDetailsCardRef = useRef(null);
    const [bankCardHeight, setBankCardHeight] = useState(null);

    useEffect(() => {
        if (!bankDetailsCardRef.current) return;
        const updateHeight = () => {
            if (bankDetailsCardRef.current) {
                setBankCardHeight(bankDetailsCardRef.current.offsetHeight);
            }
        };
        updateHeight();
        const ro = new ResizeObserver(updateHeight);
        ro.observe(bankDetailsCardRef.current);
        return () => ro.disconnect();
    }, [bankAccounts, companySettings, invoice]);

    // PDF Preview Modal state
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState(null);

    // Confirmation Modals state (no native window.confirm)
    const [isIssueConfirmOpen, setIsIssueConfirmOpen] = useState(false);
    const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
    const [isConvertConfirmOpen, setIsConvertConfirmOpen] = useState(false);

    // Pay via QR Modal state
    const [isPayViaQrModalOpen, setIsPayViaQrModalOpen] = useState(false);
    const [reconciling, setReconciling] = useState(false);

    // Record Payment Modal state
    const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);

    // Send Payment Link Modal state
    const [isSendPaymentLinkModalOpen, setIsSendPaymentLinkModalOpen] = useState(false);

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
        clientShippingAddress: '',
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
            const [invoiceData, settingsData, bankAccountsData] = await Promise.all([
                getInvoiceById(id),
                getCompanySettings().catch(err => {
                    console.warn('Could not load company settings', err);
                    return null;
                }),
                getCompanyBankAccounts().catch(err => {
                    console.warn('Could not load bank accounts', err);
                    return [];
                })
            ]);

            setInvoice(invoiceData);
            if (settingsData) {
                setCompanySettings(settingsData);
            }
            if (bankAccountsData) {
                const list = Array.isArray(bankAccountsData) ? bankAccountsData : (bankAccountsData?.content || []);
                setBankAccounts(list);
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

    // --- DOWNLOAD SETTLEMENT STATEMENT PDF ---
    const handleDownloadSettlementPdf = async () => {
        try {
            setDownloadingSettlement(true);
            const response = await getSettlementReceiptPdf(id);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `SETTLEMENT_STATEMENT_${invoice?.invoiceNumber || id}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showToast('success', 'Payment Settlement Statement downloaded successfully.');
        } catch (err) {
            console.error('Failed to download settlement statement', err);
            showToast('error', err.message || 'Could not download Settlement Statement PDF.');
        } finally {
            setDownloadingSettlement(false);
        }
    };

    // --- SEND SETTLEMENT CLEARANCE EMAIL ---
    const handleSendSettlementEmail = async () => {
        try {
            setSendingSettlementEmail(true);
            await sendSettlementEmail(id);
            showToast('success', `Payment clearance statement sent to ${invoice?.clientEmail || 'client'}.`);
        } catch (err) {
            console.error('Failed to send settlement clearance email', err);
            showToast('error', err.message || 'Failed to send settlement clearance email.');
        } finally {
            setSendingSettlementEmail(false);
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

    // --- MODAL HANDLERS WITH MUTUAL EXCLUSION ---
    const handleOpenPayViaQrModal = () => {
        setIsRecordPaymentModalOpen(false);
        setIsSendPaymentLinkModalOpen(false);
        setIsPayViaQrModalOpen(true);
    };

    const handleOpenRecordPaymentModal = () => {
        setIsPayViaQrModalOpen(false);
        setIsSendPaymentLinkModalOpen(false);
        setIsRecordPaymentModalOpen(true);
    };

    const handleOpenSendPaymentLinkModal = async () => {
        setIsPayViaQrModalOpen(false);
        setIsRecordPaymentModalOpen(false);
        if (!invoice?.publicToken && !invoice?.paymentLinkUrl) {
            try {
                setActionLoading(true);
                await generatePaymentLink(id);
                await fetchInvoice();
            } catch (err) {
                console.error('Failed to generate payment link', err);
            } finally {
                setActionLoading(false);
            }
        }
        setIsSendPaymentLinkModalOpen(true);
    };

    // --- PAYMENT GATEWAY / LINK ---
    const handleCreatePaymentLink = async () => {
        try {
            setActionLoading(true);
            await generatePaymentLink(id);
            showToast('success', 'Self-hosted payment link generated successfully.');
            await fetchInvoice();
            handleOpenSendPaymentLinkModal();
        } catch (err) {
            console.error('Failed to generate payment link', err);
            showToast('error', err.message || 'Failed to generate payment link.');
        } finally {
            setActionLoading(false);
        }
    };

    const copyPaymentLink = () => {
        const link = invoice?.paymentLinkUrl || (invoice?.publicToken ? `/pay/invoice/${invoice.publicToken}` : null);
        if (link) {
            const fullUrl = link.startsWith('http') ? link : `${window.location.origin}${link}`;
            navigator.clipboard.writeText(fullUrl);
            showToast('success', 'Payment link copied to clipboard.');
        }
    };

    const handleReconcilePayments = async () => {
        try {
            setReconciling(true);
            await reconcileInvoice(id);
            showToast('success', 'Invoice payment reconciliation completed.');
            await fetchInvoice();
        } catch (err) {
            console.error('Failed to reconcile invoice payments', err);
            showToast('error', err.message || 'Failed to reconcile invoice payments.');
        } finally {
            setReconciling(false);
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
            clientShippingAddress: invoice.clientShippingAddress || '',
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
    const isFullyPaid = invoice.status === 'PAID' || Number(invoice.balanceDue || 0) <= 0.001;
    const isRecordPaymentEligible = isSuperAdmin && invoice.invoiceType === 'TAX_INVOICE' && (invoice.status === 'ISSUED' || invoice.status === 'PARTIALLY_PAID');
    const currencySymbol = invoice.currency === 'USD' ? '$' : (invoice.currency === 'EUR' ? '€' : (invoice.currency === 'GBP' ? '£' : (invoice.currency === 'AED' ? 'AED' : (tenant?.currencySymbol || '₹'))));

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
    const activeBank = bankAccounts?.find(b => b.isDefault) || bankAccounts?.[0];
    const bankDetails = {
        bankName: activeBank?.bankName || ((companySettings && companySettings.bankName) ? companySettings.bankName : 'HDFC Bank'),
        accountHolder: activeBank?.accountHolder || ((companySettings && companySettings.legalName) ? companySettings.legalName : ((companySettings && companySettings.companyName) ? companySettings.companyName : (tenant?.companyName || 'Acrovix Innovations'))),
        accountNumber: activeBank?.bankAccountNumber || ((companySettings && companySettings.bankAccountNumber) ? companySettings.bankAccountNumber : '50200001245678'),
        ifsc: activeBank?.bankIfsc || ((companySettings && companySettings.bankIfsc) ? companySettings.bankIfsc : 'HDFC0001234'),
        branch: activeBank?.bankBranch || ((companySettings && companySettings.bankBranch) ? companySettings.bankBranch : 'Koramangala, Bengaluru'),
        upiId: activeBank?.upiId || activeBank?.upiVpa || companySettings?.upiId || ''
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
        `In case of delay or non-compliance, ${tenant?.brandName || 'the company'} reserves the right to take appropriate action.`,
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
                        id="invoice-activity-timeline-btn"
                        type="button"
                        onClick={() => setIsTimelineOpen(true)}
                        className="h-[38px] px-3.5 rounded-xl border border-border-subtle bg-white dark:bg-bg-card text-text-primary hover:bg-slate-50 dark:hover:bg-bg-hover text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-all"
                        title="View chronological activity and audit history"
                    >
                        <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <span>Activity History</span>
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
                        <div className="min-w-0 flex-1">
                            <div className="text-[11px] text-text-muted font-medium">Invoice No.</div>
                            <div className="text-xs md:text-sm font-bold text-text-primary break-all font-mono leading-tight">
                                {invoice.invoiceNumber || 'INV-DRAFT'}
                            </div>
                        </div>
                    </div>

                    {/* 2. Invoice Date */}
                    <div className="flex items-center gap-3 px-3 pt-2 lg:pt-0">
                        <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/40 border border-[#DBEAFE] dark:border-blue-800/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
                            <Calendar className="w-5 h-5 text-[#2563EB] dark:text-blue-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-[11px] text-text-muted font-medium">Invoice Date</div>
                            <div className="text-xs md:text-sm font-bold text-text-primary whitespace-nowrap leading-tight">
                                {formatDate(invoice.invoiceDate)}
                            </div>
                        </div>
                    </div>

                    {/* 3. PO Number */}
                    <div className="flex items-center gap-3 px-3 pt-2 lg:pt-0">
                        <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/40 border border-[#DBEAFE] dark:border-blue-800/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-[#2563EB] dark:text-blue-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-[11px] text-text-muted font-medium">PO Number</div>
                            <div className="text-xs md:text-sm font-bold text-text-primary break-all font-mono leading-tight">
                                {invoice.poNumber || 'N/A'}
                            </div>
                        </div>
                    </div>

                    {/* 4. PO Date */}
                    <div className="flex items-center gap-3 px-3 pt-2 lg:pt-0">
                        <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/40 border border-[#DBEAFE] dark:border-blue-800/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
                            <Calendar className="w-5 h-5 text-[#2563EB] dark:text-blue-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-[11px] text-text-muted font-medium">PO Date</div>
                            <div className="text-xs md:text-sm font-bold text-text-primary whitespace-nowrap leading-tight">
                                {formatDate(invoice.poDate)}
                            </div>
                        </div>
                    </div>

                    {/* 5. Due Date */}
                    <div className="flex items-center gap-3 px-3 pt-2 lg:pt-0">
                        <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/40 border border-[#DBEAFE] dark:border-blue-800/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
                            <Calendar className="w-5 h-5 text-[#2563EB] dark:text-blue-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-[11px] text-text-muted font-medium">Due Date</div>
                            <div className="text-xs md:text-sm font-bold text-text-primary whitespace-nowrap leading-tight">
                                {formatDate(invoice.dueDate)}{calculateDuePeriod()}
                            </div>
                        </div>
                    </div>

                    {/* 6. Currency */}
                    <div className="flex items-center gap-3 px-3 pt-2 lg:pt-0">
                        <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/40 border border-[#DBEAFE] dark:border-blue-800/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
                            <Coins className="w-5 h-5 text-[#2563EB] dark:text-blue-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-[11px] text-text-muted font-medium">Currency</div>
                            <div className="text-xs md:text-sm font-bold text-text-primary whitespace-nowrap font-mono leading-tight">
                                {invoice.currency ? `${invoice.currency} (${currencySymbol})` : `${tenant?.currencyCode || 'INR'} (${currencySymbol})`}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Exactly TWO Balanced Party Information Cards: BILL TO (Left 50%) & DELIVER TO (Right 50%) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Card 1: BILL TO (Left 50%) - Strictly CompanySettings / Active Tenant */}
                <div className="bg-white dark:bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B192C] dark:text-text-primary">
                                BILL TO
                            </h3>
                        </div>
                        <h4 className="font-bold text-sm text-text-primary mb-1">
                            {companySettings?.companyName || tenant?.companyName || 'Acrovix Innovations'}
                        </h4>
                        <p className="text-xs text-text-muted leading-relaxed mb-4 whitespace-pre-line">
                            {companySettings?.registeredAddress || tenant?.address || ''}
                        </p>
                    </div>
                    <div className="space-y-1.5 text-xs pt-3 border-t border-border-subtle/60">
                        <div className="flex">
                            <span className="w-28 text-text-muted shrink-0">GSTIN</span>
                            <span className="text-text-muted mr-2">:</span>
                            <span className="font-semibold text-text-primary uppercase truncate">{companySettings?.gstin || ''}</span>
                        </div>
                        <div className="flex">
                            <span className="w-28 text-text-muted shrink-0">PAN / CIN</span>
                            <span className="text-text-muted mr-2">:</span>
                            <span className="font-medium text-text-primary uppercase truncate">{companySettings?.cin || companySettings?.pan || ''}</span>
                        </div>
                        <div className="flex">
                            <span className="w-28 text-text-muted shrink-0">Official Email</span>
                            <span className="text-text-muted mr-2">:</span>
                            <span className="text-text-secondary truncate">{companySettings?.email || tenant?.email || ''}</span>
                        </div>
                        <div className="flex">
                            <span className="w-28 text-text-muted shrink-0">Phone</span>
                            <span className="text-text-muted mr-2">:</span>
                            <span className="text-text-secondary truncate">{companySettings?.phone || tenant?.phone || ''}</span>
                        </div>
                    </div>
                </div>

                {/* Card 2: DELIVER TO (Right 50%) - Strictly Invoice Customer / Client Delivery */}
                <div className="bg-white dark:bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B192C] dark:text-text-primary">
                                DELIVER TO
                            </h3>
                        </div>
                        <h4 className="font-bold text-sm text-text-primary mb-1">
                            {invoice?.customerName || invoice?.clientName || ''} {invoice?.companyName || invoice?.clientCompany ? `(${invoice?.companyName || invoice?.clientCompany})` : ''}
                        </h4>
                        <p className="text-xs text-text-muted leading-relaxed mb-4 whitespace-pre-line">
                            {invoice?.shippingAddress || invoice?.deliveryAddress || invoice?.clientShippingAddress || invoice?.billingAddress || invoice?.clientAddress || ''}
                        </p>
                    </div>
                    <div className="space-y-1.5 text-xs pt-3 border-t border-border-subtle/60">
                        <div className="flex">
                            <span className="w-28 text-text-muted shrink-0">Contact Person</span>
                            <span className="text-text-muted mr-2">:</span>
                            <span className="font-medium text-text-primary truncate">Attn: {invoice?.contactPerson || invoice?.clientContactPerson || invoice?.clientName || ''}</span>
                        </div>
                        <div className="flex">
                            <span className="w-28 text-text-muted shrink-0">Phone</span>
                            <span className="text-text-muted mr-2">:</span>
                            <span className="text-text-secondary truncate">{invoice?.customerPhone || invoice?.phone || invoice?.clientPhone || ''}</span>
                        </div>
                        <div className="flex">
                            <span className="w-28 text-text-muted shrink-0">Client Email</span>
                            <span className="text-text-muted mr-2">:</span>
                            <span className="text-text-secondary truncate">{invoice?.customerEmail || invoice?.email || invoice?.clientEmail || ''}</span>
                        </div>
                        {invoice?.clientGstin && (
                            <div className="flex">
                                <span className="w-28 text-text-muted shrink-0">Client GSTIN</span>
                                <span className="text-text-muted mr-2">:</span>
                                <span className="font-semibold text-text-primary uppercase truncate">{invoice.clientGstin}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Section: Two-Column Composition */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 items-start">
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
                    <div ref={bankDetailsCardRef} className="bg-white dark:bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm">
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

                {/* Right (1 Column): INVOICE SUMMARY & TERMS & CONDITIONS */}
                <div className="lg:col-span-1 space-y-6">
                    {/* INVOICE SUMMARY Card */}
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

                    {/* TERMS & CONDITIONS Card (Dynamically matched in height to Bank Details card with scrollable clauses) */}
                    <div 
                        style={bankCardHeight ? { height: `${bankCardHeight}px` } : { minHeight: '175px' }}
                        className="bg-white dark:bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm flex flex-col justify-between"
                    >
                        <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B192C] dark:text-text-primary">
                                    TERMS &amp; CONDITIONS
                                </h3>
                            </div>
                            {termsList.length > 0 && (
                                <span className="text-[10px] text-text-muted font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                    {termsList.length} {termsList.length === 1 ? 'point' : 'points'}
                                </span>
                            )}
                        </div>

                        {/* Scrollable Terms Content */}
                        <div className="space-y-2.5 text-xs text-text-secondary overflow-y-auto pr-1.5 flex-1 min-h-0">
                            {termsList.map((term, index) => (
                                <div key={index} className="flex items-start gap-2.5 group">
                                    <span className="w-5 h-5 rounded-full border border-blue-500 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 bg-blue-50/50 dark:bg-blue-950/20">
                                        {index + 1}
                                    </span>
                                    <span className="leading-relaxed text-text-secondary group-hover:text-text-primary transition-colors">
                                        {term}
                                    </span>
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
                            {!isFullyPaid ? (
                                <>
                                    {/* Instant Pay via QR Modal Button */}
                                    <button
                                        type="button"
                                        onClick={handleOpenPayViaQrModal}
                                        className="btn btn-secondary btn-sm border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-1.5 shadow-sm"
                                        title="Open Instant Pay via QR code modal"
                                    >
                                        <QrCode className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                        <span>Pay via QR</span>
                                    </button>

                                    {/* Enterprise Generate & Share Payment Link Modal Button */}
                                    <button
                                        type="button"
                                        onClick={handleOpenSendPaymentLinkModal}
                                        className="btn btn-secondary btn-sm border-border-subtle hover:bg-blue-500/5 text-text-primary flex items-center gap-1.5 shadow-sm"
                                        title="Generate, copy, and share public payment portal via WhatsApp or Email"
                                    >
                                        <Share2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                        <span>Payment Link</span>
                                    </button>
                                    
                                    {isSuperAdmin && (
                                        <button 
                                            type="button"
                                            onClick={handleOpenRecordPaymentModal}
                                            className="btn btn-success btn-sm flex items-center gap-1.5"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> 
                                            <span>Record Payment</span>
                                        </button>
                                    )}
                                </>
                            ) : (
                                <>
                                    {/* Enterprise Action 1: Download Settlement Statement (PDF) */}
                                    <button
                                        type="button"
                                        onClick={handleDownloadSettlementPdf}
                                        disabled={downloadingSettlement}
                                        className="btn btn-secondary btn-sm border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-1.5 shadow-sm"
                                        title="Download official A4 Payment Settlement Certificate & Ledger Statement PDF"
                                    >
                                        {downloadingSettlement ? (
                                            <span className="animate-spin w-3.5 h-3.5 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full"></span>
                                        ) : (
                                            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                        )}
                                        <span>Download Settlement Statement (PDF)</span>
                                    </button>

                                    {/* Enterprise Action 2: Send Paid Clearance to Client */}
                                    <button
                                        type="button"
                                        onClick={handleSendSettlementEmail}
                                        disabled={sendingSettlementEmail}
                                        className="btn btn-success btn-sm flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                        title={`Send official Payment Settlement & Clearance Statement to ${invoice.clientEmail || 'client'}`}
                                    >
                                        {sendingSettlementEmail ? (
                                            <span className="animate-spin w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full"></span>
                                        ) : (
                                            <CheckCircle className="w-3.5 h-3.5 text-white" />
                                        )}
                                        <span>Send Paid Clearance to Client</span>
                                    </button>

                                    {/* Edge-case secondary Record Payment link */}
                                    {isSuperAdmin && (
                                        <button 
                                            type="button"
                                            onClick={handleOpenRecordPaymentModal}
                                            className="text-xs text-text-muted hover:text-text-primary underline underline-offset-2 px-2 py-1 transition-colors"
                                            title="Record edge-case overpayment or adjustment"
                                        >
                                            + Record Payment
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Settlement Badge / Banner when fully paid */}
                    {isFullyPaid && (
                        <div className="mb-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-300 shadow-xs">
                            <div className="flex items-center gap-2 font-medium">
                                <span className="text-base leading-none">✅</span>
                                <span>
                                    Account Settled: All dues ({formatCurrency(invoice.grandTotal || 0, invoice.currency, 2)}) have been cleared and reconciled by {user?.fullName || user?.name || 'Admin'}.
                                </span>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300/50 dark:border-emerald-700/50 shrink-0">
                                Zero Dues
                            </span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="p-4 bg-bg-main rounded-xl border border-border-subtle">
                            <div className="text-xs text-text-muted font-medium mb-1">Grand Total</div>
                            <div className="text-lg font-bold text-text-primary whitespace-nowrap font-mono tabular-nums tracking-tight">
                                {formatCurrency(invoice.grandTotal || 0, invoice.currency, 2)}
                            </div>
                        </div>
                        <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">Amount Received</div>
                            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap font-mono tabular-nums tracking-tight">
                                {formatCurrency(invoice.amountPaid || 0, invoice.currency, 2)}
                            </div>
                        </div>
                        <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/20">
                            <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">Balance Due</div>
                            <div className="text-lg font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap font-mono tabular-nums tracking-tight">
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
                                <span className="font-semibold">{invoice.status}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment History Table */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">Payment History</h4>
                                <span className="text-xs text-text-muted">({payments.length} {payments.length === 1 ? 'Record' : 'Records'})</span>
                            </div>
                            <button
                                type="button"
                                onClick={handleReconcilePayments}
                                disabled={reconciling}
                                className="px-2.5 py-1 text-xs font-semibold text-text-muted hover:text-blue-600 hover:bg-blue-500/10 rounded-lg inline-flex items-center gap-1.5 transition-colors border border-border-subtle"
                                title="Reconcile and synchronize invoice payment balances"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${reconciling ? 'animate-spin text-blue-600' : ''}`} />
                                <span>{reconciling ? 'Reconciling...' : 'Reconcile'}</span>
                            </button>
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
            <Modal
                isOpen={isPreviewModalOpen}
                onClose={handleClosePreviewModal}
                title={`Tax Invoice PDF Preview — ${invoice?.invoiceNumber || 'DRAFT'}`}
                icon={Eye}
                size="2xl"
                headerActions={
                    <button 
                        type="button"
                        onClick={handleDownloadPdf}
                        className="btn btn-primary btn-sm flex items-center gap-1.5"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                    </button>
                }
                bodyClassName="p-0 overflow-hidden"
            >
                <div className="h-[75vh] w-full bg-slate-100 dark:bg-slate-900 p-3 flex items-center justify-center">
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
            </Modal>

            {/* 2. Issue Invoice Confirmation */}
            <ConfirmDialog
                isOpen={isIssueConfirmOpen}
                onClose={() => setIsIssueConfirmOpen(false)}
                onConfirm={handleIssueConfirm}
                title="Issue Invoice?"
                message="Are you sure you want to issue this Invoice? This will lock line items and assign the authoritative sequential tax invoice number. This action cannot be undone."
                confirmText="Confirm & Issue"
                type="primary"
                isLoading={actionLoading}
            />

            {/* 3. Cancel Invoice Confirmation */}
            <ConfirmDialog
                isOpen={isCancelConfirmOpen}
                onClose={() => setIsCancelConfirmOpen(false)}
                onConfirm={handleCancelConfirm}
                title="Cancel Invoice?"
                message="Are you sure you want to cancel this Invoice? The invoice status will be marked as CANCELLED and any ledger balance will be updated accordingly."
                confirmText="Confirm Cancellation"
                type="danger"
                isLoading={actionLoading}
            />

            {/* 4. Convert Proforma Confirmation */}
            <ConfirmDialog
                isOpen={isConvertConfirmOpen}
                onClose={() => setIsConvertConfirmOpen(false)}
                onConfirm={handleConvertToTaxInvoiceConfirm}
                title="Convert to Tax Invoice?"
                message="Are you sure you want to convert this Proforma Invoice to a full Tax Invoice? A new sequential Tax Invoice will be created from this proforma."
                confirmText="Convert to Tax Invoice"
                type="primary"
                isLoading={actionLoading}
            />

            {/* 5. Record Payment Modal */}
            <RecordPaymentModal
                isOpen={isRecordPaymentModalOpen}
                onClose={() => setIsRecordPaymentModalOpen(false)}
                invoice={invoice}
                onSuccess={fetchInvoice}
                showToast={showToast}
            />

            {/* Pay via QR Modal */}
            <PayViaQrModal
                isOpen={isPayViaQrModalOpen}
                onClose={() => setIsPayViaQrModalOpen(false)}
                invoice={invoice}
                tenant={tenant}
                bankAccounts={bankAccounts}
                bankDetails={{
                    bankName: bankDetails.bankName,
                    accountHolder: bankDetails.accountHolder,
                    accountNumber: bankDetails.accountNumber,
                    ifsc: bankDetails.ifsc,
                    branch: bankDetails.branch,
                    upiId: bankDetails.upiId
                }}
                onRecordPaymentClick={handleOpenRecordPaymentModal}
            />

            {/* Send Payment Link Modal */}
            <SendPaymentLinkModal
                isOpen={isSendPaymentLinkModalOpen}
                onClose={() => setIsSendPaymentLinkModalOpen(false)}
                invoice={invoice}
                tenant={tenant}
                companySettings={companySettings}
                onOpenQrModal={handleOpenPayViaQrModal}
                onOpenRecordPaymentModal={handleOpenRecordPaymentModal}
                showToast={(type, msg) => showToast(type || 'success', msg)}
            />

            {/* 6. Cancel Payment Modal */}
            <Modal
                isOpen={Boolean(cancellingPaymentId)}
                onClose={() => setCancellingPaymentId(null)}
                title="Cancel Payment Record"
                subtitle="Are you sure you want to cancel this payment? The invoice balance and status will be automatically recalculated."
                icon={AlertCircle}
                iconClassName="text-red-500 bg-red-500/10 border-red-500/20"
                size="sm"
                isLoading={submittingCancel}
                footer={
                    <div className="flex items-center justify-end gap-3 w-full">
                        <button
                            type="button"
                            onClick={() => setCancellingPaymentId(null)}
                            disabled={submittingCancel}
                            className="btn btn-secondary btn-md"
                        >
                            Close
                        </button>
                        <button
                            type="submit"
                            form="cancel-invoice-payment-form"
                            disabled={submittingCancel || !cancelReason.trim()}
                            className="btn btn-danger btn-md"
                        >
                            {submittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
                        </button>
                    </div>
                }
            >
                <form id="cancel-invoice-payment-form" onSubmit={handleCancelPaymentSubmit} className="space-y-4">
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
                </form>
            </Modal>

            {/* 7. Edit Invoice Details Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Invoice Details"
                subtitle="Modify client billing information, place of supply, or invoice schedule."
                icon={Edit3}
                size="xl"
                isLoading={savingEdit}
                footer={
                    <div className="flex items-center justify-end gap-3 w-full">
                        <button
                            type="button"
                            onClick={() => setIsEditModalOpen(false)}
                            disabled={savingEdit}
                            className="btn btn-secondary btn-md"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="edit-invoice-form"
                            disabled={savingEdit}
                            className="btn btn-primary btn-md"
                        >
                            {savingEdit ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                }
            >
                <form id="edit-invoice-form" onSubmit={handleSaveEdit} className="space-y-4">
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
                            <label className="block text-xs font-semibold text-text-muted mb-1">Billing Address</label>
                            <textarea
                                rows={2}
                                value={editForm.clientAddress}
                                onChange={(e) => setEditForm({ ...editForm, clientAddress: e.target.value })}
                                className="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand-primary resize-none"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-text-muted mb-1">Shipping / Delivery Address (Optional, defaults to Billing Address if empty)</label>
                            <textarea
                                rows={2}
                                placeholder="Leave empty if same as Billing Address"
                                value={editForm.clientShippingAddress}
                                onChange={(e) => setEditForm({ ...editForm, clientShippingAddress: e.target.value })}
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
                </form>
            </Modal>

            {invoice && (
                <ActivityTimelineDrawer
                    isOpen={isTimelineOpen}
                    onClose={() => setIsTimelineOpen(false)}
                    entityType="INVOICE"
                    entityId={invoice.id}
                    entityTitle={invoice.invoiceNumber || (invoice.id ? `Invoice #${invoice.id}` : 'Invoice')}
                />
            )}
        </div>
    );
}
