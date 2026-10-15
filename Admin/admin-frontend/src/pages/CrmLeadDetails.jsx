import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    getCrmLeadById, 
    getCrmFollowUpsForLead, 
    getLeadActivities, 
    getLeadQuotations,
    createQuotationFromLead 
} from '../services/api';
import EmptyState from '../components/ui/EmptyState';
import StatusBadge from '../components/ui/StatusBadge';
import StatusUpdateModal from '../components/StatusUpdateModal';
import LeadAssignmentModal from '../components/LeadAssignmentModal';
import FollowUpModal from '../components/FollowUpModal';
import LogActivityModal from '../components/LogActivityModal';
import CallActionModal from '../components/CallActionModal';
import EmailActionModal from '../components/EmailActionModal';
import ActivityTimeline from '../components/ActivityTimeline';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';
import { copyToClipboard } from '../utils/crmActionUtils';
import { useToast } from '../context/ToastContext';
import { 
    ArrowLeft, 
    Target, 
    RefreshCw, 
    UserCheck, 
    Calendar, 
    Plus, 
    Mail, 
    Phone, 
    DollarSign, 
    Clock, 
    FileText, 
    XCircle, 
    Check, 
    TrendingUp, 
    RotateCcw, 
    ExternalLink, 
    PhoneCall, 
    FileSpreadsheet, 
    Sparkles,
    Copy 
} from 'lucide-react';

const LIFECYCLE_STAGES = [
    { key: 'NEW', label: 'New', order: 1 },
    { key: 'CONTACTED', label: 'Contacted', order: 2 },
    { key: 'QUALIFIED', label: 'Qualified', order: 3 },
    { key: 'PROPOSAL', label: 'Proposal', order: 4 },
    { key: 'NEGOTIATION', label: 'Negotiation', order: 5 },
    { key: 'WON', label: 'Won', order: 6 }
];

