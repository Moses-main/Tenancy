import { ethers } from 'ethers';

export interface VerificationRequest {
  propertyId: string;
  propertyAddress: string;
  tenantAddress: string;
  expectedRentAmount: number;
  paymentProof: string;
}

export interface VerificationResult {
  verificationId: string;
  propertyId: string;
  status: 'pending' | 'verified' | 'failed';
  chainlinkTx?: string;
  verifiedAt?: number;
  error?: string;
}

export interface PriceFeedData {
  ethUsdPrice: number;
  lastUpdate: number;
  roundId: number;
}

const CHAINLINK_FUNCTIONS_ROUTER = import.meta.env.VITE_CHAINLINK_ROUTER || '0xf9B8fc078197181C841c296C876945aaa425B278';
const CHAINLINK_SUBSCRIPTION_ID = import.meta.env.VITE_CHAINLINK_SUBSCRIPTION_ID || '6273';

const PRICE_FEED_ABI = [
  'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() external view returns (uint8)',
];

export const getEthUsdPrice = async (provider?: any): Promise<PriceFeedData | null> => {
  const CHAIN_ID = import.meta.env.VITE_NETWORK === 'sepolia' ? 11155111 : 84532;
  const PRICE_FEED_ADDRESS = CHAIN_ID === 84532 
    ? '0x4a5816300e0eE47A41DFcDB12A8C8bB6dD18C12'
    : '0x694AA1769357215DE4FAC081bf1f309aDC325306';

  try {
    let ethersProvider: ethers.Provider;
    
    if (provider) {
      ethersProvider = provider;
    } else if (typeof window !== 'undefined' && (window as any).ethereum) {
      ethersProvider = new ethers.providers.Web3Provider((window as any).ethereum);
    } else {
      const rpcUrl = CHAIN_ID === 84532 
        ? 'https://sepolia.base.org'
        : 'https://rpc.sepolia.org';
      ethersProvider = new ethers.JsonRpcProvider(rpcUrl);
    }

    const priceFeed = new ethers.Contract(PRICE_FEED_ADDRESS, PRICE_FEED_ABI, ethersProvider);
    const [roundId, answer, startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();
    const decimals = await priceFeed.decimals();
    
    return {
      ethUsdPrice: Number(answer) / Math.pow(10, decimals),
      lastUpdate: Number(updatedAt) * 1000,
      roundId: Number(roundId),
    };
  } catch (error) {
    console.error('Error fetching ETH/USD price:', error);
    return null;
  }
};

export const triggerRentalVerification = async (
  request: VerificationRequest
): Promise<VerificationResult> => {
  if (!CHAINLINK_SUBSCRIPTION_ID || !CHAINLINK_FUNCTIONS_ROUTER || CHAINLINK_SUBSCRIPTION_ID === 'your_subscription_id') {
    console.warn('Chainlink Functions not configured, using simulation mode');
    return simulateVerification(request);
  }

  try {
    const response = await fetch('/api/chainlink/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        subscriptionId: CHAINLINK_SUBSCRIPTION_ID,
        routerAddress: CHAINLINK_FUNCTIONS_ROUTER,
      }),
    });

    if (!response.ok) {
      throw new Error(`Verification request failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error triggering Chainlink verification:', error);
    return {
      verificationId: `sim-${Date.now()}`,
      propertyId: request.propertyId,
      status: 'pending',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

const simulateVerification = async (request: VerificationRequest): Promise<VerificationResult> => {
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const isVerified = Math.random() > 0.1;
  
  return {
    verificationId: `sim-${Date.now()}`,
    propertyId: request.propertyId,
    status: isVerified ? 'verified' : 'failed',
    chainlinkTx: `0x${Math.random().toString(16).slice(2, 34)}...${Math.random().toString(16).slice(2, 6)}`,
    verifiedAt: isVerified ? Date.now() : undefined,
    error: isVerified ? undefined : 'Payment verification failed - insufficient confirmations',
  };
};

export const checkVerificationStatus = async (
  verificationId: string
): Promise<VerificationResult> => {
  try {
    const response = await fetch(`/api/chainlink/status/${verificationId}`);
    
    if (!response.ok) {
      throw new Error(`Status check failed: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error checking verification status:', error);
    return {
      verificationId,
      propertyId: '',
      status: 'pending',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const getVerificationHistory = async (
  propertyId: string
): Promise<VerificationResult[]> => {
  try {
    const response = await fetch(`/api/chainlink/history/${propertyId}`);
    
    if (!response.ok) {
      throw new Error(`History fetch failed: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching verification history:', error);
    return [];
  }
};

export const simulateRentPayment = async (
  propertyId: string,
  amount: number,
  tenantAddress: string
): Promise<VerificationResult> => {
  console.log(`Simulating rent payment: Property ${propertyId}, Amount ${amount}, Tenant ${tenantAddress}`);
  
  return simulateVerification({
    propertyId,
    propertyAddress: '',
    tenantAddress,
    expectedRentAmount: amount,
    paymentProof: `0x${Math.random().toString(16).slice(2)}`,
  });
};

export const isChainlinkConfigured = (): boolean => {
  return !!(CHAINLINK_SUBSCRIPTION_ID && CHAINLINK_SUBSCRIPTION_ID !== 'your_subscription_id');
};

export const getChainlinkConfig = () => ({
  router: CHAINLINK_FUNCTIONS_ROUTER,
  subscriptionId: CHAINLINK_SUBSCRIPTION_ID,
  isConfigured: isChainlinkConfigured(),
});
