import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCrmPipeline } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import StatusBadge from '../components/ui/StatusBadge';
import CreateLeadModal from '../components/CreateLeadModal';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
    Kanban, 
    Plus, 
    Building2, 
    User, 
    Clock, 
    ChevronRight,
    DollarSign,
    Target
} from 'lucide-react';

const STAGES = [
    { key: 'NEW', label: 'New', color: 'border-t-blue-500' },
    { key: 'CONTACTED', label: 'Contacted', color: 'border-t-cyan-500' },
    { key: 'QUALIFIED', label: 'Qualified', color: 'border-t-indigo-500' },
    { key: 'PROPOSAL', label: 'Proposal', color: 'border-t-amber-500' },
    { key: 'NEGOTIATION', label: 'Negotiation', color: 'border-t-orange-500' },
    { key: 'WON', label: 'Won', color: 'border-t-emerald-500' },
    { key: 'LOST', label: 'Lost', color: 'border-t-rose-500' }
];

export default function CrmPipeline() {
    const navigate = useNavigate();

    const [pipelineData, setPipelineData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [mobileActiveStage, setMobileActiveStage] = useState('NEW');

    const fetchPipeline = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getCrmPipeline();
            const pipelineMap = (data && data.pipeline) ? data.pipeline : (data || {});

            if (pipelineMap && typeof pipelineMap === 'object' && !Array.isArray(pipelineMap)) {
                setPipelineData(pipelineMap);
            } else if (Array.isArray(pipelineMap)) {
                // Group by status
                const grouped = {};
                STAGES.forEach(s => { grouped[s.key] = []; });
                pipelineMap.forEach(lead => {
                    const st = lead.status || 'NEW';
                    if (!grouped[st]) grouped[st] = [];
                    grouped[st].push(lead);
                });
                setPipelineData(grouped);
            } else {
                setPipelineData({});
            }
        } catch (err) {
            console.error("Failed to load CRM pipeline", err);
            setError(err.message || "Failed to load sales pipeline");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPipeline();
    }, []);

    const pageHeaderAction = (
        <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-teal hover:bg-[#0B7A70] text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
        >
            <Plus className="w-4 h-4" />
            New Lead
        </button>
    );

    if (loading) {
        return (
            <div className="space-y-6">
                <PageHeader title="Sales Pipeline" subtitle="Kanban view of deals and sales opportunities" icon={Kanban} action={pageHeaderAction} />
                <EmptyState loading message="Loading sales pipeline..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <PageHeader title="Sales Pipeline" subtitle="Kanban view of deals and sales opportunities" icon={Kanban} action={pageHeaderAction} />
                <EmptyState type="error" error={error} onRetry={fetchPipeline} />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-72px)] overflow-hidden">
            <div className="shrink-0 p-6 pb-2">
                <PageHeader
                title="Sales Pipeline"
                subtitle="Visual Kanban view of leads and deal progress across all sales stages"
                icon={Kanban}
                action={pageHeaderAction}
            />
            </div>

            {/* Mobile Column Selector Tabs */}
            <div className="flex md:hidden shrink-0 overflow-x-auto gap-2 px-6 pb-4 hide-scrollbar">
                {STAGES.map(stage => {
                    const count = (pipelineData[stage.key] || []).length;
                    const isActive = mobileActiveStage === stage.key;
                    return (
                        <button
                            key={stage.key}
                            onClick={() => setMobileActiveStage(stage.key)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0 ${
                                isActive 
                                    ? 'bg-brand-teal text-white border-[#0D9488]' 
                                    : 'bg-bg-card border-border-subtle text-text-secondary hover:text-text-primary'
                            }`}
                        >
                            {stage.label} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Desktop Kanban Board Grid / Mobile Single Column */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden">
                <div className="flex gap-5 px-6 pb-6 h-full items-start w-max">
                {STAGES.map(stage => {
                    const columnLeads = pipelineData[stage.key] || [];
                    const currencyTotals = {};
                    columnLeads.forEach(lead => {
                        const curr = lead.currency || 'INR';
                        const val = Number(lead.estimatedValue) || 0;
                        if (val > 0) {
                            currencyTotals[curr] = (currencyTotals[curr] || 0) + val;
                        }
                    });

                    // Skip non-active columns on mobile viewport
                    const isVisibleOnMobile = mobileActiveStage === stage.key;

                    return (
                        <div 
                            key={stage.key} 
                            className={`bg-bg-card border border-border-subtle rounded-[20px] border-t-[3px] ${stage.color} p-4 flex flex-col w-[280px] md:w-[320px] shrink-0 h-[calc(100vh-220px)] shadow-[0_4px_24px_-4px_rgba(11,25,44,0.03)] ${
                                isVisibleOnMobile ? 'block' : 'hidden md:flex'
                            }`}
                        >
                            {/* Column Header */}
                            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-subtle shrink-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-[13px] font-bold text-text-primary uppercase tracking-wider">{stage.label}</span>
                                    <span className="px-2 py-0.5 rounded-full bg-bg-muted text-[10px] font-bold text-text-muted">
                                        {columnLeads.length}
                                    </span>
                                </div>
                                <div className="text-right">
                                    {Object.keys(currencyTotals).length > 0 ? (
                                        Object.entries(currencyTotals).map(([curr, val]) => (
                                            <div key={curr} className="text-[11px] font-bold text-text-secondary">
                                                {formatCurrency(val, curr)}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-[11px] font-bold text-text-muted">₹0</div>
                                    )}
                                </div>
                            </div>

                            {/* Column Cards Container */}
                            <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2">
                                {columnLeads.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-xs font-medium text-text-muted opacity-70">
                                        No leads
                                    </div>
                                ) : (
                                    columnLeads.map(lead => (
                                        <div
                                            key={lead.id}
                                            onClick={() => navigate(`/crm/leads/${lead.id}`)}
                                            className="p-4 bg-bg-main border border-border-subtle rounded-[16px] hover:border-brand-primary transition-all cursor-pointer shadow-sm space-y-3 group"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-medium text-text-muted uppercase tracking-wide group-hover:text-brand-primary transition-colors">
                                                    {lead.leadNumber}
                                                </span>
                                                <StatusBadge status={lead.priority} />
                                            </div>

                                            <div>
                                                <h4 className="text-[13.5px] font-bold text-text-primary group-hover:text-brand-primary transition-colors truncate">
                                                    {lead.fullName}
                                                </h4>
                                                {lead.companyName && (
                                                    <p className="text-[11px] text-text-muted truncate flex items-center gap-1 mt-0.5">
                                                        <Building2 className="w-3 h-3 text-text-muted shrink-0" />
                                                        {lead.companyName}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="text-[14px] font-bold text-text-primary pt-2 border-t border-border-subtle/50">
                                                {formatCurrency(lead.estimatedValue, lead.currency)}
                                            </div>

                                            <div className="flex items-center justify-between text-[11px] text-text-muted pt-1">
                                                <span className="truncate">
                                                    {lead.assignedTo ? lead.assignedTo.name : 'Unassigned'}
                                                </span>
                                                {lead.nextFollowUpDate && (
                                                    <span className="text-amber-600 dark:text-amber-400 font-semibold shrink-0">
                                                        {formatDate(lead.nextFollowUpDate)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
                </div>
            </div>

            {/* Create Lead Modal */}
            <CreateLeadModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => fetchPipeline()}
            />
        </div>
    );
}
