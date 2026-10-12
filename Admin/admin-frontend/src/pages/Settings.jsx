import React, { useState, useEffect } from 'react';
import { User, Moon, Sun, Shield, Settings as SettingsIcon, Save, Lock, Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { fetchApi } from '../services/api';

export default function Settings() {
    const { user: authUser, setUser: setAuthUser } = useAuth();
    const { theme, toggleTheme } = useTheme();

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

    useEffect(() => {
        const loadData = async () => {
            try {
                const profileData = await fetchApi('/profile');
                setProfile(profileData);
                setName(profileData.name);
                setEmail(profileData.email);
            } catch (error) {
                console.error("Failed to load profile", error);
            } finally {
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

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-12 pt-2">
            <div>
                <h1 className="text-[28px] font-bold text-text-primary tracking-tight leading-tight flex items-center gap-2">
                    <SettingsIcon className="w-7 h-7 text-[var(--color-brand-primary)]" />
                    Settings
                </h1>
                <p className="text-[13px] text-text-secondary mt-1">Manage your account preferences and personal application settings.</p>
            </div>

            {/* Top Row — Two Columns (Profile Preferences & Security) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left column: Profile Preferences */}
                <div className="acx-card p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center">
                                <User className="w-5 h-5 text-brand-primary" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-text-primary tracking-tight">Profile Preferences</h2>
                                <p className="text-[12px] text-text-muted">Your personal account information</p>
                            </div>
                        </div>
                        
                        {profileMessage && (
                            <div className={`mb-6 p-3 rounded-xl flex items-center gap-2 text-[13px] font-medium ${profileMessage.type === 'success' ? 'bg-brand-success/10 text-brand-success' : 'bg-brand-danger/10 text-brand-danger'}`}>
                                {profileMessage.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                                <span>{profileMessage.text}</span>
                            </div>
                        )}

                        <form id="profile-form" onSubmit={handleProfileSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">Full Name</label>
                                <input 
                                    type="text" 
                                    value={name} 
                                    onChange={e => setName(e.target.value)}
                                    required
                                    className="w-full px-4 py-2 bg-bg-main focus:bg-bg-card border border-border-subtle focus:border-[var(--color-brand-primary)] rounded-lg text-sm text-text-primary outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">Email Address</label>
                                <input 
                                    type="email" 
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-2 bg-bg-main focus:bg-bg-card border border-border-subtle focus:border-[var(--color-brand-primary)] rounded-lg text-sm text-text-primary outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">Role</label>
                                <div className="flex items-center gap-2 px-4 py-2 bg-bg-muted border border-border-subtle rounded-lg text-sm text-text-muted cursor-not-allowed">
                                    <Shield className="w-4 h-4 text-text-muted shrink-0" />
                                    <span>{profile?.role?.replace('_', ' ')}</span>
                                </div>
                            </div>
                        </form>
                    </div>
                    
                    <div className="pt-6 mt-auto">
                        <button 
                            type="submit" 
                            form="profile-form"
                            disabled={isSavingProfile || (name === profile?.name && email === profile?.email)}
                            className="btn btn-primary btn-md w-full sm:w-auto"
                        >
                            {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Profile
                        </button>
                    </div>
                </div>

                {/* Right column: Security */}
                <div className="acx-card p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-brand-danger/10 flex items-center justify-center">
                                <Lock className="w-5 h-5 text-brand-danger" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-text-primary tracking-tight">Security</h2>
                                <p className="text-[12px] text-text-muted">Update your password</p>
                            </div>
                        </div>

                        {passwordMessage && (
                            <div className={`mb-6 p-3 rounded-xl flex items-center gap-2 text-[13px] font-medium ${passwordMessage.type === 'success' ? 'bg-brand-success/10 text-brand-success' : 'bg-brand-danger/10 text-brand-danger'}`}>
                                {passwordMessage.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                                <span>{passwordMessage.text}</span>
                            </div>
                        )}

                        <form id="password-form" onSubmit={handlePasswordSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">Current Password</label>
                                <div className="relative">
                                    <input 
                                        type={showCurrentPassword ? "text" : "password"} 
                                        value={currentPassword} 
                                        onChange={e => setCurrentPassword(e.target.value)}
                                        required
                                        className="w-full pl-4 pr-11 py-2 bg-bg-main focus:bg-bg-card border border-border-subtle focus:border-[var(--color-brand-primary)] rounded-lg text-sm text-text-primary outline-none transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute inset-y-0 right-0 px-3 flex items-center text-text-muted hover:text-text-primary transition-colors"
                                    >
                                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">New Password</label>
                                <div className="relative">
                                    <input 
                                        type={showNewPassword ? "text" : "password"} 
                                        value={newPassword} 
                                        onChange={e => setNewPassword(e.target.value)}
                                        required
                                        minLength={8}
                                        className="w-full pl-4 pr-11 py-2 bg-bg-main focus:bg-bg-card border border-border-subtle focus:border-[var(--color-brand-primary)] rounded-lg text-sm text-text-primary outline-none transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute inset-y-0 right-0 px-3 flex items-center text-text-muted hover:text-text-primary transition-colors"
                                    >
                                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">Confirm New Password</label>
                                <div className="relative">
                                    <input 
                                        type={showConfirmPassword ? "text" : "password"} 
                                        value={confirmPassword} 
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        required
                                        minLength={8}
                                        className="w-full pl-4 pr-11 py-2 bg-bg-main focus:bg-bg-card border border-border-subtle focus:border-[var(--color-brand-primary)] rounded-lg text-sm text-text-primary outline-none transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute inset-y-0 right-0 px-3 flex items-center text-text-muted hover:text-text-primary transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                    
                    <div className="pt-6 mt-auto">
                        <button 
                            type="submit" 
                            form="password-form"
                            disabled={isSavingPassword || !currentPassword || !newPassword || !confirmPassword}
                            className="btn btn-primary btn-md w-full sm:w-auto"
                        >
                            {isSavingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                            Change Password
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Row — Remaining Settings (Appearance & System Info) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Appearance */}
                <div className="acx-card p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                                <Sun className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-text-primary tracking-tight">Appearance</h2>
                                <p className="text-[12px] text-text-muted">Customize how ACROVIX looks on your device</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-bg-main border border-border-subtle rounded-xl">
                            <div>
                                <p className="text-sm font-semibold text-text-primary">Theme Mode</p>
                                <p className="text-[12px] text-text-muted">Switch between light and dark modes.</p>
                            </div>
                            <button 
                                type="button"
                                onClick={toggleTheme}
                                className="btn btn-secondary btn-md inline-flex items-center gap-2"
                            >
                                {theme === 'dark' ? (
                                    <><Moon className="w-4 h-4 text-purple-400" /> Dark Mode</>
                                ) : (
                                    <><Sun className="w-4 h-4 text-amber-500" /> Light Mode</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* System Info */}
                <div className="acx-card p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-brand-success/10 flex items-center justify-center">
                                <SettingsIcon className="w-5 h-5 text-brand-success" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-text-primary tracking-tight">System Info</h2>
                                <p className="text-[12px] text-text-muted">Application and environment specifications</p>
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2.5 px-3 bg-bg-main border border-border-subtle rounded-lg">
                                <span className="text-[13px] text-text-secondary">Version</span>
                                <span className="text-[13px] font-semibold text-text-primary">v2.0.0</span>
                            </div>
                            <div className="flex justify-between items-center py-2.5 px-3 bg-bg-main border border-border-subtle rounded-lg">
                                <span className="text-[13px] text-text-secondary">Environment</span>
                                <span className="text-[13px] font-semibold text-text-primary">Production</span>
                            </div>
                            <div className="flex justify-between items-center py-2.5 px-3 bg-bg-main border border-border-subtle rounded-lg">
                                <span className="text-[13px] text-text-secondary">Framework</span>
                                <span className="text-[13px] font-semibold text-text-primary">React 18</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
