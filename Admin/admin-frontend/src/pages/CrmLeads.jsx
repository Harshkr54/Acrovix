import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCrmLeads, getAdminUsers } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import StatusBadge from '../components/ui/StatusBadge';
import CreateLeadModal from '../components/CreateLeadModal';
import StatusUpdateModal from '../components/StatusUpdateModal';
import LeadAssignmentModal from '../components/LeadAssignmentModal';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
    Target, 
    Plus, 
    Search, 
    Filter, 
    RotateCcw, 
    Eye, 
    RefreshCw, 
    UserCheck, 
    ChevronLeft, 
    ChevronRight,
    Building2,
    Calendar,
    Phone,
    Mail
} from 'lucide-react';

const STATUS_OPTIONS = [
    { value: '', label: 'All Statuses' },
    { value: 'NEW', label: 'New' },
    { value: 'CONTACTED', label: 'Contacted' },
    { value: 'QUALIFIED', label: 'Qualified' },
    { value: 'PROPOSAL', label: 'Proposal' },
    { value: 'NEGOTIATION', label: 'Negotiation' },
    { value: 'WON', label: 'Won' },
    { value: 'LOST', label: 'Lost' }
];

const PRIORITY_OPTIONS = [
    { value: '', label: 'All Priorities' },
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'URGENT', label: 'Urgent' }
];

const SOURCE_OPTIONS = [
    { value: '', label: 'All Sources' },
    { value: 'WEBSITE', label: 'Website' },
    { value: 'REFERRAL', label: 'Referral' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'PHONE', label: 'Phone' },
    { value: 'WHATSAPP', label: 'WhatsApp' },
    { value: 'LINKEDIN', label: 'LinkedIn' },
    { value: 'ADVERTISEMENT', label: 'Advertisement' },
    { value: 'PARTNER', label: 'Partner' },
    { value: 'OTHER', label: 'Other' }
];

