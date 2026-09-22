import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught runtime error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center p-4">
                    <div className="max-w-md w-full bg-bg-card rounded-3xl shadow-sm border border-border-subtle p-8 text-center flex flex-col items-center">
                        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-5 border border-red-500/20">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>
                        <h1 className="text-xl font-bold text-text-primary mb-2 tracking-tight">Something went wrong</h1>
                        <p className="text-[13px] text-text-secondary mb-8 leading-relaxed">
                            We couldn't load this section. Please reload the page to try again.
                        </p>
                        <button 
                            onClick={() => window.location.reload()} 
                            className="btn btn-primary btn-md w-full"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Try Again
                        </button>
                        
                        {(import.meta.env?.DEV || (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development')) && this.state.error && (
                            <div className="mt-8 w-full p-4 bg-bg-muted rounded-xl border border-border-subtle text-left overflow-auto max-h-48 text-[11px] font-mono text-text-secondary">
                                {this.state.error.toString()}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
