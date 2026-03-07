# 🔐 DEPLOYMENT CREDENTIALS GUIDE

## 📋 OVERVIEW

This guide shows you exactly what credentials you need and where to get them for deploying with **Tenderly** and **Thirdweb**.

---

## 🔧 TENDERLY CREDENTIALS

### 🎯 **What You Need:**

```env
# In contracts/.env
TENDERLY_ACCOUNT_ID=your_tenderly_account_id
TENDERLY_PROJECT_SLUG=your_project_name
TENDERLY_ACCESS_KEY=your_tenderly_api_key
```

### 📍 **Where to Get Them:**

#### **Step 1: Create Tenderly Account**
1. Go to: **https://dashboard.tenderly.co**
2. Click **"Sign Up"** or **"Sign In"**
3. Sign up with:
   - Email
   - GitHub
   - Google

#### **Step 2: Get Account ID**
1. After signing in, look at the URL in your browser
2. URL will be: `https://dashboard.tenderly.co/{ACCOUNT_ID}/{project}`
3. **Copy the `{ACCOUNT_ID}`** part

**Example:**
```
URL: https://dashboard.tenderly.co/abc123def456/my-project
ACCOUNT_ID: abc123def456
```

#### **Step 3: Create Project**
1. In Tenderly dashboard, click **"New Project"**
2. Enter project name: `tenancy` (or your preferred name)
3. Click **"Create Project"**
4. **Project Slug** = your project name (usually lowercase)

#### **Step 4: Get API Key**
1. Click your profile picture (top right)
2. Go to **"Settings"**
3. Click **"API Keys"** in the left menu
4. Click **"Create New API Key"**
5. Give it a name: `tenancy-deployment`
6. Click **"Create"**
7. **Copy the API Key** (starts with `acc_`)

### 🔧 **Update Your .env:**

```env
# Replace these placeholders with your actual values
TENDERLY_ACCOUNT_ID=abc123def456789
TENDERLY_PROJECT_SLUG=tenancy
TENDERLY_ACCESS_KEY=acc_1234567890abcdef1234567890abcdef
```

---

## 🚀 THIRDWEB CREDENTIALS

### 🎯 **What You Need:**

```env
# In contracts/.env
THIRDWEB_SECRET_KEY=your_thirdweb_secret_key
```

### 📍 **Where to Get Them:**

#### **Step 1: Create Thirdweb Account**
1. Go to: **https://thirdweb.com**
2. Click **"Sign In"** (top right)
3. Sign up with:
   - Email
   - GitHub
   - Google
   - Wallet (MetaMask, etc.)

#### **Step 2: Get Secret Key**
1. After signing in, go to **Settings** (click your avatar)
2. Click **"API Keys"** in the left menu
3. Click **"Create API Key"**
4. Select permissions:
   - ✅ **Deploy Contracts**
   - ✅ **Manage Contracts**
   - ✅ **Verify Contracts**
5. Click **"Create Key"**
6. **Copy the Secret Key** (starts with `sk_`)

### 🔧 **Update Your .env:**

```env
# Replace this placeholder with your actual value
THIRDWEB_SECRET_KEY=sk_1234567890abcdef1234567890abcdef12345678
```

---

## 📁 **FILE LOCATIONS TO UPDATE**

### 🎯 **For Tenderly:**

Update these files with your Tenderly credentials:

```bash
# 1. Main contracts environment
contracts/.env

# 2. Add to these variables:
TENDERLY_ACCOUNT_ID=your_account_id
TENDERLY_PROJECT_SLUG=tenancy
TENDERLY_ACCESS_KEY=your_api_key
```

### 🎯 **For Thirdweb:**

Update these files with your Thirdweb credentials:

```bash
# 1. Main contracts environment
contracts/.env

# 2. Add to this variable:
THIRDWEB_SECRET_KEY=your_secret_key
```

---

## 🚀 **DEPLOYMENT COMMANDS**

### 🔧 **Tenderly Deployment:**

```bash
# Make sure you're in the contracts directory
cd contracts

# Deploy to Tenderly Virtual TestNet
npm run deploy:tenderly

# Test on Virtual TestNet
npm run test:tenderly
```

### 🚀 **Thirdweb Deployment:**

```bash
# Make sure you're in the root directory
npm run deploy:thirdweb

# Deploy to specific network
NETWORK=base-sepolia npm run deploy:thirdweb
```

---

## ✅ **PRE-DEPLOYMENT CHECKLIST**

### 🔧 **Before Tenderly Deployment:**

- [ ] **TENDERLY_ACCOUNT_ID** set in `contracts/.env`
- [ ] **TENDERLY_PROJECT_SLUG** set in `contracts/.env`
- [ ] **TENDERLY_ACCESS_KEY** set in `contracts/.env`
- [ ] **PRIVATE_KEY** set in `contracts/.env`
- [ ] **NETWORK** set to `sepolia` or `base-sepolia`

### 🚀 **Before Thirdweb Deployment:**

- [ ] **THIRDWEB_SECRET_KEY** set in `contracts/.env`
- [ ] **PRIVATE_KEY** set in `contracts/.env`
- [ ] **NETWORK** set to `sepolia` or `base-sepolia`
- [ ] **RPC URLs** configured (Alchemy recommended)

---

## 🎯 **QUICK START EXAMPLES**

### 🔧 **Tenderly Example:**

```env
# contracts/.env
PRIVATE_KEY=0x1234567890abcdef...
TENDERLY_ACCOUNT_ID=abc123def456789
TENDERLY_PROJECT_SLUG=tenancy
TENDERLY_ACCESS_KEY=acc_1234567890abcdef...
NETWORK=base-sepolia
```

### 🚀 **Thirdweb Example:**

```env
# contracts/.env
PRIVATE_KEY=0x1234567890abcdef...
THIRDWEB_SECRET_KEY=sk_1234567890abcdef...
NETWORK=base-sepolia
BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/your-key
```

---

## 🆘 **TROUBLESHOOTING**

### 🔧 **Tenderly Issues:**

**Error: "Invalid API Key"**
- Check your API key starts with `acc_`
- Verify no extra spaces or quotes
- Ensure API key has correct permissions

**Error: "Account not found"**
- Verify ACCOUNT_ID from URL
- Check you're using the correct account

### 🚀 **Thirdweb Issues:**

**Error: "Invalid secret key"**
- Check your key starts with `sk_`
- Verify no extra spaces or quotes
- Ensure key has deployment permissions

**Error: "Insufficient funds"**
- Check your wallet has testnet ETH
- Verify correct network (Sepolia/Base Sepolia)

---

## 📞 **SUPPORT**

### 🔧 **Tenderly Support:**
- **Documentation**: https://docs.tenderly.co
- **Dashboard**: https://dashboard.tenderly.co
- **Help**: help@tenderly.co

### 🚀 **Thirdweb Support:**
- **Documentation**: https://portal.thirdweb.com
- **Dashboard**: https://thirdweb.com/dashboard
- **Discord**: https://discord.gg/thirdweb

---

## 🎯 **NEXT STEPS**

1. **Get Tenderly credentials** (5 minutes)
2. **Get Thirdweb credentials** (5 minutes)
3. **Update your .env files** (2 minutes)
4. **Test deployment** (2 minutes)
5. **Deploy contracts** (varies)

**Total setup time: ~15 minutes**

---

*Last Updated: March 7, 2026*
