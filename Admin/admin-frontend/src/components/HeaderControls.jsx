import React, { useState, useEffect, useRef } from 'react';
import { FileText, Sun, Moon, Bell, Settings as SettingsIcon, ChevronRight, LogOut, File, Clock, Loader2, Check } from 'lucide-react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { fetchApi } from '../services/api';
import { getInitials } from '../utils/userUtils';

export default function HeaderControls({ onLogout }) {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    const [activeDropdown, setActiveDropdown] = useState(null);
    const containerRef = useRef(null);

    const [quotations, setQuotations] = useState(null);
    const [isQuotationsLoading, setIsQuotationsLoading] = useState(false);

    const [notifications, setNotifications] = useState(null);
    const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const handleLogout = () => {
        if (onLogout) {
            onLogout();
        } else {
            logout();
            navigate('/login', { replace: true });
        }
    };

    const toggleDropdown = (dropdownName) => {
        if (activeDropdown === dropdownName) {
            setActiveDropdown(null);
        } else {
            setActiveDropdown(dropdownName);
            if (dropdownName === 'docs' && !quotations) {
                fetchQuotations();
            }
            if (dropdownName === 'notifications') {
                if (!notifications) fetchNotifications();
            }
        }
    };

    useEffect(() => {
        setActiveDropdown(null);
    }, [location.pathname]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setActiveDropdown(null);
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setActiveDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        
        // Initial fetch for notifications to get unread count
        fetchUnreadCount();

        const handleNotificationUpdate = () => {
            fetchUnreadCount();
        };

        window.addEventListener('notification-update', handleNotificationUpdate);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
            window.removeEventListener('notification-update', handleNotificationUpdate);
        };
    }, []);

    const fetchQuotations = async () => {
        setIsQuotationsLoading(true);
        try {
            const data = await fetchApi('/quotations?page=0&size=20');
            setQuotations(data.content || []);
        } catch (error) {
            console.error("Error fetching quotations", error);
        } finally {
            setIsQuotationsLoading(false);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const data = await fetchApi('/notifications/unread-count');
            setUnreadCount(data?.unreadCount ?? 0);
        } catch (error) {
            console.error("Error fetching unread count", error);
        }
    };

    const fetchNotifications = async (isInitial = false) => {
        if (!isInitial) setIsNotificationsLoading(true);
        try {
            const data = await fetchApi('/notifications?page=0&size=20');
            setNotifications(data.content || []);
            // refresh unread count just in case
            fetchUnreadCount();
        } catch (error) {
            console.error("Error fetching notifications", error);
        } finally {
            if (!isInitial) setIsNotificationsLoading(false);
        }
    };

    const markAsRead = async (id, e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await fetchApi(`/notifications/${id}/read`, { method: 'PATCH' });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Error marking read", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await fetchApi('/notifications/read-all', { method: 'PATCH' });
            setNotifications(prev => prev?.map(n => ({ ...n, read: true })) || []);
            setUnreadCount(0);
        } catch (error) {
            console.error("Error marking all read", error);
        }
    };

    const draftQuotations = quotations?.filter(q => q.status === 'DRAFT').slice(0, 5) || [];
    const recentQuotations = quotations?.filter(q => q.status !== 'DRAFT').slice(0, 5) || [];

    const getNotificationLink = (notification) => {
        if (notification.type === 'ENQUIRY_ASSIGNED') {
            return '/enquiries';
        } else if (notification.type === 'QUOTATION_SENT' || notification.type === 'QUOTATION_RESPONDED') {
            if (notification.relatedEntityType === 'QUOTATION' && notification.relatedEntityId) {
                return `/quotations/edit/${notification.relatedEntityId}`;
            }
            return '/quotations';
        } else if (notification.type === 'NEW_LEAD_CREATED' || notification.type === 'LEAD_ASSIGNED') {
            return '/crm/leads';
        } else if (notification.type === 'FOLLOW_UP_DUE' || notification.type === 'FOLLOW_UP_OVERDUE') {
            return '/crm/leads';
        } else if (notification.type === 'INVOICE_CREATED' || notification.type === 'INVOICE_OVERDUE' || notification.type === 'INVOICE_FULLY_PAID') {
            return '/invoices';
        } else if (notification.type === 'PAYMENT_RECEIVED' || notification.type === 'PAYMENT_PARTIAL') {
            return '/payments';
        } else if (notification.type === 'CUSTOMER_CREATED') {
            return '/customers';
        } else if (notification.type === 'ENQUIRY_CONVERTED') {
            return '/crm/leads';
        } else if (notification.type === 'LOGIN_FAILED' || notification.type === 'LOGIN_RATE_LIMITED') {
            // Probably no specific page, but security/activity page if exists. Default to root.
            return '/';
        }
        return '/';
    };

    return (
        <div className="flex items-center gap-3" ref={containerRef}>
            
            {/* Documents Dropdown (Hidden per reference visual match) */}
            {/* 
            <div className="relative">
                <button 
                    onClick={() => toggleDropdown('docs')}
                    className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
                        activeDropdown === 'docs' 
                            ? 'bg-bg-hover border-border-subtle text-text-primary shadow-sm' 
                            : 'bg-bg-card border-border-subtle text-text-muted hover:text-text-primary hover:shadow-sm'
                    }`}
                >
                    <FileText className="w-4 h-4" />
                </button>

                {activeDropdown === 'docs' && (
                    <div className="absolute right-0 mt-2 w-72 bg-bg-card rounded-2xl shadow-lg border border-border-subtle overflow-hidden z-50 animate-dropdown-entrance">
                        <div className="px-4 py-3 border-b border-border-subtle bg-bg-muted/30">
                            <h3 className="text-sm font-bold text-text-primary">Quick Access</h3>
                        </div>
                        
                        <div className="max-h-[350px] overflow-y-auto">
                            {isQuotationsLoading ? (
                                <div className="flex justify-center items-center py-8">
                                    <Loader2 className="w-5 h-5 animate-spin text-brand-teal" />
                                </div>
                            ) : (
                                <>
                                    <div className="px-2 py-2">
                                        <div className="px-2 py-1.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                                            Recent Quotations
                                        </div>
                                        {recentQuotations.length > 0 ? (
                                            recentQuotations.map(q => (
                                                <Link 
                                                    key={q.id} 
                                                    to="/quotations" 
                                                    onClick={() => setActiveDropdown(null)}
                                                    className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-bg-hover transition-colors"
                                                >
                                                    <div className="w-8 h-8 rounded bg-brand-teal/10 flex items-center justify-center shrink-0">
                                                        <FileText className="w-3.5 h-3.5 text-brand-teal" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[13px] font-semibold text-text-primary truncate">{q.quotationNumber}</p>
                                                        <p className="text-[11px] text-text-muted truncate">{q.clientCompany || q.clientName}</p>
                                                    </div>
                                                </Link>
                                            ))
                                        ) : (
                                            <div className="px-4 py-3 text-[12px] text-text-muted text-center">No recent quotations</div>
                                        )}
                                    </div>

                                    <div className="h-px bg-border-subtle mx-4"></div>

                                    <div className="px-2 py-2">
                                        <div className="px-2 py-1.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                                            Quotation Drafts
                                        </div>
                                        {draftQuotations.length > 0 ? (
                                            draftQuotations.map(q => (
                                                <Link 
                                                    key={q.id} 
                                                    to={`/quotations/edit/${q.id}`}
                                                    onClick={() => setActiveDropdown(null)}
                                                    className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-bg-hover transition-colors"
                                                >
                                                    <div className="w-8 h-8 rounded bg-brand-primary/10 flex items-center justify-center shrink-0">
                                                        <File className="w-3.5 h-3.5 text-brand-primary" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[13px] font-semibold text-text-primary truncate">{q.quotationNumber || 'Draft Quotation'}</p>
                                                        <p className="text-[11px] text-text-muted truncate">{q.clientCompany || q.clientName}</p>
                                                    </div>
                                                </Link>
                                            ))
                                        ) : (
                                            <div className="px-4 py-3 text-[12px] text-text-muted text-center">No draft quotations</div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                        
                        <div className="p-2 border-t border-border-subtle bg-bg-muted/30">
                            <Link 
                                                to="/quotations" 
                                                onClick={() => setActiveDropdown(null)}
                                                className="block w-full py-2 text-center text-[12px] font-semibold text-brand-primary hover:bg-bg-hover rounded-lg transition-colors"
                                            >
                                View All Quotations →
                            </Link>
                        </div>
                    </div>
                )}
            </div>
            */
            }

            {/* Theme Toggle (Mobile only, Desktop is in Sidebar) */}
            <button
                onClick={toggleTheme}
                className="header-icon-button lg:hidden"
                aria-label="Toggle Theme"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
                {theme === 'light' ? <Sun className="w-[20px] h-[20px] text-[#FACC15]" /> : <Moon className="w-[20px] h-[20px]" />}
            </button>

            {/* Notifications Dropdown */}
            <div className="relative">
                <button 
                    onClick={() => toggleDropdown('notifications')}
                    className={`relative ${activeDropdown === 'notifications' ? 'header-icon-button bg-bg-hover text-text-primary border-border-subtle shadow-sm' : 'header-icon-button'}`}
                >
                    <Bell className="w-[20px] h-[20px]" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] px-1 bg-brand-danger rounded-full ring-2 ring-bg-main flex items-center justify-center text-[9px] font-bold text-white leading-none">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>

                {activeDropdown === 'notifications' && (
                    <div className="absolute right-0 mt-2 w-80 bg-bg-card rounded-2xl shadow-lg border border-border-subtle overflow-hidden z-50 animate-dropdown-entrance">
                        <div className="px-4 py-3 border-b border-border-subtle bg-bg-muted/30 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-text-primary">Notifications</h3>
                            {unreadCount > 0 && (
                                <button 
                                    onClick={markAllAsRead}
                                    className="text-[10px] font-bold text-brand-primary hover:text-brand-primary/80 px-2 py-0.5 rounded-full hover:bg-brand-primary/10 transition-colors"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>
                        
                        <div className="max-h-[350px] overflow-y-auto p-2">
                            {isNotificationsLoading ? (
                                <div className="flex justify-center items-center py-8">
                                    <Loader2 className="w-5 h-5 animate-spin text-brand-teal" />
                                </div>
                            ) : notifications && notifications.length > 0 ? (
                                notifications.map(notification => (
                                    <Link 
                                        key={notification.id} 
                                        to={getNotificationLink(notification)}
                                        onClick={() => {
                                            if (!notification.read) markAsRead(notification.id, { preventDefault: () => {}, stopPropagation: () => {} });
                                            setActiveDropdown(null);
                                        }}
                                        className={`flex gap-3 p-3 rounded-xl hover:bg-bg-hover transition-colors relative group ${!notification.read ? 'bg-bg-muted/30' : ''}`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${!notification.read ? 'bg-brand-primary/10' : 'bg-bg-card border border-border-subtle'}`}>
                                            <Bell className={`w-3.5 h-3.5 ${!notification.read ? 'text-brand-primary' : 'text-text-muted'}`} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className={`text-[13px] leading-tight ${!notification.read ? 'font-bold text-text-primary' : 'font-semibold text-text-secondary'}`}>
                                                {notification.title}
                                            </p>
                                            <p className="text-[12px] text-text-muted mt-0.5 leading-snug">{notification.message}</p>
                                            <p className="text-[10px] text-text-muted mt-1 font-medium">
                                                {new Date(notification.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        {!notification.read && (
                                            <button 
                                                onClick={(e) => markAsRead(notification.id, e)}
                                                className="absolute right-3 top-3 p-1 rounded-full text-text-muted hover:text-brand-primary hover:bg-brand-primary/10 opacity-0 group-hover:opacity-100 transition-all"
                                                title="Mark as read"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </Link>
                                ))
                            ) : (
                                <div className="px-4 py-10 flex flex-col items-center justify-center text-center">
                                    <div className="w-10 h-10 rounded-full bg-bg-muted flex items-center justify-center mb-3">
                                        <Clock className="w-4 h-4 text-text-muted opacity-50" />
                                    </div>
                                    <p className="text-[13px] font-semibold text-text-primary">No notifications</p>
                                    <p className="text-[11px] text-text-muted mt-1">You're all caught up!</p>
                                </div>
                            )}
                        </div>
                        
                    </div>
                )}
            </div>

            {/* Settings Link */}
            <button 
                onClick={() => {
                    setActiveDropdown(null);
                    navigate('/settings');
                }}
                className="hidden sm:flex header-icon-button"
            >
                <SettingsIcon className="w-[20px] h-[20px]" />
            </button>
            
            <div className="hidden sm:block header-divider mx-1 lg:mx-2"></div>

            {/* SA Profile / Account Menu (Mobile only, Desktop is in Sidebar) */}
            <div className="flex items-center relative lg:hidden">
                <div 
                    onClick={() => toggleDropdown('profile')}
                    className={`flex items-center gap-3 px-1.5 py-1.5 sm:pr-4 pr-1.5 rounded-full border shadow-sm cursor-pointer transition-all ${
                        activeDropdown === 'profile'
                            ? 'bg-bg-hover border-border-subtle'
                            : 'bg-bg-card border-border-subtle hover:bg-bg-hover'
                    }`}
                >
                    <div className="w-[40px] h-[40px] rounded-full bg-[var(--color-brand-primary)] flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                        {getInitials(user?.name)}
                    </div>
                    <div className="hidden sm:flex flex-col justify-center min-w-[100px] max-w-[160px]">
                        <span className="text-[13.5px] font-bold text-text-primary leading-tight truncate">{user?.name || 'Admin User'}</span>
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider leading-tight mt-0.5 truncate">{user?.role?.replace('_', ' ')}</span>
                    </div>
                    <ChevronRight className={`hidden sm:block w-4 h-4 text-text-muted transition-transform ml-1 ${activeDropdown === 'profile' ? '-rotate-90' : 'rotate-90'}`} />
                </div>

                {activeDropdown === 'profile' && (
                    <div className="absolute top-full right-0 mt-3 w-64 bg-bg-card rounded-2xl shadow-lg border border-border-subtle overflow-hidden z-50 animate-dropdown-entrance">
                        <div className="px-4 py-4 border-b border-border-subtle bg-bg-muted/30">
                            <p className="text-sm font-bold text-text-primary truncate">{user?.name || 'Admin User'}</p>
                            <p className="text-[12px] text-text-secondary truncate mt-0.5">{user?.email}</p>
                            <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-brand-primary/10 text-brand-primary">
                                {user?.role?.replace('_', ' ')}
                            </div>
                        </div>
                        
                        <div className="p-2 space-y-1">
                            <Link 
                                to="/settings" 
                                onClick={() => setActiveDropdown(null)}
                                className="flex items-center gap-3 w-full px-3 py-2 text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-xl transition-colors"
                            >
                                <SettingsIcon className="w-4 h-4" />
                                Account Settings
                            </Link>
                        </div>
                        
                        <div className="p-2 border-t border-border-subtle">
                            <button 
                                onClick={handleLogout}
                                className="flex items-center gap-3 w-full px-3 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign out
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
