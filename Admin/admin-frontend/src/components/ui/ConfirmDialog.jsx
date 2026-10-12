import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';

export default function ConfirmDialog({
    isOpen,
    title,
    description,
    message,
    onConfirm,
    onCancel,
    confirmText,
    confirmLabel,
    cancelText,
    cancelLabel,
    isLoading = false,
    variant = 'primary', // 'primary' | 'destructive'
}) {
    const dialogRef = useRef(null);
    const dialogDescription = description || message;
    const resolvedConfirmText = confirmText || confirmLabel || 'Confirm';
    const resolvedCancelText = cancelText || cancelLabel || 'Cancel';

    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e) => {
            if (e.key === 'Escape' && !isLoading) {
                onCancel();
            }
        };

        document.addEventListener('keydown', handleEscape);
        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onCancel, isLoading]);

    if (!isOpen) return null;

    const isDestructive = variant === 'destructive';

    const dialogElement = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Full-viewport Backdrop */}
            <div 
                className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
                onClick={() => !isLoading && onCancel()}
                aria-hidden="true"
            />

            {/* Dialog Container */}
            <div 
                ref={dialogRef}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="dialog-title"
                aria-describedby="dialog-description"
                className="relative bg-bg-card rounded-2xl sm:rounded-3xl shadow-xl border border-border-subtle w-full max-w-sm sm:max-w-md overflow-hidden animate-modal-entrance flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] my-auto z-10"
            >
                <div className="p-6 sm:p-8 overflow-y-auto flex-1">
                    <div className="flex items-start gap-4">
                        {isDestructive ? (
                            <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 border border-red-500/20">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                        ) : null}
                        
                        <div className="flex-1 pt-1">
                            <h2 id="dialog-title" className="text-lg font-bold text-text-primary tracking-tight mb-2">
                                {title}
                            </h2>
                            {dialogDescription && (
                                <p id="dialog-description" className="text-[13px] text-text-secondary leading-relaxed">
                                    {dialogDescription}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:p-6 bg-bg-muted/30 border-t border-border-subtle flex flex-col-reverse sm:flex-row sm:justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="btn btn-secondary btn-md w-full sm:w-auto"
                    >
                        {resolvedCancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`btn btn-md w-full sm:w-auto ${isDestructive ? 'btn-danger' : 'btn-primary'}`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Processing...
                            </>
                        ) : (
                            resolvedConfirmText
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    if (typeof document !== 'undefined' && document.body) {
        return createPortal(dialogElement, document.body);
    }

    return dialogElement;
}
