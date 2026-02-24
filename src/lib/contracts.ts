import { BrowserProvider, Contract, formatEther, formatUnits, parseEther, parseUnits } from 'ethers';

const getEnv = (key: string, fallback: string = '') => {
  return import.meta.env[key] || fallback;
};

export const CONTRACT_ADDRESSES = {
  baseSepolia: {
    propertyRegistry: getEnv('VITE_PROPERTY_REGISTRY_BASE_SEPOLIA', '0x00185866B2eb4dEB6000e82840E436CCE375BcF2'),
    tenToken: getEnv('VITE_TEN_TOKEN_BASE_SEPOLIA', '0x4e9A9676b3E24E406a42710A06120561D5A9A045'),
    yieldDistributor: getEnv('VITE_YIELD_DISTRIBUTOR_BASE_SEPOLIA', '0xd42992B93a9cD29D6d7Bfb6e1e84bc83C97F3302'),
    priceFeedConsumer: getEnv('VITE_PRICE_FEED_CONSUMER_BASE_SEPOLIA', '0x0e36E870452C86c18ea7b494DD81eC026982b85F'),
  },
  sepolia: {
    propertyRegistry: getEnv('VITE_PROPERTY_REGISTRY_SEPOLIA', '0x0000000000000000000000000000000000000000'),
    tenToken: getEnv('VITE_TEN_TOKEN_SEPOLIA', '0x0000000000000000000000000000000000000000'),
    yieldDistributor: getEnv('VITE_YIELD_DISTRIBUTOR_SEPOLIA', '0x0000000000000000000000000000000000000000'),
    priceFeedConsumer: getEnv('VITE_PRICE_FEED_CONSUMER_SEPOLIA', '0x0000000000000000000000000000000000000000'),
  },
  mainnet: {
    propertyRegistry: getEnv('VITE_PROPERTY_REGISTRY_MAINNET', '0x0000000000000000000000000000000000000000'),
    tenToken: getEnv('VITE_TEN_TOKEN_MAINNET', '0x0000000000000000000000000000000000000000'),
    yieldDistributor: getEnv('VITE_YIELD_DISTRIBUTOR_MAINNET', '0x0000000000000000000000000000000000000000'),
    priceFeedConsumer: getEnv('VITE_PRICE_FEED_CONSUMER_MAINNET', '0x0000000000000000000000000000000000000000'),
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
  ],
  priceFeed: [
    "function getLatestPrice() view returns (int256)",
    "function getRoundData(uint80 roundId) view returns (int256)",
  ],
};

export const getContracts = async (provider: BrowserProvider, chainId: number) => {
  const config = CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG];
  const addresses = config ? CONTRACT_ADDRESSES[config.network] : CONTRACT_ADDRESSES.baseSepolia;

  return {
    propertyRegistry: new Contract(addresses.propertyRegistry, ABIS.propertyRegistry, provider),
    tenToken: new Contract(addresses.tenToken, ABIS.erc20, provider),
    yieldDistributor: new Contract(addresses.yieldDistributor, ABIS.yieldDistributor, provider),
    priceFeedConsumer: new Contract(addresses.priceFeedConsumer, ABIS.priceFeed, provider),
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
