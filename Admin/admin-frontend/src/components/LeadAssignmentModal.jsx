import React, { useState, useEffect } from 'react';
import { assignCrmLead, getAdminUsers } from '../services/api';
import { Loader2, AlertCircle, UserCheck } from 'lucide-react';
import Modal from './ui/Modal';

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

            setAssignedToId(lead.assignedToId || '');
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
                form="lead-assignment-form"
                disabled={isLoading}
                className="btn btn-primary btn-md flex items-center gap-1.5"
            >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Save Assignment</span>
            </button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Assign Sales Representative"
            subtitle={`${lead.leadNumber} — ${lead.fullName}`}
            icon={UserCheck}
            iconClassName="text-brand-teal bg-brand-teal/10 border-brand-teal/20"
            size="sm"
            isLoading={isLoading}
            footer={modalFooter}
        >
            <form id="lead-assignment-form" onSubmit={handleSubmit} className="space-y-4">
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
                            <option key={u.id} value={u.id}>{u.name || u.fullName || u.username} ({u.role}) - {u.email}</option>
                        ))}
                    </select>
                </div>
            </form>
        </Modal>
    );
}
