type FeatureStatus = {
  enabled: boolean;
  reason?: string;
};

const FEATURE_WORLD_ID = import.meta.env.VITE_FEATURE_WORLD_ID === 'true';
const FEATURE_MOONPAY = import.meta.env.VITE_FEATURE_MOONPAY === 'true';

const WORLD_ID_APP_ID = (import.meta.env.VITE_WORLD_ID_APP_ID as string) || '';
const MOONPAY_PUBLISHABLE_KEY = (import.meta.env.VITE_MOONPAY_PUBLISHABLE_KEY as string) || '';
const DEFAULT_CHAIN_ID_RAW = (import.meta.env.VITE_DEFAULT_CHAIN_ID as string) || '11155111';

const allowedDefaultChains = new Set([11155111, 84532]);
const parsedDefaultChainId = Number(DEFAULT_CHAIN_ID_RAW);
export const DEFAULT_CHAIN_ID = allowedDefaultChains.has(parsedDefaultChainId) ? parsedDefaultChainId : 11155111;

export const featureStatus = {
  worldId: (): FeatureStatus => {
    if (!FEATURE_WORLD_ID) return { enabled: false, reason: 'World ID feature flag is disabled.' };
    if (!WORLD_ID_APP_ID) return { enabled: false, reason: 'Missing VITE_WORLD_ID_APP_ID.' };
    return { enabled: true };
  },
  moonpay: (): FeatureStatus => {
    if (!FEATURE_MOONPAY) return { enabled: false, reason: 'MoonPay feature flag is disabled.' };
    if (!MOONPAY_PUBLISHABLE_KEY) return { enabled: false, reason: 'Missing VITE_MOONPAY_PUBLISHABLE_KEY.' };
    return { enabled: true };
  },
};

export const getWorldIdAppId = () => WORLD_ID_APP_ID;
export const getMoonPayPublishableKey = () => MOONPAY_PUBLISHABLE_KEY;
export const getDefaultChainConfigError = () =>
  allowedDefaultChains.has(parsedDefaultChainId)
    ? null
    : 'VITE_DEFAULT_CHAIN_ID must be one of 11155111 (Sepolia) or 84532 (Base Sepolia).';
