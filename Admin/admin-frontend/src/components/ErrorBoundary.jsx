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
                <div className="flex h-screen w-full items-center justify-center bg-[#F5F7FC] p-6">
                    <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-border-subtle p-8 text-center flex flex-col items-center">
                        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-5 border border-red-100">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>
                        <h1 className="text-xl font-bold text-text-primary mb-2 tracking-tight">Something went wrong</h1>
                        <p className="text-[13px] text-text-secondary mb-8 leading-relaxed">
                            We're sorry, but the application encountered an unexpected error. Please reload the page to try again.
                        </p>
                        <button 
                            onClick={() => window.location.reload()} 
                            className="btn-primary w-full flex items-center justify-center h-12 shadow-[0_4px_14px_rgba(79,70,229,0.25)]"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Reload Application
                        </button>
                        
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="mt-8 w-full p-4 bg-gray-50 rounded-xl border border-gray-200 text-left overflow-auto max-h-48 text-[11px] font-mono text-gray-700">
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
