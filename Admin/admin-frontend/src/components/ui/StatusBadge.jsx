import React from 'react';

export default function StatusBadge({ status, type }) {
    if (!status && !type) return null;

    const value = (status || type || '').toString().toUpperCase();

    // Mapping configurations for consistent badge visual identity
    const badgeConfigs = {
        // Success / Positive
        PAID: { bg: 'bg-[#E6F5F2] text-[#0F8F95]', label: 'Paid' },
        ACCEPTED: { bg: 'bg-[#E6F5F2] text-[#0F8F95]', label: 'Accepted' },
        VERIFIED: { bg: 'bg-[#E6F5F2] text-[#0F8F95]', label: 'Verified' },
        FULFILLED: { bg: 'bg-[#E6F5F2] text-[#0F8F95]', label: 'Fulfilled' },
        CONVERTED: { bg: 'bg-[#E6F5F2] text-[#0F8F95]', label: 'Converted' },
        COMPLETED: { bg: 'bg-[#E6F5F2] text-[#0F8F95]', label: 'Completed' },
        ACTIVE: { bg: 'bg-[#E6F5F2] text-[#0F8F95]', label: 'Active' },
        CLOSED: { bg: 'bg-[#E6F5F2] text-[#0F8F95]', label: 'Closed' },

        // Info / Neutral Active
        ISSUED: { bg: 'bg-brand-primary/10 text-brand-primary', label: 'Issued' },
        SENT: { bg: 'bg-brand-primary/10 text-brand-primary', label: 'Sent' },
        RECEIVED: { bg: 'bg-brand-primary/10 text-brand-primary', label: 'Received' },
        NEW: { bg: 'bg-brand-primary/10 text-brand-primary', label: 'New' },
        TAX_INVOICE: { bg: 'bg-[#E6F5F2] text-[#0F8F95]', label: 'Tax Invoice' },

        // Warning / Pending
        PARTIALLY_PAID: { bg: 'bg-[#FFF7ED] text-[#D97706]', label: 'Partially Paid' },
        PARTIALLY_FULFILLED: { bg: 'bg-[#FFF7ED] text-[#D97706]', label: 'Partially Fulfilled' },
        PENDING: { bg: 'bg-[#FFF7ED] text-[#D97706]', label: 'Pending' },
        IN_PROGRESS: { bg: 'bg-[#FFF7ED] text-[#D97706]', label: 'In Progress' },
        QUOTED: { bg: 'bg-[#F1F5F9] text-[#475569]', label: 'Quoted' },
        PROFORMA: { bg: 'bg-[#F3E8FF] text-purple-600', label: 'Proforma' },
        REVISED: { bg: 'bg-[#F3E8FF] text-purple-600', label: 'Revised' },

        // Danger / Critical
        OVERDUE: { bg: 'bg-brand-danger/10 text-brand-danger', label: 'Overdue' },
        REJECTED: { bg: 'bg-brand-danger/10 text-brand-danger', label: 'Rejected' },
        CANCELLED: { bg: 'bg-brand-danger/10 text-brand-danger', label: 'Cancelled' },
        FAILED: { bg: 'bg-brand-danger/10 text-brand-danger', label: 'Failed' },
        INACTIVE: { bg: 'bg-brand-danger/10 text-brand-danger', label: 'Inactive' },

        // CRM Lead & Follow Up Statuses
        NEW: { bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', label: 'New' },
        CONTACTED: { bg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400', label: 'Contacted' },
        QUALIFIED: { bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400', label: 'Qualified' },
        PROPOSAL: { bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', label: 'Proposal' },
        NEGOTIATION: { bg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', label: 'Negotiation' },
        WON: { bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', label: 'Won' },
        LOST: { bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', label: 'Lost' },

        // CRM Priorities
        LOW: { bg: 'bg-bg-muted text-text-secondary', label: 'Low' },
        MEDIUM: { bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', label: 'Medium' },
        HIGH: { bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', label: 'High' },
        URGENT: { bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', label: 'Urgent' },

        // Neutral / Draft
        DRAFT: { bg: 'bg-[#F1F5F9] text-[#64748B]', label: 'Draft' },
    };

    const config = badgeConfigs[value] || { bg: 'bg-[#F1F5F9] text-[#64748B]', label: value };

    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${config.bg}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70"></span>
            {config.label}
        </span>
    );
}
