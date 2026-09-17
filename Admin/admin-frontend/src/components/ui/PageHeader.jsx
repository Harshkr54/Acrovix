import React from 'react';

export default function PageHeader({ title, subtitle, icon: Icon = null, action = null }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
                {Icon && (
                    <div className="w-10 h-10 rounded-2xl bg-teal-500/10 dark:bg-teal-500/20 text-brand-primary flex items-center justify-center shrink-0 border border-teal-500/20">
                        <Icon className="w-5 h-5" />
                    </div>
                )}
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">{title}</h1>
                    {subtitle && <p className="text-text-muted text-sm mt-1">{subtitle}</p>}
                </div>
            </div>
            {action && (
                <div className="flex items-center gap-3">
                    {action}
                </div>
            )}
        </div>
    );
}
