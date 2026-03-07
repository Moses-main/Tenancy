import React from 'react';
import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'info';
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendUp, 
  description,
  variant = 'default'
}) => {
  const variantClasses = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    info: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  };

  const trendColors = trendUp 
    ? 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' 
    : 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';

  return (
    <div className="card-modern p-4 sm:p-6 group">
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${variantClasses[variant]}`}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        {trend && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium ${trendColors}`}>
            {trendUp ? <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
            <span className="hidden sm:inline">{trend}</span>
            <span className="sm:hidden">{trend?.replace('%', '')}%</span>
          </span>
        )}
      </div>
      <div>
        <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">{title}</p>
        <p className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{value}</p>
        {description && (
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-2">{description}</p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
