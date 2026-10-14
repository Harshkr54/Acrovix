import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, AlertCircle, Loader2 } from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SendQuotationModal({ isOpen, onClose, initialEmail, onSend, isSending }) {
    const [recipients, setRecipients] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [error, setError] = useState(null);
    const inputRef = useRef(null);

    // Parse and normalize a raw string or array of emails
    const parseEmailsFromInput = (raw) => {
        if (!raw) return [];
        let items = [];
        if (Array.isArray(raw)) {
            items = raw;
        } else if (typeof raw === 'string') {
            items = raw.split(/[,;\s\n\r]+/);
        }
        return items
            .map(e => e.trim())
            .filter(e => e.length > 0);
    };

    // Initialize state when modal opens
    useEffect(() => {
        if (isOpen) {
            setError(null);
            setInputValue('');
            const initialList = [];
            const parsed = parseEmailsFromInput(initialEmail);
            parsed.forEach(email => {
                if (EMAIL_REGEX.test(email)) {
                    if (!initialList.some(r => r.toLowerCase() === email.toLowerCase())) {
                        initialList.push(email);
                    }
                }
            });
            setRecipients(initialList);
        }
    }, [isOpen, initialEmail]);

    if (!isOpen) return null;

    const handleClose = () => {
        if (isSending) return;
        onClose();
    };

    const addEmailAddress = (emailToAdd) => {
        const trimmed = emailToAdd.trim();
        if (!trimmed) return false;

        if (!EMAIL_REGEX.test(trimmed)) {
            setError(`Invalid email address format: "${trimmed}"`);
            return false;
        }

        const isDuplicate = recipients.some(r => r.toLowerCase() === trimmed.toLowerCase());
        if (isDuplicate) {
            setError(`Email "${trimmed}" is already added.`);
            return false;
        }

        setRecipients(prev => [...prev, trimmed]);
        setError(null);
        return true;
    };

    const addMultipleEmails = (rawText) => {
        const list = parseEmailsFromInput(rawText);
        if (list.length === 0) return;

        const newValid = [];
        let firstInvalid = null;

        for (const item of list) {
            if (!EMAIL_REGEX.test(item)) {
                firstInvalid = item;
                break;
            }
            const exists = [...recipients, ...newValid].some(r => r.toLowerCase() === item.toLowerCase());
            if (!exists) {
                newValid.push(item);
            }
        }

        if (firstInvalid) {
            setError(`Invalid email address format: "${firstInvalid}"`);
            return;
        }

        if (newValid.length > 0) {
            setRecipients(prev => [...prev, ...newValid]);
            setError(null);
            setInputValue('');
        }
    };

    const handleKeyDown = (e) => {
        if (isSending) return;

        // Escape closes modal
        if (e.key === 'Escape') {
            handleClose();
            return;
        }

        // Add email on Enter, Comma, or Semicolon
        if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
            e.preventDefault();
            if (inputValue.trim()) {
                const added = addEmailAddress(inputValue);
                if (added) {
                    setInputValue('');
                }
            }
            return;
        }

        // Backspace removes last chip if input is empty
        if (e.key === 'Backspace' && !inputValue && recipients.length > 0) {
            setRecipients(prev => prev.slice(0, prev.length - 1));
            setError(null);
        }
    };

    const handlePaste = (e) => {
        if (isSending) return;
        e.preventDefault();
        const pasted = e.clipboardData.getData('text');
        if (pasted) {
            addMultipleEmails(pasted);
        }
    };

    const handleRemoveRecipient = (indexToRemove) => {
        if (isSending) return;
        setRecipients(prev => prev.filter((_, idx) => idx !== indexToRemove));
        setError(null);
    };

    const handleEditRecipient = (indexToEdit) => {
        if (isSending) return;
        const target = recipients[indexToEdit];
        setRecipients(prev => prev.filter((_, idx) => idx !== indexToEdit));
        setInputValue(target);
        setError(null);
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const handleSend = () => {
        if (isSending) return;

        let finalRecipients = [...recipients];

        // If there's an uncommitted email typed in input, validate and add it
        if (inputValue.trim()) {
            const raw = inputValue.trim();
            if (!EMAIL_REGEX.test(raw)) {
                setError(`Please enter a valid email address or remove "${raw}"`);
                return;
            }
            const exists = finalRecipients.some(r => r.toLowerCase() === raw.toLowerCase());
            if (!exists) {
                finalRecipients.push(raw);
            }
            setInputValue('');
        }

        if (finalRecipients.length === 0) {
            setError("At least one valid recipient email address is required.");
            return;
        }

        setError(null);
        onSend(finalRecipients);
    };

    return (
        <div 
            className="fixed inset-0 bg-text-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="send-quotation-modal-title"
        >
            <div className="acx-card p-6 md:p-8 max-w-lg w-full border border-border-subtle shadow-2xl relative animate-modal-entrance bg-bg-card rounded-2xl">
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    disabled={isSending}
                    className="btn btn-secondary btn-icon absolute top-5 right-5 text-text-muted hover:text-text-primary"
                    aria-label="Close modal"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Modal Title */}
                <div className="mb-6">
                    <h2 id="send-quotation-modal-title" className="text-xl font-bold text-text-primary tracking-tight flex items-center gap-2">
                        <Mail className="w-5 h-5 text-brand-teal" />
                        Send Quotation
                    </h2>
                    <p className="text-xs text-text-muted mt-1">
                        Send quotation with attached PDF to one or more customer recipients
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">
                                Recipient Emails
                            </label>
                            <span className="text-xs font-semibold px-2 py-0.5 bg-bg-main border border-border-subtle rounded-full text-text-muted">
                                {recipients.length} {recipients.length === 1 ? 'recipient' : 'recipients'}
                            </span>
                        </div>

                        {/* Multi-recipient chip box */}
                        <div 
                            onClick={() => inputRef.current && inputRef.current.focus()}
                            className="w-full min-h-[96px] bg-bg-main border border-border-subtle focus-within:border-brand-teal focus-within:ring-2 focus-within:ring-brand-teal/20 rounded-xl p-2.5 transition-all cursor-text flex flex-wrap gap-2 items-start"
                        >
                            {recipients.map((email, idx) => (
                                <span
                                    key={`${email}-${idx}`}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-teal/10 text-brand-teal border border-brand-teal/25 rounded-lg text-xs font-medium dark:bg-brand-teal/20 dark:border-brand-teal/40 dark:text-teal-300 shadow-2xs group transition-all"
                                >
                                    <span 
                                        className="cursor-pointer hover:underline max-w-[240px] truncate"
                                        title="Click to edit address"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditRecipient(idx);
                                        }}
                                    >
                                        {email}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={isSending}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveRecipient(idx);
                                        }}
                                        className="text-brand-teal/70 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 rounded transition-colors"
                                        aria-label={`Remove ${email}`}
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </span>
                            ))}

                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => {
                                    setInputValue(e.target.value);
                                    if (error) setError(null);
                                }}
                                onKeyDown={handleKeyDown}
                                onPaste={handlePaste}
                                onBlur={() => {
                                    if (inputValue.trim()) {
                                        const added = addEmailAddress(inputValue);
                                        if (added) setInputValue('');
                                    }
                                }}
                                disabled={isSending}
                                className="flex-1 min-w-[180px] bg-transparent text-xs text-text-primary placeholder:text-text-muted outline-none py-1 px-1"
                                placeholder={recipients.length === 0 ? "Type email and press Enter, comma, or semicolon..." : "Add another email..."}
                            />
                        </div>

                        {/* Helper instructions */}
                        <p className="text-[11px] text-text-muted mt-2">
                            Press <kbd className="px-1.5 py-0.5 bg-bg-card border border-border-subtle rounded text-[10px] font-mono">Enter</kbd>, comma, or semicolon to add. You can also paste multiple addresses. Click any chip to edit.
                        </p>

                        {/* Inline Error */}
                        {error && (
                            <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    <div className="p-3 bg-bg-main/60 border border-border-subtle rounded-xl text-xs text-text-secondary leading-relaxed space-y-1">
                        <div className="font-semibold text-text-primary">Delivery Details:</div>
                        <p className="text-text-muted text-[11px]">
                            A single quotation email with the generated PDF attachment will be delivered to all confirmed recipient addresses in the <strong>To</strong> field.
                        </p>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-border-subtle">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSending}
                        className="btn btn-secondary btn-md text-xs font-semibold"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={isSending || (recipients.length === 0 && !inputValue.trim())}
                        className="btn btn-primary btn-md text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                    >
                        {isSending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                Sending Email...
                            </>
                        ) : (
                            <>
                                Send Quotation
                                <span aria-hidden="true">&rarr;</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
