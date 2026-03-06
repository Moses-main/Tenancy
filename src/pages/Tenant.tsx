import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import { MoonPayWidget, BuyCryptoButton } from '../components/MoonPayWidget';
import { Home, CreditCard, Clock, CheckCircle, AlertCircle, Building, DollarSign, FileText, Loader2, ExternalLink, Calendar } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../lib/AuthContext';
import { useContracts } from '../lib/useContracts';
import { getExplorerUrl } from '../lib/contracts';
import { ingestPaymentLifecycle } from '../lib/api';
import { ethers } from 'ethers';
const { formatUnits, parseUnits } = ethers.utils;

interface Lease {
  id: number;
  propertyId: number;
  propertyUri: string;
  propertyAddress: string;
  owner: string;
  monthlyRent: number;
  rentDueDate: number;
  lastPaymentDate: number | null;
  status: 'active' | 'pending' | 'overdue';
  paymentHistory: Payment[];
}

interface Payment {
  id: string;
  amount: number;
  date: number;
  txHash: string;
  status: 'confirmed' | 'pending' | 'failed';
  verificationStatus?: string;
  distributionStatus?: string;
  verificationId?: string;
  distributionId?: string | null;
}

export default function Tenant() {
  const { isAuthenticated, address, isCorrectNetwork } = useAuth();
  const { getAllProperties, chainId, payRent } = useContracts();
  
  const [leases, setLeases] = useState<Lease[]>([]);
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMoonPay, setShowMoonPay] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeases = async () => {
      if (!isAuthenticated || !isCorrectNetwork) {
        setIsLoading(false);
        return;
      }
      try {
        const props = await getAllProperties();
        const leasesData: Lease[] = props.map((p: any) => ({
          id: Number(p.id),
          propertyId: Number(p.id),
          propertyUri: p.uri,
          propertyAddress: p.uri || `Property #${Number(p.id)}`,
          owner: p.owner,
          monthlyRent: parseFloat(formatUnits(p.rentAmount, 6)),
          rentDueDate: Date.now() + (30 * 24 * 60 * 60 * 1000),
          lastPaymentDate: null,
          status: 'pending' as const,
          paymentHistory: [],
        }));
        setLeases(leasesData);
      } catch (err) {
        console.error('Error fetching leases:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeases();
  }, [isAuthenticated, isCorrectNetwork, chainId, getAllProperties]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLease || !paymentAmount) return;

    setIsProcessing(true);
    const toastId = toast.loading("Processing payment on blockchain...");

    try {
      const txHash = await payRent(selectedLease.propertyId, paymentAmount);
      const proofUrl = (selectedLease.propertyUri && /^(https?:\/\/|ipfs:\/\/)/i.test(selectedLease.propertyUri))
        ? selectedLease.propertyUri
        : `https://evidence.tenancy.local/tx/${txHash}`;

      const lifecycle = await ingestPaymentLifecycle({
        propertyId: selectedLease.propertyId,
        amount: paymentAmount,
        txHash,
        proofUrl,
        tenantAddress: address || undefined,
      });
      
      const newPayment: Payment = {
        id: lifecycle.paymentId,
        amount: parseFloat(paymentAmount),
        date: Date.now(),
        txHash,
        status: lifecycle.verificationStatus === 'verified' ? 'confirmed' : 'failed',
        verificationStatus: lifecycle.verificationStatus,
        distributionStatus: lifecycle.distributionStatus,
        verificationId: lifecycle.verificationId,
        distributionId: lifecycle.distributionId,
      };

      setLeases(leases.map(lease => 
        lease.id === selectedLease.id 
          ? { 
              ...lease, 
              lastPaymentDate: Date.now(),
              status: 'active',
              paymentHistory: [newPayment, ...lease.paymentHistory]
            }
          : lease
      ));

      toast.update(toastId, {
        render: lifecycle.verificationStatus === 'verified'
          ? `Paid ${paymentAmount} USDC. Verification: ${lifecycle.verificationStatus}, Distribution: ${lifecycle.distributionStatus}`
          : `Paid ${paymentAmount} USDC, but verification failed. Please review payment evidence.`,
        type: lifecycle.verificationStatus === 'verified' ? "success" : "warning",
        isLoading: false,
        autoClose: 4000
      });
      setShowPaymentModal(false);
      setPaymentAmount('');
      setSelectedLease(null);
    } catch (err: any) {
      toast.update(toastId, {
        render: err.message || "Payment failed",
        type: "error",
        isLoading: false,
        autoClose: 4000
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: Lease['status']) => {
    const styles = {
      active: 'bg-green-500/10 text-green-500 border-green-500/20',
      pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      overdue: 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    const labels = {
      active: 'Active',
      pending: 'Pending',
      overdue: 'Overdue',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
        {status === 'active' && <CheckCircle className="w-3 h-3 mr-1" />}
        {status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
        {status === 'overdue' && <AlertCircle className="w-3 h-3 mr-1" />}
        {labels[status]}
      </span>
    );
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const totalPaid = leases.reduce((sum, lease) => {
    return sum + lease.paymentHistory.reduce((s, p) => s + p.amount, 0);
  }, 0);

  const overdueCount = leases.filter(l => l.status === 'overdue').length;
  const nextDueDate = leases
    .filter(l => l.status !== 'overdue')
    .sort((a, b) => a.rentDueDate - b.rentDueDate)[0]?.rentDueDate;

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20">
          <Home className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Please connect your wallet to access the Tenant Portal and manage your rent payments.
          </p>
        </div>
      </Layout>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="h-16 w-16 text-yellow-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Wrong Network</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Please switch to Base Sepolia or Sepolia testnet to use the Tenant Portal.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tenant Portal</h1>
            <p className="text-muted-foreground">Manage your rent payments and lease information</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Paid"
            value={`${totalPaid.toLocaleString()} USDC`}
            icon={DollarSign}
            description="All time"
          />
          <StatCard
            title="Active Leases"
            value={leases.length.toString()}
            icon={Home}
            description="Properties"
          />
          <StatCard
            title="Next Due Date"
            value={nextDueDate ? formatDate(nextDueDate) : 'N/A'}
            icon={Calendar}
            description="Next payment"
          />
          <StatCard
            title="Overdue"
            value={overdueCount.toString()}
            icon={AlertCircle}
            description="Payments"
            variant={overdueCount > 0 ? 'warning' : 'default'}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold truncate">Your Leases</h2>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : leases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-xl">
                <Home className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No active leases found</p>
                <p className="text-sm text-muted-foreground">Contact your property manager to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {leases.map((lease) => (
                  <div
                    key={lease.id}
                    className="border border-border rounded-xl p-4 sm:p-5 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        {lease.propertyUri && (lease.propertyUri.startsWith('http') || lease.propertyUri.startsWith('ipfs://')) ? (
                          <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                            <img 
                              src={lease.propertyUri} 
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                            <Building className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold truncate">
                            {lease.propertyUri && (lease.propertyUri.startsWith('http') || lease.propertyUri.startsWith('ipfs://')) 
                              ? `Property #${lease.propertyId}` 
                              : lease.propertyAddress}
                          </h3>
                          <p className="text-sm text-muted-foreground">Property #{lease.propertyId}</p>
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            Owner: {lease.owner ? `${lease.owner.slice(0, 6)}...${lease.owner.slice(-4)}` : 'Loading...'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {getStatusBadge(lease.status)}
                        <div className="text-right">
                          <p className="text-lg font-semibold">{lease.monthlyRent.toLocaleString()} USDC</p>
                          <p className="text-xs text-muted-foreground">per month</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-4 pt-4 border-t border-border">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground truncate">Due: {formatDate(lease.rentDueDate)}</span>
                      </div>
                      {lease.lastPaymentDate && (
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                          <span className="text-muted-foreground truncate">Last: {formatDate(lease.lastPaymentDate)}</span>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setSelectedLease(lease);
                          setPaymentAmount(lease.monthlyRent.toString());
                          setShowPaymentModal(true);
                        }}
                        className="ml-auto flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium shrink-0"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span className="hidden sm:inline">Make Payment</span>
                        <span className="sm:hidden">Pay</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold truncate">Payment History</h2>
            <div className="border border-border rounded-xl overflow-hidden">
              {leases.flatMap(l => l.paymentHistory).slice(0, 5).length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No payment history</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {leases.flatMap(l => l.paymentHistory).slice(0, 5).map((payment, idx) => (
                    <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{payment.amount.toLocaleString()} USDC</p>
                        <p className="text-xs text-muted-foreground truncate">{formatDate(payment.date)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {payment.status === 'confirmed' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : payment.status === 'pending' ? (
                          <Clock className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <a
                          href={getExplorerUrl(chainId || 84532, undefined, payment.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground truncate"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                      {(payment.verificationStatus || payment.distributionStatus) && (
                        <div className="text-xs text-muted-foreground">
                          V:{payment.verificationStatus || 'n/a'} · D:{payment.distributionStatus || 'n/a'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {showPaymentModal && selectedLease && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md mx-4 bg-card border border-border rounded-xl p-6 shadow-xl">
              <h3 className="text-lg font-semibold mb-4">Make Rent Payment</h3>
              <div className="mb-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Property</p>
                <p className="font-medium">{selectedLease.propertyAddress}</p>
                <p className="text-sm text-muted-foreground mt-2">Monthly Rent</p>
                <p className="font-medium">{selectedLease.monthlyRent.toLocaleString()} USDC</p>
              </div>
              <div className="mb-4">
                <BuyCryptoButton 
                  onClick={() => setShowMoonPay(true)} 
                  className="w-full justify-center"
                />
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Need USDC? Buy crypto with card or bank transfer
                </p>
              </div>
              <form onSubmit={handlePayment} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Amount (USDC)</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentModal(false);
                      setPaymentAmount('');
                      setSelectedLease(null);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                    disabled={isProcessing}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4" />
                        Pay Now
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <MoonPayWidget
          isOpen={showMoonPay}
          onClose={() => setShowMoonPay(false)}
          walletAddress={address || ''}
          amount={selectedLease ? selectedLease.monthlyRent : 100}
        />
      </div>
    </Layout>
  );
}
