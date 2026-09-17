import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi } from '../services/api';
import { FileText, Plus, ChevronLeft, ChevronRight, File, Trash2, ShoppingCart, Eye, CheckCircle, XCircle, RefreshCw, History, Send, Pencil } from 'lucide-react';
import CreateQuotationModal from '../components/CreateQuotationModal';
import CreatePurchaseOrderModal from '../components/CreatePurchaseOrderModal';
import AcceptRejectQuotationModal from '../components/AcceptRejectQuotationModal';
import QuotationHistoryModal from '../components/QuotationHistoryModal';
import ActionMenu from '../components/ActionMenu';
import { createInvoiceFromQuotation } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';

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
    const [acceptRejectModalInfo, setAcceptRejectModalInfo] = useState(null); // { quotation, type: 'ACCEPT' | 'REJECT' }
    const [historyModalQuotation, setHistoryModalQuotation] = useState(null);
    
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

    const handleCreateRevision = async (id) => {
        if (!window.confirm("Create a new revision from this quotation? This will lock the current one as REVISED.")) return;
        try {
            const revision = await fetchApi(`/quotations/${id}/revisions`, { method: 'POST' });
            navigate(`/quotations/edit/${revision.id}`);
        } catch (err) {
            console.error("Create Revision Error:", err);
            alert(err.message || "Failed to create revision.");
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

    const renderSourceBadge = (q) => {
        const source = q.quotationSource;
        if (source === 'ENQUIRY' || (!source && q.enquiry)) {
            return (
                <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-md mt-1">
                    WEBSITE ENQUIRY
                </span>
            );
        }
        const label = source ? `DIRECT · ${source}` : 'DIRECT';
        return (
            <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-md mt-1">
                {label}
            </span>
        );
    };

    const getQuotationActionItems = (q) => {
        const status = normalizeStatus(q.status);
        const viewDetailsItem = {
            label: 'View Details',
            icon: Eye,
            onClick: () => navigate(`/quotations/edit/${q.id}`)
        };
        const viewPdfItem = {
            label: 'View PDF',
            icon: FileText,
            onClick: () => handleViewPdf(q.id)
        };
        const historyItem = {
            label: 'View History',
            icon: History,
            onClick: () => setHistoryModalQuotation(q)
        };
        const reviseItem = {
            label: 'Create Revision',
            icon: RefreshCw,
            variant: 'accent',
            onClick: () => handleCreateRevision(q.id)
        };

        switch (status) {
            case 'SENT':
                return [
                    viewDetailsItem,
                    viewPdfItem,
                    {
                        label: 'Accept Quotation',
                        icon: CheckCircle,
                        variant: 'success',
                        onClick: () => setAcceptRejectModalInfo({ quotation: q, type: 'ACCEPT' })
                    },
                    {
                        label: 'Reject Quotation',
                        icon: XCircle,
                        variant: 'danger',
                        onClick: () => setAcceptRejectModalInfo({ quotation: q, type: 'REJECT' })
                    },
                    reviseItem,
                    historyItem
                ];

            case 'DRAFT':
                return [
                    viewDetailsItem,
                    {
                        label: 'Edit Draft',
                        icon: Pencil,
                        onClick: () => navigate(`/quotations/edit/${q.id}`)
                    },
                    viewPdfItem,
                    {
                        label: 'Send Quotation',
                        icon: Send,
                        onClick: () => navigate(`/quotations/edit/${q.id}`)
                    },
                    historyItem,
                    { type: 'divider' },
                    {
                        label: 'Move to Trash',
                        icon: Trash2,
                        variant: 'danger',
                        onClick: () => setTrashModalQuotation(q)
                    }
                ];

            case 'ACCEPTED':
                return [
                    viewDetailsItem,
                    viewPdfItem,
                    historyItem,
                    { type: 'divider' },
                    {
                        label: 'Convert to PO',
                        icon: ShoppingCart,
                        variant: 'brand',
                        onClick: () => setPoModalQuotation(q)
                    },
                    {
                        label: 'Create Proforma',
                        icon: FileText,
                        variant: 'accent',
                        disabled: isConverting,
                        onClick: () => handleCreateProforma(q.id)
                    }
                ];

            case 'REJECTED':
                return [
                    viewDetailsItem,
                    viewPdfItem,
                    reviseItem,
                    historyItem
                ];

            case 'REVISED':
            case 'CONVERTED':
            default:
                return [
                    viewDetailsItem,
                    viewPdfItem,
                    historyItem
                ];
        }
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
            <CreateQuotationModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />

            {/* Header */}
            <PageHeader
                title="Quotations"
                subtitle="Create, manage, track and convert client quotations."
                icon={FileText}
                action={
                    <button 
                        onClick={() => setIsCreateModalOpen(true)} 
                        className="btn-primary text-xs px-4 py-2.5 rounded-xl font-medium flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Create Quotation
                    </button>
                }
            />

            {/* Table */}
            <div className="bg-bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-bg-main/50 text-text-muted text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4">Quotation No.</th>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 hidden sm:table-cell">Created</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="py-8">
                                        <EmptyState type="loading" message="Loading quotations..." />
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="6" className="py-8">
                                        <EmptyState type="error" message={error} onRetry={fetchQuotations} />
                                    </td>
                                </tr>
                            ) : quotations.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-8">
                                        <EmptyState 
                                            type="empty" 
                                            message="No quotations found." 
                                            actionLabel="Create Quotation" 
                                            onAction={() => setIsCreateModalOpen(true)} 
                                        />
                                    </td>
                                </tr>
                            ) : (
                                quotations.map((q) => (
                                    <tr key={q.id} className="hover:bg-bg-main/50 transition-colors">
                                        <td className="px-6 py-4 align-top font-bold text-brand-primary">
                                            <div className="flex items-center gap-2">
                                                <File className="w-4 h-4 text-text-muted" />
                                                <span>{q.quotationNumber}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <div className="font-semibold text-text-primary">{q.clientName}</div>
                                            <div className="text-xs text-text-muted mt-0.5">{q.clientCompany || '—'}</div>
                                            <div>{renderSourceBadge(q)}</div>
                                        </td>
                                        <td className="px-6 py-4 align-top font-bold text-text-primary">
                                            ₹{q.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <StatusBadge status={q.status} />
                                        </td>
                                        <td className="px-6 py-4 text-xs text-text-muted align-top hidden sm:table-cell">
                                            {new Date(q.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4 align-top text-center">
                                            <div className="flex items-center justify-center space-x-2">
                                                <button
                                                    onClick={() => handleViewPdf(q.id)}
                                                    disabled={downloadingPdfId === q.id}
                                                    className="btn-secondary text-xs px-3 py-1.5 rounded-xl font-medium inline-flex items-center gap-1.5"
                                                    title="View PDF"
                                                >
                                                    {downloadingPdfId === q.id ? (
                                                        <><span className="animate-spin w-3 h-3 border-b-2 border-brand-primary rounded-full"></span> Loading</>
                                                    ) : (
                                                        <><FileText className="w-3.5 h-3.5 text-text-muted" /> View PDF</>
                                                    )}
                                                </button>
                                                <ActionMenu
                                                    ariaLabel="More quotation actions"
                                                    items={getQuotationActionItems(q)}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between bg-bg-main/50">
                        <p className="text-xs text-text-muted font-medium mb-2 sm:mb-0">
                            Showing <span className="font-bold text-text-primary">{totalElements === 0 ? 0 : currentPage * itemsPerPage + 1}</span> to <span className="font-bold text-text-primary">{Math.min((currentPage + 1) * itemsPerPage, totalElements)}</span> of <span className="font-bold text-text-primary">{totalElements}</span> results
                        </p>
                        <div className="flex gap-2">
                            <button 
                                disabled={currentPage === 0 || isLoading}
                                onClick={() => setCurrentPage(p => p - 1)}
                                className="px-3 py-1 rounded-lg border border-border-subtle hover:bg-bg-card disabled:opacity-50 text-xs font-semibold flex items-center"
                            >
                                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                                Prev
                            </button>
                            <button 
                                disabled={currentPage >= totalPages - 1 || isLoading}
                                onClick={() => setCurrentPage(p => p + 1)}
                                className="px-3 py-1 rounded-lg border border-border-subtle hover:bg-bg-card disabled:opacity-50 text-xs font-semibold flex items-center"
                            >
                                Next
                                <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Trash Confirmation Modal */}
            {trashModalQuotation && (
                <div className="fixed inset-0 bg-text-primary/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-bg-card p-6 md:p-8 max-w-md w-full border border-border-subtle rounded-2xl shadow-2xl relative">
                        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-2xl flex items-center justify-center mb-5 text-amber-600 dark:text-amber-400">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-text-primary mb-2">Move this draft to Trash?</h3>
                        <p className="text-xs text-text-secondary leading-relaxed mb-6">
                            Draft <span className="font-mono font-bold text-text-primary">{trashModalQuotation.quotationNumber}</span> for <span className="font-semibold text-text-primary">{trashModalQuotation.clientName}</span> will be moved to Trash. You can restore it anytime from the Trash page.
                        </p>
                        <div className="flex items-center justify-end space-x-3">
                            <button
                                onClick={() => setTrashModalQuotation(null)}
                                disabled={isDeleting}
                                className="btn-secondary text-xs px-4 py-2.5 rounded-xl font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleMoveToTrash}
                                disabled={isDeleting}
                                className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm disabled:opacity-50 flex items-center"
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

            <AcceptRejectQuotationModal
                isOpen={!!acceptRejectModalInfo}
                onClose={() => setAcceptRejectModalInfo(null)}
                quotation={acceptRejectModalInfo?.quotation}
                type={acceptRejectModalInfo?.type}
                onSuccess={fetchQuotations}
            />

            <QuotationHistoryModal
                isOpen={!!historyModalQuotation}
                onClose={() => setHistoryModalQuotation(null)}
                quotation={historyModalQuotation}
                onViewPdf={handleViewPdf}
            />
        </div>
    );
}
