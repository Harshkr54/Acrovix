import React, { useEffect, useState, useRef, useCallback } from 'react';
import { fetchApi, getDashboardReceivables, getUpcomingFollowUps } from '../services/api';
import { FileText, Inbox, Activity, CheckCircle, Clock, ChevronRight, Filter, Plus, MoreHorizontal, MessageSquare, User, AlertCircle, RefreshCw, Loader2, X, RotateCcw, Eye, Check, CreditCard, DollarSign, TrendingUp, AlertTriangle, Download, PieChart, Users, PhoneCall } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import CreateQuotationModal from '../components/CreateQuotationModal';
import EnquiryDetailModal from '../components/EnquiryDetailModal';
import ActionMenu from '../components/ActionMenu';
import CardSparkline from '../components/ui/CardSparkline';

const DEFAULT_FILTERS = {
    dateRange: 'ALL_TIME',
    enquiryStatus: 'ALL',
    quotationStatus: 'ALL',
    fromDate: '',
    toDate: ''
};

const getChartTrendLabel = (dateRange) => {
    switch (dateRange) {
        case 'TODAY': return 'Today Trend';
        case 'LAST_7_DAYS': return 'Last 7 Days Trend';
        case 'LAST_30_DAYS': return 'Last 30 Days Trend';
        case 'THIS_MONTH': return 'This Month Trend';
        case 'THIS_YEAR': return 'This Year Trend';
        case 'CUSTOM': return 'Custom Date Trend';
        case 'ALL_TIME':
        default: return 'All Time Trend';
    }
};

