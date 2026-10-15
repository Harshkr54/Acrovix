import React, { useEffect, useState } from 'react';
import { useGstinVerification } from '../hooks/useGstinVerification';
import { CheckCircle2, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';

export default function GstinAutoLookup({ 
    value, 
    onChange, 
    onVerified, 
    disabled,
    placeholder = "Enter 15-digit GSTIN",
    className = "",
    isExistingCustomer = false
}) {
    const {
        verify,
        isVerifying,
        verificationSuccess,
        verificationError,
        verifiedGstin,
        resetVerification
    } = useGstinVerification({ onVerified });

    const [localValue, setLocalValue] = useState(value || '');

    // Sync input when prop changes (e.g. customer selection, form reset)
    useEffect(() => {
        setLocalValue(value || '');
        // If the prop value changed and doesn't match the current verified GSTIN, reset verified state
        if ((value || '') !== verifiedGstin) {
            resetVerification();
        }
    }, [value, verifiedGstin, resetVerification]);

    const handleChange = (e) => {
        const val = e.target.value.toUpperCase();
        setLocalValue(val);
        if (onChange) {
            onChange(val);
        }
        if (verificationSuccess || verificationError) {
            resetVerification();
        }
    };

    const handleManualVerify = () => {
        const cleanGstin = localValue.trim().toUpperCase();
        if (!cleanGstin || isVerifying) return;
        verify(cleanGstin);
    };

    const isLengthValid = localValue.trim().length === 15;
    const isVerifiedNow = verificationSuccess && localValue.trim().toUpperCase() === verifiedGstin;

    return (
        <div className="relative">
            <div className="flex items-center gap-2">
                <div className="relative flex-1 flex items-center">
                    <input
                        type="text"
                        value={localValue}
                        onChange={handleChange}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleManualVerify();
                            }
                        }}
                        disabled={disabled || isVerifying}
                        placeholder={placeholder}
                        className={`acx-input w-full rounded-xl text-[13px] bg-bg-main h-11 pr-8 tracking-wider font-mono font-medium ${className}`}
                        maxLength={15}
                        autoComplete="off"
                    />
                    <div className="absolute right-3 flex items-center justify-center pointer-events-none">
                        {isVerifying ? (
                            <Loader2 className="w-4 h-4 text-brand-teal animate-spin" />
                        ) : isVerifiedNow ? (
                            <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                        ) : null}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleManualVerify}
                    disabled={disabled || isVerifying || !isLengthValid}
                    className={`h-11 px-3.5 rounded-xl text-[12px] font-bold tracking-wide transition-all duration-200 shrink-0 flex items-center gap-1.5 shadow-sm select-none ${
                        isVerifying 
                            ? 'bg-bg-muted text-text-muted border border-border-subtle cursor-not-allowed'
                            : isLengthValid
                                ? 'bg-brand-primary text-white hover:bg-brand-primary/90 hover:shadow active:scale-[0.98] cursor-pointer'
                                : 'bg-bg-muted text-text-muted border border-border-subtle cursor-not-allowed opacity-75'
                    }`}
                    title={!isLengthValid ? 'Enter 15-character GSTIN to verify' : 'Verify GSTIN via portal'}
                >
                    {isVerifying ? (
                        <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Verifying...</span>
                        </>
                    ) : (
                        <>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Verify GSTIN</span>
                        </>
                    )}
                </button>
            </div>

            {/* Status Messages */}
            {isVerifying && (
                <p className="text-[11px] text-text-secondary mt-1.5 flex items-center gap-1.5 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin text-brand-primary" />
                    Verifying GSTIN with portal...
                </p>
            )}

            {!isVerifying && isVerifiedNow && (
                <div className="mt-1.5 inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-[6px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[11px] font-semibold tracking-wide">
                    <span>✓ GSTIN Verified</span>
                </div>
            )}

            {!isVerifying && !isVerifiedNow && isExistingCustomer && localValue && (
                <div className="mt-1.5 inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-[6px] bg-bg-muted border border-border-subtle text-text-secondary text-[11px] font-semibold tracking-wide">
                    <span>Saved Customer GSTIN (Unverified)</span>
                </div>
            )}

            {!isVerifying && verificationError && (
                <p className="text-[11px] text-brand-danger mt-1.5 flex items-center font-medium leading-tight gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{verificationError}</span>
                </p>
            )}
        </div>
    );
}
