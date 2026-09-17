import React, { useState, useEffect } from 'react';
import { assignCrmLead, getAdminUsers } from '../services/api';
import { X, Loader2, AlertCircle, UserCheck } from 'lucide-react';

export default function LeadAssignmentModal({ isOpen, onClose, lead, onSuccess }) {
    const [assignedToId, setAssignedToId] = useState('');
    const [adminUsers, setAdminUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && lead) {
            getAdminUsers()
                .then(users => setAdminUsers(Array.isArray(users) ? users : []))
                .catch(err => console.error("Failed to load users", err));

            setAssignedToId(lead.assignedTo ? lead.assignedTo.id : '');
            setError(null);
        }
    }, [isOpen, lead]);

    if (!isOpen || !lead) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const updated = await assignCrmLead(
                lead.id, 
                assignedToId ? Number(assignedToId) : null
            );
            setIsLoading(false);
            if (onSuccess) onSuccess(updated);
            onClose();
        } catch (err) {
            console.error("Failed to assign lead", err);
            setError(err.message || 'Failed to assign lead.');
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-text-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-bg-acx-card border border-border-subtle rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-main">
                    <div className="flex items-center gap-2.5">
                        <UserCheck className="w-5 h-5 text-brand-teal" />
                        <h2 className="text-lg font-bold text-text-primary">Assign Sales Representative</h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
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
                        <label className="block text-xs font-semibold uppercase text-text-muted mb-1">Assigned Salesperson *</label>
                        <select
                            value={assignedToId}
                            onChange={(e) => setAssignedToId(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                        >
                            <option value="">-- Unassigned --</option>
                            {adminUsers.map(u => (
                                <option key={u.id} value={u.id}>{u.name} ({u.role}) - {u.email}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-semibold border border-border-subtle rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-brand-teal hover:bg-[#0B7A70] text-white rounded-xl transition-all shadow-sm disabled:opacity-50"
                        >
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Save Assignment
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
