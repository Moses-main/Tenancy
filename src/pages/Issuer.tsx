import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Building2, UploadCloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useContracts } from '../lib/useContracts';
import { useAuth } from '../lib/AuthContext';
import { formatUnits } from 'ethers';

interface PropertyDisplay {
  id: number;
  uri: string;
  rentAmount: string;
  totalSupply: string;
  owner: string;
  isActive: boolean;
}

export default function IssuerDashboard() {
  const { isAuthenticated, address, isCorrectNetwork } = useAuth();
  const { getAllProperties, createProperty, chainId, isLoading: contractLoading } = useContracts();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    propertyName: '',
    monthlyRent: '',
    durationMonths: '12',
    proofUrl: ''
  });

  const [properties, setProperties] = useState<PropertyDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      if (!isAuthenticated || !isCorrectNetwork) {
        setIsLoading(false);
        return;
      }
      try {
        const props = await getAllProperties();
        const userProps = props.filter((p: any) => p.owner?.toLowerCase() === address?.toLowerCase());
        setProperties(userProps.map((p: any) => ({
          id: Number(p.id),
          uri: p.uri,
          rentAmount: formatUnits(p.rentAmount, 6),
          totalSupply: formatUnits(p.totalSupply, 18),
          owner: p.owner,
          isActive: p.isActive,
        })));
      } catch (err) {
        console.error('Error fetching properties:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProperties();
  }, [isAuthenticated, isCorrectNetwork, chainId, address]);

  const handleTokenize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.propertyName || !formData.monthlyRent || !formData.proofUrl) {
      toast.error('Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);
    const loadingId = toast.loading('Creating property on blockchain...');

    try {
      const duration = parseInt(formData.durationMonths);
      const initialSupply = (parseFloat(formData.monthlyRent) * duration * 100).toString();
      const valuation = (parseFloat(formData.monthlyRent) * duration * 12).toString();
      
      const txHash = await createProperty(
        formData.proofUrl,
        formData.monthlyRent,
        2592000, 
        initialSupply,
        `TEN-${formData.propertyName.slice(0, 8)}`,
        `TEN${formData.propertyName.slice(0, 4).toUpperCase()}`,
        valuation
      );

      toast.update(loadingId, {
        render: `Property tokenized successfully! TX: ${txHash.slice(0, 10)}...`,
        type: 'success',
        isLoading: false,
        autoClose: 5000,
      });

      setFormData({ propertyName: '', monthlyRent: '', durationMonths: '12', proofUrl: '' });
      
      const props = await getAllProperties();
      const userProps = props.filter((p: any) => p.owner?.toLowerCase() === address?.toLowerCase());
      setProperties(userProps.map((p: any) => ({
        id: Number(p.id),
        uri: p.uri,
        rentAmount: formatUnits(p.rentAmount, 6),
        totalSupply: formatUnits(p.totalSupply, 18),
        owner: p.owner,
        isActive: p.isActive,
      })));
    } catch (err: any) {
      console.error(err);
      toast.update(loadingId, {
        render: err?.message || 'Failed to create property',
        type: 'error',
        isLoading: false,
        autoClose: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isCorrectNetwork) {
    return (
      <Layout>
        <div className="space-y-16">
          <section>
            <h1 className="text-3xl font-bold tracking-tight">Issuer Portal</h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Tokenize your real-world rental income streams into TEN tokens.
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
      <div className="space-y-16">
        <section>
          <h1 className="text-3xl font-bold tracking-tight">Issuer Portal</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Tokenize your real-world rental income streams into TEN tokens.
          </p>
        </section>

        <section className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-border bg-card p-8">
              <div className="mb-8">
                <h2 className="text-xl font-semibold tracking-tight flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  Register New Rental Stream
                </h2>
                <p className="text-sm text-muted-foreground mt-2">Submit property details for off-chain verification.</p>
              </div>

              <form onSubmit={handleTokenize} className="space-y-6">
                <div className="space-y-3">
                  <label htmlFor="propertyId" className="text-sm font-medium">
                    Property Address
                  </label>
                  <input
                    id="propertyId"
                    name="propertyId"
                    type="text"
                    required
                    value={formData.propertyName}
                    onChange={(e) => setFormData({ ...formData, propertyName: e.target.value })}
                    className="flex h-12 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="e.g. 123 Main St, Apt 4B, New York, NY"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label htmlFor="monthlyRent" className="text-sm font-medium">Expected Monthly Rent (USDC)</label>
                    <input
                      id="monthlyRent"
                      name="monthlyRent"
                      type="number"
                      required
                      value={formData.monthlyRent}
                      onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                      className="flex h-12 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder="2500"
                    />
                  </div>
                  <div className="space-y-3">
                    <label htmlFor="durationMonths" className="text-sm font-medium">Stream Duration</label>
                    <select
                      id="durationMonths"
                      value={formData.durationMonths}
                      onChange={(e) => setFormData({ ...formData, durationMonths: e.target.value })}
                      className="flex h-12 w-full items-center justify-between rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="6">6 Months</option>
                      <option value="12">12 Months</option>
                      <option value="24">24 Months</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label htmlFor="proofUrl" className="text-sm font-medium">Off-Chain Proof URL (Lease Agreement)</label>
                  <input
                    id="proofUrl"
                    name="proofUrl"
                    type="url"
                    required
                    value={formData.proofUrl}
                    onChange={(e) => setFormData({ ...formData, proofUrl: e.target.value })}
                    className="flex h-12 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="ipfs://..."
                  />
                </div>

                <div className="bg-muted/50 p-5 rounded-xl flex gap-4 items-start">
                  <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    By submitting, you agree to the protocol terms. A Chainlink oracle (simulated) will verify the lease agreement and monitor monthly fiat bank transfers before minting TEN yields.
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || contractLoading}
                  className="w-full inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-6 gap-2 text-base"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Creating Property...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-5 w-5" />
                      Tokenize Stream
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div className="rounded-2xl border border-border bg-card p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold tracking-tight">Your Active Streams</h2>
                <p className="text-sm text-muted-foreground mt-1">Currently tokenized properties.</p>
              </div>

              <div className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : properties.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm">No properties yet. Create your first one above.</p>
                  </div>
                ) : (
                  properties.map((stream) => (
                    <div key={stream.id} className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 transition-colors">
                      <div>
                        <p className="font-medium">{stream.uri || `Property #${stream.id}`}</p>
                        <p className="text-sm text-muted-foreground">${parseFloat(stream.rentAmount).toLocaleString()} USDC / mo</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end mb-1">
                          {stream.isActive ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                          )}
                          <span className="text-sm font-medium">{stream.isActive ? 'Active' : 'Inactive'}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Tokens: {parseFloat(stream.totalSupply).toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
