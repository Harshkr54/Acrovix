import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../services/api';
import logoLight from '../assets/acrovix-logo-light.png';
import logoDark from '../assets/acrovix-logo-dark.png';
import { Loader2 } from 'lucide-react';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [theme] = useState(() => localStorage.getItem('acrovix_admin_theme') || 'light');

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
            window.dispatchEvent(new CustomEvent('acrovix-toast', {
                detail: { type: 'error', message: 'Password must be at least 8 characters long.' }
            }));
            return;
        }

        if (newPassword !== confirmPassword) {
            window.dispatchEvent(new CustomEvent('acrovix-toast', {
                detail: { type: 'error', message: 'Passwords do not match.' }
            }));
            return;
        }

        setIsLoading(true);
        setErrorMsg(null);
        try {
            await resetPassword({ token, newPassword, confirmPassword });
            setIsSuccess(true);
            window.dispatchEvent(new CustomEvent('acrovix-toast', {
                detail: { type: 'success', message: 'Password reset successfully.' }
            }));
        } catch (error) {
            const message = error.message || 'Password reset link is invalid or has expired.';
            setErrorMsg(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0B1120] transition-colors duration-200">
            <div className="w-full max-w-md p-8 bg-white dark:bg-[#151E2E] rounded-2xl shadow-xl dark:shadow-none border border-transparent dark:border-gray-800 transition-colors duration-200"
                 style={{ animation: 'fadeInUp 0.25s ease-out forwards' }}>
                <div className="flex flex-col items-center mb-8">
                    <img 
                        src={theme === 'dark' ? logoDark : logoLight} 
                        alt="Acrovix" 
                        className="h-10 mb-6"
                    />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reset Password</h2>
                </div>

                {isSuccess ? (
                    <div className="text-center">
                        <div className="p-4 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded-lg mb-6 text-sm">
                            Password reset successfully. Please sign in with your new password.
                        </div>
                        <Link 
                            to="/login"
                            className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none transition-colors"
                        >
                            Back to Sign In
                        </Link>
                    </div>
                ) : errorMsg ? (
                    <div className="text-center">
                        <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg mb-6 text-sm">
                            {errorMsg}
                        </div>
                        <Link 
                            to="/forgot-password"
                            className="w-full flex justify-center items-center py-2.5 px-4 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#0B1120] hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none transition-colors"
                        >
                            Request New Reset Link
                        </Link>
                        <div className="mt-4">
                            <Link 
                                to="/login"
                                className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium text-sm transition-colors"
                            >
                                Back to Sign In
                            </Link>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                New Password
                            </label>
                            <input
                                id="newPassword"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0B1120] text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 dark:focus:border-teal-400 transition-colors outline-none"
                                required
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Confirm Password
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0B1120] text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 dark:focus:border-teal-400 transition-colors outline-none"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Resetting...
                                </>
                            ) : (
                                'Reset Password'
                            )}
                        </button>
                    </form>
                )}
            </div>
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .min-h-screen > div { animation: none !important; opacity: 1 !important; transform: none !important; }
                }
            `}} />
        </div>
    );
};

export default ResetPassword;
