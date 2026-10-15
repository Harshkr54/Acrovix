import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { fetchApi, getCustomers, getCatalog, getCompanyBankAccounts, createInvoiceFromQuotation } from '../services/api';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';
import { 
    VALIDITY_PERIOD_OPTIONS, 
    getIssueDateStr, 
    calculateValidUntilDate, 
    determineValidityPeriod, 
    isDateBeforeIssueDate 
} from '../utils/validityUtils';
import { 
    Plus, Trash2, Send, Save, Wand2, Calculator, User, Hash, AlertCircle, RefreshCw, 
    Download, Settings, Eye, Loader2, Landmark, Building2, CheckCircle2, ExternalLink, 
    ChevronDown, MapPin, ArrowLeft, LayoutDashboard, Clock, FileText, CheckCircle, 
    XCircle, Mail, AlertTriangle, FileCheck, Lock, ShoppingCart, X
} from 'lucide-react';
import SendQuotationModal from '../components/SendQuotationModal';
import QuotationColumnConfigModal from '../components/QuotationColumnConfigModal';
import QuotationPreviewModal from '../components/QuotationPreviewModal';
import AcceptRejectQuotationModal from '../components/AcceptRejectQuotationModal';
import CreatePurchaseOrderModal from '../components/CreatePurchaseOrderModal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import GstinAutoLookup from '../components/GstinAutoLookup';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { parseQuotationText, normalizeLineItem, extractJsonFromText } from '../utils/quotationTextParser';
import { formatStateDisplay, extractStateCode, searchGstStates, GST_STATES } from '../utils/gstStateUtils';

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
    const { enquiryId, quotationId: routeQuotationId, id: routeId } = useParams();
    const targetQuotationId = routeQuotationId || routeId;
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
    const [billingAddress, setBillingAddress] = useState('');
    const [shippingAddress, setShippingAddress] = useState('');
    const [state, setState] = useState('');
    const [pincode, setPincode] = useState('');
    const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);
    const [billingAddressError, setBillingAddressError] = useState('');

    const filteredStates = React.useMemo(() => {
        return searchGstStates(state);
    }, [state]);

    const handleStateBlur = () => {
        setTimeout(() => {
            setIsStateDropdownOpen(false);
            if (state) {
                const formatted = formatStateDisplay(state);
                if (formatted) {
                    setState(formatted);
                }
            }
        }, 200);
    };

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
    const [acceptRejectModalInfo, setAcceptRejectModalInfo] = useState(null);

    // Quotation Details & Email Delivery States
    const [quotationStatus, setQuotationStatus] = useState('DRAFT');
    const [quotationCreatedAt, setQuotationCreatedAt] = useState(null);
    const [quotationGrandTotal, setQuotationGrandTotal] = useState(0);
    const [responseSource, setResponseSource] = useState(null);
    const [responseNotes, setResponseNotes] = useState('');
    const [emailDeliveryStatus, setEmailDeliveryStatus] = useState(null);
    const [emailSentAt, setEmailSentAt] = useState(null);
    const [emailRecipient, setEmailRecipient] = useState('');
    const [emailErrorMessage, setEmailErrorMessage] = useState('');
    const [lastSendError, setLastSendError] = useState(null);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const [isCreatingRevision, setIsCreatingRevision] = useState(false);

    // Derived persisted read-only flags
    const isReadOnly = Boolean(currentQuotationId && quotationStatus && quotationStatus !== 'DRAFT');
    const isAccepted = quotationStatus === 'ACCEPTED' || quotationStatus === 'CONVERTED';

    const { currentUser } = useAuth();
    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

    // Downstream document IDs (Purchase Order, Invoices)
    const [purchaseOrderId, setPurchaseOrderId] = useState(null);
    const [proformaId, setProformaId] = useState(null);
    const [taxInvoiceId, setTaxInvoiceId] = useState(null);
    const [isPoModalOpen, setIsPoModalOpen] = useState(false);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [isViewInvoicesDialogOpen, setIsViewInvoicesDialogOpen] = useState(false);
    const [selectedInvoiceType, setSelectedInvoiceType] = useState('TAX_INVOICE');
    const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
    const [invoiceCreationError, setInvoiceCreationError] = useState(null);

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
    
    // Preview & Form Validation State
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
    const [previewEmailDetails, setPreviewEmailDetails] = useState(null);
    const [previewError, setPreviewError] = useState(null);
    const [validationError, setValidationError] = useState(null);
    const [termsError, setTermsError] = useState(null);
    const [bankError, setBankError] = useState(null);

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

            if (targetQuotationId) {
                // LOAD EXISTING QUOTATION (supports /quotations/:id and /quotations/edit/:id)
                const q = await fetchApi(`/quotations/${targetQuotationId}`);
                setCurrentQuotationId(q.id);
                setQuotationNumber(q.quotationNumber);
                setQuotationStatus(q.status || 'DRAFT');
                setQuotationCreatedAt(q.createdAt || null);
                setQuotationGrandTotal(q.grandTotal || 0);
                setEmailDeliveryStatus(q.emailDeliveryStatus || (q.status === 'SENT' ? 'SENT' : null));
                setEmailSentAt(q.emailSentAt || null);
                setEmailRecipient(q.emailRecipient || q.clientEmail || '');
                setEmailErrorMessage(q.emailErrorMessage || '');
                
                setClientName(q.clientName || '');
                setClientCompany(q.clientCompany || '');
                setClientEmail(q.clientEmail || '');
                setClientPhone(q.clientPhone || '');
                setCurrency(q.currency || 'INR');
                setCustomerId(q.customerId || null);
                setQuotationSource(q.quotationSource || (q.enquiry ? 'ENQUIRY' : 'DIRECT'));
                setSourceNotes(q.sourceNotes || '');
                setResponseSource(q.responseSource || null);
                setResponseNotes(q.responseNotes || '');
                setPurchaseOrderId(q.purchaseOrderId || null);
                setProformaId(q.proformaId || null);
                setTaxInvoiceId(q.taxInvoiceId || null);
                const qIssueDate = getIssueDateStr(q.createdAt);
                setIssueDate(qIssueDate);
                setValidUntil(q.validUntil || '');
                setValidityPeriod(determineValidityPeriod(qIssueDate, q.validUntil));
                setTermsAndConditions(q.termsAndConditions || '');
                const rawBillAddr = q.billingAddress || (q.customer && q.customer.billingAddress) || '';
                setBillingAddress(rawBillAddr);
                setState(formatStateDisplay(q.state || (q.customer && q.customer.state) || '', q.gstin || (q.customer && q.customer.gstin) || ''));
                const resolvedPin = q.pincode || (q.customer && q.customer.pincode) || ((rawBillAddr.match(/\b(\d{6})\b/) || [])[1] || '');
                setPincode(resolvedPin);
                setShippingAddress(q.shippingAddress || (q.customer && q.customer.shippingAddress) || '');
                if (q.gstin || (q.customer && q.customer.gstin)) {
                    setGstin(q.gstin || q.customer.gstin);
                }

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
                    setSelectedBankAccountId('');
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

            } else if (enquiryId) {
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
                setQuotationStatus('DRAFT');
                setQuotationCreatedAt(null);
                setQuotationGrandTotal(0);
                setEmailDeliveryStatus(null);
                setEmailSentAt(null);
                setEmailRecipient('');
                setEmailErrorMessage('');

                // Pre-select default bank account for new quotation
                const defaultAcc = accounts.find(a => a.isDefault) || (accounts.length > 0 ? accounts[0] : null);
                if (defaultAcc) {
                    setSelectedBankAccountId(String(defaultAcc.id));
                    setSelectedBank(defaultAcc);
                } else {
                    setSelectedBankAccountId('');
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
    }, [enquiryId, targetQuotationId]);

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

    useEffect(() => {
        if (!isInvoiceModalOpen && !isViewInvoicesDialogOpen) return;

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (isInvoiceModalOpen && !isCreatingInvoice) setIsInvoiceModalOpen(false);
                if (isViewInvoicesDialogOpen) setIsViewInvoicesDialogOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isInvoiceModalOpen, isViewInvoicesDialogOpen, isCreatingInvoice]);

    const selectCustomer = (c) => {
        setCustomerId(c.id);
        setClientName(c.name || '');
        setClientCompany(c.companyName || '');
        setClientEmail(c.email || '');
        setClientPhone(c.phone || '');
        setGstin(c.gstin || '');
        setBillingAddress(c.billingAddress || '');
        setState(formatStateDisplay(c.state || '', c.gstin || ''));
        const extractedPin = c.pincode || (c.billingAddress ? ((c.billingAddress.match(/\b(\d{6})\b/) || [])[1] || '') : '');
        setPincode(extractedPin);
        setShippingAddress(c.shippingAddress || '');
        setBillingAddressError('');
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
        setBillingAddress('');
        setState('');
        setPincode('');
        setShippingAddress('');
        setBillingAddressError('');
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

    const handleCreateRevision = async () => {
        if (!currentQuotationId || isCreatingRevision) return;
        setIsCreatingRevision(true);
        try {
            const revision = await fetchApi(`/quotations/${currentQuotationId}/revisions`, {
                method: 'POST'
            });
            showToast({ type: 'success', message: `Created revision ${revision.quotationNumber || ''}` });
            navigate(`/quotations/edit/${revision.id}`);
        } catch (err) {
            showToast({ type: 'error', message: err.message || 'Failed to create revision' });
        } finally {
            setIsCreatingRevision(false);
        }
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
            setBankError(null);
            if (validationError && (validationError.toLowerCase().includes('bank') || validationError.toLowerCase().includes('account'))) {
                setValidationError(null);
            }
        }
    };

    const handleTermsChange = (e) => {
        const val = e.target.value;
        setTermsAndConditions(val);
        if (val.trim()) {
            setTermsError(null);
            if (validationError && validationError.toLowerCase().includes('terms')) {
                setValidationError(null);
            }
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

    const validateMandatoryQuotationFields = () => {
        setValidationError(null);

        if (!clientName?.trim()) {
            const msg = "Please enter a Client Name before proceeding.";
            setValidationError(msg);
            showToast({ type: 'error', message: msg });
            return false;
        }

        if (isDateInvalid) {
            const msg = `Valid Until date (${validUntil}) cannot be earlier than quotation issue date (${issueDate}).`;
            setValidationError(msg);
            showToast({ type: 'error', message: msg });
            return false;
        }

        if (!items || items.length === 0) {
            const msg = "Add at least one line item before proceeding.";
            setValidationError(msg);
            showToast({ type: 'error', message: msg });
            return false;
        }

        const missingDescIndex = items.findIndex(item => !item.description?.trim());
        if (missingDescIndex !== -1) {
            const msg = `Please enter a description for line item ${missingDescIndex + 1} before proceeding.`;
            setValidationError(msg);
            showToast({ type: 'error', message: msg });
            return false;
        }

        const invalidQtyIndex = items.findIndex(item => parseFloat(item.quantity) <= 0 || isNaN(parseFloat(item.quantity)));
        if (invalidQtyIndex !== -1) {
            const msg = `Quantity for line item ${invalidQtyIndex + 1} must be greater than 0.`;
            setValidationError(msg);
            showToast({ type: 'error', message: msg });
            return false;
        }

        const invalidPriceIndex = items.findIndex(item => parseFloat(item.unitPrice) < 0 || isNaN(parseFloat(item.unitPrice)));
        if (invalidPriceIndex !== -1) {
            const msg = `Unit Price for line item ${invalidPriceIndex + 1} cannot be negative or invalid.`;
            setValidationError(msg);
            showToast({ type: 'error', message: msg });
            return false;
        }

        // Mandatory Billing Address Check
        if (!billingAddress || !billingAddress.trim()) {
            const msg = "Billing Address is required before saving or previewing the quotation.";
            setValidationError(msg);
            setBillingAddressError("Billing address is required.");
            showToast({ type: 'error', message: msg });
            const addrEl = document.getElementById('quotation-billing-address');
            if (addrEl) addrEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return false;
        }

        // Mandatory Terms & Conditions Check
        if (!termsAndConditions || !termsAndConditions.trim()) {
            const msg = "Terms & Conditions are mandatory before saving or previewing the quotation.";
            setValidationError(msg);
            setTermsError("Terms & Conditions are mandatory.");
            showToast({ type: 'error', message: msg });
            const termsEl = document.getElementById('quotation-terms-section');
            if (termsEl) termsEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return false;
        }

        // Mandatory Bank Account Check
        if (!selectedBank || !selectedBank.bankAccountNumber || !selectedBankAccountId || selectedBankAccountId === 'NONE') {
            const msg = bankAccounts.length === 0
                ? "A bank account is mandatory. Please configure bank accounts in Company Settings first before previewing or saving."
                : "Please select a bank account for this quotation before previewing or saving.";
            setValidationError(msg);
            setBankError(bankAccounts.length === 0 ? "Bank account must be configured in Company Settings." : "Please select a bank account.");
            showToast({ type: 'error', message: msg });
            const bankEl = document.getElementById('quotation-bank-section');
            if (bankEl) bankEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return false;
        }

        return true;
    };

    const handlePreview = async () => {
        if (!validateMandatoryQuotationFields()) {
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
                billingAddress: billingAddress.trim(),
                shippingAddress: shippingAddress?.trim() || null,
                state: extractStateCode(state) || state?.trim() || null,
                pincode: pincode?.trim() || null,
                gstin: gstin?.trim() || null,
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
        if (isReadOnly) {
            showToast({ type: 'error', message: 'This quotation is in read-only mode and cannot be modified.' });
            return;
        }
        if (!validateMandatoryQuotationFields()) {
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
                billingAddress: billingAddress.trim(),
                shippingAddress: shippingAddress?.trim() || null,
                state: extractStateCode(state) || state?.trim() || null,
                pincode: pincode?.trim() || null,
                gstin: gstin?.trim() || null,
                columnConfigs: columnConfigs,
                items: serializeItems(items),
                bankName: selectedBank ? selectedBank.bankName : null,
                bankAccountHolder: selectedBank ? selectedBank.accountHolder : null,
                bankAccountNumber: selectedBank ? selectedBank.bankAccountNumber : null,
                bankIfsc: selectedBank ? selectedBank.bankIfsc : null,
                bankBranch: selectedBank ? selectedBank.bankBranch : null,
                companyBankAccountId: selectedBank && !isNaN(Number(selectedBank.id)) ? Number(selectedBank.id) : null
            };

            const saved = await fetchApi(`/quotations/${activeQuotationId}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            if (saved) {
                if (saved.status) setQuotationStatus(saved.status);
                if (saved.grandTotal !== undefined) setQuotationGrandTotal(saved.grandTotal);
                if (saved.createdAt) setQuotationCreatedAt(saved.createdAt);
                if (saved.quotationNumber) setQuotationNumber(saved.quotationNumber);
            }
            showToast({ type: 'success', message: 'Quotation saved successfully.' });
            setTimeout(() => {
                setIsSaving(false);
            }, 500); // brief delay for UX
        } catch (error) {
            console.error("Save Draft Error:", error);
            showToast({ type: 'error', message: error.message || "Failed to save draft" });
            setIsSaving(false);
        }
    };

    const handleDownloadPdf = async () => {
        if (!currentQuotationId) {
            showToast({ type: 'warning', message: 'Please save the quotation before downloading PDF.' });
            return;
        }
        try {
            setIsDownloadingPdf(true);
            const token = localStorage.getItem('token');
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(`/api/quotations/${currentQuotationId}/pdf`, {
                headers
            });
            if (!res.ok) {
                throw new Error('Failed to download quotation PDF.');
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Quotation_${quotationNumber || currentQuotationId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            showToast({ type: 'success', message: 'PDF downloaded successfully.' });
        } catch (err) {
            console.error("PDF Download error:", err);
            showToast({ type: 'error', message: err.message || 'Failed to download PDF.' });
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    const handleSend = () => {
        if (isSending || isSaving) return;
        if (isReadOnly) {
            showToast({ type: 'error', message: 'This quotation is in read-only mode and cannot be sent.' });
            return;
        }
        if (!validateMandatoryQuotationFields()) {
            return;
        }
        setIsSendModalOpen(true);
    };

    const executeSendQuotation = async (confirmedEmail) => {
        if (isSending || isSaving) return;
        if (isReadOnly) {
            showToast({ type: 'error', message: 'This quotation is in read-only mode and cannot be sent.' });
            return;
        }
        if (!validateMandatoryQuotationFields()) {
            return;
        }
        setIsSending(true);
        setLastSendError(null);

        let activeQuotationId = currentQuotationId;
        let activeQuotationNumber = quotationNumber;

        // Step 1: Save quotation draft first
        try {
            // If draft has not been persisted in DB yet:
            if (!activeQuotationId && enquiryId) {
                const q = await fetchApi(`/quotations/enquiry/${enquiryId}`, { method: 'POST' });
                activeQuotationId = q.id;
                activeQuotationNumber = q.quotationNumber;
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
                billingAddress: billingAddress.trim(),
                shippingAddress: shippingAddress?.trim() || null,
                state: extractStateCode(state) || state?.trim() || null,
                pincode: pincode?.trim() || null,
                gstin: gstin?.trim() || null,
                columnConfigs: columnConfigs,
                items: serializeItems(items),
                bankName: selectedBank ? selectedBank.bankName : null,
                bankAccountHolder: selectedBank ? selectedBank.accountHolder : null,
                bankAccountNumber: selectedBank ? selectedBank.bankAccountNumber : null,
                bankIfsc: selectedBank ? selectedBank.bankIfsc : null,
                bankBranch: selectedBank ? selectedBank.bankBranch : null,
                companyBankAccountId: selectedBank && !isNaN(Number(selectedBank.id)) ? Number(selectedBank.id) : null
            };

            // Ensure latest state is saved in DB
            const saved = await fetchApi(`/quotations/${activeQuotationId}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            if (saved) {
                if (saved.status) setQuotationStatus(saved.status);
                if (saved.grandTotal !== undefined) setQuotationGrandTotal(saved.grandTotal);
                if (saved.createdAt) setQuotationCreatedAt(saved.createdAt);
                if (saved.quotationNumber) {
                    activeQuotationNumber = saved.quotationNumber;
                    setQuotationNumber(saved.quotationNumber);
                }
            }
        } catch (saveError) {
            console.error("Save Quotation before send failed:", saveError);
            setIsSending(false);
            showToast({ 
                type: 'error', 
                message: `Failed to save quotation before sending: ${saveError.message || "Unknown save error."}` 
            });
            return; // Stay on the form, preserve all user-entered data!
        }

        // Step 2: Send email
        const recipientList = Array.isArray(confirmedEmail) 
            ? confirmedEmail 
            : (confirmedEmail ? [confirmedEmail] : [clientEmail].filter(Boolean));
        const primaryRecipient = recipientList[0] || clientEmail || '';

        try {
            await fetchApi(`/quotations/${activeQuotationId}/send`, {
                method: 'POST',
                body: JSON.stringify({ 
                    recipientEmails: recipientList,
                    recipientEmail: primaryRecipient
                })
            });

            setIsSendModalOpen(false);
            window.dispatchEvent(new Event('notification-update'));

            const recipientDisplay = recipientList.join(', ');
            const qNum = activeQuotationNumber || quotationNumber || `#${activeQuotationId}`;

            // Update UI state to SENT
            setQuotationStatus('SENT');
            setEmailDeliveryStatus('SENT');
            setEmailSentAt(new Date().toISOString());
            setEmailRecipient(recipientDisplay);
            setEmailErrorMessage('');
            setLastSendError(null);

            showToast({ 
                type: 'success', 
                message: `Quotation ${qNum} saved and sent successfully to ${recipientDisplay}!` 
            });

            // Navigate to saved quotation's details page using existing route conventions
            navigate(`/quotations/edit/${activeQuotationId}`);
        } catch (sendError) {
            console.error("Send Email Error:", sendError);
            setIsSendModalOpen(false);
            setEmailDeliveryStatus('FAILED');
            const errorMsg = sendError.message || "Email provider failed to deliver the quotation message.";
            setEmailErrorMessage(errorMsg);
            setLastSendError(errorMsg);

            // DO NOT display false success message!
            showToast({ 
                type: 'error', 
                message: `Quotation ${activeQuotationNumber || activeQuotationId} was saved, but email sending failed: ${errorMsg}` 
            });

            // Ensure route points to the saved quotation
            if (location.pathname !== `/quotations/edit/${activeQuotationId}`) {
                navigate(`/quotations/edit/${activeQuotationId}`);
            }
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
            
            {/* Top Navigation & Breadcrumbs */}
            <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                <div className="flex items-center space-x-2">
                    <button 
                        onClick={() => navigate('/quotations')} 
                        className="inline-flex items-center hover:text-text-primary transition-colors text-text-secondary font-medium"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                        <span>Back to Quotations</span>
                    </button>
                    <span>/</span>
                    <span className="text-text-primary font-medium">{quotationNumber || 'Create Quotation'}</span>
                </div>
                <div className="flex items-center space-x-2">
                    <button 
                        onClick={() => navigate('/dashboard')} 
                        className="inline-flex items-center hover:text-text-primary transition-colors text-text-secondary"
                    >
                        <LayoutDashboard className="w-3.5 h-3.5 mr-1" />
                        <span>Return to Dashboard</span>
                    </button>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-2">
                <div>
                    <div className="flex items-center space-x-3 mb-1">
                        <h1 className="text-[28px] font-bold text-text-primary tracking-tight leading-tight">
                            {quotationNumber || 'Create Quotation'}
                        </h1>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            quotationStatus === 'SENT' 
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/20' 
                                : quotationStatus === 'ACCEPTED'
                                ? 'bg-blue-50 text-blue-800 border border-blue-300 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/20'
                                : quotationStatus === 'REJECTED'
                                ? 'bg-rose-50 text-rose-800 border border-rose-300 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/20'
                                : 'bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/20'
                        }`}>
                            {quotationStatus || 'DRAFT'}
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
                <div className="flex flex-wrap items-center gap-2">
                    <button 
                        onClick={() => navigate('/quotations')} 
                        className="btn btn-secondary btn-sm flex items-center"
                        title="View All Quotations"
                    >
                        <FileText className="mr-1.5 h-3.5 w-3.5" /> View All Quotations
                    </button>
                    <button 
                        onClick={() => navigate('/dashboard')} 
                        className="btn btn-secondary btn-sm flex items-center"
                        title="Return to Dashboard"
                    >
                        <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" /> Dashboard
                    </button>
                    <button 
                        onClick={handleDownloadPdf} 
                        disabled={!currentQuotationId || isDownloadingPdf}
                        className="btn btn-secondary btn-sm flex items-center"
                        title="Download PDF"
                    >
                        {isDownloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
                        Download PDF
                    </button>
                    <button 
                        onClick={handlePreview} 
                        disabled={isSaving || isSending}
                        className="btn btn-secondary btn-sm flex items-center"
                    >
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> Preview PDF
                    </button>
                    {!isReadOnly && (
                        <>
                            <button 
                                id="save-draft-btn"
                                onClick={handleSaveDraft} 
                                disabled={isSaving || isSending}
                                className="btn btn-secondary btn-sm flex items-center"
                            >
                                {isSaving ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Saving...</> : <><Save className="mr-1.5 h-3.5 w-3.5" /> Save Draft</>}
                            </button>
                            <button 
                                id="send-quotation-btn"
                                onClick={handleSend} 
                                disabled={isSending || isSaving}
                                className="btn btn-primary btn-sm flex items-center"
                            >
                                {isSending ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Sending...</> : <><Send className="mr-1.5 h-3.5 w-3.5" /> Send Quotation</>}
                            </button>
                        </>
                    )}
                    {isReadOnly && (
                        <button
                            type="button"
                            onClick={handleCreateRevision}
                            disabled={isCreatingRevision}
                            className="btn btn-secondary btn-sm flex items-center"
                            title="Create a new draft revision from this quotation"
                        >
                            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isCreatingRevision ? 'animate-spin' : ''}`} />
                            Create Revision
                        </button>
                    )}
                    {(quotationStatus === 'ACCEPTED' || quotationStatus === 'CONVERTED') && (
                        <>
                            {!purchaseOrderId && quotationStatus === 'ACCEPTED' ? (
                                <button
                                    id="create-po-btn"
                                    type="button"
                                    onClick={() => setIsPoModalOpen(true)}
                                    className="btn btn-brand btn-sm flex items-center"
                                    title="Create a Purchase Order from this quotation"
                                >
                                    <ShoppingCart className="mr-1.5 h-3.5 w-3.5" /> Create Purchase Order
                                </button>
                            ) : purchaseOrderId ? (
                                <button
                                    id="view-po-btn"
                                    type="button"
                                    onClick={() => navigate(`/purchase-orders/${purchaseOrderId}`)}
                                    className="btn btn-secondary btn-sm flex items-center"
                                    title="View related Purchase Order"
                                >
                                    <ShoppingCart className="mr-1.5 h-3.5 w-3.5" /> View Purchase Orders
                                </button>
                            ) : null}

                            {(!taxInvoiceId && !proformaId) ? (
                                isSuperAdmin && (
                                    <button
                                        id="create-invoice-btn"
                                        type="button"
                                        onClick={() => {
                                            setInvoiceCreationError(null);
                                            setSelectedInvoiceType('TAX_INVOICE');
                                            setIsInvoiceModalOpen(true);
                                        }}
                                        disabled={isCreatingInvoice}
                                        className="btn btn-secondary btn-sm flex items-center text-brand-teal hover:text-brand-teal"
                                        title="Create an invoice from this quotation"
                                    >
                                        {isCreatingInvoice ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <FileText className="mr-1.5 h-3.5 w-3.5" />}
                                        Create Invoice
                                    </button>
                                )
                            ) : (
                                <button
                                    id="view-invoices-btn"
                                    type="button"
                                    onClick={() => {
                                        if (taxInvoiceId && proformaId) {
                                            setIsViewInvoicesDialogOpen(true);
                                        } else {
                                            navigate(`/invoices/${taxInvoiceId || proformaId}`);
                                        }
                                    }}
                                    className="btn btn-secondary btn-sm flex items-center"
                                    title="View related invoice(s)"
                                >
                                    <FileText className="mr-1.5 h-3.5 w-3.5" /> View Invoices
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Quotation Details Summary Card */}
            {currentQuotationId && (
                <div className="acx-card p-4 md:p-5 border border-border-light/60 bg-bg-surface/50 rounded-2xl shadow-sm mb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-border-light/40">
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                            <div>
                                <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold block">Quotation No.</span>
                                <span className="text-[14px] font-mono font-bold text-text-primary">{quotationNumber || `#${currentQuotationId}`}</span>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold block">Customer / Company</span>
                                <span className="text-[13px] font-semibold text-text-primary">{clientCompany || clientName || '—'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold block">Total Amount</span>
                                <span className="text-[15px] font-bold text-brand-teal">
                                    {formatCurrency(totals.grandTotal || quotationGrandTotal || 0, currency)}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold block">Currency</span>
                                <span className="text-[13px] font-mono font-medium text-text-secondary">{currency || 'INR'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold block">Quotation Status</span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                                    quotationStatus === 'SENT' 
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/20' 
                                        : quotationStatus === 'ACCEPTED'
                                        ? 'bg-blue-50 text-blue-800 border border-blue-300 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/20'
                                        : quotationStatus === 'REJECTED'
                                        ? 'bg-rose-50 text-rose-800 border border-rose-300 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/20'
                                        : 'bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/20'
                                }`}>
                                    {quotationStatus || 'DRAFT'}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold block">Creation Date</span>
                                <span className="text-[13px] text-text-secondary">
                                    {formatDate(quotationCreatedAt || issueDate)}
                                </span>
                            </div>
                        </div>
                        
                        {/* Delivery Status Indicator */}
                        <div className="flex items-center shrink-0">
                            {emailDeliveryStatus === 'SENT' ? (
                                <div className="flex items-center text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-lg dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20">
                                    <CheckCircle className="w-4 h-4 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                                    <span>Sent via Email {emailSentAt ? `(${formatDateTime(emailSentAt)})` : ''}</span>
                                </div>
                            ) : emailDeliveryStatus === 'FAILED' ? (
                                <div className="flex items-center text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-300 px-3 py-1.5 rounded-lg dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20">
                                    <XCircle className="w-4 h-4 mr-1.5 text-rose-600 dark:text-rose-400" />
                                    <span>Email Delivery Failed</span>
                                </div>
                            ) : (
                                <div className="flex items-center text-xs font-medium text-text-muted bg-bg-muted/40 px-3 py-1.5 rounded-lg">
                                    <Clock className="w-4 h-4 mr-1.5 text-text-muted" />
                                    <span>Not Sent Yet</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Persisted Client Response row (Accepted or Rejected) */}
                    {(responseSource || responseNotes) && (
                        <div id="quotation-summary-response-row" className="mt-3 pt-3 border-t border-border-light/40 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                            <div>
                                <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold block">Response Source</span>
                                <span className="font-semibold text-text-primary uppercase">{responseSource || 'N/A'}</span>
                            </div>
                            {responseNotes && (
                                <div className="flex-1 min-w-[200px]">
                                    <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold block">
                                        {quotationStatus === 'REJECTED' ? 'Rejection Reason' : 'Response Notes'}
                                    </span>
                                    <span className="italic text-text-primary font-medium">"{responseNotes}"</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Downstream Linked Records row */}
                    {(purchaseOrderId || taxInvoiceId || proformaId) && (
                        <div id="quotation-summary-downstream-records" className="mt-3 pt-3 border-t border-border-light/40 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                            {purchaseOrderId && (
                                <div>
                                    <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold block">Purchase Order</span>
                                    <Link to={`/purchase-orders/${purchaseOrderId}`} className="font-semibold text-brand-teal hover:underline flex items-center gap-1 mt-0.5">
                                        <ShoppingCart className="w-3 h-3" /> View Purchase Order
                                    </Link>
                                </div>
                            )}
                            {taxInvoiceId && (
                                <div>
                                    <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold block">Tax Invoice</span>
                                    <Link to={`/invoices/${taxInvoiceId}`} className="font-semibold text-brand-teal hover:underline flex items-center gap-1 mt-0.5">
                                        <FileText className="w-3 h-3" /> View Tax Invoice
                                    </Link>
                                </div>
                            )}
                            {proformaId && (
                                <div>
                                    <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold block">Proforma Invoice</span>
                                    <Link to={`/invoices/${proformaId}`} className="font-semibold text-brand-teal hover:underline flex items-center gap-1 mt-0.5">
                                        <FileText className="w-3 h-3" /> View Proforma
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Failed Email Delivery Banner & Safe Retry Action */}
                    {(emailDeliveryStatus === 'FAILED' || lastSendError) && (
                        <div className="mt-3 p-3.5 bg-rose-50 border border-rose-300 dark:bg-rose-500/10 dark:border-rose-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-modal-entrance">
                            <div className="flex items-start gap-2.5">
                                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-semibold text-rose-900 dark:text-rose-300">
                                        Email delivery failed or is unconfirmed: {emailErrorMessage || lastSendError}
                                    </p>
                                    <p className="text-[11px] text-rose-700 dark:text-rose-200/80 mt-0.5">
                                        Your quotation was saved safely. You can retry sending without creating duplicate quotations.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleSend}
                                disabled={isSending || isSaving}
                                className="btn btn-sm bg-rose-600 hover:bg-rose-700 text-white font-medium shrink-0 flex items-center shadow-sm"
                            >
                                {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                                Retry Send
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Validation Error Banner */}
            {validationError && (
                <div className="p-4 bg-brand-danger/10 border border-brand-danger/30 rounded-2xl flex items-center gap-3 shadow-sm animate-modal-entrance">
                    <AlertCircle className="w-5 h-5 text-brand-danger shrink-0" />
                    <p className="text-[14px] font-semibold text-brand-danger">{validationError}</p>
                </div>
            )}

            {/* Lifecycle Read-Only & Lock Banners */}
            {(quotationStatus === 'ACCEPTED' || quotationStatus === 'CONVERTED') && (
                <div id="quotation-locked-banner" className="p-4 md:p-5 rounded-2xl border border-blue-200 bg-blue-50/90 dark:border-blue-500/30 dark:bg-blue-950/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-modal-entrance">
                    <div className="flex items-start md:items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 dark:bg-blue-500/20 dark:border-blue-500/30 flex items-center justify-center text-blue-700 dark:text-blue-400 shrink-0">
                            <Lock className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-blue-950 dark:text-blue-100">
                                {quotationStatus === 'CONVERTED' 
                                    ? 'This quotation has been converted to downstream records and is locked against editing.'
                                    : 'This quotation has been accepted and is locked against editing.'}
                            </h3>
                            <p className="text-xs text-blue-800/90 dark:text-blue-300/90 mt-0.5">
                                {quotationStatus === 'CONVERTED'
                                    ? 'Downstream Purchase Order and/or Invoice records are linked.'
                                    : 'Client acceptance has been recorded. Downstream Purchase Order and Invoice generation are available.'}
                            </p>
                            {(responseSource || responseNotes) && (
                                <div id="quotation-acceptance-reason" className="mt-2.5 text-xs text-blue-950 dark:text-blue-100 bg-blue-100/80 dark:bg-blue-900/40 rounded-lg p-2.5 border border-blue-300 dark:border-blue-800/50 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                                    <span className="font-bold text-blue-900 dark:text-blue-200">Acceptance Response:</span>
                                    {responseSource && (
                                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100 uppercase tracking-wider">
                                            via {responseSource}
                                        </span>
                                    )}
                                    {responseNotes && (
                                        <span className="italic text-blue-950 dark:text-blue-50 font-medium">"{responseNotes}"</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {!purchaseOrderId && quotationStatus === 'ACCEPTED' ? (
                            <button
                                type="button"
                                onClick={() => setIsPoModalOpen(true)}
                                className="btn btn-sm flex items-center bg-blue-600 hover:bg-blue-700 text-white font-medium border-transparent shadow-sm dark:bg-blue-600 dark:hover:bg-blue-500"
                            >
                                <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                                Create Purchase Order
                            </button>
                        ) : purchaseOrderId ? (
                            <button
                                type="button"
                                onClick={() => navigate(`/purchase-orders/${purchaseOrderId}`)}
                                className="btn btn-sm flex items-center bg-blue-600 hover:bg-blue-700 text-white font-medium border-transparent shadow-sm dark:bg-blue-600 dark:hover:bg-blue-500"
                            >
                                <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                                View Purchase Orders
                            </button>
                        ) : null}

                        {(!taxInvoiceId && !proformaId) ? (
                            isSuperAdmin && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setInvoiceCreationError(null);
                                        setSelectedInvoiceType('TAX_INVOICE');
                                        setIsInvoiceModalOpen(true);
                                    }}
                                    disabled={isCreatingInvoice}
                                    className="btn btn-sm flex items-center bg-blue-600 hover:bg-blue-700 text-white font-medium border-transparent shadow-sm dark:bg-blue-600 dark:hover:bg-blue-500"
                                >
                                    <FileText className="mr-1.5 h-3.5 w-3.5" />
                                    Create Invoice
                                </button>
                            )
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    if (taxInvoiceId && proformaId) {
                                        setIsViewInvoicesDialogOpen(true);
                                    } else {
                                        navigate(`/invoices/${taxInvoiceId || proformaId}`);
                                    }
                                }}
                                className="btn btn-sm flex items-center bg-blue-600 hover:bg-blue-700 text-white font-medium border-transparent shadow-sm dark:bg-blue-600 dark:hover:bg-blue-500"
                            >
                                <FileText className="mr-1.5 h-3.5 w-3.5" />
                                View Invoices
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleCreateRevision}
                            disabled={isCreatingRevision}
                            className="btn btn-sm flex items-center bg-blue-700 hover:bg-blue-800 text-white font-medium border-transparent shadow-sm dark:bg-blue-700 dark:hover:bg-blue-600"
                        >
                            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isCreatingRevision ? 'animate-spin' : ''}`} />
                            Create Revision
                        </button>
                    </div>
                </div>
            )}

            {quotationStatus === 'SENT' && (
                <div id="quotation-sent-banner" className="p-4 md:p-5 rounded-2xl border border-emerald-300 bg-emerald-50/90 dark:border-emerald-500/30 dark:bg-emerald-950/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-modal-entrance">
                    <div className="flex items-start md:items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 dark:bg-emerald-500/20 dark:border-emerald-500/30 flex items-center justify-center text-emerald-800 dark:text-emerald-400 shrink-0">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
                                This quotation has been sent to the client and is in read-only mode.
                            </h3>
                            <p className="text-xs text-emerald-800/90 dark:text-emerald-300/90 mt-0.5">
                                Direct modifications are prohibited while awaiting client response. To adjust pricing or terms, create a new revision.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => setAcceptRejectModalInfo({ 
                                quotation: { id: currentQuotationId, quotationNumber }, 
                                type: 'ACCEPT' 
                            })}
                            className="btn btn-sm flex items-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold border-transparent shadow-sm dark:bg-emerald-600 dark:hover:bg-emerald-500"
                        >
                            <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                            Accept Quotation
                        </button>
                        <button
                            type="button"
                            onClick={() => setAcceptRejectModalInfo({ 
                                quotation: { id: currentQuotationId, quotationNumber }, 
                                type: 'REJECT' 
                            })}
                            className="btn btn-sm flex items-center bg-rose-600 hover:bg-rose-700 text-white font-semibold border-transparent shadow-sm dark:bg-rose-600 dark:hover:bg-rose-500"
                        >
                            <XCircle className="mr-1.5 h-3.5 w-3.5" />
                            Reject Quotation
                        </button>
                        <button
                            type="button"
                            onClick={handleCreateRevision}
                            disabled={isCreatingRevision}
                            className="btn btn-secondary btn-sm flex items-center"
                        >
                            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isCreatingRevision ? 'animate-spin' : ''}`} />
                            Create Revision
                        </button>
                    </div>
                </div>
            )}

            {quotationStatus === 'REJECTED' && (
                <div id="quotation-rejected-banner" className="p-4 md:p-5 rounded-2xl border border-rose-300 bg-rose-50/90 dark:border-rose-500/30 dark:bg-rose-950/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-modal-entrance">
                    <div className="flex items-start md:items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-300 dark:bg-rose-500/20 dark:border-rose-500/30 flex items-center justify-center text-rose-800 dark:text-rose-400 shrink-0">
                            <XCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-rose-950 dark:text-rose-100">
                                This quotation was rejected and is retained as a read-only historical record.
                            </h3>
                            <p className="text-xs text-rose-800/90 dark:text-rose-300/90 mt-0.5">
                                You can create a new revision with revised terms or pricing.
                            </p>
                            {(responseSource || responseNotes) && (
                                <div id="quotation-rejection-reason" className="mt-2.5 text-xs text-rose-950 dark:text-rose-100 bg-rose-100/80 dark:bg-rose-900/40 rounded-lg p-2.5 border border-rose-300 dark:border-rose-800/50 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                                    <span className="font-bold text-rose-900 dark:text-rose-200">Rejection Reason:</span>
                                    {responseSource && (
                                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-rose-200 text-rose-900 dark:bg-rose-800 dark:text-rose-100 uppercase tracking-wider">
                                            via {responseSource}
                                        </span>
                                    )}
                                    {responseNotes ? (
                                        <span className="italic text-rose-950 dark:text-rose-50 font-medium">"{responseNotes}"</span>
                                    ) : (
                                        <span className="text-rose-700 dark:text-rose-300 italic">No notes provided</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleCreateRevision}
                        disabled={isCreatingRevision}
                        className="btn btn-sm flex items-center bg-rose-600 hover:bg-rose-700 text-white font-semibold border-transparent shadow-sm dark:bg-rose-600 dark:hover:bg-rose-500"
                    >
                        <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isCreatingRevision ? 'animate-spin' : ''}`} />
                        Create Revision
                    </button>
                </div>
            )}

            {quotationStatus === 'EXPIRED' && (
                <div id="quotation-expired-banner" className="p-4 rounded-2xl border border-amber-300 bg-amber-50/90 dark:border-amber-500/30 dark:bg-amber-950/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-modal-entrance">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 dark:bg-amber-500/20 dark:border-amber-500/30 flex items-center justify-center text-amber-800 dark:text-amber-400 shrink-0">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-amber-950 dark:text-amber-100">
                                This quotation has expired and is retained as a read-only historical record.
                            </h3>
                            <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                                Validity period has elapsed. Create a new revision to renew pricing and validity.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleCreateRevision}
                        disabled={isCreatingRevision}
                        className="btn btn-sm flex items-center bg-amber-600 hover:bg-amber-700 text-white font-semibold border-transparent shadow-sm dark:bg-amber-600 dark:hover:bg-amber-500"
                    >
                        <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isCreatingRevision ? 'animate-spin' : ''}`} />
                        Create Revision
                    </button>
                </div>
            )}

            {quotationStatus === 'CONVERTED' && (
                <div id="quotation-converted-banner" className="p-4 rounded-2xl border border-blue-300 bg-blue-50/90 dark:border-blue-500/30 dark:bg-blue-950/30 flex items-center gap-3.5 shadow-sm animate-modal-entrance">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-300 dark:bg-blue-500/20 dark:border-blue-500/30 flex items-center justify-center text-blue-800 dark:text-blue-400 shrink-0">
                        <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-blue-950 dark:text-blue-100">
                            This quotation has been converted to a Purchase Order and is locked against editing.
                        </h3>
                        <p className="text-xs text-blue-800/90 dark:text-blue-300/90 mt-0.5">
                            Downstream fulfillment and billing workflows are active.
                        </p>
                    </div>
                </div>
            )}

            {quotationStatus === 'REVISED' && (
                <div id="quotation-revised-banner" className="p-4 rounded-2xl border border-purple-300 bg-purple-50/90 dark:border-purple-500/30 dark:bg-purple-950/30 flex items-center gap-3.5 shadow-sm animate-modal-entrance">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-300 dark:bg-purple-500/20 dark:border-purple-500/30 flex items-center justify-center text-purple-800 dark:text-purple-400 shrink-0">
                        <FileCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-purple-950 dark:text-purple-100">
                            This quotation has been superseded by a newer revision and is a read-only historical record.
                        </h3>
                    </div>
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
                {!isReadOnly && (
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
                                            if (data.billingAddress) {
                                                setBillingAddress(data.billingAddress);
                                                setBillingAddressError('');
                                            }
                                            if (data.state) {
                                                setState(formatStateDisplay(data.state, data.gstin || gstin));
                                            }
                                            if (data.pincode) {
                                                setPincode(data.pincode);
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </details>
                )}
                {isReadOnly && customerId && (
                    <div className="flex items-center justify-between p-3.5 bg-brand-primary/5 dark:bg-brand-primary/10 border border-brand-primary/20 rounded-xl mb-6">
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
                    </div>
                )}
                <div className="quotation-client-grid">
                    <div className="min-w-0">
                        <label htmlFor="quotation-currency" className="block text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5 truncate">
                            Currency
                        </label>
                        <select
                            id="quotation-currency"
                            value={currency}
                            disabled={isReadOnly}
                            onChange={(e) => setCurrency(e.target.value)}
                            className="w-full h-10 bg-bg-main border border-border-subtle focus:border-brand-teal focus:ring-1 focus:ring-brand-teal/20 rounded-xl px-3 text-[13px] font-medium text-text-primary outline-none transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
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
                            disabled={isReadOnly}
                            onChange={(e) => setClientName(e.target.value)}
                            className="w-full h-10 bg-bg-main border border-border-subtle focus:border-brand-teal focus:ring-1 focus:ring-brand-teal/20 rounded-xl px-3 text-[13px] font-medium text-text-primary outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
                            disabled={isReadOnly}
                            onChange={(e) => setClientCompany(e.target.value)}
                            className="w-full h-10 bg-bg-main border border-border-subtle focus:border-brand-teal focus:ring-1 focus:ring-brand-teal/20 rounded-xl px-3 text-[13px] font-medium text-text-primary outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
                            disabled={isReadOnly}
                            onChange={(e) => setClientEmail(e.target.value)}
                            className="w-full h-10 bg-bg-main border border-border-subtle focus:border-brand-teal focus:ring-1 focus:ring-brand-teal/20 rounded-xl px-3 text-[13px] font-medium text-text-primary outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
                            disabled={isReadOnly}
                            onChange={(e) => setClientPhone(e.target.value)}
                            className="w-full h-10 bg-bg-main border border-border-subtle focus:border-brand-teal focus:ring-1 focus:ring-brand-teal/20 rounded-xl px-3 text-[13px] font-medium text-text-primary outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
                            disabled={isReadOnly}
                            onChange={handleValidityPeriodChange}
                            className="w-full h-10 bg-bg-main border border-border-subtle focus:border-brand-teal focus:ring-1 focus:ring-brand-teal/20 rounded-xl px-3 text-[13px] font-medium text-text-primary outline-none transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
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
                            disabled={isReadOnly}
                            onChange={handleValidUntilChange}
                            className={`w-full h-10 bg-bg-main border ${
                                isDateInvalid ? 'border-red-500 focus:border-red-500 text-red-500' : 'border-border-subtle focus:border-brand-teal focus:ring-1 focus:ring-brand-teal/20 text-text-primary'
                            } rounded-xl px-3 text-[13px] font-medium outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed`}
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

                {/* Billing Address & Location Details Row */}
                <div className="mt-5 pt-4 border-t border-border-subtle/60">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                            <MapPin className="w-3.5 h-3.5 text-brand-teal" />
                            <span>Billing Address &amp; Location Details</span>
                        </div>
                        <span className="text-[11px] text-text-muted hidden sm:inline">Auto-filled from client, printed on quotation PDF</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        {/* Billing Address */}
                        <div className="md:col-span-6 min-w-0">
                            <label htmlFor="quotation-billing-address" className="block text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5">
                                Billing Address <span className="text-red-500 font-bold">*</span>
                            </label>
                            <textarea
                                id="quotation-billing-address"
                                rows={2}
                                value={billingAddress}
                                disabled={isReadOnly}
                                onChange={(e) => {
                                    setBillingAddress(e.target.value);
                                    if (billingAddressError) setBillingAddressError('');
                                }}
                                placeholder="Street address, building, suite, or area..."
                                className={`w-full bg-bg-main border ${
                                    billingAddressError 
                                        ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20' 
                                        : 'border-border-subtle focus:border-brand-teal focus:ring-1 focus:ring-brand-teal/20'
                                } rounded-xl p-2.5 text-[13px] font-medium text-text-primary outline-none transition-colors resize-none disabled:opacity-60 disabled:cursor-not-allowed`}
                            />
                            {billingAddressError && (
                                <p className="text-[11px] text-red-500 font-medium mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>{billingAddressError}</span>
                                </p>
                            )}
                        </div>

                        {/* State Code - State Name */}
                        <div className="md:col-span-3 min-w-0 relative">
                            <label htmlFor="quotation-billing-state" className="block text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5 truncate">
                                State / Place of Supply
                            </label>
                            <div className="relative">
                                <input
                                    id="quotation-billing-state"
                                    type="text"
                                    value={state}
                                    disabled={isReadOnly}
                                    onChange={(e) => {
                                        setState(e.target.value);
                                        setIsStateDropdownOpen(true);
                                    }}
                                    onFocus={() => !isReadOnly && setIsStateDropdownOpen(true)}
                                    onBlur={handleStateBlur}
                                    placeholder="e.g. 20 - Jharkhand"
                                    autoComplete="off"
                                    className="w-full h-10 bg-bg-main border border-border-subtle focus:border-brand-teal focus:ring-1 focus:ring-brand-teal/20 rounded-xl px-3 pr-8 text-[13px] font-medium text-text-primary outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                                {!isReadOnly && (
                                    <button
                                        type="button"
                                        tabIndex={-1}
                                        onClick={() => setIsStateDropdownOpen(prev => !prev)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 transition-colors"
                                    >
                                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isStateDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                )}
                            </div>
                            {isStateDropdownOpen && (
                                <div className="absolute z-50 left-0 right-0 mt-1 bg-bg-card border border-border-subtle rounded-xl shadow-xl max-h-48 overflow-y-auto py-1">
                                    {filteredStates.length === 0 ? (
                                        <div className="px-3 py-2 text-[12px] text-text-muted text-center">
                                            No matching state found
                                        </div>
                                    ) : (
                                        filteredStates.map(st => {
                                            const itemVal = `${st.code} - ${st.name}`;
                                            const isSelected = state === itemVal || extractStateCode(state) === st.code;
                                            return (
                                                <div
                                                    key={st.code}
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => {
                                                        setState(itemVal);
                                                        setIsStateDropdownOpen(false);
                                                    }}
                                                    className={`px-3 py-2 text-[13px] hover:bg-brand-teal/10 cursor-pointer flex items-center justify-between transition-colors ${
                                                        isSelected ? 'bg-brand-teal/15 text-brand-teal font-semibold' : 'text-text-primary'
                                                    }`}
                                                >
                                                    <span className="font-medium truncate">{itemVal}</span>
                                                    <span className="text-[11px] font-mono font-bold text-brand-teal bg-brand-teal/10 px-1.5 py-0.5 rounded ml-2 shrink-0">
                                                        {st.code}
                                                    </span>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>

                        {/* PIN Code */}
                        <div className="md:col-span-3 min-w-0">
                            <label htmlFor="quotation-billing-pincode" className="block text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1.5 truncate">
                                PIN Code
                            </label>
                            <input
                                id="quotation-billing-pincode"
                                type="text"
                                maxLength={10}
                                value={pincode}
                                disabled={isReadOnly}
                                onChange={(e) => setPincode(e.target.value)}
                                placeholder="e.g. 834001"
                                className="w-full h-10 bg-bg-main border border-border-subtle focus:border-brand-teal focus:ring-1 focus:ring-brand-teal/20 rounded-xl px-3 text-[13px] font-medium text-text-primary outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            />
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
            {!isReadOnly && (
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
            )}

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

                {!isReadOnly && (
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
                )}
                
                <div className="acx-table-container">
                    <table className="min-w-[900px] w-full">
                        <thead>
                            <tr>
                                {columnConfigs.filter(c => c.visible).sort((a,b) => a.sortOrder - b.sortOrder).map(config => (
                                    <th key={config.columnKey} className={`px-3 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-card ${config.columnKey === 'rowNumber' ? 'text-center w-[48px]' : config.columnType === 'CURRENCY' || config.columnType === 'NUMBER' ? 'text-right' : 'text-left'}`}>
                                        {config.displayName}
                                    </th>
                                ))}
                                {!isReadOnly && (
                                    <th className="px-2 py-4 text-center text-[11px] font-bold text-text-muted uppercase tracking-wider w-[5%] bg-bg-card">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle/40 bg-bg-card">
                            {items.length === 0 ? (
                                <tr>
                                    <td 
                                        colSpan={columnConfigs.filter(c => c.visible).length + (isReadOnly ? 0 : 1)}
                                        className="px-6 py-14 text-center bg-bg-card"
                                    >
                                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center">
                                            <div className="w-10 h-10 rounded-full bg-bg-muted flex items-center justify-center text-text-muted mb-3">
                                                <Hash className="w-5 h-5 text-text-muted/60" />
                                            </div>
                                            <p className="text-[13px] font-semibold text-text-secondary mb-1">
                                                {isReadOnly ? 'No items in this quotation.' : 'No items added yet. Click \u201c+ Add Item\u201d or use AI Auto-Extraction.'}
                                            </p>
                                            {!isReadOnly && (
                                                <>
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
                                                </>
                                            )}
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
                                                                disabled={isReadOnly}
                                                                value={(item.customValues && item.customValues[config.columnKey]) || ''} 
                                                                onChange={(e) => updateItem(item.id, `custom_${config.columnKey}`, e.target.value)} 
                                                                className={`w-full bg-transparent border border-transparent ${isReadOnly ? 'cursor-default' : 'hover:border-border-subtle focus:border-brand-teal focus:bg-bg-main'} rounded-lg py-2 px-2 text-[13px] font-medium text-text-primary transition-all outline-none ${config.columnType === 'CURRENCY' || config.columnType === 'NUMBER' ? 'text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none' : ''}`}
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
                                                                    disabled={isReadOnly}
                                                                    value={item.sku || ''} 
                                                                    onChange={(e) => updateItem(item.id, 'sku', e.target.value)} 
                                                                    className={`w-full bg-transparent border border-transparent ${isReadOnly ? 'cursor-default' : 'hover:border-border-subtle focus:border-brand-teal focus:bg-bg-main'} rounded-lg py-2 px-2 text-[13px] font-medium text-text-primary transition-all outline-none uppercase font-mono tracking-tight placeholder:normal-case placeholder:font-sans placeholder:text-text-muted/60`} 
                                                                    placeholder="e.g. SKU-001" 
                                                                />
                                                            </td>
                                                        );
                                                    case "description":
                                                        return (
                                                            <td key={config.columnKey} className="px-3 py-3 align-top min-w-[240px]">
                                                                <textarea
                                                                    disabled={isReadOnly}
                                                                    value={item.description || ''}
                                                                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                                                    rows={1}
                                                                    className={`w-full min-h-[38px] bg-transparent border border-transparent ${isReadOnly ? 'cursor-default resize-none' : 'hover:border-border-subtle focus:border-brand-teal focus:bg-bg-main resize-y'} rounded-lg py-2 px-3 text-[13px] font-semibold text-text-primary transition-colors outline-none leading-relaxed placeholder:font-normal placeholder:text-text-muted/60`}
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
                                                                    disabled={isReadOnly}
                                                                    value={item.hsnSac || ''} 
                                                                    onChange={(e) => updateItem(item.id, 'hsnSac', e.target.value)} 
                                                                    className={`w-full bg-transparent border border-transparent ${isReadOnly ? 'cursor-default' : 'hover:border-border-subtle focus:border-brand-teal focus:bg-bg-main'} rounded-lg py-2 px-2 text-[13px] font-medium text-text-primary transition-all outline-none font-mono tracking-tight placeholder:font-sans placeholder:text-text-muted/60`} 
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
                                                                    disabled={isReadOnly}
                                                                    value={item.quantity === '' || item.quantity === null || item.quantity === undefined ? '' : item.quantity} 
                                                                    onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} 
                                                                    className={`w-full bg-transparent border border-transparent ${isReadOnly ? 'cursor-default' : 'hover:border-border-subtle focus:border-brand-teal focus:bg-bg-main'} rounded-lg py-2 px-2 text-[13px] font-medium text-text-primary text-right transition-all outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-text-muted/60`} 
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
                                                                    disabled={isReadOnly}
                                                                    value={item.listPrice === '' || item.listPrice === null || item.listPrice === undefined ? '' : item.listPrice} 
                                                                    onChange={(e) => updateItem(item.id, 'listPrice', e.target.value)} 
                                                                    className={`w-full bg-transparent border border-transparent ${isReadOnly ? 'cursor-default' : 'hover:border-border-subtle focus:border-brand-teal focus:bg-bg-main'} rounded-lg py-2 px-2 text-[13px] font-medium text-text-primary text-right transition-all outline-none font-mono tracking-tight [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:font-sans placeholder:text-text-muted/60`} 
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
                                                                    disabled={isReadOnly}
                                                                    value={item.discountPercent === '' || item.discountPercent === null || item.discountPercent === undefined ? '' : item.discountPercent} 
                                                                    onChange={(e) => updateItem(item.id, 'discountPercent', e.target.value)} 
                                                                    className={`w-full bg-transparent border border-transparent ${isReadOnly ? 'cursor-default' : 'hover:border-border-subtle focus:border-brand-teal focus:bg-bg-main'} rounded-lg py-2 px-1 text-[13px] font-medium text-text-primary text-right transition-all outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-text-muted/60`} 
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
                                                                    disabled={isReadOnly}
                                                                    value={item.unitPrice === '' || item.unitPrice === null || item.unitPrice === undefined ? '' : item.unitPrice} 
                                                                    onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)} 
                                                                    className={`w-full bg-transparent border border-transparent ${isReadOnly ? 'cursor-default' : 'hover:border-border-subtle focus:border-brand-teal focus:bg-bg-main'} rounded-lg py-2 px-2 text-[13px] font-bold text-text-primary text-right transition-all outline-none font-mono tracking-tight [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:font-sans placeholder:font-normal placeholder:text-text-muted/60`} 
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
                                                                    disabled={isReadOnly}
                                                                    value={item.taxPercent === '' || item.taxPercent === null || item.taxPercent === undefined ? '' : item.taxPercent} 
                                                                    onChange={(e) => updateItem(item.id, 'taxPercent', e.target.value)} 
                                                                    className={`w-full bg-transparent border border-transparent ${isReadOnly ? 'cursor-default' : 'hover:border-border-subtle focus:border-brand-teal focus:bg-bg-main'} rounded-lg py-2 px-1 text-[13px] font-medium text-text-primary text-right transition-all outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-text-muted/60`} 
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
                                            {!isReadOnly && (
                                                <td className="px-2 py-3 align-top text-center">
                                                    <div className="flex flex-col items-center justify-center space-y-1.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button type="button" onClick={() => removeItem(item.id)} className="btn btn-danger btn-icon" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Add Item & Clear All Row */}
                {!isReadOnly && (
                    <div className="p-5 border-t border-border-subtle/50 bg-bg-card rounded-b-[24px] flex justify-between items-center">
                        <button type="button" onClick={addItem} className="btn btn-secondary btn-sm flex items-center gap-1.5">
                            <Plus className="w-4 h-4" /> Add Item
                        </button>
                        <button 
                            type="button"
                            disabled={items.length === 0}
                            onClick={() => setIsClearConfirmOpen(true)}
                            className="flex items-center bg-bg-card border border-brand-danger/30 text-brand-danger hover:bg-brand-danger/10 disabled:opacity-40 disabled:cursor-not-allowed h-[38px] md:h-[40px] px-3 md:px-4 rounded-[10px] md:rounded-[12px] text-[13px] md:text-[14px] font-medium transition-colors"
                        >
                            <Trash2 className="w-4 h-4 mr-1.5" /> Clear All
                        </button>
                    </div>
                )}
            </div>

            {/* Terms & Conditions Box */}
            <div id="quotation-terms-section" className={`acx-card mb-6 overflow-hidden transition-all duration-200 ${termsError ? 'ring-2 ring-brand-danger/40 border-brand-danger shadow-sm' : ''}`}>
                <div className="px-5 py-4 border-b border-border-subtle bg-bg-card flex justify-between items-center">
                    <h3 className="text-[13px] font-bold text-text-primary uppercase tracking-wider flex items-center">
                        Terms & Conditions {isReadOnly ? '' : <span className="text-red-500 ml-1 font-bold">*</span>}
                    </h3>
                    <span className="text-[11px] font-semibold text-text-muted">
                        {isReadOnly ? 'Locked quotation terms' : 'Mandatory for quotation PDF & saving'}
                    </span>
                </div>
                <div className="p-5 bg-bg-main">
                    <textarea 
                        id="quotation-terms-conditions"
                        disabled={isReadOnly}
                        value={termsAndConditions} 
                        onChange={handleTermsChange} 
                        className={`acx-input w-full min-h-[140px] resize-y leading-relaxed text-[13px] ${isReadOnly ? 'bg-bg-card cursor-default' : ''} ${termsError ? 'border-brand-danger focus:border-brand-danger ring-1 ring-brand-danger/20' : ''}`} 
                        placeholder={isReadOnly ? 'No terms and conditions specified.' : 'Enter quotation terms and conditions (e.g. payment terms, delivery timelines, validity, warranty)... *'}
                    ></textarea>
                    {termsError && (
                        <p className="text-[12px] text-brand-danger font-medium mt-2 flex items-center gap-1.5 animate-modal-entrance">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{termsError}</span>
                        </p>
                    )}
                </div>
            </div>

            {/* Bank Details & Quotation Summary Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mb-8">
                {/* Bank Account Selection Panel */}
                <div className="lg:col-span-7">
                    <div id="quotation-bank-section" className={`acx-card overflow-hidden transition-all duration-200 ${bankError ? 'ring-2 ring-brand-danger/40 border-brand-danger shadow-sm' : ''}`}>
                        <div className="px-5 py-4 border-b border-border-subtle bg-bg-card flex justify-between items-center">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-[var(--color-brand-primary)]/10 flex items-center justify-center text-[var(--color-brand-primary)]">
                                    <Landmark className="w-4 h-4 text-brand-teal" />
                                </div>
                                <div>
                                    <h3 className="text-[13px] font-bold text-text-primary uppercase tracking-wider flex items-center">
                                        Bank Account for This Quotation {isReadOnly ? '' : <span className="text-red-500 ml-1 font-bold">*</span>}
                                    </h3>
                                    <p className="text-[11px] text-text-muted mt-0.5">
                                        {isReadOnly ? 'Bank details associated with this quotation' : 'Mandatory account details to be printed on the customer quotation PDF'}
                                    </p>
                                </div>
                            </div>
                            {!isReadOnly && (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400">
                                    Required *
                                </span>
                            )}
                        </div>

                        <div className="p-5">
                            {isLoadingBankAccounts ? (
                                <div className="flex items-center justify-center py-8 text-text-muted text-sm gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-brand-teal" />
                                    <span>Loading company bank accounts...</span>
                                </div>
                            ) : bankAccounts.length === 0 ? (
                                <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 sm:p-5">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                        <div className="space-y-1.5">
                                            <div className="text-[13px] font-semibold text-text-primary flex items-center gap-2">
                                                No Bank Accounts Configured
                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-600">
                                                    Action Required
                                                </span>
                                            </div>
                                            <p className="text-[12px] text-text-secondary leading-relaxed">
                                                A bank account is <strong>mandatory</strong> to create quotations and preview PDFs. Bank details must first be configured in <strong className="text-text-primary">Company Settings</strong> before you can proceed.
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
                                            Select Bank Account {isReadOnly ? '' : <span className="text-red-500">*</span>}
                                        </label>
                                        <select
                                            id="quotation-bank-select"
                                            disabled={isReadOnly}
                                            value={selectedBankAccountId}
                                            onChange={handleBankAccountChange}
                                            className={`acx-input w-full text-[13px] font-medium ${isReadOnly ? 'bg-bg-card cursor-default opacity-80' : 'bg-bg-main'} ${bankError ? 'border-brand-danger focus:border-brand-danger ring-1 ring-brand-danger/20' : ''}`}
                                        >
                                            <option value="">-- Select Bank Account (Mandatory) * --</option>
                                            {bankAccounts.map((acc) => {
                                                const masked = acc.maskedAccountNumber || (acc.bankAccountNumber && acc.bankAccountNumber.length > 4 ? `•••• ${acc.bankAccountNumber.slice(-4)}` : acc.bankAccountNumber);
                                                return (
                                                    <option key={acc.id} value={acc.id}>
                                                        {acc.bankName} {masked ? `(${masked})` : ''} {acc.isDefault ? '• [Primary Account]' : ''}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                        {bankError && (
                                            <p className="text-[12px] text-brand-danger font-medium mt-1.5 flex items-center gap-1 animate-modal-entrance">
                                                <AlertCircle className="w-3.5 h-3.5" />
                                                <span>{bankError}</span>
                                            </p>
                                        )}
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
                                        <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 text-[12px] text-red-600 dark:text-red-400 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                            <span>Please select a bank account above. Bank details are mandatory for quotation creation and PDF generation.</span>
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
                                <span className="font-medium">Subtotal (Gross)</span>
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

            <AcceptRejectQuotationModal
                isOpen={!!acceptRejectModalInfo}
                onClose={() => setAcceptRejectModalInfo(null)}
                quotation={acceptRejectModalInfo?.quotation}
                type={acceptRejectModalInfo?.type}
                onSuccess={(updated) => {
                    if (updated) {
                        if (updated.status) setQuotationStatus(updated.status);
                        if (updated.responseSource) setResponseSource(updated.responseSource);
                        if (updated.responseNotes !== undefined) setResponseNotes(updated.responseNotes || '');
                    }
                    initializeBuilder();
                }}
            />

            <CreatePurchaseOrderModal
                isOpen={isPoModalOpen}
                onClose={() => setIsPoModalOpen(false)}
                quotation={{
                    id: currentQuotationId,
                    quotationNumber: quotationNumber,
                    clientName: clientName || clientCompany,
                    grandTotal: totals?.grandTotal || quotationGrandTotal || 0,
                    currency: currency || 'INR'
                }}
                onSuccess={() => {
                    setIsPoModalOpen(false);
                    initializeBuilder();
                }}
            />

            {/* Create Invoice Dialog */}
            {isInvoiceModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fade-in">
                    <div className="acx-card p-0 border border-border-subtle rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-modal-entrance bg-bg-card">
                        <div className="p-5 border-b border-border-subtle flex justify-between items-center bg-bg-surface/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-text-primary tracking-tight">Create Invoice</h2>
                                    <p className="text-xs text-text-muted mt-0.5">Generate client billing document</p>
                                </div>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setIsInvoiceModalOpen(false)} 
                                disabled={isCreatingInvoice}
                                aria-label="Close dialog"
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-hover active:bg-bg-muted transition-colors border border-transparent hover:border-border-subtle"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-800/40">
                                <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded mb-1">
                                    Source Quotation
                                </span>
                                <div className="text-[13px] font-bold text-text-primary font-mono mt-0.5">
                                    {quotationNumber || `#${currentQuotationId}`}
                                </div>
                                <div className="text-xs text-text-secondary mt-0.5">
                                    {clientName} {clientCompany ? `(${clientCompany})` : ''}
                                </div>
                                <div className="text-xs text-text-muted mt-2 pt-2 border-t border-blue-200/50 dark:border-blue-800/30 flex justify-between items-center">
                                    <span>Total Amount:</span>
                                    <span className="font-bold text-blue-700 dark:text-blue-400 font-mono text-sm">
                                        {formatCurrency(totals?.grandTotal || quotationGrandTotal || 0, currency, 2)}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-2">Select Invoice Type</label>
                                <div className="space-y-2.5">
                                    <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${selectedInvoiceType === 'TAX_INVOICE' ? 'border-brand-primary bg-brand-primary/5 shadow-xs ring-1 ring-brand-primary/20' : 'border-border-subtle hover:border-border-light bg-bg-main/30'}`}>
                                        <input 
                                            type="radio" 
                                            name="invoiceType" 
                                            value="TAX_INVOICE" 
                                            checked={selectedInvoiceType === 'TAX_INVOICE'} 
                                            onChange={() => setSelectedInvoiceType('TAX_INVOICE')}
                                            className="mt-0.5 text-brand-primary focus:ring-brand-primary"
                                        />
                                        <div>
                                            <span className="text-sm font-bold text-text-primary block">Tax Invoice</span>
                                            <span className="text-xs text-text-muted leading-relaxed">Standard official GST tax invoice for billing the client.</span>
                                        </div>
                                    </label>

                                    <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${selectedInvoiceType === 'PROFORMA' ? 'border-brand-primary bg-brand-primary/5 shadow-xs ring-1 ring-brand-primary/20' : 'border-border-subtle hover:border-border-light bg-bg-main/30'}`}>
                                        <input 
                                            type="radio" 
                                            name="invoiceType" 
                                            value="PROFORMA" 
                                            checked={selectedInvoiceType === 'PROFORMA'} 
                                            onChange={() => setSelectedInvoiceType('PROFORMA')}
                                            className="mt-0.5 text-brand-primary focus:ring-brand-primary"
                                        />
                                        <div>
                                            <span className="text-sm font-bold text-text-primary block">Proforma Invoice</span>
                                            <span className="text-xs text-text-muted leading-relaxed">Preliminary commercial estimate document sent before final supply or payment.</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {invoiceCreationError && (
                                <div className="p-3.5 bg-brand-danger/10 border border-brand-danger/30 rounded-xl flex items-start gap-2.5">
                                    <AlertCircle className="w-4 h-4 text-brand-danger shrink-0 mt-0.5" />
                                    <p className="text-xs text-brand-danger font-medium leading-relaxed">{invoiceCreationError}</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-border-subtle/60 bg-bg-surface/30 flex justify-end gap-2.5">
                            <button 
                                type="button" 
                                onClick={() => setIsInvoiceModalOpen(false)} 
                                disabled={isCreatingInvoice}
                                className="btn btn-secondary btn-sm"
                            >
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                onClick={async () => {
                                    if (!currentQuotationId || isCreatingInvoice) return;
                                    setIsCreatingInvoice(true);
                                    setInvoiceCreationError(null);
                                    try {
                                        const invoice = await createInvoiceFromQuotation(currentQuotationId, selectedInvoiceType);
                                        showToast({
                                            type: 'success',
                                            message: `${selectedInvoiceType === 'PROFORMA' ? 'Proforma Invoice' : 'Tax Invoice'} created successfully!`
                                        });
                                        setIsInvoiceModalOpen(false);
                                        navigate(`/invoices/${invoice.id}`);
                                    } catch (err) {
                                        console.error("Create Invoice Error:", err);
                                        setInvoiceCreationError(err.message || 'Failed to create invoice from quotation.');
                                        showToast({
                                            type: 'error',
                                            message: err.message || 'Failed to create invoice from quotation.'
                                        });
                                    } finally {
                                        setIsCreatingInvoice(false);
                                    }
                                }} 
                                disabled={isCreatingInvoice}
                                className="btn btn-primary btn-sm flex items-center"
                            >
                                {isCreatingInvoice ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <FileText className="w-3.5 h-3.5 mr-1.5" />}
                                Create {selectedInvoiceType === 'PROFORMA' ? 'Proforma Invoice' : 'Tax Invoice'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Invoices Picker Dialog */}
            {isViewInvoicesDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fade-in">
                    <div className="acx-card p-0 border border-border-subtle rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-modal-entrance bg-bg-card">
                        <div className="p-5 border-b border-border-subtle flex justify-between items-center bg-bg-surface/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-text-primary tracking-tight">Related Invoices</h2>
                                    <p className="text-xs text-text-muted mt-0.5">Select an invoice to inspect</p>
                                </div>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setIsViewInvoicesDialogOpen(false)} 
                                aria-label="Close dialog"
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-hover active:bg-bg-muted transition-colors border border-transparent hover:border-border-subtle"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-3">
                            <p className="text-xs text-text-secondary leading-relaxed">Multiple invoices exist for this quotation. Choose a document to view:</p>
                            {taxInvoiceId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsViewInvoicesDialogOpen(false);
                                        navigate(`/invoices/${taxInvoiceId}`);
                                    }}
                                    className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border-subtle hover:border-brand-primary hover:bg-brand-primary/5 text-left transition-all group"
                                >
                                    <div>
                                        <span className="text-sm font-bold text-text-primary block group-hover:text-brand-primary transition-colors">Tax Invoice</span>
                                        <span className="text-xs text-text-muted">Standard GST Tax Invoice</span>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-brand-primary shrink-0" />
                                </button>
                            )}
                            {proformaId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsViewInvoicesDialogOpen(false);
                                        navigate(`/invoices/${proformaId}`);
                                    }}
                                    className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border-subtle hover:border-brand-primary hover:bg-brand-primary/5 text-left transition-all group"
                                >
                                    <div>
                                        <span className="text-sm font-bold text-text-primary block group-hover:text-brand-primary transition-colors">Proforma Invoice</span>
                                        <span className="text-xs text-text-muted">Proforma / Estimate Document</span>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-brand-primary shrink-0" />
                                </button>
                            )}
                        </div>
                        <div className="p-4 border-t border-border-subtle/60 bg-bg-surface/30 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setIsViewInvoicesDialogOpen(false)}
                                className="btn btn-secondary btn-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
