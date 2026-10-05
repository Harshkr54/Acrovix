import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Shield, Mail, Lock, AlertCircle, Loader2, Info, Sun, Moon, Eye, EyeOff, ArrowRight, Crown, User } from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import logoLight from '../assets/acrovix_logo1.png';
import logoDark from '../assets/Acrovix_logo.png';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [inactivityMsg, setInactivityMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showResumePrompt, setShowResumePrompt] = useState(false);
    const [resumePathState, setResumePathState] = useState('');
    const [isExiting, setIsExiting] = useState(false);

    const { theme, toggleTheme } = useTheme();
    const [showPassword, setShowPassword] = useState(false);
    const [loginMode, setLoginMode] = useState('admin');

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
        fetch(healthUrl).catch(() => {/* intentionally ignored */ });
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
            <div className={`min-h-[100dvh] flex items-center justify-center bg-bg-main p-4 relative overflow-hidden ${isExiting ? 'animate-page-exit' : 'animate-page-entrance'}`}>
                <div className="w-full max-w-[420px] md:max-w-[460px] bg-bg-card p-8 sm:p-10 rounded-[20px] border border-border-subtle shadow-sm flex flex-col z-10 relative">
                    <div className="w-14 h-14 bg-[#2563EB]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Info className="w-7 h-7 text-[#2563EB]" />
                    </div>
                    <h3 className="text-[22px] font-bold text-text-primary tracking-tight mb-2 text-center">Resume previous work?</h3>
                    <p className="text-[14px] text-text-secondary mb-8 text-center">
                        You were working on another page before your session expired.
                    </p>
                    <div className="flex gap-3 w-full">
                        <button onClick={handleStartFresh} className="flex-1 h-[46px] rounded-xl font-medium bg-bg-main border border-border-subtle hover:bg-bg-hover text-text-secondary transition-colors">
                            Start Fresh
                        </button>
                        <button onClick={handleResume} className="flex-1 h-[46px] rounded-xl font-medium bg-[#2563EB] hover:bg-[#1d4ed8] text-white transition-colors">
                            Resume
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-[100dvh] w-full flex flex-col relative bg-bg-main ${isExiting ? 'animate-page-exit' : 'animate-page-entrance'}`}>
            
            {/* Theme Toggle */}
            <div className="absolute top-6 right-6 z-50 flex items-center bg-bg-card rounded-full p-1 shadow-sm border border-border-subtle">
                <button
                    type="button"
                    onClick={() => theme !== 'light' && toggleTheme()}
                    className={`p-2 rounded-full transition-colors ${theme === 'light' ? 'bg-bg-muted text-[#F59E0B]' : 'text-text-muted hover:text-text-primary'}`}
                >
                    <Sun className="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onClick={() => theme !== 'dark' && toggleTheme()}
                    className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'bg-bg-muted text-[#2563EB]' : 'text-text-muted hover:text-text-primary'}`}
                >
                    <Moon className="w-4 h-4" />
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-[420px] md:max-w-[460px] bg-bg-card p-8 sm:p-10 rounded-[20px] border border-border-subtle shadow-sm flex flex-col z-10 relative mt-[2vh]">
                    
                    {/* Header */}
                    <div className="flex flex-col items-center mb-8">
                        <img 
                            src={theme === 'dark' ? logoDark : logoLight} 
                            alt="Acrovix" 
                            className="h-9 sm:h-14 w-auto object-contain mb-6"
                        />
                        <h2 className="text-[24px] sm:text-[26px] font-bold text-text-primary tracking-tight">Welcome back 👋</h2>
                        <p className="mt-1.5 text-center text-[14px] text-text-secondary">
                            Sign in to manage your ACROVIX workspace.
                        </p>
                    </div>

                    {/* Mode Selector */}
                    <div className="flex p-1 bg-bg-main rounded-xl mb-6 border border-border-subtle">
                        <button
                            type="button"
                            onClick={() => setLoginMode('admin')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 ${loginMode === 'admin'
                                    ? 'bg-[#2563EB] text-white shadow-sm'
                                    : 'text-text-secondary hover:text-text-primary'
                                }`}
                        >
                            <Crown className="w-4 h-4" />
                            Admin Login
                        </button>
                        <button
                            type="button"
                            onClick={() => setLoginMode('user')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 ${loginMode === 'user'
                                    ? 'bg-[#2563EB] text-white shadow-sm'
                                    : 'text-text-secondary hover:text-text-primary'
                                }`}
                        >
                            <User className="w-4 h-4" />
                            User Login
                        </button>
                    </div>

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        {inactivityMsg && !error && (
                            <div className="flex items-start p-3 bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-xl">
                                <Info className="w-4 h-4 text-[#2563EB] mt-0.5 flex-shrink-0" />
                                <p className="text-[13px] text-[#2563EB] font-medium ml-2">{inactivityMsg}</p>
                            </div>
                        )}

                        {error && (
                            <div className="flex items-start p-3 bg-brand-danger/10 border border-brand-danger/20 rounded-xl dark:bg-[#7f1d1d]/20 dark:border-[#ef4444]/30">
                                <AlertCircle className="w-4 h-4 text-brand-danger mt-0.5 flex-shrink-0" />
                                <p className="text-[13px] text-brand-danger dark:text-[#fca5a5] font-medium ml-2">{error}</p>
                            </div>
                        )}

                        <div>
                            <label className="block text-[13px] font-semibold text-text-primary mb-1.5 ml-0.5">Email address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Mail className="h-[18px] w-[18px] text-text-muted" />
                                </div>
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    className="w-full pl-10 pr-4 rounded-xl h-[50px] text-[14px] bg-bg-main text-text-primary border border-border-subtle focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none transition-all placeholder-text-muted"
                                    placeholder="admin@acrovix.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[13px] font-semibold text-text-primary mb-1.5 ml-0.5">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Lock className="h-[18px] w-[18px] text-text-muted" />
                                </div>
                                <input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="w-full pl-10 pr-10 rounded-xl h-[50px] text-[14px] bg-bg-main text-text-primary border border-border-subtle focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none transition-all placeholder-text-muted"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-text-primary focus:outline-none"
                                >
                                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                                </button>
                            </div>
                            <div className="flex justify-end mt-2">
                                <Link
                                    to="/forgot-password"
                                    className="text-[12.5px] font-medium text-[#2563EB] hover:text-[#1d4ed8] transition-colors focus:outline-none"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-[50px] mt-6 bg-[#2563EB] hover:bg-[#1d4ed8] disabled:opacity-70 text-white font-medium text-[15px] rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 dark:focus:ring-offset-bg-main"
                        >
                            {isLoading ? (
                                <Loader2 className="w-[18px] h-[18px] animate-spin" />
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight className="w-[18px] h-[18px]" />
                                </>
                            )}
                        </button>
                        
                        <div className="flex items-center justify-center gap-1.5 mt-5 pt-1">
                            <Shield className="w-3.5 h-3.5 text-text-muted" />
                            <p className="text-[12px] text-text-muted">
                                Secure access to your ACROVIX workspace
                            </p>
                        </div>
                    </form>
                </div>
            </div>

            {/* Footer */}
            <div className="w-full px-6 py-5 flex flex-col sm:flex-row items-center justify-between z-20 text-[11px] text-text-muted gap-3 sm:gap-0 mt-auto">
                <div>© 2026 Acrovix Innovations Private Limited</div>
                <div className="flex gap-4">
                    <Link to="#" className="hover:text-text-primary transition-colors">Privacy Policy</Link>
                    <Link to="#" className="hover:text-text-primary transition-colors">Terms of Service</Link>
                    <Link to="#" className="hover:text-text-primary transition-colors">Support</Link>
                </div>
            </div>

        </div>
    );
}
