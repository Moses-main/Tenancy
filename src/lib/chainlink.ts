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

const CHAINLINK_FUNCTIONS_ROUTER = import.meta.env.VITE_CHAINLINK_ROUTER || '0xA9d587a00A1C1E5d7c4D4e0b3d8F7C8E5D2C1A3';
const CHAINLINK_SUBSCRIPTION_ID = import.meta.env.VITE_CHAINLINK_SUBSCRIPTION_ID || '';

export const triggerRentalVerification = async (
  request: VerificationRequest
): Promise<VerificationResult> => {
  if (!CHAINLINK_SUBSCRIPTION_ID || !CHAINLINK_FUNCTIONS_ROUTER) {
    console.warn('Chainlink not configured, returning mock verification');
    return mockVerification(request);
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
      verificationId: `mock-${Date.now()}`,
      propertyId: request.propertyId,
      status: 'pending',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

const mockVerification = async (request: VerificationRequest): Promise<VerificationResult> => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    verificationId: `mock-${Date.now()}`,
    propertyId: request.propertyId,
    status: 'verified',
    chainlinkTx: `0x${Math.random().toString(16).slice(2)}...${Math.random().toString(16).slice(2, 10)}`,
    verifiedAt: Date.now(),
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
  
  return mockVerification({
    propertyId,
    propertyAddress: '',
    tenantAddress,
    expectedRentAmount: amount,
    paymentProof: `0x${Math.random().toString(16).slice(2)}`,
  });
};
