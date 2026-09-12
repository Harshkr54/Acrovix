import React, { useState, useEffect } from 'react';
import { User, Moon, Sun, Shield, Settings as SettingsIcon, Save, Lock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
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
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState(null);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const data = await fetchApi('/profile');
                setProfile(data);
                setName(data.name);
                setEmail(data.email);
            } catch (error) {
                console.error("Failed to load profile", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadProfile();
    }, []);

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
            // Because of the api.js update, a 401 on /profile/password throws an error but doesn't logout
            setPasswordMessage({ type: 'error', text: error.status === 401 ? 'Current password is incorrect.' : error.message });
        } finally {
            setIsSavingPassword(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[#14B8A6]" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12 pt-2">
            <div>
                <h1 className="text-[28px] font-bold text-text-primary tracking-tight leading-tight">Settings</h1>
                <p className="text-[13px] text-text-secondary mt-1">Manage your account preferences and application settings.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                {/* Main Settings Column */}
                <div className="md:col-span-2 space-y-6">
                    
                    {/* Profile Preferences */}
                    <div className="card p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-[#EFF6FF] flex items-center justify-center">
                                <User className="w-5 h-5 text-[#2563EB]" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-text-primary tracking-tight">Profile Preferences</h2>
                                <p className="text-[12px] text-text-muted">Your personal account information</p>
                            </div>
                        </div>
                        
                        {profileMessage && (
                            <div className={`mb-6 p-3 rounded-xl flex items-center gap-2 text-[13px] font-medium ${profileMessage.type === 'success' ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#FEF2F2] text-[#DC2626]'}`}>
                                {profileMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                {profileMessage.text}
                            </div>
                        )}

                        <form onSubmit={handleProfileSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">Full Name</label>
                                <input 
                                    type="text" 
                                    value={name} 
                                    onChange={e => setName(e.target.value)}
                                    required
                                    className="w-full px-4 py-2 bg-bg-main focus:bg-bg-card border border-border-subtle focus:border-[#4F46E5] rounded-lg text-sm text-text-primary outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">Email Address</label>
                                <input 
                                    type="email" 
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-2 bg-bg-main focus:bg-bg-card border border-border-subtle focus:border-[#4F46E5] rounded-lg text-sm text-text-primary outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">Role</label>
                                <div className="flex items-center gap-2 px-4 py-2 bg-bg-muted border border-border-subtle rounded-lg text-sm text-text-muted cursor-not-allowed">
                                    <Shield className="w-4 h-4 text-text-muted" />
                                    <span>{profile?.role?.replace('_', ' ')}</span>
                                </div>
                            </div>
                            
                            <div className="pt-2">
                                <button 
                                    type="submit" 
                                    disabled={isSavingProfile || (name === profile?.name && email === profile?.email)}
                                    className="btn-primary px-6 py-2 shadow-sm disabled:opacity-50"
                                >
                                    {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                    Save Profile
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Change Password */}
                    <div className="card p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-[#FEF2F2] flex items-center justify-center">
                                <Lock className="w-5 h-5 text-[#DC2626]" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-text-primary tracking-tight">Security</h2>
                                <p className="text-[12px] text-text-muted">Update your password</p>
                            </div>
                        </div>

                        {passwordMessage && (
                            <div className={`mb-6 p-3 rounded-xl flex items-center gap-2 text-[13px] font-medium ${passwordMessage.type === 'success' ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#FEF2F2] text-[#DC2626]'}`}>
                                {passwordMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                {passwordMessage.text}
                            </div>
                        )}

                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">Current Password</label>
                                <input 
                                    type="password" 
                                    value={currentPassword} 
                                    onChange={e => setCurrentPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-2 bg-bg-main focus:bg-bg-card border border-border-subtle focus:border-[#4F46E5] rounded-lg text-sm text-text-primary outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">New Password</label>
                                <input 
                                    type="password" 
                                    value={newPassword} 
                                    onChange={e => setNewPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    className="w-full px-4 py-2 bg-bg-main focus:bg-bg-card border border-border-subtle focus:border-[#4F46E5] rounded-lg text-sm text-text-primary outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">Confirm New Password</label>
                                <input 
                                    type="password" 
                                    value={confirmPassword} 
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    className="w-full px-4 py-2 bg-bg-main focus:bg-bg-card border border-border-subtle focus:border-[#4F46E5] rounded-lg text-sm text-text-primary outline-none transition-all"
                                />
                            </div>
                            
                            <div className="pt-2">
                                <button 
                                    type="submit" 
                                    disabled={isSavingPassword || !currentPassword || !newPassword || !confirmPassword}
                                    className="btn-primary px-6 py-2 shadow-sm disabled:opacity-50"
                                >
                                    {isSavingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                                    Change Password
                                </button>
                            </div>
                        </form>
                    </div>
                    
                    {/* Appearance */}
                    <div className="card p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-[#F5F3FF] flex items-center justify-center">
                                <Sun className="w-5 h-5 text-[#7C3AED]" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-text-primary tracking-tight">Appearance</h2>
                                <p className="text-[12px] text-text-muted">Customize how ACROVIX looks on your device</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 border border-border-subtle rounded-xl">
                            <div>
                                <p className="text-sm font-semibold text-text-primary">Theme</p>
                                <p className="text-[12px] text-text-muted">Switch between light and dark modes.</p>
                            </div>
                            <button 
                                onClick={toggleTheme}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-muted hover:bg-bg-hover transition-colors border border-border-subtle text-sm font-medium text-text-primary cursor-pointer"
                            >
                                {theme === 'dark' ? (
                                    <><Moon className="w-4 h-4" /> Dark Mode</>
                                ) : (
                                    <><Sun className="w-4 h-4" /> Light Mode</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sidebar (System Info) */}
                <div className="md:col-span-1 space-y-6">
                    <div className="card p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-[#ECFDF5] flex items-center justify-center">
                                <SettingsIcon className="w-5 h-5 text-[#059669]" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-text-primary tracking-tight">System Info</h2>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-border-subtle">
                                <span className="text-[13px] text-text-secondary">Version</span>
                                <span className="text-[13px] font-semibold text-text-primary">v2.0.0</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-border-subtle">
                                <span className="text-[13px] text-text-secondary">Environment</span>
                                <span className="text-[13px] font-semibold text-text-primary">Production</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-border-subtle">
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
