import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, Contract, formatEther, formatUnits, parseEther, parseUnits } from 'ethers';
import { useAuth } from './AuthContext';
import { 
  CONTRACT_ADDRESSES, 
  ABIS, 
  type Property,
  type PropertyWithToken 
} from './contracts';

export const useContracts = () => {
  const { address, provider } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  useEffect(() => {
    const getChainId = async () => {
      if (provider) {
        const network = await provider.getNetwork();
        setChainId(Number(network.chainId));
      }
    };
    getChainId();
  }, [provider]);

  const isCorrectNetwork = chainId === 84532 || chainId === 11155111;

  const getContracts = useCallback(async () => {
    if (!provider || !address) throw new Error('Wallet not connected');
    
    const signer = await provider.getSigner();
    const isBaseSepolia = chainId === 84532;
    const addrs = isBaseSepolia ? CONTRACT_ADDRESSES.baseSepolia : CONTRACT_ADDRESSES.sepolia;

    return {
      propertyRegistry: new Contract(addrs.propertyRegistry, ABIS.propertyRegistry, signer),
      tenToken: new Contract(addrs.tenToken, ABIS.erc20, signer),
      yieldDistributor: new Contract(addrs.yieldDistributor, ABIS.yieldDistributor, signer),
      propertyRegistryReader: new Contract(addrs.propertyRegistry, ABIS.propertyRegistry, provider),
      tenTokenReader: new Contract(addrs.tenToken, ABIS.erc20, provider),
      yieldDistributorReader: new Contract(addrs.yieldDistributor, ABIS.yieldDistributor, provider),
      addresses: addrs,
    };
  }, [provider, address, chainId]);

  const getAllProperties = useCallback(async (): Promise<Property[]> => {
    if (!provider) return [];
    
    try {
      const isBaseSepolia = chainId === 84532;
      const addrs = isBaseSepolia ? CONTRACT_ADDRESSES.baseSepolia : CONTRACT_ADDRESSES.sepolia;
      const registry = new Contract(addrs.propertyRegistry, ABIS.propertyRegistry, provider);
      const properties = await registry.getAllProperties();
      return properties.map((p: any) => ({
        id: p.id,
        uri: p.uri,
        rentAmount: p.rentAmount,
        rentFrequency: p.rentFrequency,
        totalSupply: p.totalSupply,
        propertyToken: p.propertyToken,
        owner: p.owner,
        isActive: p.isActive,
      }));
    } catch (err) {
      console.error('Error fetching properties:', err);
      return [];
    }
  }, [provider, chainId]);

  const getProperty = useCallback(async (propertyId: number): Promise<Property | null> => {
    if (!provider) return null;
    
    try {
      const isBaseSepolia = chainId === 84532;
      const addrs = isBaseSepolia ? CONTRACT_ADDRESSES.baseSepolia : CONTRACT_ADDRESSES.sepolia;
      const registry = new Contract(addrs.propertyRegistry, ABIS.propertyRegistry, provider);
      const p = await registry.getProperty(propertyId);
      return {
        id: p.id,
        uri: p.uri,
        rentAmount: p.rentAmount,
        rentFrequency: p.rentFrequency,
        totalSupply: p.totalSupply,
        propertyToken: p.propertyToken,
        owner: p.owner,
        isActive: p.isActive,
      };
    } catch (err) {
      console.error('Error fetching property:', err);
      return null;
    }
  }, [provider, chainId]);

  const createProperty = useCallback(async (
    uri: string,
    rentAmount: string,
    rentFrequency: number,
    initialSupply: string,
    tokenName: string,
    tokenSymbol: string,
    valuationUsd: string
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const contracts = await getContracts();
      const tx = await contracts.propertyRegistry.createProperty(
        uri,
        parseUnits(rentAmount, 6),
        rentFrequency,
        parseUnits(initialSupply, 18),
        tokenName,
        tokenSymbol,
        parseUnits(valuationUsd, 8)
      );
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getContracts]);

  const getTokenBalance = useCallback(async (tokenAddress: string, userAddress?: string): Promise<string> => {
    if (!provider) return '0';
    try {
      const token = new Contract(tokenAddress, ABIS.erc20, provider);
      const balance = await token.balanceOf(userAddress || address);
      return formatUnits(balance, 18);
    } catch (err) {
      console.error('Error getting token balance:', err);
      return '0';
    }
  }, [provider, address]);

  const getTENBalance = useCallback(async (): Promise<string> => {
    if (!provider || !address) return '0';
    try {
      const isBaseSepolia = chainId === 84532;
      const addrs = isBaseSepolia ? CONTRACT_ADDRESSES.baseSepolia : CONTRACT_ADDRESSES.sepolia;
      const token = new Contract(addrs.tenToken, ABIS.erc20, provider);
      const balance = await token.balanceOf(address);
      return formatUnits(balance, 18);
    } catch (err) {
      console.error('Error getting TEN balance:', err);
      return '0';
    }
  }, [provider, address, chainId]);

  const getPendingYield = useCallback(async (userAddress?: string): Promise<string> => {
    if (!provider) return '0';
    try {
      const isBaseSepolia = chainId === 84532;
      const addrs = isBaseSepolia ? CONTRACT_ADDRESSES.baseSepolia : CONTRACT_ADDRESSES.sepolia;
      const yieldDist = new Contract(addrs.yieldDistributor, ABIS.yieldDistributor, provider);
      const pending = await yieldDist.getUserTotalPendingYield(userAddress || address);
      return formatUnits(pending, 18);
    } catch (err) {
      console.error('Error getting pending yield:', err);
      return '0';
    }
  }, [provider, address, chainId]);

  const claimYield = useCallback(async (propertyId: number): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const contracts = await getContracts();
      const tx = await contracts.yieldDistributor.claimYield(propertyId);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getContracts]);

  const depositYield = useCallback(async (propertyId: number, amount: string): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const contracts = await getContracts();
      const tx = await contracts.yieldDistributor.depositYield(
        propertyId,
        parseUnits(amount, 18)
      );
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getContracts]);

  const buyTokens = useCallback(async (propertyTokenAddress: string, amount: string): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const isBaseSepolia = chainId === 84532;
      const addrs = isBaseSepolia ? CONTRACT_ADDRESSES.baseSepolia : CONTRACT_ADDRESSES.sepolia;
      const tenToken = new Contract(addrs.tenToken, ABIS.erc20, provider);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      const token = new Contract(propertyTokenAddress, ABIS.erc20, signer);
      const amountWei = parseUnits(amount, 18);
      
      const pricePerToken = parseUnits('1.05', 18);
      const totalCost = amountWei * pricePerToken / parseEther('1');
      
      const tx = await tenToken.transfer(userAddress, amountWei);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [provider, chainId, getContracts]);

  return {
    isLoading,
    error,
    chainId,
    isCorrectNetwork,
    getContracts,
    getAllProperties,
    getProperty,
    createProperty,
    getTokenBalance,
    getTENBalance,
    getPendingYield,
    claimYield,
    depositYield,
    buyTokens,
  };
};
