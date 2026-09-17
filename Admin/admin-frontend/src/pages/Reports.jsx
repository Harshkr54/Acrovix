import React, { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '../utils/formatters';
import { 
    getReportSummary, 
    getQuotationReport, 
    getPurchaseOrderReport, 
    getInvoiceReport, 
    getPaymentReport, 
    getCustomerAnalytics, 
    getMonthlyTrends, 
    exportReportCsv 
} from '../services/api';
import { 
    BarChart3, 
    Calendar, 
    Download, 
    RefreshCw, 
    AlertCircle, 
    TrendingUp, 
    FileText, 
    ShoppingCart, 
    CreditCard, 
    DollarSign, 
    Users, 
    CheckCircle2, 
    Clock, 
    XCircle,
    ArrowUpRight,
    PieChart as PieIcon
} from 'lucide-react';

const PRESET_OPTIONS = [
    { value: 'THIS_FINANCIAL_YEAR', label: 'This Financial Year' },
    { value: 'PREVIOUS_FINANCIAL_YEAR', label: 'Previous Financial Year' },
    { value: 'TODAY', label: 'Today' },
    { value: 'THIS_WEEK', label: 'This Week' },
    { value: 'THIS_MONTH', label: 'This Month' },
    { value: 'THIS_QUARTER', label: 'This Quarter' },
    { value: 'CUSTOM', label: 'Custom Range' }
];

export default function Reports() {
    const [preset, setPreset] = useState('THIS_FINANCIAL_YEAR');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [dateError, setDateError] = useState('');

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isExporting, setIsExporting] = useState(false);

    // Data States
    const [summary, setSummary] = useState(null);
    const [quotations, setQuotations] = useState(null);
    const [purchaseOrders, setPurchaseOrders] = useState(null);
    const [invoices, setInvoices] = useState(null);
    const [payments, setPayments] = useState(null);
    const [customerAnalytics, setCustomerAnalytics] = useState([]);
    const [monthlyTrends, setMonthlyTrends] = useState([]);

    // Active Section / Tab
    const [activeTab, setActiveTab] = useState('OVERVIEW');

    const fetchAllReports = useCallback(async () => {
        if (preset === 'CUSTOM') {
            if (!fromDate || !toDate) {
                setDateError('Please select both From and To dates.');
                return;
            }
            if (fromDate > toDate) {
                setDateError('From Date cannot be after To Date.');
                return;
            }
        }
        setDateError('');
        setIsLoading(true);
        setError(null);

        try {
            const [
                summaryRes,
                quotationsRes,
                poRes,
                invoicesRes,
                paymentsRes,
                customersRes,
                trendsRes
            ] = await Promise.all([
                getReportSummary(preset, fromDate, toDate),
                getQuotationReport(preset, fromDate, toDate),
                getPurchaseOrderReport(preset, fromDate, toDate),
                getInvoiceReport(preset, fromDate, toDate),
                getPaymentReport(preset, fromDate, toDate),
                getCustomerAnalytics(preset, fromDate, toDate),
                getMonthlyTrends(preset, fromDate, toDate)
            ]);

            setSummary(summaryRes);
            setQuotations(quotationsRes);
            setPurchaseOrders(poRes);
            setInvoices(invoicesRes);
            setPayments(paymentsRes);
            setCustomerAnalytics(Array.isArray(customersRes) ? customersRes : []);
            setMonthlyTrends(Array.isArray(trendsRes) ? trendsRes : []);
        } catch (err) {
            console.error('Failed to fetch report data', err);
            setError('Unable to load report data.');
        } finally {
            setIsLoading(false);
        }
    }, [preset, fromDate, toDate]);

    useEffect(() => {
        if (preset !== 'CUSTOM') {
            fetchAllReports();
        }
    }, [preset, fetchAllReports]);

    const handleCustomSubmit = (e) => {
        e.preventDefault();
        fetchAllReports();
    };

    const handleExportCsv = async (reportType = 'SUMMARY') => {
        setIsExporting(true);
        try {
            const csvData = await exportReportCsv(reportType, preset, fromDate, toDate);
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `acrovix_report_${reportType.toLowerCase()}_${new Date().toISOString().slice(0,10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Export failed', err);
            alert('Failed to export CSV report.');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-acx-card p-6 rounded-2xl border border-border-subtle shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2.5">
                        <BarChart3 className="w-7 h-7 text-brand-teal" />
                        Reports & Business Analytics
                    </h1>
                    <p className="text-sm text-text-secondary mt-1">
                        Management reporting and financial visibility from live ACROVIX ERP data.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => handleExportCsv(activeTab === 'CUSTOMERS' ? 'CUSTOMERS' : activeTab === 'QUOTATIONS' ? 'QUOTATIONS' : activeTab === 'PAYMENTS' ? 'PAYMENTS' : 'SUMMARY')}
                        disabled={isExporting || isLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-teal hover:bg-[#0B7A70] text-white text-sm font-medium rounded-xl transition-all shadow-sm disabled:opacity-50"
                    >
                        {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Export CSV
                    </button>
                    <button
                        onClick={fetchAllReports}
                        disabled={isLoading}
                        className="p-2 border border-border-subtle rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
                        title="Refresh Report Data"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Date Range Filter Bar */}
            <div className="bg-bg-acx-card p-4 rounded-2xl border border-border-subtle shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <label className="text-xs font-semibold uppercase text-text-muted flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-brand-teal" />
                        Date Period:
                    </label>
                    <select
                        value={preset}
                        onChange={(e) => setPreset(e.target.value)}
                        className="px-3 py-2 text-sm bg-bg-main border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D9488] text-text-primary font-medium"
                    >
                        {PRESET_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>

                    {preset === 'CUSTOM' && (
                        <form onSubmit={handleCustomSubmit} className="flex flex-wrap items-center gap-2">
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="px-3 py-1.5 text-sm bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                            />
                            <span className="text-xs text-text-muted font-medium">to</span>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="px-3 py-1.5 text-sm bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                            />
                            <button
                                type="submit"
                                className="px-3 py-1.5 bg-brand-teal text-white text-xs font-semibold rounded-xl hover:bg-[#0B7A70] transition-colors"
                            >
                                Apply
                            </button>
                        </form>
                    )}
                </div>

                {summary && (
                    <div className="text-xs text-text-muted font-medium bg-bg-main px-3 py-1.5 rounded-xl border border-border-subtle/50">
                        Period: <span className="text-text-primary font-semibold">{summary.fromDate}</span> to <span className="text-text-primary font-semibold">{summary.toDate}</span>
                    </div>
                )}
            </div>

            {dateError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {dateError}
                </div>
            )}

            {/* ERROR STATE WITH RETRY */}
            {error ? (
                <div className="bg-bg-acx-card p-8 rounded-2xl border border-border-subtle shadow-sm text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary">Unable to load report data.</h3>
                    <p className="text-sm text-text-secondary max-w-md mx-auto">
                        There was a problem communicating with the analytics service. Please try again.
                    </p>
                    <button
                        onClick={fetchAllReports}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-teal text-white text-sm font-semibold rounded-xl hover:bg-[#0B7A70] transition-colors shadow-sm"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Retry
                    </button>
                </div>
            ) : isLoading ? (
                /* LOADING STATE */
                <div className="bg-bg-acx-card p-12 rounded-2xl border border-border-subtle shadow-sm text-center space-y-4">
                    <RefreshCw className="w-8 h-8 text-brand-teal animate-spin mx-auto" />
                    <p className="text-sm font-medium text-text-secondary">Aggregating business performance metrics...</p>
                </div>
            ) : (
                <>
                    {/* KPI CARDS SUMMARY */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-bg-acx-card p-5 rounded-2xl border border-border-subtle shadow-sm">
                            <div className="flex items-center justify-between text-text-muted mb-2">
                                <span className="text-xs font-semibold uppercase tracking-wider">Total Enquiries</span>
                                <FileText className="w-5 h-5 text-blue-500" />
                            </div>
                            <div className="text-2xl font-bold text-text-primary">
                                {summary?.totalEnquiries || 0}
                            </div>
                            <div className="text-xs text-text-muted mt-1">Total leads received</div>
                        </div>

                        <div className="bg-bg-acx-card p-5 rounded-2xl border border-border-subtle shadow-sm">
                            <div className="flex items-center justify-between text-text-muted mb-2">
                                <span className="text-xs font-semibold uppercase tracking-wider">Quotation Value</span>
                                <FileText className="w-5 h-5 text-brand-teal" />
                            </div>
                            <div className="text-2xl font-bold text-text-primary">
                                {formatCurrency(summary?.totalQuotationValue)}
                            </div>
                            <div className="text-xs text-text-muted mt-1">
                                Accepted: <span className="text-brand-teal font-semibold">{formatCurrency(summary?.acceptedQuotationValue)}</span>
                            </div>
                        </div>

                        <div className="bg-bg-acx-card p-5 rounded-2xl border border-border-subtle shadow-sm">
                            <div className="flex items-center justify-between text-text-muted mb-2">
                                <span className="text-xs font-semibold uppercase tracking-wider">PO Value</span>
                                <ShoppingCart className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div className="text-2xl font-bold text-text-primary">
                                {formatCurrency(summary?.totalPoValue)}
                            </div>
                            <div className="text-xs text-text-muted mt-1">
                                Total POs: <span className="font-semibold text-text-primary">{summary?.totalPurchaseOrders || 0}</span>
                            </div>
                        </div>

                        <div className="bg-bg-acx-card p-5 rounded-2xl border border-border-subtle shadow-sm">
                            <div className="flex items-center justify-between text-text-muted mb-2">
                                <span className="text-xs font-semibold uppercase tracking-wider">Total Invoiced</span>
                                <DollarSign className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div className="text-2xl font-bold text-text-primary">
                                {formatCurrency(summary?.totalInvoiced)}
                            </div>
                            <div className="text-xs text-text-muted mt-1">
                                Tax Invoices: <span className="font-semibold text-text-primary">{summary?.totalInvoices || 0}</span>
                            </div>
                        </div>

                        <div className="bg-bg-acx-card p-5 rounded-2xl border border-border-subtle shadow-sm">
                            <div className="flex items-center justify-between text-text-muted mb-2">
                                <span className="text-xs font-semibold uppercase tracking-wider">Total Received</span>
                                <CreditCard className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(summary?.totalReceived)}
                            </div>
                            <div className="text-xs text-text-muted mt-1">Recorded payments</div>
                        </div>

                        <div className="bg-bg-acx-card p-5 rounded-2xl border border-border-subtle shadow-sm">
                            <div className="flex items-center justify-between text-text-muted mb-2">
                                <span className="text-xs font-semibold uppercase tracking-wider">Outstanding</span>
                                <Clock className="w-5 h-5 text-amber-500" />
                            </div>
                            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                {formatCurrency(summary?.outstanding)}
                            </div>
                            <div className="text-xs text-text-muted mt-1">Balance to collect</div>
                        </div>

                        <div className="bg-bg-acx-card p-5 rounded-2xl border border-border-subtle shadow-sm">
                            <div className="flex items-center justify-between text-text-muted mb-2">
                                <span className="text-xs font-semibold uppercase tracking-wider">Overdue</span>
                                <AlertCircle className="w-5 h-5 text-red-500" />
                            </div>
                            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                {formatCurrency(summary?.overdue)}
                            </div>
                            <div className="text-xs text-text-muted mt-1">Passed payment due date</div>
                        </div>
                    </div>

                    {/* REPORT SECTION TABS */}
                    <div className="flex border-b border-border-subtle gap-2 overflow-x-auto hide-scrollbar">
                        {[
                            { id: 'OVERVIEW', label: 'Monthly Trends' },
                            { id: 'QUOTATIONS', label: 'Quotation Analytics' },
                            { id: 'PURCHASE_ORDERS', label: 'Purchase Orders' },
                            { id: 'INVOICES', label: 'Invoice Analytics' },
                            { id: 'PAYMENTS', label: 'Payment Method Breakdown' },
                            { id: 'CUSTOMERS', label: 'Customer Performance' }
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id)}
                                className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px ${
                                    activeTab === t.id
                                        ? 'border-[#0D9488] text-brand-teal'
                                        : 'border-transparent text-text-muted hover:text-text-primary'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* OVERVIEW / MONTHLY TRENDS */}
                    {activeTab === 'OVERVIEW' && (
                        <div className="bg-bg-acx-card p-6 rounded-2xl border border-border-subtle shadow-sm space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-brand-teal" />
                                    Monthly Revenue & Quotation Trends
                                </h3>
                                <span className="text-xs text-text-muted">Values in INR (₹)</span>
                            </div>

                            {monthlyTrends.length === 0 ? (
                                <div className="p-8 text-center text-text-muted text-sm border border-dashed border-border-subtle rounded-xl">
                                    No trend data available for the selected period.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Monthly Trend Visual Bars */}
                                    <div className="space-y-4">
                                        {monthlyTrends.map((t) => {
                                            const maxVal = Math.max(
                                                Number(t.quotationValue || 0),
                                                Number(t.invoiceValue || 0),
                                                Number(t.paymentValue || 0),
                                                1
                                            );
                                            const qPct = Math.min(100, Math.round((Number(t.quotationValue || 0) / maxVal) * 100));
                                            const iPct = Math.min(100, Math.round((Number(t.invoiceValue || 0) / maxVal) * 100));
                                            const pPct = Math.min(100, Math.round((Number(t.paymentValue || 0) / maxVal) * 100));

                                            return (
                                                <div key={t.month} className="p-4 bg-bg-main rounded-xl border border-border-subtle space-y-2">
                                                    <div className="flex items-center justify-between text-xs font-bold text-text-primary">
                                                        <span>{t.month}</span>
                                                        <div className="flex gap-4 text-xs font-normal text-text-muted">
                                                            <span>Quotations: <strong className="text-blue-500">{formatCurrency(t.quotationValue)}</strong></span>
                                                            <span>Invoiced: <strong className="text-brand-teal">{formatCurrency(t.invoiceValue)}</strong></span>
                                                            <span>Received: <strong className="text-emerald-500">{formatCurrency(t.paymentValue)}</strong></span>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1.5 pt-1">
                                                        {/* Quotations Bar */}
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="w-16 text-text-muted font-medium text-[11px]">Quotations</span>
                                                            <div className="flex-1 bg-border-subtle/40 h-2.5 rounded-full overflow-hidden">
                                                                <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${qPct}%` }} />
                                                            </div>
                                                        </div>

                                                        {/* Invoiced Bar */}
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="w-16 text-text-muted font-medium text-[11px]">Invoiced</span>
                                                            <div className="flex-1 bg-border-subtle/40 h-2.5 rounded-full overflow-hidden">
                                                                <div className="bg-brand-teal h-full rounded-full transition-all duration-500" style={{ width: `${iPct}%` }} />
                                                            </div>
                                                        </div>

                                                        {/* Received Bar */}
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="w-16 text-text-muted font-medium text-[11px]">Received</span>
                                                            <div className="flex-1 bg-border-subtle/40 h-2.5 rounded-full overflow-hidden">
                                                                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${pPct}%` }} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* QUOTATION ANALYTICS */}
                    {activeTab === 'QUOTATIONS' && quotations && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1 bg-bg-acx-card p-6 rounded-2xl border border-border-subtle shadow-sm space-y-4">
                                <h3 className="text-base font-bold text-text-primary border-b border-border-subtle pb-3">
                                    Quotation Financial Summary
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center py-1">
                                        <span className="text-sm text-text-muted">Total Quotations</span>
                                        <span className="text-sm font-bold text-text-primary">{quotations.totalQuotations}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1">
                                        <span className="text-sm text-text-muted">Total Quotation Value</span>
                                        <span className="text-sm font-bold text-text-primary">{formatCurrency(quotations.totalQuotationValue)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1 text-emerald-600 dark:text-emerald-400">
                                        <span className="text-sm font-medium">Accepted Value</span>
                                        <span className="text-sm font-bold">{formatCurrency(quotations.acceptedQuotationValue)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1 text-red-600 dark:text-red-400">
                                        <span className="text-sm font-medium">Rejected Value</span>
                                        <span className="text-sm font-bold">{formatCurrency(quotations.rejectedQuotationValue)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-2 bg-bg-acx-card p-6 rounded-2xl border border-border-subtle shadow-sm space-y-4">
                                <h3 className="text-base font-bold text-text-primary border-b border-border-subtle pb-3">
                                    Quotation Status Breakdown
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {[
                                        { label: 'Draft', count: quotations.draftCount, color: 'bg-slate-500' },
                                        { label: 'Sent', count: quotations.sentCount, color: 'bg-blue-500' },
                                        { label: 'Accepted', count: quotations.acceptedCount, color: 'bg-emerald-500' },
                                        { label: 'Rejected', count: quotations.rejectedCount, color: 'bg-red-500' },
                                        { label: 'Revised', count: quotations.revisedCount, color: 'bg-amber-500' },
                                        { label: 'Converted', count: quotations.convertedCount, color: 'bg-brand-teal' }
                                    ].map((st) => (
                                        <div key={st.label} className="p-4 bg-bg-main rounded-xl border border-border-subtle text-center space-y-1">
                                            <div className="text-xs font-semibold text-text-muted">{st.label}</div>
                                            <div className="text-xl font-bold text-text-primary">{st.count}</div>
                                            <div className="w-full bg-border-subtle h-1.5 rounded-full overflow-hidden mt-2">
                                                <div 
                                                    className={`${st.color} h-full rounded-full`} 
                                                    style={{ width: quotations.totalQuotations > 0 ? `${(st.count / quotations.totalQuotations) * 100}%` : '0%' }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PURCHASE ORDERS */}
                    {activeTab === 'PURCHASE_ORDERS' && purchaseOrders && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1 bg-bg-acx-card p-6 rounded-2xl border border-border-subtle shadow-sm space-y-4">
                                <h3 className="text-base font-bold text-text-primary border-b border-border-subtle pb-3">
                                    PO Financial Summary
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center py-1">
                                        <span className="text-sm text-text-muted">Total Purchase Orders</span>
                                        <span className="text-sm font-bold text-text-primary">{purchaseOrders.totalPurchaseOrders}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1">
                                        <span className="text-sm text-text-muted">Total PO Value</span>
                                        <span className="text-sm font-bold text-text-primary">{formatCurrency(purchaseOrders.totalPoValue)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1 text-brand-teal">
                                        <span className="text-sm font-medium">Verified / Active PO Value</span>
                                        <span className="text-sm font-bold">{formatCurrency(purchaseOrders.verifiedPoValue)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-2 bg-bg-acx-card p-6 rounded-2xl border border-border-subtle shadow-sm space-y-4">
                                <h3 className="text-base font-bold text-text-primary border-b border-border-subtle pb-3">
                                    Purchase Order Status Lifecycle
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {[
                                        { label: 'Received', count: purchaseOrders.receivedCount, color: 'bg-blue-500' },
                                        { label: 'Verified', count: purchaseOrders.verifiedCount, color: 'bg-brand-teal' },
                                        { label: 'Partially Fulfilled', count: purchaseOrders.partiallyFulfilledCount, color: 'bg-amber-500' },
                                        { label: 'Fulfilled', count: purchaseOrders.fulfilledCount, color: 'bg-emerald-500' },
                                        { label: 'Cancelled', count: purchaseOrders.cancelledCount, color: 'bg-red-500' }
                                    ].map((st) => (
                                        <div key={st.label} className="p-4 bg-bg-main rounded-xl border border-border-subtle text-center space-y-1">
                                            <div className="text-xs font-semibold text-text-muted">{st.label}</div>
                                            <div className="text-xl font-bold text-text-primary">{st.count}</div>
                                            <div className="w-full bg-border-subtle h-1.5 rounded-full overflow-hidden mt-2">
                                                <div 
                                                    className={`${st.color} h-full rounded-full`} 
                                                    style={{ width: purchaseOrders.totalPurchaseOrders > 0 ? `${(st.count / purchaseOrders.totalPurchaseOrders) * 100}%` : '0%' }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* INVOICES */}
                    {activeTab === 'INVOICES' && invoices && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1 bg-bg-acx-card p-6 rounded-2xl border border-border-subtle shadow-sm space-y-4">
                                <h3 className="text-base font-bold text-text-primary border-b border-border-subtle pb-3">
                                    Invoice Financial Breakdown
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center py-1">
                                        <span className="text-sm text-text-muted">Total Invoices</span>
                                        <span className="text-sm font-bold text-text-primary">{invoices.totalInvoices}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1">
                                        <span className="text-sm text-text-muted">Taxable Value</span>
                                        <span className="text-sm font-bold text-text-primary">{formatCurrency(invoices.taxableValue)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1">
                                        <span className="text-sm text-text-muted">Total Tax Amount</span>
                                        <span className="text-sm font-bold text-text-primary">{formatCurrency(invoices.taxAmount)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1">
                                        <span className="text-sm text-text-muted">Total Discount</span>
                                        <span className="text-sm font-bold text-text-primary">{formatCurrency(invoices.discountAmount)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1 border-t border-border-subtle pt-2 font-semibold">
                                        <span className="text-sm text-text-primary">Total Invoiced</span>
                                        <span className="text-sm text-text-primary">{formatCurrency(invoices.totalInvoiced)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1 text-emerald-600 dark:text-emerald-400">
                                        <span className="text-sm font-medium">Amount Received</span>
                                        <span className="text-sm font-bold">{formatCurrency(invoices.amountReceived)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1 text-amber-600 dark:text-amber-400">
                                        <span className="text-sm font-medium">Outstanding</span>
                                        <span className="text-sm font-bold">{formatCurrency(invoices.outstanding)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1 text-red-600 dark:text-red-400">
                                        <span className="text-sm font-medium">Overdue Amount</span>
                                        <span className="text-sm font-bold">{formatCurrency(invoices.overdue)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-2 bg-bg-acx-card p-6 rounded-2xl border border-border-subtle shadow-sm space-y-4">
                                <h3 className="text-base font-bold text-text-primary border-b border-border-subtle pb-3">
                                    Invoice Status Summary
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {[
                                        { label: 'Draft', count: invoices.draftCount, color: 'bg-slate-500' },
                                        { label: 'Issued', count: invoices.issuedCount, color: 'bg-blue-500' },
                                        { label: 'Partially Paid', count: invoices.partiallyPaidCount, color: 'bg-amber-500' },
                                        { label: 'Paid', count: invoices.paidCount, color: 'bg-emerald-500' },
                                        { label: 'Overdue', count: invoices.overdueCount, color: 'bg-red-500' },
                                        { label: 'Cancelled', count: invoices.cancelledCount, color: 'bg-rose-700' }
                                    ].map((st) => (
                                        <div key={st.label} className="p-4 bg-bg-main rounded-xl border border-border-subtle text-center space-y-1">
                                            <div className="text-xs font-semibold text-text-muted">{st.label}</div>
                                            <div className="text-xl font-bold text-text-primary">{st.count}</div>
                                            <div className="w-full bg-border-subtle h-1.5 rounded-full overflow-hidden mt-2">
                                                <div 
                                                    className={`${st.color} h-full rounded-full`} 
                                                    style={{ width: invoices.totalInvoices > 0 ? `${(st.count / invoices.totalInvoices) * 100}%` : '0%' }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PAYMENTS */}
                    {activeTab === 'PAYMENTS' && payments && (
                        <div className="bg-bg-acx-card p-6 rounded-2xl border border-border-subtle shadow-sm space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border-subtle pb-4">
                                <div>
                                    <h3 className="text-base font-bold text-text-primary">Payment Collection Breakdown</h3>
                                    <p className="text-xs text-text-muted mt-0.5">Active RECORDED payments only. Cancelled payments are strictly excluded.</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-text-muted">Total Collections</div>
                                    <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                        {formatCurrency(payments.totalReceived)}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {payments.methodBreakdown.map((mb) => {
                                    const pct = Number(payments.totalReceived || 0) > 0 
                                        ? Math.round((Number(mb.amount || 0) / Number(payments.totalReceived)) * 100) 
                                        : 0;

                                    return (
                                        <div key={mb.method} className="p-5 bg-bg-main rounded-xl border border-border-subtle space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-bold text-text-primary">{mb.method}</span>
                                                <span className="text-xs font-semibold px-2 py-0.5 bg-brand-teal/10 text-brand-teal rounded-full">
                                                    {mb.count} payments
                                                </span>
                                            </div>
                                            <div className="text-lg font-bold text-text-primary">
                                                {formatCurrency(mb.amount)}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs text-text-muted">
                                                    <span>Share of collections</span>
                                                    <span>{pct}%</span>
                                                </div>
                                                <div className="w-full bg-border-subtle h-2 rounded-full overflow-hidden">
                                                    <div className="bg-brand-teal h-full rounded-full" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* CUSTOMERS */}
                    {activeTab === 'CUSTOMERS' && (
                        <div className="bg-bg-acx-card rounded-2xl border border-border-subtle shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-border-subtle flex justify-between items-center">
                                <div>
                                    <h3 className="text-base font-bold text-text-primary">Customer Business Performance</h3>
                                    <p className="text-xs text-text-muted mt-0.5">Aggregated metrics per customer account for the selected period.</p>
                                </div>
                            </div>

                            {customerAnalytics.length === 0 ? (
                                <div className="p-8 text-center text-text-muted text-sm">
                                    No customer records found.
                                </div>
                            ) : (
                                <div className="acx-table-container">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-bg-main border-b border-border-subtle text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                                                <th className="py-3 px-4">Customer</th>
                                                <th className="py-3 px-4">Company</th>
                                                <th className="py-3 px-4 text-center">Quotations</th>
                                                <th className="py-3 px-4 text-center">Accepted</th>
                                                <th className="py-3 px-4 text-right">PO Value</th>
                                                <th className="py-3 px-4 text-right">Invoiced</th>
                                                <th className="py-3 px-4 text-right">Received</th>
                                                <th className="py-3 px-4 text-right">Outstanding</th>
                                                <th className="py-3 px-4 text-right">Overdue</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border-subtle text-sm text-text-primary">
                                            {customerAnalytics.map((c) => (
                                                <tr key={c.customerId} className="hover:bg-bg-hover transition-colors">
                                                    <td className="py-3 px-4 font-semibold">
                                                        <div>{c.customerName}</div>
                                                        <div className="text-xs text-text-muted font-normal">{c.customerCode}</div>
                                                    </td>
                                                    <td className="py-3 px-4 text-text-secondary">{c.companyName || '—'}</td>
                                                    <td className="py-3 px-4 text-center font-medium">{c.quotationCount}</td>
                                                    <td className="py-3 px-4 text-center font-medium text-emerald-600 dark:text-emerald-400">{c.acceptedQuotationCount}</td>
                                                    <td className="py-3 px-4 text-right font-medium">{formatCurrency(c.poValue)}</td>
                                                    <td className="py-3 px-4 text-right font-medium">{formatCurrency(c.invoicedValue)}</td>
                                                    <td className="py-3 px-4 text-right font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(c.receivedAmount)}</td>
                                                    <td className="py-3 px-4 text-right font-medium text-amber-600 dark:text-amber-400">{formatCurrency(c.outstandingAmount)}</td>
                                                    <td className="py-3 px-4 text-right font-medium text-red-600 dark:text-red-400">{formatCurrency(c.overdueAmount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
