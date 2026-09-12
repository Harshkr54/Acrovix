import React, { useEffect, useState, useCallback } from 'react';
import { API_BASE_URL, getAuthHeaders } from '../services/api';
import { Link } from 'react-router-dom';
import { Search, Filter, Calendar, ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react';

export default function EnquiryList() {
    const [enquiries, setEnquiries] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [industryFilter, setIndustryFilter] = useState('');
    const [serviceFilter, setServiceFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const itemsPerPage = 10;
    const [isLoading, setIsLoading] = useState(true);

    const fetchEnquiries = useCallback(() => {
        setIsLoading(true);
        let url = `${API_BASE_URL}/enquiries?page=${currentPage}&size=${itemsPerPage}`;
        if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
        if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
        if (industryFilter) url += `&industry=${encodeURIComponent(industryFilter)}`;
        if (serviceFilter) url += `&service=${encodeURIComponent(serviceFilter)}`;
        if (fromDate) url += `&fromDate=${encodeURIComponent(fromDate + 'T00:00:00')}`;
        if (toDate) url += `&toDate=${encodeURIComponent(toDate + 'T23:59:59')}`;

        fetch(url, { headers: getAuthHeaders() })
            .then(res => res.json())
            .then(data => {
                setEnquiries(data.content);
                setTotalPages(data.totalPages);
                setTotalElements(data.totalElements);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Error fetching enquiries", err);
                setIsLoading(false);
            });
    }, [currentPage, searchTerm, statusFilter, industryFilter, serviceFilter, fromDate, toDate]);

    useEffect(() => {
        fetchEnquiries();
    }, [fetchEnquiries]);

    const updateStatus = async (id, status) => {
        await fetch(`${API_BASE_URL}/enquiries/${id}/status`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status })
        });
        fetchEnquiries();
    };

    const getStatusBadge = (status) => {
        switch(status) {
            case 'NEW': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'CONTACTED': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'QUOTED': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            case 'CLOSED': return 'bg-green-500/10 text-green-400 border-green-500/20';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-100">Enquiries</h1>
            </div>
            
            {/* Filters */}
            <div className="card p-5 space-y-4">
                <div className="flex items-center text-sm font-medium text-slate-400 mb-2">
                    <Filter className="w-4 h-4 mr-2" />
                    Filters & Search
                </div>
                <div className="flex flex-wrap gap-4">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-500" />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Search name, company, ref..." 
                            value={searchTerm}
                            onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(0);}}
                            className="input-field pl-9 w-full sm:w-64"
                        />
                    </div>
                    
                    <select 
                        value={statusFilter}
                        onChange={(e) => {setStatusFilter(e.target.value); setCurrentPage(0);}}
                        className="input-field w-full sm:w-40 appearance-none"
                    >
                        <option value="">All Statuses</option>
                        <option value="NEW">NEW</option>
                        <option value="CONTACTED">CONTACTED</option>
                        <option value="QUOTED">QUOTED</option>
                        <option value="CLOSED">CLOSED</option>
                    </select>
                    
                    <input 
                        type="text" 
                        placeholder="Industry..." 
                        value={industryFilter}
                        onChange={(e) => {setIndustryFilter(e.target.value); setCurrentPage(0);}}
                        className="input-field w-full sm:w-40"
                    />
                    
                    <input 
                        type="text" 
                        placeholder="Service..." 
                        value={serviceFilter}
                        onChange={(e) => {setServiceFilter(e.target.value); setCurrentPage(0);}}
                        className="input-field w-full sm:w-40"
                    />
                    
                    <div className="flex items-center space-x-2 w-full lg:w-auto">
                        <div className="relative flex-1 lg:w-36">
                            <input 
                                type="date" 
                                value={fromDate}
                                onChange={(e) => {setFromDate(e.target.value); setCurrentPage(0);}}
                                className="input-field [color-scheme:dark]"
                            />
                        </div>
                        <span className="text-slate-500 text-sm">to</span>
                        <div className="relative flex-1 lg:w-36">
                            <input 
                                type="date" 
                                value={toDate}
                                onChange={(e) => {setToDate(e.target.value); setCurrentPage(0);}}
                                className="input-field [color-scheme:dark]"
                            />
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-700/50">
                        <thead>
                            <tr>
                                <th className="table-header">Ref ID</th>
                                <th className="table-header">Client</th>
                                <th className="table-header">Status</th>
                                <th className="table-header">Date</th>
                                <th className="table-header">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex justify-center mb-4">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                                        </div>
                                        Loading enquiries...
                                    </td>
                                </tr>
                            ) : enquiries.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        No enquiries found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                enquiries.map((enq) => (
                                    <tr key={enq.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="table-cell">
                                            <span className="font-mono text-brand-400 bg-brand-500/10 px-2 py-1 rounded text-xs border border-brand-500/20">
                                                {enq.referenceId}
                                            </span>
                                        </td>
                                        <td className="table-cell">
                                            <div className="font-medium text-slate-200">{enq.fullName}</div>
                                            <div className="text-slate-400 text-xs mt-0.5">{enq.companyName}</div>
                                            <div className="text-slate-500 text-[11px] mt-1 flex items-center">
                                                <span className="truncate max-w-[120px]">{enq.industrySector}</span>
                                                <span className="mx-1">•</span>
                                                <span className="truncate max-w-[120px]">{enq.serviceRequired}</span>
                                            </div>
                                        </td>
                                        <td className="table-cell">
                                            <select
                                                value={enq.status}
                                                onChange={(e) => updateStatus(enq.id, e.target.value)}
                                                className={`text-xs font-semibold px-2.5 py-1.5 rounded-md border appearance-none outline-none cursor-pointer ${getStatusBadge(enq.status)}`}
                                            >
                                                <option value="NEW" className="bg-slate-800 text-slate-200">NEW</option>
                                                <option value="CONTACTED" className="bg-slate-800 text-slate-200">CONTACTED</option>
                                                <option value="QUOTED" className="bg-slate-800 text-slate-200">QUOTED</option>
                                                <option value="CLOSED" className="bg-slate-800 text-slate-200">CLOSED</option>
                                            </select>
                                        </td>
                                        <td className="table-cell text-slate-400">
                                            <div className="flex items-center">
                                                <Calendar className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                                                {new Date(enq.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </div>
                                        </td>
                                        <td className="table-cell">
                                            <Link
                                                to={`/quotations/new/${enq.id}`}
                                                className="inline-flex items-center text-brand-400 hover:text-brand-300 font-medium text-xs transition-colors"
                                            >
                                                <PlusCircle className="w-4 h-4 mr-1" />
                                                Quotation
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination */}
                {!isLoading && enquiries.length > 0 && (
                    <div className="px-6 py-4 border-t border-slate-700/50 flex flex-col sm:flex-row items-center justify-between bg-slate-800/30">
                        <p className="text-sm text-slate-400 mb-4 sm:mb-0">
                            Showing <span className="font-medium text-slate-200">{totalElements === 0 ? 0 : currentPage * itemsPerPage + 1}</span> to <span className="font-medium text-slate-200">{Math.min((currentPage + 1) * itemsPerPage, totalElements)}</span> of <span className="font-medium text-slate-200">{totalElements}</span> results
                        </p>
                        <div className="flex space-x-2">
                            <button 
                                disabled={currentPage === 0}
                                onClick={() => setCurrentPage(p => p - 1)}
                                className="btn-secondary py-1.5 px-3 flex items-center text-sm"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Prev
                            </button>
                            <button 
                                disabled={currentPage >= totalPages - 1}
                                onClick={() => setCurrentPage(p => p + 1)}
                                className="btn-secondary py-1.5 px-3 flex items-center text-sm"
                            >
                                Next
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
