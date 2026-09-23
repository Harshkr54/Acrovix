import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Shield, Mail, Lock, AlertCircle, Loader2, Info } from 'lucide-react';
import { API_BASE_URL } from '../services/api';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [inactivityMsg, setInactivityMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showResumePrompt, setShowResumePrompt] = useState(false);
    const [resumePathState, setResumePathState] = useState('');
    const [isExiting, setIsExiting] = useState(false);
    
    const { login, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Check for reason=inactivity
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        if (queryParams.get('reason') === 'inactivity') {
            setInactivityMsg('Your session expired due to inactivity. Please sign in again.');
            // Clean up the URL to prevent showing it continuously if they refresh
            window.history.replaceState({}, document.title, '/login');
        }
    }, [location.search]);

    // Redirect already authenticated users to dashboard
    useEffect(() => {
        if (user && !showResumePrompt && !isExiting) {
            setIsExiting(true);
            setTimeout(() => {
                navigate('/', { replace: true });
            }, 250);
        }
    }, [user, navigate, showResumePrompt, isExiting]);

    // Fire-and-forget warm-up ping: wakes the Render backend while the admin
    // is reading the login form, giving the JVM a head start before login.
    // Uses the public /api/health endpoint — no auth required, result ignored.
    useEffect(() => {
        const healthUrl = API_BASE_URL.replace('/api/admin', '/api/health');
        fetch(healthUrl).catch(() => {/* intentionally ignored */});
    }, []);

    const validateResumePath = (path) => {
        if (!path || typeof path !== 'string') return false;
        if (!path.startsWith('/')) return false;
        if (path.startsWith('//')) return false;
        if (path.includes('login')) return false;
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setInactivityMsg('');
        setIsLoading(true);
        try {
            const success = await login(email, password);
            if (success) {
                const storedPath = localStorage.getItem('acrovix_resume_path');
                if (validateResumePath(storedPath)) {
                    setResumePathState(storedPath);
                    setShowResumePrompt(true);
                } else {
                    localStorage.removeItem('acrovix_resume_path');
                    setIsExiting(true);
                    setTimeout(() => {
                        navigate('/', { replace: true });
                    }, 250);
                }
            } else {
                setError('Invalid email or password. Please try again.');
            }
        } catch (err) {
            setError('An error occurred during login.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResume = () => {
        localStorage.removeItem('acrovix_resume_path');
        setIsExiting(true);
        setTimeout(() => {
            navigate(resumePathState, { replace: true });
        }, 250);
    };

    const handleStartFresh = () => {
        localStorage.removeItem('acrovix_resume_path');
        setIsExiting(true);
        setTimeout(() => {
            navigate('/', { replace: true });
        }, 250);
    };

    if (showResumePrompt) {
        return (
            <div className={`min-h-screen flex items-center justify-center bg-bg-main p-4 relative overflow-hidden ${isExiting ? 'animate-page-exit' : 'animate-page-entrance'}`}>
                <div className="max-w-md w-full bg-bg-card p-8 rounded-[24px] shadow-xl border border-border-subtle relative z-10 text-center animate-fade-in-up">
                    <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Info className="w-8 h-8 text-brand-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-text-primary mb-2">Resume previous work?</h3>
                    <p className="text-sm text-text-secondary mb-8">
                        You were working on another page before your session expired.
                    </p>
                    <div className="flex gap-3">
                        <button onClick={handleStartFresh} className="flex-1 btn bg-bg-main border border-border-subtle hover:bg-bg-hover text-text-secondary">
                            Start Fresh
                        </button>
                        <button onClick={handleResume} className="flex-1 btn btn-primary">
                            Resume
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen flex items-center justify-center bg-bg-main p-4 relative overflow-hidden ${isExiting ? 'animate-page-exit' : 'animate-page-entrance'}`}>
            {/* Subtle background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-[#14B8A6]/10 blur-[120px]" />
                <div className="absolute bottom-[10%] -right-[10%] w-[30%] h-[30%] rounded-full bg-[var(--color-brand-primary)]/10 blur-[100px]" />
            </div>

            <div className="max-w-md w-full space-y-8 bg-bg-card p-8 sm:p-12 rounded-[32px] shadow-xl border border-border-subtle relative z-10">
                <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-bg-main rounded-[24px] flex items-center justify-center border border-border-subtle shadow-sm mb-6">
                        <Shield className="w-10 h-10 text-brand-teal" />
                    </div>
                    <h2 className="text-center text-[32px] font-bold tracking-tight text-text-primary leading-tight">ACROVIX</h2>
                    <p className="mt-1 text-center text-[11px] text-text-muted font-bold tracking-widest uppercase">
                        Admin Portal
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {inactivityMsg && !error && (
                        <div className="flex items-start p-4 bg-brand-primary/10 border border-brand-primary/20 rounded-xl">
                            <Info className="w-5 h-5 text-brand-primary mt-0.5 flex-shrink-0" />
                            <p className="text-[13px] text-brand-primary font-semibold ml-2">{inactivityMsg}</p>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-start p-4 bg-brand-danger/10 border border-brand-danger/30 rounded-xl dark:bg-[#7f1d1d]/20 dark:border-[#ef4444]/30">
                            <AlertCircle className="w-5 h-5 text-brand-danger mt-0.5 flex-shrink-0" />
                            <p className="text-[13px] text-[#991b1b] dark:text-[#fca5a5] font-semibold ml-2">{error}</p>
                        </div>
                    )}
                    
                    <div className="space-y-5">
                        <div>
                            <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2 ml-1">Email Address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-text-muted" />
                                </div>
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    className="acx-input pl-11 rounded-xl h-12 text-[13px] bg-bg-main"
                                    placeholder="admin@acrovix.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2 ml-1">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-text-muted" />
                                </div>
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    className="acx-input pl-11 rounded-xl h-12 text-[13px] bg-bg-main"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end mt-2">
                                <Link 
                                    to="/forgot-password" 
                                    className="text-[12px] font-semibold text-brand-primary hover:text-brand-primary-hover transition-colors focus:outline-none focus:underline"
                                >
                                    Forgot Password?
                                </Link>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="btn btn-primary btn-lg w-full mt-8"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
