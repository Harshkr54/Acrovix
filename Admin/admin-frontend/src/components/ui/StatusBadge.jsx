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
        ISSUED: { bg: 'bg-[#EFF6FF] text-[#2563EB]', label: 'Issued' },
        SENT: { bg: 'bg-[#EFF6FF] text-[#2563EB]', label: 'Sent' },
        RECEIVED: { bg: 'bg-[#EFF6FF] text-[#2563EB]', label: 'Received' },
        NEW: { bg: 'bg-[#EFF6FF] text-[#2563EB]', label: 'New' },
        TAX_INVOICE: { bg: 'bg-[#E6F5F2] text-[#0F8F95]', label: 'Tax Invoice' },

        // Warning / Pending
        PARTIALLY_PAID: { bg: 'bg-[#FFF7ED] text-[#D97706]', label: 'Partially Paid' },
        PARTIALLY_FULFILLED: { bg: 'bg-[#FFF7ED] text-[#D97706]', label: 'Partially Fulfilled' },
        PENDING: { bg: 'bg-[#FFF7ED] text-[#D97706]', label: 'Pending' },
        IN_PROGRESS: { bg: 'bg-[#FFF7ED] text-[#D97706]', label: 'In Progress' },
        QUOTED: { bg: 'bg-[#F1F5F9] text-[#475569]', label: 'Quoted' },
        PROFORMA: { bg: 'bg-[#F3E8FF] text-[#7C3AED]', label: 'Proforma' },
        REVISED: { bg: 'bg-[#F3E8FF] text-[#7C3AED]', label: 'Revised' },

        // Danger / Critical
        OVERDUE: { bg: 'bg-[#FEF2F2] text-[#DC2626]', label: 'Overdue' },
        REJECTED: { bg: 'bg-[#FEF2F2] text-[#DC2626]', label: 'Rejected' },
        CANCELLED: { bg: 'bg-[#FEF2F2] text-[#DC2626]', label: 'Cancelled' },
        FAILED: { bg: 'bg-[#FEF2F2] text-[#DC2626]', label: 'Failed' },
        INACTIVE: { bg: 'bg-[#FEF2F2] text-[#DC2626]', label: 'Inactive' },

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
