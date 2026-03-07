/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PRIVY_APP_ID: string;
  readonly VITE_BACKEND_URL: string;
  readonly VITE_API_KEY: string;
  readonly VITE_PINATA_JWT: string;
  readonly VITE_NETWORK: string;
  readonly VITE_PROPERTY_REGISTRY_SEPOLIA: string;
  readonly VITE_TEN_TOKEN_SEPOLIA: string;
  readonly VITE_YIELD_DISTRIBUTOR_SEPOLIA: string;
  readonly VITE_PROPERTY_REGISTRY_MAINNET: string;
  readonly VITE_TEN_TOKEN_MAINNET: string;
  readonly VITE_YIELD_DISTRIBUTOR_MAINNET: string;
  readonly VITE_PROPERTY_REGISTRY_BASE_SEPOLIA: string;
  readonly VITE_TEN_TOKEN_BASE_SEPOLIA: string;
  readonly VITE_YIELD_DISTRIBUTOR_BASE_SEPOLIA: string;
  readonly VITE_PRICE_FEED_CONSUMER_BASE_SEPOLIA: string;
  readonly VITE_PRICE_FEED_CONSUMER_SEPOLIA: string;
  readonly VITE_MARKETPLACE_BASE_SEPOLIA: string;
  readonly VITE_MARKETPLACE_SEPOLIA: string;
  readonly VITE_RENTAL_TOKEN_BASE_SEPOLIA: string;
  readonly VITE_CHAINLINK_ROUTER: string;
  readonly VITE_CHAINLINK_SUBSCRIPTION_ID: string;
  readonly VITE_WORLD_ID_APP_ID: string;
  readonly VITE_FRONTEND_URL: string;
  readonly VITE_SEPOLIA_RPC_URL: string;
  readonly VITE_BASE_SEPOLIA_RPC_URL: string;
  readonly VITE_FEATURE_WORLD_ID: string;
  readonly VITE_FEATURE_MOONPAY: string;
  readonly VITE_MOONPAY_PUBLISHABLE_KEY: string;
  readonly VITE_DEFAULT_CHAIN_ID: string;
  readonly VITE_ALLOW_MOCK_IPFS: string;
  readonly VITE_DEMO_MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
