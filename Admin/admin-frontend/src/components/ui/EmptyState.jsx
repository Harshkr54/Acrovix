import React from 'react';
import { Loader2, AlertCircle, Inbox } from 'lucide-react';

export default function EmptyState({ 
    type,
    loading = false, 
    error = null, 
    message,
    emptyMessage,
    onRetry = null, 
    icon: Icon = null,
    isFiltered = false,
    actionLabel,
    onAction,
}) {
    const isError = type === 'error' || Boolean(error);
    const isLoading = type === 'loading' || Boolean(loading);
    
    // Determine the main display message based on state
    let displayMessage = message || emptyMessage || 'No items found.';
    if (isError) {
        displayMessage = typeof error === 'string' ? error : 'An error occurred';
    } else if (isFiltered && !isLoading && !isError) {
        displayMessage = 'No results found';
    }

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
                        className="btn btn-primary btn-sm"
                    >
                        Retry
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center max-w-sm mx-auto">
            {Icon ? (
                <Icon className="w-10 h-10 text-text-muted/40 mb-4" />
            ) : (
                <Inbox className="w-10 h-10 text-text-muted/40 mb-4" />
            )}
            
            <h3 className="text-[15px] font-bold text-text-primary tracking-tight mb-1">
                {displayMessage}
            </h3>
            
            {(isFiltered || message || emptyMessage) && !isFiltered && (
                <p className="text-[13px] text-text-secondary mb-5">
                    {isFiltered ? 'Try changing your search or filters.' : 'New items will appear here once they are created.'}
                </p>
            )}
            
            {isFiltered && (
                <p className="text-[13px] text-text-secondary mb-5">Try changing your search or filters.</p>
            )}

            {onAction && actionLabel && (
                <button 
                    onClick={onAction}
                    className={`btn btn-sm ${isFiltered ? 'btn-secondary' : 'btn-primary'}`}
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
