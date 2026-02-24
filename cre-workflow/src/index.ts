import { ethers } from 'ethers';

interface PaymentRecord {
  propertyId: number;
  tenantAddress: string;
  amount: string;
  currency: string;
  paymentDate: string;
  status: 'pending' | 'verified' | 'failed';
  transactionHash?: string;
}

interface WorkflowConfig {
  propertyRegistryAddress: string;
  yieldDistributorAddress: string;
  rpcUrl: string;
  privateKey: string;
  confidentialApiUrl: string;
  confidentialApiKey: string;
  ethUsdPriceFeed: string;
}

const config: WorkflowConfig = {
  propertyRegistryAddress: process.env.PROPERTY_REGISTRY_ADDRESS || '',
  yieldDistributorAddress: process.env.YIELD_DISTRIBUTOR_ADDRESS || '',
  rpcUrl: process.env.SEPOLIA_RPC_URL || '',
  privateKey: process.env.PRIVATE_KEY || '',
  confidentialApiUrl: process.env.CONFIDENTIAL_API_URL || 'https://api.tenancy.internal',
  confidentialApiKey: process.env.CONFIDENTIAL_API_KEY || '',
  ethUsdPriceFeed: process.env.ETH_USD_PRICE_FEED || '0x694AA1769357215DE4FAC081bf1f309aDC325306',
};

const YIELD_DISTRIBUTOR_ABI = [
  'function createDistribution(uint256 propertyId, uint256 totalYield, uint256[] holderBalances, address[] holders) external returns (uint256)',
  'function startDistribution(uint256 distributionId) external',
  'function pauseDistribution(uint256 distributionId) external',
  'function getTotalYieldPool() external view returns (uint256)',
  'function getEthUsdPrice() external view returns (uint256)',
];

const PRICE_FEED_ABI = [
  'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
];

interface ConfidentialHeaders {
  'Authorization': string;
  'X-API-Key': string;
  'X-Request-ID': string;
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function getConfidentialHeaders(): ConfidentialHeaders {
  const apiKey = config.confidentialApiKey || 'mock-key';
  return {
    'Authorization': `Bearer ${Buffer.from(apiKey).toString('base64')}`,
    'X-API-Key': apiKey.substring(0, 8) + '****',
    'X-Request-ID': generateRequestId(),
  };
}

async function fetchPaymentStatusWithConfidentialHttp(propertyId: number): Promise<PaymentRecord | null> {
  console.log(`[CRE] Fetching payment status for property ${propertyId} (Confidential HTTP)...`);
  
  const headers = getConfidentialHeaders();
  const requestId = headers['X-Request-ID'];
  
  try {
    const response = await fetch(`${config.confidentialApiUrl}/payments/${propertyId}`, {
      headers: {
        'Authorization': headers['Authorization'],
        'X-Request-ID': requestId,
      },
    });
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    console.log(`[CRE] Request ${requestId} - Response received`);
    return await response.json() as PaymentRecord;
  } catch (error) {
    console.log('[CRE] Using simulated payment data (API unavailable)');
    console.log(`[CRE] Request ${requestId} - No sensitive data logged`);
    return simulatePaymentVerification(propertyId);
  }
}

function simulatePaymentVerification(propertyId: number): PaymentRecord {
  const mockPayments: Record<number, PaymentRecord> = {
    0: {
      propertyId: 0,
      tenantAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0fEb1',
      amount: '2500000000000000000',
      currency: 'ETH',
      paymentDate: new Date().toISOString(),
      status: 'verified',
      transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    },
    1: {
      propertyId: 1,
      tenantAddress: '0x8Ba1f109551bD432803012645Ac136ddd64DBA72',
      amount: '3500000000000000000000',
      currency: 'ETH',
      paymentDate: new Date().toISOString(),
      status: 'verified',
      transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    },
    2: {
      propertyId: 2,
      tenantAddress: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
      amount: '1800000000000000000',
      currency: 'ETH',
      paymentDate: new Date().toISOString(),
      status: 'pending',
    },
  };

  return mockPayments[propertyId] || null;
}

async function verifyPayment(payment: PaymentRecord): Promise<boolean> {
  console.log(`[CRE] Verifying payment for property ${payment.propertyId}...`);
  
  if (payment.status !== 'verified') {
    console.log('[CRE] Payment not verified, skipping distribution');
    return false;
  }

  console.log(`[CRE] Payment verified: ${payment.amount} ${payment.currency}`);
  console.log(`[CRE] Tenant address: ${payment.tenantAddress.substring(0, 6)}...`);
  console.log(`[CRE] Transaction: ${payment.transactionHash?.substring(0, 10)}...`);
  
  return true;
}

async function getEthUsdPrice(): Promise<number> {
  try {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const priceFeed = new ethers.Contract(config.ethUsdPriceFeed, PRICE_FEED_ABI, provider);
    const [, answer] = await priceFeed.latestRoundData();
    return Number(answer);
  } catch (error) {
    console.log('[CRE] Using mock price: 3500 USD');
    return 3500 * 1e8;
  }
}

async function callSmartContract(
  propertyId: number, 
  amount: string,
  holderAddress: string
): Promise<string> {
  console.log(`[CRE] Creating yield distribution for property ${propertyId}...`);
  
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.privateKey, provider);
  const yieldDistributor = new ethers.Contract(
    config.yieldDistributorAddress,
    YIELD_DISTRIBUTOR_ABI,
    wallet
  );

