import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Shield, Mail, Lock, AlertCircle, Loader2, Info, Sun, Moon, Eye, EyeOff, ArrowRight, BarChart3, Users, ShieldCheck, Crown, User } from 'lucide-react';
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
                    <div className="w-16 h-16 bg-[#2563EB]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Info className="w-8 h-8 text-[#2563EB]" />
                    </div>
                    <h3 className="text-xl font-bold text-text-primary mb-2">Resume previous work?</h3>
                    <p className="text-sm text-text-secondary mb-8">
                        You were working on another page before your session expired.
                    </p>
                    <div className="flex gap-3">
                        <button onClick={handleStartFresh} className="flex-1 btn bg-bg-main border border-border-subtle hover:bg-bg-hover text-text-secondary">
                            Start Fresh
                        </button>
                        <button onClick={handleResume} className="flex-1 btn bg-[#2563EB] hover:bg-[#1d4ed8] text-white">
                            Resume
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`h-[100dvh] min-h-[100dvh] w-full flex bg-bg-main relative overflow-hidden pb-16 ${isExiting ? 'animate-page-exit' : 'animate-page-entrance'}`}>
            {/* Theme Toggle Top Right */}
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

            {/* Left Marketing Area (Hidden on Mobile/Tablet) */}
            <div className="hidden lg:flex flex-col justify-center w-[45%] max-w-[600px] pl-[8%] pr-8 z-10 relative">
                <div className="mb-4 flex items-center gap-2">
                    <div className="w-6 h-[2px] bg-[#2563EB]"></div>
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">SYNC | SCALE | SUCCEED</span>
                </div>
                
                <h1 className="text-[42px] xl:text-[56px] font-bold text-text-primary leading-[1.1] mb-6 tracking-tight">
                    Powering<br/>Your Business<br/>Forward
                </h1>
                
                <p className="text-[15px] text-text-secondary leading-relaxed max-w-[400px] mb-12">
                    Smart solutions for a connected tomorrow. Manage, collaborate, and grow with Acrovix.
                </p>

                <div className="space-y-8">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-[#2563EB]/5 flex items-center justify-center border border-[#2563EB]/10 shadow-sm flex-shrink-0">
                            <BarChart3 className="w-5 h-5 text-[#2563EB]" />
                        </div>
                        <div>
                            <h4 className="text-[14px] font-bold text-text-primary mb-0.5">Manage Operations</h4>
                            <p className="text-[12px] text-text-muted">All in one place</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-[#2563EB]/5 flex items-center justify-center border border-[#2563EB]/10 shadow-sm flex-shrink-0">
                            <Users className="w-5 h-5 text-[#2563EB]" />
                        </div>
                        <div>
                            <h4 className="text-[14px] font-bold text-text-primary mb-0.5">Empower Your Team</h4>
                            <p className="text-[12px] text-text-muted">Work smarter</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-[#2563EB]/5 flex items-center justify-center border border-[#2563EB]/10 shadow-sm flex-shrink-0">
                            <ShieldCheck className="w-5 h-5 text-[#2563EB]" />
                        </div>
                        <div>
                            <h4 className="text-[14px] font-bold text-text-primary mb-0.5">Build a Secure Future</h4>
                            <p className="text-[12px] text-text-muted">Reliable and scalable</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Abstract Visual (Desktop Only) */}
            <div className="hidden lg:block absolute top-0 right-0 w-[55%] h-full z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 right-[-10%] transform -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-[#2563EB]/5 to-transparent blur-[80px]"></div>
                <div className="absolute top-[20%] right-[10%] w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-[#14B8A6]/5 to-transparent blur-[60px]"></div>
                
                {/* Simulated building/grid abstract visual */}
                <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-[400px] h-[500px] opacity-[0.03] dark:opacity-[0.05]" 
                     style={{ 
                        backgroundImage: 'linear-gradient(var(--theme-text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--theme-text-primary) 1px, transparent 1px)',
                        backgroundSize: '40px 40px',
                        transform: 'perspective(1000px) rotateY(-30deg) translateY(-50%)'
                     }}>
                </div>

                <div className="absolute bottom-28 right-24 flex flex-col items-start pointer-events-auto">
                    <div className="w-8 h-[2px] bg-[#2563EB] mb-4"></div>
                    <span className="text-[18px] font-light tracking-[0.2em] text-text-secondary leading-loose">
                        Technology<br/>People<br/>Progress
                    </span>
                </div>
            </div>

            {/* Center/Right Card Area */}
            <div className="flex-1 flex flex-col justify-center items-center lg:items-start lg:pl-16 relative z-10 w-full px-4 pt-12 pb-16">
                <div className="w-full max-w-[520px] bg-bg-card p-8 sm:p-12 rounded-[32px] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.05)] border border-border-subtle backdrop-blur-sm mx-auto lg:mx-0 relative">
                    
                    {/* Header */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 bg-[#ECFEFF] dark:bg-[#0f2e2e] rounded-[20px] flex items-center justify-center border border-[#CCFBF1] dark:border-[#115e59] shadow-sm mb-5">
                            <Shield className="w-8 h-8 text-[#0D9488]" strokeWidth={2.5} />
                        </div>
                        <h2 className="text-center text-[28px] font-extrabold tracking-tight text-text-primary leading-tight">ACROVIX</h2>
                        <p className="mt-1 text-center text-[10px] text-text-muted font-bold tracking-[0.2em] uppercase">
                            Admin Portal
                        </p>
                    </div>

                    {/* Mode Selector */}
                    <div className="flex p-1 bg-bg-muted rounded-xl mb-8 border border-border-subtle relative">
                        <button
                            type="button"
                            onClick={() => setLoginMode('admin')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200 z-10 ${
                                loginMode === 'admin' 
                                    ? 'bg-[#2563EB] text-white shadow-md' 
                                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                            }`}
                        >
                            <Crown className="w-4 h-4" />
                            Admin Login
                        </button>
                        <button
                            type="button"
                            onClick={() => setLoginMode('user')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200 z-10 ${
                                loginMode === 'user' 
                                    ? 'bg-[#2563EB] text-white shadow-md' 
                                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                            }`}
                        >
                            <User className="w-4 h-4" />
                            User Login
                        </button>
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {inactivityMsg && !error && (
                            <div className="flex items-start p-4 bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-xl">
                                <Info className="w-5 h-5 text-[#2563EB] mt-0.5 flex-shrink-0" />
                                <p className="text-[13px] text-[#2563EB] font-semibold ml-2">{inactivityMsg}</p>
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
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.1em] mb-2 ml-1">Email Address</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-text-muted" />
                                    </div>
                                    <input
                                        name="email"
                                        type="email"
                                        required
                                        className="w-full pl-11 pr-4 rounded-xl h-12 text-[14px] bg-[#F3F7FA] text-[#0B192C] dark:bg-[#102936] dark:text-[#F8FAFC] border border-border-subtle focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none transition-all placeholder-[#64748b] dark:placeholder-[#94a3b8]"
                                        placeholder="admin@acrovix.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.1em] mb-2 ml-1">Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-text-muted" />
                                    </div>
                                    <input
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        className="w-full pl-11 pr-11 rounded-xl h-12 text-[14px] bg-[#F3F7FA] text-[#0B192C] dark:bg-[#102936] dark:text-[#F8FAFC] border border-border-subtle focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none transition-all placeholder-[#64748b] dark:placeholder-[#94a3b8]"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-muted hover:text-text-primary focus:outline-none"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                <div className="flex justify-end mt-2">
                                    <Link 
                                        to="/forgot-password" 
                                        className="text-[12px] font-semibold text-[#2563EB] hover:text-[#1d4ed8] transition-colors focus:outline-none focus:underline"
                                    >
                                        Forgot Password?
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 mt-8 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 dark:focus:ring-offset-bg-main"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                        
                        <div className="flex items-center gap-4 mt-8 mb-4">
                            <div className="h-[1px] flex-1 bg-border-subtle"></div>
                            <span className="text-[12px] text-text-muted font-medium px-2">or</span>
                            <div className="h-[1px] flex-1 bg-border-subtle"></div>
                        </div>
                        
                        <p className="text-center text-[13px] text-text-secondary font-medium pb-2">
                            Secure Access to a Smarter Workspace
                        </p>
                    </form>
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 w-full p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between z-20 text-[11px] text-text-muted bg-bg-main/50 backdrop-blur-md border-t border-border-subtle/50 gap-2 sm:gap-0">
                <div>© 2026 Acrovix Innovations Private Limited. All rights reserved.</div>
                <div className="flex gap-4 font-medium">
                    <Link to="#" className="hover:text-text-primary transition-colors">Privacy Policy</Link>
                    <span className="opacity-50">|</span>
                    <Link to="#" className="hover:text-text-primary transition-colors">Terms of Service</Link>
                    <span className="opacity-50">|</span>
                    <Link to="#" className="hover:text-text-primary transition-colors">Support</Link>
                </div>
            </div>
        </div>
    );
}
