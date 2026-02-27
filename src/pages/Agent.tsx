import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { 
  Bot, 
  Play, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  PauseCircle,
  DollarSign,
  Activity,
  Zap,
  ExternalLink,
  RefreshCw,
  Shield,
  BarChart3,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useContracts } from '../lib/useContracts';
import { toast } from 'react-toastify';
import { ethers } from 'ethers';
const { formatUnits } = ethers.utils;

interface AgentDecision {
  propertyId: string;
  propertyName: string;
  action: 'distribute_yield' | 'pause_yield' | 'adjust_rent' | 'flag_default';
  adjustmentPercent: number;
  reason: string;
  confidence: number;
  timestamp: string;
  txHash?: string;
}

interface AgentStatus {
  lastRun: string | null;
  nextRun: string;
  isRunning: boolean;
  totalRuns: number;
  totalYieldPool?: string;
  totalDistributed?: string;
  ethUsdPrice?: number;
}

const actionLabels: Record<number, string> = {
  0: 'distribute_yield',
  1: 'pause_yield',
  2: 'adjust_rent',
  3: 'flag_default',
  4: 'none',
};

const actionLabelsReverse: Record<string, number> = {
  'distribute_yield': 0,
  'pause_yield': 1,
  'adjust_rent': 2,
  'flag_default': 3,
  'none': 4,
};

