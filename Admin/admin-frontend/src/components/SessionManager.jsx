import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle } from 'lucide-react';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const WARNING_TIMEOUT_MS = 27 * 60 * 1000;
const THROTTLE_MS = 2000;
const CHECK_INTERVAL_MS = 5000;

export default function SessionManager({ children }) {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [showWarning, setShowWarning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const lastActivityRef = useRef(Date.now());

    // Initialize activity on mount
    useEffect(() => {
        const raw = localStorage.getItem('acrovix_last_activity');
        const parsed = parseInt(raw, 10);
        const now = Date.now();
        
        // If missing, invalid, negative, or inexplicably in the future
        if (!raw || isNaN(parsed) || parsed <= 0 || parsed > now + 60000) {
            localStorage.setItem('acrovix_last_activity', now.toString());
            lastActivityRef.current = now;
        } else {
            lastActivityRef.current = parsed;
        }
    }, []);

    // Activity tracking (Throttled)
    useEffect(() => {
        const handleActivity = () => {
            const now = Date.now();
            if (now - lastActivityRef.current > THROTTLE_MS) {
                lastActivityRef.current = now;
                localStorage.setItem('acrovix_last_activity', now.toString());
                
                // If warning is showing and user acts (e.g. types), we might want to auto-dismiss,
                // but the prompt says "When the user clicks: Continue Session ... close the warning modal".
                // So genuine activity outside the modal might not auto-dismiss it if it's already open,
                // or maybe it should? It's better to force them to click "Continue Session" if the modal is up,
                // to explicitly acknowledge. However, if they just move the mouse, we update the timestamp.
                // Wait, if the modal is open, we can just hide it since they are active.
                if (showWarning) {
                    setShowWarning(false);
                }
            }
        };

        const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
        events.forEach(event => document.addEventListener(event, handleActivity, { passive: true }));

        return () => {
            events.forEach(event => document.removeEventListener(event, handleActivity));
        };
    }, [showWarning]);

    // Timer check interval
    useEffect(() => {
        const intervalId = setInterval(() => {
            // Defensive: if we are no longer authenticated, don't run logout timers
            if (!localStorage.getItem('adminToken')) {
                clearInterval(intervalId);
                return;
            }

            const raw = localStorage.getItem('acrovix_last_activity');
            let storedTime = parseInt(raw, 10);
            const now = Date.now();

            // Recover from corrupted storage state rather than crashing/logging out
            if (!raw || isNaN(storedTime) || storedTime <= 0 || storedTime > now + 60000) {
                storedTime = now;
                localStorage.setItem('acrovix_last_activity', storedTime.toString());
                lastActivityRef.current = storedTime;
            }

            const elapsed = now - storedTime;

            if (elapsed >= IDLE_TIMEOUT_MS) {
                // Inactivity Logout
                clearInterval(intervalId);
                // Save safe route for resume
                if (location.pathname !== '/login' && location.pathname !== '/') {
                    localStorage.setItem('acrovix_resume_path', location.pathname + location.search);
                }
                logout();
                navigate('/login?reason=inactivity');
            } else if (elapsed >= WARNING_TIMEOUT_MS) {
                setShowWarning(true);
                setTimeLeft(IDLE_TIMEOUT_MS - elapsed);
            } else {
                setShowWarning(false);
            }
        }, CHECK_INTERVAL_MS);

        return () => clearInterval(intervalId);
    }, [location, logout, navigate]);

    // Multi-tab sync for logout
    useEffect(() => {
        const handleStorage = (e) => {
            if (e.key === 'adminToken' && !e.newValue) {
                // Token removed by another tab (e.g., manual logout or its own inactivity logout)
                navigate('/login');
            }
            if (e.key === 'acrovix_last_activity' && e.newValue) {
                // Another tab registered activity, update our ref defensively
                const parsed = parseInt(e.newValue, 10);
                const now = Date.now();
                if (!isNaN(parsed) && parsed > 0 && parsed <= now + 60000) {
                    lastActivityRef.current = parsed;
                    const elapsed = now - parsed;
                    if (elapsed < WARNING_TIMEOUT_MS) {
                        setShowWarning(false);
                    }
                }
            }
        };

        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [navigate]);

    const handleContinueSession = () => {
        const now = Date.now();
        lastActivityRef.current = now;
        localStorage.setItem('acrovix_last_activity', now.toString());
        setShowWarning(false);
    };

    const formatTime = (ms) => {
        if (ms <= 0) return '0:00';
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Do not render session management UI if unauthenticated
    if (!localStorage.getItem('adminToken') && !user) {
        return <>{children}</>;
    }

    return (
        <>
            {children}

            {showWarning && (
                <div className="fixed inset-0 bg-text-primary/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in-up">
                    <div className="bg-bg-card border border-border-subtle rounded-2xl shadow-xl w-full max-w-md p-6 overflow-hidden">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-brand-warning/10 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="w-8 h-8 text-brand-warning" />
                            </div>
                            <h3 className="text-xl font-bold text-text-primary mb-2">
                                Your session is about to expire
                            </h3>
                            <p className="text-sm text-text-secondary mb-6">
                                You have been inactive for a while. For security, you will be logged out soon.
                            </p>
                            
                            <div className="text-2xl font-bold text-text-primary mb-8 font-mono">
                                Expires in {formatTime(timeLeft)}
                            </div>

                            <button
                                onClick={handleContinueSession}
                                className="btn btn-primary w-full h-12 text-sm"
                            >
                                Continue Session
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