export default function CrmLeadDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [lead, setLead] = useState(null);
    const [followUps, setFollowUps] = useState([]);
    const [activities, setActivities] = useState([]);
    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activitiesLoading, setActivitiesLoading] = useState(false);
    const [creatingQuotation, setCreatingQuotation] = useState(false);
    const [error, setError] = useState(null);

    // Modal state triggers
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isCallModalOpen, setIsCallModalOpen] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isLogActivityModalOpen, setIsLogActivityModalOpen] = useState(false);
    const [logActivityConfig, setLogActivityConfig] = useState({
        defaultType: 'CALL',
        initialSubject: ''
    });
    const [followUpModalState, setFollowUpModalState] = useState({
        isOpen: false,
        mode: 'CREATE',
        followUp: null
    });

    const fetchLeadData = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            setError(null);
            const [leadData, followUpData, activitiesData, quotationData] = await Promise.all([
                getCrmLeadById(id),
                getCrmFollowUpsForLead(id).catch(err => {
                    console.error("Failed to load follow-ups", err);
                    return [];
                }),
                getLeadActivities(id).catch(err => {
                    console.error("Failed to load activities", err);
                    return [];
                }),
                getLeadQuotations(id).catch(err => {
                    console.error("Failed to load quotations", err);
                    return [];
                })
            ]);
            setLead(leadData);
            setFollowUps(Array.isArray(followUpData) ? followUpData : []);
            setActivities(Array.isArray(activitiesData) ? activitiesData : []);
            setQuotations(Array.isArray(quotationData) ? quotationData : []);
        } catch (err) {
            console.error("Failed to load lead details", err);
            setError(err.message || 'Failed to load lead details');
        } finally {
            setLoading(false);
        }
    }, [id]);

    const refreshActivities = useCallback(async () => {
        if (!id) return;
        try {
            setActivitiesLoading(true);
            const data = await getLeadActivities(id);
            setActivities(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to refresh activities", err);
        } finally {
            setActivitiesLoading(false);
        }
    }, [id]);

    const refreshFollowUps = useCallback(async () => {
        if (!id) return;
        try {
            const data = await getCrmFollowUpsForLead(id);
            setFollowUps(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to refresh follow-ups", err);
        }
    }, [id]);

    const refreshQuotations = useCallback(async () => {
        if (!id) return;
        try {
            const data = await getLeadQuotations(id);
            setQuotations(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to refresh quotations", err);
        }
    }, [id]);

    const handleCreateQuotation = async () => {
        try {
            setCreatingQuotation(true);
            const quote = await createQuotationFromLead(id);
            showToast({ type: 'success', message: `Draft Quotation ${quote.quotationNumber || ''} created successfully.` });
            navigate(`/quotations/edit/${quote.id}`);
        } catch (err) {
            console.error("Failed to create quotation from lead", err);
            showToast({ type: 'error', message: err.message || "Failed to create quotation" });
        } finally {
            setCreatingQuotation(false);
        }
    };

    useEffect(() => {
        fetchLeadData();
    }, [fetchLeadData]);

    const handleCallCustomer = () => {
        if (!lead?.phoneNumber) {
            showToast({ type: 'warning', message: 'No phone number available for this lead.' });
            return;
        }
        setIsCallModalOpen(true);
    };

    const handleEmailCustomer = () => {
        if (!lead?.businessEmail) {
            showToast({ type: 'warning', message: 'No business email available for this lead.' });
            return;
        }
        setIsEmailModalOpen(true);
    };

    const handleOpenLogActivity = (type = 'CALL', initialSubject = '') => {
        setLogActivityConfig({
            defaultType: type,
            initialSubject: initialSubject || ''
        });
        setIsLogActivityModalOpen(true);
    };

    const handleCopyContact = async (text, label) => {
        if (!text) return;
        const ok = await copyToClipboard(text);
        if (ok) {
            showToast({ type: 'success', message: `${label} copied to clipboard: ${text}` });
        } else {
            showToast({ type: 'error', message: `Failed to copy ${label.toLowerCase()} to clipboard.` });
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <button
                    onClick={() => navigate('/crm/leads')}
                    className="btn btn-secondary btn-icon"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Leads
                </button>
                <EmptyState loading message="Loading lead details and sales journey..." />
            </div>
        );
    }

    if (error || !lead) {
        return (
            <div className="space-y-6">
                <button
                    onClick={() => navigate('/crm/leads')}
                    className="btn btn-secondary btn-icon"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Leads
                </button>
                <EmptyState type="error" error={error || "Lead not found"} onRetry={fetchLeadData} />
            </div>
        );
    }

    const currentStatusIndex = LIFECYCLE_STAGES.findIndex(s => s.key === lead.status);
    const isLost = lead.status === 'LOST';
    const isWon = lead.status === 'WON';

    // Separate follow-ups into upcoming/pending and past/completed
    const now = new Date();
    const pendingFollowUps = followUps.filter(f => f.status === 'PENDING');
    const pastFollowUps = followUps.filter(f => f.status !== 'PENDING');

    return (
        <div className="space-y-6 pb-12">
            {/* Top Navigation & Lead Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-bg-card border border-border-subtle p-5 rounded-2xl shadow-xs">
                <div className="flex items-start sm:items-center gap-3">
                    <button
                        onClick={() => navigate('/crm/leads')}
                        className="btn btn-secondary btn-icon shrink-0 mt-0.5 sm:mt-0"
                        title="Back to Leads"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <div className="flex flex-wrap items-center gap-2.5">
                            <h1 className="text-2xl font-bold text-text-primary tracking-tight">{lead.leadNumber}</h1>
                            <StatusBadge status={lead.status} />
                            <StatusBadge status={lead.priority} />
                        </div>
                        <p className="text-xs text-text-muted mt-1 flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-text-primary">{lead.fullName}</span>
                            {lead.companyName && (
                                <>
                                    <span>•</span>
                                    <span>{lead.companyName}</span>
                                </>
                            )}
                            {lead.assignedToName && (
                                <>
                                    <span>•</span>
                                    <span className="text-brand-teal font-medium">Assigned to: {lead.assignedToName}</span>
                                </>
                            )}
                        </p>
                    </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 justify-start lg:justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-border-subtle">
                    {/* Quick Call */}
                    {lead.phoneNumber && (
                        <button
                            onClick={handleCallCustomer}
                            className="btn btn-secondary btn-md flex items-center justify-center font-medium"
                            title="Call customer and log discussion"
                        >
                            <PhoneCall className="w-4 h-4 mr-1.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            Call
                        </button>
                    )}

                    {/* Quick Email */}
                    {lead.businessEmail && (
                        <button
                            onClick={handleEmailCustomer}
                            className="btn btn-secondary btn-md flex items-center justify-center font-medium"
                            title="Email customer and log discussion"
                        >
                            <Mail className="w-4 h-4 mr-1.5 text-blue-600 dark:text-blue-400 shrink-0" />
                            Email
                        </button>
                    )}

                    {/* Log Activity */}
                    <button
                        onClick={() => handleOpenLogActivity('CALL')}
                        className="btn btn-secondary btn-md flex items-center justify-center font-medium"
                        title="Log a call, meeting, or customer interaction"
                    >
                        <Plus className="w-4 h-4 mr-1.5 text-brand-teal shrink-0" />
                        Log Activity
                    </button>

                    {/* Update Status */}
                    <button
                        onClick={() => setIsStatusModalOpen(true)}
                        className="btn btn-secondary btn-md flex items-center justify-center font-semibold"
                        title="Progress lead along sales stages"
                    >
                        <RefreshCw className="w-4 h-4 mr-1.5 text-amber-600 dark:text-amber-500 shrink-0" />
                        Update Status
                    </button>

                    {/* Assign Rep */}
                    <button
                        onClick={() => setIsAssignModalOpen(true)}
                        className="btn btn-secondary btn-md flex items-center justify-center font-medium"
                        title="Assign or reassign sales representative"
                    >
                        <UserCheck className="w-4 h-4 mr-1.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        Assign Rep
                    </button>

                    {/* Schedule Follow-up */}
                    <button
                        onClick={() => setFollowUpModalState({ isOpen: true, mode: 'CREATE', followUp: null })}
                        className="btn btn-primary btn-md flex items-center justify-center font-semibold shadow-xs"
                    >
                        <Calendar className="w-4 h-4 mr-1.5 shrink-0" />
                        Schedule Follow-up
                    </button>
                </div>
            </div>

            {/* Sales Lifecycle Visual Progress Bar */}
            <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-brand-teal" />
                        Sales Lifecycle Journey
                    </h3>
                    <span className="text-xs font-medium text-text-muted">
                        Current Stage: <span className="font-bold text-text-primary">{lead.status}</span>
                    </span>
                </div>

                {isLost ? (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-3">
                            <XCircle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5 sm:mt-0" />
                            <div>
                                <span className="text-sm font-bold text-rose-600 dark:text-rose-400 block">Lead Marked as LOST</span>
                                <p className="text-xs text-text-secondary mt-0.5">
                                    <strong className="text-text-primary">Reason:</strong> {lead.lostReason || 'No reason specified'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsStatusModalOpen(true)}
                            className="btn btn-secondary btn-md flex items-center gap-1.5 text-xs font-semibold shrink-0"
                        >
                            <RotateCcw className="w-3.5 h-3.5 text-brand-teal" />
                            Reopen Lead
                        </button>
                    </div>
                ) : isWon ? (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Sparkles className="w-6 h-6 text-emerald-500 shrink-0" />
                            <div>
                                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 block">Deal WON Successfully!</span>
                                <p className="text-xs text-text-secondary mt-0.5">
                                    Final Deal Value: <strong className="text-emerald-700 dark:text-emerald-300 font-bold">{formatCurrency(lead.estimatedValue, lead.currency)}</strong>. Ready for downstream Purchase Order / Execution.
                                </p>
                            </div>
                        </div>
                        {quotations.length > 0 && (
                            <button
                                onClick={() => navigate('/quotations')}
                                className="btn btn-secondary btn-md text-xs font-semibold shrink-0"
                            >
                                View Accepted Quotations
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="relative flex items-center justify-between pt-2 pb-1 overflow-x-auto">
                        <div className="absolute left-6 right-6 top-6 h-0.5 bg-border-subtle -z-0 hidden md:block" />
                        {LIFECYCLE_STAGES.map((stage, idx) => {
                            const isPassed = idx < currentStatusIndex;
                            const isCurrent = stage.key === lead.status;
                            return (
                                <div key={stage.key} className="flex-1 min-w-[70px] flex flex-col items-center relative z-10 px-1">
                                    <button
                                        type="button"
                                        onClick={() => setIsStatusModalOpen(true)}
                                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-xs ${
                                            isCurrent 
                                                ? 'bg-brand-teal text-white ring-4 ring-brand-teal/20 scale-110' 
                                                : isPassed 
                                                    ? 'bg-brand-teal/15 text-brand-teal border border-brand-teal/30 hover:bg-brand-teal/25' 
                                                    : 'bg-bg-main border border-border-subtle text-text-muted hover:border-text-muted'
                                        }`}
                                        title={`Advance to ${stage.label}`}
                                    >
                                        {isPassed ? <Check className="w-4 h-4 stroke-[2.5]" /> : idx + 1}
                                    </button>
                                    <span className={`text-[11px] font-semibold mt-2 text-center ${
                                        isCurrent ? 'text-brand-teal' : isPassed ? 'text-text-primary' : 'text-text-muted'
                                    }`}>
                                        {stage.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Main Content Layout: Responsive 2 Columns on Desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Column (7 cols): Lead Info, Requirements, Quotations, Timeline */}
                <div className="lg:col-span-7 space-y-6">
                    
                    {/* 1. Lead Information & Requirements */}
                    <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-xs space-y-6">
                        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                            <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                                <Target className="w-5 h-5 text-brand-teal" />
                                Lead & Contact Details
                            </h2>
                            <span className="text-xs text-text-muted font-medium">Source: <strong>{lead.leadSource || 'Direct'}</strong></span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div>
                                <span className="text-text-muted block font-medium">Full Name</span>
                                <span className="text-text-primary font-bold text-sm">{lead.fullName || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-text-muted block font-medium">Company Name</span>
                                <span className="text-text-primary font-bold text-sm">{lead.companyName || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-text-muted block font-medium">Business Email</span>
                                <span className="text-text-primary font-medium flex items-center gap-1.5 mt-0.5">
                                    <Mail className="w-3.5 h-3.5 text-text-muted shrink-0" /> 
                                    {lead.businessEmail ? (
                                        <span className="inline-flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={handleEmailCustomer}
                                                className="text-brand-teal hover:underline text-left font-medium"
                                                title="Open Email Actions"
                                            >
                                                {lead.businessEmail}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleCopyContact(lead.businessEmail, 'Email')}
                                                className="p-1 hover:bg-bg-main rounded text-text-muted hover:text-text-primary transition-colors"
                                                title="Copy Email Address"
                                            >
                                                <Copy className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ) : 'N/A'}
                                </span>
                            </div>
                            <div>
                                <span className="text-text-muted block font-medium">Phone Number</span>
                                <span className="text-text-primary font-medium flex items-center gap-1.5 mt-0.5">
                                    <Phone className="w-3.5 h-3.5 text-text-muted shrink-0" /> 
                                    {lead.phoneNumber ? (
                                        <span className="inline-flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={handleCallCustomer}
                                                className="text-brand-teal hover:underline text-left font-medium font-mono"
                                                title="Open Phone Actions"
                                            >
                                                {lead.phoneNumber}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleCopyContact(lead.phoneNumber, 'Phone number')}
                                                className="p-1 hover:bg-bg-main rounded text-text-muted hover:text-text-primary transition-colors"
                                                title="Copy Phone Number"
                                            >
                                                <Copy className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ) : 'N/A'}
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

                        {/* Customer Requirement & Qualification Notes */}
                        <div className="pt-4 border-t border-border-subtle space-y-2">
                            <span className="text-text-muted block text-xs font-semibold uppercase tracking-wider">
                                Customer Requirement & Qualification Notes
                            </span>
                            {lead.notes ? (
                                <div className="p-3.5 bg-bg-main border border-border-subtle rounded-xl text-xs text-text-secondary leading-relaxed whitespace-pre-wrap font-sans">
                                    {lead.notes}
                                </div>
                            ) : (
                                <p className="text-xs text-text-muted italic">No notes or qualification requirements captured yet. Use &ldquo;Update Status&rdquo; or &ldquo;Log Activity&rdquo; to record details.</p>
                            )}
                        </div>
                    </div>

                    {/* 2. Related Quotations */}
                    <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                            <div className="flex items-center gap-2">
                                <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
                                <h2 className="text-base font-bold text-text-primary">Related Quotations</h2>
                                <span className="text-xs font-semibold px-2 py-0.5 bg-bg-main border border-border-subtle rounded-full text-text-muted">
                                    {quotations.length}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={refreshQuotations}
                                    className="btn btn-secondary btn-icon text-xs"
                                    title="Refresh Quotations"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={handleCreateQuotation}
                                    disabled={creatingQuotation}
                                    className="btn btn-secondary btn-md text-xs font-semibold flex items-center gap-1.5"
                                    title="Create draft quotation for this lead"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    {creatingQuotation ? 'Creating...' : 'New Quotation'}
                                </button>
                            </div>
                        </div>

                        {quotations.length === 0 ? (
                            <div className="p-6 text-center bg-bg-main border border-border-subtle rounded-xl space-y-2">
                                <FileText className="w-8 h-8 text-text-muted mx-auto opacity-50" />
                                <p className="text-xs font-semibold text-text-secondary">No quotations linked to this lead yet</p>
                                <p className="text-[11px] text-text-muted max-w-sm mx-auto">
                                    When this lead reaches the Proposal stage, quotations created for this customer or enquiry will appear here automatically.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {quotations.map(q => (
                                    <div 
                                        key={q.id} 
                                        className="p-4 bg-bg-main border border-border-subtle rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-brand-teal/40 transition-colors"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-xs text-text-primary">{q.quotationNumber}</span>
                                                <StatusBadge status={q.status} />
                                            </div>
                                            <div className="text-[11px] text-text-muted flex flex-wrap items-center gap-3">
                                                <span>Amount: <strong className="text-text-primary">{formatCurrency(q.totalAmount, q.currency)}</strong></span>
                                                {q.validUntil && <span>Valid: {formatDate(q.validUntil)}</span>}
                                                <span>Created: {formatDate(q.createdAt)}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/quotations/edit/${q.id}`)}
                                            className="btn btn-secondary btn-md text-xs flex items-center justify-center gap-1 self-start sm:self-center"
                                        >
                                            View / Edit
                                            <ExternalLink className="w-3 h-3 text-text-muted" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 3. Persistent Activity Timeline */}
                    <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-xs space-y-4">
                        <ActivityTimeline
                            activities={activities}
                            loading={activitiesLoading}
                            onRefresh={refreshActivities}
                            onOpenLogModal={() => handleOpenLogActivity('CALL')}
                        />
                    </div>
                </div>

                {/* Right Column (5 cols): Deal Metrics, Ownership & Follow-ups */}
                <div className="lg:col-span-5 space-y-6">
                    
                    {/* 1. Deal Metrics & Ownership */}
                    <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-xs space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted border-b border-border-subtle pb-2 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-brand-teal" />
                            Deal Metrics & Ownership
                        </h3>

                        <div className="space-y-4 text-xs">
                            <div>
                                <span className="text-text-muted block font-medium">Estimated Deal Value</span>
                                <span className="text-2xl font-bold text-brand-teal block mt-0.5">
                                    {formatCurrency(lead.estimatedValue, lead.currency)}
                                </span>
                            </div>

                            <div>
                                <div className="flex items-center justify-between">
                                    <span className="text-text-muted font-medium">Deal Win Probability</span>
                                    <span className="font-bold text-text-primary">{lead.probability || 0}%</span>
                                </div>
                                <div className="w-full h-2 bg-bg-main border border-border-subtle rounded-full overflow-hidden mt-1.5">
                                    <div 
                                        className="h-full bg-brand-teal transition-all duration-500 rounded-full" 
                                        style={{ width: `${Math.min(100, lead.probability || 0)}%` }} 
                                    />
                                </div>
                            </div>

                            <div>
                                <span className="text-text-muted block font-medium">Expected Closing Date</span>
                                <span className="text-text-primary font-semibold text-xs mt-0.5 block">
                                    {lead.expectedClosingDate ? formatDate(lead.expectedClosingDate) : 'Not specified'}
                                </span>
                            </div>

                            <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
                                <div>
                                    <span className="text-text-muted block font-medium">Assigned Representative</span>
                                    <span className="text-text-primary font-bold text-xs mt-0.5 block">
                                        {lead.assignedToName || 'Unassigned'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setIsAssignModalOpen(true)}
                                    className="btn btn-secondary btn-icon text-xs"
                                    title="Change Assigned Representative"
                                >
                                    <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                                </button>
                            </div>

                            <div className="pt-3 border-t border-border-subtle text-[11px] text-text-muted space-y-1">
                                <div className="flex items-center justify-between">
                                    <span>Created:</span>
                                    <span className="text-text-secondary font-medium">{formatDateTime(lead.createdAt)}</span>
                                </div>
                                {lead.createdByName && (
                                    <div className="flex items-center justify-between">
                                        <span>Created by:</span>
                                        <span className="text-text-secondary font-medium">{lead.createdByName}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <span>Last Updated:</span>
                                    <span className="text-text-secondary font-medium">{formatDateTime(lead.updatedAt)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Follow-ups Management */}
                    <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-amber-500" />
                                <h2 className="text-base font-bold text-text-primary">Follow-ups</h2>
                                {pendingFollowUps.length > 0 && (
                                    <span className="text-xs font-bold px-2 py-0.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-full">
                                        {pendingFollowUps.length} pending
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => setFollowUpModalState({ isOpen: true, mode: 'CREATE', followUp: null })}
                                className="btn btn-link btn-icon text-xs text-brand-teal hover:underline"
                            >
                                <Plus className="w-3.5 h-3.5" /> Schedule
                            </button>
                        </div>

                        {followUps.length === 0 ? (
                            <EmptyState emptyMessage="No follow-ups scheduled for this lead." icon={Clock} />
                        ) : (
                            <div className="space-y-3">
                                {/* Pending Follow-ups First */}
                                {pendingFollowUps.map(fu => {
                                    const scheduledDate = new Date(fu.scheduledDate);
                                    const isOverdue = scheduledDate < now;

                                    return (
                                        <div 
                                            key={fu.id} 
                                            className={`p-4 rounded-xl border space-y-2 ${
                                                isOverdue 
                                                    ? 'bg-rose-500/5 border-rose-500/30' 
                                                    : 'bg-bg-main border-border-subtle'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <StatusBadge status={fu.followUpType} />
                                                    <StatusBadge status={fu.status} />
                                                </div>
                                                <span className={`text-xs font-semibold flex items-center gap-1 ${
                                                    isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-text-muted'
                                                }`}>
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {formatDateTime(fu.scheduledDate)}
                                                    {isOverdue && <span className="text-[10px] font-bold uppercase ml-1">(Overdue)</span>}
                                                </span>
                                            </div>

                                            {fu.notes && (
                                                <p className="text-xs text-text-primary font-medium">{fu.notes}</p>
                                            )}

                                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle/50">
                                                <button
                                                    onClick={() => setFollowUpModalState({ isOpen: true, mode: 'EDIT', followUp: fu })}
                                                    className="btn btn-secondary btn-md text-xs"
                                                >
                                                    Reschedule
                                                </button>
                                                <button
                                                    onClick={() => setFollowUpModalState({ isOpen: true, mode: 'CANCEL', followUp: fu })}
                                                    className="btn btn-danger btn-md text-xs"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => setFollowUpModalState({ isOpen: true, mode: 'COMPLETE', followUp: fu })}
                                                    className="btn btn-success btn-md text-xs font-semibold"
                                                >
                                                    Mark Complete
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Historical Completed / Cancelled Follow-ups */}
                                {pastFollowUps.map(fu => (
                                    <div key={fu.id} className="p-3 bg-bg-main/60 border border-border-subtle/70 rounded-xl space-y-1.5 opacity-85">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <StatusBadge status={fu.followUpType} />
                                                <StatusBadge status={fu.status} />
                                            </div>
                                            <span className="text-[11px] text-text-muted">
                                                {formatDateTime(fu.scheduledDate)}
                                            </span>
                                        </div>

                                        {fu.notes && (
                                            <p className="text-[11px] text-text-secondary">{fu.notes}</p>
                                        )}

                                        {fu.outcome && (
                                            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[11px] text-emerald-800 dark:text-emerald-300">
                                                <span className="font-bold">Outcome: </span>
                                                {fu.outcome}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <StatusUpdateModal
                isOpen={isStatusModalOpen}
                lead={lead}
                onClose={() => setIsStatusModalOpen(false)}
                onSuccess={() => {
                    fetchLeadData();
                }}
            />

            <CallActionModal
                isOpen={isCallModalOpen}
                lead={lead}
                onClose={() => setIsCallModalOpen(false)}
                onOpenLogCall={() => handleOpenLogActivity('CALL', `Call with ${lead.fullName}`)}
            />

            <EmailActionModal
                isOpen={isEmailModalOpen}
                lead={lead}
                onClose={() => setIsEmailModalOpen(false)}
                onOpenLogEmail={() => handleOpenLogActivity('EMAIL', `Email to ${lead.fullName}`)}
            />

            <LogActivityModal
                isOpen={isLogActivityModalOpen}
                lead={lead}
                defaultType={logActivityConfig.defaultType}
                initialSubject={logActivityConfig.initialSubject}
                onClose={() => setIsLogActivityModalOpen(false)}
                onSuccess={() => {
                    refreshActivities();
                    fetchLeadData();
                }}
            />

            <LeadAssignmentModal
                isOpen={isAssignModalOpen}
                lead={lead}
                onClose={() => setIsAssignModalOpen(false)}
                onSuccess={() => {
                    fetchLeadData();
                    refreshActivities();
                }}
            />

            <FollowUpModal
                isOpen={followUpModalState.isOpen}
                mode={followUpModalState.mode}
                leadId={lead.id}
                followUp={followUpModalState.followUp}
                onClose={() => setFollowUpModalState({ isOpen: false, mode: 'CREATE', followUp: null })}
                onSuccess={() => {
                    refreshFollowUps();
                    refreshActivities();
                }}
            />
        </div>
    );
}
