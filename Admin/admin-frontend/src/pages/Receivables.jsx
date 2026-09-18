import React, { useState, useEffect } from 'react';
import { getReceivables } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { 
    DollarSign, 
    Search, 
    Building2, 
    Clock, 
    CheckCircle2, 
    AlertTriangle, 
    TrendingUp, 
    Calendar,
    ArrowUpRight,
    Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Receivables() {
    const navigate = useNavigate();
    const [receivables, setReceivables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');

    const fetchReceivables = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getReceivables({ search: search.trim() || undefined });
            setReceivables(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch receivables summary', err);
            setError(err.message || 'Failed to load receivables summary');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReceivables();
    }, []);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchReceivables();
    };

    // Calculate aggregate totals grouped by currency
    const sumByCurrency = (field) => {
        const acc = {};
        receivables.forEach(r => {
            const curr = r.currency || 'INR';
            const val = Number(r[field]) || 0;
            acc[curr] = (acc[curr] || 0) + val;
        });
        return acc;
    };

    const totalInvoicedByCurrency = sumByCurrency('totalInvoiced');
    const totalReceivedByCurrency = sumByCurrency('totalReceived');
    const totalOutstandingByCurrency = sumByCurrency('outstandingAmount');
    const totalOverdueByCurrency = sumByCurrency('overdueAmount');

    const renderCurrencyTotals = (map, colorClass = 'text-text-primary') => {
        const keys = Object.keys(map);
        if (keys.length === 0) return <div className={`text-xl font-bold ${colorClass}`}>₹0.00</div>;
        return (
            <div className="space-y-0.5 mt-1">
                {keys.map(curr => (
                    <div key={curr} className={`text-xl font-bold ${colorClass}`}>
                        {formatCurrency(map[curr], curr, 2)}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6 pb-24">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2.5">
                    <DollarSign className="w-7 h-7 text-emerald-600" /> Customer Receivables & Outstanding
                </h1>
                <p className="text-xs text-text-muted mt-1">
                    Real-time ledger breakdown of customer invoices, payments received, balances due, and overdue accounts.
                </p>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs text-text-muted font-medium uppercase tracking-wider">Total Invoiced</div>
                        {renderCurrencyTotals(totalInvoicedByCurrency, "text-text-primary")}
                    </div>
                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wider">Total Received</div>
                        {renderCurrencyTotals(totalReceivedByCurrency, "text-emerald-600 dark:text-emerald-400")}
                    </div>
                    <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wider">Outstanding Balance</div>
                        {renderCurrencyTotals(totalOutstandingByCurrency, "text-amber-600 dark:text-amber-400")}
                    </div>
                    <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                        <Clock className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs text-red-500 font-medium uppercase tracking-wider">Overdue Balance</div>
                        {renderCurrencyTotals(totalOverdueByCurrency, "text-red-500")}
                    </div>
                    <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm flex items-center justify-between">
                <form onSubmit={handleSearchSubmit} className="flex items-center gap-3 w-full max-w-md">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by customer name or company..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-bg-main border border-border-subtle rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand-primary"
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                    >
                        Filter
                    </button>
                </form>
                <div className="text-xs text-text-muted font-medium">
                    Showing <span className="font-bold text-text-primary">{receivables.length}</span> entries
                </div>
            </div>

            {/* Customer Receivables Table */}
            <div className="bg-bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-12 text-center text-xs text-text-muted">Loading customer receivables...</div>
                ) : error ? (
                    <div className="p-8 text-center text-xs text-red-500">{error}</div>
                ) : receivables.length === 0 ? (
                    <div className="p-12 text-center text-xs text-text-muted">No customer receivable records found.</div>
                ) : (
                    <div className="acx-table-container">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-border-subtle text-text-muted bg-bg-main/50 uppercase tracking-wider font-semibold">
                                    <th className="p-4">Customer / Code</th>
                                    <th className="p-4">Company</th>
                                    <th className="p-4 text-right">Total Invoiced</th>
                                    <th className="p-4 text-right">Total Received</th>
                                    <th className="p-4 text-right">Outstanding</th>
                                    <th className="p-4 text-right">Overdue</th>
                                    <th className="p-4">Oldest Due Date</th>
                                    <th className="p-4 text-right">Invoices</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-subtle">
                                {receivables.map((r, idx) => (
                                    <tr key={`${r.customerId}-${r.currency || 'INR'}-${idx}`} className="hover:bg-bg-main/40 transition-colors">
                                        <td className="p-4 font-bold text-text-primary">
                                            <div className="text-sm flex items-center gap-2">
                                                <span>{r.customerName}</span>
                                                {r.currency && (
                                                    <span className="text-[10px] px-2 py-0.5 bg-bg-main border border-border-subtle rounded-full text-text-muted font-semibold">
                                                        {r.currency}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] font-mono text-text-muted">{r.customerCode}</div>
                                        </td>
                                        <td className="p-4 text-text-primary">
                                            {r.companyName ? (
                                                <div className="flex items-center gap-1.5 font-medium">
                                                    <Building2 className="w-3.5 h-3.5 text-text-muted shrink-0" />
                                                    <span>{r.companyName}</span>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="p-4 text-right font-medium text-text-primary">
                                            {formatCurrency(r.totalInvoiced || 0, r.currency, 2)}
                                        </td>
                                        <td className="p-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(r.totalReceived || 0, r.currency, 2)}
                                        </td>
                                        <td className="p-4 text-right font-bold text-amber-600 dark:text-amber-400">
                                            {formatCurrency(r.outstandingAmount || 0, r.currency, 2)}
                                        </td>
                                        <td className="p-4 text-right">
                                            {Number(r.overdueAmount) > 0 ? (
                                                <span className="font-bold text-red-500 px-2 py-0.5 bg-red-500/10 rounded-full">
                                                    {formatCurrency(r.overdueAmount, r.currency, 2)}
                                                </span>
                                            ) : (
                                                <span className="text-text-muted">{formatCurrency(0, r.currency, 2)}</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-text-muted font-medium">
                                            {r.oldestDueDate ? (
                                                <span className={`inline-flex items-center gap-1 ${new Date(r.oldestDueDate) < new Date() && Number(r.outstandingAmount) > 0 ? 'text-red-500 font-bold' : ''}`}>
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {new Date(r.oldestDueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => navigate(`/invoices?search=${encodeURIComponent(r.customerName)}`)}
                                                className="btn btn-primary btn-icon"
                                            >
                                                <span>View Invoices</span>
                                                <ArrowUpRight className="w-3 h-3" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
