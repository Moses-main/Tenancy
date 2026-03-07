import { useState, useCallback } from 'react';
import { Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { IDKitRequestWidget } from '@worldcoin/idkit';
import { verifyWorldIdProof } from '../lib/api';
import { featureStatus, getWorldIdAppId } from '../lib/featureFlags';

interface WorldIdVerifyProps {
  onVerified: () => void;
  actionName?: string;
  signal?: string;
}

export default function WorldIdVerify({ 
  onVerified, 
  actionName = 'tenancy-verify',
  signal
}: WorldIdVerifyProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [widgetOpen, setWidgetOpen] = useState(false);

  const appId = getWorldIdAppId();
  const worldIdStatus = featureStatus.worldId();

  const handleVerify = useCallback(async (proof: any) => {
    setIsVerifying(true);
    try {
      await verifyWorldIdProof({
        merkle_root: proof.merkle_root,
        nullifier_hash: proof.nullifier_hash,
        proof: proof.proof,
        verification_level: proof.verification_level,
        action: actionName,
        signal,
      });
      return proof; // return the proof to signal success to the widget
    } catch (err: any) {
      throw new Error(err?.message || 'Backend verification failed');
    } finally {
      setIsVerifying(false);
    }
  }, [actionName, signal]);

  const handleSuccess = useCallback((result: any) => {
    setIsVerified(true);
    setError(null);
    setWidgetOpen(false);
    onVerified();
  }, [onVerified]);

  const handleError = useCallback((errorCode: any) => {
    console.error('World ID error:', errorCode);
    setError(typeof errorCode === 'string' ? errorCode : 'World ID verification failed');
    setIsVerifying(false);
  }, []);

  if (isVerified) {
    return (
      <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="text-green-500 font-medium">World ID Verified</span>
        </div>
      </div>
    );
  }

  if (!worldIdStatus.enabled) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Shield className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-sm">World ID Unavailable</h4>
            <p className="text-xs text-muted-foreground mt-1">
              {worldIdStatus.reason || 'World ID is disabled by configuration.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex-1">
          <h4 className="font-medium text-sm">World ID Verification</h4>
          <p className="text-xs text-muted-foreground mt-1 mb-3">
            Verify you&apos;re human to claim yields (prevents sybil attacks)
          </p>

          {error && (
            <div className="flex items-center gap-2 text-amber-600 text-xs mb-3">
              <AlertCircle className="h-3 w-3" />
              {error}
            </div>
          )}

          <button
            onClick={() => { setError(null); setWidgetOpen(true); }}
            disabled={isVerifying}
            className="w-full inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3 gap-2 disabled:opacity-50"
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                Verify with World ID
              </>
            )}
          </button>

          <IDKitRequestWidget
            app_id={appId as `app_${string}`}
            action={actionName}
            signal={signal}
            open={widgetOpen}
            onOpenChange={setWidgetOpen}
            handleVerify={handleVerify}
            onSuccess={handleSuccess}
            onError={handleError}
          />

          <p className="text-xs text-muted-foreground mt-2 text-center">
            Scan the QR code with your{' '}
            <a 
              href="https://worldcoin.org/download-app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              World App
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
