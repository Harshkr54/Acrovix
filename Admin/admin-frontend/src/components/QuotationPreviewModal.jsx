import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, FileText, Download, AlertCircle, RefreshCw } from 'lucide-react';

export default function QuotationPreviewModal({ 
    isOpen, 
    onClose, 
    pdfBlobUrl, 
    emailDetails, 
    isLoading, 
    error,
    onRetry
}) {
    const [activeTab, setActiveTab] = useState('pdf');

    if (!isOpen) return null;

    const modalContent = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1200px] h-[90vh] flex flex-col relative z-10 overflow-hidden border border-border-subtle animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-slate-50">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-[#4F46E5]/10 rounded-xl flex items-center justify-center">
                            <FileText className="w-5 h-5 text-[#4F46E5]" />
                        </div>
                        <div>
                            <h2 className="text-[16px] font-bold text-slate-800 tracking-tight leading-none">Quotation Preview</h2>
                            <p className="text-[12px] text-slate-500 mt-1">Review exactly what the client will see before sending</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        {pdfBlobUrl && !isLoading && !error && (
                            <a 
                                href={pdfBlobUrl} 
                                download={emailDetails?.filename || 'quotation-preview.pdf'}
                                className="inline-flex items-center px-4 py-2 bg-white border border-slate-200 hover:border-[#4F46E5] hover:text-[#4F46E5] hover:bg-slate-50 rounded-xl text-[13px] font-semibold text-slate-700 transition-colors shadow-sm"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Download PDF
                            </a>
                        )}
                        <button 
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left Sidebar - Tabs */}
                    <div className="w-64 bg-slate-50 border-r border-border-subtle flex flex-col p-4 space-y-2">
                        <button 
                            onClick={() => setActiveTab('pdf')}
                            className={`w-full flex items-center px-4 py-3 rounded-xl text-[13px] font-semibold transition-all ${
                                activeTab === 'pdf' 
                                ? 'bg-white shadow-sm border border-slate-200 text-[#4F46E5]' 
                                : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                            }`}
                        >
                            <FileText className={`w-4 h-4 mr-3 ${activeTab === 'pdf' ? 'text-[#4F46E5]' : 'text-slate-400'}`} />
                            PDF Preview
                        </button>
                        <button 
                            onClick={() => setActiveTab('email')}
                            className={`w-full flex items-center px-4 py-3 rounded-xl text-[13px] font-semibold transition-all ${
                                activeTab === 'email' 
                                ? 'bg-white shadow-sm border border-slate-200 text-[#4F46E5]' 
                                : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                            }`}
                        >
                            <Mail className={`w-4 h-4 mr-3 ${activeTab === 'email' ? 'text-[#4F46E5]' : 'text-slate-400'}`} />
                            Email Preview
                        </button>
                    </div>

                    {/* Right Content Area */}
                    <div className="flex-1 bg-slate-100/50 relative overflow-hidden flex flex-col">
                        {isLoading && (
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4F46E5] mb-4"></div>
                                <p className="text-[13px] font-medium text-slate-600">Generating preview...</p>
                            </div>
                        )}

                        {error && !isLoading && (
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white">
                                <div className="w-16 h-16 bg-red-50 border border-red-100 flex items-center justify-center rounded-2xl mb-4">
                                    <AlertCircle className="w-8 h-8 text-red-500" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2">Preview Generation Failed</h3>
                                <p className="text-[13px] text-slate-500 max-w-md text-center mb-6">{error}</p>
                                <button 
                                    onClick={onRetry}
                                    className="inline-flex items-center px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[13px] font-semibold transition-colors shadow-md"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Try Again
                                </button>
                            </div>
                        )}

                        {!isLoading && !error && (
                            <div className="w-full h-full overflow-y-auto">
                                {activeTab === 'pdf' && pdfBlobUrl && (
                                    <div className="w-full h-full bg-slate-200 p-4 sm:p-8 flex items-center justify-center">
                                        <div className="w-full max-w-[850px] h-full bg-white shadow-xl rounded-sm overflow-hidden">
                                            <object 
                                                data={pdfBlobUrl} 
                                                type="application/pdf" 
                                                className="w-full h-full"
                                            >
                                                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                                    <FileText className="w-12 h-12 text-slate-300 mb-4" />
                                                    <p className="text-slate-600 font-medium mb-2">Your browser doesn't support native PDF viewing.</p>
                                                    <a 
                                                        href={pdfBlobUrl} 
                                                        download={emailDetails?.filename || 'quotation.pdf'}
                                                        className="text-[#4F46E5] font-semibold hover:underline"
                                                    >
                                                        Download PDF to view
                                                    </a>
                                                </div>
                                            </object>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'email' && emailDetails && (
                                    <div className="w-full h-full p-4 sm:p-8 bg-slate-100 flex justify-center">
                                        <div className="w-full max-w-[850px] bg-white shadow-xl rounded-xl border border-slate-200 overflow-hidden flex flex-col">
                                            
                                            {/* Email Client Header Mock */}
                                            <div className="bg-slate-50 border-b border-slate-200 p-5 space-y-3">
                                                <div className="flex items-start">
                                                    <span className="w-16 text-[12px] font-semibold text-slate-400 mt-0.5">Subject:</span>
                                                    <span className="flex-1 text-[14px] font-bold text-slate-800">{emailDetails.subject}</span>
                                                </div>
                                                <div className="flex items-start">
                                                    <span className="w-16 text-[12px] font-semibold text-slate-400 mt-0.5">From:</span>
                                                    <span className="flex-1 text-[13px] text-slate-700">{emailDetails.from}</span>
                                                </div>
                                                <div className="flex items-start">
                                                    <span className="w-16 text-[12px] font-semibold text-slate-400 mt-0.5">To:</span>
                                                    <span className="flex-1 text-[13px] text-slate-700">{emailDetails.to}</span>
                                                </div>
                                            </div>

                                            {/* Email Body Safely Sandboxed */}
                                            <div className="p-8 flex-1 overflow-y-auto bg-white min-h-[400px]">
                                                <iframe
                                                    title="Email Body Preview"
                                                    srcDoc={emailDetails.htmlContent}
                                                    sandbox=""
                                                    className="w-full h-full min-h-[300px] border-0"
                                                />
                                            </div>

                                            {/* Email Attachments Mock */}
                                            <div className="bg-slate-50 border-t border-slate-200 p-4">
                                                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">1 Attachment</h4>
                                                <div className="inline-flex items-center px-4 py-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                                                    <div className="w-8 h-8 bg-red-50 rounded flex items-center justify-center mr-3">
                                                        <FileText className="w-4 h-4 text-red-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[13px] font-semibold text-slate-700 leading-tight">{emailDetails.filename}</p>
                                                        <p className="text-[11px] text-slate-400 mt-0.5">PDF Document</p>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
