import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import Toast from '../components/ui/Toast';

const ToastContext = createContext(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback(({ type = 'info', message, duration = 4000 }) => {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        
        setToasts(prevToasts => {
            // Check for duplicates within the last few moments to prevent spam
            const isDuplicate = prevToasts.some(t => t.message === message && t.type === type);
            if (isDuplicate) return prevToasts;

            const newToast = { id, type, message, duration };
            const updated = [...prevToasts, newToast];
            // Enforce max 3 toasts
            if (updated.length > 3) {
                return updated.slice(updated.length - 3);
            }
            return updated;
        });
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    useEffect(() => {
        const handleGlobalToast = (e) => {
            if (e.detail && e.detail.message) {
                showToast({
                    type: e.detail.type || 'error',
                    message: e.detail.message,
                    duration: e.detail.duration || 4000
                });
            }
        };

        window.addEventListener('acrovix-toast', handleGlobalToast);
        return () => window.removeEventListener('acrovix-toast', handleGlobalToast);
    }, [showToast]);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* Toast Container */}
            <div className="fixed top-4 left-4 right-4 md:top-6 md:left-auto md:right-6 z-[9999] flex flex-col gap-3 pointer-events-none md:w-[380px]">
                {toasts.map(toast => (
                    <Toast
                        key={toast.id}
                        id={toast.id}
                        type={toast.type}
                        message={toast.message}
                        duration={toast.duration}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
};
