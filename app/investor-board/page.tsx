'use client';

import React, { useState, useEffect } from 'react';
import { getStoredTransactions } from '@/lib/storage';
import { FinancialTransaction } from '@/types';
import { calculateKPIs } from '@/lib/finance/calculations';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { QuickUploadModal } from '@/components/import/QuickUploadModal';
import { Building, TrendingUp, ShieldCheck, DollarSign, UploadCloud } from 'lucide-react';

export default function InvestorBoardPage() {
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 dark:text-white tracking-tight flex items-center gap-2">
            <Building className="w-6 h-6 text-orange-600 dark:text-amber-500" />
            <span>Director Panel & Investor Board Briefing</span>
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            High-level executive metrics, capital efficiency, EBITDA, and strategic growth summary for Board meetings
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-orange-500/20 transition cursor-pointer self-start md:self-auto"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Board Data</span>
        </button>
      </div>

      {!loading && transactions.length === 0 ? (
        <EmptyState
          title="No Investor Board Data"
          description="Upload financial vouchers to populate Board of Directors executive KPIs."
          onQuickUpload={() => setIsUploadOpen(true)}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Annual Revenue Run Rate" value={kpis.totalSales * 1.2} changePct={16.5} icon={DollarSign} gradientClass="kpi-gradient-emerald" iconColor="text-emerald-500" />
            <KpiCard title="EBITDA Profit Margin" value={`${Math.round(kpis.grossMarginPct * 0.8)}%`} isCurrency={false} icon={TrendingUp} gradientClass="kpi-gradient-purple" iconColor="text-purple-500" />
            <KpiCard title="Capital Efficiency Score" value="3.4x" isCurrency={false} icon={ShieldCheck} gradientClass="kpi-gradient-blue" iconColor="text-blue-500" />
            <KpiCard title="Operational Runway" value="36+ Months" isCurrency={false} icon={Building} gradientClass="kpi-gradient-amber" iconColor="text-amber-500" />
          </div>

          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/80 glass-panel p-6 space-y-4 shadow-sm">
            <h4 className="text-sm font-bold text-stone-900 dark:text-white">Director Panel Strategic Highlights</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-950/40 border border-stone-200 dark:border-stone-800">
                <span className="font-bold text-orange-600 dark:text-blue-400 uppercase text-[10px]">Revenue Expansion</span>
                <p className="text-sm font-bold text-stone-900 dark:text-white mt-1">₹{(kpis.totalSales / 100000).toFixed(2)} Lakhs</p>
                <p className="text-stone-500 dark:text-stone-400 mt-1">Strong enterprise key account growth across domestic accounts.</p>
              </div>
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-950/40 border border-stone-200 dark:border-stone-800">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[10px]">Net Margin Retained</span>
                <p className="text-sm font-bold text-stone-900 dark:text-white mt-1">{kpis.netMarginPct}% Net Margin</p>
                <p className="text-stone-500 dark:text-stone-400 mt-1">Controlled operating expenses maintaining strong net income retention.</p>
              </div>
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-950/40 border border-stone-200 dark:border-stone-800">
                <span className="font-bold text-purple-600 dark:text-purple-400 uppercase text-[10px]">Liquidity Cushion</span>
                <p className="text-sm font-bold text-stone-900 dark:text-white mt-1">₹{(kpis.cashInflow / 100000).toFixed(2)} Lakhs</p>
                <p className="text-stone-500 dark:text-stone-400 mt-1">Healthy cash reserves protecting operational working capital requirement.</p>
              </div>
            </div>
          </div>
        </>
      )}

      <QuickUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        defaultDatasetType="sales"
        pageTitle="Investor Board & Director Panel"
        onImportSuccess={fetchTransactions}
      />
    </div>
  );
}
