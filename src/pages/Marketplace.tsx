import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import { Building, DollarSign, TrendingUp, Users, Search, Filter, ArrowUpDown, Clock, CheckCircle, XCircle, ExternalLink, Wallet, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useContracts } from '../lib/useContracts';
import { useAuth } from '../lib/AuthContext';
import { ethers } from 'ethers';
const { formatUnits, parseUnits } = ethers.utils;

interface Listing {
  id: number;
  propertyId: number;
  propertyName: string;
  propertyUri: string;
  propertyToken: string;
  seller: string;
  amount: number;
  pricePerToken: number;
  totalPrice: number;
  status: 'active' | 'sold' | 'cancelled';
  createdAt: number;
}

export default function Marketplace() {
  const { isAuthenticated, address, isCorrectNetwork } = useAuth();
  const { getAllProperties, buyPropertyTokens, chainId } = useContracts();
  
  const [listings, setListings] = useState<Listing[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'sold'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high'>('newest');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newListing, setNewListing] = useState({
    propertyId: '1',
    amount: '',
    pricePerToken: '',
  });

  useEffect(() => {
    const fetchListings = async () => {
      if (!isAuthenticated || !isCorrectNetwork) {
        setIsLoading(false);
        return;
      }
      try {
        const props = await getAllProperties();
        const listingsData: Listing[] = props.map((p: any, index: number) => ({
          id: index,
          propertyId: Number(p.id),
          propertyName: p.uri || `Property #${Number(p.id)}`,
          propertyUri: p.uri,
          propertyToken: p.propertyToken,
          seller: p.owner,
          amount: parseFloat(formatUnits(p.totalSupply, 18)),
          pricePerToken: 1.05,
          totalPrice: parseFloat(formatUnits(p.totalSupply, 18)) * 1.05,
          status: p.isActive ? 'active' : 'cancelled',
          createdAt: Date.now() - (index * 3600000),
        }));
        setListings(listingsData);
      } catch (err) {
        console.error('Error fetching listings:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchListings();
  }, [isAuthenticated, isCorrectNetwork, chainId]);

  const filteredListings = listings
    .filter(l => {
      if (filter !== 'all' && l.status !== filter) return false;
      if (searchTerm && !l.propertyName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return b.createdAt - a.createdAt;
      if (sortBy === 'price-low') return a.totalPrice - b.totalPrice;
      return b.totalPrice - a.totalPrice;
    });

  const handleBuy = async (listing: Listing) => {
    setIsProcessing(true);
    const toastId = toast.loading("Processing purchase...");
    
    try {
      const amount = (listing.amount / 1000).toString();
      await buyPropertyTokens(listing.propertyToken, amount, listing.seller);
      toast.update(toastId, {
        render: `Successfully purchased ${listing.amount} tokens for ${listing.totalPrice.toFixed(2)} USDC!`,
        type: "success",
        isLoading: false,
        autoClose: 3000
      });
      setSelectedListing(null);
    } catch (err: any) {
      toast.update(toastId, {
        render: err.message || "Transaction failed",
        type: "error",
        isLoading: false,
        autoClose: 4000
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListing.amount || !newListing.pricePerToken) return;

    const listing: Listing = {
      id: Date.now(),
      propertyId: parseInt(newListing.propertyId),
      propertyName: `Property ${newListing.propertyId}`,
      propertyUri: '',
      propertyToken: '0x0000000000000000000000000000000000000000',
      seller: address || '0xYou...ABC1',
      amount: parseInt(newListing.amount),
      pricePerToken: parseFloat(newListing.pricePerToken),
      totalPrice: parseInt(newListing.amount) * parseFloat(newListing.pricePerToken),
      status: 'active',
      createdAt: Date.now(),
    };

    setListings([listing, ...listings]);
    setShowCreateListing(false);
    setNewListing({ propertyId: '1', amount: '', pricePerToken: '' });
    
    toast.success("Listing created successfully!");
  };

  const handleCancelListing = (id: number) => {
    setListings(listings.map(l => 
      l.id === id ? { ...l, status: 'cancelled' as const } : l
    ));
    toast.info("Listing cancelled");
  };

  const formatAddress = (addr: string) => {
    return `${addr?.slice(0, 6)}...${addr?.slice(-4)}`;
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  if (!isCorrectNetwork) {
    return (
      <Layout>
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Token Marketplace</h1>
              <p className="text-muted-foreground mt-1">
                Buy and sell property token positions on the secondary market.
              </p>
            </div>
          </div>
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
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Token Marketplace</h1>
            <p className="text-muted-foreground mt-1">
              Buy and sell property token positions on the secondary market.
            </p>
          </div>
          <button
            onClick={() => setShowCreateListing(true)}
            className="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-6 gap-2"
          >
            <Building className="h-4 w-4" />
            Create Listing
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Total Listings"
            value={listings.filter(l => l.status === 'active').length.toString()}
            icon={Building}
            description="Active for trading"
          />
          <StatCard
            title="Total Volume"
            value="$18,520"
            icon={DollarSign}
            trend="+12%"
            trendUp={true}
          />
          <StatCard
            title="Avg. Price"
            value="$1.08"
            icon={TrendingUp}
            description="Per token"
          />
          <StatCard
            title="Active Traders"
            value="48"
            icon={Users}
          />
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search properties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="h-11 px-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="sold">Sold</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-11 px-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="newest">Newest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredListings.map((listing) => (
            <div
              key={listing.id}
              className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-all hover:shadow-lg"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{listing.propertyName}</h3>
                    <p className="text-sm text-muted-foreground">ID: #{listing.propertyId}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                    listing.status === 'active' 
                      ? 'bg-green-500/10 text-green-500' 
                      : listing.status === 'sold'
                      ? 'bg-blue-500/10 text-blue-500'
                      : 'bg-red-500/10 text-red-500'
                  }`}>
                    {listing.status === 'active' ? (
                      <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
                    ) : listing.status === 'sold' ? (
                      <><CheckCircle className="h-3 w-3 mr-1" /> Sold</>
                    ) : (
                      <><XCircle className="h-3 w-3 mr-1" /> Cancelled</>
                    )}
                  </span>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Seller</span>
                    <span className="text-sm font-mono">{formatAddress(listing.seller)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Tokens</span>
                    <span className="text-sm font-medium">{listing.amount.toLocaleString()} TEN</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Price/Token</span>
                    <span className="text-sm font-medium">{listing.pricePerToken} USDC</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-lg font-bold text-primary">{listing.totalPrice.toLocaleString()} USDC</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(listing.createdAt)}
                  </div>
                  <a href="#" className="flex items-center gap-1 hover:text-primary">
                    View on Explorer <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {listing.status === 'active' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedListing(listing)}
                      className="flex-1 inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10"
                    >
                      Buy Now
                    </button>
                    {listing.seller.toLowerCase() === address?.toLowerCase() && (
                      <button
                        onClick={() => handleCancelListing(listing.id)}
                        className="px-4 rounded-lg text-sm font-medium border border-border hover:bg-muted h-10"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredListings.length === 0 && (
          <div className="text-center py-16">
            <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No listings found</h3>
            <p className="text-muted-foreground mb-4">Try adjusting your search or filters.</p>
            <button
              onClick={() => setShowCreateListing(true)}
              className="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4"
            >
              Create the first listing
            </button>
          </div>
        )}
      </div>

      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-semibold mb-4">Confirm Purchase</h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Property</span>
                <span className="font-medium">{selectedListing.propertyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seller</span>
                <span className="font-mono text-sm">{formatAddress(selectedListing.seller)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tokens</span>
                <span className="font-medium">{selectedListing.amount.toLocaleString()} TEN</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price/Token</span>
                <span className="font-medium">{selectedListing.pricePerToken} USDC</span>
              </div>
              <div className="flex justify-between pt-4 border-t border-border">
                <span className="font-medium">Total Price</span>
                <span className="text-xl font-bold text-primary">{selectedListing.totalPrice.toLocaleString()} USDC</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedListing(null)}
                className="flex-1 inline-flex items-center justify-center rounded-lg text-sm font-medium border border-border hover:bg-muted h-11"
              >
                Cancel
              </button>
              <button
                onClick={() => handleBuy(selectedListing)}
                disabled={isProcessing}
                className="flex-1 inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-11 disabled:opacity-50"
              >
                {isProcessing ? (
                  <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Wallet className="h-4 w-4 mr-2" />
                    Confirm & Pay
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-semibold mb-4">Create New Listing</h3>
            
            <form onSubmit={handleCreateListing} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Property</label>
                <select
                  value={newListing.propertyId}
                  onChange={(e) => setNewListing({ ...newListing, propertyId: e.target.value })}
                  className="w-full h-11 px-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="1">Downtown Loft NYC</option>
                  <option value="2">Beach House Miami</option>
                  <option value="3">Urban Condo SF</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Number of Tokens</label>
                <input
                  type="number"
                  value={newListing.amount}
                  onChange={(e) => setNewListing({ ...newListing, amount: e.target.value })}
                  placeholder="100"
                  className="w-full h-11 px-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Price per Token (USDC)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newListing.pricePerToken}
                  onChange={(e) => setNewListing({ ...newListing, pricePerToken: e.target.value })}
                  placeholder="1.05"
                  className="w-full h-11 px-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>

              {newListing.amount && newListing.pricePerToken && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Listing Price</span>
                    <span className="font-bold text-primary">
                      {(parseInt(newListing.amount) * parseFloat(newListing.pricePerToken)).toFixed(2)} USDC
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateListing(false)}
                  className="flex-1 inline-flex items-center justify-center rounded-lg text-sm font-medium border border-border hover:bg-muted h-11"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-11"
                >
                  Create Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
