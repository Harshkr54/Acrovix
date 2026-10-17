import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTenant } from '../context/TenantContext';
import { LayoutDashboard, MessageSquare, LogOut, FileText, Shield, Menu, X, ChevronLeft, ChevronRight, Sun, Moon, Search, Bell, Settings, Trash2, PanelLeftClose, PanelLeftOpen, ArrowLeft, UsersRound, Package, ShoppingCart, CreditCard, DollarSign, BarChart3, Target, TrendingUp, Clock, Calendar, Building2, Zap } from 'lucide-react';
import HeaderControls from './HeaderControls';
import { getInitials } from '../utils/userUtils';
import { fetchApi, resolveAssetUrl } from '../services/api';

import logoLightExpanded from '../assets/acrovix_logo1.png';
import logoDarkExpanded from '../assets/acrovix_logo_dark.png';
import logoLightCollapsed from '../assets/Acrovix_light.png';
import logoDarkCollapsed from '../assets/acrovix_collapsed_dark.png';

const DateTimeDisplay = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const dateOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
    const dateStr = time.toLocaleDateString('en-US', dateOptions);
    const timeStr = time.toLocaleTimeString('en-US', timeOptions);

    return (
        <div className="hidden xl:flex items-center text-xs text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800/40 px-2.5 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700/30 font-medium">
            <span>{dateStr}</span>
            <span className="mx-1.5 text-slate-400/60">·</span>
            <span>{timeStr}</span>
        </div>
    );
};

