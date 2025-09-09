"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean;
  stepName?: string;
  showHomeButton?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
  retryCount: number;
  showDetails: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    retryCount: 0,
    showDetails: false
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return { hasError: true, error, errorId };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Enhanced error logging
    const errorDetails = {
      errorId,
      stepName: this.props.stepName,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'Unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      retryCount: this.state.retryCount,
    };

    console.error('🚨 Onboarding Error Boundary:', errorDetails);

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(errorDetails);
    }

    // Show user-friendly toast notification
    if (typeof window !== 'undefined') {
      toast.error(
        `${this.props.stepName ? `Error in ${this.props.stepName}` : 'An error occurred'}`, 
        {
          description: `Error ID: ${errorId}`,
          action: {
            label: 'Retry',
            onClick: () => this.handleRetry(),
          },
        }
      );
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({
      error,
      errorInfo,
      errorId,
    });
  }

  private logErrorToService = async (errorDetails: any) => {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorDetails),
      });
    } catch (e) {
      console.error('Failed to log error to service:', e);
    }
  };

  private handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;
    
    if (newRetryCount > 3) {
      toast.error('Maximum retry attempts reached. Please refresh the page.');
      return;
    }

    if (typeof window !== 'undefined') {
      toast.loading('Retrying...', { id: 'retry-toast' });
    }
    
    setTimeout(() => {
      this.setState({ 
        hasError: false, 
        error: undefined, 
        errorInfo: undefined,
        retryCount: newRetryCount,
        showDetails: false
      });
      
      if (typeof window !== 'undefined') {
        toast.dismiss('retry-toast');
        toast.success('Retry successful!');
      }
    }, 1000);
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
  };

  private toggleDetails = () => {
    this.setState({ showDetails: !this.state.showDetails });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Step-specific error UI (smaller, inline)
      if (this.props.isolate && this.props.stepName) {
        return (
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-red-800">
                  Error in {this.props.stepName}
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  This step encountered an error and cannot be displayed properly.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    onClick={this.handleRetry}
                    disabled={this.state.retryCount >= 3}
                    className="inline-flex items-center px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry ({Math.max(0, 3 - this.state.retryCount)} left)
                  </button>
                  <button
                    onClick={this.toggleDetails}
                    className="inline-flex items-center px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 transition-colors"
                  >
                    {this.state.showDetails ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
                    {this.state.showDetails ? 'Hide' : 'Show'} Details
                  </button>
                </div>
                
                {this.state.showDetails && (
                  <div className="mt-3 p-3 bg-red-100 rounded text-xs text-red-800 font-mono break-all">
                    <p><strong>Error ID:</strong> {this.state.errorId}</p>
                    <p><strong>Message:</strong> {this.state.error?.message}</p>
                    {process.env.NODE_ENV === 'development' && (
                      <details className="mt-2">
                        <summary className="cursor-pointer font-bold hover:underline">Stack Trace</summary>
                        <pre className="mt-1 text-xs overflow-auto max-h-32 bg-red-50 p-2 rounded">
                          {this.state.error?.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }

      // Full component error UI
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-lg border border-red-200 min-h-64">
          <div className="text-center max-w-md">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            
            <h3 className="text-xl font-semibold text-red-700 mb-2">
              {this.props.stepName ? `Error in ${this.props.stepName}` : 'Something went wrong'}
            </h3>
            
            <p className="text-sm text-red-600 mb-4">
              {this.props.stepName 
                ? `There was an error loading the ${this.props.stepName} step.`
                : 'There was an error loading this section.'
              } Your progress has been saved.
            </p>
            
            <div className="text-xs text-red-500 bg-red-100 p-2 rounded mb-6 font-mono">
              Error ID: {this.state.errorId}
            </div>

            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                disabled={this.state.retryCount >= 3}
                className="w-full bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {this.state.retryCount >= 3 ? 'Max retries reached' : `Try Again (${Math.max(0, 3 - this.state.retryCount)} left)`}
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={this.handleReload}
                  className="flex-1 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors text-sm"
                >
                  Reload Page
                </button>
                {this.props.showHomeButton && (
                  <button
                    onClick={this.handleGoHome}
                    className="flex-1 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors flex items-center justify-center text-sm"
                  >
                    <Home className="w-4 h-4 mr-1" />
                    Dashboard
                  </button>
                )}
              </div>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 pt-6 border-t border-red-200">
                <button
                  onClick={this.toggleDetails}
                  className="text-sm text-red-600 hover:text-red-800 flex items-center mx-auto"
                >
                  {this.state.showDetails ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                  {this.state.showDetails ? 'Hide' : 'Show'} Technical Details
                </button>
                
                {this.state.showDetails && (
                  <div className="mt-4 p-4 bg-red-100 rounded text-left text-xs">
                    <p><strong>Error:</strong> {this.state.error?.message}</p>
                    <p><strong>Component Stack:</strong></p>
                    <pre className="mt-2 overflow-auto max-h-32 text-xs bg-red-50 p-2 rounded">
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundaries for different contexts
export const StepErrorBoundary: React.FC<{ 
  children: ReactNode; 
  stepName: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}> = ({ children, stepName, onError }) => (
  <ErrorBoundary 
    isolate 
    stepName={stepName} 
    onError={onError}
    showHomeButton={false}
  >
    {children}
  </ErrorBoundary>
);

export const FormErrorBoundary: React.FC<{ 
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}> = ({ children, onError }) => (
  <ErrorBoundary 
    isolate 
    stepName="Form"
    onError={onError}
    showHomeButton={false}
  >
    {children}
  </ErrorBoundary>
);

export const WizardErrorBoundary: React.FC<{ 
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}> = ({ children, onError }) => (
  <ErrorBoundary 
    stepName="Onboarding Wizard"
    onError={onError}
    showHomeButton={true}
  >
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;