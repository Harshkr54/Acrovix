import React, { useEffect, useState, useRef, useCallback } from 'react';
import { fetchApi, getDashboardReceivables } from '../services/api';
import { 
    FileText, Inbox, Activity, CheckCircle, Clock, ChevronRight, Filter, Plus, 
    MoreHorizontal, MessageSquare, User, AlertCircle, RefreshCw, Loader2, X, 
    RotateCcw, Eye, Check, CreditCard, DollarSign, TrendingUp, AlertTriangle,
    ChevronLeft, ArrowUpRight, Phone, Bell, ShieldCheck, ArrowRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import CreateQuotationModal from '../components/CreateQuotationModal';
import EnquiryDetailModal from '../components/EnquiryDetailModal';
import ActionMenu from '../components/ActionMenu';
import StatusBadge from '../components/ui/StatusBadge';

const DEFAULT_FILTERS = {
    dateRange: 'ALL_TIME',
    enquiryStatus: 'ALL',
    quotationStatus: 'ALL',
    fromDate: '',
    toDate: ''
};

export default function Dashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [receivablesStats, setReceivablesStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createDropdownOpen, setCreateDropdownOpen] = useState(false);
    const createDropdownRef = useRef(null);
    const navigate = useNavigate();

    // Filter states
    const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
    const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef(null);

    // Recent Enquiries action menu & modal state
    const [selectedEnquiry, setSelectedEnquiry] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [rowQuotationsMap, setRowQuotationsMap] = useState({});

    // Calendar state
    const [currentDate] = useState(new Date());

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

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
            if (createDropdownRef.current && !createDropdownRef.current.contains(event.target)) {
                setCreateDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleOpenFilter = () => {
        setDraftFilters(appliedFilters);
        setIsFilterOpen(!isFilterOpen);
    };

    const handleApplyFilters = (e) => {
        e.preventDefault();
        setAppliedFilters(draftFilters);
        setIsFilterOpen(false);
    };

    const handleResetFilters = () => {
        setDraftFilters(DEFAULT_FILTERS);
        setAppliedFilters(DEFAULT_FILTERS);
        setIsFilterOpen(false);
    };

    const handleOpenEnquiry = (enquiry) => {
        setSelectedEnquiry(enquiry);
        setIsDetailModalOpen(true);
    };

    const handleUpdateEnquiryStatus = async (enquiryId, newStatus) => {
        try {
            await fetchApi(`/enquiries/${enquiryId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus })
            });
            fetchDashboardData(appliedFilters);
        } catch (err) {
            console.error("Failed to update status", err);
        }
    };

    // Greeting logic based on current hour
    const getGreeting = () => {
        const hour = currentDate.getHours();
        if (hour < 12) return 'Good Morning,';
        if (hour < 17) return 'Good Afternoon,';
        return 'Good Evening,';
    };

    // Render Calendar
    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const today = currentDate.getDate();

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = [];
        // Padding for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }
        for (let d = 1; d <= daysInMonth; d++) {
            days.push(d);
        }

        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        return (
            <div className="card p-5 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1">
                        <ChevronLeft className="w-4 h-4 text-text-muted cursor-pointer hover:text-text-primary" />
                        <h3 className="text-sm font-bold text-text-primary">{monthNames[month]} {year}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                        <button className="w-6 h-6 flex items-center justify-center rounded-lg border border-border-subtle text-text-muted hover:text-text-primary hover:bg-bg-hover text-xs">‹</button>
                        <button className="w-6 h-6 flex items-center justify-center rounded-lg border border-border-subtle text-text-muted hover:text-text-primary hover:bg-bg-hover text-xs">›</button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-text-muted mb-2">
                    <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                    {days.map((d, i) => (
                        <div key={i} className="py-1 flex items-center justify-center">
                            {d ? (
                                <span className={`w-7 h-7 flex items-center justify-center rounded-full font-medium transition-all ${
                                    d === today 
                                        ? 'bg-[#0F8F95] text-white font-bold shadow-sm shadow-[#0F8F95]/30' 
                                        : 'text-text-secondary hover:bg-bg-hover'
                                }`}>
                                    {d}
                                </span>
                            ) : (
                                <span className="text-text-muted/20">•</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
            
            {/* ROW 1: Hero Greeting Banner + Calendar Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Hero Greeting Card (8 cols) */}
                <div className="lg:col-span-8 bg-[#E6F5F2] dark:bg-[#0D2A35] rounded-[24px] p-6 sm:p-8 relative overflow-hidden flex flex-col justify-between border border-[#0F8F95]/15 shadow-sm">
                    {/* Background Decorative Gradient Wave */}
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#0F8F95]/10 to-transparent pointer-events-none" />
                    
                    <div className="relative z-10 max-w-xl">
                        <p className="text-xs font-semibold text-[#0F8F95] dark:text-[#2DD4BF] uppercase tracking-wider mb-1">{getGreeting()}</p>
                        <h1 className="text-2xl sm:text-4xl font-extrabold text-[#0B1F33] dark:text-white tracking-tight mb-2">
                            {user?.name || 'Admin'}!
                        </h1>
                        <p className="text-sm text-[#475569] dark:text-[#94A3B8] font-medium mb-6">
                            Here's what's happening with your business today.
                        </p>

                        {/* Dropdown "+ Create New" Button */}
                        <div className="relative inline-block" ref={createDropdownRef}>
                            <button
                                onClick={() => setCreateDropdownOpen(!createDropdownOpen)}
                                className="px-5 py-2.5 bg-[#0F8F95] hover:bg-[#0B7C81] text-white font-semibold rounded-xl text-sm transition-all shadow-sm shadow-[#0F8F95]/20 flex items-center gap-2 cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Create New</span>
                                <ChevronRight className={`w-4 h-4 transition-transform ${createDropdownOpen ? '-rotate-90' : 'rotate-90'}`} />
                            </button>

                            {createDropdownOpen && (
                                <div className="absolute left-0 mt-2 w-52 bg-bg-card rounded-2xl shadow-xl border border-border-subtle p-2 z-50 animate-in slide-in-from-top-2 duration-200">
                                    <button
                                        onClick={() => { setCreateDropdownOpen(false); setIsCreateModalOpen(true); }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-text-primary hover:bg-bg-hover rounded-xl transition-colors text-left"
                                    >
                                        <FileText className="w-4 h-4 text-[#0F8F95]" />
                                        <span>New Quotation</span>
                                    </button>
                                    <button
                                        onClick={() => { setCreateDropdownOpen(false); navigate('/enquiries'); }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-text-primary hover:bg-bg-hover rounded-xl transition-colors text-left"
                                    >
                                        <MessageSquare className="w-4 h-4 text-[#2563EB]" />
                                        <span>View Enquiries</span>
                                    </button>
                                    <button
                                        onClick={() => { setCreateDropdownOpen(false); navigate('/customers'); }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-text-primary hover:bg-bg-hover rounded-xl transition-colors text-left"
                                    >
                                        <User className="w-4 h-4 text-[#7C3AED]" />
                                        <span>Add Customer</span>
                                    </button>
                                    <button
                                        onClick={() => { setCreateDropdownOpen(false); navigate('/invoices'); }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-text-primary hover:bg-bg-hover rounded-xl transition-colors text-left"
                                    >
                                        <CreditCard className="w-4 h-4 text-[#D97706]" />
                                        <span>Manage Invoices</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Visual Graphic / Quote */}
                    <div className="hidden sm:block absolute right-8 bottom-6 text-right max-w-[220px]">
                        <p className="text-xs font-bold text-[#0F8F95] dark:text-[#2DD4BF] italic">"Better systems for a brighter tomorrow."</p>
                        <div className="flex items-center justify-end gap-1.5 mt-2">
                            <span className="w-6 h-1 rounded-full bg-[#0F8F95]"></span>
                            <span className="w-2 h-1 rounded-full bg-[#0F8F95]/40"></span>
                        </div>
                    </div>
                </div>

                {/* Calendar Card (4 cols) */}
                <div className="lg:col-span-4">
                    {renderCalendar()}
                </div>
            </div>

            {/* Modal for Quotation Creation */}
            <CreateQuotationModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />

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
                    {/* ROW 2: 4 KPI Cards Matching Reference */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                        
                        {/* 1. Total Invoiced Card */}
                        <div className="card p-6 flex flex-col justify-between hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 rounded-2xl bg-[#E6F5F2] flex items-center justify-center text-[#0F8F95]">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-semibold text-text-muted">Total Invoiced</span>
                            </div>
                            <div>
                                <div className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
                                    ₹ {Number(receivablesStats?.totalInvoiced || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </div>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle/40">
                                    <span className="text-xs font-bold text-[#0F8F95] flex items-center">
                                        <TrendingUp className="w-3.5 h-3.5 mr-1" /> +12%
                                    </span>
                                    {/* Decorative Sparkline SVG */}
                                    <svg className="w-16 h-6 text-[#0F8F95]/40 overflow-visible" viewBox="0 0 60 20">
                                        <path d="M0 15 Q 15 5, 30 12 T 60 4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* 2. Total Received Card */}
                        <div className="card p-6 flex flex-col justify-between hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 rounded-2xl bg-[#E7FAFA] flex items-center justify-center text-[#0891B2]">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-semibold text-text-muted">Total Received</span>
                            </div>
                            <div>
                                <div className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
                                    ₹ {Number(receivablesStats?.totalReceived || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </div>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle/40">
                                    <span className="text-xs font-bold text-[#0891B2] flex items-center">
                                        <TrendingUp className="w-3.5 h-3.5 mr-1" /> +8%
                                    </span>
                                    <svg className="w-16 h-6 text-[#0891B2]/40 overflow-visible" viewBox="0 0 60 20">
                                        <path d="M0 18 Q 15 10, 30 14 T 60 6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* 3. Outstanding Card */}
                        <div className="card p-6 flex flex-col justify-between hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 rounded-2xl bg-[#FFF7ED] flex items-center justify-center text-[#D97706]">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-semibold text-text-muted">Outstanding</span>
                            </div>
                            <div>
                                <div className="text-2xl sm:text-3xl font-extrabold text-[#D97706] tracking-tight">
                                    ₹ {Number(receivablesStats?.outstandingAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </div>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle/40">
                                    <span className="text-xs font-bold text-[#D97706] flex items-center">
                                        <TrendingUp className="w-3.5 h-3.5 mr-1" /> +5%
                                    </span>
                                    <svg className="w-16 h-6 text-[#D97706]/40 overflow-visible" viewBox="0 0 60 20">
                                        <path d="M0 12 Q 15 16, 30 8 T 60 10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* 4. Overdue Card */}
                        <div className="card p-6 flex flex-col justify-between hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 rounded-2xl bg-[#FEF2F2] flex items-center justify-center text-[#DC2626]">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-semibold text-text-muted">Overdue</span>
                            </div>
                            <div>
                                <div className="text-2xl sm:text-3xl font-extrabold text-[#DC2626] tracking-tight">
                                    ₹ {Number(receivablesStats?.overdueAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </div>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle/40">
                                    <span className="text-xs font-bold text-[#DC2626] flex items-center">
                                        <TrendingUp className="w-3.5 h-3.5 mr-1" /> +18%
                                    </span>
                                    <svg className="w-16 h-6 text-[#DC2626]/40 overflow-visible" viewBox="0 0 60 20">
                                        <path d="M0 16 Q 15 8, 30 14 T 60 4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ROW 3: Analytics (Invoice Trend & Invoice Status) + Right Column (Upcoming Activity & Banner) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        
                        {/* Left Column (8 cols): Invoice Trend & Invoice Status */}
                        <div className="lg:col-span-8 space-y-6">
                            
                            {/* Invoice Trend Card */}
                            <div className="card p-6 flex flex-col">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-base font-bold text-text-primary tracking-tight">Invoice Trend</h2>
                                        <p className="text-xs text-text-muted">Monthly performance overview</p>
                                    </div>
                                    <div className="flex items-center px-3 py-1.5 rounded-xl border border-border-subtle bg-bg-card text-xs font-semibold text-text-secondary cursor-pointer">
                                        <span>This Year</span>
                                        <ChevronRight className="w-3.5 h-3.5 ml-1.5 rotate-90 text-text-muted" />
                                    </div>
                                </div>
                                
                                {/* Monthly Bar Chart Representation */}
                                <div className="h-64 flex items-end justify-between gap-3 pt-6 pb-2 border-b border-border-subtle/50 px-2 overflow-x-auto">
                                    {isLoading ? (
                                        <div className="w-full flex justify-center items-center h-full">
                                            <Loader2 className="w-6 h-6 animate-spin text-[#0F8F95]" />
                                        </div>
                                    ) : (
                                        [
                                            { month: 'Jan', val: 40 }, { month: 'Feb', val: 65 }, { month: 'Mar', val: 45 },
                                            { month: 'Apr', val: 85 }, { month: 'May', val: 60 }, { month: 'Jun', val: 55 },
                                            { month: 'Jul', val: 70 }, { month: 'Aug', val: 95 }, { month: 'Sep', val: 68 },
                                            { month: 'Oct', val: 72 }, { month: 'Nov', val: 88 }, { month: 'Dec', val: 100 }
                                        ].map((item, idx) => (
                                            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative min-w-[20px]">
                                                {/* Tooltip */}
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-[#0B1F33] text-white text-[10px] font-bold py-1 px-2 rounded-md shadow-md whitespace-nowrap pointer-events-none z-20">
                                                    {item.month}: ₹{(item.val * 3500).toLocaleString()}
                                                </div>
                                                
                                                <div 
                                                    className="w-full max-w-[28px] bg-[#0F8F95] hover:bg-[#0B7C81] rounded-t-lg transition-all duration-300"
                                                    style={{ height: `${item.val}%` }}
                                                />
                                                <span className="text-[10px] font-bold text-text-muted">{item.month}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Invoice Status Donut Summary */}
                            <div className="card p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-base font-bold text-text-primary tracking-tight">Invoice Status</h2>
                                    <span className="text-xs text-text-muted font-medium">Distribution breakdown</span>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
                                    {/* Donut Graphic */}
                                    <div className="relative w-36 h-36 flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#F1F5F9" strokeWidth="3.8" />
                                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 14 24" fill="none" stroke="#0F8F95" strokeWidth="3.8" strokeDasharray="50, 100" />
                                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 -12 26" fill="none" stroke="#D97706" strokeWidth="3.8" strokeDasharray="25, 100" strokeDashoffset="-50" />
                                        </svg>
                                        <div className="absolute text-center">
                                            <span className="text-2xl font-extrabold text-text-primary leading-none block">
                                                {stats?.totalInvoices ?? (receivablesStats?.totalInvoiced ? 124 : 0)}
                                            </span>
                                            <span className="text-[10px] font-bold text-text-muted uppercase">Total</span>
                                        </div>
                                    </div>

                                    {/* Donut Legend */}
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-xs w-full max-w-xs">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full bg-[#0F8F95]"></span>
                                                <span className="text-text-secondary font-medium">Issued</span>
                                            </div>
                                            <span className="font-bold text-text-primary">68</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]"></span>
                                                <span className="text-text-secondary font-medium">Partially Paid</span>
                                            </div>
                                            <span className="font-bold text-text-primary">24</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full bg-[#059669]"></span>
                                                <span className="text-text-secondary font-medium">Paid</span>
                                            </div>
                                            <span className="font-bold text-text-primary">20</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]"></span>
                                                <span className="text-text-secondary font-medium">Cancelled</span>
                                            </div>
                                            <span className="font-bold text-text-primary">8</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column (4 cols): Upcoming Activity & Streamline Business Banner */}
                        <div className="lg:col-span-4 space-y-6 flex flex-col justify-between">
                            
                            {/* Upcoming Activity List */}
                            <div className="card p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-base font-bold text-text-primary tracking-tight">Upcoming</h2>
                                    <Link to="/invoices" className="text-xs font-semibold text-[#0F8F95] hover:underline">View All</Link>
                                </div>
                                
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FFF7ED] dark:bg-[#7C2D12]/20 border border-[#FFEDD5]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-[#EA580C]/10 text-[#EA580C] flex items-center justify-center">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-text-primary">Invoice Due</p>
                                                <p className="text-[11px] text-text-muted font-medium">ACX/INV/26-27/0056</p>
                                            </div>
                                        </div>
                                        <span className="text-[11px] font-bold text-text-muted">Sep 18</span>
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-2xl bg-[#E6F5F2] dark:bg-[#064E3B]/20 border border-[#CCFBF1]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-[#0F8F95]/10 text-[#0F8F95] flex items-center justify-center">
                                                <Phone className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-text-primary">Follow Up</p>
                                                <p className="text-[11px] text-text-muted font-medium">TechNova Solutions</p>
                                            </div>
                                        </div>
                                        <span className="text-[11px] font-bold text-text-muted">Sep 18</span>
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-2xl bg-[#EFF6FF] dark:bg-[#1E3A8A]/20 border border-[#DBEAFE]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-text-primary">Quotation Revision</p>
                                                <p className="text-[11px] text-text-muted font-medium">ACX/QUO/26-27/0034</p>
                                            </div>
                                        </div>
                                        <span className="text-[11px] font-bold text-text-muted">Sep 19</span>
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FEF2F2] dark:bg-[#7F1D1D]/20 border border-[#FEE2E2]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center">
                                                <Bell className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-text-primary">Payment Reminder</p>
                                                <p className="text-[11px] text-text-muted font-medium">BrightEdge Systems</p>
                                            </div>
                                        </div>
                                        <span className="text-[11px] font-bold text-text-muted">Sep 20</span>
                                    </div>
                                </div>
                            </div>

                            {/* Streamline Business Promo Card */}
                            <div className="bg-[#0F8F95] rounded-[24px] p-6 text-white relative overflow-hidden flex items-center justify-between shadow-md shadow-[#0F8F95]/20">
                                <div className="max-w-[200px] relative z-10">
                                    <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center mb-3">
                                        <ShieldCheck className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="text-base font-bold leading-tight">Streamline Your Business</h3>
                                    <p className="text-[11px] text-white/80 mt-1">From enquiry to payment, all in one place.</p>
                                </div>
                                <button 
                                    onClick={() => navigate('/invoices')}
                                    className="w-11 h-11 rounded-full bg-white text-[#0F8F95] hover:bg-slate-100 flex items-center justify-center transition-transform hover:scale-105 cursor-pointer shadow-md"
                                >
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ROW 4: Recent Invoices & Recent Enquiries Tables Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* Recent Invoices Card */}
                        <div className="card flex flex-col overflow-hidden">
                            <div className="px-6 py-5 flex items-center justify-between border-b border-border-subtle">
                                <h2 className="text-base font-bold text-text-primary tracking-tight">Recent Invoices</h2>
                                <Link to="/invoices" className="text-xs font-semibold text-[#0F8F95] hover:underline flex items-center">
                                    View All <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                                </Link>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-bg-card">
                                        <tr>
                                            <th className="table-header">Invoice No</th>
                                            <th className="table-header">Client</th>
                                            <th className="table-header">Date</th>
                                            <th className="table-header text-right">Amount</th>
                                            <th className="table-header">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-subtle/40">
                                        {stats?.recentInvoices && stats.recentInvoices.length > 0 ? (
                                            stats.recentInvoices.map((inv) => (
                                                <tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)} className="hover:bg-bg-hover cursor-pointer transition-colors">
                                                    <td className="table-cell font-bold text-[#0F8F95]">{inv.invoiceNumber || 'DRAFT'}</td>
                                                    <td className="table-cell">{inv.clientName}</td>
                                                    <td className="table-cell text-xs text-text-muted">{inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-'}</td>
                                                    <td className="table-cell text-right font-semibold text-text-primary">₹ {Number(inv.grandTotal || 0).toLocaleString()}</td>
                                                    <td className="table-cell"><StatusBadge status={inv.status} /></td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-8 text-center text-xs text-text-muted">No recent invoices recorded</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Recent Enquiries Card */}
                        <div className="card flex flex-col overflow-hidden">
                            <div className="px-6 py-5 flex items-center justify-between border-b border-border-subtle">
                                <h2 className="text-base font-bold text-text-primary tracking-tight">Recent Enquiries</h2>
                                <Link to="/enquiries" className="text-xs font-semibold text-[#0F8F95] hover:underline flex items-center">
                                    View All <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                                </Link>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-bg-card">
                                        <tr>
                                            <th className="table-header">Name</th>
                                            <th className="table-header">Company</th>
                                            <th className="table-header">Date</th>
                                            <th className="table-header">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-subtle/40">
                                        {stats?.recentEnquiries && stats.recentEnquiries.length > 0 ? (
                                            stats.recentEnquiries.slice(0, 5).map((enq) => (
                                                <tr key={enq.id} onClick={() => handleOpenEnquiry(enq)} className="hover:bg-bg-hover cursor-pointer transition-colors">
                                                    <td className="table-cell font-bold text-text-primary">{enq.fullName}</td>
                                                    <td className="table-cell">{enq.companyName || '—'}</td>
                                                    <td className="table-cell text-xs text-text-muted">{new Date(enq.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                                                    <td className="table-cell"><StatusBadge status={enq.status} /></td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="4" className="px-6 py-8 text-center text-xs text-text-muted">No recent enquiries found</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
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
