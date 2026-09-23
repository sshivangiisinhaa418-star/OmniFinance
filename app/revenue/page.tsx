'use client';

import React, { useState, useEffect } from 'react';
import { getStoredTransactions } from '@/lib/storage';
import { FinancialTransaction } from '@/types';
import { calculateKPIs, calculateMonthlyTrends } from '@/lib/finance/calculations';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { QuickUploadModal } from '@/components/import/QuickUploadModal';
import { DollarSign, TrendingUp, Award, Percent, UploadCloud } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function RevenuePage() {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const fetchTransactions = async () => {
    const txns = await getStoredTransactions();
    setTransactions(txns.filter(t => t.voucherType.toLowerCase().includes('sales') || t.partyType === 'customer'));
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const kpis = calculateKPIs(transactions);
  const monthlyTrends = calculateMonthlyTrends(transactions);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 dark:text-white tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-orange-600 dark:text-emerald-400" />
            <span>Revenue & Growth Intelligence</span>
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Top-line revenue trajectory, period growth variance, and billing analytics
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-orange-500/20 transition cursor-pointer self-start md:self-auto"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Revenue / Sales Data</span>
        </button>
      </div>

      {!loading && transactions.length === 0 ? (
        <EmptyState
          title="No Revenue Data Available"
          description="Upload Tally sales exports to view revenue growth trends, year-over-year performance, and business unit contribution."
          onQuickUpload={() => setIsUploadOpen(true)}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Gross Total Revenue" value={kpis.totalRevenue} changePct={14.8} icon={DollarSign} gradientClass="kpi-gradient-emerald" iconColor="text-emerald-400" />
            <KpiCard title="Revenue Growth Rate" value="+14.8%" isCurrency={false} icon={TrendingUp} gradientClass="kpi-gradient-blue" iconColor="text-blue-400" />
            <KpiCard title="Previous Period Revenue" value={kpis.prevPeriodSales} icon={Award} gradientClass="kpi-gradient-purple" iconColor="text-purple-400" />
            <KpiCard title="Gross Profit Margin" value={`${kpis.grossMarginPct}%`} isCurrency={false} icon={Percent} gradientClass="kpi-gradient-amber" iconColor="text-amber-400" />
          </div>

          <ChartCard title="Revenue Growth Trajectory" subtitle="Monthly billing volume over time">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => `₹${v / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} />
                <Area type="monotone" dataKey="sales" name="Revenue" stroke="#ea580c" fill="#ea580c" fillOpacity={0.2} strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      <QuickUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        defaultDatasetType="sales"
        pageTitle="Revenue Analytics"
        onImportSuccess={fetchTransactions}
      />
    </div>
  );
}
