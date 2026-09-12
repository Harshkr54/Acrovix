import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL, getAuthHeaders } from '../services/api';
import { FileText, PlusCircle, AlertCircle, Calendar, ChevronLeft, ChevronRight, File } from 'lucide-react';

export default function QuotationList() {
    const [quotations, setQuotations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchQuotations();
    }, [currentPage]);

    const fetchQuotations = () => {
        setIsLoading(true);
        setError(null);
        fetch(`${API_BASE_URL}/quotations?page=${currentPage}&size=${itemsPerPage}`, { headers: getAuthHeaders() })
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error('Failed to fetch quotations');
                }
                return res.json();
            })
            .then(data => {
                setQuotations(data.content);
                setTotalPages(data.totalPages);
                setTotalElements(data.totalElements);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Error fetching quotations", err);
                setError(err.message || 'An error occurred while loading quotations.');
                setIsLoading(false);
            });
    };

    const getStatusBadge = (status) => {
        switch(status) {
            case 'DRAFT': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
            case 'SENT': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'ACCEPTED': return 'bg-green-500/10 text-green-400 border-green-500/20';
            case 'REJECTED': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'EXPIRED': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    };

    if (isLoading && quotations.length === 0) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center text-slate-400">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500 mb-4"></div>
                    <p>Loading quotations...</p>
                </div>
            </div>
        );
    }

    if (error && quotations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <div className="w-16 h-16 bg-red-500/10 flex items-center justify-center rounded-full mb-4">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-100 mb-2">Failed to load</h2>
                <p className="text-slate-400 mb-6 max-w-md">{error}</p>
                <button onClick={fetchQuotations} className="btn-primary">
                    Try Again
                </button>
            </div>
        );
    }

    if (!isLoading && quotations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] text-center">
                <div className="w-20 h-20 bg-slate-800/50 border border-slate-700/50 flex items-center justify-center rounded-2xl mb-5 shadow-inner">
                    <FileText className="w-10 h-10 text-slate-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-100 mb-2">No quotations yet</h2>
                <p className="text-slate-400 mb-8 max-w-sm">Create your first quotation by selecting an enquiry from the enquiries list.</p>
                <Link to="/enquiries" className="btn-primary flex items-center">
                    <PlusCircle className="w-5 h-5 mr-2" />
                    New Quotation
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-100 flex items-center">
                    <FileText className="w-6 h-6 mr-3 text-brand-500" />
                    Quotations
                </h1>
                <Link to="/enquiries" className="btn-primary flex items-center shadow-brand-500/20">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    New Quotation
                </Link>
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-700/50">
                        <thead>
                            <tr>
                                <th className="table-header">Quotation No.</th>
                                <th className="table-header">Client</th>
                                <th className="table-header">Amount</th>
                                <th className="table-header">Status</th>
                                <th className="table-header">Date</th>
                                <th className="table-header">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {quotations.map((q) => (
                                <tr key={q.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="table-cell">
                                        <div className="flex items-center">
                                            <File className="w-4 h-4 mr-2 text-slate-500" />
                                            <span className="font-mono text-brand-400 font-medium">
                                                {q.quotationNumber}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="table-cell">
                                        <div className="font-medium text-slate-200">{q.clientName}</div>
                                        <div className="text-slate-400 text-xs mt-0.5">{q.clientCompany}</div>
                                    </td>
                                    <td className="table-cell">
                                        <div className="font-semibold text-slate-200 font-mono">
                                            ₹{q.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                        </div>
                                    </td>
                                    <td className="table-cell">
                                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getStatusBadge(q.status)}`}>
                                            {q.status}
                                        </span>
                                    </td>
                                    <td className="table-cell text-slate-400">
                                        <div className="flex items-center">
                                            <Calendar className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                                            {new Date(q.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </div>
                                    </td>
                                    <td className="table-cell">
                                        <div className="flex items-center space-x-3">
                                            {q.status === 'DRAFT' ? (
                                                <Link
                                                    to={`/quotations/new/${q.enquiry?.id}`}
                                                    className="text-brand-400 hover:text-brand-300 font-medium text-xs transition-colors"
                                                >
                                                    Edit
                                                </Link>
                                            ) : (
                                                <a
                                                    href={`${API_BASE_URL}/quotations/${q.id}/pdf`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-blue-400 hover:text-blue-300 font-medium text-xs transition-colors"
                                                >
                                                    View PDF
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination */}
                <div className="px-6 py-4 border-t border-slate-700/50 flex flex-col sm:flex-row items-center justify-between bg-slate-800/30">
                    <p className="text-sm text-slate-400 mb-4 sm:mb-0">
                        Showing <span className="font-medium text-slate-200">{totalElements === 0 ? 0 : currentPage * itemsPerPage + 1}</span> to <span className="font-medium text-slate-200">{Math.min((currentPage + 1) * itemsPerPage, totalElements)}</span> of <span className="font-medium text-slate-200">{totalElements}</span> results
                    </p>
                    <div className="flex space-x-2">
                        <button 
                            disabled={currentPage === 0 || isLoading}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="btn-secondary py-1.5 px-3 flex items-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Prev
                        </button>
                        <button 
                            disabled={currentPage >= totalPages - 1 || isLoading}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="btn-secondary py-1.5 px-3 flex items-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
