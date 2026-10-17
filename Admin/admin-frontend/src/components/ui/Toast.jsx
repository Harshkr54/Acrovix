import React, { useEffect, useState, useRef } from 'react';
import { AlertTriangle, CheckCircle, Info, AlertCircle, X } from 'lucide-react';

const TYPE_CONFIG = {
    success: {
        icon: CheckCircle,
        iconCls: 'text-emerald-500',
        containerCls: 'bg-bg-card border-emerald-200/60 dark:border-emerald-800/40',
        progressCls: 'bg-emerald-500',
        labelCls: 'text-emerald-700 dark:text-emerald-400',
    },
    error: {
        icon: AlertCircle,
        iconCls: 'text-rose-500',
        containerCls: 'bg-bg-card border-rose-200/60 dark:border-rose-800/40',
        progressCls: 'bg-rose-500',
        labelCls: 'text-rose-700 dark:text-rose-400',
    },
    warning: {
        icon: AlertTriangle,
        iconCls: 'text-amber-500',
        containerCls: 'bg-bg-card border-amber-200/60 dark:border-amber-800/40',
        progressCls: 'bg-amber-500',
        labelCls: 'text-amber-700 dark:text-amber-400',
    },
    info: {
        icon: Info,
        iconCls: 'text-blue-500',
        containerCls: 'bg-bg-card border-blue-200/60 dark:border-blue-800/40',
        progressCls: 'bg-blue-500',
        labelCls: 'text-blue-700 dark:text-blue-400',
    },
};

export default function Toast({ id, type, message, title, duration = 4000, onClose }) {
    const [isExiting, setIsExiting] = useState(false);
    const config = TYPE_CONFIG[type] || TYPE_CONFIG.info;
    const Icon = config.icon;
    const progressRef = useRef(null);
    const animationFrameRef = useRef(null);
    const startTimeRef = useRef(null);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => { onClose(); }, 300);
    };

    useEffect(() => {
        let timer;
        if (duration && duration > 0) {
            timer = setTimeout(() => { handleClose(); }, duration);

            const animateProgress = (timestamp) => {
                if (!startTimeRef.current) startTimeRef.current = timestamp;
                const elapsed = timestamp - startTimeRef.current;
                const remaining = Math.max(0, 1 - (elapsed / duration));
                if (progressRef.current) {
                    progressRef.current.style.transform = `scaleX(${remaining})`;
                }
                if (elapsed < duration) {
                    animationFrameRef.current = requestAnimationFrame(animateProgress);
                }
            };
            animationFrameRef.current = requestAnimationFrame(animateProgress);
        }
        return () => {
            if (timer) clearTimeout(timer);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [duration]);

    return (
        <div
            role={type === 'error' ? 'alert' : 'status'}
            aria-live={type === 'error' ? 'assertive' : 'polite'}
            className={`pointer-events-auto relative overflow-hidden w-[340px] max-w-[calc(100vw-32px)] rounded-2xl border shadow-[0_8px_30px_rgba(0,0,0,0.12),0_1px_4px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out will-change-transform ${
                isExiting ? 'animate-toast-fade-out' : 'animate-toast-slide-in'
            } ${config.containerCls}`}
        >
            <div className="flex items-start gap-3 p-4">
                {/* Icon container */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${config.iconCls} bg-current/10`}>
                    <Icon className={`w-4 h-4 ${config.iconCls}`} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0 pt-0.5">
                    {title && (
                        <p className={`text-[13px] font-bold leading-snug ${config.labelCls}`}>{title}</p>
                    )}
                    <p className={`text-[13px] leading-snug ${title ? 'text-text-secondary mt-0.5' : 'font-medium text-text-primary'}`}>
                        {message}
                    </p>
                </div>

                {/* Close */}
                <button
                    onClick={handleClose}
                    aria-label="Dismiss notification"
                    className="shrink-0 p-1 -mt-0.5 -mr-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Progress countdown bar */}
            {duration > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-bg-muted">
                    <div
                        ref={progressRef}
                        className={`h-full w-full origin-left ${config.progressCls}`}
                        style={{ transform: 'scaleX(1)', transition: 'none' }}
                    />
                </div>
            )}
        </div>
    );
}
