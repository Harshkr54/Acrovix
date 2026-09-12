import React, { useEffect, useState, useRef, useCallback } from 'react';
import { API_BASE_URL, getAuthHeaders } from '../services/api';
import { FileText, Inbox, Activity, CheckCircle, TrendingUp, Clock, ChevronRight, Filter, Plus, MoreHorizontal, MessageSquare, User, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const abortControllerRef = useRef(null);

    const fetchDashboardData = useCallback(() => {
        setIsLoading(true);
        setError(null);
        
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        const controller = new AbortController();
        abortControllerRef.current = controller;
        
        let isTimeout = false;
        const timeoutId = setTimeout(() => {
            isTimeout = true;
            controller.abort();
        }, 15000);

        fetch(`${API_BASE_URL}/dashboard/stats`, { 
            headers: getAuthHeaders(),
            signal: controller.signal
        })
        .then(res => {
            if (!res.ok) throw new Error('Failed to fetch dashboard data');
            return res.json();
        })
        .then(data => {
            setStats(data);
            setIsLoading(false);
        })
        .catch(err => {
            if (err.name === 'AbortError') {
                if (isTimeout) {
                    setError('Dashboard data is taking longer than expected.');
                    setIsLoading(false);
                }
                // Silently ignore component unmounts
                return;
            }
            console.error("Error fetching stats", err);
            setError(err.message || 'An unexpected error occurred');
            setIsLoading(false);
        })
        .finally(() => {
            clearTimeout(timeoutId);
        });
    }, []);

    useEffect(() => {
        fetchDashboardData();
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchDashboardData]);



    const normalizeStatus = (rawStatus) => {
        return rawStatus ? String(rawStatus).toUpperCase() : 'UNKNOWN';
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

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
            
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-[28px] font-bold text-text-primary tracking-tight leading-tight">Overview</h1>
                    <p className="text-[13px] text-text-secondary mt-1">Monitor enquiries, quotations and business activity.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center justify-center w-10 h-10 rounded-full bg-bg-card border border-border-subtle text-text-secondary hover:text-text-primary hover:shadow-sm transition-all">
                        <Filter className="w-4 h-4" />
                    </button>
                    <button onClick={() => navigate('/quotations/new')} className="btn-primary flex items-center px-4 py-2.5 shadow-[0_4px_14px_rgba(79,70,229,0.25)]">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Quotation
                    </button>
                </div>
            </div>

            {error ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] bg-bg-card rounded-[24px] border border-border-subtle text-center px-4">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-bold text-text-primary mb-2">Failed to Load Dashboard</h3>
                    <p className="text-sm text-text-secondary mb-6">{error}</p>
                    <button onClick={fetchDashboardData} className="btn-primary flex items-center shadow-sm">
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
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-[#4F46E5] ml-1" /> : (stats?.totalEnquiries ?? '—')}
                        </div>
                        <div className="flex items-center mt-1 text-[11px] font-medium text-text-muted">
                            <span>No comparison data</span>
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
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-[#0891B2] ml-1" /> : (stats?.newEnquiries ?? '—')}
                        </div>
                        <div className="flex items-center mt-1 text-[11px] font-medium text-text-muted">
                            <span>No comparison data</span>
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
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED] ml-1" /> : (stats?.totalQuotations ?? '—')}
                        </div>
                        <div className="flex items-center mt-1 text-[11px] font-medium text-text-muted">
                            <span>No comparison data</span>
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
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-[#059669] ml-1" /> : (stats?.acceptedQuotations ?? '—')}
                        </div>
                        <div className="flex items-center mt-1 text-[11px] font-medium text-text-muted">
                            <span>No comparison data</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Analytics Chart (2/3 width) */}
                <div className="lg:col-span-2">
                    <div className="card p-6 flex flex-col h-full min-h-[360px]">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-base font-bold text-text-primary tracking-tight">Enquiries Overview</h2>
                            <div className="flex items-center px-3 py-1.5 rounded-lg border border-border-subtle bg-bg-card text-xs font-semibold text-text-secondary cursor-pointer hover:bg-bg-hover transition-colors">
                                <Clock className="w-3.5 h-3.5 mr-2 text-text-muted" />
                                Last 6 months
                                <ChevronRight className="w-3.5 h-3.5 ml-1 text-text-muted rotate-90" />
                            </div>
                        </div>
                        
                        {/* Empty Chart Area */}
                        <div className="flex-1 relative flex flex-col justify-center items-center pb-8 min-h-[200px]">
                            <div className="flex flex-col items-center text-text-muted opacity-60">
                                <Activity className="w-8 h-8 mb-2" />
                                <span className="text-[13px] font-medium">Historical trend data not available</span>
                            </div>
                        </div>
                        
                        {/* Legend */}
                        <div className="flex items-center justify-center gap-6 pt-2">
                            <div className="flex items-center">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#4F46E5] mr-2"></div>
                                <span className="text-[11px] font-medium text-text-secondary">New Enquiries</span>
                            </div>
                            <div className="flex items-center">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#EEF2FF] border border-[#4F46E5]/20 mr-2"></div>
                                <span className="text-[11px] font-medium text-text-secondary">Existing Enquiries</span>
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
                                        // Generate visual properties based on entity type for the exact reference match
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
                                    <p className="text-[11px] mt-1 text-text-muted text-center">Activities will appear here.</p>
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
                                            {enq.referenceId}
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap text-[13px] font-medium text-text-secondary">
                                            {enq.fullName}
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap text-[13px] text-text-secondary">
                                            {enq.companyName || '—'}
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap text-[13px] text-text-secondary">
                                            {enq.serviceRequired}
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap">
                                            <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(enq.status)}`}>
                                                <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5"></span>
                                                {normalizeStatus(enq.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap text-[12px] text-text-muted font-medium">
                                            {new Date(enq.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap text-center">
                                            <button className="p-1 rounded bg-bg-muted text-text-muted hover:text-text-primary transition-colors">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
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
                            <p className="text-[14px] font-bold text-text-primary">No recent enquiries</p>
                            <p className="text-[12px] text-text-muted mt-1 text-center max-w-sm">New incoming enquiries will appear here automatically.</p>
                        </div>
                    )}
                </div>
        </div>
            </>
            )}
            
        </div>
    );
}
