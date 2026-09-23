import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Timer, LogOut } from 'lucide-react';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const WARNING_TIMEOUT_MS = 27 * 60 * 1000;
const THROTTLE_MS = 2000;
const CHECK_INTERVAL_MS = 5000;

export default function SessionManager({ children }) {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [showWarning, setShowWarning] = useState(false);
    const [displayTimeLeft, setDisplayTimeLeft] = useState(0);
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
                // displayTimeLeft is handled by the smooth timer effect
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

    // Smooth countdown for warning modal
    useEffect(() => {
        if (!showWarning) return;

        const updateTimer = () => {
            const raw = localStorage.getItem('acrovix_last_activity');
            const storedTime = parseInt(raw, 10);
            if (!raw || isNaN(storedTime)) return;

            const expirationTimestamp = storedTime + IDLE_TIMEOUT_MS;
            const remainingMs = expirationTimestamp - Date.now();
            
            setDisplayTimeLeft(Math.max(0, remainingMs));
        };

        updateTimer();
        const intervalId = setInterval(updateTimer, 1000);
        
        return () => clearInterval(intervalId);
    }, [showWarning]);

    const handleContinueSession = () => {
        const now = Date.now();
        lastActivityRef.current = now;
        localStorage.setItem('acrovix_last_activity', now.toString());
        setShowWarning(false);
    };

    const handleLogout = () => {
        setShowWarning(false);
        logout();
        navigate('/login');
    };

    const formatTime = (ms) => {
        if (ms <= 0) return '00:00';
        const totalSeconds = Math.ceil(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    // Do not render session management UI if unauthenticated
    if (!localStorage.getItem('adminToken') && !user) {
        return <>{children}</>;
    }

    return (
        <>
            {children}

            {showWarning && (
                <div className="fixed inset-0 bg-text-primary/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-bg-card border border-border-subtle rounded-2xl shadow-xl w-full max-w-sm p-8 flex flex-col items-center text-center animate-modal-entrance">
                        <div className="w-14 h-14 bg-brand-primary/10 border border-brand-primary/20 rounded-full flex items-center justify-center mb-6">
                            <Timer className="w-7 h-7 text-brand-primary" />
                        </div>
                        
                        <h3 className="text-[20px] font-bold text-text-primary mb-2 tracking-tight">
                            Session Expiring Soon
                        </h3>
                        
                        <p className="text-[14px] text-text-secondary leading-relaxed mb-6">
                            You have been inactive for a while.<br/>Your session will expire in
                        </p>
                        
                        <div className="text-[42px] font-bold text-text-primary mb-6 font-mono tracking-tight tabular-nums leading-none">
                            {formatTime(displayTimeLeft)}
                        </div>
                        
                        <p className="text-[13px] text-text-muted mb-8">
                            Please continue working to stay signed in.
                        </p>

                        <div className="w-full flex flex-col space-y-3">
                            <button
                                onClick={handleContinueSession}
                                className="btn btn-primary w-full h-11 text-[14px] font-bold"
                            >
                                Continue Session
                            </button>
                            <button
                                onClick={handleLogout}
                                className="btn btn-ghost w-full h-11 text-[14px] font-bold text-text-secondary hover:text-text-primary"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
