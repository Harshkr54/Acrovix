import React, { useState, useEffect } from 'react';
import { updateCrmLeadStatus } from '../services/api';
import { X, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import StatusBadge from './ui/StatusBadge';

const ALLOWED_TRANSITIONS = {
    NEW: ['CONTACTED', 'LOST'],
    CONTACTED: ['QUALIFIED', 'LOST'],
    QUALIFIED: ['PROPOSAL', 'LOST'],
    PROPOSAL: ['NEGOTIATION', 'LOST'],
    NEGOTIATION: ['WON', 'LOST'],
    WON: [],
    LOST: ['NEW']
};

export default function StatusUpdateModal({ isOpen, onClose, lead, onSuccess }) {
    const [targetStatus, setTargetStatus] = useState('');
    const [lostReason, setLostReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const currentStatus = lead ? (lead.status || 'NEW') : 'NEW';
    const validOptions = ALLOWED_TRANSITIONS[currentStatus] || [];

    useEffect(() => {
        if (isOpen && lead) {
            setTargetStatus(validOptions.length > 0 ? validOptions[0] : '');
            setLostReason('');
            setError(null);
        }
    }, [isOpen, lead]);

    if (!isOpen || !lead) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!targetStatus) {
            setError('Please select a target status.');
            return;
        }
        if (targetStatus === 'LOST' && !lostReason.trim()) {
            setError('Lost Reason is mandatory when marking a lead as Lost.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const updated = await updateCrmLeadStatus(
                lead.id, 
                targetStatus, 
                targetStatus === 'LOST' ? lostReason.trim() : null
            );
            setIsLoading(false);
            if (onSuccess) onSuccess(updated);
            onClose();
        } catch (err) {
            console.error("Failed to update status", err);
            setError(err.message || 'Failed to update lead status.');
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-text-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-bg-card border border-border-subtle rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-main">
                    <div className="flex items-center gap-2.5">
                        <RefreshCw className="w-5 h-5 text-brand-teal" />
                        <h2 className="text-lg font-bold text-text-primary">Change Lead Status</h2>
                    </div>
                    <button onClick={onClose} className="btn btn-primary btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-medium rounded-xl flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <div>
                        <span className="block text-xs font-semibold uppercase text-text-muted mb-1">Lead Reference</span>
                        <p className="text-sm font-bold text-text-primary">{lead.leadNumber} ({lead.fullName})</p>
                    </div>

                    <div>
                        <span className="block text-xs font-semibold uppercase text-text-muted mb-1">Current Status</span>
                        <div className="mt-1">
                            <StatusBadge status={currentStatus} />
                        </div>
                    </div>

                    {validOptions.length === 0 ? (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                            This lead is in terminal status ({currentStatus}) and cannot be transitioned further.
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-xs font-semibold uppercase text-text-muted mb-1">New Status *</label>
                                <select
                                    value={targetStatus}
                                    onChange={(e) => setTargetStatus(e.target.value)}
                                    className="w-full px-3 py-2 text-sm bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                                >
                                    {validOptions.map(st => (
                                        <option key={st} value={st}>{st}</option>
                                    ))}
                                </select>
                            </div>

                            {targetStatus === 'LOST' && (
                                <div>
                                    <label className="block text-xs font-semibold uppercase text-text-muted mb-1">Lost Reason *</label>
                                    <textarea
                                        rows={3}
                                        required
                                        value={lostReason}
                                        onChange={(e) => setLostReason(e.target.value)}
                                        placeholder="Specify why this lead was lost (e.g., Price too high, Competitor selected, Budget cut)..."
                                        className="w-full px-3 py-2 text-sm bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                                    />
                                </div>
                            )}
                        </>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-primary btn-md"
                        >
                            Cancel
                        </button>
                        {validOptions.length > 0 && (
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn btn-primary btn-md"
                            >
                                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Update Status
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
