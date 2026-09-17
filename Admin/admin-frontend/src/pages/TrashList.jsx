import React, { useEffect, useState } from 'react';
import { fetchApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Trash2, RotateCcw, AlertTriangle, ChevronLeft, ChevronRight, File } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';

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

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
            {/* Header */}
            <PageHeader
                title="Trash"
                subtitle="Deleted quotation drafts. Restore or permanently remove them."
                icon={Trash2}
            />

            {/* Table Card */}
            <div className="bg-bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-bg-main/50 text-text-muted text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4">Quotation No.</th>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4 hidden sm:table-cell">Deleted Date</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="py-8">
                                        <EmptyState type="loading" message="Loading trash items..." />
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="5" className="py-8">
                                        <EmptyState type="error" message={error} onRetry={fetchTrashQuotations} />
                                    </td>
                                </tr>
                            ) : trashQuotations.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="py-8">
                                        <EmptyState type="empty" message="Trash is empty." />
                                    </td>
                                </tr>
                            ) : (
                                trashQuotations.map((q) => (
                                    <tr key={q.id} className="hover:bg-bg-main/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-brand-primary align-top">
                                            <div className="flex items-center gap-2">
                                                <File className="w-4 h-4 text-text-muted" />
                                                <span>{q.quotationNumber}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <div className="font-semibold text-text-primary">{q.clientName}</div>
                                            <div className="text-xs text-text-muted mt-0.5">{q.clientCompany || '—'}</div>
                                        </td>
                                        <td className="px-6 py-4 align-top font-bold text-text-primary">
                                            ₹{q.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-text-muted align-top hidden sm:table-cell">
                                            {q.deletedAt ? new Date(q.deletedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                        </td>
                                        <td className="px-6 py-4 align-top text-center">
                                            <div className="flex items-center justify-center space-x-3">
                                                <button
                                                    onClick={() => handleRestore(q.id)}
                                                    disabled={restoringId === q.id}
                                                    className="btn-secondary text-xs px-3 py-1.5 rounded-xl font-medium inline-flex items-center gap-1 text-brand-primary"
                                                >
                                                    {restoringId === q.id ? (
                                                        <><span className="animate-spin w-3 h-3 border-b-2 border-brand-primary rounded-full"></span> Restoring...</>
                                                    ) : (
                                                        <><RotateCcw className="w-3.5 h-3.5" /> Restore</>
                                                    )}
                                                </button>
                                                {user?.role === 'SUPER_ADMIN' && (
                                                    <button
                                                        onClick={() => setPermanentModalQuotation(q)}
                                                        className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors inline-flex items-center gap-1"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" /> Delete Permanently
                                                    </button>
                                                )}
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
                    <div className="p-4 border-t border-border-subtle flex items-center justify-between bg-bg-main/50">
                        <span className="text-xs text-text-muted font-medium">
                            Showing {totalElements === 0 ? 0 : currentPage * itemsPerPage + 1} to {Math.min((currentPage + 1) * itemsPerPage, totalElements)} of {totalElements} results
                        </span>
                        <div className="flex gap-2">
                            <button 
                                disabled={currentPage === 0 || isLoading}
                                onClick={() => setCurrentPage(p => p - 1)}
                                className="px-3 py-1 rounded-lg border border-border-subtle hover:bg-bg-card disabled:opacity-50 text-xs font-semibold flex items-center gap-1"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" /> Prev
                            </button>
                            <button 
                                disabled={currentPage >= totalPages - 1 || isLoading}
                                onClick={() => setCurrentPage(p => p + 1)}
                                className="px-3 py-1 rounded-lg border border-border-subtle hover:bg-bg-card disabled:opacity-50 text-xs font-semibold flex items-center gap-1"
                            >
                                Next <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Permanent Delete Modal */}
            {permanentModalQuotation && (
                <div className="fixed inset-0 bg-text-primary/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-bg-card p-6 md:p-8 max-w-md w-full border border-border-subtle rounded-2xl shadow-2xl relative">
                        <div className="w-12 h-12 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl flex items-center justify-center mb-5 text-red-500">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-text-primary mb-2">Permanently delete this quotation?</h3>
                        <p className="text-xs text-text-secondary leading-relaxed mb-6">
                            This action cannot be undone. Quotation <span className="font-mono font-bold text-text-primary">{permanentModalQuotation.quotationNumber}</span> and all its line items will be permanently deleted from the database.
                        </p>
                        <div className="flex items-center justify-end space-x-3">
                            <button
                                onClick={() => setPermanentModalQuotation(null)}
                                disabled={isDeletingPermanently}
                                className="btn-secondary text-xs px-4 py-2.5 rounded-xl font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePermanentDelete}
                                disabled={isDeletingPermanently}
                                className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm disabled:opacity-50 flex items-center"
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

