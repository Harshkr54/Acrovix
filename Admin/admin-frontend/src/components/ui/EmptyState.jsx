import React from 'react';
import { Loader2, AlertCircle, Inbox } from 'lucide-react';

export default function EmptyState({ 
    type,
    loading = false, 
    error = null, 
    message,
    emptyMessage,
    onRetry = null, 
    icon: Icon = null 
}) {
    const isError = type === 'error' || Boolean(error);
    const isLoading = type === 'loading' || Boolean(loading);
    const displayMessage = message || emptyMessage || (isError ? (typeof error === 'string' ? error : 'An error occurred') : 'No items found.');

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Loader2 className="w-8 h-8 text-brand-primary animate-spin mb-3" />
                <p className="text-sm font-medium text-text-muted">{displayMessage || "Loading data..."}</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center max-w-md mx-auto">
                <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-3">
                    <AlertCircle className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-text-primary mb-1">Unable to Load Data</p>
                <p className="text-xs text-text-muted mb-4">{displayMessage}</p>
                {onRetry && (
                    <button
                        type="button"
                        onClick={onRetry}
                        className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-sm"
                    >
                        Retry
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            {Icon ? (
                <Icon className="w-10 h-10 text-text-muted/40 mb-3" />
            ) : (
                <Inbox className="w-10 h-10 text-text-muted/40 mb-3" />
            )}
            <p className="text-sm font-medium text-text-muted">{displayMessage}</p>
        </div>
    );
}
