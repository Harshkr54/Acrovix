import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL, getAuthHeaders } from '../services/api';
import { Plus, Trash2, Send, Save, Wand2, Copy, ArrowUp, ArrowDown, Calculator, FileText, User } from 'lucide-react';

export default function QuotationBuilder() {
    const { enquiryId } = useParams();
    const navigate = useNavigate();
    
    const [enquiry, setEnquiry] = useState(null);
    const [roughText, setRoughText] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [items, setItems] = useState([
        { id: Date.now(), description: '', category: '', quantity: 1, unit: 'unit', unitPrice: 0, discountPercent: 0, taxPercent: 18 }
    ]);
    const [quotationId, setQuotationId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // Fetch enquiry for prefilling
        fetch(`${API_BASE_URL}/enquiries/${enquiryId}`, { headers: getAuthHeaders() })
            .then(res => res.json())
            .then(data => {
                setEnquiry(data);
                // Create draft quotation immediately upon loading this page
                fetch(`${API_BASE_URL}/quotations/enquiry/${enquiryId}`, {
                    method: 'POST',
                    headers: getAuthHeaders()
                })
                .then(res => res.json())
                .then(q => setQuotationId(q.id))
                .catch(err => console.error("Error creating draft", err));
            });
    }, [enquiryId]);

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
        } catch (err) {
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
        } catch (err) {
            alert("Failed to send quotation.");
        }
    };

    if (!enquiry) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mb-4"></div>
                <p>Initializing quotation builder...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-slate-100 flex items-center">
                    <FileText className="w-6 h-6 mr-2 text-brand-500" />
                    Quotation Builder
                </h1>
                <div className="flex items-center space-x-3">
                    <button 
                        onClick={handleSaveDraft} 
                        disabled={isSaving}
                        className="btn-secondary flex items-center px-4 py-2"
                    >
                        {isSaving ? <span className="animate-pulse">Saving...</span> : <><Save className="mr-2 h-4 w-4" /> Save Draft</>}
                    </button>
                    <button 
                        onClick={handleSend} 
                        className="btn-primary flex items-center px-4 py-2"
                    >
                        <Send className="mr-2 h-4 w-4" /> Send Quotation
                    </button>
                </div>
            </div>

            {/* Client Info */}
            <div className="card p-6 border-l-4 border-l-brand-500">
                <div className="flex items-center text-sm font-medium text-brand-400 mb-4 uppercase tracking-wider">
                    <User className="w-4 h-4 mr-2" />
                    Client Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Client Name</p>
                        <p className="font-medium text-slate-200">{enquiry.fullName}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Company</p>
                        <p className="font-medium text-slate-200">{enquiry.companyName}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Email</p>
                        <p className="font-medium text-slate-200">{enquiry.businessEmail}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Requirement</p>
                        <p className="font-medium text-slate-200 truncate" title={enquiry.projectRequirement}>{enquiry.projectRequirement}</p>
                    </div>
                </div>
            </div>

            {/* Gemini Import */}
            <div className="card p-6 border border-purple-500/30 shadow-purple-500/10 relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 text-purple-500/5 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                    <Wand2 className="w-48 h-48" />
                </div>
                <h2 className="text-lg font-medium text-slate-100 mb-3 flex items-center relative z-10">
                    <div className="p-1.5 bg-purple-500/20 rounded-lg mr-3">
                        <Wand2 className="h-5 w-5 text-purple-400" />
                    </div>
                    AI Auto-Extraction
                </h2>
                <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                    <textarea 
                        className="flex-1 input-field h-24 resize-none border-purple-900/50 focus:ring-purple-500/50 focus:border-purple-500" 
                        placeholder="Paste rough client requirements here... (e.g., 'We need 2 DELL servers at 60k each and a Cisco router for 5k')"
                        value={roughText}
                        onChange={(e) => setRoughText(e.target.value)}
                    ></textarea>
                    <div className="sm:w-48 flex items-end">
                        <button 
                            onClick={handleParseText}
                            disabled={isParsing || !roughText.trim()}
                            className="w-full h-12 flex justify-center items-center px-4 py-2 border border-purple-500/30 rounded-lg text-sm font-medium text-purple-100 bg-purple-600/20 hover:bg-purple-600/40 disabled:opacity-50 transition-colors"
                        >
                            {isParsing ? (
                                <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span> Parsing...</>
                            ) : (
                                'Extract to Rows'
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Spreadsheet Grid */}
            <div className="card overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/80 flex justify-between items-center">
                    <h2 className="text-lg font-medium text-slate-200">Line Items</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-700/50">
                        <thead className="bg-slate-900/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-28">Qty</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-32">Price (₹)</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-24">Disc %</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-24">Tax %</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider w-32">Line Total</th>
                                <th className="px-4 py-3 w-32 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50 bg-slate-800/30">
                            {items.map((item, index) => {
                                const qty = parseFloat(item.quantity) || 0;
                                const price = parseFloat(item.unitPrice) || 0;
                                const disc = parseFloat(item.discountPercent) || 0;
                                const tax = parseFloat(item.taxPercent) || 0;
                                const net = (qty * price) * (1 - disc/100);
                                const lineTotal = net * (1 + tax/100);

                                return (
                                    <tr key={item.id} className="hover:bg-slate-700/20 transition-colors group">
                                        <td className="px-4 py-3 align-top">
                                            <input 
                                                type="text" 
                                                value={item.description} 
                                                onChange={(e) => updateItem(item.id, 'description', e.target.value)} 
                                                className="input-field py-1.5 px-3 text-sm" 
                                                placeholder="Item description"
                                            />
                                            {item.sourceText && (
                                                <p className="text-[11px] text-slate-500 mt-1.5 italic border-l-2 border-purple-500/50 pl-2 ml-1">
                                                    Extracted from: "{item.sourceText}"
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-2 py-3 align-top">
                                            <input type="number" step="any" min="0" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} className="input-field py-1.5 px-2 text-sm text-center" />
                                        </td>
                                        <td className="px-2 py-3 align-top">
                                            <input type="number" step="any" min="0" value={item.unitPrice} onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)} className="input-field py-1.5 px-2 text-sm text-right" />
                                        </td>
                                        <td className="px-2 py-3 align-top">
                                            <input type="number" step="any" min="0" max="100" value={item.discountPercent} onChange={(e) => updateItem(item.id, 'discountPercent', e.target.value)} className="input-field py-1.5 px-2 text-sm text-center" />
                                        </td>
                                        <td className="px-2 py-3 align-top">
                                            <input type="number" step="any" min="0" max="100" value={item.taxPercent} onChange={(e) => updateItem(item.id, 'taxPercent', e.target.value)} className="input-field py-1.5 px-2 text-sm text-center" />
                                        </td>
                                        <td className="px-4 py-3 align-top text-right">
                                            <div className="font-semibold text-slate-200 mt-1.5">₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                        </td>
                                        <td className="px-2 py-3 align-top">
                                            <div className="flex items-center justify-center space-x-1 mt-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => moveItemUp(index)} disabled={index === 0} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md disabled:opacity-30 transition-colors" title="Move Up">
                                                    <ArrowUp className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => moveItemDown(index)} disabled={index === items.length - 1} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md disabled:opacity-30 transition-colors" title="Move Down">
                                                    <ArrowDown className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => duplicateItem(item.id)} className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-600 rounded-md transition-colors" title="Duplicate">
                                                    <Copy className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => removeItem(item.id)} className="p-1.5 text-red-400 hover:text-white hover:bg-red-600 rounded-md transition-colors" title="Delete">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-slate-700/50 bg-slate-900/50">
                    <button onClick={addItem} className="inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-sm font-medium rounded-lg text-slate-200 transition-colors">
                        <Plus className="w-4 h-4 mr-2 text-brand-400" /> Add Blank Row
                    </button>
                </div>
            </div>

            {/* Totals Preview */}
            <div className="flex justify-end">
                <div className="card p-6 w-full max-w-sm border-t-4 border-t-brand-500">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                        <Calculator className="w-4 h-4 mr-2" /> Quotation Summary
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm text-slate-300">
                            <span>Subtotal</span>
                            <span className="font-mono">₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-300">Total Discount</span>
                            <span className="text-red-400 font-mono">-₹{totals.discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-300 pb-3 border-b border-slate-700/50">
                            <span>Total Tax</span>
                            <span className="font-mono">₹{totals.tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-end pt-2">
                            <span className="text-base font-medium text-slate-200">Grand Total</span>
                            <span className="text-2xl font-bold text-white font-mono tracking-tight">₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
