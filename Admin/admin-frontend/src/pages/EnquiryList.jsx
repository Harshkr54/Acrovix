import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { fetchApi } from '../services/api';
import { Link } from 'react-router-dom';
import { Search, Filter, Calendar, ChevronLeft, ChevronRight, Plus, Inbox, MoreHorizontal, AlertCircle, RefreshCw, Eye, Check, FileText } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';

export default function EnquiryList() {
    const [enquiries, setEnquiries] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [industryFilter, setIndustryFilter] = useState('');
    const [serviceFilter, setServiceFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [dateError, setDateError] = useState(null);
    
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const itemsPerPage = 10;
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Action menu state for enquiry row actions
    const [activeActionMenuId, setActiveActionMenuId] = useState(null);
    const [actionMenuPosition, setActionMenuPosition] = useState({});
    const actionMenuRef = useRef(null);

    // Enquiry detail modal state
    const [selectedEnquiry, setSelectedEnquiry] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Cache of active quotations per enquiry
    const [rowQuotationsMap, setRowQuotationsMap] = useState({});

    // Debounce search input to prevent firing API calls on every keystroke
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 350);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchEnquiries = useCallback(() => {
        // Validate date range if both dates are selected
        if (fromDate && toDate && fromDate > toDate) {
            setDateError("From Date cannot be later than To Date.");
            setIsLoading(false);
            return;
        } else {
            setDateError(null);
        }

        setIsLoading(true);
        let url = `/enquiries?page=${currentPage}&size=${itemsPerPage}`;
        if (debouncedSearch) url += `&search=${encodeURIComponent(debouncedSearch)}`;
        if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
        if (industryFilter) url += `&industry=${encodeURIComponent(industryFilter)}`;
        if (serviceFilter) url += `&service=${encodeURIComponent(serviceFilter)}`;
        if (fromDate) url += `&fromDate=${encodeURIComponent(fromDate + 'T00:00:00')}`;
        if (toDate) url += `&toDate=${encodeURIComponent(toDate + 'T23:59:59')}`;

        fetchApi(url)
            .then(data => {
                setEnquiries(data.content || []);
                setTotalPages(data.totalPages || 0);
                setTotalElements(data.totalElements || 0);
                setIsLoading(false);
                setError(null);
            })
            .catch(err => {
                console.error("Error fetching enquiries", err);
                setError(err.message);
                setIsLoading(false);
            });
    }, [currentPage, debouncedSearch, statusFilter, industryFilter, serviceFilter, fromDate, toDate]);

    useEffect(() => {
        fetchEnquiries();
    }, [fetchEnquiries]);

    // Click outside and Escape key listener for row action menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
                // Ignore clicks on the trigger button itself, which has the class 'action-menu-trigger'
                if (!event.target.closest('.action-menu-trigger')) {
                    setActiveActionMenuId(null);
                }
            }
        };
        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setActiveActionMenuId(null);
            }
        };
        
        const handleScroll = () => {
            if (activeActionMenuId) {
                setActiveActionMenuId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        window.addEventListener('scroll', handleScroll, true); // Use capture to catch scrolling inside divs
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [activeActionMenuId]);

    const updateStatus = async (id, status) => {
        try {
            await fetchApi(`/enquiries/${id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status })
            });
            window.dispatchEvent(new Event('notification-update'));
            fetchEnquiries();
        } catch (error) {
            console.error(error);
            alert(error.message || "Failed to update status");
        }
    };

    const handleOpenEnquiry = (enq) => {
        setSelectedEnquiry(enq);
        setIsDetailModalOpen(true);
    };

    const handleToggleActionMenu = (e, enqId) => {
        e.stopPropagation();
        if (activeActionMenuId === enqId) {
            setActiveActionMenuId(null);
        } else {
            const rect = e.currentTarget.getBoundingClientRect();
            const dropdownWidth = 208; // 13rem (w-52)
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            
            const position = {
                position: 'fixed',
                zIndex: 9999,
                left: Math.max(16, rect.right - dropdownWidth)
            };
            
            if (spaceBelow < 280 && spaceAbove > spaceBelow) {
                // Open upwards
                position.bottom = window.innerHeight - rect.top + 8;
            } else {
                // Open downwards
                position.top = rect.bottom + 8;
            }
            
            setActionMenuPosition(position);
            setActiveActionMenuId(enqId);
            
            if (!rowQuotationsMap[enqId]) {
                fetchApi(`/quotations/enquiry/${enqId}`)
                    .then(data => {
                        setRowQuotationsMap(prev => ({
                            ...prev,
                            [enqId]: Array.isArray(data) ? data : []
                        }));
                    })
                    .catch(err => {
                        console.error("Failed to fetch quotations for enquiry", err);
                        setRowQuotationsMap(prev => ({ ...prev, [enqId]: [] }));
                    });
            }
        }
    };

    const normalizeStatus = (rawStatus) => {
        if (!rawStatus) return 'NEW';
        const upper = String(rawStatus).toUpperCase();
        return ['NEW', 'CONTACTED', 'QUOTED', 'CONVERTED', 'CLOSED'].includes(upper) ? upper : 'UNKNOWN';
    };

    const getStatusLabel = (rawStatus) => {
        const status = normalizeStatus(rawStatus);
        switch(status) {
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
            <PageHeader 
                title="Enquiries" 
                subtitle="Manage and track incoming business enquiries." 
            />
            
            {/* Date Validation Error Banner */}
            {dateError && (
                <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl flex items-center gap-2 text-[13px] font-medium text-[#DC2626]">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{dateError}</span>
                </div>
            )}

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
                            className={`input-field w-36 text-sm h-11 ${dateError ? 'border-[#DC2626]' : ''}`}
                            title="From Date"
                        />
                        <span className="text-text-muted text-[11px] font-semibold uppercase">to</span>
                        <input 
                            type="date" 
                            value={toDate}
                            onChange={(e) => {setToDate(e.target.value); setCurrentPage(0);}}
                            className={`input-field w-36 text-sm h-11 ${dateError ? 'border-[#DC2626]' : ''}`}
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
                            {error ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-4 max-w-sm mx-auto">
                                            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-1">
                                                <AlertCircle className="w-6 h-6 text-red-500" />
                                            </div>
                                            <p className="text-[15px] font-bold text-text-primary">Failed to load enquiries</p>
                                            <p className="text-[13px] text-text-secondary leading-relaxed">{error}</p>
                                            <button onClick={fetchEnquiries} className="btn-primary mt-2">
                                                <RefreshCw className="w-4 h-4 mr-2" />
                                                Retry
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : isLoading ? (
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
                                    <tr 
                                        key={enq.id} 
                                        onDoubleClick={() => handleOpenEnquiry(enq)}
                                        className="hover:bg-bg-hover transition-colors group cursor-pointer select-none"
                                        title="Double-click to open enquiry details"
                                    >
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
                                        <td className="px-6 py-4 align-top" onClick={(e) => e.stopPropagation()}>
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
                                                    {getStatusLabel(enq.status)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-[12px] text-text-muted font-medium align-top">
                                            {new Date(enq.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center align-top relative" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => handleToggleActionMenu(e, enq.id)}
                                                className={`action-menu-trigger p-1.5 rounded-lg border transition-all ${
                                                    activeActionMenuId === enq.id
                                                        ? 'bg-[#EEF2FF] border-[#818CF8] text-[#4F46E5] dark:bg-[#312E81]/30 dark:border-[#6366F1] dark:text-[#818CF8] shadow-sm'
                                                        : 'bg-bg-card border-border-subtle text-text-secondary hover:text-text-primary hover:shadow-sm'
                                                }`}
                                                title="More actions"
                                                aria-label="More actions"
                                            >
                                                <MoreHorizontal className="w-4 h-4 pointer-events-none" />
                                            </button>

                                            {activeActionMenuId === enq.id && createPortal(
                                                <div
                                                    ref={actionMenuRef}
                                                    style={actionMenuPosition}
                                                    className="w-52 bg-bg-card rounded-2xl shadow-xl border border-border-subtle p-2 animate-in fade-in-50 zoom-in-95 duration-150 text-left"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {/* OPEN SECTION */}
                                                    <div className="px-3 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">
                                                        Open
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setActiveActionMenuId(null);
                                                            handleOpenEnquiry(enq);
                                                        }}
                                                        className="flex items-center w-full px-3 py-2 text-xs font-semibold text-text-primary hover:bg-bg-hover rounded-xl transition-colors"
                                                    >
                                                        <Eye className="w-3.5 h-3.5 mr-2 text-[#4F46E5]" />
                                                        Open Enquiry
                                                    </button>

                                                    <div className="my-1 border-t border-border-subtle"></div>

                                                    {/* QUOTATION SECTION */}
                                                    <div className="px-3 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">
                                                        Quotation
                                                    </div>
                                                    <Link
                                                        to={`/quotations/new/${enq.id}`}
                                                        onClick={() => setActiveActionMenuId(null)}
                                                        className="flex items-center w-full px-3 py-2 text-xs font-semibold text-text-primary hover:bg-bg-hover rounded-xl transition-colors"
                                                    >
                                                        <Plus className="w-3.5 h-3.5 mr-2 text-[#059669]" />
                                                        Create Quotation
                                                    </Link>

                                                    {rowQuotationsMap[enq.id] && rowQuotationsMap[enq.id].length > 0 && (
                                                        rowQuotationsMap[enq.id].length === 1 ? (
                                                            <Link
                                                                to={`/quotations/edit/${rowQuotationsMap[enq.id][0].id}`}
                                                                onClick={() => setActiveActionMenuId(null)}
                                                                className="flex items-center w-full px-3 py-2 text-xs font-semibold text-text-primary hover:bg-bg-hover rounded-xl transition-colors"
                                                            >
                                                                <FileText className="w-3.5 h-3.5 mr-2 text-[#7C3AED]" />
                                                                Open Quotation
                                                            </Link>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setActiveActionMenuId(null);
                                                                    handleOpenEnquiry(enq);
                                                                }}
                                                                className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-text-primary hover:bg-bg-hover rounded-xl transition-colors"
                                                            >
                                                                <span className="flex items-center">
                                                                    <FileText className="w-3.5 h-3.5 mr-2 text-[#7C3AED]" />
                                                                    Open Quotation
                                                                </span>
                                                                <span className="text-[10px] bg-[#F5F3FF] text-[#7C3AED] px-1.5 py-0.5 rounded-full font-bold">
                                                                    {rowQuotationsMap[enq.id].length}
                                                                </span>
                                                            </button>
                                                        )
                                                    )}

                                                    <div className="my-1 border-t border-border-subtle"></div>

                                                    {/* UPDATE STATUS SECTION */}
                                                    <div className="px-3 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">
                                                        Update Status
                                                    </div>

                                                    {['NEW', 'CONTACTED', 'QUOTED', 'CONVERTED', 'CLOSED'].map((st) => (
                                                        <button
                                                            key={st}
                                                            type="button"
                                                            onClick={() => {
                                                                setActiveActionMenuId(null);
                                                                updateStatus(enq.id, st);
                                                            }}
                                                            className={`flex items-center justify-between w-full px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                                                normalizeStatus(enq.status) === st
                                                                    ? 'bg-[#EEF2FF] text-[#4F46E5] font-bold dark:bg-[#312E81]/30'
                                                                    : 'text-text-secondary hover:bg-bg-hover font-medium'
                                                            }`}
                                                        >
                                                            <span className="flex items-center">
                                                                <span className={`w-1.5 h-1.5 rounded-full mr-2 ${getStatusStyle(st).replace('text-', 'bg-')}`} />
                                                                {getStatusLabel(st)}
                                                            </span>
                                                            {normalizeStatus(enq.status) === st && (
                                                                <Check className="w-3.5 h-3.5 text-[#4F46E5]" />
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>,
                                                document.body
                                            )}
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

            {/* Enquiry Detail Modal */}
            <EnquiryDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                enquiry={selectedEnquiry}
                onStatusUpdate={fetchEnquiries}
            />
        </div>
    );
}

