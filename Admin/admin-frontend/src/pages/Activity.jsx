import React, { useEffect, useState, useCallback } from 'react';
import { fetchApi } from '../services/api';
import { Activity as ActivityIcon, MessageSquare, FileText, User, ChevronLeft, ChevronRight, AlertCircle, RefreshCw, Clock } from 'lucide-react';

export default function Activity() {
    const [activities, setActivities] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const itemsPerPage = 20;

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchActivities = useCallback(() => {
        setIsLoading(true);
        setError(null);
        fetchApi(`/activities?page=${currentPage}&size=${itemsPerPage}`)
            .then(data => {
                setActivities(data.content || []);
                setTotalPages(data.totalPages || 0);
                setTotalElements(data.totalElements || 0);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Error fetching activities", err);
                setError(err.message || "Failed to load activity logs.");
                setIsLoading(false);
            });
    }, [currentPage]);

    useEffect(() => {
        fetchActivities();
    }, [fetchActivities]);

    const getActivityIconAndStyle = (entityType) => {
        switch (entityType?.toUpperCase()) {
            case 'QUOTATION':
                return {
                    Icon: FileText,
                    badgeStyle: 'bg-[#F5F3FF] text-[#7C3AED] border-[#C4B5FD]/30',
                    iconBg: 'bg-[#F5F3FF] text-[#7C3AED]'
                };
            case 'ENQUIRY':
                return {
                    Icon: MessageSquare,
                    badgeStyle: 'bg-[#EFF6FF] text-[#2563EB] border-[#93C5FD]/30',
                    iconBg: 'bg-[#EFF6FF] text-[#2563EB]'
                };
            case 'USER':
                return {
                    Icon: User,
                    badgeStyle: 'bg-[#FFF7ED] text-[#EA580C] border-[#FDBA74]/30',
                    iconBg: 'bg-[#FFF7ED] text-[#EA580C]'
                };
            default:
                return {
                    Icon: ActivityIcon,
                    badgeStyle: 'bg-[#F0FDFA] text-[#0D9488] border-[#99F6E4]/30',
                    iconBg: 'bg-[#F0FDFA] text-[#0D9488]'
                };
        }
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-[28px] font-bold text-text-primary tracking-tight leading-tight">Activity</h1>
                    <p className="text-[13px] text-text-secondary mt-1">Track admin actions and system activity.</p>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="card flex flex-col min-h-[400px]">
                {error ? (
                    <div className="p-12 flex flex-col items-center justify-center text-center">
                        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
                            <AlertCircle className="w-6 h-6 text-red-500" />
                        </div>
                        <h3 className="text-base font-bold text-text-primary mb-1">Failed to load activity logs</h3>
                        <p className="text-xs text-text-secondary mb-6 max-w-sm">{error}</p>
                        <button onClick={fetchActivities} className="btn-primary flex items-center shadow-sm text-xs py-2 px-4">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Retry
                        </button>
                    </div>
                ) : isLoading ? (
                    <div className="p-16 flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#14B8A6] mb-3"></div>
                        <span className="text-xs font-medium text-text-muted">Loading activities...</span>
                    </div>
                ) : activities.length === 0 ? (
                    <div className="p-16 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 bg-bg-muted rounded-full flex items-center justify-center mb-4">
                            <Clock className="w-5 h-5 text-text-muted" />
                        </div>
                        <h3 className="text-sm font-bold text-text-primary mb-1">No activities recorded yet</h3>
                        <p className="text-xs text-text-muted max-w-sm">When administrative actions occur, they will be logged here.</p>
                    </div>
                ) : (
                    <>
                        {/* Timeline List */}
                        <div className="p-6 divide-y divide-border-subtle/50">
                            {activities.map((item) => {
                                const { Icon, badgeStyle, iconBg } = getActivityIconAndStyle(item.entityType);
                                return (
                                    <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-start gap-4 group">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${iconBg} shadow-sm border border-border-subtle/40`}>
                                            <Icon className="w-5 h-5" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                                <div className="flex items-center gap-2.5 flex-wrap">
                                                    <h3 className="text-sm font-bold text-text-primary leading-snug">
                                                        {item.action}
                                                    </h3>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${badgeStyle}`}>
                                                        {item.entityType} #{item.entityId}
                                                    </span>
                                                </div>

                                                <span className="text-[11px] font-medium text-text-muted whitespace-nowrap">
                                                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>

                                            {item.description && (
                                                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                                                    {item.description}
                                                </p>
                                            )}

                                            <div className="mt-2 text-[11px] font-semibold text-text-muted flex items-center gap-1.5">
                                                <span>Performed by:</span>
                                                <span className="text-text-primary font-bold">{item.adminName || `Admin #${item.adminUserId}`}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination Footer */}
                        <div className="px-6 py-4 border-t border-border-subtle/50 flex flex-col sm:flex-row items-center justify-between rounded-b-[24px] bg-bg-card">
                            <p className="text-[12px] text-text-muted font-medium mb-4 sm:mb-0">
                                Showing <span className="font-bold text-text-primary">{totalElements === 0 ? 0 : currentPage * itemsPerPage + 1}</span> to <span className="font-bold text-text-primary">{Math.min((currentPage + 1) * itemsPerPage, totalElements)}</span> of <span className="font-bold text-text-primary">{totalElements}</span> activities
                            </p>
                            <div className="flex space-x-2">
                                <button
                                    disabled={currentPage === 0 || isLoading}
                                    onClick={() => setCurrentPage(p => p - 1)}
                                    className="inline-flex items-center px-3 py-1.5 bg-bg-card hover:bg-bg-hover disabled:opacity-50 border border-border-subtle rounded-lg text-[12px] font-semibold text-text-primary transition-colors shadow-sm"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                                    Prev
                                </button>
                                <button
                                    disabled={currentPage >= totalPages - 1 || isLoading}
                                    onClick={() => setCurrentPage(p => p + 1)}
                                    className="inline-flex items-center px-3 py-1.5 bg-bg-card hover:bg-bg-hover disabled:opacity-50 border border-border-subtle rounded-lg text-[12px] font-semibold text-text-primary transition-colors shadow-sm"
                                >
                                    Next
                                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
