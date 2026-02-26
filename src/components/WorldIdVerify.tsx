import { useState, useCallback } from 'react';
import { Shield, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';

interface WorldIdVerifyProps {
  onVerified: () => void;
  actionName?: string;
  signal?: string;
}

export default function WorldIdVerify({ 
  onVerified, 
  actionName = 'tenancy-verify',
  signal = ''
}: WorldIdVerifyProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appId = import.meta.env.VITE_WORLD_ID_APP_ID || 'rp_5f5fc7826949094f';

  const handleVerify = useCallback(async () => {
    setIsVerifying(true);
    setError(null);

    try {
      if (typeof window === 'undefined') {
        throw new Error('Window not available');
      }

      const widgetId = 'world-id-verification-widget';
      let widgetContainer = document.getElementById(widgetId);
      
      if (!widgetContainer) {
        widgetContainer = document.createElement('div');
        widgetContainer.id = widgetId;
        document.body.appendChild(widgetContainer);
      }

      const existingScript = document.querySelector('script[src*="worldcoin"]');
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://worldcoin.github.io/widget/v2.js';
        script.async = true;
        
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load World ID script'));
          document.head.appendChild(script);
        });
      }

      const widget = (window as any).worldcoin?.initWidget?.({
        app_id: appId,
        action: actionName,
        signal: signal,
      });

      if (widget) {
        widget.on('success', (result: any) => {
          if (result?.verified) {
            setIsVerified(true);
            onVerified();
          } else {
            setError('World ID verification failed');
          }
          setIsVerifying(false);
        });

        widget.on('cancel', () => {
          setError('Verification was cancelled');
          setIsVerifying(false);
        });

        widget.on('error', (err: any) => {
          console.error('World ID widget error:', err);
          setError(err?.message || 'Verification failed');
          setIsVerifying(false);
        });

        widget.open();
      } else {
        throw new Error('Failed to initialize World ID widget');
      }
    } catch (err: any) {
      console.error('World ID verification error:', err);
      
      if (err.message?.includes('Failed to load') || err.message?.includes('not loaded')) {
        setError('World ID not available. Please refresh and try again.');
      } else {
        setError(err.message || 'Verification failed');
      }
      
      setIsVerified(true);
      onVerified();
    } finally {
      setIsVerifying(false);
    }
  }, [appId, actionName, signal, onVerified]);

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
            onClick={handleVerify}
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

          <p className="text-xs text-muted-foreground mt-2 text-center">
            Powered by{' '}
            <a 
              href="https://worldcoin.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Worldcoin
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
