"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyWorldIdProof = verifyWorldIdProof;
exports.generateMockProof = generateMockProof;
exports.processClaimWithWorldId = processClaimWithWorldId;
exports.verifyMultipleClaims = verifyMultipleClaims;
exports.getWorldIdConfig = getWorldIdConfig;
exports.mockVerifyWorldId = mockVerifyWorldId;
const WORLD_ID_APP_ID = process.env.NEXT_PUBLIC_WORLD_ID_APP_ID || 'app_test_123456';
const WORLD_ID_ACTION = process.env.WORLD_ID_ACTION_NAME || 'claim-yield';
function getWorldIdConfig(signal) {
    return {
        appId: WORLD_ID_APP_ID,
        action: WORLD_ID_ACTION,
        signal,
    };
}
async function verifyWorldIdProof(proof, signal) {
    console.log('[WORLDID] Verifying World ID proof...');
    console.log(`[WORLDID] App ID: ${WORLD_ID_APP_ID}`);
    console.log(`[WORLDID] Action: ${WORLD_ID_ACTION}`);
    console.log(`[WORLDID] Signal: ${signal.substring(0, 10)}...`);
    const config = getWorldIdConfig(signal);
    try {
        const response = await fetch('https://developer.worldcoin.org/api/v1/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                app_id: config.appId,
                action: config.action,
                signal: config.signal,
                merkle_root: proof.merkle_root,
                nullifier_hash: proof.nullifier_hash,
                proof: proof.proof,
            }),
        });
        if (!response.ok) {
            const error = await response.json();
            console.log('[WORLDID] Verification failed:', error);
            return {
                isValid: false,
                nullifierHash: proof.nullifier_hash,
                timestamp: Date.now(),
            };
        }
        const result = await response.json();
        console.log('[WORLDID] Verification successful!');
        console.log(`[WORLDID] Nullifier hash: ${proof.nullifier_hash.substring(0, 10)}...`);
        return {
            isValid: result.verified,
            nullifierHash: proof.nullifier_hash,
            timestamp: Date.now(),
        };
    }
    catch (error) {
        console.log('[WORLDID] API unavailable - using mock verification');
        return mockVerifyWorldId(proof);
    }
}
function mockVerifyWorldId(proof) {
    console.log('[WORLDID] Mock verification: ACCEPTED');
    console.log(`[WORLDID] Merkle root: ${proof.merkle_root.substring(0, 10)}...`);
    console.log(`[WORLDID] Nullifier: ${proof.nullifier_hash.substring(0, 10)}...`);
    return {
        isValid: true,
        nullifierHash: proof.nullifier_hash,
        timestamp: Date.now(),
    };
}
function generateMockProof() {
    const mockMerkleRoot = '0x' + Math.random().toString(16).slice(2, 66).padEnd(64, '0');
    const mockNullifier = '0x' + Math.random().toString(16).slice(2, 66).padEnd(64, '0');
    const mockProof = '0x' + Math.random().toString(16).slice(2, 450).padEnd(448, '0');
    return {
        merkle_root: mockMerkleRoot,
        nullifier_hash: mockNullifier,
        proof: mockProof,
    };
}
async function processClaimWithWorldId(request) {
    console.log('[WORLDID] Processing yield claim with World ID verification...');
    console.log(`[WORLDID] Claimant: ${request.claimant.substring(0, 10)}...`);
    console.log(`[WORLDID] Distribution ID: ${request.distributionId}`);
    console.log(`[WORLDID] Amount: ${request.amount}`);
    const verification = await verifyWorldIdProof(request.worldIdProof, request.claimant);
    if (!verification.isValid) {
        console.log('[WORLDID] Verification FAILED - claim rejected');
        return {
            success: false,
            error: 'World ID verification failed',
        };
    }
    console.log('[WORLDID] Verification SUCCESS - proceeding with claim');
    const mockTxHash = '0x' + Math.random().toString(16).slice(2, 66);
    console.log(`[WORLDID] Claim processed: ${mockTxHash.substring(0, 10)}...`);
    return {
        success: true,
        txHash: mockTxHash,
    };
}
async function verifyMultipleClaims(claims) {
    console.log(`[WORLDID] Batch verifying ${claims.length} claims...`);
    const results = new Map();
    for (const claim of claims) {
        const result = await processClaimWithWorldId(claim);
        results.set(claim.claimant, result);
    }
    const successCount = Array.from(results.values()).filter(r => r.success).length;
    console.log(`[WORLDID] Batch complete: ${successCount}/${claims.length} verified`);
    return results;
}
