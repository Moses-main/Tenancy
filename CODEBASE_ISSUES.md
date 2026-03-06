# TENANCY Codebase Issue Backlog

This backlog is derived from a code walkthrough focused on the flows requested: property buying, token acquisition, payment verification, and World ID verification.

## Priority 0 (blocking correctness / security)

### 1) Fix property purchase flow: buyer cannot call USDC `transferFrom` without seller-side allowance
**Problem**
- `buyPropertyTokens` currently makes the buyer wallet call `usdc.transferFrom(buyerAddress, sellerAddress, totalCost)`. In ERC-20, `transferFrom` spends allowance that the **from** address granted to the caller. Here, the caller is the buyer, so this requires buyer self-allowance (non-standard UX), and the prior approval is set to the property token contract, not to the buyer itself.
- The function then calls `propertyToken.transfer(buyerAddress, amountWei)` from the buyer signer, which only succeeds if the buyer already holds those property tokens.

**Where**
- `src/lib/useContracts.ts`

**Fix direction**
- Replace this with an on-chain marketplace/escrow purchase function (single tx) that atomically moves payment and property tokens.
- If keeping direct peer-to-peer, use signed orders + permit or require seller to pre-approve a settlement contract.

**Acceptance criteria**
- Purchase succeeds for a buyer who has USDC but no property tokens.
- Transfer path is atomic and cannot leave one leg completed without the other.

---

### 2) Fix yield claim mismatch: frontend passes property id into `claimYield(distributionId)`
**Problem**
- Investor flow loops over properties and calls `claimYield(prop.id)`.
- ABI and contract signature are `claimYield(uint256 distributionId)`.
- This can claim wrong records or revert once distributions and property IDs diverge.

**Where**
- `src/pages/Investor.tsx`
- `src/lib/useContracts.ts`
- `src/lib/contracts.ts`
- `contracts/src/YieldDistributor.sol`

**Fix direction**
- Fetch claimable distribution IDs for user and pass those IDs.
- Introduce explicit mapping/query: property -> distribution IDs.

**Acceptance criteria**
- Claim button only submits valid, unclaimed distribution IDs.
- Integration test confirms mixed distribution/property ids cannot misclaim.

---

### 3) Remove World ID fail-open behavior
**Problem**
- On verification errors (script load/init failures), component still sets verified state and calls `onVerified()`.
- This bypasses sybil resistance and invalidates gated actions like yield claiming.

**Where**
- `src/components/WorldIdVerify.tsx`

**Fix direction**
- Make verification fail-closed: do not call `onVerified()` unless proof is valid.
- Verify proof server-side/on-chain rather than trusting client callback.

**Acceptance criteria**
- Network/script failure keeps user unverified.
- Valid proof path is the only path that unlocks claim action.

---

### 4) Remove hardcoded API key from frontend client
**Problem**
- Frontend ships default API key constant and uses it for protected endpoints.
- Any user can read/abuse this key in browser bundle.

**Where**
- `src/lib/api.ts`
- `server/index.js`

**Fix direction**
- Do not expose privileged keys in frontend.
- Move protected operations behind authenticated backend sessions/service-to-service auth.

**Acceptance criteria**
- No privileged key present in frontend source/build.
- Protected endpoints reject unauthenticated public clients.

## Priority 1 (major product gaps)

### 5) Implement real rent-payment verification pipeline (replace random async result)
**Problem**
- `/verify-payment` marks verification success/failure with `Math.random()` after timeout.
- This is explicitly mock behavior and not tied to payment rails/on-chain evidence.

**Where**
- `server/index.js`

**Fix direction**
- Integrate deterministic verification source (bank API/provider webhook + signed records).
- Store evidence hashes and verification audit trail.

**Acceptance criteria**
- Verification outcome is deterministic from evidence.
- Re-runs on same evidence return same result.

---

### 6) Connect tenant payment to verification + yield distribution lifecycle
**Problem**
- Tenant rent flow transfers USDC directly to property owner, but does not create backend verification, does not trigger chainlink workflow, and does not create distribution.

**Where**
- `src/lib/useContracts.ts` (`payRent`)
- `src/pages/Tenant.tsx`
- `src/lib/api.ts`

**Fix direction**
- After payment, submit proof/txHash to verification endpoint.
- On verified status, trigger/queue distribution creation process.

**Acceptance criteria**
- Paying rent creates a verification record linked to property and tx hash.
- Verified payments are traceably reflected in distribution state.

---

### 7) Replace fixed USDC/TEN conversion with oracle/listing price
**Problem**
- Investor buy flow uses hardcoded `1 TEN = 1.05 USDC` estimate and cost path.
- Marketplace buy uses hardcoded `0.01 ETH` payment for any listing.

**Where**
- `src/pages/Investor.tsx`
- `src/lib/useContracts.ts`

**Fix direction**
- Read listing-specific price from contract for each purchase.
- If protocol swap route exists, source price from oracle + slippage bounds.

**Acceptance criteria**
- UI quote equals executable on-chain price.
- Buy tx value/amount computed from selected listing, not constants.

---

### 8) Fix `getPendingYield` semantics (currently returns global pool, not user pending amount)
**Problem**
- Dashboard “Unclaimed Yield” shows `totalYieldPool()` which is protocol-wide, not user-specific claimable yield.

**Where**
- `src/lib/useContracts.ts`
- `src/pages/Investor.tsx`

**Fix direction**
- Add/read user-claimable amount per distribution and sum for current address.

**Acceptance criteria**
- “Unclaimed Yield” equals amount user can actually claim in next tx.

---

### 9) Reconcile ABI type mismatch for `getDistributionInfo`
**Problem**
- ABI in frontend defines tuple without `holders`, but code accesses `info.holders` and `holderBalances` aligned by index.
- This is fragile and may silently break depending on ethers decoding.

**Where**
- `src/lib/contracts.ts`
- `src/lib/useContracts.ts`

**Fix direction**
- Update ABI to exact contract return type (including holders).
- Add runtime guards for malformed data.

**Acceptance criteria**
- Type-safe decoding, no undefined `holders` access.

## Priority 2 (quality / operations)

### 10) Externalize MoonPay key and environment gating
**Problem**
- MoonPay publishable key is hardcoded; environment-based configuration is missing.

**Where**
- `src/components/MoonPayWidget.tsx`

**Fix direction**
- Read key from `VITE_MOONPAY_PUBLISHABLE_KEY` and disable widget when absent.

**Acceptance criteria**
- No hardcoded key in source.
- Clear UX when MoonPay is not configured.

---

### 11) Implement ownership/availability checks for listings and purchases
**Problem**
- Investor “available tokens” is displayed from total supply and not from actual listed/liquid supply.
- Purchase path does not enforce selected quantity against an active listing book.

**Where**
- `src/pages/Investor.tsx`
- `src/lib/useContracts.ts`
- `contracts/src/PropertyMarketplace.sol`

**Fix direction**
- Use marketplace active listings as source of purchasable inventory.
- Validate amount against listing availability before tx.

**Acceptance criteria**
- UI available amount equals aggregate active listings.
- Attempting to overbuy fails preflight in UI.

---

### 12) Add end-to-end tests for core flows (issuer -> tenant pay -> verify -> distribute -> investor claim)
**Problem**
- Current test surface does not cover full cross-component business workflow.

**Where**
- `contracts/test/`
- frontend/backend integration test setup (new)

**Fix direction**
- Add deterministic e2e/integration tests with mocked external providers.

**Acceptance criteria**
- CI test validates happy path and key failure modes (verification fail, world id fail, insufficient balance).

