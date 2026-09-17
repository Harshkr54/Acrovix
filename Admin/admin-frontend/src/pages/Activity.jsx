import React, { useEffect, useState, useCallback } from 'react';
import { fetchApi } from '../services/api';
import { Activity as ActivityIcon, MessageSquare, FileText, User, ChevronLeft, ChevronRight } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';

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
                    badgeStyle: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300',
                    iconBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40'
                };
            case 'ENQUIRY':
                return {
                    Icon: MessageSquare,
                    badgeStyle: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300',
                    iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40'
                };
            case 'USER':
                return {
                    Icon: User,
                    badgeStyle: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300',
                    iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40'
                };
            default:
                return {
                    Icon: ActivityIcon,
                    badgeStyle: 'bg-teal-50 text-brand-primary dark:bg-teal-950/40 dark:text-teal-300',
                    iconBg: 'bg-teal-50 text-brand-primary dark:bg-teal-950/40'
                };
        }
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
            
            {/* Header */}
            <PageHeader
                title="Activity Log"
                subtitle="Track admin actions, entity updates, and system events."
                icon={ActivityIcon}
            />

            {/* Main Content Area */}
            <div className="bg-bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-sm flex flex-col min-h-[400px]">
                {error ? (
                    <div className="py-12">
                        <EmptyState type="error" message={error} onRetry={fetchActivities} />
                    </div>
                ) : isLoading ? (
                    <div className="py-12">
                        <EmptyState type="loading" message="Loading activities..." />
                    </div>
                ) : activities.length === 0 ? (
                    <div className="py-12">
                        <EmptyState type="empty" message="No activities recorded yet." />
                    </div>
                ) : (
                    <>
                        {/* Timeline List */}
                        <div className="p-6 divide-y divide-border-subtle">
                            {activities.map((item) => {
                                const { Icon, badgeStyle, iconBg } = getActivityIconAndStyle(item.entityType);
                                return (
                                    <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-start gap-4">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${iconBg} shadow-sm border border-border-subtle`}>
                                            <Icon className="w-5 h-5" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                                <div className="flex items-center gap-2.5 flex-wrap">
                                                    <h3 className="text-sm font-bold text-text-primary leading-snug">
                                                        {item.action}
                                                    </h3>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${badgeStyle}`}>
                                                        {item.entityType} #{item.entityId}
                                                    </span>
                                                </div>

                                                <span className="text-xs font-medium text-text-muted whitespace-nowrap">
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

                                            <div className="mt-2 text-xs font-semibold text-text-muted flex items-center gap-1.5">
                                                <span>Performed by:</span>
                                                <span className="text-text-primary font-bold">{item.adminName || `Admin #${item.adminUserId}`}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="p-4 border-t border-border-subtle flex items-center justify-between bg-bg-main/50 mt-auto">
                                <span className="text-xs text-text-muted font-medium">
                                    Page {currentPage + 1} of {totalPages} ({totalElements} total actions)
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        disabled={currentPage === 0 || isLoading}
                                        onClick={() => setCurrentPage(p => p - 1)}
                                        className="px-3 py-1.5 rounded-lg border border-border-subtle hover:bg-bg-card disabled:opacity-50 text-xs font-semibold flex items-center gap-1"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                        Prev
                                    </button>
                                    <button
                                        disabled={currentPage >= totalPages - 1 || isLoading}
                                        onClick={() => setCurrentPage(p => p + 1)}
                                        className="px-3 py-1.5 rounded-lg border border-border-subtle hover:bg-bg-card disabled:opacity-50 text-xs font-semibold flex items-center gap-1"
                                    >
                                        Next
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
