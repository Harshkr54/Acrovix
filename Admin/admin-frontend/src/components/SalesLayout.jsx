import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTenant } from '../context/TenantContext';
import { 
    LayoutDashboard, 
    MessageSquare, 
    LogOut, 
    FileText, 
    Menu, 
    X, 
    Search, 
    Clock, 
    UsersRound, 
    ShoppingCart, 
    CreditCard, 
    Building2,
    PanelLeftClose,
    PanelLeftOpen
} from 'lucide-react';
import HeaderControls from './HeaderControls';
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

export default function SalesLayout() {
    const { user, logout } = useAuth();
    const { theme } = useTheme();
    const { tenant, isPlatformOwner } = useTenant();
    const isOwnerWorkspace = isPlatformOwner ? isPlatformOwner(user) : (!user?.tenantId || user?.tenantId === 1 || user?.tenantId === '1');
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
        <div className={`flex h-screen bg-slate-50 dark:bg-[#0B0F17] text-text-primary overflow-hidden ${isExiting ? 'animate-page-exit' : 'animate-page-entrance'}`}>
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sales Sidebar (Seamless L-Frame Outer Surface) */}
            <aside aria-label="Sales navigation" className={`sidebar fixed inset-y-0 left-0 z-50 flex flex-col shrink-0 lg:relative lg:translate-x-0 lg:h-screen bg-slate-50 dark:bg-[#0B0F17] ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'w-[68px]' : 'w-[244px]'}`}>
                {/* Brand Logo Header */}
                <div className="w-full h-[52px] bg-transparent flex items-center px-4 shrink-0 relative z-10">
                    {!isCollapsed && (
                        tenant?.logoUrl ? (
                            <img
                                src={resolveAssetUrl(tenant.logoUrl)}
                                alt={tenant?.brandName || "Workspace"}
                                className="max-h-8 max-w-[190px] w-auto object-contain transition-all"
                            />
                        ) : isOwnerWorkspace ? (
                            <img
                                src={theme === 'dark' ? logoDarkExpanded : logoLightExpanded}
                                alt="ACROVIX"
                                className="max-h-8 max-w-[190px] w-auto object-contain transition-all"
                            />
                        ) : (
                            <div className="flex items-center gap-2.5 max-w-[210px]">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                                    {(tenant?.brandName || tenant?.companyName || 'Acrovix Innovations').slice(0, 2).toUpperCase()}
                                </div>
                                <div className="flex flex-col min-w-0 text-left">
                                    <span className="text-xs font-bold text-text-primary truncate tracking-tight">
                                        {tenant?.brandName || tenant?.companyName || 'Acrovix Innovations'}
                                    </span>
                                    <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">
                                        Sales Workspace
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
                    <button 
                        onClick={() => setIsSidebarOpen(false)} 
                        aria-label="Close navigation"
                        className="lg:hidden absolute right-4 text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Sales Nav List */}
                <div className="flex-1 overflow-y-auto py-3 hide-scrollbar flex flex-col">
                    <nav className="space-y-1 flex-1">
                        <div className="flex flex-col space-y-[2px]">
                            {!isCollapsed && <p className="sidebar-section-title">Sales Workspace</p>}
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
                                            <div className="flex items-center justify-between w-full">
                                                <span>{item.name}</span>
                                                {item.badge && (
                                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-bg-muted/80 text-text-muted font-medium">
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

                {/* Sales Sidebar Footer: Compact Status & Quick Logout */}
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
            </aside>

            {/* Main Application Container (Integrated L-Frame) */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 dark:bg-[#0B0F17] relative">
                {/* Top Header (Subtle 52px height) */}
                <header className="h-[52px] sticky top-0 flex items-center justify-between px-4 sm:px-6 bg-slate-50 dark:bg-[#0B0F17] z-30 transition-all shrink-0">
                    <div className="flex items-center flex-1 gap-3 sm:gap-4 min-w-0">
                        {/* Mobile Menu Trigger */}
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            aria-label="Open navigation menu"
                            className="lg:hidden text-text-muted hover:text-text-primary transition-colors focus:outline-none shrink-0"
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        {/* Sidebar Collapse Toggle */}
                        <button
                            onClick={toggleSidebar}
                            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover border border-transparent hover:border-border-subtle transition-all focus:outline-none shrink-0"
                        >
                            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                        </button>

                        {/* Global Search (Cmd + K) */}
                        <div className="relative w-64 lg:w-72 focus-within:w-80 transition-all duration-200" ref={searchRef}>
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search sales..."
                                    className="w-full bg-slate-100/80 dark:bg-slate-800/50 hover:bg-slate-200/60 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/50 rounded-xl pl-9 pr-14 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all h-[36px]"
                                />
                                {!searchQuery && (
                                    <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none">
                                        <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 font-mono border border-slate-300/40 dark:border-slate-600/40">⌘K</kbd>
                                    </div>
                                )}
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
                                                                    className="px-3 py-2 rounded-xl hover:bg-bg-hover cursor-pointer text-xs flex justify-between items-center transition-colors"
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
                                                                    className="px-3 py-2 rounded-xl hover:bg-bg-hover cursor-pointer text-xs flex justify-between items-center transition-colors"
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
                                                                    className="px-3 py-2 rounded-xl hover:bg-bg-hover cursor-pointer text-xs flex justify-between items-center transition-colors"
                                                                >
                                                                    <div>
                                                                        <span className="font-bold text-text-primary">{cust.name}</span>
                                                                        {cust.customerCode && <span className="text-[10px] text-text-muted ml-1.5">({cust.customerCode})</span>}
                                                                    </div>
                                                                    <span className="text-text-muted text-[11px] truncate max-w-[150px]">{cust.companyName}</span>
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
                    <div className="flex items-center gap-2.5 sm:gap-3 ml-2 lg:ml-4 shrink-0">
                        <DateTimeDisplay />
                        <div className="hidden sm:block header-divider"></div>
                        <HeaderControls onLogout={handleLogout} />
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
