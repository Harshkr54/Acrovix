import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../services/api';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    // Fire-and-forget warm-up ping: wakes the Render backend while the admin
    // is reading the login form, giving the JVM a head start before login.
    // Uses the public /api/health endpoint — no auth required, result ignored.
    useEffect(() => {
        const healthUrl = API_BASE_URL.replace('/api/admin', '/api/health');
        fetch(healthUrl).catch(() => {/* intentionally ignored */});
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const success = await login(email, password);
            if (success) {
                navigate('/');
            } else {
                setError('Invalid email or password. Please try again.');
            }
        } catch (err) {
            setError('An error occurred during login.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg-main p-4 relative overflow-hidden">
            {/* Subtle background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-[#14B8A6]/10 blur-[120px]" />
                <div className="absolute bottom-[10%] -right-[10%] w-[30%] h-[30%] rounded-full bg-[#4F46E5]/10 blur-[100px]" />
            </div>

            <div className="max-w-md w-full space-y-8 bg-bg-card p-8 sm:p-12 rounded-[32px] shadow-xl border border-border-subtle relative z-10">
                <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-bg-main rounded-[24px] flex items-center justify-center border border-border-subtle shadow-sm mb-6">
                        <Shield className="w-10 h-10 text-[#14B8A6]" />
                    </div>
                    <h2 className="text-center text-[32px] font-bold tracking-tight text-text-primary leading-tight">ACROVIX</h2>
                    <p className="mt-1 text-center text-[11px] text-text-muted font-bold tracking-widest uppercase">
                        Admin Portal
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="flex items-start p-4 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl dark:bg-[#7f1d1d]/20 dark:border-[#ef4444]/30">
                            <AlertCircle className="w-5 h-5 text-[#DC2626] mt-0.5 mr-3 flex-shrink-0" />
                            <p className="text-[13px] text-[#991b1b] dark:text-[#fca5a5] font-semibold">{error}</p>
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
                                    className="input-field pl-11 rounded-xl h-12 text-[13px] bg-bg-main"
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
                                    className="input-field pl-11 rounded-xl h-12 text-[13px] bg-bg-main"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="btn-primary w-full py-3.5 text-[15px] font-bold rounded-xl flex justify-center items-center mt-8 transition-all shadow-[0_4px_14px_rgba(79,70,229,0.25)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.3)]"
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
