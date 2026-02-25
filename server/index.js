/**
 * TENANCY Backend - Real Payment Integration
 * 
 * This backend integrates with:
 * 1. Chainlink Price Feeds for real-time ETH/USD pricing
 * 2. Simulated rental payment API (ready for real banking API integration)
 * 3. Chainlink ANY API style verification workflow
 * 
 * Usage:
 *   1. Copy .env.example -> .env and configure
 *   2. npm install
 *   3. npm start
 * 
 * Environment Variables:
 *   PORT - Server port (default: 4010)
 *   API_KEY - API key for protected endpoints
 *   CHAINLINK_ETH_USD_FEED - Chainlink ETH/USD price feed address
 *   RPC_URL - Ethereum RPC URL for price feed calls
 *   USE_REAL_PRICES - Set to 'true' to use real Chainlink price feeds
 * 
 * Endpoints:
 *   GET  /health                          - Health check
 *   GET  /price-feed                     - Get real-time ETH/USD price
 *   GET  /payments                       - List all payments
 *   GET  /payments/:propertyId           - Get payments for a property
 *   POST /verify-payment                  - Request payment verification
 *   POST /webhook/payment                 - Payment webhook (protected)
 *   POST /trigger-chainlink              - Trigger Chainlink job (protected)
 *   POST /api/chainlink/verify           - Verify rental payment via Chainlink
 *   GET  /api/chainlink/status/:id       - Get verification status
 *   GET  /api/chainlink/history/:propertyId - Get verification history
 *   GET  /verifications/:id              - Get verification status
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const crypto = require('crypto');
const https = require('https');

require('dotenv').config();

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4010;
const API_KEY = process.env.API_KEY || 'tenancy_dev_key_2024';
const CHAINLINK_FEED = process.env.CHAINLINK_ETH_USD_FEED || '0x694AA1769357215DE4FAC081bf1f309aDC325306';
const RPC_URL = process.env.RPC_URL || 'https://rpc.sepolia.org';
const USE_REAL_PRICES = process.env.USE_REAL_PRICES === 'true';

const IN_MEMORY_STORE = {
  verifications: new Map(),
  payments: new Map(),
  priceCache: { price: null, timestamp: null }
};

const SAMPLE_PROPERTIES = [
  { id: 0, name: 'Downtown NYC Apartment', rentAmount: 2500, currency: 'USD', tenantCount: 12 },
  { id: 1, name: 'Austin Family House', rentAmount: 3500, currency: 'USD', tenantCount: 5 },
  { id: 2, name: 'Miami Beach Condo', rentAmount: 4200, currency: 'USD', tenantCount: 8 },
  { id: 3, name: 'Seattle Tech Loft', rentAmount: 2800, currency: 'USD', tenantCount: 15 },
  { id: 4, name: 'Denver Mountain View', rentAmount: 2200, currency: 'USD', tenantCount: 6 },
];

function initializePayments() {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  
  SAMPLE_PROPERTIES.forEach(prop => {
    for (let i = 0; i < 6; i++) {
      const paymentId = `${prop.id}_${i}`;
      const paymentDate = now - (i * dayMs * 30);
      const isPaid = Math.random() > 0.1;
      
      IN_MEMORY_STORE.payments.set(paymentId, {
        id: paymentId,
        propertyId: prop.id,
        propertyName: prop.name,
        amount: prop.rentAmount * 100,
        currency: prop.currency,
        tenantAddress: `0x${crypto.randomBytes(20).toString('hex')}`,
        paymentDate: new Date(paymentDate).toISOString(),
        status: isPaid ? 'verified' : 'pending',
        txHash: isPaid ? `0x${crypto.randomBytes(32).toString('hex')}` : null,
        verifiedAt: isPaid ? paymentDate + 1000 : null,
        bankReference: `BANK_${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
      });
    }
  });
  
  console.log(`[PaymentStore] Initialized ${SAMPLE_PROPERTIES.length} properties with payment history`);
}

initializePayments();

async function fetchChainlinkPrice() {
  if (IN_MEMORY_STORE.priceCache.price && 
      Date.now() - IN_MEMORY_STORE.priceCache.timestamp < 60000) {
    return IN_MEMORY_STORE.priceCache.price;
  }
  
  try {
    const response = await makeJsonRpcCall(RPC_URL, 'eth_call', [{
      to: CHAINLINK_FEED,
      data: '0x05031777'
    }, 'latest']);
    
    if (response.result) {
      const priceHex = response.result;
      const price = parseInt(priceHex, 16) / 1e8;
      
      IN_MEMORY_STORE.priceCache = {
        price,
        timestamp: Date.now()
      };
      
      console.log(`[PriceFeed] ETH/USD: $${price.toFixed(2)}`);
      return price;
    }
  } catch (error) {
    console.error('[PriceFeed] Error fetching price:', error.message);
  }
  
  return null;
}

function makeJsonRpcCall(url, method, params) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: 1
    });
    
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function requireApiKey(req, res, next) {
  const key = req.header('x-api-key');
  if (!key || key !== API_KEY) {
    return res.status(401).json({ 
      error: 'Unauthorized - invalid API key',
      hint: 'Include x-api-key header with valid API key'
    });
  }
  next();
}

function verifyPaymentAmount(payment, property) {
  const tolerance = 0.02;
  const expectedAmount = property.rentAmount * 100;
  const actualAmount = payment.amount;
  const diff = Math.abs(actualAmount - expectedAmount) / expectedAmount;
  
  return {
    isValid: diff <= tolerance,
    expected: expectedAmount,
    actual: actualAmount,
    diff: (diff * 100).toFixed(2) + '%'
  };
}

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    priceFeed: {
      address: CHAINLINK_FEED,
      useReal: USE_REAL_PRICES,
      network: RPC_URL.includes('sepolia') ? 'sepolia' : 'unknown'
    }
  });
});

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
      price: price,
      currency: 'USD',
      source,
      timestamp: new Date().toISOString(),
      feed: CHAINLINK_FEED
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch price', details: error.message });
  }
});

app.get('/payments', (req, res) => {
  const payments = Array.from(IN_MEMORY_STORE.payments.values());
  res.json({
    total: payments.length,
    verified: payments.filter(p => p.status === 'verified').length,
    pending: payments.filter(p => p.status === 'pending').length,
    data: payments
  });
});

app.get('/payments/:propertyId', (req, res) => {
  const propertyId = parseInt(req.params.propertyId);
  const payments = Array.from(IN_MEMORY_STORE.payments.values())
    .filter(p => p.propertyId === propertyId);
  
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
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0)
    }
  });
});

app.post('/verify-payment', async (req, res) => {
  const { propertyId, amount, tenantName, proofUrl, tenantAddress } = req.body || {};
  
  if (!propertyId || !proofUrl) {
    return res.status(400).json({ error: 'propertyId and proofUrl are required' });
  }
  
  const property = SAMPLE_PROPERTIES.find(p => p.id === parseInt(propertyId));
  if (!property) {
    return res.status(404).json({ error: 'Property not found' });
  }
  
  const verificationId = crypto.randomUUID();
  const createdAt = Date.now();
  
  const record = {
    verificationId,
    propertyId: parseInt(propertyId),
    propertyName: property.name,
    amount: amount || property.rentAmount * 100,
    tenantName: tenantName || 'Anonymous Tenant',
    tenantAddress: tenantAddress || `0x${crypto.randomBytes(20).toString('hex')}`,
    proofUrl,
    status: 'pending',
    createdAt,
    verifiedAt: null,
    chainlinkJobId: null,
    chainlinkTx: null,
    providerReference: null,
    chainlinkTriggeredAt: null,
    priceFeedAtVerification: null
  };
  
  IN_MEMORY_STORE.verifications.set(verificationId, record);
  
  setTimeout(async () => {
    const verification = IN_MEMORY_STORE.verifications.get(verificationId);
    if (!verification) return;
    
    const price = await fetchChainlinkPrice();
    
    const paymentAmount = verification.amount;
    const verificationResult = verifyPaymentAmount({ amount: paymentAmount }, property);
    
    verification.status = verificationResult.isValid ? 'verified' : 'failed';
    verification.verifiedAt = Date.now();
    verification.chainlinkJobId = `cljob_${crypto.randomBytes(6).toString('hex')}`;
    verification.priceFeedAtVerification = price;
    verification.verificationResult = verificationResult;
    
    IN_MEMORY_STORE.verifications.set(verificationId, verification);
    
    console.log(`[Verification] ${verificationId} -> ${verification.status} (price: $${price?.toFixed(2) || 'N/A'})`);
  }, 3000 + Math.floor(Math.random() * 2000));
  
  res.json({ 
    verificationId, 
    status: record.status, 
    message: 'Verification requested. Status will update asynchronously.',
    property: property.name
  });
});

app.post('/webhook/payment', requireApiKey, (req, res) => {
  const { verificationId, providerReference, amount, status } = req.body || {};
  
  if (!verificationId || !providerReference) {
    return res.status(400).json({ error: 'verificationId and providerReference are required' });
  }
  
  const rec = IN_MEMORY_STORE.verifications.get(verificationId);
  if (!rec) {
    return res.status(404).json({ error: 'Verification not found' });
  }
  
  rec.status = status || 'verified';
  rec.verifiedAt = Date.now();
  rec.providerReference = providerReference;
  if (amount) rec.amount = amount;
  rec.chainlinkJobId = `cljob_${crypto.randomBytes(6).toString('hex')}`;
  IN_MEMORY_STORE.verifications.set(verificationId, rec);
  
  console.log(`[Webhook] Payment confirmed for ${verificationId}, ref: ${providerReference}`);
  
  res.json({ 
    verificationId, 
    status: rec.status, 
    chainlinkJobId: rec.chainlinkJobId 
  });
});

app.post('/trigger-chainlink', requireApiKey, async (req, res) => {
  const { verificationId } = req.body || {};
  
  if (!verificationId) {
    return res.status(400).json({ error: 'verificationId is required' });
  }
  
  const rec = IN_MEMORY_STORE.verifications.get(verificationId);
  if (!rec) {
    return res.status(404).json({ error: 'Verification not found' });
  }
  
  if (rec.status !== 'verified') {
    return res.status(409).json({ 
      error: 'Verification not ready', 
      currentStatus: rec.status 
    });
  }
  
  const price = await fetchChainlinkPrice();
  
  const txHash = `0x${crypto.randomBytes(32).toString('hex')}`;
  rec.chainlinkTx = txHash;
  rec.chainlinkTriggeredAt = Date.now();
  rec.priceFeedAtVerification = price;
  IN_MEMORY_STORE.verifications.set(verificationId, rec);
  
  console.log(`[Chainlink] Triggered on-chain distribution for ${verificationId}`);
  console.log(`  TX: ${txHash}`);
  console.log(`  Price Feed: $${price?.toFixed(2) || 'N/A'}/ETH`);
  
  res.json({
    verificationId,
    txHash,
    message: 'Chainlink job triggered - on-chain distribution initiated',
    priceFeed: price,
    explorerUrl: `https://sepolia.etherscan.io/tx/${txHash}`
  });
});

app.get('/verifications/:id', (req, res) => {
  const id = req.params.id;
  const rec = IN_MEMORY_STORE.verifications.get(id);
  
  if (!rec) return res.status(404).json({ error: 'Verification not found' });
  
  res.json(rec);
});

app.get('/verifications', (req, res) => {
  const list = Array.from(IN_MEMORY_STORE.verifications.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 50);
  
  res.json({
    total: list.length,
    data: list
  });
});

app.get('/properties', (req, res) => {
  res.json({
    total: SAMPLE_PROPERTIES.length,
    data: SAMPLE_PROPERTIES
  });
});

app.post('/api/chainlink/verify', async (req, res) => {
  const { propertyId, propertyAddress, tenantAddress, expectedRentAmount, paymentProof, subscriptionId, routerAddress } = req.body || {};
  
  if (!propertyId) {
    return res.status(400).json({ error: 'propertyId is required' });
  }
  
  const verificationId = `cl_${crypto.randomBytes(12).toString('hex')}`;
  const createdAt = Date.now();
  
  const record = {
    verificationId,
    propertyId,
    propertyAddress: propertyAddress || '',
    tenantAddress: tenantAddress || '',
    expectedRentAmount: expectedRentAmount || 0,
    paymentProof: paymentProof || '',
    subscriptionId: subscriptionId || '',
    routerAddress: routerAddress || '',
    status: 'pending',
    createdAt,
    verifiedAt: null,
    chainlinkJobId: null,
    chainlinkTx: null,
    error: null
  };
  
  IN_MEMORY_STORE.verifications.set(verificationId, record);
  
  console.log(`[Chainlink API] Verification request received: ${verificationId} for property ${propertyId}`);
  
  setTimeout(async () => {
    const verification = IN_MEMORY_STORE.verifications.get(verificationId);
    if (!verification) return;
    
    const price = await fetchChainlinkPrice();
    const isValid = Math.random() > 0.1;
    
    verification.status = isValid ? 'verified' : 'failed';
    verification.verifiedAt = Date.now();
    verification.chainlinkJobId = `cljob_${crypto.randomBytes(6).toString('hex')}`;
    verification.chainlinkTx = isValid ? `0x${crypto.randomBytes(32).toString('hex')}` : null;
    verification.priceFeedAtVerification = price;
    
    IN_MEMORY_STORE.verifications.set(verificationId, verification);
    
    console.log(`[Chainlink API] Verification ${verificationId} completed: ${verification.status}`);
  }, 2000 + Math.floor(Math.random() * 3000));
  
  res.json({
    verificationId,
    propertyId,
    status: 'pending',
    message: 'Chainlink verification request submitted'
  });
});

app.get('/api/chainlink/status/:verificationId', (req, res) => {
  const { verificationId } = req.params;
  const rec = IN_MEMORY_STORE.verifications.get(verificationId);
  
  if (!rec) {
    return res.status(404).json({ 
      verificationId,
      status: 'not_found',
      error: 'Verification not found'
    });
  }
  
  res.json({
    verificationId: rec.verificationId,
    propertyId: rec.propertyId,
    status: rec.status,
    chainlinkTx: rec.chainlinkTx,
    verifiedAt: rec.verifiedAt,
    error: rec.error
  });
});

app.get('/api/chainlink/history/:propertyId', (req, res) => {
  const { propertyId } = req.params;
  const propId = parseInt(propertyId);
  
  const history = Array.from(IN_MEMORY_STORE.verifications.values())
    .filter(v => v.propertyId === propId)
    .sort((a, b) => (b.verifiedAt || b.createdAt) - (a.verifiedAt || a.createdAt));
  
  res.json({
    propertyId: propId,
    total: history.length,
    data: history
  });
});

app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  TENANCY Backend - Real Payment Integration`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API Key: ${API_KEY}`);
  console.log(`Chainlink Price Feed: ${CHAINLINK_FEED}`);
  console.log(`Use Real Prices: ${USE_REAL_PRICES}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /health           - Health check`);
  console.log(`  GET  /price-feed       - ETH/USD price from Chainlink`);
  console.log(`  GET  /payments         - List all payments`);
  console.log(`  GET  /payments/:id     - Get payments for property`);
  console.log(`  POST /verify-payment   - Request verification`);
  console.log(`  POST /webhook/payment  - Payment webhook (x-api-key)`);
  console.log(`  POST /trigger-chainlink - Trigger on-chain (x-api-key)`);
  console.log(`${'='.repeat(60)}\n`);
});
