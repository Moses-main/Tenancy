import React, { useState } from 'react';
import { MoonPayProvider, MoonPayBuyWidget } from '@moonpay/moonpay-react';

const MOONPAY_PUBLISHABLE_KEY = 'pk_test_jzZI4W0vQ4DwFnHd8wvMBqhltaG8nA';

interface MoonPayWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress?: string;
  amount?: number;
  propertyId?: number;
}

export function MoonPayWidget({ 
  isOpen, 
  onClose, 
  walletAddress = '', 
  amount = 100,
}: MoonPayWidgetProps) {
  const [visible, setVisible] = useState(isOpen);

  React.useEffect(() => {
    setVisible(isOpen);
  }, [isOpen]);

  const closeWidget = () => {
    setVisible(false);
    onClose();
  };

  const onWidgetClose = async () => {
    closeWidget();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="relative w-full max-w-lg mx-4">
        <button
          onClick={closeWidget}
          className="absolute -top-10 right-0 text-white text-xl hover:text-gray-300"
        >
          ✕ Close
        </button>
        
        <div className="bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
          <div className="p-4 bg-gray-800 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Buy USDC with MoonPay</h2>
            <p className="text-sm text-gray-400">Pay with card or bank to fund your rent</p>
          </div>
          
          <div className="h-[500px]">
            <MoonPayProvider 
              apiKey={MOONPAY_PUBLISHABLE_KEY}
              debug
            >
              <MoonPayBuyWidget
                variant="overlay"
                visible={visible}
                baseCurrencyCode="usd"
                currencyCode="usdc"
                baseCurrencyAmount={String(amount)}
                walletAddress={walletAddress}
                onClose={onWidgetClose}
                style={{
                  borderRadius: '8px',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}
              />
            </MoonPayProvider>
          </div>
          
          <div className="p-3 bg-gray-800 border-t border-gray-700 text-center">
            <p className="text-xs text-gray-500">
              Powered by MoonPay • Test mode (sandbox)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BuyCryptoButton({ 
  onClick, 
  className = '' 
}: { 
  onClick: () => void; 
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors ${className}`}
    >
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
      </svg>
      Buy Crypto
    </button>
  );
}
