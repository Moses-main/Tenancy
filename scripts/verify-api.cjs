const fetch = require('node-fetch');
const crypto = require('crypto');
const { ethers } = require('ethers');

const BASE_URL = 'http://localhost:4010';
const API_KEY = 'tenancy_dev_key_2024';

async function testEndpoint(name, path, method = 'GET', body = null, headers = {}) {
  console.log(`Testing ${name} (${method} ${path})...`);
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${BASE_URL}${path}`, options);
    const data = await response.json().catch(() => ({}));
    
    if (response.ok) {
      console.log(`✅ ${name} success (${response.status})`);
      return { ok: true, data };
    } else {
      console.log(`❌ ${name} failed (${response.status}):`, data.error || response.statusText);
      return { ok: false, status: response.status, data };
    }
  } catch (error) {
    console.log(`❌ ${name} error:`, error.message);
    return { ok: false, error: error.message };
  }
}

async function runTests() {
  console.log('--- Starting API Verification ---');

  // 1. Public Endpoints
  await testEndpoint('Health Check', '/health');
  await testEndpoint('Price Feed', '/price-feed');
  await testEndpoint('Get Payments', '/payments');
  await testEndpoint('Get Verifications', '/verifications');
  await testEndpoint('Get Stats', '/stats');
  await testEndpoint('Get Agent Decisions', '/agent/decisions');
  await testEndpoint('Get Yield Distributions', '/yield/distributions?propertyId=1');

  // 2. Auth Required (Admin API Key)
  const adminHeaders = { 'x-api-key': API_KEY };
  await testEndpoint('Admin: Trigger Automation', '/automation/trigger', 'POST', {}, adminHeaders);
  
  // 3. Mutation with Wallet Signature (Simulated)
  console.log('Generating wallet signature for mutation test...');
  const wallet = ethers.Wallet.createRandom();
  const nonce = crypto.randomBytes(16).toString('hex');
  const message = `Authorize TENANCY mutation nonce:${nonce}`;
  const signature = await wallet.signMessage(message);

  const authHeaders = {
    'x-wallet-address': wallet.address,
    'x-wallet-signature': signature,
    'x-wallet-message': message,
    'x-wallet-role': 'admin' // In real app, role is checked vs DB/Contract, but script uses simulated
  };

  // Test mutation with signature
  await testEndpoint('Mutation: Verify Payment (with Sign)', '/verify-payment', 'POST', {
    propertyId: 1,
    proofUrl: 'https://example.com/receipt.pdf',
    amount: 2500,
    tenantAddress: wallet.address
  }, authHeaders);

  console.log('--- API Verification Complete ---');
}

runTests();
