import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { fetchApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import DisableUserModal from '../components/DisableUserModal';
import UserDetailsModal from '../components/UserDetailsModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { 
    UserPlus, ShieldAlert, Mail, Lock, Shield, Users, 
    AlertCircle, RefreshCw, Search, X, CheckCircle2, 
    RotateCcw, Eye, Loader2 
} from 'lucide-react';

export default function UserList() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [activeTab, setActiveTab] = useState('active'); // 'active' | 'inactive'
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [showForm, setShowForm] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionMessage, setActionMessage] = useState(null);
    
    // User creation state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('SALES');
    const [isCreating, setIsCreating] = useState(false);

    // Modal states
    const [userToDisable, setUserToDisable] = useState(null);
    const [isDisabling, setIsDisabling] = useState(false);

    const [userToReactivate, setUserToReactivate] = useState(null);
    const [isReactivating, setIsReactivating] = useState(false);

    const [userToView, setUserToView] = useState(null);

    const fetchUsers = useCallback(() => {
        setIsLoading(true);
        setError(null);
        fetchApi('/users')
            .then(data => {
                setUsers(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Error fetching users", err);
                setError(err.message);
                setIsLoading(false);
            });
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Derived active and inactive users
    const activeUsers = useMemo(() => users.filter(u => u.enabled), [users]);
    const inactiveUsers = useMemo(() => users.filter(u => !u.enabled), [users]);

    // Filtered users for the selected tab
    const displayedUsers = useMemo(() => {
        const list = activeTab === 'active' ? activeUsers : inactiveUsers;
        return list.filter(u => {
            const query = searchQuery.trim().toLowerCase();
            const matchesSearch = !query || 
                (u.name && u.name.toLowerCase().includes(query)) ||
                (u.email && u.email.toLowerCase().includes(query));
            const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
            return matchesSearch && matchesRole;
        });
    }, [activeTab, activeUsers, inactiveUsers, searchQuery, roleFilter]);

    const handleCreate = async (e) => {
        e.preventDefault();
        setIsCreating(true);
        setActionMessage(null);
        try {
            await fetchApi('/users', {
                method: 'POST',
                body: JSON.stringify({ name, email, password, role })
            });
            fetchUsers();
            setShowForm(false);
            setName(''); 
            setEmail(''); 
            setPassword(''); 
            setRole('SALES');
            setActionMessage({ type: 'success', text: `User "${name}" created successfully.` });
        } catch (err) {
            setActionMessage({ type: 'error', text: err.message || "Failed to create user." });
        } finally {
            setIsCreating(false);
        }
    };

    const handleConfirmDisable = async (reassignToUserId) => {
        if (!userToDisable) return;
        setIsDisabling(true);
        setActionMessage(null);
        try {
            await fetchApi(`/users/${userToDisable.id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ 
                    enabled: false, 
                    reassignToUserId 
                })
            });
            setActionMessage({ 
                type: 'success', 
                text: `User "${userToDisable.name}" has been disabled.` 
            });
            setUserToDisable(null);
            fetchUsers();
        } catch (err) {
            setActionMessage({ 
                type: 'error', 
                text: err.message || "Failed to disable user." 
            });
        } finally {
            setIsDisabling(false);
        }
    };

    const handleConfirmReactivate = async () => {
        if (!userToReactivate) return;
        setIsReactivating(true);
        setActionMessage(null);
        try {
            await fetchApi(`/users/${userToReactivate.id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ enabled: true })
            });
            setActionMessage({ 
                type: 'success', 
                text: `User "${userToReactivate.name}" has been successfully reactivated.` 
            });
            setUserToReactivate(null);
            fetchUsers();
        } catch (err) {
            setActionMessage({ 
                type: 'error', 
                text: err.message || "Failed to reactivate user." 
            });
        } finally {
            setIsReactivating(false);
        }
    };

    const changeRole = async (id, newRole) => {
        if (!window.confirm(`Change role to ${newRole}?`)) return;
        setActionMessage(null);
        try {
            await fetchApi(`/users/${id}/role`, {
                method: 'PATCH',
                body: JSON.stringify({ role: newRole })
            });
            setActionMessage({ type: 'success', text: `User role updated to ${newRole}.` });
            fetchUsers();
        } catch (err) {
            setActionMessage({ type: 'error', text: err.message || "Failed to update role." });
        }
    };

    if (currentUser?.role !== 'SUPER_ADMIN') {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh]">
                <div className="acx-card p-8 text-center max-w-md w-full border-t-4 border-[#DC2626]">
                    <div className="w-16 h-16 bg-brand-danger/10 border border-brand-danger/30 mx-auto rounded-[20px] flex items-center justify-center mb-6 shadow-sm">
                        <ShieldAlert className="w-8 h-8 text-brand-danger" />
                    </div>
                    <h2 className="text-[20px] font-bold text-text-primary mb-2 tracking-tight">Unauthorized Access</h2>
                    <p className="text-[13px] text-text-secondary">Only Super Admins have permission to view and manage users.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-[28px] font-bold text-text-primary tracking-tight leading-tight flex items-center gap-2">
                        <Users className="w-7 h-7 text-brand-teal" />
                        Admin Users
                    </h1>
                    <p className="text-[13px] text-text-secondary mt-1">Manage employees, access and account status.</p>
                </div>
                <button 
                    onClick={() => setShowForm(!showForm)}
                    className={showForm ? "btn btn-secondary btn-md" : "btn btn-primary btn-md"}
                >
                    {showForm ? 'Cancel' : <><UserPlus className="w-4 h-4 mr-1.5" /> Create User</>}
                </button>
            </div>

            {/* Notification Banner */}
            {actionMessage && (
                <div className={`p-4 rounded-xl flex items-center justify-between text-[13px] font-medium border ${
                    actionMessage.type === 'success' 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                }`}>
                    <div className="flex items-center gap-2">
                        {actionMessage.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                        ) : (
                            <AlertCircle className="w-4 h-4 shrink-0" />
                        )}
                        <span>{actionMessage.text}</span>
                    </div>
                    <button 
                        type="button" 
                        onClick={() => setActionMessage(null)}
                        className="text-current hover:opacity-70 p-1"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Add User Form */}
            {showForm && (
                <div className="acx-card p-6 md:p-8 border border-[var(--color-brand-primary)]/20 mb-6 relative overflow-hidden group">
                    <div className="absolute -right-8 -top-8 text-[var(--color-brand-primary)]/5 pointer-events-none transition-transform group-hover:scale-110 duration-700">
                        <Shield className="w-48 h-48" />
                    </div>
                    <h2 className="text-[14px] font-bold text-text-primary mb-6 flex items-center relative z-10 tracking-tight">
                        <UserPlus className="w-4 h-4 text-[var(--color-brand-primary)] mr-2" />
                        Add New Admin User
                    </h2>
                    <form onSubmit={handleCreate} className="space-y-6 max-w-2xl relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Full Name</label>
                                <input 
                                    required 
                                    type="text" 
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                    className="acx-input rounded-xl text-[13px] bg-bg-main h-11" 
                                    placeholder="John Doe" 
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Email Address</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="h-4 w-4 text-text-muted" />
                                    </div>
                                    <input 
                                        required 
                                        type="email" 
                                        value={email} 
                                        onChange={e => setEmail(e.target.value)} 
                                        className="acx-input pl-11 rounded-xl text-[13px] bg-bg-main h-11" 
                                        placeholder="admin@acrovix.com" 
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-4 w-4 text-text-muted" />
                                    </div>
                                    <input 
                                        required 
                                        type="password" 
                                        value={password} 
                                        onChange={e => setPassword(e.target.value)} 
                                        className="acx-input pl-11 rounded-xl text-[13px] bg-bg-main h-11" 
                                        placeholder="••••••••" 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Role</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Shield className="h-4 w-4 text-text-muted" />
                                    </div>
                                    <select 
                                        value={role} 
                                        onChange={e => setRole(e.target.value)} 
                                        className="acx-input pl-11 appearance-none rounded-xl text-[13px] bg-bg-main h-11 cursor-pointer"
                                    >
                                        <option value="SALES">Sales</option>
                                        <option value="SUPER_ADMIN">Super Admin</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="pt-2">
                            <button 
                                type="submit" 
                                disabled={isCreating}
                                className="btn btn-primary btn-md w-full sm:w-auto"
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Saving...
                                    </>
                                ) : 'Save User'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Category Tabs: Active Users & Inactive Users */}
            <div className="flex border-b border-border-subtle gap-2 overflow-x-auto">
                <button
                    type="button"
                    onClick={() => setActiveTab('active')}
                    className={`flex items-center gap-2.5 px-6 py-3.5 text-[13px] font-bold tracking-wide transition-all border-b-2 whitespace-nowrap ${
                        activeTab === 'active'
                            ? 'border-[#2563EB] text-[#2563EB] bg-[#2563EB]/5'
                            : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                    }`}
                >
                    <span>Active Users</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        activeTab === 'active'
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-bg-main text-text-muted border border-border-subtle'
                    }`}>
                        {activeUsers.length}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('inactive')}
                    className={`flex items-center gap-2.5 px-6 py-3.5 text-[13px] font-bold tracking-wide transition-all border-b-2 whitespace-nowrap ${
                        activeTab === 'inactive'
                            ? 'border-[#2563EB] text-[#2563EB] bg-[#2563EB]/5'
                            : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                    }`}
                >
                    <span>Inactive Users</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        activeTab === 'inactive'
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-bg-main text-text-muted border border-border-subtle'
                    }`}>
                        {inactiveUsers.length}
                    </span>
                </button>
            </div>

            {/* Table Container Card */}
            <div className="acx-card flex flex-col">
                {/* Search & Filter Toolbar */}
                <div className="p-4 sm:p-5 border-b border-border-subtle flex flex-col sm:flex-row gap-3 sm:items-center justify-between bg-bg-card/50">
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder={`Search ${activeTab === 'active' ? 'active' : 'inactive'} users by name or email...`}
                            className="acx-input pl-10 pr-9 rounded-xl text-[13px] bg-bg-main h-10 w-full"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            value={roleFilter}
                            onChange={e => setRoleFilter(e.target.value)}
                            className="acx-input rounded-xl text-[13px] bg-bg-main h-10 px-3 cursor-pointer"
                        >
                            <option value="ALL">All Roles</option>
                            <option value="SALES">Sales</option>
                            <option value="SUPER_ADMIN">Super Admin</option>
                        </select>
                    </div>
                </div>

                {/* Table Content */}
                <div className="acx-table-container">
                    <table className="acx-table">
                        <thead>
                            <tr>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Name</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Email</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Role</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Status</th>
                                <th className="px-6 py-4 text-right text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-bg-card divide-y divide-border-subtle/40 rounded-b-[24px]">
                            {error ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-4 max-w-sm mx-auto">
                                            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-1">
                                                <AlertCircle className="w-6 h-6 text-red-500" />
                                            </div>
                                            <p className="text-[15px] font-bold text-text-primary">Failed to load users</p>
                                            <p className="text-[13px] text-text-secondary leading-relaxed">{error}</p>
                                            <button onClick={fetchUsers} className="btn btn-secondary btn-md mt-2">
                                                <RefreshCw className="w-4 h-4 mr-1.5" />
                                                Retry
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-16 text-center">
                                        <div className="flex justify-center mb-4">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal"></div>
                                        </div>
                                        <p className="text-[13px] font-medium text-text-muted">Loading users...</p>
                                    </td>
                                </tr>
                            ) : displayedUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-16 text-center text-text-muted text-[13px] font-medium">
                                        {searchQuery || roleFilter !== 'ALL' ? (
                                            <div className="space-y-2">
                                                <p>No {activeTab} users match the current search or filters.</p>
                                                <button
                                                    type="button"
                                                    onClick={() => { setSearchQuery(''); setRoleFilter('ALL'); }}
                                                    className="btn btn-ghost btn-sm text-brand-primary"
                                                >
                                                    Clear filters
                                                </button>
                                            </div>
                                        ) : activeTab === 'active' ? (
                                            'No active users found.'
                                        ) : (
                                            'No inactive users found.'
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                displayedUsers.map(u => (
                                    <tr key={u.id} className="hover:bg-bg-hover transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap align-middle">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-xs shrink-0">
                                                    {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                                                </div>
                                                <div className="text-[13px] font-bold text-text-primary tracking-tight">{u.name}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap align-middle">
                                            <div className="text-text-secondary text-[13px] font-medium">{u.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap align-middle">
                                            {u.enabled ? (
                                                <select 
                                                    value={u.role} 
                                                    onChange={(e) => changeRole(u.id, e.target.value)}
                                                    disabled={u.email === currentUser?.email}
                                                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-border-subtle bg-bg-main text-text-primary appearance-none outline-none focus:border-brand-teal disabled:opacity-50 disabled:border-transparent transition-colors cursor-pointer"
                                                >
                                                    <option value="SALES">Sales</option>
                                                    <option value="SUPER_ADMIN">Super Admin</option>
                                                </select>
                                            ) : (
                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-bg-muted text-text-muted border border-border-subtle">
                                                    {u.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Sales'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap align-middle">
                                            {u.enabled ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap align-middle text-right">
                                            {u.enabled ? (
                                                <button 
                                                    type="button"
                                                    onClick={() => setUserToDisable(u)}
                                                    disabled={u.email === currentUser?.email}
                                                    title={u.email === currentUser?.email ? "Cannot disable yourself" : "Disable User"}
                                                    className="btn btn-sm btn-ghost text-brand-danger hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 disabled:cursor-not-allowed"
                                                >
                                                    Disable
                                                </button>
                                            ) : (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        type="button"
                                                        onClick={() => setUserToView(u)}
                                                        className="btn btn-sm btn-secondary inline-flex items-center gap-1.5"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        View Details
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setUserToReactivate(u)}
                                                        className="btn btn-sm btn-primary inline-flex items-center gap-1.5"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5" />
                                                        Reactivate
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Disable User Modal */}
            {userToDisable && (
                <DisableUserModal
                    user={userToDisable}
                    activeUsers={activeUsers.filter(u => u.id !== userToDisable.id)}
                    isLoading={isDisabling}
                    onClose={() => !isDisabling && setUserToDisable(null)}
                    onConfirm={handleConfirmDisable}
                />
            )}

            {/* Reactivate User Confirmation Modal */}
            {userToReactivate && (
                <ConfirmDialog
                    isOpen={Boolean(userToReactivate)}
                    title="Reactivate User Account"
                    description={`Are you sure you want to restore access for ${userToReactivate.name} (${userToReactivate.email})? Their login access and permissions will be restored.`}
                    confirmText="Reactivate Account"
                    cancelText="Cancel"
                    isLoading={isReactivating}
                    variant="primary"
                    onConfirm={handleConfirmReactivate}
                    onCancel={() => !isReactivating && setUserToReactivate(null)}
                />
            )}

            {/* View User Details Modal */}
            {userToView && (
                <UserDetailsModal
                    user={userToView}
                    onClose={() => setUserToView(null)}
                    onReactivate={(u) => {
                        setUserToView(null);
                        setUserToReactivate(u);
                    }}
                />
            )}
        </div>
    );
}
