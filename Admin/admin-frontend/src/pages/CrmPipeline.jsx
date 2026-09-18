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
    ChevronDown,
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
    const [openStages, setOpenStages] = useState(new Set());

    const toggleStage = (stageKey) => {
        setOpenStages(prev => {
            const next = new Set(prev);
            if (next.has(stageKey)) {
                next.delete(stageKey);
            } else {
                next.add(stageKey);
            }
            return next;
        });
    };

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

    useEffect(() => {
        if (Object.keys(pipelineData).length > 0 && openStages.size === 0) {
            let firstWithLeads = STAGES.find(s => (pipelineData[s.key] || []).length > 0)?.key;
            if (!firstWithLeads) firstWithLeads = 'NEW';
            setOpenStages(new Set([firstWithLeads]));
        }
    }, [pipelineData]);

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
        <div className="flex flex-col min-h-[calc(100vh-72px)] pb-12">
            <div className="shrink-0 px-6 pt-6 pb-2">
                <PageHeader
                    title="Sales Pipeline"
                    subtitle="Visual Kanban view of leads and deal progress across all sales stages"
                    icon={Kanban}
                    action={pageHeaderAction}
                />
            </div>

            <div className="flex-1 px-6 pt-2 space-y-3">
                {STAGES.map(stage => {
                    const columnLeads = pipelineData[stage.key] || [];
                    const isOpen = openStages.has(stage.key);
                    
                    const currencyTotals = {};
                    columnLeads.forEach(lead => {
                        const curr = lead.currency || 'INR';
                        const val = Number(lead.estimatedValue) || 0;
                        if (val > 0) {
                            currencyTotals[curr] = (currencyTotals[curr] || 0) + val;
                        }
                    });

                    return (
                        <div key={stage.key} className="bg-white border border-border-subtle rounded-[20px] shadow-[0_4px_24px_-4px_rgba(11,25,44,0.03)] overflow-hidden transition-all duration-300">
                            {/* Header */}
                            <div 
                                onClick={() => toggleStage(stage.key)}
                                className={`flex items-center justify-between p-4 cursor-pointer hover:bg-bg-hover transition-colors ${isOpen ? 'border-b border-border-subtle' : ''}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-2.5 h-2.5 rounded-full ${stage.color.replace('border-t-', 'bg-')}`} />
                                    <span className="text-[13px] font-bold text-text-primary uppercase tracking-wider">{stage.label}</span>
                                    <span className="px-2 py-0.5 rounded-full bg-bg-muted text-[11px] font-bold text-text-muted border border-border-subtle min-w-[28px] text-center">
                                        {columnLeads.length}
                                    </span>
                                </div>
                                <div className="flex items-center gap-5">
                                    <div className="text-right flex flex-col justify-center">
                                        {Object.keys(currencyTotals).length > 0 ? (
                                            Object.entries(currencyTotals).map(([curr, val]) => (
                                                <div key={curr} className="text-[13px] font-bold text-text-primary">
                                                    {formatCurrency(val, curr)}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-[13px] font-bold text-text-muted">₹0</div>
                                        )}
                                    </div>
                                    <div className="text-text-muted flex items-center justify-center w-8 h-8 rounded-full hover:bg-bg-main transition-colors">
                                        {isOpen ? <ChevronDown className="w-5 h-5 text-brand-primary" /> : <ChevronRight className="w-5 h-5" />}
                                    </div>
                                </div>
                            </div>

                            {/* Body */}
                            {isOpen && (
                                <div className="p-5 bg-bg-main/30">
                                    {columnLeads.length === 0 ? (
                                        <div className="py-4 text-center text-[13px] font-medium text-text-muted">
                                            No leads in this stage
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                            {columnLeads.map(lead => (
                                                <div
                                                    key={lead.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/crm/leads/${lead.id}`);
                                                    }}
                                                    className="p-4 bg-white border border-border-subtle rounded-[16px] hover:border-brand-primary transition-all cursor-pointer shadow-sm space-y-3 group"
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
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
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
