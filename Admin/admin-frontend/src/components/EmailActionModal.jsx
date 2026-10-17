import React, { useState, useEffect } from 'react';
import { 
    X, 
    Mail, 
    Send, 
    Copy, 
    Check, 
    FileText, 
    Info 
} from 'lucide-react';
import { createMailtoUri, triggerSafeProtocol, copyToClipboard } from '../utils/crmActionUtils';
import { useToast } from '../context/ToastContext';
import { useTenant } from '../context/TenantContext';
import Modal from './ui/Modal';

export default function EmailActionModal({ isOpen, onClose, lead, onOpenLogEmail }) {
    const { showToast } = useToast();
    const { tenant } = useTenant();
    const [copied, setCopied] = useState(false);
    const [mailTriggered, setMailTriggered] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setCopied(false);
            setMailTriggered(false);
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

    const email = lead.businessEmail || '';
    const brandName = tenant?.brandName || 'ACROVIX';
    const defaultSubject = `${brandName} Enquiry Follow-up: ${lead.leadNumber || ''}`;
    const mailtoUri = createMailtoUri(email, lead.leadNumber, defaultSubject, brandName);

    const handleCopyEmail = async () => {
        if (!email) return;
        const ok = await copyToClipboard(email);
        if (ok) {
            setCopied(true);
            showToast({ 
                type: 'success', 
                message: `Email address copied: ${email}. Ready to paste into webmail (Gmail/Outlook).` 
            });
            setTimeout(() => setCopied(false), 2500);
        } else {
            showToast({ 
                type: 'error', 
                message: 'Failed to copy email address to clipboard.' 
            });
        }
    };

    const handleInitiateMailto = () => {
        if (!mailtoUri) {
            showToast({ type: 'warning', message: 'No valid business email available for this lead.' });
            return;
        }

        setMailTriggered(true);
        const initiated = triggerSafeProtocol(mailtoUri);
        if (initiated) {
            showToast({ 
                type: 'info', 
                message: `Opening your default email client for ${email}.` 
            });
        }
    };

    const handleProceedToLog = () => {
        onClose();
        if (onOpenLogEmail) {
            onOpenLogEmail();
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
            title="Email Contact Action"
            subtitle={`${lead.leadNumber} — ${lead.fullName}`}
            icon={Mail}
            iconClassName="text-blue-500 bg-blue-500/10 border-blue-500/20"
            size="sm"
            footer={modalFooter}
        >
            <div className="space-y-5">
                    {/* Email Display Card */}
                    <div className="p-4 bg-bg-main border border-border-subtle rounded-xl space-y-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
                            Business Email Address
                        </span>
                        
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-base font-bold text-text-primary tracking-tight truncate">
                                {email || 'No email provided'}
                            </span>
                            
                            {email && (
                                <button
                                    type="button"
                                    onClick={handleCopyEmail}
                                    className={`btn btn-secondary btn-md text-xs flex items-center gap-1.5 transition-colors shrink-0 ${
                                        copied ? 'border-emerald-500 text-emerald-600' : ''
                                    }`}
                                    title="Copy email to clipboard"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                                            <span>Copied!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3.5 h-3.5 text-text-muted" />
                                            <span>Copy Email</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Subject preview */}
                        <div className="text-[11px] text-text-muted pt-1">
                            <span className="font-semibold text-text-secondary">Default Subject: </span>
                            <span className="italic">{defaultSubject}</span>
                        </div>

                        {/* Mailto Launch Button */}
                        {email && (
                            <button
                                type="button"
                                onClick={handleInitiateMailto}
                                className="w-full btn btn-secondary btn-md text-xs font-semibold flex items-center justify-center gap-2 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all mt-1"
                            >
                                <Send className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span>{mailTriggered ? 'Mail App Triggered (Click to Re-open)' : 'Open Default Mail App (mailto:)'}</span>
                            </button>
                        )}
                    </div>

                    {/* Webmail guidance fallback */}
                    <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl text-xs text-text-secondary flex items-start gap-2.5">
                        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="font-semibold text-text-primary text-[11px]">
                                Webmail & Desktop Email Guidance
                            </p>
                            <p className="text-[11px] leading-relaxed text-text-muted">
                                If you send emails via a browser (Gmail, Google Workspace, or Office 365), use <strong>Copy Email</strong> above to draft your email in your web browser tab.
                            </p>
                        </div>
                    </div>

                    {/* CRM Logging Action */}
                    <div className="pt-2 border-t border-border-subtle space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-text-primary">
                                Document Email in CRM
                            </span>
                            <span className="text-[10px] text-text-muted">
                                Record thread summary & outcome
                            </span>
                        </div>
                        <p className="text-[11px] text-text-muted">
                            Record a summary of what proposal or information you communicated to the customer so your sales colleagues have full context.
                        </p>
                        <button
                            type="button"
                            onClick={handleProceedToLog}
                            className="w-full btn btn-primary btn-md font-semibold text-xs flex items-center justify-center gap-2 shadow-xs"
                        >
                            <FileText className="w-4 h-4" />
                            <span>Log Email Activity in CRM</span>
                        </button>
                    </div>
            </div>
        </Modal>
    );
}
