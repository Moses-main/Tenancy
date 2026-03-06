import { getExplorerUrl } from './contracts';

export type SettlementStatus = 'initiated' | 'pending' | 'confirmed' | 'settled' | 'failed';
export type SettlementAction = 'investor_buy' | 'marketplace_buy';

export interface SettlementReceipt {
  id: string;
  walletAddress: string;
  chainId: number;
  action: SettlementAction;
  status: SettlementStatus;
  title: string;
  subtitle?: string;
  amountTen?: string;
  amountUsdc?: string;
  counterparty?: string;
  listingId?: number;
  propertyToken?: string;
  txHash?: string;
  txUrl?: string;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'tenancy:settlement-receipts:v1';

const canUseStorage = () => typeof window !== 'undefined' && !!window.localStorage;

const safeParse = (value: string | null): SettlementReceipt[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const getAllSettlementReceipts = (): SettlementReceipt[] => {
  if (!canUseStorage()) return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
};

export const getSettlementReceiptsForWallet = (walletAddress?: string | null): SettlementReceipt[] => {
  if (!walletAddress) return [];
  const lower = walletAddress.toLowerCase();
  return getAllSettlementReceipts()
    .filter((receipt) => receipt.walletAddress.toLowerCase() === lower)
    .sort((a, b) => b.updatedAt - a.updatedAt);
};

const saveReceipts = (receipts: SettlementReceipt[]) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
};

export const upsertSettlementReceipt = (receipt: SettlementReceipt) => {
  const receipts = getAllSettlementReceipts();
  const index = receipts.findIndex((item) => item.id === receipt.id);
  if (index >= 0) {
    receipts[index] = receipt;
  } else {
    receipts.unshift(receipt);
  }
  saveReceipts(receipts.slice(0, 200));
};

export const createSettlementReceipt = (payload: {
  walletAddress: string;
  chainId: number;
  action: SettlementAction;
  title: string;
  subtitle?: string;
  amountTen?: string;
  amountUsdc?: string;
  counterparty?: string;
  listingId?: number;
  propertyToken?: string;
}): SettlementReceipt => {
  const now = Date.now();
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 10)}`,
    walletAddress: payload.walletAddress,
    chainId: payload.chainId,
    action: payload.action,
    status: 'initiated',
    title: payload.title,
    subtitle: payload.subtitle,
    amountTen: payload.amountTen,
    amountUsdc: payload.amountUsdc,
    counterparty: payload.counterparty,
    listingId: payload.listingId,
    propertyToken: payload.propertyToken,
    createdAt: now,
    updatedAt: now,
  };
};

export const patchSettlementReceipt = (
  receiptId: string,
  patch: Partial<SettlementReceipt> & { status?: SettlementStatus; txHash?: string; chainId?: number }
) => {
  const receipts = getAllSettlementReceipts();
  const index = receipts.findIndex((receipt) => receipt.id === receiptId);
  if (index < 0) return;

  const existing = receipts[index];
  const chainId = patch.chainId ?? existing.chainId;
  const txHash = patch.txHash ?? existing.txHash;
  const txUrl = txHash ? getExplorerUrl(chainId, undefined, txHash) : existing.txUrl;

  receipts[index] = {
    ...existing,
    ...patch,
    txHash,
    txUrl,
    updatedAt: Date.now(),
  };

  saveReceipts(receipts);
};
