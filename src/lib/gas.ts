import { ethers, TransactionReceipt } from 'ethers';

type Web3Provider = ethers.providers.Web3Provider;

export interface GasEstimate {
  gasLimit: bigint;
  gasPrice: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  estimatedCost: bigint;
  estimatedCostUSD: number;
}

export interface TransactionOptions {
  gasLimit?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  nonce?: number;
  value?: bigint;
  onAttempt?: (attempt: number, maxAttempts: number) => void;
  onGasEstimate?: (estimate: GasEstimate) => void;
}

export interface TransactionResult {
  receipt: TransactionReceipt | null;
  error: Error | null;
  attempts: number;
  finalGasUsed: bigint;
}

const DEFAULT_MAX_RETRIES = 3;
const GAS_BUFFER_PERCENT = 20;
const MAX_GAS_PRICE_GWEI = 500;

export async function estimateGas(
  provider: Web3Provider,
  tx: Promise<{ gasLimit?: bigint; to?: string; data?: string; value?: bigint }>,
  priceFeedAddress?: string
): Promise<GasEstimate> {
  const populatedTx = await tx;
  const feeData = await provider.getFeeData();
  
  const block = await provider.getBlock('latest');
  const baseFeePerGas = block?.baseFeePerGas || feeData.gasPrice || 0n;
  
  let gasLimit = populatedTx.gasLimit;
  if (!gasLimit) {
    try {
      gasLimit = await provider.estimateGas(populatedTx);
      gasLimit = (gasLimit * (100n + BigInt(GAS_BUFFER_PERCENT))) / 100n;
    } catch {
      gasLimit = 500000n;
    }
  }

  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || 1000000000n;
  const maxFeePerGas = (baseFeePerGas * 2n) + maxPriorityFeePerGas;

  let gasPrice = feeData.gasPrice || maxFeePerGas;
  if (gasPrice > BigInt(MAX_GAS_PRICE_GWEI) * 1000000000n) {
    gasPrice = BigInt(MAX_GAS_PRICE_GWEI) * 1000000000n;
  }

  const estimatedCost = gasLimit * gasPrice;
  let estimatedCostUSD = 0;

  if (priceFeedAddress) {
    try {
      const priceFeed = new ethers.Contract(
        priceFeedAddress,
        ['function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)'],
        provider
      );
      const [, price] = await priceFeed.latestRoundData();
      const priceEth = Number(price) / 1e8;
      const costEth = Number(estimatedCost) / 1e18;
      estimatedCostUSD = costEth * priceEth;
    } catch {
      estimatedCostUSD = Number(estimatedCost) / 1e18 * 3000;
    }
  }

  return {
    gasLimit,
    gasPrice,
    maxFeePerGas,
    maxPriorityFeePerGas,
    estimatedCost,
    estimatedCostUSD,
  };
}

export async function sendTransactionWithRetry(
  provider: Web3Provider,
  tx: Promise<{ to?: string; data?: string; value?: bigint; gasLimit?: bigint; gasPrice?: bigint; maxFeePerGas?: bigint; maxPriorityFeePerGas?: bigint; nonce?: number }>,
  options: TransactionOptions = {}
): Promise<TransactionResult> {
  const {
    onAttempt,
    onGasEstimate,
  } = options;

  let attempts = 0;
  const maxAttempts = DEFAULT_MAX_RETRIES;
  let lastError: Error | null = null;
  let finalGasUsed = 0n;
  let receipt: TransactionReceipt | null = null;

  while (attempts < maxAttempts) {
    attempts++;
    onAttempt?.(attempts, maxAttempts);

    try {
      const populatedTx = await tx;
      
      if (onGasEstimate && attempts === 1) {
        const estimate = await estimateGas(provider, Promise.resolve(populatedTx));
        onGasEstimate(estimate);
      }

      const signer = await provider.getSigner();
      const response = await signer.sendTransaction(populatedTx);
      
      receipt = await response.wait();
      
      if (receipt) {
        finalGasUsed = receipt.gasUsed;
        
        if (receipt.status === 0) {
          throw new Error('Transaction reverted');
        }
        
        return {
          receipt,
          error: null,
          attempts,
          finalGasUsed,
        };
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (lastError.message.includes('nonce too low')) {
        continue;
      }
      
      if (lastError.message.includes('insufficient funds')) {
        throw new Error('Insufficient funds for transaction');
      }
      
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
        continue;
      }
    }
  }

  return {
    receipt,
    error: lastError || new Error('Transaction failed after max retries'),
    attempts,
    finalGasUsed,
  };
}

export function formatGasCost(wei: bigint): string {
  const eth = Number(wei) / 1e18;
  if (eth < 0.01) {
    return `${(wei / 1000000000n).toString()} gwei`;
  }
  return `${eth.toFixed(6)} ETH`;
}

export function formatUSD(wei: bigint, ethUsdPrice: number = 3000): string {
  const eth = Number(wei) / 1e18;
  return `$${(eth * ethUsdPrice).toFixed(2)}`;
}
