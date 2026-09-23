'use client';

import React, { useState, useEffect } from 'react';
import { getStoredTransactions } from '@/lib/storage';
import { FinancialTransaction } from '@/types';
import { calculateKPIs, calculateRatios } from '@/lib/finance/calculations';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { QuickUploadModal } from '@/components/import/QuickUploadModal';
import { Layers, ShieldCheck, DollarSign, Clock, UploadCloud } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';

export default function WorkingCapitalPage() {
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

  const currentAssets = kpis.totalReceivables + kpis.inventoryValue + kpis.cashInflow;
  const currentLiabilities = kpis.totalPayables + kpis.totalTaxPayable;

  const capitalData = [
    { component: 'Current Assets', amount: currentAssets, fill: '#10b981' },
    { component: 'Current Liabilities', amount: currentLiabilities, fill: '#f43f5e' },
    { component: 'Net Working Capital', amount: ratios.workingCapital, fill: '#ea580c' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 dark:text-white tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-orange-600 dark:text-blue-500" />
            <span>Working Capital & Liquidity Management</span>
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Operational liquidity surplus, current assets vs current liabilities, and cash conversion efficiency
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-orange-500/20 transition cursor-pointer self-start md:self-auto"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Working Capital Data</span>
        </button>
      </div>

      {!loading && transactions.length === 0 ? (
        <EmptyState
          title="No Working Capital Data Available"
          description="Upload sales, purchase, and accounts receivable files to analyze net operating working capital."
          onQuickUpload={() => setIsUploadOpen(true)}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Net Working Capital Surplus" value={ratios.workingCapital} icon={DollarSign} gradientClass="kpi-gradient-emerald" iconColor="text-emerald-500" />
            <KpiCard title="Current Ratio (Assets / Liabilities)" value={`${ratios.currentRatio}x`} isCurrency={false} icon={ShieldCheck} gradientClass="kpi-gradient-blue" iconColor="text-blue-500" />
            <KpiCard title="Quick Acid-Test Ratio" value={`${ratios.quickRatio}x`} isCurrency={false} icon={ShieldCheck} gradientClass="kpi-gradient-purple" iconColor="text-purple-500" />
            <KpiCard title="Cash Conversion Cycle (CCC)" value={`${ratios.cashConversionCycle} Days`} isCurrency={false} icon={Clock} gradientClass="kpi-gradient-amber" iconColor="text-amber-500" />
          </div>

          <ChartCard title="Working Capital Assets vs Liabilities Structure" subtitle="Operational balance sheet liquidity breakdown">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={capitalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.5} />
                <XAxis dataKey="component" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => `₹${v / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }} formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {capitalData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      <QuickUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        defaultDatasetType="receivables"
        pageTitle="Working Capital"
        onImportSuccess={fetchTransactions}
      />
    </div>
  );
}
