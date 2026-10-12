import React from 'react';
import { X, User, Mail, Shield, Calendar, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { formatDate, formatDateTime } from '../utils/formatters';

export default function UserDetailsModal({ user, onClose, onReactivate }) {
    if (!user) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border-subtle overflow-hidden animate-modal-entrance">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-border-subtle bg-bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-base">
                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-text-primary tracking-tight">{user.name}</h2>
                            <p className="text-[12px] text-text-secondary">{user.email}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Details Body */}
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3.5 bg-bg-main rounded-xl border border-border-subtle">
                            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-1">Status</span>
                            {user.enabled ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Active
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                    <XCircle className="w-3.5 h-3.5" />
                                    Inactive
                                </span>
                            )}
                        </div>

                        <div className="p-3.5 bg-bg-main rounded-xl border border-border-subtle">
                            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-1">Role</span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Shield className="w-3.5 h-3.5" />
                                {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Sales'}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between p-3 bg-bg-main rounded-xl border border-border-subtle">
                            <div className="flex items-center gap-2 text-text-secondary text-[13px]">
                                <User className="w-4 h-4 text-text-muted" />
                                <span>User ID</span>
                            </div>
                            <span className="text-[13px] font-mono font-semibold text-text-primary">#{user.id}</span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-bg-main rounded-xl border border-border-subtle">
                            <div className="flex items-center gap-2 text-text-secondary text-[13px]">
                                <Mail className="w-4 h-4 text-text-muted" />
                                <span>Email Address</span>
                            </div>
                            <span className="text-[13px] font-medium text-text-primary">{user.email}</span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-bg-main rounded-xl border border-border-subtle">
                            <div className="flex items-center gap-2 text-text-secondary text-[13px]">
                                <Calendar className="w-4 h-4 text-text-muted" />
                                <span>Account Created</span>
                            </div>
                            <span className="text-[13px] font-medium text-text-primary">{formatDate(user.createdAt)}</span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-bg-main rounded-xl border border-border-subtle">
                            <div className="flex items-center gap-2 text-text-secondary text-[13px]">
                                <Clock className="w-4 h-4 text-text-muted" />
                                <span>Last Login</span>
                            </div>
                            <span className="text-[13px] font-medium text-text-primary">
                                {user.lastLogin ? formatDateTime(user.lastLogin) : 'Never logged in'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 border-t border-border-subtle bg-bg-muted/30 flex justify-between items-center">
                    {!user.enabled && onReactivate ? (
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onReactivate(user);
                            }}
                            className="btn btn-primary btn-md"
                        >
                            Reactivate User
                        </button>
                    ) : <div />}
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-secondary btn-md"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
