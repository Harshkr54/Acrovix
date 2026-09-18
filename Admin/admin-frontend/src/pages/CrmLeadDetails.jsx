import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCrmLeadById, getCrmFollowUpsForLead } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import StatusBadge from '../components/ui/StatusBadge';
import StatusUpdateModal from '../components/StatusUpdateModal';
import LeadAssignmentModal from '../components/LeadAssignmentModal';
import FollowUpModal from '../components/FollowUpModal';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';
import { 
    ArrowLeft, 
    Target, 
    RefreshCw, 
    UserCheck, 
    Calendar, 
    Plus, 
    Building2, 
    Mail, 
    Phone, 
    DollarSign, 
    Clock, 
    FileText, 
    CheckCircle2, 
    XCircle, 
    AlertCircle, 
    Edit3,
    Check,
    Tag,
    User
} from 'lucide-react';

const LIFECYCLE_STAGES = [
    { key: 'NEW', label: 'New' },
    { key: 'CONTACTED', label: 'Contacted' },
    { key: 'QUALIFIED', label: 'Qualified' },
    { key: 'PROPOSAL', label: 'Proposal' },
    { key: 'NEGOTIATION', label: 'Negotiation' },
    { key: 'WON', label: 'Won' }
];

export default function CrmLeadDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [lead, setLead] = useState(null);
    const [followUps, setFollowUps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal state triggers
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [followUpModalState, setFollowUpModalState] = useState({
        isOpen: false,
        mode: 'CREATE',
        followUp: null
    });

    const fetchLeadData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [leadData, followUpData] = await Promise.all([
                getCrmLeadById(id),
                getCrmFollowUpsForLead(id)
            ]);
            setLead(leadData);
            setFollowUps(Array.isArray(followUpData) ? followUpData : []);
        } catch (err) {
            console.error("Failed to load lead details", err);
            setError(err.message || 'Failed to load lead details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchLeadData();
        }
    }, [id]);

    if (loading) {
        return (
            <div className="space-y-6">
                <button
                    onClick={() => navigate('/crm/leads')}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Leads
                </button>
                <EmptyState loading message="Loading lead details..." />
            </div>
        );
    }

    if (error || !lead) {
        return (
            <div className="space-y-6">
                <button
                    onClick={() => navigate('/crm/leads')}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Leads
                </button>
                <EmptyState type="error" error={error || "Lead not found"} onRetry={fetchLeadData} />
            </div>
        );
    }

    const currentStatusIndex = LIFECYCLE_STAGES.findIndex(s => s.key === lead.status);
    const isLost = lead.status === 'LOST';

    return (
        <div className="space-y-6 pb-12">
            {/* Top Navigation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/crm/leads')}
                        className="p-2 border border-border-subtle rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-text-primary">{lead.leadNumber}</h1>
                            <StatusBadge status={lead.status} />
                            <StatusBadge status={lead.priority} />
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">{lead.fullName} {lead.companyName ? `(${lead.companyName})` : ''}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsStatusModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 border border-border-subtle rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
                    >
                        <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                        Status
                    </button>
                    <button
                        onClick={() => setIsAssignModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 border border-border-subtle rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
                    >
                        <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                        Assign
                    </button>
                    <button
                        onClick={() => setFollowUpModalState({ isOpen: true, mode: 'CREATE', followUp: null })}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-teal hover:bg-[#0B7A70] text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add Follow-up
                    </button>
                </div>
            </div>

            {/* Sales Lifecycle Visual Progress */}
            <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-4">Sales Lifecycle Stage</h3>
                {isLost ? (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <XCircle className="w-5 h-5 text-rose-500" />
                            <div>
                                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Lead Marked as LOST</span>
                                <p className="text-xs text-text-muted mt-0.5">Reason: {lead.lostReason || 'No reason specified'}</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="relative flex items-center justify-between">
                        {LIFECYCLE_STAGES.map((stage, idx) => {
                            const isPassed = idx <= currentStatusIndex;
                            const isCurrent = stage.key === lead.status;
                            return (
                                <div key={stage.key} className="flex-1 flex flex-col items-center relative z-10">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                                        isCurrent 
                                            ? 'bg-brand-teal text-white ring-4 ring-[#0D9488]/20 scale-110' 
                                            : isPassed 
                                                ? 'bg-brand-teal/20 text-brand-teal' 
                                                : 'bg-bg-main border border-border-subtle text-text-muted'
                                    }`}>
                                        {isPassed ? <Check className="w-4 h-4" /> : idx + 1}
                                    </div>
                                    <span className={`text-[11px] font-semibold mt-2 ${isCurrent ? 'text-brand-teal' : isPassed ? 'text-text-primary' : 'text-text-muted'}`}>
                                        {stage.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Main Info Cards Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Columns: Lead & Contact Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm space-y-6">
                        <h2 className="text-base font-bold text-text-primary flex items-center gap-2 border-b border-border-subtle pb-3">
                            <Target className="w-5 h-5 text-brand-teal" />
                            Lead Information
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div>
                                <span className="text-text-muted block font-medium">Full Name</span>
                                <span className="text-text-primary font-bold text-sm">{lead.fullName}</span>
                            </div>
                            <div>
                                <span className="text-text-muted block font-medium">Company Name</span>
                                <span className="text-text-primary font-bold text-sm">{lead.companyName || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-text-muted block font-medium">Business Email</span>
                                <span className="text-text-primary font-medium flex items-center gap-1.5 mt-0.5">
                                    <Mail className="w-3.5 h-3.5 text-text-muted" /> {lead.businessEmail}
                                </span>
                            </div>
                            <div>
                                <span className="text-text-muted block font-medium">Phone Number</span>
                                <span className="text-text-primary font-medium flex items-center gap-1.5 mt-0.5">
                                    <Phone className="w-3.5 h-3.5 text-text-muted" /> {lead.phoneNumber || 'N/A'}
                                </span>
                            </div>
                            <div>
                                <span className="text-text-muted block font-medium">Industry Sector</span>
                                <span className="text-text-primary font-medium">{lead.industrySector || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-text-muted block font-medium">Service Required</span>
                                <span className="text-text-primary font-medium">{lead.serviceRequired || 'N/A'}</span>
                            </div>
                        </div>

                        {lead.notes && (
                            <div className="pt-4 border-t border-border-subtle">
                                <span className="text-text-muted block text-xs font-semibold uppercase mb-1">Notes & Requirements</span>
                                <div className="p-3 bg-bg-main border border-border-subtle rounded-xl text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
                                    {lead.notes}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Follow-ups List Section */}
                    <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                            <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-amber-500" />
                                Scheduled & Historical Follow-ups
                            </h2>
                            <button
                                onClick={() => setFollowUpModalState({ isOpen: true, mode: 'CREATE', followUp: null })}
                                className="text-xs font-bold text-brand-teal hover:underline flex items-center gap-1"
                            >
                                <Plus className="w-3.5 h-3.5" /> Schedule Follow-up
                            </button>
                        </div>

                        {followUps.length === 0 ? (
                            <EmptyState emptyMessage="No follow-ups scheduled for this lead." icon={Clock} />
                        ) : (
                            <div className="space-y-3">
                                {followUps.map(fu => {
                                    const isPending = fu.status === 'PENDING';
                                    const isCompleted = fu.status === 'COMPLETED';
                                    const isCancelled = fu.status === 'CANCELLED';

                                    return (
                                        <div key={fu.id} className="p-4 bg-bg-main border border-border-subtle rounded-xl space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <StatusBadge status={fu.followUpType} />
                                                    <StatusBadge status={fu.status} />
                                                </div>
                                                <span className="text-xs font-semibold text-text-muted flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5 text-text-muted" />
                                                    {formatDateTime(fu.scheduledDate)}
                                                </span>
                                            </div>

                                            {fu.notes && (
                                                <p className="text-xs text-text-primary font-medium">{fu.notes}</p>
                                            )}

                                            {fu.outcome && (
                                                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-800 dark:text-emerald-300">
                                                    <span className="font-bold block mb-0.5">Outcome:</span>
                                                    {fu.outcome}
                                                </div>
                                            )}

                                            {isPending && (
                                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle/50">
                                                    <button
                                                        onClick={() => setFollowUpModalState({ isOpen: true, mode: 'EDIT', followUp: fu })}
                                                        className="px-2.5 py-1 text-[11px] font-semibold text-text-secondary hover:text-text-primary border border-border-subtle rounded-lg hover:bg-bg-hover transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => setFollowUpModalState({ isOpen: true, mode: 'CANCEL', followUp: fu })}
                                                        className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 rounded-lg transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => setFollowUpModalState({ isOpen: true, mode: 'COMPLETE', followUp: fu })}
                                                        className="px-3 py-1 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
                                                    >
                                                        Mark Complete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right 1 Column: Deal Metrics & Metadata */}
                <div className="space-y-6">
                    <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted border-b border-border-subtle pb-2">
                            Deal Metrics & Ownership
                        </h3>

                        <div className="space-y-4 text-xs">
                            <div>
                                <span className="text-text-muted block font-medium">Estimated Value</span>
                                <span className="text-xl font-bold text-brand-teal">
                                    {formatCurrency(lead.estimatedValue, lead.currency)}
                                </span>
                            </div>

                            <div>
                                <span className="text-text-muted block font-medium">Deal Win Probability</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="flex-1 h-2 bg-bg-main border border-border-subtle rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-brand-teal" 
                                            style={{ width: `${Math.min(100, lead.probability || 0)}%` }} 
                                        />
                                    </div>
                                    <span className="font-bold text-text-primary">{lead.probability || 0}%</span>
                                </div>
                            </div>

                            <div>
                                <span className="text-text-muted block font-medium">Expected Closing Date</span>
                                <span className="text-text-primary font-semibold">
                                    {formatDate(lead.expectedClosingDate)}
                                </span>
                            </div>

                            <div className="pt-3 border-t border-border-subtle">
                                <span className="text-text-muted block font-medium">Lead Source</span>
                                <span className="text-text-primary font-semibold">{lead.leadSource}</span>
                            </div>

                            <div>
                                <span className="text-text-muted block font-medium">Assigned Sales Owner</span>
                                <span className="text-text-primary font-semibold">
                                    {lead.assignedTo ? lead.assignedTo.name : 'Unassigned'}
                                </span>
                            </div>

                            <div className="pt-3 border-t border-border-subtle text-[11px] text-text-muted space-y-1">
                                <div>Created: {formatDateTime(lead.createdAt)}</div>
                                {lead.createdByName && <div>Created by: {lead.createdByName}</div>}
                                <div>Last Updated: {formatDateTime(lead.updatedAt)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <StatusUpdateModal
                isOpen={isStatusModalOpen}
                lead={lead}
                onClose={() => setIsStatusModalOpen(false)}
                onSuccess={() => fetchLeadData()}
            />

            <LeadAssignmentModal
                isOpen={isAssignModalOpen}
                lead={lead}
                onClose={() => setIsAssignModalOpen(false)}
                onSuccess={() => fetchLeadData()}
            />

            <FollowUpModal
                isOpen={followUpModalState.isOpen}
                mode={followUpModalState.mode}
                leadId={lead.id}
                followUp={followUpModalState.followUp}
                onClose={() => setFollowUpModalState({ isOpen: false, mode: 'CREATE', followUp: null })}
                onSuccess={() => fetchLeadData()}
            />
        </div>
    );
}
