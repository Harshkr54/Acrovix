import React, { useState, useRef } from 'react';
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
    Building2,
    Check
} from 'lucide-react';
import { previewCrmLeadImport, importCrmLeads, downloadCrmLeadTemplate } from '../services/api';

export default function LeadImportModal({ isOpen, onClose, onSuccess }) {
    const [step, setStep] = useState(1); // 1: Upload, 2: Mapping, 3: Preview, 4: Summary
    const [file, setFile] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [columnMapping, setColumnMapping] = useState({});
    
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleReset = () => {
        setStep(1);
        setFile(null);
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

    const handleFileSelect = (selectedFile) => {
        if (!selectedFile) return;
        
        const name = selectedFile.name.toLowerCase();
        if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls')) {
            setError('Invalid file format. Please upload a CSV, XLSX, or XLS file.');
            return;
        }

        if (selectedFile.size > 10 * 1024 * 1024) {
            setError('File size exceeds the 10MB limit.');
            return;
        }

        setError(null);
        setFile(selectedFile);
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
        if (!file) return;
        try {
            setLoadingPreview(true);
            setError(null);
            const data = await previewCrmLeadImport(file);
            setPreviewData(data);
            setColumnMapping(data.suggestedMapping || {});
            setStep(2);
        } catch (err) {
            console.error("Preview failed", err);
            setError(err.message || 'Failed to process file preview.');
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
        // Validate required field mappings
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
        if (!file) return;
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#0B192C] border border-border-subtle rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-main/40">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB]">
                            <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-text-primary">Import CRM Leads</h3>
                            <p className="text-xs text-text-muted">
                                {step === 1 && "Step 1 of 4: Select and upload file"}
                                {step === 2 && "Step 2 of 4: Map spreadsheet columns to CRM fields"}
                                {step === 3 && "Step 3 of 4: Data preview & row validation"}
                                {step === 4 && "Step 4 of 4: Import Summary & Execution Result"}
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={handleClose} 
                        className="p-1.5 text-text-muted hover:text-text-primary rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Step Indicator */}
                <div className="px-6 py-2.5 bg-[#F0FAFA] dark:bg-slate-900/50 border-b border-border-subtle flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-[#2563EB] text-white' : 'bg-slate-200 text-slate-500'}`}>1</span>
                        <span className={step >= 1 ? 'font-semibold text-text-primary' : 'text-text-muted'}>Upload</span>
                    </div>
                    <div className="w-8 h-[2px] bg-slate-300 dark:bg-slate-700" />

                    <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-[#2563EB] text-white' : 'bg-slate-200 text-slate-500'}`}>2</span>
                        <span className={step >= 2 ? 'font-semibold text-text-primary' : 'text-text-muted'}>Mapping</span>
                    </div>
                    <div className="w-8 h-[2px] bg-slate-300 dark:bg-slate-700" />

                    <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${step >= 3 ? 'bg-[#2563EB] text-white' : 'bg-slate-200 text-slate-500'}`}>3</span>
                        <span className={step >= 3 ? 'font-semibold text-text-primary' : 'text-text-muted'}>Preview</span>
                    </div>
                    <div className="w-8 h-[2px] bg-slate-300 dark:bg-slate-700" />

                    <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${step >= 4 ? 'bg-[#0D9488] text-white' : 'bg-slate-200 text-slate-500'}`}>4</span>
                        <span className={step >= 4 ? 'font-semibold text-text-primary' : 'text-text-muted'}>Result</span>
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                        <span className="flex-1 font-medium">{error}</span>
                    </div>
                )}

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto flex-1">

                    {/* STEP 1: UPLOAD */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-sm font-bold text-text-primary">Upload CSV or Excel Spreadsheet</h4>
                                <p className="text-xs text-text-muted mt-1">
                                    Upload a CSV, XLS, or XLSX file containing multiple CRM leads to import. Max file size: 10MB.
                                </p>
                            </div>

                            {/* Drag Drop Area */}
                            <div 
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                                    dragActive 
                                        ? 'border-[#2563EB] bg-[#2563EB]/5' 
                                        : 'border-border-subtle hover:border-[#0D9488] bg-bg-main/20'
                                }`}
                            >
                                <input 
                                    ref={fileInputRef}
                                    type="file" 
                                    accept=".csv, .xlsx, .xls"
                                    onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                                    className="hidden"
                                />

                                <div className="w-14 h-14 mx-auto rounded-full bg-[#0D9488]/10 flex items-center justify-center text-[#0D9488] mb-3">
                                    <Upload className="w-6 h-6" />
                                </div>
                                <h5 className="text-sm font-bold text-text-primary">Drop your file here, or browse files</h5>
                                <p className="text-xs text-text-muted mt-1">Supports CSV, XLS, XLSX formats (up to 10MB)</p>
                            </div>

                            {/* Selected File Card */}
                            {file && (
                                <div className="p-4 rounded-xl border border-border-subtle bg-bg-card flex items-center justify-between shadow-xs">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB]">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-text-primary">{file.name}</div>
                                            <div className="text-[11px] text-text-muted">
                                                {formatFileSize(file.size)} • {file.name.split('.').pop().toUpperCase()}
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                        className="btn btn-secondary btn-icon"
                                        title="Remove File"
                                    >
                                        <Trash2 className="w-4 h-4 text-rose-500" />
                                    </button>
                                </div>
                            )}

                            {/* Action Row */}
                            <div className="pt-4 border-t border-border-subtle flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={handleDownloadTemplate}
                                    className="btn btn-secondary btn-sm flex items-center gap-1.5"
                                >
                                    <Download className="w-4 h-4 text-[#0D9488]" />
                                    Download CSV Template
                                </button>

                                <button
                                    type="button"
                                    onClick={handleProceedToMapping}
                                    disabled={!file || loadingPreview}
                                    className="btn btn-primary btn-md flex items-center gap-2"
                                >
                                    {loadingPreview ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Parsing Sheet...
                                        </>
                                    ) : (
                                        <>
                                            Continue to Mapping
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: COLUMN MAPPING */}
                    {step === 2 && previewData && (
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-sm font-bold text-text-primary">Map Spreadsheet Columns to CRM Lead Fields</h4>
                                <p className="text-xs text-text-muted mt-1">
                                    Verify or adjust column mappings. Required CRM fields are marked with an asterisk (*).
                                </p>
                            </div>

                            <div className="border border-border-subtle rounded-xl overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-bg-main/60 border-b border-border-subtle text-[11px] font-bold text-text-muted uppercase">
                                            <th className="px-4 py-3">Spreadsheet Column Header</th>
                                            <th className="px-4 py-3 text-center w-12">Match</th>
                                            <th className="px-4 py-3">CRM Lead Target Field</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-subtle text-xs">
                                        {previewData.fileHeaders.map((header) => {
                                            const currentMappedKey = columnMapping[header] || '';
                                            const isAutoSuggested = previewData.suggestedMapping && previewData.suggestedMapping[header] === currentMappedKey && currentMappedKey !== '';

                                            return (
                                                <tr key={header} className="hover:bg-bg-hover/30">
                                                    <td className="px-4 py-3 font-semibold text-text-primary">
                                                        {header}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {isAutoSuggested ? (
                                                            <span title="Auto-suggested match" className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                                                <Check className="w-3 h-3" />
                                                            </span>
                                                        ) : currentMappedKey ? (
                                                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                                                                <Check className="w-3 h-3" />
                                                            </span>
                                                        ) : (
                                                            <span className="text-text-muted text-[10px]">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <select
                                                            value={currentMappedKey}
                                                            onChange={(e) => handleMappingChange(header, e.target.value)}
                                                            className="w-full max-w-md px-3 py-1.5 text-xs bg-bg-main border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                                                        >
                                                            <option value="">Do Not Import This Column</option>
                                                            {previewData.supportedFields.map(f => (
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

                            {/* Action Bar */}
                            <div className="pt-4 border-t border-border-subtle flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="btn btn-secondary btn-sm flex items-center gap-1.5"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Upload
                                </button>

                                <button
                                    type="button"
                                    onClick={handleProceedToPreview}
                                    className="btn btn-primary btn-md flex items-center gap-2"
                                >
                                    Preview Data & Validation
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: PREVIEW & ROW VALIDATION */}
                    {step === 3 && previewData && (
                        <div className="space-y-5">
                            <div>
                                <h4 className="text-sm font-bold text-text-primary">Review Data Preview & Validation Results</h4>
                                <p className="text-xs text-text-muted mt-1">
                                    No records are inserted into database during preview. Duplicates and invalid records will be skipped during import.
                                </p>
                            </div>

                            {/* Summary KPI Cards */}
                            <div className="grid grid-cols-4 gap-3">
                                <div className="p-3 rounded-xl border border-border-subtle bg-bg-card text-center">
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
                            <div className="border border-border-subtle rounded-xl overflow-hidden">
                                <div className="acx-table-container max-h-[320px]">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 bg-bg-main border-b border-border-subtle text-[11px] font-bold text-text-muted uppercase z-10">
                                            <tr>
                                                <th className="px-4 py-2.5 w-14">Row</th>
                                                <th className="px-4 py-2.5">Full Name</th>
                                                <th className="px-4 py-2.5">Business Email</th>
                                                <th className="px-4 py-2.5">Company</th>
                                                <th className="px-4 py-2.5 text-right">Validation Result</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border-subtle text-xs">
                                            {previewData.previewRows.map((row) => (
                                                <tr key={row.rowIndex} className="hover:bg-bg-hover/30">
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

                            {/* Action Bar */}
                            <div className="pt-4 border-t border-border-subtle flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="btn btn-secondary btn-sm flex items-center gap-1.5"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Mapping
                                </button>

                                <button
                                    type="button"
                                    onClick={handlePerformImport}
                                    disabled={importing || previewData.validCount === 0}
                                    className="btn btn-primary btn-md flex items-center gap-2"
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
                            <div className="p-6 rounded-2xl border border-border-subtle bg-bg-card max-w-lg mx-auto space-y-3 text-left">
                                <div className="flex items-center justify-between py-1.5 border-b border-border-subtle text-xs">
                                    <span className="font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Successfully Imported:
                                    </span>
                                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                                        {importResult.successCount} leads
                                    </span>
                                </div>

                                <div className="flex items-center justify-between py-1.5 border-b border-border-subtle text-xs">
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

                            {/* Action Bar */}
                            <div className="pt-4 flex items-center justify-center gap-3">
                                {importResult.errors && importResult.errors.length > 0 && (
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
                                    className="btn btn-primary btn-md px-8"
                                >
                                    View Leads
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
