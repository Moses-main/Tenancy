# TENANCY Codebase Issue Backlog (Expanded)

This backlog is a curated implementation queue after reviewing frontend, smart contracts, backend API, and workflow integration. It is intentionally issue-oriented so each item can be copied into GitHub Issues.

---

## Priority 0 — Critical correctness & security (must fix first)

### 1) Replace broken direct-buy token flow with atomic settlement
**Problem**
- Buyer path in `buyPropertyTokens` performs USDC `transferFrom` and property token `transfer` in a non-atomic, signer-inconsistent way.
- Current path can fail for normal users and does not guarantee atomic delivery-versus-payment.

**Where**
- `src/lib/useContracts.ts`
- `contracts/src/PropertyMarketplace.sol`

**Implementation to add**
- A single on-chain purchase function (marketplace or router) that atomically moves USDC and property tokens.
- Listing IDs and quantity-based buys instead of “seller address + token address” manual wiring.

**Acceptance criteria**
- Buyer with USDC can buy listed property tokens in one transaction.
- Partial state changes cannot occur.

---

### 2) Fix yield claim identifier bug (`propertyId` vs `distributionId`)
**Problem**
- Investor UI calls `claimYield(prop.id)` while contract expects distribution ID.
- Can revert or claim wrong distributions.

**Where**
- `src/pages/Investor.tsx`
- `src/lib/useContracts.ts`
- `contracts/src/YieldDistributor.sol`

**Implementation to add**
- Claim queue built from claimable distribution IDs returned by a query function.

**Acceptance criteria**
- Claim action only targets valid unclaimed distributions.

---

### 3) Remove World ID fail-open behavior
**Problem**
- On script/runtime error, UI currently marks user verified and triggers `onVerified()`.

**Where**
- `src/components/WorldIdVerify.tsx`

**Implementation to add**
- Fail-closed UX + proof verification backend endpoint.
- Store and check nullifier hash to prevent replay.

**Acceptance criteria**
- Verification never passes on error path.
- Replay attempts are rejected.

---

### 4) Eliminate privileged API key exposure in frontend
**Problem**
- Frontend includes API key usage for protected endpoints.

**Where**
- `src/lib/api.ts`
- `server/index.js`

**Implementation to add**
- Session/auth-based server authorization (wallet signature or Privy JWT verification).
- Service-only credentials kept server-side only.

**Acceptance criteria**
- No privileged key shipped to browser bundle.

---

### 5) Add authorization checks to backend mutating endpoints
**Problem**
- Several mutation endpoints rely only on static API key and lack role-based checks.

**Where**
- `server/index.js`

**Implementation to add**
- RBAC for issuer/agent/admin actions.
- Request signing / nonce replay protection for high-value actions.

**Acceptance criteria**
- Unauthorized users cannot trigger Chainlink, decisions, or distributions.

---

### 6) Replace random payment verification with deterministic evidence checks
**Problem**
- `/verify-payment` uses delayed random pass/fail simulation.

**Where**
- `server/index.js`

**Implementation to add**
- Deterministic verification engine (evidence hash, provider webhook signature validation, status transitions).

**Acceptance criteria**
- Same evidence yields same result, with auditable verification record.

---

## Priority 1 — Core product behavior gaps

### 7) Connect tenant payment -> verification -> distribution lifecycle end-to-end
**Problem**
- Tenant payment only transfers USDC; it does not automatically create verification, trigger workflow, or create/track distribution records.

**Where**
- `src/pages/Tenant.tsx`
- `src/lib/useContracts.ts`
- `src/lib/api.ts`
- `server/index.js`

**Implementation to add**
- Transaction receipt ingestion + verification request with txHash + polling/webhook updates.
- Automatic transition to distribution job on verified payment.

**Acceptance criteria**
- Each rent payment has a linked verification and downstream distribution status.

---

### 8) Fix “Unclaimed Yield” to user-specific claimable value
**Problem**
- UI uses global `totalYieldPool()` instead of per-user claimable amount.

**Where**
- `src/lib/useContracts.ts`
- `src/pages/Investor.tsx`

**Implementation to add**
- User claimable aggregation from distribution snapshots.

**Acceptance criteria**
- Dashboard amount equals what user can claim now.

---

### 9) Correct ABI mismatch for distribution info decoding
**Problem**
- ABI tuple does not fully match accessed fields (`holders` usage etc.).

