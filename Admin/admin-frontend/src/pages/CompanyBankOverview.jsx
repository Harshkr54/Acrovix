import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Landmark, Plus, ArrowRight, MoreVertical, Check, ExternalLink, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';
import { getCompanySettings, getCompanyBankAccounts, setDefaultCompanyBankAccount, deactivateCompanyBankAccount } from '../services/api';
import { useToast } from '../context/ToastContext';
import ActionMenu from '../components/ActionMenu';
import ConfirmDialog from '../components/ui/ConfirmDialog';

// Known bank logos/badges for authentic visual appearance
const BankLogo = ({ bankName }) => {
    const name = (bankName || '').toLowerCase();
    
    if (name.includes('hdfc')) {
        return (
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0 shadow-xs">
                <div className="w-6 h-6 rounded-md bg-[#004C8F] flex items-center justify-center text-white font-black text-[10px] tracking-tighter">
                    <div className="w-3.5 h-3.5 border-2 border-red-500 rounded-xs flex items-center justify-center">
                        <span className="text-[8px] leading-none">H</span>
                    </div>
                </div>
            </div>
        );
    }
    
    if (name.includes('icici')) {
        return (
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0 shadow-xs">
                <div className="w-6 h-6 rounded-full bg-[#BA272E] flex items-center justify-center text-white font-bold text-[11px] italic">
                    i
                </div>
            </div>
        );
    }

    if (name.includes('sbi') || name.includes('state bank')) {
        return (
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center shrink-0 shadow-xs">
                <div className="w-6 h-6 rounded-full bg-[#0082C5] flex items-center justify-center text-white font-bold text-[10px]">
                    <div className="w-2.5 h-2.5 bg-white rounded-full flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-[#0082C5] rounded-full"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-border-subtle flex items-center justify-center shrink-0">
            <Landmark className="w-5 h-5 text-brand-primary" />
        </div>
    );
};

export default function CompanyBankOverview() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [company, setCompany] = useState(null);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Modal state for Add Bank Account quick popup from overview
    const [showAddModal, setShowAddModal] = useState(false);
    const [newAccount, setNewAccount] = useState({
        bankName: '',
        accountHolder: '',
        bankAccountNumber: '',
        bankIfsc: '',
        bankBranch: '',
        isDefault: false
    });

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [companyData, accountsData] = await Promise.all([
                getCompanySettings().catch(() => null),
                getCompanyBankAccounts().catch(() => [])
            ]);
            setCompany(companyData);
            setBankAccounts(Array.isArray(accountsData) ? accountsData : []);
        } catch (error) {
            console.error('Failed to load company and bank overview:', error);
            showToast({ type: 'error', message: 'Failed to load company and bank details.' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSetDefault = async (accId) => {
        setActionLoading(true);
        try {
            await setDefaultCompanyBankAccount(accId);
            showToast({ type: 'success', message: 'Default bank account updated successfully.' });
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
            showToast({ type: 'success', message: 'Bank account deactivated successfully.' });
            await loadData();
            setAccountToDeactivate(null);
        } catch (error) {
            showToast({ type: 'error', message: error.message || 'Failed to deactivate bank account.' });
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
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div>
                <h1 className="text-[28px] font-bold text-text-primary tracking-tight leading-tight">
                    Company & Bank Details
                </h1>
                <p className="text-[13px] text-text-secondary mt-1">
                    Manage your company information and bank accounts used in invoices, quotations, purchase orders and receipts.
                </p>
            </div>

            {/* Two Side-by-Side Cards matching reference */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                
                {/* Card A — Company Details */}
                <div className="acx-card p-6 bg-white dark:bg-bg-card border border-border-subtle rounded-[20px] shadow-sm flex flex-col justify-between min-h-[380px]">
                    <div>
                        {/* Header with circular icon */}
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] dark:bg-blue-950/40 flex items-center justify-center shrink-0">
                                <Building2 className="w-6 h-6 text-[#0284C7]" />
                            </div>
                            <div>
                                <h2 className="text-[17px] font-bold text-text-primary tracking-tight">
                                    Company Details
                                </h2>
                                <p className="text-[12px] text-text-muted mt-0.5 leading-relaxed">
                                    View and manage your company profile, GSTIN, PAN, address and contact information.
                                </p>
                            </div>
                        </div>

                        {/* Summary Key-Value List */}
                        {company?.companyName ? (
                            <div className="space-y-3.5 py-2 text-[13px]">
                                <div className="flex items-baseline">
                                    <span className="w-36 text-text-secondary font-medium shrink-0">Company Name</span>
                                    <span className="text-text-muted mx-2">:</span>
                                    <span className="font-bold text-text-primary tracking-tight">
                                        {company.companyName}
                                    </span>
                                </div>
                                <div className="flex items-baseline">
                                    <span className="w-36 text-text-secondary font-medium shrink-0">GSTIN</span>
                                    <span className="text-text-muted mx-2">:</span>
                                    <span className="font-mono text-text-primary font-semibold">
                                        {company.gstin || '—'}
                                    </span>
                                </div>
                                <div className="flex items-baseline">
                                    <span className="w-36 text-text-secondary font-medium shrink-0">PAN</span>
                                    <span className="text-text-muted mx-2">:</span>
                                    <span className="font-mono text-text-primary font-semibold">
                                        {company.pan || '—'}
                                    </span>
                                </div>
                                <div className="flex items-baseline">
                                    <span className="w-36 text-text-secondary font-medium shrink-0">Phone</span>
                                    <span className="text-text-muted mx-2">:</span>
                                    <span className="text-text-primary font-medium">
                                        {company.phone || '—'}
                                    </span>
                                </div>
                                <div className="flex items-baseline">
                                    <span className="w-36 text-text-secondary font-medium shrink-0">Email</span>
                                    <span className="text-text-muted mx-2">:</span>
                                    <span className="text-text-primary font-medium">
                                        {company.email || '—'}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-text-muted text-[13px] border border-dashed border-border-subtle rounded-xl my-2">
                                Company details not configured yet.
                            </div>
                        )}
                    </div>

                    {/* Action Button */}
                    <div className="pt-6 mt-4 border-t border-border-subtle/50">
                        <button
                            onClick={() => navigate('/company-bank-details/company')}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-bg-hover hover:bg-slate-50 border border-[#2563EB]/30 hover:border-[#2563EB] text-[#2563EB] rounded-xl text-[13px] font-semibold transition-all shadow-xs"
                        >
                            <span>{company?.companyName ? 'View / Edit Details' : 'Configure Company Details'}</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Card B — Bank Accounts */}
                <div className="acx-card p-6 bg-white dark:bg-bg-card border border-border-subtle rounded-[20px] shadow-sm flex flex-col justify-between min-h-[380px]">
                    <div>
                        {/* Header with circular icon + Add Bank Account button */}
                        <div className="flex items-start justify-between gap-4 mb-6">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-[#DCFCE7] dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                                    <Landmark className="w-6 h-6 text-[#16A34A]" />
                                </div>
                                <div>
                                    <h2 className="text-[17px] font-bold text-text-primary tracking-tight">
                                        Bank Accounts
                                    </h2>
                                    <p className="text-[12px] text-text-muted mt-0.5 leading-relaxed">
                                        Manage multiple bank accounts and set a default account for documents.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/company-bank-details/bank-accounts')}
                                className="btn btn-primary btn-md shrink-0 shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Add Bank Account</span>
                            </button>
                        </div>

                        {/* List of Bank Accounts */}
                        <div className="space-y-3 py-1">
                            {bankAccounts.length === 0 ? (
                                <div className="text-center py-8 text-text-muted text-[13px] border border-dashed border-border-subtle rounded-xl">
                                    No bank accounts configured yet.
                                </div>
                            ) : (
                                bankAccounts.slice(0, 4).map((acc) => {
                                    const isDefault = Boolean(acc.isDefault);
                                    return (
                                        <div
                                            key={acc.id}
                                            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                                                isDefault
                                                    ? 'bg-[#F0FDF4] dark:bg-emerald-950/20 border-[#86EFAC] dark:border-emerald-800/40'
                                                    : 'bg-white dark:bg-bg-card border-border-subtle hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <BankLogo bankName={acc.bankName} />
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-[14px] font-bold text-text-primary truncate">
                                                            {acc.bankName}
                                                        </h3>
                                                    </div>
                                                    <div className="text-[12px] text-text-secondary mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                                        <span>
                                                            <span className="text-text-muted">A/C No: </span>
                                                            <span className="font-mono font-medium">
                                                                {acc.maskedAccountNumber || (acc.bankAccountNumber ? '•••• ' + acc.bankAccountNumber.slice(-4) : '••••')}
                                                            </span>
                                                        </span>
                                                        <span className="text-border-subtle">•</span>
                                                        <span>
                                                            <span className="text-text-muted">IFSC: </span>
                                                            <span className="font-mono font-medium">{acc.bankIfsc}</span>
                                                        </span>
                                                    </div>
                                                    {acc.bankBranch && (
                                                        <p className="text-[11px] text-text-muted mt-0.5 truncate">
                                                            {acc.bankBranch}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0 ml-3">
                                                {isDefault && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
                                                        Default
                                                    </span>
                                                )}
                                                <ActionMenu
                                                    items={[
                                                        {
                                                            label: 'View Details',
                                                            onClick: () => navigate('/company-bank-details/bank-accounts')
                                                        },
                                                        ...(!isDefault && acc.isActive ? [{
                                                            label: 'Set as Default',
                                                            onClick: () => handleSetDefault(acc.id)
                                                        }] : []),
                                                        ...(acc.isActive ? [{
                                                            label: 'Deactivate',
                                                            danger: true,
                                                            onClick: () => handleDeactivate(acc)
                                                        }] : [])
                                                    ]}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-6 mt-4 border-t border-border-subtle/50">
                        <button
                            onClick={() => navigate('/company-bank-details/bank-accounts')}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-bg-hover hover:bg-slate-50 border border-[#2563EB]/30 hover:border-[#2563EB] text-[#2563EB] rounded-xl text-[13px] font-semibold transition-all shadow-xs"
                        >
                            <span>Manage Bank Accounts</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
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
