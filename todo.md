# TENANCY DApp - Issues & Todo List

## 🚨 **Critical Issues**

### 1. **Property Creation & Ownership Bug**
**Issue**: Properties are created with `owner: 0x0000000000000000000000000000000000000001` (zero address) instead of the actual creator
**Impact**: Properties appear as inactive and cannot be managed by issuers
**Root Cause**: PropertyRegistry contract not properly setting `msg.sender` as owner
**Priority**: HIGH
**Files**: 
- `contracts/src/PropertyRegistry.sol` (line 246)
- `src/lib/useContracts.ts` (createProperty functions)

### 2. **Marketplace Integration Broken**
**Issue**: `createAndListProperty` function fails with "Failed to create listing" error
**Impact**: Cannot tokenize and list properties in single transaction
**Root Cause**: Marketplace contract integration issues
**Priority**: HIGH
**Files**:
- `contracts/src/PropertyRegistry.sol` (createAndListProperty function)
- `src/lib/useContracts.ts` (createAndListProperty function)

### 3. **USDC Token Configuration**
**Issue**: Using WETH as payment token instead of USDC on Base Sepolia
**Impact**: Confusing user experience, wrong token economics
**Priority**: MEDIUM
**Files**:
- `src/lib/useContracts.ts` (USDC_ADDRESSES)
- `contracts/script/DeployTENANCY.s.sol`

## 🔄 **Application Flow Issues**

### 4. **Property Display Filter**
**Issue**: Frontend shows properties with zero address owners
**Impact**: Empty property listings on Investor page
**Priority**: MEDIUM
**Files**:
- `src/pages/Investor.tsx` (line 73-93)
- `src/pages/Issuer.tsx` (line 67-77)

### 5. **Marketplace Listings Not Loading**
**Issue**: `getMarketplaceListings()` returns empty array
**Impact**: No properties available for purchase
**Priority**: HIGH
**Files**:
- `src/lib/useContracts.ts` (getMarketplaceListings function)
- `src/lib/contracts.ts` (marketplace ABI)

### 6. **Token Purchase Flow Broken**
**Issue**: `buyPropertyTokens` function uses incorrect USDC addresses
**Impact**: Cannot buy property tokens
**Priority**: HIGH
**Files**:
- `src/lib/useContracts.ts` (buyPropertyTokens function)

## 📊 **Data & State Issues**

### 7. **Yield Distribution Not Working**
**Issue**: Yield calculations and distributions failing
**Impact**: Investors cannot earn returns
**Priority**: MEDIUM
**Files**:
- `src/lib/useContracts.ts` (getYieldStats, getUserDistributions)
- `contracts/src/YieldDistributor.sol`

### 8. **Property Token Balances**
**Issue**: `getUserPropertyTokens` filtering by owner instead of token holders
**Impact**: Users cannot see their property token holdings
**Priority**: MEDIUM
**Files**:
- `src/lib/useContracts.ts` (getUserPropertyTokens function)

## 🔧 **Technical Debt**

### 9. **Mock Price Feed Dependency**
**Issue**: Using MockPriceFeed instead of real Chainlink price feed
**Impact**: Price calculations are fake
**Priority**: LOW
**Files**:
- `contracts/src/MockPriceFeed.sol`
- `contracts/script/DeployTENANCY.s.sol`

### 10. **Contract Address Management**
**Issue**: Hardcoded contract addresses in multiple places
**Impact**: Difficult to update deployments
**Priority**: LOW
**Files**:
- `src/lib/contracts.ts`
- `.env`
- Various component files

## 🎯 **User Experience Issues**

### 11. **Loading States & Error Handling**
**Issue**: Poor loading states and generic error messages
**Impact**: Bad user experience
**Priority**: MEDIUM
**Files**:
- `src/pages/Investor.tsx`
- `src/pages/Issuer.tsx`

### 12. **Form Validation**
**Issue**: Insufficient validation on property creation form
**Impact**: Users can submit invalid data
**Priority**: LOW
**Files**:
- `src/pages/Issuer.tsx`
- `src/lib/validation.ts`

## 📋 **Implementation Plan**

### Phase 1: Core Functionality (Week 1)
1. ✅ Fix PropertyRegistry owner assignment bug
2. ✅ Fix marketplace integration 
3. ✅ Deploy correct USDC token configuration
4. ✅ Fix property display filtering

### Phase 2: User Experience (Week 2)
5. ✅ Fix marketplace listings loading
6. ✅ Fix token purchase flow
7. ✅ Improve error handling and loading states
8. ✅ Add proper form validation

### Phase 3: Advanced Features (Week 3)
9. ✅ Fix yield distribution system
10. ✅ Fix user property token holdings
11. ✅ Replace mock price feed with real Chainlink
12. ✅ Improve contract address management

## 🧪 **Testing Checklist**

- [ ] Property creation with correct owner
- [ ] Property listing on marketplace
- [ ] Token purchase with USDC
- [ ] Yield distribution claiming
- [ ] Property token balance display
- [ ] Marketplace listings display
- [ ] Error handling edge cases
- [ ] Loading states
- [ ] Form validation
- [ ] Cross-browser compatibility

## 🔍 **Debugging Notes**

### Current Contract Addresses (Base Sepolia):
- PropertyRegistry: `0xCd5E04B88789bd2772AbFf6e9642B08A074a8326`
- TENToken: `0xF6fb74324aeD3215bB4580De3e8B98a240E619A8`
- PropertyMarketplace: `0x262Ff5Ea35B98f8d2EB790b2d0Ea9F029CB8D202`
- YieldDistributor: `0x14E4422344B330dA56f7EE26936A5A136D800D19`
- MockPriceFeed: `0xC7f2Cf4845C6db0e1a1e91ED41Bcd0FcC1b0E141`

### Known Issues:
- Properties created with zero address owner
- Marketplace listings not appearing
- USDC configuration incorrect
- Yield distribution not functioning

### Next Steps:
1. Fix PropertyRegistry contract owner assignment
2. Test property creation flow
3. Fix marketplace integration
4. Test end-to-end user flows
