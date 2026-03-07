import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Building2, UploadCloud, CheckCircle2, AlertCircle, Loader2, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import { useContracts } from '../lib/useContracts';
import { useAuth } from '../lib/AuthContext';
import { getAllPayments, type Payment } from '../lib/api';
import { validateField } from '../lib/validation';
import { ethers } from 'ethers';
const { formatUnits } = ethers.utils;

interface PropertyDisplay {
  id: number;
  uri: string;
  imageUrl: string | null;
  rentAmount: string;
  totalSupply: string;
  owner: string;
  isActive: boolean;
}

interface PropertyPaymentHealth {
  propertyId: number;
  propertyName: string;
  verified: number;
  pending: number;
  failed: number;
  lastPaymentDate: string | null;
  overdue: boolean;
}

export default function IssuerDashboard() {
  const { isAuthenticated, address, isCorrectNetwork } = useAuth();
  const { getAllProperties, createProperty, createAndListProperty, chainId, isLoading: contractLoading } = useContracts();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    propertyName: '',
    monthlyRent: '',
    durationMonths: '12',
    proofUrl: '',
    tokenName: '',
    tokenSymbol: '',
    initialSupply: '10000',
    listImmediately: false,
    listingAmount: '',
    pricePerToken: ''
  });

  const [properties, setProperties] = useState<PropertyDisplay[]>([]);
  const [paymentHealth, setPaymentHealth] = useState<PropertyPaymentHealth[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      if (!isAuthenticated || !isCorrectNetwork) {
        setIsLoading(false);
        setIsLoadingPayments(false);
        return;
      }
      try {
        const [props, paymentResponse] = await Promise.all([
          getAllProperties(),
          getAllPayments().catch(() => ({ data: [] as Payment[] })),
        ]);
        const userProps = props.filter((p: any) => p.owner?.toLowerCase() === address?.toLowerCase());
        const propertyRows = userProps.map((p: any) => ({
          id: Number(p.id),
          uri: p.uri,
          imageUrl: p.uri && (p.uri.startsWith('http') || p.uri.startsWith('ipfs://')) ? p.uri : null,
          rentAmount: formatUnits(p.rentAmount, 6),
          totalSupply: formatUnits(p.totalSupply, 18),
          owner: p.owner,
          isActive: p.isActive,
        }));
        setProperties(propertyRows);

        const issuerPropertyIds = new Set(propertyRows.map((p) => p.id));
        const payments = (paymentResponse?.data || []).filter((payment) => issuerPropertyIds.has(Number(payment.propertyId)));
        const nowMs = Date.now();
        const THIRTY_FIVE_DAYS_MS = 35 * 24 * 60 * 60 * 1000;

        const healthRows: PropertyPaymentHealth[] = propertyRows.map((property) => {
          const propertyPayments = payments.filter((payment) => Number(payment.propertyId) === property.id);
          const verified = propertyPayments.filter((payment) => payment.status === 'verified').length;
          const pending = propertyPayments.filter((payment) => payment.status === 'pending').length;
          const failed = propertyPayments.filter((payment) => payment.status === 'failed').length;

          const latest = propertyPayments.reduce<number | null>((latestMs, payment) => {
            const candidate = payment.paymentDate ? Date.parse(payment.paymentDate) : NaN;
            if (!Number.isFinite(candidate)) return latestMs;
            if (latestMs === null || candidate > latestMs) return candidate;
            return latestMs;
          }, null);

          const overdue = property.isActive && (latest === null || (nowMs - latest) > THIRTY_FIVE_DAYS_MS);

          return {
            propertyId: property.id,
            propertyName: property.uri || `Property #${property.id}`,
            verified,
            pending,
            failed,
            lastPaymentDate: latest ? new Date(latest).toISOString() : null,
            overdue,
          };
        });

        setPaymentHealth(healthRows);
      } catch (err) {
        console.error('Error fetching properties:', err);
      } finally {
        setIsLoading(false);
        setIsLoadingPayments(false);
      }
    };
    fetchProperties();
  }, [isAuthenticated, isCorrectNetwork, chainId, address]);

  const paymentTotals = paymentHealth.reduce(
    (acc, row) => ({
      verified: acc.verified + row.verified,
      pending: acc.pending + row.pending,
      failed: acc.failed + row.failed,
      overdue: acc.overdue + (row.overdue ? 1 : 0),
    }),
    { verified: 0, pending: 0, failed: 0, overdue: 0 }
  );

  const handleTokenize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.propertyName || !formData.monthlyRent || !formData.proofUrl || !formData.tokenName || !formData.tokenSymbol) {
      toast.error('Please complete all required fields.');
      return;
    }
    if (formData.listImmediately && (!formData.listingAmount || !formData.pricePerToken)) {
      toast.error('Please complete listing details or uncheck "List Immediately".');
      return;
    }
    const rentError = validateField(formData.monthlyRent, { required: true, min: 1, max: 1_000_000 });
    if (rentError) {
      toast.error(`Monthly rent: ${rentError}`);
      return;
    }
    const durationError = validateField(formData.durationMonths, { required: true, min: 1, max: 120 });
    if (durationError) {
      toast.error(`Duration: ${durationError}`);
      return;
    }
    const supplyError = validateField(formData.initialSupply, { required: true, min: 1, max: 1_000_000_000 });
    if (supplyError) {
      toast.error(`Initial supply: ${supplyError}`);
      return;
    }
    const nameError = validateField(formData.tokenName, { required: true, minLength: 3, maxLength: 40 });
    if (nameError) {
      toast.error(`Token name: ${nameError}`);
      return;
    }
    const symbolError = validateField(formData.tokenSymbol, { required: true, minLength: 2, maxLength: 10 });
    if (symbolError) {
      toast.error(`Token symbol: ${symbolError}`);
      return;
    }
    const listingAmountError = formData.listImmediately ? validateField(formData.listingAmount, { required: true, min: 1, max: Number(formData.initialSupply) }) : '';
    if (listingAmountError) {
      toast.error(`Listing amount: ${listingAmountError}`);
      return;
    }
    const priceError = formData.listImmediately ? validateField(formData.pricePerToken, { required: true, min: 0.000001, max: 1000000 }) : '';
    if (priceError) {
      toast.error(`Price per token: ${priceError}`);
      return;
    }
    if (!/^(https?:\/\/|ipfs:\/\/).+/i.test(formData.proofUrl.trim())) {
      toast.error('Proof URL must start with http(s):// or ipfs://');
      return;
    }

    setIsSubmitting(true);
    const loadingId = toast.loading(formData.listImmediately ? 'Creating property and listing...' : 'Creating property...');

    try {
      let txHash: string;
      
      if (formData.listImmediately) {
        const result = await createAndListProperty(
          formData.proofUrl,
          formData.monthlyRent,
          Number(formData.durationMonths) * 30 * 86400, // Convert months to seconds
          formData.initialSupply,
          formData.tokenName,
          formData.tokenSymbol,
          (parseFloat(formData.monthlyRent) * 12 * 20).toString(), // 20x annual rent as valuation
          formData.listingAmount,
          formData.pricePerToken
        );
        txHash = result.propertyToken;
        toast.update(loadingId, {
          render: `Property created and listed! TX: ${txHash.slice(0, 10)}...`,
          type: 'success',
          isLoading: false,
          autoClose: 5000,
        });
      } else {
        txHash = await createProperty(
          formData.proofUrl,
          formData.monthlyRent,
          Number(formData.durationMonths) * 30 * 86400, // Convert months to seconds
          formData.initialSupply,
          formData.tokenName,
          formData.tokenSymbol,
          (parseFloat(formData.monthlyRent) * 12 * 20).toString() // 20x annual rent as valuation
        );
        toast.update(loadingId, {
          render: `Property created! TX: ${txHash.slice(0, 10)}...`,
          type: 'success',
          isLoading: false,
          autoClose: 5000,
        });
      }

      // Reset form
      setFormData({
        propertyName: '',
        monthlyRent: '',
        durationMonths: '12',
        proofUrl: '',
        tokenName: '',
        tokenSymbol: '',
        initialSupply: '10000',
        listImmediately: false,
        listingAmount: '',
        pricePerToken: ''
      });

      // Refresh properties
      const props = await getAllProperties();
      const userProps = props.filter((p: any) => p.owner?.toLowerCase() === address?.toLowerCase());
      setProperties(userProps.map((p: any) => ({
        id: Number(p.id),
        uri: p.uri,
        imageUrl: p.uri && (p.uri.startsWith('http') || p.uri.startsWith('ipfs://')) ? p.uri : null,
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
                <p className="text-sm text-muted-foreground mt-2">Submit property details to tokenize your rental income stream.</p>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label htmlFor="tokenName" className="text-sm font-medium">Token Name</label>
                    <input
                      id="tokenName"
                      name="tokenName"
                      type="text"
                      required
                      value={formData.tokenName}
                      onChange={(e) => setFormData({ ...formData, tokenName: e.target.value })}
                      className="flex h-12 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder="e.g. Property A Tokens"
                    />
                  </div>
                  <div className="space-y-3">
                    <label htmlFor="tokenSymbol" className="text-sm font-medium">Token Symbol</label>
                    <input
                      id="tokenSymbol"
                      name="tokenSymbol"
                      type="text"
                      required
                      maxLength={10}
                      value={formData.tokenSymbol}
                      onChange={(e) => setFormData({ ...formData, tokenSymbol: e.target.value.toUpperCase() })}
                      className="flex h-12 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder="e.g. PROP-A"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label htmlFor="monthlyRent" className="text-sm font-medium">Expected Monthly Rent (USDC)</label>
                    <input
                      id="monthlyRent"
                      name="monthlyRent"
                      type="number"
                      min="1"
                      max="1000000"
                      step="0.01"
                      required
                      value={formData.monthlyRent}
                      onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                      className="flex h-12 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder="2500"
                    />
                  </div>
                  <div className="space-y-3">
                    <label htmlFor="initialSupply" className="text-sm font-medium">Initial Token Supply</label>
                    <input
                      id="initialSupply"
                      name="initialSupply"
                      type="number"
                      min="1"
                      max="1000000000"
                      step="1"
                      required
                      value={formData.initialSupply}
                      onChange={(e) => setFormData({ ...formData, initialSupply: e.target.value })}
                      className="flex h-12 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder="10000"
                    />
                  </div>
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

                <div className="border-t pt-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <input
                      type="checkbox"
                      id="listImmediately"
                      checked={formData.listImmediately}
                      onChange={(e) => setFormData({ ...formData, listImmediately: e.target.checked })}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="listImmediately" className="text-sm font-medium cursor-pointer">
                      List property immediately on marketplace
                    </label>
                  </div>

                  {formData.listImmediately && (
                    <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Marketplace Listing Details
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label htmlFor="listingAmount" className="text-sm font-medium text-blue-700 dark:text-blue-300">
                            Number of Tokens to List
                          </label>
                          <input
                            id="listingAmount"
                            name="listingAmount"
                            type="number"
                            min="1"
                            max={formData.initialSupply}
                            step="1"
                            required={formData.listImmediately}
                            value={formData.listingAmount}
                            onChange={(e) => setFormData({ ...formData, listingAmount: e.target.value })}
                            className="flex h-10 w-full rounded-lg border border-blue-300 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            placeholder="1000"
                          />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="pricePerToken" className="text-sm font-medium text-blue-700 dark:text-blue-300">
                            Price per Token (USDC)
                          </label>
                          <input
                            id="pricePerToken"
                            name="pricePerToken"
                            type="number"
                            min="0.000001"
                            max="1000000"
                            step="0.000001"
                            required={formData.listImmediately}
                            value={formData.pricePerToken}
                            onChange={(e) => setFormData({ ...formData, pricePerToken: e.target.value })}
                            className="flex h-10 w-full rounded-lg border border-blue-300 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            placeholder="0.1"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        Gas-efficient: Property creation and marketplace listing in a single transaction
                      </p>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || contractLoading}
                  className="w-full inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-6 gap-2 text-base"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      {formData.listImmediately ? 'Creating Property & Listing...' : 'Creating Property...'}
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-5 w-5" />
                      {formData.listImmediately ? 'Tokenize & List Property' : 'Tokenize Stream'}
                    </>
                  )}
                </button>
              </form>
              
              </div>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div className="rounded-2xl border border-border bg-card p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold tracking-tight">Payment Verification Monitor</h2>
                <p className="text-sm text-muted-foreground mt-1">Live rent verification health across your properties.</p>
              </div>
              {isLoadingPayments ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground">Verified</p>
                      <p className="text-xl font-semibold text-green-500">{paymentTotals.verified}</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground">Pending</p>
                      <p className="text-xl font-semibold text-yellow-500">{paymentTotals.pending}</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground">Failed</p>
                      <p className="text-xl font-semibold text-red-500">{paymentTotals.failed}</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground">Overdue Streams</p>
                      <p className="text-xl font-semibold text-orange-500">{paymentTotals.overdue}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border p-4">
                    <p className="text-sm font-medium mb-3">Overdue Alerts</p>
                    {paymentHealth.some((row) => row.overdue) ? (
                      <div className="space-y-2">
                        {paymentHealth
                          .filter((row) => row.overdue)
                          .map((row) => (
                            <div key={row.propertyId} className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-sm">
                              <p className="font-medium">{row.propertyName}</p>
                              <p className="text-muted-foreground">No verified rent in the last 35 days.</p>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No overdue streams right now.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Per-Property Payment Health</p>
                    {paymentHealth.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No payment data available yet for your properties.</p>
                    ) : (
                      paymentHealth.map((row) => (
                        <div key={row.propertyId} className="rounded-lg border border-border p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-sm">{row.propertyName}</p>
                              <p className="text-xs text-muted-foreground">
                                Last payment: {row.lastPaymentDate ? new Date(row.lastPaymentDate).toLocaleDateString() : 'No records'}
                              </p>
                            </div>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${row.overdue ? 'bg-orange-500/10 text-orange-500' : 'bg-green-500/10 text-green-500'}`}>
                              {row.overdue ? 'Overdue' : 'Healthy'}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-3 text-xs">
                            <span className="text-green-500">V: {row.verified}</span>
                            <span className="text-yellow-500">P: {row.pending}</span>
                            <span className="text-red-500">F: {row.failed}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

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
                    <div key={stream.id} className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/30 transition-colors">
                      {stream.imageUrl ? (
                        <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                          <img 
                            src={stream.imageUrl} 
                            alt={`Property #${stream.id}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="h-6 w-6 text-primary/40" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{stream.uri || `Property #${stream.id}`}</p>
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
