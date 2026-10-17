import React from 'react';

/**
 * ACROVIX Premium Status Badge
 * Pill design with colored dot indicator, full dark mode support.
 */
export default function StatusBadge({ status, type }) {
    if (!status && !type) return null;

    const value = (status || type || '').toString().toUpperCase();

    const badgeConfigs = {
        // Success / Positive
        PAID:               { cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/25 dark:text-emerald-400 dark:border-emerald-800/40', dot: 'bg-emerald-500', label: 'Paid' },
        ACCEPTED:           { cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/25 dark:text-emerald-400 dark:border-emerald-800/40', dot: 'bg-emerald-500', label: 'Accepted' },
        VERIFIED:           { cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/25 dark:text-emerald-400 dark:border-emerald-800/40', dot: 'bg-emerald-500', label: 'Verified' },
        FULFILLED:          { cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/25 dark:text-emerald-400 dark:border-emerald-800/40', dot: 'bg-emerald-500', label: 'Fulfilled' },
        CONVERTED:          { cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/25 dark:text-emerald-400 dark:border-emerald-800/40', dot: 'bg-emerald-500', label: 'Converted' },
        COMPLETED:          { cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/25 dark:text-emerald-400 dark:border-emerald-800/40', dot: 'bg-emerald-500', label: 'Completed' },
        ACTIVE:             { cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/25 dark:text-emerald-400 dark:border-emerald-800/40', dot: 'bg-emerald-500', label: 'Active' },
        CLOSED:             { cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/25 dark:text-emerald-400 dark:border-emerald-800/40', dot: 'bg-emerald-500', label: 'Closed' },
        WON:                { cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/25 dark:text-emerald-400 dark:border-emerald-800/40', dot: 'bg-emerald-500', label: 'Won' },
        TAX_INVOICE:        { cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/25 dark:text-emerald-400 dark:border-emerald-800/40', dot: 'bg-emerald-500', label: 'Tax Invoice' },

        // Info / Neutral Active
        ISSUED:             { cls: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/25 dark:text-blue-400 dark:border-blue-800/40', dot: 'bg-blue-500', label: 'Issued' },
        SENT:               { cls: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/25 dark:text-blue-400 dark:border-blue-800/40', dot: 'bg-blue-500', label: 'Sent' },
        RECEIVED:           { cls: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/25 dark:text-blue-400 dark:border-blue-800/40', dot: 'bg-blue-500', label: 'Received' },
        NEW:                { cls: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/25 dark:text-blue-400 dark:border-blue-800/40', dot: 'bg-blue-500', label: 'New' },
        CONTACTED:          { cls: 'bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-900/25 dark:text-cyan-400 dark:border-cyan-800/40', dot: 'bg-cyan-500', label: 'Contacted' },
        QUALIFIED:          { cls: 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/25 dark:text-indigo-400 dark:border-indigo-800/40', dot: 'bg-indigo-500', label: 'Qualified' },

        // Warning / Pending
        PARTIALLY_PAID:     { cls: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/25 dark:text-amber-400 dark:border-amber-800/40', dot: 'bg-amber-500', label: 'Partially Paid' },
        PARTIALLY_FULFILLED:{ cls: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/25 dark:text-amber-400 dark:border-amber-800/40', dot: 'bg-amber-500', label: 'Partially Fulfilled' },
        PENDING:            { cls: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/25 dark:text-amber-400 dark:border-amber-800/40', dot: 'bg-amber-500', label: 'Pending' },
        IN_PROGRESS:        { cls: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/25 dark:text-amber-400 dark:border-amber-800/40', dot: 'bg-amber-500', label: 'In Progress' },
        PROPOSAL:           { cls: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/25 dark:text-amber-400 dark:border-amber-800/40', dot: 'bg-amber-500', label: 'Proposal' },
        NEGOTIATION:        { cls: 'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/25 dark:text-orange-400 dark:border-orange-800/40', dot: 'bg-orange-500', label: 'Negotiation' },

        // Neutral / Draft
        QUOTED:             { cls: 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700/40', dot: 'bg-slate-400', label: 'Quoted' },
        DRAFT:              { cls: 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700/40', dot: 'bg-slate-400', label: 'Draft' },

        // Accent
        PROFORMA:           { cls: 'bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/25 dark:text-violet-400 dark:border-violet-800/40', dot: 'bg-violet-500', label: 'Proforma' },
        REVISED:            { cls: 'bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/25 dark:text-violet-400 dark:border-violet-800/40', dot: 'bg-violet-500', label: 'Revised' },

        // Danger / Critical
        OVERDUE:            { cls: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/25 dark:text-rose-400 dark:border-rose-800/40', dot: 'bg-rose-500', label: 'Overdue' },
        REJECTED:           { cls: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/25 dark:text-rose-400 dark:border-rose-800/40', dot: 'bg-rose-500', label: 'Rejected' },
        CANCELLED:          { cls: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/25 dark:text-rose-400 dark:border-rose-800/40', dot: 'bg-rose-500', label: 'Cancelled' },
        FAILED:             { cls: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/25 dark:text-rose-400 dark:border-rose-800/40', dot: 'bg-rose-500', label: 'Failed' },
        INACTIVE:           { cls: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/25 dark:text-rose-400 dark:border-rose-800/40', dot: 'bg-rose-500', label: 'Inactive' },
        LOST:               { cls: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/25 dark:text-rose-400 dark:border-rose-800/40', dot: 'bg-rose-500', label: 'Lost' },

        // Priorities
        LOW:                { cls: 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700/40', dot: 'bg-slate-400', label: 'Low' },
        MEDIUM:             { cls: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/25 dark:text-blue-400 dark:border-blue-800/40', dot: 'bg-blue-500', label: 'Medium' },
        HIGH:               { cls: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/25 dark:text-amber-400 dark:border-amber-800/40', dot: 'bg-amber-500', label: 'High' },
        URGENT:             { cls: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/25 dark:text-rose-400 dark:border-rose-800/40', dot: 'bg-rose-500', label: 'Urgent' },
    };

    const config = badgeConfigs[value] || {
        cls: 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700/40',
        dot: 'bg-slate-400',
        label: value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    };

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[11px] font-semibold whitespace-nowrap tracking-tight ${config.cls}`}>
            <span className={`w-[5px] h-[5px] rounded-full flex-shrink-0 ${config.dot}`} />
            {config.label}
        </span>
    );
}
