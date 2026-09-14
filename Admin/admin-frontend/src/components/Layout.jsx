import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LayoutDashboard, MessageSquare, LogOut, FileText, Shield, Menu, X, ChevronLeft, ChevronRight, Sun, Moon, Search, Bell, Settings, Trash2 } from 'lucide-react';
import HeaderControls from './HeaderControls';
import { getInitials } from '../utils/userUtils';
import { fetchApi } from '../services/api';

export default function Layout() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Global Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({ enquiries: [], quotations: [] });
    const [isSearching, setIsSearching] = useState(false);
    const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
    const searchRef = useRef(null);

    useEffect(() => {
        let active = true;
        if (!searchQuery.trim()) {
            setSearchResults({ enquiries: [], quotations: [] });
            setSearchDropdownOpen(false);
            setIsSearching(false);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsSearching(true);
            try {
                const [enqRes, quotRes] = await Promise.all([
                    fetchApi(`/admin/enquiries?search=${encodeURIComponent(searchQuery)}&size=5`),
                    fetchApi(`/admin/quotations?search=${encodeURIComponent(searchQuery)}&size=5`)
                ]);
                if (active) {
                    setSearchResults({
                        enquiries: enqRes.content || [],
                        quotations: quotRes.content || []
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
        setSearchResults({ enquiries: [], quotations: [] });
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
        { path: '/enquiries', name: 'Enquiries', icon: MessageSquare },
        { path: '/quotations', name: 'Quotations', icon: FileText }
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
        <div className="flex h-screen bg-bg-main text-text-primary overflow-hidden font-sans">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-text-primary/20 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-bg-card border-r border-border-subtle transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'w-20' : 'w-64'} lg:relative lg:translate-x-0`}>
                <div className="flex items-center justify-between h-[72px] px-6 border-b border-border-subtle/50">
                    {!isCollapsed && (
                        <div className="flex items-center gap-3">
                            <span className="text-3xl font-extrabold text-[#14B8A6] tracking-tighter leading-none select-none">A</span>
                            <div className="flex flex-col justify-center">
                                <span className="text-sm font-bold tracking-tight text-text-primary leading-tight">ACROVIX</span>
                                <span className="text-[10px] font-semibold text-text-muted tracking-widest uppercase leading-tight">Admin Portal</span>
                            </div>
                        </div>
                    )}
                    {isCollapsed && <span className="text-3xl font-extrabold text-[#14B8A6] mx-auto tracking-tighter select-none">A</span>}
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-text-muted hover:text-text-primary transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto py-6 hide-scrollbar">
                    <nav className="space-y-8 px-4">
                        {/* Workspace Section */}
                        <div>
                            {!isCollapsed && <p className="px-3 mb-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Workspace</p>}
                            <div className="space-y-1">
                                {workspaceItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                                    return (
                                        <Link
                                            key={item.name}
                                            to={item.path}
                                            onClick={() => setIsSidebarOpen(false)}
                                            className={`group relative flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                                                isActive 
                                                    ? 'bg-[#E6F5F2] text-[#102A43] dark:bg-[#0D9488]/10 dark:text-[#2DD4BF]' 
                                                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                                            } ${isCollapsed ? 'justify-center px-2' : ''}`}
                                            title={isCollapsed ? item.name : undefined}
                                        >
                                            {isActive && !isCollapsed && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#0D9488] rounded-r-full" />
                                            )}
                                            <Icon className={`w-5 h-5 flex-shrink-0 ${!isCollapsed && 'mr-3'} ${isActive ? 'text-[#0D9488] dark:text-[#2DD4BF]' : 'text-text-muted group-hover:text-text-primary transition-colors'}`} />
                                            {!isCollapsed && <span>{item.name}</span>}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Management Section */}
                        {managementItems.length > 0 && (
                            <div>
                                {!isCollapsed && <p className="px-3 mb-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Management</p>}
                                <div className="space-y-1">
                                    {managementItems.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                                        return (
                                            <Link
                                                key={item.name}
                                                to={item.path}
                                                onClick={() => setIsSidebarOpen(false)}
                                                className={`group relative flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                                                    isActive 
                                                        ? 'bg-[#E6F5F2] text-[#102A43] dark:bg-[#0D9488]/10 dark:text-[#2DD4BF]' 
                                                        : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                                                } ${isCollapsed ? 'justify-center px-2' : ''}`}
                                                title={isCollapsed ? item.name : undefined}
                                            >
                                                {isActive && !isCollapsed && (
                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#0D9488] rounded-r-full" />
                                                )}
                                                <Icon className={`w-5 h-5 flex-shrink-0 ${!isCollapsed && 'mr-3'} ${isActive ? 'text-[#0D9488] dark:text-[#2DD4BF]' : 'text-text-muted group-hover:text-text-primary transition-colors'}`} />
                                                {!isCollapsed && <span>{item.name}</span>}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        
                        {/* System Section */}
                        <div>
                            {!isCollapsed && <p className="px-3 mb-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider">System</p>}
                            <div className="space-y-1">
                                {systemItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                                    return (
                                        <Link
                                            key={item.name}
                                            to={item.path}
                                            onClick={() => setIsSidebarOpen(false)}
                                            className={`group relative flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                                                isActive 
                                                    ? 'bg-[#E6F5F2] text-[#102A43] dark:bg-[#0D9488]/10 dark:text-[#2DD4BF]' 
                                                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                                            } ${isCollapsed ? 'justify-center px-2' : ''}`}
                                            title={isCollapsed ? item.name : undefined}
                                        >
                                            {isActive && !isCollapsed && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#0D9488] rounded-r-full" />
                                            )}
                                            <Icon className={`w-5 h-5 flex-shrink-0 ${!isCollapsed && 'mr-3'} ${isActive ? 'text-[#0D9488] dark:text-[#2DD4BF]' : 'text-text-muted group-hover:text-text-primary transition-colors'}`} />
                                            {!isCollapsed && <span>{item.name}</span>}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </nav>
                </div>
                
                <div className="p-4 border-t border-border-subtle/50">
                    {!isCollapsed && (
                        <div className="mb-4 flex items-center px-2">
                            <div className="w-10 h-10 rounded-full bg-[#EEF2FF] flex items-center justify-center mr-3 text-[#4F46E5] font-bold shadow-sm">
                                {getInitials(user?.name)}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-semibold text-text-primary truncate leading-tight">{user?.name || 'Admin User'}</p>
                                <p className="text-[11px] text-text-muted font-medium uppercase tracking-wider truncate leading-tight mt-0.5">{user?.role?.replace('_', ' ')}</p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className={`flex items-center w-full px-3 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-xl transition-colors ${isCollapsed ? 'justify-center px-2' : ''}`}
                        title={isCollapsed ? 'Sign out' : undefined}
                    >
                        <LogOut className={`w-5 h-5 flex-shrink-0 ${!isCollapsed && 'mr-3'}`} />
                        {!isCollapsed && 'Sign out'}
                    </button>
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
                        <button 
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="hidden lg:flex items-center justify-center w-9 h-9 mr-6 rounded-xl text-text-muted hover:bg-bg-card hover:shadow-sm hover:text-text-primary transition-all border border-transparent hover:border-border-subtle bg-bg-main"
                            aria-label="Toggle Sidebar"
                        >
                            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                        </button>
                        
                        {/* Search Bar matching reference */}
                        <div ref={searchRef} className="relative w-full max-w-md hidden sm:block">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                {isSearching ? (
                                    <div className="animate-spin w-4 h-4 border-2 border-[#14B8A6] border-t-transparent rounded-full" />
                                ) : (
                                    <Search className="h-4 w-4 text-text-muted" />
                                )}
                            </div>
                            <input
                                type="text"
                                className="w-full pl-10 pr-10 py-2.5 bg-bg-card border border-border-subtle rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20 focus:border-[#14B8A6]/30 transition-all shadow-sm text-text-primary placeholder-text-muted"
                                placeholder="Search enquiries, quotations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => { if (searchQuery.trim() && (searchResults.enquiries.length > 0 || searchResults.quotations.length > 0)) setSearchDropdownOpen(true) }}
                            />
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
                                    {(searchResults.quotations.length === 0 && searchResults.enquiries.length === 0) ? (
                                        <div className="p-4 text-center text-text-muted text-sm">
                                            No results found for "{searchQuery}"
                                        </div>
                                    ) : (
                                        <div className="py-2">
                                            {searchResults.quotations.length > 0 && (
                                                <div>
                                                    <div className="px-4 py-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider bg-bg-main/50">
                                                        Quotations
                                                    </div>
                                                    {searchResults.quotations.map(q => (
                                                        <div 
                                                            key={q.id}
                                                            onClick={() => handleSearchNavigate(`/quotations/edit/${q.id}`)}
                                                            className="px-4 py-3 hover:bg-bg-hover cursor-pointer transition-colors border-l-2 border-transparent hover:border-[#14B8A6]"
                                                        >
                                                            <div className="flex justify-between items-start mb-0.5">
                                                                <span className="text-sm font-semibold text-text-primary">{q.quotationNumber}</span>
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                                                    q.status === 'SENT' ? 'bg-[#ECFDF5] text-[#059669]' : 
                                                                    q.status === 'ACCEPTED' ? 'bg-[#EFF6FF] text-[#2563EB]' : 
                                                                    q.status === 'REJECTED' ? 'bg-[#FEF2F2] text-[#DC2626]' : 
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
                                                            className="px-4 py-3 hover:bg-bg-hover cursor-pointer transition-colors border-l-2 border-transparent hover:border-[#14B8A6]"
                                                        >
                                                            <div className="flex justify-between items-start mb-0.5">
                                                                <span className="text-sm font-semibold text-text-primary">{e.referenceId || 'New Enquiry'}</span>
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                                                    e.status === 'NEW' ? 'bg-[#EEF2FF] text-[#4F46E5]' :
                                                                    e.status === 'QUOTED' ? 'bg-[#ECFDF5] text-[#059669]' :
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
                    
                    <HeaderControls />
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pt-2">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
