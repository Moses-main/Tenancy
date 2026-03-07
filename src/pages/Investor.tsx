import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import KYCVerification from '../components/KYCVerification';
import { Coins, ArrowDownToLine, ArrowRightLeft, TrendingUp, Building, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useContracts } from '../lib/useContracts';
import { useAuth } from '../lib/AuthContext';
import { useKYC } from '../lib/KYCContext';
import { canInvestAmount } from '../lib/kycPolicy';
import { getExplorerUrl } from '../lib/contracts';
import {
  createSettlementReceipt,
  getSettlementReceiptsForWallet,
  patchSettlementReceipt,
  upsertSettlementReceipt,
  type SettlementReceipt,
} from '../lib/settlementReceipts';
import { validateField } from '../lib/validation';
import { ethers } from 'ethers';
const { formatUnits, parseUnits } = ethers.utils;
import { Link } from 'react-router-dom';

interface PropertyDisplay {
  id: number;
  name: string;
  address: string;
  imageUrl: string | null;
  yield: string;
  price: string;
  tokensAvailable: string;
  rent: string;
  propertyToken: string;
  owner: string;
}

export default function InvestorDashboard() {
  const { isAuthenticated, address, isCorrectNetwork } = useAuth();
  const { kycData } = useKYC();
  const { 
    getAllProperties, 
    getTENBalance, 
    getPendingYield, 
    claimYield,
    buyPropertyTokens,
    getMarketplaceListings,
    getUserDistributions,
    getClaimableDistributionIds,
    getUserPropertyTokens,
    isLoading: contractLoading,
    chainId
  } = useContracts();
  
  const [properties, setProperties] = useState<PropertyDisplay[]>([]);
  const [userPropertyTokens, setUserPropertyTokens] = useState<any[]>([]);
  const [tenBalance, setTenBalance] = useState('0');
  const [pendingYield, setPendingYield] = useState('0');
  const [distributions, setDistributions] = useState<any[]>([]);
  const [claimableDistributionIds, setClaimableDistributionIds] = useState<number[]>([]);
  const [listingPrices, setListingPrices] = useState<Record<string, number>>({});
  const [listingInventory, setListingInventory] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [buyAmount, setBuyAmount] = useState('');
  const [isProcessingBuy, setIsProcessingBuy] = useState(false);
  const [isProcessingClaim, setIsProcessingClaim] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PropertyDisplay | null>(null);
  const [settlementHistory, setSettlementHistory] = useState<SettlementReceipt[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated || !isCorrectNetwork) {
        setIsLoading(false);
        return;
      }

      try {
        const props = await getAllProperties();
        
        const displayProps: PropertyDisplay[] = props.map((p: any, index: number) => {
          const rentUsd = parseFloat(formatUnits(p.rentAmount, 6));
          const supplyTokens = parseFloat(formatUnits(p.totalSupply, 18));
          const propertyValue = rentUsd * 12 * 10; // Cap rate valuation
          const apy = supplyTokens > 0 && propertyValue > 0 ? ((rentUsd * 12) / propertyValue * 100) : 0;
          
          return {
            id: Number(p.id),
            name: `Property #${Number(p.id)}`,
            address: p.uri || 'Location on file',
            imageUrl: p.uri && (p.uri.startsWith('http') || p.uri.startsWith('ipfs://')) ? p.uri : null,
            yield: `${apy.toFixed(1)}%`,
            price: `$${(propertyValue / 1000000).toFixed(2)}M`,
            tokensAvailable: supplyTokens.toLocaleString(),
            rent: `$${rentUsd.toLocaleString()}/mo`,
            propertyToken: p.propertyToken,
            owner: p.owner,
          };
        });
        
        const [balance, yield_, userDists, userProps, claimableIds, listings] = await Promise.all([
          getTENBalance(),
          getPendingYield(),
          getUserDistributions(),
          getUserPropertyTokens(),
          getClaimableDistributionIds(),
          getMarketplaceListings(),
        ]);
        setTenBalance(balance);
        setPendingYield(yield_);
        setDistributions(userDists || []);
        setUserPropertyTokens(userProps || []);
        setClaimableDistributionIds(claimableIds || []);
        const activeListings = (listings || []).filter((listing: any) => Boolean(listing?.isActive));
        const pricesByToken = activeListings.reduce((acc: Record<string, number>, listing: any) => {
          const token = String(listing.propertyToken).toLowerCase();
          const price = parseFloat(formatUnits(listing.pricePerToken, 6));
          if (!acc[token] || price < acc[token]) {
            acc[token] = price;
          }
          return acc;
        }, {});
        const inventoryByToken = activeListings.reduce((acc: Record<string, number>, listing: any) => {
          const token = String(listing.propertyToken).toLowerCase();
          const amount = parseFloat(formatUnits(listing.amount, 18));
          acc[token] = (acc[token] || 0) + amount;
          return acc;
        }, {});
        const propertiesWithInventory: PropertyDisplay[] = displayProps.map((property) => ({
          ...property,
          tokensAvailable: String(inventoryByToken[property.propertyToken.toLowerCase()] || 0),
        }));
        setProperties(propertiesWithInventory);
        setListingInventory(inventoryByToken);
        setListingPrices(pricesByToken);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, isCorrectNetwork, chainId, getAllProperties, getTENBalance, getPendingYield, getUserDistributions, getUserPropertyTokens, getClaimableDistributionIds, getMarketplaceListings]);

  useEffect(() => {
    if (!address) {
      setSettlementHistory([]);
      return;
    }
    setSettlementHistory(getSettlementReceiptsForWallet(address));
  }, [address]);

  const handleBuyTEN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;
    const amountError = validateField(buyAmount, { required: true, min: 1, max: 10_000_000 });
    if (amountError) {
      toast.error(`Buy amount: ${amountError}`);
      return;
    }
    const requestedUsd = parseFloat(buyAmount);
    const buyGate = canInvestAmount(kycData, requestedUsd);
    if (!buyGate.allowed) {
      toast.error(buyGate.reason || 'KYC policy blocks this purchase.');
      return;
    }
    
    setIsProcessingBuy(true);
    const toastId = toast.loading("Processing token purchase...");
    let settlementId: string | null = null;
    
    try {
      const selectedPrice = listingPrices[selectedProperty.propertyToken.toLowerCase()];
      const availableInventory = listingInventory[selectedProperty.propertyToken.toLowerCase()] || 0;
      if (!selectedPrice || selectedPrice <= 0) {
        throw new Error('No active listing price found for this property');
      }
      const tokenAmount = parseFloat(buyAmount) / selectedPrice;
      if (!Number.isFinite(tokenAmount) || tokenAmount <= 0) {
        throw new Error('Unable to compute token amount from quote');
      }
      if (tokenAmount > availableInventory) {
        throw new Error(`Requested amount exceeds active listed inventory (${availableInventory.toFixed(4)} TEN)`);
      }
      const sellerAddress = selectedProperty.owner || '0x0000000000000000000000000000000000000000';
      const settlement = address
        ? createSettlementReceipt({
            walletAddress: address,
            chainId: chainId || 84532,
            action: 'investor_buy',
            title: `Buy ${selectedProperty.name}`,
            subtitle: 'USDC -> TEN swap execution',
            amountUsdc: parseFloat(buyAmount).toFixed(2),
            amountTen: tokenAmount.toFixed(4),
            counterparty: sellerAddress,
            propertyToken: selectedProperty.propertyToken,
          })
        : null;
      if (settlement) {
        settlementId = settlement.id;
        upsertSettlementReceipt(settlement);
        setSettlementHistory(getSettlementReceiptsForWallet(address));
      }

      await buyPropertyTokens(
        selectedProperty.propertyToken,
        tokenAmount.toFixed(8),
        sellerAddress,
        {
          onPendingTx: (txHash) => {
            if (!settlement) return;
            patchSettlementReceipt(settlement.id, { status: 'pending', txHash, chainId: chainId || 84532 });
            setSettlementHistory(getSettlementReceiptsForWallet(address));
          },
          onConfirmedTx: (txHash) => {
            if (!settlement) return;
            patchSettlementReceipt(settlement.id, { status: 'confirmed', txHash, chainId: chainId || 84532 });
            setSettlementHistory(getSettlementReceiptsForWallet(address));
          },
        }
      );
      if (settlement) {
        patchSettlementReceipt(settlement.id, { status: 'settled' });
        setSettlementHistory(getSettlementReceiptsForWallet(address));
      }
      toast.update(toastId, { 
        render: `Successfully purchased ${tokenAmount.toFixed(4)} property tokens!`, 
        type: "success", 
        isLoading: false, 
        autoClose: 3000 
      });
      
      const balance = await getTENBalance();
      const userProps = await getUserPropertyTokens();
      setTenBalance(balance);
      setUserPropertyTokens(userProps);
      setBuyAmount('');
      setSelectedProperty(null);
    } catch (err: any) {
      if (settlementId) {
        patchSettlementReceipt(settlementId, {
          status: 'failed',
          errorMessage: err.message || 'Transaction failed',
        });
        setSettlementHistory(getSettlementReceiptsForWallet(address));
      }
      toast.update(toastId, { 
        render: err.message || "Transaction failed", 
        type: "error", 
        isLoading: false, 
        autoClose: 4000 
      });
    } finally {
      setIsProcessingBuy(false);
    }
  };

  const handleClaimYield = async () => {
    if (properties.length === 0) return;
    
    setIsProcessingClaim(true);
    const toastId = toast.loading("Claiming yield...");
    
    try {
      if (claimableDistributionIds.length === 0) {
        throw new Error('No claimable distributions found.');
      }

      for (const distributionId of claimableDistributionIds) {
        await claimYield(distributionId);
      }
      toast.update(toastId, { 
        render: `Yield claimed successfully from ${claimableDistributionIds.length} distribution${claimableDistributionIds.length > 1 ? 's' : ''}!`, 
        type: "success", 
        isLoading: false, 
        autoClose: 3000 
      });
      
      const [yield_, refreshedIds] = await Promise.all([getPendingYield(), getClaimableDistributionIds()]);
      setPendingYield(yield_);
      setClaimableDistributionIds(refreshedIds || []);
    } catch (err: any) {
      toast.update(toastId, { 
        render: err.message || "Claim failed", 
        type: "error", 
        isLoading: false, 
        autoClose: 4000 
      });
    } finally {
      setIsProcessingClaim(false);
    }
  };

  const activeListingPrices = Object.values(listingPrices).filter((price) => Number.isFinite(price) && price > 0);
  const benchmarkTenPrice = activeListingPrices.length > 0
    ? activeListingPrices.reduce((sum, price) => sum + price, 0) / activeListingPrices.length
    : null;
  const tenValueUSD = benchmarkTenPrice ? (parseFloat(tenBalance) * benchmarkTenPrice).toFixed(2) : null;
  const selectedPrice = selectedProperty ? listingPrices[selectedProperty.propertyToken.toLowerCase()] : null;
  const estimatedTen = buyAmount && selectedPrice && selectedPrice > 0
    ? (parseFloat(buyAmount) / selectedPrice).toFixed(4)
    : '';
  const buyGate = canInvestAmount(kycData, parseFloat(buyAmount || '0'));
  const getStatusClass = (status: SettlementReceipt['status']) => {
    if (status === 'settled') return 'bg-green-500/10 text-green-500';
    if (status === 'failed') return 'bg-red-500/10 text-red-500';
    if (status === 'confirmed') return 'bg-blue-500/10 text-blue-500';
    if (status === 'pending') return 'bg-yellow-500/10 text-yellow-500';
    return 'bg-muted text-muted-foreground';
  };

  if (!isCorrectNetwork) {
    return (
      <Layout>
        <div className="space-y-16">
          <section>
            <h1 className="text-3xl font-bold tracking-tight">Investor Portal</h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Manage your TEN holdings and claim verified rental yields.
            </p>
          </section>
          <div className="rounded-xl border-yellow-500/50 bg-yellow-500/10 p-6 text-center">
            <p className="text-yellow-500">
              Please switch to <strong>Base Sepolia</strong> network to use this feature.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-12 md:space-y-16">
        <section>
          <h1 className="text-3xl font-bold tracking-tight">Investor Portal</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Manage your TEN holdings and claim verified rental yields.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Your TEN Balance"
            value={`${parseFloat(tenBalance).toFixed(2)} TEN`}
            icon={Coins}
            description={tenValueUSD ? `≈ $${tenValueUSD} USD` : 'No live TEN quote'}
          />
          <StatCard
            title="Unclaimed Yield"
            value={`${parseFloat(pendingYield).toFixed(4)} TEN`}
            icon={TrendingUp}
            trend={parseFloat(pendingYield) > 0 ? "+Available" : undefined}
            trendUp={true}
          />
          {/* Yield claiming now works without verification requirements */}
          <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-center stat-card">
            <button
              onClick={handleClaimYield}
              disabled={isProcessingClaim || claimableDistributionIds.length === 0}
              className="w-full inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-12 px-6 gap-2 text-base"
            >
              {isProcessingClaim ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <ArrowDownToLine className="h-5 w-5" />
                  Claim All Yields
                </>
              )}
            </button>
          </div>
        </section>

        {/* Property Token Holdings */}
        {userPropertyTokens.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Your Property Investments</h2>
                <p className="text-sm text-muted-foreground mt-1">Property tokens you currently own and their earnings potential.</p>
              </div>
            </div>
            <div className="grid gap-4">
              {userPropertyTokens.map((token, index) => (
                <div key={index} className="rounded-xl border border-border bg-card p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-base sm:text-lg">{token.tokenName || `Property #${token.id}`}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">{token.tokenSymbol || 'PROP'}</p>
                      <p className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2">{parseFloat(token.balance).toFixed(2)} Tokens</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-xs sm:text-sm text-muted-foreground">Est. Monthly Yield</div>
                      <div className="text-base sm:text-lg font-semibold text-green-600">
                        ${(parseFloat(token.balance) * parseFloat(formatUnits(token.rentAmount || '0', 6)) / parseFloat(formatUnits(token.totalSupply || '1', 18)) * 0.833).toFixed(2)}
                      </div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">~10% APY</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight">Available Properties</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Browse and invest in tokenized rental streams.</p>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
            </div>
          ) : properties.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-6 sm:p-8 text-center">
              <Building className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-medium mb-2">No Properties Yet</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">Be the first to invest when properties are listed.</p>
              <Link to="/issuer" className="text-primary hover:underline text-xs sm:text-sm">
                Go to Issuer Portal to create properties
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
              {properties.map((property) => (
                <div 
                  key={property.id} 
                  className={`group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-all hover:shadow-xl hover:-translate-y-1 card-hover cursor-pointer`}
                  onClick={() => setSelectedProperty(property)}
                >
                  {property.imageUrl ? (
                    <div className="h-24 sm:h-28 md:h-32 relative">
                      <img 
                        src={property.imageUrl} 
                        alt={property.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <Building className="h-8 w-8 sm:h-10 sm:w-10 text-primary/40" />
                      </div>
                    </div>
                  ) : (
                    <div className="h-24 sm:h-28 md:h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative">
                      <Building className="h-8 w-8 sm:h-10 sm:w-10 text-primary/40" />
                    </div>
                  )}
                  <div className="absolute top-2 sm:top-3 md:top-4 right-2 sm:right-3 md:right-4">
                    <span className="inline-flex items-center rounded-full bg-background/80 backdrop-blur px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium">
                      {property.yield} APY
                    </span>
                  </div>
                  <div className="p-3 sm:p-4 md:p-6">
                    <h3 className="font-semibold text-sm sm:text-base lg:text-lg mb-1">{property.name}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">{property.address}</p>
                    <div className="grid grid-cols-3 gap-1 sm:gap-2 md:gap-4 mb-3 sm:mb-4">
                      <div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Value</p>
                        <p className="font-semibold text-xs sm:text-sm">{property.price}</p>
                      </div>
                      <div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Rent</p>
                        <p className="font-semibold text-xs sm:text-sm">{property.rent}</p>
                      </div>
                      <div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Available</p>
                        <p className="font-semibold text-xs sm:text-sm">{parseFloat(property.tokensAvailable).toLocaleString()} TEN</p>
                      </div>
                    </div>
                    <button
                      className="w-full inline-flex items-center justify-center rounded-lg text-xs sm:text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-8 sm:h-10 transition-all disabled:opacity-50"
                      disabled={parseFloat(property.tokensAvailable) <= 0}
                    >
                      {parseFloat(property.tokensAvailable) > 0 ? (
                        <>
                          <span className="hidden sm:inline">Buy Income Rights</span>
                          <span className="sm:hidden">Buy Rights</span>
                        </>
                      ) : (
                        <>
                          <span className="hidden sm:inline">No Active Listings</span>
                          <span className="sm:hidden">Sold Out</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 card-shadow">
            <div className="mb-6">
              <h2 className="text-xl font-semibold tracking-tight">Swap USDC for TEN</h2>
              <p className="text-sm text-muted-foreground mt-1">Get TEN tokens to invest in properties.</p>
            </div>
            {!buyGate.allowed && (
              <div className="mb-4">
                <KYCVerification requiredFor="invest" />
              </div>
            )}
            <form onSubmit={handleBuyTEN} className="space-y-4">
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>You Pay</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <input 
                      type="number"
                      min="1"
                      max="10000000"
                      step="0.01"
                      value={buyAmount}
                      onChange={(e) => setBuyAmount(e.target.value)}
                      className="bg-transparent text-3xl font-semibold outline-none w-full"
                      placeholder="0.0"
                    />
                    <div className="bg-background px-4 py-2 rounded-lg font-medium shadow-sm border">
                      USDC
                    </div>
                  </div>
                </div>

                <div className="flex justify-center -my-2 relative z-10">
                  <div className="bg-background border rounded-full p-2 shadow-sm">
                    <ArrowRightLeft className="h-4 w-4 rotate-90 text-muted-foreground" />
                  </div>
                </div>

                <div className="bg-muted/30 p-4 rounded-xl space-y-3 border border-border/50">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>You Receive (Estimated)</span>
                    <span>{selectedPrice ? `1 TEN = ${selectedPrice.toFixed(4)} USDC` : 'Select priced property'}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <input 
                      type="text"
                      readOnly
                      value={estimatedTen}
                      className="bg-transparent text-3xl font-semibold outline-none w-full text-muted-foreground"
                      placeholder="0.0"
                    />
                    <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium shadow-sm">
                      TEN
                    </div>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isProcessingBuy || !buyAmount || !selectedProperty || !buyGate.allowed}
                className="w-full inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-6 text-base disabled:opacity-50"
              >
                {isProcessingBuy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : !selectedProperty ? (
                  'Select a property first'
                ) : !buyGate.allowed ? (
                  'KYC Required to Buy'
                ) : (
                  'Swap USDC for TEN'
                )}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 card-shadow flex flex-col">
            <div className="mb-6">
              <h2 className="text-xl font-semibold tracking-tight">Your Yield History</h2>
              <p className="text-sm text-muted-foreground mt-1">View your past yield distributions.</p>
            </div>
            <div className="flex-1 overflow-auto">
              <div className="space-y-2">
                {distributions && distributions.length > 0 ? (
                  distributions.slice(0, 10).map((dist, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="space-y-1">
                        <p className="font-semibold text-green-500">+{parseFloat(dist.totalYield).toFixed(2)} TEN</p>
                        <p className="text-xs text-muted-foreground">
                          {dist.timestamp > 0 
                            ? new Date(dist.timestamp * 1000).toLocaleDateString() 
                            : 'Pending'}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                          dist.status === 2 ? 'bg-green-500/10 text-green-500' : 
                          dist.status === 1 ? 'bg-blue-500/10 text-blue-500' :
                          'bg-yellow-500/10 text-yellow-500'
                        }`}>
                          {dist.status === 2 ? 'Claimed' : dist.status === 1 ? 'Distributing' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No yield history yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Invest in properties to earn yield</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 card-shadow flex flex-col">
            <div className="mb-6">
              <h2 className="text-xl font-semibold tracking-tight">Settlement Timeline</h2>
              <p className="text-sm text-muted-foreground mt-1">Track transaction lifecycle from initiation to settlement.</p>
            </div>
            <div className="flex-1 overflow-auto">
              <div className="space-y-3">
                {settlementHistory.length > 0 ? (
                  settlementHistory.slice(0, 8).map((receipt) => (
                    <div key={receipt.id} className="rounded-lg border border-border p-3 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-sm">{receipt.title}</p>
                          <p className="text-xs text-muted-foreground">{receipt.subtitle || 'Settlement update'}</p>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getStatusClass(receipt.status)}`}>
                          {receipt.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{new Date(receipt.updatedAt).toLocaleString()}</span>
                        {receipt.txHash ? (
                          <a
                            href={receipt.txUrl || getExplorerUrl(chainId || 84532, undefined, receipt.txHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:text-primary"
                          >
                            Tx <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span>No tx hash yet</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No settlement receipts yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Your buy transactions will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-semibold mb-4">Buy from {selectedProperty.name}</h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Property</span>
                <span className="font-medium">{selectedProperty.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">APY</span>
                <span className="font-medium text-green-500">{selectedProperty.yield}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Available</span>
                <span className="font-medium">{parseFloat(selectedProperty.tokensAvailable).toLocaleString()} TEN</span>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount to Buy</label>
                <input
                  type="number"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                  placeholder="Enter amount"
                  min="1"
                  step="0.01"
                  max="10000000"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedProperty(null)}
                className="flex-1 inline-flex items-center justify-center rounded-lg text-sm font-medium border border-border hover:bg-muted h-11"
              >
                Cancel
              </button>
              <button
                onClick={handleBuyTEN}
                disabled={isProcessingBuy || !buyAmount || parseFloat(buyAmount) <= 0 || !buyGate.allowed}
                className="flex-1 inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-11 disabled:opacity-50"
              >
                {isProcessingBuy ? <Loader2 className="h-4 w-4 animate-spin" /> : !buyGate.allowed ? 'KYC Required' : 'Confirm Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
