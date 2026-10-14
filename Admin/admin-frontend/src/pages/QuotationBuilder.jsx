import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { fetchApi, getCustomers, getCatalog, getCompanyBankAccounts } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { 
    VALIDITY_PERIOD_OPTIONS, 
    getIssueDateStr, 
    calculateValidUntilDate, 
    determineValidityPeriod, 
    isDateBeforeIssueDate 
} from '../utils/validityUtils';
import { Plus, Trash2, Send, Save, Wand2, Calculator, User, Hash, AlertCircle, RefreshCw, Download, Settings, Eye, Loader2, Landmark, Building2, CheckCircle2, ExternalLink } from 'lucide-react';
import SendQuotationModal from '../components/SendQuotationModal';
import QuotationColumnConfigModal from '../components/QuotationColumnConfigModal';
import QuotationPreviewModal from '../components/QuotationPreviewModal';
import { useToast } from '../context/ToastContext';
import GstinAutoLookup from '../components/GstinAutoLookup';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { parseQuotationText, normalizeLineItem, extractJsonFromText } from '../utils/quotationTextParser';

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
    const { showToast } = useToast();
    
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
    const [issueDate, setIssueDate] = useState(() => getIssueDateStr(null));
    const [validityPeriod, setValidityPeriod] = useState('30');
    const [validUntil, setValidUntil] = useState('');
    const [termsAndConditions, setTermsAndConditions] = useState('');
    const [gstin, setGstin] = useState('');

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
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

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

    // Bank Account Selector State
    const [bankAccounts, setBankAccounts] = useState([]);
    const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
    const [selectedBank, setSelectedBank] = useState(null);
    const [isLoadingBankAccounts, setIsLoadingBankAccounts] = useState(false);
    
    // Preview State
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
    const [previewEmailDetails, setPreviewEmailDetails] = useState(null);
    const [previewError, setPreviewError] = useState(null);
    const [validationError, setValidationError] = useState(null);

    // Cleanup Blob URL to prevent memory leaks
    useEffect(() => {
        return () => {
            if (previewPdfUrl) {
                URL.revokeObjectURL(previewPdfUrl);
            }
        };
    }, [previewPdfUrl]);

    const [error, setError] = useState(null);
    const [isInitializing, setIsInitializing] = useState(true);

    const initializeBuilder = React.useCallback(async () => {
        setIsInitializing(true);
        setError(null);
        
        try {
            // Fetch company bank accounts for quotation PDF selection
            let accounts = [];
            try {
                setIsLoadingBankAccounts(true);
                accounts = await getCompanyBankAccounts();
                if (Array.isArray(accounts)) {
                    setBankAccounts(accounts);
                } else {
                    accounts = [];
                    setBankAccounts([]);
                }
            } catch (bErr) {
                console.error("Failed to load company bank accounts", bErr);
                accounts = [];
                setBankAccounts([]);
            } finally {
                setIsLoadingBankAccounts(false);
            }

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
                const qIssueDate = getIssueDateStr(q.createdAt);
                setIssueDate(qIssueDate);
                setValidUntil(q.validUntil || '');
                setValidityPeriod(determineValidityPeriod(qIssueDate, q.validUntil));
                setTermsAndConditions(q.termsAndConditions || '');

                // Resolve quotation bank account
                let chosenAccount = null;
                if (q.companyBankAccountId) {
                    chosenAccount = accounts.find(a => String(a.id) === String(q.companyBankAccountId));
                }
                if (!chosenAccount && q.bankAccountNumber) {
                    chosenAccount = accounts.find(a => a.bankAccountNumber === q.bankAccountNumber);
                }
                if (!chosenAccount && q.bankName) {
                    chosenAccount = {
                        id: q.companyBankAccountId || 'saved',
                        bankName: q.bankName,
                        accountHolder: q.bankAccountHolder || q.clientCompany || '',
                        bankAccountNumber: q.bankAccountNumber,
                        maskedAccountNumber: q.bankAccountNumber && String(q.bankAccountNumber).length > 4 
                            ? `•••• ${String(q.bankAccountNumber).slice(-4)}` 
                            : (q.bankAccountNumber || ''),
                        bankIfsc: q.bankIfsc || '',
                        bankBranch: q.bankBranch || ''
                    };
                }
                if (!chosenAccount && accounts.length > 0) {
                    chosenAccount = accounts.find(a => a.isDefault) || accounts[0];
                }

                if (chosenAccount) {
                    setSelectedBankAccountId(String(chosenAccount.id));
                    setSelectedBank(chosenAccount);
                } else {
                    setSelectedBankAccountId('NONE');
                    setSelectedBank(null);
                }

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
                        quantity: item.quantity !== null && item.quantity !== undefined ? item.quantity : '',
                        listPrice: item.listPrice !== null && item.listPrice !== undefined ? item.listPrice : '',
                        unitPrice: item.unitPrice !== null && item.unitPrice !== undefined ? item.unitPrice : '',
                        discountPercent: item.discountPercent !== null && item.discountPercent !== undefined ? item.discountPercent : '',
                        taxPercent: item.taxPercent !== null && item.taxPercent !== undefined ? item.taxPercent : '',
                        sourceText: '',
                        customValues: item.customValues || {}
                    })));
                } else {
                    setItems([]);
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
                const todayIssueDate = getIssueDateStr(null);
                setIssueDate(todayIssueDate);
                setValidityPeriod('30');
                setValidUntil(calculateValidUntilDate(todayIssueDate, 30));
                setColumnConfigs(defaultConfigs);
                setCustomerId(null);
                setItems([]);
                setCurrentQuotationId(null);
                setQuotationNumber('');

                // Pre-select default bank account for new quotation
                const defaultAcc = accounts.find(a => a.isDefault) || (accounts.length > 0 ? accounts[0] : null);
                if (defaultAcc) {
                    setSelectedBankAccountId(String(defaultAcc.id));
                    setSelectedBank(defaultAcc);
                } else {
                    setSelectedBankAccountId('NONE');
                    setSelectedBank(null);
                }
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
        setGstin(c.gstin || '');
        setCustomerSearch('');
        setIsCustomerDropdownOpen(false);
    };

    const clearSelectedCustomer = () => {
        setCustomerId(null);
        setClientName('');
        setClientCompany('');
        setClientEmail('');
        setClientPhone('');
        setGstin('');
        setCustomerSearch('');
    };


    const addCatalogItem = (c) => {
        const newItem = { 
            id: Date.now() + Math.random(), 
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
        };
        const activeItems = items.filter(it => it.description?.trim() || it.sku?.trim() || it.productServiceId);
        setItems([...activeItems, newItem]);
        setCatalogSearch('');
        setIsCatalogDropdownOpen(false);
    };

    const handleParseText = async () => {
        const textToParse = roughText.trim();
        if (!textToParse) {
            showToast({ type: 'warning', message: 'Please enter or paste quotation requirements to extract.' });
            return;
        }

        setIsParsing(true);
        try {
            // 1. Try local deterministic parser (supports multiline plain-text, tab/pipe tables, numbered items, and direct JSON)
            const localResult = parseQuotationText(textToParse);

            if (localResult.success && localResult.items.length > 0) {
                // Discard any empty placeholder rows and append extracted rows
                const activeItems = items.filter(it => it.description?.trim() || it.sku?.trim() || it.productServiceId);
                setItems([...activeItems, ...localResult.items]);
                setRoughText('');
                showToast({
                    type: 'success',
                    message: `Successfully extracted ${localResult.items.length} item${localResult.items.length > 1 ? 's' : ''} to line items.`
                });
                return;
            }

            // 2. If text was unstructured / natural language, attempt AI extraction via backend Gemini endpoint
            let aiResponse = null;
            try {
                aiResponse = await fetchApi('/gemini/extract', {
                    method: 'POST',
                    body: JSON.stringify({ roughText: textToParse })
                });
            } catch (apiError) {
                console.warn('AI Extraction API failed:', apiError);
                // If local parser had descriptive line errors, report them
                if (localResult.error && localResult.format !== 'empty' && localResult.format !== 'unstructured') {
                    showToast({
                        type: 'error',
                        message: localResult.error
                    });
                } else {
                    const msg = apiError.message && !apiError.message.includes('Something went wrong')
                        ? apiError.message
                        : 'Could not extract quotation items. Please ensure items include a description and price or quantity, or paste in table format.';
                    showToast({ type: 'error', message: msg });
                }
                return;
            }

            // 3. Process AI Response (safely handles arrays, JSON strings, markdown fences, or object wrappers)
            let rawList = [];
            if (Array.isArray(aiResponse)) {
                rawList = aiResponse;
            } else if (typeof aiResponse === 'string') {
                const parsed = extractJsonFromText(aiResponse);
                if (Array.isArray(parsed)) rawList = parsed;
            } else if (aiResponse && typeof aiResponse === 'object') {
                const inner = aiResponse.items || aiResponse.rows || aiResponse.data || aiResponse.quotationItems;
                if (Array.isArray(inner)) rawList = inner;
            }

            const validItems = rawList
                .map(it => normalizeLineItem(it))
                .filter(Boolean);

            if (validItems.length > 0) {
                const activeItems = items.filter(it => it.description?.trim() || it.sku?.trim() || it.productServiceId);
                setItems([...activeItems, ...validItems]);
                setRoughText('');
                showToast({
                    type: 'success',
                    message: `Successfully extracted ${validItems.length} item${validItems.length > 1 ? 's' : ''} via AI.`
                });
            } else {
                showToast({
                    type: 'error',
                    message: localResult.error || 'No quotation items could be parsed from the provided text. Please check the format.'
                });
            }
        } catch (error) {
            console.error("Extraction error:", error);
            showToast({
                type: 'error',
                message: error.message ? `Extraction error: ${error.message}` : "Failed to parse text. Please check the format."
            });
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
                        const hasLp = newItem.listPrice !== '' && newItem.listPrice !== null && newItem.listPrice !== undefined;
                        const hasUp = newItem.unitPrice !== '' && newItem.unitPrice !== null && newItem.unitPrice !== undefined;
                        if (hasLp && hasUp) {
                            const lp = parseFloat(newItem.listPrice) || 0;
                            const up = parseFloat(newItem.unitPrice) || 0;
                            if (lp > 0 && up >= 0 && up <= lp) {
                                newItem.discountPercent = parseFloat((((lp - up) / lp) * 100).toFixed(2));
                            } else {
                                newItem.discountPercent = 0; 
                            }
                        } else if (!hasUp && field === 'unitPrice') {
                            newItem.discountPercent = '';
                        }
                    } else if (field === 'discountPercent') {
                        const hasLp = newItem.listPrice !== '' && newItem.listPrice !== null && newItem.listPrice !== undefined;
                        if (hasLp && value !== '') {
                            const lp = parseFloat(newItem.listPrice) || 0;
                            const dp = parseFloat(value) || 0;
                            newItem.unitPrice = parseFloat((lp * (1 - dp / 100)).toFixed(2));
                        }
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
        setItems([
            ...items, 
            { 
                id: Date.now() + Math.random(), 
                productServiceId: null, 
                sku: '', 
                description: '', 
                hsnSac: '', 
                quantity: '', 
                listPrice: '', 
                discountPercent: '', 
                unitPrice: '', 
                taxPercent: '', 
                customValues: {} 
            }
        ]);
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

    const isDateInvalid = Boolean(validUntil && issueDate && isDateBeforeIssueDate(validUntil, issueDate));

    const formattedIssueDate = React.useMemo(() => {
        if (!issueDate) return '';
        try {
            const parts = String(issueDate).split('-');
            if (parts.length === 3) {
                const y = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10) - 1;
                const d = parseInt(parts[2], 10);
                const dateObj = new Date(y, m, d);
                if (!isNaN(dateObj.getTime())) {
                    return dateObj.toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                    });
                }
            }
        } catch {
            // fallback
        }
        return issueDate;
    }, [issueDate]);

    const handleValidityPeriodChange = (e) => {
        const period = e.target.value;
        setValidityPeriod(period);
        if (period !== 'custom') {
            const calculated = calculateValidUntilDate(issueDate, Number(period));
            setValidUntil(calculated);
        }
    };

    const handleValidUntilChange = (e) => {
        const newDate = e.target.value;
        setValidUntil(newDate);
        setValidityPeriod('custom');
    };

    const handleBankAccountChange = (e) => {
        const val = e.target.value;
        setSelectedBankAccountId(val);
        if (!val || val === 'NONE') {
            setSelectedBank(null);
        } else {
            const found = bankAccounts.find(a => String(a.id) === String(val));
            setSelectedBank(found || null);
        }
    };

    const serializeItems = (itemList) => {
        return (itemList || []).map((item, index) => {
            const hasQty = item.quantity !== '' && item.quantity !== null && item.quantity !== undefined;
            const hasLp = item.listPrice !== '' && item.listPrice !== null && item.listPrice !== undefined;
            const hasUp = item.unitPrice !== '' && item.unitPrice !== null && item.unitPrice !== undefined;
            const hasDp = item.discountPercent !== '' && item.discountPercent !== null && item.discountPercent !== undefined;
            const hasTax = item.taxPercent !== '' && item.taxPercent !== null && item.taxPercent !== undefined;

            const qty = hasQty ? (parseFloat(item.quantity) || 0) : 0;
            const up = hasUp ? (parseFloat(item.unitPrice) || 0) : 0;
            const lp = hasLp ? (parseFloat(item.listPrice) || 0) : up;
            const dp = hasDp ? (parseFloat(item.discountPercent) || 0) : 0;
            const tax = hasTax ? (parseFloat(item.taxPercent) || 0) : 0;

            return {
                productServiceId: item.productServiceId || null,
                sku: item.sku || '',
                hsnSac: item.hsnSac || '',
                description: item.description || '',
                quantity: qty,
                listPrice: lp,
                unitPrice: up,
                discountPercent: dp,
                taxPercent: tax,
                sortOrder: index,
                customValues: item.customValues || {}
            };
        });
    };

    const handlePreview = async () => {
        setValidationError(null);
        
        if (!clientName?.trim()) {
            const msg = "Please enter a Client Name before previewing.";
            setValidationError(msg);
            showToast({ type: 'error', message: msg });
            return;
        }

        if (isDateInvalid) {
            const msg = `Valid Until date (${validUntil}) cannot be earlier than quotation issue date (${issueDate}).`;
            setValidationError(msg);
            showToast({ type: 'error', message: msg });
            return;
        }

        if (!items || items.length === 0) {
            const msg = "Add at least one line item before previewing the quotation.";
            setValidationError(msg);
            showToast({ type: 'error', message: msg });
            return;
        }

        const missingDescIndex = items.findIndex(item => !item.description?.trim());
        if (missingDescIndex !== -1) {
            const msg = `Please enter a description for line item ${missingDescIndex + 1} before previewing.`;
            setValidationError(msg);
            showToast({ type: 'error', message: msg });
            return;
        }

        const invalidQtyIndex = items.findIndex(item => parseFloat(item.quantity) <= 0 || isNaN(parseFloat(item.quantity)));
        if (invalidQtyIndex !== -1) {
            const msg = `Quantity for line item ${invalidQtyIndex + 1} must be greater than 0.`;
            setValidationError(msg);
            showToast({ type: 'error', message: msg });
            return;
        }

        const invalidPriceIndex = items.findIndex(item => parseFloat(item.unitPrice) < 0 || isNaN(parseFloat(item.unitPrice)));
        if (invalidPriceIndex !== -1) {
            const msg = `Unit Price for line item ${invalidPriceIndex + 1} cannot be negative or invalid.`;
            setValidationError(msg);
            showToast({ type: 'error', message: msg });
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
                validUntil: validUntil || null,
                termsAndConditions: termsAndConditions,
                columnConfigs: columnConfigs,
                items: serializeItems(items),
                bankName: selectedBank ? selectedBank.bankName : null,
                bankAccountHolder: selectedBank ? selectedBank.accountHolder : null,
                bankAccountNumber: selectedBank ? selectedBank.bankAccountNumber : null,
                bankIfsc: selectedBank ? selectedBank.bankIfsc : null,
                bankBranch: selectedBank ? selectedBank.bankBranch : null,
                companyBankAccountId: selectedBank && !isNaN(Number(selectedBank.id)) ? Number(selectedBank.id) : null
            };

            const pdfResponse = await fetchApi('/quotations/preview/pdf', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            const arrayBuffer = await pdfResponse.arrayBuffer();
            const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
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
        if (isDateInvalid) {
            const msg = `Valid Until date (${validUntil}) cannot be earlier than quotation issue date (${issueDate}).`;
            showToast({ type: 'error', message: msg });
            return;
        }
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
                validUntil: validUntil || null,
                termsAndConditions: termsAndConditions,
                columnConfigs: columnConfigs,
                items: serializeItems(items),
                bankName: selectedBank ? selectedBank.bankName : null,
                bankAccountHolder: selectedBank ? selectedBank.accountHolder : null,
                bankAccountNumber: selectedBank ? selectedBank.bankAccountNumber : null,
                bankIfsc: selectedBank ? selectedBank.bankIfsc : null,
                bankBranch: selectedBank ? selectedBank.bankBranch : null,
                companyBankAccountId: selectedBank && !isNaN(Number(selectedBank.id)) ? Number(selectedBank.id) : null
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
        if (isDateInvalid) {
            const msg = `Valid Until date (${validUntil}) cannot be earlier than quotation issue date (${issueDate}).`;
            showToast({ type: 'error', message: msg });
            return;
        }
        setIsSendModalOpen(true);
    };

    const executeSendQuotation = async (confirmedEmail) => {
        if (isDateInvalid) {
            const msg = `Valid Until date (${validUntil}) cannot be earlier than quotation issue date (${issueDate}).`;
            showToast({ type: 'error', message: msg });
            return;
        }
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
                validUntil: validUntil || null,
                termsAndConditions: termsAndConditions,
                columnConfigs: columnConfigs,
                items: serializeItems(items),
                bankName: selectedBank ? selectedBank.bankName : null,
                bankAccountHolder: selectedBank ? selectedBank.accountHolder : null,
                bankAccountNumber: selectedBank ? selectedBank.bankAccountNumber : null,
                bankIfsc: selectedBank ? selectedBank.bankIfsc : null,
                bankBranch: selectedBank ? selectedBank.bankBranch : null,
                companyBankAccountId: selectedBank && !isNaN(Number(selectedBank.id)) ? Number(selectedBank.id) : null
            };

            // Ensure latest state is saved
            await fetchApi(`/quotations/${activeQuotationId}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            // Send email
            const recipientList = Array.isArray(confirmedEmail) ? confirmedEmail : [confirmedEmail];
            await fetchApi(`/quotations/${activeQuotationId}/send`, {
                method: 'POST',
                body: JSON.stringify({ 
                    recipientEmails: recipientList,
                    recipientEmail: recipientList[0] || ''
                })
            });

            setIsSendModalOpen(false);
            window.dispatchEvent(new Event('notification-update'));
            const recipientDisplay = recipientList.join(', ');
            showToast({ type: 'success', message: `Quotation sent successfully to ${recipientDisplay}` });
            navigate('/enquiries');
        } catch (error) {
            console.error("Send Quotation Error:", error);
            showToast({ type: 'error', message: error.message || "Failed to send quotation." });
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
                    <button onClick={() => navigate('/quotations')} className="btn btn-secondary btn-md">
                        Back to Quotations
                    </button>
                    {isTrashError ? (
                        <button onClick={() => navigate('/trash')} className="btn btn-secondary btn-md">
                            Go to Trash
                        </button>
                    ) : (
                        <button onClick={initializeBuilder} className="btn btn-secondary btn-md">
                            <RefreshCw className="w-4 h-4 " />
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
                <div className="flex items-center justify-end w-full md:w-auto">
                    <div className="flex items-center space-x-3 ml-auto">
                        <button 
                            onClick={handleSaveDraft} 
                            disabled={isSaving || isSending}
                            className="btn btn-secondary btn-md flex items-center"
                        >
                            {isSaving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</> : <><Save className="mr-2 h-4 w-4" /> Save Draft</>}
                        </button>
                        <button 
                            onClick={handlePreview} 
                            disabled={isSaving || isSending}
                            className="btn btn-secondary btn-md flex items-center"
                        >
                            <Eye className="mr-2 h-4 w-4" /> Preview PDF
                        </button>
                        <button 
                            onClick={handleSend} 
                            disabled={isSending || isSaving}
                            className="btn btn-primary btn-md flex items-center"
                        >
                            {isSending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...</> : <><Send className="mr-2 h-4 w-4" /> Send Quotation</>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Validation Error Banner */}
            {validationError && (
                <div className="p-4 bg-brand-danger/10 border border-brand-danger/30 rounded-2xl flex items-center gap-3 shadow-sm animate-modal-entrance">
                    <AlertCircle className="w-5 h-5 text-brand-danger shrink-0" />
                    <p className="text-[14px] font-semibold text-brand-danger">{validationError}</p>
                </div>
            )}

            {/* Client Details Card */}
            <div className="acx-card p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                        <User className="w-4 h-4 " />
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
                <details className="mb-6 group">
                    <summary className="text-[11px] font-bold text-text-secondary uppercase tracking-wider cursor-pointer flex items-center select-none outline-none">
                        <span className="border-b border-dashed border-text-muted hover:text-text-primary pb-0.5">Edit / Change Customer Source (Optional)</span>
                    </summary>
                    {customerId ? (
                        <div className="flex items-center justify-between p-3.5 bg-brand-primary/5 dark:bg-brand-primary/10 border border-brand-primary/20 rounded-xl mt-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-500/20">
                                    ✓
                                </div>
                                <div>
                                    <div className="text-[13px] font-bold text-text-primary flex items-center gap-2">
                                        {clientName} {clientCompany ? `(${clientCompany})` : ''}
                                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                                            Saved Customer
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-text-muted mt-0.5">
                                        {clientEmail || 'No email'} · {clientPhone || 'No phone'} · GSTIN: <span className="font-mono">{gstin || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={clearSelectedCustomer}
                                className="px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-red-600 bg-bg-card border border-border-subtle rounded-lg shadow-sm transition-colors"
                            >
                                Change / Clear
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 p-4 border border-border-subtle rounded-xl bg-bg-muted/30">
                            <div>
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
                                                        onMouseDown={(e) => e.preventDefault()}
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
                            <div>
                                <p className="text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5">Or Verify New Customer GSTIN</p>
                                <GstinAutoLookup 
                                    value={gstin}
                                    onChange={setGstin}
                                    isExistingCustomer={false}
                                    onVerified={(data) => {
                                        setCustomerId(null);
                                        setClientName(data.tradeName || data.legalName || clientName);
                                        setClientCompany(data.legalName || clientCompany);
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </details>
                <div className="quotation-client-grid">
                    <div className="min-w-0">
                        <label htmlFor="quotation-currency" className="block text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5 truncate">
                            Currency
                        </label>
                        <select
                            id="quotation-currency"
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            className="w-full h-10 bg-bg-main border border-border-subtle focus:border-brand-teal focus:ring-1 focus:ring-brand-teal/20 rounded-xl px-3 text-[13px] font-medium text-text-primary outline-none transition-colors cursor-pointer"
                        >
                            <option value="INR">INR (₹)</option>
                            <option value="USD">USD ($)</option>
                        </select>
                    </div>
                    <div className="min-w-0">
                        <label htmlFor="quotation-client-name" className="block text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5 truncate">
                            Client Name
                        </label>
                        <input
                            id="quotation-client-name"
                            type="text"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            className="w-full h-10 bg-bg-main border border-border-subtle focus:border-brand-teal focus:ring-1 focus:ring-brand-teal/20 rounded-xl px-3 text-[13px] font-medium text-text-primary outline-none transition-colors"
                            placeholder="Client Name"
                        />
                    </div>
                    <div className="min-w-0">
                        <label htmlFor="quotation-client-company" className="block text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5 truncate">
                            Company
                        </label>
                        <input
                            id="quotation-client-company"
                            type="text"
                            value={clientCompany}
                            onChange={(e) => setClientCompany(e.target.value)}
                            className="w-full h-10 bg-bg-main border border-border-subtle focus:border-brand-teal focus:ring-1 focus:ring-brand-teal/20 rounded-xl px-3 text-[13px] font-medium text-text-primary outline-none transition-colors"
                            placeholder="Company Name"
                        />
                    </div>
                    <div className="min-w-0">
                        <label htmlFor="quotation-client-email" className="block text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5 truncate">
                            Email
                        </label>
                        <input
                            id="quotation-client-email"
                            type="email"
                            value={clientEmail}
                            onChange={(e) => setClientEmail(e.target.value)}
                            className="w-full h-10 bg-bg-main border border-border-subtle focus:border-brand-teal focus:ring-1 focus:ring-brand-teal/20 rounded-xl px-3 text-[13px] font-medium text-text-primary outline-none transition-colors"
                            placeholder="client@email.com"
                        />
                    </div>
                    <div className="min-w-0">
                        <label htmlFor="quotation-client-phone" className="block text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5 truncate">
                            Phone
                        </label>
                        <input
                            id="quotation-client-phone"
                            type="text"
                            value={clientPhone}
                            onChange={(e) => setClientPhone(e.target.value)}
                            className="w-full h-10 bg-bg-main border border-border-subtle focus:border-brand-teal focus:ring-1 focus:ring-brand-teal/20 rounded-xl px-3 text-[13px] font-medium text-text-primary outline-none transition-colors"
                            placeholder="+91..."
                        />
                    </div>
                    <div className="min-w-0">
                        <label htmlFor="validity-period-select" className="block text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5 truncate">
                            Validity Period
                        </label>
                        <select
                            id="validity-period-select"
                            value={validityPeriod}
                            onChange={handleValidityPeriodChange}
                            className="w-full h-10 bg-bg-main border border-border-subtle focus:border-brand-teal focus:ring-1 focus:ring-brand-teal/20 rounded-xl px-3 text-[13px] font-medium text-text-primary outline-none transition-colors cursor-pointer"
                        >
                            {VALIDITY_PERIOD_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="min-w-0">
                        <label htmlFor="valid-until-input" className="block text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5 truncate">
                            Valid Until
                        </label>
                        <input
                            id="valid-until-input"
                            type="date"
                            value={validUntil}
                            min={issueDate}
                            onChange={handleValidUntilChange}
                            className={`w-full h-10 bg-bg-main border ${
                                isDateInvalid ? 'border-red-500 focus:border-red-500 text-red-500' : 'border-border-subtle focus:border-brand-teal focus:ring-1 focus:ring-brand-teal/20 text-text-primary'
                            } rounded-xl px-3 text-[13px] font-medium outline-none transition-colors`}
                        />
                        <div className="mt-1 min-h-[16px]">
                            {isDateInvalid ? (
                                <p className="text-[11px] text-red-500 font-medium truncate">
                                    Cannot be before issue date
                                </p>
                            ) : issueDate ? (
                                <p className="text-[11px] text-text-muted font-normal truncate" title={`Quotation issue date: ${formattedIssueDate}`}>
                                    From {formattedIssueDate}
                                </p>
                            ) : null}
                        </div>
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
                            className="btn btn-primary w-full py-2.5 text-[13px] flex items-center justify-center gap-2"
                        >
                            {isParsing ? (
                                <><span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current"></span> Parsing...</>
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
                            <Hash className="w-4 h-4 text-text-secondary" /> Line Items
                        </h2>
                        <p className="text-[12px] text-text-muted mt-1">Add products or services to this quotation</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button onClick={handlePreview} className="btn btn-secondary btn-sm flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5" /> Preview
                        </button>
                        <button onClick={() => setIsConfigModalOpen(true)} className="btn btn-secondary btn-sm flex items-center gap-1.5">
                            <Settings className="w-3.5 h-3.5" /> Columns
                        </button>
                        <button onClick={handleDownloadTemplate} className="btn btn-secondary btn-sm flex items-center gap-1.5">
                            <Download className="w-3.5 h-3.5" /> Template
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
                                            onMouseDown={(e) => e.preventDefault()}
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
                                    <th key={config.columnKey} className={`px-3 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card ${config.columnKey === 'rowNumber' ? 'text-center w-[48px]' : config.columnType === 'CURRENCY' || config.columnType === 'NUMBER' ? 'text-right' : 'text-left'}`}>
                                        {config.displayName}
                                    </th>
                                ))}
                                <th className="px-2 py-4 text-center text-[11px] font-bold text-text-muted uppercase tracking-wider w-[5%] bg-bg-card">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle/40 bg-bg-card">
                            {items.length === 0 ? (
                                <tr>
                                    <td 
                                        colSpan={columnConfigs.filter(c => c.visible).length + 1}
                                        className="px-6 py-14 text-center bg-bg-card"
                                    >
                                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center">
                                            <div className="w-10 h-10 rounded-full bg-bg-muted flex items-center justify-center text-text-muted mb-3">
                                                <Hash className="w-5 h-5 text-text-muted/60" />
                                            </div>
                                            <p className="text-[13px] font-semibold text-text-secondary mb-1">
                                                No items added yet. Click &ldquo;+ Add Item&rdquo; or use AI Auto-Extraction.
                                            </p>
                                            <p className="text-[12px] text-text-muted mb-4">
                                                Add line items manually, extract from rough requirements, or select from the catalog.
                                            </p>
                                            <button 
                                                type="button" 
                                                onClick={addItem} 
                                                className="btn btn-secondary btn-sm flex items-center gap-1.5 shadow-sm"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Add Item
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                items.map((item, index) => {
                                    const qty = parseFloat(item.quantity) || 0;
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
                                                            <td key={config.columnKey} className="px-2 py-3 align-top text-center text-[12px] font-mono font-medium text-text-muted pt-3.5">
                                                                {index + 1}
                                                            </td>
                                                        );
                                                    case "sku":
                                                        return (
                                                            <td key={config.columnKey} className="px-3 py-3 align-top">
                                                                <input 
                                                                    type="text" 
                                                                    value={item.sku || ''} 
                                                                    onChange={(e) => updateItem(item.id, 'sku', e.target.value)} 
                                                                    className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-brand-teal focus:bg-bg-main rounded-lg py-2 px-2 text-[13px] font-medium text-text-primary transition-all outline-none uppercase font-mono tracking-tight placeholder:normal-case placeholder:font-sans placeholder:text-text-muted/60" 
                                                                    placeholder="e.g. SKU-001" 
                                                                />
                                                            </td>
                                                        );
                                                    case "description":
                                                        return (
                                                            <td key={config.columnKey} className="px-3 py-3 align-top min-w-[240px]">
                                                                <textarea
                                                                    value={item.description || ''}
                                                                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                                                    rows={1}
                                                                    className="w-full min-h-[38px] bg-transparent border border-transparent hover:border-border-subtle focus:border-brand-teal focus:bg-bg-main rounded-lg py-2 px-3 text-[13px] font-semibold text-text-primary transition-colors outline-none resize-y leading-relaxed placeholder:font-normal placeholder:text-text-muted/60"
                                                                    placeholder="Enter item description"
                                                                />
                                                                {item.sourceText && (
                                                                    <p className="text-[11px] text-text-secondary mt-1.5 italic pl-3 border-l-2 border-[#7C3AED]/40 leading-tight">
                                                                        &ldquo;{item.sourceText}&rdquo;
                                                                    </p>
                                                                )}
                                                            </td>
                                                        );
                                                    case "hsnSac":
                                                        return (
                                                            <td key={config.columnKey} className="px-3 py-3 align-top">
                                                                <input 
                                                                    type="text" 
                                                                    value={item.hsnSac || ''} 
                                                                    onChange={(e) => updateItem(item.id, 'hsnSac', e.target.value)} 
                                                                    className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-brand-teal focus:bg-bg-main rounded-lg py-2 px-2 text-[13px] font-medium text-text-primary transition-all outline-none font-mono tracking-tight placeholder:font-sans placeholder:text-text-muted/60" 
                                                                    placeholder="e.g. 998314" 
                                                                />
                                                            </td>
                                                        );
                                                    case "quantity":
                                                        return (
                                                            <td key={config.columnKey} className="px-3 py-3 align-top text-right">
                                                                <input 
                                                                    type="number" 
                                                                    step="any" 
                                                                    min="0" 
                                                                    value={item.quantity === '' || item.quantity === null || item.quantity === undefined ? '' : item.quantity} 
                                                                    onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} 
                                                                    className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-brand-teal focus:bg-bg-main rounded-lg py-2 px-2 text-[13px] font-medium text-text-primary text-right transition-all outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-text-muted/60" 
                                                                    placeholder="e.g. 1" 
                                                                />
                                                            </td>
                                                        );
                                                    case "listPrice":
                                                        return (
                                                            <td key={config.columnKey} className="px-3 py-3 align-top text-right">
                                                                <input 
                                                                    type="number" 
                                                                    step="any" 
                                                                    min="0" 
                                                                    value={item.listPrice === '' || item.listPrice === null || item.listPrice === undefined ? '' : item.listPrice} 
                                                                    onChange={(e) => updateItem(item.id, 'listPrice', e.target.value)} 
                                                                    className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-brand-teal focus:bg-bg-main rounded-lg py-2 px-2 text-[13px] font-medium text-text-primary text-right transition-all outline-none font-mono tracking-tight [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:font-sans placeholder:text-text-muted/60" 
                                                                    placeholder="e.g. 1000.00" 
                                                                />
                                                            </td>
                                                        );
                                                    case "discountPercent":
                                                        return (
                                                            <td key={config.columnKey} className="px-3 py-3 align-top text-right">
                                                                <input 
                                                                    type="number" 
                                                                    step="any" 
                                                                    min="0" 
                                                                    max="100" 
                                                                    value={item.discountPercent === '' || item.discountPercent === null || item.discountPercent === undefined ? '' : item.discountPercent} 
                                                                    onChange={(e) => updateItem(item.id, 'discountPercent', e.target.value)} 
                                                                    className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-brand-teal focus:bg-bg-main rounded-lg py-2 px-1 text-[13px] font-medium text-text-primary text-right transition-all outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-text-muted/60" 
                                                                    placeholder="e.g. 0" 
                                                                />
                                                            </td>
                                                        );
                                                    case "unitPrice":
                                                        return (
                                                            <td key={config.columnKey} className="px-3 py-3 align-top text-right">
                                                                <input 
                                                                    type="number" 
                                                                    step="any" 
                                                                    min="0" 
                                                                    value={item.unitPrice === '' || item.unitPrice === null || item.unitPrice === undefined ? '' : item.unitPrice} 
                                                                    onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)} 
                                                                    className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-brand-teal focus:bg-bg-main rounded-lg py-2 px-2 text-[13px] font-bold text-text-primary text-right transition-all outline-none font-mono tracking-tight [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:font-sans placeholder:font-normal placeholder:text-text-muted/60" 
                                                                    placeholder="0.00" 
                                                                />
                                                            </td>
                                                        );
                                                    case "taxPercent":
                                                        return (
                                                            <td key={config.columnKey} className="px-3 py-3 align-top text-right">
                                                                <input 
                                                                    type="number" 
                                                                    step="any" 
                                                                    min="0" 
                                                                    max="100" 
                                                                    value={item.taxPercent === '' || item.taxPercent === null || item.taxPercent === undefined ? '' : item.taxPercent} 
                                                                    onChange={(e) => updateItem(item.id, 'taxPercent', e.target.value)} 
                                                                    className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-brand-teal focus:bg-bg-main rounded-lg py-2 px-1 text-[13px] font-medium text-text-primary text-right transition-all outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-text-muted/60" 
                                                                    placeholder="18" 
                                                                />
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
                                                    <button type="button" onClick={() => removeItem(item.id)} className="btn btn-danger btn-icon" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Add Item & Clear All Row */}
                <div className="p-5 border-t border-border-subtle/50 bg-bg-card rounded-b-[24px] flex justify-between items-center">
                    <button type="button" onClick={addItem} className="btn btn-secondary btn-sm flex items-center gap-1.5">
                        <Plus className="w-4 h-4" /> Add Item
                    </button>
                    <button 
                        type="button"
                        disabled={items.length === 0}
                        onClick={() => setIsClearConfirmOpen(true)}
                        className="flex items-center bg-white border border-brand-danger/30 text-brand-danger hover:bg-brand-danger/5 disabled:opacity-40 disabled:cursor-not-allowed h-[38px] md:h-[40px] px-3 md:px-4 rounded-[10px] md:rounded-[12px] text-[13px] md:text-[14px] font-medium transition-colors"
                    >
                        <Trash2 className="w-4 h-4 mr-1.5" /> Clear All
                    </button>
                </div>
            </div>

            {/* Terms & Conditions Box */}
            <div className="acx-card mb-6 overflow-hidden">
                <div className="px-5 py-4 border-b border-border-subtle bg-bg-card flex justify-between items-center">
                    <h3 className="text-[13px] font-bold text-text-primary uppercase tracking-wider flex items-center">
                        Terms & Conditions
                    </h3>
                </div>
                <div className="p-5 bg-bg-main">
                    <textarea 
                        value={termsAndConditions} 
                        onChange={(e) => setTermsAndConditions(e.target.value)} 
                        className="acx-input w-full min-h-[140px] resize-y leading-relaxed text-[13px]" 
                        placeholder="Enter quotation terms and conditions..."
                    ></textarea>
                </div>
            </div>

            {/* Bank Details & Quotation Summary Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mb-8">
                {/* Bank Account Selection Panel */}
                <div className="lg:col-span-7">
                    <div className="acx-card overflow-hidden">
                        <div className="px-5 py-4 border-b border-border-subtle bg-bg-card flex justify-between items-center">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-[var(--color-brand-primary)]/10 flex items-center justify-center text-[var(--color-brand-primary)]">
                                    <Landmark className="w-4 h-4 text-brand-teal" />
                                </div>
                                <div>
                                    <h3 className="text-[13px] font-bold text-text-primary uppercase tracking-wider">
                                        Bank Account for This Quotation
                                    </h3>
                                    <p className="text-[11px] text-text-muted mt-0.5">
                                        Selected account will be rendered in the customer quotation PDF Bank Details panel
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-5">
                            {isLoadingBankAccounts ? (
                                <div className="flex items-center justify-center py-8 text-text-muted text-sm gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-brand-teal" />
                                    <span>Loading company bank accounts...</span>
                                </div>
                            ) : bankAccounts.length === 0 ? (
                                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 sm:p-5">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                        <div className="space-y-1.5">
                                            <div className="text-[13px] font-semibold text-text-primary">
                                                No Bank Accounts Configured
                                            </div>
                                            <p className="text-[12px] text-text-secondary leading-relaxed">
                                                Bank details must first be configured in <strong className="text-text-primary">Company Settings</strong> before they can be selected and included on quotation PDFs.
                                            </p>
                                            <div className="pt-1.5">
                                                <Link
                                                    to="/settings"
                                                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-brand-primary)] hover:underline"
                                                >
                                                    Configure in Company Settings <ExternalLink className="w-3.5 h-3.5" />
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="quotation-bank-select" className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
                                            Select Bank Account
                                        </label>
                                        <select
                                            id="quotation-bank-select"
                                            value={selectedBankAccountId}
                                            onChange={handleBankAccountChange}
                                            className="acx-input w-full text-[13px] font-medium bg-bg-main"
                                        >
                                            <option value="NONE">-- No Bank Account on PDF --</option>
                                            {bankAccounts.map((acc) => {
                                                const masked = acc.maskedAccountNumber || (acc.bankAccountNumber && acc.bankAccountNumber.length > 4 ? `•••• ${acc.bankAccountNumber.slice(-4)}` : acc.bankAccountNumber);
                                                return (
                                                    <option key={acc.id} value={acc.id}>
                                                        {acc.bankName} {masked ? `(${masked})` : ''} {acc.isDefault ? '• [Primary Account]' : ''}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>

                                    {selectedBank ? (
                                        <div className="rounded-xl border border-border-subtle bg-bg-main/60 p-4 relative overflow-hidden transition-all shadow-sm">
                                            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-subtle/80">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-4 h-4 text-brand-teal" />
                                                    <span className="text-[13px] font-bold text-text-primary">
                                                        {selectedBank.bankName}
                                                    </span>
                                                    {selectedBank.isDefault && (
                                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-teal/10 text-brand-teal">
                                                            Primary
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 text-[11px] text-text-muted">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                                    <span className="font-medium text-emerald-600 dark:text-emerald-400">Active for PDF</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
                                                <div>
                                                    <span className="block text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">
                                                        Account Holder
                                                    </span>
                                                    <span className="font-medium text-text-primary">
                                                        {selectedBank.accountHolder || '—'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">
                                                        Account Number
                                                    </span>
                                                    <span className="font-mono font-semibold text-text-primary">
                                                        {selectedBank.maskedAccountNumber || (selectedBank.bankAccountNumber && selectedBank.bankAccountNumber.length > 4 ? `•••• ${selectedBank.bankAccountNumber.slice(-4)}` : selectedBank.bankAccountNumber || '—')}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">
                                                        IFSC Code
                                                    </span>
                                                    <span className="font-mono font-medium text-text-primary uppercase">
                                                        {selectedBank.bankIfsc || '—'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">
                                                        Branch
                                                    </span>
                                                    <span className="font-medium text-text-primary">
                                                        {selectedBank.bankBranch || '—'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-3.5 rounded-xl border border-dashed border-border-subtle bg-bg-main/30 text-[12px] text-text-muted flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 text-text-muted shrink-0" />
                                            <span>No bank account selected. The Bank Details section on the quotation PDF will be omitted.</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {bankAccounts.length > 0 && (
                            <div className="px-5 py-3 border-t border-border-subtle/50 bg-bg-card/50 flex justify-between items-center text-[11px] text-text-muted">
                                <span>{bankAccounts.length} saved account{bankAccounts.length > 1 ? 's' : ''} available</span>
                                <Link to="/settings" className="hover:text-text-primary flex items-center gap-1 transition-colors font-medium">
                                    Manage Accounts in Settings <ExternalLink className="w-3 h-3" />
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quotation Summary Panel */}
                <div className="lg:col-span-5">
                    <div className="acx-card p-6 sm:p-8 w-full bg-bg-card border border-border-subtle shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-brand-primary)]/5 rounded-full -mt-16 blur-2xl pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#14B8A6]/5 rounded-full -mb-16 blur-2xl pointer-events-none"></div>
                        
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

            <ConfirmDialog
                isOpen={isClearConfirmOpen}
                title="Clear quotation?"
                description="All entered quotation data will be removed. This action cannot be undone."
                confirmText="Clear All"
                cancelText="Cancel"
                variant="destructive"
                onConfirm={() => {
                    setItems([]);
                    setIsClearConfirmOpen(false);
                }}
                onCancel={() => setIsClearConfirmOpen(false)}
            />
        </div>
    );
}
