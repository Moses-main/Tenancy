const { ethers } = require('ethers');

const PRIVATE_KEY = '0xcb601f9647fa12dea8081b5bfed574f40f4f41996401ea5901bcb314392e90e9';
const RPC_URL = 'https://base-sepolia.g.alchemy.com/v2/igSo1TQOzun0wSumQjuIM';

const PROPERTY_REGISTRY = '0x6d51cE756C9622A3399CBb7355321d4A326Ec09d';
const TEN_TOKEN = '0x214E4a7f581c3f09F6eAE495C5B32836996a41c6';
const YIELD_DISTRIBUTOR = '0xBd9003d875267E7694B500091590C6eC2ddb5510';
const MARKETPLACE = '0x1A7d33B33AeCFc22590ae3150D40C5A0F8e63048';
const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const propertyRegistryABI = [
  "function createProperty(string uri, uint256 rentAmount, uint256 rentFrequency, uint256 initialSupply, string tokenName, string tokenSymbol, uint256 valuationUsd) returns (address)",
  "function createAndListProperty(string uri, uint256 rentAmount, uint256 rentFrequency, uint256 initialSupply, string tokenName, string tokenSymbol, uint256 valuationUsd, uint256 listingAmount, uint256 pricePerToken) returns (address propertyToken, uint256 listingId)",
  "function getProperty(uint256 propertyId) view returns (tuple(uint256 id, string uri, uint256 rentAmount, uint256 rentFrequency, uint256 totalSupply, address propertyToken, bool isActive, bool isPaused, address owner, uint256 valuationUsd, uint256 lastValuationTimestamp, uint256 paymentStatus, uint256 daysOverdue))",
  "function getAllProperties() view returns (tuple(uint256 id, string uri, uint256 rentAmount, uint256 rentFrequency, uint256 totalSupply, address propertyToken, bool isActive, bool isPaused, address owner, uint256 valuationUsd, uint256 lastValuationTimestamp, uint256 paymentStatus, uint256 daysOverdue)[])",
];

const erc20ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

const marketplaceABI = [
  "function createListing(address propertyToken, uint256 amount, uint256 pricePerToken) returns (uint256)",
  "function buyListing(uint256 listingId, uint256 amountToBuy)",
  "function getActiveListings() view returns (tuple(uint256 id, address seller, address propertyToken, uint256 amount, uint256 pricePerToken, uint256 totalPrice, bool isActive, uint256 createdAt)[])",
  "function getListings() view returns (tuple(uint256 id, address seller, address propertyToken, uint256 amount, uint256 pricePerToken, uint256 totalPrice, bool isActive, uint256 createdAt)[])",
  "function cancelListing(uint256 listingId)",
];

const yieldDistributorABI = [
  "function depositYield(uint256 propertyId, uint256 amount)",
  "function totalYieldPool() view returns (uint256)",
  "function getClaimableDistributionIds(address holder) view returns (uint256[])",
  "function claimYield(uint256 distributionId)",
  "function distributionCount() view returns (uint256)",
];

