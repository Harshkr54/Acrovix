import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchApi } from '../services/api';
import { FileText, Plus, AlertCircle, ChevronLeft, ChevronRight, File, Trash2, ShoppingCart } from 'lucide-react';
import CreateQuotationModal from '../components/CreateQuotationModal';
import CreatePurchaseOrderModal from '../components/CreatePurchaseOrderModal';
import { createInvoiceFromQuotation } from '../services/api';

export default function QuotationList() {
    const [quotations, setQuotations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [downloadingPdfId, setDownloadingPdfId] = useState(null);
    const [trashModalQuotation, setTrashModalQuotation] = useState(null);
    const [poModalQuotation, setPoModalQuotation] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const itemsPerPage = 10;

    const handleCreateProforma = async (quotationId) => {
        if (!window.confirm('Create a Proforma Invoice from this Quotation?')) return;
        setIsConverting(true);
        try {
            const invoice = await createInvoiceFromQuotation(quotationId, 'PROFORMA');
            navigate(`/invoices/${invoice.id}`);
        } catch (err) {
            console.error(err);
            alert(err.message || 'Failed to create Proforma Invoice');
        } finally {
            setIsConverting(false);
        }
    };

    const fetchQuotations = React.useCallback(() => {
        setIsLoading(true);
        setError(null);
        fetchApi(`/quotations?page=${currentPage}&size=${itemsPerPage}`)
            .then(data => {
                setQuotations(data?.content || []);
                setTotalPages(data?.totalPages || 0);
                setTotalElements(data?.totalElements || 0);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Error fetching quotations", err);
                setError(err.message || 'An error occurred while loading quotations.');
                setIsLoading(false);
            });
    }, [currentPage]);

    const handleMoveToTrash = async () => {
        if (!trashModalQuotation || isDeleting) return;
        setIsDeleting(true);
        try {
            await fetchApi(`/quotations/${trashModalQuotation.id}`, { method: 'DELETE' });
            setTrashModalQuotation(null);
            fetchQuotations();
        } catch (err) {
            console.error("Error moving draft to trash", err);
            alert(err.message || "Failed to move draft to trash.");
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        fetchQuotations();
    }, [fetchQuotations]);

    const handleViewPdf = async (id) => {
        if (downloadingPdfId) return;
        setDownloadingPdfId(id);
        
        try {
            const response = await fetchApi(`/quotations/${id}/pdf`);
            
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            
            // Open in new tab
            window.open(url, '_blank');
            
            // Clean up the URL object after a reasonable time for the new tab to load it
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 60000);
            
        } catch (err) {
            console.error("PDF Fetch Error:", err);
            alert(err.message || "Failed to open PDF.");
        } finally {
            setDownloadingPdfId(null);
        }
    };

    const normalizeStatus = (rawStatus) => {
        return rawStatus ? String(rawStatus).toUpperCase() : 'UNKNOWN';
    };

    const getStatusStyle = (rawStatus) => {
        const status = normalizeStatus(rawStatus);
        switch(status) {
            case 'DRAFT': return 'text-[#71869A]';
            case 'SENT': return 'text-[#2563EB]';
            case 'ACCEPTED': return 'text-[#059669]';
            case 'REJECTED': return 'text-[#DC2626]';
            case 'EXPIRED': return 'text-[#EA580C]';
            default: return 'text-text-secondary';
        }
    };

    const renderSourceBadge = (q) => {
        const source = q.quotationSource;
        if (source === 'ENQUIRY' || (!source && q.enquiry)) {
            return (
                <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-[#4F46E5] bg-[#4F46E5]/10 px-2 py-0.5 rounded-md mt-1">
                    WEBSITE ENQUIRY
                </span>
            );
        }
        const label = source ? `DIRECT · ${source}` : 'DIRECT';
        return (
            <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-[#14B8A6] bg-[#14B8A6]/10 px-2 py-0.5 rounded-md mt-1">
                {label}
            </span>
        );
    };

    if (isLoading && quotations.length === 0) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14B8A6] mb-4"></div>
                    <p className="text-[13px] font-medium text-text-muted">Loading quotations...</p>
                </div>
            </div>
        );
    }

    if (error && quotations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center max-w-md mx-auto">
                <div className="w-16 h-16 bg-[#FEF2F2] border border-[#FCA5A5] flex items-center justify-center rounded-[20px] mb-6 shadow-sm">
                    <AlertCircle className="w-8 h-8 text-[#DC2626]" />
                </div>
                <h2 className="text-[20px] font-bold text-text-primary mb-2 tracking-tight">Failed to load</h2>
                <p className="text-text-secondary mb-6 text-[13px] leading-relaxed">{error}</p>
                <button onClick={fetchQuotations} className="btn-primary flex items-center px-4 py-2.5 shadow-[0_4px_14px_rgba(79,70,229,0.25)]">
                    Try Again
                </button>
            </div>
        );
    }

    if (!isLoading && quotations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] text-center max-w-md mx-auto">
                <div className="w-24 h-24 bg-bg-card border border-border-subtle flex items-center justify-center rounded-[28px] mb-8 shadow-sm">
                    <FileText className="w-10 h-10 text-text-muted" />
                </div>
                <h2 className="text-[24px] font-bold text-text-primary mb-3 tracking-tight">No quotations yet</h2>
                <p className="text-text-secondary mb-8 text-[13px] leading-relaxed">Create your first quotation to get started.</p>
                <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary flex items-center px-4 py-2.5 shadow-[0_4px_14px_rgba(79,70,229,0.25)]">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Quotation
                </button>
                <CreateQuotationModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
            <CreateQuotationModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-[28px] font-bold text-text-primary tracking-tight leading-tight">Quotations</h1>
                    <p className="text-[13px] text-text-secondary mt-1">Create and manage client quotations.</p>
                </div>
                <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary flex items-center px-4 py-2.5 shadow-[0_4px_14px_rgba(79,70,229,0.25)]">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Quotation
                </button>
            </div>

            {/* Table */}
            <div className="card flex flex-col">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border-subtle">
                        <thead>
                            <tr>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card rounded-tl-[24px]">Quotation No.</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Client</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Amount</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Status</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card hidden sm:table-cell">Created</th>
                                <th className="px-6 py-4 text-center text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card rounded-tr-[24px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-bg-card divide-y divide-border-subtle/40">
                            {quotations.map((q) => (
                                <tr key={q.id} className="hover:bg-bg-hover transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap text-[13px] font-bold text-text-primary align-top">
                                        <div className="flex items-center">
                                            <File className="w-4 h-4 mr-2.5 text-text-muted" />
                                            <span>
                                                {q.quotationNumber}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <div className="text-[13px] font-semibold text-text-primary leading-tight">{q.clientName}</div>
                                        <div className="text-[12px] text-text-secondary mt-0.5">{q.clientCompany || '—'}</div>
                                        <div>{renderSourceBadge(q)}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap align-top">
                                        <div className="text-[13px] font-bold text-text-primary tracking-tight">
                                            ₹{q.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap align-top">
                                        <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(q.status)}`}>
                                            <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5"></span>
                                            {normalizeStatus(q.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-[12px] text-text-muted font-medium align-top hidden sm:table-cell">
                                        {new Date(q.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center align-top">
                                        <div className="flex items-center justify-center space-x-3">
                                            {q.status === 'DRAFT' ? (
                                                <div className="flex items-center space-x-3">
                                                    <Link
                                                        to={`/quotations/edit/${q.id}`}
                                                        className="inline-flex items-center text-[#4F46E5] hover:text-[#4338CA] font-semibold text-[12px] transition-colors"
                                                    >
                                                        Edit draft
                                                    </Link>
                                                    <button
                                                        onClick={() => setTrashModalQuotation(q)}
                                                        className="inline-flex items-center text-[#DC2626] hover:text-[#B91C1C] font-semibold text-[12px] transition-colors"
                                                        title="Move to Trash"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                                                        Delete
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleViewPdf(q.id)}
                                                        disabled={downloadingPdfId === q.id}
                                                        className="inline-flex items-center justify-center px-3 py-1.5 bg-bg-card hover:bg-bg-hover disabled:opacity-50 border border-border-subtle rounded-lg text-[12px] font-semibold text-text-primary transition-colors shadow-sm"
                                                    >
                                                        {downloadingPdfId === q.id ? (
                                                            <><span className="animate-spin w-3 h-3 border-b-2 border-text-primary rounded-full mr-2"></span> Loading</>
                                                        ) : (
                                                            'View PDF'
                                                        )}
                                                    </button>
                                                    {q.status === 'ACCEPTED' && (
                                                        <>
                                                            <button
                                                                onClick={() => setPoModalQuotation(q)}
                                                                className="inline-flex items-center justify-center px-3 py-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/20 rounded-lg text-[12px] font-semibold text-brand-primary transition-colors shadow-sm ml-2"
                                                            >
                                                                <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                                                                Convert to PO
                                                            </button>
                                                            <button
                                                                onClick={() => handleCreateProforma(q.id)}
                                                                disabled={isConverting}
                                                                className="inline-flex items-center justify-center px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg text-[12px] font-semibold text-purple-600 transition-colors shadow-sm ml-2"
                                                            >
                                                                <FileText className="w-3.5 h-3.5 mr-1" />
                                                                Proforma
                                                            </button>
                                                        </>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination */}
                <div className="px-6 py-4 border-t border-border-subtle/50 flex flex-col sm:flex-row items-center justify-between rounded-b-[24px]">
                    <p className="text-[12px] text-text-muted font-medium mb-4 sm:mb-0">
                        Showing <span className="font-bold text-text-primary">{totalElements === 0 ? 0 : currentPage * itemsPerPage + 1}</span> to <span className="font-bold text-text-primary">{Math.min((currentPage + 1) * itemsPerPage, totalElements)}</span> of <span className="font-bold text-text-primary">{totalElements}</span> results
                    </p>
                    <div className="flex space-x-2">
                        <button 
                            disabled={currentPage === 0 || isLoading}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="inline-flex items-center px-3 py-1.5 bg-bg-card hover:bg-bg-hover disabled:opacity-50 border border-border-subtle rounded-lg text-[12px] font-semibold text-text-primary transition-colors shadow-sm"
                        >
                            <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                            Prev
                        </button>
                        <button 
                            disabled={currentPage >= totalPages - 1 || isLoading}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="inline-flex items-center px-3 py-1.5 bg-bg-card hover:bg-bg-hover disabled:opacity-50 border border-border-subtle rounded-lg text-[12px] font-semibold text-text-primary transition-colors shadow-sm"
                        >
                            Next
                            <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Trash Confirmation Modal */}
            {trashModalQuotation && (
                <div className="fixed inset-0 bg-text-primary/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="card p-6 md:p-8 max-w-md w-full border border-border-subtle shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-2xl flex items-center justify-center mb-5 text-amber-600 dark:text-amber-400">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-[18px] font-bold text-text-primary mb-2 tracking-tight">Move this draft to Trash?</h3>
                        <p className="text-[13px] text-text-secondary leading-relaxed mb-6">
                            Draft <span className="font-mono font-bold text-text-primary">{trashModalQuotation.quotationNumber}</span> for <span className="font-semibold text-text-primary">{trashModalQuotation.clientName}</span> will be moved to Trash. You can restore it anytime from the Trash page.
                        </p>
                        <div className="flex items-center justify-end space-x-3">
                            <button
                                onClick={() => setTrashModalQuotation(null)}
                                disabled={isDeleting}
                                className="px-4 py-2.5 bg-bg-card hover:bg-bg-hover border border-border-subtle rounded-xl text-[13px] font-semibold text-text-primary transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleMoveToTrash}
                                disabled={isDeleting}
                                className="px-4 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl text-[13px] font-semibold transition-colors shadow-sm disabled:opacity-50 flex items-center"
                            >
                                {isDeleting ? (
                                    <><span className="animate-spin w-3.5 h-3.5 border-b-2 border-white rounded-full mr-2"></span> Moving...</>
                                ) : (
                                    'Move to Trash'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <CreatePurchaseOrderModal 
                isOpen={!!poModalQuotation} 
                onClose={() => setPoModalQuotation(null)} 
                quotation={poModalQuotation}
                onSuccess={fetchQuotations}
            />
        </div>
    );
}
