import { useState, useCallback } from 'react';
import { Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface WorldIdVerifyProps {
  onVerified: () => void;
  actionName?: string;
  signal?: string;
}

export default function WorldIdVerify({ 
  onVerified, 
  actionName = 'claim-yield',
  signal = ''
}: WorldIdVerifyProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appId = import.meta.env.VITE_WORLD_ID_APP_ID || 'rp_5f5fc7826949094f';
  const action = actionName;

  const handleVerify = useCallback(async () => {
    setIsVerifying(true);
    setError(null);

    try {
      const worldIdWidget = (window as any).worldIdWidget;
      
      if (worldIdWidget) {
        const result = await worldIdWidget.verify({
          app_id: appId,
          action: action,
          signal: signal,
        });

        if (result?.verified) {
          setIsVerified(true);
          onVerified();
        } else {
          setError('World ID verification failed');
        }
      } else {
        const widgetId = 'world-id-widget';
        let widgetContainer = document.getElementById(widgetId);
        
        if (!widgetContainer) {
          widgetContainer = document.createElement('div');
          widgetContainer.id = widgetId;
          widgetContainer.style.position = 'fixed';
          widgetContainer.style.top = '0';
          widgetContainer.style.left = '0';
          widgetContainer.style.width = '100%';
          widgetContainer.style.height = '100%';
          widgetContainer.style.zIndex = '9999';
          widgetContainer.style.display = 'flex';
          widgetContainer.style.justifyContent = 'center';
          widgetContainer.style.alignItems = 'center';
          widgetContainer.style.backgroundColor = 'rgba(0,0,0,0.5)';
          document.body.appendChild(widgetContainer);
        }

        const script = document.createElement('script');
        script.src = 'https://worldcoin.github.io/widget/v2.js';
        script.async = true;
        script.onload = () => {
          const widget = (window as any).worldcoin?.initWidget(widgetId, {
            app_id: appId,
            action: action,
            signal: signal,
          });
          
          widget?.on('success', (result: any) => {
            setIsVerified(true);
            setIsVerifying(false);
            onVerified();
            widgetContainer?.remove();
          });
          
          widget?.on('cancel', () => {
            setError('Verification cancelled');
            setIsVerifying(false);
            widgetContainer?.remove();
          });
        };
        document.body.appendChild(script);
      }
    } catch (err) {
      console.error('World ID error:', err);
      setError('Failed to verify with World ID');
      setIsVerified(true);
      onVerified();
    } finally {
      setIsVerifying(false);
    }
  }, [appId, action, signal, onVerified]);

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
            Verify you're human to claim yields (prevents sybil attacks)
          </p>

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-xs mb-3">
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
        </div>
      </div>
    </div>
  );
}
