import React, { useState, useEffect } from 'react';
import { updateCrmLeadStatus } from '../services/api';
import { 
    X, 
    Loader2, 
    AlertCircle, 
    RefreshCw, 
    CheckCircle2, 
    XCircle, 
    Phone, 
    ShieldAlert, 
    ArrowRight
} from 'lucide-react';
import StatusBadge from './ui/StatusBadge';

// Authoritative state machine transitions matching backend business rules
const AUTHORITATIVE_TRANSITIONS = {
    NEW: ['CONTACTED', 'QUALIFIED', 'LOST'],
    CONTACTED: ['QUALIFIED', 'NEW', 'LOST'],
    QUALIFIED: ['PROPOSAL', 'CONTACTED', 'LOST'],
    PROPOSAL: ['NEGOTIATION', 'QUALIFIED', 'LOST'],
    NEGOTIATION: ['WON', 'PROPOSAL', 'LOST'],
    WON: [],
    LOST: ['QUALIFIED', 'NEGOTIATION'] // Supported reopening pathways
};

const STAGE_LABELS = {
    NEW: 'New Lead',
    CONTACTED: 'Contacted',
    QUALIFIED: 'Qualified',
    PROPOSAL: 'Proposal Sent',
    NEGOTIATION: 'In Negotiation',
    WON: 'Closed Won',
    LOST: 'Closed Lost'
};

