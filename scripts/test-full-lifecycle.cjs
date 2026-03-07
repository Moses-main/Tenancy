const fetch = require('node-fetch');
const crypto = require('crypto');
const { ethers } = require('ethers');

const BASE_URL = 'http://localhost:4010';
const API_KEY = 'tenancy_dev_key_2024';

async function testEndpoint(name, path, method = 'GET', body = null, headers = {}) {
  console.log(`\n--- Testing ${name} (${method} ${path}) ---`);
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
      // console.log('Response:', JSON.stringify(data, null, 2));
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

async function runLifecycle() {
  console.log('=== STARTING FULL TRANSACTION LIFECYCLE TEST ===');

  // 1. Ingest Payment
  const txHash = `0x${crypto.randomBytes(32).toString('hex')}`;
  const paymentPayload = {
    propertyId: 1,
    amount: 1500.50,
    txHash: txHash,
    proofUrl: 'https://ipfs.io/ipfs/QmTestPaymentProof',
    tenantName: 'Alice Tenant',
    tenantAddress: '0x1234567890123456789012345678901234567890'
  };

  const ingestRes = await testEndpoint('Ingest Payment', '/payments/ingest', 'POST', paymentPayload);
  if (!ingestRes.ok) return;

  const { paymentId, verificationId } = ingestRes.data;
  console.log(`Payment ID: ${paymentId}, Verification ID: ${verificationId}`);

  // 2. Check Lifecycle Status
  await testEndpoint('Check Lifecycle Status', `/payments/lifecycle/${paymentId}`);

  // 3. Verify specifically
  await testEndpoint('Get Verification Details', `/verifications/${verificationId}`);

  // 4. Create Agent Decision (Auth required)
  const wallet = ethers.Wallet.createRandom();
  
  async function getAuthHeaders() {
    const nonce = crypto.randomBytes(16).toString('hex');
    const message = `Authorize TENANCY mutation nonce:${nonce}`;
    const signature = await wallet.signMessage(message);
    return {
      'x-wallet-address': wallet.address,
      'x-wallet-signature': signature,
      'x-wallet-message': message,
      'x-wallet-role': 'admin'
    };
  }

  const decisionPayload = {
    propertyId: 1,
    action: 'distribute_yield',
    adjustmentPercent: 5,
    reason: 'Property performance exceeds expectations',
    confidence: 98
  };

  const decisionRes = await testEndpoint('Create Agent Decision', '/agent/decisions', 'POST', decisionPayload, await getAuthHeaders());
  if (!decisionRes.ok) return;
  const { decisionId } = decisionRes.data;

  // 5. Execute Agent Decision
  await testEndpoint('Execute Agent Decision', '/agent/execute', 'POST', { decisionId }, await getAuthHeaders());

  // 6. Trigger Automation
  await testEndpoint('Trigger Automation', '/automation/trigger', 'POST', {}, await getAuthHeaders());

  // 7. Verify Stats
  await testEndpoint('Get Final Stats', '/stats');

  console.log('\n=== FULL TRANSACTION LIFECYCLE TEST COMPLETE ===');
}

runLifecycle();
