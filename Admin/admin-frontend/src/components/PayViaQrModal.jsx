import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X, QrCode, Copy, Check, ExternalLink, ShieldCheck, Smartphone, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { getPublicQrUrl, getCompanyBankAccounts } from '../services/api';

export default function PayViaQrModal({
    isOpen,
    onClose,
    invoice,
    tenant,
    bankDetails,
    bankAccounts,
    onRecordPaymentClick
}) {
    const [copiedUpi, setCopiedUpi] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [imgSrc, setImgSrc] = useState('');
    const [fetchedBankAccounts, setFetchedBankAccounts] = useState(null);

    // Prevent body scrolling behind open modal
    useEffect(() => {
        if (!isOpen) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prevOverflow;
        };
    }, [isOpen]);

    // Ensure company bank accounts are loaded if not supplied via props
    useEffect(() => {
        if (isOpen && (!bankAccounts || bankAccounts.length === 0)) {
            getCompanyBankAccounts()
                .then(data => {
                    if (Array.isArray(data) && data.length > 0) {
                        setFetchedBankAccounts(data);
                    }
                })
                .catch(err => {
                    console.debug('Failed to fetch bank accounts in PayViaQrModal:', err);
                });
        }
    }, [isOpen, bankAccounts]);

    // Active primary/default bank account & real UPI ID lookup
    const accountsList = (bankAccounts && bankAccounts.length > 0) ? bankAccounts : (fetchedBankAccounts || []);
    const activeBank = accountsList.find(b => b.isDefault) || accountsList[0] || bankDetails || {};
    const upiId = (activeBank?.upiId || activeBank?.upiVpa || bankDetails?.upiId || '').trim();
    const accountHolderName = activeBank?.accountHolderName || activeBank?.accountHolder || bankDetails?.accountHolder || tenant?.companyName || 'Acrovix Innovations';

    // Official NPCI Bharat QR Payload
    const companyName = tenant?.companyName || tenant?.brandName || 'Acrovix Innovations';
    const rawAmount = (invoice?.balanceDue && Number(invoice.balanceDue) > 0)
        ? Number(invoice.balanceDue)
        : Number(invoice?.grandTotal || 0);
    const amount = Math.max(rawAmount, 1.00).toFixed(2);
    const invNumber = invoice?.invoiceNumber || invoice?.id || 'INV';
    const invId = invoice?.id || '1';

    // Format: upi://pay?pa=${activeBank.upiId}&pn=${encodeURIComponent(tenant.companyName)}&am=${amount}&cu=INR&tn=Invoice-${invoice.invoiceNumber}&tr=INV-${invoice.id}
    const upiPayload = upiId
        ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(companyName)}&am=${amount}&cu=INR&tn=Invoice-${invNumber}&tr=INV-${invId}`
        : '';

    // Primary offline backend QR endpoint with fallback to QR server
    const primaryQrUrl = upiPayload ? getPublicQrUrl(upiPayload, 260) : '';
    const fallbackQrUrl = upiPayload ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(upiPayload)}&size=260x260` : '';

    useEffect(() => {
        if (primaryQrUrl) {
            setImgSrc(primaryQrUrl);
        } else {
            setImgSrc('');
        }
    }, [primaryQrUrl]);

    if (!isOpen || !invoice) return null;

    const balanceDue = (invoice?.balanceDue && Number(invoice.balanceDue) > 0)
        ? Number(invoice.balanceDue)
        : Number(invoice?.grandTotal || 0);

    const publicToken = invoice?.publicToken;
    const publicUrl = publicToken ? `${window.location.origin}/pay/invoice/${publicToken}` : '';

    const handleCopyUpi = () => {
        if (!upiId) return;
        navigator.clipboard.writeText(upiId);
        setCopiedUpi(true);
        setTimeout(() => setCopiedUpi(false), 2000);
    };

    const handleCopyLink = () => {
        if (!publicUrl) return;
        navigator.clipboard.writeText(publicUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
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
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <QrCode className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Pay via UPI QR</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Scan & pay instantly with any UPI app</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="py-4 space-y-4">
                    {/* Amount & Invoice Info Card */}
                    <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-purple-500/5 border border-blue-500/20 dark:border-blue-500/30 flex items-center justify-between">
                        <div>
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Outstanding Balance
                            </div>
                            <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
                                {formatCurrency(balanceDue, invoice?.currency || 'INR', 2)}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Invoice No</div>
                            <div className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">
                                {invoice?.invoiceNumber || 'INV'}
                            </div>
                        </div>
                    </div>

                    {!upiId ? (
                        <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-slate-800 dark:text-slate-200 flex flex-col gap-3.5">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0 text-amber-700 dark:text-amber-400">
                                    <AlertTriangle className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="text-[13px] font-bold text-amber-900 dark:text-amber-200">
                                        UPI ID Not Configured
                                    </h4>
                                    <p className="text-[12px] text-amber-800 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                                        No verified UPI ID is configured for your default bank account. Add your UPI ID to generate dynamic instant QR codes on all invoices.
                                    </p>
                                </div>
                            </div>
                            <div className="pt-1 flex items-center justify-end">
                                <Link
                                    to="/company-bank-details/bank-accounts"
                                    onClick={onClose}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs transition-colors"
                                >
                                    <span>⚙️ Add UPI ID in Bank Details</span>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Scannable ZXing / SVG QR Code Container */}
                            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                                <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200/80">
                                    <img
                                        src={imgSrc || primaryQrUrl}
                                        alt="UPI Payment QR Code"
                                        className="w-48 h-48 md:w-52 md:h-52 object-contain"
                                        onError={() => {
                                            if (imgSrc !== fallbackQrUrl) {
                                                setImgSrc(fallbackQrUrl);
                                            }
                                        }}
                                    />
                                </div>
                                <div className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                                    <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                                    <span>BHIM, Google Pay, PhonePe, Paytm, CRED</span>
                                </div>
                            </div>

                            {/* Clean Payee Details Display */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
                                    <div className="min-w-0 pr-2">
                                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                                            UPI ID
                                        </div>
                                        <div className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                                            {upiId}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCopyUpi}
                                        className="shrink-0 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 font-medium inline-flex items-center gap-1 shadow-sm transition-all text-xs"
                                    >
                                        {copiedUpi ? (
                                            <>
                                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3.5 h-3.5 text-slate-500" />
                                                <span>Copy</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs">
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Account Holder:</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[240px]">
                                        {accountHolderName}
                                    </span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Public Portal Link if available */}
                    {publicUrl && (
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs">
                            <div className="min-w-0 pr-2">
                                <div className="text-[10px] text-blue-600/80 dark:text-blue-400/80 font-semibold uppercase tracking-wider">Client Payment Link</div>
                                <div className="font-mono text-slate-600 dark:text-slate-300 truncate">{publicUrl}</div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    type="button"
                                    onClick={handleCopyLink}
                                    className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 font-medium inline-flex items-center gap-1 shadow-sm transition-all text-xs"
                                    title="Copy Payment Portal Link"
                                >
                                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                                </button>
                                <a
                                    href={publicUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium inline-flex items-center gap-1 shadow-sm transition-all text-xs"
                                    title="Open Public Payment Page"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Open</span>
                                </a>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Secure Direct Bank UPI</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {onRecordPaymentClick && (
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onRecordPaymentClick();
                                }}
                                className="px-2.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-colors"
                            >
                                Record Payment Manually
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3.5 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

