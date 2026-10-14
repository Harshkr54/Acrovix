import React, { useState } from 'react';
import { 
    Clock, 
    Phone, 
    Mail, 
    Calendar, 
    MessageSquare, 
    FileText, 
    UserCheck, 
    CheckCircle2, 
    XCircle, 
    RotateCcw, 
    Sparkles, 
    RefreshCw, 
    Search, 
    Plus,
    User
} from 'lucide-react';
import { formatDateTime } from '../utils/formatters';

const getActivityConfig = (action = '') => {
    const act = action.toUpperCase();

    if (act.includes('CALL')) {
        return {
            icon: Phone,
            badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
            dotClass: 'bg-emerald-500',
            label: 'Call'
        };
    }
    if (act.includes('EMAIL')) {
        return {
            icon: Mail,
            badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
            dotClass: 'bg-blue-500',
            label: 'Email'
        };
    }
    if (act.includes('MEETING')) {
        return {
            icon: Calendar,
            badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
            dotClass: 'bg-amber-500',
            label: 'Meeting'
        };
    }
    if (act.includes('WHATSAPP')) {
        return {
            icon: MessageSquare,
            badgeClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
            dotClass: 'bg-teal-500',
            label: 'WhatsApp'
        };
    }
    if (act.includes('WON')) {
        return {
            icon: CheckCircle2,
            badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
            dotClass: 'bg-emerald-600',
            label: 'Deal Won'
        };
    }
    if (act.includes('LOST')) {
        return {
            icon: XCircle,
            badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
            dotClass: 'bg-rose-600',
            label: 'Deal Lost'
        };
    }
    if (act.includes('REOPENED')) {
        return {
            icon: RotateCcw,
            badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
            dotClass: 'bg-sky-500',
            label: 'Reopened'
        };
    }
    if (act.includes('ASSIGNED')) {
        return {
            icon: UserCheck,
            badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
            dotClass: 'bg-indigo-500',
            label: 'Assignment'
        };
    }
    if (act.includes('FOLLOW_UP')) {
        return {
            icon: Clock,
            badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
            dotClass: 'bg-amber-500',
            label: 'Follow-up'
        };
    }
    if (act.includes('CREATED')) {
        return {
            icon: Sparkles,
            badgeClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
            dotClass: 'bg-brand-teal',
            label: 'Created'
        };
    }
    if (act.includes('STAGE_') || act.includes('STATUS')) {
        return {
            icon: RefreshCw,
            badgeClass: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
            dotClass: 'bg-cyan-500',
            label: 'Stage Advance'
        };
    }

    return {
        icon: FileText,
        badgeClass: 'bg-bg-main text-text-secondary border-border-subtle',
        dotClass: 'bg-text-muted',
        label: 'Activity'
    };
};

