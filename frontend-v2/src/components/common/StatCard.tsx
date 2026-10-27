import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'primary' | 'warning' | 'danger' | 'success';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  onClick,
}) => {
  const variantStyles = {
    default: 'border-slate-200 bg-white text-slate-900',
    primary: 'border-gov-navy-200 bg-white text-gov-navy-950 ring-1 ring-gov-navy-100',
    warning: 'border-amber-200 bg-amber-50/50 text-amber-950',
    danger: 'border-red-200 bg-red-50/40 text-red-950',
    success: 'border-emerald-200 bg-emerald-50/40 text-emerald-950',
  };

  const iconStyles = {
    default: 'bg-slate-100 text-slate-700',
    primary: 'bg-gov-navy-900 text-gov-teal-400',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    success: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-xl border transition-all duration-200 ${variantStyles[variant]} ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : 'shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between min-w-0">
        <div className="space-y-1 min-w-0 flex-1 pr-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
            {title}
          </p>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-500 font-medium truncate">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-2.5 rounded-xl ${iconStyles[variant]} shadow-sm shrink-0`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

