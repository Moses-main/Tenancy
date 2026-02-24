import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type KYCStatus = 
  | 'not_started'
  | 'pending'
  | 'reviewing'
  | 'approved'
  | 'rejected'
  | 'expired';

export interface KYCData {
  status: KYCStatus;
  referenceId?: string;
  submittedAt?: number;
  reviewedAt?: number;
  expiresAt?: number;
  rejectionReason?: string;
  tier: number;
}

interface KYCContextType {
  kycData: KYCData | null;
  isLoading: boolean;
  error: string | null;
  startKYC: () => Promise<void>;
  checkKYCStatus: () => Promise<void>;
  isVerified: boolean;
  canInvest: boolean;
  canIssue: boolean;
}

const KYCContext = createContext<KYCContextType | undefined>(undefined);

const KYC_TIERS = {
  0: { name: 'Unverified', invest: false, issue: false },
  1: { name: 'Basic', invest: true, issue: false },
  2: { name: 'Standard', invest: true, issue: false },
  3: { name: 'Premium', invest: true, issue: true },
};

export function KYCProvider({ children }: { children: ReactNode }) {
  const [kycData, setKycData] = useState<KYCData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startKYC = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/kyc/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to initiate KYC');
      }

      const data = await response.json();
      setKycData({
        status: 'pending',
        referenceId: data.referenceId,
        submittedAt: Date.now(),
        tier: 0,
      });
      
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'KYC initiation failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkKYCStatus = useCallback(async () => {
    if (!kycData?.referenceId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/kyc/status/${kycData.referenceId}`);
      if (!response.ok) return;

      const data = await response.json();
      setKycData({
        status: data.status,
        referenceId: data.referenceId,
        submittedAt: data.submittedAt,
        reviewedAt: data.reviewedAt,
        expiresAt: data.expiresAt,
        rejectionReason: data.rejectionReason,
        tier: data.tier,
      });
    } catch (err) {
      console.error('KYC status check failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [kycData?.referenceId]);

  const isVerified = kycData?.status === 'approved';
  const tierConfig = KYC_TIERS[kycData?.tier || 0];
  const canInvest = tierConfig?.invest || false;
  const canIssue = tierConfig?.issue || false;

  return (
    <KYCContext.Provider
      value={{
        kycData,
        isLoading,
        error,
        startKYC,
        checkKYCStatus,
        isVerified,
        canInvest,
        canIssue,
      }}
    >
      {children}
    </KYCContext.Provider>
  );
}

export function useKYC() {
  const context = useContext(KYCContext);
  if (context === undefined) {
    throw new Error('useKYC must be used within a KYCProvider');
  }
  return context;
}
