import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, AlertCircle, Loader2 } from 'lucide-react';
import Modal from './ui/Modal';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SendQuotationModal({ isOpen, onClose, initialEmail, onSend, isSending, isCustomPdfEnabled = false }) {
    const [recipients, setRecipients] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [pdfVariant, setPdfVariant] = useState('STANDARD');
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
            setPdfVariant('STANDARD');
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
        onSend(finalRecipients, pdfVariant);
    };

    const modalFooter = (
        <div className="flex items-center justify-end gap-3 w-full">
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
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Send Quotation"
            subtitle="Send quotation with attached PDF to one or more customer recipients"
            icon={Mail}
            iconClassName="text-brand-teal bg-brand-teal/10 border-brand-teal/20"
            size="md"
            isLoading={isSending}
            footer={modalFooter}
        >
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

                    {/* PDF Attachment Selector */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">
                            PDF Attachment Format
                        </label>
                        <div className="grid grid-cols-1 gap-2.5">
                            {/* Option 1: Standard Official PDF */}
                            <label
                                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                    pdfVariant === 'STANDARD'
                                        ? 'border-brand-teal/50 bg-brand-teal/5 ring-1 ring-brand-teal/20 shadow-2xs'
                                        : 'border-border-subtle bg-bg-main/40 hover:border-border-strong hover:bg-bg-main/60'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="pdfVariant"
                                    value="STANDARD"
                                    checked={pdfVariant === 'STANDARD'}
                                    onChange={() => setPdfVariant('STANDARD')}
                                    className="mt-0.5 text-brand-teal focus:ring-brand-teal"
                                />
                                <div className="space-y-0.5 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-text-primary">
                                            Standard Official PDF
                                        </span>
                                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-bg-surface border border-border-subtle text-text-muted">
                                            Default
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-text-muted">
                                        Standard system layout with complete details and official theme
                                    </p>
                                </div>
                            </label>

                            {/* Option 2: Customized Studio PDF */}
                            <label
                                className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                                    !isCustomPdfEnabled
                                        ? 'opacity-60 bg-bg-surface/30 border-border-subtle cursor-not-allowed'
                                        : pdfVariant === 'CUSTOM'
                                            ? 'border-brand-teal/50 bg-brand-teal/5 ring-1 ring-brand-teal/20 shadow-2xs cursor-pointer'
                                            : 'border-border-subtle bg-bg-main/40 hover:border-border-strong hover:bg-bg-main/60 cursor-pointer'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="pdfVariant"
                                    value="CUSTOM"
                                    disabled={!isCustomPdfEnabled}
                                    checked={pdfVariant === 'CUSTOM'}
                                    onChange={() => isCustomPdfEnabled && setPdfVariant('CUSTOM')}
                                    className="mt-0.5 text-brand-teal focus:ring-brand-teal disabled:opacity-50"
                                />
                                <div className="space-y-0.5 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-text-primary">
                                            Customized Studio PDF
                                        </span>
                                        {isCustomPdfEnabled ? (
                                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-brand-teal/10 text-brand-teal border border-brand-teal/20">
                                                Studio Active
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                Studio Disabled
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-text-muted">
                                        Customized colors, selective columns, and personalized layout
                                    </p>
                                    {!isCustomPdfEnabled && (
                                        <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 pt-0.5">
                                            Enable and configure in PDF Studio first
                                        </p>
                                    )}
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="p-3 bg-bg-main/60 border border-border-subtle rounded-xl text-xs text-text-secondary leading-relaxed space-y-1">
                        <div className="font-semibold text-text-primary">Delivery Details:</div>
                        <p className="text-text-muted text-[11px]">
                            A single quotation email with the selected PDF attachment format will be delivered to all confirmed recipient addresses in the <strong>To</strong> field.
                        </p>
                    </div>
                </div>
        </Modal>
    );
}