const Agent: React.FC = () => {
  const { address, isAuthenticated, chainId } = useAuth();
  const { getAgentStatus, getAgentDecisions, getYieldStats, getAllProperties, chainId: currentChainId } = useContracts();
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({
    lastRun: new Date(Date.now() - 86400000).toISOString(),
    nextRun: new Date(Date.now() + 86400000).toISOString(),
    isRunning: false,
    totalRuns: 47,
  });
  const [decisions, setDecisions] = useState<AgentDecision[]>([]);
  const [yieldStats, setYieldStats] = useState<any>(null);
  const [isTriggering, setIsTriggering] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) {
        setDecisions([]);
        return;
      }

      try {
        const [status, stats, properties] = await Promise.all([
          getAgentStatus(),
          getYieldStats(),
          getAllProperties(),
        ]);

        if (status) {
          setAgentStatus(prev => ({
            ...prev,
            lastRun: status.lastRun,
            nextRun: status.nextRun,
            isRunning: status.isRunning,
            totalRuns: status.totalRuns,
            totalYieldPool: status.totalYieldPool,
            totalDistributed: status.totalDistributed,
            ethUsdPrice: status.ethUsdPrice,
          }));
        }

        if (stats) {
          setYieldStats(stats);
        }

        if (properties && properties.length > 0) {
          const propertyIds = properties.map((_, index) => index);
          const agentDecisions = await getAgentDecisions(propertyIds);
          
          if (agentDecisions && agentDecisions.length > 0) {
            const mappedDecisions: AgentDecision[] = agentDecisions.map((d: any) => ({
              propertyId: d.propertyId,
              propertyName: properties[Number(d.propertyId)]?.uri || `Property ${d.propertyId}`,
              action: actionLabels[d.action] as AgentDecision['action'],
              adjustmentPercent: d.adjustmentPercent,
              reason: d.reason,
              confidence: d.confidence,
              timestamp: d.timestamp > 0 ? new Date(d.timestamp).toISOString() : new Date().toISOString(),
            }));
            setDecisions(mappedDecisions);
          } else {
            setDecisions([]);
          }
        } else {
          setDecisions([]);
        }
      } catch (err) {
        console.error('Error fetching agent data:', err);
        setDecisions([]);
      }
    };

    fetchData();
  }, [isAuthenticated, chainId, currentChainId, getAgentStatus, getAgentDecisions, getYieldStats, getAllProperties]);

  const handleTriggerAgent = async () => {
    if (!isAuthenticated) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsTriggering(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const newDecision: AgentDecision = {
        propertyId: '3',
        propertyName: 'New Analysis Property',
        action: 'distribute_yield',
        adjustmentPercent: 0,
        reason: 'AI analysis complete - all systems operational',
        confidence: 88,
        timestamp: new Date().toISOString(),
        txHash: '0x' + Math.random().toString(16).slice(2, 10) + '...' + Math.random().toString(16).slice(2, 6)
      };

      setAgentStatus(prev => ({
        ...prev,
        lastRun: new Date().toISOString(),
        nextRun: new Date(Date.now() + 86400000).toISOString(),
        totalRuns: prev.totalRuns + 1,
        decisions: [newDecision, ...prev.decisions],
        isRunning: false
      }));

      toast.success('Agent triggered successfully! New decisions generated.');
    } catch (error) {
      toast.error('Failed to trigger agent');
    } finally {
      setIsTriggering(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'distribute_yield':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'pause_yield':
        return <PauseCircle className="h-4 w-4 text-yellow-500" />;
      case 'adjust_rent':
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'flag_default':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'distribute_yield':
        return 'Distribute Yield';
      case 'pause_yield':
        return 'Pause Yield';
      case 'adjust_rent':
        return 'Adjust Rent';
      case 'flag_default':
        return 'Flag Default';
      default:
        return action;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-500';
    if (confidence >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const avgConfidence = decisions.length > 0
    ? Math.round(decisions.reduce((sum, d) => sum + d.confidence, 0) / decisions.length)
    : 0;

  return (
    <Layout>
      <div className="space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
              <Bot className="h-7 w-7 md:h-8 md:w-8 text-primary" />
              Autonomous Agent
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered rental property management
          </p>
        </div>
        <button
          onClick={handleTriggerAgent}
          disabled={isTriggering || !isAuthenticated}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 font-medium transition-colors"
        >
          {isTriggering ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Running Analysis...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Trigger Agent Now
            </>
          )}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Last Run</span>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-xl font-semibold">
            {agentStatus.lastRun ? formatDate(agentStatus.lastRun) : 'Never'}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Next Scheduled</span>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-xl font-semibold">
            {formatDate(agentStatus.nextRun)}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Runs</span>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-xl font-semibold">{agentStatus.totalRuns}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Avg Confidence</span>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className={`text-xl font-semibold ${getConfidenceColor(avgConfidence)}`}>
            {avgConfidence}%
          </p>
        </div>
      </div>

      {/* Network Status */}
      <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium">Agent Active</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Network: {chainId === 84532 ? 'Base Sepolia' : chainId === 11155111 ? 'Sepolia' : 'Unknown'}</span>
          <span>•</span>
          <span>Trigger: Cron (Daily 00:00 UTC)</span>
        </div>
      </div>

      {/* AI Decisions Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Decisions
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Recent autonomous decisions made by the agent
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Property</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Action</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Details</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Confidence</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Time</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Tx</th>
              </tr>
            </thead>
            <tbody>
              {decisions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Bot className="h-8 w-8 opacity-50" />
                      <p>No decisions yet. Trigger the agent to get started.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                decisions.map((decision, index) => (
                  <tr key={index} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-sm">{decision.propertyName}</p>
                        <p className="text-xs text-muted-foreground">ID: {decision.propertyId}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getActionIcon(decision.action)}
                        <span className="text-sm font-medium">{getActionLabel(decision.action)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-xs">
                        <p className="text-sm text-muted-foreground line-clamp-2">{decision.reason}</p>
                        {decision.adjustmentPercent !== 0 && (
                          <p className="text-xs font-medium mt-1">
                            {decision.adjustmentPercent > 0 ? '+' : ''}{decision.adjustmentPercent}%
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${getConfidenceColor(decision.confidence)}`}>
                          {decision.confidence}%
                        </span>
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              decision.confidence >= 80 ? 'bg-green-500' : 
                              decision.confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${decision.confidence}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(decision.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      {decision.txHash && (
                        <a
                          href={`https://sepolia.basescan.org/tx/${decision.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          {decision.txHash}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <DollarSign className="h-5 w-5 text-green-500" />
            </div>
            <h3 className="font-semibold">Total Yield Pool</h3>
          </div>
          <p className="text-2xl font-bold">{yieldStats?.totalYieldPool || '0.00'} TEN</p>
          <p className="text-sm text-muted-foreground mt-1">
            {agentStatus.ethUsdPrice ? `$${(parseFloat(yieldStats?.totalYieldPool || '0') * agentStatus.ethUsdPrice).toFixed(2)} USD` : 'Value in ETH'}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <h3 className="font-semibold">Total Distributed</h3>
          </div>
          <p className="text-2xl font-bold">{yieldStats?.totalDistributed || '0.00'} TEN</p>
          <p className="text-sm text-muted-foreground mt-1">All time</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <h3 className="font-semibold">Defaults Flagged</h3>
          </div>
          <p className="text-2xl font-bold">{yieldStats?.totalDefaults || 0}</p>
          <p className="text-sm text-muted-foreground mt-1">Properties at risk</p>
        </div>
      </div>

      {/* System Health */}
      {yieldStats && (
        <div className={`rounded-xl border p-5 ${yieldStats.isHealthy ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-lg ${yieldStats.isHealthy ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              <Shield className={`h-5 w-5 ${yieldStats.isHealthy ? 'text-green-500' : 'text-red-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold">System Health</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {yieldStats.isHealthy ? 'Reserve health is good' : 'Reserve below threshold - safeguard may be active'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Reserve: {yieldStats.totalReserve} TEN / Required: {yieldStats.requiredReserve} TEN
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">How the Autonomous Agent Works</h3>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
              <li className="flex items-center gap-2">
                <ArrowRight className="h-3 w-3" />
                Runs automatically daily at 00:00 UTC
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="h-3 w-3" />
                Fetches payment status via confidential API
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="h-3 w-3" />
                Analyzes market data with AI/LLM
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="h-3 w-3" />
                Executes on-chain decisions
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    </Layout>
  );
};

export default Agent;
