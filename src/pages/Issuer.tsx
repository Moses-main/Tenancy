import React, { useEffect, useRef, useState } from 'react';
    import Layout from '../components/Layout';
    import { Building2, UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react';
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
      const [apiKey, setApiKey] = useState(''); // For local dev to trigger protected endpoints

      const activeStreams = [
        { id: '1', name: '742 Evergreen Terrace', rent: 2000, duration: '8/12 mo', status: 'Active' },
        { id: '2', name: '100 Universal City Plaza', rent: 5500, duration: '2/24 mo', status: 'Active' },
        { id: '3', name: '350 Fifth Ave, Ste 40', rent: 12000, duration: '11/12 mo', status: 'Pending Verification' },
      ];

      useEffect(() => {
        // cleanup polling timers on unmount
        return () => {
          pollingRef.current.forEach((timerId) => clearInterval(timerId));
          pollingRef.current.clear();
        };
      }, []);

      const startPolling = (verificationId: string) => {
        if (pollingRef.current.has(verificationId)) return;

        // poll every 2500ms
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
              // stop polling
              const t = pollingRef.current.get(verificationId);
              if (t) {
                clearInterval(t);
                pollingRef.current.delete(verificationId);
              }
            }
          } catch (err) {
            // keep polling but surface an unobtrusive toast the first time
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

          // add initial pending record
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

          // clear form
          setFormData({ propertyName: '', monthlyRent: '', durationMonths: '12', proofUrl: '' });

          // start polling for updates
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
          toast.error('API Key is required to trigger the mock Chainlink job (local dev). Enter it in the field above.');
          return;
        }

        const loadingId = toast.loading('Triggering mock Chainlink job (protected)...');

        try {
          const res = await api.triggerChainlink(verificationId, apiKey);
          toast.update(loadingId, {
            render: `Mock on-chain job triggered: ${res.txHash}`,
            type: 'success',
            isLoading: false,
            autoClose: 4000,
          });

          // refresh verification immediately
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
          <section className="space-y-8" aria-labelledby="issuer-title">
            <header>
              <h1 id="issuer-title" className="text-3xl font-bold tracking-tight">Issuer Portal</h1>
              <p className="text-muted-foreground mt-2">
                Tokenize your real-world rental income streams into TEN tokens.
              </p>
            </header>

            <div className="grid gap-6 md:grid-cols-2">
              <article className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
                <div className="flex flex-col space-y-1.5 p-6 border-b border-border">
                  <h2 className="font-semibold leading-none tracking-tight flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Register New Rental Stream
                  </h2>
                  <p className="text-sm text-muted-foreground">Submit property details for off-chain verification.</p>
                </div>

                <main className="p-6">
                  <form onSubmit={handleTokenize} className="space-y-4" aria-label="Tokenize rental stream form">
                    <div className="space-y-2">
                      <label htmlFor="propertyId" className="text-sm font-medium leading-none">
                        Property Identifier (Address/ID)
                      </label>
                      <input
                        id="propertyId"
                        name="propertyId"
                        type="text"
                        required
                        value={formData.propertyName}
                        onChange={(e) => setFormData({ ...formData, propertyName: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder="e.g. 123 Main St, Apt 4B"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="monthlyRent" className="text-sm font-medium leading-none">Expected Monthly Rent (USDC)</label>
                        <input
                          id="monthlyRent"
                          name="monthlyRent"
                          type="number"
                          required
                          value={formData.monthlyRent}
                          onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          placeholder="2500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="durationMonths" className="text-sm font-medium leading-none">Stream Duration (Months)</label>
                        <select
                          id="durationMonths"
                          value={formData.durationMonths}
                          onChange={(e) => setFormData({ ...formData, durationMonths: e.target.value })}
                          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        >
                          <option value="6">6 Months</option>
                          <option value="12">12 Months</option>
                          <option value="24">24 Months</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="proofUrl" className="text-sm font-medium leading-none">Off-Chain Proof URL (Lease Agreement)</label>
                      <input
                        id="proofUrl"
                        name="proofUrl"
                        type="url"
                        required
                        value={formData.proofUrl}
                        onChange={(e) => setFormData({ ...formData, proofUrl: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder="ipfs://..."
                      />
                    </div>

                    <div className="bg-muted p-4 rounded-lg flex gap-3 items-start mt-4">
                      <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="text-sm text-muted-foreground">
                        By submitting, you agree to the protocol terms. A Chainlink oracle (simulated) will verify the lease agreement and monitor monthly fiat bank transfers before minting TEN yields.
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 mt-4 gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <UploadCloud className="h-4 w-4" />
                          Tokenize Stream
                        </>
                      )}
                    </button>
                  </form>
                </main>
              </article>

              <aside className="rounded-xl border border-border bg-card text-card-foreground shadow-sm flex flex-col" aria-labelledby="active-streams-title">
                <div className="flex flex-col space-y-1.5 p-6 border-b border-border">
                  <h2 id="active-streams-title" className="font-semibold leading-none tracking-tight">Your Active Streams</h2>
                  <p className="text-sm text-muted-foreground">Currently tokenized properties and pending verifications.</p>
                </div>

                <div className="p-0 flex-1 overflow-auto">
                  <div className="divide-y divide-border">
                    {activeStreams.map((stream) => (
                      <div key={stream.id} className="p-6 flex items-center justify-between hover:bg-muted/50 transition-colors">
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

                    {/* Dynamic verifications from backend */}
                    {verifications.length > 0 && (
                      <div className="p-4 border-t border-border bg-background/5">
                        <h3 className="text-sm font-medium mb-3">Pending Verifications</h3>
                        <div className="space-y-3">
                          {verifications.map((v) => (
                            <div key={v.verificationId} className="p-3 rounded-lg border border-border bg-card text-card-foreground">
                              <div className="flex items-start gap-3">
                                <div className="flex-1">
                                  <p className="font-medium">{v.propertyId}</p>
                                  <p className="text-xs text-muted-foreground">Amount: ${v.amount} • Submitted: {new Date(v.createdAt).toLocaleString()}</p>
                                  <p className="text-sm mt-2">
                                    <span className={v.status === 'verified' ? 'text-green-500 font-semibold' : 'text-muted-foreground'}>
                                      {v.status.toUpperCase()}
                                    </span>
                                    {v.chainlinkTx && (
                                      <span className="ml-2 text-xs text-muted-foreground"> • TX: <span className="font-mono">{v.chainlinkTx}</span></span>
                                    )}
                                  </p>
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                  {v.status !== 'verified' && (
                                    <div className="text-xs text-muted-foreground">Waiting for off-chain verification...</div>
                                  )}

                                  {v.status === 'verified' && !v.chainlinkTx && (
                                    <>
                                      <label htmlFor={`apiKey-${v.verificationId}`} className="sr-only">API Key for trigger</label>
                                      <input
                                        id={`apiKey-${v.verificationId}`}
                                        type="password"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder="Enter x-api-key (dev)"
                                        className="h-9 w-56 rounded-md border border-input bg-background px-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        aria-label="Chainlink trigger API key"
                                      />
                                      <button
                                        onClick={() => handleTriggerChainlink(v.verificationId)}
                                        className="mt-2 inline-flex items-center justify-center rounded-md bg-secondary text-secondary-foreground px-3 py-1 text-sm font-medium hover:bg-secondary/80"
                                      >
                                        Trigger Chainlink (mock)
                                      </button>
                                    </>
                                  )}

                                  {v.chainlinkTx && (
                                    <a
                                      className="text-sm text-primary underline"
                                      href="#"
                                      onClick={(e) => e.preventDefault()}
                                      aria-label={`Mock tx ${v.chainlinkTx}`}
                                    >
                                      View Mock TX
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          </section>
        </Layout>
      );
    }