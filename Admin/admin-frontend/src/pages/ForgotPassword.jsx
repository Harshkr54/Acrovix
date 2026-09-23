import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/api';
import logoLight from '../assets/acrovix-logo-light.png';
import logoDark from '../assets/acrovix-logo-dark.png';
import { Loader2 } from 'lucide-react';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [theme] = useState(() => localStorage.getItem('acrovix_admin_theme') || 'light');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim()) {
            window.dispatchEvent(new CustomEvent('acrovix-toast', {
                detail: { type: 'error', message: 'Email address is required.' }
            }));
            return;
        }

        setIsLoading(true);
        try {
            await forgotPassword(email);
            setIsSubmitted(true);
            window.dispatchEvent(new CustomEvent('acrovix-toast', {
                detail: { type: 'success', message: 'Reset link sent successfully.' }
            }));
        } catch (error) {
            // Keep the generic response even on error
            window.dispatchEvent(new CustomEvent('acrovix-toast', {
                detail: { type: 'error', message: 'Failed to process request. Please try again.' }
            }));
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
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Forgot Password</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-center text-sm">
                        Enter your registered email address and we'll send you a secure password reset link.
                    </p>
                </div>

                {isSubmitted ? (
                    <div className="text-center">
                        <div className="p-4 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded-lg mb-6 text-sm">
                            If an account exists for this email, you'll receive a password reset link shortly.
                        </div>
                        <Link 
                            to="/login"
                            className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium text-sm transition-colors"
                        >
                            Back to Sign In
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0B1120] text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 dark:focus:border-teal-400 transition-colors outline-none"
                                placeholder="name@company.com"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                'Send Reset Link'
                            )}
                        </button>
                        
                        <div className="text-center mt-6">
                            <Link 
                                to="/login"
                                className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium text-sm transition-colors"
                            >
                                Back to Sign In
                            </Link>
                        </div>
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

export default ForgotPassword;
