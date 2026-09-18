import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCustomer360 } from '../services/api';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';
import StatusBadge from '../components/ui/StatusBadge';
import {
    ArrowLeft, Building, Mail, Phone, MapPin, 
    Calendar, DollarSign, FileText, CheckCircle, 
    CreditCard, MessageSquare, Activity as ActivityIcon, 
    List, AlertCircle, Inbox, Briefcase, Clock, 
    ArrowUpRight, PieChart, Tag, Receipt, Eye, UsersRound, Search, Filter, X
} from 'lucide-react';

export default function Customer360() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [activeTab, setActiveTab] = useState('Overview');

    // Email tab states
    const [emailSearch, setEmailSearch] = useState('');
    const [emailStatusFilter, setEmailStatusFilter] = useState('ALL');
    const [emailTypeFilter, setEmailTypeFilter] = useState('ALL');
    const [selectedEmail, setSelectedEmail] = useState(null);

    const formatEmailType = (str) => {
        if (!str) return 'Unknown';
        return str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    };

    // Filter emails
    const getFilteredEmails = () => {
        if (!data?.emails) return [];
        let filtered = data.emails;
        if (emailStatusFilter !== 'ALL') {
            filtered = filtered.filter(e => e.status === emailStatusFilter);
        }
        if (emailTypeFilter !== 'ALL') {
            filtered = filtered.filter(e => e.emailType === emailTypeFilter);
        }
        if (emailSearch) {
            const searchLower = emailSearch.toLowerCase();
            filtered = filtered.filter(e => 
                (e.subject && e.subject.toLowerCase().includes(searchLower)) ||
                (e.recipient && e.recipient.toLowerCase().includes(searchLower)) ||
                (e.emailType && e.emailType.toLowerCase().includes(searchLower))
            );
        }
        return filtered;
    };

    useEffect(() => {
        const fetch360 = async () => {
            try {
                setLoading(true);
                const response = await getCustomer360(id);
                // Based on standard axios/fetch patterns in this app, response is usually the actual data
                // If the app wraps it, it would be handled in api.js.
                setData(response);
            } catch (err) {
                if (err.status === 404) {
                    setError('NOT_FOUND');
                } else {
                    setError(err.message || 'Unable to load customer details.');
                }
            } finally {
                setLoading(false);
            }
        };

        if (id) fetch360();
    }, [id]);

    if (loading) {
        return (
            <div className="max-w-[1600px] mx-auto p-4 space-y-6">
                <div className="flex items-center space-x-4 mb-8">
                    <div className="w-10 h-10 bg-gray-200 animate-pulse rounded-full"></div>
                    <div className="h-8 w-64 bg-gray-200 animate-pulse rounded"></div>
                </div>
                <div className="h-32 bg-gray-200 animate-pulse rounded-2xl w-full"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-200 animate-pulse rounded-2xl w-full"></div>)}
                </div>
                <div className="h-64 bg-gray-200 animate-pulse rounded-2xl w-full mt-6"></div>
            </div>
        );
    }

    if (error === 'NOT_FOUND') {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh]">
                <div className="acx-card p-10 text-center max-w-md w-full">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <UsersRound className="w-10 h-10 text-gray-400" />
                    </div>
                    <h2 className="text-[22px] font-bold text-text-primary mb-2">Customer Not Found</h2>
                    <p className="text-[14px] text-text-secondary mb-8">The customer you are looking for does not exist or has been removed.</p>
                    <button onClick={() => navigate('/customers')} className="acx-btn-primary px-6 py-2.5">
                        Back to Customers
                    </button>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh]">
                <div className="acx-card p-10 text-center max-w-md w-full border-t-4 border-[#DC2626]">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-8 h-8 text-[#DC2626]" />
                    </div>
                    <h2 className="text-[20px] font-bold text-text-primary mb-2">Unable to load customer</h2>
                    <p className="text-[13px] text-text-secondary mb-6">{error}</p>
                    <div className="flex space-x-4 justify-center">
                        <button onClick={() => navigate('/customers')} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200">
                            Back
                        </button>
                        <button onClick={() => window.location.reload()} className="acx-btn-primary px-4 py-2 text-sm">
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!data || !data.customer) return null;

    const { customer, summaryByCurrency, enquiries, leads, followUps, quotations, invoices, payments, emails, activities } = data;

    const TABS = [
        { id: 'Overview', label: 'Overview', icon: PieChart },
        { id: 'Enquiries', label: 'Enquiries', icon: Inbox, count: enquiries?.length || 0 },
        { id: 'CRM', label: 'CRM', icon: Briefcase, count: leads?.length || 0 },
        { id: 'Quotations', label: 'Quotations', icon: FileText, count: quotations?.length || 0 },
        { id: 'Invoices', label: 'Invoices', icon: Receipt, count: invoices?.length || 0 },
        { id: 'Payments', label: 'Payments', icon: CreditCard, count: payments?.length || 0 },
        { id: 'Emails', label: 'Emails', icon: Mail, count: emails?.length || 0 },
        { id: 'Activity', label: 'Activity', icon: ActivityIcon, count: activities?.length || 0 },
    ];

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
            {/* Navigation Header */}
            <div className="flex items-center justify-between">
                <button 
                    onClick={() => navigate('/customers')}
                    className="inline-flex items-center text-[13px] font-semibold text-text-secondary hover:text-brand-teal transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Customers
                </button>
                {/* Note: Edit feature uses modal on CustomerMaster, so we redirect to CustomerMaster to edit, or we just leave it. The prompt said "preserve existing edit action". We can just link back. */}
            </div>

            {/* Customer Header Card */}
            <div className="acx-card p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-[24px] font-bold text-text-primary tracking-tight">{customer.name}</h1>
                        {customer.active ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#059669]/10 text-brand-success">
                                Active
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-100 text-red-700">
                                Inactive
                            </span>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] text-text-secondary font-medium">
                        {customer.companyName && (
                            <div className="flex items-center"><Building className="w-4 h-4 mr-2 text-text-muted"/> {customer.companyName}</div>
                        )}
                        <div className="flex items-center"><Mail className="w-4 h-4 mr-2 text-text-muted"/> {customer.email}</div>
                        {customer.phone && (
                            <div className="flex items-center"><Phone className="w-4 h-4 mr-2 text-text-muted"/> {customer.phone}</div>
                        )}
                        <div className="flex items-center"><Tag className="w-4 h-4 mr-2 text-text-muted"/> Default: {customer.currency}</div>
                    </div>
                </div>
                <div className="text-right flex-shrink-0">
                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">Customer Code</p>
                    <p className="text-[18px] font-bold text-text-primary tracking-tight">{customer.customerCode}</p>
                    <p className="text-[11px] text-text-secondary mt-1">Since {formatDate(customer.createdAt)}</p>
                </div>
            </div>

            {/* Business Summary Cards */}
            {summaryByCurrency && Object.keys(summaryByCurrency).map(curr => {
                const summary = summaryByCurrency[curr];
                return (
                    <div key={curr} className="mb-6">
                        <h3 className="text-[14px] font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center">
                            <DollarSign className="w-4 h-4 mr-1.5 text-brand-teal" /> 
                            {curr} Business Summary
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="acx-card p-5 relative overflow-hidden group hover:border-brand-teal/30 transition-colors">
                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <p className="text-[12px] font-bold text-text-muted uppercase tracking-wider mb-1">Total Business</p>
                                        <h3 className="text-[22px] font-bold text-text-primary">{formatCurrency(summary.totalInvoiced, curr)}</h3>
                                    </div>
                                    <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center">
                                        <Briefcase className="w-5 h-5 text-brand-primary" />
                                    </div>
                                </div>
                            </div>
                            <div className="acx-card p-5 relative overflow-hidden group hover:border-brand-success/30 transition-colors">
                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <p className="text-[12px] font-bold text-text-muted uppercase tracking-wider mb-1">Total Received</p>
                                        <h3 className="text-[22px] font-bold text-text-primary">{formatCurrency(summary.totalReceived, curr)}</h3>
                                    </div>
                                    <div className="w-10 h-10 bg-brand-success/10 rounded-xl flex items-center justify-center">
                                        <CheckCircle className="w-5 h-5 text-brand-success" />
                                    </div>
                                </div>
                            </div>
                            <div className="acx-card p-5 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <p className="text-[12px] font-bold text-text-muted uppercase tracking-wider mb-1">Outstanding</p>
                                        <h3 className="text-[22px] font-bold text-text-primary">{formatCurrency(summary.outstandingAmount, curr)}</h3>
                                    </div>
                                    <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-amber-500" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Tabs */}
            <div className="overflow-x-auto hide-scrollbar">
                <div className="flex space-x-1 border-b border-border-subtle min-w-max pb-px">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center px-4 py-3 text-[13px] font-bold tracking-wide transition-all border-b-2 whitespace-nowrap ${
                                    isActive 
                                    ? 'border-brand-teal text-brand-teal bg-brand-teal/5' 
                                    : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                                }`}
                            >
                                <Icon className={`w-4 h-4 mr-2 ${isActive ? 'text-brand-teal' : 'text-text-muted'}`} />
                                {tab.label}
                                {tab.count > 0 && tab.id !== 'Overview' && (
                                    <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] ${isActive ? 'bg-brand-teal text-white' : 'bg-bg-main text-text-muted'}`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                
                {/* OVERVIEW TAB */}
                {activeTab === 'Overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Recent Quotations Mini */}
                        <div className="acx-card flex flex-col">
                            <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-bg-card/50">
                                <h3 className="text-[13px] font-bold text-text-primary uppercase tracking-wider flex items-center">
                                    <FileText className="w-4 h-4 mr-2 text-brand-teal"/> Recent Quotations
                                </h3>
                                <button onClick={() => setActiveTab('Quotations')} className="text-[12px] text-brand-teal font-semibold hover:underline">View All</button>
                            </div>
                            <div className="p-0">
                                {quotations?.length > 0 ? (
                                    <div className="divide-y divide-border-subtle">
                                        {quotations.slice(0, 3).map(q => (
                                            <div key={q.id} className="p-4 hover:bg-bg-hover transition-colors flex justify-between items-center cursor-pointer" onClick={() => navigate('/quotations')}>
                                                <div>
                                                    <p className="text-[13px] font-bold text-text-primary">{q.quotationNumber}</p>
                                                    <p className="text-[11px] text-text-secondary mt-1">{formatDate(q.createdAt)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[13px] font-bold text-text-primary">{formatCurrency(q.grandTotal, q.currency)}</p>
                                                    <StatusBadge status={q.status} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 text-center text-text-muted text-[13px]">No recent quotations.</div>
                                )}
                            </div>
                        </div>

                        {/* Recent Invoices Mini */}
                        <div className="acx-card flex flex-col">
                            <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-bg-card/50">
                                <h3 className="text-[13px] font-bold text-text-primary uppercase tracking-wider flex items-center">
                                    <Receipt className="w-4 h-4 mr-2 text-brand-teal"/> Recent Invoices
                                </h3>
                                <button onClick={() => setActiveTab('Invoices')} className="text-[12px] text-brand-teal font-semibold hover:underline">View All</button>
                            </div>
                            <div className="p-0">
                                {invoices?.length > 0 ? (
                                    <div className="divide-y divide-border-subtle">
                                        {invoices.slice(0, 3).map(inv => (
                                            <div key={inv.id} className="p-4 hover:bg-bg-hover transition-colors flex justify-between items-center cursor-pointer" onClick={() => navigate(`/invoices/${inv.id}`)}>
                                                <div>
                                                    <p className="text-[13px] font-bold text-text-primary">{inv.invoiceNumber || 'Draft'}</p>
                                                    <p className="text-[11px] text-text-secondary mt-1">{formatDate(inv.createdAt)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[13px] font-bold text-text-primary">{formatCurrency(inv.grandTotal, inv.currency)}</p>
                                                    <StatusBadge status={inv.status} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 text-center text-text-muted text-[13px]">No recent invoices.</div>
                                )}
                            </div>
                        </div>

                        {/* Recent Activity Mini */}
                        <div className="acx-card flex flex-col">
                            <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-bg-card/50">
                                <h3 className="text-[13px] font-bold text-text-primary uppercase tracking-wider flex items-center">
                                    <ActivityIcon className="w-4 h-4 mr-2 text-brand-teal"/> Recent Activity
                                </h3>
                                <button onClick={() => setActiveTab('Activity')} className="text-[12px] text-brand-teal font-semibold hover:underline">View All</button>
                            </div>
                            <div className="p-6">
                                {activities?.length > 0 ? (
                                    <div className="space-y-4">
                                        {activities.slice(0, 4).map(act => (
                                            <div key={act.id} className="flex gap-4">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-2 h-2 rounded-full bg-brand-teal mt-1.5"></div>
                                                    <div className="w-px h-full bg-border-subtle mt-2"></div>
                                                </div>
                                                <div className="pb-4">
                                                    <p className="text-[13px] font-medium text-text-primary">{act.activity}</p>
                                                    <p className="text-[11px] text-text-secondary mt-1">{formatDateTime(act.timestamp)} • {act.adminName}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-text-muted text-[13px]">No recent activity.</div>
                                )}
                            </div>
                        </div>

                        {/* Recent Emails Mini */}
                        <div className="acx-card flex flex-col">
                            <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-bg-card/50">
                                <h3 className="text-[13px] font-bold text-text-primary uppercase tracking-wider flex items-center">
                                    <Mail className="w-4 h-4 mr-2 text-brand-teal"/> Recent Emails
                                </h3>
                                <button onClick={() => setActiveTab('Emails')} className="text-[12px] text-brand-teal font-semibold hover:underline">View All</button>
                            </div>
                            <div className="p-6">
                                {emails?.length > 0 ? (
                                    <div className="space-y-4">
                                        {emails.slice(0, 4).map(email => (
                                            <div key={email.id} className="flex gap-4">
                                                <div className="flex flex-col items-center">
                                                    <div className={`w-2 h-2 rounded-full mt-1.5 ${email.status === 'SENT' ? 'bg-brand-success' : 'bg-brand-danger'}`}></div>
                                                    <div className="w-px h-full bg-border-subtle mt-2"></div>
                                                </div>
                                                <div className="pb-4">
                                                    <p className="text-[13px] font-medium text-text-primary">{formatEmailType(email.emailType)}</p>
                                                    <p className="text-[11px] text-text-secondary mt-1">{formatDate(email.sentAt)} • Sent to {email.recipient}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-text-muted text-[13px]">No recent emails.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ENQUIRIES TAB */}
                {activeTab === 'Enquiries' && (
                    <div className="acx-card">
                        <div className="acx-table-container">
                            <table className="acx-table">
                                <thead>
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card rounded-tl-[24px]">Enquiry #</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Subject</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Source</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Status</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card rounded-tr-[24px]">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-bg-card divide-y divide-border-subtle/40 rounded-b-[24px]">
                                    {!enquiries || enquiries.length === 0 ? (
                                        <tr><td colSpan="5" className="px-6 py-12 text-center text-text-muted text-[13px]">No enquiries found.</td></tr>
                                    ) : (
                                        enquiries.map(e => (
                                            <tr key={e.id} className="hover:bg-bg-hover transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-[13px] font-bold text-text-primary">{e.enquiryNumber}</td>
                                                <td className="px-6 py-4 text-[13px] text-text-primary max-w-[300px] truncate">{e.subject}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-[12px] text-text-secondary uppercase">{e.source}</td>
                                                <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={e.status} /></td>
                                                <td className="px-6 py-4 whitespace-nowrap text-[13px] text-text-secondary">{formatDate(e.createdAt)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* CRM TAB */}
                {activeTab === 'CRM' && (
                    <div className="space-y-6">
                        <div className="acx-card">
                            <div className="p-4 border-b border-border-subtle bg-bg-card/50">
                                <h3 className="text-[13px] font-bold text-text-primary uppercase tracking-wider">CRM Leads</h3>
                            </div>
                            <div className="acx-table-container">
                                <table className="acx-table">
                                    <thead>
                                        <tr>
                                            <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Lead #</th>
                                            <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Status / Stage</th>
                                            <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Est. Value</th>
                                            <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Owner</th>
                                            <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Created Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-bg-card divide-y divide-border-subtle/40 rounded-b-[24px]">
                                        {!leads || leads.length === 0 ? (
                                            <tr><td colSpan="5" className="px-6 py-12 text-center text-text-muted text-[13px]">No CRM leads found.</td></tr>
                                        ) : (
                                            leads.map(lead => (
                                                <tr key={lead.id} className="hover:bg-bg-hover transition-colors cursor-pointer" onClick={() => navigate(`/crm/leads/${lead.id}`)}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-[13px] font-bold text-text-primary">L-{lead.id}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <StatusBadge status={lead.status} />
                                                        <div className="text-[11px] text-text-secondary mt-1">{lead.stage}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-[13px] font-medium text-text-primary">
                                                        {formatCurrency(lead.estimatedValue, lead.currency)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-[13px] text-text-secondary">{lead.assigneeName || 'Unassigned'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-[13px] text-text-secondary">{formatDate(lead.createdAt)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Follow-ups inline in CRM tab as requested if it makes sense */}
                        <div className="acx-card">
                            <div className="p-4 border-b border-border-subtle bg-bg-card/50">
                                <h3 className="text-[13px] font-bold text-text-primary uppercase tracking-wider">Follow-ups</h3>
                            </div>
                            <div className="acx-table-container">
                                <table className="acx-table">
                                    <thead>
                                        <tr>
                                            <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Type</th>
                                            <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Status</th>
                                            <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Scheduled Date</th>
                                            <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-bg-card divide-y divide-border-subtle/40 rounded-b-[24px]">
                                        {!followUps || followUps.length === 0 ? (
                                            <tr><td colSpan="4" className="px-6 py-12 text-center text-text-muted text-[13px]">No follow-ups found.</td></tr>
                                        ) : (
                                            followUps.map(f => (
                                                <tr key={f.id} className="hover:bg-bg-hover transition-colors cursor-pointer" onClick={() => navigate(`/crm/leads/${f.leadId}`)}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-[13px] font-bold text-text-primary">{f.type}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={f.status} /></td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-[13px] text-text-secondary">{formatDateTime(f.scheduledDate)}</td>
                                                    <td className="px-6 py-4 text-[13px] text-text-secondary max-w-[250px] truncate">{f.notes || '-'}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* QUOTATIONS TAB */}
                {activeTab === 'Quotations' && (
                    <div className="acx-card">
                        <div className="acx-table-container">
                            <table className="acx-table">
                                <thead>
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card rounded-tl-[24px]">Quotation #</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Status</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Grand Total</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Valid Until</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card rounded-tr-[24px]">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-bg-card divide-y divide-border-subtle/40 rounded-b-[24px]">
                                    {!quotations || quotations.length === 0 ? (
                                        <tr><td colSpan="5" className="px-6 py-12 text-center text-text-muted text-[13px]">No quotations found.</td></tr>
                                    ) : (
                                        quotations.map(q => (
                                            <tr key={q.id} className="hover:bg-bg-hover transition-colors cursor-pointer" onClick={() => navigate('/quotations')}>
                                                <td className="px-6 py-4 whitespace-nowrap text-[13px] font-bold text-text-primary">
                                                    {q.quotationNumber}
                                                    {q.version > 1 && <span className="ml-2 text-[10px] bg-gray-200 px-1.5 rounded text-gray-700">v{q.version}</span>}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={q.status} /></td>
                                                <td className="px-6 py-4 whitespace-nowrap text-[13px] font-bold text-text-primary">{formatCurrency(q.grandTotal, q.currency)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-[13px] text-text-secondary">{formatDate(q.validUntil)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-[13px] text-text-secondary">{formatDate(q.createdAt)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* INVOICES TAB */}
                {activeTab === 'Invoices' && (
                    <div className="acx-card">
                        <div className="acx-table-container">
                            <table className="acx-table">
                                <thead>
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card rounded-tl-[24px]">Invoice #</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Status</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Grand Total</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Paid</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Balance</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card rounded-tr-[24px]">Due Date</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-bg-card divide-y divide-border-subtle/40 rounded-b-[24px]">
                                    {!invoices || invoices.length === 0 ? (
                                        <tr><td colSpan="6" className="px-6 py-12 text-center text-text-muted text-[13px]">No invoices found.</td></tr>
                                    ) : (
                                        invoices.map(inv => (
                                            <tr key={inv.id} className="hover:bg-bg-hover transition-colors cursor-pointer" onClick={() => navigate(`/invoices/${inv.id}`)}>
                                                <td className="px-6 py-4 whitespace-nowrap text-[13px] font-bold text-text-primary">{inv.invoiceNumber || 'Draft'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={inv.status} /></td>
                                                <td className="px-6 py-4 whitespace-nowrap text-[13px] font-medium text-text-primary">{formatCurrency(inv.grandTotal, inv.currency)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-[13px] text-brand-success">{formatCurrency(inv.amountPaid, inv.currency)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-[13px] font-bold text-amber-600">{formatCurrency(inv.balanceDue, inv.currency)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-[13px] text-text-secondary">{formatDate(inv.dueDate)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* PAYMENTS TAB */}
                {activeTab === 'Payments' && (
                    <div className="acx-card">
                        <div className="acx-table-container">
                            <table className="acx-table">
                                <thead>
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card rounded-tl-[24px]">Reference</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Status</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Invoice</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Amount</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Mode</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card rounded-tr-[24px]">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-bg-card divide-y divide-border-subtle/40 rounded-b-[24px]">
                                    {!payments || payments.length === 0 ? (
                                        <tr><td colSpan="6" className="px-6 py-12 text-center text-text-muted text-[13px]">No payments found.</td></tr>
                                    ) : (
                                        payments.map(pay => (
                                            <tr key={pay.id} className="hover:bg-bg-hover transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-[13px] font-bold text-text-primary">{pay.paymentReference}</td>
                                                <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={pay.status} /></td>
                                                <td className="px-6 py-4 whitespace-nowrap text-[13px] text-brand-teal hover:underline cursor-pointer" onClick={() => pay.invoiceId && navigate(`/invoices/${pay.invoiceId}`)}>
                                                    {pay.invoiceNumber || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-[13px] font-bold text-brand-success">{formatCurrency(pay.amount, pay.currency)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-[13px] text-text-secondary">{pay.paymentMode}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-[13px] text-text-secondary">{formatDate(pay.paymentDate)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* EMAILS TAB */}
                {activeTab === 'Emails' && (() => {
                    const filteredEmails = getFilteredEmails();
                    const totalEmails = emails?.length || 0;
                    const sentEmails = emails?.filter(e => e.status === 'SENT').length || 0;
                    const failedEmails = emails?.filter(e => e.status === 'FAILED').length || 0;

                    return (
                        <div className="space-y-6">
                            {/* Email Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="acx-card p-4 flex items-center justify-between border-l-4 border-brand-teal">
                                    <div>
                                        <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">Total Emails</p>
                                        <h3 className="text-[20px] font-bold text-text-primary">{totalEmails}</h3>
                                    </div>
                                    <div className="w-10 h-10 bg-brand-teal/10 rounded-xl flex items-center justify-center">
                                        <Mail className="w-5 h-5 text-brand-teal" />
                                    </div>
                                </div>
                                <div className="acx-card p-4 flex items-center justify-between border-l-4 border-[#059669]">
                                    <div>
                                        <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">Sent</p>
                                        <h3 className="text-[20px] font-bold text-text-primary">{sentEmails}</h3>
                                    </div>
                                    <div className="w-10 h-10 bg-[#059669]/10 rounded-xl flex items-center justify-center">
                                        <CheckCircle className="w-5 h-5 text-[#059669]" />
                                    </div>
                                </div>
                                <div className="acx-card p-4 flex items-center justify-between border-l-4 border-[#DC2626]">
                                    <div>
                                        <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">Failed</p>
                                        <h3 className="text-[20px] font-bold text-text-primary">{failedEmails}</h3>
                                    </div>
                                    <div className="w-10 h-10 bg-[#DC2626]/10 rounded-xl flex items-center justify-center">
                                        <AlertCircle className="w-5 h-5 text-[#DC2626]" />
                                    </div>
                                </div>
                            </div>

                            {/* Email Filters */}
                            <div className="acx-card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                                <div className="relative w-full md:w-[300px]">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-4 w-4 text-text-muted" />
                                    </div>
                                    <input 
                                        type="text" 
                                        value={emailSearch}
                                        onChange={(e) => setEmailSearch(e.target.value)}
                                        className="acx-input pl-9 w-full bg-bg-main" 
                                        placeholder="Search subject, recipient..." 
                                    />
                                </div>
                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <div className="flex items-center text-[12px] font-semibold text-text-secondary">
                                        <Filter className="w-4 h-4 mr-1.5" />
                                        <select 
                                            value={emailStatusFilter} 
                                            onChange={(e) => setEmailStatusFilter(e.target.value)}
                                            className="bg-transparent border-none focus:ring-0 cursor-pointer"
                                        >
                                            <option value="ALL">All Status</option>
                                            <option value="SENT">Sent</option>
                                            <option value="FAILED">Failed</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center text-[12px] font-semibold text-text-secondary">
                                        <select 
                                            value={emailTypeFilter} 
                                            onChange={(e) => setEmailTypeFilter(e.target.value)}
                                            className="bg-transparent border-none focus:ring-0 cursor-pointer"
                                        >
                                            <option value="ALL">All Types</option>
                                            {[...new Set(emails?.map(e => e.emailType).filter(Boolean))].map(type => (
                                                <option key={type} value={type}>{formatEmailType(type)}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="acx-card">
                                <div className="acx-table-container">
                                    <table className="acx-table">
                                        <thead>
                                            <tr>
                                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card rounded-tl-[24px]">Date</th>
                                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Subject</th>
                                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Recipient</th>
                                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Type</th>
                                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Related To</th>
                                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Status</th>
                                                <th className="px-6 py-4 text-right text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card rounded-tr-[24px]">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-bg-card divide-y divide-border-subtle/40 rounded-b-[24px]">
                                            {filteredEmails.length === 0 ? (
                                                <tr><td colSpan="7" className="px-6 py-12 text-center text-text-muted text-[13px]">No communication history found matching your filters.</td></tr>
                                            ) : (
                                                filteredEmails.map(email => (
                                                    <tr key={email.id} className="hover:bg-bg-hover transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap text-[13px] text-text-secondary">{formatDate(email.sentAt)}</td>
                                                        <td className="px-6 py-4 text-[13px] font-bold text-text-primary max-w-[250px] truncate">{email.subject}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-[13px] text-text-secondary">{email.recipient}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-[12px] text-text-muted font-medium">{formatEmailType(email.emailType)}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-[13px]">
                                                            {email.relatedEntityType && email.relatedEntityId ? (
                                                                <span className="text-text-secondary font-medium">
                                                                    {formatEmailType(email.relatedEntityType)} #{email.relatedEntityId}
                                                                </span>
                                                            ) : (
                                                                <span className="text-text-muted">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            {email.status === 'SENT' ? (
                                                                <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#059669]/10 text-brand-success">SENT</span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#DC2626]/10 text-brand-danger">FAILED</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                                            <button 
                                                                onClick={() => setSelectedEmail(email)}
                                                                className="text-brand-teal hover:text-brand-teal/80 text-[12px] font-semibold"
                                                            >
                                                                View
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
                })()}

                {/* ACTIVITY TAB */}
                {activeTab === 'Activity' && (
                    <div className="acx-card p-6 md:p-8">
                        {!activities || activities.length === 0 ? (
                            <div className="text-center text-text-muted text-[13px] py-12">No activity found.</div>
                        ) : (
                            <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-border-subtle">
                                {activities.map((act) => (
                                    <div key={act.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-bg-main bg-brand-teal text-white shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                            <ActivityIcon className="w-4 h-4" />
                                        </div>
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] acx-card p-4 rounded-xl shadow-sm border border-border-subtle/50">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="text-[14px] font-bold text-text-primary">{act.activity}</div>
                                                <time className="text-[11px] font-medium text-text-muted">{formatDateTime(act.timestamp)}</time>
                                            </div>
                                            <div className="text-[13px] text-text-secondary mt-2">
                                                <span className="font-semibold text-text-primary">{act.adminName}</span> on {act.entityType} {act.entityId && `#${act.entityId}`}
                                                {act.description && <p className="mt-1 text-text-muted text-[12px]">{act.description}</p>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* EMAIL DETAIL MODAL */}
            {selectedEmail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-bg-card w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-main/50">
                            <h2 className="text-[16px] font-bold text-text-primary flex items-center">
                                <Mail className="w-5 h-5 mr-2 text-brand-teal" />
                                Email Details
                            </h2>
                            <button onClick={() => setSelectedEmail(null)} className="text-text-muted hover:text-text-primary transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6">
                            {selectedEmail.status === 'FAILED' && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-[13px] font-bold text-red-800">Delivery Failed</h4>
                                        <p className="text-[13px] text-red-700 mt-1">{selectedEmail.errorMessage || 'Unknown error occurred.'}</p>
                                    </div>
                                </div>
                            )}
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">Date</p>
                                    <p className="text-[13px] font-bold text-text-primary">{formatDateTime(selectedEmail.sentAt)}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">Status</p>
                                    {selectedEmail.status === 'SENT' ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#059669]/10 text-brand-success">SENT</span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#DC2626]/10 text-brand-danger">FAILED</span>
                                    )}
                                </div>
                                <div className="md:col-span-2">
                                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">Subject</p>
                                    <p className="text-[14px] font-bold text-text-primary">{selectedEmail.subject}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">Recipient</p>
                                    <p className="text-[13px] font-medium text-text-secondary">{selectedEmail.recipient}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">Email Type</p>
                                    <p className="text-[13px] font-medium text-text-secondary">{formatEmailType(selectedEmail.emailType)}</p>
                                </div>
                                {selectedEmail.relatedEntityType && selectedEmail.relatedEntityId && (
                                    <div className="md:col-span-2">
                                        <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">Related Entity</p>
                                        {/* Link navigation based on entity type */}
                                        {selectedEmail.relatedEntityType.toUpperCase() === 'INVOICE' ? (
                                            <button onClick={() => navigate(`/invoices/${selectedEmail.relatedEntityId}`)} className="text-[13px] font-bold text-brand-teal hover:underline flex items-center">
                                                Invoice #{selectedEmail.relatedEntityId} <ArrowUpRight className="w-3 h-3 ml-1" />
                                            </button>
                                        ) : selectedEmail.relatedEntityType.toUpperCase() === 'CRM_LEAD' ? (
                                            <button onClick={() => navigate(`/crm/leads/${selectedEmail.relatedEntityId}`)} className="text-[13px] font-bold text-brand-teal hover:underline flex items-center">
                                                CRM Lead #{selectedEmail.relatedEntityId} <ArrowUpRight className="w-3 h-3 ml-1" />
                                            </button>
                                        ) : (
                                            <span className="text-[13px] font-medium text-text-secondary bg-bg-main px-3 py-1.5 rounded-lg border border-border-subtle inline-block">
                                                {formatEmailType(selectedEmail.relatedEntityType)} #{selectedEmail.relatedEntityId}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-border-subtle bg-bg-main/50 flex justify-end">
                            <button onClick={() => setSelectedEmail(null)} className="px-4 py-2 bg-white border border-border-subtle rounded-xl text-[13px] font-semibold text-text-primary hover:bg-gray-50 transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
