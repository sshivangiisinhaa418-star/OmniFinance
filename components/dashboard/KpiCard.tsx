'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  prevValue?: string | number;
  changePct?: number;
  icon: LucideIcon;
  gradientClass?: string;
  iconColor?: string;
  isCurrency?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  prevValue,
  changePct,
  icon: Icon,
  gradientClass = 'kpi-gradient-blue',
  iconColor = 'text-blue-500',
  isCurrency = true,
}) => {
  const isPositive = (changePct ?? 0) > 0;
  const isNegative = (changePct ?? 0) < 0;

  const formattedValue =
    typeof value === 'number'
      ? isCurrency
        ? `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : value.toLocaleString()
      : value;

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800 p-4 bg-white dark:bg-stone-900 glass-panel ${gradientClass} transition-all duration-200 hover:border-stone-300 dark:hover:border-stone-700 hover:shadow-lg min-w-0`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider block truncate">
            {title}
          </span>
          <h3
            className="text-sm sm:text-base lg:text-lg font-black text-stone-900 dark:text-white mt-1 font-mono tracking-tight truncate"
            title={String(formattedValue)}
          >
            {formattedValue}
          </h3>
        </div>
        <div className={`p-2.5 rounded-xl bg-stone-100 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 ${iconColor} shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {changePct !== undefined && (
        <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800/60 text-xs">
          <div
            className={`flex items-center gap-1 font-bold px-2 py-0.5 rounded-md text-[10px] ${
              isPositive
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : isNegative
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : isNegative ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
            <span>{Math.abs(changePct)}%</span>
          </div>
          <span className="text-stone-400 dark:text-stone-500 text-[10px]">vs previous period</span>
        </div>
      )}
    </div>
  );
};
