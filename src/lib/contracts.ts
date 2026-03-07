import { ethers, Contract } from 'ethers';

const { formatEther, formatUnits, parseEther, parseUnits } = ethers.utils;

type Web3Provider = ethers.providers.Web3Provider;

const getEnv = (key: string, fallback: string = '') => {
  return (import.meta.env as any)[key] || fallback;
};

export const CONTRACT_ADDRESSES = {
  baseSepolia: {
    propertyRegistry: getEnv('VITE_PROPERTY_REGISTRY_BASE_SEPOLIA', '0xCd5E04B88789bd2772AbFf6e9642B08A074a8326'),
    tenToken: getEnv('VITE_TEN_TOKEN_BASE_SEPOLIA', '0xF6fb74324aeD3215bB4580De3e8B98a240E619A8'),
    yieldDistributor: getEnv('VITE_YIELD_DISTRIBUTOR_BASE_SEPOLIA', '0x14E4422344B330dA56f7EE26936A5A136D800D19'),
    priceFeedConsumer: getEnv('VITE_PRICE_FEED_CONSUMER_BASE_SEPOLIA', '0xC7f2Cf4845C6db0e1a1e91ED41Bcd0FcC1b0E141'),
    marketplace: getEnv('VITE_MARKETPLACE_BASE_SEPOLIA', '0x262Ff5Ea35B98f8d2EB790b2d0Ea9F029CB8D202'),
  },
  sepolia: {
    propertyRegistry: getEnv('VITE_PROPERTY_REGISTRY_SEPOLIA', '0x452ba94272f3302E7b48bFFC1F5a57ec7136A6aA'),
    tenToken: getEnv('VITE_TEN_TOKEN_SEPOLIA', '0x9e395acF058c74386b531e4c901C53B1c73E6D5F'),
    yieldDistributor: getEnv('VITE_YIELD_DISTRIBUTOR_SEPOLIA', '0x84bc076C939Aa2B70e0DaEbA708B3aDa3881a179'),
    priceFeedConsumer: getEnv('VITE_PRICE_FEED_CONSUMER_SEPOLIA', '0xE88A399F85550dDF61f9DD6Cb91e2673817D7f91'),
    marketplace: getEnv('VITE_MARKETPLACE_SEPOLIA', '0xE07db63A23d6572dB1374B49DB7Cc063BE0aE035'),
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
  84532: { name: 'Base Sepolia', network: 'baseSepolia', color: '#0052FF', explorer: 'https://sepolia.basescan.org' },
  11155111: { name: 'Sepolia', network: 'sepolia', color: '#627EEA', explorer: 'https://sepolia.etherscan.io' },
  1: { name: 'Ethereum', network: 'mainnet', color: '#627EEA', explorer: 'https://etherscan.io' },
  8453: { name: 'Base', network: 'mainnet', color: '#0052FF', explorer: 'https://basescan.org' },
} as const;

type SupportedChainId = keyof typeof CHAIN_CONFIG;

const RPC_URLS: Partial<Record<SupportedChainId, string>> = {
  84532: getEnv('VITE_BASE_SEPOLIA_RPC_URL', 'https://base-sepolia.g.alchemy.com/v2/demo'),
  11155111: getEnv('VITE_SEPOLIA_RPC_URL', 'https://eth-sepolia.g.alchemy.com/v2/demo'),
};

export const getExplorerUrl = (chainId: number, address?: string, txHash?: string): string => {
  const config = CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG];
  const baseUrl = config?.explorer || 'https://sepolia.basescan.org';
  if (txHash) return `${baseUrl}/tx/${txHash}`;
  if (address) return `${baseUrl}/address/${address}`;
  return baseUrl;
};

export type DeploymentIssueSeverity = 'warning' | 'error';

export type DeploymentValidationIssue = {
  chainId: number;
  contractKey: string;
  address: string;
  severity: DeploymentIssueSeverity;
  message: string;
};

export type DeploymentValidationReport = {
  checkedAt: number;
  issues: DeploymentValidationIssue[];
};

