import React, { useState } from 'react';
import { AlertCircle, ArrowRight, UserX, Loader2 } from 'lucide-react';
import Modal from './ui/Modal';

export default function DisableUserModal({ user, activeUsers, onClose, onConfirm, isLoading = false }) {
    const [reassignTo, setReassignTo] = useState('');

    const handleConfirm = () => {
        onConfirm(reassignTo ? parseInt(reassignTo, 10) : null);
    };

    const modalFooter = (
        <div className="flex justify-end gap-3 w-full">
            <button onClick={onClose} disabled={isLoading} className="btn btn-secondary btn-md">
                Cancel
            </button>
            <button 
                onClick={handleConfirm} 
                disabled={isLoading}
                className="btn btn-md bg-brand-danger hover:bg-brand-danger/90 text-white disabled:opacity-50 flex items-center gap-1.5"
            >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isLoading ? 'Disabling...' : 'Disable Account'}</span>
            </button>
        </div>
    );

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Disable User Account"
            icon={UserX}
            iconClassName="text-brand-danger bg-brand-danger/10 border-brand-danger/20"
            size="sm"
            isLoading={isLoading}
            footer={modalFooter}
        >
            <div className="space-y-4">
                <div className="bg-brand-danger/10 border border-brand-danger/20 rounded-xl p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-brand-danger shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[13px] font-bold text-brand-danger mb-1">Login Access Will Be Revoked</p>
                        <p className="text-[12px] text-brand-danger/80">
                            Disabling <strong>{user?.name}</strong> {user?.email && `(${user.email})`} will immediately revoke their access and invalidate any active sessions. Historical business records (Invoices, Quotations, Payments) will remain intact and will continue to reference this user.
                        </p>
                    </div>
                </div>

                <div className="space-y-2 pt-2">
                    <label className="block text-[12px] font-bold text-text-primary">
                        Reassign Active Work (Optional)
                    </label>
                    <p className="text-[12px] text-text-secondary mb-3">
                        You can reassign all pending CRM Leads, Enquiries, and Follow-ups to another active team member.
                    </p>
                    
                    <div className="relative">
                        <select 
                            value={reassignTo} 
                            onChange={e => setReassignTo(e.target.value)}
                            disabled={isLoading}
                            className="acx-input rounded-xl text-[13px] bg-bg-main h-11 w-full appearance-none pr-10"
                        >
                            <option value="">Do not reassign (leave unassigned)</option>
                            {activeUsers.map(u => (
                                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <ArrowRight className="h-4 w-4 text-text-muted rotate-90" />
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
