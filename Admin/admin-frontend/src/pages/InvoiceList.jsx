import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInvoices } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { Search, Filter, FileText } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

export default function InvoiceList() {
    const { tenant } = useTenant();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const navigate = useNavigate();

    const fetchInvoices = async (pageNum = 0, currentSearch = search, status = statusFilter, type = typeFilter) => {
        try {
            setLoading(true);
            const params = { page: pageNum, size: 10 };
            if (currentSearch) params.search = currentSearch;
            if (status) params.status = status;
            if (type) params.type = type;
            
            const data = await getInvoices(params);
            setInvoices(data.content || []);
            setTotalPages(data.totalPages || 1);
            setPage(data.number || 0);
        } catch (error) {
            console.error('Failed to fetch Invoices', error);
        } finally {
            setLoading(false);
        }
    };

    const debouncedFetch = React.useCallback(
        (() => {
            let timeout;
            return (query, status, type) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => fetchInvoices(0, query, status, type), 300);
            };
        })(),
        []
    );

    useEffect(() => {
        fetchInvoices(page, search, statusFilter, typeFilter);
    }, [page]);

    const handleSearchChange = (e) => {
        setSearch(e.target.value);
        debouncedFetch(e.target.value, statusFilter, typeFilter);
    };

    const handleStatusChange = (e) => {
        setStatusFilter(e.target.value);
        fetchInvoices(0, search, e.target.value, typeFilter);
    };

    const handleTypeChange = (e) => {
        setTypeFilter(e.target.value);
        fetchInvoices(0, search, statusFilter, e.target.value);
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12 animate-fade-in">
            <PageHeader 
                title="Invoices"
                subtitle="Manage and track customer proforma and tax invoices."
                icon={FileText}
            />

            <div className="acx-card flex flex-col">
                <div className="p-4 border-b border-border-subtle flex flex-wrap gap-4 items-center bg-bg-card/50">
                    <div className="relative flex-1 min-w-[240px] max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search invoice number, client..."
                            value={search}
                            onChange={handleSearchChange}
                            className="w-full bg-bg-main border border-border-subtle rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-text-primary focus:outline-none focus:border-brand-primary/50 transition-colors placeholder:text-text-muted"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-3.5 h-3.5 pointer-events-none" />
                            <select
                                value={statusFilter}
                                onChange={handleStatusChange}
                                className="bg-bg-main border border-border-subtle rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-text-primary focus:outline-none focus:border-brand-primary/50 appearance-none cursor-pointer"
                            >
                                <option value="">All Statuses</option>
                                <option value="DRAFT">Draft</option>
                                <option value="ISSUED">Issued</option>
                                <option value="PAID">Paid</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-3.5 h-3.5 pointer-events-none" />
                            <select
                                value={typeFilter}
                                onChange={handleTypeChange}
                                className="bg-bg-main border border-border-subtle rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-text-primary focus:outline-none focus:border-brand-primary/50 appearance-none cursor-pointer"
                            >
                                <option value="">All Types</option>
                                <option value="PROFORMA">Proforma</option>
                                <option value="TAX_INVOICE">Tax Invoice</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="acx-table-container">
                    <table className="acx-table">
                        <thead>
                            <tr>
                                <th className="acx-table-header">Invoice No</th>
                                <th className="acx-table-header">Date</th>
                                <th className="acx-table-header">Type</th>
                                <th className="acx-table-header">Client</th>
                                <th className="acx-table-header text-right">Grand Total</th>
                                <th className="acx-table-header text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-bg-card divide-y divide-border-subtle/40">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-6">
                                        <div className="space-y-4">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <Skeleton key={i} variant="table-row" className="h-14" />
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ) : invoices.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-0">
                                        <EmptyState 
                                            variant="document"
                                            title="No invoices found"
                                            description={search || statusFilter || typeFilter ? "No invoices match the selected filter criteria." : "No invoices have been generated yet."}
                                            actionLabel={search || statusFilter || typeFilter ? "Reset Filters" : undefined}
                                            onAction={search || statusFilter || typeFilter ? () => { setSearch(''); setStatusFilter(''); setTypeFilter(''); } : undefined}
                                        />
                                    </td>
                                </tr>
                            ) : (
                                invoices.map(invoice => (
                                    <tr 
                                        key={invoice.id} 
                                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                                        className="hover:bg-bg-hover transition-colors cursor-pointer group"
                                    >
                                        <td className="acx-table-cell font-bold text-brand-primary">
                                            {invoice.invoiceNumber || 'DRAFT'}
                                        </td>
                                        <td className="acx-table-cell text-text-secondary">
                                            {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                        </td>
                                        <td className="acx-table-cell">
                                            <StatusBadge type={invoice.invoiceType} />
                                        </td>
                                        <td className="acx-table-cell">
                                            <div className="font-semibold text-text-primary">{invoice.clientName}</div>
                                            <div className="text-xs text-text-muted mt-0.5">{invoice.clientCompany || '—'}</div>
                                        </td>
                                        <td className="acx-table-cell text-right font-bold text-text-primary">
                                            {formatCurrency(invoice.grandTotal || 0, invoice.currency || tenant?.currencyCode || 'USD', 2)}
                                        </td>
                                        <td className="acx-table-cell text-center">
                                            <StatusBadge status={invoice.status} />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-border-subtle flex items-center justify-between bg-bg-card">
                        <span className="text-xs sm:text-sm text-text-muted font-medium">
                            Page {page + 1} of {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="btn btn-secondary btn-sm"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={page === totalPages - 1}
                                className="btn btn-secondary btn-sm"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