export default function StatusUpdateModal({ isOpen, onClose, lead, onSuccess }) {
    const currentStatus = lead ? (lead.status || 'NEW') : 'NEW';
    const validTargets = AUTHORITATIVE_TRANSITIONS[currentStatus] || [];

    const [targetStatus, setTargetStatus] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [serverError, setServerError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});

    // Stage-specific fields
    const [lostReason, setLostReason] = useState('');
    const [competitor, setCompetitor] = useState('');
    
    // Contacted
    const [interactionType, setInteractionType] = useState('CALL');
    const [subject, setSubject] = useState('');
    const [customerResponse, setCustomerResponse] = useState('');
    const [outcome, setOutcome] = useState('');
    const [nextAction, setNextAction] = useState('');
    const [nextFollowUpDate, setNextFollowUpDate] = useState('');

    // Qualified
    const [serviceRequired, setServiceRequired] = useState('');
    const [industrySector, setIndustrySector] = useState('');
    const [estimatedValue, setEstimatedValue] = useState('');
    const [expectedClosingDate, setExpectedClosingDate] = useState('');
    const [probability, setProbability] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isOpen && lead) {
            const initialTarget = validTargets.length > 0 ? validTargets[0] : '';
            setTargetStatus(initialTarget);
            setLostReason('');
            setCompetitor('');
            setInteractionType('CALL');
            setSubject('');
            setCustomerResponse('');
            setOutcome('');
            setNextAction('');
            setNextFollowUpDate('');
            setServiceRequired(lead.serviceRequired || '');
            setIndustrySector(lead.industrySector || '');
            setEstimatedValue(lead.estimatedValue ? String(lead.estimatedValue) : '');
            setExpectedClosingDate(lead.expectedClosingDate || '');
            setProbability(lead.probability !== null && lead.probability !== undefined ? String(lead.probability) : '');
            setNotes('');
            setFieldErrors({});
            setServerError(null);
        }
    }, [isOpen, lead]);

    // Keyboard support for ESC
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen && !isSubmitting) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isSubmitting, onClose]);

    if (!isOpen || !lead) return null;

    const validateForm = () => {
        const errors = {};

        if (!targetStatus) {
            errors.targetStatus = 'Target stage is required';
        }

        if (targetStatus === 'LOST') {
            if (!lostReason.trim()) {
                errors.lostReason = 'Lost reason is mandatory when marking a lead as Lost';
            }
        }

        if (targetStatus === 'QUALIFIED') {
            if (estimatedValue && Number(estimatedValue) < 0) {
                errors.estimatedValue = 'Estimated value cannot be negative';
            }
            if (probability !== '') {
                const probNum = Number(probability);
                if (isNaN(probNum) || probNum < 0 || probNum > 100) {
                    errors.probability = 'Win probability must be between 0 and 100%';
                }
            }
        }

        if (targetStatus === 'WON') {
            const effectiveVal = estimatedValue || (lead.estimatedValue ? String(lead.estimatedValue) : '');
            if (!effectiveVal || Number(effectiveVal) <= 0) {
                errors.estimatedValue = 'A positive deal value is required to mark this lead as WON';
            }
        }

        if (currentStatus === 'LOST' && (targetStatus === 'QUALIFIED' || targetStatus === 'NEGOTIATION')) {
            if (!notes.trim()) {
                errors.notes = 'Please provide the reopening justification or context in the notes field';
            }
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        if (!validateForm()) return;

        setIsSubmitting(true);
        setServerError(null);

        const payload = {
            status: targetStatus,
            lostReason: targetStatus === 'LOST' ? lostReason.trim() : null,
            competitor: targetStatus === 'LOST' ? (competitor.trim() || null) : null,
            notes: notes.trim() || null,
            interactionType: (targetStatus === 'CONTACTED') ? interactionType : null,
            subject: subject.trim() || null,
            customerResponse: customerResponse.trim() || null,
            outcome: outcome.trim() || null,
            nextAction: nextAction.trim() || null,
            nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate).toISOString() : null,
            estimatedValue: estimatedValue ? Number(estimatedValue) : null,
            expectedClosingDate: expectedClosingDate || null,
            probability: probability !== '' ? Number(probability) : null,
            serviceRequired: serviceRequired.trim() || null,
            industrySector: industrySector.trim() || null
        };

        try {
            const updated = await updateCrmLeadStatus(lead.id, payload);
            setIsSubmitting(false);
            if (onSuccess) onSuccess(updated);
            onClose();
        } catch (err) {
            console.error("Failed to update status", err);
            setServerError(err.message || 'Failed to update lead stage.');
            setIsSubmitting(false);
        }
    };

    const isTerminalWon = currentStatus === 'WON';

    return (
        <div 
            className="fixed inset-0 bg-text-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isSubmitting) onClose();
            }}
        >
            <div 
                className="bg-bg-card border border-border-subtle rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150"
                role="dialog"
                aria-modal="true"
                aria-labelledby="status-update-modal-title"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-main">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-brand-teal/10 text-brand-teal flex items-center justify-center">
                            <RefreshCw className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 id="status-update-modal-title" className="text-base font-bold text-text-primary">
                                Advance Sales Journey
                            </h2>
                            <p className="text-xs text-text-muted">
                                {lead.leadNumber} — {lead.fullName} {lead.companyName ? `(${lead.companyName})` : ''}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        disabled={isSubmitting}
                        className="btn btn-ghost btn-icon text-text-muted hover:text-text-primary"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                    {serverError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-medium rounded-xl flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{serverError}</span>
                        </div>
                    )}

                    {/* Current vs Target State Display */}
                    <div className="p-4 bg-bg-main border border-border-subtle rounded-xl flex items-center justify-between gap-4">
                        <div>
                            <span className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                                Current Stage
                            </span>
                            <StatusBadge status={currentStatus} />
                        </div>
                        
                        <div className="flex items-center justify-center text-text-muted">
                            <ArrowRight className="w-5 h-5" />
                        </div>

                        <div>
                            <span className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                                Target Stage
                            </span>
                            {targetStatus ? <StatusBadge status={targetStatus} /> : <span className="text-xs text-text-muted">—</span>}
                        </div>
                    </div>

                    {isTerminalWon ? (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3 text-xs text-emerald-800 dark:text-emerald-300">
                            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                            <div>
                                <span className="font-bold block">Lead is in Terminal WON Status</span>
                                <p className="mt-0.5 leading-relaxed">
                                    This lead was successfully converted to WON. Won deals cannot be moved to earlier stages to ensure audit trail and ERP transactional integrity.
                                </p>
                            </div>
                        </div>
                    ) : validTargets.length === 0 ? (
                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-400">
                            No forward transitions available from current state.
                        </div>
                    ) : (
                        <>
                            {/* Target Stage Selector */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                                    Select Next Stage <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {validTargets.map((st) => {
                                        const isSelected = targetStatus === st;
                                        const isLostBtn = st === 'LOST';
                                        const isWonBtn = st === 'WON';
                                        return (
                                            <button
                                                key={st}
                                                type="button"
                                                onClick={() => {
                                                    setTargetStatus(st);
                                                    setFieldErrors({});
                                                }}
                                                className={`p-3 rounded-xl border text-xs font-semibold transition-all text-left flex flex-col justify-between ${
                                                    isSelected
                                                        ? isLostBtn
                                                            ? 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400 ring-2 ring-rose-500/20'
                                                            : isWonBtn
                                                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                                                                : 'bg-brand-teal/10 border-brand-teal text-brand-teal ring-2 ring-brand-teal/20'
                                                        : 'bg-bg-main border-border-subtle text-text-secondary hover:border-text-muted/60'
                                                }`}
                                            >
                                                <span>{STAGE_LABELS[st] || st}</span>
                                                <span className="text-[10px] font-normal text-text-muted mt-1">
                                                    {st === 'LOST' ? 'Close deal as lost' : st === 'WON' ? 'Finalize deal win' : 'Advance pipeline'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {fieldErrors.targetStatus && <p className="text-xs text-red-500 mt-1">{fieldErrors.targetStatus}</p>}
                            </div>

                            {/* --- STAGE AWARE DYNAMIC FIELDS --- */}

                            {/* 1. CONTACTED SPECIFIC FIELDS */}
                            {targetStatus === 'CONTACTED' && (
                                <div className="p-4 bg-bg-main border border-border-subtle rounded-xl space-y-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                                        <Phone className="w-3.5 h-3.5 text-brand-teal" />
                                        Contact Details
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-text-muted mb-1">Channel / Type</label>
                                            <select
                                                value={interactionType}
                                                onChange={(e) => setInteractionType(e.target.value)}
                                                className="w-full px-3 py-2 text-xs bg-bg-card border border-border-subtle rounded-lg text-text-primary"
                                            >
                                                <option value="CALL">Phone Call</option>
                                                <option value="EMAIL">Email</option>
                                                <option value="MEETING">Meeting</option>
                                                <option value="WHATSAPP">WhatsApp</option>
                                                <option value="OTHER">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-text-muted mb-1">Subject / Summary</label>
                                            <input
                                                type="text"
                                                value={subject}
                                                onChange={(e) => setSubject(e.target.value)}
                                                placeholder="e.g. Introductory discovery call"
                                                className="w-full px-3 py-2 text-xs bg-bg-card border border-border-subtle rounded-lg text-text-primary"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-text-muted mb-1">Customer Response / Outcome</label>
                                        <input
                                            type="text"
                                            value={outcome}
                                            onChange={(e) => setOutcome(e.target.value)}
                                            placeholder="e.g. Connected with decision maker, requested quote"
                                            className="w-full px-3 py-2 text-xs bg-bg-card border border-border-subtle rounded-lg text-text-primary"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-text-muted mb-1">Next Action</label>
                                        <input
                                            type="text"
                                            value={nextAction}
                                            onChange={(e) => setNextAction(e.target.value)}
                                            placeholder="e.g. Send technical brochure by tomorrow"
                                            className="w-full px-3 py-2 text-xs bg-bg-card border border-border-subtle rounded-lg text-text-primary"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-text-muted mb-1">Optional: Schedule Next Follow-up</label>
                                        <input
                                            type="datetime-local"
                                            value={nextFollowUpDate}
                                            onChange={(e) => setNextFollowUpDate(e.target.value)}
                                            className="w-full px-3 py-2 text-xs bg-bg-card border border-border-subtle rounded-lg text-text-primary"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 2. QUALIFIED SPECIFIC FIELDS */}
                            {targetStatus === 'QUALIFIED' && (
                                <div className="p-4 bg-bg-main border border-border-subtle rounded-xl space-y-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-teal" />
                                        Qualification Parameters
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-text-muted mb-1">Service / Solution Required</label>
                                            <input
                                                type="text"
                                                value={serviceRequired}
                                                onChange={(e) => setServiceRequired(e.target.value)}
                                                placeholder="e.g. Cloud ERP, Infrastructure Security"
                                                className="w-full px-3 py-2 text-xs bg-bg-card border border-border-subtle rounded-lg text-text-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-text-muted mb-1">Industry Sector</label>
                                            <input
                                                type="text"
                                                value={industrySector}
                                                onChange={(e) => setIndustrySector(e.target.value)}
                                                placeholder="e.g. Healthcare, Manufacturing"
                                                className="w-full px-3 py-2 text-xs bg-bg-card border border-border-subtle rounded-lg text-text-primary"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-text-muted mb-1">Estimated Deal Value (₹)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={estimatedValue}
                                                onChange={(e) => setEstimatedValue(e.target.value)}
                                                placeholder="e.g. 500000"
                                                className={`w-full px-3 py-2 text-xs bg-bg-card border rounded-lg text-text-primary ${
                                                    fieldErrors.estimatedValue ? 'border-red-500' : 'border-border-subtle'
                                                }`}
                                            />
                                            {fieldErrors.estimatedValue && <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.estimatedValue}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-semibold text-text-muted mb-1">Win Probability (%)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={probability}
                                                onChange={(e) => setProbability(e.target.value)}
                                                placeholder="e.g. 60"
                                                className={`w-full px-3 py-2 text-xs bg-bg-card border rounded-lg text-text-primary ${
                                                    fieldErrors.probability ? 'border-red-500' : 'border-border-subtle'
                                                }`}
                                            />
                                            {fieldErrors.probability && <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.probability}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-semibold text-text-muted mb-1">Target Closing Date</label>
                                            <input
                                                type="date"
                                                value={expectedClosingDate}
                                                onChange={(e) => setExpectedClosingDate(e.target.value)}
                                                className="w-full px-3 py-2 text-xs bg-bg-card border border-border-subtle rounded-lg text-text-primary"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-text-muted mb-1">Qualification Notes / Pain Points</label>
                                        <textarea
                                            rows={2}
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Detail verified requirements, decision maker role, budget timeline..."
                                            className="w-full px-3 py-2 text-xs bg-bg-card border border-border-subtle rounded-lg text-text-primary"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 3. PROPOSAL SPECIFIC FIELDS */}
                            {targetStatus === 'PROPOSAL' && (
                                <div className="p-4 bg-bg-main border border-border-subtle rounded-xl space-y-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                                        Proposal Stage Notes
                                    </h3>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-text-muted mb-1">Proposal Feedback & Objections</label>
                                        <textarea
                                            rows={2}
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Document quotation discussion, client feedback, or commercial scope discussed..."
                                            className="w-full px-3 py-2 text-xs bg-bg-card border border-border-subtle rounded-lg text-text-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-text-muted mb-1">Next Follow-up Date</label>
                                        <input
                                            type="datetime-local"
                                            value={nextFollowUpDate}
                                            onChange={(e) => setNextFollowUpDate(e.target.value)}
                                            className="w-full px-3 py-2 text-xs bg-bg-card border border-border-subtle rounded-lg text-text-primary"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 4. NEGOTIATION SPECIFIC FIELDS */}
                            {targetStatus === 'NEGOTIATION' && (
                                <div className="p-4 bg-bg-main border border-border-subtle rounded-xl space-y-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                                        Negotiation Discussion & Terms
                                    </h3>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-text-muted mb-1">Client Objections / Requested Terms</label>
                                        <input
                                            type="text"
                                            value={customerResponse}
                                            onChange={(e) => setCustomerResponse(e.target.value)}
                                            placeholder="e.g. Requested 10% volume discount, payment term extension to net 45"
                                            className="w-full px-3 py-2 text-xs bg-bg-card border border-border-subtle rounded-lg text-text-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-text-muted mb-1">Proposed Resolution / Notes</label>
                                        <textarea
                                            rows={2}
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Detail pricing resolution, revised quotation terms or next commitment..."
                                            className="w-full px-3 py-2 text-xs bg-bg-card border border-border-subtle rounded-lg text-text-primary"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 5. WON SPECIFIC FIELDS */}
                            {targetStatus === 'WON' && (
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-3">
                                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        <span>Confirm Deal Outcome</span>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-text-muted mb-1">
                                            Final Won Deal Value (₹) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            step="0.01"
                                            value={estimatedValue || (lead.estimatedValue ? String(lead.estimatedValue) : '')}
                                            onChange={(e) => setEstimatedValue(e.target.value)}
                                            placeholder="Enter final accepted deal amount"
                                            className={`w-full px-3 py-2 text-xs bg-bg-card border rounded-lg text-text-primary ${
                                                fieldErrors.estimatedValue ? 'border-red-500' : 'border-border-subtle'
                                            }`}
                                        />
                                        {fieldErrors.estimatedValue && <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.estimatedValue}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-text-muted mb-1">Closing Notes</label>
                                        <textarea
                                            rows={2}
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Notes on signed contract, accepted quotation reference..."
                                            className="w-full px-3 py-2 text-xs bg-bg-card border border-border-subtle rounded-lg text-text-primary"
                                        />
                                    </div>
                                    <p className="text-[11px] text-text-muted italic">
                                        Marking as WON will lock the deal pipeline and enable downstream Purchase Order / Customer conversion.
                                    </p>
                                </div>
                            )}

                            {/* 6. LOST SPECIFIC FIELDS */}
                            {targetStatus === 'LOST' && (
                                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-3">
                                    <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-xs">
                                        <XCircle className="w-4 h-4 text-rose-500" />
                                        <span>Close Deal as Lost</span>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-text-muted mb-1">
                                            Loss Reason <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={lostReason}
                                            onChange={(e) => {
                                                setLostReason(e.target.value);
                                                if (fieldErrors.lostReason) setFieldErrors(prev => ({ ...prev, lostReason: null }));
                                            }}
                                            className={`w-full px-3 py-2 text-xs bg-bg-card border rounded-lg text-text-primary ${
                                                fieldErrors.lostReason ? 'border-red-500' : 'border-border-subtle'
                                            }`}
                                        >
                                            <option value="">-- Select Loss Reason --</option>
                                            <option value="Price too high / Budget exceeded">Price too high / Budget exceeded</option>
                                            <option value="Competitor selected">Competitor selected</option>
                                            <option value="Project cancelled / Postponed indefinitely">Project cancelled / Postponed indefinitely</option>
                                            <option value="Feature / Technology mismatch">Feature / Technology mismatch</option>
                                            <option value="No response / Lost contact">No response / Lost contact</option>
                                            <option value="Internal solution built">Internal solution built</option>
                                            <option value="Other">Other (specify below)</option>
                                        </select>
                                        {fieldErrors.lostReason && <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.lostReason}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-text-muted mb-1">Winning Competitor (if known)</label>
                                        <input
                                            type="text"
                                            value={competitor}
                                            onChange={(e) => setCompetitor(e.target.value)}
                                            placeholder="e.g. Competitor XYZ"
                                            className="w-full px-3 py-2 text-xs bg-bg-card border border-border-subtle rounded-lg text-text-primary"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-text-muted mb-1">Additional Loss Notes</label>
                                        <textarea
                                            rows={2}
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Detail why customer chose another path or timing constraints..."
                                            className="w-full px-3 py-2 text-xs bg-bg-card border border-border-subtle rounded-lg text-text-primary"
                                        />
                                    </div>

                                    <div className="p-2.5 bg-bg-card/70 border border-border-subtle rounded-lg text-[11px] text-text-muted flex items-start gap-2">
                                        <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                        <span>Marking as Lost will automatically cancel active pending follow-ups for this lead. History will be fully preserved.</span>
                                    </div>
                                </div>
                            )}

                            {/* 7. REOPEN FROM LOST */}
                            {currentStatus === 'LOST' && (targetStatus === 'QUALIFIED' || targetStatus === 'NEGOTIATION') && (
                                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2">
                                    <h4 className="text-xs font-bold text-blue-700 dark:text-blue-300">Reopening Lost Opportunity</h4>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-text-muted mb-1">
                                            Reopening Context & Rationale <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={notes}
                                            onChange={(e) => {
                                                setNotes(e.target.value);
                                                if (fieldErrors.notes) setFieldErrors(prev => ({ ...prev, notes: null }));
                                            }}
                                            placeholder="e.g. Client secured new FY funding and re-engaged on initial proposal..."
                                            className={`w-full px-3 py-2 text-xs bg-bg-card border rounded-lg text-text-primary ${
                                                fieldErrors.notes ? 'border-red-500' : 'border-border-subtle'
                                            }`}
                                        />
                                        {fieldErrors.notes && <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.notes}</p>}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="btn btn-secondary btn-md font-semibold"
                        >
                            Cancel
                        </button>
                        {!isTerminalWon && validTargets.length > 0 && (
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`btn btn-md font-semibold flex items-center justify-center gap-1.5 min-w-[130px] ${
                                    targetStatus === 'LOST' 
                                        ? 'btn-danger' 
                                        : targetStatus === 'WON' 
                                            ? 'btn-success' 
                                            : 'btn-primary'
                                }`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Updating...</span>
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-4 h-4" />
                                        <span>Move to {STAGE_LABELS[targetStatus] || targetStatus}</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
