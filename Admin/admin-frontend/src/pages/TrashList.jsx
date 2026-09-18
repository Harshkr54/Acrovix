import React, { useEffect, useState } from 'react';
import { fetchApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Trash2, RotateCcw, AlertTriangle, AlertCircle, ChevronLeft, ChevronRight, File, ShieldAlert } from 'lucide-react';

export default function TrashList() {
    const { user } = useAuth();
    const [trashQuotations, setTrashQuotations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [restoringId, setRestoringId] = useState(null);
    const [permanentModalQuotation, setPermanentModalQuotation] = useState(null);
    const [isDeletingPermanently, setIsDeletingPermanently] = useState(false);
    const itemsPerPage = 10;

    const fetchTrashQuotations = React.useCallback(() => {
        setIsLoading(true);
        setError(null);
        fetchApi(`/quotations/trash?page=${currentPage}&size=${itemsPerPage}`)
            .then(data => {
                setTrashQuotations(data.content || []);
                setTotalPages(data.totalPages || 0);
                setTotalElements(data.totalElements || 0);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Error fetching trash quotations", err);
                setError(err.message || 'An error occurred while loading trash items.');
                setIsLoading(false);
            });
    }, [currentPage]);

    useEffect(() => {
        fetchTrashQuotations();
    }, [fetchTrashQuotations]);

    const handleRestore = async (id) => {
        if (restoringId) return;
        setRestoringId(id);
        try {
            await fetchApi(`/quotations/${id}/restore`, { method: 'PATCH' });
            fetchTrashQuotations();
        } catch (err) {
            console.error("Error restoring quotation", err);
            alert(err.message || "Failed to restore quotation.");
        } finally {
            setRestoringId(null);
        }
    };

    const handlePermanentDelete = async () => {
        if (!permanentModalQuotation || isDeletingPermanently) return;
        setIsDeletingPermanently(true);
        try {
            await fetchApi(`/quotations/${permanentModalQuotation.id}/permanent`, { method: 'DELETE' });
            setPermanentModalQuotation(null);
            fetchTrashQuotations();
        } catch (err) {
            console.error("Error permanently deleting quotation", err);
            alert(err.message || "Failed to permanently delete quotation.");
        } finally {
            setIsDeletingPermanently(false);
        }
    };

    if (isLoading && trashQuotations.length === 0) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal mb-4"></div>
                    <p className="text-[13px] font-medium text-text-muted">Loading trash...</p>
                </div>
            </div>
        );
    }

    if (error && trashQuotations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center max-w-md mx-auto">
                <div className="w-16 h-16 bg-brand-danger/10 border border-brand-danger/30 flex items-center justify-center rounded-[20px] mb-6 shadow-sm">
                    <AlertCircle className="w-8 h-8 text-brand-danger" />
                </div>
                <h2 className="text-[20px] font-bold text-text-primary mb-2 tracking-tight">Failed to load Trash</h2>
                <p className="text-text-secondary mb-6 text-[13px] leading-relaxed">{error}</p>
                <button onClick={fetchTrashQuotations} className="acx-btn-primary flex items-center px-4 py-2.5 shadow-[0_4px_14px_rgba(79,70,229,0.25)]">
                    Try Again
                </button>
            </div>
        );
    }

    if (!isLoading && trashQuotations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] text-center max-w-md mx-auto">
                <div className="w-24 h-24 bg-bg-card border border-border-subtle flex items-center justify-center rounded-[28px] mb-8 shadow-sm">
                    <Trash2 className="w-10 h-10 text-text-muted" />
                </div>
                <h2 className="text-[24px] font-bold text-text-primary mb-3 tracking-tight">Trash is empty</h2>
                <p className="text-text-secondary mb-8 text-[13px] leading-relaxed">No deleted quotation drafts in trash.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-[28px] font-bold text-text-primary tracking-tight leading-tight flex items-center">
                        <Trash2 className="w-7 h-7 mr-3 text-amber-500" />
                        Trash
                    </h1>
                    <p className="text-[13px] text-text-secondary mt-1">Deleted quotation drafts</p>
                </div>
            </div>

            {/* Table */}
            <div className="acx-card flex flex-col">
                <div className="acx-table-container">
                    <table className="acx-table">
                        <thead>
                            <tr>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card rounded-tl-[24px]">Quotation No.</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Client</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Amount</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card hidden sm:table-cell">Deleted Date</th>
                                <th className="px-6 py-4 text-center text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card rounded-tr-[24px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-bg-card divide-y divide-border-subtle/40">
                            {trashQuotations.map((q) => (
                                <tr key={q.id} className="hover:bg-bg-hover transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap text-[13px] font-bold text-text-primary align-top">
                                        <div className="flex items-center">
                                            <File className="w-4 h-4 mr-2.5 text-text-muted" />
                                            <span>{q.quotationNumber}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <div className="text-[13px] font-semibold text-text-primary leading-tight">{q.clientName}</div>
                                        <div className="text-[12px] text-text-secondary mt-0.5">{q.clientCompany || '—'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap align-top">
                                        <div className="text-[13px] font-bold text-text-primary tracking-tight">
                                            ₹{q.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-[12px] text-text-muted font-medium align-top hidden sm:table-cell">
                                        {q.deletedAt ? new Date(q.deletedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center align-top">
                                        <div className="flex items-center justify-center space-x-3">
                                            <button
                                                onClick={() => handleRestore(q.id)}
                                                disabled={restoringId === q.id}
                                                className="inline-flex items-center text-brand-teal hover:text-[#0F766E] font-semibold text-[12px] transition-colors disabled:opacity-50"
                                            >
                                                {restoringId === q.id ? (
                                                    <><span className="animate-spin w-3 h-3 border-b-2 border-[#0D9488] rounded-full mr-1.5"></span> Restoring...</>
                                                ) : (
                                                    <><RotateCcw className="w-3.5 h-3.5 mr-1" /> Restore</>
                                                )}
                                            </button>
                                            {user?.role === 'SUPER_ADMIN' && (
                                                <button
                                                    onClick={() => setPermanentModalQuotation(q)}
                                                    className="inline-flex items-center text-brand-danger hover:text-[#B91C1C] font-semibold text-[12px] transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Permanently
                                                </button>
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
                            <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
                        </button>
                        <button 
                            disabled={currentPage >= totalPages - 1 || isLoading}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="inline-flex items-center px-3 py-1.5 bg-bg-card hover:bg-bg-hover disabled:opacity-50 border border-border-subtle rounded-lg text-[12px] font-semibold text-text-primary transition-colors shadow-sm"
                        >
                            Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Permanent Delete Modal */}
            {permanentModalQuotation && (
                <div className="fixed inset-0 bg-text-primary/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="acx-card p-6 md:p-8 max-w-md w-full border border-border-subtle shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-2xl flex items-center justify-center mb-5 text-red-600 dark:text-red-400">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <h3 className="text-[18px] font-bold text-text-primary mb-2 tracking-tight">Permanently delete this quotation?</h3>
                        <p className="text-[13px] text-text-secondary leading-relaxed mb-6">
                            This action cannot be undone. Quotation <span className="font-mono font-bold text-text-primary">{permanentModalQuotation.quotationNumber}</span> and all its line items will be permanently deleted from the database.
                        </p>
                        <div className="flex items-center justify-end space-x-3">
                            <button
                                onClick={() => setPermanentModalQuotation(null)}
                                disabled={isDeletingPermanently}
                                className="px-4 py-2.5 bg-bg-card hover:bg-bg-hover border border-border-subtle rounded-xl text-[13px] font-semibold text-text-primary transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePermanentDelete}
                                disabled={isDeletingPermanently}
                                className="px-4 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl text-[13px] font-semibold transition-colors shadow-sm disabled:opacity-50 flex items-center"
                            >
                                {isDeletingPermanently ? (
                                    <><span className="animate-spin w-3.5 h-3.5 border-b-2 border-white rounded-full mr-2"></span> Deleting...</>
                                ) : (
                                    'Delete Permanently'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
