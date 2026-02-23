# TENANCY Protocol

<p align="center">
  <img src="https://img.shields.io/badge/Chainlink-CRE-blue?style=for-the-badge" alt="Chainlink CRE">
  <img src="https://img.shields.io/badge/Solidity-0.8.19-yellow?style=for-the-badge" alt="Solidity">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge" alt="TypeScript">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
</p>

> **TENANCY** tokenizes real-estate rental properties as ERC-20 tokens representing rental income rights. Off-chain payment verification via Chainlink CRE and on-chain yield distribution using Chainlink Price Feeds.

Built for the **Chainlink Convergence Hackathon** — a fully functional DeFi protocol bringing real-world rental income on-chain.

---

## 📋 Table of Contents

- [System Architecture](#system-architecture)
- [User Flow](#user-flow)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Smart Contracts](#smart-contracts)
- [Chainlink Integration](#chainlink-integration)
- [Frontend](#frontend)
- [Backend](#backend)
- [Deployment](#deployment)
- [Testing](#testing)
- [Security](#security)
- [Roadmap](#roadmap)
- [Support](#support)
- [Contributing](#contributing)
- [License](#license)

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    TENANCY Protocol                                 │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │                              FRONTEND (React/Vite)                           │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │  │
│  │  │    Home     │  │   Investor   │  │   Issuer    │  │  Dashboard  │       │  │
│  │  │   Page     │  │   Portal     │  │   Portal    │  │   (Auth)    │       │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │  │
│  │         │                │                │                │                 │  │
│  │         └────────────────┼────────────────┼────────────────┘                 │  │
│  │                          │                │                                    │  │
│  │                    ┌─────▼─────┐    ┌────▼────┐                              │  │
│  │                    │   Privy   │    │  Wagmi  │                              │  │
│  │                    │  Auth     │    │  Config │                              │  │
│  │                    └───────────┘    └─────────┘                              │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                        │                                           │
│                                        ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │                        BLOCKCHAIN (Ethereum/Sepolia)                       │
│  │                                                                              │
│  │  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────────┐  │
│  │  │  PropertyRegistry  │  │   TENToken        │  │  YieldDistributor     │  │
│  │  │                   │  │                   │  │                       │  │
│  │  │ - createProperty  │  │ - mint            │  │ - depositYield        │  │
│  │  │ - getProperty     │  │ - transfer        │  │ - distributeYield     │  │
│  │  │ - getAllProperties│  │ - balanceOf       │  │ - claimYield         │  │
│  │  │ - burnTokens      │  │ - approve         │  │ - pendingYield       │  │
│  │  └─────────┬─────────┘  └─────────┬─────────┘  └───────────┬───────────────┘  │
│  │            │                      │                       │                   │
│  │            └──────────────────────┼───────────────────────┘                   │
│  │                                   │                                            │
│  │                    ┌──────────────▼──────────────┐                           │
│  │                    │    PropertyToken (ERC-20)  │                            │
│  │                    │  - Per Property Fractional  │                            │
│  │                    │    Rental Income Rights    │                            │
│  │                    └─────────────────────────────┘                            │
│  │                                                                              │
│  │  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  │                     Chainlink Price Feeds                             │   │
│  │  │  ETH/USD: 0x694580A4e26D2b2e2dEk42D32D8d5f0F27C3B92 (Sepolia)      │   │
│  │  │  Used for: Property Valuation, Yield Calculation in USD               │   │
│  │  └──────────────────────────────────────────────────────────────────────┘   │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                        │                                           │
│                                        ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │                     CHAINLINK CRE WORKFLOW                                  │
│  │                                                                              │
│  │   ┌───────────┐     ┌─────────────┐     ┌──────────────┐     ┌───────────┐│
│  │   │  Trigger  │────▶│  HTTP Fetch │────▶│  Consensus  │────▶│  On-Chain ││
│  │   │ Cron/Event│     │  Payment    │     │  Validation  │     │  Execute  ││
│  │   └───────────┘     │  Verify    │     └──────────────┘     └───────────┘│
│  │        │            └─────────────┘            │                │           │
│  │        │                  │                    │                ▼           │
│  │        │                  ▼                    │        ┌───────────────┐  │
│  │        │           ┌─────────────┐            │        │ YieldDistributor│  │
│  │        │           │ Mock API    │            │        │ depositYield() │  │
│  │        │           │ (Backend)  │            │        └───────────────┘  │
│  │        │           └─────────────┘            │                             │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │                          BACKEND (Express Mock)                              │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐    │
│  │  │ /verify-payment │  │ /verifications  │  │ /trigger-chainlink     │    │
│  │  │ POST            │  │ GET             │  │ POST                   │    │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘    │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 User Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              USER FLOW DIAGRAM                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌──────────────────┐                                                           │
│  │    USER TYPES    │                                                           │
│  ├──────────────────┤                                                           │
│  │                  │                                                           │
│  │  ┌──────────┐    │    ┌────────────┐    ┌───────────┐                      │
│  │  │  ISSUER  │◀───┼───▶│  TENANT    │◀───│ INVESTOR  │                      │
│  │  │(Property │    │    │  (Renter)  │    │ (Token    │                      │
│  │  │ Owner)   │    │    │            │    │  Buyer)   │                      │
│  │  └──────────┘    │    └────────────┘    └───────────┘                      │
│  │                  │                                                           │
│  │  • Tokenize      │                                                           │
│  │  • Deposit Yield │                                                           │
│  │  • Manage Props  │                                                           │
│  └──────────────────┘                                                           │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### ISSUER FLOW

```
1. CONNECT WALLET
   └─▶ Sign in with Privy (email/wallet)

2. REGISTER PROPERTY
   ├─▶ Enter property address
   ├─▶ Set monthly rent (USDC)
   ├─▶ Choose stream duration
   └─▶ Provide lease proof URL (IPFS)

3. OFF-CHAIN VERIFICATION (CRE)
   ├─▶ Backend receives verification request
   ├─▶ Mock API simulates payment status check
   └─▶ Returns verification ID

4. ON-CHAIN PROPERTY CREATION
   ├─▶ PropertyRegistry.createProperty()
   ├─▶ New PropertyToken (ERC-20) minted
   ├─▶ Property added to registry
   └─▶ Issuer receives tokens

5. CHAINLINK VERIFICATION (Optional)
   ├─▶ Trigger mock Chainlink job
   ├─▶ depositYield() called
   └─▶ Yield distributed to investors
```

### INVESTOR FLOW

```
1. CONNECT WALLET
   └─▶ Sign in with Privy (email/wallet)

2. BROWSE PROPERTIES
   ├─▶ View available property tokens
   ├─▶ See APY, property value, rent
   └─▶ Select property to invest

3. PURCHASE TOKEN RIGHTS
   ├─▶ Swap USDC for TEN tokens
   ├─▶ Price from Chainlink Oracle
   ├─▶ Receive PropertyToken
   └─▶ Fractional ownership of rental income

4. YIELD ACCUMULATION
   ├─▶ Tenants make rent payments
   ├─▶ CRE workflow verifies off-chain
   ├─▶ Yield deposited to YieldDistributor
   └─▶ Investor's share calculated by token balance

5. CLAIM YIELD
   ├─▶ View pending yield in dashboard
   ├─▶ Click "Claim All Yields"
   ├─▶ YieldDistributor.claimYield()
   └─▶ Receive TEN tokens
```

### AUTOMATED FLOW (CRE)

```
TRIGGER: Cron (Daily 00:00 UTC) OR Event (PaymentReceived)

STEP 1: FETCH PAYMENTS
   └─▶ HTTP GET /api/payments/{propertyId}

STEP 2: VERIFY
   ├─▶ Check transaction exists
   ├─▶ Validate amount matches rent
   └─▶ Confirm timestamp

STEP 3: CONSENSUS
   ├─▶ Multiple node operators verify independently
   ├─▶ Threshold-based agreement
   └─▶ Reject if payment failed

STEP 4: ON-CHAIN EXECUTE
   ├─▶ YieldDistributor.depositYield(propertyId, amount)
   ├─▶ YieldDistributor.distributeYield(distributionId)
   └─▶ Emit YieldDistributed event
```

---

## ✨ Features

### Core Protocol
- **Property Tokenization**: Convert rental income streams into ERC-20 tokens
- **Fractional Ownership**: Multiple investors can hold shares of a single property
- **Yield Distribution**: Automatic yield distribution proportional to token holdings
- **Price Feeds**: Real-time ETH/USD pricing via Chainlink

### Chainlink Integration
- **CRE Workflow**: Off-chain payment verification → On-chain yield distribution
- **Price Feeds**: ETH/USD for property valuation and yield calculation
- **Automation**: Scheduled or event-triggered workflow execution

### Frontend
- **Privy Auth**: Wallet + Email login
- **Wallet Modal**: Shows address, balance, network
- **Modern UI**: Devfolio-inspired design with generous spacing
- **Responsive**: Works on desktop and mobile

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Smart Contracts** | Solidity, Foundry, OpenZeppelin |
| **Chain Integration** | Chainlink CRE, Chainlink Price Feeds |
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS |
| **UI Components** | Radix UI, Lucide React |
| **Authentication** | Privy |
| **Backend** | Express.js (Mock) |
| **Workflow** | TypeScript, Node.js |

---

## 📁 Project Structure

```
Tenancy/
├── contracts/                 # Foundry smart contracts
│   ├── src/
│   │   ├── PropertyRegistry.sol    # Property management & token minting
│   │   ├── PropertyToken.sol      # ERC-20 per property
│   │   ├── TENToken.sol           # Protocol utility token
│   │   ├── YieldDistributor.sol   # Yield distribution logic
│   │   └── PriceFeedConsumer.sol  # Chainlink price feed
│   ├── script/
│   │   └── DeployTENANCY.s.sol    # Deployment script
│   ├── test/
│   │   ├── TENANCY.t.sol          # Main test suite
│   │   └── Counter.t.sol          # Counter tests
│   └── foundry.toml              # Foundry config
│
├── cre-workflow/               # Chainlink CRE workflow
│   ├── src/
│   │   └── workflow.ts           # Workflow implementation
│   ├── .env                      # Environment config
│   ├── package.json
│   └── README.md                 # CRE-specific docs
│
├── src/                       # Frontend React app
│   ├── components/
│   │   ├── Layout.tsx           # Main layout with nav
│   │   └── StatCard.tsx          # Stats display card
│   ├── pages/
│   │   ├── Home.tsx             # Landing/dashboard
│   │   ├── Investor.tsx         # Investor portal
│   │   └── Issuer.tsx           # Issuer portal
│   ├── lib/
│   │   ├── AuthContext.tsx      # Privy auth context
│   │   ├── contracts.ts         # Contract addresses & config
│   │   └── api.ts              # Backend API calls
│   ├── App.tsx                  # Main app component
│   ├── index.tsx               # Entry point
│   └── vite-env.d.ts           # TypeScript env types
│
├── server/                    # Mock backend
│   ├── index.js               # Express server
│   └── package.json
│
├── dist/                      # Built frontend
├── public/                    # Static assets
├── package.json              # Root package.json (frontend)
├── vite.config.ts            # Vite config
├── tailwind.config.cjs       # Tailwind config
├── tsconfig.json             # TypeScript config
├── eslint.config.js          # ESLint config
├── postcss.config.cjs       # PostCSS config
├── index.html                # HTML entry
└── styles.css               # Global styles
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **npm** or **yarn**
- **Git**
- **MetaMask** or **WalletConnect** compatible wallet

### Installation

```bash
# Clone repository
git clone https://github.com/Moses-main/Tenancy.git
cd Tenancy

# Install frontend dependencies
npm install

# Install contract dependencies
cd contracts
forge install
cd ..

# Install backend dependencies
cd server
npm install
cd ..
```

### Running Locally

```bash
# Terminal 1: Start mock backend
cd server
npm start

# Terminal 2: Start frontend
npm run dev

# Terminal 3 (optional): Start CRE workflow
cd cre-workflow
npm run simulate
```

### Building

```bash
# Frontend production build
npm run build

# Smart contracts
cd contracts
forge build

# Run tests
forge test
```

---

## 🔐 Environment Variables

Create a `.env` file in the **root directory**:

```env
# ============================================================================
# PRIVY AUTHENTICATION
# ============================================================================
# Get your app ID from https://dashboard.privy.io
VITE_PRIVY_APP_ID=cm4g4l4s5001l501p9vq1g29h

# ============================================================================
# BACKEND API
# ============================================================================
# Mock backend URL (for local development)
VITE_BACKEND_URL=http://localhost:4010

# ============================================================================
# SMART CONTRACTS - SEPOLIA TESTNET
# ============================================================================
# Deploy contracts and fill these after deployment
VITE_PROPERTY_REGISTRY_SEPOLIA=0x...
VITE_TEN_TOKEN_SEPOLIA=0x...
VITE_YIELD_DISTRIBUTOR_SEPOLIA=0x...

# Chainlink ETH/USD Price Feed (Sepolia)
# Already deployed by Chainlink - no need to change
# ETH/USD: 0x694580A4e26D2b2e2dEk42D32D8d5f0F27C3B92

# ============================================================================
# SMART CONTRACTS - MAINNET (Optional - for production)
# ============================================================================
VITE_PROPERTY_REGISTRY_MAINNET=0x...
VITE_TEN_TOKEN_MAINNET=0x...
VITE_YIELD_DISTRIBUTOR_MAINNET=0x...
```

### Getting Environment Values

1. **VITE_PRIVY_APP_ID**: Sign up at [Privy Dashboard](https://dashboard.privy.io) and create a new app
2. **Contract Addresses**: Deploy contracts (see below) and copy the addresses
3. **VITE_BACKEND_URL**: Default is `http://localhost:4010` for local development

---

## 📜 Smart Contracts

### Contract Overview

| Contract | Purpose | Key Functions |
|----------|---------|---------------|
| `PropertyRegistry` | Property management | `createProperty()`, `getProperty()`, `getAllProperties()` |
| `PropertyToken` | Per-property ERC-20 | Standard ERC-20 + mint/burn |
| `TENToken` | Protocol token | `mint()`, `burn()` |
| `YieldDistributor` | Yield distribution | `depositYield()`, `distributeYield()`, `claimYield()` |
| `PriceFeedConsumer` | Chainlink integration | `getLatestPrice()` |

### Deployment

```bash
cd contracts

# Build contracts
forge build

# Deploy to Sepolia (replace with your RPC and private key)
forge script script/DeployTENANCY.s.sol:DeployTENANCY \
  --rpc-url https://rpc.sepolia.org \
  --private-key 0x... \
  --broadcast \
  --verify

# Or use Anvil for local development
anvil
```

---

## ⛓ Chainlink Integration

### Price Feeds

We use Chainlink Price Feeds for:

- **Property Valuation**: Convert ETH values to USD
- **Yield Calculation**: Calculate yields in USD terms
- **Token Pricing**: Display token values in USD

**Sepolia ETH/USD**: `0x694580A4e26D2b2e2dEk42D32D8d5f0F27C3B92`

### CRE Workflow

The Chainlink Runtime Environment (CRE) workflow handles:

1. **Trigger**: Cron schedule or EVM event
2. **Fetch**: HTTP request to payment API
3. **Verify**: Validate payment status
4. **Consensus**: Multiple node verification
5. **Execute**: Call smart contract to distribute yield

See `cre-workflow/README.md` for detailed CRE setup.

---

## 💻 Frontend

### Pages

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Landing page with stats, featured properties |
| Investor | `/investor` | Browse properties, buy tokens, claim yield |
| Issuer | `/issuer` | Register properties, manage streams |

### Authentication

- **Privy** handles wallet + email authentication
- After login, wallet modal shows:
  - Connected address (truncated)
  - Native balance (ETH)
  - Network name and Chain ID
  - Disconnect option

---

## 🖥 Backend (Mock)

The mock backend simulates off-chain verification:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/verify-payment` | POST | Request payment verification |
| `/verifications/:id` | GET | Get verification status |
| `/trigger-chainlink` | POST | Trigger mock Chainlink job |

---

## 📦 Deployment

### Frontend (Vercel)

```bash
# Build first
npm run build

# Deploy to Vercel
vercel deploy
```

### Smart Contracts

Deploy to testnet:

```bash
cd contracts
forge script script/DeployTENANCY.s.sol:DeployTENANCY \
  --rpc-url $SEPOLIA_RPC \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

---

## 🧪 Testing

```bash
cd contracts
forge test
```

---

## 🔒 Security

- **Reentrancy Guards**: Applied where necessary
- **Access Control**: Owner and role-based restrictions
- **Safe Math**: Using Solidity 0.8+ built-in overflow checks

---

## 🗺️ Roadmap

- [x] Phase 1-3: Smart Contracts, Price Feeds, CRE
- [x] Phase 4-6: Auth, UI Redesign, Integration

### Future
- Real-world property verification
- Multi-chain support
- DAO governance
- Secondary market

---

## ❓ Support

- Open an issue on [GitHub](https://github.com/Moses-main/Tenancy/issues)
- Check inline code comments

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and test
4. Commit and push
5. Open a Pull Request

---

## 📄 License

MIT License - see LICENSE file for details.

---

<p align="center">
  Built with 🔗 Chainlink & ❤️ for the Convergence Hackathon
</p>