**Where**
- `src/lib/contracts.ts`
- `src/lib/useContracts.ts`

**Implementation to add**
- ABI sync script or generated TypeChain bindings.

**Acceptance criteria**
- Typed access with no runtime undefined decoding.

---

### 10) Replace hardcoded pricing constants with executable market pricing
**Problem**
- Hardcoded `1.05` conversion and fixed ETH value (`0.01`) for listing buys.

**Where**
- `src/pages/Investor.tsx`
- `src/pages/Marketplace.tsx`
- `src/lib/useContracts.ts`

**Implementation to add**
- Listing-derived price quote + slippage bounds + fee display.

**Acceptance criteria**
- UI quote always matches submitted transaction economics.

---

### 11) Implement real on-chain marketplace integration in Marketplace page
**Problem**
- Listings are synthesized from properties and local UI state; create/cancel flows are not persisted on-chain.

**Where**
- `src/pages/Marketplace.tsx`

**Implementation to add**
- Read from `getActiveListings()` and invoke `createListing/cancelListing/buyListing` contract methods.

**Acceptance criteria**
- Refreshing page preserves listing state from chain.

---

### 12) Add inventory correctness checks for available token amounts
**Problem**
- “Available” uses total property token supply instead of listed/liquid amount.

**Where**
- `src/pages/Investor.tsx`
- `src/pages/Marketplace.tsx`

**Implementation to add**
- Aggregate active listing inventory and enforce preflight quantity checks.

**Acceptance criteria**
- User cannot attempt to buy more than active listed amount.

---

### 13) Implement buyer/seller settlement receipts and status timeline
**Problem**
- No canonical transaction timeline is shown for purchase lifecycle.

**Where**
- `src/pages/Investor.tsx`
- `src/pages/Marketplace.tsx`

**Implementation to add**
- Status model: initiated -> pending -> confirmed -> settled/failed with tx links.

**Acceptance criteria**
- Users can inspect complete settlement history per action.

---

### 14) Add issuer-side payment monitoring dashboard from real backend data
**Problem**
- Issuer dashboard focuses on property creation but lacks payment verification and delinquency panel.

**Where**
- `src/pages/Issuer.tsx`
- `src/lib/api.ts`

**Implementation to add**
- Verified/pending/failed payment widgets per property + overdue alerts.

**Acceptance criteria**
- Issuer can see rent collection and verification health in one place.

---

### 15) Wire KYC component into gated flows
**Problem**
- KYC component exists but is not integrated into key actions (tokenization, large buys, high-risk withdrawals).

**Where**
- `src/components/KYCVerification.tsx`
- `src/pages/Issuer.tsx`
- `src/pages/Investor.tsx`

**Implementation to add**
- Policy engine for thresholds and required verification steps.

**Acceptance criteria**
- Restricted actions are blocked until required KYC state is satisfied.

---

## Priority 2 — Platform integrity, data quality, and devex

### 16) Replace mock IPFS fallback hashes with explicit “unconfigured” handling
**Problem**
- IPFS upload silently returns fake hashes when credentials are missing.

**Where**
- `src/lib/ipfs.ts`

**Implementation to add**
- Strict mode: reject upload if config missing (except explicit demo mode).

**Acceptance criteria**
- Production mode cannot persist fake metadata references.

---

### 17) Add network/contract deployment validation guard at app startup
**Problem**
- App assumes configured contract addresses are valid deployed contracts.

**Where**
- `src/lib/contracts.ts`
- `src/lib/useContracts.ts`
- `App.tsx`

**Implementation to add**
- Startup health check for bytecode presence and ABI compatibility.

**Acceptance criteria**
- User receives actionable warning when deployment config is invalid.

---

### 18) Remove protocol-critical hardcoded defaults in UI
**Problem**
- Hardcoded IDs/keys/defaults can mask configuration errors (`World ID app`, `Privy app`, `MoonPay`).

**Where**
- `App.tsx`
- `src/components/WorldIdVerify.tsx`
- `src/components/MoonPayWidget.tsx`

**Implementation to add**
- Centralized env validation and feature flags.

**Acceptance criteria**
- Missing config disables feature with clear UI message.

---

### 19) Add idempotency keys for backend mutation endpoints
**Problem**
- Repeated client retries can duplicate decision/distribution side effects.

**Where**
- `server/index.js`
- `server/db/*`

**Implementation to add**
- Idempotency token storage and duplicate-request protection.

