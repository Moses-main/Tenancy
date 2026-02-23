import React from 'react';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import { Activity, DollarSign, Users, Link as LinkIcon, Building, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';

const mockYieldData = [
  { name: 'Jan', yield: 4.2 },
  { name: 'Feb', yield: 4.5 },
  { name: 'Mar', yield: 4.8 },
  { name: 'Apr', yield: 5.1 },
  { name: 'May', yield: 5.4 },
  { name: 'Jun', yield: 6.2 },
  { name: 'Jul', yield: 6.8 },
];

const mockProperties = [
  { id: 1, name: 'Downtown Loft NYC', yield: '8.2%', value: '$2.4M', tokens: '2,400' },
  { id: 2, name: 'Beach House Miami', yield: '7.5%', value: '$1.8M', tokens: '1,800' },
  { id: 3, name: 'Urban Condo SF', yield: '6.9%', value: '$3.2M', tokens: '3,200' },
];

export default function Home() {
  return (
    <Layout>
      <div className="space-y-16">
        <section className="py-12">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Tokenize Rental Income.<br />
              <span className="text-primary">Earn Verified Yields.</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed mb-8">
              TENANCY transforms real estate rental payments into ERC-20 tokens. 
              Off-chain verification via Chainlink CRE ensures payment integrity — 
              on-chain yield distribution powers your passive income.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/investor"
                className="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-6 gap-2 transition-all"
              >
                Start Investing
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/issuer"
                className="inline-flex items-center justify-center rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted h-12 px-6 gap-2 transition-all"
              >
                Tokenize Property
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Value Tokenized"
            value="$12,450,000"
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
            value="142"
            icon={Users}
            description="verified off-chain"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-7">
          <div className="lg:col-span-4 rounded-2xl border border-border bg-card p-8">
            <div className="mb-8">
              <h2 className="text-xl font-semibold tracking-tight">Platform Yield History</h2>
              <p className="text-sm text-muted-foreground mt-1">Historical APY from aggregated rental streams.</p>
            </div>
            <div className="h-[300px] w-full">
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

          <div className="lg:col-span-3 rounded-2xl border border-border bg-card p-8">
            <div className="mb-8">
              <h2 className="text-xl font-semibold tracking-tight">Recent Verifications</h2>
              <p className="text-sm text-muted-foreground mt-1">Real-world payments verified on-chain.</p>
            </div>
            <div className="space-y-6">
              {[
                { prop: 'Prop-0x4A', amount: '$2,400', time: '2 mins ago', status: 'Verified' },
                { prop: 'Prop-0x9B', amount: '$1,850', time: '15 mins ago', status: 'Verified' },
                { prop: 'Prop-0x2C', amount: '$3,200', time: '1 hour ago', status: 'Verified' },
                { prop: 'Prop-0x1D', amount: '$4,500', time: '3 hours ago', status: 'Verified' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <LinkIcon className="h-4 w-4 text-primary" />
                    <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-background">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.prop}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{item.amount}</p>
                    <p className="text-xs text-green-500">{item.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Featured Properties</h2>
              <p className="text-muted-foreground mt-1">Explore tokenized rental streams available for investment.</p>
            </div>
            <Link to="/investor" className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {mockProperties.map((property) => (
              <div key={property.id} className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-all hover:shadow-lg">
                <div className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Building className="h-12 w-12 text-primary/40" />
                </div>
                <div className="p-6">
                  <h3 className="font-semibold text-lg mb-4">{property.name}</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">APY</p>
                      <p className="font-semibold text-green-500">{property.yield}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Value</p>
                      <p className="font-semibold">{property.value}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Tokens</p>
                      <p className="font-semibold">{property.tokens}</p>
                    </div>
                  </div>
                  <Link
                    to="/investor"
                    className="mt-6 w-full inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground h-10 transition-all"
                  >
                    Buy Income Rights
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}
