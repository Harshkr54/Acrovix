import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useTenant } from '../context/TenantContext';
import logoLight from '../assets/acrovix_logo1.png';
import logoDark from '../assets/Acrovix_logo.png';
import { Lock, Loader2, ArrowRight, ArrowLeft, Sun, Moon, Shield, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

const ResetPassword = () => {
    const { tenant } = useTenant();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        if (!token) {
            setErrorMsg("Password reset link is invalid or has expired.");
        }
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!token) {
            setErrorMsg("Password reset link is invalid or has expired.");
            return;
        }

        if (newPassword.length < 8) {
            setErrorMsg('Password must be at least 8 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setErrorMsg('Passwords do not match.');
            return;
        }

        setIsLoading(true);
        setErrorMsg(null);
        try {
            await resetPassword({ token, newPassword, confirmPassword });
            setIsSuccess(true);
        } catch (error) {
            const message = error.message || 'Password reset link is invalid or has expired.';
            setErrorMsg(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] w-full flex flex-col relative bg-bg-main">
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
                <div className="w-full max-w-[420px] md:max-w-[450px] bg-bg-card p-6 sm:p-8 rounded-[20px] border border-border-subtle shadow-sm flex flex-col z-10 relative">
                    
                    {/* Header */}
                    <div className="flex flex-col items-center mb-5 sm:mb-6">
                        <img 
                            src={tenant?.logoUrl || (theme === 'dark' ? logoDark : logoLight)} 
                            alt={tenant?.brandName || "Workspace"} 
                            width="250"
                            height="56"
                            className="h-8 sm:h-11 w-auto object-contain mb-3 sm:mb-4"
                        />
                        <h1 className="text-[22px] sm:text-[24px] font-bold text-text-primary tracking-tight">Reset password 🔑</h1>
                        <p className="mt-1 text-center text-[13px] sm:text-[14px] text-text-secondary">
                            Choose a strong, secure password for your account.
                        </p>
                    </div>

                    {isSuccess ? (
                        <div className="space-y-5 text-center">
                            <div className="flex items-start p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-left">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                                <div className="ml-2.5">
                                    <p className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-300">Password updated successfully</p>
                                    <p className="text-[12.5px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                                        Your password has been reset. You can now sign in with your new credentials.
                                    </p>
                                </div>
                            </div>
                            <Link 
                                to="/login"
                                className="btn btn-primary w-full h-[46px] sm:h-[48px] text-[14px] sm:text-[15px] rounded-xl flex items-center justify-center gap-2"
                            >
                                Back to Sign In
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {errorMsg && (
                                <div className="flex items-start p-2.5 sm:p-3 bg-brand-danger/10 border border-brand-danger/20 rounded-xl dark:bg-[#7f1d1d]/20 dark:border-[#ef4444]/30">
                                    <AlertCircle className="w-4 h-4 text-brand-danger mt-0.5 flex-shrink-0" />
                                    <p className="text-[12.5px] sm:text-[13px] text-brand-danger dark:text-[#fca5a5] font-medium ml-2">{errorMsg}</p>
                                </div>
                            )}

                            <div>
                                <label htmlFor="newPassword" className="block text-[12.5px] sm:text-[13px] font-semibold text-text-primary mb-1 ml-0.5">
                                    New password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Lock className="h-[17px] w-[17px] text-text-muted" />
                                    </div>
                                    <input
                                        id="newPassword"
                                        name="newPassword"
                                        type={showNewPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full pl-10 pr-10 rounded-xl h-[44px] sm:h-[46px] text-[13.5px] sm:text-[14px] bg-bg-main text-text-primary border border-border-subtle focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none transition-all placeholder-text-muted"
                                        placeholder="••••••••"
                                        required
                                        minLength={8}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-text-primary focus:outline-none"
                                    >
                                        {showNewPassword ? <EyeOff className="h-[17px] w-[17px]" /> : <Eye className="h-[17px] w-[17px]" />}
                                    </button>
                                </div>
                            </div>
                            
                            <div>
                                <label htmlFor="confirmPassword" className="block text-[12.5px] sm:text-[13px] font-semibold text-text-primary mb-1 ml-0.5">
                                    Confirm new password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Lock className="h-[17px] w-[17px] text-text-muted" />
                                    </div>
                                    <input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full pl-10 pr-10 rounded-xl h-[44px] sm:h-[46px] text-[13.5px] sm:text-[14px] bg-bg-main text-text-primary border border-border-subtle focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none transition-all placeholder-text-muted"
                                        placeholder="••••••••"
                                        required
                                        minLength={8}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-text-primary focus:outline-none"
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-[17px] w-[17px]" /> : <Eye className="h-[17px] w-[17px]" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !token}
                                className="btn btn-primary w-full h-[46px] sm:h-[48px] mt-4 text-[14px] sm:text-[15px] rounded-xl"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-[18px] h-[18px] animate-spin" />
                                ) : (
                                    <>
                                        Reset Password
                                        <ArrowRight className="w-[18px] h-[18px]" />
                                    </>
                                )}
                            </button>

                            <div className="pt-2 text-center">
                                <Link 
                                    to="/login"
                                    className="inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    Back to Sign In
                                </Link>
                            </div>

                            <div className="flex items-center justify-center gap-1.5 pt-2">
                                <Shield className="w-3.5 h-3.5 text-text-muted" />
                                <p className="text-[11.5px] sm:text-[12px] text-text-muted">
                                    Protected by {tenant?.brandName || 'Enterprise'} Security
                                </p>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {/* Footer */}
            <footer className="w-full px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between z-20 text-[11px] text-text-muted gap-2 sm:gap-0 mt-auto shrink-0">
                <div>© {new Date().getFullYear()} {tenant?.companyName || 'Acrovix Innovations Private Limited'}</div>
                <div className="flex gap-4">
                    <Link to="#" className="hover:text-text-primary transition-colors">Privacy Policy</Link>
                    <Link to="#" className="hover:text-text-primary transition-colors">Terms of Service</Link>
                    <Link to="#" className="hover:text-text-primary transition-colors">Support</Link>
                </div>
            </footer>
        </div>
    );
};

export default ResetPassword;