**Acceptance criteria**
- Duplicate POST retries produce one logical action.

---

### 20) Add pagination/filtering for heavy backend list endpoints
**Problem**
- Payments/verifications endpoints can become large and slow.

**Where**
- `server/index.js`
- `src/lib/api.ts`

**Implementation to add**
- Cursor/offset pagination with indexed query params.

**Acceptance criteria**
- Large datasets load incrementally and remain responsive.

---

### 21) Add structured audit logs for critical state transitions
**Problem**
- Console logs are not sufficient for production forensic tracing.

**Where**
- `server/index.js`

**Implementation to add**
- Structured logs (JSON), correlation IDs, and event category fields.

**Acceptance criteria**
- Every verification/distribution action is traceable end-to-end.

---

### 22) Add explicit decimal normalization utility across app
**Problem**
- Mix of 6-decimal (USDC) and 18-decimal tokens is spread across code paths, increasing mismatch risk.

**Where**
- `src/lib/useContracts.ts`
- `src/pages/*.tsx`

**Implementation to add**
- Shared typed amount utility library with unit-safe wrappers.

**Acceptance criteria**
- No ad-hoc decimal math in page components.

---

### 23) Add robust contract event indexing layer for frontend state
**Problem**
- UI often reconstructs state from direct reads only; event history and temporal ordering are missing.

**Where**
- `src/lib/useContracts.ts`
- backend (new optional indexer service)

**Implementation to add**
- Event indexer (subgraph or lightweight DB sync) for listings, payments, distributions.

**Acceptance criteria**
- Dashboards show time-ordered, queryable protocol activity.

---

### 24) Tighten contract-level invariant tests and fuzzing
**Problem**
- Existing tests cover basics but not full invariants for settlement/distribution safety.

**Where**
- `contracts/test/TENANCY.t.sol`

**Implementation to add**
- Fuzz tests for claim correctness, reserve health, pause/resume paths, and malicious edge cases.

**Acceptance criteria**
- Invariant suite catches broken accounting and unauthorized transitions.

---

### 25) Add end-to-end test suite for full business flow
**Problem**
- No deterministic full-path tests from issuer setup to investor claim.

**Where**
- frontend/backend test harness (new)
- `contracts/test/` + integration tests

**Implementation to add**
- E2E scenarios: issuer create -> tenant pay -> verify -> distribute -> investor claim + failure variants.

**Acceptance criteria**
- CI validates happy path and key failure paths on every PR.

---

## Priority 3 — UX and operational hardening

### 26) Add pending transaction recovery on page reload
**Problem**
- In-flight blockchain tx context is lost on refresh.

**Where**
- `src/lib/transactions.ts`
- `src/pages/*.tsx`

**Implementation to add**
- Local pending tx journal with hash-based recovery/polling.

**Acceptance criteria**
- Users see accurate final status after refresh.

---

### 27) Add chain mismatch strategy for Base Sepolia vs Sepolia routing
**Problem**
- App supports both IDs in hooks but UX messaging often mandates one chain only.

**Where**
- `src/lib/AuthContext.tsx`
- `src/pages/*.tsx`

**Implementation to add**
- Feature-by-network matrix and route-level guard logic.

**Acceptance criteria**
- Users get precise network guidance per feature.

---

### 28) Add role-aware navigation and action availability
**Problem**
- All major portals are always visible; role-specific action restrictions are mostly implicit.

**Where**
- `src/components/Layout.tsx`
- `src/lib/AuthContext.tsx`

**Implementation to add**
- Optional role assignment model (issuer/investor/tenant/agent) with UI gating.

**Acceptance criteria**
- Users only see actions they can execute.

---

### 29) Add docs for operational runbooks (verification incidents / oracle outages)
**Problem**
- Operational responses for payment verification failures and oracle downtime are undocumented.

**Where**
- `README.md`
- `SUPPORT.md`
- `monitoring/README.md`

**Implementation to add**
- Incident runbooks and escalation paths.

**Acceptance criteria**
- Team can execute standard recovery without tribal knowledge.

---

### 30) Track issue ownership and milestones
**Problem**
- Backlog lacks owner, effort, and target release metadata.

**Where**
- `CODEBASE_ISSUES.md` (this file)

**Implementation to add**
- Add columns/tags in issue tracker: owner, severity, ETA, dependency, release.

**Acceptance criteria**
- Every issue is triaged and assigned to a milestone.

