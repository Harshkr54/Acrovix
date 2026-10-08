import { useState, useCallback, useRef, useEffect } from 'react';
import { fetchApi } from '../services/api';

export function useGstinVerification({ onVerified } = {}) {
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationSuccess, setVerificationSuccess] = useState(false);
    const [verificationError, setVerificationError] = useState(null);
    const [verifiedGstin, setVerifiedGstin] = useState(null);
    
    const abortControllerRef = useRef(null);
    const lastRequestedGstinRef = useRef(null);
    const onVerifiedRef = useRef(onVerified);

    useEffect(() => {
        onVerifiedRef.current = onVerified;
    }, [onVerified]);

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

        // Deduplication: if the same GSTIN is currently being verified, do not send another request
        if (cleanGstin === lastRequestedGstinRef.current && isVerifying) {
            return;
        }

        // Cancel previous request if any
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        lastRequestedGstinRef.current = cleanGstin;

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
                
                if (onVerifiedRef.current) {
                    onVerifiedRef.current(res);
                }
            }
        } catch (err) {
            if (err.name === 'AbortError') return;
            
            setVerificationSuccess(false);
            setVerifiedGstin(null);
            
            // Map the errors gracefully
            if (err.message && err.message.toLowerCase().includes('not configured')) {
                setVerificationError(err.message);
            } else if (err.status === 404) {
                setVerificationError('GSTIN is invalid or not registered.');
            } else if (err.status === 400) {
                setVerificationError('GST verification request could not be processed.');
            } else if (err.status === 429) {
                setVerificationError('GST verification limit reached. Please try again later.');
            } else {
                setVerificationError(err.message || 'GST verification is temporarily unavailable. Please try again later.');
            }
        } finally {
            if (!abortController.signal.aborted) {
                setIsVerifying(false);
                if (lastRequestedGstinRef.current === cleanGstin) {
                    lastRequestedGstinRef.current = null;
                }
            }
        }
    }, [verifiedGstin, verificationSuccess, isVerifying]);

    const resetVerification = useCallback(() => {
        setIsVerifying(false);
        setVerificationSuccess(false);
        setVerificationError(null);
        setVerifiedGstin(null);
        lastRequestedGstinRef.current = null;
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