export default function Layout() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { tenant, isPlatformOwner } = useTenant();
    const isOwnerWorkspace = isPlatformOwner(user) || 
        user?.tenantId === 1 || 
        user?.tenantId === '1' || 
        user?.tenantSlug === 'default' || 
        tenant?.slug === 'default' || 
        user?.email?.toLowerCase() === 'sales@acrovix.com' || 
        user?.email?.toLowerCase()?.endsWith('@acrovix.com');
    const activeTenantName = isOwnerWorkspace ? 'Acrovix Innovations' : (tenant?.brandName || tenant?.companyName || 'Acrovix Innovations');
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem('admin_sidebar_collapsed');
        return saved === 'true';
    });
    const [isExiting, setIsExiting] = useState(false);

    const toggleSidebar = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('admin_sidebar_collapsed', newState);
    };

    // Global Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({ enquiries: [], quotations: [], customers: [] });
    const [isSearching, setIsSearching] = useState(false);
    const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
    const searchRef = useRef(null);
    const mainContentRef = useRef(null);

    // Route transition effect without remounting
    useEffect(() => {
        if (mainContentRef.current) {
            mainContentRef.current.classList.remove('animate-fade-in-up');
            void mainContentRef.current.offsetWidth; // trigger reflow
            mainContentRef.current.classList.add('animate-fade-in-up');
        }
    }, [location.pathname]);

    useEffect(() => {
        let active = true;
        if (!searchQuery.trim() || searchQuery.trim().length < 2) {
            setSearchResults({ enquiries: [], quotations: [], customers: [] });
            setSearchDropdownOpen(false);
            setIsSearching(false);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsSearching(true);
            try {
                const [enqRes, quotRes, custRes] = await Promise.all([
                    fetchApi(`/enquiries?search=${encodeURIComponent(searchQuery)}&size=5`),
                    fetchApi(`/quotations?search=${encodeURIComponent(searchQuery)}&size=5`),
                    fetchApi(`/customers?search=${encodeURIComponent(searchQuery)}&size=5`)
                ]);
                if (active) {
                    setSearchResults({
                        enquiries: enqRes.content || [],
                        quotations: quotRes.content || [],
                        customers: custRes.content || []
                    });
                    setSearchDropdownOpen(true);
                }
            } catch (error) {
                if (active) console.error("Global search error", error);
            } finally {
                if (active) setIsSearching(false);
            }
        }, 300);

        return () => {
            active = false;
            clearTimeout(delayDebounceFn);
        };
    }, [searchQuery]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setSearchDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleClearSearch = () => {
        setSearchQuery('');
        setSearchResults({ enquiries: [], quotations: [], customers: [] });
        setSearchDropdownOpen(false);
    };

    const handleSearchNavigate = (path) => {
        navigate(path);
        setSearchDropdownOpen(false);
        setSearchQuery('');
    };

    const handleLogout = () => {
        setIsExiting(true);
        setTimeout(() => {
            logout();
            navigate('/login', { replace: true });
        }, 200);
    };

    const workspaceItems = [
        { path: '/', name: 'Overview', icon: LayoutDashboard },
        { path: '/customers', name: 'Customers', icon: UsersRound },
        { path: '/catalog', name: 'Catalog', icon: Package },
        { path: '/enquiries', name: 'Enquiries', icon: MessageSquare },
        { path: '/quotations', name: 'Quotations', icon: FileText },
        { path: '/purchase-orders', name: 'Purchase Orders', icon: ShoppingCart },
        { path: '/invoices', name: 'Invoices', icon: FileText },
        { path: '/payments', name: 'Payments', icon: CreditCard },
        ...((user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN') ? [
            { path: '/receivables', name: 'Receivables', icon: DollarSign },
            { path: '/reports', name: 'Reports', icon: BarChart3 },
            { path: '/company-bank-details', name: 'Company & Bank Details', icon: Building2 }
        ] : [])
    ];

    const crmItems = [
        { path: '/crm', name: 'CRM Dashboard', icon: Target, exact: true },
        { path: '/crm/leads', name: 'Leads', icon: UsersRound },
        { path: '/crm/pipeline', name: 'Pipeline', icon: TrendingUp },
        { path: '/crm/follow-ups', name: 'Follow-ups', icon: Clock }
    ];

    const managementItems = [];
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN') {
        if (isPlatformOwner(user)) {
            managementItems.push({ path: '/workspaces', name: 'Workspaces / Tenants', icon: Building2 });
        }
        managementItems.push({ path: '/users', name: 'Users', icon: Shield });
        managementItems.push({ path: '/automation', name: 'Automation Center', icon: Zap });
    }

    const systemItems = [
        { path: '/trash', name: 'Trash', icon: Trash2 },
        { path: '/settings', name: 'Settings', icon: Settings }
    ];

    return (
        <div className={`flex h-screen bg-slate-50 dark:bg-[#0B0F17] text-text-primary overflow-hidden ${isExiting ? 'animate-page-exit' : 'animate-page-entrance'}`}>
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar (Seamless L-Frame Outer Surface) */}
            <div className={`sidebar fixed inset-y-0 left-0 z-50 flex flex-col shrink-0 lg:relative lg:translate-x-0 lg:h-screen bg-slate-50 dark:bg-[#0B0F17] ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'w-[68px]' : 'w-[244px]'}` }>
                <div className="w-full h-[52px] bg-transparent flex items-center px-4 shrink-0 relative z-10">
                    {!isCollapsed && (
                        tenant?.logoUrl ? (
                            <img
                                id="tenantNavbarLogo"
                                src={resolveAssetUrl(tenant.logoUrl)}
                                alt={tenant?.brandName || "Workspace"}
                                className="max-h-8 max-w-[190px] w-auto object-contain transition-all"
                            />
                        ) : isOwnerWorkspace ? (
                            <img
                                id="acrovixOwnerLogo"
                                src={theme === 'dark' ? logoDarkExpanded : logoLightExpanded}
                                alt="ACROVIX"
                                className="max-h-8 max-w-[190px] w-auto object-contain transition-all"
                            />
                        ) : (
                            <div id="tenantNavbarBrand" className="flex items-center gap-2.5 max-w-[210px]">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                                    {(tenant?.brandName || tenant?.companyName || 'Acrovix Innovations').slice(0, 2).toUpperCase()}
                                </div>
                                <div className="flex flex-col min-w-0 text-left">
                                    <span id="tenantNavbarBrandName" className="text-xs font-bold text-text-primary truncate tracking-tight">
                                        {activeTenantName}
                                    </span>
                                    <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">
                                        Workspace
                                    </span>
                                </div>
                            </div>
                        )
                    )}
                    {isCollapsed && (
                        <div className="w-full flex justify-center">
                            {tenant?.faviconUrl ? (
                                <img
                                    src={resolveAssetUrl(tenant.faviconUrl)}
                                    alt={tenant?.brandName || "Workspace"}
                                    className="max-h-7 max-w-[32px] w-auto object-contain transition-all"
                                />
                            ) : isOwnerWorkspace ? (
                                <img
                                    src={theme === 'dark' ? logoDarkCollapsed : logoLightCollapsed}
                                    alt="ACX"
                                    className="max-h-7 max-w-[32px] w-auto object-contain transition-all"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                                    {(tenant?.brandName || tenant?.companyName || 'Acrovix Innovations').slice(0, 2).toUpperCase()}
                                </div>
                            )}
                        </div>
                    )}
                    <button onClick={() => setIsSidebarOpen(false)} aria-label="Close sidebar" className="lg:hidden absolute right-4 text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-3 hide-scrollbar flex flex-col">
                    <nav className="space-y-1 flex-1">
                        {/* Workspace Section */}
                        <div className="flex flex-col space-y-[2px]">
                            {workspaceItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.path}
                                        onClick={() => setIsSidebarOpen(false)}
                                        className={`group ${isActive ? 'sidebar-nav-item-active' : 'sidebar-nav-item'}`}
                                        style={isCollapsed ? { justifyContent: 'center' } : {}}
                                    >
                                        <Icon className={`sidebar-nav-icon ${isCollapsed ? '!mr-0' : ''}`} />
                                        {!isCollapsed && <span>{item.name}</span>}

                                        {isCollapsed && (
                                            <div className="sidebar-tooltip">
                                                {item.name}
                                            </div>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>

                        <div className="sidebar-separator"></div>

                        {/* CRM & Sales Section */}
                        <div className="flex flex-col space-y-[2px]">
                            {!isCollapsed && <p className="sidebar-section-title">CRM & Sales</p>}
                            {crmItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = item.exact
                                    ? location.pathname === item.path
                                    : (location.pathname === item.path || location.pathname.startsWith(item.path + '/'));
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.path}
                                        onClick={() => setIsSidebarOpen(false)}
                                        className={`group ${isActive ? 'sidebar-nav-item-active' : 'sidebar-nav-item'}`}
                                        style={isCollapsed ? { justifyContent: 'center' } : {}}
                                    >
                                        <Icon className={`sidebar-nav-icon ${isCollapsed ? '!mr-0' : ''}`} />
                                        {!isCollapsed && <span>{item.name}</span>}

                                        {isCollapsed && (
                                            <div className="sidebar-tooltip">
                                                {item.name}
                                            </div>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>

                        {managementItems.length > 0 && (
                            <>
                                <div className="sidebar-separator"></div>
                                <div className="flex flex-col space-y-[2px]">
                                    {!isCollapsed && <p className="sidebar-section-title">Management</p>}
                                    {managementItems.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                                        return (
                                            <Link
                                                key={item.name}
                                                to={item.path}
                                                onClick={() => setIsSidebarOpen(false)}
                                                className={`group ${isActive ? 'sidebar-nav-item-active' : 'sidebar-nav-item'}`}
                                                style={isCollapsed ? { justifyContent: 'center' } : {}}
                                            >
                                                <Icon className={`sidebar-nav-icon ${isCollapsed ? '!mr-0' : ''}`} />
                                                {!isCollapsed && <span>{item.name}</span>}

                                                {isCollapsed && (
                                                    <div className="sidebar-tooltip">
                                                        {item.name}
                                                    </div>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        <div className="sidebar-separator"></div>

                        {/* System Section */}
                        <div className="flex flex-col space-y-[2px]">
                            {!isCollapsed && <p className="sidebar-section-title">System</p>}
                            {systemItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.path}
                                        onClick={() => setIsSidebarOpen(false)}
                                        className={`group ${isActive ? 'sidebar-nav-item-active' : 'sidebar-nav-item'}`}
                                        style={isCollapsed ? { justifyContent: 'center' } : {}}
                                    >
                                        <Icon className={`sidebar-nav-icon ${isCollapsed ? '!mr-0' : ''}`} />
                                        {!isCollapsed && <span>{item.name}</span>}

                                        {isCollapsed && (
                                            <div className="sidebar-tooltip">
                                                {item.name}
                                            </div>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </nav>
                </div>

                {/* Sidebar Footer: Compact Workspace Status & Quick Logout */}
                <div className="p-3 border-t border-border-subtle/50 dark:border-slate-800/60 mt-auto shrink-0 flex items-center justify-between">

                    {!isCollapsed ? (
                        <>
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[11px] font-semibold text-text-primary dark:text-slate-300 truncate">
                                        {activeTenantName}
                                    </span>
                                    <span className="text-[10px] text-text-muted dark:text-slate-400">Online</span>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-1.5 rounded-lg text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                title="Sign out"
                                aria-label="Sign out"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleLogout}
                            className="w-9 h-9 mx-auto flex items-center justify-center rounded-lg text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors group relative"
                            title="Sign out"
                            aria-label="Sign out"
                        >
                            <LogOut className="w-4 h-4" />
                            <div className="sidebar-tooltip">Sign out</div>
                        </button>
                    )}
                </div>
            </div>

            {/* Main content (Integrated L-Frame) */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 dark:bg-[#0B0F17] relative z-0">
                {/* Top Header (Subtle 52px height, seamless mantle) */}
                <header className="h-[52px] sticky top-0 flex items-center justify-between px-4 sm:px-6 bg-slate-50 dark:bg-[#0B0F17] z-30 transition-all shrink-0">
                    <div className="flex items-center flex-1 gap-3 sm:gap-4 min-w-0">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            aria-label="Open sidebar"
                            className="lg:hidden text-text-muted hover:text-text-primary transition-colors focus:outline-none shrink-0"
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        {/* Desktop Collapse Toggle */}
                        <button
                            onClick={toggleSidebar}
                            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover border border-transparent hover:border-border-subtle transition-all focus:outline-none shrink-0"
                            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        >
                            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                        </button>

                        {/* Minimalist Global Search (Cmd + K) */}
                        <div ref={searchRef} className="relative w-48 lg:w-56 focus-within:w-72 transition-all duration-200">
                            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                {isSearching ? (
                                    <div className="animate-spin w-3 h-3 border-2 border-brand-primary border-t-transparent rounded-full" />
                                ) : (
                                    <Search className="h-3.5 w-3.5 text-slate-400" />
                                )}
                            </div>
                            <input
                                type="text"
                                className="w-full pl-8 pr-11 h-[32px] bg-slate-200/50 dark:bg-slate-850/60 hover:bg-slate-200/80 dark:hover:bg-slate-800/80 border border-slate-300/40 dark:border-slate-800/80 rounded-lg px-2.5 py-1 text-xs text-text-primary placeholder:text-slate-400 transition-all focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
                                placeholder="Search... (⌘K)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => { if (searchQuery.trim() && (searchResults.enquiries.length > 0 || searchResults.quotations.length > 0 || searchResults.customers.length > 0)) setSearchDropdownOpen(true) }}
                            />
                            {/* Minimalist keyboard shortcut pill */}
                            {!searchQuery && (
                                <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                                    <kbd className="text-[10px] px-1 py-0.5 rounded bg-slate-300/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono border border-slate-300/50 dark:border-slate-700/50">⌘K</kbd>
                                </div>
                            )}

                            {searchQuery && (
                                <button
                                    onClick={handleClearSearch}
                                    aria-label="Clear search"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary focus:outline-none z-10"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}

                            {/* Dropdown Overlay */}
                            {searchDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-bg-card border border-border-subtle rounded-xl shadow-lg overflow-hidden z-50 max-h-[70vh] overflow-y-auto animate-dropdown-entrance">
                                    {(searchResults.quotations.length === 0 && searchResults.enquiries.length === 0 && searchResults.customers.length === 0) ? (
                                        <div className="p-4 text-center text-text-muted text-sm">
                                            No customers found
                                        </div>
                                    ) : (
                                        <div className="py-2">
                                            {searchResults.customers.length > 0 && (
                                                <div>
                                                    <div className="px-4 py-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider bg-bg-main/50">
                                                        Customers
                                                    </div>
                                                    {searchResults.customers.map(c => (
                                                        <div
                                                            key={c.id}
                                                            onClick={() => handleSearchNavigate(`/customers/${c.id}/360`)}
                                                            className="px-4 py-3 hover:bg-bg-hover cursor-pointer transition-colors border-l-2 border-transparent hover:border-brand-teal"
                                                        >
                                                            <div className="flex justify-between items-start mb-0.5">
                                                                <span className="text-[14px] font-bold text-text-primary">{c.name}</span>
                                                                {c.customerCode && <span className="text-[11px] font-medium text-text-muted">{c.customerCode}</span>}
                                                            </div>
                                                            <div className="text-[12px] text-text-secondary">
                                                                {c.companyName && <div className="font-medium text-text-primary">{c.companyName}</div>}
                                                                {(c.email || c.phone) && (
                                                                    <div className="flex items-center gap-3 mt-0.5 text-text-muted text-[11px]">
                                                                        {c.email && <span>{c.email}</span>}
                                                                        {c.phone && <span>{c.phone}</span>}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {searchResults.quotations.length > 0 && (
                                                <div>
                                                    <div className="px-4 py-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider bg-bg-main/50">
                                                        Quotations
                                                    </div>
                                                    {searchResults.quotations.map(q => (
                                                        <div
                                                            key={q.id}
                                                            onClick={() => handleSearchNavigate(`/quotations/edit/${q.id}`)}
                                                            className="px-4 py-3 hover:bg-bg-hover cursor-pointer transition-colors border-l-2 border-transparent hover:border-brand-teal"
                                                        >
                                                            <div className="flex justify-between items-start mb-0.5">
                                                                <span className="text-sm font-semibold text-text-primary">{q.quotationNumber}</span>
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${q.status === 'SENT' ? 'bg-brand-success/10 text-brand-success' :
                                                                        q.status === 'ACCEPTED' ? 'bg-brand-primary/10 text-brand-primary' :
                                                                            q.status === 'REJECTED' ? 'bg-brand-danger/10 text-brand-danger' :
                                                                                'bg-[#F3F4F6] text-[#4B5563]'
                                                                    }`}>{q.status}</span>
                                                            </div>
                                                            <div className="text-[12px] text-text-secondary truncate">
                                                                {q.clientCompany || q.clientName}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {searchResults.enquiries.length > 0 && (
                                                <div>
                                                    <div className="px-4 py-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider bg-bg-main/50 mt-1">
                                                        Enquiries
                                                    </div>
                                                    {searchResults.enquiries.map(e => (
                                                        <div
                                                            key={e.id}
                                                            onClick={() => handleSearchNavigate(`/enquiries?id=${e.id}`)}
                                                            className="px-4 py-3 hover:bg-bg-hover cursor-pointer transition-colors border-l-2 border-transparent hover:border-brand-teal"
                                                        >
                                                            <div className="flex justify-between items-start mb-0.5">
                                                                <span className="text-sm font-semibold text-text-primary">{e.referenceId || 'New Enquiry'}</span>
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${e.status === 'NEW' ? 'bg-brand-primary/10 text-[var(--color-brand-primary)]' :
                                                                        e.status === 'QUOTED' ? 'bg-brand-success/10 text-brand-success' :
                                                                            'bg-[#F3F4F6] text-[#4B5563]'
                                                                    }`}>{e.status}</span>
                                                            </div>
                                                            <div className="text-[12px] text-text-secondary truncate">
                                                                {e.companyName || e.fullName}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="hidden lg:block header-divider mx-2"></div>

                    <div className="flex items-center gap-3 ml-2 lg:ml-4 shrink-0">
                        <DateTimeDisplay />
                        <HeaderControls onLogout={handleLogout} />
                    </div>
                </header>

                {/* Inset Main Content Shell (Subtle rounded top-left corner) */}
                <div className="flex-1 min-w-0 overflow-hidden rounded-tl-2xl border-t border-l border-slate-200/80 dark:border-slate-800/60 bg-bg-card shadow-sm flex flex-col">
                    <main ref={mainContentRef} className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
}
