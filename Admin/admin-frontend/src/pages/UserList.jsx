import React, { useEffect, useState } from 'react';
import { API_BASE_URL, getAuthHeaders } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { UserPlus, ShieldAlert, Mail, Lock, Shield, CheckCircle, XCircle } from 'lucide-react';

export default function UserList() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('SALES');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = () => {
        setIsLoading(true);
        fetch(`${API_BASE_URL}/users`, { headers: getAuthHeaders() })
            .then(res => res.json())
            .then(data => {
                setUsers(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Error fetching users", err);
                setIsLoading(false);
            });
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE_URL}/users`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ name, email, password, role })
            });
            if (res.ok) {
                fetchUsers();
                setShowForm(false);
                setName(''); setEmail(''); setPassword(''); setRole('SALES');
            } else {
                alert("Failed to create user. Email might already exist.");
            }
        } catch (error) {
            alert("Error creating user");
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        if (!window.confirm(`Are you sure you want to ${currentStatus ? 'disable' : 'enable'} this user?`)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/users/${id}/status`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ enabled: !currentStatus })
            });
            if (res.ok) fetchUsers();
            else alert("Failed to update status");
        } catch (error) {
            alert("Error updating status");
        }
    };

    const changeRole = async (id, newRole) => {
        if (!window.confirm(`Change role to ${newRole}?`)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/users/${id}/role`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ role: newRole })
            });
            if (res.ok) fetchUsers();
            else alert("Failed to update role");
        } catch (error) {
            alert("Error updating role");
        }
    };

    if (currentUser?.role !== 'SUPER_ADMIN') {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-red-500">
                <ShieldAlert className="w-16 h-16 mb-4 opacity-80" />
                <h2 className="text-xl font-bold">Unauthorized Access</h2>
                <p className="text-sm mt-2 text-red-400">Only Super Admins can manage users.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-100">Admin Users</h1>
                <button 
                    onClick={() => setShowForm(!showForm)}
                    className="btn-primary flex items-center"
                >
                    {showForm ? 'Cancel' : <><UserPlus className="w-4 h-4 mr-2" /> Create User</>}
                </button>
            </div>

            {showForm && (
                <div className="card p-6 border border-brand-500/30 shadow-brand-500/10">
                    <h2 className="text-lg font-medium text-slate-200 mb-4 flex items-center">
                        <UserPlus className="w-5 h-5 mr-2 text-brand-400" />
                        Add New Admin User
                    </h2>
                    <form onSubmit={handleCreate} className="space-y-4 max-w-xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Full Name</label>
                                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="John Doe" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Email Address</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-4 w-4 text-slate-500" />
                                    </div>
                                    <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field pl-9" placeholder="admin@acrovix.com" />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-4 w-4 text-slate-500" />
                                    </div>
                                    <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-field pl-9" placeholder="••••••••" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Role</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Shield className="h-4 w-4 text-slate-500" />
                                    </div>
                                    <select value={role} onChange={e => setRole(e.target.value)} className="input-field pl-9 appearance-none">
                                        <option value="SALES" className="bg-slate-900">Sales</option>
                                        <option value="EDITOR" className="bg-slate-900">Editor</option>
                                        <option value="SUPER_ADMIN" className="bg-slate-900">Super Admin</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="pt-2">
                            <button type="submit" className="btn-primary w-full md:w-auto">
                                Save User
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-700/50">
                        <thead>
                            <tr>
                                <th className="table-header">Name</th>
                                <th className="table-header">Email</th>
                                <th className="table-header">Role</th>
                                <th className="table-header">Status</th>
                                <th className="table-header">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex justify-center mb-4">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                                        </div>
                                        Loading users...
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        No users found.
                                    </td>
                                </tr>
                            ) : (
                                users.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="table-cell font-medium text-slate-200">{u.name}</td>
                                        <td className="table-cell text-slate-400">{u.email}</td>
                                        <td className="table-cell">
                                            <select 
                                                value={u.role} 
                                                onChange={(e) => changeRole(u.id, e.target.value)}
                                                disabled={u.email === currentUser.email}
                                                className="text-xs font-semibold px-2.5 py-1.5 rounded-md border border-slate-700 bg-slate-900 text-slate-200 appearance-none outline-none focus:border-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <option value="SALES" className="bg-slate-800">SALES</option>
                                                <option value="EDITOR" className="bg-slate-800">EDITOR</option>
                                                <option value="SUPER_ADMIN" className="bg-slate-800">SUPER_ADMIN</option>
                                            </select>
                                        </td>
                                        <td className="table-cell">
                                            {u.enabled ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                                                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                                                    <XCircle className="w-3.5 h-3.5 mr-1" /> Disabled
                                                </span>
                                            )}
                                        </td>
                                        <td className="table-cell">
                                            <button 
                                                onClick={() => toggleStatus(u.id, u.enabled)}
                                                disabled={u.email === currentUser.email}
                                                className={`text-sm font-medium transition-colors ${u.enabled ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'} disabled:opacity-30 disabled:cursor-not-allowed`}
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
