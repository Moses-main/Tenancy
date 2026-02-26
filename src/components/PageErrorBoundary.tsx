import React, { ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PageErrorBoundary({ 
  children, 
  fallbackMessage 
}: { 
  children: ReactNode;
  fallbackMessage?: string;
}) {
  return <>{children}</>;
}

export function AsyncErrorBoundary({ 
  children, 
  onRetry 
}: { 
  children: ReactNode; 
  onRetry?: () => void;
}) {
  return <>{children}</>;
}

export function ErrorDisplay({ 
  title = 'Error',
  message,
  onRetry,
  onGoBack
}: { 
  title?: string;
  message: string;
  onRetry?: () => void;
  onGoBack?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-6 text-center">
      <AlertTriangle className="h-10 w-10 text-red-500" />
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{message}</p>
      </div>
      <div className="flex items-center gap-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        )}
        {onGoBack && (
          <button
            onClick={onGoBack}
            className="inline-flex items-center gap-2 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted h-9 px-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        )}
      </div>
    </div>
  );
}
