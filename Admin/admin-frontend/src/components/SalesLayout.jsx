import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
    LayoutDashboard, 
    MessageSquare, 
    LogOut, 
    FileText, 
    Menu, 
    X, 
    Sun, 
    Moon, 
    Search, 
    Clock, 
    Calendar, 
    UsersRound, 
    ShoppingCart, 
    CreditCard, 
    Building2,
    Briefcase
} from 'lucide-react';
import HeaderControls from './HeaderControls';
import { getInitials } from '../utils/userUtils';
import { fetchApi } from '../services/api';

import logoLightExpanded from '../assets/acrovix_logo1.png';
import logoDarkExpanded from '../assets/Acrovix_logo.png';
import logoLightCollapsed from '../assets/Acrovix_light.png';
import logoDarkCollapsed from '../assets/Acrovix.png';

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

export default function SalesLayout() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem('sales_sidebar_collapsed');
        return saved === 'true';
    });
    const [isExiting, setIsExiting] = useState(false);

    const toggleSidebar = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('sales_sidebar_collapsed', String(newState));
    };

    // Global Search State for Sales
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({ enquiries: [], quotations: [], customers: [] });
    const [isSearching, setIsSearching] = useState(false);
    const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
    const searchRef = useRef(null);
    const mainContentRef = useRef(null);

    // Route transition animation
    useEffect(() => {
        if (mainContentRef.current) {
            mainContentRef.current.classList.remove('animate-fade-in-up');
            void mainContentRef.current.offsetWidth;
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
                if (active) console.error("Sales search error", error);
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

    // SALES Navigation structure
    const salesWorkspaceItems = [
        { path: '/', name: 'Dashboard', icon: LayoutDashboard, exact: true },
        { path: '/enquiries', name: 'Enquiries', icon: MessageSquare },
        { path: '/crm/leads', name: 'My Leads', icon: UsersRound },
        { path: '/crm/follow-ups', name: 'Follow-ups', icon: Clock },
        { path: '/customers', name: 'My Customers', icon: Building2 },
        { path: '/quotations', name: 'My Quotations', icon: FileText },
        { path: '/purchase-orders', name: 'Purchase Orders', icon: ShoppingCart },
        { path: '/invoices', name: 'Invoices', icon: FileText, badge: 'Read-only' },
        { path: '/payments', name: 'Payments', icon: CreditCard, badge: 'Read-only' }
    ];

    return (
        <div className={`flex h-screen bg-bg-main text-text-primary overflow-hidden ${isExiting ? 'animate-page-exit' : 'animate-page-entrance'}`}>
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sales Sidebar */}
            <aside aria-label="Sales navigation" className={`sidebar fixed inset-y-0 left-0 z-50 flex flex-col shrink-0 lg:relative lg:translate-x-0 lg:h-screen ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'w-[72px]' : 'w-[260px]'}`}>
                {/* Brand Logo Header */}
                <div className="w-full h-[81px] bg-white dark:bg-bg-card flex items-center justify-center shrink-0 shadow-sm relative z-10 border-b border-border-subtle/50">
                    {!isCollapsed && (
                        <img
                            src={theme === 'dark' ? logoDarkExpanded : logoLightExpanded}
                            alt="ACROVIX"
                            width="200"
                            height="60"
                            className="h-[80%] w-auto object-contain transition-all"
                        />
                    )}
                    {isCollapsed && (
                        <div className="w-full flex justify-center">
                            <img
                                src={theme === 'dark' ? logoDarkCollapsed : logoLightCollapsed}
                                alt="ACX"
                                width="40"
                                height="24"
                                className="h-[24px] w-auto object-contain transition-all"
                            />
                        </div>
                    )}
                    <button 
                        onClick={() => setIsSidebarOpen(false)} 
                        aria-label="Close sidebar" 
                        className="lg:hidden absolute right-4 text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Sales Workspace Title Badge */}
                {!isCollapsed && (
                    <div className="mx-4 mt-3 mb-1 px-3 py-1.5 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-brand-primary flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5" /> Sales Workspace
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-primary text-white font-bold">
                            Active
                        </span>
                    </div>
                )}

                {/* Navigation Items */}
                <div className="flex-1 overflow-y-auto py-3 hide-scrollbar flex flex-col">
                    <nav className="space-y-1 flex-1">
                        <div className="flex flex-col space-y-[2px]">
                            {salesWorkspaceItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = item.exact
                                    ? location.pathname === item.path
                                    : (location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path)));
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.path}
                                        onClick={() => setIsSidebarOpen(false)}
                                        className={`group ${isActive ? 'sidebar-nav-item-active' : 'sidebar-nav-item'}`}
                                        style={isCollapsed ? { justifyContent: 'center' } : {}}
                                    >
                                        <Icon className={`sidebar-nav-icon ${isCollapsed ? '!mr-0' : ''}`} />
                                        {!isCollapsed && (
                                            <div className="flex items-center justify-between flex-1 min-w-0 pr-1">
                                                <span className="truncate">{item.name}</span>
                                                {item.badge && (
                                                    <span className="text-[9.5px] font-medium text-text-muted bg-bg-muted px-1.5 py-0.5 rounded-md border border-border-subtle">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </div>
                                        )}

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

                {/* Sales Profile Bottom Section */}
                <div className="sidebar-bottom-section">
                    <div 
                        className="mx-4 mb-4 mt-auto rounded-2xl border flex items-center px-3 py-2.5 transition-colors group cursor-default" 
                        style={{ borderColor: 'var(--theme-sidebar-separator, #E2E8F0)', backgroundColor: 'var(--theme-sidebar-item-hover-bg)' }}
                    >
                        <div className="w-[38px] h-[38px] rounded-full bg-[var(--color-brand-primary)] flex items-center justify-center text-white font-bold text-[14px] shrink-0 shadow-sm relative">
                            {getInitials(user?.name)}
                            {isCollapsed && (
                                <div className="sidebar-tooltip">
                                    {user?.name || 'Sales User'}
                                </div>
                            )}
                        </div>
                        {!isCollapsed && (
                            <div className="flex flex-col ml-3 min-w-0 flex-1">
                                <span className="text-[13px] font-bold text-text-primary truncate">
                                    {user?.name || 'Sales Representative'}
                                </span>
                                <span className="text-[11px] font-medium text-brand-primary flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    SALES
                                </span>
                            </div>
                        )}
                        {!isCollapsed && (
                            <button
                                onClick={handleLogout}
                                aria-label="Sign out"
                                title="Sign out"
                                className="p-1.5 text-text-muted hover:text-brand-danger hover:bg-brand-danger/10 rounded-lg transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Application Container */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {/* Top Header */}
                <header className="h-[81px] bg-bg-card border-b border-border-subtle flex items-center justify-between px-6 shrink-0 relative z-30 shadow-sm">
                    <div className="flex items-center gap-4 flex-1 max-w-2xl">
                        {/* Mobile Menu Trigger */}
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            aria-label="Open navigation menu"
                            className="lg:hidden text-text-secondary hover:text-text-primary p-2 rounded-xl border border-border-subtle bg-bg-main"
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        {/* Sidebar Collapse Toggle */}
                        <button
                            onClick={toggleSidebar}
                            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                            className="hidden lg:flex items-center justify-center w-10 h-10 rounded-xl border border-border-subtle bg-bg-main text-text-secondary hover:text-text-primary hover:bg-bg-card transition-colors shrink-0"
                        >
                            <Menu className="w-4 h-4" />
                        </button>

                        {/* Search Bar */}
                        <div className="relative flex-1" ref={searchRef}>
                            <div className="relative">
                                <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search your enquiries, quotations, customers..."
                                    className="w-full bg-bg-main border border-border-subtle rounded-xl pl-10 pr-9 py-2 text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all h-[42px]"
                                />
                                {searchQuery && (
                                    <button 
                                        onClick={handleClearSearch}
                                        aria-label="Clear search query"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 rounded-full"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Search Dropdown */}
                            {searchDropdownOpen && (
                                <div className="absolute top-[50px] left-0 right-0 bg-bg-card rounded-2xl shadow-2xl border border-border-subtle p-3 max-h-[460px] overflow-y-auto z-50 space-y-3 animate-dropdown-entrance">
                                    {isSearching ? (
                                        <div className="p-4 text-center text-xs text-text-muted">Searching your sales workspace...</div>
                                    ) : (
                                        <>
                                            {searchResults.enquiries.length === 0 && searchResults.quotations.length === 0 && searchResults.customers.length === 0 ? (
                                                <div className="p-4 text-center text-xs text-text-muted">No matching results found</div>
                                            ) : (
                                                <>
                                                    {searchResults.enquiries.length > 0 && (
                                                        <div>
                                                            <div className="text-[11px] font-bold uppercase text-text-muted px-2 py-1">Enquiries</div>
                                                            {searchResults.enquiries.map(enq => (
                                                                <div 
                                                                    key={enq.id}
                                                                    onClick={() => handleSearchNavigate(`/enquiries`)}
                                                                    className="px-3 py-2 rounded-xl hover:bg-bg-main cursor-pointer text-xs flex justify-between items-center transition-colors"
                                                                >
                                                                    <div>
                                                                        <span className="font-bold text-text-primary">{enq.referenceId}</span>
                                                                        <span className="text-text-muted ml-2">{enq.fullName}</span>
                                                                    </div>
                                                                    <span className="text-[10px] font-bold text-brand-primary px-2 py-0.5 rounded bg-brand-primary/10">{enq.status}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {searchResults.quotations.length > 0 && (
                                                        <div>
                                                            <div className="text-[11px] font-bold uppercase text-text-muted px-2 py-1">Quotations</div>
                                                            {searchResults.quotations.map(quot => (
                                                                <div 
                                                                    key={quot.id}
                                                                    onClick={() => handleSearchNavigate(`/quotations/edit/${quot.id}`)}
                                                                    className="px-3 py-2 rounded-xl hover:bg-bg-main cursor-pointer text-xs flex justify-between items-center transition-colors"
                                                                >
                                                                    <div>
                                                                        <span className="font-bold text-text-primary">{quot.quotationNumber}</span>
                                                                        <span className="text-text-muted ml-2">{quot.clientName}</span>
                                                                    </div>
                                                                    <span className="text-[10px] font-bold text-purple-600 px-2 py-0.5 rounded bg-purple-500/10">{quot.status}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {searchResults.customers.length > 0 && (
                                                        <div>
                                                            <div className="text-[11px] font-bold uppercase text-text-muted px-2 py-1">Customers</div>
                                                            {searchResults.customers.map(cust => (
                                                                <div 
                                                                    key={cust.id}
                                                                    onClick={() => handleSearchNavigate(`/customers/${cust.id}/360`)}
                                                                    className="px-3 py-2 rounded-xl hover:bg-bg-main cursor-pointer text-xs flex justify-between items-center transition-colors"
                                                                >
                                                                    <div>
                                                                        <span className="font-bold text-text-primary">{cust.name}</span>
                                                                        {cust.companyName && <span className="text-text-muted ml-2">({cust.companyName})</span>}
                                                                    </div>
                                                                    <span className="text-[10px] font-mono text-text-muted">{cust.customerCode}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center gap-3">
                        <DateTimeDisplay />

                        {/* Light / Dark Mode Toggle */}
                        <div className="flex items-center bg-bg-card rounded-full p-1 border border-border-subtle shadow-sm">
                            <button
                                type="button"
                                onClick={() => theme !== 'light' && toggleTheme()}
                                aria-label="Switch to light mode"
                                className={`p-1.5 sm:p-2 rounded-full transition-colors ${theme === 'light' ? 'bg-bg-muted text-[#F59E0B]' : 'text-text-muted hover:text-text-primary'}`}
                            >
                                <Sun className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => theme !== 'dark' && toggleTheme()}
                                aria-label="Switch to dark mode"
                                className={`p-1.5 sm:p-2 rounded-full transition-colors ${theme === 'dark' ? 'bg-bg-muted text-[#2563EB]' : 'text-text-muted hover:text-text-primary'}`}
                            >
                                <Moon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Main View Area */}
                <main ref={mainContentRef} className="flex-1 overflow-y-auto px-6 py-8 relative">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