async function main() {
  console.log('='.repeat(60));
  console.log('TENANCY Protocol - Full Flow Test');
  console.log('='.repeat(60));
  console.log(`\nWallet: ${wallet.address}`);
  
  // Check balances
  const ethBalance = await provider.getBalance(wallet.address);
  console.log(`\nETH Balance: ${ethers.utils.formatEther(ethBalance)} ETH`);
  
  const usdc = new ethers.Contract(USDC, erc20ABI, provider);
  const usdcBalance = await usdc.balanceOf(wallet.address);
  console.log(`USDC Balance: ${ethers.utils.formatUnits(usdcBalance, 6)} USDC`);
  
  const propertyRegistry = new ethers.Contract(PROPERTY_REGISTRY, propertyRegistryABI, wallet);
  const marketplace = new ethers.Contract(MARKETPLACE, marketplaceABI, wallet);
  const yieldDistributor = new ethers.Contract(YIELD_DISTRIBUTOR, yieldDistributorABI, wallet);
  
  // Step 1: Create and list property
  console.log('\n--- STEP 1: Create Property ---');
  try {
    const tx = await propertyRegistry.createAndListProperty(
      "ipfs://QmProperty123",  // uri
      ethers.utils.parseUnits("2500", 6),  // rentAmount (USDC/month)
      30,  // rentFrequency (days)
      ethers.utils.parseUnits("1000", 18),  // initialSupply tokens
      "NYC Apartment Token",  // tokenName
      "NYCAT",  // tokenSymbol
      ethers.utils.parseUnits("300000", 8),  // valuationUsd ($300k)
      ethers.utils.parseUnits("500", 18),  // listingAmount (500 tokens for sale)
      ethers.utils.parseUnits("100", 18)  // pricePerToken ($100)
    );
    console.log('Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Transaction confirmed!', receipt.hash);
    
    // Find the new property and listing
    const properties = await propertyRegistry.getAllProperties();
    console.log(`\nTotal properties: ${properties.length}`);
    const newProperty = properties[properties.length - 1];
    console.log(`New Property ID: ${newProperty.id}`);
    console.log(`Property Token: ${newProperty.propertyToken}`);
    console.log(`Owner: ${newProperty.owner}`);
    
    // Check listings
    const listings = await marketplace.getActiveListings();
    console.log(`\nActive Listings: ${listings.length}`);
    if (listings.length > 0) {
      const lastListing = listings[listings.length - 1];
      console.log(`Listing ID: ${lastListing.id}`);
      console.log(`Seller: ${lastListing.seller}`);
      console.log(`Amount: ${ethers.utils.formatUnits(lastListing.amount, 18)} tokens`);
      console.log(`Price per token: ${ethers.utils.formatUnits(lastListing.pricePerToken, 18)} ETH`);
    }
  } catch (e) {
    console.error('Error creating property:', e.message || e);
  }
  
  // Step 2: Get existing properties and buy tokens
  console.log('\n--- STEP 2: Buy Property Tokens ---');
  try {
    const properties = await propertyRegistry.getAllProperties();
    console.log(`Found ${properties.length} properties`);
    
    const listings = await marketplace.getActiveListings();
    console.log(`Found ${listings.length} active listings`);
    
    if (listings.length > 0) {
      const listing = listings[0];
      console.log(`\nBuying from Listing ID: ${listing.id}`);
      console.log(`Seller: ${listing.seller}`);
      console.log(`Price per token: ${ethers.utils.formatUnits(listing.pricePerToken, 18)}`);
      
      // Check USDC balance
      const usdcBal = await usdc.balanceOf(wallet.address);
      console.log(`USDC Balance: ${ethers.utils.formatUnits(usdcBal, 6)}`);
      
      // Buy 10 tokens
      const buyAmount = ethers.utils.parseUnits("10", 18);
      const totalCost = buyAmount.mul(listing.pricePerToken).div(ethers.utils.parseUnits("1", 18));
      console.log(`Cost for 10 tokens: ${ethers.utils.formatUnits(totalCost, 6)} USDC`);
      
      // Approve USDC
      const usdcWithSigner = usdc.connect(wallet);
      const allowance = await usdc.allowance(wallet.address, MARKETPLACE);
      if (allowance.lt(totalCost)) {
        console.log('Approving USDC...');
        const approveTx = await usdcWithSigner.approve(MARKETPLACE, totalCost);
        await approveTx.wait();
        console.log('USDC approved!');
      }
      
      // Buy listing
      console.log('Buying tokens...');
      const buyTx = await marketplace.buyListing(listing.id, buyAmount);
      console.log('Transaction sent:', buyTx.hash);
      const buyReceipt = await buyTx.wait();
      console.log('Purchase confirmed!', buyReceipt.hash);
      
      // Check token balance
      const propertyToken = new ethers.Contract(listing.propertyToken, erc20ABI, provider);
      const tokenBalance = await propertyToken.balanceOf(wallet.address);
      console.log(`\nToken Balance: ${ethers.utils.formatUnits(tokenBalance, 18)} tokens`);
    }
  } catch (e) {
    console.error('Error buying tokens:', e.message || e);
  }
  
  // Step 3: Pay rent
  console.log('\n--- STEP 3: Pay Rent ---');
  try {
    const properties = await propertyRegistry.getAllProperties();
    if (properties.length > 0) {
      const property = properties[0];
      console.log(`Paying rent for Property ID: ${property.id}`);
      console.log(`Rent amount: ${ethers.utils.formatUnits(property.rentAmount, 6)} USDC`);
      console.log(`Owner: ${property.owner}`);
      
      // Check USDC balance
      const usdcBal = await usdc.balanceOf(wallet.address);
      console.log(`USDC Balance: ${ethers.utils.formatUnits(usdcBal, 6)}`);
      
      // Pay rent (transfer USDC to owner)
      const usdcWithSigner = usdc.connect(wallet);
      const rentAmount = property.rentAmount;
      
      const payTx = await usdcWithSigner.transfer(property.owner, rentAmount);
      console.log('Rent payment sent:', payTx.hash);
      const payReceipt = await payTx.wait();
      console.log('Rent payment confirmed!', payReceipt.hash);
      
      // Deposit yield to YieldDistributor (as property owner)
      console.log('\nDepositing yield to YieldDistributor...');
      const yieldWithSigner = yieldDistributor.connect(wallet);
      const depositTx = await yieldWithSigner.depositYield(property.id, rentAmount);
      console.log('Yield deposit sent:', depositTx.hash);
      const depositReceipt = await depositTx.wait();
      console.log('Yield deposit confirmed!', depositReceipt.hash);
      
      // Check yield pool
      const yieldPool = await yieldDistributor.totalYieldPool();
      console.log(`\nTotal Yield Pool: ${ethers.utils.formatUnits(yieldPool, 18)}`);
    }
  } catch (e) {
    console.error('Error paying rent:', e.message || e);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Flow Test Complete!');
  console.log('='.repeat(60));
}

main().catch(console.error);
