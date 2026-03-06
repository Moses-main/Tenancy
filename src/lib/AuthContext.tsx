import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { ethers, providers, Contract } from 'ethers';
const { formatEther, formatUnits } = ethers.utils;

type Web3Provider = ethers.providers.Web3Provider;

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  user: any;
  address: string | null;
  balance: string | null;
  usdcBalance: string | null;
  tenBalance: string | null;
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
  allWallets: any[];
  selectWallet: (wallet: any) => void;
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

const USDC_ADDRESSES: Record<number, string> = {
  84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  11155111: '0xda0d3FA677B08D2Afd00D8e23c4A79DC9eBd8C2',
};

const CONTRACT_ADDRESSES = {
  baseSepolia: {
    tenToken: '0x0000000000000000000000000000000000000000', // Replace with actual TEN token address
  },
  sepolia: {
    tenToken: '0x0000000000000000000000000000000000000000', // Replace with actual TEN token address
  },
};

const USDC_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const [balance, setBalance] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [tenBalance, setTenBalance] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [chainName, setChainName] = useState<string | null>(null);
  const [provider, setProvider] = useState<Web3Provider | null>(null);
  const [isWalletModalOpen, setWalletModalOpen] = useState(false);
  const [showNetworkPrompt, setShowNetworkPrompt] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<any>(null);

  const address = connectedWallet?.address || wallets[0]?.address || null;
  const allWallets = wallets;

  const fetchBalanceAndChain = useCallback(async (wallet: any) => {
    if (!wallet) {
      setBalance(null);
      setUsdcBalance(null);
      setTenBalance(null);
      setChainId(null);
      setChainName(null);
      setProvider(null);
      return;
    }

    try {
      const ethProvider = await wallet.getEthereumProvider();
      if (ethProvider) {
        const ethersProvider = new providers.Web3Provider(ethProvider, 'any');
        
        await ethersProvider.ready;
        
        setProvider(ethersProvider);
        
        const walletAddress = wallet.address || await ethersProvider.getSigner().getAddress();
        if (!walletAddress) return;
        
        const balanceWei = await ethersProvider.getBalance(walletAddress);
        const balanceEth = formatEther(balanceWei);
        setBalance(parseFloat(balanceEth).toFixed(4));

        const network = await ethersProvider.getNetwork();
        const networkChainId = Number(network.chainId);
        
        const usdcAddress = USDC_ADDRESSES[networkChainId];
        if (usdcAddress) {
          try {
            const usdcContract = new Contract(usdcAddress, USDC_ABI, ethersProvider);
            const usdcBalanceWei = await usdcContract.balanceOf(walletAddress);
            const usdcBalanceFormatted = formatUnits(usdcBalanceWei, 6);
            setUsdcBalance(parseFloat(usdcBalanceFormatted).toFixed(2));
          } catch {
            setUsdcBalance(null);
          }
        }

        // Fetch TEN token balance
        try {
          const isBaseSepolia = networkChainId === 84532;
          const addrs = isBaseSepolia ? CONTRACT_ADDRESSES.baseSepolia : CONTRACT_ADDRESSES.sepolia;
          
          if (addrs.tenToken && addrs.tenToken !== '0x0000000000000000000000000000000000000000') {
            const tenContract = new Contract(addrs.tenToken, USDC_ABI, ethersProvider);
            const tenBalanceWei = await tenContract.balanceOf(walletAddress);
            const tenBalanceFormatted = formatUnits(tenBalanceWei, 18);
            setTenBalance(parseFloat(tenBalanceFormatted).toFixed(4));
          }
        } catch {
          setTenBalance(null);
        }

        setChainId(networkChainId);
        setChainName(CHAIN_ID_TO_NAME[networkChainId] || 'Unknown Network');
      }
    } catch (error) {
      console.error('Error fetching balance and chain:', error);
      setBalance(null);
      setUsdcBalance(null);
      setTenBalance(null);
      setChainId(null);
      setChainName(null);
      setProvider(null);
      console.error('Error fetching balance/chain:', error?.message || error);
    }
  }, [authenticated, address]);

  const selectWallet = useCallback((wallet: any) => {
    setConnectedWallet(wallet);
    fetchBalanceAndChain(wallet);
  }, [fetchBalanceAndChain]);

  // Prioritize external wallets over Privy embedded wallet
  const getPreferredWallet = useCallback((wallets: any[]) => {
    if (wallets.length === 0) return null;
    
    console.log('Available wallets:', wallets.map(w => ({
      address: w.address,
      connectorType: w.connectorType,
      walletType: w.walletType,
      walletClientType: w.walletClientType,
      name: w.name
    })));
    
    // More comprehensive external wallet detection
    const externalWallets = wallets.filter(wallet => {
      const isEmbedded = wallet.connectorType === 'embedded' || 
                        wallet.walletType === 'embedded' ||
                        wallet.connectorType === 'privy' ||
                        wallet.name?.toLowerCase().includes('privy');
      
      console.log(`Wallet ${wallet.address}: connectorType=${wallet.connectorType}, walletType=${wallet.walletType}, isEmbedded=${isEmbedded}`);
      
      return !isEmbedded;
    });
    
    console.log('External wallets found:', externalWallets.length);
    
    // If external wallets exist, prefer the most recently connected one
    if (externalWallets.length > 0) {
      const selectedWallet = externalWallets[externalWallets.length - 1];
      console.log('Selected external wallet:', selectedWallet.address);
      return selectedWallet;
    }
    
    // Fall back to Privy embedded wallet if no external wallets
    const embeddedWallets = wallets.filter(wallet => 
      wallet.connectorType === 'embedded' || 
      wallet.walletType === 'embedded' ||
      wallet.connectorType === 'privy' ||
      wallet.name?.toLowerCase().includes('privy')
    );
    
    const fallbackWallet = embeddedWallets[embeddedWallets.length - 1] || wallets[0];
    console.log('Fallback to embedded wallet:', fallbackWallet.address);
    return fallbackWallet;
  }, []);

  useEffect(() => {
    if (wallets.length > 0 && authenticated) {
      const preferredWallet = getPreferredWallet(wallets);
      console.log('Current connected wallet:', connectedWallet?.address);
      console.log('Preferred wallet:', preferredWallet?.address);
      
      // Always switch to preferred wallet if it's different
      if (preferredWallet && preferredWallet.address !== connectedWallet?.address) {
        console.log('Switching to preferred wallet:', preferredWallet.address);
        setConnectedWallet(preferredWallet);
        fetchBalanceAndChain(preferredWallet);
      }
    } else if (!authenticated) {
      setConnectedWallet(null);
      setBalance(null);
      setUsdcBalance(null);
      setTenBalance(null);
      setChainId(null);
      setChainName(null);
      setProvider(null);
    }
  }, [wallets, authenticated, fetchBalanceAndChain, getPreferredWallet, connectedWallet?.address]);

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
    if (wallets.length <= 1) return;
    
    try {
      // Find current wallet index
      const currentIndex = wallets.findIndex(w => w.address === connectedWallet?.address);
      if (currentIndex === -1) return;
      
      // Get next wallet in the list (cycle back to beginning if at end)
      const nextIndex = (currentIndex + 1) % wallets.length;
      const nextWallet = wallets[nextIndex];
      
      // Switch to the next wallet
      await selectWallet(nextWallet);
      
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
        usdcBalance,
        tenBalance,
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
        allWallets,
        selectWallet,
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
