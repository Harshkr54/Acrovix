import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
    CheckCircle2, FileText, Calendar, Building2, User, Mail, Phone, 
    ShieldCheck, Download, AlertCircle, Loader2, PenTool, Type, RotateCcw, 
    ExternalLink, MapPin, Landmark
} from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').replace(/\/api\/admin\/?$/, '');

export default function PublicQuotationView() {
    const { publicToken } = useParams();
    const [quotation, setQuotation] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // E-Sign / Acceptance Modal state
    const [isEsignModalOpen, setIsEsignModalOpen] = useState(false);
    const [signerName, setSignerName] = useState('');
    const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
    const [signerNotes, setSignerNotes] = useState('');
    const [signMode, setSignMode] = useState('draw'); // 'draw' or 'type'
    const [typedSignature, setTypedSignature] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    // Canvas ref for drawing signature
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);

    useEffect(() => {
        fetchQuotation();
    }, [publicToken]);

    const fetchQuotation = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/api/public/quotes/view/${publicToken}`);
            if (!res.ok) {
                if (res.status === 404) {
                    throw new Error("This quotation was not found or the public link has expired.");
                }
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || "Failed to load quotation.");
            }
            const data = await res.json();
            setQuotation(data);
            if (data.clientName && !signerName) {
                setSignerName(data.clientName);
                setTypedSignature(data.clientName);
            }
        } catch (err) {
            setError(err.message || "An unexpected error occurred while loading quotation.");
        } finally {
            setIsLoading(false);
        }
    };

    // Canvas drawing handlers
    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
        const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
        const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#0f766e';
        ctx.lineTo(x, y);
        ctx.stroke();
        setHasDrawn(true);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasDrawn(false);
    };

    const handleAcceptAndSign = async (e) => {
        e.preventDefault();
        if (!signerName.trim()) {
            setSubmitError("Please enter your full name.");
            return;
        }

        if (!hasAcceptedTerms) {
            setSubmitError("Please confirm that you accept the pricing, terms, and conditions.");
            return;
        }

        let signatureData = null;
        if (signMode === 'draw' && hasDrawn) {
            signatureData = canvasRef.current ? canvasRef.current.toDataURL('image/png') : null;
        } else if (signMode === 'type' && typedSignature.trim()) {
            // Generate canvas with styled cursive text
            const offscreen = document.createElement('canvas');
            offscreen.width = 400;
            offscreen.height = 100;
            const ctx = offscreen.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, offscreen.width, offscreen.height);
            ctx.font = '36px "Dancing Script", "Brush Script MT", cursive';
            ctx.fillStyle = '#0f766e';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(typedSignature, 200, 50);
            signatureData = offscreen.toDataURL('image/png');
        }

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const res = await fetch(`${API_BASE}/api/public/quotes/view/${publicToken}/accept`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    signerName: signerName.trim(),
                    signatureData: signatureData,
                    signerNotes: signerNotes.trim()
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || "Failed to submit digital signature.");
            }

            const updated = await res.json();
            setQuotation(updated);
            setIsEsignModalOpen(false);
        } catch (err) {
            setSubmitError(err.message || "Failed to submit approval.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-200">
                <Loader2 className="w-10 h-10 animate-spin text-teal-400 mb-4" />
                <p className="text-sm font-medium tracking-wide">Loading secure quotation portal...</p>
            </div>
        );
    }

    if (error || !quotation) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h1 className="text-xl font-bold text-slate-100 mb-2">Quotation Unavailable</h1>
                <p className="text-slate-400 max-w-md text-sm mb-6">{error || "Unable to display quotation."}</p>
                <Link to="/" className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-colors">
                    Back to Platform
                </Link>
            </div>
        );
    }

    const { tenant, items = [], bankDetails } = quotation;
    const isAccepted = quotation.status === 'ACCEPTED' || quotation.status === 'CONVERTED';
    const isRejected = quotation.status === 'REJECTED';
    const primaryColor = tenant?.primaryColor || '#0f766e';

    const formatMoney = (amount) => {
        if (amount == null) return '—';
        const symbol = quotation.currency === 'USD' ? '$' : '₹';
        return `${symbol} ${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-teal-500/30 selection:text-teal-200 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Top Branding Header */}
                <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        {tenant?.logoUrl ? (
                            <img src={tenant.logoUrl} alt={tenant.brandName || tenant.companyName} className="h-12 w-auto max-w-[180px] object-contain rounded-lg" />
                        ) : (
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-sky-500 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-teal-500/20">
                                {(tenant?.brandName || tenant?.companyName || 'A')[0]}
                            </div>
                        )}
                        <div>
                            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                                {tenant?.brandName || tenant?.companyName || 'Acrovix Innovations'}
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {tenant?.legalName || tenant?.companyName} {tenant?.gstin ? `· GSTIN: ${tenant.gstin}` : ''}
                            </p>
                        </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-3">
                        {isAccepted ? (
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                                <ShieldCheck className="w-4 h-4" />
                                <span>Approved &amp; E-Signed</span>
                            </div>
                        ) : isRejected ? (
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-xs uppercase tracking-wider">
                                <AlertCircle className="w-4 h-4" />
                                <span>Quotation Declined</span>
                            </div>
                        ) : (
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs uppercase tracking-wider">
                                <Calendar className="w-4 h-4" />
                                <span>Awaiting Signature</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* E-Signed Verified Stamp Banner (if accepted) */}
                {isAccepted && (
                    <div id="verified-esign-badge" className="bg-emerald-950/40 border border-emerald-500/30 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-emerald-200">
                                    Legally Binding Digital Acceptance Recorded
                                </h3>
                                <p className="text-xs text-emerald-400/90 mt-0.5">
                                    Digitally signed by <span className="font-semibold text-white">{quotation.signerName || quotation.clientName}</span> on {new Date(quotation.signedAt || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                                {quotation.signerNotes && (
                                    <p className="text-xs text-slate-300 italic mt-1 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                                        "{quotation.signerNotes}"
                                    </p>
                                )}
                            </div>
                        </div>

                        {quotation.signatureData && (
                            <div className="bg-white/95 rounded-xl p-2.5 border border-emerald-500/30 shadow-inner shrink-0 self-end sm:self-center">
                                <img src={quotation.signatureData} alt="Digital Signature" className="h-10 w-auto max-w-[140px] object-contain" />
                            </div>
                        )}
                    </div>
                )}

                {/* Main Quotation Sheet */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
                    
                    {/* Header Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8 border-b border-slate-800">
                        <div>
                            <span className="text-[11px] font-bold text-teal-400 uppercase tracking-widest block mb-1">PROPOSAL TO</span>
                            <h3 className="text-lg font-bold text-white">{quotation.clientName}</h3>
                            {quotation.clientCompany && <p className="text-sm text-slate-300 font-medium">{quotation.clientCompany}</p>}
                            <div className="mt-3 space-y-1 text-xs text-slate-400">
                                {quotation.clientEmail && <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-500" /> {quotation.clientEmail}</p>}
                                {quotation.clientPhone && <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-500" /> {quotation.clientPhone}</p>}
                            </div>
                        </div>

                        <div className="md:text-right space-y-2">
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">QUOTATION NUMBER</span>
                                <span className="text-xl font-mono font-extrabold text-white">{quotation.quotationNumber}</span>
                            </div>
                            <div className="flex flex-col md:items-end text-xs text-slate-400 space-y-1">
                                <p>Date: <span className="text-slate-200 font-medium">{new Date(quotation.createdAt).toLocaleDateString()}</span></p>
                                {quotation.validUntil && (
                                    <p>Valid Until: <span className="text-slate-200 font-medium">{new Date(quotation.validUntil).toLocaleDateString()}</span></p>
                                )}
                                <p>Currency: <span className="text-teal-400 font-semibold font-mono">{quotation.currency}</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Line Items Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                                    <th className="py-3 px-3 font-bold">#</th>
                                    <th className="py-3 px-3 font-bold">Item Description</th>
                                    <th className="py-3 px-3 font-bold">HSN/SAC</th>
                                    <th className="py-3 px-3 font-bold text-center">Qty</th>
                                    <th className="py-3 px-3 font-bold text-right">Rate</th>
                                    <th className="py-3 px-3 font-bold text-right">Tax</th>
                                    <th className="py-3 px-3 font-bold text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 text-slate-200">
                                {items.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="py-4 px-3 text-slate-500 font-mono text-xs">{idx + 1}</td>
                                        <td className="py-4 px-3 font-medium">
                                            <p className="text-white font-semibold">{item.title || item.description}</p>
                                        </td>
                                        <td className="py-4 px-3 text-slate-400 font-mono text-xs">{item.hsnSac || '—'}</td>
                                        <td className="py-4 px-3 text-center font-mono">{item.quantity} {item.unit || ''}</td>
                                        <td className="py-4 px-3 text-right font-mono text-slate-300">{formatMoney(item.unitPrice)}</td>
                                        <td className="py-4 px-3 text-right font-mono text-slate-400 text-xs">
                                            {item.taxPercent ? `${item.taxPercent}%` : '—'}
                                        </td>
                                        <td className="py-4 px-3 text-right font-mono font-bold text-white">{formatMoney(item.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary Totals */}
                    <div className="flex flex-col md:flex-row justify-between items-start gap-8 pt-6 border-t border-slate-800">
                        {/* Terms & Bank details */}
                        <div className="w-full md:w-1/2 space-y-4 text-xs text-slate-400">
                            {quotation.termsAndConditions && (
                                <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                                    <p className="font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5 text-teal-400" /> Terms &amp; Conditions
                                    </p>
                                    <p className="whitespace-pre-line leading-relaxed text-slate-300">{quotation.termsAndConditions}</p>
                                </div>
                            )}

                            {bankDetails && (
                                <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 space-y-1 font-mono text-[11px]">
                                    <p className="font-bold font-sans text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                        <Landmark className="w-3.5 h-3.5 text-teal-400" /> Remittance Bank Details
                                    </p>
                                    <p>Bank: <span className="text-slate-200">{bankDetails.bankName}</span></p>
                                    <p>A/C Name: <span className="text-slate-200">{bankDetails.accountHolder}</span></p>
                                    <p>A/C No: <span className="text-slate-200">{bankDetails.accountNumber}</span></p>
                                    <p>IFSC: <span className="text-slate-200">{bankDetails.ifsc}</span></p>
                                </div>
                            )}
                        </div>

                        {/* Financial Totals Card */}
                        <div className="w-full md:w-5/12 bg-slate-950/70 border border-slate-800 rounded-2xl p-6 space-y-3 font-mono">
                            <div className="flex justify-between text-xs text-slate-400">
                                <span>Subtotal</span>
                                <span>{formatMoney(quotation.subtotal)}</span>
                            </div>
                            {quotation.discountAmount > 0 && (
                                <div className="flex justify-between text-xs text-emerald-400">
                                    <span>Discount</span>
                                    <span>- {formatMoney(quotation.discountAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-xs text-slate-400">
                                <span>Estimated Tax (GST)</span>
                                <span>{formatMoney(quotation.taxAmount)}</span>
                            </div>
                            <div className="pt-3 border-t border-slate-800 flex justify-between items-baseline font-sans">
                                <span className="text-sm font-bold text-white uppercase tracking-wider">Grand Total</span>
                                <span className="text-2xl font-bold font-mono text-teal-400">
                                    {formatMoney(quotation.grandTotal)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-xs text-slate-400">
                            Powered by <span className="font-semibold text-slate-300">Acrovix Innovations SaaS Platform</span>
                        </div>

                        {!isAccepted && !isRejected && (
                            <button
                                id="accept-quotation-btn"
                                data-testid="open-esign-modal-btn"
                                type="button"
                                onClick={() => setIsEsignModalOpen(true)}
                                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm tracking-wide shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Accept Quotation</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Accept Quotation / Digital Approval Modal */}
            {isEsignModalOpen && (
                <div id="accept-quotation-modal" data-testid="esign-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-modal-entrance">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        Accept Quotation
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Quotation #{quotation.quotationNumber} · Total: {formatMoney(quotation.grandTotal)}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsEsignModalOpen(false)}
                                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {submitError && (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{submitError}</span>
                            </div>
                        )}

                        <form onSubmit={handleAcceptAndSign} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                                    Your Full Name <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    id="accept-full-name-input"
                                    data-testid="signer-name-input"
                                    type="text"
                                    value={signerName}
                                    onChange={(e) => {
                                        setSignerName(e.target.value);
                                        if (signMode === 'type') setTypedSignature(e.target.value);
                                    }}
                                    placeholder="Your Full Name"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-teal-500 focus:outline-none"
                                    required
                                />
                            </div>

                            {/* Terms & Conditions Acceptance Checkbox */}
                            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        id="accept-terms-checkbox"
                                        type="checkbox"
                                        checked={hasAcceptedTerms}
                                        onChange={(e) => setHasAcceptedTerms(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 rounded text-teal-600 bg-slate-900 border-slate-700 focus:ring-teal-500 cursor-pointer"
                                        required
                                    />
                                    <span className="text-xs text-slate-200 leading-relaxed select-none font-medium">
                                        I accept the pricing, terms, and conditions of this quotation.
                                    </span>
                                </label>
                            </div>

                            {/* Optional Digital Signature Tab */}
                            <div className="pt-1">
                                <details className="group">
                                    <summary className="text-xs font-semibold text-teal-400 cursor-pointer select-none outline-none flex items-center justify-between pb-1">
                                        <span className="flex items-center gap-1.5">
                                            <PenTool className="w-3.5 h-3.5" /> Optional Handwritten / Typed Signature
                                        </span>
                                        <span className="text-[10px] text-slate-500 group-open:rotate-180 transition-transform">▼</span>
                                    </summary>

                                    <div className="mt-3 space-y-3 pt-2 border-t border-slate-800/80">
                                        {/* Sign Mode Toggle */}
                                        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-semibold">
                                            <button
                                                type="button"
                                                onClick={() => setSignMode('draw')}
                                                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                                                    signMode === 'draw' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                                                }`}
                                            >
                                                <PenTool className="w-3.5 h-3.5" /> Draw Signature
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSignMode('type');
                                                    if (!typedSignature) setTypedSignature(signerName);
                                                }}
                                                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                                                    signMode === 'type' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                                                }`}
                                            >
                                                <Type className="w-3.5 h-3.5" /> Type Signature
                                            </button>
                                        </div>

                                        {/* Signature Area */}
                                        {signMode === 'draw' ? (
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between items-center text-[11px] text-slate-400">
                                                    <span>Sign with finger, stylus, or mouse:</span>
                                                    <button
                                                        id="clear-signature-btn"
                                                        type="button"
                                                        onClick={clearCanvas}
                                                        className="text-teal-400 hover:underline flex items-center gap-1"
                                                    >
                                                        <RotateCcw className="w-3 h-3" /> Clear Pad
                                                    </button>
                                                </div>
                                                <div className="bg-white rounded-xl overflow-hidden border border-slate-700 shadow-inner">
                                                    <canvas
                                                        id="signature-canvas"
                                                        ref={canvasRef}
                                                        width={440}
                                                        height={100}
                                                        className="w-full h-24 touch-none cursor-crosshair block"
                                                        onMouseDown={startDrawing}
                                                        onMouseMove={draw}
                                                        onMouseUp={stopDrawing}
                                                        onMouseLeave={stopDrawing}
                                                        onTouchStart={startDrawing}
                                                        onTouchMove={draw}
                                                        onTouchEnd={stopDrawing}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                                                    Signature Style Preview:
                                                </label>
                                                <div className="bg-white rounded-xl p-3 text-center border border-slate-700 shadow-inner">
                                                    <span className="font-serif italic text-2xl text-teal-800 tracking-wider">
                                                        {typedSignature || signerName || 'Signature Preview'}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </details>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                                    Approval Notes / Purchase Order Reference (Optional)
                                </label>
                                <textarea
                                    id="accept-notes-input"
                                    data-testid="signer-notes-input"
                                    rows={2}
                                    value={signerNotes}
                                    onChange={(e) => setSignerNotes(e.target.value)}
                                    placeholder="e.g. Approved per technical review. PO #PO-2026-99 issued."
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-teal-500 focus:outline-none resize-none"
                                />
                            </div>

                            <p className="text-[11px] text-slate-400 leading-normal">
                                By confirming, quotation <span className="font-bold text-white">#{quotation.quotationNumber}</span> will be marked as accepted and a verified approval certificate will be generated.
                            </p>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsEsignModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    id="confirm-accept-btn"
                                    data-testid="submit-esign-btn"
                                    type="submit"
                                    disabled={isSubmitting || !hasAcceptedTerms || !signerName.trim()}
                                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span>Confirm &amp; Accept</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
