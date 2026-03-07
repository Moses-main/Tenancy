# TENANCY Protocol - Feature Test Plan

## Overview
This document tests all user-facing flows in the TENANCY Protocol DApp.
Network: Base Sepolia (Chain ID: 84532)

---

## Prerequisites

- [ ] MetaMask or compatible wallet installed
- [ ] Wallet funded with Base Sepolia ETH (for gas)
- [ ] USDC available on Base Sepolia: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- [ ] App running at `http://localhost:5175/`
- [ ] Connected to Base Sepolia testnet

---

## Flow 1: Wallet Connection

### 1.1 Connect wallet
- [ ] Click "Connect Wallet" in top nav
- [ ] Select MetaMask (or use email login via Privy)
- [ ] Approve connection in wallet popup
- **Expected**: Address shown in nav, ETH/USDC/TEN balances visible in dropdown
- **Status**: [ ] PASS / [ ] FAIL

### 1.2 Wrong network warning
- [ ] Switch wallet to Ethereum mainnet
- **Expected**: Warning shown asking to switch to Base Sepolia
- **Status**: [ ] PASS / [ ] FAIL

### 1.3 Switch to Base Sepolia
- [ ] Click "Switch Network" or switch manually in wallet
- **Expected**: Network switches, balances refresh, app becomes usable
- **Status**: [ ] PASS / [ ] FAIL

---

## Flow 2: Dashboard (Home Page)

### 2.1 Load dashboard stats
- [ ] Navigate to `/` (Dashboard)
- **Expected**: Stats cards show Total Value Locked, TEN Price, Average APY, Active Properties
- **Status**: [ ] PASS / [ ] FAIL

### 2.2 Yield history chart
- [ ] View yield history chart on dashboard
- **Expected**: Chart renders (may be empty if no distributions yet)
- **Status**: [ ] PASS / [ ] FAIL

### 2.3 Featured properties
- [ ] View featured properties section
- **Expected**: Lists active properties from on-chain (or empty state if none)
- **Status**: [ ] PASS / [ ] FAIL

---

## Flow 3: Issuer - Property Tokenization

### 3.1 Navigate to Issuer page
- [ ] Click "Issuer" in nav
- **Expected**: Form visible, "Your Active Streams" panel on right
- **Status**: [ ] PASS / [ ] FAIL

### 3.2 Standard property creation (no immediate listing)
- [ ] Fill out form:
  - Property Address: `123 Test St, New York, NY`
  - Token Name: `Test Property Token`
  - Token Symbol: `TPT`
  - Monthly Rent: `1000`
  - Initial Supply: `10000`
  - Duration: `12 Months`
  - Proof URL: `https://example.com/lease.pdf`
  - Leave "List immediately" unchecked
- [ ] Click "Tokenize Stream"
- [ ] Approve transaction in wallet
- **Expected**: Success toast with tx hash, property appears in "Your Active Streams"
- **Status**: [ ] PASS / [ ] FAIL

### 3.3 Property creation with immediate marketplace listing
- [ ] Fill out form with valid data
- [ ] Check "List property immediately on marketplace"
- [ ] Fill listing details:
  - Tokens to List: `5000`
  - Price per Token: `0.1` (USDC)
- [ ] Click "Tokenize & List Property"
- [ ] Approve transaction in wallet
- **Expected**: Success toast, property appears in "Your Active Streams", listing visible in Marketplace
- **Status**: [ ] PASS / [ ] FAIL

### 3.4 Form validation
- [ ] Try submitting with empty fields
- **Expected**: Toast error messages for each missing field
- [ ] Try with Proof URL not starting with http:// or ipfs://
- **Expected**: "Proof URL must start with http(s):// or ipfs://" error
- **Status**: [ ] PASS / [ ] FAIL

---

## Flow 4: Marketplace

### 4.1 Browse listings
- [ ] Navigate to `/marketplace`
- **Expected**: Active listings shown with token name, price, available amount
- **Status**: [ ] PASS / [ ] FAIL

### 4.2 Search and filter
- [ ] Use search bar to filter by property name
- [ ] Apply sort (Price, Amount, Date)
- **Expected**: Results filter/sort correctly
- **Status**: [ ] PASS / [ ] FAIL

### 4.3 Create a listing manually
- [ ] Click "Create Listing"
- [ ] Select a property token you own
- [ ] Enter amount and price per token
- [ ] Approve token allowance in wallet (first transaction)
- [ ] Confirm listing creation (second transaction)
- **Expected**: Listing appears in marketplace
- **Status**: [ ] PASS / [ ] FAIL

### 4.4 Buy a listing
- [ ] Find an active listing
- [ ] Click "Buy"
- [ ] Enter amount to purchase
- [ ] Approve USDC spending in wallet (if needed)
- [ ] Confirm buy transaction
- **Expected**: Tokens received, listing amount decreases
- **Status**: [ ] PASS / [ ] FAIL

### 4.5 Cancel a listing (as seller)
- [ ] Find your own listing
- [ ] Click "Cancel"
- [ ] Confirm transaction in wallet
- **Expected**: Listing marked inactive, tokens returned to wallet
- **Status**: [ ] PASS / [ ] FAIL

