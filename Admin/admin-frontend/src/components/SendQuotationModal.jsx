import React, { useState, useEffect, useRef } from 'react';
import { X, Edit2, Check, Send } from 'lucide-react';

export default function SendQuotationModal({ isOpen, onClose, initialEmail, onSend, isSending }) {
    const [confirmedRecipientEmail, setConfirmedRecipientEmail] = useState('');
    const [editingRecipientEmail, setEditingRecipientEmail] = useState('');
    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [error, setError] = useState(null);
    const inputRef = useRef(null);

    // Initialize state when modal opens
    useEffect(() => {
        if (isOpen) {
            setConfirmedRecipientEmail(initialEmail || '');
            setIsEditingEmail(false);
            setError(null);
        }
    }, [isOpen, initialEmail]);

    // Focus input when editing starts
    useEffect(() => {
        if (isEditingEmail && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditingEmail]);

    if (!isOpen) return null;

    const handleClose = () => {
        if (isSending) return;
        onClose();
    };

    const handleEditClick = () => {
        setEditingRecipientEmail(confirmedRecipientEmail);
        setIsEditingEmail(true);
        setError(null);
    };

    const handleCancelEdit = () => {
        setIsEditingEmail(false);
        setError(null);
    };

    const validateEmail = (email) => {
        if (!email || !email.trim()) {
            return "Email address is required.";
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return "Please enter a valid email address.";
        }
        return null;
    };

    const handleSaveEdit = () => {
        const validationError = validateEmail(editingRecipientEmail);
        if (validationError) {
            setError(validationError);
            return;
        }
        setConfirmedRecipientEmail(editingRecipientEmail.trim());
        setIsEditingEmail(false);
        setError(null);
    };

    const handleSend = () => {
        const validationError = validateEmail(confirmedRecipientEmail);
        if (validationError) {
            setError(validationError);
            return;
        }
        onSend(confirmedRecipientEmail.trim());
    };

    // Close on escape key
    const handleKeyDown = (e) => {
        if (e.key === 'Escape' && !isSending) {
            handleClose();
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-text-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onKeyDown={handleKeyDown}
        >
            <div className="acx-card p-6 md:p-8 max-w-lg w-full border border-border-subtle shadow-2xl relative animate-modal-entrance">
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    disabled={isSending}
                    className="btn btn-primary btn-icon absolute top-5 right-5 inset-y-0 right-0 pr-3"
                    aria-label="Close modal"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="mb-6">
                    <h2 className="text-[22px] font-bold text-text-primary tracking-tight">Send Quotation</h2>
                    <p className="text-[13px] text-text-secondary mt-1">Confirm quotation delivery</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <p className="text-[13px] text-text-primary mb-3">
                            This quotation will be sent to:
                        </p>
                        
                        <div className="mb-1">
                            <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                                Email Address
                            </label>
                            
                            {!isEditingEmail ? (
                                <div className="flex items-center justify-between w-full bg-bg-main border border-border-subtle rounded-xl px-3.5 py-2.5">
                                    <span className="text-[13px] font-medium text-text-primary truncate pr-4">
                                        {confirmedRecipientEmail}
                                    </span>
                                    <button 
                                        onClick={handleEditClick}
                                        disabled={isSending}
                                        className="btn btn-primary btn-md"
                                        aria-label="Edit email"
                                    >
                                        Edit <Edit2 className="w-3.5 h-3.5 " />
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <input
                                        ref={inputRef}
                                        type="email"
                                        value={editingRecipientEmail}
                                        onChange={(e) => {
                                            setEditingRecipientEmail(e.target.value);
                                            setError(null);
                                        }}
                                        disabled={isSending}
                                        className="w-full bg-bg-main border border-border-subtle focus:border-[var(--color-brand-primary)] rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-text-primary outline-none transition-colors"
                                        placeholder="Enter email address"
                                    />
                                    <div className="flex items-center justify-end space-x-2">
                                        <button 
                                            onClick={handleCancelEdit}
                                            disabled={isSending}
                                            className="btn btn-secondary btn-sm"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={handleSaveEdit}
                                            disabled={isSending}
                                            className="btn btn-primary btn-sm"
                                        >
                                            <Check className="w-3.5 h-3.5 " /> Save
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {error && (
                            <div className="mt-2 p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-lg text-[12px] text-red-600 dark:text-red-400 font-medium">
                                {error}
                            </div>
                        )}
                    </div>

                    {!isEditingEmail && (
                        <p className="text-[12px] text-text-muted mt-4 italic">
                            You can change the email address before sending.
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-end space-x-3 mt-8 pt-4 border-t border-border-subtle/50">
                    <button
                        onClick={handleClose}
                        disabled={isSending}
                        className="btn btn-primary btn-md"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={isSending || isEditingEmail}
                        className="btn btn-primary btn-md"
                    >
                        {isSending ? (
                            <><span className="animate-spin w-4 h-4 border-b-2 border-white rounded-full "></span> Sending...</>
                        ) : (
                            <>Send Quotation &rarr;</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
