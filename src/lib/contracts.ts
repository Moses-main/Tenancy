import { BrowserProvider, Contract, formatEther, formatUnits, parseEther, parseUnits } from 'ethers';

export const CONTRACT_ADDRESSES = {
  baseSepolia: {
    propertyRegistry: '0x00185866B2eb4dEB6000e82840E436CCE375BcF2',
    tenToken: '0x4e9A9676b3E24E406a42710A06120561D5A9A045',
    yieldDistributor: '0xd42992B93a9cD29D6d7Bfb6e1e84bc83C97F3302',
    priceFeedConsumer: '0x0e36E870452C86c18ea7b494DD81eC026982b85F',
  },
  sepolia: {
    propertyRegistry: '0x0000000000000000000000000000000000000000',
    tenToken: '0x0000000000000000000000000000000000000000',
    yieldDistributor: '0x0000000000000000000000000000000000000000',
    priceFeedConsumer: '0x0000000000000000000000000000000000000000',
  },
};

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
    "function depositYield(uint256 propertyId, uint256 amount)",
    "function distributeYield(uint256 distributionId)",
    "function claimYield(uint256 propertyId)",
    "function getPendingYield(address user, uint256 propertyId) view returns (uint256)",
    "function getUserTotalPendingYield(address user) view returns (uint256)",
    "function getDistribution(uint256 distributionId) view returns (tuple(uint256 id, uint256 propertyId, uint256 totalAmount, uint256 timestamp, bool distributed))",
  ],
  priceFeed: [
    "function getLatestPrice() view returns (int256)",
    "function getRoundData(uint80 roundId) view returns (int256)",
  ],
};

export const getContracts = async (provider: BrowserProvider, chainId: number) => {
  const isBaseSepolia = chainId === 84532;
  const addresses = isBaseSepolia ? CONTRACT_ADDRESSES.baseSepolia : CONTRACT_ADDRESSES.sepolia;

  return {
    propertyRegistry: new Contract(addresses.propertyRegistry, ABIS.propertyRegistry, provider),
    tenToken: new Contract(addresses.tenToken, ABIS.erc20, provider),
    yieldDistributor: new Contract(addresses.yieldDistributor, ABIS.yieldDistributor, provider),
    addresses,
  };
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
