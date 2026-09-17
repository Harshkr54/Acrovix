import React from 'react';

export default function EmptyState({ 
    loading = false, 
    error = null, 
    onRetry = null, 
    emptyMessage = "No items found.",
    colSpan = 6,
    icon: Icon = null
}) {
    if (loading) {
        return (
            <tr>
                <td colSpan={colSpan} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-[#0F8F95] border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm font-medium text-text-muted">Loading data...</span>
                    </div>
                </td>
            </tr>
        );
    }

    if (error) {
        return (
            <tr>
                <td colSpan={colSpan} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                        <p className="text-sm font-semibold text-red-500">{error}</p>
                        {onRetry && (
                            <button
                                onClick={onRetry}
                                className="px-4 py-1.5 bg-[#0F8F95]/10 hover:bg-[#0F8F95]/20 text-[#0F8F95] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                            >
                                Retry
                            </button>
                        )}
                    </div>
                </td>
            </tr>
        );
    }

    return (
        <tr>
            <td colSpan={colSpan} className="px-6 py-12 text-center">
                <div className="flex flex-col items-center justify-center gap-2">
                    {Icon && <Icon className="w-8 h-8 text-text-muted/40" />}
                    <span className="text-sm font-medium text-text-muted">{emptyMessage}</span>
                </div>
            </td>
        </tr>
    );
}
