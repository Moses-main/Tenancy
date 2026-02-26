export interface TransactionReceipt {
  hash: string;
  blockNumber?: number;
  gasUsed?: bigint;
  status: 'success' | 'failure' | 'pending';
  timestamp?: number;
  from: string;
  to: string;
  value?: string;
  logs?: any[];
  confirmations?: number;
}

export interface TransactionStatus {
  status: 'pending' | 'confirmed' | 'failed';
  receipt?: TransactionReceipt;
  message: string;
  explorerUrl?: string;
}

export function formatTransactionHash(hash: string, startChars = 6, endChars = 4): string {
  if (!hash || hash.length < startChars + endChars) return hash;
  return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}

export function getExplorerUrl(hash: string, chainId: number): string {
  const explorers: { [key: number]: string } = {
    1: 'https://etherscan.io',
    5: 'https://goerli.etherscan.io',
    11155111: 'https://sepolia.etherscan.io',
    8453: 'https://basescan.org',
    84532: 'https://sepolia.basescan.org',
  };
  
  const baseUrl = explorers[chainId] || explorers[84532];
  return `${baseUrl}/tx/${hash}`;
}

export async function waitForTransaction(
  hash: string,
  provider: any,
  timeout = 300000,
  pollInterval = 5000
): Promise<TransactionReceipt> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const receipt = await provider.getTransactionReceipt(hash);
      
      if (receipt) {
        return {
          hash: receipt.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed,
          status: receipt.status === 1 ? 'success' : 'failure',
          from: receipt.from,
          to: receipt.to || '',
          value: receipt.value?.toString(),
          logs: receipt.logs,
        };
      }
    } catch (error) {
      console.error('Error checking transaction:', error);
    }
    
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  throw new Error('Transaction confirmation timeout');
}

export function parseTransactionError(error: any): string {
  if (!error) return 'Unknown error';
  
  if (error.code === 'INSUFFICIENT_FUNDS') {
    return 'Insufficient funds for gas';
  }
  
  if (error.code === 'USER_REJECTED') {
    return 'Transaction rejected by user';
  }
  
  if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
    return 'Gas estimation failed. Try with a higher gas limit.';
  }
  
  if (error.message) {
    if (error.message.includes('insufficient funds')) {
      return 'Insufficient funds for transaction';
    }
    if (error.message.includes('user rejected')) {
      return 'Transaction rejected by user';
    }
    if (error.message.includes('nonce too low')) {
      return 'Transaction nonce is too low. Please try again.';
    }
    if (error.message.includes('gas required exceeds allowance')) {
      return 'Gas required exceeds allowance';
    }
    
    return error.message.slice(0, 200);
  }
  
  return 'Transaction failed';
}

export function estimateConfirmationTime(gasUsed: bigint, chainId: number): string {
  const baseTime = chainId === 8453 || chainId === 84532 ? 2 : 12;
  const blocks = Number(gasUsed) / 21000;
  const seconds = baseTime * blocks;
  
  if (seconds < 60) {
    return `${Math.ceil(seconds)} seconds`;
  }
  
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes > 1 ? 's' : ''}`;
}

export function getTransactionDescription(txType: string): { label: string; icon: string } {
  const descriptions: { [key: string]: { label: string; icon: string } } = {
    'createProperty': { label: 'Creating Property', icon: '🏠' },
    'depositYield': { label: 'Depositing Yield', icon: '💰' },
    'claimYield': { label: 'Claiming Yield', icon: '🎁' },
    'transfer': { label: 'Transferring Tokens', icon: '↔️' },
    'approve': { label: 'Approving Tokens', icon: '✓' },
    'buyProperty': { label: 'Buying Property Tokens', icon: '🛒' },
    'createListing': { label: 'Creating Listing', icon: '📋' },
    'updateProperty': { label: 'Updating Property', icon: '✏️' },
  };
  
  return descriptions[txType] || { label: 'Processing Transaction', icon: '⏳' };
}

export function formatGasUsed(gasUsed: bigint): string {
  const gas = Number(gasUsed);
  if (gas >= 1000000) {
    return `${(gas / 1000000).toFixed(2)}M`;
  }
  if (gas >= 1000) {
    return `${(gas / 1000).toFixed(1)}K`;
  }
  return gas.toString();
}
