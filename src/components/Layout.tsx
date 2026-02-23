import React, { useState } from 'react';
    import { NavLink, useLocation } from 'react-router-dom';
    import { Building2, Wallet, Coins, BarChart3, Menu, X, ShieldCheck } from 'lucide-react';

    interface LayoutProps {
      children: React.ReactNode;
    }

    const Layout: React.FC<LayoutProps> = ({ children }) => {
      const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
      const [walletConnected, setWalletConnected] = useState(false);
      const [walletAddress, setWalletAddress] = useState('');
      const location = useLocation();

      const connectWallet = () => {
        // Simulate wallet connection
        setWalletConnected(true);
        setWalletAddress('0x71C...976F');
      };

      const navItems = [
        { path: '/', label: 'Dashboard', icon: BarChart3 },
        { path: '/issuer', label: 'Issuer Portal', icon: Building2 },
        { path: '/investor', label: 'Investor Portal', icon: Coins },
      ];

      return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
          {/* Top Navigation */}
          <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold tracking-tight">TENANCY</span>
              </div>

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-6">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${
                          isActive ? 'text-primary' : 'text-muted-foreground'
                        }`
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </nav>

              <div className="hidden md:flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Sepolia Testnet
                </div>
                <button
                  onClick={connectWallet}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 gap-2"
                >
                  <Wallet className="h-4 w-4" />
                  {walletConnected ? walletAddress : 'Connect Wallet'}
                </button>
              </div>

              {/* Mobile Menu Toggle */}
              <button
                className="md:hidden p-2 text-muted-foreground"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </header>

          {/* Mobile Nav */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-b border-border bg-background px-4 py-4 space-y-4">
              <nav className="flex flex-col gap-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 text-sm font-medium transition-colors ${
                          isActive ? 'text-primary' : 'text-muted-foreground'
                        }`
                      }
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </nav>
              <button
                onClick={() => {
                  connectWallet();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-10 px-4 py-2 gap-2"
              >
                <Wallet className="h-4 w-4" />
                {walletConnected ? walletAddress : 'Connect Wallet'}
              </button>
            </div>
          )}

          {/* Main Content */}
          <main className="flex-1 container py-8 animate-fade-in">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-border py-6 md:py-0">
            <div className="container flex flex-col md:h-16 items-center justify-center md:flex-row gap-4 text-sm text-muted-foreground">
              <p>Powered by Ethereum & Chainlink CCIP/Price Feeds.</p>
              <div className="flex items-center gap-4">
                <a href="#" className="hover:text-primary transition-colors">Contracts</a>
                <a href="#" className="hover:text-primary transition-colors">Docs</a>
                <a href="#" className="hover:text-primary transition-colors">GitHub</a>
              </div>
            </div>
          </footer>
        </div>
      );
    };

    export default Layout;