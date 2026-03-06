import React, { useEffect, useState } from 'react';
import '@radix-ui/themes/styles.css';
import { Theme as RadixTheme } from '@radix-ui/themes';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PrivyProvider } from '@privy-io/react-auth';
import { sepolia, baseSepolia } from 'viem/chains';

import Home from './src/pages/Home.tsx';
import Issuer from './src/pages/Issuer.tsx';
import Investor from './src/pages/Investor.tsx';
import Tenant from './src/pages/Tenant.tsx';
import Marketplace from './src/pages/Marketplace.tsx';
import Agent from './src/pages/Agent.tsx';
import NotFound from './src/pages/NotFound.tsx';
import { AuthProvider } from './src/lib/AuthContext.tsx';
import { ThemeProvider, useTheme } from './src/lib/ThemeContext.tsx';
import { KYCProvider } from './src/lib/KYCContext.tsx';
import ErrorBoundary from './src/components/ErrorBoundary.tsx';
import {
  validateDeploymentConfigAtStartup,
  type DeploymentValidationIssue,
} from './src/lib/contracts.ts';
import { DEFAULT_CHAIN_ID, getDefaultChainConfigError } from './src/lib/featureFlags.ts';


const MissingConfigScreen: React.FC<{ missing: string[] }> = ({ missing }) => (
  <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
    <div className="max-w-2xl w-full rounded-2xl border border-red-500/30 bg-red-500/10 p-8">
      <h1 className="text-2xl font-semibold mb-3">Configuration required</h1>
      <p className="text-sm text-muted-foreground mb-4">
        TENANCY is missing required environment configuration. Update your environment file and restart the app.
      </p>
      <ul className="list-disc pl-5 space-y-1 text-sm">
        {missing.map((item) => (
          <li key={item}><code>{item}</code></li>
        ))}
      </ul>
    </div>
  </div>
);


const AppContent: React.FC = () => {
  const { theme } = useTheme();
  const [deploymentIssues, setDeploymentIssues] = useState<DeploymentValidationIssue[]>([]);

  useEffect(() => {
    let active = true;
    validateDeploymentConfigAtStartup()
      .then((report) => {
        if (!active) return;
        setDeploymentIssues(report.issues);
      })
      .catch((err) => {
        if (!active) return;
        console.warn('Deployment validation check failed:', err);
      });
    return () => {
      active = false;
    };
  }, []);
  const criticalIssues = deploymentIssues.filter((issue) => issue.severity === 'error');
  
  return (
    <RadixTheme appearance={theme} radius="medium" scaling="100%">
      <Router>
        <div className="font-sans antialiased text-foreground bg-background selection:bg-primary/30">
          {deploymentIssues.length > 0 && (
            <div className={`mx-4 mt-4 rounded-xl border p-4 ${criticalIssues.length > 0 ? 'border-red-500/40 bg-red-500/10' : 'border-yellow-500/40 bg-yellow-500/10'}`}>
              <h2 className="text-sm font-semibold">
                {criticalIssues.length > 0 ? 'Deployment Configuration Errors Detected' : 'Deployment Configuration Warnings'}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Contract startup health check found {deploymentIssues.length} issue(s). Verify contract addresses and network RPC settings.
              </p>
              <ul className="mt-2 space-y-1 text-xs">
                {deploymentIssues.slice(0, 6).map((issue, idx) => (
                  <li key={`${issue.chainId}-${issue.contractKey}-${idx}`}>
                    Chain {issue.chainId} / {issue.contractKey}: {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/issuer" element={<Issuer />} />
            <Route path="/investor" element={<Investor />} />
            <Route path="/tenant" element={<Tenant />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/agent" element={<Agent />} />
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
  const privyAppId = import.meta.env.VITE_PRIVY_APP_ID;
  const missingConfig: string[] = [];
  const defaultChainError = getDefaultChainConfigError();

  if (!privyAppId) {
    missingConfig.push('VITE_PRIVY_APP_ID');
  }
  if (defaultChainError) {
    missingConfig.push(defaultChainError);
  }

  const privyDefaultChain = DEFAULT_CHAIN_ID === 84532 ? baseSepolia : sepolia;

  if (missingConfig.length > 0) {
    return (
      <ErrorBoundary>
        <MissingConfigScreen missing={missingConfig} />
      </ErrorBoundary>
    );
  }

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
          defaultChain: privyDefaultChain,
        }}
      >
        <AuthProvider>
          <KYCProvider>
            <ThemeProvider>
              <AppContent />
            </ThemeProvider>
          </KYCProvider>
        </AuthProvider>
      </PrivyProvider>
    </ErrorBoundary>
  );
};

export default App;
