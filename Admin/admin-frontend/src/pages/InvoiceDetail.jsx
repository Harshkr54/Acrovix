import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvoiceById, issueInvoice, cancelInvoice, convertProformaToTaxInvoice } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Clock, CheckCircle, XCircle, FileText, Download } from 'lucide-react';
import { API_BASE_URL } from '../services/api';

export default function InvoiceDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchInvoice = async () => {
        try {
            setLoading(true);
            const data = await getInvoiceById(id);
            setInvoice(data);
        } catch (error) {
            console.error('Failed to fetch Invoice', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoice();
    }, [id]);

    const handleIssue = async () => {
        if (!window.confirm('Are you sure you want to issue this Invoice? This action cannot be undone.')) return;
        try {
            setActionLoading(true);
            await issueInvoice(id);
            await fetchInvoice();
        } catch (error) {
            console.error('Failed to issue Invoice', error);
            alert(error.message || 'Failed to issue Invoice');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!window.confirm('Are you sure you want to cancel this Invoice?')) return;
        try {
            setActionLoading(true);
            await cancelInvoice(id);
            await fetchInvoice();
        } catch (error) {
            console.error('Failed to cancel Invoice', error);
            alert(error.message || 'Failed to cancel Invoice');
        } finally {
            setActionLoading(false);
        }
    };

    const handleConvertToTaxInvoice = async () => {
        if (!window.confirm('Are you sure you want to convert this Proforma Invoice to a Tax Invoice?')) return;
        try {
            setActionLoading(true);
            const res = await convertProformaToTaxInvoice(id);
            navigate(`/invoices/${res.id}`);
        } catch (error) {
            console.error('Failed to convert to Tax Invoice', error);
            alert(error.message || 'Failed to convert to Tax Invoice');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDownloadPdf = () => {
        const token = localStorage.getItem('adminToken');
        fetch(`${API_BASE_URL}/invoices/${id}/pdf`, {
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
            a.download = `${invoice.invoiceNumber || 'DRAFT_INVOICE'}.pdf`;
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

    if (loading) return <div className="p-8 text-center text-text-muted">Loading Invoice details...</div>;
    if (!invoice) return <div className="p-8 text-center text-text-muted">Invoice not found.</div>;

    const getStatusIcon = (status) => {
        switch (status) {
            case 'DRAFT': return <Clock className="w-5 h-5 text-gray-500"/>;
            case 'ISSUED': return <CheckCircle className="w-5 h-5 text-blue-500"/>;
            case 'CANCELLED': return <XCircle className="w-5 h-5 text-red-500"/>;
            default: return null;
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto pb-24">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button 
                    onClick={() => navigate('/invoices')}
                    className="p-2 hover:bg-bg-main rounded-full transition-colors text-text-muted hover:text-text-primary"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-text-primary">{invoice.invoiceNumber || 'DRAFT INVOICE'}</h1>
                        <span className="px-3 py-1 bg-bg-main border border-border-subtle rounded-full text-xs font-medium flex items-center gap-1.5">
                            {getStatusIcon(invoice.status)}
                            {invoice.status}
                        </span>
                        <span className={`px-3 py-1 border rounded-full text-xs font-medium flex items-center gap-1.5 ${invoice.invoiceType === 'PROFORMA' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                            {invoice.invoiceType === 'PROFORMA' ? 'Proforma' : 'Tax Invoice'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleDownloadPdf}
                        className="px-4 py-2 bg-bg-card border border-border-subtle hover:bg-bg-main text-text-primary rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" /> PDF
                    </button>
                    {invoice.status === 'DRAFT' && (
                        <button 
                            onClick={handleIssue}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            <CheckCircle className="w-4 h-4" /> Issue Invoice
                        </button>
                    )}
                    {(invoice.status === 'DRAFT' || invoice.status === 'ISSUED') && (
                        <button 
                            onClick={handleCancel}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    )}
                    {invoice.invoiceType === 'PROFORMA' && invoice.status === 'ISSUED' && (
                        <button 
                            onClick={handleConvertToTaxInvoice}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            Convert to Tax Invoice
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    {/* General Info */}
                    <div className="bg-bg-card border border-border-subtle rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">Invoice Details</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs text-text-muted">Invoice Date</label>
                                <div className="font-medium text-text-primary mt-1">{invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</div>
                            </div>
                            <div>
                                <label className="text-xs text-text-muted">Due Date</label>
                                <div className="font-medium text-text-primary mt-1">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</div>
                            </div>
                            <div>
                                <label className="text-xs text-text-muted">Grand Total</label>
                                <div className="font-medium text-text-primary mt-1">Rs. {Number(invoice.grandTotal || 0).toLocaleString()}</div>
                            </div>
                            <div>
                                <label className="text-xs text-text-muted">Payment Terms</label>
                                <div className="font-medium text-text-primary mt-1">{invoice.paymentTerms || 'N/A'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Amount Details */}
                    <div className="bg-bg-card border border-border-subtle rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">Financials</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-text-muted">Taxable Amount</span>
                                <span className="font-medium">Rs. {Number(invoice.taxableAmount || 0).toLocaleString()}</span>
                            </div>
                            {invoice.cgstAmount > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-text-muted">CGST</span>
                                    <span className="font-medium">Rs. {Number(invoice.cgstAmount || 0).toLocaleString()}</span>
                                </div>
                            )}
                            {invoice.sgstAmount > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-text-muted">SGST</span>
                                    <span className="font-medium">Rs. {Number(invoice.sgstAmount || 0).toLocaleString()}</span>
                                </div>
                            )}
                            {invoice.igstAmount > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-text-muted">IGST</span>
                                    <span className="font-medium">Rs. {Number(invoice.igstAmount || 0).toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between pt-2 border-t border-border-subtle">
                                <span className="font-bold text-text-primary">Grand Total</span>
                                <span className="font-bold text-text-primary">Rs. {Number(invoice.grandTotal || 0).toLocaleString()}</span>
                            </div>
                            {invoice.amountInWords && (
                                <div className="pt-2 text-xs text-text-muted italic">
                                    Amount in words: {invoice.amountInWords}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-span-1 space-y-6">
                    {/* Billed To */}
                    <div className="bg-bg-card border border-border-subtle rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">Billed To</h3>
                        <div className="space-y-4">
                            <div>
                                <div className="font-medium text-text-primary mt-1">{invoice.clientName}</div>
                                <div className="text-xs text-text-muted">{invoice.clientCompany}</div>
                                <div className="text-sm mt-1">{invoice.clientAddress}</div>
                            </div>
                            <div>
                                <label className="text-xs text-text-muted">GSTIN</label>
                                <div className="font-medium text-text-primary mt-1">{invoice.clientGstin || 'N/A'}</div>
                            </div>
                            <div>
                                <label className="text-xs text-text-muted">Place of Supply</label>
                                <div className="font-medium text-text-primary mt-1">{invoice.placeOfSupply || 'N/A'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-bg-card border border-border-subtle rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">Timeline</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-text-muted">Created</label>
                                <div className="text-sm text-text-primary mt-1">{new Date(invoice.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                <div className="text-xs text-text-muted">by {invoice.createdByFullName || 'Unknown'}</div>
                            </div>
                            {invoice.issuedAt && (
                                <div>
                                    <label className="text-xs text-text-muted">Issued</label>
                                    <div className="text-sm text-text-primary mt-1">{new Date(invoice.issuedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                            )}
                            {invoice.cancelledAt && (
                                <div>
                                    <label className="text-xs text-text-muted text-red-500">Cancelled</label>
                                    <div className="text-sm text-text-primary mt-1">{new Date(invoice.cancelledAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
