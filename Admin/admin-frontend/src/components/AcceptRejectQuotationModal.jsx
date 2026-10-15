import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { fetchApi } from '../services/api';
import Modal from './ui/Modal';

export default function AcceptRejectQuotationModal({ isOpen, onClose, quotation, type, onSuccess }) {
    const [responseSource, setResponseSource] = useState('PHONE');
    const [responseNotes, setResponseNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setResponseSource('PHONE');
            setResponseNotes('');
            setError(null);
            setIsSubmitting(false);
        }
    }, [isOpen, quotation]);

    if (!isOpen || !quotation) return null;

    const isAccept = type === 'ACCEPT';

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError(null);
        try {
            const updated = await fetchApi(`/quotations/${quotation.id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({
                    status: isAccept ? 'ACCEPTED' : 'REJECTED',
                    responseSource,
                    responseNotes: responseNotes ? responseNotes.trim() : ''
                })
            });
            window.dispatchEvent(new Event('notification-update'));
            if (onSuccess) {
                onSuccess(updated);
            }
            onClose();
        } catch (err) {
            console.error("Status Update Error:", err);
            setError(err.message || `Failed to ${isAccept ? 'accept' : 'reject'} quotation.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const modalFooter = (
        <>
            <button 
                type="button"
                onClick={onClose} 
                disabled={isSubmitting}
                className="btn btn-secondary btn-md"
            >
                Cancel
            </button>
            <button 
                type="button"
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className={`flex items-center px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white shadow-sm transition-colors disabled:opacity-50 ${
                    isAccept ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}
            >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {isAccept ? 'Mark as Accepted' : 'Mark as Rejected'}
            </button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isAccept ? 'Accept Quotation' : 'Reject Quotation'}
            subtitle={quotation.quotationNumber}
            icon={isAccept ? CheckCircle : XCircle}
            iconClassName={isAccept ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-red-500/10 border-red-500/30 text-red-500'}
            size="sm"
            isLoading={isSubmitting}
            footer={modalFooter}
        >
            {error && (
                <div className="p-4 mb-5 bg-brand-danger/10 border border-brand-danger/30 rounded-xl flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-brand-danger shrink-0 mt-0.5" />
                    <p className="text-[13px] text-brand-danger font-medium leading-relaxed">{error}</p>
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className="block text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-2">
                        Response Source <span className="text-brand-danger">*</span>
                    </label>
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
                    <label className="block text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-2">
                        Notes (Optional)
                    </label>
                    <textarea 
                        value={responseNotes} 
                        onChange={(e) => setResponseNotes(e.target.value)}
                        placeholder={isAccept ? "e.g. Client confirmed via call and agreed to terms." : "e.g. Client found price too high."}
                        className="w-full h-24 resize-none bg-bg-main border border-border-subtle focus:border-brand-primary rounded-xl px-3 py-2.5 text-[13px] text-text-primary outline-none transition-colors"
                    />
                </div>
            </div>
        </Modal>
    );
}
