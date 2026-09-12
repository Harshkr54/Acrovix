import React, { useEffect, useState } from 'react';
import { API_BASE_URL, getAuthHeaders } from '../services/api';
import { Users, FileText, Activity, TrendingUp, Inbox, CheckCircle, Clock } from 'lucide-react';

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_BASE_URL}/dashboard/stats`, { headers: getAuthHeaders() })
            .then(res => res.json())
            .then(data => {
                setStats(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Error fetching stats", err);
                setIsLoading(false);
            });
    }, []);

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
                <Activity className="w-12 h-12 mb-4 opacity-50" />
                <p>Failed to load dashboard statistics.</p>
            </div>
        );
    }

    const maxQuotations = Math.max(
        stats.quotationsByStatus?.DRAFT || 0,
        stats.quotationsByStatus?.SENT || 0,
        stats.quotationsByStatus?.ACCEPTED || 0,
        stats.quotationsByStatus?.REJECTED || 0,
        stats.quotationsByStatus?.EXPIRED || 0,
        1
    );

    const getStatusConfig = (status) => {
        switch(status) {
            case 'DRAFT': return { color: 'bg-slate-500', text: 'text-slate-400', label: 'Draft' };
            case 'SENT': return { color: 'bg-blue-500', text: 'text-blue-400', label: 'Sent' };
            case 'ACCEPTED': return { color: 'bg-green-500', text: 'text-green-400', label: 'Accepted' };
            case 'REJECTED': return { color: 'bg-red-500', text: 'text-red-400', label: 'Rejected' };
            case 'EXPIRED': return { color: 'bg-orange-500', text: 'text-orange-400', label: 'Expired' };
            default: return { color: 'bg-slate-500', text: 'text-slate-400', label: status };
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="card p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Inbox className="w-16 h-16 text-brand-500" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-sm font-medium text-slate-400 mb-1">Total Enquiries</p>
                        <div className="flex items-end space-x-3">
                            <p className="text-3xl font-bold text-slate-100">{stats.totalEnquiries}</p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-500/10 text-brand-400 mb-1">
                                +{stats.enquiriesThisMonth} this mo
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-2 flex items-center">
                            <span className="w-2 h-2 rounded-full bg-brand-500 mr-2 animate-pulse"></span>
                            {stats.newEnquiries} currently NEW
                        </p>
                    </div>
                </div>
                
                <div className="card p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <FileText className="w-16 h-16 text-brand-500" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-sm font-medium text-slate-400 mb-1">Total Quotations</p>
                        <div className="flex items-end space-x-3">
                            <p className="text-3xl font-bold text-slate-100">{stats.totalQuotations}</p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 mb-1">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                {stats.conversionRate}% win rate
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-2 flex items-center">
                            <CheckCircle className="w-3.5 h-3.5 text-green-500 mr-1.5" />
                            {stats.acceptedQuotations} Accepted
                        </p>
                    </div>
                </div>

                {/* Quotations By Status Visualization */}
                <div className="card p-6 lg:col-span-2 flex flex-col">
                    <p className="text-sm font-medium text-slate-400 mb-4">Quotations by Status</p>
                    <div className="flex-1 flex flex-col justify-center space-y-3">
                        {['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'].map(status => {
                            const count = stats.quotationsByStatus?.[status] || 0;
                            const percentage = (count / maxQuotations) * 100;
                            const config = getStatusConfig(status);
                            
                            return (
                                <div key={status} className="flex items-center">
                                    <div className={`w-24 text-xs font-medium ${config.text} uppercase tracking-wider`}>
                                        {config.label} ({count})
                                    </div>
                                    <div className="flex-1 h-3 bg-slate-900 rounded-full overflow-hidden ml-4">
                                        <div 
                                            className={`h-full ${config.color} rounded-full transition-all duration-1000 ease-out`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="card overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/80">
                    <div className="flex items-center">
                        <Activity className="mr-3 text-brand-500 w-5 h-5" />
                        <h2 className="text-lg font-medium text-slate-200">Recent Activity</h2>
                    </div>
                </div>
                <div className="divide-y divide-slate-700/50">
                    {stats.recentActivities?.map((activity, idx) => (
                        <div key={activity.id} className={`px-6 py-4 hover:bg-slate-700/20 transition-colors ${idx === 0 ? 'bg-slate-800/30' : ''}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-start mb-1 sm:mb-0">
                                    <div className="mt-0.5 mr-3 flex-shrink-0">
                                        <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-300">
                                            {activity.action} <span className="text-slate-500 font-normal">on {activity.entityType.toLowerCase()} #{activity.entityId}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center text-xs text-slate-500 sm:ml-4 ml-5">
                                    <Clock className="w-3.5 h-3.5 mr-1" />
                                    {new Date(activity.createdAt).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    ))}
                    {(!stats.recentActivities || stats.recentActivities.length === 0) && (
                        <div className="px-6 py-12 flex flex-col items-center justify-center text-slate-500">
                            <Clock className="w-8 h-8 mb-2 opacity-50" />
                            <p className="text-sm">No recent activity.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
