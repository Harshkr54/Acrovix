import React, { useState, useRef, useEffect } from 'react';
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
    SlidersHorizontal,
    ChevronDown,
    ChevronUp,
    Eye,
    EyeOff,
    Filter,
    Sparkles
} from 'lucide-react';
import { 
    previewCrmLeadImport, 
    importCrmLeads, 
    importCrmLeadRecords, 
    downloadCrmLeadTemplate 
} from '../services/api';

const EMAIL_REGEX = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export default function LeadImportModal({ isOpen, onClose, onSuccess }) {
    const [step, setStep] = useState(1); // 1: Upload, 2: Smart Interactive Preview, 3: Summary Result
    const [file, setFile] = useState(null);
    const [fileReady, setFileReady] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [columnMapping, setColumnMapping] = useState({});
    
    // Smart Data Grid States
    const [rows, setRows] = useState([]);
    const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, VALID, INVALID, DUPLICATE
    const [searchQuery, setSearchQuery] = useState('');
    const [showAllFields, setShowAllFields] = useState(false);
    const [showMappingDrawer, setShowMappingDrawer] = useState(false);

    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    // Keyboard listener for Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    if (!isOpen) return null;

    const handleReset = () => {
        setStep(1);
        setFile(null);
        setFileReady(false);
        setPreviewData(null);
        setColumnMapping({});
        setRows([]);
        setFilterStatus('ALL');
        setSearchQuery('');
        setShowAllFields(false);
        setShowMappingDrawer(false);
        setImportResult(null);
        setError(null);
        setLoadingPreview(false);
        setImporting(false);
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    const validateSelectedFile = (selectedFile) => {
        if (!selectedFile) return { valid: false, error: null };

        if (selectedFile.size === 0) {
            return { valid: false, error: 'The selected file is empty.' };
        }

        if (selectedFile.size > 10 * 1024 * 1024) {
            return { valid: false, error: 'File is too large. Maximum allowed size is 10 MB.' };
        }

        const name = selectedFile.name.toLowerCase();
        const ext = name.includes('.') ? name.split('.').pop() : '';
        if (!['csv', 'xls', 'xlsx', 'pdf'].includes(ext)) {
            return { valid: false, error: 'Unsupported file type. Please upload a CSV, XLS, XLSX, or PDF file.' };
        }

        return { valid: true, error: null };
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
            // Auto-trigger parsing directly for immediate table view
            processFile(selectedFile);
        }
    };

    const validateRowRecord = (row, currentAllRows = []) => {
        const errors = [];
        const fullName = (row.fullName || '').trim();
        const businessEmail = (row.businessEmail || '').trim();

        if (!fullName) {
            errors.push('Full Name is required');
        }
        if (!businessEmail) {
            errors.push('Please enter a valid email address');
        } else if (!EMAIL_REGEX.test(businessEmail)) {
            errors.push('Please enter a valid email address');
        }

        // Check in-grid duplicate email
        const isDuplicateInGrid = currentAllRows.some(r => 
            r.id !== row.id && 
            r.businessEmail && 
            r.businessEmail.trim().toLowerCase() === businessEmail.toLowerCase() &&
            businessEmail !== ''
        );

        let status = 'VALID';
        if (row.isServerDuplicate || isDuplicateInGrid) {
            status = 'DUPLICATE';
            if (!errors.includes('Duplicate email address')) {
                errors.push(row.isServerDuplicate ? 'Email already exists in CRM' : 'Duplicate email address');
            }
        } else if (errors.length > 0) {
            status = 'INVALID';
        }

        return {
            ...row,
            fullName,
            businessEmail,
            status,
            errors
        };
    };

    const processFile = async (fileToProcess) => {
        try {
            setLoadingPreview(true);
            setError(null);
            const data = await previewCrmLeadImport(fileToProcess);
            setPreviewData(data);
            setColumnMapping(data.suggestedMapping || {});

            const rawRows = data.previewRows || [];
            if (rawRows.length === 0) {
                setError('Unable to extract records from this file. If you are uploading a PDF, ensure it contains text rather than scanned images, or download our CSV template.');
                setFileReady(false);
                return;
            }

            // Initialize Grid Rows from backend preview
            const parsedRows = rawRows.map((r, idx) => {
                const rowData = r.rowData || {};
                const initialRow = {
                    id: idx + 1,
                    rowIndex: r.rowIndex || (idx + 1),
                    fullName: r.fullName || rowData.fullName || rowData['Full Name'] || rowData.Name || '',
                    businessEmail: r.businessEmail || rowData.businessEmail || rowData['Business Email'] || rowData.Email || '',
                    companyName: r.companyName || rowData.companyName || rowData.Company || rowData.Organization || '',
                    phoneNumber: rowData.phoneNumber || rowData.Phone || rowData.Mobile || rowData['Contact Number'] || '',
                    industrySector: rowData.industrySector || rowData.Industry || rowData.Sector || '',
                    serviceRequired: rowData.serviceRequired || rowData.Requirement || rowData['Service Required'] || '',
                    leadSource: rowData.leadSource || rowData.Source || rowData['Lead Source'] || 'WEBSITE',
                    priority: rowData.priority || rowData.Priority || 'MEDIUM',
                    status: rowData.status || rowData.Status || 'NEW',
                    currency: rowData.currency || rowData.Currency || 'INR',
                    estimatedValue: rowData.estimatedValue || rowData['Estimated Value'] || '',
                    expectedClosingDate: rowData.expectedClosingDate || rowData['Expected Closing Date'] || '',
                    probability: rowData.probability || rowData.Probability || '',
                    notes: rowData.notes || rowData.Notes || rowData.Remarks || '',
                    assignedToId: rowData.assignedToId || rowData['Assigned Sales Rep ID'] || '',
                    isServerDuplicate: r.status === 'DUPLICATE',
                    status: r.status,
                    errors: r.errors || []
                };
                return initialRow;
            });

            // Re-validate row states
            const validated = parsedRows.map(row => validateRowRecord(row, parsedRows));
            setRows(validated);
            setStep(2);
        } catch (err) {
            console.error("Preview failed", err);
            setError(err.message || 'Unable to read this file. Ensure it is a valid CSV, Excel, or PDF document.');
            setFileReady(false);
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleProceedToPreview = () => {
        if (file && fileReady) {
            processFile(file);
        }
    };

    const handleMappingChange = (header, targetKey) => {
        const updatedMapping = {
            ...columnMapping,
            [header]: targetKey
        };
        setColumnMapping(updatedMapping);

        // Re-apply mapping to rows if header mapping changes
        setRows(prevRows => {
            return prevRows.map(row => {
                // Re-evaluate mapping for row if data comes from previewData
                return validateRowRecord(row, prevRows);
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
            fullName: '',
            businessEmail: '',
            companyName: '',
            phoneNumber: '',
            leadSource: 'WEBSITE',
            status: 'NEW',
            priority: 'MEDIUM',
            currency: 'INR',
            isServerDuplicate: false,
            status: 'INVALID',
            errors: ['Full Name is required', 'Business Email is required']
        }, rows);

        setRows([newRow, ...rows]);
    };

    const handlePerformImport = async () => {
        const validRows = rows.filter(r => r.status === 'VALID');
        if (validRows.length === 0) {
            setError('No valid lead records found to import. Please correct row errors or add valid leads.');
            return;
        }

        try {
            setImporting(true);
            setError(null);

            // Format DTO requests for backend
            const payload = validRows.map(r => ({
                fullName: r.fullName,
                businessEmail: r.businessEmail,
                companyName: r.companyName || null,
                phoneNumber: r.phoneNumber || null,
                industrySector: r.industrySector || null,
                serviceRequired: r.serviceRequired || null,
                leadSource: r.leadSource || 'WEBSITE',
                priority: r.priority || 'MEDIUM',
                status: r.status || 'NEW',
                currency: r.currency || 'INR',
                estimatedValue: r.estimatedValue ? parseFloat(r.estimatedValue) : null,
                expectedClosingDate: r.expectedClosingDate || null,
                probability: r.probability ? parseInt(r.probability) : null,
                notes: r.notes || null,
                assignedToId: r.assignedToId ? parseInt(r.assignedToId) : null
            }));

            const res = await importCrmLeadRecords(payload);
            setImportResult(res);
            setStep(3);
        } catch (err) {
            console.error("Import failed", err);
            setError(err.message || 'Failed to import leads.');
        } finally {
            setImporting(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            await downloadCrmLeadTemplate();
        } catch (err) {
            setError('Failed to download import template');
        }
    };

    const handleDownloadErrorReport = () => {
        if (!importResult || !importResult.errors || importResult.errors.length === 0) return;
        
        let csvContent = "Row,Full Name,Business Email,Error\n";
        importResult.errors.forEach(err => {
            const name = err.fullName ? `"${err.fullName.replace(/"/g, '""')}"` : '""';
            const email = err.businessEmail ? `"${err.businessEmail.replace(/"/g, '""')}"` : '""';
            const msg = err.errorMessage ? `"${err.errorMessage.replace(/"/g, '""')}"` : '""';
            csvContent += `${err.rowIndex},${name},${email},${msg}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `crm_lead_import_errors_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '0 B';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    // Filtered Rows for Grid Rendering
    const filteredRows = rows.filter(r => {
        // Status Filter
        if (filterStatus === 'VALID' && r.status !== 'VALID') return false;
        if (filterStatus === 'INVALID' && r.status !== 'INVALID') return false;
        if (filterStatus === 'DUPLICATE' && r.status !== 'DUPLICATE') return false;

        // Search Filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const nameMatch = (r.fullName || '').toLowerCase().includes(q);
            const emailMatch = (r.businessEmail || '').toLowerCase().includes(q);
            const companyMatch = (r.companyName || '').toLowerCase().includes(q);
            return nameMatch || emailMatch || companyMatch;
        }

        return true;
    });

    const validCount = rows.filter(r => r.status === 'VALID').length;
    const invalidCount = rows.filter(r => r.status === 'INVALID').length;
    const duplicateCount = rows.filter(r => r.status === 'DUPLICATE').length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#0B192C] border border-[#D9E2EC] dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#D9E2EC] dark:border-slate-800 bg-white dark:bg-[#0B192C]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB] shrink-0">
                            <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                Smart Bulk Lead Import
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                    <Sparkles className="w-3 h-3 text-blue-600" />
                                    Auto-Parsed
                                </span>
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Upload a spreadsheet or PDF. Review and edit extracted lead records before importing.
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={handleClose} 
                        aria-label="Close modal"
                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Simplified 3-Step Progress Indicator */}
                <div className="px-6 py-3 bg-[#F0FAFA] dark:bg-slate-900/50 border-b border-[#D9E2EC] dark:border-slate-800">
                    <div className="flex items-center justify-between max-w-md mx-auto text-xs">
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
                                Upload File
                            </span>
                        </div>
                        <div className={`flex-1 h-[2px] mx-3 transition-colors ${step > 1 ? 'bg-[#0D9488]' : 'bg-slate-200 dark:bg-slate-700'}`} />

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
                                Review & Edit
                            </span>
                        </div>
                        <div className={`flex-1 h-[2px] mx-3 transition-colors ${step > 2 ? 'bg-[#0D9488]' : 'bg-slate-200 dark:bg-slate-700'}`} />

                        {/* Step 3 */}
                        <div className="flex items-center gap-2">
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                step === 3 
                                    ? 'bg-[#0D9488] text-white shadow-xs' 
                                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 font-semibold'
                            }`}>
                                {step === 3 ? <Check className="w-4 h-4" /> : '3'}
                            </span>
                            <span className={`font-semibold ${step === 3 ? 'text-[#0D9488] font-bold' : 'text-slate-400'}`}>
                                Result
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

                    {/* STEP 1: UPLOAD FILE */}
                    {step === 1 && (
                        <div className="space-y-5">
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Upload Lead File</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Upload a CSV, Excel, or PDF document. We automatically extract and organize lead data into an editable table.
                                </p>
                            </div>

                            {loadingPreview ? (
                                <div className="border-2 border-dashed border-blue-300 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3 animate-in fade-in">
                                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    </div>
                                    <div>
                                        <h5 className="text-sm font-bold text-slate-900 dark:text-white">Reading your file...</h5>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Extracting contact details and checking formatting</p>
                                    </div>
                                </div>
                            ) : !fileReady ? (
                                <div 
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            fileInputRef.current?.click();
                                        }
                                    }}
                                    tabIndex={0}
                                    role="button"
                                    aria-label="Upload File. Click or drag and drop a file here"
                                    className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#2563EB] ${
                                        dragActive 
                                            ? 'border-[#14B8A6] bg-[#ECFEFF] dark:bg-teal-950/40 dark:border-teal-400' 
                                            : 'border-[#D9E2EC] hover:border-[#14B8A6] bg-slate-50/50 dark:bg-slate-900/30'
                                    }`}
                                >
                                    <input 
                                        ref={fileInputRef}
                                        type="file" 
                                        onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                                        className="hidden"
                                    />

                                    <div className="w-14 h-14 mx-auto rounded-full bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB] mb-3">
                                        <Upload className="w-7 h-7" />
                                    </div>
                                    <h5 className="text-sm font-bold text-slate-900 dark:text-white">Drag & drop your file here</h5>
                                    <p className="text-xs text-[#2563EB] font-semibold mt-1">or click to browse files</p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">Supports CSV, Excel (.xls, .xlsx), or text PDF up to 10 MB</p>
                                    
                                    <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2">
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleDownloadTemplate(); }}
                                            className="inline-flex items-center gap-1.5 text-xs text-teal-600 dark:text-teal-400 font-semibold hover:underline"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            Need a starting structure? Download CSV Template
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/20 flex items-center justify-between shadow-xs">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                                            <FileSpreadsheet className="w-5 h-5" />
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
                            )}
                        </div>
                    )}

                    {/* STEP 2: SMART EDITABLE DATA GRID PREVIEW */}
                    {step === 2 && previewData && (
                        <div className="space-y-4">
                            
                            {/* Client Summary Banner */}
                            <div className="flex items-center justify-between pb-1">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                                        {rows.length} records found
                                    </span>
                                    {invalidCount > 0 ? (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                                            {invalidCount} {invalidCount === 1 ? 'record needs attention' : 'records need attention'}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                            All records ready to import
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Top Summary Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFilterStatus('ALL')}
                                    className={`p-3 rounded-xl border text-left transition-all ${
                                        filterStatus === 'ALL'
                                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300'
                                    }`}
                                >
                                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Leads</div>
                                    <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{rows.length}</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFilterStatus('VALID')}
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
                                    onClick={() => setFilterStatus('INVALID')}
                                    className={`p-3 rounded-xl border text-left transition-all ${
                                        filterStatus === 'INVALID'
                                            ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 ring-2 ring-rose-500/20'
                                            : 'border-rose-200 bg-rose-50/30 dark:border-rose-900/60 dark:bg-rose-950/10 hover:border-rose-300'
                                    }`}
                                >
                                    <div className="text-[11px] font-semibold text-rose-700 dark:text-rose-400">Needs Correction</div>
                                    <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">{invalidCount}</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFilterStatus('DUPLICATE')}
                                    className={`p-3 rounded-xl border text-left transition-all ${
                                        filterStatus === 'DUPLICATE'
                                            ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 ring-2 ring-amber-500/20'
                                            : 'border-amber-200 bg-amber-50/30 dark:border-amber-900/60 dark:bg-amber-950/10 hover:border-amber-300'
                                    }`}
                                >
                                    <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">Duplicates</div>
                                    <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">{duplicateCount}</div>
                                </button>
                            </div>

                            {/* Toolbar Controls */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl">
                                
                                <div className="flex items-center gap-2 flex-1">
                                    {/* Search Input */}
                                    <div className="relative flex-1 max-w-xs">
                                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                                        <input 
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search name, email, company..."
                                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    {/* Add Row Button */}
                                    <button
                                        type="button"
                                        onClick={handleAddRow}
                                        className="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add Lead
                                    </button>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {/* Column Toggle */}
                                    <button
                                        type="button"
                                        onClick={() => setShowAllFields(prev => !prev)}
                                        className="btn btn-secondary btn-sm text-xs flex items-center gap-1.5"
                                    >
                                        {showAllFields ? <EyeOff className="w-3.5 h-3.5 text-slate-500" /> : <Eye className="w-3.5 h-3.5 text-slate-500" />}
                                        {showAllFields ? 'Show Main Columns' : 'Show All 15 Columns'}
                                    </button>

                                    {/* Column Mapping Drawer Toggle */}
                                    <button
                                        type="button"
                                        onClick={() => setShowMappingDrawer(prev => !prev)}
                                        className={`btn btn-secondary btn-sm text-xs flex items-center gap-1.5 ${showMappingDrawer ? 'border-blue-500 text-blue-600' : ''}`}
                                    >
                                        <SlidersHorizontal className="w-3.5 h-3.5" />
                                        Adjust Header Mapping
                                        {showMappingDrawer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    </button>
                                </div>
                            </div>

                            {/* Optional Header Mapping Drawer */}
                            {showMappingDrawer && (
                                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 dark:border-blue-900/60 dark:bg-blue-950/20 text-xs space-y-3 animate-in fade-in">
                                    <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                                        <span>Column Header Mapping Adjustments</span>
                                        <span className="text-[11px] font-normal text-slate-500">
                                            {Object.values(columnMapping || {}).filter(Boolean).length} of {(previewData?.fileHeaders || []).length} mapped
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {(previewData?.fileHeaders || []).map(header => (
                                            <div key={header} className="flex flex-col gap-1">
                                                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate" title={header}>
                                                    {header}:
                                                </label>
                                                <select
                                                    value={columnMapping[header] || ''}
                                                    onChange={(e) => handleMappingChange(header, e.target.value)}
                                                    className="px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100"
                                                >
                                                    <option value="">Do Not Import</option>
                                                    {(previewData?.supportedFields || []).map(f => (
                                                        <option key={f.key} value={f.key}>
                                                            {f.label} {f.required ? '*' : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Interactive Editable Data Grid */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs bg-white dark:bg-slate-900">
                                <div className="overflow-x-auto max-h-[380px]">
                                    <table className="w-full text-left border-collapse min-w-[850px]">
                                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider z-10">
                                            <tr>
                                                <th className="px-3 py-3 text-center w-10">#</th>
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

                                                <th className="px-3 py-3 text-center min-w-[110px]">Validation</th>
                                                <th className="px-3 py-3 text-center w-12">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                                            {filteredRows.length === 0 ? (
                                                <tr>
                                                    <td colSpan={showAllFields ? 17 : 9} className="px-4 py-8 text-center text-slate-400">
                                                        No lead records match the selected filter.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredRows.map((row, index) => {
                                                    const nameMissing = !row.fullName;
                                                    const emailError = !row.businessEmail || !EMAIL_REGEX.test(row.businessEmail);

                                                    return (
                                                        <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                                            
                                                            {/* Row Index */}
                                                            <td className="px-3 py-2 text-center text-slate-400 font-mono text-[11px]">
                                                                {index + 1}
                                                            </td>

                                                            {/* Full Name */}
                                                            <td className="px-2 py-2">
                                                                <input
                                                                    type="text"
                                                                    value={row.fullName}
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
                                                                    value={row.businessEmail}
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
                                                                    value={row.companyName}
                                                                    onChange={(e) => handleCellChange(row.id, 'companyName', e.target.value)}
                                                                    placeholder="Company"
                                                                    className="w-full px-2.5 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                />
                                                            </td>

                                                            {/* Phone Number */}
                                                            <td className="px-2 py-2">
                                                                <input
                                                                    type="text"
                                                                    value={row.phoneNumber}
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
                                                                    value={row.statusEnum || row.status === 'VALID' ? (row.leadStatus || 'NEW') : 'NEW'}
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
                                                                            className="w-full px-2 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                                                            className="w-full px-2 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                        />
                                                                    </td>
                                                                </>
                                                            )}

                                                            {/* Validation Status Badge */}
                                                            <td className="px-3 py-2 text-center">
                                                                {row.status === 'VALID' && (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                                        Ready
                                                                    </span>
                                                                )}
                                                                {row.status === 'DUPLICATE' && (
                                                                    <span title={(row.errors || []).join('; ')} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                                                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                                                                        Duplicate
                                                                    </span>
                                                                )}
                                                                {row.status === 'INVALID' && (
                                                                    <span title={(row.errors || []).join('; ')} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
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
                        </div>
                    )}

                    {/* STEP 3: SUMMARY RESULT */}
                    {step === 3 && importResult && (
                        <div className="space-y-6 text-center py-4">
                            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>

                            <div>
                                <h4 className="text-lg font-extrabold text-slate-900 dark:text-white">
                                    {importResult.successCount} leads imported successfully
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Your CRM lead database has been updated with the new records.
                                </p>
                            </div>

                            {/* Result Summary Box */}
                            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 max-w-lg mx-auto space-y-3 text-left">
                                <div className="flex items-center justify-between py-1.5 border-b border-slate-200 dark:border-slate-800 text-xs">
                                    <span className="font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Successfully Imported:
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
                                        Invalid Rows Skipped:
                                    </span>
                                    <span className="font-extrabold text-rose-600 dark:text-rose-400 text-sm">
                                        {importResult.errorCount} rows
                                    </span>
                                </div>
                            </div>
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
                    </div>

                    <div className="flex items-center gap-2">
                        {step !== 3 && (
                            <button
                                type="button"
                                onClick={handleClose}
                                className="btn btn-secondary btn-md"
                            >
                                Cancel
                            </button>
                        )}

                        {step === 1 && (
                            <button
                                type="button"
                                onClick={handleProceedToPreview}
                                disabled={!fileReady || loadingPreview}
                                className="btn btn-primary btn-md flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loadingPreview ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Parsing File...
                                    </>
                                ) : (
                                    <>
                                        Continue to Data Grid
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        )}

                        {step === 2 && (
                            <button
                                type="button"
                                onClick={handlePerformImport}
                                disabled={importing || validCount === 0}
                                className="btn btn-primary btn-md flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {importing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Importing Leads...
                                    </>
                                ) : (
                                    <>
                                        Import {validCount} Valid Leads
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        )}

                        {step === 3 && (
                            <div className="flex items-center gap-3">
                                {importResult && importResult.errors && importResult.errors.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleDownloadErrorReport}
                                        className="btn btn-secondary btn-md flex items-center gap-2"
                                    >
                                        <Download className="w-4 h-4 text-rose-500" />
                                        Download Error Report
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => {
                                        onSuccess();
                                        handleClose();
                                    }}
                                    className="btn btn-primary btn-md px-8 bg-[#2563EB] hover:bg-blue-700 text-white"
                                >
                                    View Leads
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
