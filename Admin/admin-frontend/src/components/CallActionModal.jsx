import React, { useState, useEffect } from 'react';
import { 
    X, 
    Phone, 
    PhoneCall, 
    Copy, 
    Check, 
    FileText, 
    Info 
} from 'lucide-react';
import { createTelUri, triggerSafeProtocol, copyToClipboard } from '../utils/crmActionUtils';
import { useToast } from '../context/ToastContext';
import Modal from './ui/Modal';

export default function CallActionModal({ isOpen, onClose, lead, onOpenLogCall }) {
    const { showToast } = useToast();
    const [copied, setCopied] = useState(false);
    const [dialTriggered, setDialTriggered] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setCopied(false);
            setDialTriggered(false);
        }
    }, [isOpen]);

    // Handle Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !lead) return null;

    const phoneNumber = lead.phoneNumber || '';
    const telUri = createTelUri(phoneNumber);

    const handleCopyNumber = async () => {
        if (!phoneNumber) return;
        const ok = await copyToClipboard(phoneNumber);
        if (ok) {
            setCopied(true);
            showToast({ 
                type: 'success', 
                message: `Phone number copied: ${phoneNumber}. Ready to dial on your device.` 
            });
            setTimeout(() => setCopied(false), 2500);
        } else {
            showToast({ 
                type: 'error', 
                message: 'Failed to copy phone number to clipboard.' 
            });
        }
    };

    const handleInitiateTel = () => {
        if (!telUri) {
            showToast({ type: 'warning', message: 'No valid phone number for this lead.' });
            return;
        }

        setDialTriggered(true);
        const initiated = triggerSafeProtocol(telUri);
        if (initiated) {
            showToast({ 
                type: 'info', 
                message: `Initiating call to ${phoneNumber} via your default phone app.` 
            });
        }
    };

    const handleProceedToLog = () => {
        onClose();
        if (onOpenLogCall) {
            onOpenLogCall();
        }
    };

    const modalFooter = (
        <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-md text-xs font-semibold"
        >
            Close
        </button>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Phone Contact Action"
            subtitle={`${lead.leadNumber} — ${lead.fullName}`}
            icon={Phone}
            iconClassName="text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
            size="sm"
            footer={modalFooter}
        >
            <div className="space-y-5">
                    {/* Phone Display Card */}
                    <div className="p-4 bg-bg-main border border-border-subtle rounded-xl space-y-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
                            Customer Contact Number
                        </span>
                        
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-lg font-bold text-text-primary tracking-wide font-mono">
                                {phoneNumber || 'No phone number provided'}
                            </span>
                            
                            {phoneNumber && (
                                <button
                                    type="button"
                                    onClick={handleCopyNumber}
                                    className={`btn btn-secondary btn-md text-xs flex items-center gap-1.5 transition-colors ${
                                        copied ? 'border-emerald-500 text-emerald-600' : ''
                                    }`}
                                    title="Copy phone number to clipboard"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                                            <span>Copied!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3.5 h-3.5 text-text-muted" />
                                            <span>Copy Number</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Dial Button */}
                        {phoneNumber && (
                            <button
                                type="button"
                                onClick={handleInitiateTel}
                                className="w-full btn btn-secondary btn-md text-xs font-semibold flex items-center justify-center gap-2 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
                            >
                                <PhoneCall className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                <span>{dialTriggered ? 'Dial App Triggered (Click to Re-dial)' : 'Launch Default Phone App (tel:)'}</span>
                            </button>
                        )}
                    </div>

                    {/* Helpful Fallback Guidance */}
                    <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl text-xs text-text-secondary flex items-start gap-2.5">
                        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="font-semibold text-text-primary text-[11px]">
                                Desktop Telephony Guidance
                            </p>
                            <p className="text-[11px] leading-relaxed text-text-muted">
                                If your computer has no VoIP software installed (e.g., Phone Link or Teams), Windows may prompt you with an app chooser. In that case, use <strong>Copy Number</strong> above to dial directly on your mobile handset or office phone.
                            </p>
                        </div>
                    </div>

                    {/* CRM Logging Action */}
                    <div className="pt-2 border-t border-border-subtle space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-text-primary">
                                Document Call in CRM
                            </span>
                            <span className="text-[10px] text-text-muted">
                                Record discussion & next action
                            </span>
                        </div>
                        <p className="text-[11px] text-text-muted">
                            After your call, document the key discussion points, customer feedback, and any commitment in the lead history.
                        </p>
                        <button
                            type="button"
                            onClick={handleProceedToLog}
                            className="w-full btn btn-primary btn-md font-semibold text-xs flex items-center justify-center gap-2 shadow-xs"
                        >
                            <FileText className="w-4 h-4" />
                            <span>Log Call Outcome in CRM</span>
                        </button>
                    </div>
            </div>
        </Modal>
    );
}
