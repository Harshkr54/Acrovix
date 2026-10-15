import React, { useEffect, useState } from 'react';
import { fetchApi } from '../services/api';
import { History, FileText, AlertCircle, Eye, ExternalLink } from 'lucide-react';
import Modal from './ui/Modal';

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
            case 'SENT': return 'text-brand-primary bg-brand-primary/10';
            case 'ACCEPTED': return 'text-brand-success bg-brand-success/10';
            case 'REJECTED': return 'text-brand-danger bg-brand-danger/10';
            case 'EXPIRED': return 'text-[#EA580C] bg-[#FFF7ED]';
            case 'REVISED': return 'text-[#6D28D9] bg-purple-50'; // New color for REVISED
            default: return 'text-text-secondary bg-bg-muted';
        }
    };

    const modalFooter = (
        <button 
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-md"
        >
            Close
        </button>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Revision History"
            subtitle={`Base Quotation: ${quotation.baseQuotationId ? `ID ${quotation.baseQuotationId}` : quotation.quotationNumber}`}
            icon={History}
            iconClassName="bg-indigo-500/10 border-indigo-500/20 text-indigo-500"
            size="xl"
            bodyClassName="p-0"
            footer={modalFooter}
        >
            <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mb-4"></div>
                            <p className="text-[13px] font-medium text-text-muted">Loading history...</p>
                        </div>
                    ) : error ? (
                        <div className="p-8 flex flex-col items-center text-center">
                            <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
                            <p className="text-[14px] font-medium text-red-600 mb-4">{error}</p>
                            <button onClick={loadHistory} className="btn btn-secondary btn-md">Retry</button>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="py-16 flex flex-col items-center text-center">
                            <FileText className="w-12 h-12 text-text-muted mb-4" />
                            <p className="text-[14px] font-medium text-text-secondary">No history found.</p>
                        </div>
                    ) : (
                        <table className="acx-table">
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
                                            {ver.responseNotes && (
                                                <div className="text-[11px] text-text-secondary mt-0.5 italic max-w-[220px] whitespace-normal">
                                                    "{ver.responseNotes}"
                                                </div>
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
                                                className="btn btn-primary btn-md"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5 " />
                                                View PDF
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
            </div>
        </Modal>
    );
}
