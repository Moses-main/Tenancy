import React from 'react';
    import { type LucideIcon } from 'lucide-react';

    interface StatCardProps {
      title: string;
      value: string;
      icon: LucideIcon;
      trend?: string;
      trendUp?: boolean;
      description?: string;
    }

    const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, trendUp, description }) => {
      return (
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">{title}</h3>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-2xl font-bold">{value}</div>
            {(trend || description) && (
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                {trend && (
                  <span className={trendUp ? 'text-green-500' : 'text-red-500'}>
                    {trend}
                  </span>
                )}
                {description && <span>{description}</span>}
              </p>
            )}
          </div>
        </div>
      );
    };

    export default StatCard;