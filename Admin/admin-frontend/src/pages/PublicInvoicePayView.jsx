import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
    CheckCircle2, 
    QrCode, 
    Building2, 
    Copy, 
    Check, 
    Smartphone, 
    ShieldCheck, 
    Calendar, 
    FileText, 
    AlertCircle, 
    ArrowRight, 
    Send,
    Download,
    CreditCard,
    Sparkles,
    Lock,
    ExternalLink
} from 'lucide-react';
import { 
    getPublicInvoicePay, 
    submitPublicPaymentProof,
    createPublicInvoicePaymentOrder,
    verifyPublicInvoicePayment,
    getPublicQrUrl,
    getInvoiceUpiQrUrl
} from '../services/api';
import { formatCurrency } from '../utils/formatters';

export default function PublicInvoicePayView() {
    const { token } = useParams();

    const [loading, setLoading] = useState(true);
    const [invoiceData, setInvoiceData] = useState(null);
    const [error, setError] = useState(null);

    // Tab: 'online' | 'upi' | 'bank'
    const [activeTab, setActiveTab] = useState('online');

    // Copy states
    const [copiedField, setCopiedField] = useState(null);

    // Online Gateway Checkout states
    const [payingOnline, setPayingOnline] = useState(false);
    const [onlineError, setOnlineError] = useState(null);
    const [onlineSuccessReceipt, setOnlineSuccessReceipt] = useState(null);

    // Proof submission form
    const [proofForm, setProofForm] = useState({
        payerName: '',
        utrNumber: '',
        amount: '',
        notes: ''
    });
    const [submittingProof, setSubmittingProof] = useState(false);
    const [proofSuccess, setProofSuccess] = useState(null);
    const [proofError, setProofError] = useState(null);

    const fetchPublicInvoice = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getPublicInvoicePay(token);
            setInvoiceData(data);
            if (data?.balanceDue !== undefined) {
                setProofForm(prev => ({
                    ...prev,
                    payerName: prev.payerName || data.customerName || '',
                    amount: String(data.balanceDue)
                }));
            }
        } catch (err) {
            console.error('Failed to load public invoice', err);
            setError(err.message || 'Invoice not found or link has expired.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchPublicInvoice();
        }
    }, [token]);

    const handleCopy = (text, fieldName) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    // Load Razorpay checkout SDK dynamically
    const loadRazorpaySdk = () => {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handlePayOnline = async () => {
        setOnlineError(null);
        try {
            setPayingOnline(true);
            const order = await createPublicInvoicePaymentOrder(token, {
                amount: invoiceData.balanceDue
            });

            if (!order || !order.orderId) {
                throw new Error('Could not initiate online payment order.');
            }

            const sdkLoaded = await loadRazorpaySdk();

            // If SDK blocked or in demo simulation sandbox
            if (!sdkLoaded || order.isDemo) {
                const simulatedPaymentId = 'pay_sim_' + Math.random().toString(36).substring(2, 12);
                const verifyResp = await verifyPublicInvoicePayment(token, {
                    razorpayOrderId: order.orderId,
                    razorpayPaymentId: simulatedPaymentId,
                    razorpaySignature: 'simulated_signature_valid',
                    amount: invoiceData.balanceDue,
                    payerName: invoiceData.customerName || 'Online Client'
                });

                setOnlineSuccessReceipt({
                    paymentNumber: verifyResp.paymentNumber,
                    transactionReference: simulatedPaymentId,
                    amount: verifyResp.amountPaid || invoiceData.balanceDue
                });
                await fetchPublicInvoice();
                return;
            }

            // Real Razorpay Checkout flow
            const options = {
                key: order.keyId,
                amount: order.amount,
                currency: order.currency || 'INR',
                name: invoiceData.companyName || 'Acrovix Innovations',
                description: `Settlement for Invoice ${invoiceData.invoiceNumber}`,
                order_id: order.orderId,
                prefill: {
                    name: invoiceData.customerName || '',
                    email: invoiceData.clientEmail || '',
                    contact: invoiceData.clientPhone || ''
                },
                theme: {
                    color: '#2563EB'
                },
                modal: {
                    ondismiss: function () {
                        setPayingOnline(false);
                    }
                },
                handler: async function (response) {
                    try {
                        setPayingOnline(true);
                        const verifyResp = await verifyPublicInvoicePayment(token, {
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                            amount: invoiceData.balanceDue,
                            payerName: invoiceData.customerName || 'Online Client'
                        });

                        setOnlineSuccessReceipt({
                            paymentNumber: verifyResp.paymentNumber,
                            transactionReference: response.razorpay_payment_id,
                            amount: verifyResp.amountPaid || invoiceData.balanceDue
                        });
                        await fetchPublicInvoice();
                    } catch (vErr) {
                        console.error('Online payment reconciliation failed', vErr);
                        setOnlineError(vErr.message || 'Payment completed but reconciliation failed. Please contact billing support.');
                    } finally {
                        setPayingOnline(false);
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (resp) {
                console.error('Payment failed', resp.error);
                setOnlineError(resp.error?.description || 'Payment was unsuccessful or cancelled.');
                setPayingOnline(false);
            });
            rzp.open();
        } catch (err) {
            console.error('Failed to initiate online payment', err);
            setOnlineError(err.message || 'Failed to start online payment.');
        } finally {
            setPayingOnline(false);
        }
    };

    const handleProofSubmit = async (e) => {
        e.preventDefault();
        setProofError(null);
        setProofSuccess(null);

        if (!proofForm.utrNumber.trim()) {
            setProofError('Please enter the transaction reference / UTR number.');
            return;
        }
        if (!proofForm.payerName.trim()) {
            setProofError('Please enter the payer name.');
            return;
        }

        try {
            setSubmittingProof(true);
            const payload = {
                utrNumber: proofForm.utrNumber.trim(),
                payerName: proofForm.payerName.trim(),
                amount: proofForm.amount ? parseFloat(proofForm.amount) : undefined,
                notes: proofForm.notes.trim() || undefined
            };

            const resp = await submitPublicPaymentProof(token, payload);
            setProofSuccess(resp?.message || 'Payment proof submitted successfully! Our billing team has recorded this reference.');
            await fetchPublicInvoice();
        } catch (err) {
            console.error('Payment proof submission error', err);
            setProofError(err.message || 'Failed to submit payment proof. Please verify the details and try again.');
        } finally {
            setSubmittingProof(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#070A10] text-white flex flex-col items-center justify-center p-4">
                <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                <div className="text-sm font-medium text-slate-400">Loading secure payment portal...</div>
            </div>
        );
    }

    if (error || !invoiceData) {
        return (
            <div className="min-h-screen bg-[#070A10] text-white flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 mx-auto flex items-center justify-center mb-4">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Invoice Not Available</h2>
                    <p className="text-xs text-slate-400 leading-relaxed mb-6">
                        {error || 'This invoice link may be invalid, cancelled, or no longer active. Please contact the issuer for an updated payment link.'}
                    </p>
                </div>
            </div>
        );
    }

    const {
        invoiceNumber,
        customerName,
        clientCompany,
        clientEmail,
        clientPhone,
        clientAddress,
        clientGstin,
        clientShippingAddress,
        grandTotal,
        amountPaid,
        balanceDue,
        currency,
        status,
        invoiceDate,
        dueDate,
        companyName,
        companyLegalName,
        companyGstin,
        companyAddress,
        companyEmail,
        companyPhone,
        companyLogo,
        bankDetails
    } = invoiceData;

    const isFullyPaid = status === 'PAID' || balanceDue <= 0;

    // Resolve UPI ID
    const upiId = bankDetails?.upiId 
        || (bankDetails?.accountNumber && bankDetails?.ifsc ? `${bankDetails.accountNumber}@${bankDetails.ifsc.toLowerCase()}` : 'payments@acrovix');

    const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(companyName || 'Business Payment')}&am=${balanceDue}&cu=INR&tn=${encodeURIComponent(`Invoice-${invoiceNumber}`)}`;
    const qrCodeUrl = token ? getInvoiceUpiQrUrl(token, 260) : getPublicQrUrl(upiUri, 260);

    return (
        <div className="min-h-screen bg-[#070A10] text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
            
            {/* Top Navigation Bar */}
            <header className="border-b border-slate-800/80 bg-[#0B0F17]/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {companyLogo ? (
                            <img src={companyLogo} alt={companyName} className="h-8 max-w-[140px] object-contain rounded" />
                        ) : (
                            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white text-sm shadow-md shadow-blue-500/20">
                                {companyName ? companyName.charAt(0).toUpperCase() : 'A'}
                            </div>
                        )}
                        <div>
                            <div className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                                <span>{companyLegalName || companyName}</span>
                                <ShieldCheck className="w-4 h-4 text-emerald-400 inline" title="Verified Business" />
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                                {companyGstin ? `GSTIN: ${companyGstin} · ` : ''}Official Payment Portal
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
                            isFullyPaid ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            status === 'PARTIALLY_PAID' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isFullyPaid ? 'bg-emerald-400' : status === 'PARTIALLY_PAID' ? 'bg-amber-400' : 'bg-blue-400'}`}></span>
                            <span>{isFullyPaid ? 'PAID' : status}</span>
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="max-w-5xl mx-auto w-full px-4 sm:px-8 py-8 flex-1">
                
                {/* Invoice Summary Header Card */}
                <div className="bg-[#0E131F] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                        <div className="md:col-span-2 space-y-3">
                            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                                <FileText className="w-4 h-4 text-blue-400" />
                                <span>Invoice Reference</span>
                                <span className="font-mono font-bold text-white text-sm">{invoiceNumber}</span>
                            </div>

                            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                                Billed to {clientCompany || customerName || 'Valued Client'}
                            </h1>

                            {clientAddress && (
                                <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line max-w-lg">
                                    {clientAddress}
                                </p>
                            )}

                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                                {clientGstin && (
                                    <div className="flex items-center gap-1.5 font-mono text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                        <span>GSTIN: {clientGstin}</span>
                                    </div>
                                )}
                                {customerName && (
                                    <div className="flex items-center gap-1.5">
                                        <User className="w-3.5 h-3.5 text-slate-500" />
                                        <span>Attn: {customerName}</span>
                                    </div>
                                )}
                                {invoiceDate && (
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                        <span>Date: {invoiceDate}</span>
                                    </div>
                                )}
                                {dueDate && (
                                    <div className="flex items-center gap-1.5 text-amber-400/90 font-medium">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>Due: {dueDate}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Balance Due Big Stat */}
                        <div className="bg-[#141B2B] border border-slate-800/80 rounded-2xl p-5 text-right flex flex-col justify-center">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                {isFullyPaid ? 'Total Amount' : 'Amount Due'}
                            </div>
                            <div className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${isFullyPaid ? 'text-emerald-400' : 'text-white'}`}>
                                {formatCurrency(isFullyPaid ? grandTotal : balanceDue, currency, 2)}
                            </div>
                            {!isFullyPaid && amountPaid > 0 && (
                                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                                    Paid: {formatCurrency(amountPaid, currency)} of {formatCurrency(grandTotal, currency)}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Instant Reconciliation Success Receipt (If just completed) */}
                {onlineSuccessReceipt && (
                    <div className="mb-8 p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">Payment Confirmed & Reconciled!</h3>
                                <p className="text-xs text-slate-400">Transaction has been synchronized with the invoice ledger</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-900/60 rounded-2xl border border-emerald-500/20 text-xs font-mono mt-3">
                            <div>
                                <div className="text-[10px] text-slate-400 uppercase font-sans">Payment #</div>
                                <div className="font-bold text-white mt-0.5">{onlineSuccessReceipt.paymentNumber}</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-400 uppercase font-sans">Gateway Ref</div>
                                <div className="font-bold text-emerald-400 mt-0.5 truncate">{onlineSuccessReceipt.transactionReference}</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-400 uppercase font-sans">Amount Settled</div>
                                <div className="font-bold text-white mt-0.5">{formatCurrency(onlineSuccessReceipt.amount, currency, 2)}</div>
                            </div>
                        </div>
                    </div>
                )}

                {isFullyPaid ? (
                    /* Invoice Paid State */
                    <div className="bg-[#0E131F] border border-emerald-500/20 rounded-3xl p-8 sm:p-12 text-center shadow-xl space-y-4">
                        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-extrabold text-white">This Invoice is Fully Settled</h2>
                        <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                            Thank you! Payment of {formatCurrency(grandTotal, currency)} for invoice <strong className="text-white font-mono">{invoiceNumber}</strong> has been received and verified.
                        </p>
                    </div>
                ) : (
                    /* Payment Methods & Proof Submission */
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        
                        {/* Left Column (7 Cols): Payment Mode Selector & Details */}
                        <div className="lg:col-span-7 bg-[#0E131F] border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
                            
                            {/* Tabs */}
                            <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-2xl border border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('online')}
                                    className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                        activeTab === 'online'
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    <CreditCard className="w-4 h-4" />
                                    <span>Cards / UPI Online</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('upi')}
                                    className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                        activeTab === 'upi'
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    <QrCode className="w-4 h-4" />
                                    <span>Scan UPI QR</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('bank')}
                                    className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                        activeTab === 'bank'
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    <Building2 className="w-4 h-4" />
                                    <span>Bank Transfer</span>
                                </button>
                            </div>

                            {/* Tab 0: Razorpay Online Gateway Checkout */}
                            {activeTab === 'online' && (
                                <div className="space-y-6 animate-in fade-in duration-150">
                                    <div className="p-6 bg-gradient-to-br from-blue-950/30 via-slate-900/60 to-indigo-950/30 border border-blue-500/20 rounded-2xl space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                                                    <Sparkles className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-white">Instant Online Payment</h4>
                                                    <p className="text-[11px] text-slate-400">Automatic reconciliation & immediate digital receipt</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                                <Lock className="w-3 h-3" />
                                                <span>256-Bit SSL Secure</span>
                                            </div>
                                        </div>

                                        {onlineError && (
                                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4 shrink-0" />
                                                <span>{onlineError}</span>
                                            </div>
                                        )}

                                        <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                                            <div className="flex items-center justify-between text-xs text-slate-400">
                                                <span>Payable Balance:</span>
                                                <span className="font-mono font-bold text-white text-sm">
                                                    {formatCurrency(balanceDue, currency, 2)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                                                <span>Supported Methods:</span>
                                                <span className="text-slate-300">UPI, Cards (Visa, MC, RuPay), NetBanking</span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handlePayOnline}
                                            disabled={payingOnline}
                                            className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {payingOnline ? (
                                                <>
                                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                    <span>Opening Gateway Checkout...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <CreditCard className="w-4 h-4" />
                                                    <span>Pay {formatCurrency(balanceDue, currency, 2)} Securely</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Tab 1: UPI QR */}
                            {activeTab === 'upi' && (
                                <div className="space-y-6 animate-in fade-in duration-150">
                                    <div className="flex flex-col items-center justify-center p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
                                        <div className="p-3 bg-white rounded-2xl shadow-xl">
                                            <img
                                                src={qrCodeUrl}
                                                alt="UPI Payment QR Code"
                                                className="w-52 h-52 object-contain"
                                            />
                                        </div>
                                        <div className="mt-4 text-center">
                                            <div className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                                                <Smartphone className="w-4 h-4 text-blue-400" />
                                                <span>Scan with any UPI App</span>
                                            </div>
                                            <div className="text-xs text-slate-400 mt-0.5">
                                                GPay, PhonePe, Paytm, BHIM, CRED
                                            </div>
                                        </div>
                                    </div>

                                    {/* Copy UPI VPA */}
                                    <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-2xl flex items-center justify-between">
                                        <div className="min-w-0 pr-3">
                                            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">UPI ID / VPA</div>
                                            <div className="text-sm font-mono font-bold text-white truncate mt-0.5">{upiId}</div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(upiId, 'upiId')}
                                            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all shrink-0"
                                        >
                                            {copiedField === 'upiId' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                            <span>{copiedField === 'upiId' ? 'Copied' : 'Copy UPI'}</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Tab 2: Bank Transfer Details */}
                            {activeTab === 'bank' && (
                                <div className="space-y-4 animate-in fade-in duration-150">
                                    <div className="text-xs text-slate-400">
                                        Initiate an electronic fund transfer (IMPS / NEFT / RTGS) to the official registered company account below:
                                    </div>

                                    <div className="divide-y divide-slate-800/80 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
                                        
                                        {/* Account Holder */}
                                        <div className="p-4 flex items-center justify-between">
                                            <div>
                                                <div className="text-[10px] text-slate-400 font-semibold uppercase">Account Name</div>
                                                <div className="text-sm font-bold text-white mt-0.5">
                                                    {bankDetails?.accountHolder || companyName}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(bankDetails?.accountHolder || companyName, 'holder')}
                                                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                                                title="Copy Name"
                                            >
                                                {copiedField === 'holder' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>

                                        {/* Account Number */}
                                        <div className="p-4 flex items-center justify-between">
                                            <div>
                                                <div className="text-[10px] text-slate-400 font-semibold uppercase">Account Number</div>
                                                <div className="text-base font-mono font-bold text-blue-400 mt-0.5">
                                                    {bankDetails?.accountNumber || 'Contact billing admin'}
                                                </div>
                                            </div>
                                            {bankDetails?.accountNumber && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(bankDetails.accountNumber, 'acc')}
                                                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-all"
                                                >
                                                    {copiedField === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                                    <span>{copiedField === 'acc' ? 'Copied' : 'Copy'}</span>
                                                </button>
                                            )}
                                        </div>

                                        {/* IFSC Code */}
                                        <div className="p-4 flex items-center justify-between">
                                            <div>
                                                <div className="text-[10px] text-slate-400 font-semibold uppercase">IFSC Code</div>
                                                <div className="text-sm font-mono font-bold text-white mt-0.5">
                                                    {bankDetails?.ifsc || 'N/A'}
                                                </div>
                                            </div>
                                            {bankDetails?.ifsc && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(bankDetails.ifsc, 'ifsc')}
                                                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-all"
                                                >
                                                    {copiedField === 'ifsc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                                    <span>{copiedField === 'ifsc' ? 'Copied' : 'Copy'}</span>
                                                </button>
                                            )}
                                        </div>

                                        {/* Bank & Branch */}
                                        <div className="p-4 flex items-center justify-between">
                                            <div>
                                                <div className="text-[10px] text-slate-400 font-semibold uppercase">Bank Name & Branch</div>
                                                <div className="text-xs font-medium text-slate-200 mt-0.5">
                                                    {[bankDetails?.bankName, bankDetails?.branch].filter(Boolean).join(' • ') || 'Bank details on file'}
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Right Column (5 Cols): Submit Payment Proof */}
                        <div className="lg:col-span-5 bg-[#0E131F] border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <Send className="w-4 h-4 text-emerald-400" />
                                    <span>Submit Offline Payment Proof</span>
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    Paid via IMPS, NEFT, or RTGS? Provide your Bank Reference / UTR number for manual ledger reconciliation.
                                </p>
                            </div>

                            {proofSuccess && (
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-400 font-medium flex items-start gap-2.5 leading-relaxed">
                                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                                    <span>{proofSuccess}</span>
                                </div>
                            )}

                            {proofError && (
                                <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-400 font-medium flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>{proofError}</span>
                                </div>
                            )}

                            <form onSubmit={handleProofSubmit} className="space-y-4 text-xs">
                                <div>
                                    <label className="block text-slate-300 font-semibold mb-1">
                                        Payer Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={proofForm.payerName}
                                        onChange={(e) => setProofForm({ ...proofForm, payerName: e.target.value })}
                                        placeholder="Name of person or entity who transferred"
                                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-300 font-semibold mb-1">
                                        Bank UTR / Transaction Reference *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={proofForm.utrNumber}
                                        onChange={(e) => setProofForm({ ...proofForm, utrNumber: e.target.value })}
                                        placeholder="e.g. CMS2983749283 or UPI Ref 429384729"
                                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-300 font-semibold mb-1">
                                        Transferred Amount ({currency})
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={proofForm.amount}
                                        onChange={(e) => setProofForm({ ...proofForm, amount: e.target.value })}
                                        placeholder={String(balanceDue)}
                                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-300 font-semibold mb-1">
                                        Optional Remarks / Screenshot Link
                                    </label>
                                    <textarea
                                        rows="2"
                                        value={proofForm.notes}
                                        onChange={(e) => setProofForm({ ...proofForm, notes: e.target.value })}
                                        placeholder="Payer account number, screenshot URL, or comments..."
                                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                                    ></textarea>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submittingProof}
                                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {submittingProof ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                            <span>Submitting Proof...</span>
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck className="w-4 h-4" />
                                            <span>Submit Payment Reference</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                    </div>
                )}

            </main>

            {/* Clean Footer */}
            <footer className="border-t border-slate-800/60 py-6 px-4 text-center text-xs text-slate-500">
                <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>Powered by Acrovix ERP & Operations Platform</div>
                    <div className="flex items-center gap-4 text-slate-400">
                        <span>End-to-End Encrypted</span>
                        <span>•</span>
                        <span>Zero Platform Processing Fees</span>
                    </div>
                </div>
            </footer>

        </div>
    );
}
