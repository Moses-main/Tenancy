export type Verification = {
      verificationId: string;
      propertyId: string;
      amount: number;
      tenantName?: string | null;
      proofUrl: string;
      status: 'pending' | 'verified' | string;
      createdAt: number;
      verifiedAt?: number | null;
      chainlinkJobId?: string | null;
      chainlinkTx?: string | null;
      providerReference?: string | null;
      chainlinkTriggeredAt?: number | null;
    };

    export type AgentDecision = {
      decisionId: string;
      propertyId: number;
      action: string;
      adjustmentPercent: number;
      reason: string;
      confidence: number;
      status: 'pending' | 'executed' | string;
      executedAt?: string;
      txHash?: string;
      createdAt: string;
    };

    export type Payment = {
      paymentId: string;
      propertyId: number;
      propertyName: string;
      amount: number;
      currency: string;
      tenantAddress?: string;
      status: 'pending' | 'verified' | 'failed' | string;
      paymentDate?: string;
      txHash?: string;
    };

    export type PaymentLifecycle = {
      paymentId: string;
      paymentStatus: string;
      verificationId: string;
      verificationStatus: string;
      distributionId: string | null;
      distributionStatus: string;
      txHash: string;
    };

    export type WorldIdProofPayload = {
      merkle_root: string;
      nullifier_hash: string;
      proof: string;
      verification_level?: string;
      action?: string;
      signal?: string;
    };

    export type PaginationQuery = {
      limit?: number;
      offset?: number;
      status?: string;
      propertyId?: number;
    };

    const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string) || 'http://localhost:4010';
    let authToken: string | null = null;

    export function setApiAuthToken(token: string | null) {
      authToken = token;
    }

    function getPrivilegedHeaders() {
      return {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      } as const;
    }

    async function safeJson(res: Response) {
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        return { raw: text };
      }
    }

    export async function requestVerification(payload: {
      propertyId: string;
      amount: number | string;
      tenantName?: string;
      tenantAddress?: string;
      proofUrl: string;
      txHash?: string;
    }): Promise<{ verificationId: string; status: string } & Record<string, any>> {
      const res = await fetch(`${BACKEND_URL}/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err?.error || err?.message || 'Failed to request verification');
      }
      return res.json();
    }

    export async function ingestPaymentLifecycle(payload: {
      propertyId: number;
      amount: number | string;
      txHash: string;
      proofUrl: string;
      tenantName?: string;
      tenantAddress?: string;
    }): Promise<PaymentLifecycle> {
      const res = await fetch(`${BACKEND_URL}/payments/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err?.error || err?.message || 'Failed to ingest payment lifecycle');
      }
      return res.json();
    }

    export async function getPaymentLifecycle(paymentId: string): Promise<any> {
      const res = await fetch(`${BACKEND_URL}/payments/lifecycle/${encodeURIComponent(paymentId)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err?.error || err?.message || 'Failed to fetch payment lifecycle');
      }
      return res.json();
    }

    export async function getVerification(verificationId: string): Promise<Verification> {
      const res = await fetch(`${BACKEND_URL}/verifications/${encodeURIComponent(verificationId)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err?.error || err?.message || 'Failed to fetch verification');
      }
      return res.json();
    }

    export async function verifyWorldIdProof(payload: WorldIdProofPayload): Promise<{ verified: boolean; nullifierHash: string }> {
      const res = await fetch(`${BACKEND_URL}/world-id/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err?.error || err?.message || 'World ID proof verification failed');
      }
      return res.json();
    }

    export async function getAllVerifications(params?: PaginationQuery): Promise<{ data: Verification[]; total: number; pagination?: any; filters?: any }> {
      const query = new URLSearchParams();
      if (params?.limit !== undefined) query.set('limit', String(params.limit));
      if (params?.offset !== undefined) query.set('offset', String(params.offset));
      if (params?.status) query.set('status', params.status);
      if (params?.propertyId !== undefined) query.set('propertyId', String(params.propertyId));
      const suffix = query.toString() ? `?${query.toString()}` : '';
      const res = await fetch(`${BACKEND_URL}/verifications${suffix}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err?.error || err?.message || 'Failed to fetch verifications');
      }
      const payload = await res.json();
      if (Array.isArray(payload)) {
        return { data: payload, total: payload.length };
      }
      return payload;
    }

    /**
     * Trigger the Chainlink job. Requires an API key header (x-api-key).
     * Returns { verificationId, txHash, message }
     */
    export async function triggerChainlink(verificationId: string): Promise<{ verificationId: string; txHash: string; message?: string }> {
      const res = await fetch(`${BACKEND_URL}/trigger-chainlink`, {
        method: 'POST',
        headers: getPrivilegedHeaders(),
        credentials: 'include',
        body: JSON.stringify({ verificationId }),
      });

      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err?.error || err?.message || 'Failed to trigger chainlink job');
      }

      return res.json();
    }

    /**
     * Get payments for a property
     */
    export async function getPayments(propertyId: number): Promise<{ data: Payment[] }> {
      const res = await fetch(`${BACKEND_URL}/payments/${propertyId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err?.error || err?.message || 'Failed to fetch payments');
      }
      return res.json();
    }

    /**
     * Get all payments
     */
    export async function getAllPayments(params?: PaginationQuery): Promise<{ data: Payment[]; total: number; verified: number; pending: number; pagination?: any; filters?: any }> {
      const query = new URLSearchParams();
      if (params?.limit !== undefined) query.set('limit', String(params.limit));
      if (params?.offset !== undefined) query.set('offset', String(params.offset));
      if (params?.status) query.set('status', params.status);
      if (params?.propertyId !== undefined) query.set('propertyId', String(params.propertyId));
      const suffix = query.toString() ? `?${query.toString()}` : '';
      const res = await fetch(`${BACKEND_URL}/payments${suffix}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err?.error || err?.message || 'Failed to fetch payments');
      }
      return res.json();
    }

    /**
     * Get agent decisions
     */
    export async function getAgentDecisions(propertyId?: number): Promise<AgentDecision[]> {
      const url = propertyId 
        ? `${BACKEND_URL}/agent/decisions?propertyId=${propertyId}`
        : `${BACKEND_URL}/agent/decisions`;
      
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err?.error || err?.message || 'Failed to fetch agent decisions');
      }
      return res.json();
    }

    /**
     * Create agent decision (for Chainlink CRE)
     */
    export async function createAgentDecision(payload: {
      propertyId: number;
      action: string;
      adjustmentPercent?: number;
      reason?: string;
      confidence?: number;
    }): Promise<{ decisionId: string; status: string }> {
      const res = await fetch(`${BACKEND_URL}/agent/decisions`, {
        method: 'POST',
        headers: getPrivilegedHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err?.error || err?.message || 'Failed to create agent decision');
      }
      return res.json();
    }

    /**
     * Execute agent decision on-chain
     */
    export async function executeAgentDecision(decisionId: string): Promise<{ decisionId: string; txHash: string; status: string }> {
      const res = await fetch(`${BACKEND_URL}/agent/execute`, {
        method: 'POST',
        headers: getPrivilegedHeaders(),
        credentials: 'include',
        body: JSON.stringify({ decisionId }),
      });

      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err?.error || err?.message || 'Failed to execute agent decision');
      }
      return res.json();
    }

    /**
     * Create yield distribution
     */
    export async function distributeYield(propertyId: number, totalYield: number): Promise<{ distributionId: string; txHash: string }> {
      const res = await fetch(`${BACKEND_URL}/yield/distribute`, {
        method: 'POST',
        headers: getPrivilegedHeaders(),
        credentials: 'include',
        body: JSON.stringify({ propertyId, totalYield }),
      });

      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err?.error || err?.message || 'Failed to distribute yield');
      }
      return res.json();
    }

    /**
     * Get yield distributions
     */
    export async function getYieldDistributions(propertyId?: number): Promise<any[]> {
      const url = propertyId
        ? `${BACKEND_URL}/yield/distributions?propertyId=${propertyId}`
        : `${BACKEND_URL}/yield/distributions`;
      
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err?.error || err?.message || 'Failed to fetch distributions');
      }
      return res.json();
    }

    /**
     * Trigger Chainlink automation
     */
    export async function triggerAutomation(): Promise<{ message: string; processed: number }> {
      const res = await fetch(`${BACKEND_URL}/automation/trigger`, {
        method: 'POST',
        headers: getPrivilegedHeaders(),
        credentials: 'include',
      });

      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err?.error || err?.message || 'Failed to trigger automation');
      }
      return res.json();
    }

    /**
     * Get stats
     */
    export async function getStats(): Promise<any> {
      const res = await fetch(`${BACKEND_URL}/stats`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err?.error || err?.message || 'Failed to fetch stats');
      }
      return res.json();
    }

    /**
     * Get ETH/USD price from Chainlink
     */
    export async function getEthUsdPrice(): Promise<{ price: number; source: string }> {
      const res = await fetch(`${BACKEND_URL}/price-feed`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err?.error || err?.message || 'Failed to fetch price');
      }
      return res.json();
    }

    /**
     * Health check
     */
    export async function healthCheck(): Promise<{ status: string; database: string; chainlink: string }> {
      const res = await fetch(`${BACKEND_URL}/health`, {
        method: 'GET',
      });

      if (!res.ok) {
        throw new Error('Backend not available');
      }
      return res.json();
    }
