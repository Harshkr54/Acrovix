import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, MessageSquare, LogOut, FileText, Shield, Menu, X, ChevronLeft, ChevronRight, User } from 'lucide-react';

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/', name: 'Dashboard', icon: LayoutDashboard },
        { path: '/enquiries', name: 'Enquiries', icon: MessageSquare },
        { path: '/quotations', name: 'Quotations', icon: FileText }
    ];
    
    if (user?.role === 'SUPER_ADMIN') {
        navItems.push({ path: '/users', name: 'Admin Users', icon: Shield });
    }

    const currentRouteName = navItems.find(item => item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path))?.name || 'Dashboard';

    return (
        <div className="flex h-screen bg-slate-900 text-slate-200 overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-950 border-r border-slate-800 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'w-20' : 'w-64'} lg:relative lg:translate-x-0`}>
                <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
                    {!isCollapsed && <span className="text-xl font-bold bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">ACROVIX</span>}
                    {isCollapsed && <span className="text-xl font-bold text-brand-500 mx-auto">A</span>}
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto py-6">
                    <nav className="space-y-2 px-3">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                            return (
                                <Link
                                    key={item.name}
                                    to={item.path}
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                                        isActive 
                                            ? 'bg-brand-600/10 text-brand-400 shadow-[inset_2px_0_0_0] shadow-brand-500' 
                                            : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                                    } ${isCollapsed ? 'justify-center px-2' : ''}`}
                                    title={isCollapsed ? item.name : undefined}
                                >
                                    <Icon className={`w-5 h-5 flex-shrink-0 ${!isCollapsed && 'mr-3'} ${isActive ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                                    {!isCollapsed && <span>{item.name}</span>}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
                
                <div className="p-4 border-t border-slate-800">
                    {!isCollapsed && (
                        <div className="mb-4 flex items-center px-2">
                            <div className="w-8 h-8 rounded-full bg-brand-900/50 flex items-center justify-center mr-3 border border-brand-700/30">
                                <User className="w-4 h-4 text-brand-400" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium text-slate-200 truncate">{user?.name}</p>
                                <p className="text-xs font-medium text-brand-400 truncate">{user?.role?.replace('_', ' ')}</p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className={`flex items-center w-full px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-colors ${isCollapsed ? 'justify-center px-2' : ''}`}
                        title={isCollapsed ? 'Logout' : undefined}
                    >
                        <LogOut className={`w-5 h-5 ${!isCollapsed && 'mr-3'}`} />
                        {!isCollapsed && 'Logout'}
                    </button>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Header */}
                <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30">
                    <div className="flex items-center">
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className="mr-4 lg:hidden text-slate-400 hover:text-slate-200 focus:outline-none"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <button 
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="hidden lg:flex items-center justify-center w-8 h-8 mr-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                        >
                            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                        </button>
                        <h1 className="text-lg font-semibold text-slate-100">{currentRouteName}</h1>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
