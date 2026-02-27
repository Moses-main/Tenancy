import { ethers, Contract } from 'ethers';

const { formatEther, formatUnits, parseEther, parseUnits } = ethers.utils;

type Web3Provider = ethers.providers.Web3Provider;

const getEnv = (key: string, fallback: string = '') => {
  return import.meta.env[key] || fallback;
};

export const CONTRACT_ADDRESSES = {
  baseSepolia: {
    propertyRegistry: getEnv('VITE_PROPERTY_REGISTRY_BASE_SEPOLIA', '0x8f77c2BD2132727327B27164cDec4ccaA2083f7C'),
    tenToken: getEnv('VITE_TEN_TOKEN_BASE_SEPOLIA', '0x539bd9076cB447Da9c88e722052293dD3394b536'),
    yieldDistributor: getEnv('VITE_YIELD_DISTRIBUTOR_BASE_SEPOLIA', '0xd7c3c5e900Bd95653FA65b660a94625E1ddbBDA1'),
    priceFeedConsumer: getEnv('VITE_PRICE_FEED_CONSUMER_BASE_SEPOLIA', '0xc8C6ecAA0287310bb8B0c9BE71253E758702b541'),
    marketplace: getEnv('VITE_MARKETPLACE_BASE_SEPOLIA', '0xE07db63A23d6572dB1374B49DB7Cc063BE0aE035'),
  },
  sepolia: {
    propertyRegistry: getEnv('VITE_PROPERTY_REGISTRY_SEPOLIA', '0x452ba94272f3302E7b48bFFC1F5a57ec7136A6aA'),
    tenToken: getEnv('VITE_TEN_TOKEN_SEPOLIA', '0x9e395acF058c74386b531e4c901C53B1c73E6D5F'),
    yieldDistributor: getEnv('VITE_YIELD_DISTRIBUTOR_SEPOLIA', '0x84bc076C939Aa2B70e0DaEbA708B3aDa3881a179'),
    priceFeedConsumer: getEnv('VITE_PRICE_FEED_CONSUMER_SEPOLIA', '0xE88A399F85550dDF61f9DD6Cb91e2673817D7f91'),
    marketplace: getEnv('VITE_MARKETPLACE_SEPOLIA', '0x0000000000000000000000000000000000000000'),
  },
  mainnet: {
    propertyRegistry: getEnv('VITE_PROPERTY_REGISTRY_MAINNET', '0x0000000000000000000000000000000000000000'),
    tenToken: getEnv('VITE_TEN_TOKEN_MAINNET', '0x0000000000000000000000000000000000000000'),
    yieldDistributor: getEnv('VITE_YIELD_DISTRIBUTOR_MAINNET', '0x0000000000000000000000000000000000000000'),
    priceFeedConsumer: getEnv('VITE_PRICE_FEED_CONSUMER_MAINNET', '0x0000000000000000000000000000000000000000'),
    marketplace: getEnv('VITE_MARKETPLACE_MAINNET', '0x0000000000000000000000000000000000000000'),
  },
};

export const CHAIN_CONFIG = {
  84532: { name: 'Base Sepolia', network: 'baseSepolia', color: '#0052FF' },
  11155111: { name: 'Sepolia', network: 'sepolia', color: '#627EEA' },
  1: { name: 'Ethereum', network: 'mainnet', color: '#627EEA' },
  8453: { name: 'Base', network: 'mainnet', color: '#0052FF' },
} as const;

