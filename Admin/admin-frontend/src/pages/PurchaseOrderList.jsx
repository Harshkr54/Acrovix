import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPurchaseOrders } from '../services/api';
import { Search, Filter, ShoppingCart, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

export default function PurchaseOrderList() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const navigate = useNavigate();

    const fetchOrders = async (pageNum = 0, currentSearch = search, status = statusFilter) => {
        try {
            setLoading(true);
            const params = { page: pageNum, size: 10 };
            if (currentSearch) params.search = currentSearch;
            if (status) params.status = status;
            
            const data = await getPurchaseOrders(params);
            setOrders(data.content || []);
            setTotalPages(data.totalPages || 1);
            setPage(data.number || 0);
        } catch (error) {
            console.error('Failed to fetch POs', error);
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
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12 animate-fade-in">
            <PageHeader 
                title="Purchase Orders"
                subtitle="Manage and track customer purchase orders and fulfillment status."
                icon={ShoppingCart}
            />

            <div className="acx-card flex flex-col">
                <div className="p-4 border-b border-border-subtle flex flex-wrap gap-4 items-center bg-bg-card/50">
                    <div className="relative flex-1 min-w-[240px] max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search PO number, client, quotation..."
                            value={search}
                            onChange={handleSearchChange}
                            className="w-full bg-bg-main border border-border-subtle rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-text-primary focus:outline-none focus:border-brand-primary/50 transition-colors placeholder:text-text-muted"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-3.5 h-3.5 pointer-events-none" />
                        <select
                            value={statusFilter}
                            onChange={handleStatusChange}
                            className="bg-bg-main border border-border-subtle rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-text-primary focus:outline-none focus:border-brand-primary/50 appearance-none cursor-pointer"
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

                <div className="acx-table-container">
                    <table className="acx-table">
                        <thead>
                            <tr>
                                <th className="acx-table-header">PO Number</th>
                                <th className="acx-table-header">Date</th>
                                <th className="acx-table-header">Client</th>
                                <th className="acx-table-header">Quotation Ref</th>
                                <th className="acx-table-header text-right">PO Value</th>
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
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-0">
                                        <EmptyState 
                                            variant="document"
                                            title="No purchase orders found"
                                            description={search || statusFilter ? "No orders match the selected filter criteria." : "No purchase orders recorded yet."}
                                            actionLabel={search || statusFilter ? "Reset Filters" : undefined}
                                            onAction={search || statusFilter ? () => { setSearch(''); setStatusFilter(''); } : undefined}
                                        />
                                    </td>
                                </tr>
                            ) : (
                                orders.map(order => (
                                    <tr 
                                        key={order.id} 
                                        onClick={() => navigate(`/purchase-orders/${order.id}`)}
                                        className="hover:bg-bg-hover transition-colors cursor-pointer group"
                                    >
                                        <td className="acx-table-cell font-bold text-brand-primary">
                                            {order.poNumber}
                                        </td>
                                        <td className="acx-table-cell text-text-secondary">
                                            {order.poDate ? new Date(order.poDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                        </td>
                                        <td className="acx-table-cell">
                                            <div className="font-semibold text-text-primary">{order.clientName}</div>
                                            <div className="text-xs text-text-muted mt-0.5">{order.clientCompany || '—'}</div>
                                        </td>
                                        <td className="acx-table-cell text-text-secondary font-medium">
                                            {order.quotationNumber || '—'}
                                        </td>
                                        <td className="acx-table-cell text-right font-bold text-text-primary">
                                            {formatCurrency(order.poValue, order.currency)}
                                            {order.valueMismatch && (
                                                <div className="text-xs text-rose-500 font-semibold mt-1 flex items-center justify-end gap-1" title="Mismatch with Quotation">
                                                    <AlertCircle className="w-3 h-3" /> Mismatch
                                                </div>
                                            )}
                                        </td>
                                        <td className="acx-table-cell text-center">
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
