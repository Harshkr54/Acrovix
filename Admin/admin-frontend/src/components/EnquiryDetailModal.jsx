import React, { useEffect, useState } from 'react';
import { fetchApi } from '../services/api';
import { Link } from 'react-router-dom';
import { X, Inbox, User, Mail, Phone, Building2, Briefcase, FileText, Calendar, Plus, ExternalLink, Check, AlertCircle, Loader2 } from 'lucide-react';

export default function EnquiryDetailModal({ isOpen, onClose, enquiry, onStatusUpdate }) {
    const [quotations, setQuotations] = useState([]);
    const [isLoadingQuotations, setIsLoadingQuotations] = useState(false);
    const [statusError, setStatusError] = useState(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    useEffect(() => {
        if (isOpen && enquiry?.id) {
            setIsLoadingQuotations(true);
            fetchApi(`/quotations/enquiry/${enquiry.id}`)
                .then(data => {
                    setQuotations(Array.isArray(data) ? data : []);
                })
                .catch(err => {
                    console.error("Failed to load quotations for enquiry", err);
                    setQuotations([]);
                })
                .finally(() => {
                    setIsLoadingQuotations(false);
                });
        }
    }, [isOpen, enquiry]);

    if (!isOpen || !enquiry) return null;

    const normalizeStatus = (rawStatus) => {
        if (!rawStatus) return 'NEW';
        const upper = String(rawStatus).toUpperCase();
        return ['NEW', 'CONTACTED', 'QUOTED', 'CONVERTED', 'CLOSED'].includes(upper) ? upper : 'UNKNOWN';
    };

    const getStatusLabel = (rawStatus) => {
        const status = normalizeStatus(rawStatus);
        switch (status) {
            case 'NEW': return 'New';
            case 'CONTACTED': return 'Contacted';
            case 'QUOTED': return 'Quoted';
            case 'CONVERTED': return 'Converted';
            case 'CLOSED': return 'Closed';
            default: return 'Unknown';
        }
    };

    const getStatusStyle = (rawStatus) => {
        const status = normalizeStatus(rawStatus);
        switch (status) {
            case 'NEW': return 'bg-[#EEF2FF] text-[#2563EB] border-[#818CF8]/30';
            case 'CONTACTED': return 'bg-[#EEF2FF] text-[#4F46E5] border-[#818CF8]/30';
            case 'QUOTED': return 'bg-[#F5F3FF] text-[#7C3AED] border-[#C4B5FD]/30';
            case 'CONVERTED': return 'bg-[#ECFDF5] text-[#059669] border-[#6EE7B7]/30';
            case 'CLOSED': return 'bg-[#FEF2F2] text-[#DC2626] border-[#FCA5A5]/30';
            default: return 'bg-bg-muted text-text-secondary border-border-subtle';
        }
    };

    const handleUpdateStatus = async (newStatus) => {
        setIsUpdatingStatus(true);
        setStatusError(null);
        try {
            await fetchApi(`/enquiries/${enquiry.id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus })
            });
            window.dispatchEvent(new Event('notification-update'));
            if (onStatusUpdate) onStatusUpdate();
            enquiry.status = newStatus;
        } catch (err) {
            console.error("Failed to update status", err);
            setStatusError(err.message || "Failed to update enquiry status");
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in-50 duration-200">
            <div 
                className="bg-bg-card border border-border-subtle rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="px-6 py-5 border-b border-border-subtle flex items-center justify-between bg-bg-card">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[#EEF2FF] dark:bg-[#312E81]/30 rounded-2xl">
                            <Inbox className="w-5 h-5 text-[#4F46E5]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-text-primary tracking-tight">
                                    Enquiry Details
                                </h2>
                                <span className="text-xs font-mono font-bold text-[#4F46E5] bg-[#EEF2FF] dark:bg-[#312E81]/30 px-2.5 py-0.5 rounded-lg border border-[#818CF8]/30">
                                    {enquiry.referenceId || `ACX-ENQ-${enquiry.id}`}
                                </span>
                            </div>
                            <p className="text-xs text-text-muted mt-0.5">
                                Submitted on {new Date(enquiry.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusStyle(enquiry.status)}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5"></span>
                            {getStatusLabel(enquiry.status)}
                        </span>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-text-muted hover:text-text-primary rounded-xl hover:bg-bg-hover transition-colors"
                            aria-label="Close modal"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {statusError && (
                        <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl flex items-center gap-2 text-xs font-semibold text-[#DC2626]">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{statusError}</span>
                        </div>
                    )}

                    {/* Client & Business Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-bg-muted/40 rounded-2xl border border-border-subtle space-y-3">
                            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-[#4F46E5]" />
                                Client Contact Details
                            </h3>
                            <div className="space-y-2 text-xs">
                                <div>
                                    <span className="text-text-muted font-medium block">Full Name</span>
                                    <span className="font-bold text-text-primary text-sm">{enquiry.fullName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail className="w-3.5 h-3.5 text-text-muted shrink-0" />
                                    <a href={`mailto:${enquiry.businessEmail}`} className="font-semibold text-[#4F46E5] hover:underline truncate">
                                        {enquiry.businessEmail}
                                    </a>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="w-3.5 h-3.5 text-text-muted shrink-0" />
                                    <span className="font-medium text-text-secondary">{enquiry.phoneNumber || '—'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-bg-muted/40 rounded-2xl border border-border-subtle space-y-3">
                            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-[#4F46E5]" />
                                Business & Service Context
                            </h3>
                            <div className="space-y-2 text-xs">
                                <div>
                                    <span className="text-text-muted font-medium block">Company Name</span>
                                    <span className="font-bold text-text-primary">{enquiry.companyName || '—'}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <div>
                                        <span className="text-text-muted font-medium block text-[11px]">Service Required</span>
                                        <span className="font-semibold text-text-primary">{enquiry.serviceRequired || '—'}</span>
                                    </div>
                                    <div>
                                        <span className="text-text-muted font-medium block text-[11px]">Industry Sector</span>
                                        <span className="font-semibold text-text-primary">{enquiry.industrySector || '—'}</span>
                                    </div>
                                </div>
                                {enquiry.preferredContactMethod && (
                                    <div className="pt-1">
                                        <span className="text-text-muted font-medium text-[11px]">Preferred Contact Method: </span>
                                        <span className="font-semibold text-text-primary capitalize">{enquiry.preferredContactMethod}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Project Requirement Description */}
                    <div className="p-4 bg-bg-muted/40 rounded-2xl border border-border-subtle space-y-2">
                        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-[#4F46E5]" />
                            Project Requirement
                        </h3>
                        <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap font-sans bg-bg-card p-3 rounded-xl border border-border-subtle/50">
                            {enquiry.projectRequirement || 'No additional project requirements described.'}
                        </p>
                    </div>

                    {/* Associated Quotation(s) Section */}
                    <div className="p-4 bg-bg-muted/40 rounded-2xl border border-border-subtle space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-[#7C3AED]" />
                                Associated Quotations
                            </h3>
                            {quotations.length > 0 && (
                                <span className="text-[11px] font-bold text-[#7C3AED] bg-[#F5F3FF] px-2 py-0.5 rounded-full border border-[#C4B5FD]/30">
                                    {quotations.length} Active {quotations.length === 1 ? 'Quotation' : 'Quotations'}
                                </span>
                            )}
                        </div>

                        {isLoadingQuotations ? (
                            <div className="flex justify-center items-center py-4 text-text-muted text-xs">
                                <Loader2 className="w-4 h-4 animate-spin text-[#7C3AED] mr-2" />
                                Checking associated quotations...
                            </div>
                        ) : quotations.length > 0 ? (
                            <div className="space-y-2">
                                {quotations.map(q => (
                                    <div key={q.id} className="flex items-center justify-between p-3 bg-bg-card rounded-xl border border-border-subtle text-xs">
                                        <div>
                                            <span className="font-mono font-bold text-text-primary mr-2">{q.quotationNumber}</span>
                                            <span className="text-text-muted font-medium">({q.status})</span>
                                            <div className="text-[11px] font-bold text-[#059669] mt-0.5">
                                                ₹{Number(q.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                        <Link
                                            to={`/quotations/edit/${q.id}`}
                                            onClick={onClose}
                                            className="btn-primary py-1.5 px-3 text-xs flex items-center shadow-sm"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                                            Open Quotation
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-xs text-text-muted flex items-center justify-between p-3 bg-bg-card rounded-xl border border-border-subtle">
                                <span>No quotation created for this enquiry yet.</span>
                                <Link
                                    to={`/quotations/new/${enquiry.id}`}
                                    onClick={onClose}
                                    className="btn-primary py-1.5 px-3 text-xs flex items-center shadow-sm"
                                >
                                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                                    Create Quotation
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Footer / Status Update Controls */}
                <div className="px-6 py-4 border-t border-border-subtle bg-bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text-muted uppercase">Status:</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                            {['NEW', 'CONTACTED', 'QUOTED', 'CONVERTED', 'CLOSED'].map((st) => (
                                <button
                                    key={st}
                                    type="button"
                                    disabled={isUpdatingStatus}
                                    onClick={() => handleUpdateStatus(st)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                                        normalizeStatus(enquiry.status) === st
                                            ? getStatusStyle(st) + ' shadow-sm ring-1 ring-offset-1'
                                            : 'bg-bg-muted/60 hover:bg-bg-hover border-border-subtle text-text-secondary'
                                    }`}
                                >
                                    {getStatusLabel(st)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-bg-muted hover:bg-bg-hover text-text-secondary rounded-xl text-xs font-semibold transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