export default function CrmLeads() {
    const navigate = useNavigate();

    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters & Pagination
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [sourceFilter, setSourceFilter] = useState('');
    const [assignedToIdFilter, setAssignedToIdFilter] = useState('');
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [adminUsers, setAdminUsers] = useState([]);

    // Modal triggers
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [statusModalLead, setStatusModalLead] = useState(null);
    const [assignModalLead, setAssignModalLead] = useState(null);

    const fetchLeads = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getCrmLeads({
                search: search.trim() || undefined,
                status: statusFilter || undefined,
                priority: priorityFilter || undefined,
                leadSource: sourceFilter || undefined,
                assignedToId: assignedToIdFilter ? Number(assignedToIdFilter) : undefined,
                page,
                size: 10
            });

            if (data.content) {
                setLeads(data.content);
                setTotalPages(data.totalPages || 0);
                setTotalElements(data.totalElements || 0);
            } else {
                setLeads(Array.isArray(data) ? data : []);
                setTotalPages(1);
                setTotalElements(Array.isArray(data) ? data.length : 0);
            }
        } catch (err) {
            console.error("Failed to load CRM leads", err);
            setError(err.message || 'Failed to load CRM leads');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getAdminUsers()
            .then(users => setAdminUsers(Array.isArray(users) ? users : []))
            .catch(err => console.error("Failed to load admin users", err));
    }, []);

    useEffect(() => {
        fetchLeads();
    }, [page, statusFilter, priorityFilter, sourceFilter, assignedToIdFilter]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(0);
        fetchLeads();
    };

    const hasActiveFilters = Boolean(search || statusFilter || priorityFilter || sourceFilter || assignedToIdFilter);

    const handleClearFilters = () => {
        setSearch('');
        setStatusFilter('');
        setPriorityFilter('');
        setSourceFilter('');
        setAssignedToIdFilter('');
        setPage(0);
    };

    const pageHeaderAction = (
        <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary btn-sm"
        >
            <Plus className="w-4 h-4" />
            New Lead
        </button>
    );

    return (
        <div className="space-y-6 pb-12">
            <PageHeader
                title="CRM Leads"
                subtitle="Manage leads, opportunities and sales pipeline records"
                icon={Target}
                action={pageHeaderAction}
            />

            {/* Filter & Search Bar */}
            <div className="bg-bg-card border border-border-subtle rounded-2xl p-4 shadow-sm space-y-3">
                <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by Lead #, Client Name, Company, Email or Phone..."
                            className="w-full pl-9 pr-4 py-2 text-sm bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                    >
                        Search
                    </button>
                </form>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 pt-2 border-t border-border-subtle items-center">
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                        className="px-3 py-1.5 text-xs bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                    >
                        {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>

                    <select
                        value={priorityFilter}
                        onChange={(e) => { setPriorityFilter(e.target.value); setPage(0); }}
                        className="px-3 py-1.5 text-xs bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                    >
                        {PRIORITY_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>

                    <select
                        value={sourceFilter}
                        onChange={(e) => { setSourceFilter(e.target.value); setPage(0); }}
                        className="px-3 py-1.5 text-xs bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                    >
                        {SOURCE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>

                    <select
                        value={assignedToIdFilter}
                        onChange={(e) => { setAssignedToIdFilter(e.target.value); setPage(0); }}
                        className="px-3 py-1.5 text-xs bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                    >
                        <option value="">All Sales Reps</option>
                        {adminUsers.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>

                    {hasActiveFilters && (
                        <button
                            onClick={handleClearFilters}
                            className="btn btn-danger btn-md"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Leads Table Container */}
            <div className="bg-bg-card border border-border-subtle rounded-2xl shadow-sm overflow-hidden">
                {loading ? (
                    <EmptyState loading message="Loading CRM leads..." />
                ) : error ? (
                    <EmptyState type="error" error={error} onRetry={fetchLeads} />
                ) : leads.length === 0 ? (
                    <EmptyState 
                        emptyMessage={hasActiveFilters ? "No leads match your search or filters." : "No CRM leads found."} 
                        icon={Target}
                    />
                ) : (
                    <>
                        <div className="acx-table-container">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-border-subtle bg-bg-main/50 text-[11px] font-bold text-text-muted uppercase tracking-wider">
                                        <th className="px-5 py-3">Lead #</th>
                                        <th className="px-5 py-3">Client / Contact</th>
                                        <th className="px-5 py-3">Source & Priority</th>
                                        <th className="px-5 py-3">Status</th>
                                        <th className="px-5 py-3">Expected Value</th>
                                        <th className="px-5 py-3">Sales Owner</th>
                                        <th className="px-5 py-3">Next Follow-Up</th>
                                        <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-subtle text-xs">
                                    {leads.map(lead => (
                                        <tr key={lead.id} className="hover:bg-bg-hover/50 transition-colors">
                                            <td className="px-5 py-4 font-bold text-text-primary whitespace-nowrap">
                                                <button
                                                    onClick={() => navigate(`/crm/leads/${lead.id}`)}
                                                    className="btn btn-link btn-md"
                                                >
                                                    {lead.leadNumber}
                                                </button>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="font-semibold text-text-primary">{lead.fullName}</div>
                                                {lead.companyName && (
                                                    <div className="text-[11px] text-text-muted flex items-center gap-1 mt-0.5">
                                                        <Building2 className="w-3 h-3 text-text-muted shrink-0" />
                                                        <span className="truncate max-w-[180px]">{lead.companyName}</span>
                                                    </div>
                                                )}
                                                <div className="text-[11px] text-text-muted flex items-center gap-2 mt-0.5">
                                                    {lead.businessEmail && <span>{lead.businessEmail}</span>}
                                                    {lead.phoneNumber && <span>• {lead.phoneNumber}</span>}
                                                </div>
                                            </td>

                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-medium text-text-secondary">{lead.leadSource || 'OTHER'}</span>
                                                    <StatusBadge status={lead.priority} />
                                                </div>
                                            </td>

                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <StatusBadge status={lead.status} />
                                            </td>

                                            <td className="px-5 py-4 whitespace-nowrap font-semibold text-text-primary">
                                                {formatCurrency(lead.estimatedValue, lead.currency)}
                                            </td>

                                            <td className="px-5 py-4 whitespace-nowrap text-text-secondary">
                                                {lead.assignedTo ? lead.assignedTo.name : (
                                                    <span className="text-text-muted italic">Unassigned</span>
                                                )}
                                            </td>

                                            <td className="px-5 py-4 whitespace-nowrap">
                                                {lead.nextFollowUpDate ? (
                                                    <span className="font-medium text-amber-600 dark:text-amber-400">
                                                        {formatDate(lead.nextFollowUpDate)}
                                                    </span>
                                                ) : (
                                                    <span className="text-text-muted">None scheduled</span>
                                                )}
                                            </td>

                                            <td className="px-5 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => navigate(`/crm/leads/${lead.id}`)}
                                                        title="View Details"
                                                        className="btn btn-secondary btn-icon"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setStatusModalLead(lead)}
                                                        title="Change Status"
                                                        className="btn btn-secondary btn-icon"
                                                    >
                                                        <RefreshCw className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setAssignModalLead(lead)}
                                                        title="Assign Sales Rep"
                                                        className="btn btn-secondary btn-icon"
                                                    >
                                                        <UserCheck className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Bar */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle bg-bg-main/30">
                                <span className="text-xs text-text-muted">
                                    Showing page <span className="font-bold text-text-primary">{page + 1}</span> of <span className="font-bold text-text-primary">{totalPages}</span> ({totalElements} total leads)
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(0, p - 1))}
                                        disabled={page === 0}
                                        className="btn btn-secondary btn-icon"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                        disabled={page >= totalPages - 1}
                                        className="btn btn-secondary btn-icon"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modals */}
            <CreateLeadModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => fetchLeads()}
            />

            <StatusUpdateModal
                isOpen={Boolean(statusModalLead)}
                lead={statusModalLead}
                onClose={() => setStatusModalLead(null)}
                onSuccess={() => fetchLeads()}
            />

            <LeadAssignmentModal
                isOpen={Boolean(assignModalLead)}
                lead={assignModalLead}
                onClose={() => setAssignModalLead(null)}
                onSuccess={() => fetchLeads()}
            />
        </div>
    );
}
