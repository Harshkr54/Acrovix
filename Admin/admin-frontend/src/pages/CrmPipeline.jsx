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
        <div className="space-y-6 pb-12">
            <PageHeader
                title="Sales Pipeline"
                subtitle="Visual Kanban view of leads and deal progress across all sales stages"
                icon={Kanban}
                action={pageHeaderAction}
            />

            {/* Mobile Column Selector Tabs */}
            <div className="flex md:hidden overflow-x-auto gap-2 pb-2 hide-scrollbar">
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
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-start overflow-x-auto">
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
                            className={`bg-bg-card border border-border-subtle rounded-2xl border-t-4 ${stage.color} p-3 flex flex-col min-w-[260px] md:min-w-0 shadow-sm ${
                                isVisibleOnMobile ? 'block' : 'hidden md:flex'
                            }`}
                        >
                            {/* Column Header */}
                            <div className="flex items-center justify-between pb-3 border-b border-border-subtle mb-3">
                                <div>
                                    <span className="text-xs font-bold text-text-primary uppercase tracking-wider">{stage.label}</span>
                                    <div className="mt-0.5 space-y-0.5">
                                        {Object.keys(currencyTotals).length > 0 ? (
                                            Object.entries(currencyTotals).map(([curr, val]) => (
                                                <div key={curr} className="text-[11px] font-semibold text-text-muted">
                                                    {curr}: {formatCurrency(val, curr)}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-[11px] font-medium text-text-muted">₹0</div>
                                        )}
                                    </div>
                                </div>
                                <span className="w-5 h-5 rounded-full bg-bg-main border border-border-subtle text-[11px] font-bold text-text-muted flex items-center justify-center">
                                    {columnLeads.length}
                                </span>
                            </div>

                            {/* Column Cards Container */}
                            <div className="space-y-3 min-h-[300px]">
                                {columnLeads.length === 0 ? (
                                    <div className="py-8 text-center text-xs text-text-muted border border-dashed border-border-subtle rounded-xl">
                                        No leads
                                    </div>
                                ) : (
                                    columnLeads.map(lead => (
                                        <div
                                            key={lead.id}
                                            onClick={() => navigate(`/crm/leads/${lead.id}`)}
                                            className="p-3.5 bg-bg-main border border-border-subtle rounded-xl hover:border-[#0D9488] transition-all cursor-pointer shadow-sm space-y-2.5 group"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-mono font-bold text-brand-teal group-hover:underline">
                                                    {lead.leadNumber}
                                                </span>
                                                <StatusBadge status={lead.priority} />
                                            </div>

                                            <div>
                                                <h4 className="text-xs font-bold text-text-primary group-hover:text-brand-teal transition-colors truncate">
                                                    {lead.fullName}
                                                </h4>
                                                {lead.companyName && (
                                                    <p className="text-[11px] text-text-muted truncate flex items-center gap-1 mt-0.5">
                                                        <Building2 className="w-3 h-3 text-text-muted shrink-0" />
                                                        {lead.companyName}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="text-xs font-extrabold text-text-primary pt-1 border-t border-border-subtle/50">
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

            {/* Create Lead Modal */}
            <CreateLeadModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => fetchPipeline()}
            />
        </div>
    );
}
