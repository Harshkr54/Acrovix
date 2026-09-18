import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { fetchApi, getCustomers, getCatalog } from '../services/api';
import { Plus, Trash2, Send, Save, Wand2, ArrowUp, ArrowDown, Calculator, User, Hash, AlertCircle, RefreshCw, Download, Settings, Eye } from 'lucide-react';
import SendQuotationModal from '../components/SendQuotationModal';
import QuotationColumnConfigModal from '../components/QuotationColumnConfigModal';
import QuotationPreviewModal from '../components/QuotationPreviewModal';

const defaultConfigs = [
    { columnKey: "rowNumber", displayName: "#", columnType: "TEXT", visible: true, sortOrder: 0, isCustom: false },
    { columnKey: "sku", displayName: "SKU", columnType: "TEXT", visible: true, sortOrder: 1, isCustom: false },
    { columnKey: "description", displayName: "Description", columnType: "TEXT", visible: true, sortOrder: 2, isCustom: false },
    { columnKey: "hsnSac", displayName: "HSN/SAC", columnType: "TEXT", visible: true, sortOrder: 3, isCustom: false },
    { columnKey: "quantity", displayName: "Qty", columnType: "NUMBER", visible: true, sortOrder: 4, isCustom: false },
    { columnKey: "listPrice", displayName: "List Price (₹)", columnType: "CURRENCY", visible: true, sortOrder: 5, isCustom: false },
    { columnKey: "discountPercent", displayName: "Disc %", columnType: "NUMBER", visible: true, sortOrder: 6, isCustom: false },
    { columnKey: "unitPrice", displayName: "Unit Price (₹)", columnType: "CURRENCY", visible: true, sortOrder: 7, isCustom: false },
    { columnKey: "taxPercent", displayName: "Tax %", columnType: "NUMBER", visible: true, sortOrder: 8, isCustom: false },
    { columnKey: "taxAmount", displayName: "Tax Amount (₹)", columnType: "CURRENCY", visible: true, sortOrder: 9, isCustom: false },
    { columnKey: "total", displayName: "Total (₹)", columnType: "CURRENCY", visible: true, sortOrder: 10, isCustom: false }
];

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
    const [currency, setCurrency] = useState('INR');
    const [quotationSource, setQuotationSource] = useState('ENQUIRY');
    const [sourceNotes, setSourceNotes] = useState('');

    const [roughText, setRoughText] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [items, setItems] = useState([]);
    const [currentQuotationId, setCurrentQuotationId] = useState(null);
    const [quotationNumber, setQuotationNumber] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isSendModalOpen, setIsSendModalOpen] = useState(false);
    const [columnConfigs, setColumnConfigs] = useState(defaultConfigs);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

    // Customer Selector State
    const [customerId, setCustomerId] = useState(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [customers, setCustomers] = useState([]);
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

    // Catalog Selector State
    const [catalogSearch, setCatalogSearch] = useState('');
    const [catalogItems, setCatalogItems] = useState([]);
    const [isCatalogDropdownOpen, setIsCatalogDropdownOpen] = useState(false);
    const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
    
    // Preview State
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
    const [previewEmailDetails, setPreviewEmailDetails] = useState(null);
    const [previewError, setPreviewError] = useState(null);
    const [validationError, setValidationError] = useState(null);

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
                setCurrency(q.currency || 'INR');
                setCustomerId(q.customerId || null);
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
                
                if (q.columnConfigs && q.columnConfigs.length > 0) {
                    setColumnConfigs(q.columnConfigs);
                } else {
                    setColumnConfigs(defaultConfigs);
                }

                if (q.items && q.items.length > 0) {
                    setItems(q.items.map(item => ({
                        id: item.id || Date.now() + Math.random(),
                        productServiceId: item.productServiceId || null,
                        sku: item.sku || '',
                        description: item.description || '',
                        hsnSac: item.hsnSac || '',
                        quantity: item.quantity || 1,
                        listPrice: item.listPrice !== null && item.listPrice !== undefined ? item.listPrice : (item.unitPrice || 0),
                        unitPrice: item.unitPrice || 0,
                        discountPercent: item.discountPercent || 0,
                        taxPercent: item.taxPercent || 18,
                        sourceText: '',
                        customValues: item.customValues || {}
                    })));
                } else {
                    setItems([{ id: Date.now(), productServiceId: null, sku: '', description: '', hsnSac: '', quantity: 1, listPrice: 0, discountPercent: 0, unitPrice: 0, taxPercent: 18, customValues: {} }]);
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
                setColumnConfigs(defaultConfigs);
                setCustomerId(null);
                setItems([{ id: Date.now(), productServiceId: null, sku: '', description: '', hsnSac: '', quantity: 1, listPrice: 0, discountPercent: 0, unitPrice: 0, taxPercent: 18, customValues: {} }]);
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

    useEffect(() => {
        if (isCustomerDropdownOpen) {
            setIsLoadingCustomers(true);
            getCustomers({ search: customerSearch, active: true, size: 50 })
                .then(data => setCustomers(data.content || []))
                .catch(err => console.error(err))
                .finally(() => setIsLoadingCustomers(false));
        }
    }, [customerSearch, isCustomerDropdownOpen]);

    useEffect(() => {
        if (isCatalogDropdownOpen) {
            setIsLoadingCatalog(true);
            getCatalog({ search: catalogSearch, active: true, size: 50 })
                .then(data => setCatalogItems(data.content || []))
                .catch(err => console.error(err))
                .finally(() => setIsLoadingCatalog(false));
        }
    }, [catalogSearch, isCatalogDropdownOpen]);

    const selectCustomer = (c) => {
        setCustomerId(c.id);
        setClientName(c.name || '');
        setClientCompany(c.companyName || '');
        setClientEmail(c.email || '');
        setClientPhone(c.phone || '');
        setCustomerSearch('');
        setIsCustomerDropdownOpen(false);
    };

    const addCatalogItem = (c) => {
        setItems([...items, { 
            id: Date.now(), 
            productServiceId: c.id,
            sku: c.sku || '', 
            description: c.name || '', 
            hsnSac: c.hsnSac || '', 
            quantity: 1, 
            listPrice: c.listPrice || 0, 
            discountPercent: 0, 
            unitPrice: c.listPrice || 0, 
            taxPercent: c.taxPercentage || 18, 
            customValues: {} 
        }]);
        setCatalogSearch('');
        setIsCatalogDropdownOpen(false);
    };

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
                productServiceId: null,
                sku: item.sku || '',
                description: item.description || '',
                hsnSac: item.hsnSac || '',
                quantity: item.quantity || 1,
                listPrice: item.listPrice !== null && item.listPrice !== undefined ? item.listPrice : (item.unitPrice || 0),
                unitPrice: item.unitPrice || 0,
                discountPercent: item.discountPercent || 0,
                taxPercent: item.taxPercent || 18, // default tax
                sourceText: item.sourceText,
                customValues: item.customValues || {}
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
                const newItem = { ...item };
                if (field.startsWith('custom_')) {
                    const customKey = field.replace('custom_', '');
                    newItem.customValues = { ...newItem.customValues, [customKey]: value };
                } else {
                    newItem[field] = value;
                    if (field === 'listPrice' || field === 'unitPrice') {
                        const lp = parseFloat(newItem.listPrice) || 0;
                        const up = parseFloat(newItem.unitPrice) || 0;
                        if (lp > 0 && up >= 0 && up <= lp) {
                            newItem.discountPercent = parseFloat((((lp - up) / lp) * 100).toFixed(2));
                        } else if (lp > 0 && up > lp) {
                            newItem.discountPercent = 0; 
                        } else {
                            newItem.discountPercent = 0;
                        }
                    } else if (field === 'discountPercent') {
                        const lp = parseFloat(newItem.listPrice) || 0;
                        const dp = parseFloat(newItem.discountPercent) || 0;
                        newItem.unitPrice = parseFloat((lp * (1 - dp / 100)).toFixed(2));
                    }
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
        setItems([...items, { id: Date.now(), productServiceId: null, sku: '', description: '', hsnSac: '', quantity: 1, listPrice: 0, discountPercent: 0, unitPrice: 0, taxPercent: 18, customValues: {} }]);
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

    const handlePreview = async () => {
        setValidationError(null);
        
        if (!clientName?.trim()) {
            setValidationError("Please enter a Client Name before previewing.");
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        if (!items || items.length === 0) {
            setValidationError("Add at least one line item before previewing the quotation.");
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        const missingDescIndex = items.findIndex(item => !item.description?.trim());
        if (missingDescIndex !== -1) {
            setValidationError(`Please enter a description for line item ${missingDescIndex + 1} before previewing.`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        const invalidQtyIndex = items.findIndex(item => parseFloat(item.quantity) <= 0 || isNaN(parseFloat(item.quantity)));
        if (invalidQtyIndex !== -1) {
            setValidationError(`Quantity for line item ${invalidQtyIndex + 1} must be greater than 0.`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        const invalidPriceIndex = items.findIndex(item => parseFloat(item.unitPrice) < 0 || isNaN(parseFloat(item.unitPrice)));
        if (invalidPriceIndex !== -1) {
            setValidationError(`Unit Price for line item ${invalidPriceIndex + 1} cannot be negative or invalid.`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setIsPreviewLoading(true);
        setPreviewError(null);
        setIsPreviewModalOpen(true);

        try {
            const payload = {
                quotationId: currentQuotationId,
                enquiryId: enquiryId,
                customerId: customerId,
                clientName: clientName,
                clientCompany: clientCompany,
                clientEmail: clientEmail,
                clientPhone: clientPhone,
                currency: currency,
                quotationSource: quotationSource,
                sourceNotes: sourceNotes,
                columnConfigs: columnConfigs,
                items: items.map((item, index) => ({
                    productServiceId: item.productServiceId,
                    sku: item.sku,
                    hsnSac: item.hsnSac,
                    description: item.description,
                    quantity: item.quantity,
                    listPrice: item.listPrice,
                    unitPrice: item.unitPrice,
                    discountPercent: item.discountPercent,
                    taxPercent: item.taxPercent,
                    sortOrder: index,
                    customValues: item.customValues || {}
                }))
            };

            const pdfResponse = await fetchApi('/quotations/preview/pdf', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            const pdfBlob = await pdfResponse.blob();
            const pdfUrl = URL.createObjectURL(pdfBlob);
            setPreviewPdfUrl(pdfUrl);

            const emailResponse = await fetchApi('/quotations/preview/email', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            setPreviewEmailDetails(emailResponse);

        } catch (err) {
            console.error("Preview Generation Error:", err);
            setPreviewError(err.message || "Failed to generate preview.");
        } finally {
            setIsPreviewLoading(false);
        }
    };

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
                customerId: customerId,
                clientName: clientName,
                clientCompany: clientCompany,
                clientEmail: clientEmail,
                clientPhone: clientPhone,
                currency: currency,
                quotationSource: quotationSource,
                sourceNotes: sourceNotes,
                columnConfigs: columnConfigs,
                items: items.map((item, index) => ({
                    productServiceId: item.productServiceId,
                    sku: item.sku,
                    hsnSac: item.hsnSac,
                    description: item.description,
                    quantity: item.quantity,
                    listPrice: item.listPrice,
                    unitPrice: item.unitPrice,
                    discountPercent: item.discountPercent,
                    taxPercent: item.taxPercent,
                    sortOrder: index,
                    customValues: item.customValues || {}
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

    const handleSend = () => {
        if (isSending || isSaving) return;
        setIsSendModalOpen(true);
    };

    const executeSendQuotation = async (confirmedEmail) => {
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
                customerId: customerId,
                clientName: clientName,
                clientCompany: clientCompany,
                clientEmail: clientEmail,
                clientPhone: clientPhone,
                currency: currency,
                quotationSource: quotationSource,
                sourceNotes: sourceNotes,
                columnConfigs: columnConfigs,
                items: items.map((item, index) => ({
                    productServiceId: item.productServiceId,
                    sku: item.sku,
                    hsnSac: item.hsnSac,
                    description: item.description,
                    quantity: item.quantity,
                    listPrice: item.listPrice,
                    unitPrice: item.unitPrice,
                    discountPercent: item.discountPercent,
                    taxPercent: item.taxPercent,
                    sortOrder: index,
                    customValues: item.customValues || {}
                }))
            };

            // Ensure latest state is saved
            await fetchApi(`/quotations/${activeQuotationId}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            // Send email
            await fetchApi(`/quotations/${activeQuotationId}/send`, {
                method: 'POST',
                body: JSON.stringify({ recipientEmail: confirmedEmail })
            });

            setIsSendModalOpen(false);
            window.dispatchEvent(new Event('notification-update'));
            alert(`Quotation sent successfully to ${confirmedEmail}`);
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
                <div className="w-16 h-16 bg-brand-danger/10 border border-brand-danger/30 flex items-center justify-center rounded-[20px] mb-6 shadow-sm">
                    <AlertCircle className="w-8 h-8 text-brand-danger" />
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
                        <button onClick={() => navigate('/trash')} className="acx-btn-primary flex items-center px-4 py-2.5 shadow-[0_4px_14px_rgba(79,70,229,0.25)]">
                            Go to Trash
                        </button>
                    ) : (
                        <button onClick={initializeBuilder} className="acx-btn-primary flex items-center px-4 py-2.5 shadow-[0_4px_14px_rgba(79,70,229,0.25)]">
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal mb-4"></div>
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
                        className="acx-btn-primary flex items-center px-5 py-2.5 shadow-[0_4px_14px_rgba(79,70,229,0.25)] disabled:opacity-50"
                    >
                        {isSending ? <><span className="animate-spin w-4 h-4 border-b-2 border-white rounded-full mr-2"></span> Sending...</> : <><Send className="mr-2 h-4 w-4" /> Send Quotation</>}
                    </button>
                </div>
            </div>

            {/* Validation Error Banner */}
            {validationError && (
                <div className="p-4 bg-brand-danger/10 border border-brand-danger/30 rounded-2xl flex items-center gap-3 shadow-sm animate-in fade-in duration-200">
                    <AlertCircle className="w-5 h-5 text-brand-danger shrink-0" />
                    <p className="text-[14px] font-semibold text-brand-danger">{validationError}</p>
                </div>
            )}

            {/* Client Details Card */}
            <div className="acx-card p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                        <User className="w-4 h-4 mr-2" />
                        Client Details &amp; Source
                    </div>
                    {enquiry?.referenceId ? (
                        <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10 px-2 py-0.5 rounded-md">
                            WEBSITE ENQUIRY
                        </span>
                    ) : (
                        <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-brand-teal bg-[#14B8A6]/10 px-2 py-0.5 rounded-md">
                            DIRECT · {quotationSource || 'PHONE'}
                        </span>
                    )}
                </div>
                <div className="mb-6 relative">
                    <p className="text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5">Load from Customer Master</p>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search existing customer..."
                            value={customerSearch}
                            onChange={(e) => {
                                setCustomerSearch(e.target.value);
                                setIsCustomerDropdownOpen(true);
                            }}
                            onFocus={() => setIsCustomerDropdownOpen(true)}
                            onBlur={() => setTimeout(() => setIsCustomerDropdownOpen(false), 200)}
                            className="w-full bg-bg-main border border-border-subtle focus:border-brand-teal rounded-xl px-3 py-2 text-[13px] font-semibold text-text-primary outline-none transition-colors"
                        />
                        {isCustomerDropdownOpen && (
                            <div className="absolute z-50 w-full mt-1 bg-bg-card border border-border-subtle rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                {isLoadingCustomers ? (
                                    <div className="p-3 text-[12px] text-text-muted text-center">Loading...</div>
                                ) : customers.length === 0 ? (
                                    <div className="p-3 text-[12px] text-text-muted text-center">No customers found</div>
                                ) : (
                                    customers.map(c => (
                                        <div 
                                            key={c.id}
                                            onClick={() => selectCustomer(c)}
                                            className="px-4 py-2 hover:bg-bg-hover cursor-pointer border-b border-border-subtle/40 last:border-0"
                                        >
                                            <div className="text-[13px] font-bold text-text-primary">{c.name} {c.companyName ? `(${c.companyName})` : ''}</div>
                                            <div className="text-[11px] text-text-muted">{c.email} | {c.phone}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                    <div>
                        <p className="text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5">Currency</p>
                        <select
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            className="w-full bg-bg-main border border-border-subtle focus:border-brand-teal rounded-xl px-3 py-2 text-[13px] font-semibold text-text-primary outline-none transition-colors"
                        >
                            <option value="INR">INR (₹)</option>
                            <option value="USD">USD ($)</option>
                        </select>
                    </div>
                    <div>
                        <p className="text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5">Client Name</p>
                        <input
                            type="text"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            className="w-full bg-bg-main border border-border-subtle focus:border-brand-teal rounded-xl px-3 py-2 text-[13px] font-semibold text-text-primary outline-none transition-colors"
                            placeholder="Client Name"
                        />
                    </div>
                    <div>
                        <p className="text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5">Company</p>
                        <input
                            type="text"
                            value={clientCompany}
                            onChange={(e) => setClientCompany(e.target.value)}
                            className="w-full bg-bg-main border border-border-subtle focus:border-brand-teal rounded-xl px-3 py-2 text-[13px] font-semibold text-text-primary outline-none transition-colors"
                            placeholder="Company Name"
                        />
                    </div>
                    <div>
                        <p className="text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5">Email</p>
                        <input
                            type="email"
                            value={clientEmail}
                            onChange={(e) => setClientEmail(e.target.value)}
                            className="w-full bg-bg-main border border-border-subtle focus:border-brand-teal rounded-xl px-3 py-2 text-[13px] font-medium text-text-primary outline-none transition-colors"
                            placeholder="client@email.com"
                        />
                    </div>
                    <div>
                        <p className="text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5">Phone</p>
                        <input
                            type="text"
                            value={clientPhone}
                            onChange={(e) => setClientPhone(e.target.value)}
                            className="w-full bg-bg-main border border-border-subtle focus:border-brand-teal rounded-xl px-3 py-2 text-[13px] font-medium text-text-primary outline-none transition-colors"
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
            <div className="acx-card p-6 md:p-8 border border-[#7C3AED]/20 relative overflow-hidden group">
                <div className="absolute -right-8 -top-8 text-purple-600/5 pointer-events-none transition-transform group-hover:scale-110 duration-700">
                    <Wand2 className="w-48 h-48" />
                </div>
                <h2 className="text-[14px] font-bold text-text-primary mb-4 flex items-center relative z-10 tracking-tight">
                    <Wand2 className="h-4 w-4 text-purple-600 mr-2" />
                    AI Auto-Extraction
                </h2>
                <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                    <textarea 
                        className="flex-1 acx-input h-24 resize-none rounded-xl text-[13px] bg-bg-main" 
                        placeholder="Paste rough requirements... (e.g., 'We need 2 DELL servers at 60k each and a Cisco router for 5k')"
                        value={roughText}
                        onChange={(e) => setRoughText(e.target.value)}
                    ></textarea>
                    <div className="sm:w-48 flex items-end">
                        <button 
                            onClick={handleParseText}
                            disabled={isParsing || !roughText.trim()}
                            className="w-full h-11 flex justify-center items-center px-4 border border-[#7C3AED]/30 rounded-xl text-[13px] font-semibold text-purple-600 bg-[#7C3AED]/5 hover:bg-[#7C3AED]/10 disabled:opacity-50 transition-colors shadow-sm"
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
            <div className="acx-card overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-border-subtle flex justify-between items-center bg-bg-card">
                    <div>
                        <h2 className="text-base font-bold text-text-primary tracking-tight flex items-center">
                            <Hash className="w-4 h-4 mr-2 text-text-secondary" /> Line Items
                        </h2>
                        <p className="text-[12px] text-text-muted mt-1">Add products or services to this quotation</p>
                    </div>
                    <div className="flex space-x-2">
                        <button onClick={handlePreview} className="inline-flex items-center px-4 py-2 border border-border-subtle hover:bg-bg-hover rounded-xl text-[12px] font-semibold text-text-primary transition-colors shadow-sm">
                            <Eye className="w-4 h-4 mr-2" /> Preview
                        </button>
                        <button onClick={() => setIsConfigModalOpen(true)} className="inline-flex items-center px-4 py-2 border border-border-subtle hover:bg-bg-hover rounded-xl text-[12px] font-semibold text-text-primary transition-colors shadow-sm">
                            <Settings className="w-4 h-4 mr-2" /> Configure Columns
                        </button>
                        <button onClick={handleDownloadTemplate} className="inline-flex items-center px-4 py-2 border border-[var(--color-brand-primary)]/30 bg-[var(--color-brand-primary)]/5 hover:bg-[var(--color-brand-primary)]/10 rounded-xl text-[12px] font-semibold text-[var(--color-brand-primary)] transition-colors shadow-sm">
                            <Download className="w-4 h-4 mr-2" /> Download Template
                        </button>
                    </div>
                </div>

                <div className="px-6 py-4 border-b border-border-subtle bg-bg-main relative">
                    <p className="text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5">Quick Add from Catalog</p>
                    <div className="relative w-full sm:w-96">
                        <input
                            type="text"
                            placeholder="Search product/service..."
                            value={catalogSearch}
                            onChange={(e) => {
                                setCatalogSearch(e.target.value);
                                setIsCatalogDropdownOpen(true);
                            }}
                            onFocus={() => setIsCatalogDropdownOpen(true)}
                            onBlur={() => setTimeout(() => setIsCatalogDropdownOpen(false), 200)}
                            className="w-full bg-bg-card border border-border-subtle focus:border-brand-teal rounded-xl px-3 py-2 text-[13px] font-semibold text-text-primary outline-none transition-colors"
                        />
                        {isCatalogDropdownOpen && (
                            <div className="absolute z-50 w-full mt-1 bg-bg-card border border-border-subtle rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                {isLoadingCatalog ? (
                                    <div className="p-3 text-[12px] text-text-muted text-center">Loading...</div>
                                ) : catalogItems.length === 0 ? (
                                    <div className="p-3 text-[12px] text-text-muted text-center">No catalog items found</div>
                                ) : (
                                    catalogItems.map(item => (
                                        <div 
                                            key={item.id}
                                            onClick={() => addCatalogItem(item)}
                                            className="px-4 py-2 hover:bg-bg-hover cursor-pointer border-b border-border-subtle/40 last:border-0 flex justify-between items-center"
                                        >
                                            <div>
                                                <div className="text-[13px] font-bold text-text-primary">{item.name}</div>
                                                <div className="text-[11px] text-text-muted">{item.sku} | HSN: {item.hsnSac}</div>
                                            </div>
                                            <div className="text-[12px] font-mono font-semibold text-brand-teal">
                                                ₹{item.listPrice}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="acx-table-container">
                    <table className="min-w-[900px] w-full">
                        <thead>
                            <tr>
                                {columnConfigs.filter(c => c.visible).sort((a,b) => a.sortOrder - b.sortOrder).map(config => (
                                    <th key={config.columnKey} className={`px-3 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card ${config.columnType === 'CURRENCY' || config.columnKey === 'rowNumber' ? 'text-right' : 'text-left'}`}>
                                        {config.displayName}
                                    </th>
                                ))}
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

                                const activeConfigs = columnConfigs.filter(c => c.visible).sort((a,b) => a.sortOrder - b.sortOrder);

                                return (
                                    <tr key={item.id} className="group hover:bg-bg-hover transition-colors">
                                        {activeConfigs.map(config => {
                                            if (config.isCustom) {
                                                return (
                                                    <td key={config.columnKey} className="px-3 py-3 align-top">
                                                        <input 
                                                            type={config.columnType === 'NUMBER' || config.columnType === 'CURRENCY' ? 'number' : 'text'}
                                                            step="any"
                                                            value={(item.customValues && item.customValues[config.columnKey]) || ''} 
                                                            onChange={(e) => updateItem(item.id, `custom_${config.columnKey}`, e.target.value)} 
                                                            className={`w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-brand-teal focus:bg-bg-main rounded-lg py-2 px-2 text-[13px] font-medium text-text-primary transition-all outline-none ${config.columnType === 'CURRENCY' || config.columnType === 'NUMBER' ? 'text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none' : ''}`}
                                                            placeholder={config.displayName}
                                                        />
                                                    </td>
                                                );
                                            }

                                            switch (config.columnKey) {
                                                case "rowNumber":
                                                    return (
                                                        <td key={config.columnKey} className="px-2 py-3 align-top text-right text-[12px] font-medium text-text-muted mt-2">
                                                            {index + 1}
                                                        </td>
                                                    );
                                                case "sku":
                                                    return (
                                                        <td key={config.columnKey} className="px-3 py-3 align-top">
                                                            <input type="text" value={item.sku} onChange={(e) => updateItem(item.id, 'sku', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-brand-teal focus:bg-bg-main rounded-lg py-2 px-2 text-[13px] font-medium text-text-primary transition-all outline-none uppercase font-mono tracking-tight" placeholder="SKU" />
                                                        </td>
                                                    );
                                                case "description":
                                                    return (
                                                        <td key={config.columnKey} className="px-4 py-3 align-top">
                                                            <input type="text" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-brand-teal focus:bg-bg-main rounded-lg py-2 px-3 text-[13px] font-semibold text-text-primary transition-all outline-none" placeholder="Item description" />
                                                            {item.sourceText && <p className="text-[11px] text-text-secondary mt-1 italic pl-3 border-l-2 border-[#7C3AED]/40 leading-tight">"{item.sourceText}"</p>}
                                                        </td>
                                                    );
                                                case "hsnSac":
                                                    return (
                                                        <td key={config.columnKey} className="px-3 py-3 align-top">
                                                            <input type="text" value={item.hsnSac} onChange={(e) => updateItem(item.id, 'hsnSac', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-brand-teal focus:bg-bg-main rounded-lg py-2 px-2 text-[13px] font-medium text-text-primary transition-all outline-none font-mono tracking-tight" placeholder="HSN/SAC" />
                                                        </td>
                                                    );
                                                case "quantity":
                                                    return (
                                                        <td key={config.columnKey} className="px-3 py-3 align-top text-right">
                                                            <input type="number" step="any" min="0" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-brand-teal focus:bg-bg-main rounded-lg py-2 px-2 text-[13px] font-medium text-text-primary text-right transition-all outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                                        </td>
                                                    );
                                                case "listPrice":
                                                    return (
                                                        <td key={config.columnKey} className="px-3 py-3 align-top text-right">
                                                            <input type="number" step="any" min="0" value={item.listPrice} onChange={(e) => updateItem(item.id, 'listPrice', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-brand-teal focus:bg-bg-main rounded-lg py-2 px-2 text-[13px] font-medium text-text-primary text-right transition-all outline-none font-mono tracking-tight [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                                        </td>
                                                    );
                                                case "discountPercent":
                                                    return (
                                                        <td key={config.columnKey} className="px-3 py-3 align-top text-right">
                                                            <input type="number" step="any" min="0" max="100" value={item.discountPercent} onChange={(e) => updateItem(item.id, 'discountPercent', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-brand-teal focus:bg-bg-main rounded-lg py-2 px-1 text-[13px] font-medium text-text-primary text-right transition-all outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                                        </td>
                                                    );
                                                case "unitPrice":
                                                    return (
                                                        <td key={config.columnKey} className="px-3 py-3 align-top text-right">
                                                            <input type="number" step="any" min="0" value={item.unitPrice} onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-brand-teal focus:bg-bg-main rounded-lg py-2 px-2 text-[13px] font-bold text-text-primary text-right transition-all outline-none font-mono tracking-tight [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                                        </td>
                                                    );
                                                case "taxPercent":
                                                    return (
                                                        <td key={config.columnKey} className="px-3 py-3 align-top text-right">
                                                            <input type="number" step="any" min="0" max="100" value={item.taxPercent} onChange={(e) => updateItem(item.id, 'taxPercent', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-brand-teal focus:bg-bg-main rounded-lg py-2 px-1 text-[13px] font-medium text-text-primary text-right transition-all outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                                        </td>
                                                    );
                                                case "taxAmount":
                                                    return (
                                                        <td key={config.columnKey} className="px-3 py-3 align-top text-right">
                                                            <div className="font-medium text-text-secondary mt-2 font-mono text-[13px] tracking-tight">
                                                                {taxAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </div>
                                                        </td>
                                                    );
                                                case "total":
                                                    return (
                                                        <td key={config.columnKey} className="px-4 py-3 align-top text-right">
                                                            <div className="font-bold text-text-primary mt-2 font-mono text-[14px] tracking-tight">
                                                                {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </div>
                                                        </td>
                                                    );
                                                default:
                                                    return <td key={config.columnKey}></td>;
                                            }
                                        })}
                                        <td className="px-2 py-3 align-top text-center">
                                            <div className="flex flex-col items-center justify-center space-y-1.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => removeItem(item.id)} className="p-1 text-brand-danger hover:bg-[#DC2626]/10 rounded" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
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
                        <Plus className="w-4 h-4 mr-2 text-[var(--color-brand-primary)]" />
                        Add Item
                    </button>
                    <button onClick={() => setItems([])} className="inline-flex items-center px-4 py-2 text-[13px] font-semibold text-brand-danger hover:bg-[#DC2626]/5 rounded-xl transition-colors">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear All
                    </button>
                </div>
            </div>

            {/* Totals Preview - Light Summary Panel */}
            <div className="flex flex-col md:flex-row md:justify-end">
                <div className="acx-card p-8 w-full md:max-w-[420px] bg-bg-card border border-border-subtle shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-brand-primary)]/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#14B8A6]/5 rounded-full -ml-16 -mb-16 blur-2xl pointer-events-none"></div>
                    
                    <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-6 flex items-center relative z-10">
                        <Calculator className="w-4 h-4 mr-2" /> Quotation Summary
                    </h3>
                    <div className="space-y-4 relative z-10">
                        <div className="flex justify-between text-[13px] text-text-secondary">
                            <span className="font-medium">Subtotal (Before Tax)</span>
                            <span className="font-mono font-semibold text-text-primary tracking-tight">{formatCurrency(totals.subtotalBeforeTax, currency, 2)}</span>
                        </div>
                        <div className="flex justify-between text-[13px]">
                            <span className="font-medium text-text-secondary">Total Discount</span>
                            <span className="text-brand-danger font-mono font-semibold tracking-tight">-{formatCurrency(totals.discount, currency, 2)}</span>
                        </div>
                        <div className="flex justify-between text-[13px] text-text-secondary">
                            <span className="font-medium">Taxable Amount</span>
                            <span className="font-mono font-semibold text-text-primary tracking-tight">{formatCurrency(totals.taxableAmount, currency, 2)}</span>
                        </div>
                        <div className="flex justify-between text-[13px] text-text-secondary pb-5 border-b border-border-subtle">
                            <span className="font-medium">Total Tax</span>
                            <span className="font-mono font-semibold text-text-primary tracking-tight">{formatCurrency(totals.tax, currency, 2)}</span>
                        </div>
                        <div className="flex justify-between items-end pt-3">
                            <span className="text-[15px] font-bold text-text-primary">Grand Total</span>
                            <span className="text-[32px] font-bold text-brand-teal font-mono tracking-tight leading-none">{formatCurrency(totals.grandTotal, currency, 2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <SendQuotationModal 
                isOpen={isSendModalOpen} 
                onClose={() => setIsSendModalOpen(false)} 
                initialEmail={clientEmail} 
                onSend={executeSendQuotation}
                isSending={isSending}
            />

            <QuotationColumnConfigModal
                isOpen={isConfigModalOpen}
                onClose={() => setIsConfigModalOpen(false)}
                activeConfigs={columnConfigs}
                onApply={(newConfigs) => {
                    setColumnConfigs(newConfigs);
                    setIsConfigModalOpen(false);
                }}
            />

            <QuotationPreviewModal
                isOpen={isPreviewModalOpen}
                onClose={() => setIsPreviewModalOpen(false)}
                pdfBlobUrl={previewPdfUrl}
                emailDetails={previewEmailDetails}
                isLoading={isPreviewLoading}
                error={previewError}
                onRetry={handlePreview}
            />
        </div>
    );
}
