import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LayoutDashboard, MessageSquare, LogOut, FileText, Shield, Menu, X, ChevronLeft, ChevronRight, Sun, Moon, Search, Bell, Settings } from 'lucide-react';

export default function Layout() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

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
                        
                        {/* System Section (Mock for visual completeness matching reference) */}
                        <div>
                            {!isCollapsed && <p className="px-3 mb-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider">System</p>}
                            <div className="space-y-1">
                                <button className={`w-full group relative flex items-center px-3 py-2.5 text-sm font-medium rounded-xl text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-all duration-200 ${isCollapsed ? 'justify-center px-2' : ''}`} title={isCollapsed ? 'Settings' : undefined}>
                                    <Settings className={`w-5 h-5 flex-shrink-0 ${!isCollapsed && 'mr-3'} text-text-muted group-hover:text-text-primary transition-colors`} />
                                    {!isCollapsed && <span>Settings</span>}
                                </button>
                            </div>
                        </div>
                    </nav>
                </div>
                
                <div className="p-4 border-t border-border-subtle/50">
                    {!isCollapsed && (
                        <div className="mb-4 flex items-center px-2">
                            <div className="w-10 h-10 rounded-full bg-[#EEF2FF] flex items-center justify-center mr-3 text-[#4F46E5] font-bold shadow-sm">
                                {user?.role === 'SUPER_ADMIN' ? 'SA' : user?.name?.charAt(0)?.toUpperCase()}
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
                        <div className="relative w-full max-w-md hidden sm:block">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-text-muted" />
                            </div>
                            <input
                                type="text"
                                className="w-full pl-10 pr-4 py-2.5 bg-bg-card border border-border-subtle rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-acx-teal/20 transition-shadow shadow-sm text-text-primary placeholder-text-muted"
                                placeholder="Search enquiries, quotations..."
                            />
                        </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 sm:space-x-4 ml-4">
                        <button className="w-10 h-10 rounded-full bg-bg-card border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary hover:shadow-sm transition-all relative">
                            <FileText className="w-4 h-4" />
                        </button>
                        <button
                            onClick={toggleTheme}
                            className="w-10 h-10 rounded-full bg-bg-card border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary hover:shadow-sm transition-all relative"
                            aria-label="Toggle Theme"
                            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                        >
                            {theme === 'dark' ? (
                                <Sun className="w-4 h-4" />
                            ) : (
                                <Moon className="w-4 h-4" />
                            )}
                        </button>
                        <button className="w-10 h-10 rounded-full bg-bg-card border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary hover:shadow-sm transition-all relative">
                            <Bell className="w-4 h-4" />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#ef4444] rounded-full border border-white"></span>
                        </button>
                        <button className="hidden sm:flex w-10 h-10 rounded-full bg-bg-card border border-border-subtle items-center justify-center text-text-muted hover:text-text-primary hover:shadow-sm transition-all">
                            <Settings className="w-4 h-4" />
                        </button>
                        
                        <div className="hidden sm:flex items-center ml-2 pl-4 border-l border-border-subtle">
                            <div className="flex items-center space-x-2 bg-bg-card px-3 py-1.5 rounded-full border border-border-subtle shadow-sm cursor-pointer hover:bg-bg-hover transition-colors">
                                <div className="w-7 h-7 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#4F46E5] font-bold text-xs">
                                    {user?.role === 'SUPER_ADMIN' ? 'SA' : user?.name?.charAt(0)?.toUpperCase()}
                                </div>
                                <ChevronRight className="w-4 h-4 text-text-muted rotate-90" />
                            </div>
                        </div>
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
