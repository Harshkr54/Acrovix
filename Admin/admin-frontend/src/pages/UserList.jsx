import React, { useEffect, useState } from 'react';
import { fetchApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { UserPlus, ShieldAlert, Mail, Lock, Shield, Users, AlertCircle, RefreshCw } from 'lucide-react';

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
            <div className="flex flex-col items-center justify-center h-[70vh]">
                <div className="card p-8 text-center max-w-md w-full border-t-4 border-[#DC2626]">
                    <div className="w-16 h-16 bg-[#FEF2F2] border border-[#FCA5A5] mx-auto rounded-[20px] flex items-center justify-center mb-6 shadow-sm">
                        <ShieldAlert className="w-8 h-8 text-[#DC2626]" />
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
                    <h1 className="text-[28px] font-bold text-text-primary tracking-tight leading-tight flex items-center">
                        <Users className="w-7 h-7 mr-3 text-[#14B8A6]" />
                        Admin Users
                    </h1>
                    <p className="text-[13px] text-text-secondary mt-1">Manage system administrators and roles.</p>
                </div>
                <button 
                    onClick={() => setShowForm(!showForm)}
                    className={showForm ? "inline-flex items-center px-4 py-2.5 bg-bg-card hover:bg-bg-hover border border-border-subtle rounded-xl text-[13px] font-semibold text-text-primary transition-colors shadow-sm" : "btn-primary flex items-center px-4 py-2.5 shadow-[0_4px_14px_rgba(79,70,229,0.25)]"}
                >
                    {showForm ? 'Cancel' : <><UserPlus className="w-4 h-4 mr-2" /> Create User</>}
                </button>
            </div>

            {showForm && (
                <div className="card p-6 md:p-8 border border-[#4F46E5]/20 mb-6 relative overflow-hidden group">
                    <div className="absolute -right-8 -top-8 text-[#4F46E5]/5 pointer-events-none transition-transform group-hover:scale-110 duration-700">
                        <Shield className="w-48 h-48" />
                    </div>
                    <h2 className="text-[14px] font-bold text-text-primary mb-6 flex items-center relative z-10 tracking-tight">
                        <UserPlus className="w-4 h-4 mr-2 text-[#4F46E5]" />
                        Add New Admin User
                    </h2>
                    <form onSubmit={handleCreate} className="space-y-6 max-w-2xl relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Full Name</label>
                                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="input-field rounded-xl text-[13px] bg-bg-main h-11" placeholder="John Doe" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Email Address</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="h-4 w-4 text-text-muted" />
                                    </div>
                                    <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field pl-11 rounded-xl text-[13px] bg-bg-main h-11" placeholder="admin@acrovix.com" />
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
                                    <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-field pl-11 rounded-xl text-[13px] bg-bg-main h-11" placeholder="••••••••" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Role</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Shield className="h-4 w-4 text-text-muted" />
                                    </div>
                                    <select value={role} onChange={e => setRole(e.target.value)} className="input-field pl-11 appearance-none rounded-xl text-[13px] bg-bg-main h-11 cursor-pointer">
                                        <option value="SALES">Sales</option>
                                        <option value="EDITOR">Editor</option>
                                        <option value="SUPER_ADMIN">Super Admin</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="pt-2">
                            <button type="submit" className="btn-primary w-full sm:w-auto px-8 py-2.5 text-[13px] font-semibold shadow-[0_4px_14px_rgba(79,70,229,0.25)]">
                                Save User
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card flex flex-col">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border-subtle">
                        <thead>
                            <tr>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card rounded-tl-[24px]">Name</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Email</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Role</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Status</th>
                                <th className="px-6 py-4 text-right text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card rounded-tr-[24px]">Actions</th>
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
                                            <button onClick={fetchUsers} className="btn-primary mt-2">
                                                <RefreshCw className="w-4 h-4 mr-2" />
                                                Retry
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-16 text-center">
                                        <div className="flex justify-center mb-4">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14B8A6]"></div>
                                        </div>
                                        <p className="text-[13px] font-medium text-text-muted">Loading users...</p>
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-16 text-center text-text-muted text-[13px] font-medium">
                                        No users found.
                                    </td>
                                </tr>
                            ) : (
                                users.map(u => (
                                    <tr key={u.id} className="hover:bg-bg-hover transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap align-top">
                                            <div className="text-[13px] font-bold text-text-primary tracking-tight">{u.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap align-top">
                                            <div className="text-text-secondary text-[13px] font-medium">{u.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap align-top">
                                            <select 
                                                value={u.role} 
                                                onChange={(e) => changeRole(u.id, e.target.value)}
                                                disabled={u.email === currentUser.email}
                                                className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-border-subtle bg-bg-main text-text-primary appearance-none outline-none focus:border-[#14B8A6] disabled:opacity-50 disabled:border-transparent transition-colors cursor-pointer"
                                            >
                                                <option value="SALES">Sales</option>
                                                <option value="EDITOR">Editor</option>
                                                <option value="SUPER_ADMIN">Super Admin</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap align-top">
                                            {u.enabled ? (
                                                <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-[#059669]">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5"></span>
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-[#DC2626]">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5"></span>
                                                    Disabled
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap align-top text-right">
                                            <button 
                                                onClick={() => toggleStatus(u.id, u.enabled)}
                                                disabled={u.email === currentUser.email}
                                                className={`text-[12px] font-semibold transition-colors ${u.enabled ? 'text-[#DC2626] hover:text-[#B91C1C]' : 'text-[#4F46E5] hover:text-[#4338CA]'} disabled:opacity-30 disabled:cursor-not-allowed`}
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
