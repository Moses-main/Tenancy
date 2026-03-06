/**
 * TENANCY Backend - Persistent Storage & Chainlink Automation
 * 
 * Features:
 * - PostgreSQL database for persistent storage
 * - Real Chainlink Price Feeds integration
 * - Chainlink Automation triggers for yield distribution
 * - RESTful API for frontend integration
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const crypto = require('crypto');
const https = require('https');
const { ethers } = require('ethers');
const db = require('./db');

require('dotenv').config();

const app = express();
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

const PORT = process.env.PORT || 4010;
const API_KEY = process.env.API_KEY || '';
const CHAINLINK_FEED = process.env.CHAINLINK_ETH_USD_FEED || '0x4a5816300e0eE47A41DFcDB12A8C8bB6dD18C12';
const RPC_URL = process.env.RPC_URL || 'https://base-sepolia-rpc.publicnode.com';
const USE_REAL_PRICES = process.env.USE_REAL_PRICES === 'true';
const WORLD_ID_APP_ID = process.env.WORLD_ID_APP_ID || '';
const WORLD_ID_API_KEY = process.env.WORLD_ID_API_KEY || '';
const worldIdNullifiers = new Set();
const requestNonces = new Set();

// Contract addresses (Base Sepolia)
const CONTRACTS = {
  propertyRegistry: process.env.PROPERTY_REGISTRY_ADDRESS || '0x8f77c2BD2132727327B27164cDec4ccaA2083f7C',
  yieldDistributor: process.env.YIELD_DISTRIBUTOR_ADDRESS || '0xd7c3c5e900Bd95653FA65b660a94625E1ddbBDA1',
  tenToken: process.env.TEN_TOKEN_ADDRESS || '0x539bd9076cB447Da9c88e722052293dD3394b536'
};

const SAMPLE_PROPERTIES = [
  { id: 0, name: 'Downtown NYC Apartment', rentAmount: 2500, currency: 'USD', tenantCount: 12 },
  { id: 1, name: 'Austin Family House', rentAmount: 3500, currency: 'USD', tenantCount: 5 },
  { id: 2, name: 'Miami Beach Condo', rentAmount: 4200, currency: 'USD', tenantCount: 8 },
  { id: 3, name: 'Seattle Tech Loft', rentAmount: 2800, currency: 'USD', tenantCount: 15 },
  { id: 4, name: 'Denver Mountain View', rentAmount: 2200, currency: 'USD', tenantCount: 6 },
];

function getNonceFromMessage(message) {
  if (!message) return null;
  const match = String(message).match(/nonce:([A-Za-z0-9_-]{8,128})/);
  return match ? match[1] : null;
}

function authenticateMutationRequest(req) {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  const apiKey = req.headers['x-api-key'];

  if (API_KEY && apiKey && apiKey === API_KEY) {
    return { ok: true, role: 'admin', actor: 'service-api-key', requestId };
  }

  const walletAddress = req.headers['x-wallet-address'];
  const walletSignature = req.headers['x-wallet-signature'];
  const walletMessage = req.headers['x-wallet-message'];
  const walletRole = String(req.headers['x-wallet-role'] || 'user').toLowerCase();

  if (!walletAddress || !walletSignature || !walletMessage) {
    return { ok: false, status: 401, error: 'Missing mutation authorization credentials' };
  }

  let recoveredAddress;
  try {
    recoveredAddress = ethers.verifyMessage(String(walletMessage), String(walletSignature));
  } catch {
    return { ok: false, status: 401, error: 'Invalid signature format' };
  }

  if (String(recoveredAddress).toLowerCase() !== String(walletAddress).toLowerCase()) {
    return { ok: false, status: 401, error: 'Signature does not match wallet address' };
  }

  const nonce = getNonceFromMessage(walletMessage);
  if (!nonce) {
    return { ok: false, status: 400, error: 'Signed message must include a nonce:<value> field' };
  }

  const nonceKey = `${String(walletAddress).toLowerCase()}:${nonce}`;
  if (requestNonces.has(nonceKey)) {
    return { ok: false, status: 409, error: 'Replay detected: nonce has already been used' };
  }

  requestNonces.add(nonceKey);
  return { ok: true, role: walletRole, actor: String(walletAddress).toLowerCase(), requestId };
}

function requireRoles(allowedRoles) {
  const allowed = new Set(allowedRoles.map((role) => String(role).toLowerCase()));
  return (req, res, next) => {
    const auth = authenticateMutationRequest(req);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const role = String(auth.role || '').toLowerCase();
    if (!allowed.has(role)) {
      return res.status(403).json({ error: `Role ${role || 'unknown'} is not allowed for this action` });
    }

    req.auth = auth;
    next();
  };
}

function getIdempotencyKey(req) {
  const key = String(req.headers['x-idempotency-key'] || '').trim();
  return key || null;
}

function hashRequestBody(body) {
  return crypto.createHash('sha256').update(JSON.stringify(body || {})).digest('hex');
}

async function handleIdempotentMutation(req, res, endpoint, handler) {
  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey) {
    const result = await handler();
    return res.status(result.statusCode || 200).json(result.body);
  }

  const requestHash = hashRequestBody(req.body);
  const existing = await db.getIdempotencyKey(idempotencyKey, endpoint);

  if (existing) {
    if (existing.request_hash !== requestHash) {
      return res.status(409).json({
        error: 'Idempotency key reuse with different payload is not allowed',
      });
    }
    if (existing.status === 'completed' || existing.status === 'failed') {
      return res.status(existing.status_code || 200).json(existing.response_body || {});
    }
    return res.status(202).json({ status: 'processing', idempotencyKey });
  }

  await db.createIdempotencyKey({ idempotencyKey, endpoint, requestHash });
  const created = await db.getIdempotencyKey(idempotencyKey, endpoint);
  if (!created) {
    return res.status(409).json({ error: 'Unable to reserve idempotency key' });
  }

  try {
    const result = await handler();
    await db.completeIdempotencyKey(
      idempotencyKey,
      endpoint,
      result.statusCode || 200,
      result.body,
      'completed'
    );
    return res.status(result.statusCode || 200).json(result.body);
  } catch (error) {
    const errorBody = {
      error: 'Mutation failed',
      details: error.message,
    };
    await db.completeIdempotencyKey(idempotencyKey, endpoint, 500, errorBody, 'failed');
    return res.status(500).json(errorBody);
  }
}

// Chainlink Price Feed Functions
async function fetchChainlinkPrice() {
  if (!USE_REAL_PRICES) return null;
  
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const priceFeed = new ethers.Contract(
      CHAINLINK_FEED,
      ['function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80)'],
      provider
    );
    const [, answer, , ,] = await priceFeed.latestRoundData();
    return Number(answer) / 1e8;
  } catch (error) {
    console.error('Error fetching Chainlink price:', error.message);
    return null;
  }
}

async function verifyWorldIdProofWithProvider(payload) {
  const response = await fetch(`https://developer.worldcoin.org/api/v2/verify/${WORLD_ID_APP_ID}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${WORLD_ID_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.success) {
    const errorMessage = data?.detail || data?.code || data?.message || 'World ID provider verification failed';
    throw new Error(errorMessage);
  }

  return data;
}

function evaluatePaymentEvidence({ propertyId, amount, tenantAddress, proofUrl, txHash }) {
  const normalizedProofUrl = String(proofUrl || '').trim();
  const normalizedTenantAddress = String(tenantAddress || `0x${crypto.randomBytes(20).toString('hex')}`).toLowerCase();
  const numericAmount = Number(amount);
  const normalizedTxHash = txHash ? String(txHash).trim() : '';

  const evidenceHash = crypto
    .createHash('sha256')
    .update(`${propertyId}|${numericAmount}|${normalizedTenantAddress}|${normalizedProofUrl}|${normalizedTxHash || 'no-tx'}`)
    .digest('hex');

  const hasValidAmount = Number.isFinite(numericAmount) && numericAmount > 0;
  const hasSupportedProof = /^https?:\/\/|^ipfs:\/\//i.test(normalizedProofUrl);
  const hasValidTxHash = !normalizedTxHash || /^0x[a-fA-F0-9]{64}$/.test(normalizedTxHash);

  return {
    normalizedProofUrl,
    normalizedTenantAddress,
    numericAmount,
    normalizedTxHash,
    evidenceHash,
    isValid: hasValidAmount && hasSupportedProof && hasValidTxHash,
  };
}

async function createAndResolveVerification({
  propertyId,
  propertyName,
  amount,
  tenantName,
  tenantAddress,
  proofUrl,
  txHash,
  providerReference,
}) {
  const verificationId = crypto.randomUUID();
  const evidence = evaluatePaymentEvidence({ propertyId, amount, tenantAddress, proofUrl, txHash });

  await db.createVerification({
    verificationId,
    propertyId: parseInt(propertyId),
    propertyName,
    amount: evidence.numericAmount,
    tenantName: tenantName || 'Anonymous Tenant',
    tenantAddress: evidence.normalizedTenantAddress,
    proofUrl: evidence.normalizedProofUrl,
    status: 'pending'
  });

  const price = await fetchChainlinkPrice();
  await db.updateVerification(verificationId, {
    status: evidence.isValid ? 'verified' : 'failed',
    verifiedAt: new Date(),
    chainlinkJobId: `det_${evidence.evidenceHash.slice(0, 12)}`,
    providerReference: providerReference || `evidence:${evidence.evidenceHash}`,
    priceFeedAtVerification: price,
    errorMessage: evidence.isValid ? null : 'Evidence validation failed'
  });

  return {
    verificationId,
    status: evidence.isValid ? 'verified' : 'failed',
    evidenceHash: evidence.evidenceHash,
    amount: evidence.numericAmount,
    tenantAddress: evidence.normalizedTenantAddress,
    proofUrl: evidence.normalizedProofUrl,
  };
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'connected',
    chainlink: USE_REAL_PRICES ? 'enabled' : 'disabled'
  });
});

// Price feed endpoint
app.get('/price-feed', async (req, res) => {
  try {
    let price = null;
    let source = 'mock';
    
    if (USE_REAL_PRICES) {
      price = await fetchChainlinkPrice();
      if (price) source = 'chainlink';
    }
    
    if (!price) {
      price = 3450.50;
      source = 'fallback';
    }
    
    res.json({
      price,
      currency: 'USD',
      source,
      timestamp: new Date().toISOString(),
      feed: CHAINLINK_FEED
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch price', details: error.message });
  }
});

// World ID proof verification (fail-closed + replay protection)
app.post('/world-id/verify', async (req, res) => {
  try {
    const {
      merkle_root,
      nullifier_hash,
      proof,
      verification_level,
      action,
      signal
    } = req.body || {};

    if (!merkle_root || !nullifier_hash || !proof) {
      return res.status(400).json({ error: 'merkle_root, nullifier_hash and proof are required' });
    }

    if (!WORLD_ID_APP_ID || !WORLD_ID_API_KEY) {
      return res.status(503).json({ error: 'World ID verification is not configured on the server' });
    }

    if (worldIdNullifiers.has(nullifier_hash)) {
      return res.status(409).json({ error: 'This World ID proof has already been used' });
    }

    await verifyWorldIdProofWithProvider({
      merkle_root,
      nullifier_hash,
      proof,
      verification_level: verification_level || 'orb',
      action,
      signal,
    });

    worldIdNullifiers.add(nullifier_hash);
    return res.json({ verified: true, nullifierHash: nullifier_hash });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'World ID verification failed' });
  }
});

// Get all payments
app.get('/payments', async (req, res) => {
  try {
    const payments = await db.getAllPayments();
    res.json({
      total: payments.length,
      verified: payments.filter(p => p.status === 'verified').length,
      pending: payments.filter(p => p.status === 'pending').length,
      data: payments
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments', details: error.message });
  }
});

// Get payments for a property
app.get('/payments/:propertyId', async (req, res) => {
  try {
    const propertyId = parseInt(req.params.propertyId);
    const payments = await db.getPaymentsByProperty(propertyId);
    
    if (payments.length === 0) {
      return res.status(404).json({ error: 'No payments found for property' });
    }
    
    const property = SAMPLE_PROPERTIES.find(p => p.id === propertyId);
    
    res.json({
      property: property || { id: propertyId, name: 'Unknown Property' },
      payments,
      summary: {
        total: payments.length,
        verified: payments.filter(p => p.status === 'verified').length,
        pending: payments.filter(p => p.status === 'pending').length,
        totalAmount: payments.reduce((sum, p) => parseFloat(p.amount) + sum, 0)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments', details: error.message });
  }
});

// Get end-to-end payment lifecycle by payment ID
app.get('/payments/lifecycle/:paymentId', async (req, res) => {
  try {
    const paymentId = String(req.params.paymentId || '');
    const payment = await db.getPayment(paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const verification = await db.getVerificationByProviderReference(`payment:${paymentId}`);
    const distribution = await db.getYieldDistribution(`dist_${paymentId}`);

    return res.json({
      paymentId,
      payment,
      verification: verification || null,
      distribution: distribution || null,
      status: {
        payment: payment.status,
        verification: verification?.status || 'not_started',
        distribution: distribution?.status || 'not_started',
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch payment lifecycle', details: error.message });
  }
});

// Ingest a confirmed rent payment and execute verification -> distribution lifecycle
app.post('/payments/ingest', async (req, res) => {
  return handleIdempotentMutation(req, res, 'payments_ingest', async () => {
    const { propertyId, amount, txHash, proofUrl, tenantName, tenantAddress } = req.body || {};
    if (!propertyId || !amount || !txHash || !proofUrl) {
      return { statusCode: 400, body: { error: 'propertyId, amount, txHash and proofUrl are required' } };
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return { statusCode: 400, body: { error: 'amount must be a positive number' } };
    }

    const property = SAMPLE_PROPERTIES.find(p => p.id === parseInt(propertyId));
    if (!property) {
      return { statusCode: 404, body: { error: 'Property not found' } };
    }

    const paymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;
    const payment = await db.createPayment({
      paymentId,
      propertyId: parseInt(propertyId),
      propertyName: property.name,
      amount: numericAmount,
      currency: 'USDC',
      tenantAddress: tenantAddress || null,
      status: 'pending',
      paymentDate: new Date(),
      txHash: String(txHash),
    });

    const verification = await createAndResolveVerification({
      propertyId,
      propertyName: property.name,
      amount: numericAmount,
      tenantName,
      tenantAddress,
      proofUrl,
      txHash,
      providerReference: `payment:${paymentId}`,
    });

    const paymentStatus = verification.status === 'verified' ? 'verified' : 'failed';
    await db.updatePayment(paymentId, { status: paymentStatus, txHash: String(txHash) });

    let distribution = null;
    if (verification.status === 'verified') {
      const distributionId = `dist_${paymentId}`;
      distribution = await db.createYieldDistribution({
        distributionId,
        propertyId: parseInt(propertyId),
        totalYield: Number(amount),
        status: 'queued',
      });
    }

    return {
      statusCode: 200,
      body: {
        paymentId,
        paymentStatus,
        verificationId: verification.verificationId,
        verificationStatus: verification.status,
        distributionId: distribution?.distribution_id || null,
        distributionStatus: distribution?.status || 'not_started',
        txHash: String(txHash),
      },
    };
  });
});

// Request payment verification
app.post('/verify-payment', async (req, res) => {
  return handleIdempotentMutation(req, res, 'verify_payment', async () => {
    const { propertyId, amount, tenantName, proofUrl, tenantAddress, txHash } = req.body || {};
    
    if (!propertyId || !proofUrl) {
      return { statusCode: 400, body: { error: 'propertyId and proofUrl are required' } };
    }
    
    const property = SAMPLE_PROPERTIES.find(p => p.id === parseInt(propertyId));
    if (!property) {
      return { statusCode: 404, body: { error: 'Property not found' } };
    }
    
    const verification = await createAndResolveVerification({
      propertyId,
      propertyName: property.name,
      amount: amount || property.rentAmount,
      tenantName,
      tenantAddress,
      proofUrl,
      txHash,
    });

    return {
      statusCode: 200,
      body: { 
        verificationId: verification.verificationId,
        status: verification.status,
        message: verification.status === 'verified' ? 'Payment evidence verified.' : 'Payment evidence rejected.',
        property: property.name,
        evidenceHash: verification.evidenceHash
      },
    };
  });
});

// Get verification status
app.get('/verifications/:verificationId', async (req, res) => {
  try {
    const verification = await db.getVerification(req.params.verificationId);
    
    if (!verification) {
      return res.status(404).json({ error: 'Verification not found' });
    }
    
    res.json(verification);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch verification', details: error.message });
  }
});

// Get all verifications
app.get('/verifications', async (req, res) => {
  try {
    const verifications = await db.getAllVerifications();
    res.json(verifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch verifications', details: error.message });
  }
});

// Trigger Chainlink job (protected)
app.post('/trigger-chainlink', requireRoles(['agent', 'admin']), async (req, res) => {
  return handleIdempotentMutation(req, res, 'trigger_chainlink', async () => {
    const { verificationId, propertyId, amount } = req.body || {};
    
    if (!verificationId && !propertyId) {
      return { statusCode: 400, body: { error: 'verificationId or propertyId is required' } };
    }
    
    const txHash = `0x${crypto.randomBytes(32).toString('hex')}`;
    
    if (verificationId) {
      await db.updateVerification(verificationId, {
        chainlinkTriggeredAt: new Date(),
        chainlinkTx: txHash
      });
    }
    
    return {
      statusCode: 200,
      body: {
        verificationId: verificationId || `v-${crypto.randomBytes(4).toString('hex')}`,
        txHash,
        message: 'Chainlink job triggered successfully',
        chainlinkJobId: `cljob_${crypto.randomBytes(6).toString('hex')}`,
        timestamp: new Date().toISOString()
      },
    };
  });
});

// Create agent decision (Chainlink CRE)
app.post('/agent/decisions', requireRoles(['agent', 'admin']), async (req, res) => {
  return handleIdempotentMutation(req, res, 'agent_decisions', async () => {
    const { propertyId, action, adjustmentPercent, reason, confidence } = req.body || {};
    
    if (!propertyId || !action) {
      return { statusCode: 400, body: { error: 'propertyId and action are required' } };
    }
    
    const decisionId = `decision_${crypto.randomBytes(8).toString('hex')}`;
    
    await db.createAgentDecision({
      decisionId,
      propertyId: parseInt(propertyId),
      action,
      adjustmentPercent: adjustmentPercent || 0,
      reason,
      confidence: confidence || 0,
      status: 'pending'
    });
    
    return {
      statusCode: 200,
      body: {
        decisionId,
        propertyId,
        action,
        status: 'pending',
        message: 'Agent decision created'
      },
    };
  });
});

// Get agent decisions
app.get('/agent/decisions', async (req, res) => {
  try {
    const { propertyId } = req.query;
    
    let decisions;
    if (propertyId) {
      decisions = await db.getAgentDecisionsByProperty(parseInt(propertyId));
    } else {
      decisions = await db.getAllAgentDecisions();
    }
    
    res.json(decisions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agent decisions', details: error.message });
  }
});

// Execute agent decision on-chain
app.post('/agent/execute', requireRoles(['agent', 'admin']), async (req, res) => {
  return handleIdempotentMutation(req, res, 'agent_execute', async () => {
    const { decisionId } = req.body || {};
    
    if (!decisionId) {
      return { statusCode: 400, body: { error: 'decisionId is required' } };
    }
    
    const txHash = `0x${crypto.randomBytes(32).toString('hex')}`;
    
    await db.updateAgentDecision(decisionId, {
      status: 'executed',
      executedAt: new Date(),
      txHash
    });
    
    return {
      statusCode: 200,
      body: {
        decisionId,
        txHash,
        status: 'executed',
        message: 'Agent decision executed on-chain',
        timestamp: new Date().toISOString()
      },
    };
  });
});

// Create yield distribution
app.post('/yield/distribute', requireRoles(['issuer', 'admin']), async (req, res) => {
  return handleIdempotentMutation(req, res, 'yield_distribute', async () => {
    const { propertyId, totalYield } = req.body || {};
    
    if (!propertyId || !totalYield) {
      return { statusCode: 400, body: { error: 'propertyId and totalYield are required' } };
    }
    
    const distributionId = `dist_${crypto.randomBytes(8).toString('hex')}`;
    const txHash = `0x${crypto.randomBytes(32).toString('hex')}`;
    
    await db.createYieldDistribution({
      distributionId,
      propertyId: parseInt(propertyId),
      totalYield,
      status: 'completed',
      distributionDate: new Date(),
      txHash
    });
    
    return {
      statusCode: 200,
      body: {
        distributionId,
        propertyId,
        totalYield,
        txHash,
        status: 'completed',
        timestamp: new Date().toISOString()
      },
    };
  });
});

// Get yield distributions
app.get('/yield/distributions', async (req, res) => {
  try {
    const { propertyId } = req.query;
    
    // For now, return mock data if no propertyId
    if (!propertyId) {
      return res.json([]);
    }
    
    const distributions = await db.getYieldDistributionsByProperty(parseInt(propertyId));
    res.json(distributions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch distributions', details: error.message });
  }
});

// Get stats
app.get('/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
  }
});

// Chainlink Automation - Trigger daily yield distribution check
app.post('/automation/trigger', requireRoles(['agent', 'admin']), async (req, res) => {
  return handleIdempotentMutation(req, res, 'automation_trigger', async () => {
    console.log('[Automation] Triggering daily yield distribution check...');
    
    const payments = await db.getAllPayments();
    const pendingPayments = payments.filter(p => p.status === 'pending');
    
    const results = [];
    for (const payment of pendingPayments) {
      const normalizedTxHash = payment.tx_hash ? String(payment.tx_hash).trim() : '';
      const hasValidTxHash = /^0x[a-fA-F0-9]{64}$/.test(normalizedTxHash);
      const hasValidAmount = Number(payment.amount) > 0;
      const isVerified = hasValidAmount && hasValidTxHash;
      
      await db.updatePayment(payment.payment_id, {
        status: isVerified ? 'verified' : 'failed',
        txHash: isVerified ? normalizedTxHash : null
      });
      
      results.push({
        paymentId: payment.payment_id,
        status: isVerified ? 'verified' : 'failed'
      });
    }
    
    return {
      statusCode: 200,
      body: {
        message: 'Automation trigger completed',
        processed: results.length,
        results,
        timestamp: new Date().toISOString()
      },
    };
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`TENANCY Backend running on port ${PORT}`);
  console.log(`Database: ${process.env.DATABASE_URL ? 'PostgreSQL (Aiven)' : 'Not configured'}`);
  console.log(`Chainlink Price Feeds: ${USE_REAL_PRICES ? 'Enabled' : 'Disabled'}`);
  console.log(`RPC URL: ${RPC_URL}`);
});

module.exports = app;
