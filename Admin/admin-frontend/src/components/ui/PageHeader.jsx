import React from 'react';

/**
 * ACROVIX Premium PageHeader
 * Modern Linear/Stripe style page header with optional icon pill,
 * badge, description, and responsive action slot.
 */
export default function PageHeader({ 
    title, 
    subtitle, 
    icon: Icon = null, 
    badge = null,
    action = null,
    breadcrumbs = null
}) {
    return (
        <div className="flex flex-col gap-3 mb-6 sm:mb-8 animate-fade-in">
            {breadcrumbs && (
                <div className="flex items-center gap-1.5 text-xs text-text-muted font-medium">
                    {breadcrumbs}
                </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    {Icon && (
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0 border border-brand-primary/20 shadow-xs transition-transform duration-200 hover:scale-105">
                            <Icon className="w-5 h-5" />
                        </div>
                    )}
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-xl sm:text-2xl lg:text-[26px] font-bold text-text-primary tracking-tight leading-tight">
                                {title}
                            </h1>
                            {badge && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-bg-muted text-text-secondary border border-border-subtle">
                                    {badge}
                                </span>
                            )}
                        </div>
                        {subtitle && (
                            <p className="text-text-muted text-[13px] sm:text-sm mt-1 leading-normal font-normal">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>
                {action && (
                    <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
                        {action}
                    </div>
                )}
            </div>
        </div>
    );
}
