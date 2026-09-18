import React, { useState, useEffect } from 'react';
import { createCrmLead, getAdminUsers } from '../services/api';
import { X, Loader2, AlertCircle, Target, User, Building, Mail, Phone, DollarSign, Calendar, FileText } from 'lucide-react';

const LEAD_SOURCE_OPTIONS = [
    { value: 'WEBSITE', label: 'Website' },
    { value: 'REFERRAL', label: 'Referral' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'PHONE', label: 'Phone' },
    { value: 'WHATSAPP', label: 'WhatsApp' },
    { value: 'LINKEDIN', label: 'LinkedIn' },
    { value: 'ADVERTISEMENT', label: 'Advertisement' },
    { value: 'PARTNER', label: 'Partner' },
    { value: 'OTHER', label: 'Other' }
];

const PRIORITY_OPTIONS = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'URGENT', label: 'Urgent' }
];

export default function CreateLeadModal({ isOpen, onClose, onSuccess, initialEnquiry = null }) {
    const [fullName, setFullName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [businessEmail, setBusinessEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [industrySector, setIndustrySector] = useState('');
    const [serviceRequired, setServiceRequired] = useState('');
    const [priority, setPriority] = useState('MEDIUM');
    const [leadSource, setLeadSource] = useState('WEBSITE');
    const [assignedToId, setAssignedToId] = useState('');
    const [currency, setCurrency] = useState('INR');
    const [estimatedValue, setEstimatedValue] = useState('');
    const [expectedClosingDate, setExpectedClosingDate] = useState('');
    const [probability, setProbability] = useState('50');
    const [notes, setNotes] = useState('');

    const [adminUsers, setAdminUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            getAdminUsers()
                .then(users => setAdminUsers(Array.isArray(users) ? users : []))
                .catch(err => console.error("Failed to load sales users", err));

            if (initialEnquiry) {
                setFullName(initialEnquiry.fullName || '');
                setBusinessEmail(initialEnquiry.businessEmail || '');
                setCompanyName(initialEnquiry.companyName || '');
                setPhoneNumber(initialEnquiry.phoneNumber || '');
                setIndustrySector(initialEnquiry.industrySector || '');
                setServiceRequired(initialEnquiry.serviceRequired || '');
                if (initialEnquiry.assignedTo) {
                    setAssignedToId(initialEnquiry.assignedTo.id || '');
                }
            } else {
                setFullName('');
                setCompanyName('');
                setBusinessEmail('');
                setPhoneNumber('');
                setIndustrySector('');
                setServiceRequired('');
                setPriority('MEDIUM');
                setLeadSource('WEBSITE');
                setAssignedToId('');
                setEstimatedValue('');
                setExpectedClosingDate('');
                setProbability('50');
                setNotes('');
            }
            setError(null);
        }
    }, [isOpen, initialEnquiry]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!fullName.trim()) {
            setError('Full Name is required.');
            return;
        }
        if (!businessEmail.trim()) {
            setError('Business Email is required.');
            return;
        }

        setIsLoading(true);
        setError(null);

        const payload = {
            enquiryId: initialEnquiry ? initialEnquiry.id : null,
            fullName: fullName.trim(),
            companyName: companyName.trim() || null,
            businessEmail: businessEmail.trim(),
            phoneNumber: phoneNumber.trim() || null,
            industrySector: industrySector.trim() || null,
            serviceRequired: serviceRequired.trim() || null,
            priority,
            leadSource,
            assignedToId: assignedToId ? Number(assignedToId) : null,
            currency: currency,
            estimatedValue: estimatedValue ? Number(estimatedValue) : null,
            expectedClosingDate: expectedClosingDate || null,
            probability: probability ? Number(probability) : 50,
            notes: notes.trim() || null
        };

        try {
            const newLead = await createCrmLead(payload);
            setIsLoading(false);
            if (onSuccess) onSuccess(newLead);
            onClose();
        } catch (err) {
            console.error("Failed to create lead", err);
            setError(err.message || 'Failed to create lead.');
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-text-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-bg-card border border-border-subtle rounded-2xl shadow-xl w-full max-w-2xl my-8 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-main">
                    <div className="flex items-center gap-2.5">
                        <Target className="w-5 h-5 text-brand-teal" />
                        <h2 className="text-lg font-bold text-text-primary">
                            {initialEnquiry ? `Convert Enquiry #${initialEnquiry.referenceId || initialEnquiry.id} to Lead` : 'Create New CRM Lead'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="btn btn-primary btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto hide-scrollbar">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-medium rounded-xl flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase text-text-muted mb-1">Full Name *</label>
                            <div className="relative">
                                <User className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Contact Person Name"
                                    className="w-full pl-9 pr-3 py-2 text-sm bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-text-muted mb-1">Company Name</label>
                            <div className="relative">
                                <Building className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    placeholder="Company / Organization"
                                    className="w-full pl-9 pr-3 py-2 text-sm bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-text-muted mb-1">Business Email *</label>
                            <div className="relative">
                                <Mail className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="email"
                                    required
                                    value={businessEmail}
                                    onChange={(e) => setBusinessEmail(e.target.value)}
                                    placeholder="client@company.com"
                                    className="w-full pl-9 pr-3 py-2 text-sm bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-text-muted mb-1">Phone Number</label>
                            <div className="relative">
                                <Phone className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="+91 9876543210"
                                    className="w-full pl-9 pr-3 py-2 text-sm bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-text-muted mb-1">Industry Sector</label>
                            <input
                                type="text"
                                value={industrySector}
                                onChange={(e) => setIndustrySector(e.target.value)}
                                placeholder="e.g. Manufacturing, IT, Healthcare"
                                className="w-full px-3 py-2 text-sm bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-text-muted mb-1">Service Required</label>
                            <input
                                type="text"
                                value={serviceRequired}
                                onChange={(e) => setServiceRequired(e.target.value)}
                                placeholder="e.g. ERP Development, Cloud Hosting"
                                className="w-full px-3 py-2 text-sm bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-text-muted mb-1">Lead Source</label>
                            <select
                                value={leadSource}
                                onChange={(e) => setLeadSource(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                            >
                                {LEAD_SOURCE_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-text-muted mb-1">Priority</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                            >
                                {PRIORITY_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-text-muted mb-1">Currency</label>
                            <select
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                            >
                                <option value="INR">INR (₹)</option>
                                <option value="USD">USD ($)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-text-muted mb-1">Estimated Value ({currency === 'USD' ? '$' : '₹'})</label>
                            <div className="relative">
                                <DollarSign className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={estimatedValue}
                                    onChange={(e) => setEstimatedValue(e.target.value)}
                                    placeholder="250000"
                                    className="w-full pl-9 pr-3 py-2 text-sm bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-text-muted mb-1">Expected Closing Date</label>
                            <div className="relative">
                                <Calendar className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="date"
                                    value={expectedClosingDate}
                                    onChange={(e) => setExpectedClosingDate(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-sm bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-text-muted mb-1">Deal Win Probability (%)</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={probability}
                                onChange={(e) => setProbability(e.target.value)}
                                placeholder="50"
                                className="w-full px-3 py-2 text-sm bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-text-muted mb-1">Assign Sales Rep</label>
                            <select
                                value={assignedToId}
                                onChange={(e) => setAssignedToId(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                            >
                                <option value="">-- Unassigned --</option>
                                {adminUsers.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase text-text-muted mb-1">Lead Notes & Requirements</label>
                        <textarea
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add client requirements, background context, or meeting notes..."
                            className="w-full px-3 py-2 text-sm bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-primary btn-md"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn btn-primary btn-md"
                        >
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Create Lead
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
