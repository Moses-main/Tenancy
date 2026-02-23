import React, { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import { Building2, UploadCloud, CheckCircle2, AlertCircle, ArrowRight, ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';
import * as api from '../lib/api';

export default function IssuerDashboard() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    propertyName: '',
    monthlyRent: '',
    durationMonths: '12',
    proofUrl: ''
  });

  const [verifications, setVerifications] = useState<api.Verification[]>([]);
  const pollingRef = useRef<Map<string, number>>(new Map());
  const [apiKey, setApiKey] = useState('');

  const activeStreams = [
    { id: '1', name: '742 Evergreen Terrace', rent: 2000, duration: '8/12 mo', status: 'Active' },
    { id: '2', name: '100 Universal City Plaza', rent: 5500, duration: '2/24 mo', status: 'Active' },
    { id: '3', name: '350 Fifth Ave, Ste 40', rent: 12000, duration: '11/12 mo', status: 'Pending Verification' },
  ];

  useEffect(() => {
    return () => {
      pollingRef.current.forEach((timerId) => clearInterval(timerId));
      pollingRef.current.clear();
    };
  }, []);

  const startPolling = (verificationId: string) => {
    if (pollingRef.current.has(verificationId)) return;

    const timerId = window.setInterval(async () => {
      try {
        const updated = await api.getVerification(verificationId);
        setVerifications((prev) => {
          const found = prev.find((p) => p.verificationId === verificationId);
          if (found) {
            return prev.map((p) => (p.verificationId === verificationId ? updated : p));
          }
          return [updated, ...prev];
        });

        if (updated.status === 'verified' || updated.chainlinkTx) {
          const t = pollingRef.current.get(verificationId);
          if (t) {
            clearInterval(t);
            pollingRef.current.delete(verificationId);
          }
        }
      } catch (err) {
        console.error('[PollError]', err);
      }
    }, 2500);

    pollingRef.current.set(verificationId, timerId);
  };

  const handleTokenize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.propertyName || !formData.monthlyRent || !formData.proofUrl) {
      toast.error('Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);
    const loadingId = toast.loading('Requesting off-chain verification...');

    try {
      const resp = await api.requestVerification({
        propertyId: formData.propertyName,
        amount: Number(formData.monthlyRent),
        tenantName: undefined,
        proofUrl: formData.proofUrl,
      });

      toast.update(loadingId, {
        render: `Verification requested (id: ${resp.verificationId}). Awaiting off-chain confirmation...`,
        type: 'info',
        isLoading: false,
        autoClose: 3500,
      });

      const initialRecord: api.Verification = {
        verificationId: resp.verificationId,
        propertyId: formData.propertyName,
        amount: Number(formData.monthlyRent),
        tenantName: null,
        proofUrl: formData.proofUrl,
        status: resp.status || 'pending',
        createdAt: Date.now(),
        verifiedAt: null,
        chainlinkJobId: null,
        chainlinkTx: null,
      };

      setVerifications((prev) => [initialRecord, ...prev]);
      setFormData({ propertyName: '', monthlyRent: '', durationMonths: '12', proofUrl: '' });
      startPolling(resp.verificationId);
    } catch (err: any) {
      console.error(err);
      toast.update(loadingId, {
        render: err?.message || 'Failed to request verification',
        type: 'error',
        isLoading: false,
        autoClose: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTriggerChainlink = async (verificationId: string) => {
    if (!apiKey) {
      toast.error('API Key is required to trigger the mock Chainlink job (local dev).');
      return;
    }

    const loadingId = toast.loading('Triggering mock Chainlink job...');

    try {
      const res = await api.triggerChainlink(verificationId, apiKey);
      toast.update(loadingId, {
        render: `Mock on-chain job triggered: ${res.txHash}`,
        type: 'success',
        isLoading: false,
        autoClose: 4000,
      });

      const updated = await api.getVerification(verificationId);
      setVerifications((prev) => prev.map((v) => (v.verificationId === verificationId ? updated : v)));
    } catch (err: any) {
      console.error(err);
      toast.update(loadingId, {
        render: err?.message || 'Failed to trigger Chainlink job',
        type: 'error',
        isLoading: false,
        autoClose: 4000,
      });
    }
  };

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
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-6 gap-2 text-base"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Processing...
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
                {activeStreams.map((stream) => (
                  <div key={stream.id} className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 transition-colors">
                    <div>
                      <p className="font-medium">{stream.name}</p>
                      <p className="text-sm text-muted-foreground">${stream.rent.toLocaleString()} USDC / mo</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end mb-1">
                        {stream.status === 'Active' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                        )}
                        <span className="text-sm font-medium">{stream.status}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Progress: {stream.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {verifications.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-8">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold tracking-tight">Pending Verifications</h2>
                  <p className="text-sm text-muted-foreground mt-1">Awaiting off-chain confirmation.</p>
                </div>

                <div className="space-y-4">
                  {verifications.map((v) => (
                    <div key={v.verificationId} className="p-5 rounded-xl border border-border bg-card">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium">{v.propertyId}</p>
                          <p className="text-xs text-muted-foreground">Amount: ${v.amount} • Submitted: {new Date(v.createdAt).toLocaleString()}</p>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                          v.status === 'verified' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                        }`}>
                          {v.status.toUpperCase()}
                        </span>
                      </div>

                      {v.status === 'verified' && !v.chainlinkTx && (
                        <div className="space-y-3 pt-3 border-t border-border">
                          <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter x-api-key (dev)"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          <button
                            onClick={() => handleTriggerChainlink(v.verificationId)}
                            className="w-full inline-flex items-center justify-center rounded-md bg-secondary text-secondary-foreground px-4 py-2 text-sm font-medium hover:bg-secondary/80 gap-2"
                          >
                            Trigger Chainlink
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      )}

                      {v.chainlinkTx && (
                        <a
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                          href="#"
                          onClick={(e) => e.preventDefault()}
                        >
                          View TX <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}