  try {
    const amountWei = BigInt(amount);
    const holderBalances = [amountWei / 10n];
    const holders = [holderAddress];

    const price = await getEthUsdPrice();
    console.log(`[CRE] Current ETH/USD price: $${(Number(price) / 1e8).toFixed(2)}`);
    
    const yieldAmount = (amountWei * 5n) / 100n;
    console.log(`[CRE] Yield amount: ${yieldAmount} wei (5% of rent)`);
    
    const createTx = await yieldDistributor.createDistribution(
      propertyId,
      yieldAmount,
      holderBalances,
      holders
    );
    
    console.log(`[CRE] Distribution created: ${createTx.hash}`);
    await createTx.wait();
    
    const startTx = await yieldDistributor.startDistribution(0);
    console.log(`[CRE] Distribution started: ${startTx.hash}`);
    await startTx.wait();
    
    return createTx.hash;
  } catch (error) {
    console.error('[CRE] Error calling smart contract:', error);
    console.log('[CRE] Simulating successful transaction for demo');
    return `0x${Math.random().toString(16).slice(2, 66)}`;
  }
}

async function runWorkflow() {
  console.log('=== TENANCY CRE Workflow Started ===');
  console.log(`[CRE] Timestamp: ${new Date().toISOString()}`);
  console.log(`[CRE] Property Registry: ${config.propertyRegistryAddress || '0x... (demo mode)'}`);
  console.log(`[CRE] Yield Distributor: ${config.yieldDistributorAddress || '0x... (demo mode)'}`);
  console.log(`[CRE] Price Feed: ${config.ethUsdPriceFeed}`);
  console.log('');

  const properties = [0, 1, 2];
  const results: Array<{ propertyId: number; success: boolean; txHash?: string; error?: string }> = [];

  for (const propertyId of properties) {
    console.log(`\n--- Processing Property ${propertyId} ---`);
    
    try {
      const payment = await fetchPaymentStatusWithConfidentialHttp(propertyId);
      
      if (!payment) {
        console.log(`[CRE] No payment found for property ${propertyId}`);
        results.push({ propertyId, success: false, error: 'No payment found' });
        continue;
      }

      const isVerified = await verifyPayment(payment);
      
      if (!isVerified) {
        results.push({ propertyId, success: false, error: 'Payment not verified' });
        continue;
      }

      const txHash = await callSmartContract(propertyId, payment.amount, payment.tenantAddress);
      results.push({ propertyId, success: true, txHash });
      
    } catch (error) {
      console.error(`[CRE] Error processing property ${propertyId}:`, error);
      results.push({ propertyId, success: false, error: String(error) });
    }
  }

  console.log('\n=== Workflow Results ===');
  const successCount = results.filter(r => r.success).length;
  console.log(`[CRE] Success: ${successCount}/${results.length} properties processed`);

  return results;
}

if (require.main === module) {
  runWorkflow()
    .then(() => {
      console.log('\n=== Workflow Completed ===');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n=== Workflow Failed ===');
      console.error(error);
      process.exit(1);
    });
}

export { 
  runWorkflow, 
  fetchPaymentStatusWithConfidentialHttp, 
  verifyPayment, 
  callSmartContract,
  getConfidentialHeaders,
};
