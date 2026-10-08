import { useState, useCallback, useRef } from 'react';
import { fetchApi } from '../services/api';

export function useGstinVerification({ onVerified } = {}) {
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationSuccess, setVerificationSuccess] = useState(false);
    const [verificationError, setVerificationError] = useState(null);
    const [verifiedGstin, setVerifiedGstin] = useState(null);
    const abortControllerRef = useRef(null);

    const verify = useCallback(async (gstin) => {
        if (!gstin || typeof gstin !== 'string') return;
        
        const cleanGstin = gstin.trim().toUpperCase();
        
        // Basic format check before making network request
        const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstPattern.test(cleanGstin)) {
            setVerificationError('Enter a valid GSTIN.');
            setVerificationSuccess(false);
            setVerifiedGstin(null);
            return;
        }

        // Avoid re-verifying if we just verified this successfully
        if (cleanGstin === verifiedGstin && verificationSuccess) {
            return;
        }

        // Cancel previous request if any
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        setIsVerifying(true);
        setVerificationError(null);
        setVerificationSuccess(false);
        setVerifiedGstin(null);

        try {
            const res = await fetchApi('/gst/verify', {
                method: 'POST',
                body: JSON.stringify({ gstin: cleanGstin }),
                signal: abortController.signal
            });

            if (!abortController.signal.aborted) {
                setVerificationSuccess(true);
                setVerifiedGstin(cleanGstin);
                setVerificationError(null);
                
                if (onVerified) {
                    onVerified(res);
                }
            }
        } catch (err) {
            if (err.name === 'AbortError') return;
            
            setVerificationSuccess(false);
            setVerifiedGstin(null);
            
            // Map the errors gracefully
            if (err.message && err.message.toLowerCase().includes('not configured')) {
                setVerificationError(err.message);
            } else if (err.status === 400 || err.status === 404) {
                setVerificationError('GSTIN is invalid or not registered.');
            } else if (err.status === 429) {
                setVerificationError('GST verification limit reached. Please try again later.');
            } else {
                setVerificationError(err.message || 'GST verification is temporarily unavailable. Please try again later.');
            }
        } finally {
            if (!abortController.signal.aborted) {
                setIsVerifying(false);
            }
        }
    }, [verifiedGstin, verificationSuccess, onVerified]);

    const resetVerification = useCallback(() => {
        setIsVerifying(false);
        setVerificationSuccess(false);
        setVerificationError(null);
        setVerifiedGstin(null);
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, []);

    return {
        verify,
        isVerifying,
        verificationSuccess,
        verificationError,
        verifiedGstin,
        resetVerification
    };
}
