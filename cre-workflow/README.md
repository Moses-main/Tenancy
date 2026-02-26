# TENANCY CRE Workflow

Chainlink Runtime Environment (CRE) workflow for rental payment verification and automated yield distribution.

## What is Chainlink CRE?

Chainlink CRE (Chainlink Runtime Environment) is a decentralized oracle network that enables smart contracts to securely interact with external data sources. For TENANCY, CRE handles:

1. **Off-Chain Payment Verification** - Verifies tenant rent payments through confidential APIs
2. **Consensus-Based Validation** - Multiple node operators independently verify payment status
3. **Automated Yield Distribution** - Triggers on-chain yield distribution when payments are verified

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Trigger   │───▶│  Off-Chain  │───▶│  On-Chain   │
│  Cron 00:00 │    │   Verify &  │    │   Yield     │
│   OR Event  │    │  Consensus  │    │ Distribution│
└─────────────┘    └─────────────┘    └─────────────┘
```

## How CRE Works in TENANCY

### 1. Trigger
The workflow can be triggered in two ways:
- **Cron**: Daily at 00:00 UTC (scheduled)
- **Event**: When `PaymentReceived` event fires on-chain

### 2. Off-Chain Verification
The CRE performs the following:
- Fetches payment status from the confidential payment API
- Verifies transaction exists on-chain
- Validates payment amount matches rental agreement
- Checks payment timestamp is within valid window
- Multiple oracle nodes reach consensus on payment status

### 3. Consensus
- Multiple node operators verify payment independently
- Threshold-based consensus (e.g., 3 of 5 oracles agree)
- Reject if payment failed or insufficient confirmations
- Privacy-preserving: sensitive data is masked in logs

### 4. On-Chain Distribution
Once verified:
- Calls `YieldDistributor.depositYield(propertyId, amount)`
- Calls `YieldDistributor.createDistribution()`
- Calls `YieldDistributor.startDistribution(distributionId)`
- Emits `YieldDistributed` event

## Contract Addresses

### Base Sepolia (Testnet)
| Contract | Address |
|----------|---------|
| PropertyRegistry | `0x8f77c2BD2132727327B27164cDec4ccaA2083f7C` |
| TENToken | `0x539bd9076cB447Da9c88e722052293dD3394b536` |
| YieldDistributor | `0xd7c3c5e900Bd95653FA65b660a94625E1ddbBDA1` |
| PriceFeedConsumer | `0xc8C6ecAA0287310bb8B0c9BE71253E758702b541` |
| Marketplace | `0xE07db63A23d6572dB1374B49DB7Cc063BE0aE035` |
| Chainlink Router | `0xf9B8fc078197181C841c296C876945aaa425B278` |
| ETH/USD Price Feed | `0x4a5816300e0eE47A41DFcDB12A8C8bB6dD18C12` |

### Ethereum Sepolia (Testnet)
| Contract | Address |
|----------|---------|
| PropertyRegistry | `0x452ba94272f3302E7b48bFFC1F5a57ec7136A6aA` |
| TENToken | `0x9e395acF058c74386b531e4c901C53B1c73E6D5F` |
| YieldDistributor | `0x84bc076C939Aa2B70e0DaEbA708B3aDa3881a179` |
| PriceFeedConsumer | `0xE88A399F85550dDF61f9DD6Cb91e2673817D7f91` |
| ETH/USD Price Feed | `0x694AA1769357215DE4FAC081bf1f309aDC325306` |

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

## Privacy Features

The CRE workflow includes several privacy-preserving features:

1. **Confidential HTTP**: All API calls use encrypted headers
2. **Data Masking**: Sensitive data (addresses, amounts) never logged
3. **Private Computation**: Yield calculations performed off-chain
4. **Zero-Knowledge**: Verification without exposing tenant data

## AI Integration

The workflow also integrates with an AI service for:
- Property risk analysis
- Yield distribution strategy optimization
- Market trend analysis
- Tenant credit assessment

## Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Chainlink CRE early access (apply at https://chain.link/cre)

### Installation

```bash
cd cre-workflow
npm install
```

### Configuration

Create `.env` file:

```env
# Ethereum Sepolia
SEPOLIA_RPC_URL=https://rpc.sepolia.org
PRIVATE_KEY=0x...

# Base Sepolia
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Contract Addresses (Base Sepolia)
PROPERTY_REGISTRY_ADDRESS=0x8f77c2BD2132727327B27164cDec4ccaA2083f7C
YIELD_DISTRIBUTOR_ADDRESS=0xd7c3c5e900Bd95653FA65b660a94625E1ddbBDA1

# Chainlink Price Feed (Base Sepolia)
ETH_USD_PRICE_FEED=0x4a5816300e0eE47A41DFcDB12A8C8bB6dD18C12

# Chainlink Functions
CHAINLINK_ROUTER=0xf9B8fc078197181C841c296C876945aaa425B278
CHAINLINK_SUBSCRIPTION_ID=6273

# Mock API (optional)
MOCK_API_URL=http://localhost:4010/api

# Confidential API (for secure payment data)
CONFIDENTIAL_API_URL=https://api.tenancy.internal
CONFIDENTIAL_API_KEY=your-api-key
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

Cron trigger:
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
- `POST /api/verify-payment` - Verify a payment

## Contract Integration

The workflow interacts with these contracts:

### YieldDistributor

```solidity
function depositYield(uint256 propertyId, uint256 amount) external;
function createDistribution(uint256 propertyId, uint256 totalYield, uint256[] holderBalances, address[] holders) external returns (uint256);
function startDistribution(uint256 distributionId) external;
function pauseDistribution(uint256 distributionId) external;
function getAgentDecision(uint256 propertyId) external view returns (AgentDecision memory);
```

### PropertyRegistry

```solidity
function getProperty(uint256 propertyId) external view returns (Property memory);
function getAllProperties() external view returns (Property[] memory);
```

## Demo Flow

1. **Issuer** creates property → gets PropertyToken
2. **Tenant** pays rent → payment recorded off-chain
3. **CRE Workflow** runs:
   - Fetches payment status
   - Verifies payment (Chainlink consensus)
   - Deposits yield to YieldDistributor
   - Distributes to token holders
4. **Investor** claims yield → receives TEN tokens

## Chainlink Price Feeds Integration

The workflow uses Chainlink Price Feeds for:
- Converting rent payments to USD
- Property valuation in USD
- Yield calculations in USD

**Price Feed Addresses:**
- ETH/USD (Sepolia): `0x694AA1769357215DE4FAC081bf1f309aDC325306`
- ETH/USD (Base Sepolia): `0x4a5816300e0eE47A41DFcDB12A8C8bB6dD18C12`

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
│   Calling: YieldDistributor.createDistribution()           │
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

## Additional Services

The cre-workflow includes:

1. **AI Service** (`ai-service.ts`): Property analysis and yield optimization
2. **Privacy Service** (`privacy-service.ts`): Data masking and confidential computation
3. **WorldID Service** (`worldid-service.ts`): Human verification for tenants
4. **Risk Service** (`risk-service.ts`): Credit risk assessment

## Support

- Documentation: https://docs.tenancy.protocol
- Discord: https://discord.gg/tenancy
- GitHub Issues: https://github.com/Moses-main/Tenancy/issues
