import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvoiceById, updateDraftInvoice, issueInvoice, cancelInvoice, convertProformaToTaxInvoice } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Clock, CheckCircle, XCircle, FileText, Download, Edit3, X } from 'lucide-react';
import { API_BASE_URL } from '../services/api';

export default function InvoiceDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Edit Modal state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        clientName: '',
        clientCompany: '',
        clientEmail: '',
        clientPhone: '',
        clientAddress: '',
        clientGstin: '',
        placeOfSupply: '',
        invoiceDate: '',
        dueDate: '',
        paymentTerms: ''
    });
    const [editError, setEditError] = useState(null);
    const [savingEdit, setSavingEdit] = useState(false);

    const fetchInvoice = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getInvoiceById(id);
            setInvoice(data);
        } catch (err) {
            console.error('Failed to fetch Invoice', err);
            setError(err.message || 'Failed to load invoice details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoice();
    }, [id]);

    const handleOpenEditModal = () => {
        setEditForm({
            clientName: invoice.clientName || '',
            clientCompany: invoice.clientCompany || '',
            clientEmail: invoice.clientEmail || '',
            clientPhone: invoice.clientPhone || '',
            clientAddress: invoice.clientAddress || '',
            clientGstin: invoice.clientGstin || '',
            placeOfSupply: invoice.placeOfSupply || '',
            invoiceDate: invoice.invoiceDate || '',
            dueDate: invoice.dueDate || '',
            paymentTerms: invoice.paymentTerms || ''
        });
        setEditError(null);
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        try {
            setSavingEdit(true);
            setEditError(null);
            await updateDraftInvoice(id, {
                invoiceType: invoice.invoiceType,
                ...editForm
            });
            setIsEditModalOpen(false);
            await fetchInvoice();
        } catch (err) {
            console.error('Failed to update invoice details', err);
            setEditError(err.message || 'Failed to update invoice details');
        } finally {
            setSavingEdit(false);
        }
    };

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
    if (error) return (
        <div className="p-8 text-center max-w-md mx-auto my-12 bg-bg-card border border-border-subtle rounded-2xl p-6">
            <h3 className="text-base font-bold text-text-primary mb-1">Failed to Load Invoice</h3>
            <p className="text-xs text-text-muted mb-4">{error}</p>
            <button onClick={fetchInvoice} className="px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-semibold hover:bg-brand-secondary transition-colors">
                Retry
            </button>
        </div>
    );
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
                    {invoice.status === 'DRAFT' && (
                        <button 
                            onClick={handleOpenEditModal}
                            className="px-4 py-2 bg-bg-card border border-border-subtle hover:bg-bg-main text-text-primary rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <Edit3 className="w-4 h-4 text-brand-primary" /> Edit Details
                        </button>
                    )}
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
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Invoice Details</h3>
                            {invoice.status === 'DRAFT' && (
                                <button 
                                    onClick={handleOpenEditModal}
                                    className="text-xs text-brand-primary hover:underline flex items-center gap-1 font-medium"
                                >
                                    <Edit3 className="w-3.5 h-3.5" /> Edit
                                </button>
                            )}
                        </div>
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
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Billed To</h3>
                            {invoice.status === 'DRAFT' && (
                                <button 
                                    onClick={handleOpenEditModal}
                                    className="text-xs text-brand-primary hover:underline flex items-center gap-1 font-medium"
                                >
                                    <Edit3 className="w-3.5 h-3.5" /> Edit
                                </button>
                            )}
                        </div>
                        <div className="space-y-4">
                            <div>
                                <div className="font-medium text-text-primary mt-1">{invoice.clientName || 'N/A'}</div>
                                {invoice.clientCompany && <div className="text-xs text-text-muted">{invoice.clientCompany}</div>}
                                {invoice.clientAddress && <div className="text-sm mt-1 whitespace-pre-wrap">{invoice.clientAddress}</div>}
                                {invoice.clientEmail && <div className="text-xs text-text-muted mt-1">{invoice.clientEmail}</div>}
                                {invoice.clientPhone && <div className="text-xs text-text-muted">{invoice.clientPhone}</div>}
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

            {/* Edit Invoice Details Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-bg-card border border-border-subtle rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
                            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                <Edit3 className="w-5 h-5 text-brand-primary" /> Edit Invoice Details
                            </h2>
                            <button 
                                onClick={() => setIsEditModalOpen(false)}
                                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-main transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            {editError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 font-medium">
                                    {editError}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-text-muted mb-1">Client Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={editForm.clientName}
                                        onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })}
                                        className="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-text-muted mb-1">Company</label>
                                    <input
                                        type="text"
                                        value={editForm.clientCompany}
                                        onChange={(e) => setEditForm({ ...editForm, clientCompany: e.target.value })}
                                        className="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-text-muted mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={editForm.clientEmail}
                                        onChange={(e) => setEditForm({ ...editForm, clientEmail: e.target.value })}
                                        className="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-text-muted mb-1">Phone</label>
                                    <input
                                        type="text"
                                        value={editForm.clientPhone}
                                        onChange={(e) => setEditForm({ ...editForm, clientPhone: e.target.value })}
                                        className="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-text-muted mb-1">Address</label>
                                    <textarea
                                        rows={2}
                                        value={editForm.clientAddress}
                                        onChange={(e) => setEditForm({ ...editForm, clientAddress: e.target.value })}
                                        className="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand-primary resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-text-muted mb-1">GSTIN</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 27AAAAA0000A1Z5"
                                        value={editForm.clientGstin}
                                        onChange={(e) => setEditForm({ ...editForm, clientGstin: e.target.value })}
                                        className="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand-primary uppercase"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-text-muted mb-1">Place of Supply</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Maharashtra"
                                        value={editForm.placeOfSupply}
                                        onChange={(e) => setEditForm({ ...editForm, placeOfSupply: e.target.value })}
                                        className="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-text-muted mb-1">Invoice Date</label>
                                    <input
                                        type="date"
                                        value={editForm.invoiceDate}
                                        onChange={(e) => setEditForm({ ...editForm, invoiceDate: e.target.value })}
                                        className="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-text-muted mb-1">Due Date</label>
                                    <input
                                        type="date"
                                        value={editForm.dueDate}
                                        onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                                        className="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-text-muted mb-1">Payment Terms</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 50% advance, 50% upon delivery"
                                        value={editForm.paymentTerms}
                                        onChange={(e) => setEditForm({ ...editForm, paymentTerms: e.target.value })}
                                        className="w-full px-3 py-2 bg-bg-main border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-4 py-2 border border-border-subtle text-text-muted hover:text-text-primary rounded-lg text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingEdit}
                                    className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {savingEdit ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
