import React, { useEffect, useState } from 'react';
import { fetchApi } from '../services/api';
import { History, FileText, AlertCircle, Eye, ExternalLink } from 'lucide-react';

export default function QuotationHistoryModal({ isOpen, onClose, quotation, onViewPdf }) {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && quotation) {
            loadHistory();
        }
    }, [isOpen, quotation]);

    const loadHistory = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchApi(`/quotations/${quotation.id}/versions`);
            // data is a list of summaries
            setHistory(data || []);
        } catch (err) {
            console.error("Failed to fetch history:", err);
            setError(err.message || "Failed to load quotation history.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen || !quotation) return null;

    const normalizeStatus = (rawStatus) => rawStatus ? String(rawStatus).toUpperCase() : 'UNKNOWN';

    const getStatusStyle = (rawStatus) => {
        const status = normalizeStatus(rawStatus);
        switch(status) {
            case 'DRAFT': return 'text-[#71869A] bg-[#F1F5F9]';
            case 'SENT': return 'text-[#2563EB] bg-[#EFF6FF]';
            case 'ACCEPTED': return 'text-[#059669] bg-[#ECFDF5]';
            case 'REJECTED': return 'text-[#DC2626] bg-[#FEF2F2]';
            case 'EXPIRED': return 'text-[#EA580C] bg-[#FFF7ED]';
            case 'REVISED': return 'text-[#6D28D9] bg-[#F5F3FF]'; // New color for REVISED
            default: return 'text-text-secondary bg-bg-muted';
        }
    };

    return (
        <div className="fixed inset-0 bg-text-primary/30 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
            <div className="card w-full max-w-4xl shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                <div className="p-6 md:px-8 md:pt-8 md:pb-6 border-b border-border-subtle flex justify-between items-center bg-bg-card rounded-t-[24px]">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 flex items-center justify-center rounded-[14px] text-indigo-600">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-[20px] font-bold text-text-primary tracking-tight">Revision History</h3>
                            <p className="text-[13px] text-text-secondary mt-0.5">
                                Base Quotation: {quotation.baseQuotationId ? `ID ${quotation.baseQuotationId}` : quotation.quotationNumber}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-hover text-text-secondary transition-colors"
                    >
                        &times;
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-0">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mb-4"></div>
                            <p className="text-[13px] font-medium text-text-muted">Loading history...</p>
                        </div>
                    ) : error ? (
                        <div className="p-8 flex flex-col items-center text-center">
                            <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
                            <p className="text-[14px] font-medium text-red-600 mb-4">{error}</p>
                            <button onClick={loadHistory} className="btn-primary px-4 py-2 text-[12px]">Retry</button>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="py-16 flex flex-col items-center text-center">
                            <FileText className="w-12 h-12 text-text-muted mb-4" />
                            <p className="text-[14px] font-medium text-text-secondary">No history found.</p>
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-border-subtle">
                            <thead className="bg-bg-main sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider">Version</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider">Quotation No</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider">Created</th>
                                    <th className="px-6 py-4 text-right text-[11px] font-bold text-text-muted uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-bg-card divide-y divide-border-subtle">
                                {history.map((ver) => (
                                    <tr key={ver.id} className={`hover:bg-bg-hover transition-colors ${ver.id === quotation.id ? 'bg-brand-primary/5' : ''}`}>
                                        <td className="px-6 py-4 whitespace-nowrap text-[13px] font-bold text-text-primary">
                                            v{ver.version}
                                            {ver.id === quotation.id && <span className="ml-2 inline-flex text-[10px] bg-brand-primary text-white px-1.5 py-0.5 rounded">CURRENT</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-[13px] font-mono text-text-secondary">
                                            {ver.quotationNumber}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(ver.status)}`}>
                                                {normalizeStatus(ver.status)}
                                            </span>
                                            {ver.responseSource && (
                                                <div className="text-[10px] text-text-muted mt-1 font-medium">via {ver.responseSource}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-[13px] font-bold text-text-primary">
                                            ₹{ver.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-[12px] text-text-muted font-medium">
                                            {new Date(ver.createdAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <button
                                                onClick={() => onViewPdf(ver.id)}
                                                className="inline-flex items-center text-brand-primary hover:text-brand-primary/80 text-[12px] font-semibold transition-colors"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                                View PDF
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="p-6 border-t border-border-subtle bg-bg-card rounded-b-[24px] flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-5 py-2.5 bg-bg-main hover:bg-bg-hover border border-border-subtle rounded-xl text-[13px] font-semibold text-text-primary transition-colors shadow-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
