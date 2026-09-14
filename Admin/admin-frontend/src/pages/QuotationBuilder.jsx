import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { fetchApi } from '../services/api';
import { Plus, Trash2, Send, Save, Wand2, ArrowUp, ArrowDown, Calculator, User, Hash, AlertCircle, RefreshCw, Download, ArrowLeft } from 'lucide-react';

export default function QuotationBuilder() {
    const { enquiryId, quotationId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Determine mode based on URL
    const isEditMode = location.pathname.includes('/edit/');
    
    const [enquiry, setEnquiry] = useState(null);
    const [clientName, setClientName] = useState('');
    const [clientCompany, setClientCompany] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [quotationSource, setQuotationSource] = useState('ENQUIRY');
    const [sourceNotes, setSourceNotes] = useState('');

    const [roughText, setRoughText] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [items, setItems] = useState([]);
    const [currentQuotationId, setCurrentQuotationId] = useState(null);
    const [quotationNumber, setQuotationNumber] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState(null);
    const [isInitializing, setIsInitializing] = useState(true);

    const initializeBuilder = React.useCallback(async () => {
        setIsInitializing(true);
        setError(null);
        
        try {
            if (isEditMode && quotationId) {
                // EDIT MODE: Load existing quotation
                const q = await fetchApi(`/quotations/${quotationId}`);
                setCurrentQuotationId(q.id);
                setQuotationNumber(q.quotationNumber);
                
                setClientName(q.clientName || '');
                setClientCompany(q.clientCompany || '');
                setClientEmail(q.clientEmail || '');
                setClientPhone(q.clientPhone || '');
                setQuotationSource(q.quotationSource || (q.enquiry ? 'ENQUIRY' : 'DIRECT'));
                setSourceNotes(q.sourceNotes || '');

                setEnquiry(q.enquiry ? {
                    referenceId: q.enquiry.referenceId,
                    fullName: q.enquiry.fullName,
                    companyName: q.enquiry.companyName,
                    businessEmail: q.enquiry.businessEmail,
                    phoneNumber: q.enquiry.phoneNumber,
                    projectRequirement: q.enquiry.projectRequirement || '—'
                } : null);
                
                if (q.items && q.items.length > 0) {
                    setItems(q.items.map(item => ({
                        id: item.id || Date.now() + Math.random(),
                        sku: item.sku || '',
                        description: item.description || '',
                        hsnSac: item.hsnSac || '',
                        quantity: item.quantity || 1,
                        listPrice: item.listPrice !== null && item.listPrice !== undefined ? item.listPrice : (item.unitPrice || 0),
                        unitPrice: item.unitPrice || 0,
                        discountPercent: item.discountPercent || 0,
                        taxPercent: item.taxPercent || 18,
                        sourceText: ''
                    })));
                } else {
                    setItems([{ id: Date.now(), sku: '', description: '', hsnSac: '', quantity: 1, listPrice: 0, discountPercent: 0, unitPrice: 0, taxPercent: 18 }]);
                }

            } else if (!isEditMode && enquiryId) {
                // NEW MODE: Load enquiry details, but DO NOT create a draft in DB on mount!
                const enqData = await fetchApi(`/enquiries/${enquiryId}`);
                setEnquiry(enqData);
                setClientName(enqData.fullName || '');
                setClientCompany(enqData.companyName || '');
                setClientEmail(enqData.businessEmail || '');
                setClientPhone(enqData.phoneNumber || '');
                setQuotationSource('ENQUIRY');
                setItems([{ id: Date.now(), sku: '', description: '', hsnSac: '', quantity: 1, listPrice: 0, discountPercent: 0, unitPrice: 0, taxPercent: 18 }]);
                setCurrentQuotationId(null);
                setQuotationNumber('');
            } else {
                throw new Error("Invalid routing parameters.");
            }
        } catch (err) {
            console.error("Initialization Error", err);
            setError(err.message || "Failed to initialize workspace.");
        } finally {
            setIsInitializing(false);
        }
    }, [enquiryId, quotationId, isEditMode]);

    useEffect(() => {
        initializeBuilder();
    }, [initializeBuilder]);

    const handleParseText = async () => {
        if (!roughText.trim()) return;
        setIsParsing(true);
        try {
            const data = await fetchApi('/gemini/extract', {
                method: 'POST',
                body: JSON.stringify({ roughText })
            });
            
            // Format imported data and append to grid
            const newItems = data.map(item => ({
                id: Date.now() + Math.random(),
                sku: item.sku || '',
                description: item.description || '',
                hsnSac: item.hsnSac || '',
                quantity: item.quantity || 1,
                listPrice: item.listPrice !== null && item.listPrice !== undefined ? item.listPrice : (item.unitPrice || 0),
                unitPrice: item.unitPrice || 0,
                discountPercent: item.discountPercent || 0,
                taxPercent: item.taxPercent || 18, // default tax
                sourceText: item.sourceText
            }));
            
            setItems([...items, ...newItems]);
            setRoughText('');
        } catch (error) {
            console.error("Failed to parse", error);
            alert("Failed to parse text. Please check the format.");
        } finally {
            setIsParsing(false);
        }
    };

    const updateItem = (id, field, value) => {
        setItems(items.map(item => {
            if (item.id === id) {
                const newItem = { ...item, [field]: value };
                if (field === 'listPrice' || field === 'unitPrice') {
                    const lp = parseFloat(newItem.listPrice) || 0;
                    const up = parseFloat(newItem.unitPrice) || 0;
                    if (lp > 0 && up >= 0 && up <= lp) {
                        newItem.discountPercent = parseFloat((((lp - up) / lp) * 100).toFixed(2));
                    } else if (lp > 0 && up > lp) {
                        // Edge case: unit price > list price -> no discount or negative, standard UI prevents negative discount
                        newItem.discountPercent = 0; 
                    } else {
                        newItem.discountPercent = 0;
                    }
                } else if (field === 'discountPercent') {
                    const lp = parseFloat(newItem.listPrice) || 0;
                    const dp = parseFloat(newItem.discountPercent) || 0;
                    newItem.unitPrice = parseFloat((lp * (1 - dp / 100)).toFixed(2));
                }
                return newItem;
            }
            return item;
        }));
    };

    const removeItem = (id) => {
        setItems(items.filter(item => item.id !== id));
    };


    const moveItemUp = (index) => {
        if (index > 0) {
            const newItems = [...items];
            [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
            setItems(newItems);
        }
    };

    const moveItemDown = (index) => {
        if (index < items.length - 1) {
            const newItems = [...items];
            [newItems[index + 1], newItems[index]] = [newItems[index], newItems[index + 1]];
            setItems(newItems);
        }
    };

    const addItem = () => {
        setItems([...items, { id: Date.now(), sku: '', description: '', hsnSac: '', quantity: 1, listPrice: 0, discountPercent: 0, unitPrice: 0, taxPercent: 18 }]);
    };

    const handleDownloadTemplate = () => {
        const headers = ['SKU', 'Description', 'HSN/SAC', 'Qty', 'List Price', 'Disc%', 'Unit Price', 'Tax%'];
        const rows = [
            ['ACX-DB-001', 'MySQL Enterprise Database', '997331', '1', '10000', '15', '8500', '18'],
            ['', 'Custom Development', '998313', '1', '5000', '0', '5000', '18']
        ];
        
        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.map(c => `"${c}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'quotation_items_template.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Frontend calculation (Preview only)
    const calculateTotals = () => {
        let subtotalBeforeTax = 0;
        let taxableAmount = 0;
        let tax = 0;
        let discount = 0;

        items.forEach(item => {
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

        return { subtotalBeforeTax, taxableAmount, tax, discount, grandTotal: taxableAmount + tax };
    };

    const totals = calculateTotals();

    const handleSaveDraft = async () => {
        if (isSaving || isSending) return;
        setIsSaving(true);
        setError(null);
        
        try {
            let activeQuotationId = currentQuotationId;

            // If draft has not been persisted in DB yet (unsaved enquiry quotation):
            if (!activeQuotationId && enquiryId) {
                const q = await fetchApi(`/quotations/enquiry/${enquiryId}`, { method: 'POST' });
                activeQuotationId = q.id;
                setCurrentQuotationId(q.id);
                setQuotationNumber(q.quotationNumber);
                navigate(`/quotations/edit/${q.id}`, { replace: true });
            }

            if (!activeQuotationId) {
                throw new Error("No active quotation to save.");
            }

            const payload = {
                clientName: clientName,
                clientCompany: clientCompany,
                clientEmail: clientEmail,
                clientPhone: clientPhone,
                quotationSource: quotationSource,
                sourceNotes: sourceNotes,
                items: items.map((item, index) => ({
                    description: item.description,
                    category: item.category,
                    quantity: item.quantity,
                    unit: item.unit,
                    unitPrice: item.unitPrice,
                    discountPercent: item.discountPercent,
                    taxPercent: item.taxPercent,
                    sortOrder: index
                }))
            };

            await fetchApi(`/quotations/${activeQuotationId}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            setTimeout(() => {
                setIsSaving(false);
            }, 500); // brief delay for UX
        } catch (error) {
            console.error("Save Draft Error:", error);
            alert(error.message || "Failed to save draft");
            setIsSaving(false);
        }
    };

    const handleSend = async () => {
        if (isSending || isSaving) return;
        if (!window.confirm("Are you sure you want to send this quotation?")) return;
        
        setIsSending(true);
        setError(null);

        try {
            let activeQuotationId = currentQuotationId;

            // If draft has not been persisted in DB yet:
            if (!activeQuotationId && enquiryId) {
                const q = await fetchApi(`/quotations/enquiry/${enquiryId}`, { method: 'POST' });
                activeQuotationId = q.id;
                setCurrentQuotationId(q.id);
                setQuotationNumber(q.quotationNumber);
                navigate(`/quotations/edit/${q.id}`, { replace: true });
            }

            if (!activeQuotationId) {
                throw new Error("No active quotation to send.");
            }

            const payload = {
                clientName: clientName,
                clientCompany: clientCompany,
                clientEmail: clientEmail,
                clientPhone: clientPhone,
                quotationSource: quotationSource,
                sourceNotes: sourceNotes,
                items: items.map((item, index) => ({
                    description: item.description,
                    category: item.category,
                    quantity: item.quantity,
                    unit: item.unit,
                    unitPrice: item.unitPrice,
                    discountPercent: item.discountPercent,
                    taxPercent: item.taxPercent,
                    sortOrder: index
                }))
            };

            // Ensure latest state is saved
            await fetchApi(`/quotations/${activeQuotationId}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            // Send email
            await fetchApi(`/quotations/${activeQuotationId}/send`, {
                method: 'POST'
            });

            window.dispatchEvent(new Event('notification-update'));
            alert("Quotation sent successfully!");
            navigate('/enquiries');
        } catch (error) {
            console.error("Send Quotation Error:", error);
            alert(error.message || "Failed to send quotation.");
        } finally {
            setIsSending(false);
        }
    };

    if (error) {
        const isTrashError = error.includes("not found") || error.includes("404") || error.includes("Trash");
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
                <div className="w-16 h-16 bg-[#FEF2F2] border border-[#FCA5A5] flex items-center justify-center rounded-[20px] mb-6 shadow-sm">
                    <AlertCircle className="w-8 h-8 text-[#DC2626]" />
                </div>
                <h2 className="text-[20px] font-bold text-text-primary mb-2 tracking-tight">
                    {isTrashError ? "Quotation Unavailable" : "Initialization Failed"}
                </h2>
                <p className="text-text-secondary mb-6 text-[13px] leading-relaxed max-w-sm">
                    {isTrashError ? "This quotation is in Trash or no longer exists. Please restore it from the Trash section before editing." : error}
                </p>
                <div className="flex items-center space-x-3">
                    <button onClick={() => navigate('/quotations')} className="inline-flex items-center px-4 py-2.5 bg-bg-card hover:bg-bg-hover border border-border-subtle rounded-xl text-[13px] font-semibold text-text-primary transition-colors shadow-sm">
                        Back to Quotations
                    </button>
                    {isTrashError ? (
                        <button onClick={() => navigate('/trash')} className="btn-primary flex items-center px-4 py-2.5 shadow-[0_4px_14px_rgba(79,70,229,0.25)]">
                            Go to Trash
                        </button>
                    ) : (
                        <button onClick={initializeBuilder} className="btn-primary flex items-center px-4 py-2.5 shadow-[0_4px_14px_rgba(79,70,229,0.25)]">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Retry
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (isInitializing) {
        return (
            <div className="flex h-full items-center justify-center min-h-[50vh]">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14B8A6] mb-4"></div>
                    <p className="text-[13px] font-medium text-text-muted">Initializing workspace...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div>
                    <div className="flex items-center space-x-3 mb-1">
                        <button 
                            onClick={() => navigate(-1)} 
                            className="mr-2 p-1.5 rounded-full hover:bg-bg-card border border-transparent hover:border-border-subtle text-text-muted hover:text-text-primary transition-all shadow-sm"
                            title="Go Back"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-[28px] font-bold text-text-primary tracking-tight leading-tight">
                            {quotationNumber || 'Create Quotation'}
                        </h1>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-bg-muted text-text-secondary uppercase tracking-wider">
                            DRAFT
                        </span>
                    </div>
                    <p className="text-[13px] text-text-muted flex items-center mt-1">
                        {enquiry?.referenceId ? (
                            <span className="font-mono text-text-secondary mr-2">Enquiry Ref: {enquiry.referenceId}</span>
                        ) : (
                            <span className="font-mono text-text-secondary mr-2">Source: {quotationSource || 'DIRECT'}</span>
                        )}
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    <button 
                        onClick={handleSaveDraft} 
                        disabled={isSaving || isSending}
                        className="inline-flex items-center justify-center px-4 py-2.5 bg-bg-card hover:bg-bg-hover disabled:opacity-50 border border-border-subtle rounded-xl text-[13px] font-semibold text-text-primary transition-colors shadow-sm"
                    >
                        {isSaving ? <><span className="animate-spin w-4 h-4 border-b-2 border-text-primary rounded-full mr-2"></span> Saving</> : <><Save className="mr-2 h-4 w-4 text-text-secondary" /> Save Draft</>}
                    </button>
                    <button 
                        onClick={handleSend} 
                        disabled={isSending || isSaving}
                        className="btn-primary flex items-center px-5 py-2.5 shadow-[0_4px_14px_rgba(79,70,229,0.25)] disabled:opacity-50"
                    >
                        {isSending ? <><span className="animate-spin w-4 h-4 border-b-2 border-white rounded-full mr-2"></span> Sending...</> : <><Send className="mr-2 h-4 w-4" /> Send Quotation</>}
                    </button>
                </div>
            </div>

            {/* Client Info */}
            <div className="card p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                        <User className="w-4 h-4 mr-2" />
                        Client Details &amp; Source
                    </div>
                    {enquiry?.referenceId ? (
                        <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-[#4F46E5] bg-[#4F46E5]/10 px-2 py-0.5 rounded-md">
                            WEBSITE ENQUIRY
                        </span>
                    ) : (
                        <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-[#14B8A6] bg-[#14B8A6]/10 px-2 py-0.5 rounded-md">
                            DIRECT · {quotationSource || 'PHONE'}
                        </span>
                    )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                        <p className="text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5">Client Name</p>
                        <input
                            type="text"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            className="w-full bg-bg-main border border-border-subtle focus:border-[#14B8A6] rounded-xl px-3 py-2 text-[13px] font-semibold text-text-primary outline-none transition-colors"
                            placeholder="Client Name"
                        />
                    </div>
                    <div>
                        <p className="text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5">Company</p>
                        <input
                            type="text"
                            value={clientCompany}
                            onChange={(e) => setClientCompany(e.target.value)}
                            className="w-full bg-bg-main border border-border-subtle focus:border-[#14B8A6] rounded-xl px-3 py-2 text-[13px] font-semibold text-text-primary outline-none transition-colors"
                            placeholder="Company Name"
                        />
                    </div>
                    <div>
                        <p className="text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5">Email</p>
                        <input
                            type="email"
                            value={clientEmail}
                            onChange={(e) => setClientEmail(e.target.value)}
                            className="w-full bg-bg-main border border-border-subtle focus:border-[#14B8A6] rounded-xl px-3 py-2 text-[13px] font-medium text-text-primary outline-none transition-colors"
                            placeholder="client@email.com"
                        />
                    </div>
                    <div>
                        <p className="text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5">Phone</p>
                        <input
                            type="text"
                            value={clientPhone}
                            onChange={(e) => setClientPhone(e.target.value)}
                            className="w-full bg-bg-main border border-border-subtle focus:border-[#14B8A6] rounded-xl px-3 py-2 text-[13px] font-medium text-text-primary outline-none transition-colors"
                            placeholder="+91..."
                        />
                    </div>
                </div>

                {sourceNotes && (
                    <div className="mt-4 pt-4 border-t border-border-subtle/50">
                        <p className="text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1">Source Notes</p>
                        <p className="text-[13px] text-text-secondary italic">{sourceNotes}</p>
                    </div>
                )}
            </div>

            {/* Gemini Import */}
            <div className="card p-6 md:p-8 border border-[#7C3AED]/20 relative overflow-hidden group">
                <div className="absolute -right-8 -top-8 text-[#7C3AED]/5 pointer-events-none transition-transform group-hover:scale-110 duration-700">
                    <Wand2 className="w-48 h-48" />
                </div>
                <h2 className="text-[14px] font-bold text-text-primary mb-4 flex items-center relative z-10 tracking-tight">
                    <Wand2 className="h-4 w-4 text-[#7C3AED] mr-2" />
                    AI Auto-Extraction
                </h2>
                <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                    <textarea 
                        className="flex-1 input-field h-24 resize-none rounded-xl text-[13px] bg-bg-main" 
                        placeholder="Paste rough requirements... (e.g., 'We need 2 DELL servers at 60k each and a Cisco router for 5k')"
                        value={roughText}
                        onChange={(e) => setRoughText(e.target.value)}
                    ></textarea>
                    <div className="sm:w-48 flex items-end">
                        <button 
                            onClick={handleParseText}
                            disabled={isParsing || !roughText.trim()}
                            className="w-full h-11 flex justify-center items-center px-4 border border-[#7C3AED]/30 rounded-xl text-[13px] font-semibold text-[#7C3AED] bg-[#7C3AED]/5 hover:bg-[#7C3AED]/10 disabled:opacity-50 transition-colors shadow-sm"
                        >
                            {isParsing ? (
                                <><span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current mr-2"></span> Parsing</>
                            ) : (
                                'Extract to Rows'
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Item Editor */}
            <div className="card overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-border-subtle flex justify-between items-center bg-bg-card">
                    <div>
                        <h2 className="text-base font-bold text-text-primary tracking-tight flex items-center">
                            <Hash className="w-4 h-4 mr-2 text-text-secondary" /> Line Items
                        </h2>
                        <p className="text-[12px] text-text-muted mt-1">Add products or services to this quotation</p>
                    </div>
                    <button onClick={handleDownloadTemplate} className="inline-flex items-center px-4 py-2 border border-[#4F46E5]/30 bg-[#4F46E5]/5 hover:bg-[#4F46E5]/10 rounded-xl text-[12px] font-semibold text-[#4F46E5] transition-colors shadow-sm">
                        <Download className="w-4 h-4 mr-2" /> Download Template
                    </button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-[900px] w-full">
                        <thead>
                            <tr>
                                <th className="px-2 py-4 text-center text-[11px] font-bold text-text-muted uppercase tracking-wider w-[3%] bg-bg-card">#</th>
                                <th className="px-3 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider w-[10%] bg-bg-card">SKU</th>
                                <th className="px-4 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider w-[22%] bg-bg-card">Description</th>
                                <th className="px-3 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider w-[8%] bg-bg-card">HSN / SAC</th>
                                <th className="px-3 py-4 text-center text-[11px] font-bold text-text-muted uppercase tracking-wider w-[5%] bg-bg-card">Qty</th>
                                <th className="px-3 py-4 text-right text-[11px] font-bold text-text-muted uppercase tracking-wider w-[9%] bg-bg-card">List Price (₹)</th>
                                <th className="px-3 py-4 text-center text-[11px] font-bold text-text-muted uppercase tracking-wider w-[6%] bg-bg-card">Disc %</th>
                                <th className="px-3 py-4 text-right text-[11px] font-bold text-text-muted uppercase tracking-wider w-[9%] bg-bg-card">Unit Price (₹)</th>
                                <th className="px-3 py-4 text-center text-[11px] font-bold text-text-muted uppercase tracking-wider w-[5%] bg-bg-card">Tax %</th>
                                <th className="px-3 py-4 text-right text-[11px] font-bold text-text-muted uppercase tracking-wider w-[8%] bg-bg-card">Tax Amount (₹)</th>
                                <th className="px-4 py-4 text-right text-[11px] font-bold text-text-muted uppercase tracking-wider w-[10%] bg-bg-card">Total (₹)</th>
                                <th className="px-2 py-4 text-center text-[11px] font-bold text-text-muted uppercase tracking-wider w-[5%] bg-bg-card">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle/40 bg-bg-card">
                            {items.map((item, index) => {
                                const qty = parseFloat(item.quantity) || 0;
                                const lp = parseFloat(item.listPrice) || 0;
                                const up = parseFloat(item.unitPrice) || 0;
                                const taxPct = parseFloat(item.taxPercent) || 0;
                                
                                const net = qty * up;
                                const taxAmt = net * (taxPct / 100);
                                const lineTotal = net + taxAmt;

                                return (
                                    <tr key={item.id} className="group hover:bg-bg-hover transition-colors">
                                        <td className="px-2 py-3 align-top text-center text-[12px] font-medium text-text-muted mt-2">
                                            {index + 1}
                                        </td>
                                        <td className="px-3 py-3 align-top">
                                            <input 
                                                type="text" 
                                                value={item.sku} 
                                                onChange={(e) => updateItem(item.id, 'sku', e.target.value)} 
                                                className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-[#14B8A6] focus:bg-bg-main rounded-lg py-2 px-2 text-[13px] font-medium text-text-primary transition-all outline-none uppercase font-mono tracking-tight" 
                                                placeholder="SKU"
                                            />
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            <input 
                                                type="text" 
                                                value={item.description} 
                                                onChange={(e) => updateItem(item.id, 'description', e.target.value)} 
                                                className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-[#14B8A6] focus:bg-bg-main rounded-lg py-2 px-3 text-[13px] font-semibold text-text-primary transition-all outline-none" 
                                                placeholder="Item description"
                                            />
                                            {item.sourceText && (
                                                <p className="text-[11px] text-text-secondary mt-1 italic pl-3 border-l-2 border-[#7C3AED]/40 leading-tight">
                                                    "{item.sourceText}"
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 align-top">
                                            <input 
                                                type="text" 
                                                value={item.hsnSac} 
                                                onChange={(e) => updateItem(item.id, 'hsnSac', e.target.value)} 
                                                className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-[#14B8A6] focus:bg-bg-main rounded-lg py-2 px-2 text-[13px] font-medium text-text-primary transition-all outline-none font-mono tracking-tight" 
                                                placeholder="HSN/SAC"
                                            />
                                        </td>
                                        <td className="px-3 py-3 align-top text-center">
                                            <input 
                                                type="number" step="any" min="0" 
                                                value={item.quantity} 
                                                onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} 
                                                className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-[#14B8A6] focus:bg-bg-main rounded-lg py-2 px-2 text-[13px] font-medium text-text-primary text-center transition-all outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                            />
                                        </td>
                                        <td className="px-3 py-3 align-top text-right">
                                            <input 
                                                type="number" step="any" min="0" 
                                                value={item.listPrice} 
                                                onChange={(e) => updateItem(item.id, 'listPrice', e.target.value)} 
                                                className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-[#14B8A6] focus:bg-bg-main rounded-lg py-2 px-2 text-[13px] font-medium text-text-primary text-right transition-all outline-none font-mono tracking-tight [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                            />
                                        </td>
                                        <td className="px-3 py-3 align-top text-center">
                                            <input 
                                                type="number" step="any" min="0" max="100" 
                                                value={item.discountPercent} 
                                                onChange={(e) => updateItem(item.id, 'discountPercent', e.target.value)} 
                                                className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-[#14B8A6] focus:bg-bg-main rounded-lg py-2 px-1 text-[13px] font-medium text-text-primary text-center transition-all outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                            />
                                        </td>
                                        <td className="px-3 py-3 align-top text-right">
                                            <input 
                                                type="number" step="any" min="0" 
                                                value={item.unitPrice} 
                                                onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)} 
                                                className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-[#14B8A6] focus:bg-bg-main rounded-lg py-2 px-2 text-[13px] font-bold text-text-primary text-right transition-all outline-none font-mono tracking-tight [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                            />
                                        </td>
                                        <td className="px-3 py-3 align-top text-center">
                                            <input 
                                                type="number" step="any" min="0" max="100" 
                                                value={item.taxPercent} 
                                                onChange={(e) => updateItem(item.id, 'taxPercent', e.target.value)} 
                                                className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-[#14B8A6] focus:bg-bg-main rounded-lg py-2 px-1 text-[13px] font-medium text-text-primary text-center transition-all outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                            />
                                        </td>
                                        <td className="px-3 py-3 align-top text-right">
                                            <div className="font-medium text-text-secondary mt-2 font-mono text-[13px] tracking-tight">
                                                {taxAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-top text-right">
                                            <div className="font-bold text-text-primary mt-2 font-mono text-[14px] tracking-tight">
                                                {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </td>
                                        <td className="px-2 py-3 align-top text-center">
                                            <div className="flex flex-col items-center justify-center space-y-1.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="flex space-x-1.5">
                                                    <button onClick={() => removeItem(item.id)} className="p-1 text-[#DC2626] hover:bg-[#DC2626]/10 rounded" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                
                {/* Add Item Row */}
                <div className="p-5 border-t border-border-subtle/50 bg-bg-card rounded-b-[24px] flex justify-between items-center">
                    <button onClick={addItem} className="inline-flex items-center px-4 py-2.5 bg-bg-main hover:bg-bg-hover border border-border-subtle rounded-xl text-[13px] font-semibold text-text-primary transition-colors shadow-sm">
                        <Plus className="w-4 h-4 mr-2 text-[#4F46E5]" />
                        Add Item
                    </button>
                    <button onClick={() => setItems([])} className="inline-flex items-center px-4 py-2 text-[13px] font-semibold text-[#DC2626] hover:bg-[#DC2626]/5 rounded-xl transition-colors">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear All
                    </button>
                </div>
            </div>

            {/* Totals Preview - Light Summary Panel */}
            <div className="flex flex-col md:flex-row md:justify-end">
                <div className="card p-8 w-full md:max-w-[420px] bg-bg-card border border-border-subtle shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#4F46E5]/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#14B8A6]/5 rounded-full -ml-16 -mb-16 blur-2xl pointer-events-none"></div>
                    
                    <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-6 flex items-center relative z-10">
                        <Calculator className="w-4 h-4 mr-2" /> Quotation Summary
                    </h3>
                    <div className="space-y-4 relative z-10">
                        <div className="flex justify-between text-[13px] text-text-secondary">
                            <span className="font-medium">Subtotal (Before Tax)</span>
                            <span className="font-mono font-semibold text-text-primary tracking-tight">₹{totals.subtotalBeforeTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-[13px]">
                            <span className="font-medium text-text-secondary">Total Discount</span>
                            <span className="text-[#DC2626] font-mono font-semibold tracking-tight">-₹{totals.discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-[13px] text-text-secondary">
                            <span className="font-medium">Taxable Amount</span>
                            <span className="font-mono font-semibold text-text-primary tracking-tight">₹{totals.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-[13px] text-text-secondary pb-5 border-b border-border-subtle">
                            <span className="font-medium">Total Tax</span>
                            <span className="font-mono font-semibold text-text-primary tracking-tight">₹{totals.tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-end pt-3">
                            <span className="text-[15px] font-bold text-text-primary">Grand Total</span>
                            <span className="text-[32px] font-bold text-[#14B8A6] font-mono tracking-tight leading-none">₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
