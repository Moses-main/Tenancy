import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { BrowserProvider, ethers } from 'ethers';

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
  provider: BrowserProvider | null;
  isWalletModalOpen: boolean;
  setWalletModalOpen: (open: boolean) => void;
  connectWallet: () => void;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const [balance, setBalance] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [chainName, setChainName] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [isWalletModalOpen, setWalletModalOpen] = useState(false);

  const address = wallets[0]?.address || null;

  useEffect(() => {
    const updateBalanceAndChain = async () => {
      if (!wallets[0]) {
        setBalance(null);
        setChainId(null);
        setChainName(null);
        setProvider(null);
        return;
      }

      try {
        const ethProvider = await wallets[0].getEthereumProvider();
        if (ethProvider) {
          const ethersProvider = new BrowserProvider(ethProvider);
          setProvider(ethersProvider);
          
          const balanceWei = await ethersProvider.getBalance(wallets[0].address);
          const balanceEth = ethers.formatEther(balanceWei);
          setBalance(parseFloat(balanceEth).toFixed(4));

          const network = await ethersProvider.getNetwork();
          setChainId(Number(network.chainId));
          setChainName(CHAIN_ID_TO_NAME[Number(network.chainId)] || `Chain ${Number(network.chainId)}`);
        }
      } catch (error) {
        console.error('Error fetching balance/chain:', error);
      }
    };

    updateBalanceAndChain();
    const interval = setInterval(updateBalanceAndChain, 10000);
    return () => clearInterval(interval);
  }, [wallets]);

  const connectWallet = () => {
    if (!authenticated) {
      login();
    } else if (wallets.length === 0) {
      setWalletModalOpen(true);
    }
  };

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
