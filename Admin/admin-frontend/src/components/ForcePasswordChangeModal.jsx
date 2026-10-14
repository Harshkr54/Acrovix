import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../services/api';
import { Lock, ShieldAlert, CheckCircle2, AlertCircle, Eye, EyeOff, Loader2, LogOut } from 'lucide-react';

export default function ForcePasswordChangeModal() {
    const { user, setPasswordChangedSuccessfully, logout } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    if (!user || !user.mustChangePassword) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        if (newPassword.length < 8) {
            setError('New password must be at least 8 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match.');
            return;
        }

        if (newPassword === currentPassword) {
            setError('New password cannot be the same as the temporary password.');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetchApi('/auth/force-change-password', {
                method: 'POST',
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                    confirmPassword
                })
            });

            setSuccessMsg(res.message || 'Password changed successfully!');
            setTimeout(() => {
                setPasswordChangedSuccessfully();
            }, 1200);
        } catch (err) {
            setError(err.message || 'Failed to change password. Please check your current temporary password.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <div className="bg-bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border-subtle p-6 sm:p-8 relative animate-scale-up">
                
                {/* Header Icon */}
                <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5 text-amber-600 dark:text-amber-400">
                    <ShieldAlert className="w-7 h-7" />
                </div>

                <h2 className="text-[20px] font-bold text-text-primary text-center tracking-tight mb-2">
                    Password Change Required
                </h2>
                <p className="text-[13px] text-text-secondary text-center leading-relaxed mb-6">
                    A temporary password was assigned to your account. You must set a new private password before accessing the ACROVIX ERP system.
                </p>

                {error && (
                    <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[12.5px] flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {successMsg && (
                    <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[12.5px] flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{successMsg}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Current Temporary Password */}
                    <div>
                        <label className="block text-[12px] font-bold text-text-primary mb-1">
                            Current Temporary Password
                        </label>
                        <div className="relative">
                            <input
                                type={showCurrentPassword ? "text" : "password"}
                                required
                                value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)}
                                placeholder="Enter the temporary password"
                                className="w-full pl-3.5 pr-10 rounded-xl h-11 text-[13.5px] bg-bg-main text-text-primary border border-border-subtle focus:border-[#2563EB] outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                            >
                                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* New Password */}
                    <div>
                        <label className="block text-[12px] font-bold text-text-primary mb-1">
                            New Password
                        </label>
                        <div className="relative">
                            <input
                                type={showNewPassword ? "text" : "password"}
                                required
                                minLength={8}
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="Minimum 8 characters"
                                className="w-full pl-3.5 pr-10 rounded-xl h-11 text-[13.5px] bg-bg-main text-text-primary border border-border-subtle focus:border-[#2563EB] outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                            >
                                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm New Password */}
                    <div>
                        <label className="block text-[12px] font-bold text-text-primary mb-1">
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                required
                                minLength={8}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="Re-type your new password"
                                className="w-full pl-3.5 pr-10 rounded-xl h-11 text-[13.5px] bg-bg-main text-text-primary border border-border-subtle focus:border-[#2563EB] outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                            >
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="btn btn-primary w-full h-11 text-[14px] font-semibold rounded-xl mt-3"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Updating Password...
                            </>
                        ) : 'Set New Password'}
                    </button>
                </form>

                <div className="mt-5 pt-4 border-t border-border-subtle flex justify-center">
                    <button
                        type="button"
                        onClick={logout}
                        className="text-[12px] text-text-muted hover:text-brand-danger flex items-center gap-1.5 transition-colors"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        Log out and exit
                    </button>
                </div>
            </div>
        </div>
    );
}
