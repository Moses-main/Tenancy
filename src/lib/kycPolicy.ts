import type { KYCData } from './KYCContext';

export const KYC_POLICY = {
  largeBuyUsdThreshold: 2500,
  minTierForLargeBuy: 2,
  minTierForIssuance: 3,
} as const;

export type KycGateResult = {
  allowed: boolean;
  reason?: string;
};

const isApproved = (kycData: KYCData | null) => kycData?.status === 'approved';
const getTier = (kycData: KYCData | null) => kycData?.tier || 0;

export const canIssueProperty = (kycData: KYCData | null): KycGateResult => {
  if (!isApproved(kycData)) {
    return { allowed: false, reason: 'Complete KYC approval before tokenizing properties.' };
  }
  if (getTier(kycData) < KYC_POLICY.minTierForIssuance) {
    return { allowed: false, reason: 'Issuer actions require Premium KYC tier (tier 3).' };
  }
  return { allowed: true };
};

export const canInvestAmount = (kycData: KYCData | null, usdAmount: number): KycGateResult => {
  if (!isApproved(kycData)) {
    return { allowed: false, reason: 'Complete KYC approval before purchasing property tokens.' };
  }
  if (getTier(kycData) < 1) {
    return { allowed: false, reason: 'Investment actions require at least Basic KYC tier (tier 1).' };
  }
  if (usdAmount >= KYC_POLICY.largeBuyUsdThreshold && getTier(kycData) < KYC_POLICY.minTierForLargeBuy) {
    return {
      allowed: false,
      reason: `Large buys (${KYC_POLICY.largeBuyUsdThreshold} USDC+) require KYC tier ${KYC_POLICY.minTierForLargeBuy} or above.`,
    };
  }
  return { allowed: true };
};
