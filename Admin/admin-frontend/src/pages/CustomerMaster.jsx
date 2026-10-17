import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Users, Plus, Search, Building2, Mail, Phone, Eye, Edit3, Trash2, Power, Ban,
    RotateCcw, Calendar, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, 
    Table, LayoutGrid, AlertCircle, RefreshCw, X, ShieldAlert, MoreVertical, CreditCard,
    AlertTriangle, ShieldCheck
} from 'lucide-react';
import { 
    getCustomers, createCustomer, updateCustomer, deleteCustomer, activateCustomer,
    bulkUpdateCustomerStatus, getNextCustomerCode 
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import GstinAutoLookup from '../components/GstinAutoLookup';
import { GST_STATES, GST_STATE_MAP, formatStateDisplay, searchGstStates } from '../utils/gstStateUtils';
import ConfirmDialog from '../components/ui/ConfirmDialog';

// Deterministic initials & colors for customer avatars
const getInitials = (name, company) => {
    const target = (name || company || 'C').trim();
    const parts = target.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return target.substring(0, 2).toUpperCase();
};

const getAvatarColor = (str) => {
    const colors = [
        'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
        'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
        'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
    ];
    let hash = 0;
    for (let i = 0; i < (str || '').length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};

/** Searchable dropdown component for standard GST states */
function GstStateDropdown({ value, onChange, disabled }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef(null);

    const filteredStates = useMemo(() => {
        return searchGstStates(searchQuery);
    }, [searchQuery]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={`acx-input rounded-xl text-[13px] bg-bg-main h-10 w-full flex items-center justify-between px-3 text-left ${
                    disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-brand-teal/50'
                }`}
            >
                <span className={`truncate font-medium ${value ? 'text-text-primary' : 'text-text-muted'}`}>
                    {value || 'Select State / GST State Code'}
                </span>
                <ChevronDown className={`w-4 h-4 text-text-muted transition-transform shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-bg-surface border border-border-light rounded-xl shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-border-light/50 bg-bg-main">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="text"
                                autoFocus
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search state name or code..."
                                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-bg-surface border border-border-light text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-teal"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-56 overflow-y-auto divide-y divide-border-light/20 py-1">
                        {filteredStates.length > 0 ? (
                            filteredStates.map((st) => {
                                const formatted = `${st.code} - ${st.name}`;
                                const isSelected = value === formatted || value?.startsWith(`${st.code} -`);
                                return (
                                    <button
                                        key={st.code}
                                        type="button"
                                        onClick={() => {
                                            onChange(formatted);
                                            setIsOpen(false);
                                            setSearchQuery('');
                                        }}
                                        className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-brand-teal/10 transition-colors ${
                                            isSelected ? 'bg-brand-teal/15 text-brand-teal font-bold' : 'text-text-primary'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-semibold px-1.5 py-0.5 rounded bg-bg-main border border-border-light text-[11px] text-text-secondary">
                                                {st.code}
                                            </span>
                                            <span>{st.name}</span>
                                        </div>
                                        {isSelected && <span className="text-brand-teal font-bold text-xs">✓</span>}
                                    </button>
                                );
                            })
                        ) : (
                            <div className="p-3 text-center text-xs text-text-muted">
                                No matching states found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function CustomerMaster() {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();

    // View state: 'table' (Design 1 - default) or 'card' (Design 2)
    const [viewMode, setViewMode] = useState('table');

    // Data & Pagination State
    const [customers, setCustomers] = useState([]);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter & Search State
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'ACTIVE', 'INACTIVE'
    const [currencyFilter, setCurrencyFilter] = useState('ALL'); // 'ALL', 'INR', 'USD'
    const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL', 'TODAY', 'THIS_WEEK', 'THIS_MONTH', 'LAST_30_DAYS'

    // Selection & Bulk Action State
    const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
    const [isBulkLoading, setIsBulkLoading] = useState(false);
    const [bulkModal, setBulkModal] = useState(null); // { action: 'activate' | 'deactivate' | 'delete', count: number, ids: [] }
    const [bulkFeedback, setBulkFeedback] = useState(null); // { type: 'success' | 'warning' | 'error', message: string, details?: [] }
    const headerCheckboxRef = useRef(null);

    // Horizontal Scrollbar State & Refs
    const tableContainerRef = useRef(null);
    const scrollTrackRef = useRef(null);
    const [scrollMetrics, setScrollMetrics] = useState({
        scrollLeft: 0,
        scrollWidth: 0,
        clientWidth: 0
    });
    const isDraggingThumbRef = useRef(false);
    const dragStartXRef = useRef(0);
    const dragStartScrollLeftRef = useRef(0);

    const [sortField, setSortField] = useState('createdAt');
    const [sortDirection, setSortDirection] = useState('desc');
    const [activeActionMenuId, setActiveActionMenuId] = useState(null);

    // Form Drawer / Modal State
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isManualCodeEdit, setIsManualCodeEdit] = useState(false);
    const [isFetchingCode, setIsFetchingCode] = useState(false);
    const [formData, setFormData] = useState({
        customerCode: '',
        name: '',
        companyName: '',
        email: '',
        phone: '',
        alternatePhone: '',
        gstin: '',
        pan: '',
        state: '',
        currency: 'INR',
        billingAddress: '',
        shippingAddress: '',
        paymentTerms: '',
        creditLimit: ''
    });

    // Smart Auto-Selection of State via GSTIN
    useEffect(() => {
        if (!formData.gstin) return;
        const trimmed = formData.gstin.trim().toUpperCase();
        if (trimmed.length >= 2) {
            const stateCode = trimmed.substring(0, 2);
            if (/^[0-9]{2}$/.test(stateCode) && GST_STATE_MAP[stateCode]) {
                const autoState = `${stateCode} - ${GST_STATE_MAP[stateCode]}`;
                if (formData.state !== autoState) {
                    setFormData(prev => ({ ...prev, state: autoState }));
                }
            }
        }
    }, [formData.gstin]);

    // Debounce search input
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchInput);
            setPage(0); // reset to page 0 on new search
        }, 300);
        return () => clearTimeout(handler);
    }, [searchInput]);

    // Compute Date Range for ISO filtering
    const dateRangeParams = useMemo(() => {
        if (dateFilter === 'ALL') return {};
        const now = new Date();
        const start = new Date();

        if (dateFilter === 'TODAY') {
            start.setHours(0, 0, 0, 0);
        } else if (dateFilter === 'THIS_WEEK') {
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1);
            start.setDate(diff);
            start.setHours(0, 0, 0, 0);
        } else if (dateFilter === 'THIS_MONTH') {
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
        } else if (dateFilter === 'LAST_30_DAYS') {
            start.setDate(start.getDate() - 30);
            start.setHours(0, 0, 0, 0);
        }

        return {
            fromDate: start.toISOString(),
            toDate: now.toISOString()
        };
    }, [dateFilter]);

    // Fetch Customers from backend API
    const fetchCustomersList = useCallback(() => {
        setIsLoading(true);
        setError(null);

        const params = {
            page,
            size: pageSize
        };

        if (debouncedSearch.trim()) {
            params.search = debouncedSearch.trim();
        }

        if (statusFilter === 'ACTIVE') {
            params.active = true;
        } else if (statusFilter === 'INACTIVE') {
            params.active = false;
        }

        if (currencyFilter !== 'ALL') {
            params.currency = currencyFilter;
        }

        if (dateRangeParams.fromDate) {
            params.fromDate = dateRangeParams.fromDate;
            params.toDate = dateRangeParams.toDate;
        }

        getCustomers(params)
            .then(data => {
                setCustomers(data.content || []);
                setTotalElements(data.totalElements || (data.content ? data.content.length : 0));
                setTotalPages(data.totalPages || 1);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Error fetching customers", err);
                setError(err.message || "Failed to load customers.");
                setIsLoading(false);
            });
    }, [page, pageSize, debouncedSearch, statusFilter, currencyFilter, dateRangeParams]);

    useEffect(() => {
        fetchCustomersList();
    }, [fetchCustomersList]);

    // Reset All Filters
    const handleResetFilters = () => {
        setSearchInput('');
        setDebouncedSearch('');
        setStatusFilter('ALL');
        setCurrencyFilter('ALL');
        setDateFilter('ALL');
        setPage(0);
        setSelectedCustomerIds([]);
    };

    // Sort Handler (client-side sort for current page records)
    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedCustomers = useMemo(() => {
        if (!sortField) return customers;
        return [...customers].sort((a, b) => {
            let aVal = a[sortField] || '';
            let bVal = b[sortField] || '';
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();
            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [customers, sortField, sortDirection]);

    // Clear selection on page or filter change
    useEffect(() => {
        setSelectedCustomerIds([]);
    }, [page, pageSize, debouncedSearch, statusFilter, currencyFilter, dateFilter]);

    // Checkbox selection handlers
    const isAllSelected = useMemo(() => {
        return customers.length > 0 && selectedCustomerIds.length === customers.length;
    }, [customers, selectedCustomerIds]);

    const isSomeSelected = useMemo(() => {
        return selectedCustomerIds.length > 0 && !isAllSelected;
    }, [selectedCustomerIds, isAllSelected]);

    // Synchronize indeterminate state on the table header checkbox
    useEffect(() => {
        if (headerCheckboxRef.current) {
            headerCheckboxRef.current.indeterminate = isSomeSelected;
        }
    }, [isSomeSelected]);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedCustomerIds(customers.map(c => c.id));
        } else {
            setSelectedCustomerIds([]);
        }
    };

    const handleSelectOne = (id) => {
        setSelectedCustomerIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // Selected items breakdown for bulk actions
    const selectedCustomersList = useMemo(() => {
        return customers.filter(c => selectedCustomerIds.includes(c.id));
    }, [customers, selectedCustomerIds]);

    const activeSelectedCount = useMemo(() => {
        return selectedCustomersList.filter(c => c.active).length;
    }, [selectedCustomersList]);

    const inactiveSelectedCount = useMemo(() => {
        return selectedCustomersList.filter(c => !c.active).length;
    }, [selectedCustomersList]);

    const handleOpenBulkModal = (action) => {
        if (action === 'activate') {
            const idsToActivate = selectedCustomersList.filter(c => !c.active).map(c => c.id);
            setBulkModal({
                action: 'activate',
                count: idsToActivate.length,
                ids: idsToActivate
            });
        } else if (action === 'deactivate') {
            const idsToDeactivate = selectedCustomersList.filter(c => c.active).map(c => c.id);
            setBulkModal({
                action: 'deactivate',
                count: idsToDeactivate.length,
                ids: idsToDeactivate
            });
        } else if (action === 'delete') {
            setBulkModal({
                action: 'delete',
                count: selectedCustomerIds.length,
                ids: selectedCustomerIds
            });
        }
    };

    const handleExecuteBulkAction = async () => {
        if (!bulkModal || bulkModal.action === 'delete') {
            setBulkModal(null);
            return;
        }

        setIsBulkLoading(true);
        setBulkFeedback(null);

        const isActive = bulkModal.action === 'activate';
        try {
            const res = await bulkUpdateCustomerStatus({
                customerIds: bulkModal.ids,
                active: isActive
            });

            if (res.failureCount > 0) {
                setBulkFeedback({
                    type: 'warning',
                    message: `Operation completed with notes: ${res.successCount} of ${res.totalRequested} updated. ${res.failureCount} customer(s) could not be modified.`,
                    details: res.failures || []
                });
            } else {
                setBulkFeedback({
                    type: 'success',
                    message: `Successfully ${isActive ? 'activated' : 'deactivated'} ${res.successCount} customer(s).`
                });
            }

            setSelectedCustomerIds([]);
            fetchCustomersList();
        } catch (err) {
            setBulkFeedback({
                type: 'error',
                message: err.message || `Failed to ${bulkModal.action} selected customers.`
            });
        } finally {
            setIsBulkLoading(false);
            setBulkModal(null);
        }
    };

    // Horizontal Scrolling metrics & synchronization
    const updateScrollMetrics = useCallback(() => {
        if (tableContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = tableContainerRef.current;
            setScrollMetrics({ scrollLeft, scrollWidth, clientWidth });
        }
    }, []);

    useEffect(() => {
        const el = tableContainerRef.current;
        if (!el) return;

        updateScrollMetrics();

        const handleScroll = () => {
            updateScrollMetrics();
        };

        el.addEventListener('scroll', handleScroll, { passive: true });

        // Wheel listener for horizontal scroll or Shift + wheel
        const handleWheel = (e) => {
            if (e.shiftKey) {
                if (el.scrollWidth > el.clientWidth) {
                    el.scrollLeft += e.deltaY;
                    e.preventDefault();
                }
            }
        };
        el.addEventListener('wheel', handleWheel, { passive: false });

        const ro = new ResizeObserver(() => {
            updateScrollMetrics();
        });
        ro.observe(el);

        return () => {
            el.removeEventListener('scroll', handleScroll);
            el.removeEventListener('wheel', handleWheel);
            ro.disconnect();
        };
    }, [updateScrollMetrics, sortedCustomers, viewMode]);

    const isTableOverflowing = scrollMetrics.scrollWidth > scrollMetrics.clientWidth + 2;
    const maxTableScroll = Math.max(1, scrollMetrics.scrollWidth - scrollMetrics.clientWidth);

    const handleScrollStep = (delta) => {
        if (tableContainerRef.current) {
            tableContainerRef.current.scrollBy({ left: delta, behavior: 'smooth' });
        }
    };

    const handleTrackClick = (e) => {
        if (!scrollTrackRef.current || !tableContainerRef.current) return;
        const rect = scrollTrackRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const trackWidth = rect.width;
        const targetRatio = Math.max(0, Math.min(1, clickX / trackWidth));
        tableContainerRef.current.scrollTo({
            left: targetRatio * maxTableScroll,
            behavior: 'smooth'
        });
    };

    const handleThumbMouseDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        isDraggingThumbRef.current = true;
        dragStartXRef.current = e.clientX;
        dragStartScrollLeftRef.current = tableContainerRef.current ? tableContainerRef.current.scrollLeft : 0;

        document.body.style.userSelect = 'none';

        const onMouseMove = (moveEvent) => {
            if (!isDraggingThumbRef.current || !tableContainerRef.current || !scrollTrackRef.current) return;
            const deltaX = moveEvent.clientX - dragStartXRef.current;
            const trackWidth = scrollTrackRef.current.clientWidth;
            const thumbWidth = Math.max(48, (scrollMetrics.clientWidth / scrollMetrics.scrollWidth) * trackWidth);
            const scrollableTrackSpace = Math.max(1, trackWidth - thumbWidth);
            const scrollDelta = (deltaX / scrollableTrackSpace) * maxTableScroll;
            tableContainerRef.current.scrollLeft = dragStartScrollLeftRef.current + scrollDelta;
        };

        const onMouseUp = () => {
            isDraggingThumbRef.current = false;
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    // Form handlers
    const resetForm = () => {
        setFormData({
            customerCode: '',
            name: '',
            companyName: '',
            email: '',
            phone: '',
            alternatePhone: '',
            gstin: '',
            pan: '',
            state: '',
            currency: 'INR',
            billingAddress: '',
            shippingAddress: '',
            paymentTerms: '',
            creditLimit: ''
        });
        setEditingId(null);
        setShowForm(false);
        setIsManualCodeEdit(false);
        setIsFetchingCode(false);
    };

    const openAddCustomerModal = async () => {
        resetForm();
        setShowForm(true);
        setIsManualCodeEdit(false);
        setIsFetchingCode(true);
        try {
            const res = await getNextCustomerCode();
            if (res && res.customerCode) {
                setFormData(prev => ({ ...prev, customerCode: res.customerCode }));
            }
        } catch (err) {
            console.error("Failed to fetch next customer code", err);
            setFormData(prev => ({ ...prev, customerCode: prev.customerCode || 'CUST-001' }));
        } finally {
            setIsFetchingCode(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (editingId) {
                await updateCustomer(editingId, formData);
            } else {
                await createCustomer(formData);
            }
            fetchCustomersList();
            resetForm();
        } catch (err) {
            alert(err.message || "Failed to save customer.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (customer) => {
        setFormData({
            customerCode: customer.customerCode || '',
            name: customer.name || '',
            companyName: customer.companyName || '',
            email: customer.email || '',
            phone: customer.phone || '',
            alternatePhone: customer.alternatePhone || '',
            gstin: customer.gstin || '',
            pan: customer.pan || '',
            state: customer.state || '',
            currency: customer.currency || 'INR',
            billingAddress: customer.billingAddress || '',
            shippingAddress: customer.shippingAddress || '',
            paymentTerms: customer.paymentTerms || '',
            creditLimit: customer.creditLimit || ''
        });
        setEditingId(customer.id);
        setIsManualCodeEdit(false);
        setIsFetchingCode(false);
        setShowForm(true);
        setActiveActionMenuId(null);
    };

    const [customerStatusTarget, setCustomerStatusTarget] = useState(null);
    const [isTogglingStatus, setIsTogglingStatus] = useState(false);

    const toggleStatus = (id, currentStatus, name) => {
        setCustomerStatusTarget({ id, currentStatus, name: name || 'this customer' });
        setActiveActionMenuId(null);
    };

    const handleConfirmCustomerStatus = async () => {
        if (!customerStatusTarget) return;
        const { id, currentStatus } = customerStatusTarget;
        setIsTogglingStatus(true);
        try {
            if (currentStatus) {
                await deleteCustomer(id);
            } else {
                await activateCustomer(id);
            }
            fetchCustomersList();
            setCustomerStatusTarget(null);
        } catch (err) {
            alert(err.message || 'Failed to update customer status.');
        } finally {
            setIsTogglingStatus(false);
            setActiveActionMenuId(null);
        }
    };

    // Close 3-dots action menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActiveActionMenuId(null);
        if (activeActionMenuId !== null) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [activeActionMenuId]);

    // Authorization Guard
    if (!['SUPER_ADMIN', 'SALES'].includes(currentUser?.role)) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh]">
                <div className="acx-card p-8 text-center max-w-md w-full border-t-4 border-[#DC2626]">
                    <div className="w-16 h-16 bg-brand-danger/10 border border-brand-danger/30 mx-auto rounded-[20px] flex items-center justify-center mb-6 shadow-sm">
                        <ShieldAlert className="w-8 h-8 text-brand-danger" />
                    </div>
                    <h2 className="text-[20px] font-bold text-text-primary mb-2 tracking-tight">Unauthorized Access</h2>
                    <p className="text-[13px] text-text-secondary">You do not have permission to view customers.</p>
                </div>
            </div>
        );
    }

    // Pagination calculations
    const startRecord = totalElements === 0 ? 0 : page * pageSize + 1;
    const endRecord = Math.min((page + 1) * pageSize, totalElements);

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
            
            {/* Header: Clean responsive header with Title & Add Customer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-[24px] sm:text-[28px] font-bold text-text-primary tracking-tight leading-tight">
                            {viewMode === 'card' ? 'Customers (Card View)' : 'Customers'}
                        </h1>
                        <p className="text-[13px] text-text-secondary mt-0.5">
                            Manage customer database and billing information.
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => {
                        if (showForm) resetForm();
                        else openAddCustomerModal();
                    }}
                    className="btn btn-primary btn-md shrink-0 shadow-sm self-start sm:self-auto"
                >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add Customer
                </button>
            </div>

            {/* Filter Bar Card: Search, Status, Currency, Date, Reset & View Toggle */}
            <div className="acx-card p-3 sm:p-4 rounded-2xl shadow-sm border border-border-subtle bg-bg-card">
                <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 sm:gap-4">
                    
                    {/* Left: Search & Filter Controls */}
                    <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                        {/* Search Input */}
                        <div className="relative flex-1 min-w-[240px] max-w-full md:max-w-[340px]">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                            <input
                                type="text"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="Search by name, code, company, GSTIN, email or phone..."
                                className="acx-input pl-9 pr-8 text-[13px] h-10 rounded-xl w-full bg-bg-main"
                            />
                            {searchInput && (
                                <button
                                    onClick={() => setSearchInput('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Status Filter */}
                        <div className="relative shrink-0">
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setPage(0);
                                }}
                                className="acx-input pr-8 text-[13px] h-10 rounded-xl bg-bg-main font-medium cursor-pointer appearance-none pl-3"
                            >
                                <option value="ALL">All Status</option>
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                        </div>

                        {/* Currency Filter */}
                        <div className="relative shrink-0">
                            <select
                                value={currencyFilter}
                                onChange={(e) => {
                                    setCurrencyFilter(e.target.value);
                                    setPage(0);
                                }}
                                className="acx-input pr-8 text-[13px] h-10 rounded-xl bg-bg-main font-medium cursor-pointer appearance-none pl-3"
                            >
                                <option value="ALL">All Currency</option>
                                <option value="INR">INR (₹)</option>
                                <option value="USD">USD ($)</option>
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                        </div>

                        {/* Created Date Filter */}
                        <div className="relative shrink-0 flex items-center">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                            <select
                                value={dateFilter}
                                onChange={(e) => {
                                    setDateFilter(e.target.value);
                                    setPage(0);
                                }}
                                className="acx-input pl-8 pr-8 text-[13px] h-10 rounded-xl bg-bg-main font-medium cursor-pointer appearance-none"
                            >
                                <option value="ALL">Created Date</option>
                                <option value="TODAY">Today</option>
                                <option value="THIS_WEEK">This Week</option>
                                <option value="THIS_MONTH">This Month</option>
                                <option value="LAST_30_DAYS">Last 30 Days</option>
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                        </div>

                        {/* Reset Button */}
                        {(searchInput || statusFilter !== 'ALL' || currencyFilter !== 'ALL' || dateFilter !== 'ALL') && (
                            <button
                                onClick={handleResetFilters}
                                className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-text-secondary hover:text-text-primary rounded-xl border border-border-subtle bg-bg-main hover:bg-bg-hover transition-colors shrink-0 h-10"
                            >
                                <RotateCcw className="w-3.5 h-3.5 text-text-muted" />
                                Reset
                            </button>
                        )}
                    </div>

                    {/* Right: Table / Card View Toggle (Design 1 & 2 only) */}
                    <div className="flex items-center self-end xl:self-auto bg-bg-main p-1 rounded-xl border border-border-subtle shrink-0">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                                viewMode === 'table'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-text-secondary hover:text-text-primary'
                            }`}
                        >
                            <Table className="w-4 h-4" />
                            Table View
                        </button>
                        <button
                            onClick={() => setViewMode('card')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                                viewMode === 'card'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-text-secondary hover:text-text-primary'
                            }`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            Card View
                        </button>
                    </div>

                </div>
            </div>

            {/* Customer Form Modal / Drawer */}
            {showForm && (
                <div className="acx-card p-6 border border-brand-teal/20 mb-6 relative overflow-hidden bg-bg-card shadow-md rounded-2xl">
                    <div className="absolute top-4 right-4">
                        <button onClick={resetForm} className="btn btn-ghost btn-icon text-text-muted">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <h2 className="text-[17px] font-bold text-text-primary mb-5 flex items-center tracking-tight">
                        <Users className="w-5 h-5 text-brand-teal mr-2" />
                        {editingId ? 'Edit Customer' : 'Add New Customer'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                        Customer Code
                                        {!editingId && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                                                Auto-Generated
                                            </span>
                                        )}
                                    </label>
                                    {!editingId && (
                                        <button
                                            type="button"
                                            onClick={() => setIsManualCodeEdit(!isManualCodeEdit)}
                                            className="text-[11px] font-semibold text-brand-teal hover:underline flex items-center gap-1"
                                            title={isManualCodeEdit ? "Lock back to auto-generated mode" : "Edit customer code manually"}
                                        >
                                            {isManualCodeEdit ? 'Auto Mode' : 'Edit Manually'}
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <input
                                        required
                                        type="text"
                                        value={formData.customerCode}
                                        onChange={e => setFormData({...formData, customerCode: e.target.value})}
                                        className={`acx-input rounded-xl text-[13px] h-10 w-full font-mono font-bold ${
                                            (editingId !== null || !isManualCodeEdit)
                                                ? 'bg-bg-subtle/80 cursor-default text-text-primary border-border-subtle'
                                                : 'bg-bg-main'
                                        }`}
                                        placeholder="e.g. CUST-001"
                                        readOnly={editingId !== null || !isManualCodeEdit}
                                        disabled={editingId !== null}
                                    />
                                    {isFetchingCode && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-text-muted" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
                                    Contact / Full Name
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    className="acx-input rounded-xl text-[13px] bg-bg-main h-10 w-full"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
                                    Company Name
                                </label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                                    <input
                                        type="text"
                                        value={formData.companyName}
                                        onChange={e => setFormData({...formData, companyName: e.target.value})}
                                        className="acx-input pl-9 rounded-xl text-[13px] bg-bg-main h-10 w-full"
                                        placeholder="Acme Solutions Pvt Ltd"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                                    <input
                                        required
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({...formData, email: e.target.value})}
                                        className="acx-input pl-9 rounded-xl text-[13px] bg-bg-main h-10 w-full"
                                        placeholder="contact@company.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
                                    Phone Number
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={e => setFormData({...formData, phone: e.target.value})}
                                        className="acx-input pl-9 rounded-xl text-[13px] bg-bg-main h-10 w-full"
                                        placeholder="9876543210"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
                                    GSTIN
                                </label>
                                <GstinAutoLookup
                                    value={formData.gstin}
                                    onChange={(val) => setFormData(prev => ({ ...prev, gstin: val }))}
                                    isExistingCustomer={Boolean(editingId && formData.gstin)}
                                    onVerified={(data) => {
                                        setFormData(prev => ({
                                            ...prev,
                                            companyName: data.legalName || prev.companyName,
                                            billingAddress: data.billingAddress || prev.billingAddress,
                                            state: formatStateDisplay(data.state, data.gstin) || prev.state,
                                        }));
                                    }}
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
                                    State Code – State Name
                                </label>
                                <GstStateDropdown
                                    value={formData.state}
                                    onChange={(val) => setFormData(prev => ({ ...prev, state: val }))}
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
                                    Default Billing Currency
                                </label>
                                <select
                                    value={formData.currency}
                                    onChange={e => setFormData({...formData, currency: e.target.value})}
                                    className="acx-input rounded-xl text-[13px] bg-bg-main h-10 cursor-pointer font-semibold w-full"
                                >
                                    <option value="INR">INR (₹)</option>
                                    <option value="USD">USD ($)</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
                                    Billing Address
                                </label>
                                <textarea
                                    value={formData.billingAddress}
                                    onChange={e => setFormData({...formData, billingAddress: e.target.value})}
                                    className="acx-input rounded-xl text-[13px] bg-bg-main min-h-[70px] p-2.5 w-full"
                                    placeholder="Enter billing address..."
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
                                    Shipping Address
                                </label>
                                <textarea
                                    value={formData.shippingAddress}
                                    onChange={e => setFormData({...formData, shippingAddress: e.target.value})}
                                    className="acx-input rounded-xl text-[13px] bg-bg-main min-h-[70px] p-2.5 w-full"
                                    placeholder="Enter shipping address..."
                                />
                            </div>
                        </div>
                        <div className="pt-2 flex justify-end gap-3">
                            <button type="button" onClick={resetForm} className="btn btn-secondary btn-md">
                                Cancel
                            </button>
                            <button type="submit" disabled={isSaving} className="btn btn-primary btn-md">
                                {isSaving ? 'Saving...' : editingId ? 'Update Customer' : 'Save Customer'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Bulk Feedback Banner */}
            {bulkFeedback && (
                <div className={`p-4 rounded-2xl border flex items-start gap-3 animate-fadeIn ${
                    bulkFeedback.type === 'success'
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800/50 dark:text-emerald-300'
                        : bulkFeedback.type === 'warning'
                        ? 'bg-amber-50/80 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800/50 dark:text-amber-300'
                        : 'bg-red-50/80 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800/50 dark:text-red-300'
                }`}>
                    {bulkFeedback.type === 'success' ? (
                        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 text-[13px]">
                        <p className="font-semibold">{bulkFeedback.message}</p>
                        {bulkFeedback.details && bulkFeedback.details.length > 0 && (
                            <ul className="mt-1.5 space-y-1 list-disc list-inside text-[12px] opacity-90">
                                {bulkFeedback.details.map((f, idx) => (
                                    <li key={idx}>Customer ID {f.customerId}: {f.reason}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setBulkFeedback(null)}
                        className="text-text-muted hover:text-text-primary p-1 rounded-lg"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Bulk Action Toolbar */}
            {selectedCustomerIds.length > 0 && (
                <div className="bg-white dark:bg-bg-card px-4 py-3 rounded-2xl border border-border-subtle shadow-xs flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
                    <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center justify-center min-w-[24px] h-[24px] px-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs shadow-xs shrink-0">
                            {selectedCustomerIds.length}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[13px] font-bold text-text-primary">
                                {selectedCustomerIds.length} {selectedCustomerIds.length === 1 ? 'customer' : 'customers'} selected
                            </span>
                            <span className="text-[12px] text-text-muted font-normal">
                                ({activeSelectedCount} active &bull; {inactiveSelectedCount} inactive)
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Activate Button */}
                        <button
                            type="button"
                            onClick={() => handleOpenBulkModal('activate')}
                            disabled={inactiveSelectedCount === 0 || isBulkLoading}
                            title={inactiveSelectedCount === 0 ? "All selected customers are already active" : `Activate ${inactiveSelectedCount} inactive customer(s)`}
                            aria-label="Activate selected customers"
                            className={`h-[39px] px-3.5 rounded-[10px] text-[13px] font-semibold inline-flex items-center gap-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-teal-500 ${
                                inactiveSelectedCount > 0 && !isBulkLoading
                                    ? 'bg-[#0D9488] hover:bg-[#0f766e] active:bg-[#115e59] text-white shadow-xs cursor-pointer'
                                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800/80 dark:text-slate-500 border border-slate-200/70 dark:border-slate-700/60 cursor-not-allowed'
                            }`}
                        >
                            <Power className={`w-[17px] h-[17px] shrink-0 ${inactiveSelectedCount > 0 && !isBulkLoading ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                            <span>Activate</span>
                        </button>

                        {/* Deactivate Button */}
                        <button
                            type="button"
                            onClick={() => handleOpenBulkModal('deactivate')}
                            disabled={activeSelectedCount === 0 || isBulkLoading}
                            title={activeSelectedCount === 0 ? "All selected customers are already inactive" : `Deactivate ${activeSelectedCount} active customer(s)`}
                            aria-label="Deactivate selected customers"
                            className={`h-[39px] px-3.5 rounded-[10px] text-[13px] font-semibold inline-flex items-center gap-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-amber-500 ${
                                activeSelectedCount > 0 && !isBulkLoading
                                    ? 'bg-[#F59E0B] hover:bg-[#d97706] active:bg-[#b45309] text-white shadow-xs cursor-pointer'
                                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800/80 dark:text-slate-500 border border-slate-200/70 dark:border-slate-700/60 cursor-not-allowed'
                            }`}
                        >
                            <Ban className={`w-[17px] h-[17px] shrink-0 ${activeSelectedCount > 0 && !isBulkLoading ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                            <span>Deactivate</span>
                        </button>

                        {/* Delete Button */}
                        <button
                            type="button"
                            onClick={() => handleOpenBulkModal('delete')}
                            disabled={isBulkLoading || selectedCustomerIds.length === 0}
                            title="Customer deletion policy & confirmation"
                            aria-label="Delete selected customers"
                            className={`h-[39px] px-3.5 rounded-[10px] text-[13px] font-semibold inline-flex items-center gap-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500 ${
                                !isBulkLoading && selectedCustomerIds.length > 0
                                    ? 'bg-[#DC2626] hover:bg-[#b91c1c] active:bg-[#991b1b] text-white shadow-xs cursor-pointer'
                                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800/80 dark:text-slate-500 border border-slate-200/70 dark:border-slate-700/60 cursor-not-allowed'
                            }`}
                        >
                            <Trash2 className={`w-[17px] h-[17px] shrink-0 ${!isBulkLoading && selectedCustomerIds.length > 0 ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                            <span>Delete</span>
                        </button>

                        {/* Separator */}
                        <div className="h-5 w-px bg-border-subtle mx-0.5 hidden sm:block" />

                        {/* Clear Selection */}
                        <button
                            type="button"
                            onClick={() => setSelectedCustomerIds([])}
                            disabled={isBulkLoading}
                            title="Clear current selection"
                            aria-label="Clear customer selection"
                            className="h-[39px] px-3.5 rounded-[10px] text-[13px] font-medium bg-white hover:bg-slate-50 active:bg-slate-100 dark:bg-bg-card dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700/80 shadow-xs transition-all duration-150 inline-flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400"
                        >
                            <X className="w-[17px] h-[17px] shrink-0 text-slate-500 dark:text-slate-400" />
                            <span>Clear</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Error State */}
            {error ? (
                <div className="acx-card p-12 text-center rounded-2xl">
                    <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
                        <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-1">
                            <AlertCircle className="w-6 h-6 text-red-500" />
                        </div>
                        <p className="text-[16px] font-bold text-text-primary">Failed to load customers</p>
                        <p className="text-[13px] text-text-secondary">{error}</p>
                        <button onClick={fetchCustomersList} className="btn btn-secondary btn-md mt-2">
                            <RefreshCw className="w-4 h-4 mr-1.5" />
                            Retry
                        </button>
                    </div>
                </div>
            ) : isLoading ? (
                /* Loading State */
                <div className="acx-card p-16 text-center rounded-2xl">
                    <div className="flex justify-center mb-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
                    </div>
                    <p className="text-[13px] font-medium text-text-muted">Loading customer records...</p>
                </div>
            ) : customers.length === 0 ? (
                /* Empty State */
                <div className="acx-card p-16 text-center rounded-2xl">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <div className="w-12 h-12 rounded-full bg-bg-main border border-border-subtle flex items-center justify-center mb-3">
                            <Users className="w-6 h-6 text-text-muted opacity-60" />
                        </div>
                        <p className="text-[15px] font-bold text-text-primary">No customers found</p>
                        <p className="text-[13px] text-text-secondary mt-1">
                            {searchInput || statusFilter !== 'ALL' || currencyFilter !== 'ALL' || dateFilter !== 'ALL'
                                ? "No customers matched your filter criteria."
                                : "Get started by adding your first customer to the database."}
                        </p>
                        {(searchInput || statusFilter !== 'ALL' || currencyFilter !== 'ALL' || dateFilter !== 'ALL') ? (
                            <button onClick={handleResetFilters} className="btn btn-secondary btn-sm mt-4">
                                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                                Clear Filters
                            </button>
                        ) : (
                            <button onClick={openAddCustomerModal} className="btn btn-primary btn-sm mt-4">
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                Add Customer
                            </button>
                        )}
                    </div>
                </div>
            ) : viewMode === 'table' ? (
                /* ========================================================
                   DESIGN 1: TABLE VIEW (Default)
                   ======================================================== */
                <div className="acx-card rounded-2xl shadow-sm border border-border-subtle overflow-hidden flex flex-col bg-bg-card">
                    {/* Horizontal scrollable table container */}
                    <div 
                        ref={tableContainerRef}
                        className="w-full overflow-x-auto no-scrollbar border-0 rounded-none shadow-none"
                    >
                        <table className="acx-table w-full border-collapse min-w-[1240px]">
                            <thead>
                                <tr className="border-b border-border-subtle bg-bg-card">
                                    <th className="px-4 py-3.5 w-[52px] min-w-[52px] text-center">
                                        <input
                                            type="checkbox"
                                            ref={headerCheckboxRef}
                                            checked={isAllSelected}
                                            onChange={handleSelectAll}
                                            className="rounded border-border-subtle text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                                            title="Select all customers on page"
                                        />
                                    </th>
                                    <th
                                        onClick={() => handleSort('name')}
                                        className="px-5 py-3.5 w-[220px] min-w-[220px] text-left text-[11px] font-bold text-text-muted uppercase tracking-wider cursor-pointer select-none hover:text-text-primary"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span>CODE / NAME</span>
                                            <ChevronsUpDown className="w-3.5 h-3.5 opacity-60" />
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort('companyName')}
                                        className="px-5 py-3.5 w-[240px] min-w-[240px] text-left text-[11px] font-bold text-text-muted uppercase tracking-wider cursor-pointer select-none hover:text-text-primary"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span>COMPANY / GSTIN</span>
                                            <ChevronsUpDown className="w-3.5 h-3.5 opacity-60" />
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort('email')}
                                        className="px-5 py-3.5 w-[240px] min-w-[240px] text-left text-[11px] font-bold text-text-muted uppercase tracking-wider cursor-pointer select-none hover:text-text-primary"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span>CONTACT INFO</span>
                                            <ChevronsUpDown className="w-3.5 h-3.5 opacity-60" />
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort('currency')}
                                        className="px-5 py-3.5 w-[120px] min-w-[120px] text-left text-[11px] font-bold text-text-muted uppercase tracking-wider cursor-pointer select-none hover:text-text-primary"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span>CURRENCY</span>
                                            <ChevronsUpDown className="w-3.5 h-3.5 opacity-60" />
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort('active')}
                                        className="px-5 py-3.5 w-[130px] min-w-[130px] text-left text-[11px] font-bold text-text-muted uppercase tracking-wider cursor-pointer select-none hover:text-text-primary"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span>STATUS</span>
                                            <ChevronsUpDown className="w-3.5 h-3.5 opacity-60" />
                                        </div>
                                    </th>
                                    <th className="px-5 py-3.5 w-[270px] min-w-[270px] text-right text-[11px] font-bold text-text-muted uppercase tracking-wider">
                                        ACTIONS
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-subtle/50 bg-bg-card">
                                {sortedCustomers.map((c) => {
                                    const isSelected = selectedCustomerIds.includes(c.id);
                                    const initials = getInitials(c.name, c.companyName);
                                    const avatarClass = getAvatarColor(c.customerCode || c.name);

                                    return (
                                        <tr
                                            key={c.id}
                                            className={`hover:bg-bg-hover/60 transition-colors group ${
                                                isSelected ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''
                                            }`}
                                        >
                                            {/* Checkbox */}
                                            <td className="px-4 py-4 w-[52px] min-w-[52px] text-center align-middle">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleSelectOne(c.id)}
                                                    className="rounded border-border-subtle text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                                                    title={`Select ${c.name || c.customerCode}`}
                                                />
                                            </td>

                                            {/* Code / Name with Avatar Badge */}
                                            <td className="px-5 py-4 w-[220px] min-w-[220px] align-middle">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-[12px] shrink-0 ${avatarClass}`}>
                                                        {initials}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                                                            {c.customerCode}
                                                        </div>
                                                        <div className="text-[13px] font-bold text-text-primary tracking-tight truncate max-w-[200px]">
                                                            {c.name}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Company / GSTIN */}
                                            <td className="px-5 py-4 w-[240px] min-w-[240px] align-middle">
                                                <div className="flex items-start gap-2.5">
                                                    <Building2 className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                                                    <div className="min-w-0">
                                                        <div className="text-[13px] font-bold text-text-primary truncate max-w-[200px]">
                                                            {c.companyName || '-'}
                                                        </div>
                                                        <div className="text-[11px] font-medium text-text-secondary tracking-wider mt-0.5">
                                                            {c.gstin || '-'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Contact Info (Email, Phone) */}
                                            <td className="px-5 py-4 w-[240px] min-w-[240px] align-middle">
                                                <div className="space-y-1 min-w-0">
                                                    <div className="text-text-secondary text-[12px] font-medium flex items-center gap-1.5 truncate max-w-[210px]">
                                                        <Mail className="w-3.5 h-3.5 text-text-muted shrink-0" />
                                                        <span className="truncate">{c.email || '-'}</span>
                                                    </div>
                                                    {c.phone && (
                                                        <div className="text-text-secondary text-[12px] font-medium flex items-center gap-1.5">
                                                            <Phone className="w-3.5 h-3.5 text-text-muted shrink-0" />
                                                            <span>{c.phone}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Currency */}
                                            <td className="px-5 py-4 w-[120px] min-w-[120px] align-middle">
                                                <span className="inline-flex items-center text-[11px] font-bold uppercase tracking-wider text-text-secondary bg-bg-main border border-border-subtle px-2.5 py-1 rounded-md">
                                                    {c.currency || 'INR'}
                                                </span>
                                            </td>

                                            {/* Status */}
                                            <td className="px-5 py-4 w-[130px] min-w-[130px] align-middle">
                                                {c.active ? (
                                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                        ACTIVE
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                                                        INACTIVE
                                                    </span>
                                                )}
                                            </td>

                                            {/* Actions: 360 View, Edit, Deactivate */}
                                            <td className="px-5 py-4 w-[270px] min-w-[270px] align-middle text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => navigate(`/customers/${c.id}/360`)}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 hover:bg-blue-100/80 transition-colors"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        360 View
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(c)}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-semibold text-text-secondary hover:text-text-primary bg-bg-main border border-border-subtle hover:bg-bg-hover transition-colors"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => toggleStatus(c.id, c.active)}
                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-semibold transition-colors border ${
                                                            c.active
                                                                ? 'text-red-600 dark:text-red-400 border-red-200/60 dark:border-red-500/20 bg-red-50/60 dark:bg-red-500/10 hover:bg-red-100/70'
                                                                : 'text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-500/10 hover:bg-emerald-100/70'
                                                        }`}
                                                    >
                                                        {c.active ? (
                                                            <>
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                Deactivate
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Power className="w-3.5 h-3.5" />
                                                                Activate
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Single Thin Horizontal Scrollbar (approx. 6–8px tall) */}
                    {isTableOverflowing && (
                        <div className="w-full px-4 py-2 bg-slate-50/50 dark:bg-slate-900/20 border-t border-border-subtle/40 select-none">
                            <div
                                ref={scrollTrackRef}
                                onClick={handleTrackClick}
                                className="relative w-full h-[7px] bg-slate-200/80 dark:bg-slate-800 rounded-full cursor-pointer overflow-hidden"
                                title="Drag to scroll horizontally"
                            >
                                <div
                                    onMouseDown={handleThumbMouseDown}
                                    style={{
                                        width: `${Math.max(8, Math.min(100, (scrollMetrics.clientWidth / scrollMetrics.scrollWidth) * 100))}%`,
                                        left: `${(scrollMetrics.scrollLeft / maxTableScroll) * (100 - Math.max(8, Math.min(100, (scrollMetrics.clientWidth / scrollMetrics.scrollWidth) * 100)))}%`
                                    }}
                                    className="absolute top-0 bottom-0 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-full cursor-grab active:cursor-grabbing shadow-sm transition-transform duration-75"
                                />
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* ========================================================
                   DESIGN 2: CARD VIEW (Responsive Grid)
                   ======================================================== */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {sortedCustomers.map((c) => {
                        const isSelected = selectedCustomerIds.includes(c.id);
                        const initials = getInitials(c.name, c.companyName);
                        const avatarClass = getAvatarColor(c.customerCode || c.name);
                        const isMenuOpen = activeActionMenuId === c.id;

                        return (
                            <div
                                key={c.id}
                                className={`acx-card p-5 rounded-2xl border border-border-subtle bg-bg-card shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                                    isSelected ? 'ring-2 ring-blue-500/40 bg-blue-50/20 dark:bg-blue-950/20' : ''
                                }`}
                            >
                                {/* Card Header */}
                                <div>
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleSelectOne(c.id)}
                                                className="rounded border-border-subtle text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4 shrink-0"
                                                title={`Select ${c.name || c.customerCode}`}
                                            />
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[13px] shrink-0 ${avatarClass}`}>
                                                {initials}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                                                    {c.customerCode}
                                                </div>
                                                <div className="text-[13px] font-bold text-text-primary tracking-tight truncate">
                                                    {c.companyName || c.name}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0 relative">
                                            {c.active ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    ACTIVE
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                    INACTIVE
                                                </span>
                                            )}

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveActionMenuId(isMenuOpen ? null : c.id);
                                                }}
                                                className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>

                                            {/* Dropdown Menu */}
                                            {isMenuOpen && (
                                                <div className="absolute right-0 top-full mt-1 w-36 rounded-xl border border-border-subtle bg-bg-card shadow-lg py-1.5 z-20">
                                                    <button
                                                        onClick={() => navigate(`/customers/${c.id}/360`)}
                                                        className="w-full text-left px-3 py-1.5 text-[12px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover flex items-center gap-2"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        360 View
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(c)}
                                                        className="w-full text-left px-3 py-1.5 text-[12px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover flex items-center gap-2"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => toggleStatus(c.id, c.active)}
                                                        className="w-full text-left px-3 py-1.5 text-[12px] font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        {c.active ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Card Info List */}
                                    <div className="space-y-2 py-2 border-t border-border-subtle/50 text-[12px]">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 text-text-secondary truncate">
                                                <CreditCard className="w-3.5 h-3.5 text-text-muted shrink-0" />
                                                <span className="truncate">{c.gstin || 'GSTIN: Not provided'}</span>
                                            </div>
                                            <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-text-secondary bg-bg-main border border-border-subtle px-2 py-0.5 rounded shrink-0">
                                                {c.currency || 'INR'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-text-secondary truncate">
                                            <Mail className="w-3.5 h-3.5 text-text-muted shrink-0" />
                                            <span className="truncate">{c.email || '-'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-text-secondary">
                                            <Phone className="w-3.5 h-3.5 text-text-muted shrink-0" />
                                            <span>{c.phone || '-'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Action Buttons */}
                                <div className="pt-3 border-t border-border-subtle/50 flex items-center gap-2">
                                    <button
                                        onClick={() => navigate(`/customers/${c.id}/360`)}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[12px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 hover:bg-blue-100/80 transition-colors"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        360 View
                                    </button>
                                    <button
                                        onClick={() => handleEdit(c)}
                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold text-text-secondary hover:text-text-primary bg-bg-main border border-border-subtle hover:bg-bg-hover transition-colors"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => toggleStatus(c.id, c.active)}
                                        className={`inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-colors border ${
                                            c.active
                                                ? 'text-red-600 dark:text-red-400 border-red-200/60 dark:border-red-500/20 bg-red-50/60 dark:bg-red-500/10 hover:bg-red-100/70'
                                                : 'text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-500/10 hover:bg-emerald-100/70'
                                        }`}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        {c.active ? 'Deactivate' : 'Activate'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination Footer: Showing X to Y of Z & Rows Per Page & Page Numbers */}
            {!isLoading && !error && customers.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                    {/* Showing text */}
                    <div className="text-[13px] font-medium text-text-secondary">
                        Showing <span className="font-bold text-text-primary">{startRecord}</span> to{' '}
                        <span className="font-bold text-text-primary">{endRecord}</span> of{' '}
                        <span className="font-bold text-text-primary">{totalElements}</span> customers
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex items-center gap-4">
                        {/* Rows per page selector */}
                        <div className="flex items-center gap-2">
                            <span className="text-[13px] text-text-secondary font-medium">Rows per page</span>
                            <div className="relative">
                                <select
                                    value={pageSize}
                                    onChange={(e) => {
                                        setPageSize(Number(e.target.value));
                                        setPage(0);
                                    }}
                                    className="acx-input text-[13px] h-9 pr-7 pl-2.5 rounded-xl bg-bg-card font-semibold border border-border-subtle cursor-pointer appearance-none"
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                            </div>
                        </div>

                        {/* Page number buttons */}
                        <div className="flex items-center gap-1 bg-bg-card p-1 rounded-xl border border-border-subtle">
                            <button
                                onClick={() => setPage(prev => Math.max(0, prev - 1))}
                                disabled={page === 0}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-hover disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i)
                                .filter(p => p === 0 || p === totalPages - 1 || Math.abs(p - page) <= 1)
                                .map((p, idx, arr) => {
                                    const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                                    return (
                                        <React.Fragment key={p}>
                                            {showEllipsis && (
                                                <span className="w-6 text-center text-text-muted text-[12px]">...</span>
                                            )}
                                            <button
                                                onClick={() => setPage(p)}
                                                className={`w-8 h-8 rounded-lg text-[13px] font-semibold transition-all ${
                                                    page === p
                                                        ? 'bg-blue-600 text-white shadow-sm'
                                                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                                                }`}
                                            >
                                                {p + 1}
                                            </button>
                                        </React.Fragment>
                                    );
                                })}

                            <button
                                onClick={() => setPage(prev => Math.min(totalPages - 1, prev + 1))}
                                disabled={page >= totalPages - 1}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-hover disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Action Confirmation & Deletion Policy Modal */}
            {bulkModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="acx-card p-6 max-w-md w-full rounded-2xl bg-bg-card shadow-2xl border border-border-subtle animate-fadeIn">
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    bulkModal.action === 'activate'
                                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                        : bulkModal.action === 'deactivate'
                                        ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                                        : 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                                }`}>
                                    {bulkModal.action === 'activate' ? (
                                        <Power className="w-5 h-5" />
                                    ) : bulkModal.action === 'deactivate' ? (
                                        <Ban className="w-5 h-5" />
                                    ) : (
                                        <AlertTriangle className="w-5 h-5" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-[17px] font-bold text-text-primary">
                                        {bulkModal.action === 'activate'
                                            ? `Activate ${bulkModal.count} Customer${bulkModal.count > 1 ? 's' : ''}`
                                            : bulkModal.action === 'deactivate'
                                            ? `Deactivate ${bulkModal.count} Customer${bulkModal.count > 1 ? 's' : ''}`
                                            : 'Customer Deletion Policy'}
                                    </h3>
                                    <p className="text-[12px] text-text-secondary">
                                        {bulkModal.action === 'delete' ? 'Financial audit protection policy' : 'Confirm bulk action'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setBulkModal(null)}
                                disabled={isBulkLoading}
                                className="p-1 rounded-lg text-text-muted hover:text-text-primary"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="text-[13px] text-text-secondary space-y-3 mb-6">
                            {bulkModal.action === 'activate' ? (
                                <p>
                                    Are you sure you want to activate <strong className="text-text-primary">{bulkModal.count}</strong> customer(s)? 
                                    Their accounts will be active and available for new quotations, invoices, and sales operations.
                                </p>
                            ) : bulkModal.action === 'deactivate' ? (
                                <p>
                                    Are you sure you want to deactivate <strong className="text-text-primary">{bulkModal.count}</strong> customer(s)? 
                                    They will be archived from active sales flows, but all historical quotations, invoices, and payments remain preserved.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-amber-700 dark:text-amber-300 font-semibold bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/40 text-[12px]">
                                        Permanent deletion is disabled to prevent foreign-key integrity violations and comply with financial auditing regulations.
                                    </p>
                                    <p>
                                        Customers are linked to quotations, invoices, payments, and CRM records. Cascade deletion would erase accounting history.
                                    </p>
                                    <p>
                                        Please use <strong className="text-text-primary">Deactivate</strong> instead to safely retire customer accounts without data loss.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setBulkModal(null)}
                                disabled={isBulkLoading}
                                className="btn btn-secondary btn-sm"
                            >
                                {bulkModal.action === 'delete' ? 'Close' : 'Cancel'}
                            </button>

                            {bulkModal.action !== 'delete' && (
                                <button
                                    type="button"
                                    onClick={handleExecuteBulkAction}
                                    disabled={isBulkLoading}
                                    className={`btn btn-sm ${
                                        bulkModal.action === 'activate'
                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                            : 'bg-amber-600 hover:bg-amber-700 text-white'
                                    }`}
                                >
                                    {isBulkLoading
                                        ? 'Processing...'
                                        : bulkModal.action === 'activate'
                                        ? 'Confirm Activation'
                                        : 'Confirm Deactivation'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Customer Status Change Confirmation Modal */}
            {customerStatusTarget && (
                <ConfirmDialog
                    isOpen={Boolean(customerStatusTarget)}
                    title={customerStatusTarget.currentStatus ? "Deactivate Customer Account" : "Activate Customer Account"}
                    description={customerStatusTarget.currentStatus 
                        ? `Are you sure you want to deactivate ${customerStatusTarget.name}? They will be archived from active sales flows, but all historical quotations, invoices, and payments remain preserved.`
                        : `Are you sure you want to activate ${customerStatusTarget.name}? Their account will be active and available for new quotations and billing.`}
                    confirmText={customerStatusTarget.currentStatus ? "Deactivate Customer" : "Activate Customer"}
                    cancelText="Cancel"
                    variant={customerStatusTarget.currentStatus ? "destructive" : "primary"}
                    isLoading={isTogglingStatus}
                    onConfirm={handleConfirmCustomerStatus}
                    onCancel={() => !isTogglingStatus && setCustomerStatusTarget(null)}
                />
            )}

        </div>
    );
}
