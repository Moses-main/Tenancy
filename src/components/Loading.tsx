import React from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ size = 'md', text, fullScreen = false }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const spinner = (
    <>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </>
  );

  if (fullScreen) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {spinner}
    </div>
  );
}

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
}

export function LoadingOverlay({ isLoading, children }: LoadingOverlayProps) {
  if (!isLoading) return <>{children}</>;

  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/50">
        <LoadingSpinner size="lg" />
      </div>
    </div>
  );
}

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse rounded-md bg-muted ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <Skeleton className="h-6 w-1/3 mb-4" />
      <Skeleton className="h-4 w-1/2 mb-2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <Skeleton className="h-32 w-full" />
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-2/3" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-4" />
          <Skeleton className="h-4" />
          <Skeleton className="h-4" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-border">
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="flex-1">
          <Skeleton className="h-4" />
        </div>
      ))}
    </div>
  );
}

export function PageLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-muted-foreground text-sm">{text}</p>
    </div>
  );
}

export function InlineError({ 
  message, 
  onRetry 
}: { 
  message: string; 
  onRetry?: () => void 
}) {
  return (
    <div className="flex items-center justify-center gap-3 p-4">
      <AlertTriangle className="h-5 w-5 text-red-500" />
      <p className="text-red-500 text-sm">{message}</p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="text-sm font-medium text-primary hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <Skeleton className="h-8 w-20" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <Skeleton className="h-6 w-48 mb-4" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="text-right space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

export function FullPageLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <LoadingSpinner size="lg" />
        <div className="absolute inset-0 animate-ping opacity-20">
          <Loader2 className="h-12 w-12 text-primary" />
        </div>
      </div>
      <p className="text-muted-foreground text-sm animate-pulse">{text}</p>
    </div>
  );
}
