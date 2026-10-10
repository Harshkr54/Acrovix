import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, GripVertical, Eye, EyeOff, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

export default function QuotationColumnConfigModal({ isOpen, onClose, activeConfigs, onApply }) {
    const [configs, setConfigs] = useState([]);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [newColumnName, setNewColumnName] = useState('');
    const [newColumnType, setNewColumnType] = useState('TEXT');
    const [error, setError] = useState(null);

    const builtInKeys = ["rowNumber", "sku", "description", "hsnSac", "quantity", "listPrice", "discountPercent", "unitPrice", "taxPercent", "taxAmount", "total"];

    useEffect(() => {
        if (isOpen && activeConfigs) {
            setConfigs(JSON.parse(JSON.stringify(activeConfigs)).sort((a, b) => a.sortOrder - b.sortOrder));
            setNewColumnName('');
            setNewColumnType('TEXT');
            setError(null);
        }
    }, [isOpen, activeConfigs]);

    if (!isOpen) return null;

    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        // Required for Firefox
        e.dataTransfer.setData('text/html', e.target.parentNode);
        e.dataTransfer.setDragImage(e.target.parentNode, 20, 20);
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (draggedIndex === null || draggedIndex === index) return;

        const newConfigs = [...configs];
        const draggedItem = newConfigs[draggedIndex];
        
        newConfigs.splice(draggedIndex, 1);
        newConfigs.splice(index, 0, draggedItem);
        
        // Update sortOrders
        newConfigs.forEach((c, i) => c.sortOrder = i);
        
        setConfigs(newConfigs);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const moveUp = (index) => {
        if (index > 0) {
            const newConfigs = [...configs];
            [newConfigs[index - 1], newConfigs[index]] = [newConfigs[index], newConfigs[index - 1]];
            newConfigs.forEach((c, i) => c.sortOrder = i);
            setConfigs(newConfigs);
        }
    };

    const moveDown = (index) => {
        if (index < configs.length - 1) {
            const newConfigs = [...configs];
            [newConfigs[index + 1], newConfigs[index]] = [newConfigs[index], newConfigs[index + 1]];
            newConfigs.forEach((c, i) => c.sortOrder = i);
            setConfigs(newConfigs);
        }
    };

    const toggleVisibility = (index) => {
        const newConfigs = [...configs];
        newConfigs[index].visible = !newConfigs[index].visible;
        setConfigs(newConfigs);
    };

    const handleAddCustomColumn = () => {
        const name = newColumnName.trim();
        if (!name) {
            setError("Column name is required.");
            return;
        }

        const generatedKey = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        
        if (builtInKeys.includes(generatedKey)) {
            setError(`'${name}' results in a reserved built-in key. Please choose another name.`);
            return;
        }

        if (configs.some(c => c.columnKey === generatedKey || c.displayName.toLowerCase() === name.toLowerCase())) {
            setError("A column with this name or key already exists.");
            return;
        }

        const newConfigs = [...configs];
        newConfigs.push({
            id: null,
            columnKey: generatedKey,
            displayName: name,
            columnType: newColumnType,
            visible: true,
            sortOrder: newConfigs.length,
            isCustom: true
        });

        setConfigs(newConfigs);
        setNewColumnName('');
        setError(null);
    };

    const removeCustomColumn = (index) => {
        if (!configs[index].isCustom) return;
        const newConfigs = [...configs];
        newConfigs.splice(index, 1);
        newConfigs.forEach((c, i) => c.sortOrder = i);
        setConfigs(newConfigs);
    };

    const handleApply = () => {
        onApply(configs);
    };

    const modalContent = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            
            <div className="bg-bg-card rounded-2xl shadow-2xl w-full max-w-[700px] max-h-[85vh] flex flex-col relative z-10 overflow-hidden border border-border-subtle animate-modal-entrance">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-muted/50 shrink-0">
                    <div>
                        <h2 className="text-[18px] font-bold text-text-primary tracking-tight leading-none mb-1">Column Configuration</h2>
                        <p className="text-[13px] text-text-secondary">Choose which columns appear in this quotation and arrange their order.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="btn btn-secondary btn-icon ml-4"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="bg-bg-main border border-border-subtle rounded-xl overflow-hidden">
                        <div className="p-2 space-y-1">
                            {configs.map((config, index) => (
                                <div 
                                    key={config.columnKey}
                                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                                        draggedIndex === index 
                                        ? 'bg-bg-hover border-[var(--color-brand-primary)]/30 opacity-50' 
                                        : 'bg-bg-card border-transparent hover:border-border-subtle hover:shadow-sm'
                                    } ${!config.visible ? 'opacity-60' : ''}`}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={handleDragEnd}
                                >
                                    <div className="flex items-center space-x-3">
                                        <div 
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, index)}
                                            className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-primary p-1"
                                            title="Drag to reorder"
                                        >
                                            <GripVertical className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[13px] font-bold text-text-primary">
                                                {config.displayName}
                                            </span>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-[10px] text-text-muted uppercase font-semibold">
                                                    {config.isCustom ? 'CUSTOM' : 'BUILT-IN'} • {config.columnType}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2">
                                        <div className="flex flex-col space-y-0.5 mr-2">
                                            <button onClick={() => moveUp(index)} disabled={index === 0} className="p-0.5 text-text-muted hover:text-text-primary hover:bg-bg-hover rounded transition-colors disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5"/></button>
                                            <button onClick={() => moveDown(index)} disabled={index === configs.length - 1} className="p-0.5 text-text-muted hover:text-text-primary hover:bg-bg-hover rounded transition-colors disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5"/></button>
                                        </div>
                                        
                                        <button 
                                            onClick={() => toggleVisibility(index)}
                                            className={`p-1.5 rounded-md transition-colors ${config.visible ? 'text-brand-teal hover:bg-brand-teal/10' : 'text-text-muted hover:bg-bg-hover'}`}
                                            title={config.visible ? "Hide Column" : "Show Column"}
                                        >
                                            {config.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                        </button>
                                        
                                        {config.isCustom && (
                                            <button 
                                                onClick={() => removeCustomColumn(index)}
                                                className="btn btn-danger btn-icon"
                                                title="Remove Custom Column"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-bg-main border border-border-subtle rounded-xl p-4">
                        <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-3">
                            + Add Custom Column
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input 
                                type="text"
                                value={newColumnName}
                                onChange={(e) => { setNewColumnName(e.target.value); setError(null); }}
                                placeholder="Column Name (e.g. Warranty)"
                                className="flex-1 bg-bg-card border border-border-subtle focus:border-[var(--color-brand-primary)] rounded-lg px-3 py-2 text-[13px] font-medium text-text-primary outline-none"
                            />
                            <select 
                                value={newColumnType}
                                onChange={(e) => setNewColumnType(e.target.value)}
                                className="w-32 bg-bg-card border border-border-subtle focus:border-[var(--color-brand-primary)] rounded-lg px-3 py-2 text-[13px] font-medium text-text-primary outline-none"
                            >
                                <option value="TEXT">Text</option>
                                <option value="NUMBER">Number</option>
                                <option value="CURRENCY">Currency</option>
                            </select>
                            <button 
                                onClick={handleAddCustomColumn}
                                disabled={!newColumnName.trim()}
                                className="btn btn-primary px-4 py-2 text-[13px] flex items-center justify-center shrink-0"
                            >
                                <Plus className="w-4 h-4 mr-1.5" /> Add
                            </button>
                        </div>
                        {error && (
                            <div className="mt-3 p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-lg text-[12px] text-red-600 dark:text-red-400 font-medium flex items-start">
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-border-subtle/50 bg-bg-muted/50 shrink-0">
                    <button
                        onClick={onClose}
                        className="btn btn-secondary px-5 py-2 text-[13px]"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApply}
                        className="btn btn-primary px-5 py-2 text-[13px]"
                    >
                        Apply Config
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
