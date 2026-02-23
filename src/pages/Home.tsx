import React from 'react';
    import Layout from '../components/Layout';
    import StatCard from '../components/StatCard';
    import { Activity, DollarSign, Users, Link as LinkIcon, Building } from 'lucide-react';
    import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
      return (
        <Layout>
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Protocol Overview</h1>
              <p className="text-muted-foreground mt-2">
                Global real-time metrics for the TENANCY protocol and TEN token.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Value Tokenized (TVT)"
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
                title="Average Platform APY"
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
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <div className="col-span-4 rounded-xl border border-border bg-card text-card-foreground shadow-sm">
                <div className="flex flex-col space-y-1.5 p-6">
                  <h3 className="font-semibold leading-none tracking-tight">Platform Yield History</h3>
                  <p className="text-sm text-muted-foreground">Historical APY generated from aggregated rental streams.</p>
                </div>
                <div className="p-6 pt-0 pl-2">
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
              </div>

              <div className="col-span-3 rounded-xl border border-border bg-card text-card-foreground shadow-sm">
                <div className="flex flex-col space-y-1.5 p-6">
                  <h3 className="font-semibold leading-none tracking-tight">Recent Chainlink Verifications</h3>
                  <p className="text-sm text-muted-foreground">Real-world rental payments verified on-chain.</p>
                </div>
                <div className="p-6 pt-0">
                  <div className="space-y-8">
                    {[
                      { prop: 'Prop-0x4A', amount: '$2,400', time: '2 mins ago', status: 'Verified' },
                      { prop: 'Prop-0x9B', amount: '$1,850', time: '15 mins ago', status: 'Verified' },
                      { prop: 'Prop-0x2C', amount: '$3,200', time: '1 hour ago', status: 'Verified' },
                      { prop: 'Prop-0x1D', amount: '$4,500', time: '3 hours ago', status: 'Verified' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center">
                        <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                          <LinkIcon className="h-4 w-4 text-primary" />
                          <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-background">
                            <div className="h-2 w-2 rounded-full bg-green-500"></div>
                          </div>
                        </div>
                        <div className="ml-4 space-y-1">
                          <p className="text-sm font-medium leading-none">{item.prop}</p>
                          <p className="text-sm text-muted-foreground">{item.time}</p>
                        </div>
                        <div className="ml-auto font-medium">{item.amount}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Layout>
      );
    }