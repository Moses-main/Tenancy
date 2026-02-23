import { ethers } from 'ethers';
import * as fs from 'fs';

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
  mockApiUrl: string;
}

const config: WorkflowConfig = {
  propertyRegistryAddress: process.env.PROPERTY_REGISTRY_ADDRESS || '',
  yieldDistributorAddress: process.env.YIELD_DISTRIBUTOR_ADDRESS || '',
  rpcUrl: process.env.SEPOLIA_RPC_URL || '',
  privateKey: process.env.PRIVATE_KEY || '',
  mockApiUrl: process.env.MOCK_API_URL || 'http://localhost:3000/api',
};

const YIELD_DISTRIBUTOR_ABI = [
  'function depositYield(uint256 propertyId, uint256 amount) external',
  'function distributeYield(uint256 distributionId) external',
  'function getPropertyYieldPercentage(uint256 propertyId) external view returns (uint256)',
];

async function fetchPaymentStatus(propertyId: number): Promise<PaymentRecord | null> {
  console.log(`[CRE] Fetching payment status for property ${propertyId}...`);
  
  try {
    const response = await fetch(`${config.mockApiUrl}/payments/${propertyId}`);
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    return await response.json() as PaymentRecord;
  } catch (error) {
    console.log('[CRE] Mock API unavailable, using simulated payment data');
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
      amount: '3500000000000000000',
      currency: 'ETH',
      paymentDate: new Date().toISOString(),
      status: 'verified',
      transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
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
  console.log(`[CRE] Tenant: ${payment.tenantAddress}`);
  console.log(`[CRE] Transaction: ${payment.transactionHash}`);
  
  return true;
}

async function callSmartContract(propertyId: number, amount: string): Promise<string> {
  console.log(`[CRE] Calling YieldDistributor to distribute yield for property ${propertyId}...`);
  
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.privateKey, provider);
  const yieldDistributor = new ethers.Contract(
    config.yieldDistributorAddress,
    YIELD_DISTRIBUTOR_ABI,
    wallet
  );

  try {
    const amountWei = ethers.parseEther('0.1');
    
    const tx = await yieldDistributor.depositYield(propertyId, amountWei);
    console.log(`[CRE] Transaction submitted: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`[CRE] Transaction confirmed in block: ${receipt?.blockNumber}`);
    
    const distTx = await yieldDistributor.distributeYield(0);
    console.log(`[CRE] Distribution transaction submitted: ${distTx.hash}`);
    
    return tx.hash;
  } catch (error) {
    console.error('[CRE] Error calling smart contract:', error);
    throw error;
  }
}

async function runWorkflow() {
  console.log('=== TENANCY CRE Workflow Started ===');
  console.log(`[CRE] Timestamp: ${new Date().toISOString()}`);
  console.log(`[CRE] Property Registry: ${config.propertyRegistryAddress}`);
  console.log(`[CRE] Yield Distributor: ${config.yieldDistributorAddress}`);
  console.log('');

  const properties = [0, 1, 2];
  const results: Array<{ propertyId: number; success: boolean; txHash?: string; error?: string }> = [];

  for (const propertyId of properties) {
    console.log(`\n--- Processing Property ${propertyId} ---`);
    
    try {
      const payment = await fetchPaymentStatus(propertyId);
      
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

      const txHash = await callSmartContract(propertyId, payment.amount);
      results.push({ propertyId, success: true, txHash });
      
    } catch (error) {
      console.error(`[CRE] Error processing property ${propertyId}:`, error);
      results.push({ propertyId, success: false, error: String(error) });
    }
  }

  console.log('\n=== Workflow Results ===');
  console.log(JSON.stringify(results, null, 2));

  const successCount = results.filter(r => r.success).length;
  console.log(`\n[CRE] Success: ${successCount}/${results.length} properties processed`);

  const logEntry = {
    timestamp: new Date().toISOString(),
    results,
  };
  
  fs.appendFileSync('workflow-logs.json', JSON.stringify(logEntry) + '\n');
  console.log('[CRE] Results logged to workflow-logs.json');

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

export { runWorkflow, fetchPaymentStatus, verifyPayment, callSmartContract };
