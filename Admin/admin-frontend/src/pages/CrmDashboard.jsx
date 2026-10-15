import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    getCrmDashboardSummary, 
    getDueFollowUpsToday, 
    getOverdueFollowUps,
    getCrmLeads 
} from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import StatusBadge from '../components/ui/StatusBadge';
import CreateLeadModal from '../components/CreateLeadModal';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { 
    LayoutDashboard, 
    Plus, 
    Target, 
    Kanban, 
    Calendar, 
    TrendingUp, 
    CheckCircle2, 
    DollarSign, 
    ArrowRight,
    Users,
    Clock,
    AlertTriangle,
    Receipt,
    Wallet,
    Percent,
    RefreshCw
} from 'lucide-react';

export default function CrmDashboard() {
    const navigate = useNavigate();

    // Independent section states
    const [summary, setSummary] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [summaryError, setSummaryError] = useState(null);

    const [todaysFollowUps, setTodaysFollowUps] = useState([]);
    const [overdueFollowUps, setOverdueFollowUps] = useState([]);
    const [followUpsTab, setFollowUpsTab] = useState('dueToday'); // 'dueToday' | 'overdue'
    const [followUpsLoading, setFollowUpsLoading] = useState(true);
    const [followUpsError, setFollowUpsError] = useState(null);

    const [recentLeads, setRecentLeads] = useState([]);
    const [recentLeadsLoading, setRecentLeadsLoading] = useState(true);
    const [recentLeadsError, setRecentLeadsError] = useState(null);

    const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);

    // Fetch summary metrics
    const fetchSummary = useCallback(async () => {
        try {
            setSummaryLoading(true);
            setSummaryError(null);
            const data = await getCrmDashboardSummary();
            setSummary(data);
        } catch (err) {
            console.error("Failed to load CRM summary", err);
            setSummaryError(err.message || "Failed to load CRM metrics");
        } finally {
            setSummaryLoading(false);
        }
    }, []);

    // Fetch follow-ups (both due today and overdue)
    const fetchFollowUps = useCallback(async () => {
        try {
            setFollowUpsLoading(true);
            setFollowUpsError(null);
            const [dueToday, overdue] = await Promise.all([
                getDueFollowUpsToday().catch(() => []),
                getOverdueFollowUps().catch(() => [])
            ]);
            setTodaysFollowUps(Array.isArray(dueToday) ? dueToday : []);
            setOverdueFollowUps(Array.isArray(overdue) ? overdue : []);
        } catch (err) {
            console.error("Failed to load follow-ups", err);
            setFollowUpsError(err.message || "Failed to load follow-ups");
        } finally {
            setFollowUpsLoading(false);
        }
    }, []);

    // Fetch recent leads
    const fetchRecentLeads = useCallback(async () => {
        try {
            setRecentLeadsLoading(true);
            setRecentLeadsError(null);
            const data = await getCrmLeads({ page: 0, size: 5 });
            const list = data?.content || (Array.isArray(data) ? data : []);
            setRecentLeads(list);
        } catch (err) {
            console.error("Failed to load recent leads", err);
            setRecentLeadsError(err.message || "Failed to load recent leads");
        } finally {
            setRecentLeadsLoading(false);
        }
    }, []);

    // Refresh all widgets
    const handleRefreshAll = () => {
        fetchSummary();
        fetchFollowUps();
        fetchRecentLeads();
    };

    useEffect(() => {
        fetchSummary();
        fetchFollowUps();
        fetchRecentLeads();
    }, [fetchSummary, fetchFollowUps, fetchRecentLeads]);

    const {
        totalLeads = 0,
        totalOpenLeads = 0,
        newLeads = 0,
        qualifiedLeads = 0,
        wonCount = 0,
        openPipelineValue = 0,
        wonValue = 0,
        invoicedRevenue = 0,
        collectedRevenue = 0,
        winRatePercent = 0,
        staleOpportunitiesCount = 0,
        statusBreakdown = {},
        openPipelineValueByCurrency = {},
        wonValueByCurrency = {}
    } = summary || {};

    const quickActions = (
        <div className="flex items-center gap-2">
            <button
                onClick={handleRefreshAll}
                className="btn btn-secondary btn-icon"
                title="Refresh CRM Dashboard"
                aria-label="Refresh CRM Dashboard"
            >
                <RefreshCw className="w-4 h-4 text-text-muted hover:text-text-primary" />
            </button>
            <button
                onClick={() => navigate('/crm/pipeline')}
                className="btn btn-secondary btn-sm hidden sm:inline-flex"
            >
                <Kanban className="w-4 h-4 text-brand-teal" />
                Pipeline
            </button>
            <button
                onClick={() => navigate('/crm/follow-ups')}
                className="btn btn-secondary btn-sm hidden sm:inline-flex"
            >
                <Calendar className="w-4 h-4 text-amber-500" />
                Follow-ups
            </button>
            <button
                onClick={() => setIsCreateLeadOpen(true)}
                className="btn btn-primary btn-sm flex items-center gap-1.5"
            >
                <Plus className="w-4 h-4" />
                New Lead
            </button>
        </div>
    );

    const isLeadStale = (createdAt, status) => {
        if (!createdAt || status === 'WON' || status === 'LOST') return false;
        const leadDate = new Date(createdAt);
        const daysDiff = (new Date() - leadDate) / (1000 * 60 * 60 * 24);
        return daysDiff > 14;
    };

    return (
        <div className="space-y-6 pb-12">
            <PageHeader 
                title="CRM Dashboard" 
                subtitle="Sales pipeline, operational leads and verified revenue tracking." 
                icon={LayoutDashboard} 
                action={quickActions}
            />

            {/* Metrics Cards Grid */}
            {summaryLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(n => (
                        <div key={n} className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm space-y-3">
                            <Skeleton variant="text" className="w-24 h-4" />
                            <Skeleton variant="title" className="w-32 h-8" />
                            <Skeleton variant="text" className="w-20 h-3" />
                        </div>
                    ))}
                </div>
            ) : summaryError ? (
                <div className="bg-bg-card border border-border-subtle rounded-2xl p-6">
                    <EmptyState type="error" error={summaryError} onRetry={fetchSummary} />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Total Leads */}
                        <div 
                            onClick={() => navigate('/crm/leads')}
                            className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-brand-primary/40 transition-all cursor-pointer group"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate('/crm/leads'); }}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider group-hover:text-brand-primary transition-colors">
                                    Total Leads
                                </span>
                                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                    <Target className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="mt-3 flex items-baseline justify-between">
                                <span className="text-2xl font-bold text-text-primary">{totalLeads}</span>
                                <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{newLeads} new</span>
                            </div>
                            <p className="text-[11px] text-text-muted mt-1">All managed CRM prospects</p>
                        </div>

                        {/* Open Opportunities & Stale Indicator */}
                        <div 
                            onClick={() => navigate('/crm/leads')}
                            className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-amber-500/40 transition-all cursor-pointer group"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate('/crm/leads'); }}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider group-hover:text-amber-500 transition-colors">
                                    Open Opportunities
                                </span>
                                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="mt-3 flex items-baseline justify-between">
                                <span className="text-2xl font-bold text-text-primary">{totalOpenLeads}</span>
                                <span className="text-xs text-text-muted">{qualifiedLeads} qualified</span>
                            </div>
                            <div className="mt-1 flex items-center gap-1.5">
                                {staleOpportunitiesCount > 0 ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                                        <AlertTriangle className="w-3 h-3" />
                                        {staleOpportunitiesCount} stale (&gt;14d idle)
                                    </span>
                                ) : (
                                    <span className="text-[11px] text-text-muted">All opportunities active</span>
                                )}
                            </div>
                        </div>

                        {/* Pipeline Value */}
                        <div 
                            onClick={() => navigate('/crm/pipeline')}
                            className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-brand-teal/40 transition-all cursor-pointer group"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate('/crm/pipeline'); }}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider group-hover:text-brand-teal transition-colors">
                                    Pipeline Value
                                </span>
                                <div className="w-9 h-9 rounded-xl bg-brand-teal/10 text-brand-teal flex items-center justify-center">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="mt-3">
                                {openPipelineValueByCurrency && Object.keys(openPipelineValueByCurrency).length > 0 ? (
                                    <div className="space-y-1">
                                        {Object.entries(openPipelineValueByCurrency).map(([curr, val]) => (
                                            <div key={curr} className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-text-muted">{curr}</span>
                                                <span className="text-lg font-bold text-text-primary">{formatCurrency(val, curr)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-2xl font-bold text-text-primary">{formatCurrency(openPipelineValue, 'INR')}</span>
                                )}
                                <p className="text-xs text-text-muted mt-1">Estimated active pipeline size</p>
                            </div>
                        </div>

                        {/* Won Deal Value (Pipeline) */}
                        <div 
                            onClick={() => navigate('/crm/leads?status=WON')}
                            className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-emerald-500/40 transition-all cursor-pointer group"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate('/crm/leads?status=WON'); }}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider group-hover:text-emerald-500 transition-colors">
                                    Won Deal Value
                                </span>
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="mt-3">
                                {wonValueByCurrency && Object.keys(wonValueByCurrency).length > 0 ? (
                                    <div className="space-y-1">
                                        {Object.entries(wonValueByCurrency).map(([curr, val]) => (
                                            <div key={curr} className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-text-muted">{curr}</span>
                                                <span className="text-lg font-bold text-text-primary">{formatCurrency(val, curr)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-2xl font-bold text-text-primary">{formatCurrency(wonValue, 'INR')}</span>
                                )}
                                <div className="flex items-center justify-between mt-1 text-xs">
                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{wonCount} won deals</span>
                                    <span className="text-text-muted font-medium">{winRatePercent}% win rate</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Verified Revenue & Financial Reconciliation Sub-banner */}
                    <div className="bg-gradient-to-r from-bg-card via-bg-card to-bg-main border border-border-subtle rounded-2xl p-4 sm:p-5 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                                    <Receipt className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-text-primary">Realized Financial Operations</h3>
                                    <p className="text-xs text-text-muted">Actual tax invoices issued and bank-verified cash collections</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-6 sm:gap-8">
                                <div className="flex items-center gap-3">
                                    <Receipt className="w-4 h-4 text-blue-500" />
                                    <div>
                                        <span className="text-[11px] font-semibold text-text-muted uppercase">Active Invoiced</span>
                                        <p className="text-base font-bold text-text-primary">{formatCurrency(invoicedRevenue, 'INR')}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Wallet className="w-4 h-4 text-emerald-500" />
                                    <div>
                                        <span className="text-[11px] font-semibold text-text-muted uppercase">Cash Collected</span>
                                        <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(collectedRevenue, 'INR')}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Percent className="w-4 h-4 text-purple-500" />
                                    <div>
                                        <span className="text-[11px] font-semibold text-text-muted uppercase">Pipeline Conversion</span>
                                        <p className="text-base font-bold text-text-primary">{winRatePercent}%</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Pipeline Status Breakdown - Interactive Stage Cards */}
            <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                            <Kanban className="w-5 h-5 text-brand-teal" />
                            Pipeline Stage Breakdown
                        </h2>
                        <p className="text-xs text-text-muted mt-0.5">Click any stage card to view filtered pipeline leads</p>
                    </div>
                    <button
                        onClick={() => navigate('/crm/pipeline')}
                        className="btn btn-secondary btn-sm flex items-center gap-1.5"
                    >
                        View Full Pipeline <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                    {[
                        { key: 'NEW', label: 'New', color: 'bg-blue-500', hoverBorder: 'hover:border-blue-500/50' },
                        { key: 'CONTACTED', label: 'Contacted', color: 'bg-cyan-500', hoverBorder: 'hover:border-cyan-500/50' },
                        { key: 'QUALIFIED', label: 'Qualified', color: 'bg-indigo-500', hoverBorder: 'hover:border-indigo-500/50' },
                        { key: 'PROPOSAL', label: 'Proposal', color: 'bg-amber-500', hoverBorder: 'hover:border-amber-500/50' },
                        { key: 'NEGOTIATION', label: 'Negotiation', color: 'bg-orange-500', hoverBorder: 'hover:border-orange-500/50' },
                        { key: 'WON', label: 'Won', color: 'bg-emerald-500', hoverBorder: 'hover:border-emerald-500/50' },
                        { key: 'LOST', label: 'Lost', color: 'bg-rose-500', hoverBorder: 'hover:border-rose-500/50' }
                    ].map(st => {
                        const count = statusBreakdown[st.key] || 0;
                        return (
                            <div 
                                key={st.key} 
                                onClick={() => navigate(`/crm/pipeline?stage=${st.key}`)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/crm/pipeline?stage=${st.key}`); }}
                                aria-label={`View ${st.label} leads (${count})`}
                                className={`p-3 bg-bg-main border border-border-subtle rounded-xl flex flex-col justify-between cursor-pointer hover:shadow-sm ${st.hoverBorder} transition-all group`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-text-muted group-hover:text-text-primary transition-colors">{st.label}</span>
                                    <div className={`w-2.5 h-2.5 rounded-full ${st.color}`} />
                                </div>
                                <div className="flex items-baseline justify-between">
                                    <span className="text-xl font-bold text-text-primary">{count}</span>
                                    <ArrowRight className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Two Column Layout: Follow-ups & Recent Leads */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Follow-ups Widget with Tabs */}
                <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-amber-500" />
                                <div className="flex items-center bg-bg-main p-1 rounded-xl border border-border-subtle">
                                    <button
                                        onClick={() => setFollowUpsTab('dueToday')}
                                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                                            followUpsTab === 'dueToday'
                                                ? 'bg-bg-card text-text-primary shadow-sm'
                                                : 'text-text-muted hover:text-text-primary'
                                        }`}
                                    >
                                        Due Today ({todaysFollowUps.length})
                                    </button>
                                    <button
                                        onClick={() => setFollowUpsTab('overdue')}
                                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                                            followUpsTab === 'overdue'
                                                ? 'bg-bg-card text-rose-600 dark:text-rose-400 shadow-sm'
                                                : 'text-text-muted hover:text-rose-500'
                                        }`}
                                    >
                                        Overdue ({overdueFollowUps.length})
                                        {overdueFollowUps.length > 0 && (
                                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                        )}
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/crm/follow-ups')}
                                className="btn btn-secondary btn-sm flex items-center gap-1.5"
                            >
                                All <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {followUpsLoading ? (
                            <div className="space-y-3 py-4">
                                <Skeleton variant="table-row" />
                                <Skeleton variant="table-row" />
                                <Skeleton variant="table-row" />
                            </div>
                        ) : followUpsError ? (
                            <EmptyState type="error" error={followUpsError} onRetry={fetchFollowUps} />
                        ) : followUpsTab === 'dueToday' ? (
                            todaysFollowUps.length === 0 ? (
                                <EmptyState emptyMessage="No follow-ups due today." icon={Calendar} />
                            ) : (
                                <div className="space-y-3">
                                    {todaysFollowUps.map(fu => (
                                        <div 
                                            key={fu.id} 
                                            onClick={() => navigate(`/crm/leads/${fu.leadId}`)}
                                            className="p-3 bg-bg-main border border-border-subtle rounded-xl hover:border-text-muted transition-colors cursor-pointer flex items-center justify-between gap-3"
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-text-primary truncate">{fu.leadNumber} - {fu.leadName}</span>
                                                    <StatusBadge status={fu.type} />
                                                </div>
                                                <p className="text-xs text-text-muted mt-1 truncate">{fu.notes || 'No agenda notes'}</p>
                                            </div>
                                            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                                                {formatDateTime(fu.scheduledAt)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )
                        ) : (
                            overdueFollowUps.length === 0 ? (
                                <EmptyState emptyMessage="No overdue follow-ups! Pipeline is up to date." icon={CheckCircle2} />
                            ) : (
                                <div className="space-y-3">
                                    {overdueFollowUps.map(fu => (
                                        <div 
                                            key={fu.id} 
                                            onClick={() => navigate(`/crm/leads/${fu.leadId}`)}
                                            className="p-3 bg-bg-main border border-rose-500/20 rounded-xl hover:border-rose-500/40 transition-colors cursor-pointer flex items-center justify-between gap-3"
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-text-primary truncate">{fu.leadNumber} - {fu.leadName}</span>
                                                    <StatusBadge status={fu.type} />
                                                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-500/10 text-rose-500">
                                                        OVERDUE
                                                    </span>
                                                </div>
                                                <p className="text-xs text-text-muted mt-1 truncate">{fu.notes || 'No agenda notes'}</p>
                                            </div>
                                            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 shrink-0">
                                                {formatDateTime(fu.scheduledAt)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* Recent Leads Widget */}
                <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                                <Users className="w-5 h-5 text-brand-teal" />
                                Recent Leads
                            </h2>
                            <button
                                onClick={() => navigate('/crm/leads')}
                                className="btn btn-secondary btn-sm flex items-center gap-1.5"
                            >
                                View All Leads <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {recentLeadsLoading ? (
                            <div className="space-y-3 py-4">
                                <Skeleton variant="table-row" />
                                <Skeleton variant="table-row" />
                                <Skeleton variant="table-row" />
                            </div>
                        ) : recentLeadsError ? (
                            <EmptyState type="error" error={recentLeadsError} onRetry={fetchRecentLeads} />
                        ) : recentLeads.length === 0 ? (
                            <EmptyState emptyMessage="No recent leads created." icon={Target} />
                        ) : (
                            <div className="space-y-3">
                                {recentLeads.map(lead => {
                                    const stale = isLeadStale(lead.createdAt, lead.status);
                                    return (
                                        <div 
                                            key={lead.id} 
                                            onClick={() => navigate(`/crm/leads/${lead.id}`)}
                                            className="p-3 bg-bg-main border border-border-subtle rounded-xl hover:border-text-muted transition-colors cursor-pointer flex items-center justify-between gap-3"
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-text-primary">{lead.leadNumber}</span>
                                                    <span className="text-xs text-text-primary truncate">{lead.fullName}</span>
                                                    {stale && (
                                                        <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-500/10 text-amber-500">
                                                            Inactive &gt;14d
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                                                    {lead.companyName && <span className="truncate">{lead.companyName}</span>}
                                                    <span>• {formatCurrency(lead.estimatedValue, lead.currency)}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <StatusBadge status={lead.status} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create Lead Modal */}
            <CreateLeadModal
                isOpen={isCreateLeadOpen}
                onClose={() => setIsCreateLeadOpen(false)}
                onSuccess={() => {
                    handleRefreshAll();
                }}
            />
        </div>
    );
}
