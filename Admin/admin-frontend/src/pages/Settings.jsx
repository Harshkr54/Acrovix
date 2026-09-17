import React, { useState, useEffect } from 'react';
import { User, Moon, Sun, Shield, Settings as SettingsIcon, Save, Lock, Loader2, CheckCircle, AlertCircle, Eye, EyeOff, Building, Landmark, FileText, Image } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { fetchApi, getCompanySettings, updateCompanySettings } from '../services/api';
import PageHeader from '../components/ui/PageHeader';

export default function Settings() {
    const { user: authUser, setUser: setAuthUser } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const [activeTab, setActiveTab] = useState('profile'); // profile, company
    const [isLoading, setIsLoading] = useState(true);
    const [profile, setProfile] = useState(null);

    // Profile form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileMessage, setProfileMessage] = useState(null);

    // Password form state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState(null);

    // Company Settings form state
    const [companySettings, setCompanySettings] = useState({
        companyName: '',
        legalName: '',
        gstin: '',
        pan: '',
        email: '',
        phone: '',
        website: '',
        registeredAddress: '',
        billingAddress: '',
        bankName: '',
        bankAccountNumber: '',
        bankIfsc: '',
        bankBranch: '',
        defaultPaymentTerms: '',
        defaultTermsAndConditions: '',
        logoUrl: '',
        signatureUrl: ''
    });
    const [isSavingCompany, setIsSavingCompany] = useState(false);
    const [companyMessage, setCompanyMessage] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const profileData = await fetchApi('/profile');
                setProfile(profileData);
                setName(profileData.name);
                setEmail(profileData.email);

                if (authUser?.role === 'SUPER_ADMIN') {
                    try {
                        const companyData = await getCompanySettings();
                        if (companyData) {
                            setCompanySettings({
                                companyName: companyData.companyName || '',
                                legalName: companyData.legalName || '',
                                gstin: companyData.gstin || '',
                                pan: companyData.pan || '',
                                email: companyData.email || '',
                                phone: companyData.phone || '',
                                website: companyData.website || '',
                                registeredAddress: companyData.registeredAddress || '',
                                billingAddress: companyData.billingAddress || '',
                                bankName: companyData.bankName || '',
                                bankAccountNumber: companyData.bankAccountNumber || '',
                                bankIfsc: companyData.bankIfsc || '',
                                bankBranch: companyData.bankBranch || '',
                                defaultPaymentTerms: companyData.defaultPaymentTerms || '',
                                defaultTermsAndConditions: companyData.defaultTermsAndConditions || '',
                                logoUrl: companyData.logoUrl || '',
                                signatureUrl: companyData.signatureUrl || ''
                            });
                        }
                    } catch (e) {
                        console.error("Failed to load company settings", e);
                    }
                }
            } catch (error) {
                console.error("Failed to load profile", error);
            } flex: {
                setIsLoading(false);
            }
        };
        loadData();
    }, [authUser]);

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setProfileMessage(null);
        setIsSavingProfile(true);
        try {
            const updatedProfile = await fetchApi('/profile', {
                method: 'PATCH',
                body: JSON.stringify({ name, email })
            });
            setProfile(updatedProfile);
            
            // Update auth context
            const newAuthUser = { ...authUser, name: updatedProfile.name, email: updatedProfile.email };
            setAuthUser(newAuthUser);
            localStorage.setItem('adminUser', JSON.stringify(newAuthUser));

            setProfileMessage({ type: 'success', text: 'Profile updated successfully' });
        } catch (error) {
            setProfileMessage({ type: 'error', text: error.message || 'Failed to update profile' });
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordMessage(null);

        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'New password and confirmation do not match.' });
            return;
        }

        setIsSavingPassword(true);
        try {
            await fetchApi('/profile/password', {
                method: 'PATCH',
                body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
            });
            
            setPasswordMessage({ type: 'success', text: 'Password updated successfully' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            setPasswordMessage({ type: 'error', text: error.status === 401 ? 'Current password is incorrect.' : error.message });
        } finally {
            setIsSavingPassword(false);
        }
    };

    const handleCompanySubmit = async (e) => {
        e.preventDefault();
        setCompanyMessage(null);
        setIsSavingCompany(true);
        try {
            await updateCompanySettings(companySettings);
            setCompanyMessage({ type: 'success', text: 'Company settings updated successfully' });
        } catch (error) {
            setCompanyMessage({ type: 'error', text: error.message || 'Failed to update company settings' });
        } finally {
            setIsSavingCompany(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
            {/* Header */}
            <PageHeader
                title="Settings"
                subtitle="Manage your profile preferences, password security, and company master settings."
                icon={SettingsIcon}
            />

            {/* Tabs */}
            <div className="flex gap-4 border-b border-border-subtle pt-2">
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`pb-3 px-1 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'profile' ? 'text-brand-primary border-brand-primary' : 'text-text-muted border-transparent hover:text-text-primary'}`}
                >
                    Personal Settings
                </button>
                {authUser?.role === 'SUPER_ADMIN' && (
                    <button
                        onClick={() => setActiveTab('company')}
                        className={`pb-3 px-1 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'company' ? 'text-brand-primary border-brand-primary' : 'text-text-muted border-transparent hover:text-text-primary'}`}
                    >
                        Company Settings
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
                <div className="lg:col-span-2 space-y-6">
                    {activeTab === 'profile' && (
                        <>
                            {/* Profile Preferences */}
                            <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-brand-primary flex items-center justify-center">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-text-primary">Profile Preferences</h2>
                                        <p className="text-xs text-text-muted">Your personal admin account information</p>
                                    </div>
                                </div>
                                
                                {profileMessage && (
                                    <div className={`mb-6 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold ${profileMessage.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' : 'bg-red-50 dark:bg-red-950/40 text-red-500'}`}>
                                        {profileMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                        {profileMessage.text}
                                    </div>
                                )}

                                <form onSubmit={handleProfileSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-text-muted uppercase mb-2">Full Name</label>
                                        <input 
                                            type="text" 
                                            value={name} 
                                            onChange={e => setName(e.target.value)}
                                            required
                                            className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-text-muted uppercase mb-2">Email Address</label>
                                        <input 
                                            type="email" 
                                            value={email} 
                                            onChange={e => setEmail(e.target.value)}
                                            required
                                            className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-text-muted uppercase mb-2">Role</label>
                                        <div className="flex items-center gap-2 px-4 py-2.5 bg-bg-main/50 border border-border-subtle rounded-xl text-sm text-text-muted cursor-not-allowed">
                                            <Shield className="w-4 h-4 text-text-muted" />
                                            <span>{profile?.role?.replace('_', ' ')}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="pt-2 flex justify-end">
                                        <button 
                                            type="submit" 
                                            disabled={isSavingProfile || (name === profile?.name && email === profile?.email)}
                                            className="btn-primary text-xs px-6 py-2.5 rounded-xl font-semibold disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Save Profile
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Change Password */}
                            <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                                        <Lock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-text-primary">Security Settings</h2>
                                        <p className="text-xs text-text-muted">Update your account password</p>
                                    </div>
                                </div>

                                {passwordMessage && (
                                    <div className={`mb-6 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold ${passwordMessage.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' : 'bg-red-50 dark:bg-red-950/40 text-red-500'}`}>
                                        {passwordMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                        {passwordMessage.text}
                                    </div>
                                )}

                                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-text-muted uppercase mb-2">Current Password</label>
                                        <div className="relative">
                                            <input 
                                                type={showCurrentPassword ? "text" : "password"} 
                                                value={currentPassword} 
                                                onChange={e => setCurrentPassword(e.target.value)}
                                                required
                                                className="w-full bg-bg-main border border-border-subtle rounded-xl pl-4 pr-10 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                                            >
                                                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-text-muted uppercase mb-2">New Password</label>
                                        <div className="relative">
                                            <input 
                                                type={showNewPassword ? "text" : "password"} 
                                                value={newPassword} 
                                                onChange={e => setNewPassword(e.target.value)}
                                                required
                                                minLength={8}
                                                className="w-full bg-bg-main border border-border-subtle rounded-xl pl-4 pr-10 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                                            >
                                                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-text-muted uppercase mb-2">Confirm New Password</label>
                                        <div className="relative">
                                            <input 
                                                type={showConfirmPassword ? "text" : "password"} 
                                                value={confirmPassword} 
                                                onChange={e => setConfirmPassword(e.target.value)}
                                                required
                                                minLength={8}
                                                className="w-full bg-bg-main border border-border-subtle rounded-xl pl-4 pr-10 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                                            >
                                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="pt-2 flex justify-end">
                                        <button 
                                            type="submit" 
                                            disabled={isSavingPassword || !currentPassword || !newPassword || !confirmPassword}
                                            className="btn-primary text-xs px-6 py-2.5 rounded-xl font-semibold disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {isSavingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                            Change Password
                                        </button>
                                    </div>
                                </form>
                            </div>
                            
                            {/* Appearance */}
                            <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
                                        <Sun className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-text-primary">Theme Appearance</h2>
                                        <p className="text-xs text-text-muted">Customize display theme for your user account</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between p-4 border border-border-subtle rounded-xl bg-bg-main/50">
                                    <div>
                                        <p className="text-sm font-semibold text-text-primary">Interface Theme</p>
                                        <p className="text-xs text-text-muted">Switch between light mode and dark mode.</p>
                                    </div>
                                    <button 
                                        onClick={toggleTheme}
                                        className="btn-secondary text-xs px-4 py-2.5 rounded-xl font-medium flex items-center gap-2"
                                    >
                                        {theme === 'dark' ? (
                                            <><Moon className="w-4 h-4 text-brand-primary" /> Dark Mode</>
                                        ) : (
                                            <><Sun className="w-4 h-4 text-amber-500" /> Light Mode</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'company' && authUser?.role === 'SUPER_ADMIN' && (
                        <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                                    <Building className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-text-primary">Master Settings</h2>
                                    <p className="text-xs text-text-muted">Configure company identity, bank details, and invoice defaults</p>
                                </div>
                            </div>

                            {companyMessage && (
                                <div className={`mb-6 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold ${companyMessage.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' : 'bg-red-50 dark:bg-red-950/40 text-red-500'}`}>
                                    {companyMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                    {companyMessage.text}
                                </div>
                            )}

                            <form onSubmit={handleCompanySubmit} className="space-y-8">
                                {/* Company Info */}
                                <div>
                                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center border-b border-border-subtle pb-2">
                                        <Building className="w-4 h-4 mr-2" /> Company Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Company Name *</label>
                                            <input required type="text" value={companySettings.companyName} onChange={e => setCompanySettings({...companySettings, companyName: e.target.value})} className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Legal Name *</label>
                                            <input required type="text" value={companySettings.legalName} onChange={e => setCompanySettings({...companySettings, legalName: e.target.value})} className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Email Address *</label>
                                            <input required type="email" value={companySettings.email} onChange={e => setCompanySettings({...companySettings, email: e.target.value})} className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Phone Number *</label>
                                            <input required type="text" value={companySettings.phone} onChange={e => setCompanySettings({...companySettings, phone: e.target.value})} className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-text-muted uppercase mb-1">GSTIN</label>
                                            <input type="text" value={companySettings.gstin} onChange={e => setCompanySettings({...companySettings, gstin: e.target.value})} className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-text-muted uppercase mb-1">PAN</label>
                                            <input type="text" value={companySettings.pan} onChange={e => setCompanySettings({...companySettings, pan: e.target.value})} className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Website URL</label>
                                            <input type="url" value={companySettings.website} onChange={e => setCompanySettings({...companySettings, website: e.target.value})} className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Registered Address</label>
                                            <textarea value={companySettings.registeredAddress} onChange={e => setCompanySettings({...companySettings, registeredAddress: e.target.value})} className="w-full bg-bg-main border border-border-subtle rounded-xl p-3 text-sm text-text-primary focus:outline-none focus:border-brand-primary min-h-[60px]" />
                                        </div>
                                    </div>
                                </div>

                                {/* Bank Details */}
                                <div>
                                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center border-b border-border-subtle pb-2">
                                        <Landmark className="w-4 h-4 mr-2" /> Bank Details
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Bank Name</label>
                                            <input type="text" value={companySettings.bankName} onChange={e => setCompanySettings({...companySettings, bankName: e.target.value})} className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Account Number</label>
                                            <input type="text" value={companySettings.bankAccountNumber} onChange={e => setCompanySettings({...companySettings, bankAccountNumber: e.target.value})} className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-text-muted uppercase mb-1">IFSC Code</label>
                                            <input type="text" value={companySettings.bankIfsc} onChange={e => setCompanySettings({...companySettings, bankIfsc: e.target.value})} className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Branch Name</label>
                                            <input type="text" value={companySettings.bankBranch} onChange={e => setCompanySettings({...companySettings, bankBranch: e.target.value})} className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary" />
                                        </div>
                                    </div>
                                </div>

                                {/* Document Defaults */}
                                <div>
                                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center border-b border-border-subtle pb-2">
                                        <FileText className="w-4 h-4 mr-2" /> Document Defaults
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Default Payment Terms</label>
                                            <textarea value={companySettings.defaultPaymentTerms} onChange={e => setCompanySettings({...companySettings, defaultPaymentTerms: e.target.value})} className="w-full bg-bg-main border border-border-subtle rounded-xl p-3 text-sm text-text-primary focus:outline-none focus:border-brand-primary min-h-[80px]" placeholder="e.g. 50% advance, 50% on completion" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Default Terms & Conditions</label>
                                            <textarea value={companySettings.defaultTermsAndConditions} onChange={e => setCompanySettings({...companySettings, defaultTermsAndConditions: e.target.value})} className="w-full bg-bg-main border border-border-subtle rounded-xl p-3 text-sm text-text-primary focus:outline-none focus:border-brand-primary min-h-[80px]" />
                                        </div>
                                    </div>
                                </div>

                                {/* Branding */}
                                <div>
                                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center border-b border-border-subtle pb-2">
                                        <Image className="w-4 h-4 mr-2" /> Branding Assets
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Logo URL (for PDFs)</label>
                                            <input type="text" value={companySettings.logoUrl} onChange={e => setCompanySettings({...companySettings, logoUrl: e.target.value})} className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary" placeholder="https://..." />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Signature Image URL</label>
                                            <input type="text" value={companySettings.signatureUrl} onChange={e => setCompanySettings({...companySettings, signatureUrl: e.target.value})} className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary" placeholder="https://..." />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-border-subtle flex justify-end">
                                    <button 
                                        type="submit" 
                                        disabled={isSavingCompany}
                                        className="btn-primary text-xs px-6 py-2.5 rounded-xl font-semibold disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isSavingCompany ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Save Company Settings
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                {/* Sidebar (System Info) */}
                <div className="space-y-6">
                    <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-brand-primary flex items-center justify-center">
                                <SettingsIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-text-primary">System Information</h2>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-border-subtle">
                                <span className="text-xs text-text-muted font-medium">ERP Version</span>
                                <span className="text-xs font-bold text-brand-primary">v2.0.0</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-border-subtle">
                                <span className="text-xs text-text-muted font-medium">Environment</span>
                                <span className="text-xs font-semibold text-text-primary">Production</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-border-subtle">
                                <span className="text-xs text-text-muted font-medium">Design System</span>
                                <span className="text-xs font-semibold text-emerald-600">ACROVIX Teal SaaS</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

