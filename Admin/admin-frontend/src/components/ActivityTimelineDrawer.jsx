import React, { useState, useEffect } from 'react';
import { 
    Clock, History, CheckCircle2, FileText, PenTool, RefreshCw, 
    ArrowRight, User, AlertCircle, X, ShieldCheck, Mail, ShoppingCart, Loader2
} from 'lucide-react';
import { fetchApi } from '../services/api';

export default function ActivityTimelineDrawer({ isOpen, onClose, entityType, entityId, entityTitle }) {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && entityId) {
            loadAuditLogs();
        }
    }, [isOpen, entityId, entityType]);

    const loadAuditLogs = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchApi(`/api/audit-logs?entityType=${encodeURIComponent(entityType)}&entityId=${entityId}`);
            if (Array.isArray(data)) {
                setLogs(data);
            } else {
                setLogs([]);
            }
        } catch (err) {
            console.error("Failed to load audit logs", err);
            setError(err.message || "Failed to load activity logs.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const getActionBadge = (action = '') => {
        const act = action.toUpperCase();
        if (act.includes('ESIGN') || act.includes('DIGITALLY_SIGNED')) {
            return {
                icon: ShieldCheck,
                color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                label: 'E-Sign Accepted'
            };
        }
        if (act.includes('ACCEPTED')) {
            return {
                icon: CheckCircle2,
                color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                label: 'Accepted'
            };
        }
        if (act.includes('SENT')) {
            return {
                icon: Mail,
                color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
                label: 'Sent to Client'
            };
        }
        if (act.includes('REVISED') || act.includes('REVISION')) {
            return {
                icon: RefreshCw,
                color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
                label: 'Revision'
            };
        }
        if (act.includes('INVOICE') || act.includes('CONVERTED')) {
            return {
                icon: FileText,
                color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
                label: 'Invoice'
            };
        }
        if (act.includes('PAYMENT')) {
            return {
                icon: CheckCircle2,
                color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                label: 'Payment'
            };
        }
        return {
            icon: Clock,
            color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
            label: 'Activity'
        };
    };

    return (
        <div id="activity-timeline-drawer" className="fixed inset-0 z-50 overflow-hidden animate-modal-entrance">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 text-slate-100 shadow-2xl flex flex-col">
                    
                    {/* Header */}
                    <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                                <History className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    Activity &amp; Audit Trail
                                </h3>
                                <p className="text-xs text-slate-400">
                                    {entityTitle || `${entityType} #${entityId}`}
                                </p>
                            </div>
                        </div>
                        <button
                            id="close-activity-timeline-btn"
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content List */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {isLoading ? (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                                <Loader2 className="w-8 h-8 animate-spin text-teal-400 mb-2" />
                                <p className="text-xs font-medium">Loading audit history...</p>
                            </div>
                        ) : error ? (
                            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center">
                                <Clock className="w-10 h-10 text-slate-600 mb-2" />
                                <p className="text-sm font-semibold text-slate-300">No Historical Records Yet</p>
                                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                                    Lifecycle milestones will record here automatically as changes occur.
                                </p>
                            </div>
                        ) : (
                            <div className="relative border-l-2 border-slate-800 ml-4 space-y-8 py-2">
                                {logs.map((item, index) => {
                                    const badge = getActionBadge(item.action);
                                    const IconComp = badge.icon;
                                    const createdDate = new Date(item.createdAt);

                                    return (
                                        <div key={item.id || index} className="relative pl-6 group">
                                            {/* Milestone Icon Node */}
                                            <div className={`absolute -left-[17px] top-0 w-8 h-8 rounded-full border ${badge.color} flex items-center justify-center bg-slate-900 shadow-md`}>
                                                <IconComp className="w-4 h-4" />
                                            </div>

                                            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-colors space-y-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${badge.color}`}>
                                                        {badge.label}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 font-mono">
                                                        {createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, {createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>

                                                <p className="text-xs font-semibold text-white leading-snug">
                                                    {item.details || item.action}
                                                </p>

                                                <div className="flex items-center gap-2 pt-1 border-t border-slate-900 text-[11px] text-slate-400">
                                                    <User className="w-3 h-3 text-teal-400" />
                                                    <span>By <strong className="text-slate-300">{item.performedByName || 'System'}</strong></span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-800 bg-slate-950/50 text-[11px] text-slate-400 text-center">
                        Immutable Ledger · Secured with Row-Level Security
                    </div>
                </div>
            </div>
        </div>
    );
}
