import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LayoutDashboard, MessageSquare, LogOut, FileText, Shield, Menu, X, ChevronLeft, ChevronRight, Sun, Moon, Search, Bell, Settings, Trash2, PanelLeftClose, PanelLeftOpen, ArrowLeft, UsersRound, Package, ShoppingCart, CreditCard, DollarSign, BarChart3, Target, TrendingUp, Clock, MoreHorizontal } from 'lucide-react';
import HeaderControls from './HeaderControls';
import { getInitials } from '../utils/userUtils';
import { fetchApi } from '../services/api';

import logoLight from '../assets/acrovix-logo-light.png';
import logoDark from '../assets/acrovix-logo-dark.png';

const DateTimeDisplay = () => {
    const [time, setTime] = useState(new Date());
    
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const dateOptions = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
    const dateStr = time.toLocaleDateString('en-US', dateOptions);
    const timeStr = time.toLocaleTimeString('en-US', timeOptions);

    return (
        <div className="hidden lg:flex flex-col items-end mr-4 pr-4 border-r border-border-subtle">
            <span className="text-[13px] font-bold text-text-primary tracking-tight">{dateStr}</span>
            <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">{timeStr}</span>
        </div>
    );
};

export default function Layout() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem('admin_sidebar_collapsed');
        return saved === 'true';
    });

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
                    fetchApi(`/admin/enquiries?search=${encodeURIComponent(searchQuery)}&size=5`),
                    fetchApi(`/admin/quotations?search=${encodeURIComponent(searchQuery)}&size=5`),
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
        logout();
        navigate('/login');
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
        { path: '/receivables', name: 'Receivables', icon: DollarSign },
        { path: '/reports', name: 'Reports', icon: BarChart3 }
    ];

    const crmItems = [
        { path: '/crm', name: 'CRM Dashboard', icon: Target, exact: true },
        { path: '/crm/leads', name: 'Leads', icon: UsersRound },
        { path: '/crm/pipeline', name: 'Pipeline', icon: TrendingUp },
        { path: '/crm/follow-ups', name: 'Follow-ups', icon: Clock }
    ];
    
    const managementItems = [];
    if (user?.role === 'SUPER_ADMIN') {
        managementItems.push({ path: '/users', name: 'Users', icon: Shield });
    }

    const systemItems = [
        { path: '/trash', name: 'Trash', icon: Trash2 },
        { path: '/settings', name: 'Settings', icon: Settings }
    ];

    return (
        <div className="flex h-screen bg-bg-main text-text-primary overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-text-primary/20 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-bg-card border border-border-subtle shadow-[0_4px_24px_rgba(11,25,44,0.04)] transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'w-[84px]' : 'w-[260px]'} lg:relative lg:translate-x-0 lg:my-3 lg:ml-3 lg:h-[calc(100vh-24px)] rounded-r-[24px] lg:rounded-[24px]`}>
                <div className="flex items-center justify-between h-[72px] px-5 border-b border-border-subtle/50 shrink-0 relative">
                    {!isCollapsed ? (
                        <div className="flex items-center h-full flex-1 min-w-0 pr-2">
                            <img 
                                src={theme === 'dark' ? logoDark : logoLight} 
                                alt="ACROVIX" 
                                className="h-10 w-full max-w-[140px] object-contain object-left transition-opacity duration-200" 
                            />
                        </div>
                    ) : (
                        <div className="flex items-center justify-center w-full h-full">
                            <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20">
                                <span className="font-bold text-brand-primary text-[15px]">ACX</span>
                            </div>
                        </div>
                    )}

                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto py-4 hide-scrollbar">
                    <nav className="space-y-6">
                        {/* Workspace Section */}
                        <div>
                            {!isCollapsed && <p className="px-6 mb-2 text-[11px] font-bold text-text-muted uppercase tracking-[0.1em]">Workspace</p>}
                            <div className="space-y-1">
                                {workspaceItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                                    return (
                                        <Link
                                            key={item.name}
                                            to={item.path}
                                            onClick={() => setIsSidebarOpen(false)}
                                            className={`group relative flex items-center py-2.5 text-[13.5px] font-semibold rounded-[12px] transition-all duration-200 ${
                                                isActive 
                                                    ? 'bg-brand-primary/10 text-brand-primary' 
                                                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                                            } ${isCollapsed ? 'justify-center mx-4' : 'px-4 mx-3'}`}
                                        >
                                            {isActive && (
                                                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[4px] h-6 bg-brand-primary rounded-r-full shadow-[0_0_8px_rgba(37,99,235,0.4)] ${isCollapsed ? '-ml-4' : '-ml-3'}`} />
                                            )}
                                            <Icon className={`w-5 h-5 flex-shrink-0 ${!isCollapsed && 'mr-3'} ${isActive ? 'text-brand-primary' : 'text-text-muted group-hover:text-brand-primary/70 transition-colors'}`} />
                                            {!isCollapsed && <span>{item.name}</span>}
                                            
                                            {isCollapsed && (
                                                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-text-primary text-bg-main text-[11px] font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                                                    {item.name}
                                                </div>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        {/* CRM & Sales Section */}
                        <div>
                            {!isCollapsed && <p className="px-6 mb-2 text-[11px] font-bold text-text-muted uppercase tracking-[0.1em]">CRM & Sales</p>}
                            <div className="space-y-1">
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
                                            className={`group relative flex items-center py-2.5 text-[13.5px] font-semibold rounded-[12px] transition-all duration-200 ${
                                                isActive 
                                                    ? 'bg-brand-primary/10 text-brand-primary' 
                                                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                                            } ${isCollapsed ? 'justify-center mx-4' : 'px-4 mx-3'}`}
                                        >
                                            {isActive && (
                                                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[4px] h-6 bg-brand-primary rounded-r-full shadow-[0_0_8px_rgba(37,99,235,0.4)] ${isCollapsed ? '-ml-4' : '-ml-3'}`} />
                                            )}
                                            <Icon className={`w-5 h-5 flex-shrink-0 ${!isCollapsed && 'mr-3'} ${isActive ? 'text-brand-primary' : 'text-text-muted group-hover:text-brand-primary/70 transition-colors'}`} />
                                            {!isCollapsed && <span>{item.name}</span>}
                                            
                                            {isCollapsed && (
                                                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-text-primary text-bg-main text-[11px] font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                                                    {item.name}
                                                </div>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Management Section */}
                        {managementItems.length > 0 && (
                            <div>
                                {!isCollapsed && <p className="px-6 mb-2 text-[11px] font-bold text-text-muted uppercase tracking-[0.1em]">Management</p>}
                                <div className="space-y-1">
                                    {managementItems.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                                        return (
                                            <Link
                                                key={item.name}
                                                to={item.path}
                                                onClick={() => setIsSidebarOpen(false)}
                                                className={`group relative flex items-center py-2.5 text-[13.5px] font-semibold rounded-[12px] transition-all duration-200 ${
                                                    isActive 
                                                        ? 'bg-brand-primary/10 text-brand-primary' 
                                                        : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                                                } ${isCollapsed ? 'justify-center mx-4' : 'px-4 mx-3'}`}
                                            >
                                                {isActive && (
                                                    <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[4px] h-6 bg-brand-primary rounded-r-full shadow-[0_0_8px_rgba(37,99,235,0.4)] ${isCollapsed ? '-ml-4' : '-ml-3'}`} />
                                                )}
                                                <Icon className={`w-5 h-5 flex-shrink-0 ${!isCollapsed && 'mr-3'} ${isActive ? 'text-brand-primary' : 'text-text-muted group-hover:text-brand-primary/70 transition-colors'}`} />
                                                {!isCollapsed && <span>{item.name}</span>}
                                                
                                                {isCollapsed && (
                                                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-text-primary text-bg-main text-[11px] font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                                                        {item.name}
                                                    </div>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        
                        {/* System Section */}
                        <div>
                            {!isCollapsed && <p className="px-6 mb-2 text-[11px] font-bold text-text-muted uppercase tracking-[0.1em]">System</p>}
                            <div className="space-y-1">
                                {systemItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                                    return (
                                        <Link
                                            key={item.name}
                                            to={item.path}
                                            onClick={() => setIsSidebarOpen(false)}
                                            className={`group relative flex items-center py-2.5 text-[13.5px] font-semibold rounded-[12px] transition-all duration-200 ${
                                                isActive 
                                                    ? 'bg-brand-primary/10 text-brand-primary' 
                                                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                                            } ${isCollapsed ? 'justify-center mx-4' : 'px-4 mx-3'}`}
                                        >
                                            {isActive && (
                                                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[4px] h-6 bg-brand-primary rounded-r-full shadow-[0_0_8px_rgba(37,99,235,0.4)] ${isCollapsed ? '-ml-4' : '-ml-3'}`} />
                                            )}
                                            <Icon className={`w-5 h-5 flex-shrink-0 ${!isCollapsed && 'mr-3'} ${isActive ? 'text-brand-primary' : 'text-text-muted group-hover:text-brand-primary/70 transition-colors'}`} />
                                            {!isCollapsed && <span>{item.name}</span>}
                                            
                                            {isCollapsed && (
                                                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-text-primary text-bg-main text-[11px] font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                                                    {item.name}
                                                </div>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </nav>
                </div>
                
                <div className="p-4 mt-auto border-t border-border-subtle/50 bg-bg-main/30 shrink-0">
                    {!isCollapsed ? (
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center p-2 rounded-xl hover:bg-bg-hover transition-colors cursor-pointer border border-transparent hover:border-border-subtle">
                                <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center mr-3 text-brand-primary font-bold border border-brand-primary/20 shrink-0">
                                    {getInitials(user?.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-bold text-text-primary truncate">{user?.name || 'Admin User'}</p>
                                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider truncate">{user?.role?.replace('_', ' ')}</p>
                                </div>
                                <div className="shrink-0 text-text-muted">
                                    <MoreHorizontal className="w-4 h-4" />
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="flex items-center justify-center w-full px-3 py-2.5 text-xs font-bold text-text-secondary hover:text-brand-danger hover:bg-brand-danger/10 rounded-xl transition-colors"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Sign out
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold border border-brand-primary/20 shrink-0 cursor-pointer hover:shadow-md transition-shadow">
                                {getInitials(user?.name)}
                            </div>
                            <button
                                onClick={handleLogout}
                                className="flex items-center justify-center w-10 h-10 text-text-muted hover:text-brand-danger hover:bg-brand-danger/10 rounded-xl transition-colors group relative"
                            >
                                <LogOut className="w-5 h-5" />
                                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-text-primary text-bg-main text-[11px] font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                                    Sign out
                                </div>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-bg-main relative z-0">
                {/* Dotted Pattern Decorators */}
                <div className="absolute top-0 right-0 w-[500px] h-[350px] bg-dotted-pattern opacity-70 pointer-events-none z-[-1] animate-in fade-in duration-1000"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[250px] bg-dotted-pattern opacity-50 pointer-events-none z-[-1]"></div>
                
                {/* Top Header */}
                <header className="h-[72px] flex items-center justify-between px-6 lg:px-8 bg-transparent relative z-30">
                    <div className="flex items-center flex-1 max-w-2xl">
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className="mr-4 lg:hidden text-text-muted hover:text-text-primary transition-colors focus:outline-none"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        
                        {/* Sidebar Collapse Toggle (Desktop) */}
                        <button 
                            onClick={toggleSidebar}
                            className="hidden lg:flex items-center justify-center w-10 h-10 mr-4 rounded-full text-text-muted hover:text-text-primary hover:bg-bg-hover hover:shadow-sm border border-transparent hover:border-border-subtle transition-all"
                            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        >
                            {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
                        </button>

                        {/* Global Back Button */}
                        <button 
                            onClick={() => {
                                if (window.history.state && window.history.state.idx > 0) {
                                    navigate(-1);
                                } else {
                                    navigate('/');
                                }
                            }}
                            className="hidden sm:flex items-center justify-center w-9 h-9 mr-4 rounded-xl text-text-muted hover:bg-bg-card hover:shadow-sm hover:text-text-primary transition-all border border-transparent hover:border-border-subtle bg-bg-main"
                            title="Go Back"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        
                        {/* Search Bar matching reference */}
                        <div ref={searchRef} className="relative w-full max-w-md hidden sm:block">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                {isSearching ? (
                                    <div className="animate-spin w-4 h-4 border-2 border-brand-teal border-t-transparent rounded-full" />
                                ) : (
                                    <Search className="h-4 w-4 text-text-muted" />
                                )}
                            </div>
                            <input
                                type="text"
                                className="w-full pl-11 pr-16 py-2.5 bg-bg-card border border-border-subtle rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-sm text-text-primary placeholder-text-muted font-medium"
                                placeholder="Search anything..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => { if (searchQuery.trim() && (searchResults.enquiries.length > 0 || searchResults.quotations.length > 0 || searchResults.customers.length > 0)) setSearchDropdownOpen(true) }}
                            />
                            {!searchQuery && (
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <span className="px-1.5 py-0.5 rounded border border-border-subtle text-[10px] font-bold text-text-muted bg-bg-main">Ctrl K</span>
                                </div>
                            )}
                            {searchQuery && (
                                <button
                                    onClick={handleClearSearch}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary focus:outline-none"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}

                            {/* Dropdown Overlay */}
                            {searchDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-bg-card border border-border-subtle rounded-xl shadow-lg overflow-hidden z-50 max-h-[70vh] overflow-y-auto">
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
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                                                    q.status === 'SENT' ? 'bg-brand-success/10 text-brand-success' : 
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
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                                                    e.status === 'NEW' ? 'bg-brand-primary/10 text-[var(--color-brand-primary)]' :
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
                    
                    <div className="flex items-center">
                        <DateTimeDisplay />
                        <HeaderControls />
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pt-2">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
