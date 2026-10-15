import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Landmark, ChevronRight, Plus, Check, MoreVertical, X, Loader2, Edit3, Trash2, ShieldCheck, AlertCircle, Building2, Save } from 'lucide-react';
import { getCompanyBankAccounts, createCompanyBankAccount, updateCompanyBankAccount, setDefaultCompanyBankAccount, deactivateCompanyBankAccount } from '../services/api';
import { useToast } from '../context/ToastContext';
import ActionMenu from '../components/ActionMenu';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const BankLogo = ({ bankName }) => {
    const name = (bankName || '').toLowerCase();
    
    if (name.includes('hdfc')) {
        return (
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0 shadow-xs">
                <div className="w-7 h-7 rounded-md bg-[#004C8F] flex items-center justify-center text-white font-black text-[11px] tracking-tighter">
                    <div className="w-4 h-4 border-2 border-red-500 rounded-xs flex items-center justify-center">
                        <span className="text-[9px] leading-none">H</span>
                    </div>
                </div>
            </div>
        );
    }
    
    if (name.includes('icici')) {
        return (
            <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0 shadow-xs">
                <div className="w-7 h-7 rounded-full bg-[#BA272E] flex items-center justify-center text-white font-bold text-[13px] italic">
                    i
                </div>
            </div>
        );
    }

    if (name.includes('sbi') || name.includes('state bank')) {
        return (
            <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center shrink-0 shadow-xs">
                <div className="w-7 h-7 rounded-full bg-[#0082C5] flex items-center justify-center text-white font-bold text-[11px]">
                    <div className="w-3 h-3 bg-white rounded-full flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-[#0082C5] rounded-full"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-border-subtle flex items-center justify-center shrink-0">
            <Landmark className="w-6 h-6 text-brand-primary" />
        </div>
    );
};

export default function BankAccountsPage() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [bankAccounts, setBankAccounts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Modal state for Add/Edit
    const [modalOpen, setModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [formData, setFormData] = useState({
        bankName: '',
        accountHolder: '',
        bankAccountNumber: '',
        confirmAccountNumber: '',
        bankIfsc: '',
        bankBranch: '',
        isDefault: false
    });
    const [formErrors, setFormErrors] = useState({});

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await getCompanyBankAccounts();
            setBankAccounts(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load bank accounts', error);
            showToast({ type: 'error', message: 'Failed to load bank accounts.' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const openAddModal = () => {
        setEditingAccount(null);
        setFormData({
            bankName: '',
            accountHolder: '',
            bankAccountNumber: '',
            confirmAccountNumber: '',
            bankIfsc: '',
            bankBranch: '',
            isDefault: bankAccounts.length === 0
        });
        setFormErrors({});
        setModalOpen(true);
    };

    const openEditModal = (acc) => {
        setEditingAccount(acc);
        setFormData({
            bankName: acc.bankName || '',
            accountHolder: acc.accountHolder || '',
            bankAccountNumber: acc.bankAccountNumber || '',
            confirmAccountNumber: acc.bankAccountNumber || '',
            bankIfsc: acc.bankIfsc || '',
            bankBranch: acc.bankBranch || '',
            isDefault: Boolean(acc.isDefault)
        });
        setFormErrors({});
        setModalOpen(true);
    };

    const handleSetDefault = async (id) => {
        setActionLoading(true);
        try {
            await setDefaultCompanyBankAccount(id);
            showToast({ type: 'success', message: 'Bank account set as default successfully.' });
            await loadData();
        } catch (error) {
            showToast({ type: 'error', message: error.message || 'Failed to update default bank account.' });
        } finally {
            setActionLoading(false);
        }
    };

    const [accountToDeactivate, setAccountToDeactivate] = useState(null);

    const handleDeactivate = (acc) => {
        setAccountToDeactivate(acc);
    };

    const handleConfirmDeactivate = async () => {
        if (!accountToDeactivate) return;
        setActionLoading(true);
        try {
            await deactivateCompanyBankAccount(accountToDeactivate.id);
            showToast({ type: 'success', message: 'Bank account deactivated.' });
            await loadData();
            setAccountToDeactivate(null);
        } catch (error) {
            showToast({ type: 'error', message: error.message || 'Failed to deactivate bank account.' });
        } finally {
            setActionLoading(false);
        }
    };

    const validateField = (name, value, allValues = formData) => {
        let error = '';
        const trimmedVal = (value || '').trim();

        if (name === 'bankName') {
            if (!trimmedVal) error = 'Bank name is required';
        } else if (name === 'accountHolder') {
            if (!trimmedVal) error = 'Account holder name is required';
        } else if (name === 'bankAccountNumber') {
            if (!trimmedVal) {
                error = 'Bank account number is required';
            }
        } else if (name === 'confirmAccountNumber') {
            if (!trimmedVal) {
                error = 'Confirm account number is required';
            } else if (trimmedVal !== (allValues.bankAccountNumber || '').trim()) {
                error = 'Account numbers do not match.';
            }
        } else if (name === 'bankIfsc') {
            if (!trimmedVal) {
                error = 'IFSC code is required';
            } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(trimmedVal)) {
                error = 'Invalid IFSC code format (e.g. HDFC0001234)';
            }
        }
        return error;
    };

    const handleFieldChange = (field, value) => {
        const nextValues = { ...formData, [field]: value };
        setFormData(nextValues);

        // Live validation for changed field
        const error = validateField(field, value, nextValues);
        const nextErrors = { ...formErrors, [field]: error };

        // Cross-field revalidation: if bankAccountNumber changes, recheck confirmAccountNumber if it has a value
        if (field === 'bankAccountNumber' && nextValues.confirmAccountNumber) {
            nextErrors.confirmAccountNumber = validateField('confirmAccountNumber', nextValues.confirmAccountNumber, nextValues);
        }

        setFormErrors(nextErrors);
    };

    const validateForm = () => {
        const errors = {};
        const accNum = (formData.bankAccountNumber || '').trim();
        const confNum = (formData.confirmAccountNumber || '').trim();

        if (!formData.bankName.trim()) errors.bankName = 'Bank name is required';
        if (!formData.accountHolder.trim()) errors.accountHolder = 'Account holder name is required';
        
        if (!accNum) {
            errors.bankAccountNumber = 'Bank account number is required';
        }

        if (!confNum) {
            errors.confirmAccountNumber = 'Confirm account number is required';
        } else if (accNum !== confNum) {
            errors.confirmAccountNumber = 'Account numbers do not match.';
        }

        if (!formData.bankIfsc.trim()) {
            errors.bankIfsc = 'IFSC code is required';
        } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(formData.bankIfsc.trim())) {
            errors.bankIfsc = 'Invalid IFSC code format (e.g. HDFC0001234)';
        }

        setFormErrors(errors);
        return Object.keys(errors).every(k => !errors[k]);
    };

    const isSubmitDisabled = () => {
        if (actionLoading) return true;
        const accNum = (formData.bankAccountNumber || '').trim();
        const confNum = (formData.confirmAccountNumber || '').trim();
        if (!accNum || !confNum) return true;
        if (accNum !== confNum) return true;
        if (formErrors.confirmAccountNumber || formErrors.bankAccountNumber) return true;
        return false;
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setActionLoading(true);
        try {
            const payload = {
                bankName: formData.bankName.trim(),
                accountHolder: formData.accountHolder.trim(),
                bankAccountNumber: formData.bankAccountNumber.trim(),
                confirmAccountNumber: formData.confirmAccountNumber.trim(),
                bankIfsc: formData.bankIfsc.trim().toUpperCase(),
                bankBranch: formData.bankBranch ? formData.bankBranch.trim() : null,
                isDefault: formData.isDefault
            };

            if (editingAccount) {
                await updateCompanyBankAccount(editingAccount.id, payload);
                showToast({ type: 'success', message: 'Bank account updated successfully.' });
            } else {
                await createCompanyBankAccount(payload);
                showToast({ type: 'success', message: 'Bank account added successfully.' });
            }
            setModalOpen(false);
            await loadData();
        } catch (error) {
            showToast({ type: 'error', message: error.message || 'Failed to save bank account.' });
        } finally {
            setActionLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-16 max-w-6xl mx-auto">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-[12px] text-text-muted">
                <Link to="/company-bank-details" className="hover:text-brand-primary transition-colors">
                    Company & Bank Details
                </Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="font-semibold text-text-primary">Bank Accounts</span>
            </div>

            {/* Header & Add Button */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                        <Landmark className="w-5 h-5 text-[#16A34A]" />
                    </div>
                    <div>
                        <h1 className="text-[24px] font-bold text-text-primary tracking-tight leading-tight">
                            Bank Accounts
                        </h1>
                        <p className="text-[12px] text-text-muted mt-0.5">
                            Add, edit or manage multiple bank accounts. Set one account as default for all documents.
                        </p>
                    </div>
                </div>

                <button
                    onClick={openAddModal}
                    className="btn btn-primary btn-md shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    <span>Add Bank Account</span>
                </button>
            </div>

            {/* Bank Accounts Stack Matching Bottom-Right Screenshot */}
            <div className="space-y-4">
                {bankAccounts.length === 0 ? (
                    <div className="acx-card p-12 text-center border border-dashed border-border-subtle rounded-[20px] bg-white dark:bg-bg-card">
                        <Landmark className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-40" />
                        <h3 className="text-[15px] font-bold text-text-primary">No bank accounts configured</h3>
                        <p className="text-[13px] text-text-secondary mt-1 max-w-md mx-auto">
                            Add your first bank account to display company payment coordinates automatically on generated invoices, purchase orders, and receipts.
                        </p>
                        <button
                            onClick={openAddModal}
                            className="btn btn-primary btn-md mt-5 shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add First Bank Account</span>
                        </button>
                    </div>
                ) : (
                    bankAccounts.map((acc) => {
                        const isDefault = Boolean(acc.isDefault);
                        return (
                            <div
                                key={acc.id}
                                className={`acx-card p-5 bg-white dark:bg-bg-card border rounded-[20px] transition-all ${
                                    isDefault
                                        ? 'border-[#86EFAC] dark:border-emerald-800/40 shadow-xs'
                                        : 'border-border-subtle hover:border-slate-300'
                                }`}
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    {/* Top / Left section with Logo & Name */}
                                    <div className="flex items-center gap-4 min-w-0">
                                        <BankLogo bankName={acc.bankName} />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-[16px] font-bold text-text-primary tracking-tight">
                                                    {acc.bankName}
                                                </h3>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Actions & Default Tag */}
                                    <div className="flex items-center gap-3 self-end md:self-center">
                                        {isDefault ? (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-bold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
                                                Default
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => handleSetDefault(acc.id)}
                                                disabled={actionLoading}
                                                className="text-[12px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] hover:underline px-2 py-1"
                                            >
                                                Set as Default
                                            </button>
                                        )}

                                        <ActionMenu
                                            items={[
                                                {
                                                    label: 'Edit Details',
                                                    onClick: () => openEditModal(acc)
                                                },
                                                ...(!isDefault ? [{
                                                    label: 'Set as Default',
                                                    onClick: () => handleSetDefault(acc.id)
                                                }] : []),
                                                {
                                                    label: 'Deactivate Account',
                                                    danger: true,
                                                    onClick: () => handleDeactivate(acc)
                                                }
                                            ]}
                                        />
                                    </div>
                                </div>

                                {/* Bottom Grid: Account Number, IFSC, Branch, Account Holder matching reference */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-4 border-t border-border-subtle/50 text-[13px]">
                                    <div>
                                        <div className="text-[11px] font-bold text-text-muted uppercase">
                                            Account Number
                                        </div>
                                        <div className="font-mono font-medium text-text-primary mt-1">
                                            {acc.bankAccountNumber || acc.maskedAccountNumber}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-bold text-text-muted uppercase">
                                            IFSC Code
                                        </div>
                                        <div className="font-mono font-medium text-text-primary mt-1">
                                            {acc.bankIfsc}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-bold text-text-muted uppercase">
                                            Branch
                                        </div>
                                        <div className="text-text-primary mt-1">
                                            {acc.bankBranch || '—'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-bold text-text-muted uppercase">
                                            Account Holder
                                        </div>
                                        <div className="text-text-primary font-medium mt-1 truncate">
                                            {acc.accountHolder}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modal for Add / Edit Bank Account */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingAccount ? 'Edit Bank Account' : 'Add Bank Account'}
                subtitle={editingAccount ? 'Update settlement account information' : 'Register a new enterprise bank account'}
                icon={Landmark}
                iconClassName="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/50"
                size="md"
                isLoading={actionLoading}
                footer={
                    <>
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            disabled={actionLoading}
                            className="btn btn-secondary btn-md"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleFormSubmit}
                            disabled={isSubmitDisabled() || actionLoading}
                            className="btn btn-primary btn-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            <span>{editingAccount ? 'Save Changes' : 'Add Account'}</span>
                        </button>
                    </>
                }
            >
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">
                            Bank Name *
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                            value={formData.bankName}
                            onChange={(e) => handleFieldChange('bankName', e.target.value)}
                            className={`acx-input text-[13px] ${formErrors.bankName ? '!border-red-500 focus:!ring-red-500/20' : ''}`}
                        />
                        {formErrors.bankName && (
                            <p className="text-[11px] text-red-500 mt-1 font-medium">{formErrors.bankName}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">
                            Account Holder Name *
                        </label>
                        <input
                            type="text"
                            value={formData.accountHolder}
                            onChange={(e) => handleFieldChange('accountHolder', e.target.value)}
                            className={`acx-input text-[13px] ${formErrors.accountHolder ? '!border-red-500 focus:!ring-red-500/20' : ''}`}
                        />
                        {formErrors.accountHolder && (
                            <p className="text-[11px] text-red-500 mt-1 font-medium">{formErrors.accountHolder}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">
                                Account Number *
                            </label>
                            <input
                                type="text"
                                placeholder="Full account number"
                                value={formData.bankAccountNumber}
                                onChange={(e) => handleFieldChange('bankAccountNumber', e.target.value)}
                                className={`acx-input text-[13px] font-mono ${formErrors.bankAccountNumber ? '!border-red-500 focus:!ring-red-500/20' : ''}`}
                            />
                            {formErrors.bankAccountNumber && (
                                <p className="text-[11px] text-red-500 mt-1 font-medium">{formErrors.bankAccountNumber}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">
                                Confirm Account Number *
                            </label>
                            <input
                                type="text"
                                placeholder="Re-enter account number"
                                value={formData.confirmAccountNumber}
                                onChange={(e) => handleFieldChange('confirmAccountNumber', e.target.value)}
                                className={`acx-input text-[13px] font-mono ${formErrors.confirmAccountNumber ? '!border-red-500 focus:!ring-red-500/20' : ''}`}
                            />
                            {formErrors.confirmAccountNumber && (
                                <p className="text-[11px] text-red-500 mt-1 font-medium">{formErrors.confirmAccountNumber}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">
                                IFSC Code *
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. HDFC0001234"
                                value={formData.bankIfsc}
                                onChange={(e) => handleFieldChange('bankIfsc', e.target.value.toUpperCase())}
                                className={`acx-input text-[13px] font-mono uppercase ${formErrors.bankIfsc ? '!border-red-500 focus:!ring-red-500/20' : ''}`}
                            />
                            {formErrors.bankIfsc && (
                                <p className="text-[11px] text-red-500 mt-1 font-medium">{formErrors.bankIfsc}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">
                                Branch Name
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Koramangala, Bengaluru"
                                value={formData.bankBranch}
                                onChange={(e) => handleFieldChange('bankBranch', e.target.value)}
                                className="acx-input text-[13px]"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={formData.isDefault}
                                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                                className="w-4 h-4 rounded text-brand-primary border-border-subtle focus:ring-brand-primary"
                            />
                            <span className="text-[13px] font-medium text-text-primary">
                                Set as default bank account for new documents
                            </span>
                        </label>
                    </div>
                </form>
            </Modal>

            {/* Deactivate Bank Account Confirmation Dialog */}
            {accountToDeactivate && (
                <ConfirmDialog
                    isOpen={Boolean(accountToDeactivate)}
                    title="Deactivate Bank Account"
                    description={`Are you sure you want to deactivate ${accountToDeactivate.bankName} (${accountToDeactivate.bankAccountNumber || accountToDeactivate.maskedAccountNumber})? Historical transactions will be preserved, but it won't be used for new invoices or payments.`}
                    confirmText="Deactivate Account"
                    cancelText="Cancel"
                    variant="destructive"
                    isLoading={actionLoading}
                    onConfirm={handleConfirmDeactivate}
                    onCancel={() => !actionLoading && setAccountToDeactivate(null)}
                />
            )}
        </div>
    );
}
