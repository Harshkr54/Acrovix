import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTenant } from '../context/TenantContext';
import { useNavigate, useLocation, useParams, Link } from 'react-router-dom';
import { Shield, Mail, Lock, AlertCircle, Loader2, Info, Sun, Moon, Eye, EyeOff, ArrowRight, Building, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import logoLight from '../assets/acrovix_logo1.png';
import logoDark from '../assets/Acrovix_logo.png';

export default function Login() {
    const { slug: routeSlug } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const { tenant, setWorkspaceSlug } = useTenant();
    const { login, user } = useAuth();

    // Determine if workspace is passed via route or query param
    const queryParams = new URLSearchParams(location.search);
    const initialSlug = (routeSlug || queryParams.get('workspace') || queryParams.get('slug') || '').trim().toLowerCase();
    const isWorkspaceLocked = Boolean(routeSlug);

    const [workspaceSlug, setWorkspaceSlugState] = useState(initialSlug);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [inactivityMsg, setInactivityMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showResumePrompt, setShowResumePrompt] = useState(false);
    const [resumePathState, setResumePathState] = useState('');
    const [isExiting, setIsExiting] = useState(false);

    // Inactivity reason handling
    useEffect(() => {
        if (queryParams.get('reason') === 'inactivity') {
            setInactivityMsg('Your session expired due to inactivity. Please sign in again.');
            window.history.replaceState({}, document.title, location.pathname);
        }
    }, [location.search, location.pathname]);

    // Redirect already authenticated users to dashboard
    useEffect(() => {
        if (user && !showResumePrompt && !isExiting) {
            setIsExiting(true);
            setTimeout(() => {
                navigate('/', { replace: true });
            }, 200);
        }
    }, [user, navigate, showResumePrompt, isExiting]);

    // Background warmup ping
    useEffect(() => {
        const healthUrl = API_BASE_URL.replace('/api/admin', '/api/health');
        fetch(healthUrl).catch(() => {});
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
            const result = await login(email, password, workspaceSlug);
            if (result.success) {
                if (setWorkspaceSlug && result.tenantSlug) {
                    setWorkspaceSlug(result.tenantSlug);
                }

                const storedPath = localStorage.getItem('acrovix_resume_path');
                if (validateResumePath(storedPath)) {
                    setResumePathState(storedPath);
                    setShowResumePrompt(true);
                } else {
                    localStorage.removeItem('acrovix_resume_path');
                    setIsExiting(true);
                    setTimeout(() => {
                        navigate('/', { replace: true });
                    }, 200);
                }
            } else {
                setError(result.error || 'Invalid credentials or workspace mismatch. Please try again.');
            }
        } catch (err) {
            setError(err.message || 'An unexpected error occurred during login.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResume = () => {
        localStorage.removeItem('acrovix_resume_path');
        setIsExiting(true);
        setTimeout(() => {
            navigate(resumePathState, { replace: true });
        }, 200);
    };

    const handleStartFresh = () => {
        localStorage.removeItem('acrovix_resume_path');
        setIsExiting(true);
        setTimeout(() => {
            navigate('/', { replace: true });
        }, 200);
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
                        <button onClick={handleResume} className="btn btn-primary flex-1 h-[46px] rounded-xl font-medium transition-colors">
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
            <div className="absolute top-4 right-4 sm:top-5 sm:right-6 z-50 flex items-center bg-bg-card rounded-full p-1 shadow-sm border border-border-subtle">
                <button
                    type="button"
                    onClick={() => theme !== 'light' && toggleTheme()}
                    aria-label="Switch to light mode"
                    className={`p-1.5 sm:p-2 rounded-full transition-colors ${theme === 'light' ? 'bg-bg-muted text-[#F59E0B]' : 'text-text-muted hover:text-text-primary'}`}
                >
                    <Sun className="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onClick={() => theme !== 'dark' && toggleTheme()}
                    aria-label="Switch to dark mode"
                    className={`p-1.5 sm:p-2 rounded-full transition-colors ${theme === 'dark' ? 'bg-bg-muted text-[#2563EB]' : 'text-text-muted hover:text-text-primary'}`}
                >
                    <Moon className="w-4 h-4" />
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex items-center justify-center p-3 sm:p-4 min-h-0">
                <div className="w-full max-w-[430px] md:max-w-[460px] bg-bg-card p-6 sm:p-8 rounded-[24px] border border-border-subtle shadow-sm flex flex-col z-10 relative">
                    
                    {/* Header: Acrovix Innovations SaaS Platform */}
                    <div className="flex flex-col items-center mb-6">
                        <img 
                            id="platformLogo"
                            src={theme === 'dark' ? logoDark : logoLight} 
                            alt="Acrovix Innovations" 
                            width="240"
                            height="52"
                            className="h-9 sm:h-11 w-auto object-contain mb-3"
                        />
                        <h1 id="loginPageTitle" className="text-[20px] sm:text-[22px] font-bold text-text-primary tracking-tight text-center">
                            Acrovix Innovations SaaS Platform
                        </h1>
                        <p id="loginPageTagline" className="mt-1 text-center text-[13px] text-text-secondary">
                            Sign in to your organization's workspace
                        </p>
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        {inactivityMsg && !error && (
                            <div className="flex items-start p-2.5 sm:p-3 bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-xl">
                                <Info className="w-4 h-4 text-[#2563EB] mt-0.5 flex-shrink-0" />
                                <p className="text-[12.5px] sm:text-[13px] text-[#2563EB] font-medium ml-2">{inactivityMsg}</p>
                            </div>
                        )}

                        {error && (
                            <div id="loginErrorMessage" className="flex items-start p-2.5 sm:p-3 bg-brand-danger/10 border border-brand-danger/20 rounded-xl dark:bg-[#7f1d1d]/20 dark:border-[#ef4444]/30">
                                <AlertCircle className="w-4 h-4 text-brand-danger mt-0.5 flex-shrink-0" />
                                <p className="text-[12.5px] sm:text-[13px] text-brand-danger dark:text-[#fca5a5] font-medium ml-2">{error}</p>
                            </div>
                        )}

                        {/* Workspace Slug / Company ID Input */}
                        <div>
                            <div className="flex items-center justify-between mb-1 ml-0.5">
                                <label className="block text-[12px] font-semibold text-text-primary">
                                    Workspace Slug / Company ID
                                </label>
                                <span className="text-[11px] text-text-muted">
                                    {isWorkspaceLocked ? 'Locked by URL' : 'Optional'}
                                </span>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Building className="h-[17px] w-[17px] text-text-muted" />
                                </div>
                                <input
                                    id="workspaceSlugInput"
                                    name="workspaceSlug"
                                    type="text"
                                    disabled={isWorkspaceLocked}
                                    readOnly={isWorkspaceLocked}
                                    className={`w-full pl-10 pr-4 rounded-xl h-[44px] text-[13.5px] bg-bg-main text-text-primary border border-border-subtle focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all placeholder-text-muted ${isWorkspaceLocked ? 'opacity-80 cursor-not-allowed bg-slate-100 dark:bg-bg-hover' : ''}`}
                                    placeholder="e.g. apex or leave blank for platform root"
                                    value={workspaceSlug}
                                    onChange={(e) => setWorkspaceSlugState(e.target.value)}
                                />
                            </div>
                            <p className="text-[11px] text-text-muted mt-1 ml-1">
                                {isWorkspaceLocked 
                                    ? `Direct access locked to workspace: ${workspaceSlug}`
                                    : 'Leave blank to auto-detect your organization from your email.'}
                            </p>
                        </div>

                        {/* Email Address */}
                        <div>
                            <label className="block text-[12px] font-semibold text-text-primary mb-1 ml-0.5">
                                Email address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Mail className="h-[17px] w-[17px] text-text-muted" />
                                </div>
                                <input
                                    id="emailInput"
                                    name="email"
                                    type="email"
                                    required
                                    className="w-full pl-10 pr-4 rounded-xl h-[44px] text-[13.5px] bg-bg-main text-text-primary border border-border-subtle focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all placeholder-text-muted"
                                    placeholder="you@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex items-center justify-between mb-1 ml-0.5">
                                <label className="block text-[12px] font-semibold text-text-primary">Password</label>
                                <Link
                                    to="/forgot-password"
                                    className="text-[11.5px] font-medium text-brand-primary hover:underline transition-colors focus:outline-none"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Lock className="h-[17px] w-[17px] text-text-muted" />
                                </div>
                                <input
                                    id="passwordInput"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="w-full pl-10 pr-10 rounded-xl h-[44px] text-[13.5px] bg-bg-main text-text-primary border border-border-subtle focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all placeholder-text-muted"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-text-primary focus:outline-none"
                                >
                                    {showPassword ? <EyeOff className="h-[17px] w-[17px]" /> : <Eye className="h-[17px] w-[17px]" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            id="signInBtn"
                            type="submit"
                            disabled={isLoading}
                            className="btn btn-primary w-full h-[46px] mt-4 text-[14px] font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm"
                        >
                            {isLoading ? (
                                <Loader2 className="w-[18px] h-[18px] animate-spin" />
                            ) : (
                                <>
                                    <span>Sign In to Workspace</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                        
                        {/* Footer Badge inside card */}
                        <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-border-subtle/50 mt-4">
                            <Shield className="w-3.5 h-3.5 text-text-muted" />
                            <span id="poweredByBadge" className="text-[11.5px] text-text-muted font-medium">
                                Powered by <strong className="text-text-primary font-semibold">Acrovix Innovations</strong>
                            </span>
                        </div>
                    </form>
                </div>
            </div>

            {/* Bottom Footer */}
            <footer className="w-full px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between z-20 text-[11px] text-text-muted gap-2 sm:gap-0 mt-auto shrink-0">
                <div>© {new Date().getFullYear()} Acrovix Innovations Private Limited. All rights reserved.</div>
                <div className="flex gap-4">
                    <Link to="#" className="hover:text-text-primary transition-colors">Privacy Policy</Link>
                    <Link to="#" className="hover:text-text-primary transition-colors">Terms of Service</Link>
                    <Link to="#" className="hover:text-text-primary transition-colors">Platform Support</Link>
                </div>
            </footer>
        </div>
    );
}
