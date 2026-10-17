import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    getPurchaseOrderById, 
    verifyPurchaseOrder, 
    updatePurchaseOrderStatus, 
    updatePurchaseOrderRemarks, 
    createInvoiceFromPurchaseOrder, 
    getInvoices,
    fetchApi, 
    getCompanySettings 
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { useToast } from '../context/ToastContext';
import { 
    ArrowLeft, Clock, CheckCircle, Package, XCircle, FileText, Download, 
    AlertTriangle, Eye, X, Building2, MapPin, Mail, Phone, Hash, 
    CalendarDays, Receipt, UserSquare2, Loader2, Link, ShoppingCart, 
    User, FileDigit, Activity, Edit3, Lock, ShieldCheck, AlertCircle, 
    ExternalLink, Check, ChevronRight, DollarSign, Truck 
} from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { formatStateDisplay } from '../utils/gstStateUtils';

export default function PurchaseOrderDetail() {
    const { tenant } = useTenant();
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    
    const [order, setOrder] = useState(null);
    const [quotation, setQuotation] = useState(null);
    const [customer, setCustomer] = useState(null);
    const [companySettings, setCompanySettings] = useState(null);
    const [relatedInvoices, setRelatedInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    
    // Status Modal
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [remarks, setRemarks] = useState('');

    // Verify Modal
    const [verifyModalOpen, setVerifyModalOpen] = useState(false);

    // Create Invoice Modal & Form
    const [isCreateInvoiceModalOpen, setIsCreateInvoiceModalOpen] = useState(false);
    const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
    const [invoiceFormError, setInvoiceFormError] = useState(null);
    const [invoiceForm, setInvoiceForm] = useState({
        invoiceDate: '',
        dueDate: '',
        paymentTerms: '',
        termsAndConditions: '',
        placeOfSupply: '',
        clientName: '',
        clientCompany: '',
        clientEmail: '',
        clientPhone: '',
        clientAddress: '',
        clientGstin: ''
    });

    const [isEditingRemarks, setIsEditingRemarks] = useState(false);
    const [editedRemarks, setEditedRemarks] = useState('');
    const [savingRemarks, setSavingRemarks] = useState(false);
    
    const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);

    // Horizontal Scrollbar State & Refs for Order Details Table
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

        const handleWheel = (e) => {
            if (e.shiftKey || Math.abs(e.deltaX) > 0) {
                return;
            }
            if (el.scrollWidth > el.clientWidth) {
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                    const atLeft = el.scrollLeft <= 0 && e.deltaY < 0;
                    const atRight = el.scrollLeft >= el.scrollWidth - el.clientWidth - 1 && e.deltaY > 0;
                    if (!atLeft && !atRight) {
                        el.scrollLeft += e.deltaY;
                        e.preventDefault();
                    }
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
    }, [updateScrollMetrics, quotation]);

    const isTableOverflowing = scrollMetrics.scrollWidth > scrollMetrics.clientWidth + 2;
    const maxTableScroll = Math.max(1, scrollMetrics.scrollWidth - scrollMetrics.clientWidth);

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
            const thumbWidth = Math.max(36, (scrollMetrics.clientWidth / scrollMetrics.scrollWidth) * trackWidth);
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

    const fetchOrderData = async () => {
        try {
            setLoading(true);
            const poData = await getPurchaseOrderById(id);
            setOrder(poData);
            setEditedRemarks(poData?.remarks || '');
            
            // Secondary fetches (quotation, company settings, invoices) - non-critical, isolated so failures do not trigger global toast error
            try {
                const secondaryFetches = [
                    getCompanySettings().catch(() => null),
                    getInvoices({ purchaseOrderId: id }).catch(() => null)
                ];
                if (poData?.quotationId) {
                    secondaryFetches.push(fetchApi(`/quotations/${poData.quotationId}`).catch(() => null));
                }

                const [cData, invRes, qData] = await Promise.all(secondaryFetches);
                if (cData) setCompanySettings(cData);
                if (invRes?.content) setRelatedInvoices(invRes.content);
                if (qData) {
                    setQuotation(qData);
                    if (qData?.customer) {
                        setCustomer(qData.customer);
                    } else if (qData?.customerId) {
                        const custData = await fetchApi(`/customers/${qData.customerId}`).catch(() => null);
                        if (custData) setCustomer(custData);
                    }
                }
            } catch (secError) {
                console.warn('Non-critical secondary settings/quotation fetch failed:', secError);
            }
            
        } catch (error) {
            console.error('Failed to fetch PO data', error);
            showToast({ type: 'error', message: error?.message || 'Failed to fetch Purchase Order details' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrderData();
    }, [id]);

    const handleSaveRemarks = async () => {
        try {
            setSavingRemarks(true);
            const updated = await updatePurchaseOrderRemarks(id, editedRemarks);
            setOrder(updated);
            setEditedRemarks(updated.remarks || '');
            setIsEditingRemarks(false);
            showToast({ type: 'success', message: 'Remarks updated successfully' });
        } catch (err) {
            console.error('Failed to update remarks', err);
            showToast({ type: 'error', message: err.message || 'Failed to update remarks' });
        } finally {
            setSavingRemarks(false);
        }
    };

    const handleVerify = async () => {
        try {
            setActionLoading(true);
            await verifyPurchaseOrder(id);
            showToast({ type: 'success', message: 'Purchase Order verified successfully!' });
            setVerifyModalOpen(false);
            await fetchOrderData();
        } catch (error) {
            console.error('Failed to verify PO', error);
            showToast({ type: 'error', message: error.message || 'Failed to verify PO' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleOpenCreateTaxInvoiceModal = () => {
        if (!order) return;

        if (!['VERIFIED', 'PARTIALLY_FULFILLED'].includes(order.status)) {
            showToast({
                type: 'warning',
                message: `Tax Invoice can only be created from VERIFIED or PARTIALLY_FULFILLED Purchase Orders (Current: ${order.status}).`
            });
            return;
        }

        const activeInvoices = relatedInvoices.filter(i => i.status !== 'CANCELLED');
        const totalInvoiced = activeInvoices.reduce((sum, i) => sum + (Number(i.grandTotal) || 0), 0);

        if (order.poValue != null && totalInvoiced >= Number(order.poValue) && activeInvoices.length > 0) {
            showToast({
                type: 'info',
                message: 'This Purchase Order is already fully invoiced. Over-invoicing is not permitted.'
            });
            return;
        }

        const defaultDate = new Date().toISOString().split('T')[0];
        const defaultDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        setInvoiceForm({
            invoiceDate: defaultDate,
            dueDate: defaultDueDate,
            paymentTerms: customer?.paymentTerms || quotation?.termsAndConditions || 'Net 30',
            termsAndConditions: quotation?.termsAndConditions || order.remarks || 'Payment due within 30 days of invoice date.',
            placeOfSupply: customer?.state || quotation?.customer?.state || companySettings?.state || '',
            clientName: quotation?.clientName || customer?.name || order.clientName || '',
            clientCompany: quotation?.clientCompany || customer?.companyName || order.clientCompany || '',
            clientEmail: quotation?.clientEmail || customer?.email || order.clientEmail || '',
            clientPhone: quotation?.clientPhone || customer?.phone || order.clientPhone || '',
            clientAddress: customer?.billingAddress || quotation?.clientAddress || '',
            clientGstin: customer?.gstin || quotation?.clientGstin || ''
        });

        setInvoiceFormError(null);
        setIsCreateInvoiceModalOpen(true);
    };

    const handleCreateTaxInvoiceSubmit = async (e) => {
        if (e) e.preventDefault();
        if (isCreatingInvoice) return;

        try {
            setIsCreatingInvoice(true);
            setInvoiceFormError(null);

            const payload = {
                invoiceType: 'TAX_INVOICE',
                invoiceDate: invoiceForm.invoiceDate || new Date().toISOString().split('T')[0],
                dueDate: invoiceForm.dueDate || null,
                paymentTerms: invoiceForm.paymentTerms || null,
                termsAndConditions: invoiceForm.termsAndConditions || null,
                placeOfSupply: invoiceForm.placeOfSupply || null,
                clientName: invoiceForm.clientName || null,
                clientCompany: invoiceForm.clientCompany || null,
                clientEmail: invoiceForm.clientEmail || null,
                clientPhone: invoiceForm.clientPhone || null,
                clientAddress: invoiceForm.clientAddress || null,
                clientGstin: invoiceForm.clientGstin || null
            };

            const invoice = await createInvoiceFromPurchaseOrder(id, 'TAX_INVOICE', payload);
            showToast({
                type: 'success',
                message: 'Tax Invoice created successfully as DRAFT. You can now review and issue it.'
            });
            setIsCreateInvoiceModalOpen(false);
            await fetchOrderData();
            navigate(`/invoices/${invoice.id}`);
        } catch (error) {
            console.error('Failed to create Tax Invoice', error);
            setInvoiceFormError(error.message || 'Failed to create Tax Invoice');
            showToast({
                type: 'error',
                message: error.message || 'Failed to create Tax Invoice'
            });
        } finally {
            setIsCreatingInvoice(false);
        }
    };

    const handleStatusUpdate = async (e) => {
        e.preventDefault();
        try {
            setActionLoading(true);
            await updatePurchaseOrderStatus(id, { status: newStatus, remarks });
            setStatusModalOpen(false);
            setRemarks('');
            showToast({ type: 'success', message: `Status updated to ${newStatus}` });
            await fetchOrderData();
        } catch (error) {
            console.error('Failed to update status', error);
            showToast({ type: 'error', message: error.message || 'Failed to update status' });
        } finally {
            setActionLoading(false);
        }
    };

    const fetchPdfBlob = async () => {
        const token = localStorage.getItem('adminToken');
        const res = await fetch(`${API_BASE_URL}/purchase-orders/${id}/pdf`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to generate PDF');
        return await res.blob();
    };

    const handlePreviewPdf = async () => {
        setIsPreviewLoading(true);
        try {
            const blob = await fetchPdfBlob();
            const url = window.URL.createObjectURL(blob);
            setPreviewPdfUrl(url);
            setIsPreviewModalOpen(true);
        } catch(err) {
            console.error(err);
            alert('Could not preview PDF');
        } finally {
            setIsPreviewLoading(false);
        }
    };

    const handleDownloadPdf = async () => {
        try {
            const blob = await fetchPdfBlob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Purchase_Order_${order.poNumber}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch(err) {
            console.error(err);
            alert('Could not download PDF');
        }
    };

    const closePreviewModal = () => {
        setIsPreviewModalOpen(false);
        if (previewPdfUrl) {
            window.URL.revokeObjectURL(previewPdfUrl);
            setPreviewPdfUrl(null);
        }
    };

    const po = order;

    if (loading || !po) {
        if (!loading && !po) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
                    <div className="w-16 h-16 bg-brand-danger/10 flex items-center justify-center rounded-[20px] mb-6">
                        <AlertTriangle className="w-8 h-8 text-brand-danger" />
                    </div>
                    <h2 className="text-[20px] font-bold text-text-primary mb-2">Purchase Order Not Found</h2>
                    <p className="text-sm text-text-muted max-w-sm mb-4">
                        The requested purchase order could not be loaded or may not exist.
                    </p>
                    <button onClick={() => navigate('/purchase-orders')} className="btn btn-secondary btn-md">
                        Back to Purchase Orders
                    </button>
                </div>
            );
        }

        return (
            <div className="space-y-6 max-w-[1600px] mx-auto pb-24 animate-pulse">
                {/* Header skeleton */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-bg-muted shrink-0" />
                        <div className="space-y-2">
                            <div className="h-7 w-64 bg-bg-muted rounded-lg" />
                            <div className="h-4 w-32 bg-bg-muted rounded" />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-28 bg-bg-muted rounded-xl" />
                        <div className="h-10 w-28 bg-bg-muted rounded-xl" />
                    </div>
                </div>
                {/* 4 Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(idx => (
                        <div key={idx} className="acx-card p-5 h-24 bg-bg-muted/40 rounded-2xl border border-border-subtle/50" />
                    ))}
                </div>
                {/* Upper 2 Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                    <div className="acx-card p-6 h-64 bg-bg-muted/40 rounded-2xl border border-border-subtle/50" />
                    <div className="acx-card p-6 h-64 bg-bg-muted/40 rounded-2xl border border-border-subtle/50" />
                </div>
                {/* Table skeleton */}
                <div className="acx-card p-6 h-80 bg-bg-muted/40 rounded-2xl border border-border-subtle/50" />
            </div>
        );
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'RECEIVED': return <Clock className="w-4 h-4 text-yellow-500"/>;
            case 'VERIFIED': return <CheckCircle className="w-4 h-4 text-brand-teal"/>;
            case 'PARTIALLY_FULFILLED': return <Package className="w-4 h-4 text-purple-500"/>;
            case 'FULFILLED': return <CheckCircle className="w-4 h-4 text-green-500"/>;
            case 'CANCELLED': return <XCircle className="w-4 h-4 text-red-500"/>;
            default: return null;
        }
    };

    const defaultConfigs = [
        { columnKey: "rowNumber", displayName: "#", columnType: "NUMBER", visible: true, sortOrder: 0 },
        { columnKey: "sku", displayName: "SKU", columnType: "TEXT", visible: true, sortOrder: 1 },
        { columnKey: "description", displayName: "Description", columnType: "TEXT", visible: true, sortOrder: 2 },
        { columnKey: "hsnSac", displayName: "HSN/SAC", columnType: "TEXT", visible: true, sortOrder: 3 },
        { columnKey: "quantity", displayName: "Quantity", columnType: "NUMBER", visible: true, sortOrder: 4 },
        { columnKey: "listPrice", displayName: "List Price", columnType: "CURRENCY", visible: true, sortOrder: 5 },
        { columnKey: "discountPercent", displayName: "Discount %", columnType: "NUMBER", visible: true, sortOrder: 6 },
        { columnKey: "unitPrice", displayName: "Unit Price", columnType: "CURRENCY", visible: true, sortOrder: 7 },
        { columnKey: "taxPercent", displayName: "Tax %", columnType: "NUMBER", visible: true, sortOrder: 8 },
        { columnKey: "taxAmount", displayName: "Tax Amount", columnType: "CURRENCY", visible: true, sortOrder: 9 },
        { columnKey: "total", displayName: "Total", columnType: "CURRENCY", visible: true, sortOrder: 10 }
    ];

    const getColumnValue = (item, colKey) => {
        if (colKey === "rowNumber") return (item.sortOrder ?? 0) + 1;
        if (colKey === "taxAmount") {
            if (item.taxAmount !== undefined && item.taxAmount !== null && item.taxAmount !== '') return item.taxAmount;
            const qty = parseFloat(item.quantity) || 0;
            const up = parseFloat(item.unitPrice) || 0;
            const taxPct = parseFloat(item.taxPercent) || 0;
            return (qty * up) * (taxPct / 100);
        }
        if (colKey === "total" || colKey === "lineTotal") {
            if (item.lineTotal !== undefined && item.lineTotal !== null && item.lineTotal !== '') return item.lineTotal;
            if (item.total !== undefined && item.total !== null && item.total !== '') return item.total;
            const qty = parseFloat(item.quantity) || 0;
            const up = parseFloat(item.unitPrice) || 0;
            const taxPct = parseFloat(item.taxPercent) || 0;
            const net = qty * up;
            return net + (net * (taxPct / 100));
        }
        if (["sku", "description", "hsnSac", "quantity", "listPrice", "discountPercent", "unitPrice", "taxPercent"].includes(colKey)) {
            return item[colKey];
        }
        return item.customValues?.[colKey] || "-";
    };

    const getColumnClass = (col) => {
        let classes = "px-4 py-3.5 text-[13px] text-text-primary border-b border-border-subtle/40";
        if (col.columnType === 'CURRENCY' || ['total', 'lineTotal', 'taxAmount', 'listPrice', 'unitPrice'].includes(col.columnKey) || col.columnKey.toLowerCase().includes('price')) {
            classes += " text-right whitespace-nowrap font-mono font-medium";
        } else if (col.columnKey.toLowerCase().includes('percent') || col.columnKey === 'discountPercent' || col.columnKey === 'taxPercent') {
            classes += " text-right whitespace-nowrap font-mono";
        } else if (col.columnKey === 'quantity' || col.columnKey === 'rowNumber') {
            classes += " text-center whitespace-nowrap font-medium";
        } else if (col.columnKey === 'hsnSac' || col.columnKey === 'sku') {
            classes += " whitespace-nowrap font-mono text-[12px] text-text-secondary";
        } else if (col.columnKey === 'description') {
            classes += " min-w-[220px] leading-relaxed break-words font-medium";
        }
        return classes;
    };
    
    const getHeaderClass = (col) => {
        let classes = "px-4 py-3 text-[11px] font-bold text-text-secondary uppercase tracking-wider select-none";
        if (col.columnType === 'CURRENCY' || ['total', 'lineTotal', 'taxAmount', 'listPrice', 'unitPrice'].includes(col.columnKey) || col.columnKey.toLowerCase().includes('price')) {
            classes += " text-right whitespace-nowrap";
        } else if (col.columnKey.toLowerCase().includes('percent') || col.columnKey === 'discountPercent' || col.columnKey === 'taxPercent') {
            classes += " text-right whitespace-nowrap";
        } else if (col.columnKey === 'quantity' || col.columnKey === 'rowNumber') {
            classes += " text-center whitespace-nowrap";
        } else if (col.columnKey === 'hsnSac' || col.columnKey === 'sku') {
            classes += " whitespace-nowrap";
        } else if (col.columnKey === 'description') {
            classes += " min-w-[220px]";
        }
        return classes;
    };

    const renderColumnContent = (item, col) => {
        const value = getColumnValue(item, col.columnKey);
        if (value === null || value === undefined || value === '') {
            return <span className="text-text-muted">-</span>;
        }
        if (col.columnType === "CURRENCY" || ['total', 'lineTotal', 'taxAmount', 'listPrice', 'unitPrice'].includes(col.columnKey)) {
            return formatCurrency(value, order.currency);
        }
        if ((col.columnType === "NUMBER" && col.columnKey.includes("Percent")) || col.columnKey === 'discountPercent' || col.columnKey === 'taxPercent') {
            const num = parseFloat(value);
            return isNaN(num) ? '-' : `${num}%`;
        }
        if (col.columnKey === 'quantity') {
            return (
                <span>
                    {value}
                    {item.unit ? <span className="text-text-muted text-[11px] ml-1 font-normal">{item.unit}</span> : null}
                </span>
            );
        }
        return value;
    };

    const calculateTotals = () => {
        let subtotalBeforeTax = 0;
        let taxableAmount = 0;
        let tax = 0;
        let discount = 0;

        if (quotation && quotation.items) {
            quotation.items.forEach(item => {
                const qty = parseFloat(item.quantity) || 0;
                const lp = parseFloat(item.listPrice) || 0;
                const up = parseFloat(item.unitPrice) || 0;
                const taxPct = parseFloat(item.taxPercent) || 0;
    
                const lineGross = qty * (lp > 0 ? lp : up);
                const lineNet = qty * up;
                const lineDisc = Math.max(0, lineGross - lineNet);
                const lineTax = lineNet * (taxPct / 100);
    
                subtotalBeforeTax += lineGross;
                taxableAmount += lineNet;
                tax += lineTax;
                discount += lineDisc;
            });
        }
        return { subtotalBeforeTax, taxableAmount, tax, discount, grandTotal: taxableAmount + tax };
    };

    const totals = calculateTotals();
    const visibleColumns = (quotation?.columnConfigs && quotation.columnConfigs.length > 0)
        ? quotation.columnConfigs
            .filter(c => !['themeColor', 'templateStyle', 'brandDisplayMode', 'bankDetails', 'signature', 'termsAndConditions'].includes(c.columnKey) && c.visible)
            .sort((a,b) => a.sortOrder - b.sortOrder)
        : defaultConfigs;

    // Helper to format Bill To Company Address lines
    const getCompanyAddressLines = () => {
        const rawAddress = companySettings?.registeredAddress || tenant?.address || 'Address not specified';
        if (rawAddress && typeof rawAddress === 'string' && rawAddress.trim() && rawAddress !== 'Address not specified') {
            const lines = rawAddress.split(/\r?\n|\\n/).map(l => l.trim()).filter(Boolean);
            const separateLoc = [
                companySettings?.city,
                companySettings?.state,
                companySettings?.pincode || companySettings?.pinCode || companySettings?.postalCode
            ].filter(Boolean).join(', ');

            if (separateLoc && !rawAddress.toLowerCase().includes((companySettings?.city || '').toLowerCase())) {
                lines.push(separateLoc);
            }
            return lines.length > 0 ? lines : [rawAddress];
        }

        const lines = [];
        if (companySettings?.addressLine1) lines.push(companySettings.addressLine1);
        if (companySettings?.addressLine2) lines.push(companySettings.addressLine2);
        
        const cityStatePin = [
            companySettings?.city,
            companySettings?.state,
            companySettings?.pincode || companySettings?.pinCode || companySettings?.postalCode
        ].filter(Boolean).join(', ');
        if (cityStatePin) lines.push(cityStatePin);

        return lines.length > 0 ? lines : [companySettings?.registeredAddress || tenant?.address || 'Address not specified'];
    };

    const companyAddressLines = getCompanyAddressLines();

    // Helper to format Client / Supplier / Delivery Address lines
    const getClientAddressLines = (rawAddress, state, pincode) => {
        if (!rawAddress && !state && !pincode) return [];
        const lines = [];
        const formattedState = state ? formatStateDisplay(state) : '';
        if (rawAddress && typeof rawAddress === 'string' && rawAddress.trim()) {
            const splitLines = rawAddress.split(/\r?\n|\\n/).map(l => l.trim()).filter(Boolean);
            lines.push(...splitLines);
            
            const fullRaw = rawAddress.toLowerCase();
            const stateNeedsAdd = formattedState && !fullRaw.includes(state.toLowerCase()) && !fullRaw.includes(formattedState.toLowerCase());
            const pinNeedsAdd = pincode && !fullRaw.includes(pincode.toString().toLowerCase());
            
            if (stateNeedsAdd || pinNeedsAdd) {
                const locParts = [stateNeedsAdd ? formattedState : null, pinNeedsAdd ? pincode : null].filter(Boolean);
                lines.push(locParts.join(' - '));
            }
        } else if (rawAddress) {
            lines.push(String(rawAddress));
        } else {
            const locParts = [formattedState || state, pincode].filter(Boolean);
            if (locParts.length > 0) {
                lines.push(locParts.join(' - '));
            }
        }
        return lines;
    };

    // Supplier / Vendor Details Resolution
    const supplierName = po?.supplierName || po?.vendorName || po?.customerName || po?.clientCompany || po?.clientName || quotation?.clientCompany || customer?.companyName || 'Supplier';
    const supplierContactPerson = po?.supplierContactPerson || po?.customerContactPerson || po?.clientName || po?.contactPerson || quotation?.clientName || customer?.name || 'N/A';
    const supplierBillingAddressRaw = po?.supplierBillingAddress || po?.customerAddress || po?.billingAddress || po?.clientBillingAddress || quotation?.billingAddress || customer?.billingAddress || '';
    const supplierBillingState = po?.supplierState || po?.clientState || quotation?.state || customer?.state || '';
    const supplierBillingPin = po?.supplierPincode || po?.clientPincode || quotation?.pincode || customer?.pincode || '';
    const supplierBillingLines = getClientAddressLines(supplierBillingAddressRaw, supplierBillingState, supplierBillingPin);

    const supplierGstin = po?.supplierGstin || po?.clientGstin || quotation?.gstin || customer?.gstin || '';
    const supplierPan = po?.supplierPan || po?.clientPan || quotation?.pan || customer?.pan || '';
    const supplierCode = customer?.customerCode || quotation?.customerCode || '';
    const supplierPaymentTerms = quotation?.paymentTerms || customer?.paymentTerms || '';
    const supplierEmail = po?.supplierEmail || po?.clientEmail || quotation?.clientEmail || customer?.email || '';
    const supplierPhone = po?.supplierPhone || po?.clientPhone || quotation?.clientPhone || customer?.phone || '';
    const supplierAltPhone = quotation?.alternatePhone || customer?.alternatePhone || '';

    // Delivery Destination Resolution
    const deliveryAddressRaw = po?.deliveryAddress || po?.shippingAddress || po?.clientShippingAddress || quotation?.shippingAddress || customer?.shippingAddress || '';
    const deliveryAddressLines = deliveryAddressRaw ? getClientAddressLines(deliveryAddressRaw, null, null) : [];
    const deliveryDestinationType = po?.deliveryDestinationType || 'Client / Project Site';
    const receivingContactPhone = po?.receivingContactPhone || po?.phone || po?.deliveryContactPhone || po?.clientPhone || customer?.phone || '';
    const receivingContactEmail = po?.receivingContactEmail || po?.email || po?.deliveryContactEmail || po?.clientEmail || customer?.email || '';
    const receivingContactName = po?.deliveryContactName || po?.receivingContactName || (supplierContactPerson !== 'N/A' ? supplierContactPerson : '') || `${tenant?.brandName || 'Client'} Site Contact`;

    const getDestinationBadgeLabel = () => {
        const destType = po?.deliveryDestinationType || deliveryDestinationType;
        if (destType === 'CUSTOMER_SITE') return 'Client / Project Site';
        if (destType === 'COMPANY_OFFICE') return `${tenant?.brandName || 'Company'} Office`;
        if (destType === 'CUSTOM') return 'Custom Delivery Site';
        if (destType && destType !== 'NOT_SPECIFIED') return destType.replace(/_/g, ' ');
        return 'Client / Project Site';
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-24">
            {/* Top Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/purchase-orders')}
                        className="btn btn-secondary btn-icon border-border-subtle hover:bg-bg-muted shrink-0"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <div className="flex items-center space-x-3 mb-1">
                            <h1 className="text-[28px] font-bold text-text-primary tracking-tight leading-tight flex items-center gap-3">
                                {companySettings?.logoUrl ? (
                                    <img src={companySettings.logoUrl} alt="Logo" className="h-8 object-contain" />
                                ) : (
                                    <Building2 className="w-7 h-7 text-brand-primary shrink-0" />
                                )}
                                <span className="opacity-40 font-light mx-1 hidden sm:inline">|</span>
                                Purchase Order
                            </h1>
                        </div>
                        <p className="text-[13px] font-mono text-text-muted flex items-center mt-1 flex-wrap gap-2">
                            {order?.poNumber}
                            {order?.status === 'VERIFIED' ? (
                                <>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 uppercase tracking-wider gap-1.5 shadow-sm">
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                        VERIFIED
                                    </span>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-bg-muted border border-border-subtle uppercase tracking-wider gap-1 text-text-secondary">
                                        <Lock className="w-3 h-3 text-text-muted" />
                                        Read-Only
                                    </span>
                                </>
                            ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-bg-muted border border-border-subtle uppercase tracking-wider gap-1.5 text-text-secondary">
                                    {getStatusIcon(order?.status)}
                                    {order?.status}
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-3 flex-wrap justify-end gap-y-3">
                    <button 
                        onClick={handlePreviewPdf}
                        disabled={isPreviewLoading}
                        className="btn btn-secondary btn-md flex items-center"
                    >
                        {isPreviewLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                        Preview PDF
                    </button>
                    <button 
                        onClick={handleDownloadPdf}
                        className="btn btn-secondary btn-md flex items-center"
                    >
                        <Download className="w-4 h-4 mr-2" /> PDF
                    </button>
                    
                    {/* View Tax Invoice shortcut if an active tax invoice exists */}
                    {relatedInvoices.some(i => i.invoiceType === 'TAX_INVOICE' && i.status !== 'CANCELLED') && (
                        <button 
                            onClick={() => {
                                const taxInv = relatedInvoices.find(i => i.invoiceType === 'TAX_INVOICE' && i.status !== 'CANCELLED');
                                if (taxInv) navigate(`/invoices/${taxInv.id}`);
                            }}
                            className="btn btn-secondary btn-md flex items-center text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/5 shadow-sm"
                            title="View Tax Invoice"
                        >
                            <FileText className="w-4 h-4 mr-2" /> View Tax Invoice
                        </button>
                    )}

                    {isSuperAdmin && ['VERIFIED', 'PARTIALLY_FULFILLED'].includes(order?.status) && (
                        <button 
                            onClick={handleOpenCreateTaxInvoiceModal}
                            disabled={actionLoading || (
                                order?.poValue != null && 
                                relatedInvoices.filter(i => i.status !== 'CANCELLED').reduce((sum, i) => sum + (Number(i.grandTotal) || 0), 0) >= Number(order.poValue) &&
                                relatedInvoices.some(i => i.status !== 'CANCELLED')
                            )}
                            className={`btn btn-secondary btn-md flex items-center shadow-sm ${
                                order?.poValue != null && 
                                relatedInvoices.filter(i => i.status !== 'CANCELLED').reduce((sum, i) => sum + (Number(i.grandTotal) || 0), 0) >= Number(order.poValue) &&
                                relatedInvoices.some(i => i.status !== 'CANCELLED')
                                    ? 'opacity-50 cursor-not-allowed text-text-muted border-border-subtle'
                                    : 'text-brand-teal border-brand-teal/20 hover:bg-brand-teal/5'
                            }`}
                        >
                            <FileText className="w-4 h-4 mr-2" /> Create Tax Invoice
                        </button>
                    )}
                    
                    {isSuperAdmin && order?.status === 'RECEIVED' && (
                        <button 
                            onClick={() => setVerifyModalOpen(true)}
                            disabled={actionLoading}
                            className="btn btn-primary btn-md flex items-center shadow-sm"
                        >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                            Verify
                        </button>
                    )}

                    {isSuperAdmin && order?.status === 'PARTIALLY_FULFILLED' && (
                        <button 
                            onClick={() => { setNewStatus(''); setStatusModalOpen(true); }}
                            className="btn btn-secondary btn-md flex items-center"
                        >
                            Update Status
                        </button>
                    )}
                </div>
            </div>

            {/* Verified Read-Only Banner */}
            {(order?.status === 'VERIFIED' || order?.readOnly) && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-modal-entrance">
                    <div className="flex items-start sm:items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0">
                            <ShieldCheck className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-[14px] font-bold text-emerald-800 dark:text-emerald-300">
                                    Verified Purchase Order — Read-Only Mode
                                </h3>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                                    <Lock className="w-2.5 h-2.5 mr-1" /> Locked
                                </span>
                            </div>
                            <p className="text-[12px] text-emerald-700/90 dark:text-emerald-400/90 mt-0.5">
                                This purchase order is verified{order?.verifiedBy?.name ? ` by ${order.verifiedBy.name}` : ''}{order?.verifiedAt ? ` on ${new Date(order.verifiedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}. All line items, prices, discounts, and terms are protected from direct alteration.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                            type="button"
                            onClick={() => navigate(`/invoices?search=${order?.poNumber || ''}`)}
                            className="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs bg-bg-card border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-sm"
                        >
                            <FileText className="w-3.5 h-3.5" />
                            View Related Invoices
                        </button>
                    </div>
                </div>
            )}

            {/* PO Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="acx-card p-5">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-teal/10 flex items-center justify-center shrink-0">
                            <CalendarDays className="w-4 h-4 text-brand-teal" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">PO Date</p>
                            <p className="text-[14px] font-semibold text-text-primary">
                                {order?.poDate ? new Date(order.poDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="acx-card p-5">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                            <Hash className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">Client PO #</p>
                            <p className="text-[14px] font-semibold text-text-primary">{order?.clientPoNumber || 'N/A'}</p>
                        </div>
                    </div>
                </div>
                <div className="acx-card p-5">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center shrink-0">
                            <Receipt className="w-4 h-4 text-brand-primary" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">PO Value</p>
                            <p className="text-[14px] font-semibold font-mono text-text-primary tracking-tight">
                                {formatCurrency(order?.poValue, order?.currency)}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="acx-card p-5">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                            <Link className="w-4 h-4 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">Received Via</p>
                            <p className="text-[14px] font-semibold text-text-primary">{order?.receivedVia || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mismatch Warning */}
            {order?.valueMismatch && (
                <div className="p-4 bg-brand-danger/10 border border-brand-danger/30 rounded-2xl flex items-center gap-4 shadow-sm animate-modal-entrance">
                    <AlertTriangle className="w-8 h-8 text-brand-danger shrink-0" />
                    <div>
                        <h3 className="text-[14px] font-bold text-brand-danger mb-0.5">Value Mismatch Detected</h3>
                        <p className="text-[13px] font-medium text-brand-danger/80">
                            PO Value ({formatCurrency(order?.poValue, order?.currency)}) differs from Quotation Value ({formatCurrency(order?.quotationValue, order?.currency)}).
                            Difference: {formatCurrency(order?.difference, order?.currency)}
                        </p>
                    </div>
                </div>
            )}

            {/* Upper Information Section */}
            {/* Row 1: Buyer/Bill To and Supplier & Delivery Destination in 2 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                {/* 1. BUYER / BILL TO (Dynamic Tenant Info) */}
                <div className="acx-card p-6 border-t-4 border-t-[var(--color-brand-primary)] flex flex-col justify-between shadow-sm">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center">
                                <Building2 className="w-3.5 h-3.5 mr-2 text-brand-primary" /> BUYER / BILL TO
                            </h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-primary/10 border border-brand-primary/20 text-brand-primary uppercase tracking-wider">
                                Legal Entity
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-[16px] font-bold text-text-primary tracking-tight">
                                    {companySettings?.legalName || companySettings?.companyName || tenant?.legalName || tenant?.companyName || tenant?.brandName || 'Our Company'}
                                </p>
                                {tenant?.brandName && companySettings?.companyName && tenant?.brandName !== companySettings?.companyName && (
                                    <p className="text-[12px] text-text-muted mt-0.5 font-medium">
                                        Brand: <span className="text-text-secondary">{tenant.brandName}</span>
                                    </p>
                                )}
                            </div>

                            <div className="pt-2">
                                <div className="flex items-start text-[13px] text-text-secondary">
                                    <MapPin className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-brand-primary" />
                                    <div>
                                        <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-0.5">Registered Address</p>
                                        <div className="leading-relaxed space-y-0.5 text-text-secondary text-[12px]">
                                            {companyAddressLines.map((line, idx) => (
                                                <p key={idx}>{line}</p>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {((companySettings?.gstin || tenant?.gstin) || (companySettings?.cin || tenant?.cin) || (companySettings?.pan || tenant?.pan)) && (
                                <div className="pt-3 border-t border-border-subtle/50 flex flex-wrap gap-x-6 gap-y-3">
                                    {(companySettings?.gstin || tenant?.gstin) && (
                                        <div>
                                            <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-0.5">GSTIN</p>
                                            <p className="text-[12px] font-mono font-medium text-text-primary bg-bg-muted/70 px-2 py-0.5 rounded border border-border-subtle/50 inline-block">
                                                {companySettings?.gstin || tenant?.gstin || ''}
                                            </p>
                                        </div>
                                    )}
                                    {(companySettings?.cin || tenant?.cin) && (
                                        <div>
                                            <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-0.5">CIN</p>
                                            <p className="text-[12px] font-mono font-medium text-text-primary bg-bg-muted/70 px-2 py-0.5 rounded border border-border-subtle/50 inline-block">
                                                {companySettings?.cin || tenant?.cin || ''}
                                            </p>
                                        </div>
                                    )}
                                    {(companySettings?.pan || tenant?.pan) && (
                                        <div>
                                            <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-0.5">PAN</p>
                                            <p className="text-[12px] font-mono font-medium text-text-primary bg-bg-muted/70 px-2 py-0.5 rounded border border-border-subtle/50 inline-block">
                                                {companySettings?.pan || tenant?.pan || ''}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {((companySettings?.email || tenant?.email) || (companySettings?.phone || tenant?.phone)) && (
                                <div className="pt-3 border-t border-border-subtle/50 space-y-2">
                                    {(companySettings?.email || tenant?.email) && (
                                        <div className="flex items-center text-[12px] text-text-secondary break-all">
                                            <Mail className="w-3.5 h-3.5 mr-2 text-text-muted shrink-0" />
                                            <a href={`mailto:${companySettings?.email || tenant?.email || ''}`} className="hover:text-brand-primary hover:underline transition-colors">
                                                {companySettings?.email || tenant?.email || ''}
                                            </a>
                                        </div>
                                    )}
                                    {(companySettings?.phone || tenant?.phone) && (
                                        <div className="flex items-center text-[12px] text-text-secondary">
                                            <Phone className="w-3.5 h-3.5 mr-2 text-text-muted shrink-0" />
                                            <a href={`tel:${companySettings?.phone || tenant?.phone || ''}`} className="hover:text-brand-primary transition-colors">
                                                {companySettings?.phone || tenant?.phone || ''}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. SUPPLIER / VENDOR & DELIVERY DESTINATION (Unified Card) */}
                <div className="acx-card p-6 border-t-4 border-t-amber-500 flex flex-col justify-between shadow-sm">
                    <div>
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                            <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                                <span className="inline-flex items-center text-amber-500">
                                    <UserSquare2 className="w-3.5 h-3.5 mr-1.5" />
                                    SUPPLIER / VENDOR
                                </span>
                                <span className="text-text-muted font-normal">&amp;</span>
                                <span className="inline-flex items-center text-teal-600 dark:text-teal-400">
                                    <Truck className="w-3.5 h-3.5 mr-1.5" />
                                    DELIVERY DESTINATION
                                </span>
                            </h3>
                            <div className="flex items-center gap-2">
                                {supplierCode && (
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-bg-muted border border-border-subtle text-text-secondary font-semibold">
                                        Code: {supplierCode}
                                    </span>
                                )}
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-400">
                                    {getDestinationBadgeLabel()}
                                </span>
                            </div>
                        </div>

                        {/* Two-Column Internal Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 divide-y md:divide-y-0 md:divide-x divide-border-subtle/60 pt-1">
                            {/* Left Sub-section: Supplier / Customer Details */}
                            <div className="space-y-4 md:pr-4">
                                <div>
                                    <p className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold tracking-wider mb-1 flex items-center">
                                        <UserSquare2 className="w-3 h-3 mr-1" /> Vendor / Client Entity
                                    </p>
                                    <p className="text-[15px] font-bold text-text-primary tracking-tight">
                                        {supplierName}
                                    </p>
                                    {supplierContactPerson && supplierContactPerson !== 'N/A' && (
                                        <p className="text-[12px] text-text-secondary flex items-center mt-1">
                                            <User className="w-3 h-3 mr-1.5 text-text-muted shrink-0" />
                                            <span>Kind Attn.: </span>
                                            <span className="font-semibold text-text-primary ml-1">
                                                {supplierContactPerson}
                                            </span>
                                        </p>
                                    )}
                                </div>

                                {supplierBillingLines.length > 0 ? (
                                    <div className="pt-2">
                                        <div className="flex items-start text-[13px] text-text-secondary">
                                            <MapPin className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-text-muted" />
                                            <div>
                                                <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-0.5">Billing / Registered Address</p>
                                                <div className="leading-relaxed space-y-0.5 text-text-secondary text-[12px]">
                                                    {supplierBillingLines.map((line, idx) => (
                                                        <p key={idx}>{line}</p>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : supplierBillingAddressRaw ? (
                                    <div className="pt-2">
                                        <div className="flex items-start text-[13px] text-text-secondary">
                                            <MapPin className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-text-muted" />
                                            <div>
                                                <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-0.5">Billing / Registered Address</p>
                                                <p className="text-[12px] text-text-secondary">{supplierBillingAddressRaw}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                {(supplierGstin || supplierPan || supplierPaymentTerms) && (
                                    <div className="pt-3 border-t border-border-subtle/50 flex flex-wrap gap-x-4 gap-y-2">
                                        {supplierGstin && (
                                            <div>
                                                <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-0.5">GSTIN / Tax ID</p>
                                                <p className="text-[11px] font-mono font-medium text-text-primary bg-bg-muted/70 px-1.5 py-0.5 rounded border border-border-subtle/50 inline-block">
                                                    {supplierGstin}
                                                </p>
                                            </div>
                                        )}
                                        {supplierPan && (
                                            <div>
                                                <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-0.5">PAN</p>
                                                <p className="text-[11px] font-mono font-medium text-text-primary bg-bg-muted/70 px-1.5 py-0.5 rounded border border-border-subtle/50 inline-block">
                                                    {supplierPan}
                                                </p>
                                            </div>
                                        )}
                                        {supplierPaymentTerms && (
                                            <div>
                                                <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-0.5">Terms</p>
                                                <p className="text-[11px] text-text-secondary">{supplierPaymentTerms}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {(supplierEmail || supplierPhone || supplierAltPhone) && (
                                    <div className="pt-3 border-t border-border-subtle/50 space-y-1.5">
                                        {supplierEmail && (
                                            <div className="flex items-center text-[12px] text-text-secondary break-all">
                                                <Mail className="w-3.5 h-3.5 mr-2 text-text-muted shrink-0" />
                                                <a href={`mailto:${supplierEmail}`} className="hover:text-brand-primary hover:underline transition-colors">
                                                    {supplierEmail}
                                                </a>
                                            </div>
                                        )}
                                        {(supplierPhone || supplierAltPhone) && (
                                            <div className="flex items-center text-[12px] text-text-secondary flex-wrap gap-y-1">
                                                <Phone className="w-3.5 h-3.5 mr-2 text-text-muted shrink-0" />
                                                {supplierPhone && (
                                                    <a href={`tel:${supplierPhone}`} className="hover:text-brand-primary transition-colors">
                                                        {supplierPhone}
                                                    </a>
                                                )}
                                                {supplierPhone && supplierAltPhone && (
                                                    <span className="text-text-muted mx-1.5">|</span>
                                                )}
                                                {supplierAltPhone && (
                                                    <span className="text-text-secondary">
                                                        <span className="text-text-muted text-[11px] mr-1">Alt:</span>
                                                        <a href={`tel:${supplierAltPhone}`} className="hover:text-brand-primary transition-colors">
                                                            {supplierAltPhone}
                                                        </a>
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Right Sub-section: Delivery / Destination Details */}
                            <div className="space-y-4 pt-4 md:pt-0 md:pl-5">
                                <div>
                                    <p className="text-[10px] text-teal-600 dark:text-teal-400 uppercase font-bold tracking-wider mb-1 flex items-center">
                                        <Truck className="w-3 h-3 mr-1" /> Destination Recipient
                                    </p>
                                    <p className="text-[15px] font-bold text-text-primary tracking-tight">
                                        {receivingContactName}
                                    </p>
                                    {supplierName && supplierName !== 'Supplier' && (
                                        <p className="text-[12px] text-text-secondary flex items-center mt-1">
                                            <Building2 className="w-3 h-3 mr-1.5 text-text-muted shrink-0" />
                                            <span>Direct Drop-Ship: </span>
                                            <span className="font-semibold text-text-primary ml-1">{supplierName}</span>
                                        </p>
                                    )}
                                </div>

                                {deliveryAddressLines.length > 0 ? (
                                    <div className="pt-2">
                                        <div className="flex items-start text-[13px] text-text-secondary">
                                            <MapPin className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-teal-500 dark:text-teal-400" />
                                            <div>
                                                <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-0.5">Delivery Address</p>
                                                <div className="leading-relaxed space-y-0.5 text-text-secondary text-[12px]">
                                                    {deliveryAddressLines.map((line, idx) => (
                                                        <p key={idx}>{line}</p>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : deliveryAddressRaw ? (
                                    <div className="pt-2">
                                        <div className="flex items-start text-[13px] text-text-secondary">
                                            <MapPin className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-teal-500 dark:text-teal-400" />
                                            <div>
                                                <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-0.5">Delivery Address</p>
                                                <p className="text-[12px] text-text-secondary">{deliveryAddressRaw}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                {(receivingContactPhone || receivingContactEmail) && (
                                    <div className="pt-3 border-t border-border-subtle/50 space-y-1.5">
                                        {receivingContactPhone && (
                                            <div className="flex items-center text-[12px] text-text-secondary">
                                                <Phone className="w-3.5 h-3.5 mr-2 text-text-muted shrink-0" />
                                                <span>Contact Phone: </span>
                                                <a href={`tel:${receivingContactPhone}`} className="font-semibold text-text-primary ml-1.5 hover:text-brand-primary transition-colors">
                                                    {receivingContactPhone}
                                                </a>
                                            </div>
                                        )}
                                        {receivingContactEmail && (
                                            <div className="flex items-center text-[12px] text-text-secondary break-all">
                                                <Mail className="w-3.5 h-3.5 mr-2 text-text-muted shrink-0" />
                                                <span>Contact Email: </span>
                                                <a href={`mailto:${receivingContactEmail}`} className="font-semibold text-text-primary ml-1.5 hover:text-brand-primary hover:underline transition-colors">
                                                    {receivingContactEmail}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 2: Source Quotation & Timeline Side-by-Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                {/* Source Quotation */}
                <div className="acx-card p-6 flex flex-col justify-between">
                    <div>
                        <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-4 flex items-center">
                            <FileDigit className="w-3.5 h-3.5 mr-2 text-brand-primary" /> Source Quotation
                        </h3>
                        <div className="space-y-4">
                            <div className="bg-bg-muted/50 rounded-xl p-3 border border-border-subtle flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-0.5">Ref Number</p>
                                    <button 
                                        type="button"
                                        onClick={() => navigate(`/quotations?search=${order?.quotationNumber || ''}`)}
                                        className="text-[13px] font-mono font-bold text-[var(--color-brand-primary)] hover:underline flex items-center"
                                    >
                                        {order?.quotationNumber || 'N/A'}
                                    </button>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                    <FileDigit className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-1">
                                <div>
                                    <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-1">Quotation Value</p>
                                    <p className="text-[16px] font-mono font-semibold text-text-primary tracking-tight">
                                        {formatCurrency(order?.quotationValue, order?.currency)}
                                    </p>
                                </div>
                                {quotation?.validUntil && (
                                    <div className="text-right">
                                        <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-1">Valid Until</p>
                                        <p className="text-[13px] font-medium text-text-secondary">
                                            {new Date(quotation.validUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timeline */}
                <div className="acx-card p-6 flex flex-col justify-between">
                    <div>
                        <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-5 flex items-center">
                            <Activity className="w-3.5 h-3.5 mr-2 text-brand-teal" /> Timeline
                        </h3>
                        <div className="relative border-l-2 border-border-subtle ml-2.5 space-y-6 pb-2">
                            <div className="relative pl-6">
                                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-brand-primary border-4 border-bg-card"></div>
                                <p className="text-[12px] font-bold text-text-primary">PO Created</p>
                                <p className="text-[11px] text-text-muted mt-0.5">
                                    {order?.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                </p>
                                <p className="text-[11px] text-text-secondary mt-1">by {order?.createdBy?.name || 'System'}</p>
                            </div>
                            {order?.verifiedAt && (
                                <div className="relative pl-6">
                                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-brand-teal border-4 border-bg-card"></div>
                                    <p className="text-[12px] font-bold text-text-primary">Verified</p>
                                    <p className="text-[11px] text-text-muted mt-0.5">
                                        {new Date(order.verifiedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <p className="text-[11px] text-text-secondary mt-1">by {order?.verifiedBy?.name || 'System'}</p>
                                </div>
                            )}
                            {order?.status === 'FULFILLED' && (
                                <div className="relative pl-6">
                                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-green-500 border-4 border-bg-card"></div>
                                    <p className="text-[12px] font-bold text-text-primary">Fulfilled</p>
                                    <p className="text-[11px] text-text-muted mt-0.5">
                                        {order?.updatedAt ? new Date(order.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Full-Width Order Details Table */}
            <div className="acx-card overflow-hidden w-full">
                <div className="px-6 py-5 border-b border-border-subtle bg-bg-card flex items-center justify-between">
                    <h3 className="text-[14px] font-bold text-text-primary tracking-tight flex items-center">
                        <ShoppingCart className="w-4 h-4 mr-2 text-brand-teal" /> Order Details
                        <span className="ml-3 text-[11px] font-semibold text-text-muted tracking-wide uppercase px-2 py-0.5 rounded bg-bg-muted border border-border-subtle">
                            {quotation?.items?.length || 0} {quotation?.items?.length === 1 ? 'Line Item' : 'Line Items'}
                        </span>
                    </h3>
                </div>
                <div ref={tableContainerRef} className="overflow-x-auto w-full no-scrollbar table-wrapper">
                    <table className="w-full text-left border-collapse min-w-full">
                        <thead>
                            <tr className="bg-bg-muted border-b border-border-subtle">
                                {visibleColumns.map((col) => (
                                    <th key={col.columnKey} className={getHeaderClass(col)}>
                                        {col.displayName}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {quotation?.items?.map((item, idx) => (
                                <tr key={idx} className="border-b border-border-subtle/40 hover:bg-bg-hover transition-colors">
                                    {visibleColumns.map((col) => (
                                        <td key={col.columnKey} className={getColumnClass(col)}>
                                            {renderColumnContent(item, col)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            {!quotation?.items?.length && (
                                <tr>
                                    <td colSpan={visibleColumns.length || 1} className="px-5 py-8 text-center text-text-muted text-[13px]">
                                        No line items found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Thin Synchronized Horizontal Scrollbar (4–6px) */}
                {isTableOverflowing && (
                    <div className="w-full px-6 py-2.5 bg-bg-muted/30 border-t border-border-subtle/40 select-none">
                        <div
                            ref={scrollTrackRef}
                            onClick={handleTrackClick}
                            className="relative w-full h-[5px] bg-border-subtle/60 dark:bg-slate-800 rounded-full cursor-pointer overflow-hidden transition-colors hover:bg-border-subtle"
                            title="Drag or click to scroll horizontally"
                        >
                            <div
                                onMouseDown={handleThumbMouseDown}
                                style={{
                                    width: `${Math.max(8, Math.min(100, (scrollMetrics.clientWidth / scrollMetrics.scrollWidth) * 100))}%`,
                                    left: `${(scrollMetrics.scrollLeft / maxTableScroll) * (100 - Math.max(8, Math.min(100, (scrollMetrics.clientWidth / scrollMetrics.scrollWidth) * 100)))}%`
                                }}
                                className="absolute top-0 bottom-0 bg-[var(--color-brand-primary,#2563EB)] hover:brightness-110 active:brightness-95 rounded-full cursor-grab active:cursor-grabbing shadow-sm transition-transform duration-75"
                            />
                        </div>
                    </div>
                )}
                
                {/* Summary / Totals inside Table Card Footer */}
                <div className="bg-bg-muted/30 p-6 border-t border-border-subtle">
                    <div className="w-full sm:w-[340px] ml-auto space-y-3">
                        <div className="flex justify-between text-[13px] text-text-secondary">
                            <span className="font-medium">Subtotal</span>
                            <span className="font-mono font-semibold text-text-primary">{formatCurrency(totals.subtotalBeforeTax, order?.currency)}</span>
                        </div>
                        {totals.discount > 0 && (
                            <div className="flex justify-between text-[13px]">
                                <span className="font-medium text-text-secondary">Discount</span>
                                <span className="text-brand-danger font-mono font-semibold">-{formatCurrency(totals.discount, order?.currency)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-[13px] text-text-secondary">
                            <span className="font-medium">Taxable Amount</span>
                            <span className="font-mono font-semibold text-text-primary">{formatCurrency(totals.taxableAmount, order?.currency)}</span>
                        </div>
                        <div className="flex justify-between text-[13px] text-text-secondary pb-4 border-b border-border-subtle">
                            <span className="font-medium">Total Tax</span>
                            <span className="font-mono font-semibold text-text-primary">{formatCurrency(totals.tax, order?.currency)}</span>
                        </div>
                        <div className="flex justify-between items-end pt-2">
                            <span className="text-[14px] font-bold text-text-primary uppercase tracking-wide">Grand Total</span>
                            <span className="text-[26px] font-bold text-brand-teal font-mono tracking-tight leading-none">
                                {formatCurrency(totals.grandTotal, order?.currency)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Terms & Remarks Row */}
            <div className={`grid grid-cols-1 ${quotation?.termsAndConditions ? 'lg:grid-cols-2' : ''} gap-6`}>
                {quotation?.termsAndConditions && (
                    <div className="acx-card p-6">
                        <h3 className="text-[12px] font-bold text-text-secondary uppercase tracking-wider mb-4 pb-3 border-b border-border-subtle">
                            Terms & Conditions
                        </h3>
                        <div className="text-[13px] text-text-secondary whitespace-pre-wrap leading-relaxed font-normal">
                            {quotation.termsAndConditions}
                        </div>
                    </div>
                )}
                
                {/* Remarks / Additional Notes */}
                <div className="acx-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-brand-primary" />
                            <h3 className="text-[12px] font-bold text-text-primary uppercase tracking-wider">
                                Remarks / Additional Notes
                            </h3>
                        </div>
                        {isSuperAdmin && !isEditingRemarks && order?.status !== 'VERIFIED' && !order?.readOnly ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setEditedRemarks(order?.remarks || '');
                                    setIsEditingRemarks(true);
                                }}
                                className="text-xs font-semibold text-brand-primary hover:text-brand-primary/80 flex items-center gap-1.5 transition-colors"
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                                {order?.remarks ? 'Edit Notes' : 'Add Notes'}
                            </button>
                        ) : (order?.status === 'VERIFIED' || order?.readOnly) ? (
                            <span className="text-[11px] font-semibold text-text-muted flex items-center gap-1 bg-bg-muted px-2 py-0.5 rounded border border-border-subtle">
                                <Lock className="w-3 h-3 text-text-muted" /> Read-Only
                            </span>
                        ) : null}
                    </div>

                    {isEditingRemarks ? (
                        <div className="space-y-3">
                            <textarea
                                rows="3"
                                maxLength={2000}
                                value={editedRemarks}
                                onChange={(e) => setEditedRemarks(e.target.value)}
                                placeholder="Add delivery instructions, special requirements, or other notes..."
                                className="w-full bg-bg-main border border-border-subtle rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-brand-primary placeholder:text-text-muted/60"
                            />
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-text-muted">
                                    {(editedRemarks || '').length} / 2000
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditedRemarks(order?.remarks || '');
                                            setIsEditingRemarks(false);
                                        }}
                                        className="btn btn-secondary btn-sm"
                                        disabled={savingRemarks}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveRemarks}
                                        className="btn btn-primary btn-sm flex items-center gap-1.5"
                                        disabled={savingRemarks}
                                    >
                                        {savingRemarks && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                        Save Notes
                                    </button>
                                </div>
                            </div>
                            <p className="text-[11px] text-text-muted">
                                These notes are rendered on the Purchase Order PDF in a dedicated Remarks panel, kept separate from Terms & Conditions.
                            </p>
                        </div>
                    ) : order?.remarks ? (
                        <div className="text-[13px] text-text-secondary whitespace-pre-wrap leading-relaxed bg-brand-primary/5 p-4 rounded-xl border border-brand-primary/10">
                            {order.remarks}
                        </div>
                    ) : (
                        <p className="text-[13px] text-text-muted italic">
                            {order?.status === 'VERIFIED' || order?.readOnly
                                ? 'No additional notes or instructions recorded for this purchase order.'
                                : 'No additional notes or instructions specified. Click “Add Notes” to include remarks on this PO.'}
                        </p>
                    )}
                </div>
            </div>

            {/* Invoices & Billing Section */}
            <div className="acx-card p-6 border border-border-subtle shadow-sm bg-bg-card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border-subtle gap-4">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
                            <Receipt className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-[16px] font-bold text-text-primary tracking-tight">Invoices & Billing</h2>
                            <p className="text-[12px] text-text-secondary mt-0.5">
                                Track downstream Tax Invoices linked to this Purchase Order
                            </p>
                        </div>
                    </div>
                    {isSuperAdmin && ['VERIFIED', 'PARTIALLY_FULFILLED'].includes(order?.status) && (
                        <button
                            type="button"
                            onClick={handleOpenCreateTaxInvoiceModal}
                            disabled={actionLoading || (
                                order?.poValue != null && 
                                relatedInvoices.filter(i => i.status !== 'CANCELLED').reduce((sum, i) => sum + (Number(i.grandTotal) || 0), 0) >= Number(order.poValue) &&
                                relatedInvoices.some(i => i.status !== 'CANCELLED')
                            )}
                            className="btn btn-primary btn-sm flex items-center self-start sm:self-auto shadow-sm"
                        >
                            <FileText className="w-3.5 h-3.5 mr-1.5" />
                            Create Tax Invoice
                        </button>
                    )}
                </div>

                {/* Billing Summary Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-5 p-4 rounded-xl bg-bg-muted/40 border border-border-subtle">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">Authorized PO Value</span>
                        <span className="text-[16px] font-bold font-mono text-text-primary mt-1 block">
                            {formatCurrency(order.poValue, order.currency)}
                        </span>
                    </div>
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">Total Invoiced Amount</span>
                        <span className="text-[16px] font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
                            {formatCurrency(
                                relatedInvoices.filter(i => i.status !== 'CANCELLED').reduce((sum, i) => sum + (Number(i.grandTotal) || 0), 0),
                                order.currency
                            )}
                        </span>
                    </div>
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">Remaining Invoicable</span>
                        <span className="text-[16px] font-bold font-mono text-brand-primary mt-1 block">
                            {formatCurrency(
                                Math.max(0, (Number(order.poValue) || 0) - relatedInvoices.filter(i => i.status !== 'CANCELLED').reduce((sum, i) => sum + (Number(i.grandTotal) || 0), 0)),
                                order.currency
                            )}
                        </span>
                    </div>
                </div>

                {/* Related Invoices Table or Empty State */}
                {relatedInvoices.length > 0 ? (
                    <div className="overflow-x-auto border border-border-subtle rounded-xl">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-bg-muted/70 text-[11px] font-bold uppercase tracking-wider text-text-secondary border-b border-border-subtle">
                                <tr>
                                    <th className="py-3 px-4">Invoice #</th>
                                    <th className="py-3 px-4">Type</th>
                                    <th className="py-3 px-4">Invoice Date</th>
                                    <th className="py-3 px-4">Due Date</th>
                                    <th className="py-3 px-4 text-center">Status</th>
                                    <th className="py-3 px-4 text-right">Grand Total</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-subtle/60">
                                {relatedInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-bg-hover/50 transition-colors">
                                        <td className="py-3 px-4 font-mono font-bold text-text-primary">
                                            {inv.invoiceNumber || (
                                                <span className="text-amber-600 dark:text-amber-400 font-normal">
                                                    Draft #{inv.id}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                                {inv.invoiceType === 'TAX_INVOICE' ? 'Tax Invoice' : 'Proforma'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-text-secondary">
                                            {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                        </td>
                                        <td className="py-3 px-4 text-text-secondary">
                                            {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                                                inv.status === 'PAID' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' :
                                                inv.status === 'ISSUED' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30' :
                                                inv.status === 'PARTIALLY_PAID' ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30' :
                                                inv.status === 'CANCELLED' ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30' :
                                                'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                            }`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 font-mono font-bold text-right text-text-primary">
                                            {formatCurrency(inv.grandTotal, inv.currency || order.currency)}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/invoices/${inv.id}`)}
                                                className="btn btn-secondary btn-sm inline-flex items-center text-xs"
                                            >
                                                <Eye className="w-3.5 h-3.5 mr-1" />
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 px-4 rounded-xl bg-bg-muted/30 border border-dashed border-border-subtle">
                        <FileText className="w-8 h-8 mx-auto text-text-muted mb-2 opacity-50" />
                        <p className="text-[13px] font-semibold text-text-primary">No invoices created yet</p>
                        <p className="text-[12px] text-text-muted mt-1 max-w-md mx-auto">
                            {order.status === 'VERIFIED'
                                ? `This verified Purchase Order has an unbilled value of ${formatCurrency(order.poValue, order.currency)} ready to be invoiced.`
                                : 'Invoices can be created once this Purchase Order is verified.'}
                        </p>
                        {isSuperAdmin && ['VERIFIED', 'PARTIALLY_FULFILLED'].includes(order.status) && (
                            <button
                                type="button"
                                onClick={handleOpenCreateTaxInvoiceModal}
                                className="btn btn-primary btn-sm inline-flex items-center mt-4 shadow-sm"
                            >
                                <FileText className="w-3.5 h-3.5 mr-1.5" />
                                Create Tax Invoice Now
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Status Update Modal */}
            {statusModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-modal-entrance">
                    <div className="bg-bg-card border border-border-subtle rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
                        <div className="p-5 border-b border-border-subtle flex justify-between items-center bg-bg-muted/30">
                            <h2 className="text-[16px] font-bold text-text-primary flex items-center">
                                <Activity className="w-4 h-4 mr-2 text-brand-primary" /> Update Status
                            </h2>
                            <button onClick={() => setStatusModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleStatusUpdate} className="p-6">
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wider mb-2">New Status *</label>
                                    <select 
                                        required
                                        value={newStatus} 
                                        onChange={(e) => setNewStatus(e.target.value)}
                                        className="acx-input w-full"
                                    >
                                        <option value="">Select status</option>
                                        {['PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED'].map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wider mb-2">Remarks</label>
                                    <textarea 
                                        rows="3"
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        placeholder="Add notes about this status change..."
                                        className="acx-input w-full resize-y min-h-[80px]"
                                    />
                                </div>
                            </div>
                            <div className="mt-8 flex justify-end gap-3">
                                <button type="button" onClick={() => setStatusModalOpen(false)} className="btn btn-secondary btn-md">
                                    Cancel
                                </button>
                                <button type="submit" disabled={actionLoading || !newStatus} className="btn btn-primary btn-md">
                                    {actionLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2"/> Updating...</> : 'Update Status'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Preview PDF Modal */}
            {isPreviewModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-modal-entrance">
                    <div className="bg-bg-card rounded-2xl shadow-2xl w-full max-w-[1200px] h-[90vh] flex flex-col relative overflow-hidden border border-border-subtle">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-muted/50">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-brand-primary" />
                                </div>
                                <div>
                                    <h2 className="text-[16px] font-bold text-text-primary tracking-tight leading-none">Purchase Order Preview</h2>
                                    <p className="text-[12px] text-text-secondary mt-1">Review the generated PDF document</p>
                                </div>
                            </div>
                            <button onClick={closePreviewModal} className="btn btn-ghost btn-icon">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 bg-[#525659] relative w-full h-full">
                            {previewPdfUrl ? (
                                <iframe 
                                    src={previewPdfUrl} 
                                    className="w-full h-full border-none" 
                                    title="PDF Preview"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-white/50">
                                    Failed to load PDF preview
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Tax Invoice Modal */}
            {isCreateInvoiceModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-modal-entrance overflow-y-auto">
                    <div className="bg-bg-card border border-border-subtle rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden relative">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-border-subtle flex justify-between items-center bg-bg-muted/40 shrink-0">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
                                    <Receipt className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-[18px] font-bold text-text-primary tracking-tight leading-none">
                                        Create Tax Invoice
                                    </h2>
                                    <p className="text-[12px] text-text-secondary mt-1">
                                        From Purchase Order <span className="font-mono font-bold text-text-primary">{order.poNumber}</span>
                                        {order.clientPoNumber ? ` (Client PO: ${order.clientPoNumber})` : ''}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => !isCreatingInvoice && setIsCreateInvoiceModalOpen(false)} 
                                disabled={isCreatingInvoice}
                                className="btn btn-ghost btn-icon text-text-muted hover:text-text-primary"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Scrollable Body */}
                        <form onSubmit={handleCreateTaxInvoiceSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Summary banner */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-brand-primary/5 border border-brand-primary/15">
                                <div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">PO Number</span>
                                    <span className="text-[13px] font-bold font-mono text-text-primary block mt-0.5 truncate">{order.poNumber}</span>
                                </div>
                                <div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">Authorized PO Total</span>
                                    <span className="text-[13px] font-bold font-mono text-text-primary block mt-0.5">
                                        {formatCurrency(order.poValue, order.currency)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">Already Invoiced</span>
                                    <span className="text-[13px] font-bold font-mono text-emerald-600 dark:text-emerald-400 block mt-0.5">
                                        {formatCurrency(
                                            relatedInvoices.filter(i => i.status !== 'CANCELLED').reduce((sum, i) => sum + (Number(i.grandTotal) || 0), 0),
                                            order.currency
                                        )}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">Invoice Type</span>
                                    <span className="inline-flex items-center px-2 py-0.5 mt-0.5 rounded text-[11px] font-bold bg-brand-teal/15 text-brand-teal border border-brand-teal/30 uppercase tracking-wider">
                                        TAX INVOICE
                                    </span>
                                </div>
                            </div>

                            {/* Error Alert */}
                            {invoiceFormError && (
                                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-[13px] font-bold text-rose-700 dark:text-rose-300">Invoice Creation Error</h4>
                                        <p className="text-[12px] text-rose-600 dark:text-rose-400 mt-0.5 leading-relaxed">{invoiceFormError}</p>
                                    </div>
                                </div>
                            )}

                            {/* Section 1: Invoice Configuration */}
                            <div className="space-y-4">
                                <h3 className="text-[13px] font-bold text-text-primary uppercase tracking-wider border-b border-border-subtle pb-2 flex items-center gap-2">
                                    <CalendarDays className="w-4 h-4 text-brand-primary" />
                                    Invoice Dates & Terms
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                                            Invoice Date *
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={invoiceForm.invoiceDate}
                                            onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })}
                                            className="acx-input w-full text-xs font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                                            Due Date
                                        </label>
                                        <input
                                            type="date"
                                            value={invoiceForm.dueDate}
                                            onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                                            className="acx-input w-full text-xs font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                                            Payment Terms
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Net 30, Due on Receipt"
                                            value={invoiceForm.paymentTerms}
                                            onChange={(e) => setInvoiceForm({ ...invoiceForm, paymentTerms: e.target.value })}
                                            className="acx-input w-full text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                                            Place of Supply
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. State code or name"
                                            value={invoiceForm.placeOfSupply}
                                            onChange={(e) => setInvoiceForm({ ...invoiceForm, placeOfSupply: e.target.value })}
                                            className="acx-input w-full text-xs"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Client & Billing Information */}
                            <div className="space-y-4">
                                <h3 className="text-[13px] font-bold text-text-primary uppercase tracking-wider border-b border-border-subtle pb-2 flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-brand-primary" />
                                    Customer & Billing Snapshot
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                                            Client Name
                                        </label>
                                        <input
                                            type="text"
                                            value={invoiceForm.clientName}
                                            onChange={(e) => setInvoiceForm({ ...invoiceForm, clientName: e.target.value })}
                                            className="acx-input w-full text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                                            Company Name
                                        </label>
                                        <input
                                            type="text"
                                            value={invoiceForm.clientCompany}
                                            onChange={(e) => setInvoiceForm({ ...invoiceForm, clientCompany: e.target.value })}
                                            className="acx-input w-full text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                                            Client Email
                                        </label>
                                        <input
                                            type="email"
                                            value={invoiceForm.clientEmail}
                                            onChange={(e) => setInvoiceForm({ ...invoiceForm, clientEmail: e.target.value })}
                                            className="acx-input w-full text-xs font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                                            Client GSTIN
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 29ABCDE1234F1Z5"
                                            value={invoiceForm.clientGstin}
                                            onChange={(e) => setInvoiceForm({ ...invoiceForm, clientGstin: e.target.value })}
                                            className="acx-input w-full text-xs font-mono uppercase"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                                            Billing Address
                                        </label>
                                        <textarea
                                            rows="2"
                                            value={invoiceForm.clientAddress}
                                            onChange={(e) => setInvoiceForm({ ...invoiceForm, clientAddress: e.target.value })}
                                            className="acx-input w-full text-xs"
                                            placeholder="Complete registered billing address"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Line Items Preview */}
                            <div className="space-y-3">
                                <h3 className="text-[13px] font-bold text-text-primary uppercase tracking-wider border-b border-border-subtle pb-2 flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <Package className="w-4 h-4 text-brand-primary" />
                                        Line Items Preview ({quotation?.items?.length || 0} items)
                                    </span>
                                    <span className="text-[11px] text-text-muted lowercase font-normal">
                                        prefilled from source quotation
                                    </span>
                                </h3>
                                <div className="border border-border-subtle rounded-xl overflow-hidden">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-bg-muted/70 uppercase text-[10px] font-bold text-text-secondary tracking-wider">
                                            <tr>
                                                <th className="py-2.5 px-3">#</th>
                                                <th className="py-2.5 px-3">Description</th>
                                                <th className="py-2.5 px-3 text-right">Qty</th>
                                                <th className="py-2.5 px-3 text-right">Unit Price</th>
                                                <th className="py-2.5 px-3 text-right">Disc %</th>
                                                <th className="py-2.5 px-3 text-right">Tax %</th>
                                                <th className="py-2.5 px-3 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border-subtle/50">
                                            {quotation?.items?.map((item, idx) => {
                                                const qty = Number(item.quantity) || 0;
                                                const unitPrice = Number(item.unitPrice) || 0;
                                                const disc = Number(item.discountPercent) || 0;
                                                const tax = Number(item.taxPercent) || 0;
                                                const taxable = qty * unitPrice * (1 - disc / 100);
                                                const lineTotal = taxable * (1 + tax / 100);
                                                return (
                                                    <tr key={idx} className="hover:bg-bg-hover/30">
                                                        <td className="py-2.5 px-3 text-text-muted font-mono">{idx + 1}</td>
                                                        <td className="py-2.5 px-3 font-medium text-text-primary">
                                                            {item.description}
                                                            {item.hsnSac && (
                                                                <span className="text-[10px] text-text-muted font-mono block">HSN/SAC: {item.hsnSac}</span>
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono">{qty} {item.unit || ''}</td>
                                                        <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(unitPrice, order?.currency)}</td>
                                                        <td className="py-2.5 px-3 text-right font-mono">{disc}%</td>
                                                        <td className="py-2.5 px-3 text-right font-mono">{tax}%</td>
                                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-text-primary">
                                                            {formatCurrency(lineTotal, order?.currency)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot className="bg-bg-muted/40 font-bold border-t border-border-subtle">
                                            <tr>
                                                <td colSpan="6" className="py-3 px-3 text-right uppercase text-[11px] text-text-secondary">
                                                    Calculated Total:
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono text-[13px] text-emerald-600 dark:text-emerald-400">
                                                    {formatCurrency(quotation?.grandTotal || order?.poValue, order?.currency)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {/* Section 4: Terms & Conditions */}
                            <div className="space-y-2">
                                <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                                    Terms & Conditions
                                </label>
                                <textarea
                                    rows="2"
                                    value={invoiceForm.termsAndConditions}
                                    onChange={(e) => setInvoiceForm({ ...invoiceForm, termsAndConditions: e.target.value })}
                                    className="acx-input w-full text-xs"
                                    placeholder="Commercial terms, payment details, notes..."
                                />
                            </div>

                            {/* Modal Actions Footer */}
                            <div className="pt-4 border-t border-border-subtle flex items-center justify-between gap-3 shrink-0">
                                <span className="text-[11px] text-text-muted hidden sm:inline">
                                    Invoice will be generated in <strong>DRAFT</strong> mode and can be reviewed before issuing.
                                </span>
                                <div className="flex items-center gap-3 ml-auto">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateInvoiceModalOpen(false)}
                                        disabled={isCreatingInvoice}
                                        className="btn btn-secondary btn-md"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isCreatingInvoice}
                                        className="btn btn-primary btn-md flex items-center shadow-sm"
                                    >
                                        {isCreatingInvoice ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                Creating Tax Invoice...
                                            </>
                                        ) : (
                                            <>
                                                <FileText className="w-4 h-4 mr-2" />
                                                Create Tax Invoice
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Verify PO Confirmation Modal */}
            {verifyModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-modal-entrance">
                    <div className="bg-bg-card border border-border-subtle rounded-2xl shadow-xl w-full max-w-md p-6 relative">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <h3 className="text-[18px] font-bold text-text-primary tracking-tight">
                            Verify Purchase Order?
                        </h3>
                        <p className="text-[13px] text-text-secondary mt-2 leading-relaxed">
                            Verifying this Purchase Order (<span className="font-mono font-bold text-text-primary">{order?.poNumber}</span>) will place it in <strong>Read-Only Mode</strong> and enable downstream Tax Invoice creation.
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setVerifyModalOpen(false)}
                                disabled={actionLoading}
                                className="btn btn-secondary btn-md"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleVerify}
                                disabled={actionLoading}
                                className="btn btn-primary btn-md flex items-center shadow-sm"
                            >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                Confirm Verification
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
