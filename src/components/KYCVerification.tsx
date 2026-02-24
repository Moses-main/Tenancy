import React from 'react';
import { Shield, AlertCircle, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { useKYC } from '../lib/KYCContext';
import type { KYCStatus } from '../lib/KYCContext';

interface KYCVerificationProps {
  onComplete?: () => void;
  requiredFor?: 'invest' | 'issue' | 'both';
}

export default function KYCVerification({ onComplete, requiredFor = 'invest' }: KYCVerificationProps) {
  const { 
    kycData, 
    isLoading, 
    error, 
    startKYC, 
    isVerified, 
    canInvest, 
    canIssue 
  } = useKYC();

  const requiresIssue = requiredFor === 'issue' || requiredFor === 'both';
  const requiredForInvest = requiredFor === 'invest' || requiredFor === 'both';

  const canProceed = requiredFor === 'invest' || requiredFor === 'both' 
    ? canInvest 
    : requiresIssue 
      ? canIssue 
      : true;

  if (isVerified && canProceed) {
    return (
      <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-6">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-green-500" />
          <div>
            <h3 className="font-semibold text-green-500">Identity Verified</h3>
            <p className="text-sm text-muted-foreground">
              You can {requiredFor === 'invest' ? 'invest' : 'issue properties'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: KYCStatus) => {
    const styles = {
      not_started: 'bg-gray-500/10 text-gray-500',
      pending: 'bg-yellow-500/10 text-yellow-500',
      reviewing: 'bg-blue-500/10 text-blue-500',
      approved: 'bg-green-500/10 text-green-500',
      rejected: 'bg-red-500/10 text-red-500',
      expired: 'bg-orange-500/10 text-orange-500',
    };

    const icons = {
      not_started: Shield,
      pending: Clock,
      reviewing: Clock,
      approved: CheckCircle,
      rejected: AlertCircle,
      expired: AlertCircle,
    };

    const Icon = icons[status];

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold mb-1">Identity Verification Required</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {requiredFor === 'invest' 
              ? 'Complete verification to invest in properties'
              : requiredFor === 'issue'
                ? 'Complete verification to issue properties'
                : 'Complete verification to invest and issue properties'
            }
          </p>

          {kycData && kycData.status !== 'not_started' && (
            <div className="flex items-center gap-3 mb-4">
              {getStatusBadge(kycData.status)}
              {kycData.referenceId && (
                <span className="text-xs text-muted-foreground">
                  Ref: {kycData.referenceId.slice(0, 8)}...
                </span>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 mb-4">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {kycData?.status === 'rejected' && (
            <div className="p-3 rounded-lg bg-red-500/10 mb-4">
              <p className="text-sm text-red-500">
                <strong>Reason:</strong> {kycData.rejectionReason || 'Verification was rejected'}
              </p>
            </div>
          )}

          <button
            onClick={startKYC}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {kycData?.status === 'rejected' ? 'Retry Verification' : 'Start Verification'}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Powered by secure identity verification. Your data is encrypted and protected.
        </p>
      </div>
    </div>
  );
}
