import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInvoices } from '../services/api';
import { Search, Filter, FileText } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';

export default function InvoiceList() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const navigate = useNavigate();

    const fetchInvoices = async (pageNum = 0, currentSearch = search, status = statusFilter, type = typeFilter) => {
        try {
            setLoading(true);
            setError(null);
            const params = { page: pageNum, size: 10 };
            if (currentSearch) params.search = currentSearch;
            if (status) params.status = status;
            if (type) params.type = type;
            
            const data = await getInvoices(params);
            setInvoices(data.content || []);
            setTotalPages(data.totalPages || 1);
            setPage(data.number || 0);
        } catch (err) {
            console.error('Failed to fetch Invoices', err);
            setError('Unable to load invoices. Please try again.');
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
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
            <PageHeader
                title="Invoices"
                subtitle="Manage proforma and tax invoices."
                icon={FileText}
            />

            <div className="bg-bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border-subtle flex flex-wrap gap-4 items-center bg-bg-main/50">
                    <div className="relative flex-1 min-w-[240px] max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search invoice number, client..."
                            value={search}
                            onChange={handleSearchChange}
                            className="w-full bg-bg-main border border-border-subtle rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                        <select
                            value={statusFilter}
                            onChange={handleStatusChange}
                            className="bg-bg-main border border-border-subtle rounded-xl pl-10 pr-8 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary appearance-none cursor-pointer"
                        >
                            <option value="">All Statuses</option>
                            <option value="DRAFT">Draft</option>
                            <option value="ISSUED">Issued</option>
                            <option value="PARTIALLY_PAID">Partially Paid</option>
                            <option value="PAID">Paid</option>
                            <option value="OVERDUE">Overdue</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                        <select
                            value={typeFilter}
                            onChange={handleTypeChange}
                            className="bg-bg-main border border-border-subtle rounded-xl pl-10 pr-8 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary appearance-none cursor-pointer"
                        >
                            <option value="">All Types</option>
                            <option value="PROFORMA">Proforma</option>
                            <option value="TAX_INVOICE">Tax Invoice</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-bg-main/50 text-text-muted text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4">Invoice No</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4 text-right">Grand Total</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="py-8">
                                        <EmptyState type="loading" message="Loading invoices..." />
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="6" className="py-8">
                                        <EmptyState type="error" message={error} onRetry={() => fetchInvoices(page, search, statusFilter, typeFilter)} />
                                    </td>
                                </tr>
                            ) : invoices.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-8">
                                        <EmptyState type="empty" message="No invoices found." />
                                    </td>
                                </tr>
                            ) : (
                                invoices.map(invoice => (
                                    <tr 
                                        key={invoice.id} 
                                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                                        className="hover:bg-bg-main/50 transition-colors cursor-pointer"
                                    >
                                        <td className="px-6 py-4 font-bold text-brand-primary align-top">{invoice.invoiceNumber || 'DRAFT'}</td>
                                        <td className="px-6 py-4 text-text-secondary align-top">{invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                                        <td className="px-6 py-4 align-top">
                                            <StatusBadge status={invoice.invoiceType} />
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <div className="font-semibold text-text-primary">{invoice.clientName}</div>
                                            <div className="text-xs text-text-muted">{invoice.clientCompany}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-text-primary align-top">
                                            ₹{Number(invoice.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 align-top">
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
                    <div className="p-4 border-t border-border-subtle flex items-center justify-between bg-bg-main/50">
                        <span className="text-xs text-text-muted font-medium">
                            Page {page + 1} of {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="px-3 py-1 rounded-lg border border-border-subtle hover:bg-bg-card disabled:opacity-50 text-xs font-semibold"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={page === totalPages - 1}
                                className="px-3 py-1 rounded-lg border border-border-subtle hover:bg-bg-card disabled:opacity-50 text-xs font-semibold"
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

