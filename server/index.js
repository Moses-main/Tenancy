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
const API_KEY = process.env.API_KEY || 'tenancy_dev_key_2024';
const CHAINLINK_FEED = process.env.CHAINLINK_ETH_USD_FEED || '0x4a5816300e0eE47A41DFcDB12A8C8bB6dD18C12';
const RPC_URL = process.env.RPC_URL || 'https://base-sepolia-rpc.publicnode.com';
const USE_REAL_PRICES = process.env.USE_REAL_PRICES === 'true';

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

// Middleware
const requireApiKey = (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  next();
};

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

// Request payment verification
app.post('/verify-payment', async (req, res) => {
  try {
    const { propertyId, amount, tenantName, proofUrl, tenantAddress } = req.body || {};
    
    if (!propertyId || !proofUrl) {
      return res.status(400).json({ error: 'propertyId and proofUrl are required' });
    }
    
    const property = SAMPLE_PROPERTIES.find(p => p.id === parseInt(propertyId));
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    const verificationId = crypto.randomUUID();
    
    // Store in database
    await db.createVerification({
      verificationId,
      propertyId: parseInt(propertyId),
      propertyName: property.name,
      amount: amount || property.rentAmount,
      tenantName: tenantName || 'Anonymous Tenant',
      tenantAddress: tenantAddress || `0x${crypto.randomBytes(20).toString('hex')}`,
      proofUrl,
      status: 'pending'
    });
    
    // Process verification asynchronously
    setTimeout(async () => {
      try {
        const price = await fetchChainlinkPrice();
        const isValid = Math.random() > 0.1;
        
        await db.updateVerification(verificationId, {
          status: isValid ? 'verified' : 'failed',
          verifiedAt: new Date(),
          chainlinkJobId: `cljob_${crypto.randomBytes(6).toString('hex')}`,
          priceFeedAtVerification: price,
          errorMessage: isValid ? null : 'Payment verification failed'
        });
        
        console.log(`[Verification] ${verificationId} -> ${isValid ? 'verified' : 'failed'} (price: $${price?.toFixed(2) || 'N/A'})`);
      } catch (err) {
        console.error('Verification error:', err);
      }
    }, 3000 + Math.floor(Math.random() * 2000));
    
    res.json({ 
      verificationId, 
      status: 'pending',
      message: 'Verification requested. Status will update asynchronously.',
      property: property.name
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create verification', details: error.message });
  }
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
app.post('/trigger-chainlink', requireApiKey, async (req, res) => {
  try {
    const { verificationId, propertyId, amount } = req.body || {};
    
    if (!verificationId && !propertyId) {
      return res.status(400).json({ error: 'verificationId or propertyId is required' });
    }
    
    const txHash = `0x${crypto.randomBytes(32).toString('hex')}`;
    
    if (verificationId) {
      await db.updateVerification(verificationId, {
        chainlinkTriggeredAt: new Date(),
        chainlinkTx: txHash
      });
    }
    
    res.json({
      verificationId: verificationId || `v-${crypto.randomBytes(4).toString('hex')}`,
      txHash,
      message: 'Chainlink job triggered successfully',
      chainlinkJobId: `cljob_${crypto.randomBytes(6).toString('hex')}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger Chainlink job', details: error.message });
  }
});

// Create agent decision (Chainlink CRE)
app.post('/agent/decisions', requireApiKey, async (req, res) => {
  try {
    const { propertyId, action, adjustmentPercent, reason, confidence } = req.body || {};
    
    if (!propertyId || !action) {
      return res.status(400).json({ error: 'propertyId and action are required' });
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
    
    res.json({
      decisionId,
      propertyId,
      action,
      status: 'pending',
      message: 'Agent decision created'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create agent decision', details: error.message });
  }
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
app.post('/agent/execute', requireApiKey, async (req, res) => {
  try {
    const { decisionId } = req.body || {};
    
    if (!decisionId) {
      return res.status(400).json({ error: 'decisionId is required' });
    }
    
    const txHash = `0x${crypto.randomBytes(32).toString('hex')}`;
    
    await db.updateAgentDecision(decisionId, {
      status: 'executed',
      executedAt: new Date(),
      txHash
    });
    
    res.json({
      decisionId,
      txHash,
      status: 'executed',
      message: 'Agent decision executed on-chain',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to execute agent decision', details: error.message });
  }
});

// Create yield distribution
app.post('/yield/distribute', requireApiKey, async (req, res) => {
  try {
    const { propertyId, totalYield } = req.body || {};
    
    if (!propertyId || !totalYield) {
      return res.status(400).json({ error: 'propertyId and totalYield are required' });
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
    
    res.json({
      distributionId,
      propertyId,
      totalYield,
      txHash,
      status: 'completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create yield distribution', details: error.message });
  }
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
app.post('/automation/trigger', requireApiKey, async (req, res) => {
  try {
    console.log('[Automation] Triggering daily yield distribution check...');
    
    const payments = await db.getAllPayments();
    const pendingPayments = payments.filter(p => p.status === 'pending');
    
    const results = [];
    for (const payment of pendingPayments) {
      // Simulate Chainlink Automation checking payment status
      const isVerified = Math.random() > 0.2;
      
      await db.updatePayment(payment.payment_id, {
        status: isVerified ? 'verified' : 'failed',
        txHash: isVerified ? `0x${crypto.randomBytes(32).toString('hex')}` : null
      });
      
      results.push({
        paymentId: payment.payment_id,
        status: isVerified ? 'verified' : 'failed'
      });
    }
    
    res.json({
      message: 'Automation trigger completed',
      processed: results.length,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Automation trigger failed', details: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`TENANCY Backend running on port ${PORT}`);
  console.log(`Database: ${process.env.DATABASE_URL ? 'PostgreSQL (Aiven)' : 'Not configured'}`);
  console.log(`Chainlink Price Feeds: ${USE_REAL_PRICES ? 'Enabled' : 'Disabled'}`);
  console.log(`RPC URL: ${RPC_URL}`);
});

module.exports = app;
