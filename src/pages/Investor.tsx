import React, { useState } from 'react';
    import Layout from '../components/Layout';
    import StatCard from '../components/StatCard';
    import { Coins, ArrowDownToLine, ArrowRightLeft, TrendingUp } from 'lucide-react';
    import { toast } from 'react-toastify';

    export default function InvestorDashboard() {
      const [buyAmount, setBuyAmount] = useState('');
      const [isProcessingBuy, setIsProcessingBuy] = useState(false);
      const [isProcessingClaim, setIsProcessingClaim] = useState(false);

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
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Investor Portal</h1>
              <p className="text-muted-foreground mt-2">
                Manage your TEN holdings and claim verified rental yields.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
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
              <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 flex flex-col justify-center">
                <button
                  onClick={handleClaimYield}
                  disabled={isProcessingClaim}
                  className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-12 px-8 gap-2"
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
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Buy TEN Interface */}
              <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
                <div className="flex flex-col space-y-1.5 p-6 border-b border-border">
                  <h3 className="font-semibold leading-none tracking-tight">Acquire TEN Tokens</h3>
                  <p className="text-sm text-muted-foreground">Swap USDC for TEN at current Oracle rates.</p>
                </div>
                <div className="p-6">
                  <form onSubmit={handleBuyTEN} className="space-y-6">
                    <div className="space-y-4">
                      <div className="bg-muted p-4 rounded-xl space-y-2">
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
                          <div className="bg-background px-3 py-1 rounded-full font-medium shadow-sm border border-border">
                            USDC
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-center -my-2 relative z-10">
                        <div className="bg-background border border-border rounded-full p-2 shadow-sm">
                          <ArrowRightLeft className="h-4 w-4 rotate-90 text-muted-foreground" />
                        </div>
                      </div>

                      <div className="bg-muted/50 p-4 rounded-xl space-y-2 border border-border/50">
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
                          <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full font-medium shadow-sm">
                            TEN
                          </div>
                        </div>
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isProcessingBuy || !buyAmount}
                      className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 text-lg"
                    >
                      {isProcessingBuy ? 'Confirming via Wallet...' : 'Swap'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Yield History */}
              <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm flex flex-col">
                <div className="flex flex-col space-y-1.5 p-6 border-b border-border">
                  <h3 className="font-semibold leading-none tracking-tight">Recent Yield Distributions</h3>
                  <p className="text-sm text-muted-foreground">Automated by Chainlink Keepers.</p>
                </div>
                <div className="p-0 flex-1 overflow-auto">
                  <div className="divide-y divide-border">
                    {[
                      { date: 'Oct 01, 2023', amount: '+142.50 USDC', status: 'Claimed', tx: '0x3f...9a1' },
                      { date: 'Sep 01, 2023', amount: '+138.20 USDC', status: 'Claimed', tx: '0x8b...4c2' },
                      { date: 'Aug 01, 2023', amount: '+140.00 USDC', status: 'Claimed', tx: '0x1a...7d9' },
                      { date: 'Jul 01, 2023', amount: '+135.80 USDC', status: 'Claimed', tx: '0x9e...2b4' },
                    ].map((tx, i) => (
                      <div key={i} className="p-6 flex items-center justify-between hover:bg-muted/50 transition-colors">
                        <div className="space-y-1">
                          <p className="font-medium text-green-500">{tx.amount}</p>
                          <p className="text-xs text-muted-foreground">Date: {tx.date}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground">
                            {tx.status}
                          </span>
                          <p className="text-xs text-muted-foreground font-mono mt-1">{tx.tx}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Layout>
      );
    }