import { useCallback, useState } from 'react';
import { ethers } from 'ethers';

type Web3Provider = ethers.providers.Web3Provider;
import { useAuth } from './AuthContext';
import { 
  estimateGas, 
  sendTransactionWithRetry, 
  formatGasCost,
  formatUSD,
  type GasEstimate,
  type TransactionOptions 
} from './gas';

export interface GasHookResult {
  gasEstimate: GasEstimate | null;
  isEstimating: boolean;
  error: string | null;
  estimateGas: (tx: Promise<{ to?: string; data?: string; value?: bigint }>) => Promise<void>;
  sendWithRetry: (
    tx: Promise<{ to?: string; data?: string; value?: bigint; gasLimit?: bigint }>,
    options?: TransactionOptions
  ) => Promise<{ success: boolean; txHash?: string; error?: string }>;
}

const PRICE_FEED_ADDRESS: Record<number, string> = {
  84532: '0x0e36E870452C86c18ea7b494DD81eC026982b85F', // Base Sepolia
  11155111: '0x694AA1769357215DE4FAC081bf1f309aDC325306', // Sepolia
  1: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // Mainnet
  8453: '0x71041dddad3595F9CEdA2b2D3E0dD9cE5F0d6d8', // Base
};

export function useGasManagement(): GasHookResult {
  const { provider, chainId } = useAuth();
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceFeedAddress = chainId ? PRICE_FEED_ADDRESS[chainId] : undefined;

  const handleEstimateGas = useCallback(async (
    tx: Promise<{ to?: string; data?: string; value?: bigint }>
  ) => {
    if (!provider) {
      setError('Wallet not connected');
      return;
    }

    setIsEstimating(true);
    setError(null);

    try {
      const estimate = await estimateGas(provider, tx, priceFeedAddress);
      setGasEstimate(estimate);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gas estimation failed';
      setError(message);
    } finally {
      setIsEstimating(false);
    }
  }, [provider, priceFeedAddress]);

  const handleSendWithRetry = useCallback(async (
    tx: Promise<{ to?: string; data?: string; value?: bigint; gasLimit?: bigint }>,
    options?: TransactionOptions
  ): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    if (!provider) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      const estimate = await estimateGas(provider, tx, priceFeedAddress);
      
      const result = await sendTransactionWithRetry(
        provider,
        tx,
        {
          ...options,
          gasLimit: estimate.gasLimit,
          maxFeePerGas: estimate.maxFeePerGas,
          maxPriorityFeePerGas: estimate.maxPriorityFeePerGas,
          onGasEstimate: (est) => setGasEstimate(est),
        }
      );

      if (result.receipt) {
        return { success: true, txHash: result.receipt.hash };
      }

      return { success: false, error: result.error?.message || 'Transaction failed' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transaction failed';
      return { success: false, error: message };
    }
  }, [provider, priceFeedAddress]);

  return {
    gasEstimate,
    isEstimating,
    error,
    estimateGas: handleEstimateGas,
    sendWithRetry: handleSendWithRetry,
  };
}

export { formatGasCost, formatUSD };
