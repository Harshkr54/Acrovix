import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPurchaseOrderById, verifyPurchaseOrder, updatePurchaseOrderStatus, createInvoiceFromPurchaseOrder } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Clock, CheckCircle, Package, XCircle, FileText, Download, AlertTriangle } from 'lucide-react';
import { API_BASE_URL } from '../services/api';

export default function PurchaseOrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [remarks, setRemarks] = useState('');

    const fetchOrder = async () => {
        try {
            setLoading(true);
            const data = await getPurchaseOrderById(id);
            setOrder(data);
        } catch (error) {
            console.error('Failed to fetch PO', error);
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
            await fetchOrder();
        } catch (error) {
            console.error('Failed to update status', error);
            alert(error.message || 'Failed to update status');
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

    if (loading) return <div className="p-8 text-center text-text-muted">Loading PO details...</div>;
    if (!order) return <div className="p-8 text-center text-text-muted">Purchase Order not found.</div>;

    const getStatusIcon = (status) => {
        switch (status) {
            case 'RECEIVED': return <Clock className="w-5 h-5 text-yellow-500"/>;
            case 'VERIFIED': return <CheckCircle className="w-5 h-5 text-blue-500"/>;
            case 'PARTIALLY_FULFILLED': return <Package className="w-5 h-5 text-purple-500"/>;
            case 'FULFILLED': return <CheckCircle className="w-5 h-5 text-green-500"/>;
            case 'CANCELLED': return <XCircle className="w-5 h-5 text-red-500"/>;
            default: return null;
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto pb-24">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button 
                    onClick={() => navigate('/purchase-orders')}
                    className="p-2 hover:bg-bg-main rounded-full transition-colors text-text-muted hover:text-text-primary"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-text-primary">{order.poNumber}</h1>
                        <span className="px-3 py-1 bg-bg-main border border-border-subtle rounded-full text-xs font-medium flex items-center gap-1.5">
                            {getStatusIcon(order.status)}
                            {order.status}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleDownloadPdf}
                        className="px-4 py-2 bg-bg-acx-card border border-border-subtle hover:bg-bg-main text-text-primary rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" /> PDF
                    </button>
                    {order.status === 'RECEIVED' && (
                        <button 
                            onClick={handleVerify}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            <CheckCircle className="w-4 h-4" /> Verify
                        </button>
                    )}
                    {['VERIFIED', 'PARTIALLY_FULFILLED'].includes(order.status) && (
                        <button 
                            onClick={handleCreateTaxInvoice}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            <FileText className="w-4 h-4" /> Create Tax Invoice
                        </button>
                    )}
                    {['VERIFIED', 'PARTIALLY_FULFILLED'].includes(order.status) && (
                        <button 
                            onClick={() => { setNewStatus(''); setStatusModalOpen(true); }}
                            className="px-4 py-2 bg-bg-acx-card border border-border-subtle hover:bg-bg-main text-text-primary rounded-lg text-sm font-medium transition-colors"
                        >
                            Update Status
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    {/* General Info */}
                    <div className="bg-bg-acx-card border border-border-subtle rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">Order Details</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs text-text-muted">PO Date</label>
                                <div className="font-medium text-text-primary mt-1">{new Date(order.poDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                            </div>
                            <div>
                                <label className="text-xs text-text-muted">Client PO Number</label>
                                <div className="font-medium text-text-primary mt-1">{order.clientPoNumber || 'N/A'}</div>
                            </div>
                            <div>
                                <label className="text-xs text-text-muted">PO Value</label>
                                <div className="font-medium text-text-primary mt-1">Rs. {Number(order.poValue).toLocaleString()}</div>
                            </div>
                            <div>
                                <label className="text-xs text-text-muted">Received Via</label>
                                <div className="font-medium text-text-primary mt-1">{order.receivedVia || 'N/A'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Mismatch Warning */}
                    {order.valueMismatch && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 flex gap-4">
                            <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
                            <div>
                                <h3 className="text-sm font-bold text-red-600 mb-1">Value Mismatch Detected</h3>
                                <p className="text-sm text-red-500/80 mb-3">
                                    The Purchase Order value (Rs. {Number(order.poValue).toLocaleString()}) differs from the Quotation value (Rs. {Number(order.quotationValue).toLocaleString()}).
                                </p>
                                <div className="text-sm font-medium text-red-600">
                                    Difference: Rs. {Number(order.difference).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Remarks */}
                    {order.remarks && (
                        <div className="bg-bg-acx-card border border-border-subtle rounded-xl p-6">
                            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">Remarks</h3>
                            <div className="text-sm text-text-secondary whitespace-pre-wrap">{order.remarks}</div>
                        </div>
                    )}
                </div>

                <div className="col-span-1 space-y-6">
                    {/* Quotation Ref */}
                    <div className="bg-bg-acx-card border border-border-subtle rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">Source Quotation</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-text-muted">Quotation Number</label>
                                <button 
                                    onClick={() => navigate(`/quotations?search=${order.quotationNumber}`)}
                                    className="block font-medium text-brand-primary hover:underline mt-1 text-left"
                                >
                                    {order.quotationNumber}
                                </button>
                            </div>
                            <div>
                                <label className="text-xs text-text-muted">Client</label>
                                <div className="font-medium text-text-primary mt-1">{order.clientName}</div>
                                <div className="text-xs text-text-muted">{order.clientCompany}</div>
                            </div>
                            <div>
                                <label className="text-xs text-text-muted">Quotation Value</label>
                                <div className="font-medium text-text-primary mt-1">Rs. {Number(order.quotationValue).toLocaleString()}</div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-bg-acx-card border border-border-subtle rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">Timeline</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-text-muted">Created</label>
                                <div className="text-sm text-text-primary mt-1">{new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                <div className="text-xs text-text-muted">by {order.createdBy?.name || 'Unknown'}</div>
                            </div>
                            {order.verifiedAt && (
                                <div>
                                    <label className="text-xs text-text-muted">Verified</label>
                                    <div className="text-sm text-text-primary mt-1">{new Date(order.verifiedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                    <div className="text-xs text-text-muted">by {order.verifiedBy?.name || 'Unknown'}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Update Modal */}
            {statusModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-primary/20 backdrop-blur-sm">
                    <div className="bg-bg-acx-card border border-border-subtle rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-bg-main/50">
                            <h2 className="text-lg font-bold text-text-primary">Update Status</h2>
                            <button onClick={() => setStatusModalOpen(false)} className="text-text-muted hover:text-text-primary">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleStatusUpdate} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-1">New Status *</label>
                                    <select 
                                        required
                                        value={newStatus} 
                                        onChange={(e) => setNewStatus(e.target.value)}
                                        className="w-full bg-bg-main border border-border-subtle rounded-lg px-4 py-2 text-sm text-text-primary focus:border-brand-primary"
                                    >
                                        <option value="">Select status</option>
                                        {['PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED'].map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-1">Remarks</label>
                                    <textarea 
                                        rows="3"
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        placeholder="Add notes about this status change..."
                                        className="w-full bg-bg-main border border-border-subtle rounded-lg px-4 py-2 text-sm text-text-primary focus:border-brand-primary"
                                    />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setStatusModalOpen(false)}
                                    className="px-4 py-2 bg-bg-main border border-border-subtle text-text-primary rounded-lg text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={actionLoading || !newStatus}
                                    className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white rounded-lg text-sm font-medium disabled:opacity-50"
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
