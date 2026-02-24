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
    network: 'sepolia' | 'baseSepolia' | 'mainnet' | 'base';
}
declare const config: WorkflowConfig;
interface ConfidentialHeaders {
    'Authorization': string;
    'X-API-Key': string;
    'X-Request-ID': string;
}
declare function getConfidentialHeaders(): ConfidentialHeaders;
declare function fetchPaymentStatusWithConfidentialHttp(propertyId: number): Promise<PaymentRecord | null>;
declare function verifyPaymentWithChainlink(payment: PaymentRecord): Promise<{
    verified: boolean;
    txHash?: string;
}>;
declare function verifyPayment(payment: PaymentRecord): Promise<boolean>;
declare function callSmartContract(propertyId: number, amount: string, holderAddress: string): Promise<string>;
declare function runWorkflow(): Promise<{
    propertyId: number;
    success: boolean;
    txHash?: string;
    error?: string;
}[]>;
export { runWorkflow, fetchPaymentStatusWithConfidentialHttp, verifyPayment, verifyPaymentWithChainlink, callSmartContract, getConfidentialHeaders, config, };
