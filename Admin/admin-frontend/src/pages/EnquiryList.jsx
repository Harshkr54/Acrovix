import React, { useEffect, useState, useCallback } from 'react';
import { API_BASE_URL, getAuthHeaders } from '../services/api';
import { Link } from 'react-router-dom';
import { Search, Filter, Calendar, ChevronLeft, ChevronRight, Plus, Inbox, MoreHorizontal } from 'lucide-react';

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

    const normalizeStatus = (rawStatus) => {
        return rawStatus ? String(rawStatus).toUpperCase() : 'UNKNOWN';
    };

    const getStatusStyle = (rawStatus) => {
        const status = normalizeStatus(rawStatus);
        switch(status) {
            case 'NEW': return 'text-[#2563EB]';
            case 'CONTACTED': return 'text-[#4F46E5]';
            case 'QUOTED': return 'text-[#7C3AED]';
            case 'CONVERTED': return 'text-[#059669]';
            case 'CLOSED': return 'text-[#DC2626]';
            default: return 'text-text-secondary';
        }
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-[28px] font-bold text-text-primary tracking-tight leading-tight">Enquiries</h1>
                    <p className="text-[13px] text-text-secondary mt-1">Manage and track incoming business enquiries.</p>
                </div>
            </div>
            
            {/* Toolbar */}
            <div className="card p-4 flex flex-col md:flex-row md:items-center gap-4">
                <div className="relative flex-1 min-w-[200px]">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-text-muted" />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Search reference, client, company..." 
                        value={searchTerm}
                        onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(0);}}
                        className="input-field pl-11 w-full text-sm h-11"
                    />
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <select 
                        value={statusFilter}
                        onChange={(e) => {setStatusFilter(e.target.value); setCurrentPage(0);}}
                        className="input-field w-auto min-w-[140px] text-sm appearance-none cursor-pointer h-11 pr-8"
                    >
                        <option value="">All Statuses</option>
                        <option value="NEW">NEW</option>
                        <option value="CONTACTED">CONTACTED</option>
                        <option value="QUOTED">QUOTED</option>
                        <option value="CONVERTED">CONVERTED</option>
                        <option value="CLOSED">CLOSED</option>
                    </select>
                    
                    <input 
                        type="text" 
                        placeholder="Industry" 
                        value={industryFilter}
                        onChange={(e) => {setIndustryFilter(e.target.value); setCurrentPage(0);}}
                        className="input-field w-32 text-sm hidden lg:block h-11"
                    />
                    
                    <input 
                        type="text" 
                        placeholder="Service" 
                        value={serviceFilter}
                        onChange={(e) => {setServiceFilter(e.target.value); setCurrentPage(0);}}
                        className="input-field w-32 text-sm hidden lg:block h-11"
                    />
                    
                    <div className="flex items-center space-x-2">
                        <input 
                            type="date" 
                            value={fromDate}
                            onChange={(e) => {setFromDate(e.target.value); setCurrentPage(0);}}
                            className="input-field w-36 text-sm h-11"
                            title="From Date"
                        />
                        <span className="text-text-muted text-[11px] font-semibold uppercase">to</span>
                        <input 
                            type="date" 
                            value={toDate}
                            onChange={(e) => {setToDate(e.target.value); setCurrentPage(0);}}
                            className="input-field w-36 text-sm h-11"
                            title="To Date"
                        />
                    </div>
                </div>
            </div>
            
            {/* Table */}
            <div className="card flex flex-col">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border-subtle">
                        <thead>
                            <tr>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card rounded-tl-[24px]">Reference</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Client details</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card hidden md:table-cell">Requirement</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Status</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card">Date</th>
                                <th className="px-6 py-4 text-center text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card rounded-tr-[24px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-bg-card divide-y divide-border-subtle/40">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#14B8A6]"></div>
                                            <span className="text-[13px] font-medium text-text-muted">Loading enquiries...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : enquiries.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-4">
                                            <div className="w-12 h-12 bg-bg-muted rounded-full flex items-center justify-center">
                                                <Inbox className="w-5 h-5 text-text-muted" />
                                            </div>
                                            <div>
                                                <p className="text-[14px] font-bold text-text-primary">No enquiries yet</p>
                                                <p className="text-[12px] text-text-muted mt-1 max-w-sm mx-auto">When enquiries arrive, they will appear here.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                enquiries.map((enq) => (
                                    <tr key={enq.id} className="hover:bg-bg-hover transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap text-[13px] font-bold text-text-primary align-top">
                                            {enq.referenceId}
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <div className="text-[13px] font-semibold text-text-primary leading-tight">{enq.fullName}</div>
                                            <div className="text-[12px] text-text-secondary mt-0.5">{enq.companyName || '—'}</div>
                                            <div className="md:hidden text-[12px] text-text-muted mt-2 pt-2 border-t border-border-subtle/50">
                                                <span className="block font-semibold">{enq.industrySector}</span>
                                                <span className="block mt-0.5">{enq.serviceRequired}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top hidden md:table-cell">
                                            <div className="text-[13px] text-text-primary">{enq.serviceRequired}</div>
                                            <div className="text-[11px] text-text-muted mt-1 uppercase tracking-wider font-semibold">{enq.industrySector}</div>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <div className="relative inline-block">
                                                <select
                                                    value={enq.status}
                                                    onChange={(e) => updateStatus(enq.id, e.target.value)}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    title="Change Status"
                                                >
                                                    <option value="NEW">NEW</option>
                                                    <option value="CONTACTED">CONTACTED</option>
                                                    <option value="QUOTED">QUOTED</option>
                                                    <option value="CONVERTED">CONVERTED</option>
                                                    <option value="CLOSED">CLOSED</option>
                                                </select>
                                                <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(enq.status)}`}>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5"></span>
                                                    {normalizeStatus(enq.status)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-[12px] text-text-muted font-medium align-top">
                                            {new Date(enq.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center align-top">
                                            <Link
                                                to={`/quotations/new/${enq.id}`}
                                                className="inline-flex items-center justify-center w-8 h-8 bg-bg-card hover:bg-bg-hover border border-border-subtle rounded-xl text-text-secondary hover:text-[#0D9488] transition-colors shadow-sm"
                                                title="Create Quotation"
                                            >
                                                <Plus className="w-4 h-4" />
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
                    <div className="px-6 py-4 border-t border-border-subtle/50 flex flex-col sm:flex-row items-center justify-between rounded-b-[24px]">
                        <p className="text-[12px] text-text-muted font-medium mb-4 sm:mb-0">
                            Showing <span className="font-bold text-text-primary">{totalElements === 0 ? 0 : currentPage * itemsPerPage + 1}</span> to <span className="font-bold text-text-primary">{Math.min((currentPage + 1) * itemsPerPage, totalElements)}</span> of <span className="font-bold text-text-primary">{totalElements}</span> results
                        </p>
                        <div className="flex space-x-2">
                            <button 
                                disabled={currentPage === 0}
                                onClick={() => setCurrentPage(p => p - 1)}
                                className="inline-flex items-center px-3 py-1.5 bg-bg-card hover:bg-bg-hover disabled:opacity-50 border border-border-subtle rounded-lg text-[12px] font-semibold text-text-primary transition-colors shadow-sm"
                            >
                                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                                Prev
                            </button>
                            <button 
                                disabled={currentPage >= totalPages - 1}
                                onClick={() => setCurrentPage(p => p + 1)}
                                className="inline-flex items-center px-3 py-1.5 bg-bg-card hover:bg-bg-hover disabled:opacity-50 border border-border-subtle rounded-lg text-[12px] font-semibold text-text-primary transition-colors shadow-sm"
                            >
                                Next
                                <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
