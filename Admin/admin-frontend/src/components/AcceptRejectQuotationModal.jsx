import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { fetchApi } from '../services/api';

export default function AcceptRejectQuotationModal({ isOpen, onClose, quotation, type, onSuccess }) {
    const [responseSource, setResponseSource] = useState('PHONE');
    const [responseNotes, setResponseNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen || !quotation) return null;

    const isAccept = type === 'ACCEPT';

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError(null);
        try {
            await fetchApi(`/quotations/${quotation.id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({
                    status: isAccept ? 'ACCEPTED' : 'REJECTED',
                    responseSource,
                    responseNotes
                })
            });
            window.dispatchEvent(new Event('notification-update'));
            onSuccess();
            onClose();
        } catch (err) {
            console.error("Status Update Error:", err);
            setError(err.message || `Failed to ${isAccept ? 'accept' : 'reject'} quotation.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-text-primary/30 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="acx-card p-6 md:p-8 max-w-md w-full shadow-2xl relative animate-modal-entrance">
                <div className="flex items-center space-x-3 mb-6">
                    <div className={`w-12 h-12 flex items-center justify-center rounded-[20px] shadow-sm border ${
                        isAccept ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-red-50 border-red-200 text-red-600'
                    }`}>
                        {isAccept ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                    </div>
                    <div>
                        <h3 className="text-[20px] font-bold text-text-primary tracking-tight">
                            {isAccept ? 'Accept Quotation' : 'Reject Quotation'}
                        </h3>
                        <p className="text-[13px] text-text-secondary mt-0.5">
                            {quotation.quotationNumber}
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="p-4 mb-6 bg-brand-danger/10 border border-brand-danger/30 rounded-xl flex items-start space-x-3">
                        <AlertCircle className="w-5 h-5 text-brand-danger shrink-0 mt-0.5" />
                        <p className="text-[13px] text-brand-danger font-medium leading-relaxed">{error}</p>
                    </div>
                )}

                <div className="space-y-5">
                    <div>
                        <label className="block text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-2">Response Source <span className="text-brand-danger">*</span></label>
                        <select 
                            value={responseSource} 
                            onChange={(e) => setResponseSource(e.target.value)}
                            className="w-full bg-bg-main border border-border-subtle focus:border-brand-primary rounded-xl px-3 py-2.5 text-[13px] font-semibold text-text-primary outline-none transition-colors"
                        >
                            <option value="PHONE">Phone</option>
                            <option value="EMAIL">Email</option>
                            <option value="WHATSAPP">WhatsApp</option>
                            <option value="OTHER">Other / Manual</option>
                        </select>
                        <p className="text-[11px] text-text-muted mt-1.5">How did the client confirm this?</p>
                    </div>

                    <div>
                        <label className="block text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-2">Notes (Optional)</label>
                        <textarea 
                            value={responseNotes} 
                            onChange={(e) => setResponseNotes(e.target.value)}
                            placeholder={isAccept ? "e.g. Client confirmed via call and agreed to terms." : "e.g. Client found price too high."}
                            className="w-full h-24 resize-none bg-bg-main border border-border-subtle focus:border-brand-primary rounded-xl px-3 py-2.5 text-[13px] text-text-primary outline-none transition-colors"
                        />
                    </div>
                </div>

                <div className="mt-8 flex justify-end space-x-3">
                    <button 
                        onClick={onClose} 
                        disabled={isSubmitting}
                        className="btn btn-primary btn-md"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting}
                        className={`flex items-center px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white shadow-sm transition-colors disabled:opacity-50 ${
                            isAccept ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                        }`}
                    >
                        {isSubmitting && <span className="btn btn-secondary btn-md mr-2"></span>}
                        {isAccept ? 'Mark as Accepted' : 'Mark as Rejected'}
                    </button>
                </div>
            </div>
        </div>
    );
}
