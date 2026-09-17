import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPurchaseOrderById, verifyPurchaseOrder, updatePurchaseOrderStatus, createInvoiceFromPurchaseOrder } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, CheckCircle, FileText, Download, AlertTriangle, XCircle, ShoppingCart } from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';

export default function PurchaseOrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [remarks, setRemarks] = useState('');

    const fetchOrder = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getPurchaseOrderById(id);
            setOrder(data);
        } catch (err) {
            console.error('Failed to fetch PO', err);
            setError('Purchase Order not found or unable to load.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();
    }, [id]);

    const handleVerify = async () => {
        if (!window.confirm('Are you sure you want to verify this Purchase Order?')) return;
        try {
            setActionLoading(true);
            await verifyPurchaseOrder(id);
            await fetchOrder();
        } catch (err) {
            console.error('Failed to verify PO', err);
            alert(err.message || 'Failed to verify PO');
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
        } catch (err) {
            console.error('Failed to create Tax Invoice', err);
            alert(err.message || 'Failed to create Tax Invoice');
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
            await fetchOrder();
        } catch (err) {
            console.error('Failed to update status', err);
            alert(err.message || 'Failed to update status');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDownloadPdf = () => {
        const token = localStorage.getItem('admin_token');
        fetch(`${API_BASE_URL}/purchase-orders/${id}/pdf`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(res => {
            if (!res.ok) throw new Error('Failed to generate PDF');
            return res.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Purchase_Order_${order.poNumber}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        })
        .catch(err => {
            console.error(err);
            alert('Could not download PDF');
        });
    };

    if (loading) {
        return (
            <div className="py-12 max-w-5xl mx-auto">
                <EmptyState type="loading" message="Loading Purchase Order details..." />
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="py-12 max-w-5xl mx-auto">
                <EmptyState type="error" message={error || "Purchase Order not found."} onRetry={fetchOrder} />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-24">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/purchase-orders')}
                        className="p-2 hover:bg-bg-card border border-border-subtle rounded-xl transition-colors text-text-muted hover:text-text-primary"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-text-primary">{order.poNumber}</h1>
                            <StatusBadge status={order.status} />
                        </div>
                        <p className="text-xs text-text-muted mt-1">Received PO for client quotation fulfillment.</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button 
                        onClick={handleDownloadPdf}
                        className="btn-secondary text-xs px-4 py-2.5 rounded-xl font-medium flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" /> Download PDF
                    </button>
                    {order.status === 'RECEIVED' && (
                        <button 
                            onClick={handleVerify}
                            disabled={actionLoading}
                            className="btn-primary text-xs px-4 py-2.5 rounded-xl font-medium flex items-center gap-2"
                        >
                            <CheckCircle className="w-4 h-4" /> Verify PO
                        </button>
                    )}
                    {['VERIFIED', 'PARTIALLY_FULFILLED'].includes(order.status) && (
                        <button 
                            onClick={handleCreateTaxInvoice}
                            disabled={actionLoading}
                            className="btn-primary text-xs px-4 py-2.5 rounded-xl font-medium flex items-center gap-2"
                        >
                            <FileText className="w-4 h-4" /> Create Tax Invoice
                        </button>
                    )}
                    {['VERIFIED', 'PARTIALLY_FULFILLED'].includes(order.status) && (
                        <button 
                            onClick={() => { setNewStatus(''); setStatusModalOpen(true); }}
                            className="btn-secondary text-xs px-4 py-2.5 rounded-xl font-medium"
                        >
                            Update Status
                        </button>
                    )}
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* General Info */}
                    <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm">
                        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Order Information</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs text-text-muted font-medium">PO Date</label>
                                <div className="font-semibold text-text-primary mt-1">{new Date(order.poDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                            </div>
                            <div>
                                <label className="text-xs text-text-muted font-medium">Client PO Number</label>
                                <div className="font-semibold text-text-primary mt-1">{order.clientPoNumber || 'N/A'}</div>
                            </div>
                            <div>
                                <label className="text-xs text-text-muted font-medium">PO Value</label>
                                <div className="font-bold text-brand-primary text-base mt-1">₹{Number(order.poValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                            </div>
                            <div>
                                <label className="text-xs text-text-muted font-medium">Received Via</label>
                                <div className="font-semibold text-text-primary mt-1">{order.receivedVia || 'N/A'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Mismatch Warning */}
                    {order.valueMismatch && (
                        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl p-6 flex gap-4">
                            <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">Value Mismatch Warning</h3>
                                <p className="text-xs text-red-600/80 dark:text-red-300/80 mb-3">
                                    The Purchase Order value (₹{Number(order.poValue).toLocaleString('en-IN')}) differs from the Quotation value (₹{Number(order.quotationValue).toLocaleString('en-IN')}).
                                </p>
                                <div className="text-xs font-bold text-red-600 dark:text-red-400">
                                    Difference Amount: ₹{Number(order.difference).toLocaleString('en-IN')}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Remarks */}
                    {order.remarks && (
                        <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm">
                            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Remarks & Notes</h3>
                            <div className="text-sm text-text-secondary whitespace-pre-wrap">{order.remarks}</div>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    {/* Quotation Ref */}
                    <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm">
                        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Source Quotation</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-text-muted font-medium">Quotation Number</label>
                                <button 
                                    onClick={() => navigate(`/quotations?search=${order.quotationNumber}`)}
                                    className="block font-bold text-brand-primary hover:underline mt-1 text-left text-sm"
                                >
                                    {order.quotationNumber}
                                </button>
                            </div>
                            <div>
                                <label className="text-xs text-text-muted font-medium">Client Name & Company</label>
                                <div className="font-semibold text-text-primary mt-1 text-sm">{order.clientName}</div>
                                <div className="text-xs text-text-muted">{order.clientCompany}</div>
                            </div>
                            <div>
                                <label className="text-xs text-text-muted font-medium">Quotation Value</label>
                                <div className="font-bold text-text-primary mt-1 text-sm">₹{Number(order.quotationValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm">
                        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Activity Timeline</h3>
                        <div className="space-y-4 text-xs">
                            <div>
                                <label className="text-text-muted font-medium">Created On</label>
                                <div className="text-text-primary font-semibold mt-0.5">{new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                <div className="text-text-muted">by {order.createdBy?.name || 'System'}</div>
                            </div>
                            {order.verifiedAt && (
                                <div>
                                    <label className="text-text-muted font-medium">Verified On</label>
                                    <div className="text-text-primary font-semibold mt-0.5">{new Date(order.verifiedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                    <div className="text-text-muted">by {order.verifiedBy?.name || 'System'}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Update Modal */}
            {statusModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-primary/20 backdrop-blur-sm">
                    <div className="bg-bg-card border border-border-subtle rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-5 border-b border-border-subtle flex justify-between items-center bg-bg-main/50">
                            <h2 className="text-base font-bold text-text-primary">Update PO Status</h2>
                            <button onClick={() => setStatusModalOpen(false)} className="text-text-muted hover:text-text-primary">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleStatusUpdate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-text-muted uppercase mb-2">New Status *</label>
                                <select 
                                    required
                                    value={newStatus} 
                                    onChange={(e) => setNewStatus(e.target.value)}
                                    className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                                >
                                    <option value="">Select status</option>
                                    {['PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED'].map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-text-muted uppercase mb-2">Remarks</label>
                                <textarea 
                                    rows="3"
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    placeholder="Add notes about this status change..."
                                    className="w-full bg-bg-main border border-border-subtle rounded-xl p-3 text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                                />
                            </div>
                            <div className="mt-6 flex justify-end gap-3 pt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setStatusModalOpen(false)}
                                    className="btn-secondary text-xs px-4 py-2.5 rounded-xl font-medium"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={actionLoading || !newStatus}
                                    className="btn-primary text-xs px-5 py-2.5 rounded-xl font-semibold disabled:opacity-50"
                                >
                                    {actionLoading ? 'Updating...' : 'Update Status'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