export const ABIS = {
  propertyRegistry: [
    "function createProperty(string uri, uint256 rentAmount, uint256 rentFrequency, uint256 initialSupply, string tokenName, string tokenSymbol, uint256 valuationUsd) returns (address)",
    "function createAndListProperty(string uri, uint256 rentAmount, uint256 rentFrequency, uint256 initialSupply, string tokenName, string tokenSymbol, uint256 valuationUsd, uint256 listingAmount, uint256 pricePerToken) returns (address propertyToken, uint256 listingId)",
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
    "function getDistributionInfo(uint256 distributionId) view returns (tuple(uint256 propertyId, uint256 totalYield, uint256 distributedYield, uint256 status, uint256 distributionTimestamp, uint256[] holderBalances, address[] holders))",
    "function distributionCount() view returns (uint256)",
    "function getClaimableDistributionIds(address holder) view returns (uint256[])",
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
    "function getEthUsdPrice() view returns (uint256)",
    "function getEthUsdPriceView() view returns (uint256)",
    "function getPriceData() view returns (tuple(uint256 price, uint256 timestamp, bool isStale))",
  ],
  marketplace: [
    "function createListing(address propertyToken, uint256 amount, uint256 pricePerToken) returns (uint256)",
    "function cancelListing(uint256 listingId)",
    "function buyListing(uint256 listingId, uint256 amountToBuy)",
    "function makeOffer(uint256 listingId, uint256 amount, uint256 offeredPrice)",
    "function acceptOffer(uint256 listingId, uint256 offerId)",
    "function cancelOffer(uint256 listingId, uint256 offerId)",
    "function getListings() view returns (tuple(uint256 id, address seller, address propertyToken, uint256 amount, uint256 pricePerToken, uint256 totalPrice, bool isActive, uint256 createdAt)[])",
    "function getActiveListings() view returns (tuple(uint256 id, address seller, address propertyToken, uint256 amount, uint256 pricePerToken, uint256 totalPrice, bool isActive, uint256 createdAt)[])",
    "function getUserListings(address user) view returns (tuple(uint256 id, address seller, address propertyToken, uint256 amount, uint256 pricePerToken, uint256 totalPrice, bool isActive, uint256 createdAt)[])",
    "function listingCount() view returns (uint256)",
    "function platformFeePercent() view returns (uint256)",
    "function paymentToken() view returns (address)",
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

const isZeroAddress = (address?: string) => {
  if (!address) return true;
  return /^0x0{40}$/i.test(address);
};

const validateSingleAddress = (
  chainId: number,
  key: string,
  address: string,
  issues: DeploymentValidationIssue[],
  required: boolean
) => {
  if (!ethers.utils.isAddress(address)) {
    issues.push({
      chainId,
      contractKey: key,
      address,
      severity: 'error',
      message: 'Configured value is not a valid EVM address.',
    });
    return false;
  }
  if (isZeroAddress(address)) {
    issues.push({
      chainId,
      contractKey: key,
      address,
      severity: required ? 'error' : 'warning',
      message: required ? 'Required contract address is zero-address.' : 'Optional contract address is zero-address.',
    });
    return false;
  }
  return true;
};

async function probeContractCompatibility(
  provider: ethers.providers.JsonRpcProvider,
  chainId: number,
  key: string,
  address: string,
  issues: DeploymentValidationIssue[]
) {
  const probes: Record<string, { abi: string[]; fn: string }> = {
    propertyRegistry: { abi: ABIS.propertyRegistry as string[], fn: 'getAllProperties' },
    tenToken: { abi: ABIS.erc20 as string[], fn: 'totalSupply' },
    yieldDistributor: { abi: ABIS.yieldDistributor as string[], fn: 'distributionCount' },
    marketplace: { abi: ABIS.marketplace as string[], fn: 'listingCount' },
    priceFeedConsumer: { abi: ABIS.priceFeed as string[], fn: 'getEthUsdPriceView' }, // Use view function to avoid state changes
  };
  const probe = probes[key];
  if (!probe) return;
  try {
    const contract = new Contract(address, probe.abi, provider);
    await contract.callStatic[probe.fn]();
  } catch {
    issues.push({
      chainId,
      contractKey: key,
      address,
      severity: key === 'propertyRegistry' || key === 'tenToken' || key === 'yieldDistributor' ? 'error' : 'warning',
      message: `ABI compatibility probe failed for ${probe.fn}().`,
    });
  }
}

export async function validateDeploymentConfigAtStartup(
  chainIds: number[] = [84532, 11155111]
): Promise<DeploymentValidationReport> {
  const issues: DeploymentValidationIssue[] = [];
  
  // Only validate Base Sepolia (84532) since Sepolia contracts aren't deployed
  const chainIdsToValidate = [84532];

  for (const chainIdToValidate of chainIdsToValidate) {
    const config = CHAIN_CONFIG[chainIdToValidate as keyof typeof CHAIN_CONFIG];
    if (!config) continue;
    
    const addresses = CONTRACT_ADDRESSES[config.network];

    for (const [key, address] of Object.entries(addresses)) {
      const required = requiredContracts.has(key);
      const validAddress = validateSingleAddress(chainIdToValidate, key, address, issues, required);
      if (!validAddress) continue;

      try {
        const code = await provider.getCode(address);
        if (!code || code === '0x') {
          issues.push({
            chainId,
            contractKey: key,
            address,
            severity: required ? 'error' : 'warning',
            message: 'No bytecode found at configured contract address.',
          });
          continue;
        }
      } catch {
        issues.push({
          chainId,
          contractKey: key,
          address,
          severity: 'warning',
          message: 'Unable to fetch bytecode from RPC endpoint.',
        });
        continue;
      }

      await probeContractCompatibility(provider, chainId, key, address, issues);
    }
  }

  return {
    checkedAt: Date.now(),
    issues,
  };
}

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
