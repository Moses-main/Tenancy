import React from 'react';
import '@radix-ui/themes/styles.css';
import { Theme as RadixTheme } from '@radix-ui/themes';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PrivyProvider } from '@privy-io/react-auth';
import { sepolia } from 'viem/chains';

import Home from './src/pages/Home.tsx';
import Issuer from './src/pages/Issuer.tsx';
import Investor from './src/pages/Investor.tsx';
import Tenant from './src/pages/Tenant.tsx';
import Marketplace from './src/pages/Marketplace.tsx';
import NotFound from './src/pages/NotFound.tsx';
import { AuthProvider } from './src/lib/AuthContext.tsx';
import { ThemeProvider, useTheme } from './src/lib/ThemeContext.tsx';
import ErrorBoundary from './src/components/ErrorBoundary.tsx';

const AppContent: React.FC = () => {
  const { theme } = useTheme();
  
  return (
    <RadixTheme appearance={theme} radius="medium" scaling="100%">
      <Router>
        <div className="font-sans antialiased text-foreground bg-background selection:bg-primary/30">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/issuer" element={<Issuer />} />
            <Route path="/investor" element={<Investor />} />
            <Route path="/tenant" element={<Tenant />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ToastContainer
            aria-label="Notifications"
            position="bottom-right"
            autoClose={4000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme={theme}
          />
        </div>
      </Router>
    </RadixTheme>
  );
};

const App: React.FC = () => {
  const privyAppId = import.meta.env.VITE_PRIVY_APP_ID || 'your_privy_app_id';
  
  return (
    <ErrorBoundary>
      <PrivyProvider
        appId={privyAppId}
        config={{
          loginMethods: ['email', 'wallet'],
          embeddedWallets: {
            ethereum: {
              createOnLogin: 'all-users',
            },
          },
          defaultChain: sepolia,
        }}
      >
        <AuthProvider>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </AuthProvider>
      </PrivyProvider>
    </ErrorBoundary>
  );
};

export default App;
