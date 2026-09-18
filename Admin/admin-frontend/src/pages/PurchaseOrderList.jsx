import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPurchaseOrders } from '../services/api';
import { Search, Plus, Filter, FileText, ShoppingCart, CheckCircle, Clock, XCircle, Package } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

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
            setOrders(data.content);
            setTotalPages(data.totalPages);
            setPage(data.number);
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

    const getStatusBadge = (status) => {
        switch (status) {
            case 'RECEIVED': return <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded text-xs font-medium flex items-center gap-1 w-fit"><Clock className="w-3 h-3"/> Received</span>;
            case 'VERIFIED': return <span className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded text-xs font-medium flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3"/> Verified</span>;
            case 'PARTIALLY_FULFILLED': return <span className="px-2 py-1 bg-purple-500/10 text-purple-500 rounded text-xs font-medium flex items-center gap-1 w-fit"><Package className="w-3 h-3"/> Partial</span>;
            case 'FULFILLED': return <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded text-xs font-medium flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3"/> Fulfilled</span>;
            case 'CANCELLED': return <span className="px-2 py-1 bg-red-500/10 text-red-500 rounded text-xs font-medium flex items-center gap-1 w-fit"><XCircle className="w-3 h-3"/> Cancelled</span>;
            default: return <span className="px-2 py-1 bg-bg-muted text-text-secondary rounded text-xs font-medium">{status}</span>;
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">Purchase Orders</h1>
                    <p className="text-text-muted mt-2">Manage customer purchase orders and fulfillment.</p>
                </div>
            </div>

            <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border-subtle flex gap-4 items-center bg-bg-main/50">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search PO number, client, quotation..."
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
                            <option value="RECEIVED">Received</option>
                            <option value="VERIFIED">Verified</option>
                            <option value="PARTIALLY_FULFILLED">Partially Fulfilled</option>
                            <option value="FULFILLED">Fulfilled</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>
                </div>

                <div className="acx-table-container">
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
                                    <td colSpan="6" className="px-6 py-8 text-center text-text-muted">Loading orders...</td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-text-muted">No purchase orders found.</td>
                                </tr>
                            ) : (
                                orders.map(order => (
                                    <tr 
                                        key={order.id} 
                                        onClick={() => navigate(`/purchase-orders/${order.id}`)}
                                        className="hover:bg-bg-main/50 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-6 py-4 font-medium text-brand-primary">{order.poNumber}</td>
                                        <td className="px-6 py-4 text-text-secondary">{new Date(order.poDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-text-primary">{order.clientName}</div>
                                            <div className="text-xs text-text-muted">{order.clientCompany}</div>
                                        </td>
                                        <td className="px-6 py-4 text-text-secondary">{order.quotationNumber}</td>
                                        <td className="px-6 py-4 text-right font-medium">
                                            {formatCurrency(order.poValue, order.currency)}
                                            {order.valueMismatch && (
                                                <div className="text-xs text-red-500 mt-1" title="Mismatch with Quotation">⚠ Mismatch</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(order.status)}
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
