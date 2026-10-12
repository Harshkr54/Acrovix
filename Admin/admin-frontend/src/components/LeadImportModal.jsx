import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
    Upload, 
    FileSpreadsheet, 
    Download, 
    Trash2, 
    Loader2, 
    CheckCircle2, 
    AlertTriangle, 
    XCircle, 
    ArrowRight, 
    ArrowLeft, 
    X, 
    Check, 
    Plus, 
    Search, 
    ChevronLeft,
    ChevronRight,
    Eye, 
    EyeOff, 
    Sparkles,
    CheckSquare,
    RefreshCw,
    Layers,
    FileDown,
    FileCheck
} from 'lucide-react';
import { 
    previewCrmLeadImport, 
    importCrmLeadRecords, 
    exportConvertedLeads,
    exportLeadErrorReport,
    downloadCrmLeadTemplate 
} from '../services/api';

const EMAIL_REGEX = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export default function LeadImportModal({ isOpen, onClose, onSuccess }) {
    // Pipeline Steps:
    // 1: Upload & Inspect Source File
    // 2: Smart Field Mapping Screen
    // 3: Interactive Review & Edit Data Grid
    // 4: Summary Results
    const [step, setStep] = useState(1);
    const [file, setFile] = useState(null);
    const [fileReady, setFileReady] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [selectedSheet, setSelectedSheet] = useState(null);
    const [columnMapping, setColumnMapping] = useState({});
    
    // Grid State
    const [rows, setRows] = useState([]);
    const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, VALID, INVALID, DUPLICATE, POSSIBLE_DUPLICATE
    const [searchQuery, setSearchQuery] = useState('');
    const [showAllFields, setShowAllFields] = useState(true);
    const [viewOriginalValues, setViewOriginalValues] = useState(false);

    // Pagination for Large Datasets (e.g. 1,861+ records)
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50); // 25, 50, 100, 250

    // Submission & Export State
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importResult, setImportResult] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handleReset = useCallback(() => {
        setStep(1);
        setFile(null);
        setFileReady(false);
        setPreviewData(null);
        setSelectedSheet(null);
        setColumnMapping({});
        setRows([]);
        setFilterStatus('ALL');
        setSearchQuery('');
        setShowAllFields(true);
        setViewOriginalValues(false);
        setCurrentPage(1);
        setImportResult(null);
        setError(null);
        setLoadingPreview(false);
        setImporting(false);
        setImportProgress(0);
        setExporting(false);
    }, []);

    const handleClose = useCallback(() => {
        handleReset();
        if (onClose) onClose();
    }, [handleReset, onClose]);

    // Keyboard listener for Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen && !importing) {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, importing, handleClose]);

    const validateSelectedFile = (selectedFile) => {
        if (!selectedFile) return { valid: false, error: null };

        if (selectedFile.size === 0) {
            return { valid: false, error: 'The selected file is empty.' };
        }

        if (selectedFile.size > 10 * 1024 * 1024) {
            return { valid: false, error: 'File size exceeds maximum allowed limit (10 MB).' };
        }

        const name = selectedFile.name.toLowerCase();
        const ext = name.includes('.') ? name.split('.').pop() : '';
        if (!['csv', 'xls', 'xlsx', 'pdf'].includes(ext)) {
            return { valid: false, error: 'Unsupported file type. Please upload a CSV, XLSX, XLS, or PDF document.' };
        }

        return { valid: true, error: null };
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (selectedFile) => {
        if (!selectedFile) return;

        const validation = validateSelectedFile(selectedFile);
        if (!validation.valid) {
            setError(validation.error);
            setFile(null);
            setFileReady(false);
        } else {
            setError(null);
            setFile(selectedFile);
            setFileReady(true);
            processFile(selectedFile, null);
        }
    };

    const handleSheetChange = (newSheet) => {
        setSelectedSheet(newSheet);
        if (file) {
            processFile(file, newSheet);
        }
    };

    const validateRowRecord = (row, currentAllRows = []) => {
        const errors = [...(row.serverErrors || [])];
        const warnings = [...(row.serverWarnings || [])];
        const fullName = (row.fullName || '').trim();
        const businessEmail = (row.businessEmail || '').trim();
        const phoneNumber = (row.phoneNumber || '').trim();

        if (!fullName && !errors.includes('Full Name is required')) {
            errors.push('Full Name is required');
        }
        if (!businessEmail) {
            if (!errors.includes('Please enter a valid email address')) errors.push('Please enter a valid email address');
        } else if (!EMAIL_REGEX.test(businessEmail)) {
            if (!errors.includes('Please enter a valid email address')) errors.push('Please enter a valid email address');
        }

        // In-grid duplicate email check
        const isDuplicateInGrid = currentAllRows.some(r => 
            r.id !== row.id && 
            r.businessEmail && 
            r.businessEmail.trim().toLowerCase() === businessEmail.toLowerCase() &&
            businessEmail !== ''
        );

        let status = 'VALID';
        const isActuallyServerDuplicate = row.isServerDuplicate;

        if (isActuallyServerDuplicate || isDuplicateInGrid) {
            status = 'DUPLICATE';
            if (!errors.includes('Duplicate email address') && !errors.includes('Email already exists in CRM')) {
                errors.push(isActuallyServerDuplicate ? 'Email already exists in CRM' : 'Duplicate email within uploaded batch');
            }
        } else if (row.isPossibleDuplicate) {
            status = 'POSSIBLE_DUPLICATE';
        } else if (errors.length > 0) {
            status = 'INVALID';
        }

        return {
            ...row,
            fullName,
            businessEmail,
            phoneNumber,
            status,
            errors,
            warnings
        };
    };

    const processFile = async (fileToProcess, sheetName) => {
        try {
            setLoadingPreview(true);
            setError(null);
            const data = await previewCrmLeadImport(fileToProcess, sheetName);
            setPreviewData(data);
            setSelectedSheet(data.activeSheet || null);
            setColumnMapping(data.suggestedMapping || {});

            const rawRows = data.previewRows || [];
            if (rawRows.length === 0) {
                setError('No lead records could be extracted from this document. Please check the file formatting or download our template.');
                setFileReady(false);
                return;
            }

            // Initialize Grid Rows from backend preview
            const parsedRows = rawRows.map((r, idx) => {
                const rowData = r.rowData || {};
                const normData = r.normalizedData || {};
                const initialRow = {
                    id: idx + 1,
                    rowIndex: r.rowIndex || (idx + 1),
                    included: r.included !== false && r.status !== 'DUPLICATE',
                    fullName: r.fullName || normData.fullName || rowData.fullName || rowData['Full Name'] || rowData.Name || '',
                    businessEmail: r.businessEmail || normData.businessEmail || rowData.businessEmail || rowData['Business Email'] || rowData.Email || '',
                    companyName: r.companyName || normData.companyName || rowData.companyName || rowData.Company || rowData.Organization || '',
                    phoneNumber: r.phoneNumber || normData.phoneNumber || rowData.phoneNumber || rowData.Phone || rowData.Mobile || rowData['Contact Number'] || '',
                    industrySector: normData.industrySector || rowData.industrySector || rowData.Industry || rowData.Sector || '',
                    serviceRequired: normData.serviceRequired || rowData.serviceRequired || rowData.Requirement || rowData['Service Required'] || '',
                    leadSource: normData.leadSource || rowData.leadSource || rowData.Source || rowData['Lead Source'] || 'WEBSITE',
                    priority: normData.priority || rowData.priority || rowData.Priority || 'MEDIUM',
                    leadStatus: normData.status || rowData.status || rowData.Status || 'NEW',
                    currency: normData.currency || rowData.currency || rowData.Currency || 'INR',
                    estimatedValue: normData.estimatedValue || rowData.estimatedValue || rowData['Estimated Value'] || '',
                    expectedClosingDate: normData.expectedClosingDate || rowData.expectedClosingDate || rowData['Expected Closing Date'] || '',
                    probability: normData.probability || rowData.probability || rowData.Probability || '',
                    notes: normData.notes || rowData.notes || rowData.Notes || rowData.Remarks || '',
                    assignedToId: normData.assignedToId || rowData.assignedToId || rowData['Assigned Sales Rep ID'] || '',
                    unmappedDomainData: r.unmappedDomainData || {},
                    rawData: rowData,
                    normalizedData: normData,
                    isServerDuplicate: r.status === 'DUPLICATE',
                    isPossibleDuplicate: r.status === 'POSSIBLE_DUPLICATE',
                    duplicateReason: r.duplicateReason,
                    status: r.status,
                    serverErrors: r.errors || [],
                    serverWarnings: r.warnings || [],
                    errors: r.errors || [],
                    warnings: r.warnings || []
                };
                return initialRow;
            });

            const validated = parsedRows.map(row => validateRowRecord(row, parsedRows));
            setRows(validated);
            setCurrentPage(1);
            setStep(2); // Go to Smart Field Mapping Step
        } catch (err) {
            console.error("Preview failed", err);
            setError(err.message || 'Unable to parse this document. Ensure it is a valid CSV, Excel, or text-based PDF file.');
            setFileReady(false);
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleMappingChange = (header, targetKey) => {
        const updatedMapping = {
            ...columnMapping,
            [header]: targetKey
        };
        setColumnMapping(updatedMapping);

        // Update rows if column mapped to a core field
        setRows(prevRows => {
            return prevRows.map(row => {
                const updatedRow = { ...row };
                if (targetKey && targetKey !== 'notes') {
                    const extractedVal = row.rawData ? row.rawData[header] : null;
                    if (extractedVal !== undefined && extractedVal !== null) {
                        updatedRow[targetKey] = extractedVal.trim();
                    }
                }
                return validateRowRecord(updatedRow, prevRows);
            });
        });
    };

    const handleCellChange = (id, field, value) => {
        setRows(prevRows => {
            const nextRows = prevRows.map(r => {
                if (r.id === id) {
                    return { ...r, [field]: value };
                }
                return r;
            });
            return nextRows.map(r => validateRowRecord(r, nextRows));
        });
    };

    const handleToggleInclude = (id) => {
        setRows(prevRows => prevRows.map(r => r.id === id ? { ...r, included: !r.included } : r));
    };

    const handleBulkInclude = (includeOnlyValid = false) => {
        setRows(prevRows => prevRows.map(r => {
            if (includeOnlyValid) {
                return { ...r, included: r.status === 'VALID' };
            }
            return { ...r, included: true };
        }));
    };

    const handleBulkExcludeDuplicates = () => {
        setRows(prevRows => prevRows.map(r => {
            if (r.status === 'DUPLICATE' || r.status === 'POSSIBLE_DUPLICATE') {
                return { ...r, included: false };
            }
            return r;
        }));
    };

    const handleBulkNormalize = () => {
        setRows(prevRows => {
            const next = prevRows.map(r => {
                const fullName = (r.fullName || '').replace(/\s+/g, ' ').trim();
                const email = (r.businessEmail || '').toLowerCase().trim();
                let phone = (r.phoneNumber || '').trim();
                if (phone) {
                    const hasPlus = phone.startsWith('+');
                    const digits = phone.replace(/[^0-9]/g, '');
                    phone = hasPlus ? '+' + digits : digits;
                }
                return {
                    ...r,
                    fullName,
                    businessEmail: email,
                    phoneNumber: phone
                };
            });
            return next.map(r => validateRowRecord(r, next));
        });
    };

    const handleDeleteRow = (id) => {
        setRows(prevRows => {
            const remaining = prevRows.filter(r => r.id !== id);
            return remaining.map(r => validateRowRecord(r, remaining));
        });
    };

    const handleAddRow = () => {
        const newId = Date.now();
        const newRow = validateRowRecord({
            id: newId,
            rowIndex: rows.length + 1,
            included: true,
            fullName: '',
            businessEmail: '',
            companyName: '',
            phoneNumber: '',
            leadSource: 'WEBSITE',
            leadStatus: 'NEW',
            priority: 'MEDIUM',
            currency: 'INR',
            isServerDuplicate: false,
            isPossibleDuplicate: false,
            status: 'INVALID',
            errors: ['Full Name is required', 'Business Email is required'],
            warnings: [],
            rawData: {},
            normalizedData: {}
        }, rows);

        setRows([newRow, ...rows]);
        setCurrentPage(1);
    };

    // Export Reviewed Dataset
    const handleExportConverted = async (format = 'CSV') => {
        const candidates = rows.filter(r => r.included);
        if (candidates.length === 0) {
            setError('No rows are selected for export.');
            return;
        }

        try {
            setExporting(true);
            const payload = candidates.map(buildLeadPayload);
            await exportConvertedLeads(payload, format);
        } catch (err) {
            console.error("Export failed", err);
            setError(err.message || 'Failed to download converted dataset.');
        } finally {
            setExporting(false);
        }
    };

    // Export Error Report
    const handleExportErrors = async () => {
        const rejected = rows.filter(r => r.status === 'INVALID' || r.status === 'DUPLICATE' || !r.included);
        if (rejected.length === 0) {
            setError('There are no rejected or excluded rows to export.');
            return;
        }

        try {
            setExporting(true);
            await exportLeadErrorReport(rejected);
        } catch (err) {
            console.error("Export errors failed", err);
            setError(err.message || 'Failed to download error report.');
        } finally {
            setExporting(false);
        }
    };

    const buildLeadPayload = (r) => {
        const ALLOWED_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
        const ALLOWED_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
        const ALLOWED_SOURCES = ['WEBSITE', 'REFERRAL', 'EMAIL', 'PHONE', 'WHATSAPP', 'LINKEDIN', 'ADVERTISEMENT', 'PARTNER', 'OTHER'];
        const ALLOWED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED'];

        const s = (r.leadStatus || r.status || '').toString().toUpperCase();
        const leadStatusVal = ALLOWED_STATUSES.includes(s) ? s : 'NEW';

        const p = (r.priority || '').toString().toUpperCase();
        const priorityVal = ALLOWED_PRIORITIES.includes(p) ? p : 'MEDIUM';

        const src = (r.leadSource || '').toString().toUpperCase();
        const sourceVal = ALLOWED_SOURCES.includes(src) ? src : 'WEBSITE';

        const cur = (r.currency || '').toString().toUpperCase();
        const currencyVal = ALLOWED_CURRENCIES.includes(cur) ? cur : 'INR';

        // Preserve domain metadata into notes
        let notesText = (r.notes || '').trim();
        if (r.unmappedDomainData && Object.keys(r.unmappedDomainData).length > 0) {
            const domainParts = Object.entries(r.unmappedDomainData).map(([k, v]) => `${k}: ${v}`);
            if (notesText) notesText += ' | ';
            notesText += domainParts.join(' | ');
        }

        return {
            fullName: r.fullName,
            businessEmail: r.businessEmail,
            companyName: r.companyName || null,
            phoneNumber: r.phoneNumber || null,
            industrySector: r.industrySector || null,
            serviceRequired: r.serviceRequired || null,
            leadSource: sourceVal,
            priority: priorityVal,
            status: leadStatusVal,
            currency: currencyVal,
            estimatedValue: (r.estimatedValue && !isNaN(parseFloat(r.estimatedValue))) ? parseFloat(r.estimatedValue) : null,
            expectedClosingDate: r.expectedClosingDate || null,
            probability: (r.probability && !isNaN(parseInt(r.probability))) ? parseInt(r.probability) : null,
            notes: notesText || null,
            assignedToId: (r.assignedToId && !isNaN(parseInt(r.assignedToId))) ? parseInt(r.assignedToId) : null
        };
    };

    // Safe Batched Import Execution (Handles 1,861+ leads safely in 500-record chunks)
    const handlePerformImport = async () => {
        const leadsToImport = rows.filter(r => r.included && r.status !== 'INVALID');
        if (leadsToImport.length === 0) {
            setError('No valid included records found to import. Please include at least one valid lead.');
            return;
        }

        try {
            setImporting(true);
            setImportProgress(0);
            setError(null);

            const allPayloads = leadsToImport.map(buildLeadPayload);
            const CHUNK_SIZE = 500;
            let totalSuccess = 0;
            let totalDuplicate = 0;
            let totalError = 0;
            let aggregatedErrors = [];

            const totalChunks = Math.ceil(allPayloads.length / CHUNK_SIZE);
            for (let i = 0; i < totalChunks; i++) {
                const chunk = allPayloads.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
                const res = await importCrmLeadRecords(chunk);
                totalSuccess += res.successCount || 0;
                totalDuplicate += res.duplicateCount || 0;
                totalError += res.errorCount || 0;
                if (res.errors) aggregatedErrors = aggregatedErrors.concat(res.errors);

                setImportProgress(Math.round(((i + 1) / totalChunks) * 100));
            }

            setImportResult({
                totalProcessed: allPayloads.length,
                successCount: totalSuccess,
                duplicateCount: totalDuplicate,
                errorCount: totalError,
                errors: aggregatedErrors
            });

            if (onSuccess && totalSuccess > 0) {
                onSuccess();
            }

            setStep(4); // Summary Result Step
        } catch (err) {
            console.error("Import failed", err);
            setError(err.message || 'Failed to complete bulk lead import.');
        } finally {
            setImporting(false);
            setImportProgress(0);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            await downloadCrmLeadTemplate();
        } catch (_err) {
            setError('Failed to download import template');
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '0 B';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    // Filtered Rows for Grid Rendering
    const filteredRows = useMemo(() => {
        return (rows || []).filter(r => {
            if (!r) return false;
            // Status Filter
            if (filterStatus === 'VALID' && r.status !== 'VALID') return false;
            if (filterStatus === 'INVALID' && r.status !== 'INVALID') return false;
            if (filterStatus === 'DUPLICATE' && r.status !== 'DUPLICATE') return false;
            if (filterStatus === 'POSSIBLE_DUPLICATE' && r.status !== 'POSSIBLE_DUPLICATE') return false;

            // Search Filter
            if (searchQuery && searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const nameMatch = (r.fullName || '').toLowerCase().includes(q);
                const emailMatch = (r.businessEmail || '').toLowerCase().includes(q);
                const companyMatch = (r.companyName || '').toLowerCase().includes(q);
                const phoneMatch = (r.phoneNumber || '').toLowerCase().includes(q);
                return nameMatch || emailMatch || companyMatch || phoneMatch;
            }

            return true;
        });
    }, [rows, filterStatus, searchQuery]);

    // Paginated Rows Slice
    const totalFiltered = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
    const paginatedRows = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredRows.slice(start, start + pageSize);
    }, [filteredRows, currentPage, pageSize]);

    // Summary Counts
    const validCount = (rows || []).filter(r => r && r.status === 'VALID').length;
    const invalidCount = (rows || []).filter(r => r && r.status === 'INVALID').length;
    const duplicateCount = (rows || []).filter(r => r && r.status === 'DUPLICATE').length;
    const possibleDuplicateCount = (rows || []).filter(r => r && r.status === 'POSSIBLE_DUPLICATE').length;
    const includedCount = (rows || []).filter(r => r && r.included).length;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#0B192C] border border-[#D9E2EC] dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[94vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#D9E2EC] dark:border-slate-800 bg-white dark:bg-[#0B192C]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB] shrink-0">
                            <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                Smart Document-to-Lead Conversion Pipeline
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                    <Sparkles className="w-3 h-3 text-blue-600" />
                                    PDF • XLSX • XLS • CSV
                                </span>
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Convert structured documents into CRM leads with automated normalization, duplicate protection, and mapping validation.
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={handleClose} 
                        disabled={importing}
                        aria-label="Close modal"
                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* 4-Step Progress Indicator */}
                <div className="px-6 py-3 bg-[#F0FAFA] dark:bg-slate-900/50 border-b border-[#D9E2EC] dark:border-slate-800">
                    <div className="flex items-center justify-between max-w-2xl mx-auto text-xs">
                        
                        {/* Step 1 */}
                        <div className="flex items-center gap-2">
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                step > 1 
                                    ? 'bg-[#0D9488] text-white' 
                                    : 'bg-[#2563EB] text-white shadow-xs'
                            }`}>
                                {step > 1 ? <Check className="w-4 h-4" /> : '1'}
                            </span>
                            <span className={`font-semibold ${step === 1 ? 'text-slate-900 dark:text-white font-bold' : 'text-[#0D9488]'}`}>
                                Inspect File
                            </span>
                        </div>
                        <div className={`flex-1 h-[2px] mx-2 transition-colors ${step > 1 ? 'bg-[#0D9488]' : 'bg-slate-200 dark:bg-slate-700'}`} />

                        {/* Step 2 */}
                        <div className="flex items-center gap-2">
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                step > 2 
                                    ? 'bg-[#0D9488] text-white' 
                                    : step === 2 
                                        ? 'bg-[#2563EB] text-white shadow-xs' 
                                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 font-semibold'
                            }`}>
                                {step > 2 ? <Check className="w-4 h-4" /> : '2'}
                            </span>
                            <span className={`font-semibold ${step === 2 ? 'text-slate-900 dark:text-white font-bold' : step > 2 ? 'text-[#0D9488]' : 'text-slate-400'}`}>
                                Field Mapping
                            </span>
                        </div>
                        <div className={`flex-1 h-[2px] mx-2 transition-colors ${step > 2 ? 'bg-[#0D9488]' : 'bg-slate-200 dark:bg-slate-700'}`} />

                        {/* Step 3 */}
                        <div className="flex items-center gap-2">
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                step > 3 
                                    ? 'bg-[#0D9488] text-white' 
                                    : step === 3 
                                        ? 'bg-[#2563EB] text-white shadow-xs' 
                                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 font-semibold'
                            }`}>
                                {step > 3 ? <Check className="w-4 h-4" /> : '3'}
                            </span>
                            <span className={`font-semibold ${step === 3 ? 'text-slate-900 dark:text-white font-bold' : step > 3 ? 'text-[#0D9488]' : 'text-slate-400'}`}>
                                Review & Edit
                            </span>
                        </div>
                        <div className={`flex-1 h-[2px] mx-2 transition-colors ${step > 3 ? 'bg-[#0D9488]' : 'bg-slate-200 dark:bg-slate-700'}`} />

                        {/* Step 4 */}
                        <div className="flex items-center gap-2">
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                step === 4 
                                    ? 'bg-[#0D9488] text-white shadow-xs' 
                                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 font-semibold'
                            }`}>
                                {step === 4 ? <Check className="w-4 h-4" /> : '4'}
                            </span>
                            <span className={`font-semibold ${step === 4 ? 'text-[#0D9488] font-bold' : 'text-slate-400'}`}>
                                Import Results
                            </span>
                        </div>
                    </div>
                </div>

                {/* Inline Error Banner */}
                {error && (
                    <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                        <span className="flex-1 font-medium">{error}</span>
                    </div>
                )}

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-[#0B192C]">

                    {/* STEP 1: UPLOAD & INSPECT SOURCE FILE */}
                    {step === 1 && (
                        <div className="space-y-5">
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Upload Source Document</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Upload a business document containing contact or lead data. Supports PDF tables, Excel spreadsheets (XLSX, XLS), and CSV files.
                                </p>
                            </div>

                            {loadingPreview ? (
                                <div className="border-2 border-dashed border-blue-300 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3 animate-in fade-in">
                                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    </div>
                                    <div>
                                        <h5 className="text-sm font-bold text-slate-900 dark:text-white">Inspecting & parsing document...</h5>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Verifying signatures, detecting sheets, and extracting table records</p>
                                    </div>
                                </div>
                            ) : !fileReady ? (
                                <div 
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                                        dragActive 
                                            ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40' 
                                            : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 bg-slate-50/50 dark:bg-slate-900/40'
                                    }`}
                                >
                                    <input 
                                        ref={fileInputRef}
                                        type="file" 
                                        accept=".csv,.xlsx,.xls,.pdf"
                                        onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                                        className="hidden" 
                                    />
                                    <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3 shadow-xs">
                                        <Upload className="w-6 h-6" />
                                    </div>
                                    <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                        Drop your PDF, Excel, or CSV document here
                                    </h5>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        or click to browse from your computer (Maximum 10 MB)
                                    </p>
                                    <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-500">
                                        <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono font-medium">.PDF</span>
                                        <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono font-medium">.XLSX</span>
                                        <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono font-medium">.XLS</span>
                                        <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono font-medium">.CSV</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/20 flex items-center justify-between shadow-xs">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                                                <FileCheck className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-900 dark:text-white">{file?.name || 'Uploaded File'}</span>
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Parsed successfully
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                    {file?.name ? file.name.split('.').pop().toUpperCase() : 'FILE'} • {formatFileSize(file?.size)}
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setFile(null); setFileReady(false); setError(null); }}
                                            className="btn btn-secondary btn-sm text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:hover:bg-rose-950/50 flex items-center gap-1"
                                            title="Remove File"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Choose Another File
                                        </button>
                                    </div>

                                    {/* Multi-Sheet Selection Bar if available */}
                                    {previewData?.availableSheets && previewData.availableSheets.length > 1 && (
                                        <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 dark:border-blue-900/60 dark:bg-blue-950/20 flex items-center justify-between text-xs animate-in fade-in">
                                            <div className="flex items-center gap-2">
                                                <Layers className="w-4 h-4 text-blue-600" />
                                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                                    Multiple Worksheets Detected ({previewData.availableSheets.length})
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-600 dark:text-slate-400 text-[11px]">Select Sheet to Process:</span>
                                                <select
                                                    value={selectedSheet || previewData.activeSheet}
                                                    onChange={(e) => handleSheetChange(e.target.value)}
                                                    className="px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 font-semibold"
                                                >
                                                    {previewData.availableSheets.map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2: SMART FIELD MAPPING SCREEN */}
                    {step === 2 && previewData && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between pb-1">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Smart Field Mapping & Confidence</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Review how document columns were mapped to CRM lead fields. Unmapped enterprise identifiers (CSI, Contract, Renewal) are automatically preserved in Lead Notes.
                                    </p>
                                </div>
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                    {Object.values(columnMapping).filter(Boolean).length} of {(previewData?.fileHeaders || []).length} columns mapped
                                </span>
                            </div>

                            {/* Mapping Grid */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
                                <div className="max-h-[380px] overflow-y-auto leads-table-scroll-container">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider z-10">
                                            <tr>
                                                <th className="px-4 py-3 min-w-[180px]">Source Column</th>
                                                <th className="px-4 py-3 min-w-[200px]">Sample Extracted Value</th>
                                                <th className="px-4 py-3 min-w-[160px]">Confidence</th>
                                                <th className="px-4 py-3 min-w-[240px]">Target CRM Field</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                            {(previewData.columnMappings || []).map((col) => {
                                                const currentMapped = columnMapping[col.sourceColumn] !== undefined 
                                                    ? columnMapping[col.sourceColumn] 
                                                    : (col.suggestedField || '');

                                                return (
                                                    <tr key={col.sourceColumn} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                                                        <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                                                            {col.sourceColumn}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 font-mono text-[11px] truncate max-w-xs" title={col.sampleValue}>
                                                            {col.sampleValue || <span className="text-slate-400 italic">Empty in preview</span>}
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            {col.confidence === 'HIGH' && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                                    High ({col.confidenceScore}%)
                                                                </span>
                                                            )}
                                                            {col.confidence === 'MEDIUM' && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                                                    <Sparkles className="w-3 h-3 text-blue-600" />
                                                                    Medium ({col.confidenceScore}%)
                                                                </span>
                                                            )}
                                                            {col.confidence === 'DOMAIN_FIELD' && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300" title={col.description}>
                                                                    <Layers className="w-3 h-3 text-purple-600" />
                                                                    Domain Identifier
                                                                </span>
                                                            )}
                                                            {col.confidence === 'UNMAPPED' && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                                    Unmapped
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <select
                                                                value={currentMapped || ''}
                                                                onChange={(e) => handleMappingChange(col.sourceColumn, e.target.value)}
                                                                className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                                                            >
                                                                <option value="">Do Not Import</option>
                                                                <option value="notes">Preserve in Lead Notes</option>
                                                                {(previewData?.supportedFields || []).map(f => (
                                                                    <option key={f.key} value={f.key}>
                                                                        {f.label} {f.required ? '*' : ''}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: INTERACTIVE REVIEW & EDIT DATA GRID */}
                    {step === 3 && previewData && (
                        <div className="space-y-4">
                            
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setFilterStatus('ALL'); setCurrentPage(1); }}
                                    className={`p-3 rounded-xl border text-left transition-all ${
                                        filterStatus === 'ALL'
                                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                                            : 'border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30 hover:border-slate-300'
                                    }`}
                                >
                                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Leads</div>
                                    <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{rows.length}</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => { setFilterStatus('VALID'); setCurrentPage(1); }}
                                    className={`p-3 rounded-xl border text-left transition-all ${
                                        filterStatus === 'VALID'
                                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                                            : 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/60 dark:bg-emerald-950/10 hover:border-emerald-300'
                                    }`}
                                >
                                    <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Ready to Import</div>
                                    <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{validCount}</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => { setFilterStatus('INVALID'); setCurrentPage(1); }}
                                    className={`p-3 rounded-xl border text-left transition-all ${
                                        filterStatus === 'INVALID'
                                            ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 ring-2 ring-rose-500/20'
                                            : 'border-rose-200 bg-rose-50/30 dark:border-rose-900/60 dark:bg-rose-950/10 hover:border-rose-300'
                                    }`}
                                >
                                    <div className="text-[11px] font-semibold text-rose-700 dark:text-rose-400">Needs Attention</div>
                                    <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">{invalidCount}</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => { setFilterStatus('DUPLICATE'); setCurrentPage(1); }}
                                    className={`p-3 rounded-xl border text-left transition-all ${
                                        filterStatus === 'DUPLICATE'
                                            ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 ring-2 ring-amber-500/20'
                                            : 'border-amber-200 bg-amber-50/30 dark:border-amber-900/60 dark:bg-amber-950/10 hover:border-amber-300'
                                    }`}
                                >
                                    <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">Exact Duplicates</div>
                                    <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">{duplicateCount}</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => { setFilterStatus('POSSIBLE_DUPLICATE'); setCurrentPage(1); }}
                                    className={`p-3 rounded-xl border text-left transition-all ${
                                        filterStatus === 'POSSIBLE_DUPLICATE'
                                            ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/30 ring-2 ring-purple-500/20'
                                            : 'border-purple-200 bg-purple-50/30 dark:border-purple-900/60 dark:bg-purple-950/10 hover:border-purple-300'
                                    }`}
                                >
                                    <div className="text-[11px] font-semibold text-purple-700 dark:text-purple-400">Possible Duplicates</div>
                                    <div className="text-xl font-extrabold text-purple-600 dark:text-purple-400 mt-0.5">{possibleDuplicateCount}</div>
                                </button>
                            </div>

                            {/* Toolbar Controls & Bulk Actions */}
                            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl">
                                
                                <div className="flex items-center gap-2 flex-1">
                                    {/* Search Input */}
                                    <div className="relative flex-1 max-w-xs">
                                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                                        <input 
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                            placeholder="Search name, email, company, phone..."
                                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    {/* Add Lead Row */}
                                    <button
                                        type="button"
                                        onClick={handleAddRow}
                                        className="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add Lead
                                    </button>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                    {/* Quick Bulk Actions */}
                                    <button
                                        type="button"
                                        onClick={() => handleBulkInclude(true)}
                                        className="btn btn-secondary btn-sm text-[11px] flex items-center gap-1"
                                        title="Select all ready records"
                                    >
                                        <CheckSquare className="w-3 h-3 text-emerald-600" />
                                        Include Ready
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleBulkExcludeDuplicates}
                                        className="btn btn-secondary btn-sm text-[11px] flex items-center gap-1"
                                        title="Exclude duplicates from import"
                                    >
                                        <XCircle className="w-3 h-3 text-amber-600" />
                                        Exclude Dups
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleBulkNormalize}
                                        className="btn btn-secondary btn-sm text-[11px] flex items-center gap-1"
                                        title="Trim whitespace and standardize phone formatting"
                                    >
                                        <RefreshCw className="w-3 h-3 text-blue-600" />
                                        Auto-Clean
                                    </button>

                                    {/* Download Converted File Dropdown */}
                                    <button
                                        type="button"
                                        onClick={() => handleExportConverted('CSV')}
                                        disabled={exporting}
                                        className="btn btn-secondary btn-sm text-[11px] flex items-center gap-1"
                                        title="Export normalized reviewed dataset to CSV"
                                    >
                                        <FileDown className="w-3 h-3 text-[#0D9488]" />
                                        Export CSV
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleExportConverted('XLSX')}
                                        disabled={exporting}
                                        className="btn btn-secondary btn-sm text-[11px] flex items-center gap-1"
                                        title="Export normalized reviewed dataset to Excel"
                                    >
                                        <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                                        Export XLSX
                                    </button>

                                    {/* Download Error Report if failures present */}
                                    {(invalidCount > 0 || duplicateCount > 0) && (
                                        <button
                                            type="button"
                                            onClick={handleExportErrors}
                                            disabled={exporting}
                                            className="btn btn-secondary btn-sm text-[11px] text-rose-600 hover:bg-rose-50 border-rose-200 flex items-center gap-1"
                                            title="Download rejected and excluded rows report"
                                        >
                                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                                            Error Report
                                        </button>
                                    )}

                                    {/* Toggle Original vs Normalized View */}
                                    <button
                                        type="button"
                                        onClick={() => setViewOriginalValues(prev => !prev)}
                                        className={`btn btn-secondary btn-sm text-[11px] flex items-center gap-1 ${viewOriginalValues ? 'border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/40' : ''}`}
                                    >
                                        {viewOriginalValues ? <EyeOff className="w-3 h-3 text-amber-600" /> : <Eye className="w-3 h-3 text-slate-500" />}
                                        {viewOriginalValues ? 'Original Raw View' : 'Normalized View'}
                                    </button>
                                </div>
                            </div>

                            {/* Interactive Editable Data Grid with Horizontal Scrollbar & Sticky # */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs bg-white dark:bg-slate-900">
                                <div className="w-full min-w-0 overflow-x-auto max-h-[380px] leads-table-scroll-container">
                                    <table className={`w-full text-left border-collapse ${showAllFields ? 'min-w-[2050px]' : 'min-w-[1200px]'}`}>
                                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider z-10">
                                            <tr>
                                                <th className="sticky left-0 top-0 z-30 px-3 py-3 text-center w-10 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                                                    #
                                                </th>
                                                <th className="px-3 py-3 text-center w-12">Include</th>
                                                <th className="px-3 py-3 min-w-[160px]">Full Name *</th>
                                                <th className="px-3 py-3 min-w-[200px]">Business Email *</th>
                                                <th className="px-3 py-3 min-w-[140px]">Company</th>
                                                <th className="px-3 py-3 min-w-[130px]">Phone</th>
                                                <th className="px-3 py-3 min-w-[120px]">Lead Source</th>
                                                <th className="px-3 py-3 min-w-[120px]">Status</th>

                                                {showAllFields && (
                                                    <>
                                                        <th className="px-3 py-3 min-w-[130px]">Industry</th>
                                                        <th className="px-3 py-3 min-w-[140px]">Service Req.</th>
                                                        <th className="px-3 py-3 min-w-[100px]">Priority</th>
                                                        <th className="px-3 py-3 min-w-[90px]">Currency</th>
                                                        <th className="px-3 py-3 min-w-[110px]">Est. Value</th>
                                                        <th className="px-3 py-3 min-w-[120px]">Closing Date</th>
                                                        <th className="px-3 py-3 min-w-[90px]">Prob (%)</th>
                                                        <th className="px-3 py-3 min-w-[140px]">Notes</th>
                                                    </>
                                                )}

                                                <th className="px-3 py-3 text-center min-w-[130px]">Validation</th>
                                                <th className="px-3 py-3 text-center w-12">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                                            {paginatedRows.length === 0 ? (
                                                <tr>
                                                    <td colSpan={showAllFields ? 18 : 10} className="px-4 py-8 text-center text-slate-400">
                                                        No lead records match the selected filter.
                                                    </td>
                                                </tr>
                                            ) : (
                                                paginatedRows.map((row, index) => {
                                                    const nameMissing = !row.fullName;
                                                    const emailError = !row.businessEmail || !EMAIL_REGEX.test(row.businessEmail);
                                                    const displayIndex = (currentPage - 1) * pageSize + index + 1;

                                                    return (
                                                        <tr key={row.id} className={`group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${!row.included ? 'opacity-60 bg-slate-50/40 dark:bg-slate-900/40' : ''}`}>
                                                            
                                                            {/* Sticky Row Index */}
                                                            <td className="sticky left-0 z-20 px-3 py-2 text-center text-slate-400 font-mono text-[11px] bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border-r border-slate-200 dark:border-slate-800 shadow-[1px_0_0_0_rgba(0,0,0,0.04)] transition-colors">
                                                                {displayIndex}
                                                            </td>

                                                            {/* Include Checkbox */}
                                                            <td className="px-3 py-2 text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={row.included}
                                                                    onChange={() => handleToggleInclude(row.id)}
                                                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                                    title={row.included ? "Included in import" : "Excluded from import"}
                                                                />
                                                            </td>

                                                            {/* Full Name */}
                                                            <td className="px-2 py-2">
                                                                <input
                                                                    type="text"
                                                                    value={viewOriginalValues ? (row.rawData?.fullName || row.fullName) : row.fullName}
                                                                    onChange={(e) => handleCellChange(row.id, 'fullName', e.target.value)}
                                                                    placeholder="Full Name"
                                                                    className={`w-full px-2.5 py-1 text-xs rounded-md border transition-all ${
                                                                        nameMissing 
                                                                            ? 'border-rose-400 bg-rose-50/60 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 focus:ring-rose-500' 
                                                                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-blue-500'
                                                                    } focus:outline-none focus:ring-2`}
                                                                />
                                                            </td>

                                                            {/* Business Email */}
                                                            <td className="px-2 py-2">
                                                                <input
                                                                    type="email"
                                                                    value={viewOriginalValues ? (row.rawData?.businessEmail || row.businessEmail) : row.businessEmail}
                                                                    onChange={(e) => handleCellChange(row.id, 'businessEmail', e.target.value)}
                                                                    placeholder="email@example.com"
                                                                    className={`w-full px-2.5 py-1 text-xs rounded-md border transition-all ${
                                                                        emailError 
                                                                            ? 'border-rose-400 bg-rose-50/60 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 focus:ring-rose-500' 
                                                                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-blue-500'
                                                                    } focus:outline-none focus:ring-2`}
                                                                />
                                                            </td>

                                                            {/* Company Name */}
                                                            <td className="px-2 py-2">
                                                                <input
                                                                    type="text"
                                                                    value={viewOriginalValues ? (row.rawData?.companyName || row.companyName) : row.companyName}
                                                                    onChange={(e) => handleCellChange(row.id, 'companyName', e.target.value)}
                                                                    placeholder="Company"
                                                                    className="w-full px-2.5 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                />
                                                            </td>

                                                            {/* Phone Number */}
                                                            <td className="px-2 py-2">
                                                                <input
                                                                    type="text"
                                                                    value={viewOriginalValues ? (row.rawData?.phoneNumber || row.phoneNumber) : row.phoneNumber}
                                                                    onChange={(e) => handleCellChange(row.id, 'phoneNumber', e.target.value)}
                                                                    placeholder="Phone"
                                                                    className="w-full px-2.5 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                />
                                                            </td>

                                                            {/* Lead Source */}
                                                            <td className="px-2 py-2">
                                                                <select
                                                                    value={row.leadSource}
                                                                    onChange={(e) => handleCellChange(row.id, 'leadSource', e.target.value)}
                                                                    className="w-full px-2 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                >
                                                                    <option value="WEBSITE">WEBSITE</option>
                                                                    <option value="REFERRAL">REFERRAL</option>
                                                                    <option value="EMAIL">EMAIL</option>
                                                                    <option value="PHONE">PHONE</option>
                                                                    <option value="WHATSAPP">WHATSAPP</option>
                                                                    <option value="LINKEDIN">LINKEDIN</option>
                                                                    <option value="ADVERTISEMENT">ADVERTISEMENT</option>
                                                                    <option value="PARTNER">PARTNER</option>
                                                                    <option value="OTHER">OTHER</option>
                                                                </select>
                                                            </td>

                                                            {/* Status */}
                                                            <td className="px-2 py-2">
                                                                <select
                                                                    value={row.leadStatus || 'NEW'}
                                                                    onChange={(e) => handleCellChange(row.id, 'leadStatus', e.target.value)}
                                                                    className="w-full px-2 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                >
                                                                    <option value="NEW">NEW</option>
                                                                    <option value="CONTACTED">CONTACTED</option>
                                                                    <option value="QUALIFIED">QUALIFIED</option>
                                                                    <option value="PROPOSAL">PROPOSAL</option>
                                                                    <option value="NEGOTIATION">NEGOTIATION</option>
                                                                    <option value="WON">WON</option>
                                                                    <option value="LOST">LOST</option>
                                                                </select>
                                                            </td>

                                                            {/* Extra Optional Fields */}
                                                            {showAllFields && (
                                                                <>
                                                                    <td className="px-2 py-2">
                                                                        <input
                                                                            type="text"
                                                                            value={row.industrySector}
                                                                            onChange={(e) => handleCellChange(row.id, 'industrySector', e.target.value)}
                                                                            placeholder="Industry"
                                                                            className="w-full px-2.5 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                        />
                                                                    </td>
                                                                    <td className="px-2 py-2">
                                                                        <input
                                                                            type="text"
                                                                            value={row.serviceRequired}
                                                                            onChange={(e) => handleCellChange(row.id, 'serviceRequired', e.target.value)}
                                                                            placeholder="Service"
                                                                            className="w-full px-2.5 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                        />
                                                                    </td>
                                                                    <td className="px-2 py-2">
                                                                        <select
                                                                            value={row.priority}
                                                                            onChange={(e) => handleCellChange(row.id, 'priority', e.target.value)}
                                                                            className="w-full px-2 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                        >
                                                                            <option value="LOW">LOW</option>
                                                                            <option value="MEDIUM">MEDIUM</option>
                                                                            <option value="HIGH">HIGH</option>
                                                                            <option value="URGENT">URGENT</option>
                                                                        </select>
                                                                    </td>
                                                                    <td className="px-2 py-2">
                                                                        <input
                                                                            type="text"
                                                                            value={row.currency}
                                                                            onChange={(e) => handleCellChange(row.id, 'currency', e.target.value)}
                                                                            placeholder="INR"
                                                                            className="w-full px-2 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                        />
                                                                    </td>
                                                                    <td className="px-2 py-2">
                                                                        <input
                                                                            type="number"
                                                                            value={row.estimatedValue}
                                                                            onChange={(e) => handleCellChange(row.id, 'estimatedValue', e.target.value)}
                                                                            placeholder="0"
                                                                            className="w-full px-2.5 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                        />
                                                                    </td>
                                                                    <td className="px-2 py-2">
                                                                        <input
                                                                            type="date"
                                                                            value={row.expectedClosingDate}
                                                                            onChange={(e) => handleCellChange(row.id, 'expectedClosingDate', e.target.value)}
                                                                            className="w-full px-2 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                        />
                                                                    </td>
                                                                    <td className="px-2 py-2">
                                                                        <input
                                                                            type="number"
                                                                            value={row.probability}
                                                                            onChange={(e) => handleCellChange(row.id, 'probability', e.target.value)}
                                                                            placeholder="0-100"
                                                                            className="w-full px-2 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                        />
                                                                    </td>
                                                                    <td className="px-2 py-2">
                                                                        <input
                                                                            type="text"
                                                                            value={row.notes}
                                                                            onChange={(e) => handleCellChange(row.id, 'notes', e.target.value)}
                                                                            placeholder="Notes"
                                                                            className="w-full px-2.5 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                        />
                                                                    </td>
                                                                </>
                                                            )}

                                                            {/* Validation Status Badge with Tooltips */}
                                                            <td className="px-3 py-2 text-center">
                                                                {row.status === 'VALID' && (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                                        Ready
                                                                    </span>
                                                                )}
                                                                {row.status === 'DUPLICATE' && (
                                                                    <span title={(row.errors || []).join('; ')} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 cursor-help">
                                                                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                                                                        Duplicate
                                                                    </span>
                                                                )}
                                                                {row.status === 'POSSIBLE_DUPLICATE' && (
                                                                    <span title={(row.warnings || []).join('; ')} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 cursor-help">
                                                                        <AlertTriangle className="w-3 h-3 text-purple-600" />
                                                                        Possible
                                                                    </span>
                                                                )}
                                                                {row.status === 'INVALID' && (
                                                                    <span title={(row.errors || []).join('; ')} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 cursor-help">
                                                                        <XCircle className="w-3 h-3 text-rose-600" />
                                                                        Error
                                                                    </span>
                                                                )}
                                                            </td>

                                                            {/* Action Delete */}
                                                            <td className="px-3 py-2 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteRow(row.id)}
                                                                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                                                                    title="Delete record"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </td>

                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Client-Side Pagination Bar for High-Performance Rendering */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 pt-1">
                                <div className="flex items-center gap-3">
                                    <span>
                                        Showing <span className="font-semibold text-slate-900 dark:text-white">{totalFiltered > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to <span className="font-semibold text-slate-900 dark:text-white">{Math.min(currentPage * pageSize, totalFiltered)}</span> of <span className="font-semibold text-slate-900 dark:text-white">{totalFiltered}</span> records
                                    </span>
                                    <div className="flex items-center gap-1 text-[11px]">
                                        <span>Per page:</span>
                                        <select
                                            value={pageSize}
                                            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                                            className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                                        >
                                            <option value={25}>25</option>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                            <option value={250}>250</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700"
                                        title="Previous page"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="px-2 font-medium">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700"
                                        title="Next page"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: SUMMARY RESULTS */}
                    {step === 4 && importResult && (
                        <div className="space-y-6 text-center py-4">
                            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>

                            <div>
                                <h4 className="text-lg font-extrabold text-slate-900 dark:text-white">
                                    {importResult.successCount} leads imported successfully
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Your CRM database has been updated with the converted lead records.
                                </p>
                            </div>

                            {/* Result Summary Box */}
                            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 max-w-lg mx-auto space-y-3 text-left">
                                <div className="flex items-center justify-between py-1.5 border-b border-slate-200 dark:border-slate-800 text-xs">
                                    <span className="font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Successfully Created:
                                    </span>
                                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                                        {importResult.successCount} leads
                                    </span>
                                </div>

                                <div className="flex items-center justify-between py-1.5 border-b border-slate-200 dark:border-slate-800 text-xs">
                                    <span className="font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        Duplicates Skipped:
                                    </span>
                                    <span className="font-extrabold text-amber-600 dark:text-amber-400 text-sm">
                                        {importResult.duplicateCount} leads
                                    </span>
                                </div>

                                <div className="flex items-center justify-between py-1.5 text-xs">
                                    <span className="font-medium text-rose-700 dark:text-rose-400 flex items-center gap-2">
                                        <XCircle className="w-4 h-4" />
                                        Failed / Skipped Rows:
                                    </span>
                                    <span className="font-extrabold text-rose-600 dark:text-rose-400 text-sm">
                                        {importResult.errorCount} rows
                                    </span>
                                </div>
                            </div>

                            {importResult.errorCount > 0 && (
                                <button
                                    type="button"
                                    onClick={handleExportErrors}
                                    className="btn btn-secondary btn-sm text-rose-600 hover:bg-rose-50 border-rose-200 mx-auto flex items-center gap-1.5"
                                >
                                    <FileDown className="w-4 h-4" />
                                    Download Import Error Audit Log
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 border-t border-[#D9E2EC] dark:border-slate-800 bg-white dark:bg-[#0B192C] flex items-center justify-between">
                    <div>
                        {step === 1 && (
                            <button
                                type="button"
                                onClick={handleDownloadTemplate}
                                className="btn btn-secondary btn-sm flex items-center gap-1.5"
                            >
                                <Download className="w-4 h-4 text-[#0D9488]" />
                                Download CSV Template
                            </button>
                        )}

                        {step === 2 && (
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="btn btn-secondary btn-sm flex items-center gap-1.5"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Re-upload File
                            </button>
                        )}

                        {step === 3 && (
                            <button
                                type="button"
                                onClick={() => setStep(2)}
                                className="btn btn-secondary btn-sm flex items-center gap-1.5"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Adjust Field Mappings
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {step !== 4 && (
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={importing}
                                className="btn btn-secondary btn-md"
                            >
                                Cancel
                            </button>
                        )}

                        {step === 1 && (
                            <button
                                type="button"
                                onClick={() => processFile(file, selectedSheet)}
                                disabled={!fileReady || loadingPreview}
                                className="btn btn-primary btn-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loadingPreview ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Inspecting File...
                                    </>
                                ) : (
                                    <>
                                        Continue to Field Mapping
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        )}

                        {step === 2 && (
                            <button
                                type="button"
                                onClick={() => setStep(3)}
                                className="btn btn-primary btn-md flex items-center gap-2"
                            >
                                Continue to Review Grid
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        )}

                        {step === 3 && (
                            <button
                                type="button"
                                onClick={handlePerformImport}
                                disabled={importing || includedCount === 0}
                                className="btn btn-primary btn-md flex items-center gap-2 bg-[#0D9488] hover:bg-[#0B7D73] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {importing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Importing Leads ({importProgress}%)...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Import {includedCount} {includedCount === 1 ? 'Lead' : 'Leads'}
                                    </>
                                )}
                            </button>
                        )}

                        {step === 4 && (
                            <button
                                type="button"
                                onClick={handleClose}
                                className="btn btn-primary btn-md bg-[#0D9488] hover:bg-[#0B7D73] text-white"
                            >
                                Done & Close
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
