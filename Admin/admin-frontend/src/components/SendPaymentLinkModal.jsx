import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, 
    Share2, 
    Copy, 
    Check, 
    ExternalLink, 
    Mail, 
    MessageSquare, 
    Send, 
    QrCode, 
    Plus, 
    CheckCircle2, 
    AlertCircle, 
    DollarSign,
    Sparkles
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { sendInvoiceEmail } from '../services/api';

export default function SendPaymentLinkModal({
    isOpen,
    onClose,
    invoice,
    tenant,
    companySettings,
    onOpenQrModal,
    onOpenRecordPaymentModal,
    showToast
}) {
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedMessage, setCopiedMessage] = useState(false);
    const [recipientEmail, setRecipientEmail] = useState(invoice?.clientEmail || '');
    const [sendingEmail, setSendingEmail] = useState(false);
    const [emailSuccess, setEmailSuccess] = useState(false);
    const [emailError, setEmailError] = useState(null);

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

    const companyName = tenant?.companyName || tenant?.brandName || companySettings?.companyName || 'Acrovix Innovations';
    const invoiceNumber = invoice.invoiceNumber || 'INV-000';
    const clientName = invoice.clientName || 'Customer';
    const balanceDue = invoice.balanceDue !== undefined && invoice.balanceDue !== null 
        ? invoice.balanceDue 
        : (invoice.grandTotal || 0);

    const publicToken = invoice.publicToken;
    const publicUrl = publicToken 
        ? `${window.location.origin}/pay/invoice/${publicToken}` 
        : (invoice.paymentLinkUrl || `${window.location.origin}/pay/invoice/pending`);

    const formattedBalance = formatCurrency(balanceDue, invoice.currency, 2);

    // Formatted multi-channel message
    const shareMessage = `Hello ${clientName},\n\nPlease review and settle the payment of ${formattedBalance} for invoice ${invoiceNumber}.\n\nYou can securely pay online via UPI, Credit/Debit Card, or NetBanking using our official payment link:\n${publicUrl}\n\nThank you,\n${companyName}`;

    const handleCopyLink = () => {
        if (!publicUrl) return;
        navigator.clipboard.writeText(publicUrl);
        setCopiedLink(true);
        if (showToast) showToast('Payment link copied to clipboard', 'success');
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const handleCopyMessage = () => {
        navigator.clipboard.writeText(shareMessage);
        setCopiedMessage(true);
        if (showToast) showToast('Complete invoice message copied to clipboard', 'success');
        setTimeout(() => setCopiedMessage(false), 2000);
    };

    const handleWhatsAppShare = () => {
        // Strip non-digits from client phone if present
        const phone = invoice.clientPhone ? invoice.clientPhone.replace(/\D/g, '') : '';
        const whatsappUrl = phone 
            ? `https://wa.me/${phone}?text=${encodeURIComponent(shareMessage)}`
            : `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    };

    const handleSendEmail = async (e) => {
        e.preventDefault();
        setEmailError(null);
        setEmailSuccess(false);

        const emailTarget = recipientEmail.trim() || invoice.clientEmail;
        if (!emailTarget) {
            setEmailError('Please specify a recipient email address.');
            return;
        }

        try {
            setSendingEmail(true);
            await sendInvoiceEmail(invoice.id, { recipientEmail: emailTarget });
            setEmailSuccess(true);
            if (showToast) showToast(`Payment link email sent to ${emailTarget}`, 'success');
            setTimeout(() => setEmailSuccess(false), 3500);
        } catch (err) {
            console.error('Failed to send invoice email', err);
            setEmailError(err.message || 'Failed to dispatch invoice email.');
        } finally {
            setSendingEmail(false);
        }
    };

    return createPortal(
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
            onClick={onClose}
        >
            <div 
                className="relative w-full max-w-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col my-auto"
                onClick={(e) => e.stopPropagation()}
            >
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <Share2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Generate & Share Payment Link</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Share secure public payment portal for {invoiceNumber}</p>
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

                {/* Content */}
                <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(88vh-140px)]">
                    
                    {/* Amount & Client Info Pill */}
                    <div className="p-3.5 bg-gradient-to-r from-blue-500/5 via-slate-50 to-indigo-500/5 dark:from-blue-950/20 dark:via-slate-900/60 dark:to-indigo-950/20 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl flex items-center justify-between">
                        <div>
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Recipient Client</div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 truncate max-w-[200px]">
                                {clientName} {invoice.clientCompany ? `(${invoice.clientCompany})` : ''}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Balance Due</div>
                            <div className="text-sm font-black font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                                {formattedBalance}
                            </div>
                        </div>
                    </div>

                    {/* Public URL Box */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                            <span>Official Self-Hosted Payment Link</span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                Ready to share
                            </span>
                        </label>
                        <div className="flex items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl">
                            <span className="flex-1 font-mono text-xs text-slate-700 dark:text-slate-300 truncate px-2 selection:bg-blue-500 selection:text-white">
                                {publicUrl}
                            </span>
                            <button
                                type="button"
                                onClick={handleCopyLink}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all shrink-0"
                            >
                                {copiedLink ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-white" />}
                                <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                            </button>
                            <a
                                href={publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors shrink-0"
                                title="Open payment link in new window"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                    </div>

                    {/* Sharing Channels Grid */}
                    <div className="space-y-2">
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Instant Multi-Channel Share
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {/* WhatsApp Button */}
                            <button
                                type="button"
                                onClick={handleWhatsAppShare}
                                className="p-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 transition-all flex items-center gap-2.5 text-left group"
                            >
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                    <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-xs font-bold truncate">Share via WhatsApp</div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                        {invoice.clientPhone || 'Send direct chat link'}
                                    </div>
                                </div>
                            </button>

                            {/* Copy Full Message */}
                            <button
                                type="button"
                                onClick={handleCopyMessage}
                                className="p-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 dark:hover:bg-blue-500/15 text-blue-700 dark:text-blue-400 transition-all flex items-center gap-2.5 text-left group"
                            >
                                <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                    {copiedMessage ? <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" /> : <Copy className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-xs font-bold truncate">Copy Reminder Text</div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                        {copiedMessage ? 'Copied to clipboard!' : 'Ready for SMS & Slack'}
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Email Dispatch Box */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                <span>Send Invoice Email with Payment Link</span>
                            </label>
                            {emailSuccess && (
                                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Sent!
                                </span>
                            )}
                        </div>

                        {emailError && (
                            <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>{emailError}</span>
                            </div>
                        )}

                        <form onSubmit={handleSendEmail} className="flex gap-2">
                            <input
                                type="email"
                                value={recipientEmail}
                                onChange={(e) => setRecipientEmail(e.target.value)}
                                placeholder="client@example.com"
                                className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                            />
                            <button
                                type="submit"
                                disabled={sendingEmail}
                                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0 shadow-sm"
                            >
                                <Send className={`w-3.5 h-3.5 ${sendingEmail ? 'animate-pulse' : ''}`} />
                                <span>{sendingEmail ? 'Sending...' : 'Send Email'}</span>
                            </button>
                        </form>
                    </div>

                </div>

                {/* Footer with Alternate Payment Shortcuts */}
                <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        {onOpenQrModal && (
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onOpenQrModal();
                                }}
                                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                                <QrCode className="w-3.5 h-3.5" />
                                <span>Show QR Modal</span>
                            </button>
                        )}
                        {onOpenRecordPaymentModal && (
                            <>
                                <span className="text-slate-300 dark:text-slate-700">•</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onClose();
                                        onOpenRecordPaymentModal();
                                    }}
                                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Record Payment Manually</span>
                                </button>
                            </>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors ml-auto"
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
}
