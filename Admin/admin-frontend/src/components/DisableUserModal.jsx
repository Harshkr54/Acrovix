import React, { useState } from 'react';
import { AlertCircle, ArrowRight, UserX, X } from 'lucide-react';

export default function DisableUserModal({ user, activeUsers, onClose, onConfirm, isLoading = false }) {
    const [reassignTo, setReassignTo] = useState('');

    const handleConfirm = () => {
        onConfirm(reassignTo ? parseInt(reassignTo, 10) : null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-bg-main w-full max-w-md rounded-2xl shadow-xl border border-border-subtle overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-border-subtle">
                    <h2 className="text-[18px] font-bold flex items-center text-brand-danger">
                        <UserX className="w-5 h-5 mr-2" />
                        Disable User Account
                    </h2>
                    <button onClick={onClose} disabled={isLoading} className="text-text-muted hover:text-text-primary transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
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
                                className="acx-input rounded-xl text-[13px] bg-bg-card h-11 w-full appearance-none pr-10"
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

                <div className="p-6 border-t border-border-subtle bg-bg-card flex justify-end gap-3">
                    <button onClick={onClose} disabled={isLoading} className="btn btn-secondary btn-md">
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirm} 
                        disabled={isLoading}
                        className="btn btn-md bg-brand-danger hover:bg-brand-danger/90 text-white disabled:opacity-50"
                    >
                        {isLoading ? 'Disabling...' : 'Disable Account'}
                    </button>
                </div>
            </div>
        </div>
    );
}
