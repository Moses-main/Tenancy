import { http, createConfig } from 'wagmi';
import { mainnet, sepolia, baseSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [baseSepolia, sepolia, mainnet],
  transports: {
    [baseSepolia.id]: http(),
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
  connectors: [injected()],
});

export const CONTRACT_ADDRESSES = {
  baseSepolia: {
    propertyRegistry: '0x00185866B2eb4dEB6000e82840E436CCE375BcF2',
    tenToken: '0x4e9A9676b3E24E406a42710A06120561D5A9A045',
    yieldDistributor: '0xd42992B93a9cD29D6d7Bfb6e1e84bc83C97F3302',
    priceFeedConsumer: '0x0e36E870452C86c18ea7b494DD81eC026982b85F',
    ethUsdPriceFeed: '0x0000000000000000000000000000000000000000',
  },
  sepolia: {
    propertyRegistry: (import.meta.env.VITE_PROPERTY_REGISTRY_SEPOLIA as `0x${string}`) || '0x0000000000000000000000000000000000000000',
    tenToken: (import.meta.env.VITE_TEN_TOKEN_SEPOLIA as `0x${string}`) || '0x0000000000000000000000000000000000000000',
    yieldDistributor: (import.meta.env.VITE_YIELD_DISTRIBUTOR_SEPOLIA as `0x${string}`) || '0x0000000000000000000000000000000000000000',
    priceFeedConsumer: '0x0000000000000000000000000000000000000000',
    ethUsdPriceFeed: '0x694580A4e26D2b2e2dEk42D32D8d5f0F27C3B92',
  },
  mainnet: {
    propertyRegistry: (import.meta.env.VITE_PROPERTY_REGISTRY_MAINNET as `0x${string}`) || '0x0000000000000000000000000000000000000000',
    tenToken: (import.meta.env.VITE_TEN_TOKEN_MAINNET as `0x${string}`) || '0x0000000000000000000000000000000000000000',
    yieldDistributor: (import.meta.env.VITE_YIELD_DISTRIBUTOR_MAINNET as `0x${string}`) || '0x0000000000000000000000000000000000000000',
    priceFeedConsumer: '0x0000000000000000000000000000000000000000',
    ethUsdPriceFeed: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
  },
};

export const getChainConfig = (chainId: number) => {
  if (chainId === baseSepolia.id) return CONTRACT_ADDRESSES.baseSepolia;
  if (chainId === sepolia.id) return CONTRACT_ADDRESSES.sepolia;
  if (chainId === mainnet.id) return CONTRACT_ADDRESSES.mainnet;
  return CONTRACT_ADDRESSES.baseSepolia;
};