export default function Dashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [receivablesStats, setReceivablesStats] = useState(null);
    const [upcomingFollowUps, setUpcomingFollowUps] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFollowUpsLoading, setIsFollowUpsLoading] = useState(true);
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
        setIsFollowUpsLoading(true);

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
            
            try {
                const followData = await getUpcomingFollowUps({ size: 5 });
                setUpcomingFollowUps(followData?.content || followData || []);
            } catch (fErr) {
                console.error("Failed to fetch upcoming follow-ups", fErr);
            } finally {
                setIsFollowUpsLoading(false);
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

    const maxEnquiryCount = Math.max(
        1,
        ...(stats?.monthlyOverview?.map(m => Math.max(m.totalEnquiries || 0, m.newEnquiries || 0)) || [1])
    );

    const userName = user?.firstName || (user?.name ? user.name.split(' ')[0] : 'there');

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'Good Morning';
        if (hour >= 12 && hour < 17) return 'Good Afternoon';
        if (hour >= 17 && hour < 21) return 'Good Evening';
        return 'Good Night';
    };

    const [greeting, setGreeting] = useState(getGreeting());

    useEffect(() => {
        const timer = setInterval(() => {
            setGreeting(getGreeting());
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
            
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
                <div className="flex flex-col">
                    <p className="text-[12px] font-bold text-[var(--color-brand-primary)] uppercase tracking-[1.5px] mb-1.5">Dashboard</p>
                    <h1 className="text-[28px] font-bold text-text-primary tracking-tight leading-none mb-1.5">
                        {greeting}, {userName} 👋
                    </h1>
                    <p className="text-[13px] text-text-secondary font-medium">Here's what's happening today.</p>
                </div>

                <div className="flex items-center gap-3 relative" ref={filterRef}>
                    <button onClick={() => setIsCreateModalOpen(true)} className="btn btn-primary btn-md whitespace-nowrap shadow-sm">
                        <Plus className="w-4 h-4 mr-1.5" />
                        Create Quotation
                    </button>

                    <button 
                        onClick={handleOpenFilter}
                        aria-label="Toggle filters popover"
                        className={`flex items-center justify-center w-[42px] h-[42px] rounded-xl border transition-all relative ${
                            isFilterOpen || hasActiveFilters
                                ? 'bg-brand-primary/10 border-[#818CF8] text-[var(--color-brand-primary)] dark:bg-[#312E81]/30 dark:border-[#6366F1] dark:text-[#818CF8] shadow-sm'
                                : 'bg-bg-card border-border-subtle text-text-secondary hover:text-text-primary hover:shadow-sm'
                        }`}
                    >
                        <Filter className="w-4 h-4" />
                        {hasActiveFilters && (
                            <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-brand-primary)] absolute top-1 right-1 ring-2 ring-bg-card" />
                        )}
                    </button>

                    {/* Filter Popover */}
                    {isFilterOpen && (
                        <div className="absolute right-0 top-[52px] w-80 sm:w-96 bg-bg-card rounded-2xl shadow-xl border border-border-subtle p-5 z-50 animate-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between pb-3 border-b border-border-subtle mb-4">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-[var(--color-brand-primary)]" />
                                    <h3 className="text-sm font-bold text-text-primary">Dashboard Filters</h3>
                                </div>
                                <button onClick={() => setIsFilterOpen(false)} className="btn btn-primary btn-icon btn-sm">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleApplyFilters} className="space-y-4">
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

                                <div className="flex items-center justify-between pt-3 border-t border-border-subtle gap-3">
                                    <button
                                        type="button"
                                        onClick={handleResetFilters}
                                        className="btn btn-secondary btn-sm"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        Reset
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={draftFilters.dateRange === 'CUSTOM' && Boolean(draftFilters.fromDate && draftFilters.toDate && draftFilters.fromDate > draftFilters.toDate)}
                                        className="btn btn-primary btn-md"
                                    >
                                        Apply Filters
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <button onClick={() => setIsCreateModalOpen(true)} className="btn bg-[var(--color-brand-primary)] text-white hover:opacity-90 btn-md h-[42px] px-5 font-bold shadow-sm rounded-xl flex items-center transition-opacity">
                        <Plus className="w-4 h-4 mr-1.5" />
                        Create Quotation
                    </button>
                    <CreateQuotationModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
                </div>
            </div>

            {error ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] bg-bg-card rounded-[24px] border border-border-subtle text-center px-4 shadow-sm">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-bold text-text-primary mb-2">Failed to Load Dashboard</h3>
                    <p className="text-sm text-text-secondary mb-6">{error}</p>
                    <button onClick={() => fetchDashboardData(appliedFilters)} className="btn btn-primary btn-md">
                        <RefreshCw className="w-4 h-4" />
                        Retry
                    </button>
                </div>
            ) : (
                <>
                    {/* Top KPI Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        
                        {/* 1. Total Enquiries */}
                        <div className="bg-[var(--theme-dashboard-card)] rounded-[20px] p-4 flex flex-col justify-between border border-[var(--theme-dashboard-border)] shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300 h-[120px]">
                            <div className="flex items-center gap-3 relative z-10">
                                <div className="w-8 h-8 bg-blue-50 dark:bg-blue-500/10 rounded-[10px] flex items-center justify-center shrink-0">
                                    <Inbox className="w-4 h-4 text-blue-600 dark:text-blue-500" />
                                </div>
                                <span className="text-[13px] font-semibold text-text-primary tracking-tight">Total Enquiries</span>
                            </div>
                            <div className="relative z-10 mt-2">
                                <div className="text-[28px] font-bold text-text-primary tracking-tight leading-none mb-1 flex items-center">
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> : (stats?.totalEnquiries ?? 0)}
                                </div>
                                <div className="text-[11px] font-medium text-text-muted">
                                    Filtered count
                                </div>
                            </div>
                            <CardSparkline data={stats?.monthlyOverview?.map(m => m.totalEnquiries)} color="#2563EB" />
                        </div>

                        {/* 2. Total Quotations */}
                        <div className="bg-[var(--theme-dashboard-card)] rounded-[20px] p-4 flex flex-col justify-between border border-[var(--theme-dashboard-border)] shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300 h-[120px]">
                            <div className="flex items-center gap-3 relative z-10">
                                <div className="w-8 h-8 bg-purple-50 dark:bg-purple-500/10 rounded-[10px] flex items-center justify-center shrink-0">
                                    <FileText className="w-4 h-4 text-purple-600 dark:text-purple-500" />
                                </div>
                                <span className="text-[13px] font-semibold text-text-primary tracking-tight">Total Quotations</span>
                            </div>
                            <div className="relative z-10 mt-2">
                                <div className="text-[28px] font-bold text-text-primary tracking-tight leading-none mb-1 flex items-center">
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-purple-600" /> : (stats?.totalQuotations ?? 0)}
                                </div>
                                <div className="text-[11px] font-medium text-text-muted">
                                    Excludes Trash
                                </div>
                            </div>
                            <CardSparkline isDecorative color="#9333EA" />
                        </div>

                        {/* 3. Accepted Quotations */}
                        <div className="bg-[var(--theme-dashboard-card)] rounded-[20px] p-4 flex flex-col justify-between border border-[var(--theme-dashboard-border)] shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300 h-[120px]">
                            <div className="flex items-center gap-3 relative z-10">
                                <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-500/10 rounded-[10px] flex items-center justify-center shrink-0">
                                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                                </div>
                                <span className="text-[13px] font-semibold text-text-primary tracking-tight">Accepted Quotations</span>
                            </div>
                            <div className="relative z-10 mt-2">
                                <div className="text-[28px] font-bold text-text-primary tracking-tight leading-none mb-1 flex items-center">
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-emerald-600" /> : (stats?.acceptedQuotations ?? 0)}
                                </div>
                                <div className="text-[11px] font-medium text-text-muted">
                                    Excludes Trash
                                </div>
                            </div>
                            <CardSparkline isDecorative color="#059669" />
                        </div>

                        {/* 4. Total Invoiced */}
                        <div className="bg-[var(--theme-dashboard-card)] rounded-[20px] p-4 flex flex-col justify-between border border-[var(--theme-dashboard-border)] shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300 h-[120px]">
                            <div className="flex items-center gap-3 relative z-10">
                                <div className="w-8 h-8 bg-blue-50 dark:bg-blue-500/10 rounded-[10px] flex items-center justify-center shrink-0">
                                    <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-500" />
                                </div>
                                <span className="text-[13px] font-semibold text-text-primary tracking-tight">Total Invoiced</span>
                            </div>
                            <div className="relative z-10 mt-2">
                                <div className="text-[28px] font-bold text-text-primary tracking-tight leading-none mb-1 flex items-center">
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> : (
                                        <span className="truncate">Rs. {Number(receivablesStats?.totalInvoiced || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    )}
                                </div>
                                <div className="text-[11px] font-medium text-text-muted">
                                    Total Issued Tax Invoices
                                </div>
                            </div>
                            <CardSparkline isDecorative color="#2563EB" />
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        
                        {/* Left Column (8/12 width) */}
                        <div className="lg:col-span-8 flex flex-col gap-6">
                            
                            {/* Analytics Chart */}
                            <div className="bg-[var(--theme-dashboard-card)] rounded-[20px] border border-[var(--theme-dashboard-border)] p-6 flex flex-col shadow-sm h-[380px]">
                                {/* Header */}
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100/50 dark:bg-blue-500/10 dark:border-blue-500/20">
                                            <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-[20px] font-bold text-text-primary tracking-tight">Enquiries &amp; Quotations Trend</h2>
                                            <p className="text-[14px] text-text-secondary mt-0.5">Track enquiries and quotations performance over time</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border-subtle bg-bg-main shadow-sm text-[13px] font-semibold text-text-secondary cursor-pointer hover:bg-bg-hover transition-colors">
                                        <Clock className="w-4 h-4 text-text-muted" />
                                        {getChartTrendLabel(appliedFilters.dateRange)}
                                    </div>
                                </div>

                                {/* Dynamic Chart Area */}
                                <div className="flex-1 min-h-[260px] flex flex-col relative w-full overflow-x-auto overflow-y-hidden hide-scrollbar">
                                    <div className="min-w-[600px] h-full flex flex-col relative">
                                        
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
                                                const maxVal = Math.max(0, ...overviewData.map(i => Math.max(Number(i.totalEnquiries) || 0, Number(i.newEnquiries) || 0)));
                                                const niceMax = getNiceMax(maxVal);
                                                
                                                let rawTicks;
                                                if (niceMax <= 5) {
                                                    rawTicks = Array.from({length: niceMax + 1}, (_, i) => i).reverse();
                                                } else {
                                                    rawTicks = [1, 0.75, 0.5, 0.25, 0].map(m => Math.round(niceMax * m));
                                                }
                                                const ticks = Array.from(new Set(rawTicks));

                                                return (
                                                    <div className="flex-1 relative flex mt-4">
                                                        {/* Y Axis & Horizontal Grids */}
                                                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                                            {ticks.map((t, i) => (
                                                                <div key={i} className="w-full flex items-center -mt-2">
                                                                    <div className="w-[30px] shrink-0 text-left text-[12px] font-medium text-text-muted">{t}</div>
                                                                    <div className="flex-1 border-t border-dashed border-border-subtle" />
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Chart Content Area */}
                                                        <div className="flex-1 relative ml-[40px]">
                                                            {/* SVG Lines and Fades */}
                                                            <div className="absolute inset-0 pointer-events-none">
                                                                <svg viewBox={`0 0 ${overviewData.length * 100} 100`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
                                                                    <defs>
                                                                        <linearGradient id="fadeBlue" x1="0" y1="0" x2="0" y2="1">
                                                                            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                                                                            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                                                                        </linearGradient>
                                                                        <linearGradient id="fadeTeal" x1="0" y1="0" x2="0" y2="1">
                                                                            <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.3" />
                                                                            <stop offset="100%" stopColor="#14B8A6" stopOpacity="0" />
                                                                        </linearGradient>
                                                                    </defs>
                                                                    {(() => {
                                                                        const w = overviewData.length * 100;
                                                                        const step = w / Math.max(1, (overviewData.length - 1));
                                                                        const getPath = (key) => {
                                                                            if (overviewData.length === 1) {
                                                                                const y = 90 - (Math.max(1, (overviewData[0][key] / niceMax) * 80));
                                                                                return `M 0,${y} L ${w},${y}`;
                                                                            }
                                                                            const pts = overviewData.map((d, i) => ({ x: i * step, y: 90 - (Math.max(1, (d[key] / niceMax) * 80)) }));
                                                                            let p = `M ${pts[0].x},${pts[0].y}`;
                                                                            for (let i = 1; i < pts.length; i++) {
                                                                                p += ` C ${pts[i-1].x + step/3},${pts[i-1].y} ${pts[i].x - step/3},${pts[i].y} ${pts[i].x},${pts[i].y}`;
                                                                            }
                                                                            return p;
                                                                        };
                                                                        const bluePath = getPath('totalEnquiries');
                                                                        const tealPath = getPath('newEnquiries');
                                                                        const blueFill = `${bluePath} L ${w},100 L 0,100 Z`;
                                                                        const tealFill = `${tealPath} L ${w},100 L 0,100 Z`;
                                                                        return (
                                                                            <>
                                                                                <path d={blueFill} fill="url(#fadeBlue)" />
                                                                                <path d={tealFill} fill="url(#fadeTeal)" />
                                                                                <path d={bluePath} fill="none" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
                                                                                <path d={tealPath} fill="none" stroke="#14B8A6" strokeWidth="3" strokeLinecap="round" />
                                                                                {overviewData.map((d, i) => (
                                                                                    <g key={i}>
                                                                                        <circle cx={i * step} cy={90 - (Math.max(1, (d.totalEnquiries / niceMax) * 80))} r="4" fill="#3B82F6" stroke="var(--theme-dashboard-card)" strokeWidth="2.5" />
                                                                                        <circle cx={i * step} cy={90 - (Math.max(1, (d.newEnquiries / niceMax) * 80))} r="4" fill="#14B8A6" stroke="var(--theme-dashboard-card)" strokeWidth="2.5" />
                                                                                    </g>
                                                                                ))}
                                                                            </>
                                                                        );
                                                                    })()}
                                                                </svg>
                                                            </div>

                                                            {/* Interactive Columns for Tooltips */}
                                                            <div className="absolute inset-0 flex">
                                                                {overviewData.map((item, idx) => {
                                                                    const totalHeightPct = Math.max(1, (item.totalEnquiries / niceMax) * 100);
                                                                    const newHeightPct = Math.max(1, (item.newEnquiries / niceMax) * 100);
                                                                    const maxHeightPct = Math.max(totalHeightPct, newHeightPct);
                                                                    const isHigh = maxHeightPct > 70;
                                                                    
                                                                    const tooltipStyle = {
                                                                        ...(isHigh ? { top: '10px' } : { bottom: `calc(${maxHeightPct}% + 12px)` })
                                                                    };
                                                                    
                                                                    if (idx === 0) {
                                                                        tooltipStyle.left = '0';
                                                                        tooltipStyle.transform = 'none';
                                                                    } else if (idx === overviewData.length - 1) {
                                                                        tooltipStyle.right = '0';
                                                                        tooltipStyle.transform = 'none';
                                                                    } else {
                                                                        tooltipStyle.left = '50%';
                                                                        tooltipStyle.transform = 'translateX(-50%)';
                                                                    }
                                                                    
                                                                    return (
                                                                        <div key={idx} className="flex-1 h-full relative group cursor-crosshair">
                                                                            {/* Vertical Hover Line */}
                                                                            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1px] bg-border-subtle opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                                            
                                                                            {/* Tooltip */}
                                                                            <div 
                                                                                className="opacity-0 group-hover:opacity-100 transition-opacity absolute bg-bg-card border border-border-subtle p-3 rounded-[12px] shadow-xl pointer-events-none w-[160px] z-[100]"
                                                                                style={tooltipStyle}
                                                                            >
                                                                                <div className="text-[13px] font-bold text-text-primary mb-2">{item.month}</div>
                                                                                <div className="flex justify-between items-center mb-1.5">
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <div className="w-2 h-2 rounded-full bg-[#14B8A6]"></div>
                                                                                        <span className="text-[11px] font-medium text-text-secondary">Total Quotations</span>
                                                                                    </div>
                                                                                    <span className="text-[12px] font-bold text-text-primary">{item.newEnquiries}</span>
                                                                                </div>
                                                                                <div className="flex justify-between items-center">
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <div className="w-2 h-2 rounded-full bg-[#3B82F6]"></div>
                                                                                        <span className="text-[11px] font-medium text-text-secondary">Total Enquiries</span>
                                                                                    </div>
                                                                                    <span className="text-[12px] font-bold text-text-primary">{item.totalEnquiries}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            
                                                            {/* X Axis Labels */}
                                                            <div className="absolute top-full left-0 right-0 flex pt-3 border-t border-border-subtle">
                                                                {overviewData.map((item, idx) => (
                                                                    <div key={idx} className="flex-1 text-center text-[12px] font-medium text-text-muted relative -left-1/2 transform translate-x-1/2">
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
                                <div className="flex items-center justify-center gap-8 mt-10">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded bg-[#3B82F6]"></div>
                                        <span className="text-[13px] font-medium text-text-secondary">Total Enquiries</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded bg-[#14B8A6]"></div>
                                        <span className="text-[13px] font-medium text-text-secondary">Total Quotations</span>
                                    </div>
                                </div>
                            </div>
                            {/* Empty space where duplicate sections were removed */}
                        </div>

                        {/* Right Column (4/12 width) */}
                        <div className="lg:col-span-4 flex flex-col gap-6">
                            
                            {/* Recent Activity Timeline */}
                            <div className="bg-[var(--theme-dashboard-card)] rounded-[20px] border border-[var(--theme-dashboard-border)] p-6 flex flex-col shadow-sm h-[380px]">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-[16px] font-bold text-text-primary tracking-tight">Recent Activity</h2>
                                    <Link to="/activity" className="text-[13px] font-semibold text-[var(--color-brand-primary)] hover:underline transition-opacity">
                                        View all &rarr;
                                    </Link>
                                </div>
                                <div className="flex-1 overflow-y-auto pr-2 hide-scrollbar relative">
                                    <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border-subtle"></div>
                                    {isLoading ? (
                                        <div className="flex justify-center items-center py-12">
                                            <Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand-primary)]" />
                                        </div>
                                    ) : stats?.recentActivities && stats.recentActivities.length > 0 ? (
                                        <div className="relative pl-3 space-y-6 before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-border-subtle/50">
                                            {stats.recentActivities.slice(0, 5).map((activity) => {
                                                let iconStyle = 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400';
                                                let Icon = MessageSquare;
                                                
                                                if (activity.entityType === 'QUOTATION') {
                                                    iconStyle = 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400';
                                                    Icon = FileText;
                                                } else if (activity.entityType === 'USER') {
                                                    iconStyle = 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400';
                                                    Icon = User;
                                                }

                                                const entityLabel = activity.entityType 
                                                    ? `${activity.entityType.toLowerCase()}${activity.entityId ? ` #${activity.entityId}` : ''}`
                                                    : (activity.entityId ? `#${activity.entityId}` : '');

                                                return (
                                                    <div key={activity.id} className="relative flex gap-4">
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${iconStyle} shadow-sm ring-4 ring-[var(--theme-dashboard-card)] -ml-[11px]`}>
                                                            <Icon className="w-3 h-3" />
                                                        </div>
                                                        <div className="flex-1 min-w-0 flex flex-col">
                                                            <p className="text-[13px] font-bold text-text-primary leading-snug">{activity.action}</p>
                                                            <div className="flex items-center justify-between mt-1">
                                                                <p className="text-[12px] text-text-muted truncate max-w-[150px]">{entityLabel}</p>
                                                                <span className="text-[11px] text-text-muted font-medium shrink-0">
                                                                    {activity.createdAt ? new Date(activity.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                                                                </span>
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
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Section (Financial & CRM) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Total Received */}
                        <div className="bg-[var(--theme-dashboard-card)] rounded-[20px] p-4 flex flex-col justify-between border border-[var(--theme-dashboard-border)] shadow-sm relative overflow-hidden h-[120px]">
                            <div className="flex items-center gap-3 relative z-10">
                                <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-500/10 rounded-[10px] flex items-center justify-center">
                                    <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <span className="text-[13px] font-semibold text-text-primary tracking-tight">Total Received</span>
                            </div>
                            <div className="relative z-10 mt-2">
                                <div className="text-[24px] font-bold text-text-primary tracking-tight leading-none mb-1 truncate">
                                    Rs. {Number(receivablesStats?.totalReceived || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                    Active Payment Ledger
                                </div>
                            </div>
                            <div className="absolute bottom-0 right-0 left-0 h-1 bg-emerald-500/20"></div>
                        </div>

                        {/* Outstanding Balance */}
                        <div className="bg-[var(--theme-dashboard-card)] rounded-[20px] p-4 flex flex-col justify-between border border-[var(--theme-dashboard-border)] shadow-sm relative overflow-hidden h-[120px]">
                            <div className="flex items-center gap-3 relative z-10">
                                <div className="w-8 h-8 bg-orange-50 dark:bg-orange-500/10 rounded-[10px] flex items-center justify-center">
                                    <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                </div>
                                <span className="text-[13px] font-semibold text-text-primary tracking-tight">Outstanding</span>
                            </div>
                            <div className="relative z-10 mt-2">
                                <div className="text-[24px] font-bold text-text-primary tracking-tight leading-none mb-1 truncate">
                                    Rs. {Number(receivablesStats?.outstandingAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className="text-[11px] font-medium text-orange-600 dark:text-orange-400">
                                    Pending Receivables
                                </div>
                            </div>
                            <div className="absolute bottom-0 right-0 left-0 h-1 bg-orange-500/20"></div>
                        </div>

                        {/* Overdue Balance */}
                        <div className="bg-[var(--theme-dashboard-card)] rounded-[20px] p-4 flex flex-col justify-between border border-[var(--theme-dashboard-border)] shadow-sm relative overflow-hidden h-[120px]">
                            <div className="flex items-center gap-3 relative z-10">
                                <div className="w-8 h-8 bg-red-50 dark:bg-red-500/10 rounded-[10px] flex items-center justify-center">
                                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                </div>
                                <span className="text-[13px] font-semibold text-text-primary tracking-tight">Overdue Balance</span>
                            </div>
                            <div className="relative z-10 mt-2">
                                <div className="text-[24px] font-bold text-text-primary tracking-tight leading-none mb-1 truncate">
                                    Rs. {Number(receivablesStats?.overdueAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className="text-[11px] font-medium text-red-600 dark:text-red-400">
                                    Past Due Date
                                </div>
                            </div>
                            <div className="absolute bottom-0 right-0 left-0 h-1 bg-red-500/20"></div>
                        </div>

                        {/* Upcoming Follow-ups */}
                        <div className="bg-[var(--theme-dashboard-card)] rounded-[20px] border border-[var(--theme-dashboard-border)] p-4 flex flex-col shadow-sm h-[120px] overflow-y-auto hide-scrollbar">
                            <div className="flex items-center justify-between mb-3 shrink-0">
                                <h2 className="text-[13px] font-semibold text-text-primary tracking-tight">Upcoming Follow-ups</h2>
                                <Link to="/crm/leads" className="text-[11px] font-medium text-[var(--color-brand-primary)] hover:underline transition-opacity">
                                    CRM &rarr;
                                </Link>
                            </div>
                            
                            <div className="flex flex-col gap-2 relative">
                                {isFollowUpsLoading ? (
                                    <div className="flex justify-center items-center py-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-[var(--color-brand-primary)]" />
                                    </div>
                                ) : upcomingFollowUps && upcomingFollowUps.length > 0 ? (
                                    upcomingFollowUps.map(followUp => (
                                        <div key={followUp.id} className="flex items-start gap-2 p-2 rounded-lg border border-border-subtle bg-bg-main hover:bg-bg-hover transition-colors">
                                            <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 bg-orange-50 dark:bg-orange-500/10">
                                                <PhoneCall className="w-3 h-3 text-orange-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-bold text-text-primary truncate">{followUp.lead?.companyName || followUp.lead?.contactName || 'Lead'}</span>
                                                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-orange-100/50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 whitespace-nowrap">
                                                        {new Date(followUp.followUpDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-text-secondary truncate mt-0.5">{followUp.notes || followUp.type}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-text-secondary py-3 border border-dashed border-border-subtle rounded-lg">
                                        <CheckCircle className="w-5 h-5 mb-1.5 text-emerald-500/50" />
                                        <p className="text-[11px] font-semibold text-text-primary">No upcoming follow-ups</p>
                                        <p className="text-[9px] text-text-muted mt-0.5">You're all caught up!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Recent Enquiries removed from dashboard rendering per visual design request */}
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
