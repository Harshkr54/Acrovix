import React, { useState, useRef, useEffect } from 'react';
import { 
    Upload, 
    FileText, 
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
    Check
} from 'lucide-react';
import { previewCrmLeadImport, importCrmLeads, downloadCrmLeadTemplate } from '../services/api';

export default function LeadImportModal({ isOpen, onClose, onSuccess }) {
    const [step, setStep] = useState(1); // 1: Upload, 2: Mapping, 3: Preview, 4: Summary
    const [file, setFile] = useState(null);
    const [fileReady, setFileReady] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [columnMapping, setColumnMapping] = useState({});
    
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    // Escape key listener for modal close
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
        }
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

    const handleProceedToMapping = async () => {
        if (!file || !fileReady) return;
        try {
            setLoadingPreview(true);
            setError(null);
            const data = await previewCrmLeadImport(file);
            setPreviewData(data);
            setColumnMapping(data.suggestedMapping || {});
            setStep(2);
        } catch (err) {
            console.error("Preview failed", err);
            setError(err.message || 'Unable to read this file. Please upload a valid CSV or Excel file.');
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleMappingChange = (header, targetKey) => {
        setColumnMapping(prev => ({
            ...prev,
            [header]: targetKey
        }));
    };

    const handleProceedToPreview = () => {
        const mappedTargets = Object.values(columnMapping);
        if (!mappedTargets.includes('fullName')) {
            setError('Please map a column to Full Name (Required field)');
            return;
        }
        if (!mappedTargets.includes('businessEmail')) {
            setError('Please map a column to Business Email (Required field)');
            return;
        }

        setError(null);
        setStep(3);
    };

    const handlePerformImport = async () => {
        if (!file || !fileReady) return;
        try {
            setImporting(true);
            setError(null);
            const res = await importCrmLeads(file, columnMapping);
            setImportResult(res);
            setStep(4);
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

    const getSampleValue = (header) => {
        if (!previewData || !previewData.previewRows) return '—';
        for (const row of previewData.previewRows) {
            if (row.rowData && row.rowData[header] !== undefined && row.rowData[header] !== null && String(row.rowData[header]).trim() !== '') {
                return String(row.rowData[header]).trim();
            }
        }
        return '—';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#0B192C] border border-[#D9E2EC] dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#D9E2EC] dark:border-slate-800 bg-white dark:bg-[#0B192C]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB] shrink-0">
                            <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-text-primary">Import CRM Leads</h3>
                            <p className="text-xs text-text-muted">
                                Upload a spreadsheet and create multiple CRM leads.
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={handleClose} 
                        aria-label="Close modal"
                        className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Step Indicator */}
                <div className="px-6 py-3 bg-[#F0FAFA] dark:bg-slate-900/50 border-b border-[#D9E2EC] dark:border-slate-800">
                    <div className="flex items-center justify-between max-w-xl mx-auto text-xs">
                        {/* Step 1 */}
                        <div className="flex items-center gap-2">
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                step > 1 
                                    ? 'bg-[#0D9488] text-white' 
                                    : step === 1 
                                        ? 'bg-[#2563EB] text-white shadow-xs' 
                                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 font-semibold'
                            }`}>
                                {step > 1 ? <Check className="w-4 h-4" /> : '1'}
                            </span>
                            <span className={`font-semibold ${step === 1 ? 'text-text-primary font-bold' : step > 1 ? 'text-[#0D9488]' : 'text-text-muted'}`}>
                                Upload
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
                            <span className={`font-semibold ${step === 2 ? 'text-text-primary font-bold' : step > 2 ? 'text-[#0D9488]' : 'text-text-muted'}`}>
                                Mapping
                            </span>
                        </div>
                        <div className={`flex-1 h-[2px] mx-3 transition-colors ${step > 2 ? 'bg-[#0D9488]' : 'bg-slate-200 dark:bg-slate-700'}`} />

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
                            <span className={`font-semibold ${step === 3 ? 'text-text-primary font-bold' : step > 3 ? 'text-[#0D9488]' : 'text-text-muted'}`}>
                                Preview
                            </span>
                        </div>
                        <div className={`flex-1 h-[2px] mx-3 transition-colors ${step > 3 ? 'bg-[#0D9488]' : 'bg-slate-200 dark:bg-slate-700'}`} />

                        {/* Step 4 */}
                        <div className="flex items-center gap-2">
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                step === 4 
                                    ? 'bg-[#0D9488] text-white shadow-xs' 
                                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 font-semibold'
                            }`}>
                                {step === 4 ? <Check className="w-4 h-4" /> : '4'}
                            </span>
                            <span className={`font-semibold ${step === 4 ? 'text-[#0D9488] font-bold' : 'text-text-muted'}`}>
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

                    {/* STEP 1: UPLOAD */}
                    {step === 1 && (
                        <div className="space-y-5">
                            <div>
                                <h4 className="text-sm font-bold text-text-primary">Upload Lead File</h4>
                                <p className="text-xs text-text-muted mt-0.5">
                                    Select a CSV, Excel, or PDF file containing your leads to get started.
                                </p>
                            </div>

                            {!fileReady ? (
                                /* Drop Zone */
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
                                    aria-label="Upload Lead File. Click or drag and drop a file here"
                                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#2563EB] ${
                                        dragActive 
                                            ? 'border-[#14B8A6] bg-[#ECFEFF] dark:bg-teal-950/40 dark:border-teal-400' 
                                            : 'border-[#D9E2EC] hover:border-[#14B8A6] bg-slate-50/50 dark:bg-slate-900/30'
                                    }`}
                                >
                                    {/* Unrestricted File Input */}
                                    <input 
                                        ref={fileInputRef}
                                        type="file" 
                                        onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                                        className="hidden"
                                    />

                                    <div className="w-12 h-12 mx-auto rounded-full bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB] mb-3">
                                        <Upload className="w-6 h-6" />
                                    </div>
                                    <h5 className="text-sm font-bold text-text-primary">Drag & drop your file here</h5>
                                    <p className="text-xs text-[#2563EB] font-semibold mt-1">or Browse Files</p>
                                    <p className="text-[11px] text-text-muted mt-2">Select any file and we'll validate it before importing</p>
                                    <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] text-text-muted font-medium">
                                        <span>CSV • XLS • XLSX • PDF</span>
                                        <span>•</span>
                                        <span>Max 10 MB</span>
                                    </div>
                                </div>

                            ) : (
                                /* Compact Selected File Card */
                                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/20 flex items-center justify-between shadow-xs">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                                            <FileSpreadsheet className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-text-primary">{file.name}</span>
                                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    File ready
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-text-muted mt-0.5">
                                                {file.name.split('.').pop().toUpperCase()} • {formatFileSize(file.size)}
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
                                        Remove
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2: COLUMN MAPPING */}
                    {step === 2 && previewData && (
                        <div className="space-y-4">
                            {/* Header & Counter Bar */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-blue-50/60 dark:bg-slate-800/50 border border-blue-100 dark:border-slate-700">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                        Map Spreadsheet Columns to CRM Lead Fields
                                    </h4>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                                        Match each uploaded column to its corresponding CRM field. Mandatory fields are marked with an asterisk (<span className="text-rose-500 font-bold">*</span>).
                                    </p>
                                </div>
                                <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    <span>
                                        {Object.values(columnMapping).filter(Boolean).length} of {previewData.fileHeaders.length} columns mapped
                                    </span>
                                </div>
                            </div>

                            {/* Required Fields Warning Banner */}
                            {(!Object.values(columnMapping).includes('fullName') || !Object.values(columnMapping).includes('businessEmail')) && (
                                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2.5">
                                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                    <div className="font-medium">
                                        <span className="font-bold">Action Required: </span>
                                        {!Object.values(columnMapping).includes('fullName') && !Object.values(columnMapping).includes('businessEmail') ? (
                                            <span>Please map columns for <strong className="font-bold text-amber-900 dark:text-amber-200">Full Name *</strong> and <strong className="font-bold text-amber-900 dark:text-amber-200">Business Email *</strong>.</span>
                                        ) : !Object.values(columnMapping).includes('fullName') ? (
                                            <span>Please map a column for <strong className="font-bold text-amber-900 dark:text-amber-200">Full Name *</strong>.</span>
                                        ) : (
                                            <span>Please map a column for <strong className="font-bold text-amber-900 dark:text-amber-200">Business Email *</strong>.</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Redesigned Mapping Table */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs bg-white dark:bg-slate-900">
                                <div className="overflow-x-auto max-h-[360px]">
                                    <table className="w-full text-left border-collapse min-w-[600px]">
                                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider z-10">
                                            <tr>
                                                <th className="px-4 py-3">Uploaded Column</th>
                                                <th className="px-4 py-3">Sample Value</th>
                                                <th className="px-4 py-3 min-w-[220px]">Map To CRM Field</th>
                                                <th className="px-4 py-3 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                                            {previewData.fileHeaders.map((header) => {
                                                const currentMappedKey = columnMapping[header] || '';
                                                const sampleValue = getSampleValue(header);
                                                const targetFieldMeta = previewData.supportedFields.find(f => f.key === currentMappedKey);

                                                return (
                                                    <tr key={header} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                                                            {header}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-[11px] max-w-[180px] truncate" title={sampleValue}>
                                                            {sampleValue !== '—' ? `"${sampleValue}"` : <span className="text-slate-400 dark:text-slate-600 font-sans italic">No sample</span>}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <select
                                                                value={currentMappedKey}
                                                                onChange={(e) => handleMappingChange(header, e.target.value)}
                                                                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                                                            >
                                                                <option value="" className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                                    — Do Not Import —
                                                                </option>
                                                                <optgroup label="Required Fields *" className="bg-white dark:bg-slate-800 text-slate-500 font-bold">
                                                                    {previewData.supportedFields.filter(f => f.required).map(f => (
                                                                        <option key={f.key} value={f.key} className="bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 font-bold">
                                                                            {f.label} *
                                                                        </option>
                                                                    ))}
                                                                </optgroup>
                                                                <optgroup label="Optional Fields" className="bg-white dark:bg-slate-800 text-slate-500 font-bold">
                                                                    {previewData.supportedFields.filter(f => !f.required).map(f => (
                                                                        <option key={f.key} value={f.key} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                                                                            {f.label}
                                                                        </option>
                                                                    ))}
                                                                </optgroup>
                                                            </select>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            {targetFieldMeta ? (
                                                                targetFieldMeta.required ? (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                                        Matched (Required)
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                                        <Check className="w-3.5 h-3.5 text-blue-600" />
                                                                        Matched
                                                                    </span>
                                                                )
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                                                    Ignored
                                                                </span>
                                                            )}
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

                    {/* STEP 3: PREVIEW & ROW VALIDATION */}
                    {step === 3 && previewData && (
                        <div className="space-y-5">
                            <div>
                                <h4 className="text-sm font-bold text-text-primary">Review Data Preview & Validation Results</h4>
                                <p className="text-xs text-text-muted mt-1">
                                    Previewing lead validation. Duplicates and invalid rows will be safely skipped during import.
                                </p>
                            </div>

                            {/* Summary KPI Cards */}
                            <div className="grid grid-cols-4 gap-3">
                                <div className="p-3 rounded-xl border border-[#D9E2EC] dark:border-slate-800 bg-white dark:bg-slate-900/40 text-center">
                                    <div className="text-[11px] font-semibold text-text-muted">Total Rows</div>
                                    <div className="text-lg font-extrabold text-text-primary mt-0.5">{previewData.totalRows}</div>
                                </div>
                                <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20 text-center">
                                    <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Valid Rows</div>
                                    <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{previewData.validCount}</div>
                                </div>
                                <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20 text-center">
                                    <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">Duplicates</div>
                                    <div className="text-lg font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">{previewData.duplicateCount}</div>
                                </div>
                                <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20 text-center">
                                    <div className="text-[11px] font-semibold text-rose-700 dark:text-rose-400">Invalid Rows</div>
                                    <div className="text-lg font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">{previewData.invalidCount}</div>
                                </div>
                            </div>

                            {/* Row Preview Table */}
                            <div className="border border-[#D9E2EC] dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                                <div className="acx-table-container max-h-[300px]">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 border-b border-[#D9E2EC] dark:border-slate-800 text-[11px] font-bold text-text-muted uppercase z-10">
                                            <tr>
                                                <th className="px-4 py-2.5 w-14">Row</th>
                                                <th className="px-4 py-2.5">Full Name</th>
                                                <th className="px-4 py-2.5">Business Email</th>
                                                <th className="px-4 py-2.5">Company</th>
                                                <th className="px-4 py-2.5 text-right">Validation Result</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#D9E2EC] dark:divide-slate-800 text-xs">
                                            {previewData.previewRows.map((row) => (
                                                <tr key={row.rowIndex} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                                                    <td className="px-4 py-2.5 font-bold text-text-muted">{row.rowIndex}</td>
                                                    <td className="px-4 py-2.5 font-semibold text-text-primary">
                                                        {row.fullName || <span className="text-rose-500 italic">Missing</span>}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-text-secondary">
                                                        {row.businessEmail || <span className="text-rose-500 italic">Missing</span>}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-text-muted">
                                                        {row.companyName || '—'}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right">
                                                        {row.status === 'VALID' && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                Valid
                                                            </span>
                                                        )}
                                                        {row.status === 'DUPLICATE' && (
                                                            <span title={row.errors.join('; ')} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                                                <AlertTriangle className="w-3.5 h-3.5" />
                                                                Duplicate
                                                            </span>
                                                        )}
                                                        {row.status === 'INVALID' && (
                                                            <span title={row.errors.join('; ')} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                                                <XCircle className="w-3.5 h-3.5" />
                                                                Invalid
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: IMPORT SUMMARY RESULT */}
                    {step === 4 && importResult && (
                        <div className="space-y-6 text-center py-4">
                            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>

                            <div>
                                <h4 className="text-lg font-extrabold text-text-primary">Import Process Completed</h4>
                                <p className="text-xs text-text-muted mt-1">
                                    The bulk CRM lead import operation has finished processing.
                                </p>
                            </div>

                            {/* Result Summary Box */}
                            <div className="p-6 rounded-2xl border border-[#D9E2EC] dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 max-w-lg mx-auto space-y-3 text-left">
                                <div className="flex items-center justify-between py-1.5 border-b border-[#D9E2EC] dark:border-slate-800 text-xs">
                                    <span className="font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Successfully Imported:
                                    </span>
                                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                                        {importResult.successCount} leads
                                    </span>
                                </div>

                                <div className="flex items-center justify-between py-1.5 border-b border-[#D9E2EC] dark:border-slate-800 text-xs">
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

                        {(step === 2 || step === 3) && (
                            <button
                                type="button"
                                onClick={() => setStep(prev => prev - 1)}
                                className="btn btn-secondary btn-sm flex items-center gap-1.5"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {step !== 4 && (
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
                                onClick={handleProceedToMapping}
                                disabled={!fileReady || loadingPreview}
                                className="btn btn-primary btn-md flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loadingPreview ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Reading File...
                                    </>
                                ) : (
                                    <>
                                        Continue to Mapping
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        )}

                        {step === 2 && (
                            <button
                                type="button"
                                onClick={handleProceedToPreview}
                                className="btn btn-primary btn-md flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white"
                            >
                                Preview Data & Validation
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        )}

                        {step === 3 && (
                            <button
                                type="button"
                                onClick={handlePerformImport}
                                disabled={importing || previewData.validCount === 0}
                                className="btn btn-primary btn-md flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {importing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Importing Leads...
                                    </>
                                ) : (
                                    <>
                                        Import {previewData.validCount} Valid Leads
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        )}

                        {step === 4 && (
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
