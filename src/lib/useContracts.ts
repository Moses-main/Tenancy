import { useState, useEffect, useCallback } from 'react';
import { ethers, Contract } from 'ethers';

const { formatEther, formatUnits, parseUnits } = ethers.utils;

type Web3Provider = ethers.providers.Web3Provider;
import { useAuth } from './AuthContext';
import { 
  CONTRACT_ADDRESSES, 
  ABIS, 
  type Property,
  type PropertyWithToken,
  type MarketplaceListing,
  type Lease
} from './contracts';

type DecodedDistributionInfo = {
  propertyId: bigint;
  totalYield: any;
  distributedYield: any;
  status: number;
  distributionTimestamp: any;
  holderBalances: any[];
  holders: string[];
};

const decodeDistributionInfo = (raw: any): DecodedDistributionInfo | null => {
  if (!raw) return null;
  const holders = Array.isArray(raw.holders) ? raw.holders : [];
  const holderBalances = Array.isArray(raw.holderBalances) ? raw.holderBalances : [];
  // Make decoding more lenient - handle edge cases where arrays might be empty or different lengths
  if (
    raw.propertyId === undefined ||
    raw.totalYield === undefined ||
    raw.distributedYield === undefined ||
    raw.status === undefined ||
    raw.distributionTimestamp === undefined
  ) {
    return null;
  }

  return {
    propertyId: raw.propertyId,
    totalYield: raw.totalYield,
    distributedYield: raw.distributedYield,
    status: Number(raw.status),
    distributionTimestamp: raw.distributionTimestamp,
    holderBalances,
    holders: holders.map((holder: string) => holder.toLowerCase()),
  };
};

