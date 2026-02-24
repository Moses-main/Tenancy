# TENANCY Protocol - User Guide

A complete guide to using the TENANCY protocol for tokenizing real estate rental income and earning verified yields.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Connecting Your Wallet](#connecting-your-wallet)
3. [Switching to Base Sepolia](#switching-to-base-sepolia)
4. [Getting Testnet ETH](#getting-testnet-eth)
5. [For Property Issuers](#for-property-issuers)
6. [For Investors](#for-investors)
7. [Using the Marketplace](#using-the-marketplace)
8. [Understanding Yield Distribution](#understanding-yield-distribution)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before using TENANCY, ensure you have:

- **MetaMask** or another Web3 wallet installed
- **Wallet connected to Base Sepolia testnet**
- **Testnet ETH** in your wallet (for gas fees)

---

## Connecting Your Wallet

### Step 1: Visit the Application

Navigate to your deployed TENANCY application.

### Step 2: Click "Connect Wallet"

Click the "Connect Wallet" button in the top-right corner of the header.

### Step 3: Choose Authentication Method

TENANCY supports two authentication methods:

1. **Email** - Enter your email address and verify with a code
2. **Wallet** - Connect directly via MetaMask or another wallet

### Step 4: Authorize the Connection

If using email, check your inbox for a verification code and enter it.

If using wallet, approve the connection request in your wallet.

---

## Switching to Base Sepolia

TENANCY is deployed on **Base Sepolia testnet**. If you're on a different network:

### Method 1: Automatic Prompt

After connecting, if you're on the wrong network, you'll see a prompt to switch to Base Sepolia.

### Method 2: Manual Switch

1. Open MetaMask
2. Click the network dropdown (top right)
3. Select "Base Sepolia"
4. If not visible, click "Add Network" and search for Base Sepolia

### Network Details

| Setting | Value |
|---------|-------|
| Network Name | Base Sepolia |
| RPC URL | `https://sepolia.base.org` |
| Chain ID | 84532 |
| Currency Symbol | ETH |
| Block Explorer | `https://sepolia.basescan.org` |

---

## Getting Testnet ETH

You need testnet ETH for gas fees. Get free testnet ETH:

### Method 1: Base Sepolia Faucet

1. Visit the [Base Sepolia Faucet](https://www.alchemy.com/faucets/base-sepolia)
2. Connect your wallet
3. Request testnet ETH

### Method 2: Bridge from Sepolia

1. Get Sepolia ETH from [Sepolia Faucet](https://faucet.sepolia.io)
2. Bridge to Base Sepolia using [Base Bridge](https://bridge.base.org)

---

## For Property Issuers

Property issuers tokenize their rental income streams to raise capital and enable fractional ownership.

### Step 1: Navigate to Issuer Portal

Click **"Issuer"** in the navigation menu.

### Step 2: Fill Property Details

Complete the registration form:

- **Property Address** - Physical address of the property
- **Expected Monthly Rent (USDC)** - Monthly rental income
- **Stream Duration** - How long the rental stream lasts (6, 12, or 24 months)
- **Off-Chain Proof URL** - Link to lease agreement (IPFS recommended)

### Step 3: Submit for Verification

Click **"Tokenize Stream"** to submit your property.

The system will:
1. Record your property details
2. Create a new ERC-20 token for your property
3. Mint tokens to your wallet

### Step 4: Manage Your Properties

View your active streams in the "Your Active Streams" section. You can:

- Monitor property status
- Track rental payments
- Deposit yield for distribution to investors

---

## For Investors

Investors purchase property tokens to earn fractional rental income.

### Step 1: Navigate to Investor Portal

Click **"Investor"** in the navigation menu.

### Step 2: Browse Properties

View available properties with details:

- **APY** - Annual yield percentage
- **Property Value** - Total tokenized value
- **Rent** - Monthly rental income
- **Available Tokens** - Tokens for sale

### Step 3: Purchase Tokens

1. Click **"Buy Income Rights"** on a property
2. Enter the amount of tokens you want to buy
3. Review the transaction details
4. Confirm the purchase in your wallet

### Step 4: Claim Yields

Your purchased tokens earn proportional rental income. To claim:

1. Go to the Investor Portal
2. View your "Unclaimed Yield" balance
3. Click **"Claim All Yields"**
4. Confirm the transaction

---

## Using the Marketplace

The secondary marketplace allows you to buy and sell property tokens from other investors.

### Accessing the Marketplace

Click **"Marketplace"** in the navigation menu.

### Buying Tokens

1. Browse active listings
2. Use search and filters to find properties
3. Click **"Buy Now"** on a listing
4. Confirm the purchase

### Selling Your Tokens

1. Click **"Create Listing"**
2. Select which property tokens to sell
3. Set your asking price per token
4. Publish the listing

---

## Understanding Yield Distribution

### How It Works

1. **Tenant Pays Rent** - Tenant makes monthly payment to property owner
2. **Off-Chain Verification** - Chainlink CRE verifies the payment
3. **Yield Deposited** - Verified payments are deposited to YieldDistributor
4. **Distribution** - Yield is distributed proportionally to token holders
5. **Claim** - Investors claim their accumulated yield

### Yield Calculation

Your yield is proportional to your token holdings:

```
Your Yield = (Your Tokens ÷ Total Supply) × Total Rent Paid
```

### Example

If a property has:
- 1,000,000 total tokens
- You own 10,000 tokens (1%)
- Monthly rent is $1,000

You earn: 1% × $1,000 = $10/month

---

## Troubleshooting

### "Please switch to Base Sepolia"

Make sure your wallet is connected to Base Sepolia network. See [Switching to Base Sepolia](#switching-to-base-sepolia).

### Transaction Failed

1. Check you have enough ETH for gas
2. Verify you're on Base Sepolia
3. Try increasing gas limit in MetaMask

### Can't See Properties

Properties may take a moment to load. Try:
- Refreshing the page
- Ensuring you're connected to Base Sepolia

### Wallet Not Connecting

1. Clear browser cache
2. Ensure MetaMask is unlocked
3. Try using Incognito mode

---

## Contract Addresses

| Contract | Address | Explorer |
|----------|---------|----------|
| TENToken | `0x4e9A9676b3E24E406a42710A06120561D5A9A045` | [View](https://sepolia.basescan.org/address/0x4e9A9676b3E24E406a42710A06120561D5A9A045) |
| PropertyRegistry | `0x00185866B2eb4dEB6000e82840E436CCE375BcF2` | [View](https://sepolia.basescan.org/address/0x00185866B2eb4dEB6000e82840E436CCE375BcF2) |
| YieldDistributor | `0xd42992B93a9cD29D6d7Bfb6e1e84bc83C97F3302` | [View](https://sepolia.basescan.org/address/0xd42992B93a9cD29D6d7Bfb6e1e84bc83C97F3302) |

---

## Security Notes

- Always verify contract addresses before interacting
- Never share your private keys
- Double-check transactions before confirming
- This is a testnet deployment - no real funds involved

---

## Support

For issues or questions:
- Open an issue on [GitHub](https://github.com/Moses-main/Tenancy)
- Check the [README](README.md) for technical details

---

*TENANCY - Tokenizing Real Estate Rental Income*
