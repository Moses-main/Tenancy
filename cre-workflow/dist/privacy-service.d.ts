declare function encrypt(data: string): string;
declare function decrypt(encryptedData: string): string;
declare function hashData(data: string): string;
declare function maskSensitiveData(data: string, visibleChars?: number): string;
declare function maskAddress(address: string): string;
declare function maskAmount(amount: string): string;
declare function maskEmail(email: string): string;
interface SensitivePaymentData {
    tenantPersonalInfo: {
        name: string;
        email: string;
        phone: string;
        bankAccount: string;
    };
    paymentDetails: {
        amount: string;
        currency: string;
        transactionId: string;
    };
    propertyDetails: {
        address: string;
        rentAmount: string;
    };
}
declare function sanitizePaymentData(rawData: SensitivePaymentData): {
    maskedTenant: {
        name: string;
        email: string;
        phone: string;
    };
    maskedPayment: {
        amount: string;
        currency: string;
    };
    verificationHash: string;
};
interface PrivateYieldCalculation {
    holderAddress: string;
    totalHolding: string;
    yieldAmount: string;
    calculationHash: string;
}
declare function calculatePrivateYield(holderAddress: string, totalHolding: bigint, distributionAmount: bigint, totalSupply: bigint): PrivateYieldCalculation;
declare function verifyYieldCalculation(holderAddress: string, totalHolding: bigint, distributionAmount: bigint, totalSupply: bigint, providedHash: string): boolean;
interface ConfidentialRequest {
    headers: {
        'Authorization': string;
        'X-API-Key': string;
        'X-Request-ID': string;
        'X-Encryption-Key-ID'?: string;
    };
    body: string;
}
declare function createConfidentialRequest(payload: any, apiKey: string): ConfidentialRequest;
declare function logPrivacySafe(event: string, data: Record<string, any>): void;
export { encrypt, decrypt, hashData, maskSensitiveData, maskAddress, maskAmount, maskEmail, sanitizePaymentData, PrivateYieldCalculation, calculatePrivateYield, verifyYieldCalculation, ConfidentialRequest, createConfidentialRequest, logPrivacySafe, SensitivePaymentData, };
