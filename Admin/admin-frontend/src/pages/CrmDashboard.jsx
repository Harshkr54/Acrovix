import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCrmDashboardSummary } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
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
    XCircle, 
    DollarSign, 
    ArrowRight,
    Users,
    Clock,
    Phone,
    Mail,
    Building
} from 'lucide-react';

export default function CrmDashboard() {
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);

    const fetchSummary = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getCrmDashboardSummary();
            setSummary(data);
        } catch (err) {
            console.error("Failed to load CRM Dashboard summary", err);
            setError(err.message || "Failed to load dashboard summary");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, []);

    if (loading) {
        return (
            <div className="space-y-6">
                <PageHeader title="CRM Dashboard" subtitle="Overview of sales activities and pipeline" icon={LayoutDashboard} />
                <EmptyState loading message="Loading CRM metrics..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <PageHeader title="CRM Dashboard" subtitle="Overview of sales activities and pipeline" icon={LayoutDashboard} />
                <EmptyState type="error" error={error} onRetry={fetchSummary} />
            </div>
        );
    }

    const {
        totalLeads = 0,
        newLeads = 0,
        qualifiedLeads = 0,
        openOpportunities = 0,
        wonLeads = 0,
        lostLeads = 0,
        pipelineValue = 0,
        wonValue = 0,
        leadsByStatus = {},
        todaysFollowUps = [],
        recentLeads = []
    } = summary || {};

    const quickActions = (
        <div className="flex items-center gap-2">
            <button
                onClick={() => navigate('/crm/pipeline')}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 border border-border-subtle rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
                <Kanban className="w-4 h-4 text-[#0D9488]" />
                Pipeline
            </button>
            <button
                onClick={() => navigate('/crm/follow-ups')}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 border border-border-subtle rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
                <Calendar className="w-4 h-4 text-amber-500" />
                Follow-ups
            </button>
            <button
                onClick={() => setIsCreateLeadOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0D9488] hover:bg-[#0B7A70] text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
            >
                <Plus className="w-4 h-4" />
                New Lead
            </button>
        </div>
    );

    return (
        <div className="space-y-6 pb-12">
            <PageHeader 
                title="CRM & Sales Dashboard" 
                subtitle="Overview of leads, opportunities, pipeline and follow-up activities" 
                icon={LayoutDashboard} 
                action={quickActions}
            />

            {/* Metrics Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Total Leads</span>
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                            <Target className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                        <span className="text-2xl font-bold text-text-primary">{totalLeads}</span>
                        <span className="text-xs text-text-muted">{newLeads} new</span>
                    </div>
                </div>

                <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Open Opportunities</span>
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                        <span className="text-2xl font-bold text-text-primary">{openOpportunities}</span>
                        <span className="text-xs text-text-muted">{qualifiedLeads} qualified</span>
                    </div>
                </div>

                <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Pipeline Value</span>
                        <div className="w-9 h-9 rounded-xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <span className="text-2xl font-bold text-text-primary">{formatCurrency(pipelineValue)}</span>
                        <p className="text-xs text-text-muted mt-0.5">Active deals in pipeline</p>
                    </div>
                </div>

                <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Won Revenue</span>
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                        <span className="text-2xl font-bold text-text-primary">{formatCurrency(wonValue)}</span>
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{wonLeads} won</span>
                    </div>
                </div>
            </div>

            {/* Pipeline Status Breakdown */}
            <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                        <Kanban className="w-5 h-5 text-[#0D9488]" />
                        Pipeline Stage Breakdown
                    </h2>
                    <button
                        onClick={() => navigate('/crm/pipeline')}
                        className="text-xs font-semibold text-[#0D9488] hover:underline flex items-center gap-1"
                    >
                        View Full Pipeline <ArrowRight className="w-3.5 h-3.5" />
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
                        const count = leadsByStatus[st.key] || 0;
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

            {/* Two Column Layout: Today's Follow-ups & Recent Leads */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Today's Follow-ups */}
                <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                                <Clock className="w-5 h-5 text-amber-500" />
                                Today's Follow-ups
                            </h2>
                            <button
                                onClick={() => navigate('/crm/follow-ups')}
                                className="text-xs font-semibold text-[#0D9488] hover:underline flex items-center gap-1"
                            >
                                All Follow-ups <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {todaysFollowUps.length === 0 ? (
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
                                                <span className="text-xs font-bold text-text-primary truncate">{fu.leadNumber} - {fu.leadFullName}</span>
                                                <StatusBadge status={fu.followUpType} />
                                            </div>
                                            <p className="text-xs text-text-muted mt-1 truncate">{fu.notes || 'No agenda notes'}</p>
                                        </div>
                                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                                            {formatDateTime(fu.scheduledDate)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Leads */}
                <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                                <Users className="w-5 h-5 text-[#0D9488]" />
                                Recent Leads
                            </h2>
                            <button
                                onClick={() => navigate('/crm/leads')}
                                className="text-xs font-semibold text-[#0D9488] hover:underline flex items-center gap-1"
                            >
                                View All Leads <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {recentLeads.length === 0 ? (
                            <EmptyState emptyMessage="No recent leads created." icon={Target} />
                        ) : (
                            <div className="space-y-3">
                                {recentLeads.map(lead => (
                                    <div 
                                        key={lead.id} 
                                        onClick={() => navigate(`/crm/leads/${lead.id}`)}
                                        className="p-3 bg-bg-main border border-border-subtle rounded-xl hover:border-text-muted transition-colors cursor-pointer flex items-center justify-between gap-3"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-text-primary">{lead.leadNumber}</span>
                                                <span className="text-xs text-text-primary truncate">{lead.fullName}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                                                {lead.companyName && <span className="truncate">{lead.companyName}</span>}
                                                <span>• {formatCurrency(lead.estimatedValue)}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <StatusBadge status={lead.status} />
                                        </div>
                                    </div>
                                ))}
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
                    fetchSummary();
                }}
            />
        </div>
    );
}
