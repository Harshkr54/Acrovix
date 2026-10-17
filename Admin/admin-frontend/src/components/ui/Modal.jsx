import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * ACROVIX Enterprise Modal Component
 * 
 * Sizing standards:
 * - 'sm': 380–440px (Confirmation & single-field prompts)
 * - 'md': 520–580px (Standard quick actions & short forms)
 * - 'lg': 680–740px (Two-column forms & detailed views)
 * - 'xl': 880–940px (Complex multi-section workflows & tables)
 * - '2xl': 1100–1200px (Full previews & document designers)
 *
 * Architecture:
 * - Fixed/sticky header with title, subtitle, icon & accessible close button
 * - Independent scrollable body (`overflow-y-auto min-h-0 flex-1`)
 * - Fixed/sticky footer with consistent action alignment
 * - Preserves previous document.body.style.overflow on mount/unmount
 * - Full Escape key dismissal and click-outside handling
 * - Deep dark backdrop (bg-black/65 backdrop-blur-xs)
 */

const SIZE_CLASSES = {
    sm: 'max-w-md w-full',
    md: 'max-w-lg w-full',
    lg: 'max-w-2xl w-full',
    xl: 'max-w-4xl w-full',
    '2xl': 'max-w-6xl w-full',
    full: 'max-w-[calc(100vw-32px)] w-full'
};

export default function Modal({
    isOpen,
    onClose,
    title,
    subtitle,
    description,
    icon: IconComponent,
    iconClassName = 'text-brand-primary bg-brand-primary/10 border-brand-primary/20',
    size = 'md',
    children,
    footer,
    headerActions,
    isLoading = false,
    closeOnBackdropClick = true,
    showCloseButton = true,
    role = 'dialog',
    className = '',
    bodyClassName = ''
}) {
    const dialogRef = useRef(null);
    const resolvedSubtitle = subtitle || description;

    // Body scroll lock with exact state restoration
    useEffect(() => {
        if (!isOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    // Keyboard support: Escape dismisses modal unless loading
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !isLoading) {
                onClose?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isLoading, onClose]);

    if (!isOpen) return null;

    const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

    const modalContent = (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden"
            role={role}
            aria-modal="true"
            aria-labelledby={title ? 'acx-modal-title' : undefined}
            aria-describedby={resolvedSubtitle ? 'acx-modal-desc' : undefined}
        >
            {/* Deep enterprise backdrop */}
            <div 
                className="fixed inset-0 bg-black/65 backdrop-blur-xs transition-opacity animate-fade-in"
                onClick={() => {
                    if (closeOnBackdropClick && !isLoading) {
                        onClose?.();
                    }
                }}
                aria-hidden="true"
            />

            {/* Modal Dialog Card */}
            <div 
                ref={dialogRef}
                onClick={(e) => e.stopPropagation()}
                className={`relative bg-bg-card rounded-2xl sm:rounded-[24px] shadow-2xl border border-border-subtle flex flex-col max-h-[calc(100dvh-32px)] sm:max-h-[calc(100dvh-48px)] my-auto z-10 overflow-hidden animate-modal-entrance ${sizeClass} ${className}`}
            >
                {/* Header (Sticky / Fixed) */}
                {(title || showCloseButton) && (
                    <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4 border-b border-border-subtle bg-gradient-to-br from-bg-muted/50 to-bg-card shrink-0">
                        <div className="flex items-center gap-3 min-w-0 pr-4">
                            {IconComponent && (
                                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border ${iconClassName}`}>
                                    {React.isValidElement(IconComponent) ? (
                                        IconComponent
                                    ) : (
                                        <IconComponent className="w-5 h-5" />
                                    )}
                                </div>
                            )}
                            <div className="min-w-0">
                                {title && (
                                    <h2 
                                        id="acx-modal-title" 
                                        className="text-base sm:text-lg font-bold text-text-primary tracking-tight truncate leading-snug"
                                    >
                                        {title}
                                    </h2>
                                )}
                                {resolvedSubtitle && (
                                    <p 
                                        id="acx-modal-desc" 
                                        className="text-xs text-text-secondary truncate mt-0.5 leading-normal"
                                    >
                                        {resolvedSubtitle}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            {headerActions}
                            {showCloseButton && (
                                <button
                                    type="button"
                                    onClick={() => !isLoading && onClose?.()}
                                    disabled={isLoading}
                                    aria-label="Close dialog"
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-hover active:bg-bg-muted transition-colors border border-transparent hover:border-border-subtle shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Independent Scrollable Content Container */}
                <div className={`p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1 min-h-0 ${bodyClassName}`}>
                    {children}
                </div>

                {/* Footer (Sticky / Fixed) */}
                {footer && (
                    <div className="px-5 py-4 sm:px-6 sm:py-4 bg-bg-muted/30 border-t border-border-subtle flex items-center justify-end gap-3 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );

    if (typeof document !== 'undefined' && document.body) {
        return createPortal(modalContent, document.body);
    }

    return modalContent;
}
