import React, { useEffect, useState, useRef, useCallback } from 'react';
import { fetchApi } from '../services/api';
import { FileText, Inbox, Activity, CheckCircle, Clock, ChevronRight, Filter, Plus, MoreHorizontal, MessageSquare, User, AlertCircle, RefreshCw, Loader2, X, RotateCcw, Eye, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import CreateQuotationModal from '../components/CreateQuotationModal';

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
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const navigate = useNavigate();

    // Filter states
    const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
    const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef(null);

    // Recent Enquiries action menu state
    const [activeActionMenuId, setActiveActionMenuId] = useState(null);
    const actionMenuRef = useRef(null);

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
            case 'NEW': return 'text-[#2563EB]';
            case 'CONTACTED': return 'text-[#4F46E5]';
            case 'QUOTED': return 'text-[#7C3AED]';
            case 'CONVERTED': return 'text-[#059669]';
            case 'CLOSED': return 'text-[#DC2626]';
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
                                ? 'bg-[#EEF2FF] border-[#818CF8] text-[#4F46E5] dark:bg-[#312E81]/30 dark:border-[#6366F1] dark:text-[#818CF8] shadow-sm'
                                : 'bg-bg-card border-border-subtle text-text-secondary hover:text-text-primary hover:shadow-sm'
                        }`}
                    >
                        <Filter className="w-4 h-4" />
                        {hasActiveFilters && (
                            <span className="w-2.5 h-2.5 rounded-full bg-[#4F46E5] absolute top-1.5 right-1.5 ring-2 ring-bg-card" />
                        )}
                    </button>

                    {/* Filter Popover */}
                    {isFilterOpen && (
                        <div className="absolute right-0 top-12 w-80 sm:w-96 bg-bg-card rounded-2xl shadow-xl border border-border-subtle p-5 z-50 animate-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between pb-3 border-b border-border-subtle mb-4">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-[#4F46E5]" />
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
                                        className="w-full px-3 py-2 bg-bg-main focus:bg-bg-card border border-border-subtle focus:border-[#4F46E5] rounded-xl text-xs text-text-primary outline-none transition-all"
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
                                        className="w-full px-3 py-2 bg-bg-main focus:bg-bg-card border border-border-subtle focus:border-[#4F46E5] rounded-xl text-xs text-text-primary outline-none transition-all"
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
                                        className="w-full px-3 py-2 bg-bg-main focus:bg-bg-card border border-border-subtle focus:border-[#4F46E5] rounded-xl text-xs text-text-primary outline-none transition-all"
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
                                        className="btn-primary px-5 py-2 shadow-sm text-xs font-semibold disabled:opacity-50"
                                    >
                                        Apply Filters
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary flex items-center px-4 py-2.5 shadow-[0_4px_14px_rgba(79,70,229,0.25)]">
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
                    <button onClick={() => fetchDashboardData(appliedFilters)} className="btn-primary flex items-center shadow-sm">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Retry
                    </button>
                </div>
            ) : (
                <>
                    {/* KPI Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                        {/* Total Enquiries KPI */}
                        <div className="card p-6 flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[13px] font-semibold text-text-secondary">Total Enquiries</span>
                                <div className="p-2 bg-[#EEF2FF] rounded-xl">
                                    <Inbox className="w-5 h-5 text-[#4F46E5]" />
                                </div>
                            </div>
                            <div>
                                <div className="text-[32px] font-bold text-text-primary tracking-tight h-[38px] flex items-center">
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-[#4F46E5] ml-1" /> : (stats?.totalEnquiries ?? 0)}
                                </div>
                                <div className="flex items-center mt-1 text-[11px] font-medium text-text-muted">
                                    <span>Filtered count</span>
                                </div>
                            </div>
                        </div>

                        {/* New Enquiries KPI */}
                        <div className="card p-6 flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[13px] font-semibold text-text-secondary">New Enquiries</span>
                                <div className="p-2 bg-[#ECFEFF] rounded-xl">
                                    <Activity className="w-5 h-5 text-[#0891B2]" />
                                </div>
                            </div>
                            <div>
                                <div className="text-[32px] font-bold text-text-primary tracking-tight h-[38px] flex items-center">
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-[#0891B2] ml-1" /> : (stats?.newEnquiries ?? 0)}
                                </div>
                                <div className="flex items-center mt-1 text-[11px] font-medium text-text-muted">
                                    <span>Filtered count</span>
                                </div>
                            </div>
                        </div>

                        {/* Total Quotations KPI */}
                        <div className="card p-6 flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[13px] font-semibold text-text-secondary">Total Quotations</span>
                                <div className="p-2 bg-[#F5F3FF] rounded-xl">
                                    <FileText className="w-5 h-5 text-[#7C3AED]" />
                                </div>
                            </div>
                            <div>
                                <div className="text-[32px] font-bold text-text-primary tracking-tight h-[38px] flex items-center">
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED] ml-1" /> : (stats?.totalQuotations ?? 0)}
                                </div>
                                <div className="flex items-center mt-1 text-[11px] font-medium text-text-muted">
                                    <span>Excludes Trash</span>
                                </div>
                            </div>
                        </div>

                        {/* Accepted Quotations KPI */}
                        <div className="card p-6 flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[13px] font-semibold text-text-secondary">Accepted Quotations</span>
                                <div className="p-2 bg-[#ECFDF5] rounded-xl">
                                    <CheckCircle className="w-5 h-5 text-[#059669]" />
                                </div>
                            </div>
                            <div>
                                <div className="text-[32px] font-bold text-text-primary tracking-tight h-[38px] flex items-center">
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-[#059669] ml-1" /> : (stats?.acceptedQuotations ?? 0)}
                                </div>
                                <div className="flex items-center mt-1 text-[11px] font-medium text-text-muted">
                                    <span>Excludes Trash</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Left Column: Analytics Chart (2/3 width) */}
                        <div className="lg:col-span-2">
                            <div className="card p-6 flex flex-col h-full min-h-[360px]">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-base font-bold text-text-primary tracking-tight">Enquiries Overview</h2>
                                    <div className="flex items-center px-3 py-1.5 rounded-lg border border-border-subtle bg-bg-card text-xs font-semibold text-text-secondary">
                                        <Clock className="w-3.5 h-3.5 mr-2 text-text-muted" />
                                        {getChartTrendLabel(appliedFilters.dateRange)}
                                    </div>
                                </div>
                                
                                {/* Dynamic Chart Bars */}
                                <div className="flex-1 relative flex items-end justify-between gap-2 px-2 pb-4 min-h-[220px] pt-8 border-b border-border-subtle/50 overflow-x-auto">
                                    {isLoading ? (
                                        <div className="w-full flex justify-center items-center h-full">
                                            <Loader2 className="w-6 h-6 animate-spin text-[#4F46E5]" />
                                        </div>
                                    ) : stats?.monthlyOverview && stats.monthlyOverview.length > 0 ? (
                                        (() => {
                                            const overviewData = stats.monthlyOverview;
                                            const maxEnquiryCount = Math.max(
                                                1,
                                                ...overviewData.map(i => Math.max(Number(i.totalEnquiries) || 0, Number(i.newEnquiries) || 0))
                                            );

                                            return overviewData.map((item, idx) => {
                                                const totalHeightPct = Math.max(10, Math.round(((item.totalEnquiries || 0) / maxEnquiryCount) * 100));
                                                const newHeightPct = Math.max(8, Math.round(((item.newEnquiries || 0) / maxEnquiryCount) * 100));

                                                return (
                                                    <div key={idx} className="flex-1 min-w-[28px] flex flex-col items-center gap-2 h-full justify-end group relative">
                                                        {/* Tooltip */}
                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-text-primary text-bg-main text-[10px] font-bold py-1 px-2 rounded-md shadow-lg pointer-events-none whitespace-nowrap z-20">
                                                            {item.month}: {item.totalEnquiries} Total ({item.newEnquiries} New)
                                                        </div>

                                                        {/* Bars Container */}
                                                        <div className="w-full max-w-[40px] flex items-end justify-center gap-1 h-full">
                                                            {/* Total Enquiries Bar */}
                                                            <div
                                                                className="w-1/2 bg-[#EEF2FF] border border-[#818CF8]/30 dark:bg-[#312E81]/30 dark:border-[#6366F1]/40 rounded-t-md transition-all duration-500"
                                                                style={{ height: `${totalHeightPct}%` }}
                                                            />
                                                            {/* New Enquiries Bar */}
                                                            <div
                                                                className="w-1/2 bg-[#4F46E5] rounded-t-md transition-all duration-500 shadow-sm"
                                                                style={{ height: `${newHeightPct}%` }}
                                                            />
                                                        </div>
                                                        {/* Month/Time Label */}
                                                        <span className="text-[10px] font-bold text-text-secondary mt-1 whitespace-nowrap">{item.month}</span>
                                                    </div>
                                                );
                                            });
                                        })()
                                    ) : (
                                        <div className="w-full flex flex-col items-center justify-center text-text-muted py-12">
                                            <Activity className="w-8 h-8 mb-2 opacity-40" />
                                            <span className="text-[13px] font-medium">No trend data for selected criteria</span>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Legend */}
                                <div className="flex items-center justify-center gap-6 pt-4">
                                    <div className="flex items-center">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#4F46E5] mr-2"></div>
                                        <span className="text-[11px] font-medium text-text-secondary">New Enquiries</span>
                                    </div>
                                    <div className="flex items-center">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#EEF2FF] border border-[#4F46E5]/20 mr-2"></div>
                                        <span className="text-[11px] font-medium text-text-secondary">Total Enquiries</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Recent Activity Timeline (1/3 width) */}
                        <div className="lg:col-span-1">
                            <div className="card h-full flex flex-col min-h-[360px]">
                                <div className="px-6 py-5 flex items-center justify-between">
                                    <h2 className="text-base font-bold text-text-primary tracking-tight">Recent Activity</h2>
                                    <Link to="/activity" className="text-[12px] font-semibold text-[#4F46E5] hover:text-[#4338CA] transition-colors flex items-center">
                                        View all <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                                    </Link>
                                </div>
                                <div className="flex-1 px-6 pb-6 overflow-y-auto max-h-[300px]">
                                    {isLoading ? (
                                        <div className="flex justify-center items-center py-12">
                                            <Loader2 className="w-6 h-6 animate-spin text-[#14B8A6]" />
                                        </div>
                                    ) : stats?.recentActivities && stats.recentActivities.length > 0 ? (
                                        <div className="relative pl-3 space-y-6 before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-border-subtle/50">
                                            {stats.recentActivities.map((activity) => {
                                                let iconStyle = 'bg-[#EFF6FF] text-[#2563EB]';
                                                let Icon = MessageSquare;
                                                
                                                if (activity.entityType === 'QUOTATION') {
                                                    iconStyle = 'bg-[#F5F3FF] text-[#7C3AED]';
                                                    Icon = FileText;
                                                } else if (activity.entityType === 'USER') {
                                                    iconStyle = 'bg-[#FFF7ED] text-[#EA580C]';
                                                    Icon = User;
                                                }

                                                return (
                                                    <div key={activity.id} className="relative flex gap-4">
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${iconStyle} shadow-sm ring-4 ring-bg-card -ml-[11px]`}>
                                                            <Icon className="w-3 h-3" />
                                                        </div>
                                                        <div className="flex-1 min-w-0 pt-0.5 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                                                            <div>
                                                                <p className="text-[13px] font-bold text-text-primary leading-snug">{activity.action}</p>
                                                                <p className="text-[12px] text-text-muted mt-0.5 truncate max-w-[160px]">{activity.entityType.toLowerCase()} #{activity.entityId}</p>
                                                            </div>
                                                            <div className="text-[11px] text-text-muted font-medium whitespace-nowrap pt-0.5">
                                                                {new Date(activity.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
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
                    <div className="card flex flex-col">
                        <div className="px-6 py-5 flex items-center justify-between border-b border-border-subtle">
                            <h2 className="text-base font-bold text-text-primary tracking-tight">Recent Enquiries</h2>
                            <Link to="/enquiries" className="text-[12px] font-semibold text-[#4F46E5] hover:text-[#4338CA] transition-colors flex items-center">
                                View all <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            {isLoading ? (
                                <div className="flex justify-center items-center py-12 bg-bg-card rounded-b-[24px]">
                                    <Loader2 className="w-6 h-6 animate-spin text-[#4F46E5]" />
                                </div>
                            ) : stats?.recentEnquiries && stats.recentEnquiries.length > 0 ? (
                                <table className="min-w-full divide-y divide-border-subtle">
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
                                            <tr key={enq.id} className="hover:bg-bg-hover transition-colors">
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
                                                <td className="px-6 py-3.5 whitespace-nowrap">
                                                    <span className={`inline-flex items-center text-[10px] font-bold tracking-wider ${getStatusStyle(enq.status)}`}>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5"></span>
                                                        {getStatusLabel(enq.status)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap text-[12px] text-text-muted font-medium">
                                                    {new Date(enq.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap text-center relative">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveActionMenuId(activeActionMenuId === enq.id ? null : enq.id);
                                                        }}
                                                        className={`p-1.5 rounded-lg border transition-all ${
                                                            activeActionMenuId === enq.id
                                                                ? 'bg-[#EEF2FF] border-[#818CF8] text-[#4F46E5] dark:bg-[#312E81]/30 dark:border-[#6366F1] dark:text-[#818CF8] shadow-sm'
                                                                : 'bg-bg-card border-border-subtle text-text-secondary hover:text-text-primary hover:shadow-sm'
                                                        }`}
                                                        title="More actions"
                                                        aria-label="More actions"
                                                    >
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </button>

                                                    {activeActionMenuId === enq.id && (
                                                        <div
                                                            ref={actionMenuRef}
                                                            className="absolute right-6 top-10 w-48 bg-bg-card rounded-2xl shadow-xl border border-border-subtle p-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150 text-left"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <div className="px-3 py-1.5 border-b border-border-subtle text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">
                                                                Actions ({enq.referenceId || `ENQ-${enq.id}`})
                                                            </div>

                                                            <Link
                                                                to="/enquiries"
                                                                onClick={() => setActiveActionMenuId(null)}
                                                                className="flex items-center w-full px-3 py-2 text-xs font-semibold text-text-primary hover:bg-bg-hover rounded-xl transition-colors"
                                                            >
                                                                <Eye className="w-3.5 h-3.5 mr-2 text-[#4F46E5]" />
                                                                View in Enquiries
                                                            </Link>

                                                            <Link
                                                                to={`/quotations/new/${enq.id}`}
                                                                onClick={() => setActiveActionMenuId(null)}
                                                                className="flex items-center w-full px-3 py-2 text-xs font-semibold text-text-primary hover:bg-bg-hover rounded-xl transition-colors"
                                                            >
                                                                <Plus className="w-3.5 h-3.5 mr-2 text-[#059669]" />
                                                                Create Quotation
                                                            </Link>

                                                            <div className="my-1 border-t border-border-subtle"></div>

                                                            <div className="px-3 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">
                                                                Update Status
                                                            </div>

                                                            {['NEW', 'CONTACTED', 'QUOTED', 'CONVERTED', 'CLOSED'].map((st) => (
                                                                <button
                                                                    key={st}
                                                                    type="button"
                                                                    onClick={() => handleUpdateEnquiryStatus(enq.id, st)}
                                                                    className={`flex items-center justify-between w-full px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                                                        normalizeStatus(enq.status) === st
                                                                            ? 'bg-[#EEF2FF] text-[#4F46E5] font-bold dark:bg-[#312E81]/30'
                                                                            : 'text-text-secondary hover:bg-bg-hover font-medium'
                                                                    }`}
                                                                >
                                                                    <span className="flex items-center">
                                                                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${getStatusStyle(st).replace('text-', 'bg-')}`} />
                                                                        {getStatusLabel(st)}
                                                                    </span>
                                                                    {normalizeStatus(enq.status) === st && (
                                                                        <Check className="w-3.5 h-3.5 text-[#4F46E5]" />
                                                                    )}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
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
            
        </div>
    );
}