const isInvalidConfiguredAddress = (address?: string) => {
  if (!address) return true;
  if (!ethers.utils.isAddress(address)) return true;
  return /^0x0{40}$/i.test(address);
};

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
    if (chainId === null) throw new Error('Network not detected yet. Please wait and try again.');

    const signer = await provider.getSigner();
    const isBaseSepolia = chainId === 84532;
    const addrs = isBaseSepolia ? CONTRACT_ADDRESSES.baseSepolia : CONTRACT_ADDRESSES.sepolia;
    const invalidCore = ['propertyRegistry', 'tenToken', 'yieldDistributor'].filter((key) =>
      isInvalidConfiguredAddress((addrs as any)[key])
    );
    if (invalidCore.length > 0) {
      throw new Error(`Deployment config invalid for ${invalidCore.join(', ')} on this network.`);
    }

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
    if (!provider || chainId === null) return [];

    try {
      // Wait for provider to be ready
      if (!provider.ready) {
        await provider.ready;
      }

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
    } catch (err: any) {
      console.error('Error fetching properties:', err?.message || err);
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
      
      // Wait for transaction with better error handling
      let receipt;
      try {
        receipt = await tx.wait();
      } catch (waitError: any) {
        console.error('Transaction wait error:', waitError);
        // Try to get transaction hash even if receipt fails
        if (tx.hash) {
          return tx.hash;
        }
        throw new Error(`Transaction failed: ${waitError.message || 'Unknown error'}`);
      }
      
      // Ensure we always return a valid hash (ethers v5 uses transactionHash, v6 uses hash)
      const receiptHash = (receipt as any)?.transactionHash || (receipt as any)?.hash;
      if (!receipt || !receiptHash) {
        // Fallback to transaction hash if available
        if (tx.hash) {
          console.warn('No receipt but transaction hash available:', tx.hash);
          return tx.hash;
        }
        throw new Error('Transaction completed but no receipt hash available');
      }

      return receiptHash;
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

  const getUserPropertyTokens = useCallback(async (): Promise<any[]> => {
    if (!provider || !address) return [];
    try {
      const contracts = await getContracts();
      const props = await contracts.propertyRegistry.getAllProperties();
      
      console.log('All properties:', props.map(p => ({ id: p.id, owner: p.owner, currentUser: address })));
      
      const tokenBalances = await Promise.all(
        props.map(async (p: any) => {
          const balance = await getTokenBalance(p.propertyToken, address);
          return {
            ...p,
            balance: balance,
            tokenAddress: p.propertyToken,
            tokenName: await getTokenName(p.propertyToken),
            tokenSymbol: await getTokenSymbol(p.propertyToken)
          };
        })
      );
      
      const userTokens = tokenBalances.filter((t: any) => parseFloat(t.balance) > 0);
      
      console.log('User token balances:', userTokens.map(t => ({ id: t.id, name: t.tokenName, balance: t.balance })));
      return userTokens;
    } catch (err) {
      console.error('Error getting property tokens:', err);
      return [];
    }
  }, [provider, address, getContracts, getTokenBalance]);

  // Helper function to create and list property immediately
  const createAndListProperty = useCallback(async (
    uri: string,
    rentAmount: string,
    rentFrequency: number,
    initialSupply: string,
    tokenName: string,
    tokenSymbol: string,
    valuationUsd: string,
    listingAmount: string,
    pricePerToken: string
  ): Promise<{ propertyToken: string; listingId: string; txHash: string }> => {
    if (!provider || !address) throw new Error('Wallet not connected');

    try {
      const contracts = await getContracts();

      const tx = await contracts.propertyRegistry.createAndListProperty(
        uri,
        parseUnits(rentAmount, 6),
        rentFrequency,
        parseUnits(initialSupply, 18),
        tokenName,
        tokenSymbol,
        parseUnits(valuationUsd, 8),
        parseUnits(listingAmount, 18),
        parseUnits(pricePerToken, 18)
      );

      const receipt = await tx.wait();
      // ethers v5 uses receipt.transactionHash; ethers v6 uses receipt.hash
      const txHash = (receipt as any)?.transactionHash || (receipt as any)?.hash || tx.hash;
      if (!txHash) {
        throw new Error('Transaction failed');
      }

      // Parse events - fall back gracefully if ethers v5 doesn't populate them
      const propertyToken = receipt.events?.find((e: any) => e.event === 'PropertyCreated')?.args?.propertyToken ?? '';
      const listingIdRaw = receipt.events?.find((e: any) => e.event === 'ImmediateListingCreated')?.args?.listingId;
      const listingId = listingIdRaw ? listingIdRaw.toString() : '0';

      console.log('Property created and listed:', { propertyToken, listingId, txHash });
      return { propertyToken, listingId, txHash };
    } catch (err: any) {
      console.error('Error creating and listing property:', err);
      throw err;
    }
  }, [provider, address, getContracts]);

  const getTokenName = useCallback(async (tokenAddress: string): Promise<string> => {
    try {
      const token = new Contract(tokenAddress, ABIS.erc20, provider);
      return await token.name();
    } catch (err) {
      console.error('Error getting token name:', err);
      return 'Unknown Token';
    }
  }, [provider]);

  const getTokenSymbol = useCallback(async (tokenAddress: string): Promise<string> => {
    try {
      const token = new Contract(tokenAddress, ABIS.erc20, provider);
      return await token.symbol();
    } catch (err) {
      console.error('Error getting token symbol:', err);
      return 'UNK';
    }
  }, [provider]);

  const getTENBalance = useCallback(async (): Promise<string> => {
    if (!provider || !address) return '0';
    try {
      const isBaseSepolia = chainId === 84532;
      const addrs = isBaseSepolia ? CONTRACT_ADDRESSES.baseSepolia : CONTRACT_ADDRESSES.sepolia;
      
      if (!addrs.tenToken || addrs.tenToken === '0x0000000000000000000000000000000000000000') {
        console.warn('TEN Token not deployed on this network');
        return '0';
      }
      
      const token = new Contract(addrs.tenToken, ABIS.erc20, provider);
      const code = await provider.getCode(addrs.tenToken);
      if (code === '0x') {
        console.warn('TEN Token contract not found at address:', addrs.tenToken);
        return '0';
      }
      
      const balance = await token.balanceOf(address);
      return formatUnits(balance, 18);
    } catch (err: any) {
      console.error('Error getting TEN balance:', err?.message || err);
      return '0';
    }
  }, [provider, address, chainId]);

  const getPendingYield = useCallback(async (userAddress?: string): Promise<string> => {
    if (!provider || chainId === null) return '0';
    try {
      const isBaseSepolia = chainId === 84532;
      const addrs = isBaseSepolia ? CONTRACT_ADDRESSES.baseSepolia : CONTRACT_ADDRESSES.sepolia;

      if (!addrs.yieldDistributor || addrs.yieldDistributor === '0x0000000000000000000000000000000000000000') {
        return '0';
      }

      const code = await provider.getCode(addrs.yieldDistributor);
      if (code === '0x') {
        console.warn('YieldDistributor contract not found at address:', addrs.yieldDistributor);
        return '0';
      }

      const userAddr = (userAddress || address || '').toLowerCase();
      if (!userAddr) return '0';

      const yieldDist = new Contract(addrs.yieldDistributor, ABIS.yieldDistributor, provider);
      const claimableIds = await yieldDist.getClaimableDistributionIds(userAddr);
      let pendingTotal = ethers.BigNumber.from(0);

      for (const distributionId of claimableIds) {
        try {
          const rawInfo = await yieldDist.getDistributionInfo(distributionId);
          const info = decodeDistributionInfo(rawInfo);
          if (!info || info.holders.length === 0) continue;

          const holderIndex = info.holders.findIndex((holder) => holder === userAddr);
          if (holderIndex < 0 || !info.holderBalances[holderIndex]) continue;
          pendingTotal = pendingTotal.add(info.holderBalances[holderIndex]);
        } catch {
          continue;
        }
      }

      return formatUnits(pendingTotal, 18);
    } catch (err: any) {
      console.error('Error getting pending yield:', err?.message || err);
      return '0';
    }
  }, [provider, chainId, address]);

  const claimYield = useCallback(async (distributionId: number): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const contracts = await getContracts();
      const tx = await contracts.yieldDistributor.claimYield(distributionId);
      const receipt = await tx.wait();
      return (receipt as any)?.transactionHash || (receipt as any)?.hash || tx.hash;
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
      return (receipt as any)?.transactionHash || (receipt as any)?.hash || tx.hash;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getContracts]);

  const getYieldPoolInfo = useCallback(async () => {
    if (!provider || chainId === null) return null;
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
      
      const userAddr = (userAddress || address || '').toLowerCase();
      if (!userAddr) return [];
      const distributionCount = Number(await yieldDist.distributionCount());
      const distributions: Array<{
        distributionId: number;
        propertyId: bigint;
        totalYield: string;
        distributedYield: string;
        holderBalance: string;
        status: number;
        timestamp: number;
      }> = [];
      
      for (let i = 0; i < distributionCount; i++) {
        try {
          const rawInfo = await yieldDist.getDistributionInfo(i);
          const info = decodeDistributionInfo(rawInfo);
          if (!info) continue;
          const holderIndex = info.holders.indexOf(userAddr);
          if (holderIndex >= 0) {
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
  }, [provider, address, chainId]);

  const getClaimableDistributionIds = useCallback(async (userAddress?: string): Promise<number[]> => {
    if (!provider) return [];
    try {
      const isBaseSepolia = chainId === 84532;
      const addrs = isBaseSepolia ? CONTRACT_ADDRESSES.baseSepolia : CONTRACT_ADDRESSES.sepolia;
      const yieldDist = new Contract(addrs.yieldDistributor, ABIS.yieldDistributor, provider);
      const userAddr = userAddress || address;
      if (!userAddr) return [];
      const distributionIds = await yieldDist.getClaimableDistributionIds(userAddr);
      return distributionIds.map((id: any) => Number(id));
    } catch (err) {
      console.error('Error getting claimable distribution IDs:', err);
      return [];
    }
  }, [provider, address, chainId]);

  const claimAllYields = useCallback(async (): Promise<string[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const claimableIds = await getClaimableDistributionIds();
      const txHashes: string[] = [];
      
      for (const distributionId of claimableIds) {
        try {
          const contracts = await getContracts();
          const tx = await contracts.yieldDistributor.claimYield(distributionId);
          const receipt = await tx.wait();
          txHashes.push((receipt as any)?.transactionHash || (receipt as any)?.hash || tx.hash);
        } catch (err) {
          console.error(`Error claiming yield for distribution ${distributionId}:`, err);
        }
      }
      
      return txHashes;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getContracts, getClaimableDistributionIds]);

  const USDC_ADDRESSES = {
    baseSepolia: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    sepolia: '0xda0d3FA677B08D2Afd00D8e23c4A79DC9eBd8C2',
  };
  const USDC_ABI = [
    'function transfer(address to, uint256 amount) returns (bool)',
    'function transferFrom(address from, address to, uint256 amount) returns (bool)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function balanceOf(address account) view returns (uint256)',
  ];

  const buyPropertyTokens = useCallback(async (
    propertyTokenAddress: string,
    amount: string,
    _sellerAddress: string,
    callbacks?: {
      onPendingTx?: (txHash: string) => void;
      onConfirmedTx?: (txHash: string) => void;
    }
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      if (!provider) throw new Error('Wallet not connected');
      const signer = await provider.getSigner();
      const buyerAddress = await signer.getAddress();

      const isBaseSepolia = chainId === 84532;
      const addrs = isBaseSepolia ? CONTRACT_ADDRESSES.baseSepolia : CONTRACT_ADDRESSES.sepolia;
      const usdcAddress = isBaseSepolia ? USDC_ADDRESSES.baseSepolia : USDC_ADDRESSES.sepolia;

      if (!addrs.marketplace || addrs.marketplace === '0x0000000000000000000000000000000000000000') {
        throw new Error('Marketplace is not deployed on this network');
      }

      const marketplace = new Contract(addrs.marketplace, ABIS.marketplace, signer);
      const amountWei = parseUnits(amount, 18);
      const listings = await marketplace.getActiveListings();
      console.log('Available listings:', listings.map((l: any) => ({
        id: l.id,
        propertyToken: l.propertyToken,
        seller: l.seller,
        amount: l.amount.toString(),
        buyer: buyerAddress
      })));
      
      const listing = listings.find((l: any) =>
        l.propertyToken.toLowerCase() === propertyTokenAddress.toLowerCase() &&
        ethers.BigNumber.from(l.amount.toString()).gte(amountWei)
      );

      if (!listing) {
        throw new Error('No active listing has enough tokens for this purchase');
      }

      const pricePerToken = ethers.BigNumber.from(listing.pricePerToken.toString());
      const totalCost = amountWei.mul(pricePerToken).div(parseUnits('1', 18));
      const usdc = new Contract(usdcAddress, USDC_ABI, signer);
      const buyerUSDCBalance = await usdc.balanceOf(buyerAddress);
      if (ethers.BigNumber.from(buyerUSDCBalance.toString()).lt(totalCost)) {
        throw new Error('Insufficient USDC balance. Please get USDC to proceed.');
      }

      const currentAllowance = await usdc.allowance(buyerAddress, addrs.marketplace);
      if (ethers.BigNumber.from(currentAllowance.toString()).lt(totalCost)) {
        const approveTx = await usdc.approve(addrs.marketplace, totalCost);
        await approveTx.wait();
      }

      const tx = await marketplace.buyListing(listing.id, amountWei);
      callbacks?.onPendingTx?.(tx.hash);
      const receipt = await tx.wait();
      const buyReceiptHash = (receipt as any)?.transactionHash || (receipt as any)?.hash || tx.hash;
      callbacks?.onConfirmedTx?.(buyReceiptHash);
      return buyReceiptHash;
    } catch (err: any) {
      console.error('Error in buyPropertyTokens:', err);
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
      const signer = provider?.getSigner();
      if (!signer) throw new Error('Wallet not connected');
      const propertyToken = new Contract(propertyTokenAddress, ABIS.erc20, signer);
      const userAddress = await signer.getAddress();
      
      const amountWei = parseUnits(amount, 18);
      
      const balance = await propertyToken.balanceOf(addrs.tenToken);
      if (balance < amountWei) {
        throw new Error('Insufficient property tokens available');
      }
      
      const tenToken = new Contract(addrs.tenToken, ABIS.erc20, signer);
      const tx = await tenToken.transfer(userAddress, amountWei);
      const receipt = await tx.wait();
      return (receipt as any)?.transactionHash || (receipt as any)?.hash || tx.hash;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [provider, chainId, getContracts]);

  const getMarketplaceListings = useCallback(async (): Promise<MarketplaceListing[]> => {
    if (!provider || chainId === null) return [];
    
    try {
      const isBaseSepolia = chainId === 84532;
      const addrs = isBaseSepolia ? CONTRACT_ADDRESSES.baseSepolia : CONTRACT_ADDRESSES.sepolia;
      
      if (!addrs.marketplace || addrs.marketplace === '0x0000000000000000000000000000000000000000') {
        console.warn('Marketplace not deployed');
        return [];
      }
      
      const marketplace = new Contract(addrs.marketplace, ABIS.marketplace, provider);
      const listings = await marketplace.getActiveListings();
      
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
      const priceWei = parseUnits(pricePerToken, 6);
      
      const marketplaceAddress = contracts.marketplace.address || contracts.marketplace.target;
      const allowance = await propertyTokenContract.allowance(address, marketplaceAddress);
      if (allowance.lt(amountWei)) {
        const approveTx = await propertyTokenContract.approve(marketplaceAddress, amountWei);
        await approveTx.wait();
      }
      
      const tx = await contracts.marketplace.createListing(propertyToken, amountWei, priceWei);
      const receipt = await tx.wait();
      return (receipt as any)?.transactionHash || (receipt as any)?.hash || tx.hash;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [provider, address, chainId, getContracts]);

  const buyMarketplaceListing = useCallback(async (
    listingId: number,
    amount?: string,
    callbacks?: {
      onPendingTx?: (txHash: string) => void;
      onConfirmedTx?: (txHash: string) => void;
    }
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      if (!provider) throw new Error('Wallet not connected');
      const contracts = await getContracts();
      if (!contracts.marketplace) {
        throw new Error('Marketplace not deployed');
      }

      const signer = await provider.getSigner();
      const buyerAddress = await signer.getAddress();
      const isBaseSepolia = chainId === 84532;
      const usdcAddress = isBaseSepolia ? USDC_ADDRESSES.baseSepolia : USDC_ADDRESSES.sepolia;
      const usdc = new Contract(usdcAddress, USDC_ABI, signer);

      const listings = await contracts.marketplace.getListings();
      const listing = listings.find((l: any) => Number(l.id) === listingId && Boolean(l.isActive));
      if (!listing) {
        throw new Error('Listing not found or inactive');
      }

      const amountWei = amount ? parseUnits(amount, 18) : ethers.BigNumber.from(listing.amount.toString());
      const listingAmount = ethers.BigNumber.from(listing.amount.toString());
      if (amountWei.lte(0) || amountWei.gt(listingAmount)) {
        throw new Error('Invalid buy amount');
      }

      const pricePerToken = ethers.BigNumber.from(listing.pricePerToken.toString());
      const totalCost = amountWei.mul(pricePerToken).div(parseUnits('1', 18));
      const balance = await usdc.balanceOf(buyerAddress);
      if (ethers.BigNumber.from(balance.toString()).lt(totalCost)) {
        throw new Error('Insufficient USDC balance');
      }

      const marketplaceAddress = contracts.marketplace.address || contracts.marketplace.target;
      const allowance = await usdc.allowance(buyerAddress, marketplaceAddress);
      if (ethers.BigNumber.from(allowance.toString()).lt(totalCost)) {
        const approveTx = await usdc.approve(marketplaceAddress, totalCost);
        await approveTx.wait();
      }

      const tx = await contracts.marketplace.buyListing(listingId, amountWei);
      callbacks?.onPendingTx?.(tx.hash);
      const receipt = await tx.wait();
      const receiptTxHash = (receipt as any)?.transactionHash || (receipt as any)?.hash || tx.hash;
      callbacks?.onConfirmedTx?.(receiptTxHash);
      return receiptTxHash;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [provider, chainId, getContracts]);

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
      return (receipt as any)?.transactionHash || (receipt as any)?.hash || tx.hash;
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
        
        if (ethers.BigNumber.from(balance.toString()).gt(0)) {
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
      
      const usdcAddress = isBaseSepolia ? USDC_ADDRESSES.baseSepolia : USDC_ADDRESSES.sepolia;
      const signer = await provider.getSigner();
      const usdc = new Contract(usdcAddress, usdcABI, signer);
      
      const amountWei = parseUnits(amount, 6);
      const balance = await usdc.balanceOf(address);
      
      if (balance < amountWei) {
        throw new Error('Insufficient USDC balance');
      }
      
      const tx = await usdc.transfer(property.owner, amountWei);
      const receipt = await tx.wait();

      return (receipt as any)?.transactionHash || (receipt as any)?.hash || tx.hash;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [provider, address, chainId, getAllProperties]);

  const getAgentStatus = useCallback(async () => {
    if (!provider || chainId === null) return null;
    
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
      
      // Agent runs every 30 minutes; nextRun = lastRun + 1800s
      const AGENT_INTERVAL_SECONDS = 1800;
      const nowSeconds = Math.floor(Date.now() / 1000);
      const lastRunSeconds = Number(lastRun);
      const nextRunSeconds = lastRunSeconds > 0
        ? lastRunSeconds + AGENT_INTERVAL_SECONDS
        : nowSeconds + AGENT_INTERVAL_SECONDS;

      return {
        lastRun: lastRunSeconds > 0 ? new Date(lastRunSeconds * 1000).toISOString() : null,
        nextRun: new Date(nextRunSeconds * 1000).toISOString(),
        isRunning: false,
        totalRuns: lastRunSeconds > 0 ? Math.floor((nowSeconds - lastRunSeconds) / AGENT_INTERVAL_SECONDS) + 1 : 0,
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
    if (!provider || chainId === null) return null;

    try {
      // Wait for provider to be ready
      if (!provider.ready) {
        await provider.ready;
      }
      
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
    } catch (err: any) {
      console.error('Error fetching yield stats:', err?.message || err);
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
    getAllProperties,
    createProperty,
    createAndListProperty,
    getTENBalance,
    getPendingYield,
    claimYield,
    buyPropertyTokens,
    getUserDistributions,
    getClaimableDistributionIds,
    getMarketplaceListings,
    createMarketplaceListing,
    buyMarketplaceListing,
    cancelMarketplaceListing,
    getUserPropertyTokens,
    getTokenBalance,
    getTokenName,
    getTokenSymbol,
    payRent,
    getAgentStatus,
    getAgentDecisions,
    getYieldStats,
    getEthUsdPrice,
    isLoading,
    error,
    chainId,
    isCorrectNetwork,
    getContracts,
  };
};
