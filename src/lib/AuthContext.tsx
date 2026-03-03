import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { ethers, providers } from 'ethers';

const { formatEther } = ethers.utils;

type Web3Provider = ethers.providers.Web3Provider;

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  user: any;
  address: string | null;
  balance: string | null;
  chainId: number | null;
  chainName: string | null;
  provider: Web3Provider | null;
  isWalletModalOpen: boolean;
  setWalletModalOpen: (open: boolean) => void;
  connectWallet: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
  switchAccount: () => Promise<void>;
  isCorrectNetwork: boolean;
  showNetworkPrompt: boolean;
  setShowNetworkPrompt: (show: boolean) => void;
  connectedWallet: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CHAIN_ID_TO_NAME: Record<number, string> = {
  1: 'Ethereum Mainnet',
  5: 'Goerli Testnet',
  11155111: 'Sepolia Testnet',
  8453: 'Base Mainnet',
  84532: 'Base Sepolia',
  137: 'Polygon Mainnet',
  80001: 'Mumbai Testnet',
  42161: 'Arbitrum One',
  421613: 'Arbitrum Goerli',
  10: 'Optimism Mainnet',
  420: 'Optimism Goerli',
};

const BASE_SEPOLIA_CHAIN_ID = 84532;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const [balance, setBalance] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [chainName, setChainName] = useState<string | null>(null);
  const [provider, setProvider] = useState<Web3Provider | null>(null);
  const [isWalletModalOpen, setWalletModalOpen] = useState(false);
  const [showNetworkPrompt, setShowNetworkPrompt] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<any>(null);

  const address = connectedWallet?.address || wallets[0]?.address || null;

  const fetchBalanceAndChain = useCallback(async (wallet: any) => {
    if (!wallet) {
      setBalance(null);
      setChainId(null);
      setChainName(null);
      setProvider(null);
      return;
    }

    try {
      const ethProvider = await wallet.getEthereumProvider();
      if (ethProvider) {
        const ethersProvider = new providers.Web3Provider(ethProvider, 'any');
        
        // Wait for the provider to be ready
        await ethersProvider.ready;
        
        setProvider(ethersProvider);
        
        const walletAddress = wallet.address || await ethersProvider.getSigner().getAddress();
        if (!walletAddress) return;
        
        const balanceWei = await ethersProvider.getBalance(walletAddress);
        const balanceEth = formatEther(balanceWei);
        setBalance(parseFloat(balanceEth).toFixed(4));

        const network = await ethersProvider.getNetwork();
        const currentChainId = Number(network.chainId);
        setChainId(currentChainId);
        setChainName(CHAIN_ID_TO_NAME[currentChainId] || `Chain ${currentChainId}`);
        
        if (authenticated && address && currentChainId !== BASE_SEPOLIA_CHAIN_ID && currentChainId !== 11155111) {
          setShowNetworkPrompt(true);
        } else {
          setShowNetworkPrompt(false);
        }
      }
    } catch (error: any) {
      console.error('Error fetching balance/chain:', error?.message || error);
      // Don't crash - just log the error and keep existing state
    }
  }, [authenticated, address]);

  useEffect(() => {
    if (wallets.length > 0 && authenticated) {
      const wallet = wallets[wallets.length - 1];
      setConnectedWallet(wallet);
      fetchBalanceAndChain(wallet);
    } else if (!authenticated) {
      setConnectedWallet(null);
      setBalance(null);
      setChainId(null);
      setChainName(null);
      setProvider(null);
    }
  }, [wallets, authenticated, fetchBalanceAndChain]);

  useEffect(() => {
    if (connectedWallet) {
      fetchBalanceAndChain(connectedWallet);
      const interval = setInterval(() => fetchBalanceAndChain(connectedWallet), 10000);
      return () => clearInterval(interval);
    }
  }, [connectedWallet, fetchBalanceAndChain]);

  const connectWallet = () => {
    if (!authenticated) {
      login();
    } else if (wallets.length === 0) {
      setWalletModalOpen(true);
    }
  };

  const switchNetwork = async (targetChainId: number) => {
    if (!connectedWallet) return;
    try {
      const ethProvider = await connectedWallet.getEthereumProvider();
      if (ethProvider) {
        await ethProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${targetChainId.toString(16)}` }],
        });
        await fetchBalanceAndChain(connectedWallet);
      }
    } catch (error) {
      console.error('Error switching network:', error);
      throw error;
    }
  };

  const switchAccount = async () => {
    if (!connectedWallet) return;
    try {
      const ethProvider = await connectedWallet.getEthereumProvider();
      if (ethProvider) {
        await ethProvider.request({
          method: 'wallet_requestAccounts',
        });
      }
    } catch (error) {
      console.error('Error switching account:', error);
      throw error;
    }
  };

  const isCorrectNetwork = chainId === BASE_SEPOLIA_CHAIN_ID || chainId === 11155111;

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: ready && authenticated,
        isLoading: !ready,
        login,
        logout,
        user,
        address,
        balance,
        chainId,
        chainName,
        provider,
        isWalletModalOpen,
        setWalletModalOpen,
        connectWallet,
        switchNetwork,
        switchAccount,
        isCorrectNetwork,
        showNetworkPrompt,
        setShowNetworkPrompt,
        connectedWallet,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
