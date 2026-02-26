import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, Contract, formatEther, formatUnits, parseEther, parseUnits } from 'ethers';
import { useAuth } from './AuthContext';
import { 
  CONTRACT_ADDRESSES, 
  ABIS, 
  type Property,
  type PropertyWithToken,
  type MarketplaceListing,
  type Lease
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
      marketplace: addrs.marketplace !== '0x0000000000000000000000000000000000000000' 
        ? new Contract(addrs.marketplace, ABIS.marketplace, signer) 
        : null,
      propertyRegistryReader: new Contract(addrs.propertyRegistry, ABIS.propertyRegistry, provider),
      tenTokenReader: new Contract(addrs.tenToken, ABIS.erc20, provider),
      yieldDistributorReader: new Contract(addrs.yieldDistributor, ABIS.yieldDistributor, provider),
      marketplaceReader: addrs.marketplace !== '0x0000000000000000000000000000000000000000'
        ? new Contract(addrs.marketplace, ABIS.marketplace, provider)
        : null,
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

  const getYieldPoolInfo = useCallback(async () => {
    if (!provider) return null;
    try {
      const isBaseSepolia = chainId === 84532;
      const addrs = isBaseSepolia ? CONTRACT_ADDRESSES.baseSepolia : CONTRACT_ADDRESSES.sepolia;
      const yieldDist = new Contract(addrs.yieldDistributor, ABIS.yieldDistributor, provider);
      
      const totalPool = await yieldDist.totalYieldPool();
      const totalDistributed = await yieldDist.totalDistributedYield();
      const isHealthy = await yieldDist.isSystemHealthy();
      const ethPrice = await yieldDist.getEthUsdPrice();
      
      return {
        totalPool: formatUnits(totalPool, 18),
        totalDistributed: formatUnits(totalDistributed, 18),
        isHealthy,
        ethPrice: formatUnits(ethPrice, 8),
      };
    } catch (err) {
      console.error('Error getting yield pool info:', err);
      return null;
    }
  }, [provider, chainId]);

  const getUserDistributions = useCallback(async (userAddress?: string): Promise<Array<{
    distributionId: number;
    propertyId: bigint;
    totalYield: string;
    distributedYield: string;
    holderBalance: string;
    status: number;
    timestamp: number;
  }>> => {
    if (!provider) return [];
    try {
      const isBaseSepolia = chainId === 84532;
      const addrs = isBaseSepolia ? CONTRACT_ADDRESSES.baseSepolia : CONTRACT_ADDRESSES.sepolia;
      const yieldDist = new Contract(addrs.yieldDistributor, ABIS.yieldDistributor, provider);
      
      const properties = await getAllProperties();
      const userAddr = userAddress || address;
      const distributions: Array<{
        distributionId: number;
        propertyId: bigint;
        totalYield: string;
        distributedYield: string;
        holderBalance: string;
        status: number;
        timestamp: number;
      }> = [];
      
      for (let i = 0; i < properties.length; i++) {
        try {
          const info = await yieldDist.getDistributionInfo(i);
          if (info && info.holders.includes(userAddr)) {
            const holderIndex = info.holders.indexOf(userAddr);
            distributions.push({
              distributionId: i,
              propertyId: info.propertyId,
              totalYield: formatUnits(info.totalYield, 18),
              distributedYield: formatUnits(info.distributedYield, 18),
              holderBalance: formatUnits(info.holderBalances[holderIndex], 18),
              status: Number(info.status),
              timestamp: Number(info.distributionTimestamp),
            });
          }
        } catch {
          continue;
        }
      }
      
      return distributions;
    } catch (err) {
      console.error('Error getting user distributions:', err);
      return [];
    }
  }, [provider, address, chainId, getAllProperties]);

  const claimAllYields = useCallback(async (): Promise<string[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const distributions = await getUserDistributions();
      const txHashes: string[] = [];
      
      for (const dist of distributions) {
        if (dist.status === 2) {
          try {
            const contracts = await getContracts();
            const tx = await contracts.yieldDistributor.claimYield(dist.distributionId);
            const receipt = await tx.wait();
            txHashes.push(receipt.hash);
          } catch (err) {
            console.error(`Error claiming yield for distribution ${dist.distributionId}:`, err);
          }
        }
      }
      
      return txHashes;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getContracts, getUserDistributions]);

  const USDC_ADDRESSES = {
    baseSepolia: '0x036CbD53846f34B88b1d4a2d8b9B7F7f3F9D3F9',
    sepolia: '0xda0d3FA677B08D2Afd00D8e23c4A79DC9eBd8C2',
  };

  const buyPropertyTokens = useCallback(async (
    propertyTokenAddress: string,
    amount: string,
    sellerAddress: string
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const signer = await provider.getSigner();
      const buyerAddress = await signer.getAddress();
      
      const isBaseSepolia = chainId === 84532;
      const usdcAddress = isBaseSepolia ? USDC_ADDRESSES.baseSepolia : USDC_ADDRESSES.sepolia;
      
      const propertyToken = new Contract(propertyTokenAddress, ABIS.erc20, signer);
      const amountWei = parseUnits(amount, 18);
      
      const pricePerToken = parseUnits('1.05', 6);
      const totalCost = (amountWei * pricePerToken) / parseUnits('1', 18);
      
      const usdcABI = [
        'function transferFrom(address from, address to, uint256 amount) returns (bool)',
        'function approve(address spender, uint256 amount) returns (bool)',
        'function allowance(address owner, address spender) view returns (uint256)',
        'function balanceOf(address account) view returns (uint256)',
      ];
      
      const usdc = new Contract(usdcAddress, usdcABI, signer);
      
      const buyerUSDCBalance = await usdc.balanceOf(buyerAddress);
      if (buyerUSDCBalance < totalCost) {
        throw new Error('Insufficient USDC balance. Please get USDC to proceed.');
      }
      
      const currentAllowance = await usdc.allowance(buyerAddress, propertyTokenAddress);
      if (currentAllowance < totalCost) {
        const approveTx = await usdc.approve(propertyTokenAddress, totalCost);
        await approveTx.wait();
      }
      
      const transferFromTx = await usdc.transferFrom(buyerAddress, sellerAddress, totalCost);
      await transferFromTx.wait();
      
      const mintTx = await propertyToken.transfer(buyerAddress, amountWei);
      const receipt = await mintTx.wait();
      
      return receipt.hash;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [provider, chainId]);

  const buyTokens = useCallback(async (propertyTokenAddress: string, amount: string): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const isBaseSepolia = chainId === 84532;
      const addrs = isBaseSepolia ? CONTRACT_ADDRESSES.baseSepolia : CONTRACT_ADDRESSES.sepolia;
      const propertyToken = new Contract(propertyTokenAddress, ABIS.erc20, provider);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      const amountWei = parseUnits(amount, 18);
      
      const balance = await propertyToken.balanceOf(addrs.tenToken);
      if (balance < amountWei) {
        throw new Error('Insufficient property tokens available');
      }
      
      const tenToken = new Contract(addrs.tenToken, ABIS.erc20, signer);
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

  const getMarketplaceListings = useCallback(async (): Promise<MarketplaceListing[]> => {
    if (!provider) return [];
    
    try {
      const isBaseSepolia = chainId === 84532;
      const addrs = isBaseSepolia ? CONTRACT_ADDRESSES.baseSepolia : CONTRACT_ADDRESSES.sepolia;
      
      if (!addrs.marketplace || addrs.marketplace === '0x0000000000000000000000000000000000000000') {
        console.warn('Marketplace not deployed');
        return [];
      }
      
      const marketplace = new Contract(addrs.marketplace, ABIS.marketplace, provider);
      const listings = await marketplace.getListings();
      
      return listings.map((l: any) => ({
        id: l.id,
        seller: l.seller,
        propertyToken: l.propertyToken,
        amount: l.amount,
        pricePerToken: l.pricePerToken,
        totalPrice: l.totalPrice,
        isActive: l.isActive,
        createdAt: l.createdAt,
      }));
    } catch (err) {
      console.error('Error fetching marketplace listings:', err);
      return [];
    }
  }, [provider, chainId]);

  const createMarketplaceListing = useCallback(async (
    propertyToken: string,
    amount: string,
    pricePerToken: string
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const contracts = await getContracts();
      if (!contracts.marketplace) {
        throw new Error('Marketplace not deployed');
      }
      
      const propertyTokenContract = new Contract(propertyToken, ABIS.erc20, await provider.getSigner());
      const amountWei = parseUnits(amount, 18);
      const priceWei = parseUnits(pricePerToken, 18);
      
      const allowance = await propertyTokenContract.allowance(address, contracts.marketplace.target);
      if (allowance < amountWei) {
        const approveTx = await propertyTokenContract.approve(contracts.marketplace.target, amountWei);
        await approveTx.wait();
      }
      
      const tx = await contracts.marketplace.createListing(propertyToken, amountWei, priceWei);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [provider, address, chainId, getContracts]);

  const buyMarketplaceListing = useCallback(async (listingId: number): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const contracts = await getContracts();
      if (!contracts.marketplace) {
        throw new Error('Marketplace not deployed');
      }
      
      const tx = await contracts.marketplace.buyListing(listingId, { value: parseEther('0.01') });
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getContracts]);

  const cancelMarketplaceListing = useCallback(async (listingId: number): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const contracts = await getContracts();
      if (!contracts.marketplace) {
        throw new Error('Marketplace not deployed');
      }
      
      const tx = await contracts.marketplace.cancelListing(listingId);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getContracts]);

  const getLeases = useCallback(async (userAddress?: string): Promise<Lease[]> => {
    if (!provider) return [];
    
    try {
      const properties = await getAllProperties();
      const userAddr = userAddress || address;
      
      if (!userAddr) return [];
      
      const leases: Lease[] = [];
      
      for (const prop of properties) {
        const propertyToken = new Contract(prop.propertyToken, ABIS.erc20, provider);
        const balance = await propertyToken.balanceOf(userAddr);
        
        if (balance > 0) {
          leases.push({
            id: prop.id,
            propertyId: prop.id,
            tenant: userAddr,
            monthlyRent: prop.rentAmount,
            rentDueDate: BigInt(Date.now() + 30 * 24 * 60 * 60 * 1000),
            lastPaymentDate: BigInt(Date.now() - 15 * 24 * 60 * 60 * 1000),
            status: 1,
            createdAt: BigInt(Date.now()),
          });
        }
      }
      
      return leases;
    } catch (err) {
      console.error('Error fetching user leases:', err);
      return [];
    }
  }, [provider, address, getAllProperties]);

  const payRent = useCallback(async (propertyId: number, amount: string): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const properties = await getAllProperties();
      const property = properties.find((p: Property) => Number(p.id) === propertyId);
      
      if (!property) {
        throw new Error('Property not found');
      }
      
      const isBaseSepolia = chainId === 84532;
      const addrs = isBaseSepolia ? CONTRACT_ADDRESSES.baseSepolia : CONTRACT_ADDRESSES.sepolia;
      
      const usdcABI = [
        'function transfer(address to, uint256 amount) returns (bool)',
        'function approve(address spender, uint256 amount) returns (bool)',
        'function allowance(address owner, address spender) view returns (uint256)',
        'function balanceOf(address account) view returns (uint256)',
      ];
      
      const usdcAddress = isBaseSepolia ? '0x036CbD53846f34B88b1d4a2d8b9B7F7f3F9D3F9' : '0xda0d3FA677B08D2Afd00D8e23c4A79DC9eBd8C2';
      const signer = await provider.getSigner();
      const usdc = new Contract(usdcAddress, usdcABI, signer);
      
      const amountWei = parseUnits(amount, 6);
      const balance = await usdc.balanceOf(address);
      
      if (balance < amountWei) {
        throw new Error('Insufficient USDC balance');
      }
      
      const tx = await usdc.transfer(property.owner, amountWei);
      const receipt = await tx.wait();
      
      return receipt.hash;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [provider, address, chainId, getAllProperties]);

  const getAgentStatus = useCallback(async () => {
    if (!provider) return null;
    
    try {
      const isBaseSepolia = chainId === 84532;
      const addrs = isBaseSepolia ? CONTRACT_ADDRESSES.baseSepolia : CONTRACT_ADDRESSES.sepolia;
      const yieldDistributor = new Contract(addrs.yieldDistributor, ABIS.yieldDistributor, provider);
      
      const [lastRun, totalPool, totalDistributed, lastPrice] = await Promise.all([
        yieldDistributor.lastDistributionTimestamp(),
        yieldDistributor.totalYieldPool(),
        yieldDistributor.totalDistributedYield(),
        yieldDistributor.getEthUsdPrice().catch(() => 0n),
      ]);
      
      const nextRun = Number(lastRun) + 86400;
      
      return {
        lastRun: Number(lastRun) > 0 ? new Date(Number(lastRun) * 1000).toISOString() : null,
        nextRun: new Date(nextRun * 1000).toISOString(),
        isRunning: false,
        totalRuns: Number(lastRun) > 0 ? Math.floor(Number(lastRun) / 86400) : 0,
        totalYieldPool: formatUnits(totalPool, 18),
        totalDistributed: formatUnits(totalDistributed, 18),
        ethUsdPrice: Number(lastPrice) / 1e8,
      };
    } catch (err) {
      console.error('Error fetching agent status:', err);
      return null;
    }
  }, [provider, chainId]);

  const getAgentDecisions = useCallback(async (propertyIds: number[]) => {
    if (!provider) return [];
    
    try {
      const isBaseSepolia = chainId === 84532;
      const addrs = isBaseSepolia ? CONTRACT_ADDRESSES.baseSepolia : CONTRACT_ADDRESSES.sepolia;
      const yieldDistributor = new Contract(addrs.yieldDistributor, ABIS.yieldDistributor, provider);
      
      const decisions = await Promise.all(
        propertyIds.map(async (propertyId) => {
          try {
            const decision = await yieldDistributor.getAgentDecision(propertyId);
            return {
              propertyId: decision.propId.toString(),
              action: Number(decision.action),
              adjustmentPercent: Number(decision.adjustmentPercent),
              reason: decision.reason,
              confidence: Number(decision.confidence),
              executed: decision.executed,
              timestamp: Number(decision.timestamp) * 1000,
            };
          } catch {
            return null;
          }
        })
      );
      
      return decisions.filter(Boolean);
    } catch (err) {
      console.error('Error fetching agent decisions:', err);
      return [];
    }
  }, [provider, chainId]);

  const getYieldStats = useCallback(async () => {
    if (!provider) return null;
    
    try {
      const isBaseSepolia = chainId === 84532;
      const addrs = isBaseSepolia ? CONTRACT_ADDRESSES.baseSepolia : CONTRACT_ADDRESSES.sepolia;
      const yieldDistributor = new Contract(addrs.yieldDistributor, ABIS.yieldDistributor, provider);
      
      const [totalPool, totalDistributed, price, health, risk] = await Promise.all([
        yieldDistributor.totalYieldPool(),
        yieldDistributor.totalDistributedYield(),
        yieldDistributor.getEthUsdPrice().catch(() => 0n),
        yieldDistributor.checkReserveHealth().catch(() => ({ isHealthy: true, totalReserve: 0n, requiredReserve: 0n })),
        yieldDistributor.getRiskMetrics().catch(() => ({ totalDefaults: 0n, defaultRatio: 0n, reserveRatio: 0n, safeguardActive: false, lastRiskCheck: 0n })),
      ]);
      
      return {
        totalYieldPool: formatUnits(totalPool, 18),
        totalDistributed: formatUnits(totalDistributed, 18),
        ethUsdPrice: Number(price) / 1e8,
        isHealthy: health.isHealthy,
        totalReserve: formatUnits(health.totalReserve, 18),
        requiredReserve: formatUnits(health.requiredReserve, 18),
        totalDefaults: Number(risk.totalDefaults),
        safeguardActive: risk.safeguardActive,
      };
    } catch (err) {
      console.error('Error fetching yield stats:', err);
      return null;
    }
  }, [provider, chainId]);

  const getEthUsdPrice = useCallback(async (): Promise<number | null> => {
    if (!provider) return null;
    
    try {
      const isBaseSepolia = chainId === 84532;
      const addrs = isBaseSepolia ? CONTRACT_ADDRESSES.baseSepolia : CONTRACT_ADDRESSES.sepolia;
      const yieldDistributor = new Contract(addrs.yieldDistributor, ABIS.yieldDistributor, provider);
      
      const price = await yieldDistributor.getEthUsdPrice();
      return Number(price) / 1e8;
    } catch (err) {
      console.error('Error fetching ETH/USD price:', err);
      return null;
    }
  }, [provider, chainId]);

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
    getYieldPoolInfo,
    getUserDistributions,
    claimAllYields,
    buyTokens,
    buyPropertyTokens,
    getMarketplaceListings,
    createMarketplaceListing,
    buyMarketplaceListing,
    cancelMarketplaceListing,
    getLeases,
    payRent,
    getAgentStatus,
    getAgentDecisions,
    getYieldStats,
    getEthUsdPrice,
  };
};
