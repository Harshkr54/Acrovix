import React, { useState, useEffect } from 'react';
import { logLeadActivity } from '../services/api';
import { 
    X, 
    Loader2, 
    AlertCircle, 
    Phone, 
    Mail, 
    Calendar, 
    MessageSquare, 
    FileText, 
    MoreHorizontal,
    Clock,
    CheckCircle2
} from 'lucide-react';
import { validateActivityPayload } from '../utils/crmActionUtils';
import { useToast } from '../context/ToastContext';

const ACTIVITY_TYPES = [
    { key: 'CALL', label: 'Call', icon: Phone },
    { key: 'MEETING', label: 'Meeting', icon: Calendar },
    { key: 'EMAIL', label: 'Email', icon: Mail },
    { key: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquare },
    { key: 'NOTE', label: 'Note', icon: FileText },
    { key: 'OTHER', label: 'Other', icon: MoreHorizontal }
];

export default function LogActivityModal({ 
    isOpen, 
    onClose, 
    lead, 
    defaultType = 'CALL', 
    initialSubject = '', 
    onSuccess 
}) {
    const { showToast } = useToast();
    const [type, setType] = useState('CALL');
    const [subject, setSubject] = useState('');
    const [outcome, setOutcome] = useState('');
    const [notes, setNotes] = useState('');
    const [nextAction, setNextAction] = useState('');
    const [performedAt, setPerformedAt] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState(null);

    // Format current date-time for datetime-local input
    const getCurrentDateTimeLocal = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    useEffect(() => {
        if (isOpen) {
            setType(defaultType || 'CALL');
            setSubject(initialSubject || '');
            setOutcome('');
            setNotes('');
            setNextAction('');
            setPerformedAt(getCurrentDateTimeLocal());
            setErrors({});
            setServerError(null);
            setIsSubmitting(false);
        }
    }, [isOpen, defaultType, initialSubject]);

    // Handle Escape key to close
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen && !isSubmitting) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isSubmitting, onClose]);

    if (!isOpen || !lead) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        const validation = validateActivityPayload({
            type,
            subject,
            performedAt
        });

        if (!validation.isValid) {
            setErrors(validation.errors);
            return;
        }

        setIsSubmitting(true);
        setServerError(null);

        try {
            const payload = {
                type,
                subject: subject.trim(),
                outcome: outcome.trim() || null,
                notes: notes.trim() || null,
                nextAction: nextAction.trim() || null,
                performedAt: performedAt ? new Date(performedAt).toISOString() : null
            };

            const created = await logLeadActivity(lead.id, payload);
            setIsSubmitting(false);
            showToast({
                type: 'success',
                message: `Activity logged: [${type}] ${subject.trim()}`
            });
            if (onSuccess) onSuccess(created);
            onClose();
        } catch (err) {
            console.error("Failed to log activity", err);
            setServerError(err.message || 'Failed to log lead interaction.');
            setIsSubmitting(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-text-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isSubmitting) onClose();
            }}
        >
            <div 
                className="bg-bg-card border border-border-subtle rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150"
                role="dialog"
                aria-modal="true"
                aria-labelledby="log-activity-modal-title"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-main">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-brand-teal/10 text-brand-teal flex items-center justify-center">
                            <Clock className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 id="log-activity-modal-title" className="text-base font-bold text-text-primary">
                                Log Customer Interaction
                            </h2>
                            <p className="text-xs text-text-muted">
                                {lead.leadNumber} — {lead.fullName} {lead.companyName ? `(${lead.companyName})` : ''}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        disabled={isSubmitting}
                        className="btn btn-ghost btn-icon text-text-muted hover:text-text-primary"
                        aria-label="Close dialog"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                    {serverError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-medium rounded-xl flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{serverError}</span>
                        </div>
                    )}

                    {/* Interaction Type Selection Tabs */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                            Interaction Type <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {ACTIVITY_TYPES.map((act) => {
                                const Icon = act.icon;
                                const isSelected = type === act.key;
                                return (
                                    <button
                                        key={act.key}
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={() => {
                                            setType(act.key);
                                            if (errors.type) setErrors(prev => ({ ...prev, type: null }));
                                        }}
                                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all ${
                                            isSelected 
                                                ? 'bg-brand-teal/10 border-brand-teal text-brand-teal ring-2 ring-brand-teal/20 shadow-sm font-bold' 
                                                : 'bg-bg-main border-border-subtle text-text-secondary hover:border-text-muted/50'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4 mb-1" />
                                        <span>{act.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                        {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type}</p>}
                    </div>

                    {/* Performed Date & Time */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
                            Date & Time of Interaction
                        </label>
                        <input
                            type="datetime-local"
                            value={performedAt}
                            disabled={isSubmitting}
                            onChange={(e) => setPerformedAt(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-teal"
                        />
                        {errors.performedAt && <p className="text-xs text-red-500 mt-1">{errors.performedAt}</p>}
                    </div>

                    {/* Subject / Summary Title */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
                            Discussion Title / Subject <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={subject}
                            disabled={isSubmitting}
                            onChange={(e) => {
                                setSubject(e.target.value);
                                if (errors.subject) setErrors(prev => ({ ...prev, subject: null }));
                            }}
                            placeholder="e.g. Discovery call on cloud migration, Product demo review..."
                            className={`w-full px-3 py-2 text-sm bg-bg-main border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-teal ${
                                errors.subject ? 'border-red-500' : 'border-border-subtle'
                            }`}
                        />
                        {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject}</p>}
                    </div>

                    {/* Customer Outcome / Response */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
                            Customer Response / Outcome
                        </label>
                        <input
                            type="text"
                            value={outcome}
                            disabled={isSubmitting}
                            onChange={(e) => setOutcome(e.target.value)}
                            placeholder="e.g. Highly interested, requested quote; or Client busy, asked to call next week"
                            className="w-full px-3 py-2 text-sm bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-teal"
                        />
                    </div>

                    {/* Discussion Notes */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
                            Discussion Notes & Key Points
                        </label>
                        <textarea
                            rows={3}
                            value={notes}
                            disabled={isSubmitting}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Detail what was discussed, customer pain points, specific queries raised..."
                            className="w-full px-3 py-2 text-sm bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-teal resize-y"
                        />
                    </div>

                    {/* Next Action */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
                            Next Commitment / Action
                        </label>
                        <input
                            type="text"
                            value={nextAction}
                            disabled={isSubmitting}
                            onChange={(e) => setNextAction(e.target.value)}
                            placeholder="e.g. Send revised quote by Friday, Arrange tech architecture session"
                            className="w-full px-3 py-2 text-sm bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-teal"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="btn btn-secondary btn-md font-semibold"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn btn-primary btn-md font-semibold flex items-center justify-center gap-1.5 min-w-[130px]"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Save Activity</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
