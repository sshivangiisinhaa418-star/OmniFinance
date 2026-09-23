'use client';

import React, { useState, useEffect } from 'react';
import { getStoredTransactions } from '@/lib/storage';
import { FinancialTransaction } from '@/types';
import { calculateKPIs } from '@/lib/finance/calculations';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { FinancialStatementView } from '@/components/statements/FinancialStatementView';
import { QuickUploadModal } from '@/components/import/QuickUploadModal';
import { PieChart, DollarSign, TrendingUp, Receipt, Percent, UploadCloud } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';

export default function ProfitLossPage() {
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

  const waterfallData = [
    { stage: '1. Revenue', amount: kpis.totalSales, fill: '#10b981' },
    { stage: '2. Cost of Goods (COGS)', amount: -kpis.totalPurchases, fill: '#0284c7' },
    { stage: '3. Gross Profit', amount: kpis.grossProfit, fill: '#3b82f6' },
    { stage: '4. Operating Expenses', amount: -kpis.totalExpenses, fill: '#f43f5e' },
    { stage: '5. Net Profit', amount: kpis.netProfit, fill: '#ea580c' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 dark:text-white tracking-tight flex items-center gap-2">
            <PieChart className="w-6 h-6 text-orange-600 dark:text-purple-400" />
            <span>Profit & Loss Intelligence (P&L)</span>
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Gross & Net Margins breakdown, operating profitability, and dynamic financial statement
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-orange-500/20 transition cursor-pointer self-start md:self-auto"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload P&L Vouchers</span>
        </button>
      </div>

      {!loading && transactions.length === 0 ? (
        <EmptyState
          title="No Profit & Loss Data Available"
          description="Upload sales, purchase, and expense vouchers from Tally to generate a complete P&L analysis."
          onQuickUpload={() => setIsUploadOpen(true)}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Total Revenue" value={kpis.totalRevenue} icon={DollarSign} gradientClass="kpi-gradient-emerald" iconColor="text-emerald-400" />
            <KpiCard title="Gross Profit Margin" value={`${kpis.grossMarginPct}%`} isCurrency={false} icon={Percent} gradientClass="kpi-gradient-blue" iconColor="text-blue-400" />
            <KpiCard title="Operating Expenses" value={kpis.totalExpenses} icon={Receipt} gradientClass="kpi-gradient-rose" iconColor="text-rose-400" />
            <KpiCard title="Net Profit Margin" value={`${kpis.netMarginPct}%`} isCurrency={false} icon={TrendingUp} gradientClass="kpi-gradient-purple" iconColor="text-purple-400" />
          </div>

          <ChartCard title="P&L Waterfall Structure" subtitle="Revenue to Net Profit progression">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={waterfallData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="stage" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => `₹${v / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {waterfallData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <FinancialStatementView kpis={kpis} type="pl" />
        </>
      )}

      <QuickUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        defaultDatasetType="sales"
        pageTitle="Profit & Loss Analysis"
        onImportSuccess={fetchTransactions}
      />
    </div>
  );
}
