import React, { useState, useEffect } from 'react';
import { getReceivables } from '../services/api';
import { 
    DollarSign, 
    Search, 
    Building2, 
    Clock, 
    CheckCircle2, 
    AlertTriangle, 
    TrendingUp, 
    Calendar,
    ArrowUpRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';

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

    // Calculate aggregate totals
    const totalInvoicedSum = receivables.reduce((sum, r) => sum + (Number(r.totalInvoiced) || 0), 0);
    const totalReceivedSum = receivables.reduce((sum, r) => sum + (Number(r.totalReceived) || 0), 0);
    const totalOutstandingSum = receivables.reduce((sum, r) => sum + (Number(r.outstandingAmount) || 0), 0);
    const totalOverdueSum = receivables.reduce((sum, r) => sum + (Number(r.overdueAmount) || 0), 0);

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-24">
            {/* Header */}
            <PageHeader
                title="Receivables"
                subtitle="Track customer outstanding balances, payment collections, and overdue accounts."
                icon={DollarSign}
            />

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs text-text-muted font-semibold uppercase tracking-wider">Total Invoiced</div>
                        <div className="text-xl font-bold text-text-primary mt-1">
                            ₹{totalInvoicedSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="w-12 h-12 bg-teal-50 dark:bg-teal-950/40 text-brand-primary rounded-2xl flex items-center justify-center">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">Total Received</div>
                        <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                            ₹{totalReceivedSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-2xl flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">Outstanding</div>
                        <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                            ₹{totalOutstandingSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-2xl flex items-center justify-center">
                        <Clock className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs text-red-500 font-semibold uppercase tracking-wider">Overdue Balance</div>
                        <div className="text-xl font-bold text-red-500 mt-1">
                            ₹{totalOverdueSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="w-12 h-12 bg-red-50 dark:bg-red-950/40 text-red-500 rounded-2xl flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-bg-card border border-border-subtle rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <form onSubmit={handleSearchSubmit} className="flex items-center gap-3 w-full max-w-md">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by customer name or company..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-bg-main border border-border-subtle rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand-primary"
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn-primary text-xs px-4 py-2.5 rounded-xl font-semibold"
                    >
                        Filter
                    </button>
                </form>
                <div className="text-xs text-text-muted font-medium">
                    Showing <span className="font-bold text-text-primary">{receivables.length}</span> customers
                </div>
            </div>

            {/* Customer Receivables Table */}
            <div className="bg-bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-bg-main/50 text-text-muted uppercase font-semibold">
                            <tr>
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
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="py-8">
                                        <EmptyState type="loading" message="Loading customer receivables..." />
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="8" className="py-8">
                                        <EmptyState type="error" message={error} onRetry={fetchReceivables} />
                                    </td>
                                </tr>
                            ) : receivables.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="py-8">
                                        <EmptyState type="empty" message="No customer receivable records found." />
                                    </td>
                                </tr>
                            ) : (
                                receivables.map((r) => (
                                    <tr key={r.customerId} className="hover:bg-bg-main/50 transition-colors">
                                        <td className="p-4 font-bold text-text-primary align-top">
                                            <div className="text-sm font-semibold">{r.customerName}</div>
                                            <div className="text-xs font-mono text-brand-primary">{r.customerCode}</div>
                                        </td>
                                        <td className="p-4 text-text-primary align-top">
                                            {r.companyName ? (
                                                <div className="flex items-center gap-1.5 font-medium">
                                                    <Building2 className="w-3.5 h-3.5 text-text-muted shrink-0" />
                                                    <span>{r.companyName}</span>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="p-4 text-right font-medium text-text-primary align-top">
                                            ₹{Number(r.totalInvoiced || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-4 text-right font-semibold text-emerald-600 dark:text-emerald-400 align-top">
                                            ₹{Number(r.totalReceived || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-4 text-right font-bold text-amber-600 dark:text-amber-400 align-top">
                                            ₹{Number(r.outstandingAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-4 text-right align-top">
                                            {Number(r.overdueAmount) > 0 ? (
                                                <span className="font-bold text-red-500 px-2 py-0.5 bg-red-50 dark:bg-red-950/40 rounded-full">
                                                    ₹{Number(r.overdueAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            ) : (
                                                <span className="text-text-muted">₹0.00</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-text-muted font-medium align-top">
                                            {r.oldestDueDate ? (
                                                <span className={`inline-flex items-center gap-1 ${new Date(r.oldestDueDate) < new Date() && Number(r.outstandingAmount) > 0 ? 'text-red-500 font-bold' : ''}`}>
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {new Date(r.oldestDueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="p-4 text-right align-top">
                                            <button
                                                onClick={() => navigate(`/invoices?search=${encodeURIComponent(r.customerName)}`)}
                                                className="btn-secondary text-xs px-3 py-1.5 rounded-xl font-medium inline-flex items-center gap-1"
                                            >
                                                <span>View Invoices</span>
                                                <ArrowUpRight className="w-3 h-3" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

