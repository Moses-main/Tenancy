import { http, createConfig } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [sepolia, mainnet],
  transports: {
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
  connectors: [injected()],
});

export const CONTRACT_ADDRESSES = {
  sepolia: {
    propertyRegistry: (import.meta.env.VITE_PROPERTY_REGISTRY_SEPOLIA as `0x${string}`) || '0x0000000000000000000000000000000000000000',
    tenToken: (import.meta.env.VITE_TEN_TOKEN_SEPOLIA as `0x${string}`) || '0x0000000000000000000000000000000000000000',
    yieldDistributor: (import.meta.env.VITE_YIELD_DISTRIBUTOR_SEPOLIA as `0x${string}`) || '0x0000000000000000000000000000000000000000',
    ethUsdPriceFeed: '0x694580A4e26D2b2e2dEk42D32D8d5f0F27C3B92',
  },
  mainnet: {
    propertyRegistry: (import.meta.env.VITE_PROPERTY_REGISTRY_MAINNET as `0x${string}`) || '0x0000000000000000000000000000000000000000',
    tenToken: (import.meta.env.VITE_TEN_TOKEN_MAINNET as `0x${string}`) || '0x0000000000000000000000000000000000000000',
    yieldDistributor: (import.meta.env.VITE_YIELD_DISTRIBUTOR_MAINNET as `0x${string}`) || '0x0000000000000000000000000000000000000000',
    ethUsdPriceFeed: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
  },
};

export const getChainConfig = (chainId: number) => {
  if (chainId === sepolia.id) return CONTRACT_ADDRESSES.sepolia;
  if (chainId === mainnet.id) return CONTRACT_ADDRESSES.mainnet;
  return CONTRACT_ADDRESSES.sepolia;
};
