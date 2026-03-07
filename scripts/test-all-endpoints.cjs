const crypto = require('crypto');
const { ethers } = require('ethers');

const BASE_URL = 'http://localhost:4010';

async function testEndpoint(name, path, method = 'GET', body = null, headers = {}) {
  console.log(`\n--- ${name} (${method} ${path}) ---`);
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json', ...headers }
    };
    if (body) options.body = JSON.stringify(body);
    const response = await fetch(`${BASE_URL}${path}`, options);
    const data = await response.json().catch(() => ({}));
    const status = response.ok ? '✅' : '❌';
    console.log(`${status} ${response.status} — ${JSON.stringify(data).slice(0, 200)}`);
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    return { ok: false, error: error.message };
  }
}

async function getAuthHeaders(wallet) {
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

async function run() {
  console.log('========================================');
  console.log('  TENANCY FULL APPLICATION TEST SUITE');
  console.log('========================================');

  const wallet = ethers.Wallet.createRandom();
  const results = { pass: 0, fail: 0 };

  function track(res) {
    if (res.ok) results.pass++;
    else results.fail++;
    return res;
  }

  // === 1. PUBLIC READ ENDPOINTS ===
  console.log('\n\n=== 1. PUBLIC READ ENDPOINTS ===');
  track(await testEndpoint('Health Check', '/health'));
  track(await testEndpoint('Price Feed', '/price-feed'));
  track(await testEndpoint('Get Stats', '/stats'));
  track(await testEndpoint('Get All Payments', '/payments'));
  track(await testEndpoint('Get Payments (with filters)', '/payments?limit=5&offset=0&status=verified'));
  track(await testEndpoint('Get Payments by Property', '/payments/1'));
  track(await testEndpoint('Get All Verifications', '/verifications'));
  track(await testEndpoint('Get Verifications (filtered)', '/verifications?status=verified&limit=5'));
  track(await testEndpoint('Get Agent Decisions', '/agent/decisions'));
  track(await testEndpoint('Get Agent Decisions (by property)', '/agent/decisions?propertyId=1'));
  track(await testEndpoint('Get Yield Distributions', '/yield/distributions?propertyId=1'));

  // === 2. WORLD ID VERIFICATION ===
  console.log('\n\n=== 2. WORLD ID VERIFICATION ===');

  // 2a. Missing fields should return 400
  const worldIdMissing = track(await testEndpoint('World ID: Missing fields', '/world-id/verify', 'POST', {}));
  console.log(`   Expected 400 → Got ${worldIdMissing.status} ${worldIdMissing.status === 400 ? '✅' : '⚠️'}`);

  // 2b. With mock proof data (will hit the real Worldcoin API now)
  const worldIdMock = track(await testEndpoint('World ID: Mock proof (real API call)', '/world-id/verify', 'POST', {
    merkle_root: '0x' + crypto.randomBytes(32).toString('hex'),
    nullifier_hash: '0x' + crypto.randomBytes(32).toString('hex'),
    proof: '0x' + crypto.randomBytes(256).toString('hex'),
    verification_level: 'orb',
    action: 'tenancy-verify',
    signal: wallet.address
  }));
  console.log(`   Expected 400 (invalid proof) → Got ${worldIdMock.status} ${worldIdMock.status === 400 ? '✅ (API correctly rejected fake proof)' : '⚠️'}`);

  // === 3. PAYMENT INGESTION LIFECYCLE ===
  console.log('\n\n=== 3. PAYMENT INGESTION LIFECYCLE ===');

  const txHash = `0x${crypto.randomBytes(32).toString('hex')}`;
  const ingestRes = track(await testEndpoint('Ingest Payment', '/payments/ingest', 'POST', {
    propertyId: 1,
    amount: 2500,
    txHash,
    proofUrl: 'https://ipfs.io/ipfs/QmTestReceipt123',
    tenantName: 'Test Tenant',
    tenantAddress: wallet.address
  }));

  if (ingestRes.ok) {
    const { paymentId, verificationId } = ingestRes.data;
    console.log(`   paymentId=${paymentId}, verificationId=${verificationId}`);

    track(await testEndpoint('Payment Lifecycle', `/payments/lifecycle/${paymentId}`));
    track(await testEndpoint('Verification Detail', `/verifications/${verificationId}`));
  }

  // === 4. LEGACY VERIFY-PAYMENT ===
  console.log('\n\n=== 4. LEGACY VERIFY-PAYMENT ===');
  track(await testEndpoint('Verify Payment', '/verify-payment', 'POST', {
    propertyId: 2,
    proofUrl: 'https://example.com/receipt.pdf',
    amount: 4200,
    tenantAddress: wallet.address
  }));

  // === 5. AGENT DECISIONS (AUTH REQUIRED) ===
  console.log('\n\n=== 5. AGENT DECISIONS (AUTH REQUIRED) ===');

  // 5a. Without auth → should fail
  const noAuth = track(await testEndpoint('Agent Decision (NO AUTH)', '/agent/decisions', 'POST', {
    propertyId: 1, action: 'distribute_yield'
  }));
  console.log(`   Expected 401 → Got ${noAuth.status} ${noAuth.status === 401 ? '✅' : '⚠️'}`);

  // 5b. With auth → should succeed
  const decisionRes = track(await testEndpoint('Agent Decision (WITH AUTH)', '/agent/decisions', 'POST', {
    propertyId: 1,
    action: 'distribute_yield',
    adjustmentPercent: 5,
    reason: 'Strong rental performance',
    confidence: 95
  }, await getAuthHeaders(wallet)));

  if (decisionRes.ok) {
    const { decisionId } = decisionRes.data;

    // Execute the decision
    track(await testEndpoint('Execute Decision', '/agent/execute', 'POST',
      { decisionId }, await getAuthHeaders(wallet)));
  }

  // === 6. YIELD DISTRIBUTION (AUTH REQUIRED) ===
  console.log('\n\n=== 6. YIELD DISTRIBUTION (AUTH REQUIRED) ===');
  track(await testEndpoint('Yield Distribute', '/yield/distribute', 'POST', {
    propertyId: 3,
    totalYield: 1500
  }, { ...await getAuthHeaders(wallet), 'x-wallet-role': 'issuer' }));

  // === 7. CHAINLINK TRIGGER (AUTH REQUIRED) ===
  console.log('\n\n=== 7. CHAINLINK TRIGGER (AUTH REQUIRED) ===');
  track(await testEndpoint('Trigger Chainlink', '/trigger-chainlink', 'POST', {
    propertyId: 1,
    amount: 2500
  }, await getAuthHeaders(wallet)));

  // === 8. AUTOMATION TRIGGER ===
  console.log('\n\n=== 8. AUTOMATION TRIGGER ===');
  track(await testEndpoint('Trigger Automation', '/automation/trigger', 'POST', {},
    await getAuthHeaders(wallet)));

  // === SUMMARY ===
  console.log('\n\n========================================');
  console.log(`  RESULTS: ${results.pass} passed, ${results.fail} failed`);
  console.log('========================================');
}

run();
