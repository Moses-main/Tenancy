import React, { useState } from 'react';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import { Coins, ArrowDownToLine, ArrowRightLeft, TrendingUp, Building, ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';

const mockProperties = [
  { id: 1, name: 'Downtown Loft NYC', address: '142 W 42nd St, New York', yield: '8.2%', price: '$2,400,000', tokensAvailable: '240,000', rent: '$12,000/mo' },
  { id: 2, name: 'Beach House Miami', address: '890 Ocean Dr, Miami Beach', yield: '7.5%', price: '$1,800,000', tokensAvailable: '180,000', rent: '$9,500/mo' },
  { id: 3, name: 'Urban Condo SF', address: '555 Mission St, San Francisco', yield: '6.9%', price: '$3,200,000', tokensAvailable: '320,000', rent: '$15,000/mo' },
  { id: 4, name: 'Lakefront Villa Austin', address: '2100 Lakeshore Blvd, Austin', yield: '7.8%', price: '$1,500,000', tokensAvailable: '150,000', rent: '$8,200/mo' },
];

export default function InvestorDashboard() {
  const [buyAmount, setBuyAmount] = useState('');
  const [isProcessingBuy, setIsProcessingBuy] = useState(false);
  const [isProcessingClaim, setIsProcessingClaim] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<number | null>(null);

  const handleBuyTEN = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyAmount || parseFloat(buyAmount) <= 0) return;
    
    setIsProcessingBuy(true);
    const toastId = toast.loading("Swapping USDC for TEN...");
    
    setTimeout(() => {
      toast.update(toastId, { 
        render: `Successfully purchased ${(parseFloat(buyAmount) / 1.05).toFixed(2)} TEN!`, 
        type: "success", 
        isLoading: false, 
        autoClose: 3000 
      });
      setIsProcessingBuy(false);
      setBuyAmount('');
    }, 2000);
  };

  const handleClaimYield = () => {
    setIsProcessingClaim(true);
    const toastId = toast.loading("Claiming distributed yields...");
    
    setTimeout(() => {
      toast.update(toastId, { 
        render: "450.50 USDC yield claimed successfully!", 
        type: "success", 
        isLoading: false, 
        autoClose: 3000 
      });
      setIsProcessingClaim(false);
    }, 2500);
  };

  return (
    <Layout>
      <div className="space-y-16">
        <section>
          <h1 className="text-3xl font-bold tracking-tight">Investor Portal</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Manage your TEN holdings and claim verified rental yields.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <StatCard
            title="Your TEN Balance"
            value="12,450.00 TEN"
            icon={Coins}
            description="≈ $13,072.50 USD"
          />
          <StatCard
            title="Unclaimed Yield"
            value="450.50 USDC"
            icon={TrendingUp}
            trend="+24.50 today"
            trendUp={true}
          />
          <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-center">
            <button
              onClick={handleClaimYield}
              disabled={isProcessingClaim}
              className="w-full inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-14 px-8 gap-2 text-base"
            >
              {isProcessingClaim ? (
                <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Available Properties</h2>
              <p className="text-sm text-muted-foreground mt-1">Browse and invest in tokenized rental streams.</p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {mockProperties.map((property) => (
              <div 
                key={property.id} 
                className={`group rounded-2xl border bg-card overflow-hidden transition-all hover:shadow-lg cursor-pointer ${
                  selectedProperty === property.id ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedProperty(property.id)}
              >
                <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative">
                  <Building className="h-10 w-10 text-primary/40" />
                  <div className="absolute top-4 right-4">
                    <span className="inline-flex items-center rounded-full bg-background/80 backdrop-blur px-3 py-1 text-xs font-medium">
                      {property.yield} APY
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-semibold text-lg mb-1">{property.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{property.address}</p>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Property Value</p>
                      <p className="font-semibold">{property.price}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Rent</p>
                      <p className="font-semibold">{property.rent}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Available</p>
                      <p className="font-semibold">{property.tokensAvailable} TEN</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedProperty(property.id); }}
                    className="w-full inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-11 transition-all"
                  >
                    Buy Income Rights
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold tracking-tight">Acquire TEN Tokens</h2>
              <p className="text-sm text-muted-foreground mt-1">Swap USDC for TEN at current Oracle rates.</p>
            </div>
            <form onSubmit={handleBuyTEN} className="space-y-6">
              <div className="space-y-4">
                <div className="bg-muted/50 p-5 rounded-xl space-y-3">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>You Pay</span>
                    <span>Balance: 5,000.00 USDC</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <input 
                      type="number"
                      value={buyAmount}
                      onChange={(e) => setBuyAmount(e.target.value)}
                      className="bg-transparent text-3xl font-semibold outline-none w-full"
                      placeholder="0.0"
                    />
                    <div className="bg-background px-4 py-2 rounded-lg font-medium shadow-sm border border-border">
                      USDC
                    </div>
                  </div>
                </div>

                <div className="flex justify-center -my-2 relative z-10">
                  <div className="bg-background border border-border rounded-full p-2 shadow-sm">
                    <ArrowRightLeft className="h-4 w-4 rotate-90 text-muted-foreground" />
                  </div>
                </div>

                <div className="bg-muted/30 p-5 rounded-xl space-y-3 border border-border/50">
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
                disabled={isProcessingBuy || !buyAmount}
                className="w-full inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-8 text-base"
              >
                {isProcessingBuy ? 'Confirming via Wallet...' : 'Swap USDC for TEN'}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-border bg-card p-8 flex flex-col">
            <div className="mb-6">
              <h2 className="text-xl font-semibold tracking-tight">Yield Distributions</h2>
              <p className="text-sm text-muted-foreground mt-1">Automated by Chainlink CRE workflow.</p>
            </div>
            <div className="flex-1 overflow-auto">
              <div className="space-y-3">
                {[
                  { date: 'Oct 01, 2023', amount: '+142.50 USDC', status: 'Claimed', tx: '0x3f...9a1' },
                  { date: 'Sep 01, 2023', amount: '+138.20 USDC', status: 'Claimed', tx: '0x8b...4c2' },
                  { date: 'Aug 01, 2023', amount: '+140.00 USDC', status: 'Claimed', tx: '0x1a...7d9' },
                  { date: 'Jul 01, 2023', amount: '+135.80 USDC', status: 'Claimed', tx: '0x9e...2b4' },
                  { date: 'Jun 01, 2023', amount: '+132.00 USDC', status: 'Claimed', tx: '0x5c...8e1' },
                ].map((tx, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/50 transition-colors">
                    <div className="space-y-1">
                      <p className="font-semibold text-green-500">{tx.amount}</p>
                      <p className="text-xs text-muted-foreground">{tx.date}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <span className="inline-flex items-center rounded-full bg-green-500/10 text-green-500 px-3 py-1 text-xs font-medium">
                        {tx.status}
                      </span>
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-xs text-muted-foreground font-mono">{tx.tx}</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
