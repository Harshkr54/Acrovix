import React, { useEffect, useState, useRef, useCallback } from 'react';
import { fetchApi, getDashboardReceivables } from '../services/api';
import { FileText, Inbox, Activity, CheckCircle, Clock, ChevronRight, Filter, Plus, MoreHorizontal, MessageSquare, User, AlertCircle, RefreshCw, Loader2, X, RotateCcw, Eye, Check, CreditCard, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import CreateQuotationModal from '../components/CreateQuotationModal';
import EnquiryDetailModal from '../components/EnquiryDetailModal';
import ActionMenu from '../components/ActionMenu';

const DEFAULT_FILTERS = {
    dateRange: 'ALL_TIME',
    enquiryStatus: 'ALL',
    quotationStatus: 'ALL',
    fromDate: '',
    toDate: ''
};

const getChartTrendLabel = (dateRange) => {
    switch (dateRange) {
        case 'TODAY':
            return 'Today Trend';
        case 'LAST_7_DAYS':
            return 'Last 7 Days Trend';
        case 'LAST_30_DAYS':
            return 'Last 30 Days Trend';
        case 'THIS_MONTH':
            return 'This Month Trend';
        case 'THIS_YEAR':
            return 'This Year Trend';
        case 'CUSTOM':
            return 'Custom Date Trend';
        case 'ALL_TIME':
        default:
            return 'All Time Trend';
    }
};

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [receivablesStats, setReceivablesStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const navigate = useNavigate();

    // Filter states
    const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
    const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef(null);

    // Recent Enquiries action menu & modal state
    const [activeActionMenuId, setActiveActionMenuId] = useState(null);
    const actionMenuRef = useRef(null);
    const [selectedEnquiry, setSelectedEnquiry] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [rowQuotationsMap, setRowQuotationsMap] = useState({});

    const hasActiveFilters = 
        appliedFilters.dateRange !== 'ALL_TIME' ||
        appliedFilters.enquiryStatus !== 'ALL' ||
        appliedFilters.quotationStatus !== 'ALL' ||
        Boolean(appliedFilters.fromDate) ||
        Boolean(appliedFilters.toDate);

    const fetchDashboardData = useCallback(async (filtersToFetch = appliedFilters) => {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (filtersToFetch.dateRange && filtersToFetch.dateRange !== 'ALL_TIME') {
            params.append('dateRange', filtersToFetch.dateRange);
        }
        if (filtersToFetch.enquiryStatus && filtersToFetch.enquiryStatus !== 'ALL') {
            params.append('enquiryStatus', filtersToFetch.enquiryStatus);
        }
        if (filtersToFetch.quotationStatus && filtersToFetch.quotationStatus !== 'ALL') {
            params.append('quotationStatus', filtersToFetch.quotationStatus);
        }
        if (filtersToFetch.dateRange === 'CUSTOM') {
            if (filtersToFetch.fromDate) params.append('fromDate', filtersToFetch.fromDate);
            if (filtersToFetch.toDate) params.append('toDate', filtersToFetch.toDate);
        }

        const queryString = params.toString();
        const endpoint = `/dashboard/stats${queryString ? `?${queryString}` : ''}`;

        try {
            const data = await fetchApi(endpoint);
            setStats(data);
            try {
                const recData = await getDashboardReceivables();
                setReceivablesStats(recData);
            } catch (rErr) {
                console.error("Failed to fetch dashboard receivables", rErr);
            }
        } catch (err) {
            console.error("Error fetching stats", err);
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    }, [appliedFilters]);


    useEffect(() => {
        fetchDashboardData(appliedFilters);
    }, [fetchDashboardData, appliedFilters]);

    // Click outside listener for filter popover and action menus
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
            if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
                setActiveActionMenuId(null);
            }
        };
        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setIsFilterOpen(false);
                setActiveActionMenuId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    const handleOpenFilter = () => {
        setDraftFilters(appliedFilters);
        setIsFilterOpen(!isFilterOpen);
    };

    const handleApplyFilters = (e) => {
        e?.preventDefault();
        setAppliedFilters(draftFilters);
        setIsFilterOpen(false);
    };

    const handleResetFilters = () => {
        setDraftFilters(DEFAULT_FILTERS);
        setAppliedFilters(DEFAULT_FILTERS);
        setIsFilterOpen(false);
    };

    const handleUpdateEnquiryStatus = async (id, newStatus) => {
        setActiveActionMenuId(null);
        try {
            await fetchApi(`/enquiries/${id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus })
            });
            window.dispatchEvent(new Event('notification-update'));
            fetchDashboardData(appliedFilters);
        } catch (err) {
            console.error("Failed to update enquiry status", err);
            setError(err.message || "Failed to update enquiry status");
        }
    };

    const handleOpenEnquiry = (enq) => {
        setSelectedEnquiry(enq);
        setIsDetailModalOpen(true);
    };

    const handleToggleActionMenu = (e, enqId) => {
        e.stopPropagation();
        if (activeActionMenuId === enqId) {
            setActiveActionMenuId(null);
        } else {
            setActiveActionMenuId(enqId);
            if (!rowQuotationsMap[enqId]) {
                fetchApi(`/quotations/enquiry/${enqId}`)
                    .then(data => {
                        setRowQuotationsMap(prev => ({
                            ...prev,
                            [enqId]: Array.isArray(data) ? data : []
                        }));
                    })
                    .catch(err => {
                        console.error("Failed to fetch quotations for enquiry", err);
                        setRowQuotationsMap(prev => ({ ...prev, [enqId]: [] }));
                    });
            }
        }
    };

    const normalizeStatus = (rawStatus) => {
        if (!rawStatus) return 'NEW';
        const upper = String(rawStatus).toUpperCase();
        return ['NEW', 'CONTACTED', 'QUOTED', 'CONVERTED', 'CLOSED'].includes(upper) ? upper : 'UNKNOWN';
    };

    const getStatusLabel = (rawStatus) => {
        const status = normalizeStatus(rawStatus);
        switch(status) {
            case 'NEW': return 'New';
            case 'CONTACTED': return 'Contacted';
            case 'QUOTED': return 'Quoted';
            case 'CONVERTED': return 'Converted';
            case 'CLOSED': return 'Closed';
            default: return 'Unknown';
        }
    };

    const getStatusStyle = (rawStatus) => {
        const status = normalizeStatus(rawStatus);
        switch(status) {
            case 'NEW': return 'text-brand-primary';
            case 'CONTACTED': return 'text-[var(--color-brand-primary)]';
            case 'QUOTED': return 'text-purple-600';
            case 'CONVERTED': return 'text-brand-success';
            case 'CLOSED': return 'text-brand-danger';
            default: return 'text-text-secondary';
        }
    };

    // Calculate max value for chart scaling
    const maxEnquiryCount = Math.max(
        1,
        ...(stats?.monthlyOverview?.map(m => Math.max(m.totalEnquiries || 0, m.newEnquiries || 0)) || [1])
    );

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
            
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-[28px] font-bold text-text-primary tracking-tight leading-tight">Overview</h1>
                    <p className="text-[13px] text-text-secondary mt-1">Monitor enquiries, quotations and business activity.</p>
                </div>

                <div className="flex items-center gap-3 relative" ref={filterRef}>
                    {/* Funnel Filter Button */}
                    <button 
                        onClick={handleOpenFilter}
                        aria-label="Toggle filters popover"
                        className={`flex items-center justify-center w-10 h-10 rounded-full border transition-all relative ${
                            isFilterOpen || hasActiveFilters
                                ? 'bg-brand-primary/10 border-[#818CF8] text-[var(--color-brand-primary)] dark:bg-[#312E81]/30 dark:border-[#6366F1] dark:text-[#818CF8] shadow-sm'
                                : 'bg-bg-card border-border-subtle text-text-secondary hover:text-text-primary hover:shadow-sm'
                        }`}
                    >
                        <Filter className="w-4 h-4" />
                        {hasActiveFilters && (
                            <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-brand-primary)] absolute top-1.5 right-1.5 ring-2 ring-bg-acx-card" />
                        )}
                    </button>

                    {/* Filter Popover */}
                    {isFilterOpen && (
                        <div className="absolute right-0 top-12 w-80 sm:w-96 bg-bg-card rounded-2xl shadow-xl border border-border-subtle p-5 z-50 animate-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between pb-3 border-b border-border-subtle mb-4">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-[var(--color-brand-primary)]" />
                                    <h3 className="text-sm font-bold text-text-primary">Dashboard Filters</h3>
                                </div>
                                <button onClick={() => setIsFilterOpen(false)} className="text-text-muted hover:text-text-primary p-1 rounded-lg transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleApplyFilters} className="space-y-4">
                                {/* Date Range */}
                                <div>
                                    <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">Date Range</label>
                                    <select
                                        value={draftFilters.dateRange}
                                        onChange={e => setDraftFilters({ ...draftFilters, dateRange: e.target.value })}
                                        className="w-full px-3 py-2 bg-bg-main focus:bg-bg-card border border-border-subtle focus:border-[var(--color-brand-primary)] rounded-xl text-xs text-text-primary outline-none transition-all"
                                    >
                                        <option value="ALL_TIME">All Time</option>
                                        <option value="TODAY">Today</option>
                                        <option value="LAST_7_DAYS">Last 7 Days</option>
                                        <option value="LAST_30_DAYS">Last 30 Days</option>
                                        <option value="THIS_MONTH">This Month</option>
                                        <option value="THIS_YEAR">This Year</option>
                                        <option value="CUSTOM">Custom Range</option>
                                    </select>
                                </div>

                                {/* Custom Dates */}
                                {draftFilters.dateRange === 'CUSTOM' && (
                                    <div className="grid grid-cols-2 gap-3 p-3 bg-bg-muted/40 rounded-xl border border-border-subtle">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-text-secondary mb-1">From Date</label>
                                            <input
                                                type="date"
                                                value={draftFilters.fromDate}
                                                onChange={e => setDraftFilters({ ...draftFilters, fromDate: e.target.value })}
                                                className="w-full px-2.5 py-1.5 bg-bg-card border border-border-subtle rounded-lg text-xs text-text-primary outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-text-secondary mb-1">To Date</label>
                                            <input
                                                type="date"
                                                value={draftFilters.toDate}
                                                onChange={e => setDraftFilters({ ...draftFilters, toDate: e.target.value })}
                                                className="w-full px-2.5 py-1.5 bg-bg-card border border-border-subtle rounded-lg text-xs text-text-primary outline-none"
                                            />
                                        </div>
                                        {draftFilters.fromDate && draftFilters.toDate && draftFilters.fromDate > draftFilters.toDate && (
                                            <p className="col-span-2 text-[11px] text-red-500 font-semibold mt-1">From date cannot be after To date.</p>
                                        )}
                                    </div>
                                )}

                                {/* Enquiry Status */}
                                <div>
                                    <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">Enquiry Status</label>
                                    <select
                                        value={draftFilters.enquiryStatus}
                                        onChange={e => setDraftFilters({ ...draftFilters, enquiryStatus: e.target.value })}
                                        className="w-full px-3 py-2 bg-bg-main focus:bg-bg-card border border-border-subtle focus:border-[var(--color-brand-primary)] rounded-xl text-xs text-text-primary outline-none transition-all"
                                    >
                                        <option value="ALL">All Statuses</option>
                                        <option value="NEW">New</option>
                                        <option value="CONTACTED">Contacted</option>
                                        <option value="QUOTED">Quoted</option>
                                        <option value="CONVERTED">Converted</option>
                                        <option value="CLOSED">Closed</option>
                                    </select>
                                </div>

                                {/* Quotation Status */}
                                <div>
                                    <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">Quotation Status</label>
                                    <select
                                        value={draftFilters.quotationStatus}
                                        onChange={e => setDraftFilters({ ...draftFilters, quotationStatus: e.target.value })}
                                        className="w-full px-3 py-2 bg-bg-main focus:bg-bg-card border border-border-subtle focus:border-[var(--color-brand-primary)] rounded-xl text-xs text-text-primary outline-none transition-all"
                                    >
                                        <option value="ALL">All Statuses</option>
                                        <option value="DRAFT">Draft</option>
                                        <option value="SENT">Sent</option>
                                        <option value="ACCEPTED">Accepted</option>
                                        <option value="REJECTED">Rejected</option>
                                        <option value="EXPIRED">Expired</option>
                                    </select>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center justify-between pt-3 border-t border-border-subtle gap-3">
                                    <button
                                        type="button"
                                        onClick={handleResetFilters}
                                        className="flex items-center px-3 py-2 bg-bg-muted hover:bg-bg-hover text-text-secondary rounded-xl text-xs font-semibold transition-colors"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                        Reset
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={draftFilters.dateRange === 'CUSTOM' && Boolean(draftFilters.fromDate && draftFilters.toDate && draftFilters.fromDate > draftFilters.toDate)}
                                        className="acx-btn-primary px-5 py-2 shadow-sm text-xs font-semibold disabled:opacity-50"
                                    >
                                        Apply Filters
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <button onClick={() => setIsCreateModalOpen(true)} className="acx-btn-primary flex items-center px-4 py-2.5 shadow-[0_4px_14px_rgba(79,70,229,0.25)]">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Quotation
                    </button>
                    <CreateQuotationModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
                </div>
            </div>

            {error ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] bg-bg-card rounded-[24px] border border-border-subtle text-center px-4">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-bold text-text-primary mb-2">Failed to Load Dashboard</h3>
                    <p className="text-sm text-text-secondary mb-6">{error}</p>
                    <button onClick={() => fetchDashboardData(appliedFilters)} className="acx-btn-primary flex items-center shadow-sm">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Retry
                    </button>
                </div>
            ) : (
                <>
                    {/* KPI Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                        {/* Total Enquiries KPI */}
                        <div className="acx-card p-6 flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[13px] font-semibold text-text-secondary">Total Enquiries</span>
                                <div className="p-2 bg-brand-primary/10 rounded-xl">
                                    <Inbox className="w-5 h-5 text-[var(--color-brand-primary)]" />
                                </div>
                            </div>
                            <div>
                                <div className="text-[32px] font-bold text-text-primary tracking-tight h-[38px] flex items-center">
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-[var(--color-brand-primary)] ml-1" /> : (stats?.totalEnquiries ?? 0)}
                                </div>
                                <div className="flex items-center mt-1 text-[11px] font-medium text-text-muted">
                                    <span>Filtered count</span>
                                </div>
                            </div>
                        </div>

                        {/* New Enquiries KPI */}
                        <div className="acx-card p-6 flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[13px] font-semibold text-text-secondary">New Enquiries</span>
                                <div className="p-2 bg-brand-teal/10 rounded-xl">
                                    <Activity className="w-5 h-5 text-brand-teal" />
                                </div>
                            </div>
                            <div>
                                <div className="text-[32px] font-bold text-text-primary tracking-tight h-[38px] flex items-center">
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-brand-teal ml-1" /> : (stats?.newEnquiries ?? 0)}
                                </div>
                                <div className="flex items-center mt-1 text-[11px] font-medium text-text-muted">
                                    <span>Filtered count</span>
                                </div>
                            </div>
                        </div>

                        {/* Total Quotations KPI */}
                        <div className="acx-card p-6 flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[13px] font-semibold text-text-secondary">Total Quotations</span>
                                <div className="p-2 bg-purple-50 rounded-xl">
                                    <FileText className="w-5 h-5 text-purple-600" />
                                </div>
                            </div>
                            <div>
                                <div className="text-[32px] font-bold text-text-primary tracking-tight h-[38px] flex items-center">
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-purple-600 ml-1" /> : (stats?.totalQuotations ?? 0)}
                                </div>
                                <div className="flex items-center mt-1 text-[11px] font-medium text-text-muted">
                                    <span>Excludes Trash</span>
                                </div>
                            </div>
                        </div>

                        {/* Accepted Quotations KPI */}
                        <div className="acx-card p-6 flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[13px] font-semibold text-text-secondary">Accepted Quotations</span>
                                <div className="p-2 bg-brand-success/10 rounded-xl">
                                    <CheckCircle className="w-5 h-5 text-brand-success" />
                                </div>
                            </div>
                            <div>
                                <div className="text-[32px] font-bold text-text-primary tracking-tight h-[38px] flex items-center">
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-brand-success ml-1" /> : (stats?.acceptedQuotations ?? 0)}
                                </div>
                                <div className="flex items-center mt-1 text-[11px] font-medium text-text-muted">
                                    <span>Excludes Trash</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Financial & Receivables KPI Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                        <div className="acx-card p-6 flex flex-col justify-between border-l-4 border-l-blue-500">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[13px] font-semibold text-text-secondary">Total Invoiced</span>
                                <div className="p-2 bg-blue-500/10 rounded-xl">
                                    <TrendingUp className="w-5 h-5 text-blue-500" />
                                </div>
                            </div>
                            <div>
                                <div className="text-[24px] font-bold text-text-primary tracking-tight">
                                    Rs. {Number(receivablesStats?.totalInvoiced || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className="flex items-center mt-1 text-[11px] font-medium text-text-muted">
                                    <span>Total Issued Tax Invoices</span>
                                </div>
                            </div>
                        </div>

                        <div className="acx-card p-6 flex flex-col justify-between border-l-4 border-l-emerald-500">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">Total Received</span>
                                <div className="p-2 bg-emerald-500/10 rounded-xl">
                                    <CreditCard className="w-5 h-5 text-emerald-500" />
                                </div>
                            </div>
                            <div>
                                <div className="text-[24px] font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                                    Rs. {Number(receivablesStats?.totalReceived || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className="flex items-center mt-1 text-[11px] font-medium text-text-muted">
                                    <span>Active Payment Ledger</span>
                                </div>
                            </div>
                        </div>

                        <div className="acx-card p-6 flex flex-col justify-between border-l-4 border-l-amber-500">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[13px] font-semibold text-amber-600 dark:text-amber-400">Outstanding Balance</span>
                                <div className="p-2 bg-amber-500/10 rounded-xl">
                                    <Clock className="w-5 h-5 text-amber-500" />
                                </div>
                            </div>
                            <div>
                                <div className="text-[24px] font-bold text-amber-600 dark:text-amber-400 tracking-tight">
                                    Rs. {Number(receivablesStats?.outstandingAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className="flex items-center mt-1 text-[11px] font-medium text-text-muted">
                                    <span>Pending Receivables</span>
                                </div>
                            </div>
                        </div>

                        <div className="acx-card p-6 flex flex-col justify-between border-l-4 border-l-red-500">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[13px] font-semibold text-red-500">Overdue Balance</span>
                                <div className="p-2 bg-red-500/10 rounded-xl">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                </div>
                            </div>
                            <div>
                                <div className="text-[24px] font-bold text-red-500 tracking-tight">
                                    Rs. {Number(receivablesStats?.overdueAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className="flex items-center mt-1 text-[11px] font-medium text-text-muted">
                                    <span>Past Due Date</span>
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Left Column: Analytics Chart (2/3 width) */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-[24px] border border-border-subtle p-6 flex flex-col h-full shadow-[0_4px_24px_rgba(11,25,44,0.02)]">
                                {/* Header */}
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
                                    <div className="flex items-start gap-4">
                                        <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100/50">
                                            <Activity className="w-5 h-5 text-blue-500" />
                                        </div>
                                        <div>
                                            <h2 className="text-[20px] font-bold text-text-primary tracking-tight">Enquiries Overview</h2>
                                            <p className="text-[14px] text-text-muted mt-0.5">Track new enquiries and total enquiries received over time</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border-subtle bg-white shadow-sm text-[13px] font-semibold text-text-secondary cursor-pointer hover:bg-bg-hover transition-colors">
                                        <Clock className="w-4 h-4 text-text-muted" />
                                        {getChartTrendLabel(appliedFilters.dateRange)}
                                        <ChevronRight className="w-4 h-4 ml-1 opacity-50 rotate-90" />
                                    </div>
                                </div>

                                {/* KPIs inside Chart */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
                                    <div className="p-4 rounded-[20px] bg-[#F8FAFC] border border-[#E2E8F0] flex items-center gap-4 transition-all hover:shadow-sm">
                                        <div className="w-12 h-12 rounded-[14px] bg-blue-100/50 text-blue-600 flex items-center justify-center shrink-0">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="text-[26px] font-bold text-text-primary leading-none tracking-tight">
                                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-blue-600 mt-1" /> : (stats?.totalEnquiries ?? 0)}
                                            </div>
                                            <div className="text-[13px] font-medium text-text-secondary mt-1">Total Enquiries</div>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-[20px] bg-[#F0FDF4] border border-[#DCFCE7] flex items-center gap-4 transition-all hover:shadow-sm">
                                        <div className="w-12 h-12 rounded-[14px] bg-emerald-100/50 text-emerald-600 flex items-center justify-center shrink-0">
                                            <User className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="text-[26px] font-bold text-text-primary leading-none tracking-tight">
                                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-emerald-600 mt-1" /> : (stats?.newEnquiries ?? 0)}
                                            </div>
                                            <div className="text-[13px] font-medium text-text-secondary mt-1">New Enquiries</div>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-[20px] bg-[#FAF5FF] border border-[#F3E8FF] flex items-center gap-4 transition-all hover:shadow-sm">
                                        <div className="w-12 h-12 rounded-[14px] bg-purple-100/50 text-purple-600 flex items-center justify-center shrink-0">
                                            <Activity className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="text-[26px] font-bold text-text-primary leading-none tracking-tight">
                                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-purple-600 mt-1" /> : (stats?.totalQuotations ?? 0)}
                                            </div>
                                            <div className="text-[13px] font-medium text-text-secondary mt-1">Total Quotations</div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Dynamic Chart Area */}
                                <div className="flex-1 min-h-[220px] max-h-[280px] flex flex-col relative w-full overflow-x-auto overflow-y-hidden hide-scrollbar">
                                    <div className="min-w-[600px] h-full flex flex-col relative">
                                        <div className="absolute top-0 left-0 text-[12px] font-medium text-text-muted">Enquiries</div>
                                        
                                        {isLoading ? (
                                            <div className="w-full flex justify-center items-center h-full">
                                                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                            </div>
                                        ) : stats?.monthlyOverview && stats.monthlyOverview.length > 0 ? (
                                            (() => {
                                                const overviewData = stats.monthlyOverview;
                                                const getNiceMax = (max) => {
                                                    if (max <= 5) return Math.max(1, max);
                                                    if (max <= 10) return 10;
                                                    const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
                                                    return Math.ceil(max / magnitude) * magnitude;
                                                };
                                                const maxEnq = Math.max(0, ...overviewData.map(i => Math.max(Number(i.totalEnquiries) || 0, Number(i.newEnquiries) || 0)));
                                                const niceMax = getNiceMax(maxEnq);
                                                
                                                let rawTicks;
                                                if (niceMax <= 5) {
                                                    rawTicks = Array.from({length: niceMax + 1}, (_, i) => i).reverse();
                                                } else {
                                                    rawTicks = [1, 0.75, 0.5, 0.25, 0].map(m => Math.round(niceMax * m));
                                                }
                                                const ticks = Array.from(new Set(rawTicks));

                                                const points = overviewData.map((item, index) => {
                                                    const x = ((index + 0.5) / overviewData.length) * 100;
                                                    const y = 100 - (item.totalEnquiries / niceMax) * 100;
                                                    return { x, y };
                                                });
                                                
                                                const areaPath = `M 0 100 L ${points[0]?.x} ${points[0]?.y} ` +
                                                    points.slice(1).map((p, i) => {
                                                        const prev = points[i];
                                                        return `C ${prev.x + (p.x - prev.x) / 2} ${prev.y} ${prev.x + (p.x - prev.x) / 2} ${p.y} ${p.x} ${p.y}`;
                                                    }).join(' ') +
                                                    ` L 100 100 Z`;

                                                const linePath = `M ${points[0]?.x} ${points[0]?.y} ` +
                                                    points.slice(1).map((p, i) => {
                                                        const prev = points[i];
                                                        return `C ${prev.x + (p.x - prev.x) / 2} ${prev.y} ${prev.x + (p.x - prev.x) / 2} ${p.y} ${p.x} ${p.y}`;
                                                    }).join(' ');

                                                return (
                                                    <div className="flex-1 relative flex mt-6">
                                                        {/* Y Axis & Horizontal Grids */}
                                                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                                            {ticks.map((t, i) => (
                                                                <div key={i} className="w-full flex items-center -mt-2">
                                                                    <div className="w-[30px] shrink-0 text-left text-[12px] font-medium text-text-muted">{t}</div>
                                                                    <div className="flex-1 border-t border-dashed border-[#E2E8F0]" />
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Chart Content Area */}
                                                        <div className="flex-1 relative ml-[40px]">
                                                            {/* SVG Trend Line Overlay */}
                                                            <div className="absolute inset-0 pointer-events-none z-10">
                                                                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                                                                    <defs>
                                                                        <linearGradient id="trendGradient" x1="0" x2="0" y1="0" y2="1">
                                                                            <stop offset="0%" stopColor="#818CF8" stopOpacity="0.15"/>
                                                                            <stop offset="100%" stopColor="#818CF8" stopOpacity="0"/>
                                                                        </linearGradient>
                                                                    </defs>
                                                                    <path d={areaPath} fill="url(#trendGradient)" vectorEffect="non-scaling-stroke" />
                                                                    <path d={linePath} fill="none" stroke="#C7D2FE" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                                                                    {points.map((p, i) => (
                                                                        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#fff" stroke="#A5B4FC" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                                                                    ))}
                                                                </svg>
                                                            </div>

                                                            {/* Bars Container */}
                                                            <div className="absolute inset-0 flex items-end">
                                                                {overviewData.map((item, idx) => {
                                                                    const totalHeightPct = Math.max(1, (item.totalEnquiries / niceMax) * 100);
                                                                    const newHeightPct = Math.max(1, (item.newEnquiries / niceMax) * 100);
                                                                    
                                                                    return (
                                                                        <div key={idx} className="flex-1 h-full flex flex-col justify-end items-center group relative z-20">
                                                                            {/* Tooltip */}
                                                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-[calc(100%+10px)] bg-white border border-border-subtle p-3 rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.08)] pointer-events-none w-[170px] z-30">
                                                                                <div className="text-[13px] font-bold text-text-primary mb-2.5">{item.month}</div>
                                                                                <div className="flex justify-between items-center mb-1.5">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <div className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]"></div>
                                                                                        <span className="text-[12px] font-medium text-text-secondary">New Enquiries</span>
                                                                                    </div>
                                                                                    <span className="text-[13px] font-bold text-text-primary">{item.newEnquiries}</span>
                                                                                </div>
                                                                                <div className="flex justify-between items-center">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <div className="w-2.5 h-2.5 rounded-full bg-[#A5B4FC]"></div>
                                                                                        <span className="text-[12px] font-medium text-text-secondary">Total Enquiries</span>
                                                                                    </div>
                                                                                    <span className="text-[13px] font-bold text-text-primary">{item.totalEnquiries}</span>
                                                                                </div>
                                                                            </div>

                                                                            {/* Bars Group */}
                                                                            <div className="w-[44px] max-w-full flex items-end justify-center gap-[4px] h-full cursor-pointer transition-transform group-hover:-translate-y-1">
                                                                                {/* New Enquiries Bar */}
                                                                                <div
                                                                                    className="w-1/2 bg-[#3B82F6] rounded-t-[6px] relative"
                                                                                    style={{ height: `${newHeightPct}%` }}
                                                                                >
                                                                                    {item.newEnquiries > 0 && (
                                                                                        <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 text-[11px] font-bold text-text-primary">
                                                                                            {item.newEnquiries}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                {/* Total Enquiries Bar */}
                                                                                <div
                                                                                    className="w-1/2 bg-[#A5B4FC] rounded-t-[6px] relative"
                                                                                    style={{ height: `${totalHeightPct}%` }}
                                                                                >
                                                                                    {item.totalEnquiries > 0 && (
                                                                                        <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 text-[11px] font-bold text-text-primary">
                                                                                            {item.totalEnquiries}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            
                                                            {/* X Axis Labels */}
                                                            <div className="absolute top-full left-0 right-0 flex pt-3 border-t border-[#E2E8F0]">
                                                                {overviewData.map((item, idx) => (
                                                                    <div key={idx} className="flex-1 text-center text-[12px] font-medium text-text-muted">
                                                                        {item.month}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()
                                        ) : (
                                            <div className="w-full flex flex-col items-center justify-center text-text-muted py-12 mt-6">
                                                <Activity className="w-8 h-8 mb-2 opacity-40" />
                                                <span className="text-[13px] font-medium">No enquiry data available</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Legend */}
                                <div className="flex items-center justify-center gap-8 mt-12 relative">
                                    <div className="flex items-center">
                                        <div className="w-3 h-3 rounded-full bg-[#3B82F6] mr-2"></div>
                                        <span className="text-[13px] font-medium text-text-secondary">New Enquiries</span>
                                    </div>
                                    <div className="flex items-center">
                                        <div className="w-3 h-3 rounded-full bg-[#A5B4FC] mr-2"></div>
                                        <span className="text-[13px] font-medium text-text-secondary">Total Enquiries</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Recent Activity Timeline (1/3 width) */}
                        <div className="lg:col-span-1">
                            <div className="acx-card h-full flex flex-col min-h-[360px]">
                                <div className="px-6 py-5 flex items-center justify-between">
                                    <h2 className="text-base font-bold text-text-primary tracking-tight">Recent Activity</h2>
                                    <Link to="/activity" className="text-[12px] font-semibold text-[var(--color-brand-primary)] hover:text-brand-primary/90 transition-colors flex items-center">
                                        View all <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                                    </Link>
                                </div>
                                <div className="flex-1 px-6 pb-6 overflow-y-auto max-h-[300px]">
                                    {isLoading ? (
                                        <div className="flex justify-center items-center py-12">
                                            <Loader2 className="w-6 h-6 animate-spin text-brand-teal" />
                                        </div>
                                    ) : stats?.recentActivities && stats.recentActivities.length > 0 ? (
                                        <div className="relative pl-3 space-y-6 before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-border-subtle/50">
                                            {stats.recentActivities.map((activity) => {
                                                let iconStyle = 'bg-brand-primary/10 text-brand-primary';
                                                let Icon = MessageSquare;
                                                
                                                if (activity.entityType === 'QUOTATION') {
                                                    iconStyle = 'bg-purple-50 text-purple-600';
                                                    Icon = FileText;
                                                } else if (activity.entityType === 'USER') {
                                                    iconStyle = 'bg-[#FFF7ED] text-[#EA580C]';
                                                    Icon = User;
                                                }

                                                const entityLabel = activity.entityType 
                                                    ? `${activity.entityType.toLowerCase()}${activity.entityId ? ` #${activity.entityId}` : ''}`
                                                    : (activity.entityId ? `#${activity.entityId}` : '');

                                                return (
                                                    <div key={activity.id} className="relative flex gap-4">
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${iconStyle} shadow-sm ring-4 ring-bg-card -ml-[11px]`}>
                                                            <Icon className="w-3 h-3" />
                                                        </div>
                                                        <div className="flex-1 min-w-0 pt-0.5 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                                                            <div>
                                                                <p className="text-[13px] font-bold text-text-primary leading-snug">{activity.action}</p>
                                                                {entityLabel && (
                                                                    <p className="text-[12px] text-text-muted mt-0.5 truncate max-w-[160px]">{entityLabel}</p>
                                                                )}
                                                            </div>
                                                            <div className="text-[11px] text-text-muted font-medium whitespace-nowrap pt-0.5">
                                                                {activity.createdAt ? new Date(activity.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-text-secondary h-full pt-10 pb-12">
                                            <Clock className="w-10 h-10 mb-3 opacity-20 text-text-muted" />
                                            <p className="text-[13px] font-semibold text-text-primary">No recent activity</p>
                                            <p className="text-[11px] mt-1 text-text-muted text-center">Activities matching criteria will appear here.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Enquiries Table */}
                    <div className="acx-card flex flex-col">
                        <div className="px-6 py-5 flex items-center justify-between border-b border-border-subtle">
                            <h2 className="text-base font-bold text-text-primary tracking-tight">Recent Enquiries</h2>
                            <Link to="/enquiries" className="text-[12px] font-semibold text-[var(--color-brand-primary)] hover:text-brand-primary/90 transition-colors flex items-center">
                                View all <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                            </Link>
                        </div>
                        <div className="acx-table-container">
                            {isLoading ? (
                                <div className="flex justify-center items-center py-12 bg-bg-card rounded-b-[24px]">
                                    <Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand-primary)]" />
                                </div>
                            ) : stats?.recentEnquiries && stats.recentEnquiries.length > 0 ? (
                                <table className="acx-table">
                                    <thead>
                                        <tr>
                                            <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card rounded-bl-[24px]">#</th>
                                            <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Client</th>
                                            <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Company</th>
                                            <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Service</th>
                                            <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Status</th>
                                            <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Date</th>
                                            <th className="px-6 py-4 text-center text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card rounded-br-[24px]">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-bg-card divide-y divide-border-subtle/40">
                                        {stats.recentEnquiries.map((enq) => (
                                            <tr 
                                                key={enq.id} 
                                                onDoubleClick={() => handleOpenEnquiry(enq)}
                                                className="hover:bg-bg-hover transition-colors cursor-pointer select-none"
                                                title="Double-click to open enquiry details"
                                            >
                                                <td className="px-6 py-3.5 whitespace-nowrap text-[13px] font-bold text-text-primary">
                                                    {enq.referenceId || `ACX-ENQ-${enq.id}`}
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap text-[13px] font-medium text-text-secondary">
                                                    {enq.fullName}
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap text-[13px] text-text-secondary">
                                                    {enq.companyName || '—'}
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap text-[13px] text-text-secondary">
                                                    {enq.serviceRequired || '—'}
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                    <span className={`inline-flex items-center text-[10px] font-bold tracking-wider ${getStatusStyle(enq.status)}`}>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5"></span>
                                                        {getStatusLabel(enq.status)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap text-[12px] text-text-muted font-medium">
                                                    {new Date(enq.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap text-center relative" onClick={(e) => e.stopPropagation()}>
                                                    <ActionMenu
                                                        ariaLabel="More enquiry actions"
                                                        icon={MoreHorizontal}
                                                        onOpen={() => {
                                                            if (!rowQuotationsMap[enq.id]) {
                                                                fetchApi(`/quotations/enquiry/${enq.id}`)
                                                                    .then(data => {
                                                                        setRowQuotationsMap(prev => ({
                                                                            ...prev,
                                                                            [enq.id]: Array.isArray(data) ? data : []
                                                                        }));
                                                                    })
                                                                    .catch(err => {
                                                                        console.error("Failed to fetch quotations for enquiry", err);
                                                                        setRowQuotationsMap(prev => ({ ...prev, [enq.id]: [] }));
                                                                    });
                                                            }
                                                        }}
                                                        renderContent={(close) => (
                                                            <div>
                                                                {/* OPEN SECTION */}
                                                                <div className="px-3 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">
                                                                    Open
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        close();
                                                                        handleOpenEnquiry(enq);
                                                                    }}
                                                                    className="flex items-center w-full px-3 py-2 text-xs font-semibold text-text-primary hover:bg-bg-hover rounded-xl transition-colors"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5 mr-2 text-[var(--color-brand-primary)]" />
                                                                    Open Enquiry
                                                                </button>

                                                                <div className="my-1 border-t border-border-subtle"></div>

                                                                {/* QUOTATION SECTION */}
                                                                <div className="px-3 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">
                                                                    Quotation
                                                                </div>
                                                                <Link
                                                                    to={`/quotations/new/${enq.id}`}
                                                                    onClick={close}
                                                                    className="flex items-center w-full px-3 py-2 text-xs font-semibold text-text-primary hover:bg-bg-hover rounded-xl transition-colors"
                                                                >
                                                                    <Plus className="w-3.5 h-3.5 mr-2 text-brand-success" />
                                                                    Create Quotation
                                                                </Link>

                                                                {rowQuotationsMap[enq.id] && rowQuotationsMap[enq.id].length > 0 && (
                                                                    rowQuotationsMap[enq.id].length === 1 ? (
                                                                        <Link
                                                                            to={`/quotations/edit/${rowQuotationsMap[enq.id][0].id}`}
                                                                            onClick={close}
                                                                            className="flex items-center w-full px-3 py-2 text-xs font-semibold text-text-primary hover:bg-bg-hover rounded-xl transition-colors"
                                                                        >
                                                                            <FileText className="w-3.5 h-3.5 mr-2 text-purple-600" />
                                                                            Open Quotation
                                                                        </Link>
                                                                    ) : (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                close();
                                                                                handleOpenEnquiry(enq);
                                                                            }}
                                                                            className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-text-primary hover:bg-bg-hover rounded-xl transition-colors"
                                                                        >
                                                                            <span className="flex items-center">
                                                                                <FileText className="w-3.5 h-3.5 mr-2 text-purple-600" />
                                                                                Open Quotation
                                                                            </span>
                                                                            <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full font-bold">
                                                                                {rowQuotationsMap[enq.id].length}
                                                                            </span>
                                                                        </button>
                                                                    )
                                                                )}

                                                                <div className="my-1 border-t border-border-subtle"></div>

                                                                {/* UPDATE STATUS SECTION */}
                                                                <div className="px-3 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">
                                                                    Update Status
                                                                </div>

                                                                {['NEW', 'CONTACTED', 'QUOTED', 'CONVERTED', 'CLOSED'].map((st) => (
                                                                    <button
                                                                        key={st}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            close();
                                                                            handleUpdateEnquiryStatus(enq.id, st);
                                                                        }}
                                                                        className={`flex items-center justify-between w-full px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                                                            normalizeStatus(enq.status) === st
                                                                                ? 'bg-brand-primary/10 text-[var(--color-brand-primary)] font-bold dark:bg-[#312E81]/30'
                                                                                : 'text-text-secondary hover:bg-bg-hover font-medium'
                                                                        }`}
                                                                    >
                                                                        <span className="flex items-center">
                                                                            <span className={`w-1.5 h-1.5 rounded-full mr-2 ${getStatusStyle(st).replace('text-', 'bg-')}`} />
                                                                            {getStatusLabel(st)}
                                                                        </span>
                                                                        {normalizeStatus(enq.status) === st && (
                                                                            <Check className="w-3.5 h-3.5 text-[var(--color-brand-primary)]" />
                                                                        )}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="px-6 py-16 flex flex-col items-center justify-center bg-bg-card rounded-b-[24px]">
                                    <div className="w-12 h-12 rounded-full bg-bg-muted flex items-center justify-center mb-4">
                                        <Inbox className="w-5 h-5 text-text-muted" />
                                    </div>
                                    <p className="text-[14px] font-bold text-text-primary">No matching enquiries found</p>
                                    <p className="text-[12px] text-text-muted mt-1 text-center max-w-sm">Try adjusting your dashboard filters to view data.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
            
            {/* Enquiry Detail Modal */}
            <EnquiryDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                enquiry={selectedEnquiry}
                onStatusUpdate={() => fetchDashboardData(appliedFilters)}
            />
        </div>
    );
}
