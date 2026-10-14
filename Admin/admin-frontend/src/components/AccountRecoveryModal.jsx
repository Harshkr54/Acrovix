import React, { useState } from 'react';
import { 
    KeyRound, Mail, ShieldAlert, CheckCircle2, AlertCircle, 
    Copy, Check, Eye, EyeOff, Loader2, X, AlertTriangle 
} from 'lucide-react';
import { fetchApi } from '../services/api';

export default function AccountRecoveryModal({ user, onClose, onUserUpdated }) {
    // Option A State (Send Reset Link)
    const [isSendingLink, setIsSendingLink] = useState(false);
    const [linkResult, setLinkResult] = useState(null); // { type: 'success' | 'warning' | 'error', message: string }

    // Option B State (Temporary Password)
    const [isGeneratingTempPass, setIsGeneratingTempPass] = useState(false);
    const [showTempPassConfirm, setShowTempPassConfirm] = useState(false);
    const [tempPassResult, setTempPassResult] = useState(null); // { temporaryPassword, message }
    const [showPasswordText, setShowPasswordText] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [tempPassError, setTempPassError] = useState(null);

    if (!user) return null;

    const handleSendResetLink = async () => {
        setIsSendingLink(true);
        setLinkResult(null);
        try {
            const data = await fetchApi(`/users/${user.id}/send-reset-link`, {
                method: 'POST'
            });

            if (data.status === 'ACCEPTED') {
                setLinkResult({
                    type: 'success',
                    deliveryStatus: data.deliveryStatus,
                    message: data.message || 'Password reset link was accepted by the email provider for delivery.'
                });
            } else if (data.status === 'UNCONFIGURED') {
                setLinkResult({
                    type: 'warning',
                    deliveryStatus: data.deliveryStatus,
                    message: data.message || 'Reset token generated, but email delivery is not configured on this server. Please use Option B (Temporary Password).'
                });
            } else {
                setLinkResult({
                    type: 'error',
                    deliveryStatus: data.deliveryStatus,
                    message: data.message || 'Email delivery failed. Please use Option B (Temporary Password).'
                });
            }

            if (onUserUpdated) onUserUpdated();
        } catch (err) {
            setLinkResult({
                type: 'error',
                message: err.message || 'Failed to dispatch password reset link.'
            });
        } finally {
            setIsSendingLink(false);
        }
    };

    const handleGenerateTemporaryPassword = async () => {
        setIsGeneratingTempPass(true);
        setTempPassError(null);
        try {
            const data = await fetchApi(`/users/${user.id}/reset-temporary-password`, {
                method: 'POST'
            });

            setTempPassResult(data);
            setShowTempPassConfirm(false);
            if (onUserUpdated) onUserUpdated();
        } catch (err) {
            setTempPassError(err.message || 'Failed to generate temporary password.');
        } finally {
            setIsGeneratingTempPass(false);
        }
    };

    const handleCopyPassword = () => {
        if (!tempPassResult?.temporaryPassword) return;
        navigator.clipboard.writeText(tempPassResult.temporaryPassword);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-bg-main w-full max-w-lg rounded-2xl shadow-2xl border border-border-subtle overflow-hidden max-h-[90vh] flex flex-col">
                {/* Modal Header */}
                <div className="flex justify-between items-center p-5 sm:p-6 border-b border-border-subtle bg-bg-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                            <KeyRound className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-[17px] font-bold text-text-primary">
                                Account Recovery
                            </h2>
                            <p className="text-[12px] text-text-muted">
                                Recover access for administrative and team accounts
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-text-muted hover:text-text-primary p-1.5 rounded-lg hover:bg-bg-hover transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
                    {/* User Summary Card */}
                    <div className="p-4 rounded-xl bg-bg-card border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div className="text-[14px] font-bold text-text-primary">{user.name}</div>
                            <div className="text-[12px] text-text-secondary">{user.email}</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-bg-muted text-text-muted border border-border-subtle">
                                {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Sales'}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                user.enabled ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${user.enabled ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                {user.enabled ? 'Active' : 'Disabled'}
                            </span>
                        </div>
                    </div>

                    {/* Option A: Send Reset Link */}
                    <div className="p-4 rounded-xl border border-border-subtle bg-bg-card space-y-3">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex gap-2.5">
                                <Mail className="w-4 h-4 text-brand-primary mt-0.5 shrink-0" />
                                <div>
                                    <h3 className="text-[13px] font-bold text-text-primary">
                                        Option A: Send Password Reset Link
                                    </h3>
                                    <p className="text-[12px] text-text-secondary mt-0.5">
                                        Dispatches a secure, time-limited reset link to the user's email address.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {linkResult && (
                            <div className={`p-3 rounded-lg text-[12px] flex items-start gap-2 border ${
                                linkResult.type === 'success' 
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                                    : linkResult.type === 'warning'
                                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'
                                    : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                            }`}>
                                {linkResult.type === 'success' ? (
                                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                                ) : (
                                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                )}
                                <div>
                                    <span className="font-semibold">{linkResult.message}</span>
                                    {linkResult.deliveryStatus && (
                                        <div className="text-[11px] opacity-80 mt-0.5">
                                            Provider status: <strong>{linkResult.deliveryStatus}</strong>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="pt-1">
                            <button
                                type="button"
                                onClick={handleSendResetLink}
                                disabled={isSendingLink || !user.enabled}
                                className="btn btn-primary btn-sm w-full sm:w-auto"
                            >
                                {isSendingLink ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                        Dispatching Link...
                                    </>
                                ) : (
                                    <>
                                        <Mail className="w-3.5 h-3.5 mr-1.5" />
                                        Send Reset Email
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Option B: Generate Temporary Password */}
                    <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 space-y-3">
                        <div className="flex items-start gap-2.5">
                            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                            <div>
                                <h3 className="text-[13px] font-bold text-text-primary">
                                    Option B: Temporary Password (Secure Fallback)
                                </h3>
                                <p className="text-[12px] text-text-secondary mt-0.5">
                                    Generates a high-entropy temporary password. User will be strictly required to change it upon their next login.
                                </p>
                            </div>
                        </div>

                        {tempPassError && (
                            <div className="p-3 rounded-lg text-[12px] flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{tempPassError}</span>
                            </div>
                        )}

                        {tempPassResult ? (
                            <div className="p-4 rounded-xl bg-bg-main border border-border-subtle space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                                        Temporary Password
                                    </span>
                                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        Displayed Once Only
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="flex-1 px-3.5 py-2.5 bg-bg-card rounded-lg border border-border-subtle font-mono text-[14px] text-text-primary select-all">
                                        {showPasswordText ? tempPassResult.temporaryPassword : '••••••••••••••••'}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswordText(!showPasswordText)}
                                        className="p-2.5 rounded-lg border border-border-subtle bg-bg-card hover:bg-bg-hover text-text-muted hover:text-text-primary"
                                        title={showPasswordText ? "Hide" : "Show"}
                                    >
                                        {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCopyPassword}
                                        className="btn btn-secondary btn-sm h-10 px-3 flex items-center gap-1.5"
                                        title="Copy to clipboard"
                                    >
                                        {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                        <span>{isCopied ? 'Copied' : 'Copy'}</span>
                                    </button>
                                </div>

                                <p className="text-[11.5px] text-text-secondary leading-relaxed bg-bg-muted/50 p-2.5 rounded-lg border border-border-subtle/50">
                                    Please copy and share this password securely with <strong>{user.name}</strong>. Upon login, the user will be blocked from ERP features until they submit a new private password.
                                </p>
                            </div>
                        ) : showTempPassConfirm ? (
                            <div className="p-3.5 rounded-xl bg-bg-main border border-border-subtle space-y-3">
                                <p className="text-[12px] text-text-secondary">
                                    Are you sure you want to reset <strong>{user.name}</strong>'s password? Any existing password or active session for this account will be invalidated.
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleGenerateTemporaryPassword}
                                        disabled={isGeneratingTempPass}
                                        className="btn btn-sm bg-amber-600 hover:bg-amber-700 text-white font-medium"
                                    >
                                        {isGeneratingTempPass ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                                Generating...
                                            </>
                                        ) : 'Yes, Generate Temporary Password'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowTempPassConfirm(false)}
                                        disabled={isGeneratingTempPass}
                                        className="btn btn-secondary btn-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="pt-1">
                                <button
                                    type="button"
                                    onClick={() => setShowTempPassConfirm(true)}
                                    disabled={!user.enabled}
                                    className="btn btn-secondary btn-sm border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 w-full sm:w-auto"
                                >
                                    <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                                    Generate Temporary Password
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-5 border-t border-border-subtle bg-bg-card flex justify-end">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="btn btn-secondary btn-md"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
