import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Building2, Wallet, Coins, BarChart3, Menu, X, ShieldCheck, Copy, ExternalLink, LogOut, Store, Sun, Moon, RefreshCw, Layers, Home, Bot, ChevronRight, Sparkles } from 'lucide-react';
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
    { path: '/agent', label: 'Agent', icon: Bot },
    { path: '/issuer', label: 'Issuer', icon: Building2 },
    { path: '/investor', label: 'Investor', icon: Coins },
    { path: '/tenant', label: 'Tenant', icon: Home },
  ];

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Modern Header */}
      <header className="sticky top-0 z-50 w-full glass">
        <div className="container flex h-16 md:h-18 items-center justify-between px-4 md:px-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight">TENANCY</span>
              <span className="text-[10px] text-muted-foreground -mt-1">Protocol</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`nav-item-modern ${isActive ? 'active' : ''}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {isActive && <ChevronRight className="h-3 w-3 ml-auto text-primary" />}
                </NavLink>
              );
            })}
          </nav>

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="btn-ghost p-2.5 rounded-xl"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            
            {/* Network Status */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 text-sm">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-muted-foreground">{chainName || 'Base Sepolia'}</span>
            </div>
            
            {/* Wallet */}
            {isLoading ? (
              <button disabled className="btn-secondary px-4 py-2.5">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Loading
              </button>
            ) : isAuthenticated && address ? (
              <div className="relative">
                <button
                  onClick={() => setShowWalletDropdown(!showWalletDropdown)}
                  className="btn-primary px-4 py-2.5 gap-2"
                >
                  <Wallet className="h-4 w-4" />
                  <span className="font-medium">{formatAddress(address)}</span>
                </button>

                {showWalletDropdown && (
                  <div className="absolute right-0 mt-3 w-80 rounded-2xl border bg-card text-card-foreground shadow-xl animate-slide-up overflow-hidden">
                    <div className="p-5 border-b border-border/50">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-semibold">Wallet</span>
                        <button
                          onClick={() => { logout(); setShowWalletDropdown(false); }}
                          className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                        >
                          <LogOut className="h-3 w-3" />
                          Disconnect
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Wallet className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{formatAddress(address)}</p>
                              <p className="text-xs text-muted-foreground">{balance ? `${balance} ETH` : '—'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={copyAddress}
                              className="p-2 rounded-lg hover:bg-secondary transition-colors"
                              title="Copy address"
                            >
                              <Copy className="h-4 w-4 text-muted-foreground" />
                            </button>
                            <a
                              href={`https://sepolia.basescan.org/address/${address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg hover:bg-secondary transition-colors"
                              title="View on Explorer"
                            >
                              <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 border-t border-border/50 space-y-2">
                      <button
                        onClick={() => switchNetwork(84532)}
                        disabled={chainId === 84532}
                        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium bg-secondary/50 hover:bg-secondary transition-colors disabled:opacity-50"
                      >
                        <span className="flex items-center gap-2">
                          <Layers className="h-4 w-4" />
                          Base Sepolia
                        </span>
                        {chainId === 84532 && <span className="badge-success">Active</span>}
                      </button>
                      <button
                        onClick={() => switchNetwork(11155111)}
                        disabled={chainId === 11155111}
                        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium bg-secondary/50 hover:bg-secondary transition-colors disabled:opacity-50"
                      >
                        <span className="flex items-center gap-2">
                          <Layers className="h-4 w-4" />
                          Ethereum Sepolia
                        </span>
                        {chainId === 11155111 && <span className="badge-success">Active</span>}
                      </button>
                    </div>
                    <div className="p-3 bg-secondary/30">
                      <button
                        onClick={() => switchAccount()}
                        className="w-full flex items-center justify-center gap-2 rounded-xl text-sm font-medium py-2 hover:bg-secondary transition-colors"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Switch Account
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={login} className="btn-primary px-5 py-2.5 gap-2">
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-border/50 bg-background/95 backdrop-blur-xl animate-slide-up">
          <div className="container px-4 py-4 space-y-3">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                    {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                  </NavLink>
                );
              })}
            </nav>
            
            <div className="divider-modern my-2" />
            
            {isAuthenticated && address ? (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-secondary/50 space-y-2">
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
                </div>
                <button
                  onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 py-3"
                >
                  <LogOut className="h-4 w-4" />
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => { login(); setIsMobileMenuOpen(false); }}
                className="w-full btn-primary py-3 gap-2"
              >
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 container px-4 md:px-8 py-6 md:py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 px-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <ShieldCheck className="h-3 w-3 text-white" />
            </div>
            <span className="font-medium text-foreground">TENANCY Protocol</span>
            <span className="text-xs">•</span>
            <span className="text-xs">Powered by Ethereum & Chainlink</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Documentation</a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Contracts</a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">GitHub</a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
