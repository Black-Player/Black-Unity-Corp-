import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorDetails = null;
      try {
        errorDetails = JSON.parse(this.state.error?.message || '{}');
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-cosmic-black flex items-center justify-center p-8">
          <div className="glass-card p-12 max-w-2xl w-full text-center space-y-6 border-red-400/20 bg-red-400/5">
            <div className="w-20 h-20 bg-red-400/10 rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert className="text-red-400" size={40} />
            </div>
            <h1 className="text-3xl font-display font-bold text-white">Cosmic Interference Detected</h1>
            <p className="text-white/60">
              The Oracle has encountered an unexpected anomaly in the data stream.
            </p>
            
            {errorDetails && (
              <div className="bg-black/40 p-4 rounded-xl text-left font-mono text-xs space-y-2 border border-white/5">
                <p className="text-red-400 font-bold uppercase">Error: {errorDetails.error}</p>
                <p className="text-white/40">Operation: {errorDetails.operationType}</p>
                <p className="text-white/40">Path: {errorDetails.path}</p>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="gold-button px-8 py-3 flex items-center justify-center gap-2 mx-auto"
            >
              <RefreshCcw size={20} />
              Realign Systems
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
