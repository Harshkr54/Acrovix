import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPurchaseOrders } from '../services/api';
import { Search, Filter, ShoppingCart } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';

export default function PurchaseOrderList() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const navigate = useNavigate();

    const fetchOrders = async (pageNum = 0, currentSearch = search, status = statusFilter) => {
        try {
            setLoading(true);
            setError(null);
            const params = { page: pageNum, size: 10 };
            if (currentSearch) params.search = currentSearch;
            if (status) params.status = status;
            
            const data = await getPurchaseOrders(params);
            setOrders(data.content || []);
            setTotalPages(data.totalPages || 1);
            setPage(data.number || 0);
        } catch (err) {
            console.error('Failed to fetch POs', err);
            setError('Unable to load purchase orders. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const debouncedFetch = React.useCallback(
        (() => {
            let timeout;
            return (query, status) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => fetchOrders(0, query, status), 300);
            };
        })(),
        []
    );

    useEffect(() => {
        fetchOrders(page, search, statusFilter);
    }, [page]);

    const handleSearchChange = (e) => {
        setSearch(e.target.value);
        debouncedFetch(e.target.value, statusFilter);
    };

    const handleStatusChange = (e) => {
        setStatusFilter(e.target.value);
        fetchOrders(0, search, e.target.value);
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
            <PageHeader
                title="Purchase Orders"
                subtitle="Track, verify, and manage customer purchase orders."
                icon={ShoppingCart}
            />

            <div className="bg-bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border-subtle flex gap-4 items-center bg-bg-main/50">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search PO number, client, quotation..."
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
                            <option value="RECEIVED">Received</option>
                            <option value="VERIFIED">Verified</option>
                            <option value="PARTIALLY_FULFILLED">Partially Fulfilled</option>
                            <option value="FULFILLED">Fulfilled</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-bg-main/50 text-text-muted text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4">PO Number</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">Quotation Ref</th>
                                <th className="px-6 py-4 text-right">PO Value</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="py-8">
                                        <EmptyState type="loading" message="Loading purchase orders..." />
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="6" className="py-8">
                                        <EmptyState type="error" message={error} onRetry={() => fetchOrders(page, search, statusFilter)} />
                                    </td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-8">
                                        <EmptyState type="empty" message="No purchase orders found." />
                                    </td>
                                </tr>
                            ) : (
                                orders.map(order => (
                                    <tr 
                                        key={order.id} 
                                        onClick={() => navigate(`/purchase-orders/${order.id}`)}
                                        className="hover:bg-bg-main/50 transition-colors cursor-pointer"
                                    >
                                        <td className="px-6 py-4 font-bold text-brand-primary align-top">{order.poNumber}</td>
                                        <td className="px-6 py-4 text-text-secondary align-top">{new Date(order.poDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        <td className="px-6 py-4 align-top">
                                            <div className="font-semibold text-text-primary">{order.clientName}</div>
                                            <div className="text-xs text-text-muted">{order.clientCompany}</div>
                                        </td>
                                        <td className="px-6 py-4 text-text-secondary align-top">{order.quotationNumber}</td>
                                        <td className="px-6 py-4 text-right font-bold text-text-primary align-top">
                                            ₹{Number(order.poValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            {order.valueMismatch && (
                                                <div className="text-xs text-red-500 mt-1" title="Mismatch with Quotation">⚠ Mismatch</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <StatusBadge status={order.status} />
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

