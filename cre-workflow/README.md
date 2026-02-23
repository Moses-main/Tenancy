# TENANCY CRE Workflow

Chainlink Runtime Environment (CRE) workflow for rental payment verification and automated yield distribution.

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Trigger   │───▶│  Off-Chain  │───▶│  On-Chain   │
│  Cron 00:00 │    │   Verify &  │    │   Yield     │
│   OR Event  │    │  Consensus  │    │ Distribution│
└─────────────┘    └─────────────┘    └─────────────┘
```

## Workflow Steps

### 1. Trigger
- **Cron**: Daily at 00:00 UTC
- **Event**: Emitted when `PaymentReceived` event fires on-chain

### 2. Off-Chain Verification
- Fetch payment status from mock/real payment API
- Verify transaction exists on-chain
- Validate payment amount matches rental agreement
- Check payment timestamp is within valid window

### 3. Consensus
- Multiple node operators verify payment independently
- Threshold-based consensus (e.g., 3 of 5 oracles agree)
- Reject if payment failed or insufficient confirmations

### 4. On-Chain Distribution
- Call `YieldDistributor.depositYield(propertyId, amount)`
- Call `YieldDistributor.distributeYield(distributionId)`
- Emit `YieldDistributed` event

## Setup

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
cd cre-workflow
npm install
```

### Configuration

Create `.env` file:

```env
# Ethereum Sepolia
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=0x...

# Contract Addresses (after deployment)
PROPERTY_REGISTRY_ADDRESS=0x...
YIELD_DISTRIBUTOR_ADDRESS=0x...

# Mock API (optional)
MOCK_API_URL=http://localhost:3000/api
```

## Running

### Simulate (Local Demo)

```bash
npm run simulate
```

This runs a local simulation without connecting to any blockchain.

### Run Workflow

```bash
npm run dev
```

## CRE Deployment (Early Access)

### 1. Request Early Access
Apply for Chainlink CRE early access: https://chain.link/cre

### 2. Deploy Workflow

Once you have CRE access:

```bash
# Build
npm run build

# Deploy to CRE
chainlink cre deploy --workflow ./dist/index.json
```

### 3. Configure Trigger

```json
{
  "trigger": {
    "type": "cron",
    "schedule": "0 0 * * *"
  }
}
```

Or event-based:

```json
{
  "trigger": {
    "type": "evm",
    "events": ["PaymentReceived(address,uint256,uint256)"]
  }
}
```

## Mock API Server

For testing, start the mock API server:

```bash
cd server
npm install
npm start
```

This provides endpoints:
- `GET /api/payments/:propertyId` - Get payment status

## Contract Integration

The workflow interacts with these contracts:

### YieldDistributor

```solidity
function depositYield(uint256 propertyId, uint256 amount) external;
function distributeYield(uint256 distributionId) external;
```

### PropertyRegistry

```solidity
function getProperty(uint256 propertyId) external view returns (Property memory);
```

## Demo Flow

1. **Issuer** creates property → gets PropertyToken
2. **Tenant** pays rent → payment recorded off-chain
3. **CRE Workflow** runs:
   - Fetches payment status
   - Verifies payment
   - Deposits yield to YieldDistributor
   - Distributes to token holders
4. **Investor** claims yield → receives TEN tokens

## Chainlink Price Feeds Integration

The workflow also uses Chainlink Price Feeds for:
- Converting rent payments to USD
- Property valuation in USD
- Yield calculations in USD

ETH/USD Sepolia: `0x694AA1769357215DE4FAC081bf1f309aDC325306`

## Testing

```bash
# Run simulation
npm run simulate

# Run full workflow (requires deployed contracts)
npm run dev
```

## Example Output

```
╔════════════════════════════════════════════════════════════╗
║     TENANCY CRE Workflow - Local Simulation              ║
╚════════════════════════════════════════════════════════════╝

┌────────────────────────────────────────────────────────────┐
│ STEP 1: Trigger Workflow                                   │
│   Trigger: Cron (daily 00:00 UTC) OR Event (PaymentMade)  │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ STEP 2: Fetch Payment Status (HTTP Request)                │
│   GET /api/payments/{propertyId}                          │
└────────────────────────────────────────────────────────────┘
   → Property 0: 2.5 ETH [verified]
   → Property 1: 3.5 ETH [verified]
   → Property 2: 1.8 ETH [pending]

┌────────────────────────────────────────────────────────────┐
│ STEP 3: Verify Payment (Consensus)                         │
│   - Check transaction on-chain                             │
│   - Validate amount matches rent agreement                  │
│   - Confirm payment timestamp                              │
└────────────────────────────────────────────────────────────┘
   ✓ Property 0: VERIFIED
   ✓ Property 1: VERIFIED
   ✗ Property 2: FAILED

┌────────────────────────────────────────────────────────────┐
│ STEP 4: On-Chain Yield Distribution                        │
│   Calling: YieldDistributor.depositYield()                 │
└────────────────────────────────────────────────────────────┘
   ✓ Property 0: Distributing 0.1250 TEN to token holders
   ✓ Property 1: Distributing 0.1750 TEN to token holders

╔════════════════════════════════════════════════════════════╗
║                    WORKFLOW COMPLETE                       ║
╠════════════════════════════════════════════════════════════╣
║  Verified: 2/3 properties                                 ║
║  Yield Distributed: 2 transactions                         ║
║  Total Yield: 0.300 TEN                                   ║
╚════════════════════════════════════════════════════════════╝
```
