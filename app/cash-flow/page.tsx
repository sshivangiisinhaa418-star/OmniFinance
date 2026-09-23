'use client';

import React, { useState, useEffect } from 'react';
import { getStoredTransactions } from '@/lib/storage';
import { FinancialTransaction } from '@/types';
import { calculateKPIs } from '@/lib/finance/calculations';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { QuickUploadModal } from '@/components/import/QuickUploadModal';
import { Layers, ArrowUpRight, ArrowDownRight, Wallet, UploadCloud } from 'lucide-react';
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

export default function CashFlowPage() {
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
  const netCash = kpis.cashInflow - kpis.cashOutflow;

  const cashFlowData = [
    { stage: '1. Inflows (Receipts)', amount: kpis.cashInflow, fill: '#10b981' },
    { stage: '2. Outflows (Payments)', amount: -kpis.cashOutflow, fill: '#f43f5e' },
    { stage: '3. Net Cash Flow', amount: netCash, fill: netCash >= 0 ? '#ea580c' : '#f97316' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 dark:text-white tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-orange-600 dark:text-blue-400" />
            <span>Cash Flow & Liquidity Intelligence</span>
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Tracking cash inflows vs cash outflows, operational liquidity, and cash position
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-orange-500/20 transition cursor-pointer self-start md:self-auto"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Cash Flow Vouchers</span>
        </button>
      </div>

      {!loading && transactions.length === 0 ? (
        <EmptyState
          title="No Cash Flow Data Available"
          description="Upload receipt, payment, sales, and purchase vouchers to view cash velocity and cash flow statement."
          onQuickUpload={() => setIsUploadOpen(true)}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Total Cash Inflow" value={kpis.cashInflow} icon={ArrowUpRight} gradientClass="kpi-gradient-emerald" iconColor="text-emerald-400" />
            <KpiCard title="Total Cash Outflow" value={kpis.cashOutflow} icon={ArrowDownRight} gradientClass="kpi-gradient-rose" iconColor="text-rose-400" />
            <KpiCard title="Net Cash Position" value={netCash} icon={Wallet} gradientClass="kpi-gradient-blue" iconColor="text-blue-400" />
            <KpiCard title="Operating Cash Surplus" value={Math.max(0, netCash)} icon={Layers} gradientClass="kpi-gradient-purple" iconColor="text-purple-400" />
          </div>

          <ChartCard title="Cash Inflow vs Outflow Dynamics" subtitle="Net movement of cash liquidity">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="stage" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => `₹${v / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {cashFlowData.map((entry, idx) => (
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
        defaultDatasetType="general"
        pageTitle="Cash Flow Management"
        onImportSuccess={fetchTransactions}
      />
    </div>
  );
}
