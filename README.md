# TENANCY Protocol

Tokenize real-estate rental properties as ERC-20 tokens representing rental income rights. Off-chain payment verification via Chainlink Runtime Environment (CRE) and on-chain yield distribution using Chainlink Price Feeds.

## Overview

TENANCY transforms real estate rental payments into tradeable ERC-20 tokens, enabling:

- **Property Tokenization**: Issue ERC-20 tokens representing fractional ownership of rental income streams
- **Off-Chain Verification**: Chainlink CRE workflow fetches/verifies rent payment status
- **On-Chain Yield**: Verified payments trigger yield distribution to token holders
- **Price Feeds**: Chainlink ETH/USD price feed for property valuation

## Tech Stack

- **Smart Contracts**: Foundry (Solidity)
- **Frontend**: Next.js/React + Vite + Tailwind CSS + Radix UI
- **Authentication**: Privy (wallet + email login)
- **Chainlink**: CRE (Rental Verification Workflow) + Price Feeds
- **Backend**: Express.js mock server (off-chain verification simulation)

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/Moses-main/Tenancy.git
cd Tenancy

# Install frontend dependencies
npm install

# Install contract dependencies
cd contracts
forge install
cd ..
```

### 2. Smart Contracts (Foundry)

```bash
cd contracts

# Build contracts
forge build

# Run tests
forge test

# Deploy to Sepolia
forge script script/DeployTENANCY.s.sol:DeployTENANCY --rpc-url $SEPOLIA_RPC --private-key $PRIVATE_KEY --broadcast --verify
```

### 3. Frontend

```bash
# Development server
npm run dev

# Production build
npm run build
```

### 4. Backend (Mock)

```bash
cd server
npm install
npm start
```

## Environment Variables

### Frontend (.env)

```env
VITE_PRIVY_APP_ID=your_privile_app_id
VITE_BACKEND_URL=http://localhost:4010
VITE_PROPERTY_REGISTRY_SEPOLIA=0x...
VITE_TEN_TOKEN_SEPOLIA=0x...
VITE_YIELD_DISTRIBUTOR_SEPOLIA=0x...
```

## Chainlink CRE Workflow

The CRE workflow (`cre-workflow/`) handles off-chain rental payment verification:

1. **Trigger**: Cron schedule or EVM event
2. **Fetch**: HTTP request to mock payment API
3. **Verify**: Validate payment status
4. **Consensus**: Multiple node agreement
5. **Execute**: Call smart contract to distribute yield

### Running the CRE Workflow Locally

```bash
cd cre-workflow
npm install
# See cre-workflow/README.md for detailed steps
```

## Project Structure

```
Tenancy/
├── contracts/           # Foundry smart contracts
│   ├── src/
│   │   ├── PropertyRegistry.sol
│   │   ├── PropertyToken.sol
│   │   ├── TENToken.sol
│   │   ├── YieldDistributor.sol
│   │   └── PriceFeedConsumer.sol
│   └── test/
├── cre-workflow/        # Chainlink CRE workflow (TypeScript)
├── src/
│   ├── components/     # React components
│   ├── pages/          # Page components
│   └── lib/            # Utilities (api, contracts, auth)
├── server/             # Mock backend
└── dist/               # Built frontend
```

## Smart Contract Architecture

1. **PropertyRegistry**: Manages property creation and token minting
2. **PropertyToken**: ERC-20 token per property (fractional rental rights)
3. **TENToken**: Protocol token for yield distribution
4. **YieldDistributor**: Distributes yield to property token holders
5. **PriceFeedConsumer**: Chainlink ETH/USD price feed integration

## Hackathon Submission

### Demo Steps

1. **Property Creation**: Issuer submits rental stream via Issuer Portal
2. **Off-Chain Verification**: CRE workflow verifies payment status
3. **Yield Distribution**: Verified payments trigger on-chain yield
4. **Token Purchase**: Investor acquires property tokens
5. **Yield Claim**: Investor claims proportional yield

### Testnet Links

- [Sepolia Etherscan](https://sepolia.etherscan.io/)
- [Chainlink Documentation](https://docs.chain.link/cre)

## License

MIT
