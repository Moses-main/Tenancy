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

    const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string) || 'http://localhost:4010';

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
      proofUrl: string;
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

    /**
     * Trigger the mock Chainlink job. Requires an API key header (x-api-key).
     * Returns { verificationId, txHash, message }
     */
    export async function triggerChainlink(verificationId: string, apiKey: string): Promise<{ verificationId: string; txHash: string; message?: string }> {
      const res = await fetch(`${BACKEND_URL}/trigger-chainlink`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({ verificationId }),
      });

      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err?.error || err?.message || 'Failed to trigger chainlink job');
      }

      return res.json();
    }