import React, { useState, useEffect } from 'react';
import { createCrmFollowUp, updateCrmFollowUp, completeCrmFollowUp, cancelCrmFollowUp } from '../services/api';
import { X, Loader2, AlertCircle, Calendar, Phone, Mail, MessageSquare, Users, FileText, CheckCircle2, XCircle } from 'lucide-react';
import Modal from './ui/Modal';

const FOLLOW_UP_TYPES = [
    { value: 'CALL', label: 'Phone Call', icon: Phone },
    { value: 'EMAIL', label: 'Email', icon: Mail },
    { value: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquare },
    { value: 'MEETING', label: 'Meeting', icon: Users },
    { value: 'OTHER', label: 'Other', icon: FileText },
];

export default function FollowUpModal({ isOpen, onClose, mode = 'CREATE', leadId, followUp = null, onSuccess }) {
    const [type, setType] = useState('CALL');
    const [scheduledDate, setScheduledDate] = useState('');
    const [notes, setNotes] = useState('');
    const [outcome, setOutcome] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setError(null);
            if (mode === 'EDIT' && followUp) {
                setType(followUp.followUpType || 'CALL');
                setScheduledDate(followUp.scheduledDate ? new Date(followUp.scheduledDate).toISOString().slice(0, 16) : '');
                setNotes(followUp.notes || '');
            } else if (mode === 'COMPLETE') {
                setOutcome(followUp?.outcome || '');
            } else if (mode === 'CREATE') {
                setType('CALL');
                // Default scheduledDate to tomorrow 10:00 AM
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(10, 0, 0, 0);
                setScheduledDate(tomorrow.toISOString().slice(0, 16));
                setNotes('');
            }
        }
    }, [isOpen, mode, followUp]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            let res;
            if (mode === 'CREATE') {
                if (!scheduledDate) {
                    setError('Scheduled date and time is required.');
                    setIsLoading(false);
                    return;
                }
                const payload = {
                    type: type,
                    scheduledAt: new Date(scheduledDate).toISOString().replace("Z", ""),
                    subject: notes ? notes.substring(0, 50) : "Follow-up",
                    notes: notes.trim() || null
                };
                res = await createCrmFollowUp(leadId, payload);
            } else if (mode === 'EDIT') {
                const payload = {
                    type: type,
                    scheduledAt: scheduledDate ? new Date(scheduledDate).toISOString().replace("Z", "") : null,
                    subject: notes ? notes.substring(0, 50) : "Follow-up",
                    notes: notes.trim() || null
                };
                res = await updateCrmFollowUp(followUp.id, payload);
            } else if (mode === 'COMPLETE') {
                res = await completeCrmFollowUp(followUp.id, outcome.trim() || null);
            } else if (mode === 'CANCEL') {
                res = await cancelCrmFollowUp(followUp.id);
            }

            setIsLoading(false);
            if (onSuccess) onSuccess(res);
            onClose();
        } catch (err) {
            console.error(`Failed follow-up operation (${mode})`, err);
            setError(err.message || 'Operation failed.');
            setIsLoading(false);
        }
    };

    const getTitle = () => {
        switch (mode) {
            case 'CREATE': return 'Schedule New Follow-up';
            case 'EDIT': return 'Edit Follow-up';
            case 'COMPLETE': return 'Mark Follow-up as Completed';
            case 'CANCEL': return 'Cancel Follow-up';
            default: return 'Follow-up';
        }
    };

    const modalFooter = (
        <div className="flex justify-end gap-3 w-full">
            <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="btn btn-secondary btn-md"
            >
                Cancel
            </button>
            <button
                type="submit"
                form="follow-up-form"
                disabled={isLoading}
                className={`btn btn-md flex-1 sm:flex-none ${
                    mode === 'CANCEL' ? 'btn-danger' : 
                    mode === 'COMPLETE' ? 'btn-success' : 'btn-primary'
                }`}
            >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === 'CREATE' && 'Schedule Follow-up'}
                {mode === 'EDIT' && 'Save Changes'}
                {mode === 'COMPLETE' && 'Complete Follow-up'}
                {mode === 'CANCEL' && 'Confirm Cancellation'}
            </button>
        </div>
    );

    const ModalIcon = mode === 'COMPLETE' ? CheckCircle2 : mode === 'CANCEL' ? XCircle : Calendar;
    const iconColor = mode === 'COMPLETE' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 
                      mode === 'CANCEL' ? 'text-rose-500 bg-rose-500/10 border-rose-500/20' : 
                      'text-brand-teal bg-brand-teal/10 border-brand-teal/20';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={getTitle()}
            icon={ModalIcon}
            iconClassName={iconColor}
            size="sm"
            isLoading={isLoading}
            footer={modalFooter}
        >
            <form id="follow-up-form" onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-medium rounded-xl flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {(mode === 'CREATE' || mode === 'EDIT') && (
                        <>
                            <div>
                                <label className="block text-xs font-semibold uppercase text-text-muted mb-1">Follow-up Type *</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {FOLLOW_UP_TYPES.map(t => {
                                        const IconComp = t.icon;
                                        const isSelected = type === t.value;
                                        return (
                                            <button
                                                type="button"
                                                key={t.value}
                                                onClick={() => setType(t.value)}
                                                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-[13px] font-semibold transition-all relative overflow-hidden ${
                                                    isSelected 
                                                        ? 'bg-brand-teal/10 border-[#0D9488] text-[#0D9488]' 
                                                        : 'bg-bg-main border-border-subtle text-text-secondary hover:border-text-muted hover:bg-bg-hover'
                                                }`}
                                            >
                                                <IconComp className="w-4 h-4" />
                                                {t.label}
                                                {isSelected && (
                                                    <div className="absolute top-1 right-1">
                                                        <div className="w-2 h-2 rounded-full bg-[#0D9488]"></div>
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase text-text-muted mb-1">Scheduled Date & Time *</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={scheduledDate}
                                    onChange={(e) => setScheduledDate(e.target.value)}
                                    className="w-full px-3 py-2 text-sm bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase text-text-muted mb-1">Follow-up Agenda / Notes</label>
                                <textarea
                                    rows={3}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Enter topics to discuss, objective of call, etc..."
                                    className="w-full px-3 py-2 text-sm bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                                />
                            </div>
                        </>
                    )}

                    {mode === 'COMPLETE' && (
                        <div>
                            <label className="block text-xs font-semibold uppercase text-text-muted mb-1">Follow-up Outcome / Summary</label>
                            <textarea
                                rows={4}
                                value={outcome}
                                onChange={(e) => setOutcome(e.target.value)}
                                placeholder="Describe what was discussed, client response, next steps agreed upon..."
                                className="w-full px-3 py-2 text-sm bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                            />
                        </div>
                    )}

                    {mode === 'CANCEL' && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-600 dark:text-red-400">
                            Are you sure you want to cancel this scheduled follow-up? This action will mark it as Cancelled.
                        </div>
                    )}

            </form>
        </Modal>
    );
}
