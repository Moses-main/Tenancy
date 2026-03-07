# TENANCY Protocol Deployment Summary

## 📅 Deployment Date: March 7, 2026
## 🌐 Network: Base Sepolia (Testnet)
## 🔗 RPC: Alchemy (https://base-sepolia.g.alchemy.com/v2/igSo1TQOzun0wSumQjuIM)

---

## 🏗️ **DEPLOYED CONTRACTS**

### **Core Protocol Contracts**

| Contract | Address | Status | Notes |
|----------|----------|--------|-------|
| **TENToken** | `0xeb2923503953c5ed2772917771b850315d030f24` | ✅ Deployed | ERC20 governance token |
| **PropertyRegistry** | `0x050b06e0b310f14e7ca7fc7b16608c9ea619b9f0` | ✅ Deployed | Property management registry |
| **YieldDistributor** | `0xd62508ae079f713588c660b96f9509794a35a359` | ✅ Deployed | Yield distribution contract |
| **PriceFeedConsumer** | `0xeb2dadcee0b6226a1a4ae91b18490cf82eaf6b88` | ✅ Deployed | Chainlink price feed integration |
| **RentalToken** | `0x431487db3693fee0a8a20e5d9b0c1ee6a0783ba8` | ✅ Deployed | Rental property tokens |
| **PropertyMarketplace** | `0x9ea62e592307abce500429bf14fc738835f87aed` | ✅ Deployed | Property trading marketplace |

---

## 🔧 **DEPLOYMENT CONFIGURATION**

### **Constructor Parameters Used**
- **ETH/USD Price Feed**: `0x4a5816300e0eE47A41DFcDB12A8C8bB6dD18C12`
- **Inflation Index Feed**: `0x0000000000000000000000000000000000000001` (placeholder)
- **USDC Token**: `0x036CbD5f9F0F4D2544e2e8aa7F0D9A6eC8` (mock)

### **Deployment Settings**
- **Deployer**: `0xe81e8078f2D284C92D6d97B5d4769af81e0cA11C`
- **Gas Used**: 17,710,067
- **Gas Price**: 0.011 gwei
- **Total Cost**: ~0.0001948 ETH

---

## 📋 **ENVIRONMENT VARIABLES UPDATED**

### **Frontend (.env)**
```bash
# Base Sepolia Contracts (NEW)
VITE_PROPERTY_REGISTRY_BASE_SEPOLIA=0x050b06e0b310f14e7ca7fc7b16608c9ea619b9f0
VITE_TEN_TOKEN_BASE_SEPOLIA=0xeb2923503953c5ed2772917771b850315d030f24
VITE_YIELD_DISTRIBUTOR_BASE_SEPOLIA=0xd62508ae079f713588c660b96f9509794a35a359
VITE_PRICE_FEED_CONSUMER_BASE_SEPOLIA=0xeb2dadcee0b6226a1a4ae91b18490cf82eaf6b88
VITE_MARKETPLACE_BASE_SEPOLIA=0x9ea62e592307abce500429bf14fc738835f87aed
VITE_RENTAL_TOKEN_BASE_SEPOLIA=0x431487db3693fee0a8a20e5d9b0c1ee6a0783ba8

# Chainlink Feeds
CHAINLINK_ETH_USD_BASE_SEPOLIA=0x4a5816300e0eE47A41DFcDB12A8C8bB6dD18C12
```

### **Backend (server/.env)**
```bash
# Contract Addresses (NEW)
PROPERTY_REGISTRY_ADDRESS=0x050b06e0b310f14e7ca7fc7b16608c9ea619b9f0
YIELD_DISTRIBUTOR_ADDRESS=0xd62508ae079f713588c660b96f9509794a35a359
TEN_TOKEN_ADDRESS=0xeb2923503953c5ed2772917771b850315d030f24
```

---

## ✅ **VERIFICATION RESULTS**

### **Contract Function Tests**
- ✅ **YieldDistributor.distributionCount()**: Returns 0 (working)
- ⚠️ **PriceFeedConsumer.getEthUsdPrice()**: Reverting (Chainlink feed issue)
- ✅ **All contracts**: Bytecode confirmed deployed

### **ABI Compatibility**
- ✅ **PropertyRegistry**: Functions accessible
- ✅ **TENToken**: ERC20 functions working
- ✅ **YieldDistributor**: Core functions working
- ✅ **Marketplace**: Contract deployed
- ⚠️ **PriceFeedConsumer**: Needs Chainlink feed fix

---

## 🚀 **NEXT STEPS**

### **Immediate Actions**
1. **Test application startup** with new contract addresses
2. **Verify World ID integration** works properly
3. **Test property creation** and yield distribution

### **Known Issues**
1. **PriceFeedConsumer**: Chainlink feed address may need updating
2. **USDC Token**: Using mock address, needs real USDC on Base Sepolia

### **Future Improvements**
1. **Deploy to Mainnet** when ready
2. **Add more Chainlink price feeds** (property index, inflation)
3. **Implement governance mechanisms**

---

## 📞 **CONTACT & SUPPORT**

For any issues with the deployed contracts:
- **Network**: Base Sepolia Testnet
- **Explorer**: https://sepolia.basescan.org/
- **Deployer**: `0xe81e8078f2D284C92D6d97B5d4769af81e0cA11C`

---

## 🔒 **SECURITY NOTES**

- All contracts deployed with proper access controls
- Owner functions restricted to deployer address
- Emergency pause mechanisms in place
- Regular security audits recommended before mainnet deployment

---

*Last Updated: March 7, 2026*
