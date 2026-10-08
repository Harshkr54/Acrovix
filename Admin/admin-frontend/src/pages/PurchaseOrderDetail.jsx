import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPurchaseOrderById, verifyPurchaseOrder, updatePurchaseOrderStatus, createInvoiceFromPurchaseOrder, fetchApi, getCompanySettings } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Clock, CheckCircle, Package, XCircle, FileText, Download, AlertTriangle, Eye, X, Building2, MapPin, Mail, Phone, Hash, CalendarDays, Receipt, UserSquare2, Loader2, Link, ShoppingCart, User, FileDigit, Activity } from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import { formatCurrency } from '../utils/formatters';

export default function PurchaseOrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [order, setOrder] = useState(null);
    const [quotation, setQuotation] = useState(null);
    const [companySettings, setCompanySettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [remarks, setRemarks] = useState('');
    
    const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);

    const fetchOrderData = async () => {
        try {
            setLoading(true);
            const poData = await getPurchaseOrderById(id);
            setOrder(poData);
            
            const [qData, cData] = await Promise.all([
                fetchApi(`/quotations/${poData.quotationId}`).catch(() => null),
                getCompanySettings().catch(() => null)
            ]);
            setQuotation(qData);
            setCompanySettings(cData);
            
        } catch (error) {
            console.error('Failed to fetch PO data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrderData();
    }, [id]);

    const handleVerify = async () => {
        if (!window.confirm('Are you sure you want to verify this Purchase Order?')) return;
        try {
            setActionLoading(true);
            await verifyPurchaseOrder(id);
            await fetchOrderData();
        } catch (error) {
            console.error('Failed to verify PO', error);
            alert(error.message || 'Failed to verify PO');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateTaxInvoice = async () => {
        if (!window.confirm('Create a Tax Invoice from this Purchase Order?')) return;
        try {
            setActionLoading(true);
            const invoice = await createInvoiceFromPurchaseOrder(id, 'TAX_INVOICE');
            navigate(`/invoices/${invoice.id}`);
        } catch (error) {
            console.error('Failed to create Tax Invoice', error);
            alert(error.message || 'Failed to create Tax Invoice');
        } finally {
            setActionLoading(false);
        }
    };

    const handleStatusUpdate = async (e) => {
        e.preventDefault();
        try {
            setActionLoading(true);
            await updatePurchaseOrderStatus(id, { status: newStatus, remarks });
            setStatusModalOpen(false);
            setRemarks('');
            await fetchOrderData();
        } catch (error) {
            console.error('Failed to update status', error);
            alert(error.message || 'Failed to update status');
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="flex flex-col items-center">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-primary mb-4" />
                    <p className="text-[13px] text-text-muted font-medium">Loading Document...</p>
                </div>
            </div>
        );
    }
    
    if (!order) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
                <div className="w-16 h-16 bg-brand-danger/10 flex items-center justify-center rounded-[20px] mb-6">
                    <AlertTriangle className="w-8 h-8 text-brand-danger" />
                </div>
                <h2 className="text-[20px] font-bold text-text-primary mb-2">Purchase Order Not Found</h2>
                <button onClick={() => navigate('/purchase-orders')} className="btn btn-primary btn-md mt-4">
                    Back to Purchase Orders
                </button>
            </div>
        );
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'RECEIVED': return <Clock className="w-4 h-4 text-yellow-500"/>;
            case 'VERIFIED': return <CheckCircle className="w-4 h-4 text-blue-500"/>;
            case 'PARTIALLY_FULFILLED': return <Package className="w-4 h-4 text-purple-500"/>;
            case 'FULFILLED': return <CheckCircle className="w-4 h-4 text-green-500"/>;
            case 'CANCELLED': return <XCircle className="w-4 h-4 text-red-500"/>;
            default: return null;
        }
    };

    const getColumnValue = (item, colKey) => {
        if (colKey === "rowNumber") return item.sortOrder + 1;
        if (["sku", "description", "hsnSac", "quantity", "listPrice", "discountPercent", "unitPrice", "taxPercent"].includes(colKey)) {
            return item[colKey];
        }
        return item.customValues?.[colKey] || "-";
    };

    const renderColumnContent = (item, col) => {
        const value = getColumnValue(item, col.columnKey);
        if (col.columnType === "CURRENCY") {
            return formatCurrency(value, order.currency);
        }
        if (col.columnType === "NUMBER" && col.columnKey.includes("Percent")) {
            return `${value}%`;
        }
        return value;
    };

    // Calculation for footer totals from quotation items
    const calculateTotals = () => {
        let subtotalBeforeTax = 0;
        let taxableAmount = 0;
        let tax = 0;
        let discount = 0;

        if(quotation && quotation.items) {
            quotation.items.forEach(item => {
                const qty = parseFloat(item.quantity) || 0;
                const lp = parseFloat(item.listPrice) || 0;
                const up = parseFloat(item.unitPrice) || 0;
                const taxPct = parseFloat(item.taxPercent) || 0;
    
                const lineGross = qty * lp;
                const lineNet = qty * up;
                const lineDisc = lineGross - lineNet;
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
    const visibleColumns = quotation?.columnConfigs?.filter(c => c.visible).sort((a,b)=>a.sortOrder-b.sortOrder) || [];

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-24">
            {/* Top Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/purchase-orders')}
                        className="btn btn-secondary btn-icon border-border-subtle hover:bg-bg-muted"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <div className="flex items-center space-x-3 mb-1">
                            <h1 className="text-[28px] font-bold text-text-primary tracking-tight leading-tight flex items-center gap-3">
                                {companySettings?.logoUrl ? (
                                    <img src={companySettings.logoUrl} alt="Logo" className="h-8 object-contain" />
                                ) : (
                                    <Building2 className="w-7 h-7 text-brand-primary" />
                                )}
                                <span className="opacity-40 font-light mx-1">|</span>
                                Purchase Order
                            </h1>
                        </div>
                        <p className="text-[13px] font-mono text-text-muted flex items-center mt-1">
                            {order.poNumber}
                            <span className="inline-flex items-center ml-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-bg-muted border border-border-subtle uppercase tracking-wider gap-1.5 text-text-secondary">
                                {getStatusIcon(order.status)}
                                {order.status}
                            </span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
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
                    
                    {order.status === 'RECEIVED' && (
                        <button 
                            onClick={handleVerify}
                            disabled={actionLoading}
                            className="btn btn-primary btn-md flex items-center"
                        >
                            <CheckCircle className="w-4 h-4 mr-2" /> Verify
                        </button>
                    )}
                    {['VERIFIED', 'PARTIALLY_FULFILLED'].includes(order.status) && (
                        <button 
                            onClick={handleCreateTaxInvoice}
                            disabled={actionLoading}
                            className="btn btn-success btn-md flex items-center"
                        >
                            <FileText className="w-4 h-4 mr-2" /> Tax Invoice
                        </button>
                    )}
                    {['VERIFIED', 'PARTIALLY_FULFILLED'].includes(order.status) && (
                        <button 
                            onClick={() => { setNewStatus(''); setStatusModalOpen(true); }}
                            className="btn btn-primary btn-md"
                        >
                            Update Status
                        </button>
                    )}
                </div>
            </div>

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
                                {new Date(order.poDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
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
                            <p className="text-[14px] font-semibold text-text-primary">{order.clientPoNumber || 'N/A'}</p>
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
                                {formatCurrency(order.poValue, order.currency)}
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
                            <p className="text-[14px] font-semibold text-text-primary">{order.receivedVia || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mismatch Warning */}
            {order.valueMismatch && (
                <div className="p-4 bg-brand-danger/10 border border-brand-danger/30 rounded-2xl flex items-center gap-4 shadow-sm animate-modal-entrance">
                    <AlertTriangle className="w-8 h-8 text-brand-danger shrink-0" />
                    <div>
                        <h3 className="text-[14px] font-bold text-brand-danger mb-0.5">Value Mismatch Detected</h3>
                        <p className="text-[13px] font-medium text-brand-danger/80">
                            PO Value ({formatCurrency(order.poValue, order.currency)}) differs from Quotation Value ({formatCurrency(order.quotationValue, order.currency)}).
                            Difference: {formatCurrency(order.difference, order.currency)}
                        </p>
                    </div>
                </div>
            )}

            {/* Main Content 2-Column */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT COLUMN: Bill To, Ship To, Details, Terms */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Bill To & Ship To Side-by-Side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="acx-card p-6 border-t-4 border-t-[var(--color-brand-primary)]">
                            <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-4 flex items-center">
                                <Building2 className="w-3.5 h-3.5 mr-2" /> BILL TO (ACROVIX)
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-[14px] font-bold text-text-primary">{companySettings?.companyName || 'ACROVIX INNOVATIONS PRIVATE LIMITED'}</p>
                                </div>
                                {companySettings?.registeredAddress && (
                                    <div className="flex items-start text-[13px] text-text-secondary">
                                        <MapPin className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-text-muted" />
                                        <p className="leading-relaxed">{companySettings.registeredAddress}</p>
                                    </div>
                                )}
                                <div className="pt-2 border-t border-border-subtle/50 grid grid-cols-2 gap-y-2">
                                    {companySettings?.gstin && (
                                        <div>
                                            <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-0.5">GSTIN</p>
                                            <p className="text-[12px] font-mono text-text-primary">{companySettings.gstin}</p>
                                        </div>
                                    )}
                                    {companySettings?.pan && (
                                        <div>
                                            <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-0.5">PAN</p>
                                            <p className="text-[12px] font-mono text-text-primary">{companySettings.pan}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="pt-2 border-t border-border-subtle/50 space-y-2">
                                    {companySettings?.email && (
                                        <div className="flex items-center text-[12px] text-text-secondary">
                                            <Mail className="w-3.5 h-3.5 mr-2 text-text-muted" /> {companySettings.email}
                                        </div>
                                    )}
                                    {companySettings?.phone && (
                                        <div className="flex items-center text-[12px] text-text-secondary">
                                            <Phone className="w-3.5 h-3.5 mr-2 text-text-muted" /> {companySettings.phone}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="acx-card p-6 border-t-4 border-t-brand-teal">
                            <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-4 flex items-center">
                                <UserSquare2 className="w-3.5 h-3.5 mr-2" /> SHIP TO / VENDOR
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-[14px] font-bold text-text-primary">{order.clientCompany || order.clientName}</p>
                                    {order.clientCompany && order.clientName !== order.clientCompany && (
                                        <p className="text-[12px] text-text-secondary flex items-center mt-1">
                                            <User className="w-3 h-3 mr-1.5" /> Attn: {order.clientName}
                                        </p>
                                    )}
                                </div>
                                {quotation?.customer?.billingAddress && (
                                    <div className="flex items-start text-[13px] text-text-secondary">
                                        <MapPin className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-text-muted" />
                                        <p className="leading-relaxed">{quotation.customer.billingAddress}</p>
                                    </div>
                                )}
                                <div className="pt-2 border-t border-border-subtle/50 grid grid-cols-2 gap-y-2">
                                    {quotation?.customer?.gstin && (
                                        <div className="col-span-2">
                                            <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-0.5">Vendor GSTIN</p>
                                            <p className="text-[12px] font-mono text-text-primary">{quotation.customer.gstin}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="pt-2 border-t border-border-subtle/50 space-y-2">
                                    {quotation?.clientEmail && (
                                        <div className="flex items-center text-[12px] text-text-secondary">
                                            <Mail className="w-3.5 h-3.5 mr-2 text-text-muted" /> {quotation.clientEmail}
                                        </div>
                                    )}
                                    {quotation?.clientPhone && (
                                        <div className="flex items-center text-[12px] text-text-secondary">
                                            <Phone className="w-3.5 h-3.5 mr-2 text-text-muted" /> {quotation.clientPhone}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Order Details Table */}
                    <div className="acx-card overflow-hidden">
                        <div className="px-6 py-5 border-b border-border-subtle flex justify-between items-center bg-bg-card">
                            <h3 className="text-[14px] font-bold text-text-primary tracking-tight flex items-center">
                                <ShoppingCart className="w-4 h-4 mr-2 text-brand-teal" /> Order Details
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-bg-muted border-b border-border-subtle">
                                        {visibleColumns.map((col) => (
                                            <th key={col.columnKey} className="px-5 py-3 text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                                                {col.displayName}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {quotation?.items?.map((item, idx) => (
                                        <tr key={idx} className="border-b border-border-subtle/40 hover:bg-bg-hover transition-colors">
                                            {visibleColumns.map((col) => (
                                                <td key={col.columnKey} className="px-5 py-3 text-[13px] text-text-primary">
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
                        
                        {/* Summary / Totals inside Table Card Footer */}
                        <div className="bg-bg-muted/30 p-6 border-t border-border-subtle">
                            <div className="w-full md:w-1/2 ml-auto space-y-3">
                                <div className="flex justify-between text-[13px] text-text-secondary">
                                    <span className="font-medium">Subtotal (Before Tax)</span>
                                    <span className="font-mono font-semibold text-text-primary">{formatCurrency(totals.subtotalBeforeTax, order.currency)}</span>
                                </div>
                                {totals.discount > 0 && (
                                    <div className="flex justify-between text-[13px]">
                                        <span className="font-medium text-text-secondary">Discount</span>
                                        <span className="text-brand-danger font-mono font-semibold">-{formatCurrency(totals.discount, order.currency)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-[13px] text-text-secondary">
                                    <span className="font-medium">Taxable Amount</span>
                                    <span className="font-mono font-semibold text-text-primary">{formatCurrency(totals.taxableAmount, order.currency)}</span>
                                </div>
                                <div className="flex justify-between text-[13px] text-text-secondary pb-4 border-b border-border-subtle">
                                    <span className="font-medium">Total Tax</span>
                                    <span className="font-mono font-semibold text-text-primary">{formatCurrency(totals.tax, order.currency)}</span>
                                </div>
                                <div className="flex justify-between items-end pt-2">
                                    <span className="text-[15px] font-bold text-text-primary">Grand Total</span>
                                    <span className="text-[28px] font-bold text-brand-teal font-mono tracking-tight leading-none">
                                        {formatCurrency(totals.grandTotal, order.currency)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Terms & Remarks */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {quotation?.termsAndConditions && (
                            <div className="acx-card p-6">
                                <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-4">Terms & Conditions</h3>
                                <div className="text-[12px] text-text-secondary whitespace-pre-wrap leading-relaxed">
                                    {quotation.termsAndConditions}
                                </div>
                            </div>
                        )}
                        {order.remarks && (
                            <div className="acx-card p-6">
                                <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-4">Internal Remarks</h3>
                                <div className="text-[12px] text-text-secondary whitespace-pre-wrap leading-relaxed bg-yellow-500/5 p-3 rounded-lg border border-yellow-500/10">
                                    {order.remarks}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: Quotation, Timeline */}
                <div className="space-y-6">
                    {/* Source Quotation */}
                    <div className="acx-card p-6">
                        <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-5 flex items-center">
                            <FileDigit className="w-3.5 h-3.5 mr-2" /> Source Quotation
                        </h3>
                        <div className="space-y-5">
                            <div className="bg-bg-muted/50 rounded-xl p-4 border border-border-subtle">
                                <p className="text-[11px] text-text-muted uppercase font-bold tracking-wider mb-1">Ref Number</p>
                                <button 
                                    onClick={() => navigate(`/quotations?search=${order.quotationNumber}`)}
                                    className="text-[14px] font-mono font-bold text-[var(--color-brand-primary)] hover:underline flex items-center"
                                >
                                    {order.quotationNumber} <Eye className="w-3 h-3 ml-1.5" />
                                </button>
                            </div>
                            <div>
                                <p className="text-[11px] text-text-muted uppercase font-bold tracking-wider mb-1">Quotation Value</p>
                                <p className="text-[16px] font-mono font-semibold text-text-primary tracking-tight">
                                    {formatCurrency(order.quotationValue, order.currency)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="acx-card p-6">
                        <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-5 flex items-center">
                            <Activity className="w-3.5 h-3.5 mr-2" /> Timeline
                        </h3>
                        <div className="relative border-l-2 border-border-subtle ml-3 space-y-6">
                            <div className="relative pl-6">
                                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-brand-primary border-4 border-bg-card"></div>
                                <p className="text-[13px] font-bold text-text-primary">PO Created</p>
                                <p className="text-[11px] text-text-muted mt-0.5">
                                    {new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <p className="text-[11px] text-text-secondary mt-1">by {order.createdBy?.name || 'System'}</p>
                            </div>
                            {order.verifiedAt && (
                                <div className="relative pl-6">
                                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-500 border-4 border-bg-card"></div>
                                    <p className="text-[13px] font-bold text-text-primary">Verified</p>
                                    <p className="text-[11px] text-text-muted mt-0.5">
                                        {new Date(order.verifiedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <p className="text-[11px] text-text-secondary mt-1">by {order.verifiedBy?.name || 'System'}</p>
                                </div>
                            )}
                            {order.status === 'FULFILLED' && (
                                <div className="relative pl-6">
                                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-green-500 border-4 border-bg-card"></div>
                                    <p className="text-[13px] font-bold text-text-primary">Fulfilled</p>
                                    <p className="text-[11px] text-text-muted mt-0.5">
                                        {new Date(order.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
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
                            <button onClick={closePreviewModal} className="btn btn-primary btn-icon">
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
        </div>
    );
}
