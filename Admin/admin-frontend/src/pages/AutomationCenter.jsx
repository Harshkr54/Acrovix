import React, { useState, useEffect, useCallback } from 'react';
import { getAutomationStatus, getAutomationHistory, runAutomationTask } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import { formatDateTime } from '../utils/formatters';
import { 
    Zap, 
    RefreshCw, 
    Play, 
    CheckCircle2, 
    AlertCircle, 
    Clock, 
    ShieldCheck, 
    Sparkles, 
    FileText, 
    Layers, 
    History,
    Calendar,
    Activity,
    Info
} from 'lucide-react';

export default function AutomationCenter() {
    const { showToast } = useToast();
    const [jobs, setJobs] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [error, setError] = useState(null);
    const [runningJobId, setRunningJobId] = useState(null);

    const fetchJobs = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getAutomationStatus();
            setJobs(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load automation status", err);
            setError(err.message || "Failed to load automation jobs status");
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchHistory = useCallback(async () => {
        try {
            setHistoryLoading(true);
            const data = await getAutomationHistory();
            const items = Array.isArray(data) ? data : (data?.content || []);
            setHistory(items);
        } catch (err) {
            console.error("Failed to load automation history", err);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    const refreshAll = useCallback(() => {
        fetchJobs();
        fetchHistory();
    }, [fetchJobs, fetchHistory]);

    useEffect(() => {
        refreshAll();
    }, [refreshAll]);

    const handleRunJob = async (jobId, jobName) => {
        try {
            setRunningJobId(jobId);
            const result = await runAutomationTask(jobId);
            showToast({
                type: 'success',
                message: `${jobName}: ${result.message || 'Execution completed successfully'}`
            });
            refreshAll();
        } catch (err) {
            console.error(`Failed to execute job ${jobId}`, err);
            showToast({
                type: 'error',
                message: err.message || `Failed to execute ${jobName}`
            });
            refreshAll();
        } finally {
            setRunningJobId(null);
        }
    };

    const getJobIcon = (jobId) => {
        switch (jobId) {
            case 'follow-ups':
                return <Clock className="w-5 h-5 text-amber-500" />;
            case 'invoices':
                return <FileText className="w-5 h-5 text-blue-500" />;
            case 'ai-extraction':
                return <Sparkles className="w-5 h-5 text-purple-500" />;
            default:
                return <Zap className="w-5 h-5 text-brand-primary" />;
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'SUCCESS':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        SUCCESS
                    </span>
                );
            case 'RUNNING':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 animate-pulse">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        RUNNING
                    </span>
                );
            case 'FAILED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                        FAILED
                    </span>
                );
            case 'NEVER_RUN':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <Clock className="w-3.5 h-3.5" />
                        NEVER RUN
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-bg-muted text-text-muted">
                        <Info className="w-3.5 h-3.5" />
                        {status || 'ENABLED'}
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6 pb-12">
            <PageHeader
                title="Automation Center"
                subtitle="Configured background workers, alert schedules, rate-limit guards, and durable execution history."
                icon={Zap}
                action={
                    <button
                        onClick={refreshAll}
                        disabled={loading || historyLoading}
                        className="btn btn-secondary btn-sm flex items-center gap-1.5"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${(loading || historyLoading) ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                }
            />

            {/* Enterprise Safety & Trust Guardrails Banner */}
            <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0 mt-0.5">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-sm font-bold text-text-primary">Operational Guardrails & Idempotency Active</h3>
                        <p className="text-xs text-text-secondary leading-relaxed">
                            Scheduled background jobs and manual triggers operate under strict idempotency, auditability, and safety constraints:
                        </p>
                        <ul className="text-xs text-text-muted space-y-1 list-disc list-inside pt-1">
                            <li><strong>Shared Tracking Path:</strong> Automatic `@Scheduled` runs and manual "Trigger Now" invocations share the same durable database history.</li>
                            <li><strong>Concurrency Locking:</strong> In-progress job locks reject concurrent overlapping runs (409 Conflict) to prevent duplicate reminders.</li>
                            <li><strong>Financial Integrity:</strong> Invoices are never marked paid automatically from unverified emails or AI estimates; real payments require cryptographically signed gateway webhooks or authorized bank reconciliation.</li>
                            <li><strong>Demo Mode Suppression:</strong> When <code>APP_DEMO_MODE=true</code>, all outgoing SMTP and Resend client emails are suppressed and logged as simulation records.</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Job Grid */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                        <Layers className="w-5 h-5 text-brand-teal" />
                        Registered Automation Jobs
                    </h2>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[1, 2, 3].map(n => (
                            <div key={n} className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm space-y-4">
                                <Skeleton variant="title" className="w-48 h-6" />
                                <Skeleton variant="text" className="w-full h-12" />
                                <Skeleton variant="text" className="w-32 h-4" />
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="bg-bg-card border border-border-subtle rounded-2xl p-6">
                        <EmptyState type="error" error={error} onRetry={fetchJobs} />
                    </div>
                ) : jobs.length === 0 ? (
                    <EmptyState emptyMessage="No automation jobs registered." icon={Zap} />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {jobs.map(job => {
                            const isRunning = runningJobId === job.jobId || job.lastStatus === 'RUNNING';
                            return (
                                <div 
                                    key={job.jobId}
                                    className="bg-bg-card border border-border-subtle rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow space-y-4"
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 rounded-xl bg-bg-main border border-border-subtle flex items-center justify-center">
                                                    {getJobIcon(job.jobId)}
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-text-primary">{job.name}</h3>
                                                    <span className="text-[11px] font-medium text-text-muted">{job.schedule}</span>
                                                </div>
                                            </div>
                                            {getStatusBadge(job.lastStatus)}
                                        </div>

                                        <p className="text-xs text-text-secondary leading-relaxed">
                                            {job.description}
                                        </p>

                                        <div className="p-3 bg-bg-main rounded-xl border border-border-subtle text-xs space-y-1.5">
                                            <div className="flex items-center justify-between text-text-muted">
                                                <span>Total Executions:</span>
                                                <span className="font-semibold text-text-primary">{job.totalRuns}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-text-muted">
                                                <span>Last Run:</span>
                                                <span className="font-semibold text-text-primary">
                                                    {job.lastRunAt ? formatDateTime(job.lastRunAt) : 'Never Run'}
                                                </span>
                                            </div>
                                            {job.lastProcessedCount != null && (
                                                <div className="flex items-center justify-between text-text-muted">
                                                    <span>Processed Records:</span>
                                                    <span className="font-semibold text-text-primary">{job.lastProcessedCount}</span>
                                                </div>
                                            )}
                                            {job.lastMessage && (
                                                <p className="text-[11px] text-text-muted pt-1 border-t border-border-subtle truncate" title={job.lastMessage}>
                                                    {job.lastMessage}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            onClick={() => handleRunJob(job.jobId, job.name)}
                                            disabled={isRunning}
                                            className="btn btn-secondary btn-sm w-full flex items-center justify-center gap-1.5"
                                        >
                                            {isRunning ? (
                                                <>
                                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                    Executing...
                                                </>
                                            ) : (
                                                <>
                                                    <Play className="w-3.5 h-3.5" />
                                                    Trigger Now
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Durable Execution History Section */}
            <div className="bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                            <History className="w-5 h-5 text-brand-primary" />
                            Durable Execution History
                        </h2>
                        <p className="text-xs text-text-muted mt-0.5">Persisted database records of automatic and manual automation runs</p>
                    </div>
                    <span className="text-xs font-semibold text-text-muted bg-bg-main px-3 py-1 rounded-xl border border-border-subtle">
                        {history.length} Recent Runs
                    </span>
                </div>

                {historyLoading ? (
                    <div className="space-y-3 py-4">
                        <Skeleton variant="table-row" />
                        <Skeleton variant="table-row" />
                        <Skeleton variant="table-row" />
                    </div>
                ) : history.length === 0 ? (
                    <EmptyState emptyMessage="No execution records found. Trigger a job to record the first execution." icon={Activity} />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-border-subtle text-text-muted font-semibold">
                                    <th className="py-2.5 px-3">Job Name</th>
                                    <th className="py-2.5 px-3">Trigger</th>
                                    <th className="py-2.5 px-3">Status</th>
                                    <th className="py-2.5 px-3">Started</th>
                                    <th className="py-2.5 px-3">Finished</th>
                                    <th className="py-2.5 px-3">Records</th>
                                    <th className="py-2.5 px-3">Outcome / Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-subtle">
                                {history.map(item => (
                                    <tr key={item.id} className="hover:bg-bg-main transition-colors">
                                        <td className="py-3 px-3 font-semibold text-text-primary whitespace-nowrap">
                                            {item.jobName || item.jobId}
                                        </td>
                                        <td className="py-3 px-3 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                                item.triggerType === 'SCHEDULED' 
                                                    ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' 
                                                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                            }`}>
                                                {item.triggerType}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 whitespace-nowrap">
                                            {getStatusBadge(item.status)}
                                        </td>
                                        <td className="py-3 px-3 text-text-muted whitespace-nowrap">
                                            {item.startedAt ? formatDateTime(item.startedAt) : '-'}
                                        </td>
                                        <td className="py-3 px-3 text-text-muted whitespace-nowrap">
                                            {item.finishedAt ? formatDateTime(item.finishedAt) : '-'}
                                        </td>
                                        <td className="py-3 px-3 text-text-primary font-semibold whitespace-nowrap">
                                            {item.processedRecordsCount != null ? item.processedRecordsCount : '-'}
                                        </td>
                                        <td className="py-3 px-3 text-text-secondary max-w-xs truncate" title={item.errorDetails || item.message}>
                                            {item.errorDetails ? (
                                                <span className="text-rose-500 font-medium">{item.errorDetails}</span>
                                            ) : (
                                                item.message || '-'
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
