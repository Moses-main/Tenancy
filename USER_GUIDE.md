# TENANCY Protocol - User Guide

## What is TENANCY Protocol?

TENANCY is a DeFi protocol on Base Sepolia that tokenizes real-world rental income. Property owners convert their rental streams into ERC-20 tokens, which investors can buy to earn proportional yield from monthly rent payments. An autonomous AI agent monitors properties and distributes yield automatically.

---

## Getting Started

### Step 1: Set Up Your Wallet

1. Install [MetaMask](https://metamask.io) or any EIP-1193-compatible wallet
2. Add Base Sepolia network to your wallet:
   - Network Name: Base Sepolia
   - RPC URL: `https://sepolia.base.org`
   - Chain ID: `84532`
   - Currency Symbol: ETH
   - Block Explorer: `https://sepolia.basescan.org`
3. Get testnet ETH from the [Base Sepolia faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
4. Get testnet USDC from the [Circle faucet](https://faucet.circle.com) (select Base Sepolia, token: USDC)
   - USDC contract: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

### Step 2: Connect to the App

1. Open the app at `http://localhost:5175/`
2. Click **"Connect Wallet"** in the top navigation bar
3. Select your wallet (MetaMask) or sign in with email via Privy
4. Approve the connection request in your wallet
5. Ensure you are on **Base Sepolia** - the app will warn you if not

---

## For Property Owners (Issuers)

### Tokenizing a Property

1. Navigate to the **Issuer** page from the top nav
2. Fill in the property form:
   - **Property Address**: Physical address of the property
   - **Token Name**: Name for the property token (e.g., "Main Street Rental Token")
   - **Token Symbol**: Short ticker (e.g., MSR) - max 10 chars
   - **Monthly Rent (USDC)**: Expected monthly rent amount
   - **Initial Token Supply**: Total tokens to mint (default: 10,000)
   - **Stream Duration**: Lease duration (6, 12, or 24 months)
   - **Proof URL**: Link to the off-chain lease agreement (http:// or ipfs://)

3. Choose a tokenization option:

   **Option A - Tokenize Only:**
   - Leave "List immediately" unchecked
   - Click **"Tokenize Stream"**
   - Approve the transaction in your wallet
   - All tokens are minted to your wallet; you can list them on the marketplace later

   **Option B - Tokenize & List Immediately (Gas-Efficient):**
   - Check "List property immediately on marketplace"
   - Enter **Tokens to List**: how many tokens to put on sale
   - Enter **Price per Token (USDC)**: price investors will pay per token
   - Click **"Tokenize & List Property"**
   - Approve the single combined transaction
   - Listing tokens go directly to the marketplace; remaining tokens go to your wallet
   - This saves ~25% gas vs doing both steps separately

4. After tokenization, your property appears in **"Your Active Streams"** on the right panel

### Monitoring Payments

The right panel shows **Payment Verification Monitor** with:
- **Verified** payments: Chainlink-confirmed rent receipts
- **Pending** payments: Awaiting verification
- **Failed** payments: Failed verification
- **Overdue Streams**: Properties with no verified rent in 35+ days

---

## For Investors

### Buying Property Tokens

1. Navigate to the **Investor** page
2. Browse available properties showing:
   - Estimated APY (based on annual rent / property value)
   - Price per token
   - Available token inventory
   - Monthly rent amount

3. Select a property and enter the number of tokens to buy
4. Click **"Buy Tokens"**
5. Two wallet transactions may be required:
   - First: Approve USDC spending allowance (if not already approved)
   - Second: Execute the token purchase
6. Tokens are transferred to your wallet

### Claiming Yield

When rental income is distributed:
1. Go to the **Investor** page
2. View the **Yield Distributions** section
3. If you have claimable distributions, click **"Claim"**
4. Approve the transaction in your wallet
5. TEN tokens are sent to your wallet as yield

### Viewing Your Holdings

The **My Holdings** section on the Investor page shows:
- All property tokens in your wallet
- Token name, symbol, and balance
- Associated property details

---

## For Tenants

### Paying Rent

1. Navigate to the **Tenant** page
2. Your active leases are shown (properties where you hold tokens)
3. Select a property and enter the USDC rent amount
4. Click **"Pay Rent"**
5. Approve the USDC transfer in your wallet
6. Rent is transferred directly to the property owner's wallet

### Getting USDC

If you need USDC to pay rent:
- Click **"Get USDC with MoonPay"** to purchase crypto with a credit/debit card
- Or use the [Circle Faucet](https://faucet.circle.com) for testnet USDC

---

## Marketplace (Secondary Market)

The marketplace lets anyone trade property tokens after initial issuance.

### Browsing Listings

1. Navigate to **Marketplace**
2. Browse active listings with:
   - Property token name and symbol
   - Amount available
   - Price per token
   - Total value
3. Use **Search** to filter by name
4. Use **Sort** to order by price, amount, or date

### Creating a Listing

If you own property tokens and want to sell them:
1. Click **"Create Listing"** on the Marketplace page
2. Select the property token to list
3. Enter the number of tokens to list
4. Enter your price per token (in USDC)
5. Two transactions:
   - Approve token transfer to marketplace
   - Create the listing
6. Your listing appears in the marketplace

### Buying from a Listing

1. Find the listing you want to buy
2. Click **"Buy"**
3. Enter how many tokens to purchase (up to the listed amount)
4. Two transactions (if needed):
   - Approve USDC spending
   - Buy the tokens
5. Tokens transferred to your wallet, USDC to seller

### Canceling Your Listing

1. Find your own listing in the marketplace
2. Click **"Cancel"**
3. Approve the transaction
4. Tokens are returned to your wallet

---

## Autonomous Agent Dashboard

The AI agent runs daily to:
- Check rent payment status via Chainlink oracles
- Analyze market data with AI/LLM
- Recommend actions (distribute yield, adjust rent, flag defaults)
- Execute on-chain decisions automatically

### Viewing Agent Activity

1. Navigate to **Agent** page
2. View stats:
   - **Last Run**: When the agent last executed
   - **Next Scheduled**: Next scheduled run (daily at 00:00 UTC)
   - **Total Runs**: How many times the agent has run
   - **Avg Confidence**: Average AI confidence score across decisions
3. **AI Decisions Table**: Shows all agent decisions with action type, reasoning, confidence %, and tx hash
4. **System Health**: Reserve status - green if healthy, red if below threshold

### Manual Refresh

Click **"Refresh Agent Data"** to fetch the latest on-chain data immediately.

---

## Key Contracts (Base Sepolia)

| Contract | Address |
|----------|---------|
| PropertyRegistry | `0x6d51cE756C9622A3399CBb7355321d4A326Ec09d` |
| TENToken | `0x214E4a7f581c3f09F6eAE495C5B32836996a41c6` |
| PropertyMarketplace | `0x1A7d33B33AeCFc22590ae3150D40C5A0F8e63048` |
| YieldDistributor | `0xBd9003d875267E7694B500091590C6eC2ddb5510` |
| USDC (Base Sepolia) | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |

View transactions on [Base Sepolia Explorer](https://sepolia.basescan.org).

---

## Troubleshooting

**"Please switch to Base Sepolia network"**
- Open MetaMask and switch to Base Sepolia (Chain ID: 84532)

**"Wallet not connected"**
- Click Connect Wallet and approve the connection

**"Network not detected yet. Please wait and try again."**
- The app is still loading chain info. Wait 2-3 seconds and retry.

**"Insufficient USDC balance"**
- Get testnet USDC from [faucet.circle.com](https://faucet.circle.com)

**"No active listing has enough tokens for this purchase"**
- The listed amount is less than what you're trying to buy. Reduce your purchase amount.

**Transaction rejected**
- Check you have enough ETH for gas fees (~0.001 ETH per transaction on Base Sepolia)

**Properties not showing**
- Ensure you are on Base Sepolia and wait for the page to load data from on-chain
