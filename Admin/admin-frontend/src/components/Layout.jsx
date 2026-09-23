import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LayoutDashboard, MessageSquare, LogOut, FileText, Shield, Menu, X, ChevronLeft, ChevronRight, Sun, Moon, Search, Bell, Settings, Trash2, PanelLeftClose, PanelLeftOpen, ArrowLeft, UsersRound, Package, ShoppingCart, CreditCard, DollarSign, BarChart3, Target, TrendingUp, Clock, Calendar } from 'lucide-react';
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
        <div className="hidden lg:flex items-center">
            <div className="flex items-center gap-3 bg-bg-card border border-border-subtle rounded-full px-4 h-[44px] shadow-sm">
                <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-brand-primary" />
                </div>
                <div className="flex flex-col justify-center">
                    <span className="text-[12px] font-bold text-text-primary tracking-tight leading-[1.1]">{dateStr}</span>
                    <span className="text-[10px] font-medium text-text-muted leading-[1.1] mt-0.5">{timeStr} IST</span>
                </div>
            </div>
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
        <div className={`flex h-screen bg-bg-main text-text-primary overflow-hidden ${isExiting ? 'animate-page-exit' : 'animate-page-entrance'}`}>
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-text-primary/20 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`sidebar fixed inset-y-0 left-0 z-50 flex flex-col shrink-0 lg:relative lg:translate-x-0 lg:h-screen ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'w-[72px]' : 'w-[240px]'}`}>
                <div className="sidebar-logo-container relative">
                    {!isCollapsed && (
                        <img 
                            src={theme === 'dark' ? logoDark : logoLight} 
                            alt="ACROVIX" 
                            className="h-[24px] w-auto object-contain transition-all" 
                        />
                    )}
                    {isCollapsed && (
                        <div className="w-full flex justify-center">
                             <img 
                                src={theme === 'dark' ? logoDark : logoLight} 
                                alt="ACX" 
                                className="h-[24px] w-auto object-cover object-left max-w-[24px] overflow-hidden transition-all" 
                            />
                        </div>
                    )}
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden absolute right-4 text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                    {/* Desktop Collapse Toggle */}
                    <button 
                        onClick={toggleSidebar}
                        className="hidden lg:flex absolute right-2 items-center justify-center w-[28px] h-[28px] shrink-0 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-all"
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isCollapsed ? <PanelLeftOpen className="w-[14px] h-[14px]" /> : <PanelLeftClose className="w-[14px] h-[14px]" />}
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
                
                <div className="sidebar-bottom-section">
                    {/* Theme Segment Control */}
                    <div className="theme-segment-container" style={isCollapsed ? { display: 'none' } : {}}>
                        <button 
                            onClick={() => theme !== 'light' && toggleTheme()}
                            className={`theme-segment-btn ${theme === 'light' ? 'theme-segment-active' : 'theme-segment-inactive'}`}
                        >
                            <Sun className={`w-[14px] h-[14px] mr-2 ${theme === 'light' ? 'text-[#FACC15]' : ''}`} />
                            Light
                        </button>
                        <button 
                            onClick={() => theme !== 'dark' && toggleTheme()}
                            className={`theme-segment-btn ${theme === 'dark' ? 'theme-segment-active' : 'theme-segment-inactive'}`}
                        >
                            <Moon className="w-[14px] h-[14px] mr-2" />
                            Dark
                        </button>
                    </div>

                    {isCollapsed && (
                        <button
                            onClick={toggleTheme}
                            className="mx-auto w-[36px] h-[36px] flex items-center justify-center rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors group relative"
                            title="Toggle Theme"
                        >
                            {theme === 'light' ? <Sun className="w-5 h-5 text-[#FACC15]" /> : <Moon className="w-5 h-5" />}
                            <div className="sidebar-tooltip">Toggle Theme</div>
                        </button>
                    )}

                    <div className="sidebar-separator"></div>

                    {/* Compact User Profile */}
                    <div className="flex items-center px-4 py-2" style={isCollapsed ? { justifyContent: 'center', padding: '8px' } : {}}>
                        <div className="w-[32px] h-[32px] rounded-full bg-[var(--color-brand-primary)] flex items-center justify-center text-white font-bold text-[11px] shrink-0 shadow-sm relative group">
                            {getInitials(user?.name)}
                            {isCollapsed && (
                                <div className="sidebar-tooltip">
                                    {user?.name || 'User'}
                                </div>
                            )}
                        </div>
                        {!isCollapsed && (
                            <div className="flex flex-col ml-3 min-w-0 flex-1">
                                <span className="text-[13px] font-bold text-text-primary truncate">{user?.name || 'Admin'}</span>
                                <div className="flex items-center gap-1.5 mt-[2px]">
                                    <span className="text-[10px] text-text-muted truncate">{user?.role?.replace('_', ' ')}</span>
                                    <span className="w-1 h-1 rounded-full bg-border-subtle shrink-0"></span>
                                    <button 
                                        onClick={handleLogout} 
                                        className="text-[10px] font-bold text-brand-danger hover:text-brand-danger/80 transition-colors cursor-pointer shrink-0"
                                    >
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    {isCollapsed && (
                        <button 
                            onClick={handleLogout}
                            className="mx-auto mb-1 w-[36px] h-[36px] flex items-center justify-center rounded-lg hover:bg-brand-danger/10 text-brand-danger transition-colors group relative"
                            title="Sign out"
                        >
                            <LogOut className="w-4 h-4" />
                            <div className="sidebar-tooltip">
                                Sign out
                            </div>
                        </button>
                    )}
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-bg-main relative z-0">
                {/* Dotted Pattern Decorators */}
                <div className="absolute top-0 right-0 w-[500px] h-[350px] bg-dotted-pattern opacity-70 pointer-events-none z-[-1] animate-fade-in-up"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[250px] bg-dotted-pattern opacity-50 pointer-events-none z-[-1]"></div>
                
                {/* Top Header */}
                <header className="h-[76px] lg:h-[82px] flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-bg-card/80 backdrop-blur-md border-b border-border-subtle shadow-[0_4px_24px_rgba(11,25,44,0.02)] relative z-30">
                    <div className="flex items-center flex-1 gap-4 lg:gap-6 min-w-0">
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden text-text-muted hover:text-text-primary transition-colors focus:outline-none shrink-0"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        
                        {/* Search Bar matching reference */}
                        <div ref={searchRef} className="relative w-full max-w-[560px] flex-1 min-w-0">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                {isSearching ? (
                                    <div className="animate-spin w-4 h-4 border-2 border-[var(--color-brand-primary)] border-t-transparent rounded-full" />
                                ) : (
                                    <Search className="h-[18px] w-[18px] text-text-muted" />
                                )}
                            </div>
                            <input
                                type="text"
                                className="w-full pl-11 pr-12 h-[48px] bg-bg-card border border-border-subtle rounded-full text-[13.5px] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/20 focus:border-[var(--color-brand-primary)] transition-all shadow-[0_2px_12px_rgba(11,25,44,0.03)] text-text-primary placeholder-text-muted font-medium"
                                placeholder="Search anything..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => { if (searchQuery.trim() && (searchResults.enquiries.length > 0 || searchResults.quotations.length > 0 || searchResults.customers.length > 0)) setSearchDropdownOpen(true) }}
                            />
                            
                            {searchQuery && (
                                <button
                                    onClick={handleClearSearch}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-muted hover:text-text-primary focus:outline-none"
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
                    
                    <div className="hidden lg:block header-divider mx-2"></div>

                    <div className="flex items-center gap-3 ml-2 lg:ml-4 shrink-0">
                        <DateTimeDisplay />
                        <HeaderControls onLogout={handleLogout} />
                    </div>
                </header>

                {/* Page content */}
                <main ref={mainContentRef} className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pt-2">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
