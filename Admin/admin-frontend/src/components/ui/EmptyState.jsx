import React from 'react';
import { Loader2, AlertCircle, Inbox, FileText, Users, Search } from 'lucide-react';

/**
 * ACROVIX Premium Empty State
 * SVG illustrations with friendly copy and actionable CTAs.
 */

const ILLUSTRATIONS = {
    inbox: (
        <svg viewBox="0 0 120 100" fill="none" className="w-full h-full" aria-hidden="true">
            <rect x="15" y="20" width="90" height="65" rx="8" fill="currentColor" className="text-bg-muted" />
            <rect x="15" y="20" width="90" height="65" rx="8" stroke="currentColor" className="text-border-strong" strokeWidth="1.5" />
            <path d="M15 52h30l8 12h14l8-12h30" stroke="currentColor" className="text-border-strong" strokeWidth="1.5" strokeLinejoin="round" />
            <rect x="35" y="35" width="50" height="4" rx="2" fill="currentColor" className="text-border-strong opacity-50" />
            <rect x="42" y="44" width="36" height="3" rx="1.5" fill="currentColor" className="text-border-strong opacity-30" />
        </svg>
    ),
    search: (
        <svg viewBox="0 0 120 100" fill="none" className="w-full h-full" aria-hidden="true">
            <circle cx="52" cy="46" r="26" stroke="currentColor" className="text-border-strong" strokeWidth="2" />
            <circle cx="52" cy="46" r="26" fill="currentColor" className="text-bg-muted" />
            <path d="M70 64l20 20" stroke="currentColor" className="text-border-strong" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M44 46h16M52 38v16" stroke="currentColor" className="text-text-muted opacity-40" strokeWidth="2" strokeLinecap="round" />
        </svg>
    ),
    document: (
        <svg viewBox="0 0 120 100" fill="none" className="w-full h-full" aria-hidden="true">
            <rect x="25" y="12" width="70" height="80" rx="6" fill="currentColor" className="text-bg-muted" />
            <rect x="25" y="12" width="70" height="80" rx="6" stroke="currentColor" className="text-border-strong" strokeWidth="1.5" />
            <path d="M55 12v22l10-8 10 8V12" fill="currentColor" className="text-border-strong opacity-40" />
            <rect x="38" y="46" width="44" height="3" rx="1.5" fill="currentColor" className="text-border-strong opacity-40" />
            <rect x="38" y="55" width="32" height="3" rx="1.5" fill="currentColor" className="text-border-strong opacity-30" />
            <rect x="38" y="64" width="38" height="3" rx="1.5" fill="currentColor" className="text-border-strong opacity-20" />
        </svg>
    ),
    users: (
        <svg viewBox="0 0 120 100" fill="none" className="w-full h-full" aria-hidden="true">
            <circle cx="46" cy="38" r="16" fill="currentColor" className="text-bg-muted" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="46" cy="38" r="16" className="text-border-strong" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 85c0-19.88 16.12-36 36-36s36 16.12 36 36" stroke="currentColor" className="text-border-strong" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="84" cy="35" r="12" fill="currentColor" className="text-bg-muted opacity-60" stroke="currentColor" strokeWidth="1.5" />
            <path d="M58 80c0-14.36 11.64-26 26-26" stroke="currentColor" className="text-border-strong opacity-50" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    ),
    error: (
        <svg viewBox="0 0 120 100" fill="none" className="w-full h-full" aria-hidden="true">
            <circle cx="60" cy="48" r="32" fill="currentColor" className="text-red-50 dark:text-red-900/20" />
            <circle cx="60" cy="48" r="32" stroke="currentColor" className="text-red-200 dark:text-red-800/40" strokeWidth="1.5" />
            <path d="M60 34v20M60 62v4" stroke="currentColor" className="text-red-500" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
    ),
};

export default function EmptyState({
    type,
    loading = false,
    error = null,
    message,
    emptyMessage,
    description,
    onRetry = null,
    icon: Icon = null,
    illustration,
    isFiltered = false,
    actionLabel,
    onAction,
}) {
    const isError = type === 'error' || Boolean(error);
    const isLoading = type === 'loading' || Boolean(loading);

    let displayMessage = message || emptyMessage || 'Nothing here yet';
    if (isError) displayMessage = typeof error === 'string' ? error : 'Something went wrong';
    else if (isFiltered && !isLoading && !isError) displayMessage = 'No results found';

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
                <div className="relative">
                    <div className="w-10 h-10 rounded-full border-2 border-border-subtle" />
                    <Loader2 className="w-10 h-10 text-brand-primary animate-spin absolute inset-0" />
                </div>
                <p className="text-[13px] font-medium text-text-muted">{displayMessage || 'Loading data...'}</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-xs mx-auto gap-4">
                <div className="w-20 h-16 opacity-90">
                    {ILLUSTRATIONS.error}
                </div>
                <div>
                    <p className="text-[15px] font-bold text-text-primary tracking-tight">Unable to Load Data</p>
                    <p className="text-[13px] text-text-muted mt-1 leading-relaxed">{displayMessage}</p>
                </div>
                {onRetry && (
                    <button type="button" onClick={onRetry} className="btn btn-secondary btn-sm">
                        Try again
                    </button>
                )}
            </div>
        );
    }

    // Pick illustration
    let IllustrationEl = null;
    if (illustration && ILLUSTRATIONS[illustration]) {
        IllustrationEl = ILLUSTRATIONS[illustration];
    } else if (type === 'search' || isFiltered) {
        IllustrationEl = ILLUSTRATIONS.search;
    } else if (Icon) {
        IllustrationEl = null; // use icon fallback
    } else {
        IllustrationEl = ILLUSTRATIONS.inbox;
    }

    const subCopy = isFiltered
        ? 'Try adjusting your search or clearing filters to see more results.'
        : (description || 'New items will appear here once they are created.');

    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-sm mx-auto gap-4">
            {IllustrationEl ? (
                <div className="w-24 h-20 opacity-80">
                    {IllustrationEl}
                </div>
            ) : Icon ? (
                <div className="w-12 h-12 rounded-2xl bg-bg-muted flex items-center justify-center mb-1">
                    <Icon className="w-6 h-6 text-text-muted/50" />
                </div>
            ) : null}

            <div>
                <h3 className="text-[15px] font-bold text-text-primary tracking-tight leading-snug">
                    {displayMessage}
                </h3>
                <p className="text-[13px] text-text-muted mt-1.5 leading-relaxed">
                    {subCopy}
                </p>
            </div>

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
