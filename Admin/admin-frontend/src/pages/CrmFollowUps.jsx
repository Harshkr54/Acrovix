import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDueFollowUpsToday, getUpcomingFollowUps } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import StatusBadge from '../components/ui/StatusBadge';
import FollowUpModal from '../components/FollowUpModal';
import { formatDateTime } from '../utils/formatters';
import { 
    Calendar, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    Eye, 
    Phone, 
    Mail, 
    MessageSquare, 
    Users, 
    FileText,
    AlertCircle,
    ArrowRight
} from 'lucide-react';

export default function CrmFollowUps() {
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('DUE');
    const [dueFollowUps, setDueFollowUps] = useState([]);
    const [upcomingFollowUps, setUpcomingFollowUps] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [modalState, setModalState] = useState({
        isOpen: false,
        mode: 'COMPLETE',
        followUp: null,
        leadId: null
    });

    const fetchAllFollowUps = async () => {
        try {
            setLoading(true);
            setError(null);
            const [dueData, upcomingData] = await Promise.all([
                getDueFollowUpsToday(),
                getUpcomingFollowUps()
            ]);
            setDueFollowUps(Array.isArray(dueData) ? dueData : []);
            setUpcomingFollowUps(Array.isArray(upcomingData) ? upcomingData : []);
        } catch (err) {
            console.error("Failed to load follow-ups", err);
            setError(err.message || 'Failed to load follow-ups');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllFollowUps();
    }, []);

    const activeList = activeTab === 'DUE' ? dueFollowUps : upcomingFollowUps;

    return (
        <div className="space-y-6 pb-12">
            <PageHeader
                title="Global CRM Follow-ups"
                subtitle="Track and execute your sales activities, customer calls and scheduled follow-ups"
                icon={Calendar}
            />

            {/* Tab Navigation */}
            <div className="flex items-center gap-3 border-b border-border-subtle pb-3">
                <button
                    onClick={() => setActiveTab('DUE')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                        activeTab === 'DUE'
                            ? 'bg-brand-teal text-white border-[#0D9488] shadow-sm'
                            : 'bg-bg-card border-border-subtle text-text-secondary hover:text-text-primary'
                    }`}
                >
                    <Clock className="w-4 h-4" />
                    Due / Today ({dueFollowUps.length})
                </button>

                <button
                    onClick={() => setActiveTab('UPCOMING')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                        activeTab === 'UPCOMING'
                            ? 'bg-brand-teal text-white border-[#0D9488] shadow-sm'
                            : 'bg-bg-card border-border-subtle text-text-secondary hover:text-text-primary'
                    }`}
                >
                    <Calendar className="w-4 h-4" />
                    Upcoming Follow-ups ({upcomingFollowUps.length})
                </button>
            </div>

            {/* Main Content Area */}
            <div className="bg-bg-card border border-border-subtle rounded-2xl shadow-sm p-6 space-y-4">
                {loading ? (
                    <EmptyState loading message="Loading follow-ups schedule..." />
                ) : error ? (
                    <EmptyState type="error" error={error} onRetry={fetchAllFollowUps} />
                ) : activeList.length === 0 ? (
                    <EmptyState 
                        emptyMessage={activeTab === 'DUE' ? "No follow-ups due today." : "No upcoming follow-ups scheduled."} 
                        icon={Calendar}
                    />
                ) : (
                    <div className="space-y-3">
                        {activeList.map(fu => (
                            <div 
                                key={fu.id}
                                className="p-4 bg-bg-main border border-border-subtle rounded-xl hover:border-text-muted transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                            >
                                <div className="space-y-1.5 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <button
                                            onClick={() => navigate(`/crm/leads/${fu.leadId}`)}
                                            className="text-xs font-bold text-brand-teal hover:underline font-mono"
                                        >
                                            {fu.leadNumber}
                                        </button>
                                        <span className="text-xs font-bold text-text-primary">{fu.leadFullName}</span>
                                        <StatusBadge status={fu.followUpType} />
                                        <StatusBadge status={fu.status} />
                                    </div>

                                    <p className="text-xs text-text-secondary font-medium truncate max-w-2xl">
                                        {fu.notes || 'No agenda notes provided.'}
                                    </p>

                                    <div className="text-[11px] text-text-muted flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                                        <span>Scheduled: {formatDateTime(fu.scheduledDate)}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                    <button
                                        onClick={() => navigate(`/crm/leads/${fu.leadId}`)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 border border-border-subtle rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        View Lead
                                    </button>

                                    {fu.status === 'PENDING' && (
                                        <>
                                            <button
                                                onClick={() => setModalState({ isOpen: true, mode: 'CANCEL', followUp: fu, leadId: fu.leadId })}
                                                className="px-3 py-1.5 border border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg text-xs font-semibold transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => setModalState({ isOpen: true, mode: 'COMPLETE', followUp: fu, leadId: fu.leadId })}
                                                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                Complete
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Follow Up Action Modal */}
            <FollowUpModal
                isOpen={modalState.isOpen}
                mode={modalState.mode}
                leadId={modalState.leadId}
                followUp={modalState.followUp}
                onClose={() => setModalState({ isOpen: false, mode: 'COMPLETE', followUp: null, leadId: null })}
                onSuccess={() => fetchAllFollowUps()}
            />
        </div>
    );
}
