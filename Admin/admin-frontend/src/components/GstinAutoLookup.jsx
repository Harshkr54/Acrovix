import React, { useEffect, useState, useRef } from 'react';
import { useGstinVerification } from '../hooks/useGstinVerification';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function GstinAutoLookup({ 
    value, 
    onChange, 
    onVerified, 
    disabled,
    placeholder = "Enter GSTIN",
    className = ""
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
    const lastAttemptedGstinRef = useRef(null);

    useEffect(() => {
        setLocalValue(value || '');
    }, [value]);

    useEffect(() => {
        const timer = setTimeout(() => {
            const cleanGstin = localValue.trim().toUpperCase();
            if (cleanGstin.length >= 15) {
                // If the value changed from the verified one, and we haven't just attempted it
                if (cleanGstin !== verifiedGstin && cleanGstin !== lastAttemptedGstinRef.current) {
                    lastAttemptedGstinRef.current = cleanGstin;
                    verify(cleanGstin);
                }
            } else if (cleanGstin.length > 0 && cleanGstin.length < 15) {
                // Not enough characters yet, but we should reset verification states
                if (verificationSuccess || verificationError) {
                    lastAttemptedGstinRef.current = null;
                    resetVerification();
                }
            } else if (cleanGstin.length === 0) {
                 lastAttemptedGstinRef.current = null;
                 resetVerification();
            }
        }, 600); // 600ms debounce

        return () => clearTimeout(timer);
    }, [localValue, verify, verifiedGstin, verificationSuccess, verificationError, resetVerification]);

    const handleChange = (e) => {
        const val = e.target.value.toUpperCase();
        setLocalValue(val);
        if (onChange) {
            onChange(val);
        }
    };

    return (
        <div className="relative">
            <div className="relative flex items-center">
                <input
                    type="text"
                    value={localValue}
                    onChange={handleChange}
                    disabled={disabled || isVerifying}
                    placeholder={placeholder}
                    className={`acx-input w-full rounded-xl text-[13px] bg-bg-main h-11 pr-10 ${className}`}
                    maxLength={15}
                />
                <div className="absolute right-3 flex items-center justify-center pointer-events-none">
                    {isVerifying ? (
                        <Loader2 className="w-4 h-4 text-brand-teal animate-spin" />
                    ) : verificationSuccess && localValue === verifiedGstin ? (
                        <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                    ) : verificationError && localValue.length >= 15 ? (
                        <AlertCircle className="w-4 h-4 text-brand-danger" />
                    ) : null}
                </div>
            </div>
            {/* Status Messages */}
            {isVerifying && (
                <p className="text-[11px] text-text-secondary mt-1.5 flex items-center">
                    Verifying GSTIN...
                </p>
            )}
            {!isVerifying && verificationSuccess && localValue === verifiedGstin && (
                <div className="mt-2 inline-flex items-center space-x-1.5 px-2 py-1 rounded-[6px] bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] text-[11px] font-semibold tracking-wide">
                    <span>✓ GSTIN Verified</span>
                </div>
            )}
            {!isVerifying && verificationError && localValue.length >= 15 && (
                <p className="text-[11px] text-brand-danger mt-1.5 flex items-center font-medium leading-tight">
                    ! {verificationError}
                </p>
            )}
        </div>
    );
}