export default function ActivityTimeline({ 
    activities = [], 
    loading = false, 
    isLoading = false, 
    onRefresh = null,
    onOpenLogModal = null, 
    onLogActivity = null 
}) {
    const isBusy = loading || isLoading;
    const handleLogClick = onOpenLogModal || onLogActivity;

    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('ALL');

    const filteredActivities = activities.filter(item => {
        const matchesSearch = !searchTerm || 
            (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.adminName && item.adminName.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.action && item.action.toLowerCase().includes(searchTerm.toLowerCase()));

        if (!matchesSearch) return false;

        if (filterCategory === 'CALLS') return item.action?.includes('CALL');
        if (filterCategory === 'MEETINGS') return item.action?.includes('MEETING');
        if (filterCategory === 'EMAILS') return item.action?.includes('EMAIL');
        if (filterCategory === 'STAGES') return item.action?.includes('STAGE') || item.action?.includes('STATUS') || item.action?.includes('WON') || item.action?.includes('LOST');
        if (filterCategory === 'FOLLOWUPS') return item.action?.includes('FOLLOW_UP');

        return true;
    });

    return (
        <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-brand-teal/10 text-brand-teal flex items-center justify-center">
                        <Clock className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-text-primary">
                            Customer Activity & Audit Timeline
                        </h2>
                        <p className="text-xs text-text-muted">
                            Complete chronological history of interactions, stage changes & commitments ({activities.length})
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    {onRefresh && (
                        <button
                            type="button"
                            onClick={onRefresh}
                            disabled={isBusy}
                            className="btn btn-secondary btn-icon text-xs"
                            title="Refresh Timeline"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin text-brand-teal' : ''}`} />
                        </button>
                    )}

                    {handleLogClick && (
                        <button
                            type="button"
                            onClick={handleLogClick}
                            className="btn btn-secondary btn-md font-semibold flex items-center justify-center gap-1.5"
                        >
                            <Plus className="w-4 h-4 text-brand-teal" />
                            <span>Log Activity</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <div className="relative flex-1 w-full">
                    <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search timeline events, notes, actors..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-teal"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-1 w-full sm:w-auto">
                    {['ALL', 'CALLS', 'MEETINGS', 'EMAILS', 'STAGES', 'FOLLOWUPS'].map((cat) => (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => setFilterCategory(cat)}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                                filterCategory === cat 
                                    ? 'bg-brand-teal text-white border-brand-teal shadow-xs' 
                                    : 'bg-bg-main border-border-subtle text-text-secondary hover:text-text-primary'
                            }`}
                        >
                            {cat === 'ALL' ? 'All' : cat === 'FOLLOWUPS' ? 'Follow-ups' : cat.charAt(0) + cat.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Timeline Events List */}
            {isBusy ? (
                <div className="py-12 flex flex-col items-center justify-center text-text-muted text-xs space-y-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-brand-teal" />
                    <span>Loading activity timeline...</span>
                </div>
            ) : filteredActivities.length === 0 ? (
                <div className="py-10 text-center space-y-2 bg-bg-main/50 border border-dashed border-border-subtle rounded-xl p-6">
                    <Clock className="w-8 h-8 text-text-muted mx-auto opacity-40" />
                    <p className="text-xs font-semibold text-text-primary">No activities found</p>
                    <p className="text-[11px] text-text-muted max-w-sm mx-auto">
                        {searchTerm || filterCategory !== 'ALL' 
                            ? 'No interactions match the selected filter or search keyword.' 
                            : 'No customer interactions have been recorded for this lead yet. Use "Log Activity" to document calls, meetings, or notes.'}
                    </p>
                    {handleLogClick && (!searchTerm && filterCategory === 'ALL') && (
                        <button
                            type="button"
                            onClick={handleLogClick}
                            className="btn btn-primary btn-md mt-2 text-xs font-semibold"
                        >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Log First Interaction
                        </button>
                    )}
                </div>
            ) : (
                <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border-subtle">
                    {filteredActivities.map((act) => {
                        const config = getActivityConfig(act.action);
                        const Icon = config.icon;

                        return (
                            <div key={act.id} className="relative group">
                                {/* Dot indicator on line */}
                                <div className={`absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-bg-card ${config.dotClass} shadow-xs ring-4 ring-bg-card`} />

                                <div className="bg-bg-main border border-border-subtle rounded-xl p-4 shadow-2xs hover:border-text-muted/40 transition-all space-y-2">
                                    {/* Event Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold ${config.badgeClass}`}>
                                                <Icon className="w-3 h-3" />
                                                <span>{config.label}</span>
                                            </span>
                                            <span className="text-xs font-bold text-text-primary">
                                                {act.action?.replace('ACTIVITY_', '').replace('STAGE_', '').replace(/_/g, ' ')}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 text-[11px] text-text-muted">
                                            <span className="flex items-center gap-1 font-medium text-text-secondary">
                                                <User className="w-3 h-3 text-text-muted" />
                                                {act.adminName || 'System'}
                                            </span>
                                            <span>•</span>
                                            <span>{formatDateTime(act.createdAt)}</span>
                                        </div>
                                    </div>

                                    {/* Description body with multi-line parsing */}
                                    {act.description && (
                                        <div className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap font-normal bg-bg-card/60 p-2.5 rounded-lg border border-border-subtle/50">
                                            {act.description}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
