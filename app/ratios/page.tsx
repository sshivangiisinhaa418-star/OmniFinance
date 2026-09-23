'use client';

import React, { useState, useEffect } from 'react';
import { getStoredTransactions } from '@/lib/storage';
import { FinancialTransaction } from '@/types';
import { calculateKPIs, calculateRatios } from '@/lib/finance/calculations';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { QuickUploadModal } from '@/components/import/QuickUploadModal';
import { Percent, ShieldCheck, Clock, TrendingUp, UploadCloud } from 'lucide-react';

export default function RatiosPage() {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const fetchTransactions = async () => {
    const txns = await getStoredTransactions();
    setTransactions(txns);
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const kpis = calculateKPIs(transactions);
  const ratios = calculateRatios(kpis);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 dark:text-white tracking-tight flex items-center gap-2">
            <Percent className="w-6 h-6 text-orange-600 dark:text-purple-500" />
            <span>Financial Ratios Intelligence Suite</span>
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Key solvency, liquidity, profitability, and operational efficiency ratios evaluated against Tally datasets
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-orange-500/20 transition cursor-pointer self-start md:self-auto"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Financial Data</span>
        </button>
      </div>

      {!loading && transactions.length === 0 ? (
        <EmptyState
          title="No Financial Ratios Data"
          description="Upload financial vouchers to dynamically compute solvency, liquidity, and operational efficiency ratios."
          onQuickUpload={() => setIsUploadOpen(true)}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Current Liquidity Ratio" value={`${ratios.currentRatio}x`} isCurrency={false} icon={ShieldCheck} gradientClass="kpi-gradient-blue" iconColor="text-blue-500" />
            <KpiCard title="Quick Acid-Test Ratio" value={`${ratios.quickRatio}x`} isCurrency={false} icon={ShieldCheck} gradientClass="kpi-gradient-emerald" iconColor="text-emerald-500" />
            <KpiCard title="Days Sales Outstanding (DSO)" value={`${ratios.daysSalesOutstanding} Days`} isCurrency={false} icon={Clock} gradientClass="kpi-gradient-amber" iconColor="text-amber-500" />
            <KpiCard title="Return on Equity (ROE)" value={`${ratios.returnOnEquity}%`} isCurrency={false} icon={TrendingUp} gradientClass="kpi-gradient-purple" iconColor="text-purple-500" />
          </div>

          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/80 glass-panel p-6 shadow-sm">
            <h4 className="text-sm font-bold text-stone-900 dark:text-white mb-4">Financial Health Ratio Diagnostic Matrix</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 dark:bg-stone-950/60 text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider text-[11px] border-b border-stone-200 dark:border-stone-800">
                  <tr>
                    <th className="py-3 px-4">Financial Ratio Metric</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Calculated Value</th>
                    <th className="py-3 px-4 text-right">Industry Benchmark</th>
                    <th className="py-3 px-4 text-center">Health Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800/40">
                  <tr className="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition">
                    <td className="py-3 px-4 font-bold text-stone-900 dark:text-white">Current Ratio</td>
                    <td className="py-3 px-4 text-stone-500">Liquidity</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-600 dark:text-blue-400">{ratios.currentRatio}x</td>
                    <td className="py-3 px-4 text-right font-mono text-stone-400">&gt; 1.5x</td>
                    <td className="py-3 px-4 text-center"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Optimal</span></td>
                  </tr>
                  <tr className="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition">
                    <td className="py-3 px-4 font-bold text-stone-900 dark:text-white">Quick Acid-Test Ratio</td>
                    <td className="py-3 px-4 text-stone-500">Liquidity</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-600 dark:text-blue-400">{ratios.quickRatio}x</td>
                    <td className="py-3 px-4 text-right font-mono text-stone-400">&gt; 1.0x</td>
                    <td className="py-3 px-4 text-center"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Optimal</span></td>
                  </tr>
                  <tr className="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition">
                    <td className="py-3 px-4 font-bold text-stone-900 dark:text-white">Days Sales Outstanding (DSO)</td>
                    <td className="py-3 px-4 text-stone-500">Efficiency</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400">{ratios.daysSalesOutstanding} Days</td>
                    <td className="py-3 px-4 text-right font-mono text-stone-400">&lt; 45 Days</td>
                    <td className="py-3 px-4 text-center"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Good</span></td>
                  </tr>
                  <tr className="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition">
                    <td className="py-3 px-4 font-bold text-stone-900 dark:text-white">Days Payable Outstanding (DPO)</td>
                    <td className="py-3 px-4 text-stone-500">Efficiency</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-sky-600 dark:text-sky-400">{ratios.daysPayableOutstanding} Days</td>
                    <td className="py-3 px-4 text-right font-mono text-stone-400">30–60 Days</td>
                    <td className="py-3 px-4 text-center"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Good</span></td>
                  </tr>
                  <tr className="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition">
                    <td className="py-3 px-4 font-bold text-stone-900 dark:text-white">Gross Margin %</td>
                    <td className="py-3 px-4 text-stone-500">Profitability</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{ratios.grossMarginRatio}%</td>
                    <td className="py-3 px-4 text-right font-mono text-stone-400">&gt; 25.0%</td>
                    <td className="py-3 px-4 text-center"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Strong</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <QuickUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        defaultDatasetType="sales"
        pageTitle="Financial Ratios"
        onImportSuccess={fetchTransactions}
      />
    </div>
  );
}
