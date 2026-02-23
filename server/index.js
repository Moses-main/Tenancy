/**
 * TENANCY Mock Backend
 * - Simulates off-chain rental payment verification
 * - Provides endpoints to trigger a Chainlink-like on-chain call (mocked)
 *
 * Usage:
 *   1. Copy .env.example -> .env and set API_KEY
 *   2. npm install
 *   3. npm run dev
 *
 * Endpoints:
 *   GET  /health
 *   POST /verify-payment       (public)   -> request verification for a property stream
 *   POST /webhook/payment      (protected) -> simulate bank webhook confirming payment (x-api-key)
 *   POST /trigger-chainlink    (protected) -> simulate sending a Chainlink job to contract (x-api-key)
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const crypto = require('crypto');

require('dotenv').config();

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4010;
const API_KEY = process.env.API_KEY || 'change_this_to_a_strong_api_key';

// In-memory store for verifications (NOTE: only for dev/testing)
const verifications = new Map();

/**
 * Middleware to protect endpoints with x-api-key header.
 */
function requireApiKey(req, res, next) {
  const key = req.header('x-api-key');
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized - invalid API key' });
  }
  next();
}

/**
 * Simple health check
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV || 'development' });
});

/**
 * Request verification for a rental payment / lease proof.
 * This simulates the process where an Issuer submits proof (e.g., lease IPFS URL) and requests off-chain verification.
 *
 * Body: { propertyId, amount, tenantName, proofUrl }
 *
 * Response: { verificationId, status }
 */
app.post('/verify-payment', (req, res) => {
  const { propertyId, amount, tenantName, proofUrl } = req.body || {};

  if (!propertyId || !amount || !proofUrl) {
    return res.status(400).json({ error: 'propertyId, amount and proofUrl are required' });
  }

  const verificationId = crypto.randomUUID();
  const createdAt = Date.now();

  const record = {
    verificationId,
    propertyId,
    amount,
    tenantName: tenantName || null,
    proofUrl,
    status: 'pending', // pending -> verified
    createdAt,
    verifiedAt: null,
    chainlinkJobId: null,
    chainlinkTx: null
  };

  verifications.set(verificationId, record);

  // Simulate asynchronous off-chain verification (e.g., manual review or bank API)
  setTimeout(() => {
    const rec = verifications.get(verificationId);
    if (!rec) return;
    rec.status = 'verified';
    rec.verifiedAt = Date.now();
    rec.chainlinkJobId = `cljob-${crypto.randomBytes(6).toString('hex')}`;
    verifications.set(verificationId, rec);
    console.info(`[MockVerifier] verification completed: ${verificationId} -> verified`);
    // Note: In a real integration the backend would call the Chainlink node or CRE to trigger on-chain distribution.
  }, 4000 + Math.floor(Math.random() * 3000)); // simulate 4-7s verification time

  res.json({ verificationId, status: record.status, message: 'Verification requested. Status will update asynchronously.' });
});

/**
 * Protected webhook endpoint to simulate bank/payment provider notifying the backend of a successful payment.
 * This marks a verification as verified immediately (for testing) and optionally triggers a Chainlink job simulation.
 *
 * Body: { verificationId, providerReference, amount }
 *
 * Requires header: x-api-key
 */
app.post('/webhook/payment', requireApiKey, (req, res) => {
  const { verificationId, providerReference, amount } = req.body || {};
  if (!verificationId || !providerReference) {
    return res.status(400).json({ error: 'verificationId and providerReference are required' });
  }

  const rec = verifications.get(verificationId);
  if (!rec) {
    return res.status(404).json({ error: 'verification not found' });
  }

  rec.status = 'verified';
  rec.verifiedAt = Date.now();
  rec.providerReference = providerReference;
  if (amount) rec.amount = amount;
  rec.chainlinkJobId = `cljob-${crypto.randomBytes(6).toString('hex')}`;
  verifications.set(verificationId, rec);

  console.info(`[Webhook] Payment webhook processed for verificationId=${verificationId}, providerRef=${providerReference}`);

  res.json({ verificationId, status: rec.status, chainlinkJobId: rec.chainlinkJobId });
});

/**
 * Protected endpoint to simulate sending a Chainlink job / CRE call that would perform the on-chain distribution.
 * Validates that the verification exists and is verified, then returns a mock tx hash.
 *
 * Body: { verificationId }
 *
 * Requires header: x-api-key
 */
app.post('/trigger-chainlink', requireApiKey, (req, res) => {
  const { verificationId } = req.body || {};
  if (!verificationId) {
    return res.status(400).json({ error: 'verificationId is required' });
  }

  const rec = verifications.get(verificationId);
  if (!rec) {
    return res.status(404).json({ error: 'verification not found' });
  }

  if (rec.status !== 'verified') {
    return res.status(409).json({ error: 'verification not ready. Current status: ' + rec.status });
  }

  // Simulate on-chain tx
  const txHash = '0x' + crypto.randomBytes(32).toString('hex');
  rec.chainlinkTx = txHash;
  rec.chainlinkTriggeredAt = Date.now();
  verifications.set(verificationId, rec);

  console.info(`[ChainlinkSim] Triggered mock on-chain job for verificationId=${verificationId}, tx=${txHash}`);

  // Respond with a mock transaction reference
  return res.json({
    verificationId,
    txHash,
    message: 'Mock Chainlink job triggered (no real on-chain call was made). Use this txHash for testing frontend flows.'
  });
});

/**
 * Utility endpoint to inspect verification state (for dev)
 * GET /verifications/:id
 */
app.get('/verifications/:id', (req, res) => {
  const id = req.params.id;
  const rec = verifications.get(id);
  if (!rec) return res.status(404).json({ error: 'not found' });
  res.json(rec);
});

/**
 * List recent verifications (dev)
 */
app.get('/verifications', (req, res) => {
  const list = Array.from(verifications.values()).sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
  res.json(list);
});

app.listen(PORT, () => {
  console.log(`TENANCY mock backend running on http://localhost:${PORT}`);
  console.log('Protected endpoints require x-api-key header with your API_KEY value.');
});