interface WorldIdProof {
    merkle_root: string;
    nullifier_hash: string;
    proof: string;
}
interface VerificationResult {
    isValid: boolean;
    nullifierHash: string;
    timestamp: number;
}
interface WorldIdConfig {
    appId: string;
    action: string;
    signal: string;
}
declare function getWorldIdConfig(signal: string): WorldIdConfig;
declare function verifyWorldIdProof(proof: WorldIdProof, signal: string): Promise<VerificationResult>;
declare function mockVerifyWorldId(proof: WorldIdProof): VerificationResult;
declare function generateMockProof(): WorldIdProof;
interface ClaimWithWorldIdRequest {
    claimant: string;
    distributionId: number;
    amount: string;
    worldIdProof: WorldIdProof;
}
declare function processClaimWithWorldId(request: ClaimWithWorldIdRequest): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
}>;
declare function verifyMultipleClaims(claims: ClaimWithWorldIdRequest[]): Promise<Map<string, {
    success: boolean;
    txHash?: string;
    error?: string;
}>>;
export { WorldIdProof, VerificationResult, WorldIdConfig, verifyWorldIdProof, generateMockProof, processClaimWithWorldId, verifyMultipleClaims, getWorldIdConfig, mockVerifyWorldId, };
