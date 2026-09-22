import React, { useEffect, useState, useRef } from 'react';
import { AlertTriangle, CheckCircle, Info, AlertCircle, X } from 'lucide-react';

const TYPE_CONFIG = {
    success: {
        icon: CheckCircle,
        className: 'text-emerald-500',
        bg: 'bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-500/20 dark:border-emerald-500/30',
        progress: 'bg-emerald-500'
    },
    error: {
        icon: AlertCircle,
        className: 'text-red-500',
        bg: 'bg-red-500/10 border-red-500/20 dark:bg-red-500/20 dark:border-red-500/30',
        progress: 'bg-red-500'
    },
    warning: {
        icon: AlertTriangle,
        className: 'text-amber-500',
        bg: 'bg-amber-500/10 border-amber-500/20 dark:bg-amber-500/20 dark:border-amber-500/30',
        progress: 'bg-amber-500'
    },
    info: {
        icon: Info,
        className: 'text-blue-500',
        bg: 'bg-blue-500/10 border-blue-500/20 dark:bg-blue-500/20 dark:border-blue-500/30',
        progress: 'bg-blue-500'
    }
};

export default function Toast({ id, type, message, duration, onClose }) {
    const [isExiting, setIsExiting] = useState(false);
    const config = TYPE_CONFIG[type] || TYPE_CONFIG.info;
    const Icon = config.icon;
    const progressRef = useRef(null);
    const animationFrameRef = useRef(null);
    const startTimeRef = useRef(null);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => {
            onClose();
        }, 300); // Wait for exit animation
    };

    useEffect(() => {
        let timer;
        if (duration && duration > 0) {
            timer = setTimeout(() => {
                handleClose();
            }, duration);

            // Progress bar animation
            const animateProgress = (timestamp) => {
                if (!startTimeRef.current) startTimeRef.current = timestamp;
                const elapsed = timestamp - startTimeRef.current;
                const remaining = Math.max(0, 1 - (elapsed / duration));
                
                if (progressRef.current) {
                    progressRef.current.style.width = `${remaining * 100}%`;
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
            className={`pointer-events-auto relative overflow-hidden flex items-start gap-3 p-4 rounded-xl shadow-lg border bg-bg-card text-text-primary transition-all duration-300 ease-out will-change-transform ${
                isExiting ? 'opacity-0 translate-x-4' : 'animate-toast-slide-in'
            } ${config.bg}`}
        >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${config.className}`} />
            
            <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-[13px] font-medium leading-snug">{message}</p>
            </div>
            
            <button 
                onClick={handleClose}
                aria-label="Close notification"
                className="shrink-0 p-1 -m-1 rounded-md text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
                <X className="w-4 h-4" />
            </button>

            {/* Progress Line */}
            {duration > 0 && (
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-black/5 dark:bg-white/10">
                    <div 
                        ref={progressRef}
                        className={`h-full w-full ${config.progress}`}
                        style={{ transformOrigin: 'left' }}
                    />
                </div>
            )}
        </div>
    );
}
