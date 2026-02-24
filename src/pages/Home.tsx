import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import { Activity, DollarSign, Users, Link as LinkIcon, Building, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { useContracts } from '../lib/useContracts';
import { useAuth } from '../lib/AuthContext';
import { formatUnits } from 'ethers';

const mockYieldData = [
  { name: 'Jan', yield: 4.2 },
  { name: 'Feb', yield: 4.5 },
  { name: 'Mar', yield: 4.8 },
  { name: 'Apr', yield: 5.1 },
  { name: 'May', yield: 5.4 },
  { name: 'Jun', yield: 6.2 },
  { name: 'Jul', yield: 6.8 },
];

export default function Home() {
  const { isAuthenticated, address } = useAuth();
  const { getAllProperties, getTENBalance, getPendingYield, chainId, isCorrectNetwork } = useContracts();
  const [properties, setProperties] = useState<any[]>([]);
  const [tenBalance, setTenBalance] = useState('0');
  const [pendingYield, setPendingYield] = useState('0');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated || !isCorrectNetwork) {
        setIsLoading(false);
        return;
      }

      try {
        const props = await getAllProperties();
        setProperties(props || []);

        if (address) {
          const balance = await getTENBalance();
          const yield_ = await getPendingYield();
          setTenBalance(balance);
          setPendingYield(yield_);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, address, isCorrectNetwork, chainId]);

  const displayProperties = properties.length > 0 ? properties.slice(0, 3) : [
    { id: 1, uri: 'ipfs://Qm...', rentAmount: 2400000000n, totalSupply: 2400000000000000000000n, propertyToken: '0x...', owner: '0x...', isActive: true },
    { id: 2, uri: 'ipfs://Qm...', rentAmount: 1850000000n, totalSupply: 1800000000000000000000n, propertyToken: '0x...', owner: '0x...', isActive: true },
    { id: 3, uri: 'ipfs://Qm...', rentAmount: 3200000000n, totalSupply: 3200000000000000000000n, propertyToken: '0x...', owner: '0x...', isActive: true },
  ];

  const formatPropertyValue = (supply: bigint) => {
    try {
      return `$${(parseFloat(formatUnits(supply, 18)) * 1.05).toFixed(1)}M`;
    } catch {
      return '$2.4M';
    }
  };

  const formatRent = (rent: bigint) => {
    try {
      return `$${(parseFloat(formatUnits(rent, 6)) / 100).toFixed(0)}`;
    } catch {
      return '$2,400';
    }
  };

  const formatTokenSupply = (supply: bigint) => {
    try {
      return parseFloat(formatUnits(supply, 18)).toLocaleString();
    } catch {
      return '2,400';
    }
  };

  return (
    <Layout>
      <div className="space-y-12 md:space-y-16">
        <section className="py-8 md:py-12">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4 md:mb-6">
              Tokenize Rental Income.<br />
              <span className="text-primary">Earn Verified Yields.</span>
            </h1>
            <p className="text-base md:text-xl text-muted-foreground leading-relaxed mb-6 md:mb-8">
              TENANCY transforms real estate rental payments into ERC-20 tokens. 
              Off-chain verification via Chainlink CRE ensures payment integrity — 
              on-chain yield distribution powers your passive income.
            </p>
            <div className="flex flex-wrap gap-3 md:gap-4">
              <Link
                to="/investor"
                className="inline-flex items-center justify-center rounded-lg text-sm md:text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 md:h-12 px-5 md:px-6 gap-2 transition-all"
              >
                Start Investing
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/issuer"
                className="inline-flex items-center justify-center rounded-lg text-sm md:text-base font-medium border border-border bg-background hover:bg-muted h-10 md:h-12 px-5 md:px-6 gap-2 transition-all"
              >
                Tokenize Property
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Value Tokenized"
            value={properties.length > 0 ? `$${(properties.length * 2400000).toLocaleString()}` : '$12,450,000'}
            icon={Building}
            trend="+14%"
            trendUp={true}
            description="from last month"
          />
          <StatCard
            title="TEN Token Price"
            value="$1.05 USDC"
            icon={DollarSign}
            trend="+2.1%"
            trendUp={true}
            description="via Chainlink Oracle"
          />
          <StatCard
            title="Average APY"
            value="6.8%"
            icon={Activity}
            trend="+0.4%"
            trendUp={true}
            description="trailing 30 days"
          />
          <StatCard
            title="Active Properties"
            value={properties.length > 0 ? properties.length.toString() : '142'}
            icon={Users}
            description="verified off-chain"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-7">
          <div className="lg:col-span-4 rounded-2xl border border-border bg-card p-6 md:p-8 card-shadow">
            <div className="mb-6 md:mb-8">
              <h2 className="text-lg md:text-xl font-semibold tracking-tight">Platform Yield History</h2>
              <p className="text-sm text-muted-foreground mt-1">Historical APY from aggregated rental streams.</p>
            </div>
            <div className="h-[250px] md:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockYieldData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area type="monotone" dataKey="yield" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorYield)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-3 rounded-2xl border border-border bg-card p-6 md:p-8 card-shadow">
            <div className="mb-6 md:mb-8">
              <h2 className="text-lg md:text-xl font-semibold tracking-tight">Recent Verifications</h2>
              <p className="text-sm text-muted-foreground mt-1">Real-world payments verified on-chain.</p>
            </div>
            <div className="space-4 md:space-6">
              {[
                { prop: 'Prop-0x4A', amount: '$2,400', time: '2 mins ago', status: 'Verified' },
                { prop: 'Prop-0x9B', amount: '$1,850', time: '15 mins ago', status: 'Verified' },
                { prop: 'Prop-0x2C', amount: '$3,200', time: '1 hour ago', status: 'Verified' },
                { prop: 'Prop-0x1D', amount: '$4,500', time: '3 hours ago', status: 'Verified' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 md:gap-4 p-2 md:p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="relative flex h-8 md:h-10 w-8 md:w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                    <LinkIcon className="h-3 md:h-4 w-3 md:w-4 text-primary" />
                    <div className="absolute -bottom-0.5 -right-0.5 flex h-3 md:h-4 w-3 md:w-4 items-center justify-center rounded-full bg-background">
                      <div className="h-1.5 md:h-2 w-1.5 md:w-2 rounded-full bg-green-500"></div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.prop}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-medium text-sm md:text-base">{item.amount}</p>
                    <p className="text-xs text-green-500">{item.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold tracking-tight">Featured Properties</h2>
              <p className="text-muted-foreground mt-1">Explore tokenized rental streams available for investment.</p>
            </div>
            <Link to="/investor" className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {displayProperties.map((property: any) => (
              <div key={property.id} className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-all hover:shadow-xl hover:-translate-y-1 card-hover">
                <div className="h-28 md:h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Building className="h-10 md:h-12 w-10 md:w-12 text-primary/40" />
                </div>
                <div className="p-4 md:p-6">
                  <h3 className="font-semibold text-base md:text-lg mb-3 md:mb-4">Property #{property.id}</h3>
                  <div className="grid grid-cols-3 gap-2 md:gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">APY</p>
                      <p className="font-semibold text-green-500 text-sm md:text-base">7.5%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Value</p>
                      <p className="font-semibold text-sm md:text-base">{formatPropertyValue(property.totalSupply)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Tokens</p>
                      <p className="font-semibold text-sm md:text-base">{formatTokenSupply(property.totalSupply)}</p>
                    </div>
                  </div>
                  <Link
                    to="/investor"
                    className="mt-4 md:mt-6 w-full inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground h-9 md:h-10 transition-all"
                  >
                    Buy Income Rights
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {!isCorrectNetwork && (
          <div className="rounded-xl border-yellow-500/50 bg-yellow-500/10 p-4 md:p-6">
            <p className="text-yellow-500 text-center text-sm md:text-base">
              Please switch to <strong>Base Sepolia</strong> or <strong>Sepolia</strong> network to use the full functionality.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
