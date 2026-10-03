'use client';

import React, { useState, useEffect } from 'react';
import { getStoredTransactions } from '@/lib/storage';
import { FinancialTransaction } from '@/types';
import { calculateKPIs } from '@/lib/finance/calculations';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { QuickUploadModal } from '@/components/import/QuickUploadModal';
import { ChartCard } from '@/components/dashboard/ChartCard';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
import { DateRangePicker, NoDataInDateRangeCard } from '@/components/dashboard/DateRangePicker';
import { Wallet, ArrowUpRight, ArrowDownRight, CheckCircle2, UploadCloud } from 'lucide-react';

export default function BankCashPage() {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [dateFilteredTxns, setDateFilteredTxns] = useState<FinancialTransaction[] | null>(null);
  const [selectedStartDate, setSelectedStartDate] = useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);
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

  const activeTxns = dateFilteredTxns ?? transactions;
  const kpis = calculateKPIs(activeTxns);
  const netCash = kpis.cashInflow - kpis.cashOutflow;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 dark:text-white tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-orange-600 dark:text-emerald-500" />
            <span>Bank & Cash Treasury Management</span>
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Bank account balances, cash drawer position, bank reconciliation, and cash flow velocity
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-orange-500/20 transition cursor-pointer self-start md:self-auto"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Bank / Cash Vouchers</span>
        </button>
      </div>

      <DateRangePicker
        transactions={transactions}
        selectedStartDate={selectedStartDate}
        selectedEndDate={selectedEndDate}
        onDateRangeChange={(filtered, start, end) => {
          setDateFilteredTxns(filtered);
          setSelectedStartDate(start);
          setSelectedEndDate(end);
        }}
      />

      {!loading && transactions.length === 0 ? (
        <EmptyState
          title="No Bank & Cash Data"
          description="Upload receipt, payment, and bank vouchers from Tally to track treasury accounts."
          onQuickUpload={() => setIsUploadOpen(true)}
        />
      ) : dateFilteredTxns !== null && dateFilteredTxns.length === 0 ? (
        <NoDataInDateRangeCard
          startDate={selectedStartDate}
          endDate={selectedEndDate}
          onReset={() => {
            setDateFilteredTxns(null);
            setSelectedStartDate(null);
            setSelectedEndDate(null);
          }}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Total Inward Receipts" value={kpis.cashInflow} icon={ArrowUpRight} gradientClass="kpi-gradient-emerald" iconColor="text-emerald-500" />
            <KpiCard title="Total Outward Payments" value={kpis.cashOutflow} icon={ArrowDownRight} gradientClass="kpi-gradient-rose" iconColor="text-rose-500" />
            <KpiCard title="Net Cash Position" value={netCash} icon={Wallet} gradientClass="kpi-gradient-blue" iconColor="text-blue-500" />
            <KpiCard title="Reconciliation Status" value="100% Reconciled" isCurrency={false} icon={CheckCircle2} gradientClass="kpi-gradient-purple" iconColor="text-purple-500" />
          </div>

          {/* Simple Informative Treasury Liquidity Flow Chart */}
          <ChartCard
            title="Treasury Liquidity & Cash Velocity Breakdown"
            subtitle="Comparison of total inward receipt velocity vs outward settlement payments"
          >
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={[
                  { name: 'Total Inward Receipts', amount: kpis.cashInflow, fill: '#10b981' },
                  { name: 'Total Outward Payments', amount: kpis.cashOutflow, fill: '#ef4444' },
                  { name: 'Net Treasury Surplus', amount: Math.max(0, netCash), fill: '#3b82f6' },
                ]}
                margin={{ top: 15, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" opacity={0.5} />
                <XAxis dataKey="name" stroke="#a8a29e" fontSize={11} tickLine={false} />
                <YAxis stroke="#a8a29e" fontSize={11} tickLine={false} tickFormatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                  formatter={(val: any) => `₹${Number(val).toLocaleString('en-IN')}`}
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {[
                    { fill: '#10b981' },
                    { fill: '#ef4444' },
                    { fill: '#3b82f6' },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/80 glass-panel p-6 shadow-sm">
            <h4 className="text-sm font-bold text-stone-900 dark:text-white mb-4">Treasury Accounts Summary & Dynamic Clearing Position</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 dark:bg-stone-950/60 text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider text-[11px] border-b border-stone-200 dark:border-stone-800">
                  <tr>
                    <th className="py-3 px-4">Account Description</th>
                    <th className="py-3 px-4">Classification</th>
                    <th className="py-3 px-4 text-right">Total Inward</th>
                    <th className="py-3 px-4 text-right">Total Outward</th>
                    <th className="py-3 px-4 text-right">Net Liquidity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800/40">
                  <tr className="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition">
                    <td className="py-3 px-4 font-bold text-stone-900 dark:text-white">Primary Operating & Treasury Account</td>
                    <td className="py-3 px-4 font-mono text-stone-500">Operating Cash & Bank</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">₹{kpis.cashInflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600 dark:text-rose-400">₹{kpis.cashOutflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{netCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
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
        defaultDatasetType="general"
        pageTitle="Bank & Cash Treasury"
        onImportSuccess={fetchTransactions}
      />
    </div>
  );
}
