'use client';

import React, { useState, useEffect } from 'react';
import { getStoredTransactions } from '@/lib/storage';
import { FinancialTransaction } from '@/types';
import { calculateVendorSummaries } from '@/lib/finance/calculations';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { QuickUploadModal } from '@/components/import/QuickUploadModal';
import { Building2, ShoppingBag, CreditCard, FileText, UploadCloud } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function VendorsPage() {
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

  const vendors = calculateVendorSummaries(transactions);
  const totalPurchases = vendors.reduce((acc, v) => acc + v.totalPurchases, 0);
  const totalPayables = vendors.reduce((acc, v) => acc + v.payableAmount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 dark:text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-orange-600 dark:text-sky-400" />
            <span>Vendor & Supplier Intelligence</span>
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Supplier directory, order concentration, purchase totals, and accounts payable balances
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-orange-500/20 transition cursor-pointer self-start md:self-auto"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Purchase Data</span>
        </button>
      </div>

      {!loading && transactions.length === 0 ? (
        <EmptyState
          title="No Vendor Data Available"
          description="Upload purchase vouchers to view vendor directories, purchase histories, and accounts payable balances."
          onQuickUpload={() => setIsUploadOpen(true)}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Active Suppliers" value={vendors.length} isCurrency={false} icon={Building2} gradientClass="kpi-gradient-blue" iconColor="text-sky-400" />
            <KpiCard title="Total Purchase Billing" value={totalPurchases} icon={ShoppingBag} gradientClass="kpi-gradient-emerald" iconColor="text-emerald-400" />
            <KpiCard title="Outstanding Payables" value={totalPayables} icon={CreditCard} gradientClass="kpi-gradient-rose" iconColor="text-rose-400" />
            <KpiCard title="Avg Purchase Order" value={vendors.length > 0 ? totalPurchases / vendors.length : 0} icon={FileText} gradientClass="kpi-gradient-purple" iconColor="text-purple-400" />
          </div>

          <ChartCard title="Vendor Procurement Spending Ranking" subtitle="Top supplier spending concentration">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={vendors.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => `₹${v / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} />
                <Bar dataKey="totalPurchases" fill="#ea580c" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/80 glass-panel p-5 shadow-sm">
            <h4 className="text-sm font-bold text-stone-900 dark:text-white mb-4">Vendor Directory & Order History</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 dark:bg-stone-950/60 text-stone-500 dark:text-stone-400 font-semibold uppercase tracking-wider text-[11px] border-b border-stone-200 dark:border-stone-800">
                  <tr>
                    <th className="py-3 px-4">Vendor Name</th>
                    <th className="py-3 px-4 text-center">Orders</th>
                    <th className="py-3 px-4 text-right">Total Purchase</th>
                    <th className="py-3 px-4 text-right">Avg Order Value</th>
                    <th className="py-3 px-4 text-right">Outstanding Payable</th>
                    <th className="py-3 px-4 text-right">Last Txn Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800/40">
                  {vendors.map(v => (
                    <tr key={v.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition">
                      <td className="py-3 px-4 font-bold text-stone-900 dark:text-white">{v.name}</td>
                      <td className="py-3 px-4 text-center font-mono">{v.orderCount}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-sky-600 dark:text-sky-400">₹{v.totalPurchases.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right font-mono text-stone-700 dark:text-slate-300">₹{Math.round(v.avgOrderValue).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right font-mono text-rose-600 dark:text-rose-400 font-bold">₹{v.payableAmount.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right font-mono text-stone-500 dark:text-slate-400">{v.lastTxnDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <QuickUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        defaultDatasetType="purchases"
        pageTitle="Vendor Analytics"
        onImportSuccess={fetchTransactions}
      />
    </div>
  );
}