---

## Flow 5: Investor Portal

### 5.1 Browse properties
- [ ] Navigate to `/investor`
- **Expected**: Active properties listed with yield %, price, tokens available
- **Status**: [ ] PASS / [ ] FAIL

### 5.2 Buy property tokens via marketplace
- [ ] Select a property with an active listing
- [ ] Enter buy amount
- [ ] Click "Buy Tokens"
- [ ] Approve USDC (first tx if needed)
- [ ] Confirm purchase (second tx)
- **Expected**: Tokens received, balance updated
- **Status**: [ ] PASS / [ ] FAIL

### 5.3 View token holdings
- [ ] Check "My Holdings" section
- **Expected**: Shows property tokens held by current wallet
- **Status**: [ ] PASS / [ ] FAIL

### 5.4 View yield distributions
- [ ] Check "Yield Distributions" section
- **Expected**: Shows any claimable distributions (empty if none created yet)
- **Status**: [ ] PASS / [ ] FAIL

### 5.5 Claim yield
- [ ] If claimable distributions exist, click "Claim"
- [ ] Confirm transaction in wallet
- **Expected**: Yield claimed, TEN balance increases
- **Status**: [ ] PASS / [ ] FAIL

### 5.6 Settlement timeline
- [ ] View settlement receipts after buying
- **Expected**: Timeline shows pending → confirmed steps
- **Status**: [ ] PASS / [ ] FAIL

---

## Flow 6: Tenant Portal

### 6.1 View properties as leases
- [ ] Navigate to `/tenant`
- **Expected**: Shows any properties where wallet has token balance (or all properties)
- **Status**: [ ] PASS / [ ] FAIL

### 6.2 Pay rent
- [ ] Select a property lease
- [ ] Enter USDC amount
- [ ] Click "Pay Rent"
- [ ] Confirm USDC transfer in wallet
- **Expected**: Rent paid (USDC transferred to property owner), success toast
- **Status**: [ ] PASS / [ ] FAIL

### 6.3 MoonPay widget (USDC purchase)
- [ ] Click "Get USDC with MoonPay" button
- **Expected**: MoonPay widget opens for fiat-to-crypto purchase
- **Status**: [ ] PASS / [ ] FAIL

---

## Flow 7: Autonomous Agent

### 7.1 View agent dashboard
- [ ] Navigate to `/agent`
- **Expected**: Agent stats loaded (Last Run, Next Scheduled, Total Runs, Avg Confidence)
- **Status**: [ ] PASS / [ ] FAIL

### 7.2 Refresh agent data
- [ ] Click "Refresh Agent Data"
- **Expected**: Data refreshes from on-chain contracts, success toast
- **Status**: [ ] PASS / [ ] FAIL

### 7.3 View AI decisions table
- **Expected**: If decisions exist, shows Property, Action, Confidence, Timestamp
- **Status**: [ ] PASS / [ ] FAIL

### 7.4 System health indicator
- **Expected**: Reserve health status shown (green if healthy, red if below threshold)
- **Status**: [ ] PASS / [ ] FAIL

---

## Bugs Found and Fixed

### Fixed in this session

| Bug | Location | Fix |
|-----|----------|-----|
| `receipt.hash` undefined in ethers v5 | `useContracts.ts` - createProperty, claimYield, depositYield, claimAllYields, cancelMarketplaceListing, createMarketplaceListing, buyTokens, payRent, buyPropertyTokens, buyMarketplaceListing | Changed to `receipt.transactionHash \|\| receipt.hash \|\| tx.hash` |
| BigNumber `*` and `/` operators in buyMarketplaceListing | `useContracts.ts:770` | Changed to `.mul()` and `.div()` (ethers v5 BigNumber methods) |
| `balance < totalCost` comparison on BigNumber | `useContracts.ts` - buyPropertyTokens, buyMarketplaceListing | Changed to `.lt()` method |
| `balance > 0` on BigNumber in getLeases | `useContracts.ts:831` | Changed to `BigNumber.from(balance.toString()).gt(0)` |
| `chainId === null` race condition on write ops | `useContracts.ts:getContracts` | Added null guard that throws early |
| `chainId === null` race condition on read ops | `useContracts.ts` - getAllProperties, getMarketplaceListings, etc. | Added early return guards |

---

## Contract Addresses (Base Sepolia)

| Contract | Address |
|----------|---------|
| PropertyRegistry | `0x6d51cE756C9622A3399CBb7355321d4A326Ec09d` |
| TENToken | `0x214E4a7f581c3f09F6eAE495C5B32836996a41c6` |
| PropertyMarketplace | `0x1A7d33B33AeCFc22590ae3150D40C5A0F8e63048` |
| YieldDistributor | `0xBd9003d875267E7694B500091590C6eC2ddb5510` |
| MockPriceFeed | `0xdcd90ADe757a020B7bA917F0f943a01e3b042091` |
| USDC (Base Sepolia) | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
