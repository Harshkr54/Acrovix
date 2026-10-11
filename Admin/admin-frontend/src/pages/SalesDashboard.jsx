import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    fetchApi, 
    getCrmDashboardSummary, 
    getDueFollowUpsToday, 
    getUpcomingFollowUps 
} from '../services/api';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { useCountUp } from '../hooks/useCountUp';

import CreateQuotationModal from '../components/CreateQuotationModal';
import EnquiryDetailModal from '../components/EnquiryDetailModal';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import StatusBadge from '../components/ui/StatusBadge';

import { 
    LayoutDashboard, 
    Users, 
    FileText, 
    Calendar, 
    Clock, 
    AlertTriangle, 
    TrendingUp, 
    CheckCircle2, 
    DollarSign, 
    ArrowRight, 
    Plus, 
    Target, 
    Inbox, 
    RefreshCw, 
    Briefcase,
    ExternalLink
} from 'lucide-react';

function AnimatedNumber({ value, formatter }) {
    const count = useCountUp(value, 600);
    return formatter ? formatter(count) : Math.round(count);
}

export default function SalesDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [stats, setStats] = useState(null);
    const [crmSummary, setCrmSummary] = useState(null);
    const [dueFollowUps, setDueFollowUps] = useState([]);
    const [upcomingFollowUps, setUpcomingFollowUps] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal states
    const [isCreateQuoteModalOpen, setIsCreateQuoteModalOpen] = useState(false);
    const [selectedEnquiry, setSelectedEnquiry] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const fetchSalesData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [statsRes, crmRes, dueRes, upcomingRes] = await Promise.all([
                fetchApi('/dashboard/stats?dateRange=ALL_TIME').catch(err => {
                    console.error('Failed to fetch sales dashboard stats', err);
                    return null;
                }),
                getCrmDashboardSummary().catch(err => {
                    console.error('Failed to fetch CRM summary', err);
                    return null;
                }),
                getDueFollowUpsToday().catch(err => {
                    console.error('Failed to fetch due followups', err);
                    return [];
                }),
                getUpcomingFollowUps({ size: 5 }).catch(err => {
                    console.error('Failed to fetch upcoming followups', err);
                    return { content: [] };
                })
            ]);

            setStats(statsRes);
            setCrmSummary(crmRes);
            setDueFollowUps(Array.isArray(dueRes) ? dueRes : []);
            setUpcomingFollowUps(upcomingRes?.content || (Array.isArray(upcomingRes) ? upcomingRes : []));
        } catch (err) {
            console.error('Error loading sales dashboard', err);
            setError(err.message || 'Failed to load sales dashboard');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSalesData();
    }, [fetchSalesData]);

    // Computed values
    const myOpenEnquiries = stats?.totalEnquiries || 0;
    const myNewEnquiries = stats?.newEnquiries || 0;
    const quotationsByStatus = stats?.quotationsByStatus || {};
    const myDraftQuotations = quotationsByStatus.DRAFT || 0;
    const mySentQuotations = quotationsByStatus.SENT || 0;
    const myOpenQuotations = myDraftQuotations + mySentQuotations;
    const myWonQuotations = quotationsByStatus.ACCEPTED || 0;

    const totalOpenLeads = crmSummary?.totalOpenLeads || 0;
    const followUpsDueToday = crmSummary?.followUpsDueToday !== undefined 
        ? crmSummary.followUpsDueToday 
        : dueFollowUps.length;
    const overdueFollowUps = crmSummary?.overdueFollowUps || 0;
    const wonDealsCount = crmSummary?.wonCount || 0;
    const openPipelineValue = crmSummary?.openPipelineValue || 0;
    const wonRevenue = crmSummary?.wonValue || 0;
    const statusBreakdown = crmSummary?.statusBreakdown || {};

    const recentEnquiries = stats?.recentEnquiries || [];

    if (isLoading) {
        return (
            <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-10 w-48" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <Skeleton key={i} className="h-28 rounded-2xl" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Skeleton className="h-72 rounded-2xl" />
                    <Skeleton className="h-72 rounded-2xl" />
                </div>
            </div>
        );
    }

    if (error && !stats && !crmSummary) {
        return (
            <div className="p-6 md:p-8 max-w-7xl mx-auto">
                <EmptyState 
                    type="error" 
                    error={error} 
                    onRetry={fetchSalesData} 
                />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 pb-20">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-teal-500/10 via-brand-teal/5 to-transparent border border-brand-teal/20 rounded-2xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30">
                            Sales Workspace
                        </span>
                        <span className="text-xs text-text-muted">
                            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight">
                        Welcome back, {user?.name || user?.username || 'Representative'} 👋
                    </h1>
                    <p className="text-sm text-text-secondary">
                        Here is your sales pipeline overview, active opportunities, and scheduled follow-ups.
                    </p>
                </div>

                <div className="flex items-center flex-wrap gap-2.5 shrink-0">
                    <button
                        onClick={() => setIsCreateQuoteModalOpen(true)}
                        className="btn btn-primary btn-md shadow-sm"
                    >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Create Quotation
                    </button>
                    <button
                        onClick={() => navigate('/crm/leads')}
                        className="btn btn-secondary btn-md"
                    >
                        <Users className="w-4 h-4 mr-1.5 text-brand-teal" />
                        My Leads
                    </button>
                    <button
                        onClick={() => navigate('/crm/follow-ups')}
                        className="btn btn-secondary btn-md"
                    >
                        <Calendar className="w-4 h-4 mr-1.5 text-amber-500" />
                        Follow-ups
                    </button>
                    <button
                        onClick={() => fetchSalesData()}
                        className="btn btn-ghost btn-icon text-text-muted hover:text-text-primary"
                        title="Refresh Data"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Sales KPI Cards Grid (8 Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. My Open Enquiries */}
                <div 
                    onClick={() => navigate('/enquiries')}
                    className="bg-bg-card border border-border-subtle hover:border-brand-teal/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">My Enquiries</span>
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Inbox className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                        <span className="text-2xl font-bold text-text-primary">
                            <AnimatedNumber value={myOpenEnquiries} />
                        </span>
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                            {myNewEnquiries} new
                        </span>
                    </div>
                    <p className="text-[11px] text-text-muted mt-1">Assigned or open queue</p>
                </div>

                {/* 2. My Active Leads */}
                <div 
                    onClick={() => navigate('/crm/leads')}
                    className="bg-bg-card border border-border-subtle hover:border-brand-teal/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Active Leads</span>
                        <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Target className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                        <span className="text-2xl font-bold text-text-primary">
                            <AnimatedNumber value={totalOpenLeads} />
                        </span>
                        <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                            {crmSummary?.qualifiedLeads || 0} qualified
                        </span>
                    </div>
                    <p className="text-[11px] text-text-muted mt-1">Open opportunities</p>
                </div>

                {/* 3. Follow-ups Due Today */}
                <div 
                    onClick={() => navigate('/crm/follow-ups')}
                    className={`bg-bg-card border ${followUpsDueToday > 0 ? 'border-amber-500/40' : 'border-border-subtle'} hover:border-amber-500 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Due Today</span>
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Clock className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                        <span className="text-2xl font-bold text-text-primary">
                            <AnimatedNumber value={followUpsDueToday} />
                        </span>
                        {followUpsDueToday > 0 && (
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 animate-pulse">
                                Action needed
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] text-text-muted mt-1">Scheduled calls & tasks</p>
                </div>

                {/* 4. Overdue Follow-ups */}
                <div 
                    onClick={() => navigate('/crm/follow-ups')}
                    className={`bg-bg-card border ${overdueFollowUps > 0 ? 'border-rose-500/40' : 'border-border-subtle'} hover:border-rose-500 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Overdue</span>
                        <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                        <span className={`text-2xl font-bold ${overdueFollowUps > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-text-primary'}`}>
                            <AnimatedNumber value={overdueFollowUps} />
                        </span>
                        {overdueFollowUps > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                Overdue
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] text-text-muted mt-1">Pending past date</p>
                </div>

                {/* 5. My Open Quotations */}
                <div 
                    onClick={() => navigate('/quotations')}
                    className="bg-bg-card border border-border-subtle hover:border-brand-teal/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Open Quotations</span>
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <FileText className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                        <span className="text-2xl font-bold text-text-primary">
                            <AnimatedNumber value={myOpenQuotations} />
                        </span>
                        <span className="text-xs text-text-muted">
                            {myDraftQuotations} draft
                        </span>
                    </div>
                    <p className="text-[11px] text-text-muted mt-1">Draft & Sent quotes</p>
                </div>

                {/* 6. Awaiting Response (Sent) */}
                <div 
                    onClick={() => navigate('/quotations')}
                    className="bg-bg-card border border-border-subtle hover:border-brand-teal/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Awaiting Response</span>
                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                        <span className="text-2xl font-bold text-text-primary">
                            <AnimatedNumber value={mySentQuotations} />
                        </span>
                        <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                            Sent to client
                        </span>
                    </div>
                    <p className="text-[11px] text-text-muted mt-1">Awaiting client decision</p>
                </div>

                {/* 7. Won Opportunities */}
                <div 
                    onClick={() => navigate('/crm/leads')}
                    className="bg-bg-card border border-border-subtle hover:border-emerald-500/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Won Deals</span>
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                        <span className="text-2xl font-bold text-text-primary">
                            <AnimatedNumber value={wonDealsCount} />
                        </span>
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            {myWonQuotations} accepted
                        </span>
                    </div>
                    <p className="text-[11px] text-text-muted mt-1">Closed successfully</p>
                </div>

                {/* 8. My Pipeline Value */}
                <div 
                    onClick={() => navigate('/crm/pipeline')}
                    className="bg-bg-card border border-border-subtle hover:border-teal-500/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Pipeline Value</span>
                        <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3">
                        {crmSummary?.openPipelineValueByCurrency && Object.keys(crmSummary.openPipelineValueByCurrency).length > 0 ? (
                            <div className="space-y-0.5">
                                {Object.entries(crmSummary.openPipelineValueByCurrency).slice(0, 1).map(([curr, val]) => (
                                    <div key={curr} className="text-xl font-bold text-text-primary truncate">
                                        {formatCurrency(val, curr)}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-xl font-bold text-text-primary truncate">
                                {formatCurrency(openPipelineValue, 'INR')}
                            </div>
                        )}
                        <p className="text-[11px] text-text-muted mt-1">Active weighted deals</p>
                    </div>
                </div>
            </div>

            {/* Pipeline Stage Breakdown */}
            <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-brand-teal" />
                        My Pipeline Stages
                    </h2>
                    <button
                        onClick={() => navigate('/crm/pipeline')}
                        className="btn btn-secondary btn-sm flex items-center gap-1.5"
                    >
                        Open Pipeline <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                    {[
                        { key: 'NEW', label: 'New', color: 'bg-blue-500' },
                        { key: 'CONTACTED', label: 'Contacted', color: 'bg-cyan-500' },
                        { key: 'QUALIFIED', label: 'Qualified', color: 'bg-indigo-500' },
                        { key: 'PROPOSAL', label: 'Proposal', color: 'bg-amber-500' },
                        { key: 'NEGOTIATION', label: 'Negotiation', color: 'bg-orange-500' },
                        { key: 'WON', label: 'Won', color: 'bg-emerald-500' },
                        { key: 'LOST', label: 'Lost', color: 'bg-rose-500' }
                    ].map(st => {
                        const count = statusBreakdown[st.key] || 0;
                        return (
                            <div key={st.key} className="p-3 bg-bg-main border border-border-subtle rounded-xl flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-text-muted">{st.label}</span>
                                    <div className={`w-2 h-2 rounded-full ${st.color}`} />
                                </div>
                                <span className="text-xl font-bold text-text-primary">{count}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Two Column Section: My Follow-ups & Recent Enquiries */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Due Follow-ups Today */}
                <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                                <Clock className="w-5 h-5 text-amber-500" />
                                Today's Follow-ups ({dueFollowUps.length})
                            </h2>
                            <button
                                onClick={() => navigate('/crm/follow-ups')}
                                className="btn btn-secondary btn-sm flex items-center gap-1.5"
                            >
                                All Follow-ups <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {dueFollowUps.length === 0 ? (
                            <EmptyState emptyMessage="No follow-ups due today. You are all caught up!" icon={Calendar} />
                        ) : (
                            <div className="space-y-3">
                                {dueFollowUps.slice(0, 5).map(fu => (
                                    <div 
                                        key={fu.id} 
                                        onClick={() => navigate(`/crm/leads/${fu.leadId}`)}
                                        className="p-3.5 bg-bg-main border border-border-subtle rounded-xl hover:border-brand-teal/40 transition-colors cursor-pointer flex items-center justify-between gap-3"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-text-primary truncate">
                                                    {fu.leadNumber} - {fu.leadName}
                                                </span>
                                                <StatusBadge status={fu.type} />
                                            </div>
                                            <p className="text-xs text-text-muted mt-1 truncate">
                                                {fu.notes || 'No agenda notes provided'}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 block">
                                                {formatDateTime(fu.scheduledAt)}
                                            </span>
                                            <span className="text-[10px] text-text-muted">Click to open lead</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* My Recent Enquiries */}
                <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                                <Inbox className="w-5 h-5 text-brand-teal" />
                                Recent Enquiries ({recentEnquiries.length})
                            </h2>
                            <button
                                onClick={() => navigate('/enquiries')}
                                className="btn btn-secondary btn-sm flex items-center gap-1.5"
                            >
                                View Enquiries <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {recentEnquiries.length === 0 ? (
                            <EmptyState emptyMessage="No recent enquiries found." icon={Inbox} />
                        ) : (
                            <div className="space-y-3">
                                {recentEnquiries.slice(0, 5).map(enq => (
                                    <div 
                                        key={enq.id}
                                        onClick={() => {
                                            setSelectedEnquiry(enq);
                                            setIsDetailModalOpen(true);
                                        }}
                                        className="p-3.5 bg-bg-main border border-border-subtle rounded-xl hover:border-brand-teal/40 transition-colors cursor-pointer flex items-center justify-between gap-3"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-text-primary truncate">
                                                    {enq.company || enq.name}
                                                </span>
                                                <StatusBadge status={enq.status} />
                                            </div>
                                            <div className="text-xs text-text-muted mt-1 truncate">
                                                <span>{enq.email}</span>
                                                {enq.phone && <span> • {enq.phone}</span>}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/quotations/new/${enq.id}`);
                                                }}
                                                className="btn btn-secondary btn-xs text-brand-teal border-brand-teal/20 hover:bg-brand-teal/5"
                                                title="Create Quotation from this enquiry"
                                            >
                                                <FileText className="w-3 h-3 mr-1" /> Quote
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create Quotation Modal */}
            <CreateQuotationModal
                isOpen={isCreateQuoteModalOpen}
                onClose={() => setIsCreateQuoteModalOpen(false)}
                onSuccess={() => {
                    fetchSalesData();
                }}
            />

            {/* Enquiry Detail Modal */}
            <EnquiryDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setSelectedEnquiry(null);
                }}
                enquiry={selectedEnquiry}
                onStatusChange={() => fetchSalesData()}
            />
        </div>
    );
}
