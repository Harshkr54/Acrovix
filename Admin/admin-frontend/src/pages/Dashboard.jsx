import React, { useEffect, useState, useRef, useCallback } from 'react';
import { fetchApi, getDashboardReceivables, getUpcomingFollowUps } from '../services/api';
import { FileText, Inbox, Activity, CheckCircle, Clock, ChevronRight, Filter, Plus, MoreHorizontal, MessageSquare, User, AlertCircle, RefreshCw, Loader2, X, RotateCcw, Eye, Check, CreditCard, DollarSign, TrendingUp, TrendingDown, AlertTriangle, Download, PieChart, Users, PhoneCall } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import CreateQuotationModal from '../components/CreateQuotationModal';
import EnquiryDetailModal from '../components/EnquiryDetailModal';
import ActionMenu from '../components/ActionMenu';
import CardSparkline from '../components/ui/CardSparkline';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { useCountUp } from '../hooks/useCountUp';

function AnimatedNumber({ value, formatter }) {
    const count = useCountUp(value, 600);
    return formatter ? formatter(count) : Math.round(count);
}

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
        if (hour < 12) return 'Good Morning';
        if (hour <= 16) return 'Good Afternoon';
        return 'Good Evening';
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
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
                <div className="flex flex-col">
                    <p className="text-[12px] font-bold text-[var(--color-brand-primary)] uppercase tracking-[2px] mb-2">Dashboard</p>
                    <h1 className="text-[32px] font-bold text-text-primary tracking-tight leading-none mb-2">
                        {greeting}, {userName} 👋
                    </h1>
                    <p className="text-[14px] text-text-secondary font-medium">Here's what's happening today.</p>
                </div>

                <div className="flex items-center gap-3 relative" ref={filterRef}>
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
                        <div className="absolute right-0 top-[52px] w-80 sm:w-96 bg-bg-card rounded-2xl shadow-xl border border-border-subtle p-5 z-50 animate-dropdown-entrance">
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

                    <button onClick={() => setIsCreateModalOpen(true)} className="btn btn-primary btn-md h-[42px] px-5 font-bold shadow-sm">
                        <Plus className="w-4 h-4 mr-1" />
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
                        <div className="acx-card p-5 flex flex-col justify-between relative overflow-hidden group min-h-[140px] animate-stagger-1">
                            <div className="flex items-center gap-3 mb-4 relative z-10">
                                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 rounded-[12px] flex items-center justify-center shrink-0">
                                    <Inbox className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                                </div>
                                <span className="text-[14px] font-semibold text-text-primary tracking-tight">Total Enquiries</span>
                            </div>
                            <div className="relative z-10 flex-1 flex flex-col justify-end">
                                <div className="text-[32px] font-bold text-text-primary tracking-tight leading-none mb-1 flex items-center">
                                    {isLoading ? <Skeleton variant="title" className="h-8 w-24 mb-1" /> : <AnimatedNumber value={stats?.totalEnquiries ?? 0} />}
                                </div>
                                {(() => {
                                    if (!stats?.monthlyOverview || stats.monthlyOverview.length < 2) return <div className="text-[12px] font-medium text-text-muted mt-2">Filtered count</div>;
                                    const prev = stats.monthlyOverview[stats.monthlyOverview.length - 2].totalEnquiries || 0;
                                    const curr = stats.monthlyOverview[stats.monthlyOverview.length - 1].totalEnquiries || 0;
                                    const pct = prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);
                                    const isUp = pct >= 0;
                                    return (
                                        <div className="flex items-center gap-1.5 mt-2">
                                            <span className={`flex items-center text-[11px] font-bold px-1.5 py-0.5 rounded-md ${isUp ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'}`}>
                                                {isUp ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                                                {isUp ? '+' : ''}{pct}%
                                            </span>
                                            <span className="text-[11px] font-medium text-text-muted">vs last month</span>
                                        </div>
                                    );
                                })()}
                            </div>
                            <div className="absolute bottom-4 right-4 w-[80px] h-[40px] opacity-60">
                                <CardSparkline data={stats?.monthlyOverview?.map(m => m.totalEnquiries)} color="#2563EB" />
                            </div>
                        </div>

                        {/* 2. Total Quotations */}
                        <div className="acx-card p-5 flex flex-col justify-between relative overflow-hidden group min-h-[140px] animate-stagger-2">
                            <div className="flex items-center gap-3 mb-4 relative z-10">
                                <div className="w-10 h-10 bg-purple-50 dark:bg-purple-500/10 rounded-[12px] flex items-center justify-center shrink-0">
                                    <FileText className="w-5 h-5 text-purple-600 dark:text-purple-500" />
                                </div>
                                <span className="text-[14px] font-semibold text-text-primary tracking-tight">Total Quotations</span>
                            </div>
                            <div className="relative z-10 flex-1 flex flex-col justify-end">
                                <div className="text-[32px] font-bold text-text-primary tracking-tight leading-none mb-1 flex items-center">
                                    {isLoading ? <Skeleton variant="title" className="h-8 w-24 mb-1" /> : <AnimatedNumber value={stats?.totalQuotations ?? 0} />}
                                </div>
                                <div className="text-[12px] font-medium text-text-muted mt-2">Excludes Trash</div>
                            </div>
                            <div className="absolute bottom-4 right-4 w-[80px] h-[40px] opacity-60">
                                <CardSparkline isDecorative color="#9333EA" />
                            </div>
                        </div>

                        {/* 3. Accepted Quotations */}
                        <div className="acx-card p-5 flex flex-col justify-between relative overflow-hidden group min-h-[140px] animate-stagger-3">
                            <div className="flex items-center gap-3 mb-4 relative z-10">
                                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 rounded-[12px] flex items-center justify-center shrink-0">
                                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                                </div>
                                <span className="text-[14px] font-semibold text-text-primary tracking-tight">Accepted Quotations</span>
                            </div>
                            <div className="relative z-10 flex-1 flex flex-col justify-end">
                                <div className="text-[32px] font-bold text-text-primary tracking-tight leading-none mb-1 flex items-center">
                                    {isLoading ? <Skeleton variant="title" className="h-8 w-24 mb-1" /> : <AnimatedNumber value={stats?.acceptedQuotations ?? 0} />}
                                </div>
                                <div className="text-[12px] font-medium text-text-muted mt-2">Excludes Trash</div>
                            </div>
                            <div className="absolute bottom-4 right-4 w-[80px] h-[40px] opacity-60">
                                <CardSparkline isDecorative color="#059669" />
                            </div>
                        </div>

                        {/* 4. Total Invoiced */}
                        <div className="acx-card p-5 flex flex-col justify-between relative overflow-hidden group min-h-[140px] animate-stagger-4">
                            <div className="flex items-center gap-3 mb-4 relative z-10">
                                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 rounded-[12px] flex items-center justify-center shrink-0">
                                    <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                                </div>
                                <span className="text-[14px] font-semibold text-text-primary tracking-tight">Total Invoiced</span>
                            </div>
                            <div className="relative z-10 flex-1 flex flex-col justify-end">
                                <div className="text-[26px] font-bold text-text-primary tracking-tight leading-none mb-1 flex items-center truncate">
                                    {isLoading ? <Skeleton variant="title" className="h-8 w-32 mb-1" /> : <>Rs. <AnimatedNumber value={receivablesStats?.totalInvoiced || 0} formatter={(v) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /></>}
                                </div>
                                <div className="text-[12px] font-medium text-text-muted mt-2">Total Issued Tax Invoices</div>
                            </div>
                            <div className="absolute bottom-4 right-4 w-[80px] h-[40px] opacity-60">
                                <CardSparkline isDecorative color="#3B82F6" />
                            </div>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        
                        {/* Left Column (8/12 width) */}
                        <div className="lg:col-span-8 flex flex-col gap-6">
                            
                            {/* Analytics Chart */}
                            <div className="acx-card p-6 flex flex-col h-full">
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
                                <div className="flex-1 min-h-[300px] flex flex-col relative w-full overflow-x-auto hide-scrollbar pb-8">
                                    <div className="min-w-[400px] lg:min-w-full h-full flex flex-col relative">
                                        
                                        {isLoading ? (
                                            <div className="w-full flex justify-center items-center h-full">
                                                <Skeleton variant="rectangle" className="w-full h-full rounded-xl" />
                                            </div>
                                        ) : stats?.monthlyOverview && stats.monthlyOverview.length > 0 ? (
                                            (() => {
                                                const overviewData = stats.monthlyOverview;
                                                const getNiceMax = (max) => {
                                                    if (max <= 10) return 10;
                                                    const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
                                                    return Math.ceil(max / magnitude) * magnitude;
                                                };
                                                const maxVal = Math.max(0, ...overviewData.map(i => Math.max(Number(i.totalEnquiries) || 0, Number(i.newEnquiries) || 0)));
                                                const niceMax = getNiceMax(maxVal);
                                                
                                                const rawTicks = [1, 0.75, 0.5, 0.25, 0].map(m => Math.round(niceMax * m));
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
                                                                        const step = 100;
                                                                        const getPath = (key) => {
                                                                            if (overviewData.length === 1) {
                                                                                const y = 100 - (Math.max(1, (overviewData[0][key] / niceMax) * 100));
                                                                                return `M 0,${y} L ${w},${y}`;
                                                                            }
                                                                            const pts = overviewData.map((d, i) => ({ x: (i + 0.5) * step, y: 100 - (Math.max(1, (d[key] / niceMax) * 100)) }));
                                                                            let p = `M ${pts[0].x},${pts[0].y}`;
                                                                            for (let i = 1; i < pts.length; i++) {
                                                                                p += ` C ${pts[i-1].x + step/3},${pts[i-1].y} ${pts[i].x - step/3},${pts[i].y} ${pts[i].x},${pts[i].y}`;
                                                                            }
                                                                            return { p, pts };
                                                                        };
                                                                        const blueData = getPath('totalEnquiries');
                                                                        const tealData = getPath('newEnquiries');
                                                                        const bluePath = blueData.p;
                                                                        const tealPath = tealData.p;
                                                                        const bluePts = blueData.pts;
                                                                        const tealPts = tealData.pts;
                                                                        const blueFill = overviewData.length === 1 ? bluePath : `${bluePath} L ${bluePts[bluePts.length-1].x},100 L ${bluePts[0].x},100 Z`;
                                                                        const tealFill = overviewData.length === 1 ? tealPath : `${tealPath} L ${tealPts[tealPts.length-1].x},100 L ${tealPts[0].x},100 Z`;
                                                                        return (
                                                                            <>
                                                                                <path d={blueFill} fill="url(#fadeBlue)" className="animate-fade-in-up" style={{ animationDelay: '200ms' }} />
                                                                                <path d={tealFill} fill="url(#fadeTeal)" className="animate-fade-in-up" style={{ animationDelay: '300ms' }} />
                                                                                <path d={bluePath} fill="none" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" pathLength="1" className="animate-draw-line" />
                                                                                <path d={tealPath} fill="none" stroke="#14B8A6" strokeWidth="3" strokeLinecap="round" pathLength="1" className="animate-draw-line" style={{ animationDelay: '100ms' }} />
                                                                                {overviewData.map((d, i) => (
                                                                                    <g key={i} className="animate-fade-in-up" style={{ animationDelay: `${(i * 50) + 400}ms` }}>
                                                                                        <circle cx={(i + 0.5) * step} cy={100 - (Math.max(1, (d.totalEnquiries / niceMax) * 100))} r="4" fill="#3B82F6" stroke="#fff" strokeWidth="2" />
                                                                                        <circle cx={(i + 0.5) * step} cy={100 - (Math.max(1, (d.newEnquiries / niceMax) * 100))} r="4" fill="#14B8A6" stroke="#fff" strokeWidth="2" />
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
                                                                                className="opacity-0 group-hover:opacity-100 transition-opacity absolute acx-card p-3 pointer-events-none w-[160px] z-[100]"
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
                                            <div className="w-full h-full flex items-center justify-center">
                                                <EmptyState 
                                                    icon={PieChart}
                                                    emptyMessage="No trend data available for this period." 
                                                    isFiltered={hasActiveFilters}
                                                    actionLabel="Clear Filters"
                                                    onAction={handleResetFilters}
                                                />
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



                        </div>

                        {/* Right Column (4/12 width) */}
                        <div className="lg:col-span-4 flex flex-col gap-6">
                            
                            {/* Recent Activity Timeline */}
                            <div className="acx-card p-6 flex flex-col h-full">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-[18px] font-bold text-text-primary tracking-tight">Recent Activity</h2>
                                    <Link to="/activity" className="text-[13px] font-semibold text-brand-primary hover:underline transition-opacity">
                                        View all &rarr;
                                    </Link>
                                </div>
                                <div className="flex-1 overflow-y-auto pr-2 hide-scrollbar relative min-h-[300px] max-h-[400px]">
                                    {isLoading ? (
                                        <div className="space-y-4 py-2">
                                            {[1, 2, 3, 4].map((n) => (
                                                <div key={n} className="flex items-start gap-4">
                                                    <Skeleton variant="rectangle" className="w-10 h-10 rounded-xl shrink-0" />
                                                    <div className="flex-1 space-y-2">
                                                        <Skeleton variant="rectangle" className="w-full h-4 rounded-md" />
                                                        <Skeleton variant="rectangle" className="w-1/2 h-3 rounded-md" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : stats?.recentActivities && stats.recentActivities.length > 0 ? (
                                        <div className="space-y-4">
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
                                                    <div key={activity.id} className="flex items-start gap-4">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconStyle}`}>
                                                            <Icon className="w-5 h-5" />
                                                        </div>
                                                        <div className="flex-1 min-w-0 flex flex-col">
                                                            <div className="flex justify-between items-start mb-0.5">
                                                                <p className="text-[13px] font-bold text-text-primary truncate">{activity.action}</p>
                                                                <span className="text-[11px] text-text-muted font-medium ml-2 shrink-0 pt-0.5">
                                                                    {activity.createdAt ? new Date(activity.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                                                                </span>
                                                            </div>
                                                            <p className="text-[12px] text-text-muted truncate">{entityLabel}</p>
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

                    {/* Bottom Area Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
                        
                        {/* Left Side (3 columns span) */}
                        <div className="lg:col-span-3 flex flex-col gap-6">
                            
                            {/* Quick Actions */}
                            <div className="acx-card p-6">
                        <h2 className="text-[18px] font-bold text-text-primary tracking-tight mb-5">Quick Actions</h2>
                        <div className="flex flex-wrap gap-4">
                            <Link to="/enquiries" className="btn btn-secondary btn-md">
                                <Inbox className="w-4 h-4 mr-1.5" />
                                Manage Enquiries
                            </Link>
                            <Link to="/reports" className="btn btn-secondary btn-md">
                                <PieChart className="w-4 h-4 mr-1.5" />
                                View Reports
                            </Link>
                            <Link to="/customers" className="btn btn-secondary btn-md">
                                <Users className="w-4 h-4 mr-1.5" />
                                Manage Customers
                            </Link>
                            <Link to="/reports" className="btn btn-secondary btn-md">
                                <Download className="w-4 h-4 mr-1.5" />
                                Export Data
                            </Link>
                            </div>
                        </div>

                            {/* Financial Cards Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                {/* Total Received */}
                        <div className="acx-card p-5 flex flex-col justify-between border-l-4 border-l-emerald-500 relative overflow-hidden h-[130px]">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center">
                                    <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <span className="text-[13px] font-semibold text-text-primary tracking-tight">Total Received</span>
                            </div>
                            <div>
                                <div className="text-[22px] font-bold text-text-primary tracking-tight leading-none mb-1 truncate">
                                    Rs. {Number(receivablesStats?.totalReceived || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className="text-[11px] font-medium text-text-muted">
                                    Active Payment Ledger
                                </div>
                            </div>
                        </div>

                        {/* Outstanding Balance */}
                        <div className="acx-card p-5 flex flex-col justify-between border-l-4 border-l-orange-500 relative overflow-hidden h-[130px]">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-orange-50 dark:bg-orange-500/10 rounded-xl flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                </div>
                                <span className="text-[13px] font-semibold text-text-primary tracking-tight">Outstanding</span>
                            </div>
                            <div>
                                <div className="text-[22px] font-bold text-text-primary tracking-tight leading-none mb-1 truncate">
                                    Rs. {Number(receivablesStats?.outstandingAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className="text-[11px] font-medium text-text-muted">
                                    Pending Receivables
                                </div>
                            </div>
                        </div>

                        {/* Overdue Balance */}
                        <div className="acx-card p-5 flex flex-col justify-between border-l-4 border-l-red-500 relative overflow-hidden h-[130px]">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-red-50 dark:bg-red-500/10 rounded-xl flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                </div>
                                <span className="text-[13px] font-semibold text-text-primary tracking-tight">Overdue Balance</span>
                            </div>
                            <div>
                                <div className="text-[22px] font-bold text-text-primary tracking-tight leading-none mb-1 truncate">
                                    Rs. {Number(receivablesStats?.overdueAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className="text-[11px] font-medium text-text-muted">
                                    Past Due Date
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side (1 column span) */}
                <div className="lg:col-span-1">
                    {/* Upcoming Follow-ups */}
                    <div className="acx-card p-5 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-4">
                                <h2 className="text-[13px] font-semibold text-text-primary tracking-tight">Upcoming Follow-ups</h2>
                                <Link to="/crm/leads" className="text-[12px] font-medium text-[var(--color-brand-primary)] hover:underline transition-opacity">
                                    CRM &rarr;
                                </Link>
                                </div>
                                
                                <div className="flex flex-col gap-4">
                                    {isFollowUpsLoading ? (
                                        <div className="flex justify-center items-center py-6">
                                            <Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand-primary)]" />
                                        </div>
                                    ) : upcomingFollowUps && upcomingFollowUps.length > 0 ? (
                                        upcomingFollowUps.map(followUp => (
                                            <div key={followUp.id} className="flex items-start gap-3 p-3 rounded-xl border border-border-subtle bg-bg-main hover:bg-bg-hover transition-colors">
                                                <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                                    <PhoneCall className="w-4 h-4 text-orange-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[13px] font-bold text-text-primary truncate">{followUp.lead?.companyName || followUp.lead?.contactName || 'Lead Follow-up'}</span>
                                                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-100/50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 whitespace-nowrap">
                                                            {new Date(followUp.followUpDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-[12px] text-text-secondary truncate">{followUp.notes || followUp.type}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-text-secondary py-8 border border-dashed border-border-subtle rounded-xl">
                                            <CheckCircle className="w-8 h-8 mb-2 text-emerald-500/50" />
                                            <p className="text-[13px] font-semibold text-text-primary">No upcoming follow-ups</p>
                                            <p className="text-[11px] text-text-muted mt-1">You're all caught up!</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>



                    {/* Recent Enquiries Table (Kept at bottom to preserve exact existing functionality) */}
                    <div className="bg-bg-card rounded-[24px] border border-border-subtle shadow-sm flex flex-col overflow-hidden mt-2">
                        <div className="px-6 py-5 flex items-center justify-between border-b border-border-subtle">
                            <h2 className="text-[18px] font-bold text-text-primary tracking-tight">Recent Enquiries</h2>
                            <Link to="/enquiries" className="text-[13px] font-semibold text-[var(--color-brand-primary)] hover:opacity-80 transition-opacity flex items-center">
                                View all <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            {isLoading ? (
                                <div className="flex justify-center items-center py-12">
                                    <Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand-primary)]" />
                                </div>
                            ) : stats?.recentEnquiries && stats.recentEnquiries.length > 0 ? (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-main">#</th>
                                            <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-main">Client</th>
                                            <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-main">Company</th>
                                            <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-main">Service</th>
                                            <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-main">Status</th>
                                            <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-main">Date</th>
                                            <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-main text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-subtle">
                                        {stats.recentEnquiries.map((enq) => (
                                            <tr 
                                                key={enq.id} 
                                                onDoubleClick={() => handleOpenEnquiry(enq)}
                                                className="hover:bg-bg-hover transition-colors cursor-pointer"
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap text-[13px] font-bold text-text-primary">
                                                    {enq.referenceId || `ACX-ENQ-${enq.id}`}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-[13px] font-medium text-text-secondary">
                                                    {enq.fullName}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-[13px] text-text-secondary">
                                                    {enq.companyName || '—'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-[13px] text-text-secondary">
                                                    {enq.serviceRequired || '—'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                    <span className={`inline-flex items-center text-[11px] font-bold tracking-wider ${getStatusStyle(enq.status)}`}>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5"></span>
                                                        {getStatusLabel(enq.status)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-[12px] text-text-muted font-medium">
                                                    {new Date(enq.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center relative" onClick={(e) => e.stopPropagation()}>
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
                                                                <div className="px-3 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Open</div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { close(); handleOpenEnquiry(enq); }}
                                                                    className="btn btn-primary btn-sm w-full"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5 text-[var(--color-brand-primary)]" /> Open Enquiry
                                                                </button>

                                                                <div className="my-1 border-t border-border-subtle"></div>
                                                                <div className="px-3 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Quotation</div>
                                                                <Link to={`/quotations/new/${enq.id}`} onClick={close} className="flex items-center w-full px-3 py-2 text-xs font-semibold text-text-primary hover:bg-bg-hover rounded-xl transition-colors">
                                                                    <Plus className="w-3.5 h-3.5 text-brand-success mr-2" /> Create Quotation
                                                                </Link>
                                                                {rowQuotationsMap[enq.id] && rowQuotationsMap[enq.id].length > 0 && (
                                                                    rowQuotationsMap[enq.id].length === 1 ? (
                                                                        <Link to={`/quotations/edit/${rowQuotationsMap[enq.id][0].id}`} onClick={close} className="flex items-center w-full px-3 py-2 text-xs font-semibold text-text-primary hover:bg-bg-hover rounded-xl transition-colors">
                                                                            <FileText className="w-3.5 h-3.5 text-purple-600 mr-2" /> Open Quotation
                                                                        </Link>
                                                                    ) : (
                                                                        <button type="button" onClick={() => { close(); handleOpenEnquiry(enq); }} className="btn btn-primary btn-sm w-full flex justify-between">
                                                                            <span className="flex items-center"><FileText className="w-3.5 h-3.5 text-purple-600 mr-2" /> Open Quotation</span>
                                                                            <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full font-bold">{rowQuotationsMap[enq.id].length}</span>
                                                                        </button>
                                                                    )
                                                                )}

                                                                <div className="my-1 border-t border-border-subtle"></div>
                                                                <div className="px-3 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Update Status</div>
                                                                {['NEW', 'CONTACTED', 'QUOTED', 'CONVERTED', 'CLOSED'].map((st) => (
                                                                    <button
                                                                        key={st}
                                                                        type="button"
                                                                        onClick={() => { close(); handleUpdateEnquiryStatus(enq.id, st); }}
                                                                        className={`flex items-center justify-between w-full px-3 py-1.5 text-xs rounded-lg transition-colors ${normalizeStatus(enq.status) === st ? 'bg-brand-primary/10 text-[var(--color-brand-primary)] font-bold dark:bg-[#312E81]/30' : 'text-text-secondary hover:bg-bg-hover font-medium'}`}
                                                                    >
                                                                        <span className="flex items-center">
                                                                            <span className={`w-1.5 h-1.5 rounded-full mr-2 ${getStatusStyle(st).replace('text-', 'bg-')}`} />
                                                                            {getStatusLabel(st)}
                                                                        </span>
                                                                        {normalizeStatus(enq.status) === st && <Check className="w-3.5 h-3.5 text-[var(--color-brand-primary)]" />}
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
                                <div className="px-6 py-16 flex flex-col items-center justify-center">
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
