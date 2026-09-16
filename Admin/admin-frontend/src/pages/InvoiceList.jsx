import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInvoices } from '../services/api';
import { Search, Plus, Filter, FileText, CheckCircle, Clock, XCircle, Package } from 'lucide-react';

export default function InvoiceList() {
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

    const getStatusBadge = (status) => {
        switch (status) {
            case 'DRAFT': return <span className="px-2 py-1 bg-gray-500/10 text-gray-500 rounded text-xs font-medium flex items-center gap-1 w-fit"><Clock className="w-3 h-3"/> Draft</span>;
            case 'ISSUED': return <span className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded text-xs font-medium flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3"/> Issued</span>;
            case 'CANCELLED': return <span className="px-2 py-1 bg-red-500/10 text-red-500 rounded text-xs font-medium flex items-center gap-1 w-fit"><XCircle className="w-3 h-3"/> Cancelled</span>;
            default: return <span className="px-2 py-1 bg-gray-500/10 text-gray-400 rounded text-xs font-medium">{status}</span>;
        }
    };
    
    const getTypeBadge = (type) => {
        switch (type) {
            case 'PROFORMA': return <span className="px-2 py-1 bg-purple-500/10 text-purple-500 border border-purple-500/20 rounded text-xs font-medium">Proforma</span>;
            case 'TAX_INVOICE': return <span className="px-2 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-xs font-medium">Tax Invoice</span>;
            default: return <span className="px-2 py-1 bg-gray-500/10 text-gray-400 rounded text-xs font-medium">{type}</span>;
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">Invoices</h1>
                    <p className="text-text-muted mt-2">Manage proforma and tax invoices.</p>
                </div>
            </div>

            <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border-subtle flex gap-4 items-center bg-bg-main/50">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search invoice number, client..."
                            value={search}
                            onChange={handleSearchChange}
                            className="w-full bg-bg-main border border-border-subtle rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-primary/50 transition-colors"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                        <select
                            value={statusFilter}
                            onChange={handleStatusChange}
                            className="bg-bg-main border border-border-subtle rounded-lg pl-10 pr-8 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-primary/50 appearance-none cursor-pointer"
                        >
                            <option value="">All Statuses</option>
                            <option value="DRAFT">Draft</option>
                            <option value="ISSUED">Issued</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                        <select
                            value={typeFilter}
                            onChange={handleTypeChange}
                            className="bg-bg-main border border-border-subtle rounded-lg pl-10 pr-8 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-primary/50 appearance-none cursor-pointer"
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
                                    <td colSpan="6" className="px-6 py-8 text-center text-text-muted">Loading invoices...</td>
                                </tr>
                            ) : invoices.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-text-muted">No invoices found.</td>
                                </tr>
                            ) : (
                                invoices.map(invoice => (
                                    <tr 
                                        key={invoice.id} 
                                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                                        className="hover:bg-bg-main/50 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-6 py-4 font-medium text-brand-primary">{invoice.invoiceNumber || 'DRAFT'}</td>
                                        <td className="px-6 py-4 text-text-secondary">{invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                                        <td className="px-6 py-4">
                                            {getTypeBadge(invoice.invoiceType)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-text-primary">{invoice.clientName}</div>
                                            <div className="text-xs text-text-muted">{invoice.clientCompany}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium">
                                            Rs. {Number(invoice.grandTotal || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(invoice.status)}
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
                        <span className="text-sm text-text-muted">
                            Page {page + 1} of {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="px-3 py-1 rounded border border-border-subtle hover:bg-bg-card disabled:opacity-50 text-sm"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={page === totalPages - 1}
                                className="px-3 py-1 rounded border border-border-subtle hover:bg-bg-card disabled:opacity-50 text-sm"
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
