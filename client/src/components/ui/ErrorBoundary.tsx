import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 text-center border border-slate-200 dark:border-slate-700">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Something went wrong</h1>
            <p className="text-slate-500 mb-6 text-sm">
              We're sorry, but an unexpected error occurred. Our team has been notified.
            </p>
            {this.state.error && (
              <div className="bg-slate-100 dark:bg-slate-900 rounded p-3 text-left overflow-x-auto mb-6">
                <p className="text-xs text-red-500 font-mono font-medium">{this.state.error.message}</p>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Refresh Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
