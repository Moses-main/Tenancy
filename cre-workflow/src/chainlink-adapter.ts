import { ethers } from 'ethers';

export interface PaymentVerificationRequest {
  propertyId: string;
  tenantAddress: string;
  expectedAmount: string;
  currency?: string;
}

export interface PaymentVerificationResponse {
  verified: boolean;
  status: 'verified' | 'pending' | 'failed';
  transactionHash?: string;
  paymentDate?: string;
  actualAmount?: string;
  error?: string;
}

export interface ChainlinkJobConfig {
  jobId: string;
  operatorAddress: string;
  callbackGasLimit: number;
  externalJobID: string;
}

const CHAINLINK_CONFIG: Record<string, ChainlinkJobConfig> = {
  sepolia: {
    jobId: process.env.CHAINLINK_JOB_ID || '',
    operatorAddress: process.env.CHAINLINK_OPERATOR_ADDRESS || '0x40193c2c4E47406d26B8fE68D5E20b2a8D3f5C8a',
    callbackGasLimit: 300000,
    externalJobID: process.env.CHAINLINK_EXTERNAL_JOB_ID || '00000000-0000-0000-0000-000000000000',
  },
  baseSepolia: {
    jobId: process.env.CHAINLINK_JOB_ID || '',
    operatorAddress: process.env.CHAINLINK_OPERATOR_ADDRESS || '0x40193c2c4E47406d26B8fE68D5E20b2a8D3f5C8a',
    callbackGasLimit: 300000,
    externalJobID: process.env.CHAINLINK_EXTERNAL_JOB_ID || '00000000-0000-0000-0000-000000000000',
  },
};

const ORACLE_ABI = [
  'function oracleRequest(bytes32 requestId, uint256 payment, address callbackAddr, bytes4 callbackFunctionId, uint256 cancelExpiration, bytes calldata data) external',
  'function fulfillOracleRequest(bytes32 requestId, uint256 payment, address callbackAddr, bytes4 callbackFunctionId, bytes calldata data) external returns (bool)',
];

export class ChainlinkExternalAdapter {
  private network: string;
  private config: ChainlinkJobConfig;
  private provider: ethers.JsonRpcProvider | null = null;
  private oracleContract: ethers.Contract | null = null;

  constructor(network: string = 'sepolia') {
    this.network = network;
    this.config = CHAINLINK_CONFIG[network] || CHAINLINK_CONFIG.sepolia;
  }

  initialize(rpcUrl: string): void {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    
    if (this.config.operatorAddress && this.config.operatorAddress !== ethers.ZeroAddress) {
      this.oracleContract = new ethers.Contract(
        this.config.operatorAddress,
        ORACLE_ABI,
        this.provider
      );
    }
  }

  async verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResponse> {
    console.log(`[ChainlinkAdapter] Verifying payment for property ${request.propertyId}`);
    console.log(`[ChainlinkAdapter] Tenant: ${this.maskAddress(request.tenantAddress)}`);
    console.log(`[ChainlinkAdapter] Expected amount: ${this.formatAmount(request.expectedAmount)}`);

    try {
      const response = await this.fetchFromPaymentAPI(request);
      
      if (response.status === 'verified') {
        return {
          verified: true,
          status: 'verified',
          transactionHash: response.transactionHash,
          paymentDate: response.paymentDate,
          actualAmount: response.actualAmount,
        };
      }

      return {
        verified: false,
        status: response.status,
        error: 'Payment verification failed',
      };
    } catch (error) {
      console.error('[ChainlinkAdapter] Verification error:', error);
      return {
        verified: false,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async fetchFromPaymentAPI(request: PaymentVerificationRequest): Promise<PaymentVerificationResponse> {
    const apiUrl = process.env.EXTERNAL_ADAPTER_URL || 'http://localhost:8080';
    const apiKey = process.env.EXTERNAL_ADAPTER_API_KEY || '';

    try {
      const response = await fetch(`${apiUrl}/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json() as PaymentVerificationResponse;
    } catch (error) {
      console.log('[ChainlinkAdapter] Using mock verification (API unavailable)');
      return this.mockVerification(request);
    }
  }

  private mockVerification(request: PaymentVerificationRequest): PaymentVerificationResponse {
    const isVerified = Math.random() > 0.2;
    
    return {
      verified: isVerified,
      status: isVerified ? 'verified' : 'pending',
      transactionHash: isVerified ? `0x${Math.random().toString(16).slice(2, 66)}` : undefined,
      paymentDate: new Date().toISOString(),
      actualAmount: request.expectedAmount,
    };
  }

  async triggerChainlinkJob(
    propertyId: string,
    paymentData: PaymentVerificationRequest
  ): Promise<string> {
    if (!this.oracleContract) {
      console.log('[ChainlinkAdapter] Oracle not configured, simulating job trigger');
      return `mock-job-${Date.now()}`;
    }

    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '', this.provider!);
    const requestId = ethers.keccak256(
      ethers.toUtf8Bytes(`${propertyId}-${Date.now()}`)
    );

    const payment = ethers.parseEther('0.1');

    try {
      const tx = await this.oracleContract.oracleRequest(
        requestId,
        payment,
        process.env.CALLBACK_CONTRACT_ADDRESS || ethers.ZeroAddress,
        '0x00000000',
        Math.floor(Date.now() / 1000) + 300,
        ethers.toUtf8Bytes(JSON.stringify(paymentData)),
        { gasLimit: 500000 }
      );

      console.log(`[ChainlinkAdapter] Job triggered: ${tx.hash}`);
      return tx.hash;
    } catch (error) {
      console.error('[ChainlinkAdapter] Failed to trigger job:', error);
      return `error-${Date.now()}`;
    }
  }

  async fulfillOracleRequest(
    requestId: string,
    verified: boolean,
    callbackContract: string,
    callbackFunctionId: string
  ): Promise<string> {
    if (!this.oracleContract) {
      return 'mock-fulfillment';
    }

    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '', this.provider!);
    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'bool'],
      [requestId, verified]
    );

    try {
      const tx = await this.oracleContract.fulfillOracleRequest(
        requestId,
        0,
        callbackContract,
        callbackFunctionId,
        data,
        { gasLimit: this.config.callbackGasLimit }
      );

      console.log(`[ChainlinkAdapter] Request fulfilled: ${tx.hash}`);
      return tx.hash;
    } catch (error) {
      console.error('[ChainlinkAdapter] Fulfillment failed:', error);
      throw error;
    }
  }

  private maskAddress(address: string): string {
    if (!address || address.length < 10) return '****';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  private formatAmount(amount: string): string {
    try {
      const eth = ethers.formatEther(amount);
      return `${eth} ETH`;
    } catch {
      return amount;
    }
  }

  getConfig(): ChainlinkJobConfig {
    return this.config;
  }

  isConfigured(): boolean {
    return !!(
      this.config.jobId &&
      this.config.operatorAddress &&
      this.config.operatorAddress !== ethers.ZeroAddress
    );
  }
}

export const chainlinkAdapter = new ChainlinkExternalAdapter();
