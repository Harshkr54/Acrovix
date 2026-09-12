import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL, getAuthHeaders } from '../services/api';
import { Plus, Trash2, Send, Save, Wand2, Copy, ArrowUp, ArrowDown, Calculator, User, Hash, AlertCircle, RefreshCw } from 'lucide-react';

export default function QuotationBuilder() {
    const { enquiryId } = useParams();
    const navigate = useNavigate();
    
    const [enquiry, setEnquiry] = useState(null);
    const [roughText, setRoughText] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [items, setItems] = useState(() => [
        { id: Date.now(), description: '', category: '', quantity: 1, unit: 'unit', unitPrice: 0, discountPercent: 0, taxPercent: 18 }
    ]);
    const [quotationId, setQuotationId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    const initializeBuilder = React.useCallback(() => {
        setError(null);
        fetch(`${API_BASE_URL}/enquiries/${enquiryId}`, { headers: getAuthHeaders() })
            .then(res => {
                if (!res.ok) throw new Error("Failed to load enquiry data");
                return res.json();
            })
            .then(data => {
                setEnquiry(data);
                return fetch(`${API_BASE_URL}/quotations/enquiry/${enquiryId}`, {
                    method: 'POST',
                    headers: getAuthHeaders()
                });
            })
            .then(res => res.json())
            .then(q => setQuotationId(q.id))
            .catch(err => {
                console.error("Initialization Error", err);
                setError(err.message || "Failed to initialize workspace.");
            });
    }, [enquiryId]);

    useEffect(() => {
        initializeBuilder();
    }, [initializeBuilder]);

    const handleParseText = async () => {
        if (!roughText.trim()) return;
        setIsParsing(true);
        try {
            const res = await fetch(`${API_BASE_URL}/gemini/extract`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ roughText })
            });
            const data = await res.json();
            
            // Format imported data and append to grid
            const newItems = data.map(item => ({
                id: Date.now() + Math.random(),
                description: item.description || '',
                category: item.category || '',
                quantity: item.quantity || 1,
                unit: item.unit || 'unit',
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
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const removeItem = (id) => {
        setItems(items.filter(item => item.id !== id));
    };

    const duplicateItem = (id) => {
        const itemToDuplicate = items.find(item => item.id === id);
        if (itemToDuplicate) {
            const newItem = { ...itemToDuplicate, id: Date.now() + Math.random() };
            const index = items.findIndex(item => item.id === id);
            const newItems = [...items];
            newItems.splice(index + 1, 0, newItem);
            setItems(newItems);
        }
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
        setItems([...items, { id: Date.now(), description: '', category: '', quantity: 1, unit: 'unit', unitPrice: 0, discountPercent: 0, taxPercent: 18 }]);
    };

    // Frontend calculation (Preview only)
    const calculateTotals = () => {
        let subtotal = 0;
        let tax = 0;
        let discount = 0;

        items.forEach(item => {
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.unitPrice) || 0;
            const discPct = parseFloat(item.discountPercent) || 0;
            const taxPct = parseFloat(item.taxPercent) || 0;

            const gross = qty * price;
            const lineDisc = gross * (discPct / 100);
            const net = gross - lineDisc;
            const lineTax = net * (taxPct / 100);

            subtotal += net;
            tax += lineTax;
            discount += lineDisc;
        });

        return { subtotal, tax, discount, grandTotal: subtotal + tax };
    };

    const totals = calculateTotals();

    const handleSaveDraft = async () => {
        if (!quotationId) return;
        setIsSaving(true);
        
        const payload = {
            clientName: enquiry.fullName,
            clientCompany: enquiry.companyName,
            clientEmail: enquiry.businessEmail,
            clientPhone: enquiry.phoneNumber,
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

        try {
            await fetch(`${API_BASE_URL}/quotations/${quotationId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            setTimeout(() => {
                setIsSaving(false);
            }, 500); // brief delay for UX
        } catch (error) {
            console.error(error);
            alert("Failed to save draft");
            setIsSaving(false);
        }
    };

    const handleSend = async () => {
        if (!window.confirm("Are you sure you want to send this quotation?")) return;
        
        await handleSaveDraft(); // Ensure latest is saved
        
        try {
            const res = await fetch(`${API_BASE_URL}/quotations/${quotationId}/send`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            if (res.ok) {
                alert("Quotation sent successfully!");
                navigate('/enquiries');
            } else {
                throw new Error("Failed to send");
            }
        } catch (error) {
            console.error(error);
            alert(error.message || "Failed to send quotation.");
        }
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
                <div className="w-16 h-16 bg-[#FEF2F2] border border-[#FCA5A5] flex items-center justify-center rounded-[20px] mb-6 shadow-sm">
                    <AlertCircle className="w-8 h-8 text-[#DC2626]" />
                </div>
                <h2 className="text-[20px] font-bold text-text-primary mb-2 tracking-tight">Initialization Failed</h2>
                <p className="text-text-secondary mb-6 text-[13px] leading-relaxed max-w-sm">{error}</p>
                <button onClick={initializeBuilder} className="btn-primary flex items-center px-4 py-2.5 shadow-[0_4px_14px_rgba(79,70,229,0.25)]">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                </button>
            </div>
        );
    }

    if (!enquiry) {
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
                        <h1 className="text-[28px] font-bold text-text-primary tracking-tight leading-tight">Create Quotation</h1>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-bg-muted text-text-secondary uppercase tracking-wider">
                            DRAFT
                        </span>
                    </div>
                    <p className="text-[13px] text-text-muted flex items-center mt-1">
                        <span className="font-mono text-text-secondary mr-2">Ref: {enquiry.referenceId}</span>
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    <button 
                        onClick={handleSaveDraft} 
                        disabled={isSaving}
                        className="inline-flex items-center justify-center px-4 py-2.5 bg-bg-card hover:bg-bg-hover disabled:opacity-50 border border-border-subtle rounded-xl text-[13px] font-semibold text-text-primary transition-colors shadow-sm"
                    >
                        {isSaving ? <><span className="animate-spin w-4 h-4 border-b-2 border-text-primary rounded-full mr-2"></span> Saving</> : <><Save className="mr-2 h-4 w-4 text-text-secondary" /> Save Draft</>}
                    </button>
                    <button 
                        onClick={handleSend} 
                        className="btn-primary flex items-center px-5 py-2.5 shadow-[0_4px_14px_rgba(79,70,229,0.25)]"
                    >
                        <Send className="mr-2 h-4 w-4" /> Send Quotation
                    </button>
                </div>
            </div>

            {/* Client Info */}
            <div className="card p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                        <User className="w-4 h-4 mr-2" />
                        Client Details
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div>
                        <p className="text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5">Client Name</p>
                        <p className="text-[13px] font-semibold text-text-primary leading-tight">{enquiry.fullName}</p>
                    </div>
                    <div>
                        <p className="text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5">Company</p>
                        <p className="text-[13px] font-semibold text-text-primary leading-tight">{enquiry.companyName || '—'}</p>
                    </div>
                    <div>
                        <p className="text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5">Email</p>
                        <p className="text-[13px] font-medium text-text-primary truncate" title={enquiry.businessEmail}>{enquiry.businessEmail}</p>
                    </div>
                    <div>
                        <p className="text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5">Requirement</p>
                        <p className="text-[13px] font-medium text-text-primary truncate" title={enquiry.projectRequirement}>{enquiry.projectRequirement}</p>
                    </div>
                </div>
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
                    <h2 className="text-base font-bold text-text-primary tracking-tight flex items-center">
                        <Hash className="w-4 h-4 mr-2 text-text-secondary" /> Line Items
                    </h2>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-[900px] w-full">
                        <thead>
                            <tr>
                                <th className="px-4 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider w-[25%] bg-bg-card">Description</th>
                                <th className="px-3 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider w-[15%] bg-bg-card">Category</th>
                                <th className="px-3 py-4 text-center text-[11px] font-bold text-text-muted uppercase tracking-wider w-[10%] bg-bg-card">Qty</th>
                                <th className="px-3 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider w-[10%] bg-bg-card">Unit</th>
                                <th className="px-3 py-4 text-right text-[11px] font-bold text-text-muted uppercase tracking-wider w-[12%] bg-bg-card">Price (₹)</th>
                                <th className="px-3 py-4 text-center text-[11px] font-bold text-text-muted uppercase tracking-wider w-[8%] bg-bg-card">Disc %</th>
                                <th className="px-3 py-4 text-center text-[11px] font-bold text-text-muted uppercase tracking-wider w-[8%] bg-bg-card">Tax %</th>
                                <th className="px-4 py-4 text-right text-[11px] font-bold text-text-muted uppercase tracking-wider w-[12%] bg-bg-card">Total</th>
                                <th className="px-2 py-4 text-center text-[11px] font-bold text-text-muted uppercase tracking-wider w-[6%] bg-bg-card"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle/40 bg-bg-card">
                            {items.map((item, index) => {
                                const qty = parseFloat(item.quantity) || 0;
                                const price = parseFloat(item.unitPrice) || 0;
                                const disc = parseFloat(item.discountPercent) || 0;
                                const tax = parseFloat(item.taxPercent) || 0;
                                const net = (qty * price) * (1 - disc/100);
                                const lineTotal = net * (1 + tax/100);

                                return (
                                    <tr key={item.id} className="group hover:bg-bg-hover transition-colors">
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
                                                value={item.category} 
                                                onChange={(e) => updateItem(item.id, 'category', e.target.value)} 
                                                className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-[#14B8A6] focus:bg-bg-main rounded-lg py-2 px-3 text-[13px] font-medium text-text-primary transition-all outline-none" 
                                                placeholder="Category"
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
                                        <td className="px-3 py-3 align-top">
                                            <input 
                                                type="text" 
                                                value={item.unit} 
                                                onChange={(e) => updateItem(item.id, 'unit', e.target.value)} 
                                                className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-[#14B8A6] focus:bg-bg-main rounded-lg py-2 px-3 text-[13px] font-medium text-text-primary transition-all outline-none" 
                                            />
                                        </td>
                                        <td className="px-3 py-3 align-top text-right">
                                            <input 
                                                type="number" step="any" min="0" 
                                                value={item.unitPrice} 
                                                onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)} 
                                                className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-[#14B8A6] focus:bg-bg-main rounded-lg py-2 px-3 text-[13px] font-medium text-text-primary text-right transition-all outline-none font-mono tracking-tight" 
                                            />
                                        </td>
                                        <td className="px-3 py-3 align-top text-center">
                                            <input 
                                                type="number" step="any" min="0" max="100" 
                                                value={item.discountPercent} 
                                                onChange={(e) => updateItem(item.id, 'discountPercent', e.target.value)} 
                                                className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-[#14B8A6] focus:bg-bg-main rounded-lg py-2 px-2 text-[13px] font-medium text-text-primary text-center transition-all outline-none" 
                                            />
                                        </td>
                                        <td className="px-3 py-3 align-top text-center">
                                            <input 
                                                type="number" step="any" min="0" max="100" 
                                                value={item.taxPercent} 
                                                onChange={(e) => updateItem(item.id, 'taxPercent', e.target.value)} 
                                                className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-[#14B8A6] focus:bg-bg-main rounded-lg py-2 px-2 text-[13px] font-medium text-text-primary text-center transition-all outline-none" 
                                            />
                                        </td>
                                        <td className="px-4 py-3 align-top text-right">
                                            <div className="font-bold text-text-primary mt-2 font-mono text-[14px] tracking-tight">
                                                {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </td>
                                        <td className="px-2 py-3 align-top text-center">
                                            <div className="flex flex-col items-center justify-center space-y-1.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="flex space-x-1.5">
                                                    <button onClick={() => moveItemUp(index)} disabled={index === 0} className="p-1 text-text-muted hover:text-text-primary hover:bg-bg-main rounded disabled:opacity-30" title="Move Up"><ArrowUp className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => moveItemDown(index)} disabled={index === items.length - 1} className="p-1 text-text-muted hover:text-text-primary hover:bg-bg-main rounded disabled:opacity-30" title="Move Down"><ArrowDown className="w-3.5 h-3.5" /></button>
                                                </div>
                                                <div className="flex space-x-1.5">
                                                    <button onClick={() => duplicateItem(item.id)} className="p-1 text-[#4F46E5] hover:bg-[#4F46E5]/10 rounded" title="Duplicate"><Copy className="w-3.5 h-3.5" /></button>
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
                <div className="p-5 border-t border-border-subtle/50 bg-bg-card rounded-b-[24px]">
                    <button onClick={addItem} className="inline-flex items-center px-4 py-2.5 bg-bg-main hover:bg-bg-hover border border-border-subtle rounded-xl text-[13px] font-semibold text-text-primary transition-colors shadow-sm">
                        <Plus className="w-4 h-4 mr-2 text-[#4F46E5]" />
                        Add Item
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
                            <span className="font-medium">Subtotal</span>
                            <span className="font-mono font-semibold text-text-primary tracking-tight">₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-[13px]">
                            <span className="font-medium text-text-secondary">Total Discount</span>
                            <span className="text-[#DC2626] font-mono font-semibold tracking-tight">-₹{totals.discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-[13px] text-text-secondary pb-5 border-b border-border-subtle">
                            <span className="font-medium">Total Tax</span>
                            <span className="font-mono font-semibold text-text-primary tracking-tight">₹{totals.tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-end pt-3">
                            <span className="text-[15px] font-bold text-text-primary">Grand Total</span>
                            <span className="text-[32px] font-bold text-[#4F46E5] font-mono tracking-tight leading-none">₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
