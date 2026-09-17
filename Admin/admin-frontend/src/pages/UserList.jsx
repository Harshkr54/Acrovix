import React, { useEffect, useState } from 'react';
import { fetchApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { UserPlus, ShieldAlert, Mail, Lock, Shield, Users } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';

export default function UserList() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('SALES');

    const fetchUsers = React.useCallback(() => {
        setIsLoading(true);
        setError(null);
        fetchApi('/users')
            .then(data => {
                setUsers(data || []);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Error fetching users", err);
                setError(err.message || "Failed to load users");
                setIsLoading(false);
            });
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await fetchApi('/users', {
                method: 'POST',
                body: JSON.stringify({ name, email, password, role })
            });
            fetchUsers();
            setShowForm(false);
            setName(''); setEmail(''); setPassword(''); setRole('SALES');
        } catch (error) {
            alert(error.message || "Failed to create user.");
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        if (!window.confirm(`Are you sure you want to ${currentStatus ? 'disable' : 'enable'} this user?`)) return;
        try {
            await fetchApi(`/users/${id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ enabled: !currentStatus })
            });
            fetchUsers();
        } catch (error) {
            alert(error.message || "Failed to update status");
        }
    };

    const changeRole = async (id, newRole) => {
        if (!window.confirm(`Change role to ${newRole}?`)) return;
        try {
            await fetchApi(`/users/${id}/role`, {
                method: 'PATCH',
                body: JSON.stringify({ role: newRole })
            });
            fetchUsers();
        } catch (error) {
            alert(error.message || "Failed to update role");
        }
    };

    if (currentUser?.role !== 'SUPER_ADMIN') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="bg-bg-card p-8 text-center max-w-md w-full border border-border-subtle rounded-2xl shadow-sm">
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 mx-auto rounded-2xl flex items-center justify-center mb-6">
                        <ShieldAlert className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-text-primary mb-2">Unauthorized Access</h2>
                    <p className="text-sm text-text-muted">Only Super Admins have permission to view and manage users.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
            
            {/* Header */}
            <PageHeader
                title="Admin Users"
                subtitle="Manage system administrators, roles, and access control."
                icon={Users}
                action={
                    <button 
                        onClick={() => setShowForm(!showForm)}
                        className={showForm ? "btn-secondary text-xs px-4 py-2.5 rounded-xl font-medium" : "btn-primary text-xs px-4 py-2.5 rounded-xl font-medium flex items-center gap-2"}
                    >
                        {showForm ? 'Cancel' : <><UserPlus className="w-4 h-4" /> Create User</>}
                    </button>
                }
            />

            {showForm && (
                <div className="bg-bg-card border border-brand-primary/20 rounded-2xl p-6 md:p-8 shadow-sm mb-6 relative">
                    <h2 className="text-base font-bold text-text-primary mb-6 flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-brand-primary" />
                        Add New Admin User
                    </h2>
                    <form onSubmit={handleCreate} className="space-y-6 max-w-2xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-semibold text-text-muted uppercase mb-2">Full Name</label>
                                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary" placeholder="John Doe" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-text-muted uppercase mb-2">Email Address</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-4 w-4 text-text-muted" />
                                    </div>
                                    <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-bg-main border border-border-subtle rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary" placeholder="admin@acrovix.com" />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-semibold text-text-muted uppercase mb-2">Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-4 w-4 text-text-muted" />
                                    </div>
                                    <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-bg-main border border-border-subtle rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary" placeholder="••••••••" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-text-muted uppercase mb-2">Role</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Shield className="h-4 w-4 text-text-muted" />
                                    </div>
                                    <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-bg-main border border-border-subtle rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary appearance-none cursor-pointer">
                                        <option value="SALES">Sales</option>
                                        <option value="SUPER_ADMIN">Super Admin</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="pt-2 flex justify-end">
                            <button type="submit" className="btn-primary text-xs px-6 py-2.5 rounded-xl font-semibold">
                                Save User
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-bg-main/50 text-text-muted text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="py-8">
                                        <EmptyState type="loading" message="Loading admin users..." />
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="5" className="py-8">
                                        <EmptyState type="error" message={error} onRetry={fetchUsers} />
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="py-8">
                                        <EmptyState type="empty" message="No users found." />
                                    </td>
                                </tr>
                            ) : (
                                users.map(u => (
                                    <tr key={u.id} className="hover:bg-bg-main/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-text-primary align-top">
                                            {u.name}
                                        </td>
                                        <td className="px-6 py-4 text-text-secondary align-top">
                                            {u.email}
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <select 
                                                value={u.role} 
                                                onChange={(e) => changeRole(u.id, e.target.value)}
                                                disabled={u.email === currentUser.email}
                                                className="text-xs font-semibold px-2.5 py-1 rounded-xl border border-border-subtle bg-bg-main text-text-primary focus:outline-none focus:border-brand-primary disabled:opacity-50 cursor-pointer"
                                            >
                                                <option value="SALES">Sales</option>
                                                <option value="SUPER_ADMIN">Super Admin</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <StatusBadge status={u.enabled ? 'ACTIVE' : 'INACTIVE'} />
                                        </td>
                                        <td className="px-6 py-4 text-right align-top whitespace-nowrap">
                                            <button 
                                                onClick={() => toggleStatus(u.id, u.enabled)}
                                                disabled={u.email === currentUser.email}
                                                className={`text-xs font-semibold transition-colors ${u.enabled ? 'text-red-500 hover:text-red-600' : 'text-brand-primary hover:text-brand-hover'} disabled:opacity-30 disabled:cursor-not-allowed`}
                                            >
                                                {u.enabled ? 'Disable' : 'Enable'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

