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
export declare class ChainlinkExternalAdapter {
    private network;
    private config;
    private provider;
    private oracleContract;
    constructor(network?: string);
    initialize(rpcUrl: string): void;
    verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResponse>;
    private fetchFromPaymentAPI;
    private mockVerification;
    triggerChainlinkJob(propertyId: string, paymentData: PaymentVerificationRequest): Promise<string>;
    fulfillOracleRequest(requestId: string, verified: boolean, callbackContract: string, callbackFunctionId: string): Promise<string>;
    private maskAddress;
    private formatAmount;
    getConfig(): ChainlinkJobConfig;
    isConfigured(): boolean;
}
export declare const chainlinkAdapter: ChainlinkExternalAdapter;