export const ABIS = {
  propertyRegistry: [
    "function createProperty(string uri, uint256 rentAmount, uint256 rentFrequency, uint256 initialSupply, string tokenName, string tokenSymbol, uint256 valuationUsd) returns (address)",
    "function getProperty(uint256 propertyId) view returns (tuple(uint256 id, string uri, uint256 rentAmount, uint256 rentFrequency, uint256 totalSupply, address propertyToken, address owner, bool isActive))",
    "function getAllProperties() view returns (tuple(uint256 id, string uri, uint256 rentAmount, uint256 rentFrequency, uint256 totalSupply, address propertyToken, address owner, bool isActive)[])",
    "function setIssuer(address issuer, bool status)",
    "function issuers(address) view returns (bool)",
    "function calculatePropertyValuation(uint256 annualRentUsd) view returns (uint256)",
  ],
  erc20: [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transferFrom(address from, address to, uint256 amount) returns (bool)",
    "function mint(address to, uint256 amount)",
    "function burn(address from, uint256 amount)",
  ],
  yieldDistributor: [
    "function createDistribution(uint256 propertyId, uint256 totalYield, uint256[] holderBalances, address[] holders) returns (uint256)",
    "function startDistribution(uint256 distributionId)",
    "function pauseDistribution(uint256 distributionId)",
    "function resumeDistribution(uint256 distributionId)",
    "function claimYield(uint256 distributionId)",
    "function getTotalYieldPool() view returns (uint256)",
    "function getTotalDistributedYield() view returns (uint256)",
    "function isDistributionActive(uint256 distributionId) view returns (bool)",
    "function getDistributionInfo(uint256 distributionId) view returns (tuple(uint256 propertyId, uint256 totalYield, uint256 distributedYield, uint256 status, uint256 distributionTimestamp, uint256[] holderBalances))",
    "function checkReserveHealth() view returns (bool isHealthy, uint256 totalReserve, uint256 requiredReserve)",
    "function isSystemHealthy() view returns (bool)",
    "function getRiskMetrics() view returns (uint256 totalDefaults, uint256 defaultRatio, uint256 reserveRatio, bool safeguardActive, uint256 lastRiskCheck)",
    "function getEthUsdPrice() view returns (uint256)",
    "function getYieldDistributionUsd(uint256 distributionId) view returns (uint256)",
    "function getAgentDecision(uint256 propertyId) view returns (uint256 propId, uint256 action, uint256 adjustmentPercent, string reason, uint256 confidence, bytes32 recommendationId, bool executed, uint256 timestamp)",
    "function lastDistributionTimestamp() view returns (uint256)",
    "function totalYieldPool() view returns (uint256)",
    "function totalDistributedYield() view returns (uint256)",
  ],
  priceFeed: [
    "function getLatestPrice() view returns (int256)",
    "function getRoundData(uint80 roundId) view returns (int256)",
  ],
  marketplace: [
    "function createListing(address propertyToken, uint256 amount, uint256 pricePerToken) returns (uint256)",
    "function cancelListing(uint256 listingId)",
    "function buyListing(uint256 listingId) payable",
    "function makeOffer(uint256 listingId, uint256 amount, uint256 offeredPrice)",
    "function acceptOffer(uint256 listingId, uint256 offerId)",
    "function cancelOffer(uint256 listingId, uint256 offerId)",
    "function getListings() view returns (tuple(uint256 id, address seller, address propertyToken, uint256 amount, uint256 pricePerToken, uint256 totalPrice, bool isActive, uint256 createdAt)[])",
    "function getActiveListings() view returns (tuple(uint256 id, address seller, address propertyToken, uint256 amount, uint256 pricePerToken, uint256 totalPrice, bool isActive, uint256 createdAt)[])",
    "function getUserListings(address user) view returns (tuple(uint256 id, address seller, address propertyToken, uint256 amount, uint256 pricePerToken, uint256 totalPrice, bool isActive, uint256 createdAt)[])",
    "function listingCount() view returns (uint256)",
    "function platformFeePercent() view returns (uint256)",
  ],
};

export const getContracts = async (provider: Web3Provider, chainId: number) => {
  const config = CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG];
  const addresses = config ? CONTRACT_ADDRESSES[config.network] : CONTRACT_ADDRESSES.baseSepolia;

  return {
    propertyRegistry: new Contract(addresses.propertyRegistry, ABIS.propertyRegistry, provider),
    tenToken: new Contract(addresses.tenToken, ABIS.erc20, provider),
    yieldDistributor: new Contract(addresses.yieldDistributor, ABIS.yieldDistributor, provider),
    priceFeedConsumer: new Contract(addresses.priceFeedConsumer, ABIS.priceFeed, provider),
    marketplace: addresses.marketplace !== '0x0000000000000000000000000000000000000000' 
      ? new Contract(addresses.marketplace, ABIS.marketplace, provider) 
      : null,
    addresses,
    chainConfig: config || CHAIN_CONFIG[84532],
  };
};

export const getChainConfig = (chainId: number) => {
  return CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG] || { name: 'Unknown', network: 'unknown', color: '#888888' };
};

export const formatTokenAmount = (amount: bigint, decimals: number = 18) => {
  return formatUnits(amount, decimals);
};

export const parseTokenAmount = (amount: string, decimals: number = 18) => {
  return parseUnits(amount, decimals);
};

export const formatUSD = (amount: bigint) => {
  return formatUnits(amount, 8);
};

export interface Property {
  id: bigint;
  uri: string;
  rentAmount: bigint;
  rentFrequency: bigint;
  totalSupply: bigint;
  propertyToken: string;
  owner: string;
  isActive: boolean;
}

export interface PropertyWithToken extends Property {
  tokenName?: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
  tokenBalance?: bigint;
}

export interface MarketplaceListing {
  id: bigint;
  seller: string;
  propertyToken: string;
  amount: bigint;
  pricePerToken: bigint;
  totalPrice: bigint;
  isActive: boolean;
  createdAt: bigint;
}

export interface Lease {
  id: bigint;
  propertyId: bigint;
  tenant: string;
  monthlyRent: bigint;
  rentDueDate: bigint;
  lastPaymentDate: bigint;
  status: number;
  createdAt: bigint;
}
