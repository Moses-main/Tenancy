import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Building2, Wallet, Coins, BarChart3, Menu, X, ShieldCheck, Copy, ExternalLink, LogOut, Store, Sun, Moon, RefreshCw, Layers } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { 
    isAuthenticated, 
    isLoading, 
    login, 
    logout, 
    address, 
    balance, 
    chainId, 
    chainName,
    switchNetwork,
    switchAccount,
    isCorrectNetwork
  } = useAuth();

  const formatAddress = (addr: string | null) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
    }
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: BarChart3 },
    { path: '/marketplace', label: 'Marketplace', icon: Store },
    { path: '/issuer', label: 'Issuer', icon: Building2 },
    { path: '/investor', label: 'Investor', icon: Coins },
  ];

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 md:h-16 items-center justify-between px-3 md:px-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 md:h-8 md:w-8 text-primary" />
            <span className="text-lg md:text-xl font-bold tracking-tight">TENANCY</span>
          </div>

          <nav className="hidden lg:flex items-center gap-4 xl:gap-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 text-xs md:text-sm font-medium transition-colors hover:text-primary ${
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    }`
                  }
                >
                  <Icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span className="hidden xl:inline">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-2 lg:gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            
            <div className="flex items-center gap-2 text-xs lg:text-sm text-muted-foreground bg-muted px-2 lg:px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="hidden sm:inline">{chainName || 'Base Sepolia'}</span>
            </div>
            
            {isLoading ? (
              <button
                disabled
                className="inline-flex items-center justify-center rounded-md text-xs lg:text-sm font-medium ring-offset-background transition-colors h-9 lg:h-10 px-3 lg:px-4 gap-2 bg-muted text-muted-foreground"
              >
                <Wallet className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Loading...</span>
              </button>
            ) : isAuthenticated && address ? (
              <div className="relative">
                <button
                  onClick={() => setShowWalletDropdown(!showWalletDropdown)}
                  className="inline-flex items-center justify-between rounded-md text-xs lg:text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 lg:h-10 px-2 lg:px-3 gap-2 min-w-[120px] lg:min-w-[160px]"
                >
                  <div className="flex items-center gap-1.5 lg:gap-2">
                    <Wallet className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                    <span className="hidden sm:inline">{formatAddress(address)}</span>
                    <span className="sm:hidden">{formatAddress(address).slice(0, 6)}</span>
                  </div>
                </button>

                {showWalletDropdown && (
                  <div className="absolute right-0 mt-2 w-64 lg:w-72 rounded-xl border border-border bg-card text-card-foreground shadow-lg animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-3 lg:p-4 border-b border-border">
                      <div className="flex items-center justify-between mb-2 lg:mb-3">
                        <span className="text-xs lg:text-sm font-medium">Wallet</span>
                        <button
                          onClick={() => { logout(); setShowWalletDropdown(false); }}
                          className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                        >
                          <LogOut className="h-3 w-3" />
                          Disconnect
                        </button>
                      </div>
                      <div className="space-y-2 lg:space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Address</span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-mono">{formatAddress(address)}</span>
                            <button
                              onClick={copyAddress}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              title="Copy address"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                            <a
                              href={`https://sepolia.basescan.org/address/${address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              title="View on Explorer"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Balance</span>
                          <span className="text-xs lg:text-sm font-medium">{balance ? `${balance} ETH` : '—'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Network</span>
                          <span className="text-xs lg:text-sm font-medium">{chainName || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Chain ID</span>
                          <span className="text-xs font-mono text-muted-foreground">{chainId || '—'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 border-t border-border space-y-2">
                      <button
                        onClick={() => switchNetwork(84532)}
                        disabled={chainId === 84532}
                        className="w-full flex items-center justify-center gap-2 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Layers className="h-3.5 w-3.5" />
                        {chainId === 84532 ? 'On Base Sepolia' : 'Switch to Base Sepolia'}
                      </button>
                      <button
                        onClick={() => switchNetwork(11155111)}
                        disabled={chainId === 11155111}
                        className="w-full flex items-center justify-center gap-2 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Layers className="h-3.5 w-3.5" />
                        {chainId === 11155111 ? 'On Sepolia' : 'Switch to Sepolia'}
                      </button>
                      <button
                        onClick={() => switchAccount()}
                        className="w-full flex items-center justify-center gap-2 rounded-lg text-xs font-medium border border-border hover:bg-muted h-9"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Switch Account
                      </button>
                    </div>
                    <div className="p-2 lg:p-3 bg-muted/50 rounded-b-xl">
                      <p className="text-xs text-muted-foreground text-center">
                        Connected via Privy
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={login}
                className="inline-flex items-center justify-center rounded-md text-xs lg:text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 lg:h-10 px-3 lg:px-4 gap-1.5 lg:gap-2"
              >
                <Wallet className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Connect</span>
                <span className="sm:hidden">Connect</span>
              </button>
            )}
          </div>

          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              className="p-2 text-muted-foreground"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-background px-3 py-3 space-y-3">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 text-sm font-medium transition-colors px-3 py-2 rounded-lg ${
                      isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-muted'
                    }`
                  }
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
          
          <hr className="border-border" />
          
          {isAuthenticated && address ? (
            <div className="p-3 rounded-lg bg-muted space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Address</span>
                <span className="font-mono text-xs">{formatAddress(address)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Balance</span>
                <span>{balance ? `${balance} ETH` : '—'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Network</span>
                <span>{chainName || 'Unknown'}</span>
              </div>
              <button
                onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center justify-center rounded-md text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 h-9 gap-2 mt-2"
              >
                <LogOut className="h-4 w-4" />
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => { login(); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 gap-2"
            >
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </button>
          )}
        </div>
      )}

      <main className="flex-1 container px-3 md:px-6 py-4 md:py-6 lg:py-8 animate-fade-in">
        {children}
      </main>

      <footer className="border-t border-border py-4 md:py-0">
        <div className="container flex flex-col md:h-16 items-center justify-center md:flex-row gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground px-3">
          <p>Powered by Ethereum & Chainlink.</p>
          <div className="flex items-center gap-3 md:gap-4">
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
