/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PRIVY_APP_ID: string;
  readonly VITE_BACKEND_URL: string;
  readonly VITE_PROPERTY_REGISTRY_SEPOLIA: string;
  readonly VITE_TEN_TOKEN_SEPOLIA: string;
  readonly VITE_YIELD_DISTRIBUTOR_SEPOLIA: string;
  readonly VITE_PROPERTY_REGISTRY_MAINNET: string;
  readonly VITE_TEN_TOKEN_MAINNET: string;
  readonly VITE_YIELD_DISTRIBUTOR_MAINNET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
