import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import WorldIdVerify from '../components/WorldIdVerify';
import { Coins, ArrowDownToLine, ArrowRightLeft, TrendingUp, Building, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useContracts } from '../lib/useContracts';
import { useAuth } from '../lib/AuthContext';
import { ethers } from 'ethers';
const { formatUnits, parseUnits } = ethers.utils;
import { Link } from 'react-router-dom';

interface PropertyDisplay {
  id: number;
  name: string;
  address: string;
  yield: string;
  price: string;
  tokensAvailable: string;
  rent: string;
  propertyToken: string;
  owner: string;
}

export default function InvestorDashboard() {
  const { isAuthenticated, address, isCorrectNetwork } = useAuth();
  const { 
    getAllProperties, 
    getTENBalance, 
    getPendingYield, 
    claimYield,
    buyPropertyTokens,
    getUserDistributions,
    isLoading: contractLoading,
    chainId
  } = useContracts();
  
  const [properties, setProperties] = useState<PropertyDisplay[]>([]);
  const [tenBalance, setTenBalance] = useState('0');
  const [pendingYield, setPendingYield] = useState('0');
  const [distributions, setDistributions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [buyAmount, setBuyAmount] = useState('');
  const [isProcessingBuy, setIsProcessingBuy] = useState(false);
  const [isProcessingClaim, setIsProcessingClaim] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PropertyDisplay | null>(null);
  const [worldIdVerified, setWorldIdVerified] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated || !isCorrectNetwork) {
        setIsLoading(false);
        return;
      }

      try {
        const props = await getAllProperties();
        
        const displayProps: PropertyDisplay[] = props.map((p: any, index: number) => ({
          id: Number(p.id),
          name: `Property #${Number(p.id)}`,
          address: p.uri || 'Location on file',
          yield: `${(7 + (index % 3)).toFixed(1)}%`,
          price: `$${(parseFloat(formatUnits(p.totalSupply, 18)) * 1.05 / 1000000).toFixed(1)}M`,
          tokensAvailable: parseFloat(formatUnits(p.totalSupply, 18)).toLocaleString(),
          rent: `$${(parseFloat(formatUnits(p.rentAmount, 6)) / 100).toFixed(0)}/mo`,
          propertyToken: p.propertyToken,
          owner: p.owner,
        }));
        
        setProperties(displayProps);

        const [balance, yield_, userDists] = await Promise.all([
          getTENBalance(),
          getPendingYield(),
          getUserDistributions(),
        ]);
        setTenBalance(balance);
        setPendingYield(yield_);
        setDistributions(userDists || []);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, isCorrectNetwork, chainId, getAllProperties, getTENBalance, getPendingYield, getUserDistributions]);

  const handleBuyTEN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyAmount || parseFloat(buyAmount) <= 0 || !selectedProperty) return;
    
    setIsProcessingBuy(true);
    const toastId = toast.loading("Processing token purchase...");
    
    try {
      const sellerAddress = selectedProperty.owner || '0x0000000000000000000000000000000000000000';
      const txHash = await buyPropertyTokens(selectedProperty.propertyToken, buyAmount, sellerAddress);
      toast.update(toastId, { 
        render: `Successfully purchased ${buyAmount} property tokens!`, 
        type: "success", 
        isLoading: false, 
        autoClose: 3000 
      });
      
      const balance = await getTENBalance();
      setTenBalance(balance);
      setBuyAmount('');
      setSelectedProperty(null);
    } catch (err: any) {
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
    
    if (!worldIdVerified) {
      toast.error('Please verify with World ID first');
      return;
    }
    
    setIsProcessingClaim(true);
    const toastId = toast.loading("Claiming yield...");
    
    try {
      for (const prop of properties) {
        await claimYield(prop.id);
      }
      toast.update(toastId, { 
        render: "Yield claimed successfully!", 
        type: "success", 
        isLoading: false, 
        autoClose: 3000 
      });
      
      setWorldIdVerified(false);
      const yield_ = await getPendingYield();
      setPendingYield(yield_);
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

  const tenValueUSD = (parseFloat(tenBalance) * 1.05).toFixed(2);

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
            description={`≈ $${tenValueUSD} USD`}
          />
          <StatCard
            title="Unclaimed Yield"
            value={`${parseFloat(pendingYield).toFixed(4)} TEN`}
            icon={TrendingUp}
            trend={parseFloat(pendingYield) > 0 ? "+Available" : undefined}
            trendUp={true}
          />
          {!worldIdVerified && (
            <div className="col-span-full">
              <WorldIdVerify
                actionName="claim-yield"
                onVerified={() => setWorldIdVerified(true)}
              />
            </div>
          )}
          <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-center stat-card">
            <button
              onClick={handleClaimYield}
              disabled={isProcessingClaim || parseFloat(pendingYield) === 0 || !worldIdVerified}
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

        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Available Properties</h2>
              <p className="text-sm text-muted-foreground mt-1">Browse and invest in tokenized rental streams.</p>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : properties.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Properties Yet</h3>
              <p className="text-muted-foreground mb-4">Be the first to invest when properties are listed.</p>
              <Link to="/issuer" className="text-primary hover:underline">
                Go to Issuer Portal to create properties
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {properties.map((property) => (
                <div 
                  key={property.id} 
                  className={`group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-all hover:shadow-xl hover:-translate-y-1 card-hover cursor-pointer`}
                  onClick={() => setSelectedProperty(property)}
                >
                  <div className="h-28 md:h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative">
                    <Building className="h-10 w-10 text-primary/40" />
                    <div className="absolute top-4 right-4">
                      <span className="inline-flex items-center rounded-full bg-background/80 backdrop-blur px-3 py-1 text-xs font-medium">
                        {property.yield} APY
                      </span>
                    </div>
                  </div>
                  <div className="p-4 md:p-6">
                    <h3 className="font-semibold text-lg mb-1">{property.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{property.address}</p>
                    <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Value</p>
                        <p className="font-semibold text-sm">{property.price}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Rent</p>
                        <p className="font-semibold text-sm">{property.rent}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Available</p>
                        <p className="font-semibold text-sm">{property.tokensAvailable} TEN</p>
                      </div>
                    </div>
                    <button
                      className="w-full inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 transition-all"
                    >
                      Buy Income Rights
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
            <form onSubmit={handleBuyTEN} className="space-y-4">
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>You Pay</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <input 
                      type="number"
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
                    <span>1 TEN = 1.05 USDC</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <input 
                      type="text"
                      readOnly
                      value={buyAmount ? (parseFloat(buyAmount) / 1.05).toFixed(4) : ''}
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
                disabled={isProcessingBuy || !buyAmount || !selectedProperty}
                className="w-full inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-6 text-base disabled:opacity-50"
              >
                {isProcessingBuy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : !selectedProperty ? (
                  'Select a property first'
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
                <span className="font-medium">{selectedProperty.tokensAvailable} TEN</span>
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
                disabled={isProcessingBuy || !buyAmount}
                className="flex-1 inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-11 disabled:opacity-50"
              >
                {isProcessingBuy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
