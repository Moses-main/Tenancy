# TENANCY Protocol - Complete Testing Guide

## Overview

TENANCY Protocol is a Web3 dApp that tokenizes rental income streams. The application has 4 main user roles:

1. **Issuer** - Property owners who tokenize their rental streams
2. **Investor** - Users who buy income rights (TEN tokens)
3. **Tenant** - Renters who make USDC payments
4. **Agent** - AI agent that manages and distributes yield

---

## Prerequisites

### Required Tools

| Tool | Purpose | Where to Get |
|------|---------|--------------|
| **Node.js 18+** | Runtime for the app | [nodejs.org](https://nodejs.org) |
| **npm** | Package manager | Comes with Node.js |
| **MetaMask Wallet** | Blockchain wallet | [metamask.io](https://metamask.io) |
| **Worldcoin Wallet** | For World ID verification | [worldcoin.org](https://worldcoin.org) |
| **Base Sepolia Testnet** | Test blockchain network | Add via MetaMask |
| **Sepolia Testnet** | Alternative test network | Add via MetaMath |

### Network Setup

1. **Install MetaMask** browser extension
2. **Add Base Sepolia Testnet**:
   - Network Name: `Base Sepolia`
   - Chain ID: `84532`
   - RPC URL: `https://sepolia.base.org`
   - Block Explorer: `https://sepolia.basescan.org`
   - Currency Symbol: `ETH`

3. **Add Sepolia Testnet** (alternative):
   - Network Name: `Sepolia`
   - Chain ID: `11155111`
   - RPC URL: `https://rpc.sepolia.org`
   - Block Explorer: `https://sepolia.etherscan.io`
   - Currency Symbol: `ETH`

### Get Testnet Funds

1. Go to [faucet.metamask.io](https://faucet.metamask.io)
2. Connect your MetaMask wallet
3. Request Base Sepolia ETH (or Sepolia ETH)

---

## Running the Application

### Step 1: Install Dependencies

```bash
cd tenancy
npm install
```

### Step 2: Start Development Server

```bash
npm run dev
```

The app will start at `http://localhost:5173`

### Step 3: Connect Wallet

1. Click the "Connect Wallet" button in the top-right
2. Select MetaMask or Privy embedded wallet
3. Approve the connection in your wallet

### Step 4: Switch to Testnet

The app requires **Base Sepolia** network:
1. Click the network indicator in the header
2. Select "Base Sepolia"
3. Approve the network switch in MetaMask

---

## Testing Each Role

---

## 🏢 ROLE 1: ISSUER (Property Owner)

**Purpose**: Tokenize rental properties to create income streams

### Workflow:

1. **Navigate to Issuer Page**
   - Click "Issuer" in the navigation sidebar

2. **Tokenize a Property**
   - Fill in the form:
     - **Property Address**: Enter a property description (e.g., "123 Main St, NYC")
     - **Monthly Rent**: Enter rent amount in USDC (e.g., 2500)
     - **Duration**: Select lease duration in months (e.g., 12)
     - **Proof URL**: Enter IPFS URL or any proof document link
   - Click "Tokenize Property"
   - Confirm transaction in MetaMask
   - Wait for transaction to confirm

3. **View Your Properties**
   - After tokenization, your property appears in "Your Active Streams"
   - Shows: Property ID, Rent amount, Token supply, Active status

### What Happens on Blockchain:
- Creates a new property in `PropertyRegistry` contract
- Mints TEN tokens representing the rental income stream
- Sets up the property for tenant payments

---

## 💰 ROLE 2: INVESTOR (Buy Income Rights)

**Purpose**: Purchase tokenized income rights to earn yield

### Workflow:

1. **Navigate to Investor Page**
   - Click "Investor" in the navigation

2. **View Available Properties**
   - Browse properties with their APY calculations
   - Each shows: Property ID, Value, Token supply, Monthly rent

3. **Buy Property Tokens**
   - Click on a property card
   - Enter amount of TEN tokens to buy
   - Click "Buy Tokens"
   - Confirm transaction in MetaMask
   - Wait for confirmation

4. **Claim Yield** (requires World ID verification)
   - View your "Unclaimed Yield" in the stats
   - If yield > 0, you'll see a World ID verification prompt
   - Click "Verify with World ID"
   - Complete World ID verification
   - Once verified, click "Claim All Yields"
   - Confirm transaction in MetaMask
   - Yield is distributed to your wallet

### What Happens on Blockchain:
- Calls `buyPropertyTokens()` on the property token contract
- TEN tokens are transferred from the seller to buyer
- Yield is distributed via `YieldDistributor` contract

### World ID Verification:
- **Why**: Prevents sybil attacks (one person claiming multiple times)
- **How**: Uses wallet address as signal to verify uniqueness
- **Alternative**: In test mode, verification auto-passes after a few seconds

---

## 🏠 ROLE 3: TENANT (Pay Rent)

**Purpose**: Make USDC rent payments for tokenized properties

### Workflow:

1. **Navigate to Tenant Page**
   - Click "Tenant" in the navigation

2. **View Your Leases**
   - See all properties you're renting
   - Shows: Property address, Monthly rent, Due date, Payment status

3. **Pay Rent**
   - Click "Pay Rent" on a property
   - Enter payment amount (in USDC)
   - Click "Confirm Payment"
   - Confirm transaction in MetaMask
   - Wait for confirmation
   - See success toast

4. **Buy USDC (if needed)**
   - If you don't have USDC, click "Buy Crypto"
   - MoonPay widget opens
   - Enter amount to spend in USD
   - Complete card/bank verification
   - USDC is sent to your wallet

### What Happens on Blockchain:
- `payRent()` is called on the contract
- USDC is transferred from tenant to property owner
- Payment is recorded on-chain

### MoonPay Integration:
- **Purpose**: Buy USDC with fiat (card/bank)
- **Mode**: Test/Sandbox mode (uses test keys)
- **Currency**: USDC on Base Sepolia
- **Why**: Enables tenants without crypto to pay rent

---

## 🤖 ROLE 4: AGENT (AI Yield Manager)

**Purpose**: AI agent that manages yield distribution and property analysis

### Workflow:

1. **Navigate to Agent Page**
   - Click "Agent" in the navigation

2. **View Agent Status**
   - See: Last run time, Next scheduled run, Total runs
   - View yield pool statistics
   - See AI-generated decisions

3. **Trigger Manual Analysis**
   - Click "Run Agent Now"
   - Agent analyzes properties and makes decisions
   - Decisions include: distribute_yield, pause_yield, adjust_rent, flag_default

### What Happens:
- Agent reads property data from blockchain
- Analyzes rental payments and property performance
- Can trigger yield distributions to investors

---

## Common Issues & Solutions

### Issue: "Switch to Base Sepolia" Warning

**Cause**: App only works on Base Sepolia testnet

**Solution**:
1. Click the network selector in the header
2. Select "Base Sepolia"
3. Approve in MetaMask

### Issue: MoonPay Not Working

**Cause**: Using wrong API keys or network

**Solution**: Ensure you're using:
- Test API key: `pk_test_jzZI4W0vQ4DwFnHd8wvMBqhltaG8nA`
- Network: Base Sepolia
- Currency: USDC

### Issue: World ID Verification Fails

**Cause**: Wrong App ID or network

**Solution**:
- Ensure World ID App ID is correct in `.env`
- Use Worldcoin test app from developer.worldcoin.org

### Issue: Transactions Failing

**Cause**: Usually one of:
1. Insufficient ETH for gas
2. Insufficient USDC balance
3. Wrong network

**Solution**:
1. Get testnet ETH from faucet
2. Get testnet USDC (via MoonPay or ask in Discord)
3. Verify you're on Base Sepolia

### Issue: Blank Screen After Wallet Connect

**Cause**: Multiple issues - check console

**Solution**:
1. Open DevTools (F12)
2. Check Console tab for errors
3. Common fixes:
   - Clear browser cache
   - Restart dev server (`npm run dev`)
   - Disconnect and reconnect wallet

---

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_PRIVY_APP_ID` | Privy authentication | From dashboard.privy.io |
| `VITE_PROPERTY_REGISTRY_BASE_SEPOLIA` | Property contract | 0x8f77... |
| `VITE_YIELD_DISTRIBUTOR_BASE_SEPOLIA` | Yield contract | 0xd7c3... |
| `VITE_TEN_TOKEN_BASE_SEPOLIA` | TEN token contract | 0x539b... |
| `VITE_WORLD_ID_APP_ID` | World ID app | app_e49b... |
| `VITE_MOONPAY_PUBLISHABLE_KEY` | MoonPay test key | pk_test_... |

---

## Testing Checklist

- [ ] Connect wallet successfully
- [ ] Switch to Base Sepolia network
- [ ] **Issuer**: Create a new property
- [ ] **Issuer**: See property in "Active Streams"
- [ ] **Investor**: View available properties
- [ ] **Investor**: Buy property tokens
- [ ] **Investor**: Verify with World ID
- [ ] **Investor**: Claim yield
- [ ] **Tenant**: View leases
- [ ] **Tenant**: Pay rent (with USDC)
- [ ] **Tenant**: Use MoonPay to buy USDC
- [ ] **Agent**: View agent status
- [ ] **Agent**: Trigger manual analysis

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
├─────────────────────────────────────────────────────────────┤
│  Home  │  Issuer  │  Investor  │  Tenant  │  Agent        │
├─────────────────────────────────────────────────────────────┤
│                    useContracts.ts                          │
│         (All blockchain interactions)                       │
├─────────────────────────────────────────────────────────────┤
│                   AuthContext.tsx                            │
│              (Wallet & Network state)                       │
├─────────────────────────────────────────────────────────────┤
│   Privy    │   World ID   │   MoonPay   │   IPFS          │
└────────────┴──────────────┴─────────────┴────────────────┘

                        │ Blockchains │
                        ├─────────────┤
                        │ Base Sepolia│
                        │ Sepolia     │
                        └─────────────┘

Smart Contracts (on Base Sepolia):
- PropertyRegistry: Manages properties
- TENToken: Tokenized income rights
- YieldDistributor: Distributes yield to investors
- Marketplace: Secondary trading
```

---

## Need Help?

1. **Check console errors**: F12 → Console tab
2. **Check network**: Ensure Base Sepolia is selected
3. **Check wallet**: Ensure connected and has funds
4. **Restart**: `npm run dev` (Ctrl+C to stop, then restart)
